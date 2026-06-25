'use strict';

const OrderModel = require('../models/orderModel');
const CouponModel = require('../models/couponModel');
const { ProductModel } = require('../models/productModel');
const { ApiError, asyncHandler } = require('../middleware/errors');
const { automation } = require('../utils/n8n');
const logger = require('../utils/logger');

/** POST /api/orders — checkout. Works for guests and logged-in users. */
const createOrder = asyncHandler(async (req, res) => {
  const { items, customer, couponCode } = req.body;

  let order;
  try {
    order = OrderModel.create({ user: req.user || null, items, customer, couponCode });
  } catch (err) {
    // Surface domain errors (stock, coupon, etc.) with their intended status.
    if (err.status) throw new ApiError(err.status, err.message, 'CHECKOUT_FAILED');
    throw err;
  }

  logger.info('Order created', { orderNumber: order.order_number, total: order.total });

  // ── n8n automation layer (fire-and-forget) ──
  automation.orderCreated({
    orderNumber: order.order_number,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
    },
    items: order.items.map((i) => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
    createdAt: order.created_at,
  });

  for (const product of order.lowStock || []) automation.lowStock(product);

  const { lowStock, ...payload } = order; // don't leak internal stock state to the client
  res.status(201).json({ order: payload });
});

/** GET /api/orders/:number — owner or admin. */
const getOrder = asyncHandler(async (req, res) => {
  const order = OrderModel.findByNumber(req.params.number);
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = req.user && order.user_id === req.user.id;
  const isAdmin = req.user && req.user.role === 'admin';
  // Guests may look up an order by its (unguessable) number + matching email.
  const guestMatch = !order.user_id && req.query.email && req.query.email.toLowerCase() === order.customer_email.toLowerCase();

  if (!isOwner && !isAdmin && !guestMatch) throw ApiError.forbidden();
  res.json({ order });
});

/** GET /api/orders — current user's order history. */
const myOrders = asyncHandler(async (req, res) => {
  res.json({ orders: OrderModel.listByUser(req.user.id) });
});

/** POST /api/coupons/validate — preview a coupon discount before checkout. */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const result = CouponModel.evaluate(code, parseInt(subtotal, 10) || 0);
  if (!result.valid) throw ApiError.badRequest(result.reason, undefined);
  res.json({ valid: true, discount: result.discount, code: result.coupon.code });
});

/** POST /api/cart/quote — server-side recompute of a cart (authoritative prices). */
const quoteCart = asyncHandler(async (req, res) => {
  const { items = [], couponCode } = req.body;
  let subtotal = 0;
  const lines = [];

  for (const line of items) {
    const product = ProductModel.findById(line.productId);
    if (!product || !product.is_active) continue;
    const qty = Math.max(parseInt(line.quantity, 10) || 0, 0);
    if (qty === 0) continue;
    const lineTotal = product.price * qty;
    subtotal += lineTotal;
    lines.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url,
      unitPrice: product.price,
      quantity: qty,
      stock: product.stock,
      lineTotal,
    });
  }

  let discount = 0;
  let couponError = null;
  if (couponCode) {
    const result = CouponModel.evaluate(couponCode, subtotal);
    if (result.valid) discount = result.discount;
    else couponError = result.reason;
  }

  res.json({
    items: lines,
    subtotal,
    discount,
    total: Math.max(subtotal - discount, 0),
    couponError,
  });
});

module.exports = { createOrder, getOrder, myOrders, validateCoupon, quoteCart };
