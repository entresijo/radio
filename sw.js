/* Service worker MÍNIMO. Su único propósito es que Android Chrome genere el
   WebAPK al "Agregar a la pantalla de inicio" —la instalación PWA que abre en
   standalone, SIN las barras del navegador—. Sin un service worker con un
   handler de fetch, Chrome hace un simple acceso directo que abre en una
   pestaña normal (con barras). Eso era lo que pasaba.

   ⚠️ NO CACHEA NADA a propósito. Un reproductor de radio no quiere servir un
   HTML/CSS viejo desde caché (rompería justo el tipo de bug que costó esta
   sesión), y menos todavía interceptar el stream de audio o la API del Worker.

   [S7 · 11/11] Y YA NO INTERCEPTA NI LA CARGA DE LA PÁGINA. Antes respondía
   las navegaciones con `respondWith(fetch(e.request))`: no agregaba nada —el
   pedido iba a la red igual— y ponía al service worker EN EL MEDIO de la
   apertura de la app. Reportado: en Android 6/7, instalada como app, "da
   error y no muestra la página", mientras en la pestaña de Chrome anda. Con
   respondWith, cualquier falla de ese fetch (un Chrome viejo, una red que
   tarda al despertar, un certificado) es una página de error del service
   worker en vez de la carga normal con sus reintentos. Sin respondWith, el
   navegador carga la página exactamente como en una pestaña.
   El handler sigue existiendo y NO está vacío: es lo que Chrome mira para
   habilitar el WebAPK, y un cuerpo vacío lo detecta y lo descarta. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // Nada pasa por acá: sin respondWith, cada pedido sigue su camino normal.
  if (e.request.mode === 'navigate') return;
});
