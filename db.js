// db.js — VibeStore Universal Database Layer
// Uses Firestore when Firebase is configured, localStorage otherwise.
// All functions return Promises so callers can await them consistently.

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────
const COL_PRODUCTS = 'vs_products';
const COL_ORDERS   = 'vs_orders';
const COL_SELLERS  = 'vs_sellers';
const COL_USERS    = 'vs_users';

// ─── HELPER ───────────────────────────────────────────────────────────────────
function useFirestore() {
  return typeof vsIsFirebaseReady === 'function' && vsIsFirebaseReady() && typeof vsGetDb === 'function' && vsGetDb();
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ════════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════════════════

async function dbGetProducts(filter) {
  if (useFirestore()) {
    const db = vsGetDb();
    let query = db.collection(COL_PRODUCTS);
    if (filter && filter !== 'all') {
      if (['active','pending','rejected','featured'].includes(filter)) {
        query = query.where('status', '==', filter);
      } else {
        // filter by sellerId
        query = query.where('sellerId', '==', filter);
      }
    }
    const snap = await query.orderBy('listedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  // fallback
  return typeof vsGetProducts === 'function' ? vsGetProducts(filter) : [];
}

async function dbAddProduct(data) {
  const product = {
    sellerId:       data.sellerId    || '',
    sellerName:     data.sellerName  || 'Unknown Seller',
    sellerEmail:    data.sellerEmail || '',
    name:           data.name        || 'Unnamed Product',
    category:       data.category    || 'General',
    price:          Number(data.price)   || 0,
    mrp:            Number(data.mrp)     || 0,
    description:    data.description    || '',
    emoji:          data.emoji          || '📦',
    stock:          Number(data.stock)  || 0,
    sku:            data.sku            || '',
    weight:         data.weight         || '',
    tags:           data.tags           || [],
    status:         'pending',
    listedAt:       Date.now(),
    approvedAt:     null,
    approvedBy:     null,
    rejectedReason: null,
    featured:       false,
    views:          0,
    orders:         0,
    rating:         0,
    reviews:        []
  };

  if (useFirestore()) {
    const db = vsGetDb();
    const ref = await db.collection(COL_PRODUCTS).add(product);
    return { id: ref.id, ...product };
  }
  return typeof vsAddProduct === 'function' ? vsAddProduct(data) : product;
}

async function dbUpdateProductStatus(productId, status, adminEmail, reason) {
  const update = {
    status,
    approvedAt:  Date.now(),
    approvedBy:  adminEmail || 'admin',
    featured:    status === 'featured',
    ...(reason ? { rejectedReason: reason } : {})
  };
  if (useFirestore()) {
    await vsGetDb().collection(COL_PRODUCTS).doc(productId).update(update);
    return true;
  }
  return typeof vsUpdateProductStatus === 'function'
    ? vsUpdateProductStatus(productId, status, adminEmail, reason)
    : false;
}

async function dbDeleteProduct(productId) {
  if (useFirestore()) {
    await vsGetDb().collection(COL_PRODUCTS).doc(productId).delete();
    return true;
  }
  if (typeof vsDeleteProduct === 'function') vsDeleteProduct(productId);
  return true;
}

async function dbGetProductById(productId) {
  if (useFirestore()) {
    const doc = await vsGetDb().collection(COL_PRODUCTS).doc(productId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }
  return typeof vsGetProductById === 'function' ? vsGetProductById(productId) : null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════════════════

async function dbGetOrders(filter) {
  if (useFirestore()) {
    const db = vsGetDb();
    let query = db.collection(COL_ORDERS);
    if (filter && filter !== 'all') {
      // filter by sellerId or buyerEmail
      const isSeller = filter.includes('@') && !filter.includes('gmail') && !filter.includes('yahoo') && !filter.includes('hotmail');
      query = isSeller
        ? query.where('sellerId', '==', filter)
        : query.where('buyerEmail', '==', filter);
    }
    const snap = await query.orderBy('placedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return typeof vsGetOrders === 'function' ? vsGetOrders(filter) : [];
}

async function dbPlaceOrder(orderData) {
  const order = {
    buyerEmail:    orderData.buyerEmail   || '',
    buyerName:     orderData.buyerName    || '',
    sellerId:      orderData.sellerId     || '',
    sellerName:    orderData.sellerName   || '',
    productId:     orderData.productId    || '',
    productName:   orderData.productName  || '',
    productEmoji:  orderData.productEmoji || '📦',
    qty:           orderData.qty          || 1,
    amount:        orderData.amount       || 0,
    address:       orderData.address      || '',
    status:        'pending',
    paymentStatus: 'paid',
    placedAt:      Date.now(),
    shippedAt:     null,
    deliveredAt:   null,
    aiAction:      'Nova processing'
  };

  if (useFirestore()) {
    const ref = await vsGetDb().collection(COL_ORDERS).add(order);
    return { id: ref.id, ...order };
  }
  return typeof vsPlaceOrder === 'function' ? vsPlaceOrder(orderData) : order;
}

async function dbUpdateOrderStatus(orderId, status) {
  const update = {
    status,
    ...(status === 'shipped'   ? { shippedAt:   Date.now() } : {}),
    ...(status === 'delivered' ? { deliveredAt: Date.now() } : {})
  };
  if (useFirestore()) {
    await vsGetDb().collection(COL_ORDERS).doc(orderId).update(update);
    return true;
  }
  if (typeof vsUpdateOrderStatus === 'function') vsUpdateOrderStatus(orderId, status);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════════
// SELLERS
// ════════════════════════════════════════════════════════════════════════════════

async function dbRegisterSeller(data) {
  const seller = {
    email:         data.email      || '',
    name:          data.name       || '',
    storeName:     data.storeName  || '',
    category:      data.category   || '',
    logo:          data.logo       || '🏪',
    status:        'pending_verification',
    joinedAt:      Date.now(),
    totalProducts: 0,
    totalOrders:   0,
    gmv:           0,
    rating:        0
  };
  if (useFirestore()) {
    await vsGetDb().collection(COL_SELLERS).doc(data.email).set(seller, { merge: true });
    return seller;
  }
  return typeof vsRegisterSeller === 'function' ? vsRegisterSeller(data) : seller;
}

async function dbGetSellers() {
  if (useFirestore()) {
    const snap = await vsGetDb().collection(COL_SELLERS).orderBy('joinedAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return typeof vsGetSellers === 'function' ? vsGetSellers() : [];
}

// ════════════════════════════════════════════════════════════════════════════════
// REALTIME LISTENERS
// ════════════════════════════════════════════════════════════════════════════════

function dbListenProducts(filter, callback) {
  // Returns an unsubscribe function. Use for live-updating pages.
  if (!useFirestore()) {
    // No realtime without Firestore — just call callback once with localStorage data
    callback(typeof vsGetProducts === 'function' ? vsGetProducts(filter) : []);
    return () => {};
  }
  const db = vsGetDb();
  let query = db.collection(COL_PRODUCTS);
  if (filter && filter !== 'all') {
    if (['active','pending','rejected','featured'].includes(filter)) {
      query = query.where('status', '==', filter);
    } else {
      query = query.where('sellerId', '==', filter);
    }
  }
  return query.orderBy('listedAt', 'desc').onSnapshot(snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

function dbListenOrders(filter, callback) {
  if (!useFirestore()) {
    callback(typeof vsGetOrders === 'function' ? vsGetOrders(filter) : []);
    return () => {};
  }
  const db = vsGetDb();
  let query = db.collection(COL_ORDERS);
  if (filter && filter !== 'all') {
    query = query.where('sellerId', '==', filter);
  }
  return query.orderBy('placedAt', 'desc').onSnapshot(snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// SEED DEMO DATA (only if Firestore is empty)
// ════════════════════════════════════════════════════════════════════════════════

async function dbSeedDemo() {
  if (!useFirestore()) {
    if (typeof vsSeedDemoData === 'function') vsSeedDemoData();
    return;
  }
  const db = vsGetDb();
  const existing = await db.collection(COL_PRODUCTS).limit(1).get();
  if (!existing.empty) return; // already seeded

  const demos = [
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Sony WH-1000XM5 Headphones', category:'Electronics', price:2499, mrp:4999, emoji:'🎧', stock:23, description:'Industry-leading noise cancelling headphones.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Mechanical Keyboard RGB', category:'Electronics', price:4199, mrp:6999, emoji:'⌨️', stock:7, description:'Full mechanical keyboard with RGB backlight.', status:'active' },
    { sellerId:'fashion@first.com', sellerName:'FashionFirst India', sellerEmail:'fashion@first.com', name:'Premium Cotton Kurta Set', category:'Fashion', price:1299, mrp:2499, emoji:'👗', stock:45, description:'Pure cotton kurta with matching dupatta.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Logitech MX Master 3 Mouse', category:'Electronics', price:6999, mrp:9999, emoji:'🖱️', stock:34, description:'Advanced wireless mouse.', status:'featured', featured:true },
    { sellerId:'green@grove.com', sellerName:'GreenGrove Organics', sellerEmail:'green@grove.com', name:'Organic Green Tea 200g', category:'Grocery', price:349, mrp:499, emoji:'🍵', stock:200, description:'Premium Darjeeling organic green tea.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Anker 26800mAh Power Bank', category:'Electronics', price:2799, mrp:4499, emoji:'🔋', stock:15, description:'26800mAh with 65W fast charging.', status:'active' },
    { sellerId:'fashion@first.com', sellerName:'FashionFirst India', sellerEmail:'fashion@first.com', name:'Leather Wallet Slim', category:'Fashion', price:699, mrp:1499, emoji:'👜', stock:120, description:'Genuine leather slim wallet.', status:'active' },
    { sellerId:'green@grove.com', sellerName:'GreenGrove Organics', sellerEmail:'green@grove.com', name:'Cold Pressed Coconut Oil 1L', category:'Grocery', price:599, mrp:899, emoji:'🥥', stock:88, description:'100% cold-pressed virgin coconut oil.', status:'active' },
  ];

  const batch = db.batch();
  demos.forEach((d, i) => {
    const ref = db.collection(COL_PRODUCTS).doc('demo_' + i);
    batch.set(ref, {
      ...d,
      photoUrl:       typeof vsGetProductPhoto === 'function'
                        ? vsGetProductPhoto(d.name, d.category, '400x400')
                        : null,
      featured:       d.featured || false,
      tags:           [],
      sku:            '',
      weight:         '',
      images:         [],
      rejectedReason: null,
      listedAt:       Date.now() - i * 86400000,
      approvedAt:     Date.now() - i * 86400000,
      approvedBy:     'admin@vibestore.com',
      views:          Math.floor(Math.random() * 500) + 50,
      orders:         Math.floor(Math.random() * 50) + 5,
      rating:         parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
      reviews:        []
    });
  });
  await batch.commit();
  console.log('VibeStore: Demo data seeded to Firestore ✅');
}
