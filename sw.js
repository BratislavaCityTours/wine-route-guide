/* Service worker — Small Carpathian Wine Route Audio Guide
   Strategy:
     - audio + photos + icons : CACHE FIRST  (never re-download, works offline)
     - html / json / everything else : NETWORK FIRST, falling back to cache
   The in-app "Download the full guide" button fills the cache in one go.
*/
const SHELL_CACHE = "wr-shell-v2";
const RUNTIME     = "wr-runtime-v2";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./content/en.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./images/logo.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // one missing file must not break the whole install
      await Promise.all(SHELL.map((u) => cache.add(u).catch(() => null)));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("wr-") && k !== SHELL_CACHE &&
                         k !== RUNTIME && !k.startsWith("wr-offline-"))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

const isAsset = (p) => /\.(mp3|jpg|jpeg|png|webp|svg|ico)$/i.test(p);

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // ---- audio + images: cache first ----
  if (isAsset(url.pathname)) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(e.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(e.request, copy));
            }
            return res;
          })
          .catch(() => new Response("", { status: 404 })); // offline + never cached
      })
    );
    return;
  }

  // ---- everything else: network first, cache as backup ----
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true }).then(
          (hit) => hit || caches.match("./index.html")
        )
      )
  );
});
