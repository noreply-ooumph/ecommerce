// commission-engine.js — VibeStore Seller Commission & Fee Engine
// Tiered commission rates based on GMV. Higher sellers pay less.
// Vibestore makes money on volume, not per-unit margin.

// ── SELLER TIERS ──────────────────────────────────────────────────────────────

const SELLER_TIERS = {
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    color: '#CD7F32',
    gmvMin: 0,
    gmvMax: 50000,
    monthlyFee: 0,       // Free to start
    commissions: { Electronics:8, Fashion:12, Home:10, Grocery:5, Books:7, Sports:9, Beauty:13, Handmade:6, Other:10 },
    perks: ['Basic listing', 'Standard search placement', 'Rex AI support'],
    settlementDays: 14
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    color: '#C0C0C0',
    gmvMin: 50000,
    gmvMax: 500000,
    monthlyFee: 999,
    commissions: { Electronics:7, Fashion:10, Home:9, Grocery:4, Books:6, Sports:8, Beauty:11, Handmade:5, Other:9 },
    perks: ['Enhanced listing', 'Priority search placement', 'All AI agents', 'Sponsored product slots (2/month)'],
    settlementDays: 10
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    color: '#FFD700',
    gmvMin: 500000,
    gmvMax: 5000000,
    monthlyFee: 2999,
    commissions: { Electronics:6, Fashion:9, Home:8, Grocery:3.5, Books:5, Sports:7, Beauty:10, Handmade:4, Other:8 },
    perks: ['Featured listings', 'Top search placement', 'All AI agents', 'Sponsored slots (10/month)', 'Dedicated account manager AI', '7-day settlement'],
    settlementDays: 7
  },
  platinum: {
    name: 'Platinum',
    emoji: '💎',
    color: '#E5E4E2',
    gmvMin: 5000000,
    gmvMax: Infinity,
    monthlyFee: 9999,
    commissions: { Electronics:4.5, Fashion:7, Home:6, Grocery:2.5, Books:4, Sports:5, Beauty:8, Handmade:3, Other:6 },
    perks: ['Premium listings', '#1 search placement', 'All AI agents', 'Unlimited sponsored slots', 'Custom brand store', '3-day settlement', 'Real-time analytics', 'Direct platform support'],
    settlementDays: 3
  }
};

// VBF (VibeStore Fulfilled) — extra 2% commission but 48h guaranteed delivery
const VBF_PREMIUM_COMMISSION = 2.0; // Additional %

// ── TIER DETECTION ────────────────────────────────────────────────────────────

function vsGetSellerTier(monthlyGMV) {
  const gmv = monthlyGMV || 0;
  if (gmv >= SELLER_TIERS.platinum.gmvMin) return SELLER_TIERS.platinum;
  if (gmv >= SELLER_TIERS.gold.gmvMin)     return SELLER_TIERS.gold;
  if (gmv >= SELLER_TIERS.silver.gmvMin)   return SELLER_TIERS.silver;
  return SELLER_TIERS.bronze;
}

function vsGetNextTier(currentTierName) {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const idx = tiers.indexOf(currentTierName.toLowerCase());
  return idx < tiers.length - 1 ? SELLER_TIERS[tiers[idx + 1]] : null;
}

// ── COMMISSION CALCULATION ────────────────────────────────────────────────────

function vsCalculateCommission(salePrice, category, tierName, isVBF) {
  const tier = SELLER_TIERS[tierName.toLowerCase()] || SELLER_TIERS.bronze;
  let commissionPct = tier.commissions[category] || tier.commissions.Other;
  if (isVBF) commissionPct += VBF_PREMIUM_COMMISSION;

  const commissionAmount = Math.round(salePrice * commissionPct / 100);
  const gstOnCommission = Math.round(commissionAmount * 0.18); // 18% GST on commission
  const totalDeduction = commissionAmount + gstOnCommission;
  const sellerPayout = salePrice - totalDeduction;

  return {
    salePrice,
    commissionPct,
    commissionAmount,
    gstOnCommission,
    totalDeduction,
    sellerPayout,
    breakdown: `${commissionPct}% commission + 18% GST on commission`
  };
}

// ── VIBESTORE FULFILLED (VBF) ─────────────────────────────────────────────────
// Like FBA. Seller sends inventory to VibeStore warehouse.
// VibeStore handles pick, pack, ship, returns.
// Seller pays extra 2% but gets: guaranteed 48h delivery, Prime badge, better buy box score.

const VBF_BENEFITS = [
  '48-hour guaranteed delivery badge',
  'Priority in buy box algorithm (+25 points)',
  'VibeStore handles returns directly',
  'Lower cart abandonment (buyers trust fast delivery)',
  'Eligible for VibePass exclusive deals'
];

const VBF_FEES = {
  storage_per_unit_per_month: 15,  // ₹15/unit/month
  pick_pack_per_order: 25,          // ₹25/order
  additional_commission: VBF_PREMIUM_COMMISSION
};

function vsGetVBFCost(units, ordersPerMonth, salePrice, category, tierName) {
  const storageCost = units * VBF_FEES.storage_per_unit_per_month;
  const fulfillmentCost = ordersPerMonth * VBF_FEES.pick_pack_per_order;
  const commissionDiff = salePrice * VBF_FEES.additional_commission / 100 * ordersPerMonth;
  const totalExtraCost = storageCost + fulfillmentCost + commissionDiff;

  // Benefit: typically 30% more orders due to Prime badge + buy box priority
  const projectedExtraOrders = ordersPerMonth * 0.30;
  const projectedExtraRevenue = projectedExtraOrders * salePrice * 0.85; // after commission

  return {
    storageCost, fulfillmentCost, commissionDiff,
    totalExtraCost: Math.round(totalExtraCost),
    projectedExtraRevenue: Math.round(projectedExtraRevenue),
    roi: Math.round((projectedExtraRevenue - totalExtraCost) / totalExtraCost * 100),
    recommended: projectedExtraRevenue > totalExtraCost
  };
}

// ── PAYOUT SCHEDULE ───────────────────────────────────────────────────────────

function vsGetPayoutSchedule(tierName) {
  const tier = SELLER_TIERS[tierName.toLowerCase()] || SELLER_TIERS.bronze;
  const nextPayout = new Date();
  nextPayout.setDate(nextPayout.getDate() + tier.settlementDays);
  return {
    days: tier.settlementDays,
    nextDate: nextPayout.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' }),
    frequency: tier.settlementDays <= 3 ? 'Daily' : tier.settlementDays <= 7 ? 'Weekly' : 'Bi-weekly'
  };
}

// ── VIBEPASS SUBSCRIPTION ─────────────────────────────────────────────────────

const VIBEPASS_PLANS = {
  monthly: { price: 299, billingCycle: 'month', savings: 0 },
  quarterly: { price: 799, billingCycle: '3 months', savings: 98 },
  annual: { price: 2499, billingCycle: 'year', savings: 1089 }
};

const VIBEPASS_BENEFITS = [
  'FREE delivery on all orders (no minimum)',
  'Exclusive member-only deals (extra 5-15% off)',
  'Early access to Lightning Deals (2 hours before)',
  'Free returns on all orders',
  'Priority customer support via Rex AI',
  'VibePass lounge — curated luxury brands',
  '2x loyalty points on every purchase',
  'Free 1-hour delivery in metro cities'
];

function vsIsVibePassMember() {
  const pass = JSON.parse(localStorage.getItem('vs_vibepass') || 'null');
  return pass && pass.expiresAt > Date.now();
}

function vsActivateVibePass(plan) {
  const planData = VIBEPASS_PLANS[plan];
  if (!planData) return false;
  const months = plan === 'annual' ? 12 : plan === 'quarterly' ? 3 : 1;
  const vibepass = {
    plan,
    price: planData.price,
    activatedAt: Date.now(),
    expiresAt: Date.now() + months * 30 * 86400000,
    benefits: VIBEPASS_BENEFITS
  };
  localStorage.setItem('vs_vibepass', JSON.stringify(vibepass));
  return vibepass;
}

function vsGetVibePassDiscount(price) {
  if (!vsIsVibePassMember()) return 0;
  return Math.round(price * 0.05); // 5% extra discount for members
}

console.log('VibeStore Commission Engine loaded ✅');
