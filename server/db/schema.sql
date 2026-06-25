-- ════════════════════════════════════════════════════════════════════
-- Manojan Kala — Relational schema (SQLite)
--
-- Design notes:
--   * Third-normal-form where it matters; denormalised counters avoided in
--     favour of indexed aggregate queries.
--   * Every foreign key is declared and enforced (PRAGMA foreign_keys = ON).
--   * Indexes back every common access path (lookups, filters, joins).
--   * Monetary values are stored as INTEGER minor units (e.g. Toman) to avoid
--     floating-point rounding errors.
-- ════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

-- ── Users ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  phone         TEXT,
  role          TEXT    NOT NULL DEFAULT 'customer'
                        CHECK (role IN ('customer', 'admin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ── Categories (self-referential tree) ──────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_slug   ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ── Products ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  slug           TEXT    NOT NULL UNIQUE,
  brand          TEXT,
  sku            TEXT    UNIQUE,
  description    TEXT,
  short_desc     TEXT,
  price          INTEGER NOT NULL CHECK (price >= 0),      -- minor units
  compare_price  INTEGER CHECK (compare_price >= 0),       -- "was" price
  category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url      TEXT,
  gallery        TEXT,                                     -- JSON array
  specs          TEXT,                                     -- JSON object
  rating_avg     REAL    NOT NULL DEFAULT 0,
  rating_count   INTEGER NOT NULL DEFAULT 0,
  is_featured    INTEGER NOT NULL DEFAULT 0,
  is_trending    INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_price    ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_trending ON products(is_trending);

-- ── Coupons / discounts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL UNIQUE,
  type          TEXT    NOT NULL CHECK (type IN ('percent', 'fixed')),
  value         INTEGER NOT NULL CHECK (value >= 0),
  min_subtotal  INTEGER NOT NULL DEFAULT 0,
  max_discount  INTEGER,                                   -- cap for percent
  usage_limit   INTEGER,                                   -- NULL = unlimited
  used_count    INTEGER NOT NULL DEFAULT 0,
  expires_at    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- ── Orders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number     TEXT    NOT NULL UNIQUE,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status           TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','paid','processing',
                                             'shipped','delivered','cancelled')),
  subtotal         INTEGER NOT NULL,
  discount         INTEGER NOT NULL DEFAULT 0,
  shipping_fee     INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  coupon_code      TEXT,
  customer_name    TEXT    NOT NULL,
  customer_email   TEXT    NOT NULL,
  customer_phone   TEXT,
  shipping_address TEXT    NOT NULL,
  shipping_city    TEXT,
  shipping_postal  TEXT,
  notes            TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- ── Order line items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT    NOT NULL,                           -- snapshot
  unit_price   INTEGER NOT NULL,                           -- snapshot
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ── Payments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT    NOT NULL DEFAULT 'manual',
  amount       INTEGER NOT NULL,
  status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','succeeded','failed','refunded')),
  reference    TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- ── Reviews ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT    NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_approved INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (product_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- ── Inventory audit log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change      INTEGER NOT NULL,                            -- +restock / -sale
  reason      TEXT    NOT NULL,
  reference   TEXT,                                        -- e.g. order number
  stock_after INTEGER NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_logs(product_id);
