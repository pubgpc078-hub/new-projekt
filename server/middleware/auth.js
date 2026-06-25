'use strict';

/**
 * Authentication & authorisation middleware.
 *
 * Tokens are accepted either as an httpOnly cookie (browser sessions) or a
 * `Authorization: Bearer <token>` header (API clients). Role checks are
 * declarative via `requireRole('admin')`.
 */

const { verifyToken } = require('../utils/security');
const { ApiError } = require('./errors');
const config = require('../config');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies[config.auth.cookieName]) return req.cookies[config.auth.cookieName];
  return null;
}

/** Populate req.user when a valid token is present; otherwise leave it null. */
function attachUser(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
  } catch {
    req.user = null;
  }
  next();
}

/** Hard requirement: a valid authenticated user must be present. */
function requireAuth(req, res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  next();
}

/** Require the authenticated user to hold one of the given roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
