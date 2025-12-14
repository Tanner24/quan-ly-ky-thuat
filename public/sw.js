self.addEventListener('install', (event) => {
    // Skip waiting to ensure the new service worker takes over immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim clients to start controlling them immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Basic pass-through fetch handler.
    // In a full PWA, we would handle caching here.
    // Required for PWA Installability criteria.
});
