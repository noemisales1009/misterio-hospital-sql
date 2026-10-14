// Monta apk/www com só o que o aplicativo precisa: as páginas do jogo e seus arquivos.
// O aplicativo guarda tudo dentro dele (PGlite, Mermaid e fontes já estão no projeto),
// então funciona sem internet. Não leva SQL, scripts nem a pasta do próprio apk.
const fs = require('fs');
const path = require('path');

const site = path.join(__dirname, '..', '..');
const destino = path.join(__dirname, '..', 'www');

fs.rmSync(destino, { recursive: true, force: true });
fs.mkdirSync(destino, { recursive: true });

const paginas = fs.readdirSync(site).filter((f) => f.endsWith('.html'));
const pastas = ['css', 'js', 'fonts', 'icons', 'vendor'];
const soltos = ['manifest.webmanifest'];

paginas.concat(soltos).forEach((f) => {
  if (fs.existsSync(path.join(site, f))) fs.copyFileSync(path.join(site, f), path.join(destino, f));
});
pastas.forEach((d) => {
  const origem = path.join(site, d);
  if (fs.existsSync(origem)) fs.cpSync(origem, path.join(destino, d), { recursive: true });
});

if (!fs.existsSync(path.join(destino, 'index.html'))) {
  console.error('index.html não encontrado: confira a pasta do site.');
  process.exit(1);
}
let total = 0;
(function soma(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) soma(p); else total += fs.statSync(p).size;
  });
})(destino);
console.log(`preparar-www: ${paginas.length} páginas, ${(total / 1048576).toFixed(1)} MB em apk/www`);
