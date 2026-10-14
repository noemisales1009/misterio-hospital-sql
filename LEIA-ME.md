# 🕵️‍♀️ Mistério no Hospital SQL

Jogo de detetive para aprender SQL usando o Supabase.
Alguém desligou a geladeira de vacinas da Sala de Vacinas, e você descobre quem foi fazendo consultas SQL.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `guia.html` | O jogo: as fases, explicações, missões, dicas e soluções. Abra no navegador. |
| `banco_do_jogo.sql` | O banco de dados do mistério. Vai no Supabase. |
| `index.html` | Redireciona para o `guia.html` (página inicial da hospedagem). |
| `css/estilo.css` | Visual do guia. |
| `js/app.js` | Progresso, sincronização com o Supabase e botões de copiar. |
| `js/mermaid-init.js` | Liga os diagramas. |
| `progresso.sql` | Só a tabela de progresso (já está dentro do `banco_do_jogo.sql`). |
| `package.json` | Para hospedagens que pedem Node.js. `npm install` e `npm start` abrem em http://localhost:3000. |
| `LEIA-ME.md` | Este arquivo. |

## Como começar

1. **Abra o guia:** dê dois cliques em `guia.html`. Ele abre no navegador.
2. **Crie um projeto novo** em https://supabase.com/dashboard (por exemplo, "misterio-sql").
3. No Supabase, vá em **SQL Editor → New query**.
4. Abra `banco_do_jogo.sql` (no Bloco de Notas ou VS Code), copie tudo, cole no editor e clique em **Run**.
5. Deve aparecer: `✅ Jogo instalado!`
6. Volte para o guia e comece pela **Fase 1**.

## As fases

| Fase | Você aprende |
|---|---|
| 0 | Instalar o banco e ler o mapa das tabelas |
| 1 | `SELECT`, `FROM`, `LIMIT`, `COUNT` |
| 2 | `WHERE`, `AND`, `OR` |
| 3 | `LIKE`, `%`, `ORDER BY`, `DESC` |
| 4 | `JOIN`, `IN` |
| 5 | Vários filtros juntos |
| 6 | `JOIN` de 4 tabelas e conferir o culpado |
| ★ | `BETWEEN`, `GROUP BY`, `HAVING` |
| ✎ | `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE` |
| A | `DISTINCT`, `MIN`, `MAX`, `AVG`, `SUM`, `ROUND` |
| B | Subconsultas: `IN (SELECT …)` e `= (SELECT …)` |
| C | `CASE WHEN … THEN … ELSE … END` |
| D | `LEFT JOIN` e `IS NULL` |

## Conferir a resposta

No SQL Editor do Supabase:

```sql
SELECT verificar_solucao('Nome Completo');
```

## Bom saber

- O progresso das fases (os ✅) fica salvo no navegador onde você abriu o guia.
- **Salvar na nuvem, com login (opcional):** rode o `banco_do_jogo.sql` atualizado, que cria a tabela `progresso` com regras por usuário. No guia, clique em **☁ Salvar na nuvem**, cole a *Project URL* e a chave *anon*, e depois **crie uma conta** (e-mail e senha) ou entre. Cada pessoa vê e altera só o próprio progresso. Nunca use a chave `service_role`.
- **Confirmação de e-mail:** por padrão o Supabase pede para confirmar o e-mail antes do primeiro login. Para testar sem isso, desligue em Authentication → Providers → Email → *Confirm email*.
- **Atualizando de uma versão antiga:** a tabela `progresso` sem login é recriada automaticamente ao rodar o SQL. O progresso de teste anterior é descartado.
- Para recomeçar o jogo do zero, rode `banco_do_jogo.sql` de novo. Sua tabela `caderno` não é apagada.
- O guia precisa de internet só para as fontes e os diagramas. Sem internet, ele funciona com letras e diagramas mais simples.
- Personagens e dados são fictícios. Inspirado no SQL Murder Mystery do Knight Lab.

## Variáveis de ambiente (hospedagem Node.js)

Para o guia já abrir conectado ao Supabase, sem colar a chave em cada navegador, defina na hospedagem:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
| `SUPABASE_ANON_KEY` | a chave **anon / public** (nunca a `service_role`) |

Comando de build: `npm run build` (gera `js/config.js`). Comando de início: `npm start`.
Sem as variáveis, o guia funciona igual, e o botão **☁ Salvar na nuvem** permite conectar na mão.
