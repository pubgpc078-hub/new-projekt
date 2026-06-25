/* Order confirmation page (external file to satisfy strict CSP). */
(function () {
  App.boot();
  const root = document.querySelector('[data-confirm-root]');
  const params = new URLSearchParams(location.search);
  const number = params.get('number');
  const last = JSON.parse(sessionStorage.getItem('mk_last_order') || '{}');
  const email = last.email;

  async function load() {
    if (!number) { root.innerHTML = '<div class="empty-state"><div class="emoji">❓</div><h3>سفارشی یافت نشد</h3></div>'; return; }
    try {
      const { order } = await API.order(number, email);
      render(order);
    } catch {
      root.innerHTML = `<div class="empty-state"><div class="emoji">😕</div><h3>سفارش یافت نشد</h3><p class="muted">شماره سفارش: ${App.escapeHtml(number)}</p></div>`;
    }
  }

  function render(o) {
    root.innerHTML = `
      <div class="form-card" style="max-width:640px;margin:30px auto;text-align:center">
        <div style="font-size:4rem">✅</div>
        <h1 style="font-size:1.8rem;margin:10px 0">سفارش شما ثبت شد!</h1>
        <p class="muted">از خرید شما متشکریم. جزئیات سفارش به ایمیل شما ارسال خواهد شد.</p>
        <div style="background:var(--bg-muted);border-radius:var(--radius);padding:18px;margin:24px 0">
          <div class="summary-row"><span>شماره سفارش</span><strong>${App.escapeHtml(o.order_number)}</strong></div>
          <div class="summary-row"><span>وضعیت</span><span class="status-tag status-${o.status}">${statusFa(o.status)}</span></div>
          <div class="summary-row"><span>مبلغ کل</span><strong>${App.toman(o.total)}</strong></div>
        </div>
        <div style="text-align:start;margin-bottom:20px">
          ${o.items.map((i) => `<div class="summary-row"><span>${App.escapeHtml(i.product_name)} × ${i.quantity}</span><span>${App.toman(i.line_total)}</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="/products.html" class="btn btn-primary">ادامه خرید</a>
          <a href="/dashboard.html" class="btn btn-ghost">سفارش‌های من</a>
        </div>
      </div>`;
  }

  function statusFa(s) {
    return { pending: 'در انتظار پرداخت', paid: 'پرداخت شده', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' }[s] || s;
  }
  load();
})();
