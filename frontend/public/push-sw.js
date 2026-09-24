/* Web Push handlers, imported into the generated service worker (see vite.config.ts). */

/** Only paths inside this app may be opened from a notification. */
function safePath(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Unreadable payload: still show something, as browsers require for every push.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Unmute', {
      body: data.body || 'You have a new notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.tag || 'unmute',
      renotify: true,
      data: { url: safePath(data.url) },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(target).catch(() => open);
      }
      return self.clients.openWindow(target);
    })
  );
});
