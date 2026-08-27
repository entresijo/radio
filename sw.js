/* Service worker MÍNIMO. Su único propósito es que Android Chrome genere el
   WebAPK al "Agregar a la pantalla de inicio" —la instalación PWA que abre en
   standalone, SIN las barras del navegador—. Sin un service worker con un
   handler de fetch, Chrome hace un simple acceso directo que abre en una
   pestaña normal (con barras). Eso era lo que pasaba.

   ⚠️ NO CACHEA NADA a propósito. Un reproductor de radio no quiere servir un
   HTML/CSS viejo desde caché (rompería justo el tipo de bug que costó esta
   sesión), y menos todavía interceptar el stream de audio o la API del Worker.
   El handler se limita a las NAVEGACIONES (la carga de la página) y va siempre
   a la red; el stream, /api/*, el CSS y las fuentes pasan sin que el SW los
   toque. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request));
  }
  // Todo lo demás pasa sin interceptar.
});
