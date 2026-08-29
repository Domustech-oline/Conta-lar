const CACHE = "contaslar-v4";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Nunca cachear chamadas à planilha (Google Apps Script) — esses dados
  // mudam o tempo todo e precisam vir sempre direto da rede, senão o app
  // mostra valores antigos depois de editar algo e recarregar a página.
  const url = e.request.url;
  if (url.includes("script.google.com") || url.includes("script.googleusercontent.com")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Arquivos estáticos do próprio app: cache-first com atualização em
  // segundo plano (stale-while-revalidate).
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
