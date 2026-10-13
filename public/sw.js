/* Caches the app shell so it installs and opens without a network. Files are
   network-first, so an edit is never hidden behind a stale copy. The 3D cube
   library (vendor/cubing) is in the shell too: the first page load happens
   before the worker controls the page, so caching it "on first load" would
   leave a fresh install without the cube. CACHE carries APP_VERSION from
   js/app.js; bump both together (see AGENTS.md). */
const CACHE = "first-solve-v1.02";
const SHELL = [
  "./",
  "privacy",
  "css/fonts.css",
  "css/style.css",
  "fonts/atkinson-hyperlegible-next-latin.woff2",
  "fonts/atkinson-hyperlegible-next-latin-ext.woff2",
  "fonts/rubik-latin.woff2",
  "fonts/rubik-latin-ext.woff2",
  "js/theme-init.js",
  "js/boot-check.js",
  "js/app.js",
  "js/privacy.js",
  "js/steps.js",
  "js/i18n/pl.js",
  "js/i18n/en.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "vendor/cubing/js/chunks/big-puzzle-orientation-ADWIOX6S-HAXCK5QD.js",
  "vendor/cubing/js/chunks/chunk-6FGN7FJ2.js",
  "vendor/cubing/js/chunks/chunk-BOXMV26D.js",
  "vendor/cubing/js/chunks/chunk-DOLIGKB4.js",
  "vendor/cubing/js/chunks/chunk-F2NOVBPD.js",
  "vendor/cubing/js/chunks/chunk-FTOYKNXV.js",
  "vendor/cubing/js/chunks/chunk-HLHAXLLX.js",
  "vendor/cubing/js/chunks/chunk-O444DPSJ.js",
  "vendor/cubing/js/chunks/chunk-OMYW43FY.js",
  "vendor/cubing/js/chunks/chunk-QEV3MOKK.js",
  "vendor/cubing/js/chunks/chunk-RARWIEAJ.js",
  "vendor/cubing/js/chunks/puzzle-geometry-SGABPRSM.js",
  "vendor/cubing/js/chunks/puzzles-dynamic-3x3x3-FYXD7SIU-OEB2HRMF.js",
  "vendor/cubing/js/chunks/puzzles-dynamic-4x4x4-AIGABOAR-JXOKBEVS.js",
  "vendor/cubing/js/chunks/puzzles-dynamic-megaminx-2LVHIDL4-4S7ACKFB.js",
  "vendor/cubing/js/chunks/puzzles-dynamic-side-events-IMYJ533P-BX4T5YDB.js",
  "vendor/cubing/js/chunks/puzzles-dynamic-unofficial-P3TW433I-MZZYRKFB.js",
  "vendor/cubing/js/chunks/twisty-dynamic-3d-4BEQ76PB-7CGG7AA3.js",
  "vendor/cubing/js/cubing/twisty.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The host redirects index.html to ./ and privacy.html to privacy, and a
   redirected response cannot answer a navigation. So SHELL lists pages by
   their clean URLs, and an offline visit to the .html form is looked up there. */
function cleanUrl(url) {
  const u = new URL(url);
  u.pathname = u.pathname.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, "");
  return u.origin + u.pathname;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === "navigate" ? caches.match(cleanUrl(req.url)) : undefined))
          .then((hit) => hit || caches.match("./"))
      )
  );
});
