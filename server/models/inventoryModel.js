'use strict';

const { db } = require('./index');
const config = require('../config');

const InventoryModel = {
  /** Adjust a product's stock by `delta` and write an audit-log row. */
  adjust(productId, delta, reason = 'manual', reference = null) {
    const txn = db.transaction(() => {
      const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(productId);
      if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
      const stockAfter = product.stock + delta;
      if (stockAfter < 0) throw Object.assign(new Error('Stock cannot go negative'), { status: 400 });

      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stockAfter, productId);
      db.prepare(
        `INSERT INTO inventory_logs (product_id, change, reason, reference, stock_after)
         VALUES (?, ?, ?, ?, ?)`
      ).run(productId, delta, reason, reference, stockAfter);
      return { ...product, stock: stockAfter };
    });
    return txn();
  },

  logs({ productId, limit = 100, offset = 0 } = {}) {
    if (productId) {
      return db
        .prepare(
          `SELECT l.*, p.name AS product_name FROM inventory_logs l
           JOIN products p ON p.id = l.product_id
           WHERE l.product_id = ? ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
        )
        .all(productId, limit, offset);
    }
    return db
      .prepare(
        `SELECT l.*, p.name AS product_name FROM inventory_logs l
         JOIN products p ON p.id = l.product_id
         ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
      )
      .all(limit, offset);
  },

  lowStock() {
    return db
      .prepare(
        'SELECT id, name, stock, sku FROM products WHERE is_active = 1 AND stock <= ? ORDER BY stock ASC'
      )
      .all(config.inventory.lowStockThreshold);
  },
};

module.exports = InventoryModel;
