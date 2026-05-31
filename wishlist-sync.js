// wishlist-sync.js — Syncs wishlist across devices via Firestore

const WISHLIST_COL = 'vs_wishlists';

async function vsGetWishlist() {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const local = JSON.parse(localStorage.getItem('vs_wishlist') || '[]');
  if (!auth || !vsIsFirebaseReady || !vsIsFirebaseReady()) return local;
  try {
    const doc = await vsGetDb().collection(WISHLIST_COL).doc(auth.email).get();
    if (doc.exists) {
      const items = doc.data().items || [];
      localStorage.setItem('vs_wishlist', JSON.stringify(items));
      return items;
    }
    return local;
  } catch(e) { return local; }
}

async function vsAddToWishlist(product) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const wishlist = await vsGetWishlist();
  if (wishlist.find(i => i.id === product.id)) return { success: false, error: 'Already in wishlist' };
  const item = { id: product.id, name: product.name, price: product.price, emoji: product.emoji, sellerName: product.sellerName, addedAt: Date.now() };
  wishlist.push(item);
  localStorage.setItem('vs_wishlist', JSON.stringify(wishlist));
  if (auth && vsIsFirebaseReady && vsIsFirebaseReady()) {
    await vsGetDb().collection(WISHLIST_COL).doc(auth.email).set({ items: wishlist, updatedAt: Date.now() }, { merge: true });
  }
  return { success: true };
}

async function vsRemoveFromWishlist(productId) {
  const auth = typeof vsGetAuth === 'function' ? vsGetAuth() : null;
  const wishlist = (await vsGetWishlist()).filter(i => i.id !== productId);
  localStorage.setItem('vs_wishlist', JSON.stringify(wishlist));
  if (auth && vsIsFirebaseReady && vsIsFirebaseReady()) {
    await vsGetDb().collection(WISHLIST_COL).doc(auth.email).set({ items: wishlist, updatedAt: Date.now() });
  }
  return { success: true };
}

async function vsIsWishlisted(productId) {
  const wishlist = await vsGetWishlist();
  return wishlist.some(i => i.id === productId);
}

console.log('VibeStore Wishlist Sync loaded ✅');
