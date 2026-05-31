// tracker.js — VibeStore User Behaviour Tracking
// Tracks: page views, product views, searches, cart adds, purchases, hovers
// Stored in Firestore vs_events collection
// Powers: recommendations, dynamic pricing, admin flywheel metrics

const VS_EVENTS_KEY = 'vs_events_local'; // Local buffer before Firestore flush
const VS_SESSION_KEY = 'vs_session';
const VS_PROFILE_KEY = 'vs_user_profile';

// ── SESSION ───────────────────────────────────────────────────────────────────

function vsGetSession() {
  let session = JSON.parse(sessionStorage.getItem(VS_SESSION_KEY) || 'null');
  if (!session) {
    session = {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8),
      startedAt: Date.now(),
      pageViews: 0,
      events: 0
    };
    sessionStorage.setItem(VS_SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

function vsUpdateSession(updates) {
  const session = vsGetSession();
  Object.assign(session, updates);
  sessionStorage.setItem(VS_SESSION_KEY, JSON.stringify(session));
}

// ── USER PROFILE ──────────────────────────────────────────────────────────────

function vsGetUserProfile() {
  return JSON.parse(localStorage.getItem(VS_PROFILE_KEY) || JSON.stringify({
    categories: {},      // category → view count
    products: [],        // recently viewed product IDs
    searches: [],        // recent search terms
    cartHistory: [],     // products ever added to cart
    purchaseHistory: [], // products purchased
    totalSpent: 0,
    visitCount: 0,
    firstVisit: Date.now(),
    lastVisit: Date.now()
  }));
}

function vsUpdateUserProfile(updates) {
  const profile = vsGetUserProfile();

  if (updates.viewCategory) {
    profile.categories[updates.viewCategory] = (profile.categories[updates.viewCategory] || 0) + 1;
  }
  if (updates.viewProduct) {
    profile.products = [updates.viewProduct, ...profile.products.filter(p => p !== updates.viewProduct)].slice(0, 50);
  }
  if (updates.search) {
    profile.searches = [updates.search, ...profile.searches.filter(s => s !== updates.search)].slice(0, 20);
  }
  if (updates.addToCart) {
    if (!profile.cartHistory.includes(updates.addToCart)) profile.cartHistory.push(updates.addToCart);
  }
  if (updates.purchase) {
    profile.purchaseHistory.push(updates.purchase);
    profile.totalSpent += updates.amount || 0;
  }
  if (updates.visit) {
    profile.visitCount++;
    profile.lastVisit = Date.now();
  }

  localStorage.setItem(VS_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

// ── EVENT TRACKING ────────────────────────────────────────────────────────────

async function vsTrack(eventType, data) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const session = vsGetSession();

  const event = {
    type:       eventType,
    userId:     auth?.email || 'anonymous',
    sessionId:  session.id,
    page:       window.location.pathname.split('/').pop(),
    timestamp:  Date.now(),
    ...data
  };

  // Update local profile
  if (eventType === 'product_view')  vsUpdateUserProfile({ viewProduct: data.productId, viewCategory: data.category });
  if (eventType === 'search')        vsUpdateUserProfile({ search: data.query });
  if (eventType === 'add_to_cart')   vsUpdateUserProfile({ addToCart: data.productId });
  if (eventType === 'purchase')      vsUpdateUserProfile({ purchase: data.productId, amount: data.amount });
  if (eventType === 'page_view')     vsUpdateUserProfile({ visit: true });

  // Buffer locally
  const buffer = JSON.parse(localStorage.getItem(VS_EVENTS_KEY) || '[]');
  buffer.push(event);
  localStorage.setItem(VS_EVENTS_KEY, JSON.stringify(buffer.slice(-200))); // Keep last 200

  // Flush to Firestore every 5 events
  if (buffer.length % 5 === 0) vsFlushEvents();
}

async function vsFlushEvents() {
  if (typeof vsIsFirebaseReady !== 'function' || !vsIsFirebaseReady()) return;
  const buffer = JSON.parse(localStorage.getItem(VS_EVENTS_KEY) || '[]');
  if (buffer.length === 0) return;
  try {
    const db = vsGetDb();
    const batch = db.batch();
    buffer.slice(-20).forEach(event => {
      const ref = db.collection('vs_events').doc();
      batch.set(ref, event);
    });
    await batch.commit();
    localStorage.setItem(VS_EVENTS_KEY, JSON.stringify(buffer.slice(0, -20)));
  } catch(e) { /* silent fail */ }
}

// ── AUTO TRACKING ─────────────────────────────────────────────────────────────

// Track page view on load
vsTrack('page_view', { url: window.location.href });

// Track search from URL
(function() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) vsTrack('search', { query: q });
  const productId = params.get('id');
  if (productId) vsTrack('product_view', { productId });
})();

// Track time spent on page
let _pageEnter = Date.now();
window.addEventListener('beforeunload', () => {
  const timeSpent = Math.round((Date.now() - _pageEnter) / 1000);
  vsTrack('time_spent', { seconds: timeSpent });
  vsFlushEvents(); // Final flush
});

// Track scroll depth
let _maxScroll = 0;
window.addEventListener('scroll', () => {
  const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if (pct > _maxScroll) {
    _maxScroll = pct;
    if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
      vsTrack('scroll_depth', { percent: pct });
    }
  }
}, { passive: true });

// ── FLYWHEEL METRICS ──────────────────────────────────────────────────────────
// Aggregated metrics for admin flywheel dashboard

async function vsGetFlywheelMetrics() {
  const profile = vsGetUserProfile();
  return {
    topCategory: Object.entries(profile.categories).sort((a,b) => b[1]-a[1])[0]?.[0] || 'None',
    recentSearches: profile.searches.slice(0,5),
    visitCount: profile.visitCount,
    totalSpent: profile.totalSpent,
    cartAbandons: parseInt(localStorage.getItem('vs_cart_abandons') || '0'),
    conversionRate: profile.purchaseHistory.length / Math.max(profile.visitCount, 1)
  };
}

console.log('VibeStore Tracker loaded ✅');
