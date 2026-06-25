'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/catalogController');
const { runValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/categories', ctrl.listCategories);
router.get('/brands', ctrl.listBrands);

router.get('/products', ctrl.listProducts);
router.get('/products/:slug', ctrl.getProduct);
router.get('/products/:slug/reviews', ctrl.listReviews);

router.post(
  '/products/:slug/reviews',
  requireAuth,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1–5'),
    body('title').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
    body('body').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
  ],
  runValidation,
  ctrl.addReview
);

module.exports = router;
