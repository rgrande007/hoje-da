const CACHE = 'hoje-da-v2';
const CDN_CACHE = 'hoje-da-cdn-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/android-frame.jsx',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const CDN_URLS = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Notificações locais agendadas pelo app principal
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title = 'Hoje Dá', body = '', icon = '/icons/icon-192.png' } = e.data;
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      tag: 'daily-reminder',
      vibrate: [200, 100, 200],
    });
  }
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // CDN resources: cache-first (serve sem rede quando possível)
  if (CDN_URLS.includes(url.href)) {
    e.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        })
      )
    );
    return;
  }

  // Google Fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        })
      )
    );
    return;
  }

  // Não intercepta outras requisições cross-origin
  if (url.origin !== location.origin) return;

  // Same-origin: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
        return cached || network;
      })
    )
  );
});
