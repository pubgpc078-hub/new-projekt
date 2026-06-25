# منوجان کالا — Manojan Kala

An **enterprise-grade home-appliances e-commerce platform**: a luxury
customer storefront, a full admin dashboard, a secure REST API, a normalised
SQLite data layer, and an n8n automation layer — all production-ready and
runnable with a single command.

> فروشگاه آنلاین لوازم خانگی در سطح شرکت‌های بزرگ — رابط کاربری لوکس، بک‌اند امن
> و مقیاس‌پذیر، دیتابیس اصولی و اتوماسیون n8n.

---

## ✨ Features

### Storefront (customer)
- Luxury, minimal, **fully responsive** (mobile-first) UI with **dark/light mode**
- Home page: hero, category tiles, trending & featured products, promo banner,
  smart-suggestion section, testimonials, rich footer
- Catalogue with **live AJAX search (debounced)**, filters (category, brand,
  price), sorting and **pagination**
- Product detail page with gallery, specs, tabs, reviews and related products
- **Cart** (localStorage, server-authoritative pricing) and **checkout** with
  coupon support and order confirmation
- Customer dashboard: profile + order history
- Micro-interactions: hover animations, scroll-reveal, loading **skeletons**
- **SEO ready**: semantic HTML, meta + Open Graph tags, JSON-LD structured data,
  dynamic `sitemap.xml`, `robots.txt`, SEO-friendly slugs

### Admin dashboard
- KPI overview (products, orders, users, revenue) + low-stock alerts
- **Products CRUD** (create/edit/delete, featured/trending flags)
- **Orders** management with inline status transitions and detail modal
- **Categories**, **coupons**, **inventory** (with audit log), **users**

### Backend (REST API)
- Node.js + **Express 5**, modular MVC-ish architecture (routes → controllers →
  models)
- **JWT auth** (httpOnly cookie *or* `Authorization: Bearer`) with
  **role-based access** (customer / admin)
- **Transactional checkout**: stock validation, decrement, inventory logging and
  coupon usage all in one atomic SQLite transaction (rolls back on any failure)
- Security: **Helmet** (CSP), CORS, **rate limiting**, bcrypt password hashing,
  parameterised queries (SQL-injection safe), output escaping (XSS safe),
  exhaustive **input validation** (express-validator)
- Centralised **error handling** + structured **logging** (console + `logs/app.log`)

### Database (SQLite, normalised)
`users`, `categories`, `products`, `coupons`, `orders`, `order_items`,
`payments`, `reviews`, `inventory_logs` — with full **foreign keys**, **indexes**
on every access path, CHECK constraints, and monetary values stored as integer
minor units to avoid floating-point errors.

### Automation (n8n)
Fire-and-forget webhooks for `order.created`, `order.status_changed`,
`inventory.low_stock`, `user.registered` — Telegram alerts, confirmation
e-mails, Google-Sheets logging and inventory warnings. See
[`docs/n8n-automation.md`](docs/n8n-automation.md).

---

## 🚀 Quick start

```bash
# 1. Install dependencies
npm install

# 2. (optional) configure environment
cp .env.example .env        # then edit secrets / n8n URLs

# 3. Seed the database with demo catalogue + admin account
npm run seed

# 4. Run
npm start                   # http://localhost:3000
# or: npm run dev           # auto-reload
```

Default admin account (created by the seeder):

```
email:    admin@manojankala.com
password: Admin@12345
```

A demo customer is also created: `customer@manojankala.com` / `Customer@123`.

Run `npm run reset` to wipe and re-seed the database.

---

## ☁️ Deploy (view it on your phone)

The app is deploy-ready: it auto-seeds on first boot (`AUTO_SEED=true`), reads
`PORT` from the host and binds `0.0.0.0`. The quickest way to get a public
`https://` link you can open on a phone is **Render** (free, blueprint
included) — or Railway/Docker. Full step-by-step (doable from a phone) is in
[`DEPLOY.md`](DEPLOY.md).

```bash
# Or run as a container anywhere:
docker build -t manojan-kala . && docker run -p 3000:3000 manojan-kala
```

---

## 🧪 Tests

```bash
npm test
```

Integration tests cover catalogue queries, coupon math, the transactional
checkout (including rollback on insufficient stock), inventory auditing and
password hashing. They run against a throwaway database and never touch dev data.

---

## 🗂️ Project structure

```
.
├── server/
│   ├── index.js              # app entry: security, routes, static, SEO
│   ├── config/
│   │   ├── index.js          # validated env config
│   │   └── database.js       # better-sqlite3 connection + pragmas + migrate
│   ├── db/
│   │   ├── schema.sql        # full normalised schema (FKs + indexes)
│   │   └── seed.js           # demo data + admin
│   ├── middleware/           # auth, validation, errors
│   ├── models/               # data-access layer (one file per aggregate)
│   ├── controllers/          # request handlers
│   ├── routes/               # express routers + validation chains
│   └── utils/                # security, logger, n8n
├── public/                   # frontend (HTML + CSS + vanilla JS)
│   ├── *.html                # home, products, product, cart, checkout, …
│   ├── css/                  # design system + admin styles
│   └── js/                   # api client, app shell, per-page controllers
├── test/                     # node:test integration tests
└── docs/n8n-automation.md    # automation guide + workflow recipes
```

---

## 🔌 API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`  | `/api/health` | Health check |
| `POST` | `/api/auth/register` · `/login` · `/logout` | Auth |
| `GET`  | `/api/auth/me` | Current user |
| `GET`  | `/api/products` | Catalogue (q, category, brand, price, sort, page) |
| `GET`  | `/api/products/:slug` | Product + reviews + related |
| `POST` | `/api/products/:slug/reviews` | Add review *(auth)* |
| `GET`  | `/api/categories` · `/api/brands` | Facets |
| `POST` | `/api/cart/quote` | Server-authoritative cart pricing |
| `POST` | `/api/coupons/validate` | Preview a coupon |
| `POST` | `/api/orders` | Checkout (guest or user) |
| `GET`  | `/api/orders` | My orders *(auth)* |
| `GET`  | `/api/orders/:number` | Order lookup (owner/admin/guest+email) |
| `*`    | `/api/admin/*` | Admin: dashboard, products, orders, categories, coupons, inventory, users *(admin)* |

All money fields are **integer minor units** (e.g. Toman). Errors use a
consistent envelope: `{ "error": { "message", "code", "details?" } }`.

---

## 🔐 Security notes

- Change `JWT_SECRET` (and the seeded admin password) before any real
  deployment — the app refuses to boot in `production` with the default secret.
- Tokens are stored in an **httpOnly** cookie (`secure` in production).
- All DB access is via **prepared statements**; all user-rendered strings are
  HTML-escaped on the client.
- Rate limiting protects auth (`AUTH_RATE_LIMIT_MAX`) and the API
  (`RATE_LIMIT_MAX`) independently.

---

## 🛠️ Tech stack

**Backend:** Node.js · Express 5 · better-sqlite3 · jsonwebtoken · bcryptjs ·
helmet · express-rate-limit · express-validator
**Frontend:** HTML5 (semantic) · CSS3 (Grid/Flexbox/custom properties) ·
Vanilla JavaScript (no framework, no build step)
**Automation:** n8n (webhooks)

## 📄 License

MIT
