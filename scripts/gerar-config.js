// Gera js/config.js a partir das variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY.
// Roda no "npm run build". Sem as variáveis, gera um config vazio e o guia
// continua funcionando (o progresso fica só no navegador).
const fs = require('fs');
const path = require('path');

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
  console.log('Sem SUPABASE_URL/SUPABASE_ANON_KEY: config.js vazio, o guia usa só o navegador.');
}

fs.writeFileSync(
  saida,
  '// Gerado por scripts/gerar-config.js. Não edite à mão.\nwindow.MISTERIO_CONFIG = ' + JSON.stringify(cfg) + ';\n',
  'utf8'
);
