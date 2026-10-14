// Gera js/config.js a partir das variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.
// Roda no "npm run build". Sem as variáveis, gera um config vazio e o guia
// continua funcionando (o progresso fica só no navegador).
const fs = require('fs');
const path = require('path');

// Lê o arquivo .env (se existir) sem sobrescrever variáveis já definidas no ambiente.
try {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  env.split(String.fromCharCode(10)).forEach((linha) => {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || linha.trim().startsWith('#')) return;
    const valor = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  });
} catch (e) { /* sem .env: tudo bem */ }

const url = (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
const saida = path.join(__dirname, '..', 'js', 'config.js');

function papelDaChave(jwt) {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role;
  } catch (e) {
    return null;
  }
}

let cfg = { url: '', key: '' };

if (url || key) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    console.error('SUPABASE_URL inválida. Use algo como https://xxxx.supabase.co');
    process.exit(1);
  }
  const papel = papelDaChave(key);
  if (papel === 'service_role') {
    console.error('SUPABASE_ANON_KEY é a chave service_role. Use a chave anon (public).');
    process.exit(1);
  }
  if (papel !== 'anon') {
    console.error('SUPABASE_ANON_KEY não parece ser uma chave anon válida.');
    process.exit(1);
  }
  cfg = { url, key };
  console.log('config.js gerado com a URL do Supabase e a chave anon.');
} else {
  if (fs.existsSync(saida)) {
    console.log('Sem SUPABASE_URL/SUPABASE_ANON_KEY: mantendo o js/config.js que já existe.');
    process.exit(0);
  }
  console.log('Sem SUPABASE_URL/SUPABASE_ANON_KEY: config.js vazio, o guia usa só o navegador.');
}

fs.writeFileSync(
  saida,
  '// Gerado por scripts/gerar-config.js. Não edite à mão.\nwindow.MISTERIO_CONFIG = ' + JSON.stringify(cfg) + ';\n',
  'utf8'
);
