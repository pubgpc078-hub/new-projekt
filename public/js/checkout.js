/* Checkout — shipping form, server-side quote, and order placement. */
(function () {
  App.boot();

  const root = document.querySelector('[data-checkout-root]');
  const coupon = sessionStorage.getItem('mk_coupon') || '';

  async function render() {
    const cart = App.getCart();
    if (!cart.length) {
      root.innerHTML = '<div class="empty-state"><div class="emoji">🛒</div><h3>سبد خرید خالی است</h3><a href="/products.html" class="btn btn-primary" style="margin-top:14px">بازگشت به فروشگاه</a></div>';
      return;
    }

    let quote;
    try {
      quote = await API.quote({ items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })), couponCode: coupon });
    } catch { App.toast('خطا در محاسبه سبد', 'error'); return; }

    const user = App.getUser();

    root.innerHTML = `
      <div class="checkout-grid">
        <form class="form-card" data-form novalidate>
          <h3 style="margin-bottom:18px">اطلاعات تحویل گیرنده</h3>
          <div class="form-row">
            <div class="field"><label>نام و نام خانوادگی *</label><input name="name" value="${user ? App.escapeHtml(user.name) : ''}" required></div>
            <div class="field"><label>شماره تماس *</label><input name="phone" placeholder="09xxxxxxxxx" value="${user && user.phone ? App.escapeHtml(user.phone) : ''}"></div>
          </div>
          <div class="field"><label>ایمیل *</label><input name="email" type="email" value="${user ? App.escapeHtml(user.email) : ''}" required></div>
          <div class="field"><label>آدرس کامل *</label><textarea name="address" rows="3" placeholder="استان، شهر، خیابان، پلاک…" required></textarea></div>
          <div class="form-row">
            <div class="field"><label>شهر</label><input name="city"></div>
            <div class="field"><label>کد پستی</label><input name="postal"></div>
          </div>
          <div class="field"><label>توضیحات سفارش</label><textarea name="notes" rows="2" placeholder="اختیاری"></textarea></div>
          <div class="field err" data-form-err style="display:none"></div>
        </form>

        <aside class="summary">
          <h3>سفارش شما</h3>
          <div data-summary-items style="margin-bottom:14px"></div>
          <div class="summary-row"><span>جمع کالاها</span><span>${App.toman(quote.subtotal)}</span></div>
          <div class="summary-row"><span>تخفیف</span><span style="color:var(--success)">${quote.discount ? '− ' + App.toman(quote.discount) : '۰'}</span></div>
          <div class="summary-row"><span>ارسال</span><span style="color:var(--success)">رایگان</span></div>
          <div class="summary-row total"><span>قابل پرداخت</span><span>${App.toman(quote.total)}</span></div>
          <div class="field" style="margin-top:16px">
            <label>روش پرداخت</label>
            <select name="payment"><option>پرداخت در محل (COD)</option><option>درگاه پرداخت آنلاین</option></select>
          </div>
          <button class="btn btn-primary btn-block btn-lg" data-submit>ثبت نهایی سفارش</button>
          <p class="muted" style="font-size:.78rem;text-align:center;margin-top:10px">🔒 اطلاعات شما امن و رمزنگاری شده است</p>
        </aside>
      </div>`;

    root.querySelector('[data-summary-items]').innerHTML = quote.items.map((it) =>
      `<div class="summary-row"><span>${App.escapeHtml(it.name.slice(0, 26))} × ${it.quantity}</span><span>${App.toman(it.lineTotal)}</span></div>`).join('');

    root.querySelector('[data-submit]').addEventListener('click', submit);
  }

  async function submit() {
    const form = root.querySelector('[data-form]');
    const fd = new FormData(form);
    const customer = {
      name: fd.get('name').trim(),
      email: fd.get('email').trim(),
      phone: fd.get('phone').trim(),
      address: fd.get('address').trim(),
      city: fd.get('city').trim(),
      postal: fd.get('postal').trim(),
      notes: fd.get('notes').trim(),
    };
    const errEl = root.querySelector('[data-form-err]');
    if (!customer.name || !customer.email || customer.address.length < 5) {
      errEl.textContent = 'لطفاً نام، ایمیل و آدرس را کامل وارد کنید.';
      errEl.style.display = 'block';
      return;
    }

    const btn = root.querySelector('[data-submit]');
    btn.disabled = true; btn.textContent = 'در حال ثبت…';
    try {
      const { order } = await API.checkout({
        items: App.getCart().map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customer,
        couponCode: coupon,
      });
      App.clearCart();
      sessionStorage.removeItem('mk_coupon');
      sessionStorage.setItem('mk_last_order', JSON.stringify({ number: order.order_number, email: order.customer_email }));
      location.href = `/order-confirmation.html?number=${order.order_number}`;
    } catch (e) {
      errEl.textContent = e.message || 'خطا در ثبت سفارش';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'ثبت نهایی سفارش';
    }
  }

  render();
})();
