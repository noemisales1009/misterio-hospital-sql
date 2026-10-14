// Acrescenta ?v=<hash> aos arquivos de CSS e JS nas páginas HTML.
// A hospedagem entrega esses arquivos com cache longo (7 dias). Com o hash na URL, o navegador
// baixa de novo sempre que o conteúdo muda, e nunca mistura HTML novo com CSS antigo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const raiz = path.join(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));
const re = /((?:href|src)=")((?:css|js)\/[A-Za-z0-9_.-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")/g;

function hash(rel) {
  const arq = path.join(raiz, rel);
  if (!fs.existsSync(arq)) return null;
  const conteudo = fs.readFileSync(arq);
  // ignora diferença de fim de linha (Windows x Linux) para o hash ser o mesmo nos dois
  const limpo = Buffer.from(conteudo.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('md5').update(limpo).digest('hex').slice(0, 8);
}

let alteradas = 0;
paginas.forEach((nome) => {
  const arq = path.join(raiz, nome);
  const antes = fs.readFileSync(arq, 'utf8');
  const depois = antes.replace(re, (m, ini, rel, fim) => {
    const h = hash(rel);
    return h ? `${ini}${rel}?v=${h}${fim}` : `${ini}${rel}${fim}`;
  });
  if (depois !== antes) {
    fs.writeFileSync(arq, depois, 'utf8');
    alteradas++;
  }
});
console.log(`versionar: ${alteradas} página(s) atualizada(s)`);
