'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/adminController');
const { runValidation } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every admin route requires an authenticated admin.
router.use(requireAuth, requireRole('admin'));

router.get('/dashboard', ctrl.dashboard);

/* Products */
const productRules = [
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('Name is required'),
  body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('compare_price').optional({ values: 'null' }).isInt({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('category_id').optional({ values: 'null' }).isInt({ min: 1 }),
];
router.get('/products', ctrl.listProducts);
router.post('/products', productRules, runValidation, ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

/* Inventory */
router.post(
  '/products/:id/stock',
  [body('delta').isInt().withMessage('delta must be an integer')],
  runValidation,
  ctrl.adjustStock
);
router.get('/inventory/logs', ctrl.inventoryLogs);

/* Categories */
router.post(
  '/categories',
  [body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name is required')],
  runValidation,
  ctrl.createCategory
);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

/* Orders */
router.get('/orders', ctrl.listOrders);
router.get('/orders/:number', ctrl.getOrder);
router.patch(
  '/orders/:number/status',
  [
    body('status')
      .isIn(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  runValidation,
  ctrl.updateOrderStatus
);

/* Coupons */
router.get('/coupons', ctrl.listCoupons);
router.post(
  '/coupons',
  [
    body('code').trim().isLength({ min: 3, max: 40 }).withMessage('Code is required'),
    body('type').isIn(['percent', 'fixed']).withMessage('Type must be percent or fixed'),
    body('value').isInt({ min: 0 }).withMessage('Value must be a non-negative integer'),
  ],
  runValidation,
  ctrl.createCoupon
);
router.delete('/coupons/:id', ctrl.deleteCoupon);

/* Users & reviews */
router.get('/users', ctrl.listUsers);
router.delete('/reviews/:id', ctrl.deleteReview);

module.exports = router;
