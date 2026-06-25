'use strict';

/**
 * Password hashing, JWT signing/verification, and assorted small security
 * helpers used by the auth layer.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

/** Hash a plaintext password with the configured bcrypt cost. */
function hashPassword(plain) {
  return bcrypt.hash(plain, config.auth.bcryptRounds);
}

/** Constant-time compare a plaintext password against a stored hash. */
function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Sign a JWT for an authenticated user. */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name, email: user.email },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

/** Verify a JWT and return its decoded payload, or throw. */
function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

/** Cryptographically-random URL-safe token (used for order numbers, etc.). */
function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Build a human-friendly, collision-resistant order number. */
function generateOrderNumber() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MK-${ymd}-${rand}`;
}

/** Slugify arbitrary text for SEO-friendly URLs (supports Persian/Unicode). */
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  randomToken,
  generateOrderNumber,
  slugify,
};
