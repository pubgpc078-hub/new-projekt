/* Home page — loads categories, trending and featured products. */
(function () {
  App.boot({ active: 'home' });

  function renderProducts(selector, items) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = items.length
      ? items.map(App.productCard).join('')
      : '<p class="muted">محصولی برای نمایش وجود ندارد.</p>';
    window.dispatchEvent(new Event('content:rendered'));
  }

  /** Bento layout: first item large (image + copy), the rest as small horizontal tiles. */
  function bentoCard(p, large) {
    const price = `${App.toman(p.price)}`;
    if (large) {
      return `
        <article class="bento-large reveal">
          <a class="bl-media" href="/product.html?slug=${encodeURIComponent(p.slug)}">
            <img src="${App.escapeHtml(p.image_url)}" alt="${App.escapeHtml(p.name)}" loading="lazy">
          </a>
          <div class="bl-body">
            <div class="bl-rating"><span class="stars">${App.stars(p.rating_avg)}</span><span class="muted">${p.rating_avg}</span></div>
            <h3>${App.escapeHtml(p.name)}</h3>
            <p class="bl-desc">${App.escapeHtml(p.short_desc || '')}</p>
            <div class="bl-foot">
              <span class="price">${price}</span>
              <button class="add-circle" data-add="${p.id}" title="افزودن به سبد" aria-label="افزودن به سبد">${App.icon('addCart')}</button>
            </div>
          </div>
        </article>`;
    }
    return `
      <article class="bento-item reveal">
        <a class="bi-media" href="/product.html?slug=${encodeURIComponent(p.slug)}">
          <img src="${App.escapeHtml(p.image_url)}" alt="${App.escapeHtml(p.name)}" loading="lazy">
        </a>
        <div class="bi-body">
          <h5>${App.escapeHtml(p.name)}</h5>
          <div class="bi-rating"><span class="stars">${App.stars(p.rating_avg)}</span><span class="muted">${p.rating_avg}</span></div>
          <span class="bi-price">${price}</span>
        </div>
      </article>`;
  }

  function renderBento(items) {
    const el = document.querySelector('[data-trending]');
    if (!el) return;
    if (!items.length) { el.innerHTML = '<p class="muted">محصولی برای نمایش وجود ندارد.</p>'; return; }
    const [first, ...rest] = items;
    el.innerHTML = bentoCard(first, true) + `<div class="bento-small">${rest.slice(0, 3).map((p) => bentoCard(p, false)).join('')}</div>`;
    window.dispatchEvent(new Event('content:rendered'));
  }

  async function loadCategories() {
    try {
      const { categories } = await API.categories();
      const el = document.querySelector('[data-categories]');
      el.innerHTML = categories.map((c) => `
        <a class="cat-tile reveal" href="/products.html?category=${c.slug}">
          <span class="cat-icon">${c.icon || '🏠'}</span>
          <span class="cat-name">${App.escapeHtml(c.name)}</span>
          <span class="cat-count">${c.product_count} محصول</span>
        </a>`).join('');
      window.dispatchEvent(new Event('content:rendered'));
    } catch { /* keep skeletons */ }
  }

  async function loadSections() {
    try {
      const [trending, featured] = await Promise.all([
        API.products({ trending: 1, perPage: 4, sort: 'rating' }),
        API.products({ featured: 1, perPage: 8 }),
      ]);
      renderBento(trending.items);
      renderProducts('[data-featured]', featured.items.slice(0, 4));
    } catch (e) {
      App.toast('خطا در بارگذاری محصولات', 'error');
    }
  }

  loadCategories();
  loadSections();
})();
