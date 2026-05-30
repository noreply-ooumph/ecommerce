// vs_store.js — VibeStore Shared Marketplace Data Layer
// Used by all 3 portals. Products flow: Seller lists → Admin approves → Buyer sees.

const VS_PRODUCTS_KEY = 'vs_marketplace_products';
const VS_ORDERS_KEY   = 'vs_marketplace_orders';
const VS_SELLERS_KEY  = 'vs_registered_sellers';

/* ─── PRODUCTS ─────────────────────────────────────────────────────────── */

function vsGetProducts(filter) {
  // filter: 'all' | 'active' | 'pending' | 'rejected' | 'featured' | sellerId
  const all = JSON.parse(localStorage.getItem(VS_PRODUCTS_KEY) || '[]');
  if (!filter || filter === 'all') return all;
  if (filter === 'active')   return all.filter(p => p.status === 'active' || p.status === 'featured');
  if (filter === 'pending')  return all.filter(p => p.status === 'pending');
  if (filter === 'rejected') return all.filter(p => p.status === 'rejected');
  if (filter === 'featured') return all.filter(p => p.status === 'featured');
  // filter by sellerId
  return all.filter(p => p.sellerId === filter);
}

function vsAddProduct(productData) {
  // Called by seller when they list a new product
  const products = vsGetProducts('all');
  const product = {
    id: 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    sellerId:    productData.sellerId    || '',
    sellerName:  productData.sellerName  || 'Unknown Seller',
    sellerEmail: productData.sellerEmail || '',
    name:        productData.name        || 'Unnamed Product',
    category:    productData.category    || 'General',
    price:       Number(productData.price)  || 0,
    mrp:         Number(productData.mrp)    || 0,
    description: productData.description || '',
    emoji:       productData.emoji       || '📦',
    images:      productData.images      || [],
    stock:       Number(productData.stock)  || 0,
    sku:         productData.sku         || '',
    weight:      productData.weight      || '',
    tags:        productData.tags        || [],
    status:      'pending',   // always starts pending — admin must approve
    listedAt:    Date.now(),
    approvedAt:  null,
    approvedBy:  null,
    rejectedReason: null,
    featured:    false,
    views:       0,
    orders:      0,
    rating:      0,
    reviews:     []
  };
  products.push(product);
  localStorage.setItem(VS_PRODUCTS_KEY, JSON.stringify(products));
  return product;
}

function vsUpdateProductStatus(productId, status, adminEmail, reason) {
  // Called by admin: status = 'active' | 'rejected' | 'featured'
  const products = vsGetProducts('all');
  const idx = products.findIndex(p => p.id === productId);
  if (idx === -1) return false;
  products[idx].status = status;
  products[idx].approvedAt = Date.now();
  products[idx].approvedBy = adminEmail || 'admin';
  if (reason) products[idx].rejectedReason = reason;
  if (status === 'featured') products[idx].featured = true;
  localStorage.setItem(VS_PRODUCTS_KEY, JSON.stringify(products));
  return true;
}

function vsDeleteProduct(productId) {
  const products = vsGetProducts('all').filter(p => p.id !== productId);
  localStorage.setItem(VS_PRODUCTS_KEY, JSON.stringify(products));
}

function vsGetProductById(productId) {
  return vsGetProducts('all').find(p => p.id === productId) || null;
}

function vsIncrementProductView(productId) {
  const products = vsGetProducts('all');
  const idx = products.findIndex(p => p.id === productId);
  if (idx !== -1) { products[idx].views++; localStorage.setItem(VS_PRODUCTS_KEY, JSON.stringify(products)); }
}

/* ─── ORDERS ────────────────────────────────────────────────────────────── */

function vsGetOrders(filter) {
  // filter: 'all' | sellerId | buyerEmail
  const all = JSON.parse(localStorage.getItem(VS_ORDERS_KEY) || '[]');
  if (!filter || filter === 'all') return all;
  return all.filter(o => o.sellerId === filter || o.buyerEmail === filter);
}

function vsPlaceOrder(orderData) {
  // Called by buyer at checkout
  const orders = vsGetOrders('all');
  const order = {
    id: 'VS-' + (5000 + orders.length + 1),
    buyerEmail:  orderData.buyerEmail  || '',
    buyerName:   orderData.buyerName   || '',
    sellerId:    orderData.sellerId    || '',
    sellerName:  orderData.sellerName  || '',
    productId:   orderData.productId   || '',
    productName: orderData.productName || '',
    productEmoji:orderData.productEmoji|| '📦',
    qty:         orderData.qty         || 1,
    amount:      orderData.amount      || 0,
    address:     orderData.address     || '',
    status:      'pending',
    paymentStatus: 'paid',
    placedAt:    Date.now(),
    shippedAt:   null,
    deliveredAt: null,
    aiAction:    'Nova processing'
  };
  orders.push(order);
  localStorage.setItem(VS_ORDERS_KEY, JSON.stringify(orders));
  return order;
}

function vsUpdateOrderStatus(orderId, status) {
  const orders = vsGetOrders('all');
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    orders[idx].status = status;
    if (status === 'shipped')   orders[idx].shippedAt   = Date.now();
    if (status === 'delivered') orders[idx].deliveredAt = Date.now();
    localStorage.setItem(VS_ORDERS_KEY, JSON.stringify(orders));
  }
}

/* ─── SELLERS REGISTRY ──────────────────────────────────────────────────── */

function vsGetSellers() {
  return JSON.parse(localStorage.getItem(VS_SELLERS_KEY) || '[]');
}

function vsRegisterSeller(sellerData) {
  const sellers = vsGetSellers();
  const existing = sellers.findIndex(s => s.email === sellerData.email);
  const seller = {
    email:      sellerData.email      || '',
    name:       sellerData.name       || '',
    storeName:  sellerData.storeName  || '',
    category:   sellerData.category   || '',
    logo:       sellerData.logo       || '🏪',
    status:     'pending_verification',
    joinedAt:   Date.now(),
    totalProducts: 0,
    totalOrders:   0,
    gmv:           0,
    rating:        0
  };
  if (existing === -1) sellers.push(seller);
  else sellers[existing] = { ...sellers[existing], ...seller };
  localStorage.setItem(VS_SELLERS_KEY, JSON.stringify(sellers));
  return seller;
}

/* ─── SEED DEMO DATA ────────────────────────────────────────────────────── */
// Seed some demo products if none exist (so buyer portal isn't empty on first visit)
function vsSeedDemoData() {
  if (vsGetProducts('all').length > 0) return; // already has data
  const demos = [
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Sony WH-1000XM5 Wireless Headphones', category:'Electronics', price:2499, mrp:4999, emoji:'🎧', stock:23, description:'Industry-leading noise cancelling headphones with 30h battery life.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Mechanical Keyboard RGB', category:'Electronics', price:4199, mrp:6999, emoji:'⌨️', stock:7, description:'Full mechanical keyboard with RGB backlight and tactile switches.', status:'active' },
    { sellerId:'fashion@first.com', sellerName:'FashionFirst India', sellerEmail:'fashion@first.com', name:'Premium Cotton Kurta Set', category:'Fashion', price:1299, mrp:2499, emoji:'👗', stock:45, description:'Pure cotton kurta with matching dupatta. Available in 6 colours.', status:'active' },
    { sellerId:'fashion@first.com', sellerName:'FashionFirst India', sellerEmail:'fashion@first.com', name:'Leather Wallet Slim', category:'Fashion', price:699, mrp:1499, emoji:'👜', stock:120, description:'Genuine leather slim wallet with 8 card slots.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Logitech MX Master 3 Mouse', category:'Electronics', price:6999, mrp:9999, emoji:'🖱️', stock:34, description:'Advanced wireless mouse with ultra-fast MagSpeed scrolling.', status:'featured' },
    { sellerId:'green@grove.com', sellerName:'GreenGrove Organics', sellerEmail:'green@grove.com', name:'Organic Green Tea 200g', category:'Grocery', price:349, mrp:499, emoji:'🍵', stock:200, description:'Premium Darjeeling organic green tea, hand-picked.', status:'active' },
    { sellerId:'green@grove.com', sellerName:'GreenGrove Organics', sellerEmail:'green@grove.com', name:'Cold Pressed Coconut Oil 1L', category:'Grocery', price:599, mrp:899, emoji:'🥥', stock:88, description:'100% cold-pressed virgin coconut oil, no chemicals added.', status:'active' },
    { sellerId:'seller@techhub.com', sellerName:'TechHub Electronics', sellerEmail:'seller@techhub.com', name:'Anker 26800mAh Power Bank', category:'Electronics', price:2799, mrp:4499, emoji:'🔋', stock:15, description:'26800mAh high-capacity power bank with 65W fast charging.', status:'active' },
  ];
  // Mark as seeded with proper IDs
  const products = demos.map((d, i) => ({
    ...d,
    id: 'prod_demo_' + i,
    listedAt: Date.now() - (i * 86400000),
    approvedAt: Date.now() - (i * 86400000),
    approvedBy: 'admin@vibestore.com',
    views: Math.floor(Math.random() * 500) + 50,
    orders: Math.floor(Math.random() * 50) + 5,
    rating: (3.8 + Math.random() * 1.2).toFixed(1),
    reviews: [],
    featured: d.status === 'featured',
    tags: [],
    sku: '',
    weight: '',
    images: [],
    rejectedReason: null
  }));
  localStorage.setItem(VS_PRODUCTS_KEY, JSON.stringify(products));
}

// Auto-seed on script load
vsSeedDemoData();
