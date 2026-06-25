'use strict';

/**
 * Error-handling primitives: a typed ApiError, an async-handler wrapper that
 * forwards rejected promises to Express, a 404 handler, and the central error
 * middleware that shapes every failure into a consistent JSON envelope.
 */

const logger = require('../utils/logger');
const config = require('../config');

/** Operational error with an HTTP status and optional machine-readable code. */
class ApiError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg || 'Bad request', 'BAD_REQUEST', details);
  }
  static unauthorized(msg) {
    return new ApiError(401, msg || 'Authentication required', 'UNAUTHORIZED');
  }
  static forbidden(msg) {
    return new ApiError(403, msg || 'You do not have permission', 'FORBIDDEN');
  }
  static notFound(msg) {
    return new ApiError(404, msg || 'Resource not found', 'NOT_FOUND');
  }
  static conflict(msg) {
    return new ApiError(409, msg || 'Conflict', 'CONFLICT');
  }
}

/** Wrap an async route handler so thrown/rejected errors reach Express. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 404 fallback for unmatched API routes. */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error middleware — must be registered last. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code;

  // Normalise common library / database errors.
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    status = 409;
    code = 'CONFLICT';
    message = 'A record with these details already exists.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    code = 'BAD_JSON';
    message = 'Malformed JSON body.';
  }

  if (status >= 500) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn('Request error', { status, message, path: req.originalUrl });
  }

  const payload = { error: { message, code: code || 'ERROR' } };
  if (err.details) payload.error.details = err.details;
  if (!config.isProd && status >= 500) payload.error.stack = err.stack;

  res.status(status).json(payload);
}

module.exports = { ApiError, asyncHandler, notFoundHandler, errorHandler };
