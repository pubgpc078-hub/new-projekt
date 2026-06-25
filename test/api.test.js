'use strict';

/**
 * Integration tests for the core commerce flows. Runs against an isolated
 * in-memory-ish database (a temp file) so it never touches dev data.
 *
 *   npm test
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Point the app at a throwaway database BEFORE anything loads config.
const tmpDb = path.join(os.tmpdir(), `mk-test-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.N8N_ENABLED = 'false';

const { db } = require('../server/config/database');
const { hashPassword } = require('../server/utils/security');
const { ProductModel } = require('../server/models/productModel');
const CategoryModel = require('../server/models/categoryModel');
const CouponModel = require('../server/models/couponModel');
const OrderModel = require('../server/models/orderModel');
const InventoryModel = require('../server/models/inventoryModel');

// ── Fixtures ──────────────────────────────────────────────────────────
let category, product, lowProduct;

test.before(() => {
  category = CategoryModel.create({ name: 'Test', slug: 'test' });
  product = ProductModel.create({
    name: 'Test Fridge', slug: 'test-fridge', brand: 'Acme',
    price: 1000000, stock: 10, category_id: category.id,
  });
  lowProduct = ProductModel.create({
    name: 'Scarce Item', slug: 'scarce', price: 500000, stock: 2, category_id: category.id,
  });
  CouponModel.create({ code: 'TEN', type: 'percent', value: 10, min_subtotal: 0 });
  CouponModel.create({ code: 'FIVEK', type: 'fixed', value: 50000, min_subtotal: 600000 });
});

test.after(() => {
  try { fs.unlinkSync(tmpDb); fs.unlinkSync(tmpDb + '-shm'); fs.unlinkSync(tmpDb + '-wal'); } catch { /* */ }
});

// ── Catalogue ─────────────────────────────────────────────────────────
test('product search returns active products with pagination', () => {
  const { items, pagination } = ProductModel.search({ perPage: 10 });
  assert.ok(items.length >= 2);
  assert.equal(pagination.page, 1);
  assert.ok(pagination.total >= 2);
});

test('product search filters by category slug', () => {
  const { items } = ProductModel.search({ category: 'test' });
  assert.ok(items.every((p) => p.category_slug === 'test'));
});

test('full-text-ish search matches product name', () => {
  const { items } = ProductModel.search({ q: 'Fridge' });
  assert.ok(items.some((p) => p.slug === 'test-fridge'));
});

// ── Coupons ───────────────────────────────────────────────────────────
test('percent coupon computes correct discount', () => {
  const r = CouponModel.evaluate('TEN', 1000000);
  assert.equal(r.valid, true);
  assert.equal(r.discount, 100000);
});

test('fixed coupon enforces minimum subtotal', () => {
  const tooLow = CouponModel.evaluate('FIVEK', 100000);
  assert.equal(tooLow.valid, false);
  const ok = CouponModel.evaluate('FIVEK', 700000);
  assert.equal(ok.valid, true);
  assert.equal(ok.discount, 50000);
});

test('unknown coupon is rejected', () => {
  assert.equal(CouponModel.evaluate('NOPE', 1000000).valid, false);
});

// ── Orders (transactional) ────────────────────────────────────────────
test('creating an order decrements stock and records line items', () => {
  const before = ProductModel.findById(product.id).stock;
  const order = OrderModel.create({
    user: null,
    items: [{ productId: product.id, quantity: 2 }],
    customer: { name: 'Buyer', email: 'b@test.com', address: 'Somewhere 123' },
    couponCode: 'TEN',
  });
  assert.match(order.order_number, /^MK-/);
  assert.equal(order.subtotal, 2000000);
  assert.equal(order.discount, 200000);
  assert.equal(order.total, 1800000);
  assert.equal(order.items.length, 1);
  assert.equal(ProductModel.findById(product.id).stock, before - 2);
});

test('order is rejected and rolled back when stock is insufficient', () => {
  const before = ProductModel.findById(lowProduct.id).stock;
  assert.throws(() =>
    OrderModel.create({
      user: null,
      items: [{ productId: lowProduct.id, quantity: 99 }],
      customer: { name: 'Buyer', email: 'b@test.com', address: 'Somewhere 123' },
    })
  );
  // Stock must be unchanged after the failed transaction.
  assert.equal(ProductModel.findById(lowProduct.id).stock, before);
});

test('low-stock items are surfaced after an order', () => {
  const order = OrderModel.create({
    user: null,
    items: [{ productId: lowProduct.id, quantity: 1 }],
    customer: { name: 'Buyer', email: 'b@test.com', address: 'Somewhere 123' },
  });
  assert.ok(Array.isArray(order.lowStock));
  assert.ok(order.lowStock.some((p) => p.id === lowProduct.id));
});

test('order status transitions update the order', () => {
  const order = OrderModel.create({
    user: null,
    items: [{ productId: product.id, quantity: 1 }],
    customer: { name: 'Buyer', email: 'b@test.com', address: 'Somewhere 123' },
  });
  const updated = OrderModel.updateStatus(order.id, 'shipped');
  assert.equal(updated.status, 'shipped');
});

// ── Inventory ─────────────────────────────────────────────────────────
test('inventory adjustment writes an audit log and cannot go negative', () => {
  const p = InventoryModel.adjust(product.id, 5, 'restock');
  assert.ok(p.stock >= 5);
  const logs = InventoryModel.logs({ productId: product.id });
  assert.ok(logs.length >= 1);
  assert.throws(() => InventoryModel.adjust(product.id, -100000, 'bad'));
});

// ── Security ──────────────────────────────────────────────────────────
test('passwords hash and verify correctly', async () => {
  const hash = await hashPassword('Secret123');
  const { verifyPassword } = require('../server/utils/security');
  assert.equal(await verifyPassword('Secret123', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
});
