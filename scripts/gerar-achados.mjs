// Gera js/achados-dados.json: para cada fase, as consultas da solução e o que elas devolvem.
// A aba "Achados" do Caderno usa esse arquivo para mostrar COMO cada pista foi encontrada.
//
// Roda cada solução (os blocos "Ver solução" das páginas) no PGlite do próprio projeto, na mesma
// ordem em que o jogador faria. Não faz parte do "npm run build": rode de novo
//   node scripts/gerar-achados.mjs
// depois de mudar os dados ou a solução de um caso, e então "npm run build".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PGlite } = await import(pathToFileURL(path.join(raiz, 'vendor/pglite/index.js')).href);

const MAX_LINHAS = 8, MAX_COLUNAS = 8, MAX_CELULA = 80;
const mantem = (v) => v;   // datas e horas ficam como o Postgres escreve (igual ao computador do jogo)
const PARSERS = { 1082: mantem, 1083: mantem, 1114: mantem, 1184: mantem, 1186: mantem, 1266: mantem };

const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, 'js/catalogo.js'), 'utf8').match(/MISTERIO_CATALOGO\s*=\s*(\[.*\]);?\s*$/m)[1]);
const sqlDoCaso = (arq) => (arq === 'guia.html' ? 'banco_do_jogo.sql' : arq.replace('.html', '.sql'));

const destag = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .trim();

function celula(v) {
  if (v === null || v === undefined) return null;
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return t.length > MAX_CELULA ? t.slice(0, MAX_CELULA - 1) + '…' : t;
}

const saida = {};
let consultas = 0, comResultado = 0;

for (const cs of catalogo) {
  const arqSql = path.join(raiz, sqlDoCaso(cs.arq));
  const arqHtml = path.join(raiz, cs.arq);
  if (!fs.existsSync(arqSql) || !fs.existsSync(arqHtml)) { console.log('pulando ' + cs.arq + ' (arquivo não encontrado)'); continue; }
  const db = new PGlite();
  // o banco de cada caso cria tabelas de login do Supabase; aqui só precisamos que o script rode
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  `);
  await db.exec(fs.readFileSync(arqSql, 'utf8'));
  const html = fs.readFileSync(arqHtml, 'utf8');

  for (const fa of cs.fases) {
    const m = html.match(new RegExp('<section[^>]*id="' + fa.id + '"[^>]*>([\\s\\S]*?)</section>'));
    if (!m) continue;
    const solucoes = [...m[1].matchAll(/<details class="sol"[\s\S]*?<\/details>/g)]
      .flatMap((d) => [...d[0].matchAll(/<pre data-sql>([\s\S]*?)<\/pre>/g)].map((x) => destag(x[1])));
    if (!solucoes.length) continue;
    const lista = [];
    for (const sql of solucoes) {
      consultas++;
      const item = { sql };
      try {
        const rs = await db.exec(sql, { rowMode: 'array', parsers: PARSERS });
        const r = [...rs].reverse().find((x) => x.fields && x.fields.length);
        if (r) {
          item.colunas = r.fields.slice(0, MAX_COLUNAS).map((f) => f.name);
          item.linhas = r.rows.slice(0, MAX_LINHAS).map((l) => l.slice(0, MAX_COLUNAS).map(celula));
          item.total = r.rows.length;
          if (r.fields.length > MAX_COLUNAS) item.maisColunas = r.fields.length - MAX_COLUNAS;
          comResultado++;
        }
      } catch (e) {
        item.erro = String(e.message || e).slice(0, 120);
      }
      lista.push(item);
    }
    saida[fa.id] = lista;
  }
  console.log(cs.arq.padEnd(12), 'ok');
}

const alvo = path.join(raiz, 'js/achados-dados.json');
fs.writeFileSync(alvo, JSON.stringify(saida));
console.log(`js/achados-dados.json: ${Object.keys(saida).length} fases, ${consultas} consultas (${comResultado} com resultado), ${(fs.statSync(alvo).size / 1024).toFixed(1)} KB`);
const comErro = Object.entries(saida).flatMap(([id, l]) => l.filter((x) => x.erro).map((x) => id + ': ' + x.erro));
if (comErro.length) console.log('consultas com erro (ficam só com o texto SQL):\n  ' + comErro.join('\n  '));
process.exit(0);
