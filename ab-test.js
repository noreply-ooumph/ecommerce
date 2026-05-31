// ab-test.js — VibeStore A/B Testing Framework
// Tests UI variants to find highest-converting version
// Admin dashboard shows results with statistical significance

const AB_STORAGE_KEY = 'vs_ab_assignments';
const AB_RESULTS_KEY  = 'vs_ab_results';

// ── ACTIVE TESTS ──────────────────────────────────────────────────────────────
const AB_TESTS = {
  'cta_color': {
    name: 'Add to Cart Button Color',
    variants: [
      { id: 'orange',  label: 'Amazon Orange (#FF9900)', styles: { background: '#FF9900', color: '#0f1111' } },
      { id: 'green',   label: 'Green (#067D62)',         styles: { background: '#067D62', color: '#fff' } },
      { id: 'blue',    label: 'Blue (#1565C0)',          styles: { background: '#1565C0', color: '#fff' } }
    ],
    target: '.add-to-cart-main, #add-to-cart-btn, .btn-add-cart',
    metric: 'add_to_cart'
  },
  'price_display': {
    name: 'Price Display Format',
    variants: [
      { id: 'savings_amount', label: 'Show ₹ Savings',   transform: 'savings_amount' },
      { id: 'savings_pct',    label: 'Show % Savings',   transform: 'savings_pct' },
      { id: 'both',           label: 'Show Both',         transform: 'both' }
    ],
    target: '.price-savings',
    metric: 'purchase'
  },
  'hero_headline': {
    name: 'Homepage Hero Headline',
    variants: [
      { id: 'deals',  label: 'Focus on Deals',  text: '⚡ Unbeatable Deals — Every Hour' },
      { id: 'trust',  label: 'Focus on Trust',  text: '🔒 India\'s Most Trusted Marketplace' },
      { id: 'ai',     label: 'Focus on AI',     text: '🤖 8 AI Agents. Zero Hassle Shopping.' }
    ],
    target: '.sc-title',
    metric: 'click_cta'
  },
  'free_delivery_threshold': {
    name: 'Free Delivery Threshold',
    variants: [
      { id: 'rs299', label: '₹299 threshold', amount: 299 },
      { id: 'rs499', label: '₹499 threshold', amount: 499 },
      { id: 'rs799', label: '₹799 threshold', amount: 799 }
    ],
    target: '.free-delivery-msg',
    metric: 'checkout'
  }
};

// ── ASSIGNMENT ────────────────────────────────────────────────────────────────

function vsGetVariant(testId) {
  const assignments = JSON.parse(localStorage.getItem(AB_STORAGE_KEY) || '{}');
  if (assignments[testId]) return assignments[testId];

  // Randomly assign to a variant
  const test = AB_TESTS[testId];
  if (!test) return null;
  const variant = test.variants[Math.floor(Math.random() * test.variants.length)];
  assignments[testId] = variant.id;
  localStorage.setItem(AB_STORAGE_KEY, JSON.stringify(assignments));

  // Track assignment event
  if (typeof vsTrack === 'function') {
    vsTrack('ab_assigned', { testId, variantId: variant.id });
  }

  return variant.id;
}

function vsGetVariantConfig(testId) {
  const variantId = vsGetVariant(testId);
  const test = AB_TESTS[testId];
  if (!test || !variantId) return null;
  return test.variants.find(v => v.id === variantId);
}

// ── CONVERSION TRACKING ───────────────────────────────────────────────────────

function vsTrackConversion(testId, metric) {
  const variantId = vsGetVariant(testId);
  if (!variantId) return;

  const results = JSON.parse(localStorage.getItem(AB_RESULTS_KEY) || '{}');
  if (!results[testId]) results[testId] = {};
  if (!results[testId][variantId]) results[testId][variantId] = { impressions: 0, conversions: 0 };

  results[testId][variantId].conversions++;
  localStorage.setItem(AB_RESULTS_KEY, JSON.stringify(results));

  // Sync to Firestore
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    vsGetDb().collection('vs_ab_results').doc(testId + '_' + variantId).set({
      testId, variantId, metric,
      conversions: results[testId][variantId].conversions,
      lastUpdated: Date.now()
    }, { merge: true });
  }
}

function vsTrackImpression(testId) {
  const variantId = vsGetVariant(testId);
  if (!variantId) return;
  const results = JSON.parse(localStorage.getItem(AB_RESULTS_KEY) || '{}');
  if (!results[testId]) results[testId] = {};
  if (!results[testId][variantId]) results[testId][variantId] = { impressions: 0, conversions: 0 };
  results[testId][variantId].impressions++;
  localStorage.setItem(AB_RESULTS_KEY, JSON.stringify(results));
}

// ── APPLY TESTS ───────────────────────────────────────────────────────────────

function vsApplyABTests() {
  // CTA Color test
  const ctaVariant = vsGetVariantConfig('cta_color');
  if (ctaVariant?.styles) {
    document.querySelectorAll('.add-to-cart-main, #add-to-cart-btn, .btn-add-cart').forEach(btn => {
      Object.assign(btn.style, ctaVariant.styles);
    });
    vsTrackImpression('cta_color');
  }

  // Hero headline test
  const headlineVariant = vsGetVariantConfig('hero_headline');
  if (headlineVariant?.text) {
    document.querySelectorAll('.sc-title').forEach(el => {
      if (el.dataset.abApplied) return;
      el.textContent = headlineVariant.text;
      el.dataset.abApplied = '1';
    });
    vsTrackImpression('hero_headline');
  }
}

// ── RESULTS ANALYSIS ──────────────────────────────────────────────────────────

function vsGetABResults() {
  const results = JSON.parse(localStorage.getItem(AB_RESULTS_KEY) || '{}');
  const analysis = {};

  Object.entries(AB_TESTS).forEach(([testId, test]) => {
    const testResults = results[testId] || {};
    const variants = test.variants.map(v => {
      const data = testResults[v.id] || { impressions: 0, conversions: 0 };
      const rate = data.impressions > 0 ? (data.conversions / data.impressions * 100) : 0;
      return { ...v, ...data, conversionRate: Math.round(rate * 100) / 100 };
    });
    variants.sort((a, b) => b.conversionRate - a.conversionRate);
    analysis[testId] = { ...test, variants, winner: variants[0] };
  });

  return analysis;
}

// Apply tests after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(vsApplyABTests, 100));
} else {
  setTimeout(vsApplyABTests, 100);
}

console.log('VibeStore A/B Testing Framework loaded ✅');
