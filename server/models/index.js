'use strict';

/**
 * Shared helpers for the data-access layer. Each model file requires the
 * singleton `db` connection and these small mapping utilities.
 */

const { db } = require('../config/database');

/** Parse a JSON column safely, returning a fallback on failure. */
function parseJson(value, fallback) {
  if (value == null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = { db, parseJson };
