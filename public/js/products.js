/* Catalogue page — URL-driven filters, sorting & pagination. */
(function () {
  App.boot({ active: 'products' });

  const state = {
    q: '', category: '', brand: '', minPrice: '', maxPrice: '',
    featured: '', trending: '', sort: 'newest', page: 1, perPage: 12,
  };

  /** Hydrate state from the query string so links/filters are shareable. */
  function readUrl() {
    const p = new URLSearchParams(location.search);
    for (const k of Object.keys(state)) {
      if (p.has(k)) state[k] = p.get(k);
    }
    state.page = parseInt(state.page, 10) || 1;
  }

  /** Reflect state back into the URL (without reloading). */
  function writeUrl() {
    const p = new URLSearchParams();
    Object.entries(state).forEach(([k, v]) => {
      if (v && !(k === 'page' && v === 1) && !(k === 'perPage' && v === 12) && !(k === 'sort' && v === 'newest')) {
        p.set(k, v);
      }
    });
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  const results = document.querySelector('[data-results]');

  async function load() {
    writeUrl();
    results.innerHTML = Array.from({ length: 8 }).map(() => '<div class="skeleton sk-card"></div>').join('');
    try {
      const data = await API.products(state);
      renderResults(data);
    } catch {
      results.innerHTML = '<p class="muted">خطا در بارگذاری محصولات.</p>';
    }
  }

  function renderResults({ items, pagination }) {
    document.querySelector('[data-result-count]').textContent = `${pagination.total} محصول یافت شد`;
    results.innerHTML = items.length
      ? items.map(App.productCard).join('')
      : '<div class="empty-state"><div class="emoji">🔍</div><h3>محصولی یافت نشد</h3><p class="muted">فیلترها را تغییر دهید.</p></div>';
    window.dispatchEvent(new Event('content:rendered'));
    renderPagination(pagination);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderPagination({ page, totalPages }) {
    const host = document.querySelector('[data-pagination]');
    if (totalPages <= 1) { host.innerHTML = ''; return; }
    let html = `<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (Math.abs(i - page) === 2) {
        html += '<button disabled>…</button>';
      }
    }
    html += `<button ${page === totalPages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;
    host.innerHTML = html;
    host.querySelectorAll('[data-page]').forEach((b) =>
      b.addEventListener('click', () => { state.page = parseInt(b.dataset.page, 10); load(); })
    );
  }

  /* ── Filters ─────────────────────────────────────────────────────── */
  async function buildFilters() {
    try {
      const [{ categories }, { brands }] = await Promise.all([API.categories(), API.brands()]);

      const catEl = document.querySelector('[data-filter-categories]');
      catEl.innerHTML =
        `<label class="filter-opt"><input type="radio" name="cat" value="" ${!state.category ? 'checked' : ''}> همه</label>` +
        categories.map((c) => `
          <label class="filter-opt"><input type="radio" name="cat" value="${c.slug}" ${state.category === c.slug ? 'checked' : ''}>
            ${App.escapeHtml(c.name)} <span class="muted" style="margin-inline-start:auto">${c.product_count}</span></label>`).join('');
      catEl.querySelectorAll('input').forEach((i) =>
        i.addEventListener('change', () => { state.category = i.value; state.page = 1; updateTitle(categories); load(); }));

      const brandEl = document.querySelector('[data-filter-brands]');
      brandEl.innerHTML =
        `<label class="filter-opt"><input type="radio" name="brand" value="" ${!state.brand ? 'checked' : ''}> همه</label>` +
        brands.map((b) => `<label class="filter-opt"><input type="radio" name="brand" value="${App.escapeHtml(b)}" ${state.brand === b ? 'checked' : ''}> ${App.escapeHtml(b)}</label>`).join('');
      brandEl.querySelectorAll('input').forEach((i) =>
        i.addEventListener('change', () => { state.brand = i.value; state.page = 1; load(); }));

      updateTitle(categories);
    } catch { /* ignore */ }
  }

  function updateTitle(categories) {
    let title = 'همه محصولات';
    if (state.q) title = `نتایج جستجو: «${state.q}»`;
    else if (state.featured) title = 'پیشنهادهای ویژه';
    else if (state.trending) title = 'محصولات پرفروش';
    else if (state.category) {
      const c = categories?.find((x) => x.slug === state.category);
      if (c) title = c.name;
    }
    document.querySelector('[data-title]').textContent = title;
    document.querySelector('[data-crumb]').textContent = title;
    document.title = `${title} | منوجان کالا`;
  }

  /* ── Wire toolbar ────────────────────────────────────────────────── */
  document.querySelector('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; load(); });
  document.querySelector('[data-apply-price]').addEventListener('click', () => {
    state.minPrice = document.querySelector('[data-min-price]').value;
    state.maxPrice = document.querySelector('[data-max-price]').value;
    state.page = 1; load();
  });
  document.querySelector('[data-clear]').addEventListener('click', () => {
    Object.assign(state, { q: '', category: '', brand: '', minPrice: '', maxPrice: '', featured: '', trending: '', sort: 'newest', page: 1 });
    location.href = '/products.html';
  });

  /* ── Init ────────────────────────────────────────────────────────── */
  readUrl();
  document.querySelector('[data-sort]').value = state.sort;
  document.querySelector('[data-min-price]').value = state.minPrice;
  document.querySelector('[data-max-price]').value = state.maxPrice;
  buildFilters();
  load();
})();
