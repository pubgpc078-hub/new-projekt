'use strict';

/**
 * Database bootstrap.
 *
 * Opens a single shared better-sqlite3 connection, applies pragmatic
 * performance/safety pragmas, and lazily applies the schema. Exposes the raw
 * connection plus a couple of helpers used across the data-access layer.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./index');
const logger = require('../utils/logger');

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(config.db.path), { recursive: true });

const db = new Database(config.db.path);

// Pragmas: WAL for concurrent reads, foreign keys enforced, sane sync level.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

/** Apply the SQL schema (idempotent — every statement uses IF NOT EXISTS). */
function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  logger.info('Database schema ensured', { path: config.db.path });
}

migrate();

module.exports = { db, migrate };
