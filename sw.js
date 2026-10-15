// Gerado por scripts/gerar-sw.js. Não edite à mão.
// Guarda o jogo no aparelho para funcionar sem internet.
var VERSAO = "ab26335e82";
var CACHE = "misterio-sql-" + VERSAO;
var ARQUIVOS = [
  "./",
  "caso10.html",
  "caso2.html",
  "caso3.html",
  "caso4.html",
  "caso5.html",
  "caso6.html",
  "caso7.html",
  "caso8.html",
  "caso9.html",
  "css/estilo.css?v=86e6f3f7",
  "fonts/atkinson-hyperlegible-400-italic-latin-ext.woff2",
  "fonts/atkinson-hyperlegible-400-italic-latin.woff2",
  "fonts/atkinson-hyperlegible-400-normal-latin-ext.woff2",
  "fonts/atkinson-hyperlegible-400-normal-latin.woff2",
  "fonts/atkinson-hyperlegible-700-normal-latin-ext.woff2",
  "fonts/atkinson-hyperlegible-700-normal-latin.woff2",
  "fonts/big-shoulders-display-600-normal-latin-ext.woff2",
  "fonts/big-shoulders-display-600-normal-latin.woff2",
  "fonts/caveat-600-normal-latin-ext.woff2",
  "fonts/caveat-600-normal-latin.woff2",
  "fonts/fonts.css",
  "fonts/jetbrains-mono-400-normal-latin-ext.woff2",
  "fonts/jetbrains-mono-400-normal-latin.woff2",
  "guia.html",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "index.html",
  "js/app.js?v=5417c6c0",
  "js/caderno.js?v=16f823f1",
  "js/catalogo.js?v=cd3ff46d",
  "js/computador.js?v=8b659794",
  "js/config.js?v=58dc78bb",
  "js/mermaid-init.js?v=9cf16683",
  "js/pwa.js?v=e304ae22",
  "js/quadro.js?v=27dfa579",
  "js/tema.js?v=45d4af28",
  "manifest.webmanifest",
  "vendor/mermaid/mermaid.min.js",
  "vendor/pglite/chunk-A7RFOIQ7.js",
  "vendor/pglite/chunk-BTBUZ646.js",
  "vendor/pglite/chunk-EADU5A67.js",
  "vendor/pglite/chunk-STOZMFXW.js",
  "vendor/pglite/chunk-WGR4JCLS.js",
  "vendor/pglite/index.js",
  "vendor/pglite/postgres.data",
  "vendor/pglite/postgres.wasm"
];

// uma resposta que passou por redirecionamento não pode ser entregue a uma página; refaz limpa
function limpa(res) {
  if (!res.redirected) return Promise.resolve(res);
  return res.blob().then(function (b) {
    return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ARQUIVOS.map(function (u) {
        return fetch(new Request(u, { cache: "reload" })).then(function (r) {
          if (!r.ok) throw new Error(u + " " + r.status);
          return limpa(r).then(function (l) { return c.put(u, l); });
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nomes) {
      return Promise.all(nomes.filter(function (n) {
        return n.indexOf("misterio-sql-") === 0 && n !== CACHE;
      }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function guarda(req, res) {
  if (!res || !res.ok || res.type !== "basic") return res;
  var copia = res.clone();
  caches.open(CACHE).then(function (c) {
    return limpa(copia).then(function (l) { return c.put(req, l); });
  }).catch(function () {});
  return res;
}

// css, js, fontes, imagens: do aparelho; se não tiver, busca na internet e guarda
function arquivo(req) {
  return caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) { return guarda(req, res); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (h) { return h || Response.error(); });
    });
  });
}

// páginas: tenta a internet (versão mais nova); sem internet, usa a guardada
function pagina(req, url) {
  return fetch(req).then(function (res) { return guarda(req, res); }).catch(function () {
    var base = new URL("./", self.registration.scope);
    var rel = url.pathname.slice(base.pathname.length);
    var tentativas = [req];
    if (rel !== "" && !/\.[a-z0-9]+$/i.test(rel) && rel.slice(-1) !== "/") tentativas.push(new URL(rel + ".html", base).href);
    tentativas.push(new URL("index.html", base).href);
    return tentativas.reduce(function (p, alvo) {
      return p.then(function (achou) {
        return achou || caches.match(alvo, { ignoreSearch: true });
      });
    }, Promise.resolve(null)).then(function (r) { return r || Response.error(); });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") e.respondWith(pagina(req, url));
  else e.respondWith(arquivo(req));
});
