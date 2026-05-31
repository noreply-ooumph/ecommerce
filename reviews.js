// reviews.js — VibeStore Review & Rating System
// Stores in Firestore vs_reviews collection
// Verified purchase check, moderation, seller response

const REVIEWS_COL = 'vs_reviews';

// ── SUBMIT REVIEW ─────────────────────────────────────────────────────────────

async function vsSubmitReview(reviewData) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  if (!auth || auth.role !== 'buyer') return { success: false, error: 'Must be logged in as buyer' };

  // Check verified purchase
  const orders = typeof dbGetOrders === 'function' ? await dbGetOrders(auth.email) : [];
  const hasPurchased = orders.some(o => o.productId === reviewData.productId);

  // Rate limit: 1 review per product per buyer
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    const existing = await vsGetDb().collection(REVIEWS_COL)
      .where('buyerEmail', '==', auth.email)
      .where('productId', '==', reviewData.productId)
      .limit(1).get();
    if (!existing.empty) return { success: false, error: 'You have already reviewed this product' };
  }

  const review = {
    productId:      reviewData.productId,
    productName:    reviewData.productName,
    sellerId:       reviewData.sellerId,
    sellerEmail:    reviewData.sellerEmail,
    buyerEmail:     auth.email,
    buyerName:      auth.name,
    rating:         reviewData.rating,          // 1-5
    title:          reviewData.title || '',
    text:           reviewData.text || '',
    images:         reviewData.images || [],
    verifiedPurchase: hasPurchased,
    helpful:        0,
    notHelpful:     0,
    sellerResponse: null,
    status:         'published',               // published | flagged | removed
    createdAt:      Date.now()
  };

  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    const ref = await vsGetDb().collection(REVIEWS_COL).add(review);
    review.id = ref.id;
    // Update product rating
    await vsUpdateProductRating(reviewData.productId);
    // Notify seller
    if (typeof vsEmailReviewReceived === 'function') {
      vsEmailReviewReceived({ email: reviewData.sellerEmail, storeName: reviewData.sellerName }, review);
    }
  } else {
    // localStorage fallback
    const local = JSON.parse(localStorage.getItem('vs_reviews_local') || '[]');
    review.id = 'rev_' + Date.now();
    local.push(review);
    localStorage.setItem('vs_reviews_local', JSON.stringify(local));
  }

  return { success: true, review };
}

// ── GET REVIEWS ───────────────────────────────────────────────────────────────

async function vsGetProductReviews(productId, sortBy) {
  // sortBy: 'recent' | 'helpful' | 'high_rating' | 'low_rating'
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    let query = vsGetDb().collection(REVIEWS_COL)
      .where('productId', '==', productId)
      .where('status', '==', 'published');
    if (sortBy === 'recent' || !sortBy) query = query.orderBy('createdAt', 'desc');
    const snap = await query.limit(50).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  const local = JSON.parse(localStorage.getItem('vs_reviews_local') || '[]');
  return local.filter(r => r.productId === productId);
}

async function vsGetSellerReviews(sellerId) {
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    const snap = await vsGetDb().collection(REVIEWS_COL)
      .where('sellerId', '==', sellerId)
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .limit(100).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return [];
}

// ── UPDATE PRODUCT RATING ─────────────────────────────────────────────────────

async function vsUpdateProductRating(productId) {
  if (!vsIsFirebaseReady || !vsIsFirebaseReady()) return;
  const snap = await vsGetDb().collection(REVIEWS_COL)
    .where('productId', '==', productId)
    .where('status', '==', 'published').get();
  const reviews = snap.docs.map(d => d.data());
  if (reviews.length === 0) return;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  await vsGetDb().collection('vs_products').doc(productId).update({
    rating: Math.round(avg * 10) / 10,
    reviewCount: reviews.length
  });
}

// ── HELPFUL VOTE ──────────────────────────────────────────────────────────────

async function vsVoteHelpful(reviewId, helpful) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const voteKey = `vs_vote_${reviewId}`;
  if (localStorage.getItem(voteKey)) return { success: false, error: 'Already voted' };
  localStorage.setItem(voteKey, helpful ? 'helpful' : 'not');
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    const ref = vsGetDb().collection(REVIEWS_COL).doc(reviewId);
    await ref.update({
      helpful: helpful ? (await ref.get()).data().helpful + 1 : (await ref.get()).data().helpful,
      notHelpful: !helpful ? (await ref.get()).data().notHelpful + 1 : (await ref.get()).data().notHelpful
    });
  }
  return { success: true };
}

// ── SELLER RESPONSE ───────────────────────────────────────────────────────────

async function vsSellerRespondToReview(reviewId, responseText) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  if (!auth || auth.role !== 'seller') return { success: false };
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    await vsGetDb().collection(REVIEWS_COL).doc(reviewId).update({
      sellerResponse: { text: responseText, respondedAt: Date.now(), sellerName: auth.storeName || auth.name }
    });
  }
  return { success: true };
}

// ── RENDER REVIEW FORM ────────────────────────────────────────────────────────

function vsRenderReviewForm(productId, productName, sellerId, sellerEmail, sellerName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  if (!auth || auth.role !== 'buyer') {
    container.innerHTML = `<div style="text-align:center;padding:20px;color:#666;font-size:13px;">
      <a href="buyer-login.html" style="color:#FF9900;font-weight:700;">Sign in as buyer</a> to write a review
    </div>`;
    return;
  }
  container.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06);margin-bottom:20px;">
      <h4 style="margin-bottom:16px;font-size:15px;">Write a Customer Review</h4>
      <div style="margin-bottom:14px;">
        <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:6px;">Overall Rating *</div>
        <div id="star-picker" style="display:flex;gap:4px;cursor:pointer;font-size:28px;">
          ${[1,2,3,4,5].map(n => `<span data-star="${n}" style="color:#ddd;transition:color .1s;" onmouseover="hoverStar(${n})" onmouseout="resetStars()" onclick="selectStar(${n})">★</span>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:5px;">Review Title</div>
        <input id="review-title" type="text" placeholder="Summarise your experience in one line" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;font-family:inherit;outline:none;">
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:5px;">Your Review *</div>
        <textarea id="review-text" rows="4" placeholder="What did you like or dislike? How was the quality? Would you recommend it?" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;font-family:inherit;outline:none;resize:vertical;"></textarea>
      </div>
      <div id="review-error" style="color:#CC0C39;font-size:12px;margin-bottom:8px;display:none;"></div>
      <button onclick="submitReview('${productId}','${productName}','${sellerId}','${sellerEmail}','${sellerName}')" style="background:#FF9900;color:#0f1111;border:none;padding:10px 24px;border-radius:7px;font-weight:700;font-size:13px;cursor:pointer;">Submit Review</button>
    </div>
  `;
}

let _selectedStar = 0;
function hoverStar(n) { document.querySelectorAll('#star-picker span').forEach((s,i) => s.style.color = i<n?'#FF9900':'#ddd'); }
function resetStars() { document.querySelectorAll('#star-picker span').forEach((s,i) => s.style.color = i<_selectedStar?'#FF9900':'#ddd'); }
function selectStar(n) { _selectedStar = n; resetStars(); }

async function submitReview(productId, productName, sellerId, sellerEmail, sellerName) {
  if (_selectedStar === 0) { const e=document.getElementById('review-error'); e.textContent='Please select a star rating'; e.style.display='block'; return; }
  const text = document.getElementById('review-text')?.value?.trim();
  if (!text) { const e=document.getElementById('review-error'); e.textContent='Please write your review'; e.style.display='block'; return; }
  const result = await vsSubmitReview({ productId, productName, sellerId, sellerEmail, sellerName, rating: _selectedStar, title: document.getElementById('review-title')?.value || '', text });
  if (result.success) {
    document.getElementById('review-form-container') && (document.getElementById('review-form-container').innerHTML = '<div style="background:#e6f9f2;border:1px solid #a8e6d0;border-radius:8px;padding:16px;color:#067D62;font-weight:600;text-align:center;">✅ Thank you! Your review has been submitted.</div>');
  } else {
    const e=document.getElementById('review-error'); e.textContent=result.error||'Error submitting review'; e.style.display='block';
  }
}

// ── RENDER REVIEWS LIST ───────────────────────────────────────────────────────

async function vsRenderReviews(productId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div style="color:#999;text-align:center;padding:20px;font-size:13px;">Loading reviews...</div>';
  const reviews = await vsGetProductReviews(productId, 'recent');
  if (reviews.length === 0) { container.innerHTML = '<div style="color:#999;text-align:center;padding:24px;font-size:13px;">No reviews yet. Be the first to review this product!</div>'; return; }
  const avgRating = reviews.reduce((s,r)=>s+r.rating,0)/reviews.length;
  const ratingCounts = [5,4,3,2,1].map(n => reviews.filter(r=>r.rating===n).length);
  container.innerHTML = `
    <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;">
      <div style="text-align:center;min-width:100px;">
        <div style="font-size:3rem;font-weight:800;font-family:'Space Grotesk',sans-serif;color:#0f1111;">${avgRating.toFixed(1)}</div>
        <div style="color:#FF9900;font-size:1.2rem;">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5-Math.round(avgRating))}</div>
        <div style="font-size:11px;color:#666;">${reviews.length} review${reviews.length!==1?'s':''}</div>
      </div>
      <div style="flex:1;min-width:200px;">
        ${[5,4,3,2,1].map((n,i)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:11px;color:#007185;white-space:nowrap;">${n} star</span>
            <div style="flex:1;background:#f0f0f0;border-radius:3px;height:8px;overflow:hidden;">
              <div style="background:#FF9900;height:100%;width:${reviews.length?Math.round(ratingCounts[i]/reviews.length*100):0}%;border-radius:3px;"></div>
            </div>
            <span style="font-size:11px;color:#666;width:24px;">${ratingCounts[i]}</span>
          </div>`).join('')}
      </div>
    </div>
    ${reviews.slice(0,5).map(r=>`
      <div style="border-top:1px solid #f0f2f5;padding:16px 0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">${(r.buyerName||'A')[0].toUpperCase()}</div>
          <div>
            <div style="font-size:13px;font-weight:600;">${r.buyerName}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="color:#FF9900;font-size:12px;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
              ${r.verifiedPurchase?'<span style="font-size:10px;color:#067D62;font-weight:600;">✓ Verified Purchase</span>':''}
            </div>
          </div>
          <span style="margin-left:auto;font-size:11px;color:#999;">${new Date(r.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
        </div>
        ${r.title?`<div style="font-weight:700;font-size:13px;margin-bottom:4px;">${r.title}</div>`:''}
        <div style="font-size:13px;color:#333;line-height:1.6;">${r.text}</div>
        ${r.sellerResponse?`<div style="background:#f5f7fa;border-left:3px solid #FF9900;padding:10px 14px;margin-top:10px;border-radius:0 6px 6px 0;">
          <div style="font-size:11px;font-weight:700;color:#c07000;margin-bottom:4px;">Seller Response:</div>
          <div style="font-size:12px;color:#333;">${r.sellerResponse.text}</div>
        </div>`:''}
        <div style="margin-top:8px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:11px;color:#666;">Helpful?</span>
          <button onclick="vsVoteHelpful('${r.id}',true)" style="background:#f5f7fa;border:1px solid #ddd;padding:2px 10px;border-radius:4px;font-size:11px;cursor:pointer;">👍 ${r.helpful||0}</button>
          <button onclick="vsVoteHelpful('${r.id}',false)" style="background:#f5f7fa;border:1px solid #ddd;padding:2px 10px;border-radius:4px;font-size:11px;cursor:pointer;">👎 ${r.notHelpful||0}</button>
        </div>
      </div>`).join('')}
  `;
}

console.log('VibeStore Reviews System loaded ✅');
