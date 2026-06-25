'use strict';

const { ProductModel } = require('../models/productModel');
const CategoryModel = require('../models/categoryModel');
const OrderModel = require('../models/orderModel');
const CouponModel = require('../models/couponModel');
const UserModel = require('../models/userModel');
const InventoryModel = require('../models/inventoryModel');
const ReviewModel = require('../models/reviewModel');
const { ApiError, asyncHandler } = require('../middleware/errors');
const { automation } = require('../utils/n8n');
const { slugify } = require('../utils/security');
const logger = require('../utils/logger');

/* ── Dashboard ─────────────────────────────────────────────────────── */
const dashboard = asyncHandler(async (req, res) => {
  res.json({
    stats: {
      products: ProductModel.count(),
      orders: OrderModel.count(),
      users: UserModel.count(),
      revenue: OrderModel.revenue(),
    },
    ordersByStatus: OrderModel.statusBreakdown(),
    recentOrders: OrderModel.listAll({ limit: 8 }),
    lowStock: InventoryModel.lowStock(),
  });
});

/* ── Products ──────────────────────────────────────────────────────── */
const listProducts = asyncHandler(async (req, res) => {
  const result = ProductModel.search({
    q: req.query.q,
    page: req.query.page,
    perPage: req.query.perPage || 50,
    includeInactive: true,
    sort: req.query.sort,
  });
  res.json(result);
});

function buildSlug(name, explicit) {
  let base = slugify(explicit || name) || `product-${Date.now()}`;
  let slug = base;
  let i = 1;
  while (ProductModel.findBySlug(slug)) slug = `${base}-${i++}`;
  return slug;
}

const createProduct = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = buildSlug(data.name, data.slug);
  const product = ProductModel.create(data);
  logger.info('Product created', { id: product.id, name: product.name });
  res.status(201).json({ product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = ProductModel.update(parseInt(req.params.id, 10), req.body);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const changes = ProductModel.remove(parseInt(req.params.id, 10));
  if (!changes) throw ApiError.notFound('Product not found');
  res.json({ ok: true });
});

/* ── Inventory ─────────────────────────────────────────────────────── */
const adjustStock = asyncHandler(async (req, res) => {
  const { delta, reason } = req.body;
  const product = InventoryModel.adjust(parseInt(req.params.id, 10), parseInt(delta, 10), reason || 'manual');
  // Notify automation when an adjustment leaves the product low on stock.
  const lowStock = InventoryModel.lowStock().find((p) => p.id === product.id);
  if (lowStock) automation.lowStock(lowStock);
  res.json({ product });
});

const inventoryLogs = asyncHandler(async (req, res) => {
  res.json({ logs: InventoryModel.logs({ productId: req.query.productId, limit: 200 }) });
});

/* ── Categories ────────────────────────────────────────────────────── */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, parentId, sortOrder } = req.body;
  const slug = slugify(req.body.slug || name);
  if (CategoryModel.findBySlug(slug)) throw ApiError.conflict('Category slug already exists');
  const category = CategoryModel.create({ name, slug, description, icon, parentId, sortOrder });
  res.status(201).json({ category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = CategoryModel.update(parseInt(req.params.id, 10), req.body);
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const changes = CategoryModel.remove(parseInt(req.params.id, 10));
  if (!changes) throw ApiError.notFound('Category not found');
  res.json({ ok: true });
});

/* ── Orders ────────────────────────────────────────────────────────── */
const listOrders = asyncHandler(async (req, res) => {
  res.json({ orders: OrderModel.listAll({ status: req.query.status, limit: 100 }) });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = OrderModel.findByNumber(req.params.number);
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = OrderModel.findByNumber(req.params.number);
  if (!order) throw ApiError.notFound('Order not found');
  const updated = OrderModel.updateStatus(order.id, req.body.status);
  logger.info('Order status updated', { orderNumber: order.order_number, status: req.body.status });
  automation.orderStatusChanged({
    orderNumber: updated.order_number,
    status: updated.status,
    customer: { name: updated.customer_name, email: updated.customer_email },
  });
  res.json({ order: updated });
});

/* ── Coupons ───────────────────────────────────────────────────────── */
const listCoupons = asyncHandler(async (req, res) => {
  res.json({ coupons: CouponModel.all() });
});

const createCoupon = asyncHandler(async (req, res) => {
  const coupon = CouponModel.create(req.body);
  res.status(201).json({ coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const changes = CouponModel.remove(parseInt(req.params.id, 10));
  if (!changes) throw ApiError.notFound('Coupon not found');
  res.json({ ok: true });
});

/* ── Users ─────────────────────────────────────────────────────────── */
const listUsers = asyncHandler(async (req, res) => {
  res.json({ users: UserModel.list({ limit: 100 }) });
});

/* ── Reviews ───────────────────────────────────────────────────────── */
const deleteReview = asyncHandler(async (req, res) => {
  const changes = ReviewModel.remove(parseInt(req.params.id, 10));
  if (!changes) throw ApiError.notFound('Review not found');
  res.json({ ok: true });
});

module.exports = {
  dashboard,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  inventoryLogs,
  createCategory,
  updateCategory,
  deleteCategory,
  listOrders,
  getOrder,
  updateOrderStatus,
  listCoupons,
  createCoupon,
  deleteCoupon,
  listUsers,
  deleteReview,
};
