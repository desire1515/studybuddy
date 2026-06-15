// StudyBuddy default service worker for caching and offline support
// This file exists to satisfy /sw.js registration for web and avoid missing file errors.

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We keep this minimal. Do not intercept requests in Capacitor.
  // Let Vite or the browser handle requests normally.
});
