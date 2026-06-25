'use strict';

/**
 * Manojan Kala — application entry point.
 *
 * Wires together security middleware (Helmet, CORS, rate limiting), the REST
 * API, static frontend delivery, SEO endpoints (sitemap/robots) and the
 * centralised error handling.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const apiRoutes = require('./routes');
const { attachUser } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const { ProductModel } = require('./models/productModel');
const CategoryModel = require('./models/categoryModel');

const app = express();
const PUBLIC_DIR = path.join(config.root, 'public');

app.disable('x-powered-by');
app.set('trust proxy', 1);

/* ── Security headers (Helmet + a tuned CSP) ───────────────────────── */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

/* ── CORS ──────────────────────────────────────────────────────────── */
const corsOptions = {
  origin: config.cors.origins.includes('*') ? true : config.cors.origins,
  credentials: true,
};
app.use(cors(corsOptions));

/* ── Body parsing & cookies ────────────────────────────────────────── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

/* ── Rate limiting ─────────────────────────────────────────────────── */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please slow down.', code: 'RATE_LIMITED' } },
});

/* ── Request logging (lightweight) ─────────────────────────────────── */
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      logger.debug('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    }
  });
  next();
});

/* ── Auth context for every request ────────────────────────────────── */
app.use(attachUser);

/* ── API ───────────────────────────────────────────────────────────── */
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter, apiRoutes);

/* ── SEO: robots.txt & dynamic sitemap.xml ─────────────────────────── */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${config.server.publicUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const base = config.server.publicUrl;
  const urls = [
    { loc: `${base}/`, priority: '1.0' },
    { loc: `${base}/products.html`, priority: '0.9' },
  ];
  for (const c of CategoryModel.all()) {
    urls.push({ loc: `${base}/products.html?category=${c.slug}`, priority: '0.7' });
  }
  const { items } = ProductModel.search({ perPage: 60, sort: 'newest' });
  for (const p of items) {
    urls.push({ loc: `${base}/product.html?slug=${p.slug}`, priority: '0.8' });
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
      .join('\n') +
    `\n</urlset>\n`;
  res.type('application/xml').send(body);
});

/* ── Static frontend ───────────────────────────────────────────────── */
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (/\.(css|js|png|jpg|jpeg|svg|webp|woff2?)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
);

/* ── 404 handling ──────────────────────────────────────────────────── */
app.use('/api', notFoundHandler);
app.use((req, res, next) => {
  // SPA-ish fallback: unknown non-API GET requests render the home page.
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
  next();
});

/* ── Central error handler ─────────────────────────────────────────── */
app.use(errorHandler);

/* ── Boot ──────────────────────────────────────────────────────────── */
async function start() {
  // Zero-config deploys: seed demo data on first boot when AUTO_SEED is set.
  if (config.db.autoSeed) {
    try {
      const seed = require('./db/seed');
      const seeded = await seed(false);
      if (seeded) logger.info('Auto-seed completed (empty database detected)');
    } catch (err) {
      logger.error('Auto-seed failed', { error: err.message });
    }
  }

  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info('Manojan Kala server started', {
      url: `http://${config.server.host}:${config.server.port}`,
      env: config.env,
      n8n: config.n8n.enabled,
    });
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('Fatal startup error', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

module.exports = app;
