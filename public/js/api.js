/* ════════════════════════════════════════════════════════════════════
   API client — thin fetch wrapper around the REST backend.
   Sends/receives JSON, forwards cookies for auth, and normalises errors.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const BASE = '/api';

  async function request(method, path, body, opts = {}) {
    const headers = { Accept: 'application/json' };
    const config = { method, headers, credentials: 'same-origin' };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }

    const res = await fetch(BASE + path, config);
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : null;

    if (!res.ok) {
      const err = new Error((data && data.error && data.error.message) || `Request failed (${res.status})`);
      err.status = res.status;
      err.code = data && data.error && data.error.code;
      err.details = data && data.error && data.error.details;
      throw err;
    }
    return data;
  }

  const qs = (params) => {
    const usp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') usp.append(k, v);
    });
    const s = usp.toString();
    return s ? `?${s}` : '';
  };

  window.API = {
    qs,
    get: (p) => request('GET', p),
    post: (p, b) => request('POST', p, b),
    put: (p, b) => request('PUT', p, b),
    patch: (p, b) => request('PATCH', p, b),
    del: (p) => request('DELETE', p),

    // Catalogue
    products: (params) => request('GET', '/products' + qs(params)),
    product: (slug) => request('GET', '/products/' + encodeURIComponent(slug)),
    categories: () => request('GET', '/categories'),
    brands: () => request('GET', '/brands'),
    addReview: (slug, body) => request('POST', `/products/${encodeURIComponent(slug)}/reviews`, body),

    // Cart / orders
    quote: (body) => request('POST', '/cart/quote', body),
    validateCoupon: (body) => request('POST', '/coupons/validate', body),
    checkout: (body) => request('POST', '/orders', body),
    order: (number, email) => request('GET', `/orders/${number}` + qs({ email })),
    myOrders: () => request('GET', '/orders'),

    // Auth
    register: (body) => request('POST', '/auth/register', body),
    login: (body) => request('POST', '/auth/login', body),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),
    updateProfile: (body) => request('PATCH', '/auth/me', body),

    // Admin
    admin: {
      dashboard: () => request('GET', '/admin/dashboard'),
      products: (params) => request('GET', '/admin/products' + qs(params)),
      createProduct: (b) => request('POST', '/admin/products', b),
      updateProduct: (id, b) => request('PUT', '/admin/products/' + id, b),
      deleteProduct: (id) => request('DELETE', '/admin/products/' + id),
      adjustStock: (id, b) => request('POST', `/admin/products/${id}/stock`, b),
      categories: () => request('GET', '/categories'),
      createCategory: (b) => request('POST', '/admin/categories', b),
      deleteCategory: (id) => request('DELETE', '/admin/categories/' + id),
      orders: (params) => request('GET', '/admin/orders' + qs(params)),
      order: (number) => request('GET', '/admin/orders/' + number),
      setOrderStatus: (number, status) => request('PATCH', `/admin/orders/${number}/status`, { status }),
      coupons: () => request('GET', '/admin/coupons'),
      createCoupon: (b) => request('POST', '/admin/coupons', b),
      deleteCoupon: (id) => request('DELETE', '/admin/coupons/' + id),
      users: () => request('GET', '/admin/users'),
      inventoryLogs: (params) => request('GET', '/admin/inventory/logs' + qs(params)),
    },
  };
})();
