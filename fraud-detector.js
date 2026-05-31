// fraud-detector.js — VibeStore Fraud Detection & Rate Limiting

const FRAUD_KEY = 'vs_fraud_data';
const LIMITS = {
  login_attempts: { max: 5, windowMs: 900000, blockMs: 3600000 },     // 5 attempts per 15min, block 1hr
  product_submissions: { max: 10, windowMs: 3600000, blockMs: 86400000 }, // 10/hr
  search_requests: { max: 60, windowMs: 60000, blockMs: 300000 },      // 60/min
  cart_actions: { max: 50, windowMs: 300000, blockMs: 300000 },        // 50/5min
  referral_claims: { max: 3, windowMs: 86400000, blockMs: 86400000 },  // 3/day
  checkout_attempts: { max: 3, windowMs: 300000, blockMs: 1800000 }    // 3/5min
};

function getFraudData() {
  return JSON.parse(localStorage.getItem(FRAUD_KEY) || '{}');
}

function saveFraudData(data) {
  localStorage.setItem(FRAUD_KEY, JSON.stringify(data));
}

function vsCheckRateLimit(action) {
  const data = getFraudData();
  const now = Date.now();
  const limit = LIMITS[action];
  if (!limit) return { allowed: true };

  if (!data[action]) data[action] = { attempts: [], blocked: null };

  // Check if currently blocked
  if (data[action].blocked && now < data[action].blocked) {
    const remaining = Math.ceil((data[action].blocked - now) / 60000);
    saveFraudData(data);
    return { allowed: false, message: `Too many attempts. Try again in ${remaining} minute${remaining!==1?'s':''}.`, blocked: true };
  }

  // Clear old attempts outside window
  data[action].attempts = data[action].attempts.filter(t => now - t < limit.windowMs);

  // Check limit
  if (data[action].attempts.length >= limit.max) {
    data[action].blocked = now + limit.blockMs;
    saveFraudData(data);
    const blockMins = Math.ceil(limit.blockMs / 60000);
    return { allowed: false, message: `Too many requests. Blocked for ${blockMins} minute${blockMins!==1?'s':''}.`, blocked: true };
  }

  // Log attempt
  data[action].attempts.push(now);
  data[action].blocked = null;
  saveFraudData(data);
  return { allowed: true, remaining: limit.max - data[action].attempts.length };
}

function vsResetRateLimit(action) {
  const data = getFraudData();
  if (data[action]) { data[action] = { attempts: [], blocked: null }; }
  saveFraudData(data);
}

// Fraud scoring
function vsFraudScore(signals) {
  let score = 0;
  if (signals.newAccount) score += 10;
  if (signals.highOrderValue) score += 15;
  if (signals.differentDeliveryIP) score += 20;
  if (signals.multipleCardsUsed) score += 25;
  if (signals.rushOrder) score += 10;
  if (signals.noSearchHistory) score += 5;
  if (signals.veryLowRatedSeller) score += 15;
  return { score, risk: score < 20 ? 'low' : score < 50 ? 'medium' : 'high', flagged: score >= 50 };
}

// Honeypot check — invisible fields that bots fill
function vsCheckHoneypot(formId) {
  const form = document.getElementById(formId);
  if (!form) return true;
  const honeypot = form.querySelector('[name="website"], [name="url"], [name="honeypot"]');
  if (honeypot && honeypot.value) {
    vsTrackFraud('honeypot_triggered', { formId });
    return false; // Bot detected
  }
  return true;
}

function vsTrackFraud(type, data) {
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    vsGetDb().collection('vs_fraud_events').add({ type, data, timestamp: Date.now(), page: window.location.pathname });
  }
}

// Show block message in UI
function vsShowBlockMessage(element, message) {
  if (typeof element === 'string') element = document.getElementById(element) || document.querySelector(element);
  if (!element) return;
  const msg = document.createElement('div');
  msg.style.cssText = 'background:#fce8ec;border:1px solid #ffb3c1;color:#CC0C39;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:8px;font-weight:500;';
  msg.textContent = '🚫 ' + message;
  element.parentNode.insertBefore(msg, element.nextSibling);
  setTimeout(() => msg.remove(), 5000);
}

console.log('VibeStore Fraud Detector loaded ✅');
