/* ════════════════════════════════════════════════════════════════════
   App shell — theme, cart state (localStorage), auth state, header wiring,
   toasts, live search, and shared rendering helpers used by every page.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const CART_KEY = 'mk_cart';
  const THEME_KEY = 'mk_theme';

  /* ── Money & misc formatting ─────────────────────────────────────── */
  const fmt = new Intl.NumberFormat('fa-IR');
  function toman(minor) {
    // Prices are stored in Rial-like minor units; display as Toman.
    return fmt.format(Math.round(minor)) + ' تومان';
  }
  function stars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ── Theme ───────────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* ── Cart (localStorage) ─────────────────────────────────────────── */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
    window.dispatchEvent(new CustomEvent('cart:changed'));
  }
  function cartCount() {
    return getCart().reduce((n, i) => n + i.quantity, 0);
  }
  function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, 99);
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image_url: product.image_url,
        quantity,
      });
    }
    saveCart(cart);
    toast(`«${product.name.slice(0, 30)}» به سبد اضافه شد`, 'success');
  }
  function setQuantity(productId, quantity) {
    let cart = getCart();
    if (quantity <= 0) cart = cart.filter((i) => i.productId !== productId);
    else { const it = cart.find((i) => i.productId === productId); if (it) it.quantity = Math.min(quantity, 99); }
    saveCart(cart);
  }
  function removeFromCart(productId) {
    saveCart(getCart().filter((i) => i.productId !== productId));
  }
  function clearCart() { saveCart([]); }
  function updateCartBadge() {
    document.querySelectorAll('[data-cart-badge]').forEach((el) => {
      const n = cartCount();
      el.textContent = n;
      el.classList.toggle('hidden', n === 0);
    });
  }

  /* ── Auth state ──────────────────────────────────────────────────── */
  let currentUser = null;
  async function loadUser() {
    try { const { user } = await API.me(); currentUser = user; }
    catch { currentUser = null; }
    renderAuthArea();
    return currentUser;
  }
  function getUser() { return currentUser; }

  /* ── Toasts ──────────────────────────────────────────────────────── */
  function toast(message, type = 'info') {
    let host = document.querySelector('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    el.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    host.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(() => el.remove(), 250); }, 3200);
  }

  /* ── Header rendering ────────────────────────────────────────────── */
  function renderHeader(active) {
    const header = document.querySelector('[data-app-header]');
    if (!header) return;
    header.innerHTML = `
      <div class="site-header">
        <div class="container header-inner">
          <button class="icon-btn menu-toggle" data-menu-toggle aria-label="منو">${icon('menu')}</button>
          <a href="/index.html" class="logo">
            <span class="mark">م</span>
            <span class="mark-text">منوجان<b>کالا</b></span>
          </a>
          <nav class="nav" data-nav>
            <a href="/index.html" data-k="home">خانه</a>
            <a href="/products.html" data-k="products">فروشگاه</a>
            <a href="/products.html?featured=1" data-k="featured">پیشنهاد ویژه</a>
            <a href="/index.html#contact" data-k="contact">تماس</a>
          </nav>
          <div class="search" data-search>
            <span class="search-icon">${icon('search')}</span>
            <input type="search" placeholder="جستجوی محصولات…" aria-label="جستجو" data-search-input autocomplete="off">
            <div class="search-results hidden" data-search-results></div>
          </div>
          <div class="header-actions">
            <button class="icon-btn search-toggle" title="جستجو" data-search-toggle aria-label="جستجو">${icon('search')}</button>
            <button class="icon-btn" title="تغییر تم" data-theme-toggle aria-label="تغییر تم">
              <span class="icon-sun">${icon('sun')}</span><span class="icon-moon">${icon('moon')}</span>
            </button>
            <a href="/cart.html" class="icon-btn" title="سبد خرید" aria-label="سبد خرید">
              ${icon('cart')}<span class="cart-badge hidden" data-cart-badge>0</span>
            </a>
            <span data-auth-area></span>
          </div>
        </div>
      </div>`;

    if (active) {
      const link = header.querySelector(`[data-k="${active}"]`);
      if (link) link.classList.add('active');
    }
    header.querySelector('[data-theme-toggle]').addEventListener('click', toggleTheme);
    header.querySelector('[data-menu-toggle]').addEventListener('click', () => {
      header.querySelector('[data-nav]').classList.toggle('open');
    });
    header.querySelector('[data-search-toggle]').addEventListener('click', () => {
      header.querySelector('[data-search]').classList.toggle('mobile-open');
      header.querySelector('[data-search-input]').focus();
    });
    wireSearch(header);
    updateCartBadge();
    renderAuthArea();
  }

  /* ── Bottom nav (mobile app-shell) ──────────────────────────────── */
  function renderBottomNav(active) {
    const host = document.querySelector('[data-app-bottomnav]');
    if (!host) return;
    document.body.classList.add('has-bottom-nav');
    const items = [
      { k: 'home', href: '/index.html', label: 'خانه', icon: 'home' },
      { k: 'products', href: '/products.html', label: 'دسته‌بندی', icon: 'grid' },
      { k: 'cart', href: '/cart.html', label: 'سبد خرید', icon: 'cart', badge: true },
      { k: 'profile', href: currentUser ? (currentUser.role === 'admin' ? '/admin.html' : '/dashboard.html') : '/login.html', label: 'پروفایل', icon: 'user' },
    ];
    host.innerHTML = `
      <nav class="bottom-nav">
        ${items.map((it) => `
          <a class="bn-item${it.k === active ? ' active' : ''}" href="${it.href}">
            ${icon(it.icon)}
            <span>${it.label}</span>
            ${it.badge ? `<span class="bn-badge hidden" data-cart-badge>0</span>` : ''}
          </a>`).join('')}
      </nav>`;
    updateCartBadge();
  }

  function renderAuthArea() {
    document.querySelectorAll('[data-auth-area]').forEach((el) => {
      if (currentUser) {
        el.innerHTML = `<a href="${currentUser.role === 'admin' ? '/admin.html' : '/dashboard.html'}" class="icon-btn" title="${escapeHtml(currentUser.name)}" aria-label="حساب کاربری">${icon('user')}</a>`;
      } else {
        el.innerHTML = `<a href="/login.html" class="icon-btn" title="ورود" aria-label="ورود">${icon('user')}</a>`;
      }
    });
  }

  /* ── Live search (debounced AJAX) ────────────────────────────────── */
  function wireSearch(scope) {
    const input = scope.querySelector('[data-search-input]');
    const results = scope.querySelector('[data-search-results]');
    if (!input) return;
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { results.classList.add('hidden'); return; }
      timer = setTimeout(async () => {
        try {
          const { items } = await API.products({ q, perPage: 6 });
          if (!items.length) { results.innerHTML = '<div style="padding:16px;color:var(--text-muted)">نتیجه‌ای یافت نشد</div>'; }
          else {
            results.innerHTML = items.map((p) => `
              <a href="/product.html?slug=${encodeURIComponent(p.slug)}">
                <img src="${escapeHtml(p.image_url)}" alt="" loading="lazy">
                <div><div class="sr-name">${escapeHtml(p.name)}</div><div class="sr-price">${toman(p.price)}</div></div>
              </a>`).join('');
          }
          results.classList.remove('hidden');
        } catch { /* ignore */ }
      }, 280);
    });
    document.addEventListener('click', (e) => { if (!scope.querySelector('[data-search]').contains(e.target)) results.classList.add('hidden'); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const q = input.value.trim(); if (q) location.href = '/products.html?q=' + encodeURIComponent(q); }
    });
  }

  /* ── Footer ──────────────────────────────────────────────────────── */
  function renderFooter() {
    const footer = document.querySelector('[data-app-footer]');
    if (!footer) return;
    footer.innerHTML = `
      <footer class="site-footer" id="contact">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col">
              <a href="/index.html" class="logo" style="margin-bottom:14px">
                <span class="mark">م</span><span class="mark-text">منوجان<b>کالا</b></span>
              </a>
              <p>فروشگاه آنلاین لوازم خانگی با ضمانت اصالت کالا، ارسال سریع و پشتیبانی ۷ روز هفته.</p>
              <div class="newsletter">
                <input type="email" placeholder="ایمیل شما برای تخفیف‌ها" aria-label="ایمیل">
                <button class="btn btn-primary" data-newsletter>عضویت</button>
              </div>
            </div>
            <div class="footer-col">
              <h5>دسترسی سریع</h5>
              <a href="/products.html">همه محصولات</a>
              <a href="/products.html?featured=1">پیشنهاد ویژه</a>
              <a href="/cart.html">سبد خرید</a>
              <a href="/dashboard.html">حساب کاربری</a>
            </div>
            <div class="footer-col">
              <h5>دسته‌بندی‌ها</h5>
              <div data-footer-cats><a href="/products.html">فروشگاه</a></div>
            </div>
            <div class="footer-col">
              <h5>تماس با ما</h5>
              <p>📞 ۰۲۱-۹۱۰۰۰۰۰۰</p>
              <p>✉ support@manojankala.com</p>
              <p>📍 تهران، خیابان ولیعصر</p>
            </div>
          </div>
          <div class="footer-bottom">
            <span>© ۲۰۲۶ منوجان کالا — تمامی حقوق محفوظ است.</span>
            <span>طراحی و توسعه با ❤ در سطح Enterprise</span>
          </div>
        </div>
      </footer>`;
    footer.querySelector('[data-newsletter]')?.addEventListener('click', () => toast('از عضویت شما متشکریم!', 'success'));
    API.categories().then(({ categories }) => {
      const el = footer.querySelector('[data-footer-cats]');
      if (el) el.innerHTML = categories.slice(0, 5).map((c) => `<a href="/products.html?category=${c.slug}">${escapeHtml(c.name)}</a>`).join('');
    }).catch(() => {});
  }

  /* ── Product card markup (reused on home + catalogue) ────────────── */
  function productCard(p) {
    const onSale = p.compare_price && p.compare_price > p.price;
    const discount = onSale ? Math.round((1 - p.price / p.compare_price) * 100) : 0;
    return `
      <article class="product-card reveal">
        <a class="product-media" href="/product.html?slug=${encodeURIComponent(p.slug)}">
          ${onSale ? `<span class="badge">${discount}% تخفیف</span>` : ''}
          ${p.is_trending ? '<span class="badge trending">پرفروش</span>' : ''}
          <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy">
        </a>
        <div class="product-body">
          <span class="product-brand">${escapeHtml(p.brand || '')}</span>
          <a class="product-name" href="/product.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.name)}</a>
          <div class="product-rating"><span class="stars">${stars(p.rating_avg)}</span><span>(${p.rating_count})</span></div>
          <div class="product-foot">
            <div class="price-wrap">
              ${onSale ? `<span class="price-old">${toman(p.compare_price)}</span>` : ''}
              <span class="price">${toman(p.price)}</span>
            </div>
            <button class="add-btn" data-add="${p.id}" title="افزودن به سبد" aria-label="افزودن به سبد">${icon('plus')}</button>
          </div>
        </div>
      </article>`;
  }

  // Delegate "add to cart" clicks on product cards.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    try {
      // Resolve the product's slug from the card, then fetch the authoritative
      // record so we store the correct price/image regardless of stale markup.
      const card = btn.closest('.product-card');
      const slug = new URL(card.querySelector('.product-name').href).searchParams.get('slug');
      const { product } = await API.product(slug);
      addToCart(product);
    } catch { toast('خطا در افزودن به سبد', 'error'); }
  });

  /* ── Scroll reveal ───────────────────────────────────────────────── */
  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); } });
    }, { threshold: 0.08 });
    const watch = () => document.querySelectorAll('.reveal:not(.in)').forEach((el) => obs.observe(el));
    watch();
    window.addEventListener('content:rendered', watch);
  }

  /* ── Inline SVG icons (2px stroke, rounded terminals) ─────────────── */
  function icon(name) {
    const p = {
      search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
      moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
      menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
      home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
      grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9"/>',
      shield: '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z"/>',
      box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
      close: '<path d="M18 6 6 18M6 6l12 12"/>',
      addCart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/><path d="M17 5v6M14 8h6"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name] || ''}</svg>`;
  }

  /* ── Boot the shell on every page ────────────────────────────────── */
  function boot(options = {}) {
    initTheme();
    renderHeader(options.active);
    if (options.bottomNav !== false) renderBottomNav(options.active);
    renderFooter();
    updateCartBadge();
    initReveal();
    loadUser().then(() => { if (options.bottomNav !== false) renderBottomNav(options.active); });
  }

  // Public surface
  window.App = {
    boot, toman, stars, escapeHtml, icon,
    getCart, saveCart, addToCart, setQuantity, removeFromCart, clearCart, cartCount, updateCartBadge,
    toast, productCard, loadUser, getUser, renderAuthArea, initReveal,
  };

  // Apply theme before paint to avoid a flash.
  initTheme();
})();
