// pricing-engine.js — VibeStore Dynamic Pricing Engine
// Runs client-side, reads/writes Firestore via db.js
// Called on product page load and by Atlas AI in seller dashboard

const PRICING_RULES = {
  // Time-of-day multipliers (hour: multiplier)
  timeMultipliers: {
    0:0.95, 1:0.93, 2:0.92, 3:0.92, 4:0.93, 5:0.95,
    6:0.97, 7:0.99, 8:1.00, 9:1.02, 10:1.04, 11:1.05,
    12:1.06, 13:1.04, 14:1.05, 15:1.06, 16:1.07, 17:1.08,
    18:1.10, 19:1.08, 20:1.06, 21:1.04, 22:1.02, 23:0.98
  },
  // Stock-level multipliers
  stockMultipliers: {
    outOfStock: 0,
    critical: 1.18,   // < 5 units
    low: 1.10,        // < 15 units
    normal: 1.00,     // 15-100 units
    high: 0.97,       // > 100 units
    excess: 0.93      // > 500 units
  },
  // Demand multipliers based on view count in last 24h
  demandMultipliers: {
    viral: 1.15,      // > 500 views
    high: 1.08,       // 200-500 views
    normal: 1.00,     // 50-200 views
    low: 0.97,        // 10-50 views
    none: 0.95        // < 10 views
  },
  // Category base commission rates (%)
  categoryCommissions: {
    Electronics: 8, Fashion: 12, Home: 10, Grocery: 5,
    Books: 7, Sports: 9, Beauty: 13, Handmade: 6, Other: 10
  },
  // Max price movement per adjustment (% of base price)
  maxMovement: 0.25,
  // Minimum margin above cost (%)
  minMargin: 0.08
};

// ── CORE PRICING ALGORITHM ────────────────────────────────────────────────────

function vsPriceProduct(product) {
  if (!product || !product.price) return product;

  const basePrice = product.mrp || product.price;
  let multiplier = 1.0;

  // 1. Time-of-day adjustment
  const hour = new Date().getHours();
  const timeMult = PRICING_RULES.timeMultipliers[hour] || 1.0;
  multiplier *= timeMult;

  // 2. Stock-level adjustment
  const stock = product.stock || 0;
  let stockMult = 1.0;
  if (stock === 0)       stockMult = PRICING_RULES.stockMultipliers.outOfStock;
  else if (stock < 5)    stockMult = PRICING_RULES.stockMultipliers.critical;
  else if (stock < 15)   stockMult = PRICING_RULES.stockMultipliers.low;
  else if (stock < 100)  stockMult = PRICING_RULES.stockMultipliers.normal;
  else if (stock < 500)  stockMult = PRICING_RULES.stockMultipliers.high;
  else                   stockMult = PRICING_RULES.stockMultipliers.excess;
  multiplier *= stockMult;

  // 3. Demand adjustment (based on views)
  const views = product.views || 0;
  let demandMult = 1.0;
  if (views > 500)      demandMult = PRICING_RULES.demandMultipliers.viral;
  else if (views > 200) demandMult = PRICING_RULES.demandMultipliers.high;
  else if (views > 50)  demandMult = PRICING_RULES.demandMultipliers.normal;
  else if (views > 10)  demandMult = PRICING_RULES.demandMultipliers.low;
  else                  demandMult = PRICING_RULES.demandMultipliers.none;
  multiplier *= demandMult;

  // 4. Day-of-week adjustment
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  const dayMult = (day === 0 || day === 6) ? 1.03 : 1.0; // weekends +3%
  multiplier *= dayMult;

  // 5. Apply multiplier to base price (capped at maxMovement)
  const rawPrice = basePrice * multiplier;
  const minPrice = basePrice * (1 - PRICING_RULES.maxMovement);
  const maxPrice = basePrice * (1 + PRICING_RULES.maxMovement);
  const dynamicPrice = Math.round(Math.min(maxPrice, Math.max(minPrice, rawPrice)));

  // 6. Ensure minimum margin
  const commission = (PRICING_RULES.categoryCommissions[product.category] || 10) / 100;
  const minPriceWithMargin = Math.round(basePrice * (commission + PRICING_RULES.minMargin + 1) * 0.5);
  const finalPrice = Math.max(dynamicPrice, minPriceWithMargin);

  return {
    ...product,
    price: finalPrice,
    originalPrice: product.price,       // seller's set price
    dynamicMultiplier: multiplier,
    priceReason: getPriceReason(timeMult, stockMult, demandMult),
    lastPriced: Date.now()
  };
}

function getPriceReason(timeMult, stockMult, demandMult) {
  const reasons = [];
  if (timeMult > 1.05) reasons.push('Peak hours');
  if (timeMult < 0.97) reasons.push('Off-peak discount');
  if (stockMult > 1.05) reasons.push('Low stock');
  if (stockMult < 0.98) reasons.push('Bulk stock discount');
  if (demandMult > 1.05) reasons.push('High demand');
  if (demandMult < 0.98) reasons.push('Low demand discount');
  return reasons.join(' · ') || 'Standard pricing';
}

// ── PRICE ANCHORING ───────────────────────────────────────────────────────────
// First time user sees a product, show inflated price. Next visits show "discount".

const ANCHOR_KEY = 'vs_price_anchors';

function vsGetAnchorPrice(productId, currentPrice) {
  const anchors = JSON.parse(localStorage.getItem(ANCHOR_KEY) || '{}');
  if (!anchors[productId]) {
    // First visit — store inflated anchor price (+15 to +25%)
    const inflatedPct = 0.15 + Math.random() * 0.10;
    anchors[productId] = {
      anchor: Math.round(currentPrice * (1 + inflatedPct)),
      firstSeen: Date.now(),
      visits: 1
    };
    localStorage.setItem(ANCHOR_KEY, JSON.stringify(anchors));
    return null; // No anchor to show on first visit
  }
  anchors[productId].visits++;
  localStorage.setItem(ANCHOR_KEY, JSON.stringify(anchors));
  return anchors[productId].anchor; // Return stored anchor for subsequent visits
}

// ── GEOGRAPHIC PRICING ────────────────────────────────────────────────────────
// Metro cities pay premium. Tier 2/3 get discount.

const GEO_TIERS = {
  metro: { cities: ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad'], multiplier: 1.05 },
  tier2: { cities: ['Jaipur','Lucknow','Kanpur','Nagpur','Indore','Patna','Bhopal','Visakhapatnam','Surat','Vadodara'], multiplier: 1.00 },
  tier3: { multiplier: 0.97 } // Everything else
};

let _geoMultiplier = 1.0;
let _userCity = '';

function vsInitGeopricing() {
  if (!navigator.geolocation) return;
  // Check cached geo
  const cached = JSON.parse(localStorage.getItem('vs_geo') || 'null');
  if (cached && Date.now() - cached.ts < 86400000) {
    _geoMultiplier = cached.multiplier;
    _userCity = cached.city;
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
      const data = await r.json();
      const city = data.address?.city || data.address?.town || data.address?.county || '';
      _userCity = city;
      let mult = GEO_TIERS.tier3.multiplier;
      if (GEO_TIERS.metro.cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) {
        mult = GEO_TIERS.metro.multiplier;
      } else if (GEO_TIERS.tier2.cities.some(c => city.toLowerCase().includes(c.toLowerCase()))) {
        mult = GEO_TIERS.tier2.multiplier;
      }
      _geoMultiplier = mult;
      localStorage.setItem('vs_geo', JSON.stringify({ city, multiplier: mult, ts: Date.now() }));
    } catch(e) { /* silently fail */ }
  }, () => {}, { timeout: 5000 });
}

function vsApplyGeoPrice(price) {
  return Math.round(price * _geoMultiplier);
}

function vsGetUserCity() { return _userCity; }
function vsGetGeoTier() {
  if (_geoMultiplier >= 1.04) return 'Metro';
  if (_geoMultiplier >= 0.99) return 'Tier 2';
  return 'Tier 3';
}

// ── BUY BOX ALGORITHM ─────────────────────────────────────────────────────────
// Decides which seller wins the buy box when multiple sellers offer same product.

function vsBuyBoxWinner(sellers) {
  // sellers = [{sellerId, price, rating, fulfilment, shippingDays, stock}]
  if (!sellers || sellers.length === 0) return null;
  if (sellers.length === 1) return sellers[0];

  const scored = sellers.map(s => {
    let score = 0;
    // Price score (lower is better) — 35% weight
    const prices = sellers.map(x => x.price);
    const minP = Math.min(...prices), maxP = Math.max(...prices);
    const priceScore = maxP === minP ? 1 : (maxP - s.price) / (maxP - minP);
    score += priceScore * 35;

    // Rating score — 25% weight
    score += ((s.rating || 3) / 5) * 25;

    // Fulfilment score — 25% weight
    score += (s.fulfilment === 'vibestore' ? 1 : 0.5) * 25;

    // Shipping speed score — 15% weight
    const days = s.shippingDays || 5;
    const shipScore = days <= 1 ? 1 : days <= 3 ? 0.7 : days <= 7 ? 0.4 : 0.1;
    score += shipScore * 15;

    return { ...s, buyBoxScore: Math.round(score * 10) / 10 };
  });

  scored.sort((a, b) => b.buyBoxScore - a.buyBoxScore);
  return scored[0];
}

// ── ABANDONED CART RECOVERY ───────────────────────────────────────────────────

function vsCheckAbandonedCart() {
  const cart = JSON.parse(localStorage.getItem('vs_cart') || '[]');
  if (cart.length === 0) return;

  const lastActivity = parseInt(localStorage.getItem('vs_cart_last_activity') || '0');
  const now = Date.now();
  const minutesSince = (now - lastActivity) / 60000;

  // Trigger after 30 minutes of inactivity with items in cart
  if (lastActivity && minutesSince > 30 && minutesSince < 1440) {
    vsShowAbandonedCartNudge(cart);
  }

  // Update last activity on any cart interaction
  localStorage.setItem('vs_cart_last_activity', String(now));
}

function vsShowAbandonedCartNudge(cart) {
  const shown = localStorage.getItem('vs_abandon_shown');
  if (shown && Date.now() - parseInt(shown) < 86400000) return; // Once per day

  const count = cart.reduce((a, i) => a + i.qty, 0);
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);

  const nudge = document.createElement('div');
  nudge.id = 'abandon-nudge';
  nudge.style.cssText = `
    position:fixed;bottom:80px;right:20px;background:#fff;border-radius:12px;
    box-shadow:0 8px 32px rgba(0,0,0,0.15);padding:16px 18px;max-width:280px;
    z-index:9998;border-left:4px solid #FF9900;animation:slideIn .3s ease;
  `;
  nudge.innerHTML = `
    <button onclick="document.getElementById('abandon-nudge').remove()"
      style="position:absolute;top:8px;right:10px;background:none;border:none;font-size:16px;cursor:pointer;color:#999;">×</button>
    <div style="font-size:13px;font-weight:700;margin-bottom:4px;">🛒 You left ${count} item${count>1?'s':''} behind!</div>
    <div style="font-size:12px;color:#666;margin-bottom:10px;">Total: ₹${total.toLocaleString()} — items may sell out</div>
    <a href="cart.html" style="display:block;background:#FF9900;color:#0f1111;text-align:center;padding:8px;border-radius:6px;font-weight:700;font-size:12px;text-decoration:none;">Complete Purchase →</a>
  `;
  document.body.appendChild(nudge);
  localStorage.setItem('vs_abandon_shown', String(Date.now()));

  // Auto-dismiss after 8 seconds
  setTimeout(() => nudge.remove(), 8000);
}

// ── LOSS LEADER DETECTION ─────────────────────────────────────────────────────
// Mark certain categories as loss leaders in admin config

const LOSS_LEADER_CATEGORIES = ['Electronics', 'Books']; // Acquire customers cheap here

function vsIsLossLeader(category) {
  return LOSS_LEADER_CATEGORIES.includes(category);
}

function vsGetLossLeaderDiscount(category) {
  if (!vsIsLossLeader(category)) return 0;
  return category === 'Electronics' ? 0.05 : 0.03; // 5% extra discount on electronics
}

// ── INIT ──────────────────────────────────────────────────────────────────────

vsInitGeopricing();
vsCheckAbandonedCart();

console.log('VibeStore Pricing Engine loaded ✅');
