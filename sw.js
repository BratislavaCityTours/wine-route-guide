/* Service worker — Small Carpathian Wine Route Audio Guide */
const SHELL_CACHE = "wr-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./content/en.json",
  "./content/es.json",
  "./content/fr.json",
  "./content/it.json",
  "./content/de.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Cache shell files individually so one missing language file doesn't break install
      await Promise.all(
        SHELL.map((url) => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

/* Strategy:
   - Audio (.mp3): cache-first (downloaded via the in-app offline button, or cached on first play)
   - Everything else: network-first, falling back to cache when offline
*/
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (url.pathname.endsWith(".mp3")) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        if (hit) return hit;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open("wr-audio-runtime").then((c) => c.put(e.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.method === "GET") {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
