// Keystone Treasury OS — minimal service worker
// Enables PWA install prompt; caches nothing (API responses should stay fresh)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
