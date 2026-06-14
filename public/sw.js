// RedFairy — Service Worker mínimo (PWA fase 1: tornar o app instalável).
// Estratégia NETWORK-FIRST sem precache agressivo: sempre busca a versão fresca
// da rede (importante porque a Vercel publica builds novos com frequência) e só
// cai no cache se estiver OFFLINE. Assim a "fada" instalada nunca serve build velho.

const CACHE = 'redfairy-runtime-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Limpa caches antigos de versões anteriores do SW.
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;  // só GET; deixa POST (Supabase) passar direto

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Guarda uma cópia para fallback offline (best-effort).
      if (fresh && fresh.status === 200 && req.url.startsWith(self.location.origin)) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      // Offline: tenta o cache; se for navegação, devolve a home cacheada.
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const home = await caches.match('/');
        if (home) return home;
      }
      throw e;
    }
  })());
});
