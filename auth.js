// auth.js — VibeStore Shared Auth Module

const VS_AUTH_KEY      = 'vs_auth';
const VS_REGISTRY_KEY  = 'vs_user_registry'; // persists email → role forever

const SELLER_DOMAINS   = ['techhub.com','fashionfirst.com','greengrove.com','bookworld.com','apextech.com','seller.com'];
const SELLER_KEYWORDS  = ['seller','vendor','shop','store','biz','merchant','trade'];
const ADMIN_DOMAINS    = ['vibestore.com'];
const ADMIN_PREFIXES   = ['admin','superadmin','root','platform'];

/* ─── REGISTRY ──────────────────────────────────────────────────────────────
   vs_user_registry = { "email@x.com": { role, name, storeName, registeredAt } }
   Written on: first login, onboarding completion, explicit role assignment.
   Read on:    every login — takes priority over pattern detection.
────────────────────────────────────────────────────────────────────────────── */
function vsGetRegistry() {
  try { return JSON.parse(localStorage.getItem(VS_REGISTRY_KEY)) || {}; } catch { return {}; }
}

function vsRegisterUser(email, role, name, storeName) {
  email = email.toLowerCase().trim();
  const registry = vsGetRegistry();
  registry[email] = {
    role,
    name: name || registry[email]?.name || '',
    storeName: storeName || registry[email]?.storeName || null,
    registeredAt: registry[email]?.registeredAt || Date.now(),
    updatedAt: Date.now()
  };
  localStorage.setItem(VS_REGISTRY_KEY, JSON.stringify(registry));
}

function vsLookupRegistry(email) {
  email = email.toLowerCase().trim();
  const registry = vsGetRegistry();
  return registry[email] || null;
}

/* ─── ROLE DETECTION ─────────────────────────────────────────────────────────
   Priority order:
   1. Registry lookup (email seen before — remembers exact role)
   2. Admin domain/prefix check
   3. Seller domain/keyword check
   4. Default: buyer
────────────────────────────────────────────────────────────────────────────── */
function vsDetectRole(email) {
  email = email.toLowerCase().trim();
  const registered = vsLookupRegistry(email);
  if (registered) return registered.role;           // ← remembered from before

  const [username, domain] = email.split('@');
  if (!domain) return 'buyer';
  if (ADMIN_DOMAINS.includes(domain))                return 'admin';
  if (ADMIN_PREFIXES.some(p => username.startsWith(p))) return 'admin';
  if (SELLER_DOMAINS.includes(domain))               return 'seller';
  if (SELLER_KEYWORDS.some(k => username.includes(k))) return 'seller';
  return 'buyer';
}

function vsGetInitials(name) {
  return (name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/* ─── LOGIN ──────────────────────────────────────────────────────────────────
   Detects role, writes to registry (so future logins remember it),
   writes session to vs_auth, returns auth object.
────────────────────────────────────────────────────────────────────────────── */
function vsLogin(email, name, roleOverride) {
  email = email.toLowerCase().trim();
  const role = roleOverride || vsDetectRole(email);

  // Merge with any existing registry entry so we keep storeName etc.
  const existing = vsLookupRegistry(email);
  const storeName = existing?.storeName || (role === 'seller' ? (name || 'My').split(' ')[0] + ' Store' : null);

  // Persist to registry — next login will remember this role
  vsRegisterUser(email, role, name, storeName);

  const auth = {
    email,
    name:      name || existing?.name || email.split('@')[0],
    role,
    avatar:    vsGetInitials(name || existing?.name || email),
    storeName,
    loginTime: Date.now()
  };
  localStorage.setItem(VS_AUTH_KEY, JSON.stringify(auth));
  return auth;
}

/* ─── SESSION HELPERS ────────────────────────────────────────────────────────*/
function vsGetAuth() {
  try { return JSON.parse(localStorage.getItem(VS_AUTH_KEY)); } catch { return null; }
}

function vsLogout() {
  // Clear session but KEEP registry — so next login still remembers the role
  localStorage.removeItem(VS_AUTH_KEY);
  window.location.href = 'login.html';
}

/* ─── ROUTE GUARD ────────────────────────────────────────────────────────────
   Call at top of every protected page.
   allowedRoles: ['buyer'] | ['seller'] | ['admin'] | ['seller','admin']
────────────────────────────────────────────────────────────────────────────── */
function vsRequireAuth(allowedRoles) {
  const auth = vsGetAuth();
  if (!auth) { window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    if (auth.role === 'admin')  window.location.href = 'app.html';
    else if (auth.role === 'seller') window.location.href = 'seller-dashboard.html';
    else window.location.href = 'index.html';
    return null;
  }
  return auth;
}

/* ─── NAV UPDATE ─────────────────────────────────────────────────────────────
   Updates elements with classes: vs-nav-greeting, vs-nav-avatar, vs-logout-btn
────────────────────────────────────────────────────────────────────────────── */
function vsUpdateNav(auth) {
  if (!auth) return;
  document.querySelectorAll('.vs-nav-greeting').forEach(el => {
    el.textContent = 'Hello, ' + (auth.name || '').split(' ')[0];
  });
  document.querySelectorAll('.vs-nav-avatar').forEach(el => {
    el.textContent = auth.avatar;
  });
  document.querySelectorAll('.vs-logout-btn').forEach(el => {
    el.addEventListener('click', vsLogout);
    el.style.display = 'block';
  });
}

/* ─── PORTAL REDIRECT ────────────────────────────────────────────────────────
   Redirect to the correct portal for a given role.
────────────────────────────────────────────────────────────────────────────── */
function vsRedirectToPortal(role) {
  if (role === 'admin')  window.location.href = 'app.html';
  else if (role === 'seller') window.location.href = 'seller-dashboard.html';
  else window.location.href = 'index.html';
}
