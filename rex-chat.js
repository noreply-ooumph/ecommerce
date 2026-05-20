/* ===== REX AI CHAT WIDGET — VibeStore ===== */
(function () {
  const CSS = `
  #rex-fab{position:fixed;bottom:28px;right:28px;z-index:8000;cursor:pointer;
    width:58px;height:58px;border-radius:50%;
    background:linear-gradient(135deg,#7c3aed,#06b6d4);
    display:flex;align-items:center;justify-content:center;font-size:1.5rem;
    box-shadow:0 6px 28px rgba(124,58,237,0.45);
    transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    border:none;outline:none;}
  #rex-fab:hover{transform:scale(1.1);}
  #rex-fab .rex-badge{position:absolute;top:-4px;right:-4px;background:#f87171;
    color:white;width:18px;height:18px;border-radius:50%;
    font-size:0.6rem;font-weight:700;display:flex;align-items:center;justify-content:center;
    border:2px solid white;}
  #rex-window{position:fixed;bottom:100px;right:28px;z-index:8000;
    width:360px;max-width:calc(100vw - 32px);
    background:white;border-radius:20px;
    box-shadow:0 16px 60px rgba(0,0,0,0.18);
    border:1px solid #e5e5e0;
    display:none;flex-direction:column;overflow:hidden;
    animation:rexSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);}
  @keyframes rexSlideIn{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
  #rex-window.open{display:flex;}
  .rex-hdr{background:linear-gradient(135deg,#1a0533,#2d1b69);padding:16px 18px;
    display:flex;align-items:center;gap:12px;flex-shrink:0;}
  .rex-avatar{width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,#7c3aed,#06b6d4);
    display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
  .rex-info{flex:1;}
  .rex-name{color:white;font-weight:700;font-size:0.9rem;font-family:'Inter',sans-serif;}
  .rex-status{color:rgba(255,255,255,0.6);font-size:0.72rem;display:flex;align-items:center;gap:4px;}
  .rex-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#4ade80;display:inline-block;animation:rexPulse 1.5s infinite;}
  @keyframes rexPulse{0%,100%{opacity:1}50%{opacity:0.4}}
  .rex-close{color:rgba(255,255,255,0.6);cursor:pointer;font-size:1.1rem;width:28px;height:28px;
    display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background 0.2s;}
  .rex-close:hover{background:rgba(255,255,255,0.1);color:white;}
  .rex-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:320px;}
  .rex-msgs::-webkit-scrollbar{width:3px;}
  .rex-msgs::-webkit-scrollbar-thumb{background:#e5e5e0;border-radius:2px;}
  .msg{display:flex;flex-direction:column;max-width:84%;animation:msgIn 0.25s ease;}
  @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .msg.bot{align-self:flex-start;}
  .msg.user{align-self:flex-end;align-items:flex-end;}
  .msg-bubble{padding:10px 13px;border-radius:14px;font-size:0.81rem;line-height:1.5;font-family:'Inter',sans-serif;}
  .msg.bot .msg-bubble{background:#f3f3ef;color:#0f0f1a;border-bottom-left-radius:4px;}
  .msg.user .msg-bubble{background:linear-gradient(135deg,#6d28d9,#0891b2);color:white;border-bottom-right-radius:4px;}
  .msg-time{font-size:0.62rem;color:#9ca3af;margin-top:3px;padding:0 4px;}
  .msg-typing{display:flex;align-items:center;gap:4px;padding:10px 13px;background:#f3f3ef;border-radius:14px;border-bottom-left-radius:4px;width:fit-content;}
  .msg-typing span{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:typingDot 1.2s infinite;}
  .msg-typing span:nth-child(2){animation-delay:0.2s;}
  .msg-typing span:nth-child(3){animation-delay:0.4s;}
  @keyframes typingDot{0%,80%,100%{transform:scale(0.7);opacity:0.5}40%{transform:scale(1);opacity:1}}
  .rex-quick{padding:0 14px 10px;display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;}
  .rex-chip{background:#f3f3ef;border:1px solid #e5e5e0;border-radius:100px;padding:5px 11px;
    font-size:0.72rem;font-weight:600;color:#0f0f1a;cursor:pointer;transition:all 0.2s;white-space:nowrap;font-family:'Inter',sans-serif;}
  .rex-chip:hover{background:rgba(109,40,217,0.08);border-color:rgba(109,40,217,0.25);color:#6d28d9;}
  .rex-input-row{padding:12px 14px;border-top:1px solid #e5e5e0;display:flex;gap:8px;flex-shrink:0;background:#fafaf8;}
  .rex-input{flex:1;background:white;border:1px solid #e5e5e0;border-radius:10px;padding:9px 13px;
    font-size:0.82rem;outline:none;font-family:'Inter',sans-serif;color:#0f0f1a;transition:border-color 0.2s;}
  .rex-input:focus{border-color:#6d28d9;}
  .rex-input::placeholder{color:#9ca3af;}
  .rex-send{width:36px;height:36px;background:linear-gradient(135deg,#6d28d9,#0891b2);
    border:none;border-radius:9px;display:flex;align-items:center;justify-content:center;
    cursor:pointer;transition:opacity 0.2s;flex-shrink:0;font-size:0.9rem;}
  .rex-send:hover{opacity:0.85;}
  .rex-powered{text-align:center;font-size:0.62rem;color:#9ca3af;padding:6px;font-family:'Inter',sans-serif;}
  `;

  const REPLIES = {
    'track': ['Your order <strong>#VS-48291</strong> is in transit 🚚<br/>Arriving <strong>Thursday, May 22</strong>. <a href="track.html" style="color:#6d28d9;font-weight:700">View live tracking →</a>', 'Zen AI is monitoring your shipment in real-time. You\'ll get an SMS when it\'s out for delivery!'],
    'return': ['No problem! Returns are fully automated on VibeStore. 😊<br/>For orders within 30 days, <strong>Rex AI</strong> will initiate a pickup within 24 hours — no questions asked.', 'Want me to start a return for order #VS-48291?'],
    'refund': ['Refunds are processed by <strong>Rex AI</strong> within 2-3 business days. 💚<br/>Once initiated, the amount goes back to your original payment method automatically.'],
    'shipping': ['We offer:<br/>• <strong>Standard</strong> — Free (3-5 days)<br/>• <strong>Express</strong> — ₹149 (Next day)<br/>• <strong>Same-day</strong> — ₹299 (Before 2PM)<br/><br/>🤖 <strong>Zen AI</strong> dispatches all orders within 2 hours!'],
    'discount': ['Use code <strong>VIBE20</strong> for 20% off your next order! 🎉<br/>Also check our Flash Sale on the <a href="store.html" style="color:#6d28d9;font-weight:700">store page</a> — AI-curated deals updated daily.'],
    'recommend': ['Based on your history, <strong>Atlas AI</strong> suggests:<br/>• ⌚ Smart Watch Ultra — $249<br/>• 🎙️ Studio Mic — $129<br/>• 🖱️ Ergonomic Mouse — $49<br/><br/>Want me to add any to your cart?'],
    'cancel': ['You can cancel orders not yet dispatched instantly. 🤖<br/>Since #VS-48291 is already in transit, you can <strong>return it free</strong> once it arrives. Want me to schedule a return pickup?'],
    'payment': ['We accept:<br/>💳 Credit/Debit Cards<br/>📱 UPI<br/>🏦 EMI (No Cost)<br/>💵 Cash on Delivery<br/><br/>All payments are SSL encrypted & PCI DSS compliant 🔒'],
    'hello': ['Hey there! 👋 I\'m <strong>Rex</strong>, your AI support agent.<br/>I\'m here 24/7 and can help with orders, returns, products, or anything else!'],
    'price': ['<strong>Luna AI</strong> monitors competitor prices 24/7 and automatically gives you the best deal. 💲<br/>If you find a lower price elsewhere within 24 hours of purchase, we\'ll match it!'],
    'help': ['I can help you with:<br/>• 📦 Track your order<br/>• ↩️ Returns & refunds<br/>• 💲 Prices & discounts<br/>• 🚚 Shipping info<br/>• 🛍️ Product recommendations<br/><br/>What do you need?'],
  };

  const DEFAULT_REPLIES = [
    'Great question! Let me check that for you... 🤖',
    'I\'m on it! As Rex AI, I can see your full order history and resolve this instantly.',
    'Got it! Our team at VibeStore uses AI agents for everything — so this will be resolved in seconds.',
    'I\'ve flagged this for immediate attention. Anything else I can help with? 😊',
  ];

  let defaultIdx = 0;
  let msgCount = 0;
  let isOpen = false;

  function getReply(text) {
    const t = text.toLowerCase();
    for (const [key, replies] of Object.entries(REPLIES)) {
      if (t.includes(key)) return replies[Math.floor(Math.random() * replies.length)];
    }
    return DEFAULT_REPLIES[defaultIdx++ % DEFAULT_REPLIES.length];
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMsg(html, type) {
    const msgs = document.getElementById('rex-msgs');
    const div = document.createElement('div');
    div.className = 'msg ' + type;
    div.innerHTML = `<div class="msg-bubble">${html}</div><div class="msg-time">${now()}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    msgCount++;
  }

  function showTyping() {
    const msgs = document.getElementById('rex-msgs');
    const div = document.createElement('div');
    div.id = 'rex-typing';
    div.className = 'msg bot';
    div.innerHTML = `<div class="msg-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById('rex-typing');
    if (t) t.remove();
  }

  function botReply(text) {
    showTyping();
    const delay = 800 + Math.random() * 600;
    setTimeout(() => {
      hideTyping();
      addMsg(getReply(text), 'bot');
    }, delay);
  }

  function sendMsg() {
    const input = document.getElementById('rex-input');
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    hideQuickReplies();
    botReply(text);
  }

  function hideQuickReplies() {
    const qr = document.getElementById('rex-quick');
    if (qr) qr.style.display = 'none';
  }

  function quickSend(text) {
    addMsg(text, 'user');
    hideQuickReplies();
    botReply(text);
  }

  function toggleChat() {
    isOpen = !isOpen;
    const win = document.getElementById('rex-window');
    const fab = document.getElementById('rex-fab');
    if (isOpen) {
      win.classList.add('open');
      fab.innerHTML = '<span style="font-size:1.3rem;color:white">✕</span>';
      document.getElementById('rex-badge').style.display = 'none';
      document.getElementById('rex-input').focus();
    } else {
      win.classList.remove('open');
      fab.innerHTML = '💬<div class="rex-badge" id="rex-badge" style="display:none">1</div>';
    }
  }

  function init() {
    // inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // inject HTML
    const html = `
      <button id="rex-fab" onclick="rexToggle()" title="Chat with Rex AI">
        💬<div class="rex-badge" id="rex-badge" style="display:none">1</div>
      </button>
      <div id="rex-window">
        <div class="rex-hdr">
          <div class="rex-avatar">🤖</div>
          <div class="rex-info">
            <div class="rex-name">Rex AI Support</div>
            <div class="rex-status">Online — responds in seconds</div>
          </div>
          <div class="rex-close" onclick="rexToggle()">✕</div>
        </div>
        <div class="rex-msgs" id="rex-msgs"></div>
        <div class="rex-quick" id="rex-quick">
          <div class="rex-chip" onclick="rexQuick('Track my order')">📦 Track order</div>
          <div class="rex-chip" onclick="rexQuick('How do returns work?')">↩️ Returns</div>
          <div class="rex-chip" onclick="rexQuick('Do you have any discount codes?')">🎟️ Discounts</div>
          <div class="rex-chip" onclick="rexQuick('Recommend products for me')">🎯 Recommend</div>
        </div>
        <div class="rex-input-row">
          <input class="rex-input" id="rex-input" placeholder="Ask Rex AI anything..." onkeydown="if(event.key==='Enter')rexSend()"/>
          <button class="rex-send" onclick="rexSend()">➤</button>
        </div>
        <div class="rex-powered">Powered by <strong>VibeStore AI</strong> · Rex Agent v2.1</div>
      </div>`;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    // welcome message after short delay
    setTimeout(() => {
      addMsg('Hi! 👋 I\'m <strong>Rex AI</strong>, your 24/7 support agent.<br/>How can I help you today?', 'bot');
      // show badge after 3s if not opened
      setTimeout(() => {
        if (!isOpen) {
          const badge = document.getElementById('rex-badge');
          if (badge) { badge.style.display = 'flex'; badge.textContent = '1'; }
        }
      }, 3000);
    }, 1200);

    // expose globals
    window.rexToggle = toggleChat;
    window.rexSend = sendMsg;
    window.rexQuick = quickSend;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
