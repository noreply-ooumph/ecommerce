// cancellation.js — Order Cancellation Flow

const CANCEL_WINDOW_HOURS = 24; // Can cancel within 24 hours of placing

async function vsCancelOrder(orderId, reason) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  if (!auth) return { success: false, error: 'Not logged in' };

  // Rate limit cancellations
  const rl = typeof vsCheckRateLimit === 'function' ? vsCheckRateLimit('cancellations') : { allowed: true };
  if (!rl.allowed) return { success: false, error: rl.message };

  // Get order
  let order = null;
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    const doc = await vsGetDb().collection('vs_orders').doc(orderId).get();
    if (doc.exists) order = { id: doc.id, ...doc.data() };
  }
  if (!order) return { success: false, error: 'Order not found' };

  // Check ownership
  if (order.buyerEmail !== auth.email) return { success: false, error: 'Unauthorised' };

  // Check cancellation window
  const hoursElapsed = (Date.now() - order.placedAt) / 3600000;
  if (hoursElapsed > CANCEL_WINDOW_HOURS) {
    return { success: false, error: `Cancellation window closed. Orders can only be cancelled within ${CANCEL_WINDOW_HOURS} hours of placement.` };
  }

  // Check if already shipped
  if (order.status === 'shipped' || order.status === 'delivered') {
    return { success: false, error: 'Order already shipped. Please use the Returns flow instead.', redirect: 'returns.html' };
  }

  // Process cancellation
  if (vsIsFirebaseReady && vsIsFirebaseReady()) {
    await vsGetDb().collection('vs_orders').doc(orderId).update({
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: Date.now(),
      cancelledBy: auth.email
    });

    // Log cancellation event
    vsGetDb().collection('vs_events').add({
      type: 'order_cancelled', orderId, reason, userId: auth.email, timestamp: Date.now()
    });
  }

  // Send cancellation emails
  if (typeof vsEmailOrderConfirmation === 'function') {
    // Notify buyer of cancellation
    vsSendEmail && vsSendEmail('template_order_cancelled', {
      to_email: auth.email,
      to_name: auth.name,
      subject: `Order ${orderId} Cancelled | VibeStore`,
      order_id: orderId,
      refund_note: 'Refund will be processed within 5-7 business days'
    });
  }

  return { success: true, refundNote: 'Refund processed within 5-7 business days' };
}

function vsShowCancellationModal(orderId, orderDetails) {
  const existing = document.getElementById('cancel-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'cancel-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <h3 style="margin-bottom:6px;font-size:1.1rem;">Cancel Order ${orderId}</h3>
      <p style="font-size:13px;color:#666;margin-bottom:20px;">This action cannot be undone. Refund will be processed within 5-7 business days.</p>
      <div style="margin-bottom:14px;">
        <label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:5px;">Reason for cancellation *</label>
        <select id="cancel-reason" style="width:100%;padding:9px 12px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;font-family:inherit;">
          <option value="">Select a reason</option>
          <option value="wrong_item">Ordered wrong item</option>
          <option value="found_cheaper">Found cheaper elsewhere</option>
          <option value="changed_mind">Changed my mind</option>
          <option value="wrong_address">Wrong delivery address</option>
          <option value="duplicate_order">Duplicate order</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div id="cancel-error" style="color:#CC0C39;font-size:12px;margin-bottom:8px;display:none;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="document.getElementById('cancel-modal').remove()" style="flex:1;padding:11px;background:#f5f7fa;border:1px solid #ddd;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;">Keep Order</button>
        <button onclick="confirmCancellation('${orderId}')" style="flex:1;padding:11px;background:#CC0C39;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;">Cancel Order</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function confirmCancellation(orderId) {
  const reason = document.getElementById('cancel-reason')?.value;
  if (!reason) { const e=document.getElementById('cancel-error'); e.textContent='Please select a reason'; e.style.display='block'; return; }
  const btn = document.querySelector('#cancel-modal button:last-child');
  if (btn) { btn.textContent = 'Cancelling...'; btn.disabled = true; }
  const result = await vsCancelOrder(orderId, reason);
  if (result.success) {
    document.getElementById('cancel-modal').innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px;max-width:420px;width:100%;text-align:center;">
        <div style="font-size:3rem;margin-bottom:12px;">✅</div>
        <h3 style="margin-bottom:8px;">Order Cancelled</h3>
        <p style="font-size:13px;color:#666;margin-bottom:20px;">${result.refundNote}</p>
        <a href="orders.html" style="display:block;background:#FF9900;color:#0f1111;padding:11px;border-radius:7px;font-weight:700;text-decoration:none;font-size:13px;">View My Orders</a>
      </div>`;
    setTimeout(() => { document.getElementById('cancel-modal')?.remove(); location.reload(); }, 4000);
  } else {
    const e=document.getElementById('cancel-error'); e.textContent=result.error; e.style.display='block';
    if (btn) { btn.textContent='Cancel Order'; btn.disabled=false; }
    if (result.redirect) setTimeout(() => window.location.href=result.redirect, 2000);
  }
}

console.log('VibeStore Cancellation Flow loaded ✅');
