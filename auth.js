// auth.js — VibeStore Shared Auth Module

const VS_AUTH_KEY = 'vs_auth';

const SELLER_DOMAINS = ['techhub.com','fashionfirst.com','greengrove.com','bookworld.com','apextech.com','seller.com'];
const SELLER_KEYWORDS = ['seller','vendor','shop','store','biz','merchant','trade'];
const ADMIN_DOMAINS = ['vibestore.com'];
const ADMIN_PREFIXES = ['admin','superadmin','root','platform'];

function vsDetectRole(email) {
  email = email.toLowerCase().trim();
  const [username, domain] = email.split('@');
  if (!domain) return 'buyer';
  if (ADMIN_DOMAINS.includes(domain)) return 'admin';
  if (ADMIN_PREFIXES.some(p => username.startsWith(p))) return 'admin';
  if (SELLER_DOMAINS.includes(domain)) return 'seller';
  if (SELLER_KEYWORDS.some(k => username.includes(k))) return 'seller';
  return 'buyer';
}

function vsGetInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
}

function vsLogin(email, name) {
  const role = vsDetectRole(email);
  const auth = {
    email, name,
    role,
    avatar: vsGetInitials(name),
    storeName: role === 'seller' ? name.split(' ')[0] + ' Store' : null,
    loginTime: Date.now()
  };
  localStorage.setItem(VS_AUTH_KEY, JSON.stringify(auth));
  return auth;
}

function vsGetAuth() {
  try { return JSON.parse(localStorage.getItem(VS_AUTH_KEY)); } catch { return null; }
}

function vsLogout() {
  localStorage.removeItem(VS_AUTH_KEY);
  window.location.href = 'login.html';
}

function vsRequireAuth(allowedRoles) {
  // Call on page load to gate access. allowedRoles = ['buyer'] or ['seller'] or ['admin'] or ['seller','admin'] etc.
  const auth = vsGetAuth();
  if (!auth) { window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    // Wrong role — redirect to correct portal
    if (auth.role === 'admin') window.location.href = 'app.html';
    else if (auth.role === 'seller') window.location.href = 'seller-dashboard.html';
    else window.location.href = 'index.html';
    return null;
  }
  return auth;
}

function vsUpdateNav(auth) {
  // Updates nav elements with class vs-nav-user, vs-nav-avatar, vs-nav-greeting
  if (!auth) return;
  document.querySelectorAll('.vs-nav-greeting').forEach(el => {
    el.textContent = 'Hello, ' + auth.name.split(' ')[0];
  });
  document.querySelectorAll('.vs-nav-avatar').forEach(el => {
    el.textContent = auth.avatar;
  });
  document.querySelectorAll('.vs-logout-btn').forEach(el => {
    el.addEventListener('click', vsLogout);
    el.style.display = 'block';
  });
}
