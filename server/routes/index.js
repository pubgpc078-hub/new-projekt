'use strict';

const express = require('express');
const { version } = require('../../package.json');

const authRoutes = require('./auth');
const catalogRoutes = require('./catalog');
const orderRoutes = require('./orders');
const adminRoutes = require('./admin');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', version, time: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/', catalogRoutes);
router.use('/', orderRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
