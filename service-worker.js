// service-worker.js — VibeStore PWA Service Worker
// Caches static assets for offline access
// Handles push notifications for abandoned cart, deals, orders

const CACHE_NAME = 'vibestore-v1';
const STATIC_CACHE = 'vibestore-static-v1';

// Pages to cache for offline
const OFFLINE_PAGES = [
  '/ecommerce/',
  '/ecommerce/index.html',
  '/ecommerce/mystore.html',
  '/ecommerce/buyer-login.html',
  '/ecommerce/seller-login.html',
  '/ecommerce/admin-login.html',
  '/ecommerce/cart.html',
  '/ecommerce/product.html',
  '/ecommerce/collections.html',
  '/ecommerce/sale.html',
  '/ecommerce/auth.js',
  '/ecommerce/vs_store.js',
  '/ecommerce/db.js',
  '/ecommerce/firebase-config.js',
  '/ecommerce/pricing-engine.js',
  '/ecommerce/tracker.js',
  '/ecommerce/recommendations.js',
  '/ecommerce/ab-test.js',
  '/ecommerce/commission-engine.js'
];

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(OFFLINE_PAGES).catch(err => {
        console.warn('SW: Some assets failed to cache', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip non-GET and Firebase/external requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore') || event.request.url.includes('firebase') || event.request.url.includes('fonts.gstatic')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful HTML/JS/CSS responses
        if (response.ok && (event.request.url.endsWith('.html') || event.request.url.endsWith('.js') || event.request.url.endsWith('.css'))) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.url.endsWith('.html')) {
          return caches.match('/ecommerce/mystore.html');
        }
      });
    })
  );
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'You have a new notification from VibeStore',
    icon: data.icon || '/ecommerce/icon-192.png',
    badge: '/ecommerce/icon-192.png',
    tag: data.tag || 'vibestore',
    data: { url: data.url || '/ecommerce/mystore.html' },
    actions: data.actions || [
      { action: 'view', title: 'View →' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  };
  event.waitUntil(self.registration.showNotification(data.title || '⚡ VibeStore', options));
});

// Notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/ecommerce/mystore.html';
  event.waitUntil(clients.openWindow(url));
});

// Background sync for offline cart actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCartToServer());
  }
});

async function syncCartToServer() {
  const pendingCart = await localforage?.getItem?.('pending_cart_sync');
  if (pendingCart) {
    console.log('SW: Syncing pending cart actions');
  }
}
