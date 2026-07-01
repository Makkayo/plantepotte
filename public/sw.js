// Minimal service worker — gjør appen installerbar (Android krever en SW med
// fetch-handler) og gir en offline-fallback på app-skallet. Vi cacher IKKE
// Vites hashede assets aggressivt (de hentes fra nett), så ingen stale-problemer.
const CACHE = 'plantepotte-shell-v2';
const SHELL = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Navigasjoner: nett-først MED no-store, fall tilbake til cachet skall når
  // man er offline. no-store er bevisst — uten den kan nettleserens EGEN
  // HTTP-cache (ikke SW-cachen) servere en gammel index.html (med referanse
  // til en utdatert hashet JS-bunt) i lang tid etter en deploy, selv om denne
  // fetch()-en «går til nettet». Oppdaget under manuell verifisering 1. juli.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match('/')));
    return;
  }
  // Øvrige GET: nett, ellers cache.
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
