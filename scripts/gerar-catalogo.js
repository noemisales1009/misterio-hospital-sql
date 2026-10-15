// Gera js/catalogo.js: a lista de casos e fases que o Caderno do detetive mostra.
// Lê os próprios arquivos HTML dos casos, então basta rodar de novo depois de editar uma fase.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const casos = [
  { arq: 'guia.html', n: 1, titulo: 'A geladeira de vacinas', nivel: 'Iniciante', resumo: 'Alguém desligou a geladeira da Sala de Vacinas.' },
  { arq: 'caso2.html', n: 2, titulo: 'O prontuário adulterado', nivel: 'Intermediário', resumo: 'Uma dose alterada com a senha de quem estava de folga.' },
  { arq: 'caso3.html', n: 3, titulo: 'O sumiço da morfina', nivel: 'Intermediário', resumo: 'O cofre de controlados não fechou.' },
  { arq: 'caso4.html', n: 4, titulo: 'O surto na UTI', nivel: 'Intermediário', resumo: 'Sete pacientes, a mesma bactéria.' },
  { arq: 'caso5.html', n: 5, titulo: 'A conta que não fecha', nivel: 'Avançado', resumo: 'O faturamento passou do esperado.' },
  { arq: 'caso6.html', n: 6, titulo: 'A cadeia de frio', nivel: 'Avançado', resumo: 'Hemoderivados fora da faixa de temperatura.' },
  { arq: 'caso7.html', n: 7, titulo: 'O paciente em dobro', nivel: 'Intermediário', resumo: 'Cadastros duplicados cobrando consultas em dobro.' },
  { arq: 'caso8.html', n: 8, titulo: 'As horas extras', nivel: 'Avançado', resumo: 'A folha de hora extra explodiu em setembro.' },
  { arq: 'caso9.html', n: 9, titulo: 'O prontuário espiado', nivel: 'Segurança', resumo: 'O prontuário de uma paciente vazou nas redes.' },
  { arq: 'caso10.html', n: 10, titulo: 'A invasão', nivel: 'Segurança', resumo: 'Um ataque pela busca de exames do portal do paciente.' },
];

function limpa(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const saida = casos.map((c) => {
  const arquivo = path.join(raiz, c.arq);
  const html = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
  const fases = [];
  const re = /<section class="fase[^"]*" id="([^"]+)" data-fase="([^"]+)" data-nome="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const corpo = m[4];
    const num = (corpo.match(/<div class="num">([\s\S]*?)<\/div>/) || [])[1];
    const titulo = (corpo.match(/<div class="fase-head">[\s\S]*?<h2>([\s\S]*?)<\/h2>/) || [])[1];
    const sub = (corpo.match(/<div class="sub">([\s\S]*?)<\/div>/) || [])[1];
    const missao = (corpo.match(/<div class="missao">([\s\S]*?)<\/div>/) || [])[1];
    fases.push({
      id: m[1],
      num: limpa(num),
      nome: m[3],
      titulo: limpa(titulo),
      sub: limpa(sub),
      missao: limpa(missao).replace(/^Sua missão\s*/i, '').replace(/^Missão final\s*/i, ''),
    });
  }
  return Object.assign({}, c, { fases });
});

const conteudo = '// Gerado por scripts/gerar-catalogo.js. Não edite à mão.\nwindow.MISTERIO_CATALOGO = ' + JSON.stringify(saida) + ';\n';
fs.writeFileSync(path.join(raiz, 'js', 'catalogo.js'), conteudo, 'utf8');
console.log('catalogo.js gerado:', saida.map((c) => `${c.arq}=${c.fases.length}`).join(' '));
