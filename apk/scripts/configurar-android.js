// Depois de "cap add android": define assinatura e versão no build.gradle do app.
// - Assina com apk/keystore/misterio-sql.p12, a mesma chave em toda compilação.
//   Assim o APK novo instala por cima do antigo, sem perder o progresso salvo no aparelho.
// - versionCode sobe a cada compilação (número da execução no GitHub).
const fs = require('fs');
const path = require('path');

const arq = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(arq)) {
  console.error('android/app/build.gradle não existe. Rode "npx cap add android" antes.');
  process.exit(1);
}
let g = fs.readFileSync(arq, 'utf8');
const numero = parseInt(process.env.NUMERO || '1', 10) || 1;

function troca(re, novo, nome) {
  if (!re.test(g)) { console.error(`configurar-android: não achei ${nome} no build.gradle`); process.exit(1); }
  g = g.replace(re, novo);
}

troca(/versionCode\s+\d+/, `versionCode ${numero}`, 'versionCode');
troca(/versionName\s+"[^"]*"/, `versionName "1.0.${numero}"`, 'versionName');

const assinatura = `
    signingConfigs {
        release {
            storeFile file("../../keystore/misterio-sql.p12")
            storeType "pkcs12"
            storePassword "misterio-sql"
            keyAlias "misterio-sql"
            keyPassword "misterio-sql"
        }
    }
`;
troca(/\n(\s*)buildTypes\s*\{/, `${assinatura}\n    buildTypes {`, 'buildTypes');
troca(/release\s*\{\s*\n(\s*)minifyEnabled/, (m, esp) => m.replace(/minifyEnabled/, `signingConfig signingConfigs.release\n${esp}minifyEnabled`), 'bloco release');

fs.writeFileSync(arq, g, 'utf8');
console.log(`configurar-android: versão 1.0.${numero}, assinatura configurada`);
