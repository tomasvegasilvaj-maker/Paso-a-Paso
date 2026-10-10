// Avisos push (doc 01). Lo carga el service worker que arma vite-plugin-pwa con importScripts.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const base = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(data.title || 'Paso a Paso', {
      body: data.body || '',
      // La cara de Tito ocupa todo el cuadrado del ícono.
      icon: base + 'icons/icon-192.png',
      badge: base + 'icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || base },
    }),
  )
})

// Al tocar el aviso se abre la app (o se enfoca si ya estaba abierta) en la pantalla que corresponde.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || self.registration.scope, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.startsWith(self.registration.scope) && 'focus' in v) {
          v.navigate(url)
          return v.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
