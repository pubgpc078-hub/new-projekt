/* Customer dashboard — profile + order history. */
(function () {
  App.boot();
  const root = document.querySelector('[data-dash-root]');

  const statusFa = (s) => ({ pending: 'در انتظار پرداخت', paid: 'پرداخت شده', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' }[s] || s);

  async function init() {
    const user = await App.loadUser();
    if (!user) { location.href = '/login.html?next=/dashboard.html'; return; }

    root.innerHTML = `
      <div class="dash-grid">
        <aside class="dash-nav">
          <button class="active" data-view="orders">📦 سفارش‌های من</button>
          <button data-view="profile">👤 پروفایل</button>
          <button data-logout>🚪 خروج</button>
        </aside>
        <div data-panel></div>
      </div>`;

    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('active', x === b));
      b.dataset.view === 'orders' ? showOrders() : showProfile(user);
    }));
    root.querySelector('[data-logout]').addEventListener('click', async () => {
      await API.logout(); App.toast('خارج شدید', 'success'); location.href = '/index.html';
    });

    showOrders();
  }

  async function showOrders() {
    const panel = root.querySelector('[data-panel]');
    panel.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    try {
      const { orders } = await API.myOrders();
      if (!orders.length) {
        panel.innerHTML = '<div class="empty-state"><div class="emoji">📦</div><h3>هنوز سفارشی ندارید</h3><a href="/products.html" class="btn btn-primary" style="margin-top:14px">شروع خرید</a></div>';
        return;
      }
      panel.innerHTML = `<h3 style="margin-bottom:16px">تاریخچه سفارش‌ها</h3>` + orders.map((o) => `
        <div class="order-card">
          <div class="oc-head">
            <div><strong>${App.escapeHtml(o.order_number)}</strong><div class="muted" style="font-size:.82rem">${new Date(o.created_at).toLocaleDateString('fa-IR')}</div></div>
            <div style="text-align:end">
              <span class="status-tag status-${o.status}">${statusFa(o.status)}</span>
              <div style="font-weight:800;margin-top:6px">${App.toman(o.total)}</div>
            </div>
          </div>
        </div>`).join('');
    } catch { panel.innerHTML = '<p class="muted">خطا در بارگذاری سفارش‌ها.</p>'; }
  }

  function showProfile(user) {
    const panel = root.querySelector('[data-panel]');
    panel.innerHTML = `
      <div class="form-card" style="max-width:520px">
        <h3 style="margin-bottom:18px">اطلاعات حساب</h3>
        <div class="field"><label>نام</label><input data-name value="${App.escapeHtml(user.name)}"></div>
        <div class="field"><label>ایمیل</label><input value="${App.escapeHtml(user.email)}" disabled></div>
        <div class="field"><label>شماره تماس</label><input data-phone value="${user.phone ? App.escapeHtml(user.phone) : ''}"></div>
        <button class="btn btn-primary" data-save>ذخیره تغییرات</button>
      </div>`;
    panel.querySelector('[data-save]').addEventListener('click', async () => {
      try {
        await API.updateProfile({ name: panel.querySelector('[data-name]').value.trim(), phone: panel.querySelector('[data-phone]').value.trim() });
        App.toast('پروفایل به‌روزرسانی شد', 'success');
        App.loadUser();
      } catch (e) { App.toast(e.message || 'خطا', 'error'); }
    });
  }

  init();
})();
