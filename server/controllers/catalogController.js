'use strict';

const { ProductModel } = require('../models/productModel');
const CategoryModel = require('../models/categoryModel');
const ReviewModel = require('../models/reviewModel');
const { ApiError, asyncHandler } = require('../middleware/errors');

/** GET /api/products — paginated, filterable catalogue. */
const listProducts = asyncHandler(async (req, res) => {
  const {
    q, category, brand, minPrice, maxPrice, featured, trending, sort, page, perPage,
  } = req.query;

  const result = ProductModel.search({
    q,
    category,
    brand,
    minPrice: minPrice != null && minPrice !== '' ? parseInt(minPrice, 10) : null,
    maxPrice: maxPrice != null && maxPrice !== '' ? parseInt(maxPrice, 10) : null,
    featured: featured === 'true' || featured === '1',
    trending: trending === 'true' || trending === '1',
    sort,
    page,
    perPage,
  });
  res.json(result);
});

/** GET /api/products/:slug — single product + reviews + related. */
const getProduct = asyncHandler(async (req, res) => {
  const product = ProductModel.findBySlug(req.params.slug);
  if (!product || !product.is_active) throw ApiError.notFound('Product not found');

  const reviews = ReviewModel.listForProduct(product.id);
  const related = ProductModel.related(product.id, product.category_id);
  res.json({ product, reviews, related });
});

/** GET /api/products/:slug/reviews */
const listReviews = asyncHandler(async (req, res) => {
  const product = ProductModel.findBySlug(req.params.slug);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ reviews: ReviewModel.listForProduct(product.id) });
});

/** POST /api/products/:slug/reviews — auth required. */
const addReview = asyncHandler(async (req, res) => {
  const product = ProductModel.findBySlug(req.params.slug);
  if (!product) throw ApiError.notFound('Product not found');

  const { rating, title, body } = req.body;
  const review = ReviewModel.upsert({
    productId: product.id,
    userId: req.user.id,
    authorName: req.user.name,
    rating: parseInt(rating, 10),
    title,
    body,
  });
  res.status(201).json({ review });
});

/** GET /api/categories */
const listCategories = asyncHandler(async (req, res) => {
  res.json({ categories: CategoryModel.all() });
});

/** GET /api/brands */
const listBrands = asyncHandler(async (req, res) => {
  res.json({ brands: ProductModel.brands() });
});

module.exports = {
  listProducts,
  getProduct,
  listReviews,
  addReview,
  listCategories,
  listBrands,
};
