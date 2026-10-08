// Service Worker for notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Andrew TTS', body: 'Run completed' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png'
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.postMessage({ type: 'FIRST_INSTALL' });
  self.clients.claim();
});
