'use strict';

const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { runValidation } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  ],
  runValidation,
  ctrl.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  runValidation,
  ctrl.login
);

router.post('/logout', ctrl.logout);
router.get('/me', ctrl.me);
router.patch(
  '/me',
  requireAuth,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  ],
  runValidation,
  ctrl.updateProfile
);

module.exports = router;
