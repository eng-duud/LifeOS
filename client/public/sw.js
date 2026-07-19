// ═══════════════════════════════════════════════════════════════
// Life OS — Service Worker v2.0
// ═══════════════════════════════════════════════════════════════

const CACHE_VERSION = 'life-os-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMMUTABLE_CACHE = `${CACHE_VERSION}-immutable`;

// ── Pre-cache list ────────────────────────────────────────────────────────────
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icon-48.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-167.png',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon-152.png',
  '/apple-touch-icon-167.png',
  '/apple-touch-icon-180.png',
  '/icon-monochrome.svg',
  '/icon-maskable.svg',
  '/icon.svg',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith('life-os-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== ASSET_CACHE && key !== API_CACHE && key !== IMMUTABLE_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// ── Helper: should cache response? ────────────────────────────────────────────
function isCacheable(response) {
  return response && response.status === 200 && response.type === 'basic';
}

// ── Helper: add to cache with size limit ──────────────────────────────────────
async function addToCache(cacheName, request, response, maxEntries = 50) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    // Delete oldest entry
    await cache.delete(keys[0]);
  }
  cache.put(request, response.clone());
}

// ── Strategy: Cache First (for static assets with hash in URL) ────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(IMMUTABLE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match('/');
  }
}

// ── Strategy: Network First (for HTML/navigation) ─────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline fallback
    return caches.match('/');
  }
}

// ── Strategy: Stale While Revalidate (for assets) ─────────────────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (isCacheable(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ── Strategy: Network Only (for API calls) ────────────────────────────────────
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // For GET API calls, try cache as fallback
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    // For mutations, return a structured error
    return new Response(
      JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت', code: 'OFFLINE' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET
  if (request.method !== 'GET') {
    // For non-GET, try network, don't cache
    event.respondWith(fetch(request).catch(() => new Response(null, { status: 408 })));
    return;
  }

  // Route by URL pattern
  const path = url.pathname;

  // API calls: network only (with cache fallback for GET)
  if (path.startsWith('/api/') || path.includes('/trpc/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Immutable assets (hashed files from Vite build)
  if (path.match(/\/assets\/.*\.[a-f0-9]{8,}\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Static assets (icons, images, fonts)
  if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Manifest
  if (path === '/manifest.json') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation / HTML: network first with offline fallback
  if (request.mode === 'navigate' || path.endsWith('.html') || path === '/') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (JS, CSS, etc.): stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }
  if (event.tag === 'sync-habits') {
    event.waitUntil(syncPendingHabits());
  }
});

async function syncPendingTasks() {
  try {
    const cache = await caches.open('pending-tasks');
    const keys = await cache.keys();
    for (const request of keys) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (e) {
        console.warn('Sync failed for:', request.url);
      }
    }
  } catch (error) {
    console.error('Task sync failed:', error);
  }
}

async function syncPendingHabits() {
  try {
    const response = await fetch('/api/trpc/habits.sync');
    if (response.ok) {
      const cache = await caches.open('pending-habits');
      const keys = await cache.keys();
      for (const key of keys) {
        await cache.delete(key);
      }
    }
  } catch (error) {
    console.error('Habit sync failed:', error);
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Life OS', body: 'تذكير جديد', tag: 'notification' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    image: data.image || '/icon-512.png',
    vibrate: [100, 50, 100, 50, 100],
    tag: data.tag || 'default',
    data: { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false,
    silent: false,
    actions: data.actions || [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'تجاهل' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ── Periodic Background Sync (daily check-in) ─────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-review-reminder') {
    event.waitUntil(
      self.registration.showNotification('Life OS', {
        body: 'حان وقت المراجعة اليومية — كيف كان يومك؟',
        icon: '/icon-192.png',
        badge: '/icon-96.png',
        tag: 'daily-review',
      })
    );
  }
});
