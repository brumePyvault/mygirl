self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(self.registration.showNotification(data.title || 'For Deborah', {
    body: data.body || 'There is something new waiting for you.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/' },
    tag: 'love-note',
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const target = new URL(event.notification.data?.url || '/', self.location.origin).href
    const openWindow = windows.find(window => window.url === target)
    return openWindow ? openWindow.focus() : clients.openWindow(target)
  }))
})
