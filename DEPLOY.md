# Deploying Manojan Kala (get a public link you can open on your phone)

The app is ready for a **zero-config** deploy: it auto-seeds the demo
catalogue + admin account on first boot (`AUTO_SEED=true`), reads `PORT` from
the host, and binds to `0.0.0.0`. Below is the easiest path that gives you an
`https://…` URL viewable on any phone.

> Branch note: this code lives on the branch
> `claude/ecommerce-enterprise-system-4vrlcs`. Pick that branch when the host
> asks which branch to deploy.

---

## Option A — Render (recommended, free, has a blueprint)

You can do this entirely from your phone's browser.

1. Go to **https://dashboard.render.com** and sign in with **GitHub**
   (authorize access to the `new-projekt` repository).
2. Tap **New +** → **Blueprint**.
3. Select the repo **`pubgpc078-hub/new-projekt`**.
4. Choose the branch **`claude/ecommerce-enterprise-system-4vrlcs`**.
   Render reads `render.yaml` automatically (free plan, Node, health check,
   auto-generated `JWT_SECRET`, auto-seed on).
5. Tap **Apply** / **Create**. Wait ~2–3 minutes for the build.
6. Open the URL Render gives you, e.g. `https://manojan-kala.onrender.com`.

Admin login: `admin@manojankala.com` / `Admin@12345`.

> Free tier sleeps after ~15 min idle; the first request then takes ~30–50s to
> wake. The database is ephemeral, so it re-seeds the demo catalogue on each
> cold start (orders placed during a session are demo-only).

---

## Option B — Railway (uses the Dockerfile)

1. Go to **https://railway.app** → sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → `new-projekt`.
3. In **Settings → Source**, set the branch to
   `claude/ecommerce-enterprise-system-4vrlcs`.
4. Add a variable: `JWT_SECRET` = any long random string (Railway runs in
   production mode, so this is required). `AUTO_SEED=true` is already baked into
   the Dockerfile.
5. Deploy, then open the generated public domain (Settings → Networking →
   Generate Domain).

---

## Option C — Run with Docker anywhere

```bash
docker build -t manojan-kala .
docker run -p 3000:3000 manojan-kala
# open http://localhost:3000
```

To view that from your phone on the **same Wi-Fi**, open
`http://<your-computer-LAN-IP>:3000` (find the IP with `ipconfig` / `ifconfig`).

---

## Option D — Local on your computer (then phone via same Wi-Fi)

```bash
npm install
npm run seed
npm start            # http://localhost:3000
```

Then from your phone on the same network: `http://<computer-IP>:3000`.

---

## Production hardening checklist (when it stops being a demo)

- Set a strong `JWT_SECRET` (Render generates one; set it yourself elsewhere).
- Change the seeded admin password (`SEED_ADMIN_PASSWORD`) or delete the demo
  admin and create your own.
- Attach a **persistent disk** and point `DB_PATH` at it (or migrate to Postgres)
  so orders/users survive restarts.
- Set `CORS_ORIGINS` to your real domain instead of `*`.
- Configure the n8n webhook URLs (see `docs/n8n-automation.md`).
