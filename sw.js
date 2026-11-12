// Nomes novos de cache fazem o "activate" apagar os antigos (que guardavam React/Babel do CDN).
const CACHE = 'hoje-da-v3';
const FONTS_CACHE = 'hoje-da-fonts-v1';

const PRECACHE = [
  '/',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Lista gerada no build pelo vite-plugin-pwa: index.html, JS/CSS com hash, manifest e ícones.
const WB_MANIFEST = self.__WB_MANIFEST || [];

// cache.addAll recusa a lista INTEIRA se um endereço aparece duas vezes ("/icons/x.png" e
// "icons/x.png" são o mesmo arquivo) — e aí o service worker nunca instala. Por isso a lista
// é deduplicada pelo endereço completo.
const URLS_PRECACHE = [...new Set(
  [...PRECACHE, ...WB_MANIFEST.map(e => e.url)].map(u => new URL(u, self.location.href).href)
)];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(URLS_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE && k !== FONTS_CACHE).map(k => caches.delete(k))
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

  // Google Fonts: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
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
