'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/orderController');
const { runValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/cart/quote', ctrl.quoteCart);

router.post(
  '/coupons/validate',
  [body('code').trim().notEmpty().withMessage('Coupon code is required')],
  runValidation,
  ctrl.validateCoupon
);

router.post(
  '/orders',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isInt({ min: 1 }).withMessage('Invalid product'),
    body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1–99'),
    body('customer.name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required'),
    body('customer.email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('customer.phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
    body('customer.address').trim().isLength({ min: 5, max: 300 }).withMessage('Shipping address is required'),
    body('customer.city').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
    body('customer.postal').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
    body('couponCode').optional({ values: 'falsy' }).trim(),
  ],
  runValidation,
  ctrl.createOrder
);

router.get('/orders', requireAuth, ctrl.myOrders);
router.get('/orders/:number', ctrl.getOrder);

module.exports = router;
