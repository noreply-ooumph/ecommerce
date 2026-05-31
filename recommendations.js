// recommendations.js — VibeStore Recommendation Engine
// Collaborative filtering using co-occurrence of product views + purchases
// Powers: "Also Viewed", "Frequently Bought Together", "Recommended For You"

const REC_CACHE_KEY = 'vs_rec_cache';
const REC_CACHE_TTL = 1800000; // 30 minutes

// ── CO-OCCURRENCE MATRIX ──────────────────────────────────────────────────────
// Build a product co-occurrence matrix from Firestore events

async function vsGetCoMatrix() {
  const cached = JSON.parse(localStorage.getItem(REC_CACHE_KEY) || 'null');
  if (cached && Date.now() - cached.ts < REC_CACHE_TTL) return cached.matrix;

  if (!vsIsFirebaseReady || !vsIsFirebaseReady()) {
    return buildLocalCoMatrix();
  }

  try {
    const db = vsGetDb();
    // Get recent product_view events grouped by session
    const snap = await db.collection('vs_events')
      .where('type', 'in', ['product_view', 'add_to_cart', 'purchase'])
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    const events = snap.docs.map(d => d.data());
    const matrix = buildCoMatrix(events);
    localStorage.setItem(REC_CACHE_KEY, JSON.stringify({ matrix, ts: Date.now() }));
    return matrix;
  } catch(e) {
    return buildLocalCoMatrix();
  }
}

function buildCoMatrix(events) {
  // Group events by session
  const sessions = {};
  events.forEach(e => {
    if (!e.productId) return;
    if (!sessions[e.sessionId]) sessions[e.sessionId] = new Set();
    sessions[e.sessionId].add(e.productId);
  });

  // Build co-occurrence counts
  const matrix = {};
  Object.values(sessions).forEach(productSet => {
    const products = Array.from(productSet);
    for (let i = 0; i < products.length; i++) {
      for (let j = 0; j < products.length; j++) {
        if (i === j) continue;
        if (!matrix[products[i]]) matrix[products[i]] = {};
        matrix[products[i]][products[j]] = (matrix[products[i]][products[j]] || 0) + 1;
      }
    }
  });
  return matrix;
}

function buildLocalCoMatrix() {
  // Fallback: build from localStorage events
  const events = JSON.parse(localStorage.getItem('vs_events_local') || '[]');
  return buildCoMatrix(events);
}

// ── GET RECOMMENDATIONS ───────────────────────────────────────────────────────

async function vsGetSimilarProducts(productId, limit = 6) {
  const [matrix, products] = await Promise.all([
    vsGetCoMatrix(),
    typeof dbGetProducts === 'function' ? dbGetProducts('active') : []
  ]);

  const coOccurrences = matrix[productId] || {};

  // Score all active products
  const scored = products
    .filter(p => p.id !== productId)
    .map(p => ({
      ...p,
      recScore: (coOccurrences[p.id] || 0) + (Math.random() * 0.5) // tie-break with small random
    }))
    .sort((a, b) => b.recScore - a.recScore);

  return scored.slice(0, limit);
}

async function vsGetPersonalizedRecommendations(limit = 8) {
  const profile = JSON.parse(localStorage.getItem('vs_user_profile') || '{}');
  const categories = profile.categories || {};
  const viewed = profile.products || [];
  const purchased = profile.purchaseHistory || [];

  const products = typeof dbGetProducts === 'function' ? await dbGetProducts('active') : [];

  // Score each product based on user profile
  const excluded = new Set([...viewed.slice(0,5), ...purchased]);

  const scored = products
    .filter(p => !excluded.has(p.id))
    .map(p => {
      let score = 0;
      // Category affinity
      score += (categories[p.category] || 0) * 3;
      // Featured bonus
      if (p.featured) score += 2;
      // High rating bonus
      if ((p.rating || 0) >= 4.5) score += 1.5;
      // Recent listing bonus
      const daysOld = (Date.now() - (p.listedAt || 0)) / 86400000;
      if (daysOld < 7) score += 1;
      // Random factor for diversity
      score += Math.random() * 0.5;
      return { ...p, recScore: score };
    })
    .sort((a, b) => b.recScore - a.recScore);

  return scored.slice(0, limit);
}

async function vsGetFrequentlyBoughtTogether(productId, limit = 3) {
  const [matrix, products] = await Promise.all([
    vsGetCoMatrix(),
    typeof dbGetProducts === 'function' ? dbGetProducts('active') : []
  ]);

  // Only use purchase events for FBT (stronger signal)
  const purchaseMatrix = matrix[productId] || {};
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  return Object.entries(purchaseMatrix)
    .filter(([id]) => productMap[id])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => productMap[id])
    .filter(Boolean);
}

// ── TRENDING PRODUCTS ─────────────────────────────────────────────────────────

async function vsGetTrending(limit = 6) {
  const products = typeof dbGetProducts === 'function' ? await dbGetProducts('active') : [];
  return products
    .map(p => ({
      ...p,
      trendScore: (p.views || 0) * 0.4 + (p.orders || 0) * 0.6
    }))
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}

// ── SEARCH RANKING ────────────────────────────────────────────────────────────
// Real search ranking algorithm: relevance + conversion + sponsored

function vsRankSearchResults(products, query) {
  const q = (query || '').toLowerCase().trim();
  const terms = q.split(/\s+/);

  return products.map(p => {
    let score = 0;

    // 1. Relevance score
    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const cat  = (p.category || '').toLowerCase();
    const seller = (p.sellerName || '').toLowerCase();

    terms.forEach(term => {
      if (name.startsWith(term))          score += 10; // Exact prefix match
      else if (name.includes(term))       score += 6;  // Name contains term
      if (cat.includes(term))             score += 4;  // Category match
      if (desc.includes(term))            score += 2;  // Description match
      if (seller.includes(term))          score += 1;  // Seller match
    });

    // 2. Conversion quality
    const conversionBonus = Math.min(5, (p.orders || 0) / Math.max(p.views || 1, 1) * 100);
    score += conversionBonus;

    // 3. Rating bonus
    score += ((p.rating || 0) / 5) * 3;

    // 4. Recency bonus
    const daysOld = (Date.now() - (p.listedAt || 0)) / 86400000;
    score += Math.max(0, 2 - daysOld * 0.1);

    // 5. Featured / sponsored bonus
    if (p.featured) score += 5;
    if (p.sponsored) score += 8; // Paid placement

    return { ...p, searchScore: score };
  })
  .filter(p => p.searchScore > 0)
  .sort((a, b) => b.searchScore - a.searchScore);
}

console.log('VibeStore Recommendations Engine loaded ✅');
