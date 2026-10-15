// Depois de "cap add android": troca o MainActivity.java para limpar o cache do WebView quando
// o app for atualizado (versionCode diferente do que rodou da última vez).
//
// Por que: ao instalar o APK novo por cima do antigo (para manter o progresso salvo), o Android
// preserva os dados do app, inclusive o cache do WebView. Às vezes isso faz a tela antiga (de
// antes da correção) continuar aparecendo mesmo depois de instalar a versão nova. Limpando o
// cache só quando a versão muda, isso não acontece mais, e o app não perde o progresso (que fica
// no localStorage/IndexedDB, não no cache de rede, e no Supabase para quem tem conta).
const fs = require('fs');
const path = require('path');

const arq = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'br', 'com', 'noemisales', 'misteriosql', 'MainActivity.java');
if (!fs.existsSync(arq)) {
  console.error('MainActivity.java não existe em ' + arq + '. Rode "npx cap add android" antes.');
  process.exit(1);
}

const conteudo = `package br.com.noemisales.misteriosql;

import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  // Limpa o cache do WebView quando o app sobe numa versão diferente da última vez que rodou.
  // Assim, uma atualização do APK (instalada por cima, para manter o progresso) nunca deixa
  // uma pagina antiga em cache aparecer no lugar da nova.
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      int versaoAtual = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
      SharedPreferences prefs = getSharedPreferences("misterio_sql_app", MODE_PRIVATE);
      int versaoAnterior = prefs.getInt("versionCode", -1);
      if (versaoAnterior != versaoAtual) {
        if (bridge != null && bridge.getWebView() != null) {
          bridge.getWebView().clearCache(true);
        }
        prefs.edit().putInt("versionCode", versaoAtual).apply();
      }
    } catch (Exception e) {
      // Nunca trava o app por causa disso.
    }
  }
}
`;

fs.writeFileSync(arq, conteudo, 'utf8');
console.log('limpar-cache-atualizacao: MainActivity.java agora limpa o cache do WebView quando a versão muda.');
