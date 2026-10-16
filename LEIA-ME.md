# 🕵️ Mistério no Hospital SQL

Jogo de detetive para aprender SQL usando o Supabase. São catorze casos, do mais simples ao mais exigente, todos com dados fictícios de um hospital.

Aplicativo criado por Noemi Sales.

## Os casos

| Caso | História | Nível | O que você pratica | Arquivos |
|---|---|---|---|---|
| 1 | A geladeira de vacinas | Iniciante, ensina do zero (16 fases) | `SELECT`, `WHERE`, `LIKE`, `JOIN`, `GROUP BY`, `CASE`, `LEFT JOIN`; nas fases E a G, criar e organizar um banco do zero: `CREATE TABLE`, `PRIMARY KEY`, `FOREIGN KEY`, `ALTER TABLE`, índice e view | `guia.html` e `banco_do_jogo.sql` |
| 2 | O prontuário adulterado | Intermediário | `JOIN` de várias tabelas, `LEFT JOIN`, `HAVING` | `caso2.html` e `caso2.sql` |
| 3 | O sumiço da morfina | Intermediário | `SUM`, `IS NULL`, `CASE`, `HAVING` | `caso3.html` e `caso3.sql` |
| 4 | O surto na UTI | Intermediário | datas, `WITH`, taxa de ataque | `caso4.html` e `caso4.sql` |
| 5 | A conta que não fecha | Avançado | `WITH`, `UNION ALL`, anomalias | `caso5.html` e `caso5.sql` |
| 6 | A cadeia de frio | Avançado | `LAG`, `LEAD`, `ROW_NUMBER` | `caso6.html` e `caso6.sql` |
| 7 | O paciente em dobro | Intermediário | `TRIM`, `REPLACE`, `COALESCE`, `NULLIF`, `CAST`/`::` | `caso7.html` e `caso7.sql` |
| 8 | As horas extras | Avançado | `EXTRACT`, `DATE_TRUNC`, `RANK`, `SUM() OVER`, `NOT EXISTS` | `caso8.html` e `caso8.sql` |
| 9 | O prontuário espiado | Segurança (LGPD) | auditoria de acessos, anti-join, mascarar dado sensível | `caso9.html` e `caso9.sql` |
| 10 | A invasão | Segurança | SQL injection, `GRANT`/`REVOKE`, RLS | `caso10.html` e `caso10.sql` |
| 11 | A fila furada | Avançado | intervalos e `EXTRACT(EPOCH)`, `PERCENTILE_CONT` (mediana, P90), `NTILE`, `generate_series` | `caso11.html` e `caso11.sql` |
| 12 | O lote que sumiu | Avançado | `WITH RECURSIVE`, `UNION ALL`, caminho com `||`, `ARRAY`/`= ANY` (evitar ciclo), hierarquia | `caso12.html` e `caso12.sql` |
| 13 | A dose reprogramada | Avançado | JSON: `jsonb`, `->`/`->>`, `#>>`, `?`, `@>`, `jsonb_array_elements`, `jsonb_object_keys` | `caso13.html` e `caso13.sql` |
| 14 | O banco que se corrigia sozinho | Avançado | `INSERT`, `UPDATE`/`DELETE … WHERE`, `RETURNING`, `BEGIN`/`ROLLBACK`, gatilhos (`CREATE TRIGGER`, `pg_trigger`) | `caso14.html` e `caso14.sql` |

Cada caso tem as **próprias tabelas**, então os catorze cabem no mesmo projeto do Supabase. As fases abrem em sequência: a próxima só libera quando a anterior é concluída, e uma fase abre por vez.

Os casos 9 e 10 são sobre **segurança**: investigar quem acessou dado sensível sem motivo (Caso 9) e reconstruir um ataque de SQL injection, com as defesas de menor privilégio e RLS (Caso 10). No Caso 10, comandos como `GRANT`, `REVOKE` e `CREATE POLICY` aparecem como exemplo para copiar e rodar à parte no computador da fase — eles não entram nas missões corrigidas automaticamente, porque mudam o banco e precisam ser vistos em ação, não só comparados.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `index.html` | Página inicial: escolha do caso, nome e botão "continuar de onde parei". |
| `guia.html`, `caso2.html` … `caso14.html` | Os casos: explicações, missões, dicas e soluções. |
| `banco_do_jogo.sql`, `caso2.sql` … `caso14.sql` | Os bancos de dados de cada caso. Vão no SQL Editor do Supabase. |
| `progresso.sql` | Só as tabelas da conta: progresso, perfil e anotações. Já está dentro do `banco_do_jogo.sql`. |
| `css/estilo.css` | Visual. |
| `js/app.js` | Fases em sequência, progresso, login e sincronização com o Supabase. |
| `js/caderno.js` | Caderno do detetive: perfil, foto, evolução, diário de missões e anotações. |
| `js/catalogo.js` | Lista de casos e fases do caderno. Gerado por `scripts/gerar-catalogo.js`. |
| `js/tema.js` | Modo claro e escuro. |
| `js/mermaid-init.js` | Diagramas com zoom. |
| `package.json` | Para rodar localmente e para hospedagens com Node.js. |

## Como começar

1. **Abra a página inicial** (`index.html`) e informe o seu nome no pop-up da primeira entrada. Se quiser, adicione uma foto.
2. **Crie um projeto** em https://supabase.com/dashboard (por exemplo, "misterio-sql").
3. No Supabase, vá em **SQL Editor → New query**.
4. Abra o arquivo do caso (`banco_do_jogo.sql` para o Caso 1), copie tudo, cole no editor e clique em **Run**. Aparece `✅ ... instalado!`.
5. Volte para o guia e siga as fases. Para conferir o culpado:

```sql
SELECT verificar_solucao('Nome Completo');   -- Caso 1
SELECT verificar_caso2('Nome Completo');
SELECT verificar_caso3('Nome Completo');
SELECT verificar_caso4('CÓDIGO');
SELECT verificar_caso5('CÓDIGO');
SELECT verificar_caso6('Nome Completo');
SELECT verificar_caso7('Nome Completo');
SELECT verificar_caso8('Nome Completo');
SELECT verificar_caso9('Nome Completo');
SELECT verificar_caso10('Nome Completo');
SELECT verificar_caso11('Nome Completo');
SELECT verificar_caso12('Nome Completo');
SELECT verificar_caso13('Nome Completo');
SELECT verificar_caso14('Nome Completo');
```

## Salvar no Supabase, com conta

Sem conta, o progresso fica salvo só no navegador. Com conta, ficam no Supabase, e acompanham você em qualquer computador:

- **progresso** das fases;
- **perfil**: nome e foto;
- **anotações** do diário de missões.

Para ligar:

1. Rode o `progresso.sql` no SQL Editor (ou o `banco_do_jogo.sql` atualizado). Ele cria as três tabelas, cada uma com regras para que cada pessoa veja só os próprios dados.
2. No guia, clique no ícone de nuvem, cole a *Project URL* e a chave *anon*, e crie uma conta (e-mail e senha) ou entre.
3. Nunca use a chave `service_role` no guia.

**Confirmação de e-mail:** por padrão o Supabase pede para confirmar o e-mail antes do primeiro login. Para testar sem isso, desligue em Authentication → Providers → Email → *Confirm email*.

**Atualizando de uma versão antiga:** a tabela `progresso` sem login é recriada ao rodar o SQL, e o progresso de teste anterior é descartado.

## Rodar no computador

```powershell
cd caminho\da\pasta\do\projeto
npm install
npm run dev
```

Abra `http://localhost:3000`. Os comandos precisam ser rodados dentro da pasta onde está o `package.json`.

## Variáveis de ambiente

Para o guia já abrir conectado ao Supabase, sem colar a chave em cada navegador, defina na hospedagem ou num arquivo `.env` (que fica fora do Git):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_ANON_KEY` | a chave **anon / public** (nunca a `service_role`) |

Comando de build: `npm run build` (gera `js/config.js` e `js/catalogo.js`). Comando de início: `npm start`. Sem as variáveis, o guia funciona igual e permite conectar na mão.

## Bom saber

- O guia precisa de internet só para as fontes e os diagramas.
- Se você editar o conteúdo de uma fase, rode `npm run build` para atualizar o caderno.
- Personagens e dados são fictícios. Inspirado no SQL Murder Mystery do Knight Lab.

## Offline e aplicativo Android

- O jogo guarda o que precisa no aparelho (`sw.js`, gerado no `npm run build`) e funciona **sem internet** depois da primeira visita. No Chrome, aparece "Instalar app" / "Adicionar à tela inicial".
- O computador da investigação (PGlite), os diagramas (Mermaid) e as fontes ficam em `vendor/` e `fonts/`. Para atualizar o PGlite ou o Mermaid, troque os arquivos de `vendor/`.
- O **APK** para Android é gerado pelo GitHub: veja `apk/LEIA-ME.md`.
