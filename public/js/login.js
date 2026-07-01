/* Login / register page logic (external file to satisfy strict CSP). */
(function () {
  App.boot({ active: 'profile' });
  // If already authenticated, bounce to the right place.
  App.loadUser().then((u) => { if (u) location.href = u.role === 'admin' ? '/admin.html' : '/dashboard.html'; });

  const loginForm = document.querySelector('[data-login-form]');
  const registerForm = document.querySelector('[data-register-form]');
  document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    loginForm.classList.toggle('hidden', b.dataset.tab !== 'login');
    registerForm.classList.toggle('hidden', b.dataset.tab !== 'register');
  }));

  function redirect(user) {
    const next = new URLSearchParams(location.search).get('next');
    location.href = next || (user.role === 'admin' ? '/admin.html' : '/dashboard.html');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const err = document.querySelector('[data-login-err]');
    err.style.display = 'none';
    try {
      const { user } = await API.login({ email: fd.get('email'), password: fd.get('password') });
      App.toast('خوش آمدید ' + user.name, 'success');
      redirect(user);
    } catch (ex) { err.textContent = ex.message || 'خطا در ورود'; err.style.display = 'block'; }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    const err = document.querySelector('[data-register-err]');
    err.style.display = 'none';
    try {
      const { user } = await API.register({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), password: fd.get('password') });
      App.toast('حساب شما ساخته شد!', 'success');
      redirect(user);
    } catch (ex) {
      err.textContent = (ex.details && ex.details[0] && ex.details[0].message) || ex.message || 'خطا در ثبت‌نام';
      err.style.display = 'block';
    }
  });
})();
