// email-service.js — VibeStore Email Notifications via EmailJS
// EmailJS works directly from browser — no server, no API key exposure
// Sign up free at emailjs.com → get SERVICE_ID, TEMPLATE_IDs, PUBLIC_KEY

const EMAIL_CONFIG = {
  publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',        // Replace after emailjs.com signup
  serviceId: 'YOUR_SERVICE_ID',                 // e.g. service_abc123
  templates: {
    order_confirmation: 'template_order_confirm',
    order_shipped: 'template_order_shipped',
    seller_new_order: 'template_seller_order',
    payout_notification: 'template_payout',
    otp: 'template_otp',
    welcome_buyer: 'template_welcome_buyer',
    welcome_seller: 'template_welcome_seller',
    password_reset: 'template_password_reset',
    review_received: 'template_review'
  }
};

let _emailJSReady = false;

function vsInitEmail() {
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAIL_CONFIG.publicKey);
    _emailJSReady = true;
    return true;
  }
  return false;
}

async function vsLoadEmailJS() {
  if (_emailJSReady) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => { vsInitEmail(); resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ── SEND EMAIL ────────────────────────────────────────────────────────────────

async function vsSendEmail(templateId, params) {
  // Always log in demo mode
  console.log('📧 Email would be sent:', { templateId, params });

  // If EmailJS not configured, show in-app notification instead
  if (EMAIL_CONFIG.publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
    vsShowEmailToast(params);
    return { status: 'demo', message: 'Email logged (configure EmailJS to send real emails)' };
  }

  await vsLoadEmailJS();
  if (!_emailJSReady) return { status: 'error', message: 'EmailJS not loaded' };

  try {
    const result = await emailjs.send(EMAIL_CONFIG.serviceId, templateId, params);
    console.log('✅ Email sent:', result);
    return { status: 'sent', result };
  } catch(err) {
    console.error('Email error:', err);
    return { status: 'error', error: err };
  }
}

function vsShowEmailToast(params) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;left:24px;background:#131921;color:#fff;
    padding:14px 18px;border-radius:10px;max-width:300px;z-index:9999;
    box-shadow:0 4px 16px rgba(0,0,0,0.3);border-left:3px solid #FF9900;
    font-size:13px;line-height:1.4;
  `;
  toast.innerHTML = `
    <div style="font-weight:700;margin-bottom:4px;">📧 Email Notification (Demo)</div>
    <div style="color:#aaa;font-size:12px;">To: ${params.to_email || 'buyer'}</div>
    <div style="color:#ddd;font-size:12px;margin-top:2px;">${params.subject || 'VibeStore Notification'}</div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────

async function vsEmailOrderConfirmation(order, buyer) {
  return vsSendEmail(EMAIL_CONFIG.templates.order_confirmation, {
    to_email: buyer.email,
    to_name: buyer.name,
    subject: `Order Confirmed — ${order.id} | VibeStore`,
    order_id: order.id,
    product_name: order.productName,
    product_emoji: order.productEmoji || '📦',
    amount: '₹' + Number(order.amount).toLocaleString('en-IN'),
    seller_name: order.sellerName,
    estimated_delivery: 'Tomorrow by 9 PM',
    track_url: `https://noreply-ooumph.github.io/ecommerce/track.html?order=${order.id}`,
    support_email: 'support@vibestore.in'
  });
}

async function vsEmailOrderShipped(order, buyer, trackingId) {
  return vsSendEmail(EMAIL_CONFIG.templates.order_shipped, {
    to_email: buyer.email,
    to_name: buyer.name,
    subject: `Your order is on its way! 🚀 — ${order.id}`,
    order_id: order.id,
    product_name: order.productName,
    tracking_id: trackingId || 'VB' + Date.now(),
    track_url: `https://noreply-ooumph.github.io/ecommerce/track.html?order=${order.id}`,
    seller_name: order.sellerName
  });
}

async function vsEmailSellerNewOrder(order, seller) {
  return vsSendEmail(EMAIL_CONFIG.templates.seller_new_order, {
    to_email: seller.email,
    to_name: seller.name || seller.storeName,
    subject: `New Order Received — ${order.id} | Seller Central`,
    order_id: order.id,
    product_name: order.productName,
    qty: order.qty || 1,
    amount: '₹' + Number(order.amount).toLocaleString('en-IN'),
    buyer_city: order.buyerCity || 'India',
    dashboard_url: 'https://noreply-ooumph.github.io/ecommerce/seller-orders.html',
    ship_by: 'Within 48 hours'
  });
}

async function vsEmailPayoutProcessed(seller, amount, payoutDate) {
  return vsSendEmail(EMAIL_CONFIG.templates.payout_notification, {
    to_email: seller.email,
    to_name: seller.name || seller.storeName,
    subject: `Payout of ₹${amount.toLocaleString('en-IN')} processed | VibeStore`,
    amount: '₹' + amount.toLocaleString('en-IN'),
    payout_date: payoutDate,
    bank_last4: '****',
    dashboard_url: 'https://noreply-ooumph.github.io/ecommerce/seller-payouts.html'
  });
}

async function vsEmailWelcomeBuyer(buyer) {
  return vsSendEmail(EMAIL_CONFIG.templates.welcome_buyer, {
    to_email: buyer.email,
    to_name: buyer.name,
    subject: 'Welcome to VibeStore! 🎉',
    name: buyer.name,
    marketplace_url: 'https://noreply-ooumph.github.io/ecommerce/mystore.html',
    vibepass_url: 'https://noreply-ooumph.github.io/ecommerce/vibepass.html'
  });
}

async function vsEmailWelcomeSeller(seller) {
  return vsSendEmail(EMAIL_CONFIG.templates.welcome_seller, {
    to_email: seller.email,
    to_name: seller.name || seller.storeName,
    subject: `Welcome to VibeStore Seller Central! Your store is ready 🏪`,
    store_name: seller.storeName,
    dashboard_url: 'https://noreply-ooumph.github.io/ecommerce/seller-dashboard.html',
    listings_url: 'https://noreply-ooumph.github.io/ecommerce/seller-listings.html'
  });
}

async function vsEmailPasswordReset(email, otp) {
  return vsSendEmail(EMAIL_CONFIG.templates.password_reset, {
    to_email: email,
    subject: `Your VibeStore password reset code: ${otp}`,
    otp,
    expires_in: '10 minutes',
    support_email: 'support@vibestore.in'
  });
}

async function vsEmailReviewReceived(seller, review) {
  return vsSendEmail(EMAIL_CONFIG.templates.review_received, {
    to_email: seller.email,
    to_name: seller.storeName,
    subject: `New ${review.rating}⭐ review on "${review.productName}"`,
    product_name: review.productName,
    rating: review.rating,
    stars: '⭐'.repeat(review.rating),
    review_text: review.text,
    dashboard_url: 'https://noreply-ooumph.github.io/ecommerce/seller-analytics.html'
  });
}

console.log('VibeStore Email Service loaded ✅');
