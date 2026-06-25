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
      renderProducts('[data-trending]', trending.items);
      renderProducts('[data-featured]', featured.items.slice(0, 4));
    } catch (e) {
      App.toast('خطا در بارگذاری محصولات', 'error');
    }
  }

  loadCategories();
  loadSections();
})();
