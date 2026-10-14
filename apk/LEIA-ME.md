# Aplicativo Android (APK)

O APK é o mesmo jogo, empacotado com [Capacitor](https://capacitorjs.com). Tudo fica dentro do aplicativo, então ele **funciona sem internet** (o computador da investigação, os diagramas e as fontes já estão no projeto). Login e salvar na nuvem continuam precisando de internet.

## Como baixar e instalar (Android 7 ou mais novo)

1. No celular, abra: **https://github.com/noemisales1009/misterio-hospital-sql/releases/tag/apk-mais-recente**
2. Toque em **misterio-sql.apk** para baixar.
3. Abra o arquivo baixado. O Android vai pedir para permitir instalar de "fontes desconhecidas" para o navegador ou gerenciador de arquivos: permita.
4. Instale e abra o **Mistério SQL**.

O APK novo instala por cima do antigo e mantém o progresso salvo no aparelho (a assinatura é sempre a mesma).

## Como o APK é gerado

Sozinho, pelo GitHub (`.github/workflows/apk.yml`). A cada envio para a `main` que mexa no jogo, ele compila e atualiza a página **Releases**. Para gerar na mão: aba **Actions** > **Gerar APK** > **Run workflow**. Leva uns 5 a 10 minutos.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `capacitor.config.json` | Nome, identificador e ajustes do aplicativo. |
| `scripts/preparar-www.js` | Copia só o jogo (páginas, css, js, fontes, ícones, vendor) para `www/`. |
| `scripts/configurar-android.js` | Define assinatura e número da versão no projeto Android. |
| `assets/` | Ícone, ícone adaptativo e tela de abertura. |
| `keystore/misterio-sql.p12` | Chave de assinatura (veja o aviso abaixo). |

`www/` e `android/` são gerados a cada compilação e não vão para o Git.

## Aviso sobre a chave de assinatura

A chave em `keystore/` está no repositório de propósito, para o APK novo poder atualizar o antigo. Isso serve para instalar direto (sideload). **Para publicar na Play Store** é preciso uma chave privada, que nunca fica no repositório, e a conta de desenvolvedora do Google.
