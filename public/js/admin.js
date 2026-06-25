/* ════════════════════════════════════════════════════════════════════
   Admin panel controller — dashboard, products CRUD, orders, categories,
   coupons, inventory and users. Guards access to admins only.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  App.boot();

  const guard = document.querySelector('[data-admin-guard]');
  const rootWrap = document.querySelector('[data-admin-root]');
  const panel = document.querySelector('[data-admin-panel]');
  const esc = App.escapeHtml;
  const toman = App.toman;

  const STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
  const statusFa = (s) => ({ pending: 'در انتظار', paid: 'پرداخت شده', processing: 'پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' }[s] || s);

  let categoriesCache = [];

  /* ── Access guard ─────────────────────────────────────────────────── */
  async function init() {
    const user = await App.loadUser();
    if (!user) { location.href = '/login.html?next=/admin.html'; return; }
    if (user.role !== 'admin') {
      guard.innerHTML = '<div class="empty-state"><div class="emoji">🔒</div><h3>دسترسی غیرمجاز</h3><p class="muted">این بخش مخصوص مدیران است.</p><a href="/index.html" class="btn btn-primary" style="margin-top:14px">بازگشت</a></div>';
      return;
    }
    guard.classList.add('hidden');
    rootWrap.classList.remove('hidden');

    try { categoriesCache = (await API.admin.categories()).categories; } catch { /* */ }

    rootWrap.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      rootWrap.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('active', x === b));
      views[b.dataset.view]();
    }));
    views.overview();
  }

  /* ── Modal helpers ────────────────────────────────────────────────── */
  const modal = document.querySelector('[data-modal]');
  const modalBox = document.querySelector('[data-modal-box]');
  function openModal(html) { modalBox.innerHTML = html; modal.classList.remove('hidden'); }
  function closeModal() { modal.classList.add('hidden'); modalBox.innerHTML = ''; }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ── Views ────────────────────────────────────────────────────────── */
  const views = {};

  views.overview = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    const data = await API.admin.dashboard();
    const s = data.stats;
    panel.innerHTML = `
      <div class="admin-head"><h2>داشبورد</h2></div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-val">${s.products}</div><div class="stat-lbl">محصول</div></div>
        <div class="stat-card"><div class="stat-icon">🧾</div><div class="stat-val">${s.orders}</div><div class="stat-lbl">سفارش</div></div>
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-val">${s.users}</div><div class="stat-lbl">کاربر</div></div>
        <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-val" style="font-size:1.2rem">${toman(s.revenue)}</div><div class="stat-lbl">درآمد کل</div></div>
      </div>
      <div class="admin-head"><h2 style="font-size:1.1rem">آخرین سفارش‌ها</h2></div>
      <div class="admin-table-wrap" style="margin-bottom:28px">
        <table class="admin-table">
          <thead><tr><th>شماره</th><th>مشتری</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
          <tbody>${data.recentOrders.map((o) => `
            <tr><td>${esc(o.order_number)}</td><td>${esc(o.customer_name)}</td><td>${toman(o.total)}</td>
            <td><span class="status-tag status-${o.status}">${statusFa(o.status)}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString('fa-IR')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">سفارشی نیست</td></tr>'}
          </tbody>
        </table>
      </div>
      ${data.lowStock.length ? `
        <div class="admin-head"><h2 style="font-size:1.1rem">⚠️ موجودی رو به اتمام</h2></div>
        <div class="admin-table-wrap">
          <table class="admin-table"><thead><tr><th>محصول</th><th>موجودی</th></tr></thead>
          <tbody>${data.lowStock.map((p) => `<tr><td>${esc(p.name)}</td><td><span class="status-tag status-cancelled">${p.stock}</span></td></tr>`).join('')}</tbody></table>
        </div>` : ''}
    `;
  };

  views.products = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    const { items } = await API.admin.products({ perPage: 100 });
    panel.innerHTML = `
      <div class="admin-head"><h2>مدیریت محصولات (${items.length})</h2>
        <button class="btn btn-primary" data-new-product>+ محصول جدید</button></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th></th><th>نام</th><th>برند</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>عملیات</th></tr></thead>
        <tbody>${items.map((p) => `
          <tr>
            <td><img class="thumb" src="${esc(p.image_url)}" alt=""></td>
            <td>${esc(p.name)}</td><td>${esc(p.brand || '-')}</td><td>${toman(p.price)}</td>
            <td><span class="tag">${p.stock}</span></td>
            <td>${p.is_active ? '<span class="status-tag status-delivered">فعال</span>' : '<span class="status-tag status-cancelled">غیرفعال</span>'}</td>
            <td class="actions">
              <button class="btn btn-ghost btn-sm" data-edit='${p.id}'>ویرایش</button>
              <button class="btn btn-danger btn-sm" data-del='${p.id}'>حذف</button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`;

    panel.querySelector('[data-new-product]').addEventListener('click', () => productModal());
    panel.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => productModal(items.find((p) => p.id == b.dataset.edit)))
    );
    panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('حذف این محصول؟')) return;
      await API.admin.deleteProduct(b.dataset.del); App.toast('محصول حذف شد', 'success'); views.products();
    }));
  };

  function productModal(p) {
    const isEdit = !!p;
    const catOptions = categoriesCache.map((c) => `<option value="${c.id}" ${p && p.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    openModal(`
      <h3>${isEdit ? 'ویرایش محصول' : 'محصول جدید'}</h3>
      <div class="field"><label>نام محصول *</label><input data-f="name" value="${p ? esc(p.name) : ''}"></div>
      <div class="checkout-grid" style="grid-template-columns:1fr 1fr;gap:14px;display:grid">
        <div class="field"><label>برند</label><input data-f="brand" value="${p ? esc(p.brand || '') : ''}"></div>
        <div class="field"><label>دسته‌بندی</label><select data-f="category_id"><option value="">—</option>${catOptions}</select></div>
        <div class="field"><label>قیمت (تومان) *</label><input data-f="price" type="number" value="${p ? p.price : ''}"></div>
        <div class="field"><label>قیمت قبل تخفیف</label><input data-f="compare_price" type="number" value="${p && p.compare_price ? p.compare_price : ''}"></div>
        <div class="field"><label>موجودی</label><input data-f="stock" type="number" value="${p ? p.stock : 0}"></div>
        <div class="field"><label>آدرس تصویر</label><input data-f="image_url" value="${p ? esc(p.image_url || '') : ''}"></div>
      </div>
      <div class="field"><label>توضیح کوتاه</label><input data-f="short_desc" value="${p ? esc(p.short_desc || '') : ''}"></div>
      <div class="field"><label>توضیحات کامل</label><textarea data-f="description" rows="3">${p ? esc(p.description || '') : ''}</textarea></div>
      <div style="display:flex;gap:18px">
        <label class="filter-opt"><input type="checkbox" data-f="is_featured" ${p && p.is_featured ? 'checked' : ''}> ویژه</label>
        <label class="filter-opt"><input type="checkbox" data-f="is_trending" ${p && p.is_trending ? 'checked' : ''}> پرفروش</label>
        <label class="filter-opt"><input type="checkbox" data-f="is_active" ${!p || p.is_active ? 'checked' : ''}> فعال</label>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-cancel>انصراف</button>
        <button class="btn btn-primary" data-save>ذخیره</button>
      </div>`);

    modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
    modalBox.querySelector('[data-save]').addEventListener('click', async () => {
      const get = (f) => modalBox.querySelector(`[data-f="${f}"]`);
      const body = {
        name: get('name').value.trim(),
        brand: get('brand').value.trim() || null,
        category_id: get('category_id').value ? parseInt(get('category_id').value, 10) : null,
        price: parseInt(get('price').value, 10) || 0,
        compare_price: get('compare_price').value ? parseInt(get('compare_price').value, 10) : null,
        stock: parseInt(get('stock').value, 10) || 0,
        image_url: get('image_url').value.trim() || null,
        short_desc: get('short_desc').value.trim() || null,
        description: get('description').value.trim() || null,
        is_featured: get('is_featured').checked,
        is_trending: get('is_trending').checked,
        is_active: get('is_active').checked,
      };
      if (!body.name || !body.price) { App.toast('نام و قیمت الزامی است', 'error'); return; }
      try {
        if (isEdit) await API.admin.updateProduct(p.id, body);
        else await API.admin.createProduct(body);
        App.toast('ذخیره شد', 'success'); closeModal(); views.products();
      } catch (e) { App.toast(e.message || 'خطا', 'error'); }
    });
  }

  views.orders = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    const { orders } = await API.admin.orders({});
    panel.innerHTML = `
      <div class="admin-head"><h2>سفارش‌ها (${orders.length})</h2></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>شماره</th><th>مشتری</th><th>تماس</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead>
        <tbody>${orders.map((o) => `
          <tr>
            <td><button class="btn btn-ghost btn-sm" data-order='${esc(o.order_number)}'>${esc(o.order_number)}</button></td>
            <td>${esc(o.customer_name)}</td><td>${esc(o.customer_phone || '-')}</td><td>${toman(o.total)}</td>
            <td><select class="inline-select" data-status='${esc(o.order_number)}'>
              ${STATUSES.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusFa(s)}</option>`).join('')}
            </select></td>
            <td>${new Date(o.created_at).toLocaleDateString('fa-IR')}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="muted">سفارشی نیست</td></tr>'}</tbody>
      </table></div>`;

    panel.querySelectorAll('[data-status]').forEach((sel) => sel.addEventListener('change', async () => {
      try { await API.admin.setOrderStatus(sel.dataset.status, sel.value); App.toast('وضعیت به‌روزرسانی شد', 'success'); }
      catch (e) { App.toast(e.message || 'خطا', 'error'); }
    }));
    panel.querySelectorAll('[data-order]').forEach((b) => b.addEventListener('click', () => orderModal(b.dataset.order)));
  };

  async function orderModal(number) {
    const { order } = await API.admin.order(number);
    openModal(`
      <h3>سفارش ${esc(order.order_number)}</h3>
      <div class="summary-row"><span>مشتری</span><strong>${esc(order.customer_name)}</strong></div>
      <div class="summary-row"><span>ایمیل</span><span>${esc(order.customer_email)}</span></div>
      <div class="summary-row"><span>تلفن</span><span>${esc(order.customer_phone || '-')}</span></div>
      <div class="summary-row"><span>آدرس</span><span style="max-width:60%;text-align:end">${esc(order.shipping_address)}</span></div>
      <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
      ${order.items.map((i) => `<div class="summary-row"><span>${esc(i.product_name)} × ${i.quantity}</span><span>${toman(i.line_total)}</span></div>`).join('')}
      <div class="summary-row"><span>تخفیف</span><span>− ${toman(order.discount)}</span></div>
      <div class="summary-row total"><span>مجموع</span><span>${toman(order.total)}</span></div>
      <div class="modal-actions"><button class="btn btn-primary" data-cancel>بستن</button></div>`);
    modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
  }

  views.categories = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:240px"></div>';
    categoriesCache = (await API.admin.categories()).categories;
    panel.innerHTML = `
      <div class="admin-head"><h2>دسته‌بندی‌ها</h2><button class="btn btn-primary" data-new-cat>+ دسته جدید</button></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>آیکون</th><th>نام</th><th>اسلاگ</th><th>تعداد محصول</th><th>عملیات</th></tr></thead>
        <tbody>${categoriesCache.map((c) => `
          <tr><td style="font-size:1.4rem">${c.icon || '🏠'}</td><td>${esc(c.name)}</td><td><code>${esc(c.slug)}</code></td>
          <td><span class="tag">${c.product_count}</span></td>
          <td><button class="btn btn-danger btn-sm" data-del-cat='${c.id}'>حذف</button></td></tr>`).join('')}</tbody>
      </table></div>`;

    panel.querySelector('[data-new-cat]').addEventListener('click', () => {
      openModal(`
        <h3>دسته‌بندی جدید</h3>
        <div class="field"><label>نام *</label><input data-f="name"></div>
        <div class="field"><label>آیکون (ایموجی)</label><input data-f="icon" placeholder="🍳"></div>
        <div class="field"><label>توضیحات</label><input data-f="description"></div>
        <div class="modal-actions"><button class="btn btn-ghost" data-cancel>انصراف</button><button class="btn btn-primary" data-save>ذخیره</button></div>`);
      modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
      modalBox.querySelector('[data-save]').addEventListener('click', async () => {
        try {
          await API.admin.createCategory({
            name: modalBox.querySelector('[data-f="name"]').value.trim(),
            icon: modalBox.querySelector('[data-f="icon"]').value.trim(),
            description: modalBox.querySelector('[data-f="description"]').value.trim(),
          });
          App.toast('دسته اضافه شد', 'success'); closeModal(); views.categories();
        } catch (e) { App.toast(e.message || 'خطا', 'error'); }
      });
    });
    panel.querySelectorAll('[data-del-cat]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('حذف این دسته؟')) return;
      await API.admin.deleteCategory(b.dataset.delCat); App.toast('حذف شد', 'success'); views.categories();
    }));
  };

  views.coupons = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:240px"></div>';
    const { coupons } = await API.admin.coupons();
    panel.innerHTML = `
      <div class="admin-head"><h2>کدهای تخفیف</h2><button class="btn btn-primary" data-new-coupon>+ کد جدید</button></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>کد</th><th>نوع</th><th>مقدار</th><th>حداقل خرید</th><th>استفاده</th><th>عملیات</th></tr></thead>
        <tbody>${coupons.map((c) => `
          <tr><td><code>${esc(c.code)}</code></td><td>${c.type === 'percent' ? 'درصدی' : 'مبلغ ثابت'}</td>
          <td>${c.type === 'percent' ? c.value + '٪' : toman(c.value)}</td><td>${toman(c.min_subtotal)}</td>
          <td>${c.used_count}${c.usage_limit ? '/' + c.usage_limit : ''}</td>
          <td><button class="btn btn-danger btn-sm" data-del-coupon='${c.id}'>حذف</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">کدی نیست</td></tr>'}</tbody>
      </table></div>`;

    panel.querySelector('[data-new-coupon]').addEventListener('click', () => {
      openModal(`
        <h3>کد تخفیف جدید</h3>
        <div class="field"><label>کد *</label><input data-f="code" placeholder="WELCOME10" style="text-transform:uppercase"></div>
        <div class="field"><label>نوع</label><select data-f="type"><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select></div>
        <div class="field"><label>مقدار *</label><input data-f="value" type="number" placeholder="10"></div>
        <div class="field"><label>حداقل مبلغ خرید</label><input data-f="min_subtotal" type="number" value="0"></div>
        <div class="field"><label>محدودیت استفاده (اختیاری)</label><input data-f="usage_limit" type="number"></div>
        <div class="modal-actions"><button class="btn btn-ghost" data-cancel>انصراف</button><button class="btn btn-primary" data-save>ذخیره</button></div>`);
      modalBox.querySelector('[data-cancel]').addEventListener('click', closeModal);
      modalBox.querySelector('[data-save]').addEventListener('click', async () => {
        try {
          await API.admin.createCoupon({
            code: modalBox.querySelector('[data-f="code"]').value.trim(),
            type: modalBox.querySelector('[data-f="type"]').value,
            value: parseInt(modalBox.querySelector('[data-f="value"]').value, 10) || 0,
            min_subtotal: parseInt(modalBox.querySelector('[data-f="min_subtotal"]').value, 10) || 0,
            usage_limit: modalBox.querySelector('[data-f="usage_limit"]').value ? parseInt(modalBox.querySelector('[data-f="usage_limit"]').value, 10) : null,
          });
          App.toast('کد اضافه شد', 'success'); closeModal(); views.coupons();
        } catch (e) { App.toast(e.message || 'خطا', 'error'); }
      });
    });
    panel.querySelectorAll('[data-del-coupon]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('حذف این کد؟')) return;
      await API.admin.deleteCoupon(b.dataset.delCoupon); App.toast('حذف شد', 'success'); views.coupons();
    }));
  };

  views.inventory = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:300px"></div>';
    const [{ items }, { logs }] = await Promise.all([API.admin.products({ perPage: 100 }), API.admin.inventoryLogs({})]);
    panel.innerHTML = `
      <div class="admin-head"><h2>موجودی انبار</h2></div>
      <div class="admin-table-wrap" style="margin-bottom:28px"><table class="admin-table">
        <thead><tr><th>محصول</th><th>موجودی فعلی</th><th>تنظیم سریع</th></tr></thead>
        <tbody>${items.map((p) => `
          <tr><td>${esc(p.name)}</td><td><span class="tag">${p.stock}</span></td>
          <td class="actions">
            <button class="btn btn-ghost btn-sm" data-adj='${p.id}' data-d="-1">−۱</button>
            <button class="btn btn-ghost btn-sm" data-adj='${p.id}' data-d="1">+۱</button>
            <button class="btn btn-accent btn-sm" data-adj='${p.id}' data-d="10">+۱۰</button>
          </td></tr>`).join('')}</tbody>
      </table></div>
      <div class="admin-head"><h2 style="font-size:1.1rem">آخرین تغییرات انبار</h2></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>محصول</th><th>تغییر</th><th>دلیل</th><th>موجودی بعد</th><th>زمان</th></tr></thead>
        <tbody>${logs.slice(0, 30).map((l) => `
          <tr><td>${esc(l.product_name)}</td><td style="color:${l.change < 0 ? 'var(--danger)' : 'var(--success)'}">${l.change > 0 ? '+' : ''}${l.change}</td>
          <td>${esc(l.reason)}</td><td>${l.stock_after}</td><td>${new Date(l.created_at).toLocaleString('fa-IR')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">لاگی نیست</td></tr>'}</tbody>
      </table></div>`;

    panel.querySelectorAll('[data-adj]').forEach((b) => b.addEventListener('click', async () => {
      try { await API.admin.adjustStock(b.dataset.adj, { delta: parseInt(b.dataset.d, 10), reason: 'manual' }); App.toast('موجودی به‌روز شد', 'success'); views.inventory(); }
      catch (e) { App.toast(e.message || 'خطا', 'error'); }
    }));
  };

  views.users = async function () {
    panel.innerHTML = '<div class="skeleton" style="height:240px"></div>';
    const { users } = await API.admin.users();
    panel.innerHTML = `
      <div class="admin-head"><h2>کاربران (${users.length})</h2></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>تاریخ عضویت</th></tr></thead>
        <tbody>${users.map((u) => `
          <tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td>
          <td><span class="status-tag ${u.role === 'admin' ? 'status-paid' : ''}">${u.role === 'admin' ? 'مدیر' : 'مشتری'}</span></td>
          <td>${new Date(u.created_at).toLocaleDateString('fa-IR')}</td></tr>`).join('')}</tbody>
      </table></div>`;
  };

  init();
})();
