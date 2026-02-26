const CACHE_NAME = 'mon-budget-v2';
const FICHIERS_A_CACHER = [
  './',
  './index.html',
  './main.js',
  './manifest.json'
];

// Installation : mise en cache des fichiers
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FICHIERS_A_CACHER);
    })
  );
  self.skipWaiting();
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(noms => {
      return Promise.all(
        noms.filter(nom => nom !== CACHE_NAME)
            .map(nom => caches.delete(nom))
      );
    })
  );
  self.clients.claim();
});

// Interception des requetes : reponse depuis le cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(reponse => {
      return reponse || fetch(event.request);
    }).catch(() => {
      return caches.match('./index.html');
    })
  );
});
