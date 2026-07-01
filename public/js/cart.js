/* Cart page — server-authoritative quote (prices recomputed by the API). */
(function () {
  App.boot({ active: 'cart' });

  const root = document.querySelector('[data-cart-root]');
  let coupon = sessionStorage.getItem('mk_coupon') || '';

  async function render() {
    const cart = App.getCart();
    if (!cart.length) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="emoji">🛒</div>
          <h3>سبد خرید شما خالی است</h3>
          <p class="muted" style="margin:8px 0 20px">محصولات مورد علاقه خود را اضافه کنید.</p>
          <a href="/products.html" class="btn btn-primary btn-lg">شروع خرید</a>
        </div>`;
      return;
    }

    // Ask the server for authoritative pricing, stock and coupon evaluation.
    let quote;
    try {
      quote = await API.quote({ items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })), couponCode: coupon });
    } catch {
      App.toast('خطا در محاسبه سبد', 'error');
      return;
    }

    root.innerHTML = `
      <div class="cart-layout">
        <div>
          <div data-items></div>
          <button class="btn btn-ghost btn-sm" data-clear style="margin-top:16px">خالی کردن سبد</button>
        </div>
        <aside class="summary">
          <h3>خلاصه سفارش</h3>
          <div class="coupon-row">
            <input placeholder="کد تخفیف" data-coupon value="${App.escapeHtml(coupon)}">
            <button class="btn btn-accent" data-apply-coupon>اعمال</button>
          </div>
          <div data-coupon-msg></div>
          <div class="summary-row"><span>جمع کالاها</span><span data-subtotal></span></div>
          <div class="summary-row"><span>تخفیف</span><span data-discount style="color:var(--success)"></span></div>
          <div class="summary-row"><span>هزینه ارسال</span><span style="color:var(--success)">رایگان</span></div>
          <div class="summary-row total"><span>مبلغ قابل پرداخت</span><span data-total></span></div>
          <a href="/checkout.html" class="btn btn-primary btn-block btn-lg" style="margin-top:18px">ادامه و تسویه حساب</a>
        </aside>
      </div>`;

    renderItems(quote);
    renderSummary(quote);

    root.querySelector('[data-clear]').addEventListener('click', () => { App.clearCart(); render(); });
    root.querySelector('[data-apply-coupon]').addEventListener('click', () => {
      coupon = root.querySelector('[data-coupon]').value.trim().toUpperCase();
      sessionStorage.setItem('mk_coupon', coupon);
      render();
    });
  }

  function renderItems({ items }) {
    const el = root.querySelector('[data-items]');
    el.innerHTML = items.map((it) => `
      <div class="cart-item">
        <div class="ci-media"><img src="${App.escapeHtml(it.image_url)}" alt="${App.escapeHtml(it.name)}"></div>
        <div class="ci-body">
          <div class="ci-top">
            <a class="ci-name" href="/product.html?slug=${encodeURIComponent(it.slug)}">${App.escapeHtml(it.name)}</a>
            <button class="ci-delete" data-remove="${it.productId}" aria-label="حذف">${App.icon('trash')}</button>
          </div>
          <div class="ci-meta">${App.toman(it.unitPrice)} در هر عدد</div>
          ${it.quantity > it.stock ? `<div class="ci-meta" style="color:var(--danger)">فقط ${it.stock} عدد موجود است</div>` : ''}
          <div class="ci-bottom">
            <div class="qty-stepper">
              <button data-dec="${it.productId}" aria-label="کاهش">−</button><span>${it.quantity}</span><button data-inc="${it.productId}" aria-label="افزایش">+</button>
            </div>
            <span class="ci-price">${App.toman(it.lineTotal)}</span>
          </div>
        </div>
      </div>`).join('');

    el.querySelectorAll('[data-inc]').forEach((b) => b.addEventListener('click', () => { adjust(b.dataset.inc, 1); }));
    el.querySelectorAll('[data-dec]').forEach((b) => b.addEventListener('click', () => { adjust(b.dataset.dec, -1); }));
    el.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => { App.removeFromCart(parseInt(b.dataset.remove, 10)); render(); }));
  }

  function adjust(productId, delta) {
    const id = parseInt(productId, 10);
    const item = App.getCart().find((i) => i.productId === id);
    if (item) { App.setQuantity(id, item.quantity + delta); render(); }
  }

  function renderSummary({ subtotal, discount, total, couponError }) {
    root.querySelector('[data-subtotal]').textContent = App.toman(subtotal);
    root.querySelector('[data-discount]').textContent = discount ? '− ' + App.toman(discount) : '۰ تومان';
    root.querySelector('[data-total]').textContent = App.toman(total);
    const msg = root.querySelector('[data-coupon-msg]');
    if (couponError) msg.innerHTML = `<p style="color:var(--danger);font-size:.82rem;margin-bottom:10px">${App.escapeHtml(couponError)}</p>`;
    else if (discount) msg.innerHTML = `<p style="color:var(--success);font-size:.82rem;margin-bottom:10px">✓ کد تخفیف اعمال شد</p>`;
    else msg.innerHTML = '';
  }

  render();
})();
