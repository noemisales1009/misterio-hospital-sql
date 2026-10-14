// Depois de "cap add android": define o número da versão no build.gradle do app.
// O versionCode sobe a cada compilação (10 + número da execução no GitHub), então o APK novo
// atualiza o antigo. A assinatura é feita depois, com apksigner (veja .github/workflows/apk.yml).
const fs = require('fs');
const path = require('path');

const arq = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (!fs.existsSync(arq)) {
  console.error('android/app/build.gradle não existe. Rode "npx cap add android" antes.');
  process.exit(1);
}
let g = fs.readFileSync(arq, 'utf8');
const numero = parseInt(process.env.NUMERO || '1', 10) || 1;
const codigo = 10 + numero;

function troca(re, novo, nome) {
  if (!re.test(g)) { console.error(`configurar-android: não achei ${nome} no build.gradle`); process.exit(1); }
  g = g.replace(re, novo);
}
troca(/versionCode\s+\d+/, `versionCode ${codigo}`, 'versionCode');
troca(/versionName\s+"[^"]*"/, `versionName "1.0.${numero}"`, 'versionName');

fs.writeFileSync(arq, g, 'utf8');
console.log(`configurar-android: versionCode ${codigo}, versionName 1.0.${numero}`);
