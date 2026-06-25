'use strict';

const { db } = require('./index');
const { ProductModel } = require('./productModel');

const ReviewModel = {
  listForProduct(productId, { limit = 20, offset = 0 } = {}) {
    return db
      .prepare(
        `SELECT id, product_id, user_id, author_name, rating, title, body, created_at
         FROM reviews WHERE product_id = ? AND is_approved = 1
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(productId, limit, offset);
  },

  /** Create-or-update a review (one per user per product) and refresh ratings. */
  upsert({ productId, userId, authorName, rating, title = null, body = null }) {
    const txn = db.transaction(() => {
      const existing = userId
        ? db.prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?').get(productId, userId)
        : null;

      if (existing) {
        db.prepare(
          `UPDATE reviews SET rating = ?, title = ?, body = ?, author_name = ?,
                              created_at = datetime('now')
           WHERE id = ?`
        ).run(rating, title, body, authorName, existing.id);
      } else {
        db.prepare(
          `INSERT INTO reviews (product_id, user_id, author_name, rating, title, body)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(productId, userId, authorName, rating, title, body);
      }
      ProductModel.refreshRating(productId);
    });
    txn();
    return this.listForProduct(productId, { limit: 1 })[0];
  },

  remove(id) {
    const review = db.prepare('SELECT product_id FROM reviews WHERE id = ?').get(id);
    const changes = db.prepare('DELETE FROM reviews WHERE id = ?').run(id).changes;
    if (review) ProductModel.refreshRating(review.product_id);
    return changes;
  },
};

module.exports = ReviewModel;
