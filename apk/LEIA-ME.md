# Aplicativo Android (APK)

O APK é o mesmo jogo, empacotado com [Capacitor](https://capacitorjs.com). Tudo fica dentro do aplicativo, então ele **funciona sem internet** (o computador da investigação, os diagramas e as fontes já estão no projeto). Login e salvar na nuvem continuam precisando de internet.

## Como baixar e instalar (Android 7 ou mais novo)

1. No celular, abra: **https://linen-crab-866348.hostingersite.com/misterio-sql.apk** (o arquivo fica no próprio site do jogo).
2. Espere o download terminar.
3. Abra o arquivo baixado. O Android vai pedir para permitir instalar de "fontes desconhecidas" para o navegador ou gerenciador de arquivos: permita.
4. Instale e abra o **Mistério SQL**.

O APK novo instala por cima do antigo e mantém o progresso salvo no aparelho, desde que a chave de assinatura seja a mesma. Em 16/10/2026 a chave foi trocada (a antiga tinha ficado pública): quem tinha a versão anterior precisa desinstalar e instalar de novo uma vez.

## Como o APK é gerado

Pelo GitHub (`.github/workflows/apk.yml`), que compila, assina e **envia o arquivo para o site por FTP**. Nada do APK fica no GitHub. O fluxo está **desligado** desde 16/10/2026; para religar: aba **Actions** > **Gerar APK** > **Enable workflow**. Antes disso, os segredos abaixo precisam existir em **Settings > Secrets and variables > Actions**:

| Segredo | O que é |
|---|---|
| `APK_KEYSTORE_B64` | a chave de assinatura (`misterio-sql-2026.p12`) em base64, conteúdo do arquivo `.p12.b64` |
| `APK_KEYSTORE_SENHA` | a senha dessa chave |
| `FTP_HOST`, `FTP_USUARIO`, `FTP_SENHA` | a conta FTP do site na Hostinger (hPanel > Arquivos > Contas FTP) |
| `FTP_PASTA` | opcional; pasta do site no FTP (padrão `public_html`) |

A chave e a senha ficam no computador da Noemi, na pasta `chave-apk/` ao lado do projeto (fora do repositório). Leva uns 5 a 10 minutos por APK.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `capacitor.config.json` | Nome, identificador e ajustes do aplicativo. |
| `scripts/preparar-www.js` | Copia só o jogo (páginas, css, js, fontes, ícones, vendor) para `www/`. |
| `scripts/configurar-android.js` | Define assinatura e número da versão no projeto Android. |
| `assets/` | Ícone, ícone adaptativo e tela de abertura. |

`www/` e `android/` são gerados a cada compilação e não vão para o Git.

## Aviso sobre a chave de assinatura

A chave de assinatura **nunca** fica no repositório: ela entra na compilação pelos segredos do GitHub e é apagada no fim. Quem tiver a chave consegue assinar um aplicativo que o Android aceita como atualização do seu. **Para publicar na Play Store** é preciso, além disso, a conta de desenvolvedora do Google.

## Ícone e assinatura (importante)

- Os ícones do launcher são gerados por `scripts/icones-android.py` nos tamanhos que o Android espera (camadas de 108 dp por densidade). Foi esse o formato que apareceu direito no celular.
- O APK é compilado sem assinatura, alinhado com `zipalign` e assinado com `apksigner` (esquemas v1, v2 e v3), igual ao que foi feito à mão no computador.
- O `versionCode` é 10 + o número da execução, então cada APK novo atualiza o anterior.
