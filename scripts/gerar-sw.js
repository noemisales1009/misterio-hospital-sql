// Gera sw.js (service worker): guarda o jogo no aparelho para funcionar sem internet.
// Roda no "npm run build", depois do versionar.js (lê os ?v=hash que as páginas usam).
// A versão do cache é um hash de tudo que é guardado: mudou um arquivo, o aparelho baixa de novo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter((f) => f.endsWith('.html')).sort();
const lista = new Set(['./']);

paginas.forEach((p) => lista.add(p));

// css, js, fontes, ícones e bibliotecas, exatamente como aparecem nas páginas (com ?v=hash)
const re = /(?:href|src)="((?:css|js|fonts|icons|vendor)\/[A-Za-z0-9_.\/-]+(?:\?v=[a-f0-9]+)?)"/g;
paginas.forEach((p) => {
  const html = fs.readFileSync(path.join(raiz, p), 'utf8');
  let m;
  while ((m = re.exec(html))) lista.add(m[1]);
});

function arquivosDe(dir, filtro) {
  const abs = path.join(raiz, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter(filtro).sort().map((f) => `${dir}/${f}`);
}

// o que as páginas não citam diretamente
['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']
  .forEach((f) => lista.add(f));
arquivosDe('fonts', (f) => /\.(woff2|css)$/.test(f)).forEach((f) => lista.add(f));
arquivosDe('vendor/pglite', (f) => /\.(js|wasm|data)$/.test(f)).forEach((f) => lista.add(f));
arquivosDe('vendor/mermaid', (f) => /\.js$/.test(f)).forEach((f) => lista.add(f));

// só entra o que existe no disco
const arquivos = [...lista].filter((f) => {
  if (f === './') return true;
  const limpo = f.split('?')[0];
  return fs.existsSync(path.join(raiz, limpo));
}).sort();

const h = crypto.createHash('md5');
arquivos.forEach((f) => {
  h.update(f);
  if (f === './') return;
  const conteudo = fs.readFileSync(path.join(raiz, f.split('?')[0]));
  h.update(conteudo);
});
const versao = h.digest('hex').slice(0, 10);

const modelo = `// Gerado por scripts/gerar-sw.js. Não edite à mão.
// Guarda o jogo no aparelho para funcionar sem internet.
var VERSAO = ${JSON.stringify(versao)};
var CACHE = "misterio-sql-" + VERSAO;
var ARQUIVOS = ${JSON.stringify(arquivos, null, 2)};

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
  // cache: "no-cache" = confere com o servidor (ETag) antes de usar a cópia do navegador;
  // sem isso uma página velha pode ficar "fresca" por um tempo e a novidade demora a aparecer
  return fetch(new Request(req, { cache: "no-cache" })).then(function (res) { return guarda(req, res); }).catch(function () {
    var base = new URL("./", self.registration.scope);
    var rel = url.pathname.slice(base.pathname.length);
    var tentativas = [req];
    if (rel !== "" && !/\\.[a-z0-9]+$/i.test(rel) && rel.slice(-1) !== "/") tentativas.push(new URL(rel + ".html", base).href);
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
`;

fs.writeFileSync(path.join(raiz, 'sw.js'), modelo, 'utf8');
console.log(`gerar-sw: ${arquivos.length} arquivos, versão ${versao}`);
