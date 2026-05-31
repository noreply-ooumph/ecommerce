// flash-sale-scheduler.js — Schedule future flash sales

const FLASH_COL = 'vs_flash_sales';

async function vsScheduleFlashSale(saleData) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const sale = {
    sellerId: auth?.email || '',
    sellerName: auth?.storeName || auth?.name || '',
    productId: saleData.productId,
    productName: saleData.productName,
    originalPrice: saleData.originalPrice,
    salePrice: saleData.salePrice,
    discountPct: Math.round((1 - saleData.salePrice/saleData.originalPrice)*100),
    startAt: saleData.startAt,
    endAt: saleData.endAt,
    stockLimit: saleData.stockLimit || null,
    status: saleData.startAt > Date.now() ? 'scheduled' : 'active',
    createdAt: Date.now(),
    claimed: 0
  };
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    const ref = await vsGetDb().collection(FLASH_COL).add(sale);
    return { success: true, id: ref.id, sale };
  }
  const local = JSON.parse(localStorage.getItem('vs_flash_sales') || '[]');
  sale.id = 'flash_' + Date.now();
  local.push(sale);
  localStorage.setItem('vs_flash_sales', JSON.stringify(local));
  return { success: true, id: sale.id, sale };
}

async function vsGetActiveFlashSales() {
  const now = Date.now();
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    const snap = await vsGetDb().collection(FLASH_COL)
      .where('status', '==', 'active')
      .where('endAt', '>', now)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return JSON.parse(localStorage.getItem('vs_flash_sales') || '[]')
    .filter(s => s.status === 'active' && s.endAt > now);
}

async function vsGetSellerFlashSales(sellerId) {
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    const snap = await vsGetDb().collection(FLASH_COL)
      .where('sellerId', '==', sellerId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return JSON.parse(localStorage.getItem('vs_flash_sales') || '[]')
    .filter(s => s.sellerId === sellerId);
}

// Auto-activate scheduled sales
async function vsCheckFlashSaleSchedule() {
  const now = Date.now();
  if (typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady()) {
    const snap = await vsGetDb().collection(FLASH_COL)
      .where('status', '==', 'scheduled')
      .where('startAt', '<=', now)
      .get();
    snap.docs.forEach(doc => {
      const data = doc.data();
      const newStatus = data.endAt > now ? 'active' : 'expired';
      vsGetDb().collection(FLASH_COL).doc(doc.id).update({ status: newStatus });
    });
  }
}

// Check every minute
setInterval(vsCheckFlashSaleSchedule, 60000);
vsCheckFlashSaleSchedule();

console.log('VibeStore Flash Sale Scheduler loaded ✅');
