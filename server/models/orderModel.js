'use strict';

const { db } = require('./index');
const { generateOrderNumber } = require('../utils/security');
const CouponModel = require('./couponModel');
const config = require('../config');

const SHIPPING_FEE = 0; // free shipping; adjust or compute by weight/zone if needed.

/**
 * Create an order atomically:
 *   1. Validate every line item against live product rows & stock.
 *   2. Compute subtotal, apply coupon, compute total.
 *   3. Insert order + items + payment record.
 *   4. Decrement stock and write inventory_logs rows.
 *   5. Increment coupon usage.
 * The whole thing runs inside a single SQLite transaction so a failure at any
 * step rolls everything back — no half-written orders, no phantom stock moves.
 *
 * @returns {{ order, items, lowStock: Array }}
 */
function createOrder({ user, items, customer, couponCode }) {
  const txn = db.transaction(() => {
    if (!Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('Cart is empty'), { status: 400 });
    }

    const lowStock = [];
    const resolved = [];
    let subtotal = 0;

    const getProduct = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');

    for (const line of items) {
      const product = getProduct.get(line.productId);
      if (!product) {
        throw Object.assign(new Error(`Product ${line.productId} is unavailable`), { status: 400 });
      }
      const qty = parseInt(line.quantity, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        throw Object.assign(new Error(`Invalid quantity for ${product.name}`), { status: 400 });
      }
      if (product.stock < qty) {
        throw Object.assign(
          new Error(`Insufficient stock for ${product.name} (have ${product.stock})`),
          { status: 409 }
        );
      }
      const lineTotal = product.price * qty;
      subtotal += lineTotal;
      resolved.push({ product, qty, lineTotal });
    }

    // Coupon
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = CouponModel.evaluate(couponCode, subtotal);
      if (!result.valid) throw Object.assign(new Error(result.reason), { status: 400 });
      discount = result.discount;
      appliedCoupon = result.coupon;
    }

    const total = Math.max(subtotal - discount + SHIPPING_FEE, 0);
    const orderNumber = generateOrderNumber();

    const orderInfo = db
      .prepare(
        `INSERT INTO orders
          (order_number, user_id, status, subtotal, discount, shipping_fee, total,
           coupon_code, customer_name, customer_email, customer_phone,
           shipping_address, shipping_city, shipping_postal, notes)
         VALUES
          (@order_number, @user_id, 'pending', @subtotal, @discount, @shipping_fee, @total,
           @coupon_code, @customer_name, @customer_email, @customer_phone,
           @shipping_address, @shipping_city, @shipping_postal, @notes)`
      )
      .run({
        order_number: orderNumber,
        user_id: user ? user.id : null,
        subtotal,
        discount,
        shipping_fee: SHIPPING_FEE,
        total,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone ?? null,
        shipping_address: customer.address,
        shipping_city: customer.city ?? null,
        shipping_postal: customer.postal ?? null,
        notes: customer.notes ?? null,
      });

    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const decStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    const logStock = db.prepare(
      `INSERT INTO inventory_logs (product_id, change, reason, reference, stock_after)
       VALUES (?, ?, 'sale', ?, ?)`
    );

    for (const { product, qty, lineTotal } of resolved) {
      insertItem.run(orderId, product.id, product.name, product.price, qty, lineTotal);
      decStock.run(qty, product.id);
      const stockAfter = product.stock - qty;
      logStock.run(product.id, -qty, orderNumber, stockAfter);
      if (stockAfter <= config.inventory.lowStockThreshold) {
        lowStock.push({ id: product.id, name: product.name, stock: stockAfter });
      }
    }

    db.prepare(
      `INSERT INTO payments (order_id, provider, amount, status)
       VALUES (?, 'manual', ?, 'pending')`
    ).run(orderId, total);

    if (appliedCoupon) CouponModel.incrementUsage(appliedCoupon.id);

    return { orderId, lowStock };
  });

  const { orderId, lowStock } = txn();
  return { ...OrderModel.findById(orderId), lowStock };
}

const OrderModel = {
  create: createOrder,

  findById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    order.payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC').get(id);
    return order;
  },

  findByNumber(orderNumber) {
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
    return order ? this.findById(order.id) : null;
  },

  listByUser(userId, { limit = 50, offset = 0 } = {}) {
    return db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(userId, limit, offset);
  },

  listAll({ status, limit = 50, offset = 0 } = {}) {
    if (status) {
      return db
        .prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        .all(status, limit, offset);
    }
    return db
      .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);
  },

  updateStatus(id, status) {
    const valid = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });

    const txn = db.transaction(() => {
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
        status,
        id
      );
      // Keep the payment record consistent with the headline order status.
      if (status === 'paid' || status === 'delivered' || status === 'shipped' || status === 'processing') {
        db.prepare("UPDATE payments SET status = 'succeeded' WHERE order_id = ?").run(id);
      } else if (status === 'cancelled') {
        db.prepare("UPDATE payments SET status = 'failed' WHERE order_id = ?").run(id);
      }
    });
    txn();
    return this.findById(id);
  },

  count() {
    return db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  },

  revenue() {
    return (
      db
        .prepare("SELECT COALESCE(SUM(total), 0) AS s FROM orders WHERE status != 'cancelled'")
        .get().s || 0
    );
  },

  statusBreakdown() {
    return db.prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status').all();
  },
};

module.exports = OrderModel;
