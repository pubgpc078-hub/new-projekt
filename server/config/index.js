'use strict';

/**
 * Centralised, validated application configuration.
 *
 * Every environment variable is read in exactly one place so the rest of the
 * codebase can depend on a typed, defaulted config object instead of touching
 * `process.env` directly.
 */

const path = require('path');
require('dotenv').config();

const root = path.resolve(__dirname, '..', '..');

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
  isProd,
  root,

  server: {
    port: int(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
  },

  db: {
    path: path.isAbsolute(process.env.DB_PATH || '')
      ? process.env.DB_PATH
      : path.join(root, process.env.DB_PATH || 'data/manojan_kala.db'),
    // When true, the server seeds demo data on boot if the catalogue is empty.
    // Handy for zero-config cloud deploys (Render/Railway/etc.).
    autoSeed: bool(process.env.AUTO_SEED, false),
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'insecure-dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: process.env.JWT_COOKIE_NAME || 'mk_token',
    bcryptRounds: int(process.env.BCRYPT_ROUNDS, 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: int(process.env.RATE_LIMIT_MAX, 300),
    authMax: int(process.env.AUTH_RATE_LIMIT_MAX, 20),
  },

  inventory: {
    lowStockThreshold: int(process.env.LOW_STOCK_THRESHOLD, 5),
  },

  n8n: {
    enabled: bool(process.env.N8N_ENABLED, false),
    secret: process.env.N8N_WEBHOOK_SECRET || '',
    webhooks: {
      orderCreated: process.env.N8N_ORDER_CREATED_WEBHOOK || '',
      orderStatus: process.env.N8N_ORDER_STATUS_WEBHOOK || '',
      lowStock: process.env.N8N_LOW_STOCK_WEBHOOK || '',
      userRegistered: process.env.N8N_USER_REGISTERED_WEBHOOK || '',
    },
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@manojankala.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

// Fail fast in production if secrets were left at their insecure defaults.
if (isProd && config.auth.jwtSecret === 'insecure-dev-secret-change-me') {
  // eslint-disable-next-line no-console
  console.error('FATAL: JWT_SECRET must be set to a strong value in production.');
  process.exit(1);
}

module.exports = config;
