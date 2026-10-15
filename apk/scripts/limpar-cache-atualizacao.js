// Depois de "cap add android": troca o MainActivity.java para
//  1) limpar o cache do WebView quando o app for atualizado (versionCode diferente do que
//     rodou da última vez), e
//  2) empurrar o conteúdo nativamente para baixo da barra de status / entalhe, sem depender
//     do CSS (env(safe-area-inset-*)) nem de o plugin SystemBars adivinhar certo a versão
//     do WebView do aparelho.
//
// Por que (1): ao instalar o APK novo por cima do antigo (para manter o progresso salvo), o
// Android preserva os dados do app, inclusive o cache do WebView. Às vezes isso faz a tela
// antiga (de antes de uma correção) continuar aparecendo mesmo depois de instalar a versão
// nova. Limpando o cache só quando a versão muda, isso não acontece mais, e o progresso não
// se perde (ele fica no localStorage/IndexedDB e no Supabase, não no cache de rede).
//
// Por que (2): com o app mirando Android 16 (targetSdkVersion 36), o sistema força o
// conteúdo a desenhar atrás da barra de status/navegação (edge-to-edge), sem opção de sair
// disso. O plugin SystemBars do Capacitor tenta reservar esse espaço sozinho, mas decide como
// fazer isso com base na versão do WebView instalado no aparelho — e em pelo menos um
// aparelho de teste isso não funcionou. Por isso aplicamos o espaçamento por conta própria,
// de um jeito que não depende de nada disso: sempre que o Android avisa o tamanho das barras
// do sistema, aplicamos esse tanto de preenchimento (padding) direto na tela do app. Como
// zeramos o valor que desce para a página, o CSS (env(safe-area-inset-*)) não soma por cima.
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
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    limparCacheSeAtualizou();
    empurraConteudoParaForaDasBarras();
  }

  // Limpa o cache do WebView quando o app sobe numa versão diferente da última vez que rodou.
  // Assim, uma atualização do APK (instalada por cima, para manter o progresso) nunca deixa
  // uma pagina antiga em cache aparecer no lugar da nova.
  private void limparCacheSeAtualizou() {
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

  // Reserva nativamente o espaço da barra de status, da barra de navegação e do entalhe,
  // sem depender do CSS da página nem de detectar a versão do WebView.
  private void empurraConteudoParaForaDasBarras() {
    try {
      View raiz = getWindow().getDecorView();
      ViewCompat.setOnApplyWindowInsetsListener(raiz, (v, insets) -> {
        Insets barras = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        v.setPadding(barras.left, barras.top, barras.right, barras.bottom);
        // Zera o que desce para a página: sem isso, o env(safe-area-inset-*) do CSS
        // somaria um espaço extra por cima do que já reservamos aqui.
        return new WindowInsetsCompat.Builder(insets)
          .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.of(0, 0, 0, 0))
          .build();
      });
      ViewCompat.requestApplyInsets(raiz);
    } catch (Exception e) {
      // Nunca trava o app por causa disso.
    }
  }
}
`;

fs.writeFileSync(arq, conteudo, 'utf8');

// MainActivity.java agora usa androidx.core.view.ViewCompat/WindowInsetsCompat e
// androidx.core.graphics.Insets. O app já recebe isso de carona pelo androidx.appcompat, mas
// declaramos direto para não depender disso: garante que compila mesmo se essa exposição
// indireta mudar numa versão futura do appcompat.
const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let g = fs.readFileSync(buildGradle, 'utf8');
  const linha = '    implementation "androidx.core:core:$androidxCoreVersion"\n';
  if (!g.includes(linha.trim())) {
    g = g.replace(
      '    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"\n',
      '    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"\n' + linha
    );
    fs.writeFileSync(buildGradle, g, 'utf8');
  }
}

console.log('limpar-cache-atualizacao: MainActivity.java agora limpa o cache e reserva as barras do sistema na mão.');
