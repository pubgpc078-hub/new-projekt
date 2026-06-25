'use strict';

/**
 * express-validator integration. `runValidation` collects any validation
 * failures produced by the rule chains and turns them into a single 400
 * ApiError with structured field details.
 */

const { validationResult } = require('express-validator');
const { ApiError } = require('./errors');

function runValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest('Validation failed', details));
}

module.exports = { runValidation };
