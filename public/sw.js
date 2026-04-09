// Custom Service Worker – Codex Petri
// Workbox will extend this via vite-plugin-pwa injection

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
