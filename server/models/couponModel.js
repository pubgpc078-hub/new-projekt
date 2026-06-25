'use strict';

const { db } = require('./index');

const CouponModel = {
  findByCode(code) {
    return db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(code).toUpperCase());
  },

  all() {
    return db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  },

  create(data) {
    const info = db
      .prepare(
        `INSERT INTO coupons (code, type, value, min_subtotal, max_discount, usage_limit, expires_at, is_active)
         VALUES (@code, @type, @value, @min_subtotal, @max_discount, @usage_limit, @expires_at, @is_active)`
      )
      .run({
        code: String(data.code).toUpperCase(),
        type: data.type,
        value: data.value,
        min_subtotal: data.min_subtotal ?? 0,
        max_discount: data.max_discount ?? null,
        usage_limit: data.usage_limit ?? null,
        expires_at: data.expires_at ?? null,
        is_active: data.is_active === false ? 0 : 1,
      });
    return this.findById(info.lastInsertRowid);
  },

  incrementUsage(id) {
    db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(id);
  },

  remove(id) {
    return db.prepare('DELETE FROM coupons WHERE id = ?').run(id).changes;
  },

  /**
   * Validate a coupon against a subtotal and return the computed discount.
   * @returns {{ valid: boolean, reason?: string, discount?: number, coupon?: object }}
   */
  evaluate(code, subtotal) {
    const coupon = this.findByCode(code);
    if (!coupon || !coupon.is_active) return { valid: false, reason: 'Coupon not found or inactive' };
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return { valid: false, reason: 'Coupon has expired' };
    if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
      return { valid: false, reason: 'Coupon usage limit reached' };
    if (subtotal < coupon.min_subtotal)
      return { valid: false, reason: `Minimum order of ${coupon.min_subtotal} required` };

    let discount =
      coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
    discount = Math.min(discount, subtotal);

    return { valid: true, discount, coupon };
  },
};

module.exports = CouponModel;
