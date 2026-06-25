'use strict';

/**
 * Tiny structured logger.
 *
 * Writes human-readable lines to the console and, additionally, appends
 * machine-parseable JSON lines to `logs/app.log` so that the application has a
 * persistent audit trail without pulling in a heavyweight logging dependency.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

let fileStream = null;
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fileStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
} catch {
  // If we cannot open the log file (read-only FS, etc.) we still log to stdout.
  fileStream = null;
}

const COLORS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

function write(level, message, meta) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const time = new Date().toISOString();
  const record = { time, level, message, ...(meta || {}) };

  // Console (coloured, readable)
  const color = COLORS[level] || '';
  const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](
    `${color}[${time}] ${level.toUpperCase()}${COLORS.reset} ${message}${metaStr}`
  );

  // Persistent JSON line
  if (fileStream) {
    try {
      fileStream.write(`${JSON.stringify(record)}\n`);
    } catch {
      /* ignore file write errors */
    }
  }
}

module.exports = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};
