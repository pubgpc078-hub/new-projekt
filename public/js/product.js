/* Product detail page — gallery, specs, reviews, related, add-to-cart. */
(function () {
  App.boot({ active: 'products' });

  const slug = new URLSearchParams(location.search).get('slug');
  const root = document.querySelector('[data-pdp-root]');
  let product = null;
  let quantity = 1;

  if (!slug) { root.innerHTML = '<div class="empty-state"><div class="emoji">❓</div><h3>محصول یافت نشد</h3></div>'; return; }

  async function load() {
    try {
      const data = await API.product(slug);
      product = data.product;
      render(data);
    } catch {
      root.innerHTML = '<div class="empty-state"><div class="emoji">😕</div><h3>محصول یافت نشد</h3><a href="/products.html" class="btn btn-primary" style="margin-top:14px">بازگشت به فروشگاه</a></div>';
    }
  }

  function render({ product: p, reviews, related }) {
    const onSale = p.compare_price && p.compare_price > p.price;
    const inStock = p.stock > 0;
    const gallery = (p.gallery && p.gallery.length ? p.gallery : [p.image_url]).filter(Boolean);

    document.querySelector('[data-title]').textContent = `${p.name} | منوجان کالا`;
    document.querySelector('[data-meta-desc]').setAttribute('content', p.short_desc || p.name);
    document.querySelector('[data-schema]').textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: p.image_url,
      description: p.short_desc || p.name, brand: { '@type': 'Brand', name: p.brand || '' },
      aggregateRating: p.rating_count ? { '@type': 'AggregateRating', ratingValue: p.rating_avg, reviewCount: p.rating_count } : undefined,
      offers: { '@type': 'Offer', price: p.price, priceCurrency: 'IRR', availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    });

    const specs = p.specs && Object.keys(p.specs).length
      ? `<table class="specs-table">${Object.entries(p.specs).map(([k, v]) => `<tr><td>${App.escapeHtml(k)}</td><td>${App.escapeHtml(v)}</td></tr>`).join('')}</table>`
      : '<p class="muted">مشخصاتی ثبت نشده است.</p>';

    root.innerHTML = `
      <nav class="breadcrumb" style="padding-top:24px">
        <a href="/index.html">خانه</a> / <a href="/products.html">فروشگاه</a>
        ${p.category_slug ? ` / <a href="/products.html?category=${p.category_slug}">${App.escapeHtml(p.category_name)}</a>` : ''}
        / <span>${App.escapeHtml(p.name)}</span>
      </nav>
      <div class="pdp">
        <div class="pdp-gallery">
          <div class="pdp-main-img"><img src="${App.escapeHtml(gallery[0])}" alt="${App.escapeHtml(p.name)}" data-main-img></div>
        </div>
        <div>
          <span class="product-brand">${App.escapeHtml(p.brand || '')}</span>
          <h1>${App.escapeHtml(p.name)}</h1>
          <div class="product-rating"><span class="stars">${App.stars(p.rating_avg)}</span><span>${p.rating_avg} از ۵ (${p.rating_count} نظر)</span></div>
          <p class="muted" style="margin-top:14px">${App.escapeHtml(p.short_desc || '')}</p>
          <div class="pdp-price">
            <span class="price">${App.toman(p.price)}</span>
            ${onSale ? `<span class="price-old">${App.toman(p.compare_price)}</span>` : ''}
          </div>
          <div>${inStock ? `<span class="pill in-stock">✓ موجود در انبار (${p.stock} عدد)</span>` : '<span class="pill out">ناموجود</span>'}</div>
          <div class="qty-row">
            <div class="qty-stepper">
              <button data-qty="-1" aria-label="کاهش">−</button><span data-qty-val>1</span><button data-qty="1" aria-label="افزایش">+</button>
            </div>
            <button class="btn btn-primary btn-lg" data-add-cart ${inStock ? '' : 'disabled'} style="flex:1">
              ${inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
            </button>
          </div>
          <div class="grid features" style="grid-template-columns:1fr 1fr;margin-top:10px">
            <div class="feature" style="padding:14px"><span class="f-icon">🚚</span><div><h4>ارسال سریع</h4><p>۲ تا ۵ روز کاری</p></div></div>
            <div class="feature" style="padding:14px"><span class="f-icon">🛡️</span><div><h4>گارانتی</h4><p>ضمانت اصالت کالا</p></div></div>
          </div>
        </div>
      </div>

      <div class="tabs-pdp">
        <button class="active" data-tab="desc">توضیحات</button>
        <button data-tab="specs">مشخصات فنی</button>
        <button data-tab="reviews">نظرات (${reviews.length})</button>
      </div>
      <div class="tab-panel" data-panel="desc"><p style="white-space:pre-line">${App.escapeHtml(p.description || p.short_desc || '')}</p></div>
      <div class="tab-panel hidden" data-panel="specs">${specs}</div>
      <div class="tab-panel hidden" data-panel="reviews" data-reviews></div>

      ${related.length ? `
      <section class="section">
        <div class="section-head"><h2>محصولات مرتبط</h2></div>
        <div class="grid product-grid">${related.map(App.productCard).join('')}</div>
      </section>` : ''}
    `;

    wireGallery(gallery);
    wireQty(p);
    wireTabs();
    renderReviews(reviews);
    window.dispatchEvent(new Event('content:rendered'));
  }

  function wireGallery(gallery) {
    const main = root.querySelector('[data-main-img]');
    root.querySelectorAll('[data-thumb]').forEach((t) =>
      t.addEventListener('click', () => { main.src = t.dataset.thumb; }));
  }

  function wireQty(p) {
    const val = root.querySelector('[data-qty-val]');
    root.querySelectorAll('[data-qty]').forEach((b) =>
      b.addEventListener('click', () => {
        quantity = Math.min(Math.max(quantity + parseInt(b.dataset.qty, 10), 1), Math.max(p.stock, 1));
        val.textContent = quantity;
      }));
    root.querySelector('[data-add-cart]').addEventListener('click', () => {
      App.addToCart(p, quantity);
    });
  }

  function wireTabs() {
    root.querySelectorAll('[data-tab]').forEach((btn) =>
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === btn));
        root.querySelectorAll('[data-panel]').forEach((pnl) => pnl.classList.toggle('hidden', pnl.dataset.panel !== btn.dataset.tab));
      }));
  }

  function renderReviews(reviews) {
    const el = root.querySelector('[data-reviews]');
    const user = App.getUser();
    const list = reviews.length
      ? reviews.map((r) => `
        <div class="review">
          <div class="review-head"><b>${App.escapeHtml(r.author_name)}</b><span class="stars">${App.stars(r.rating)}</span></div>
          ${r.title ? `<strong>${App.escapeHtml(r.title)}</strong>` : ''}
          <p class="muted">${App.escapeHtml(r.body || '')}</p>
        </div>`).join('')
      : '<p class="muted">هنوز نظری ثبت نشده است. اولین نفر باشید!</p>';

    const form = user ? `
      <div class="form-card" style="margin-top:24px">
        <h3 style="margin-bottom:16px">ثبت نظر شما</h3>
        <div class="field"><label>امتیاز</label>
          <select data-rev-rating><option value="5">★★★★★ عالی</option><option value="4">★★★★ خوب</option><option value="3">★★★ متوسط</option><option value="2">★★ ضعیف</option><option value="1">★ بد</option></select>
        </div>
        <div class="field"><label>عنوان</label><input data-rev-title placeholder="عنوان نظر"></div>
        <div class="field"><label>متن نظر</label><textarea data-rev-body rows="3" placeholder="تجربه خود را بنویسید…"></textarea></div>
        <button class="btn btn-primary" data-rev-submit>ثبت نظر</button>
      </div>`
      : '<p class="muted" style="margin-top:18px">برای ثبت نظر <a href="/login.html" style="color:var(--brand);font-weight:700">وارد شوید</a>.</p>';

    el.innerHTML = list + form;

    el.querySelector('[data-rev-submit]')?.addEventListener('click', async () => {
      try {
        await API.addReview(slug, {
          rating: parseInt(el.querySelector('[data-rev-rating]').value, 10),
          title: el.querySelector('[data-rev-title]').value.trim(),
          body: el.querySelector('[data-rev-body]').value.trim(),
        });
        App.toast('نظر شما ثبت شد، متشکریم!', 'success');
        load();
      } catch (e) { App.toast(e.message || 'خطا در ثبت نظر', 'error'); }
    });
  }

  load();
})();
