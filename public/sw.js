// SCLS Push Service Worker
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'SCLS', body: '' };
  try { if (event.data) data = event.data.json(); } catch (_) {
    data = { title: 'SCLS', body: event.data ? event.data.text() : '' };
  }
  const options = {
    body: data.body || '',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg',
    dir: 'rtl',
    lang: 'ar',
    tag: data.type || 'scls',
    requireInteraction: data.priority === 'high',
    data: { url: data.url || '/', ref_id: data.ref_id },
  };
  event.waitUntil(self.registration.showNotification(data.title || 'إشعار جديد', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
