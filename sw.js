/* GuardIA: service worker.
   Regla de oro: el contenido clínico siempre se pide primero a internet (red primero),
   así nunca se muestra una versión vieja cuando hay conexión. Solo si no hay conexión
   se usa la última copia guardada en el celular. */
var VERSION = 'guardia-pwa-v1';
var BASICOS = ['./', 'index.html', 'guardia-concepto4_1.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(VERSION).then(function (c) { return c.addAll(BASICOS); }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (claves) {
            return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
    );
});

function esIndex(url) { return url.pathname === '/' || /\/index\.html$/.test(url.pathname); }

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return;   // fuentes de Google u otros: sin tocar (offline usa la tipografía del sistema)

    if (esIndex(url) || req.mode === 'navigate') {
        e.respondWith(
            fetch(req).then(function (r) {
                if (r && r.ok && esIndex(url)) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copia); }); }
                return r;
            }).catch(function () {
                return caches.match(esIndex(url) ? 'index.html' : req).then(function (r) { return r || caches.match('index.html'); });
            })
        );
        return;
    }

    e.respondWith(
        fetch(req).then(function (r) {
            if (r && r.ok) { var copia = r.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
            return r;
        }).catch(function () { return caches.match(req); })
    );
});
