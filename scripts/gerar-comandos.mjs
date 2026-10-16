// Gera js/comandos-dados.json: a explicação de cada etiqueta da aba "Comandos" do Caderno.
// Ao clicar numa etiqueta acesa, o Caderno abre um pop-up com "o que faz", "no hospital" e um exemplo.
//
// Antes de gravar, roda cada exemplo no banco do caso onde a etiqueta aparece (PGlite) e avisa se
// algum der erro ou voltar sem linhas. Os exemplos rodam dentro de uma transação desfeita no fim.
// Não faz parte do "npm run build": rode
//   node scripts/gerar-comandos.mjs
// depois de mudar um texto ou exemplo aqui, e então "npm run build".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PGlite } = await import(pathToFileURL(path.join(raiz, 'vendor/pglite/index.js')).href);

// Mesmas regras de js/caderno.js (CMD_IGNORAR e CMD_ALIAS): etiquetas que não são comandos
// ficam de fora, e duas grafias do mesmo conceito viram uma só.
const CMD_IGNORAR = { 'fechar o caso': 1, 'tudo junto': 1 };
const CMD_ALIAS = { subconsulta: 'SUBCONSULTA', length: 'LENGTH', 'ROW_NUMBER()': 'ROW_NUMBER', 'SUM() FILTER': 'SUM(…) FILTER' };

// ------------------------------------------------------------------ as explicações
// c(o, h, ex, extras): o = o que faz · h = no hospital · ex = exemplo (SQL) · extras: pre, nota, db
const c = (o, h, ex, extras) => ({ o, h, ...(ex ? { ex } : {}), ...(extras || {}) });

const CASO_FRASE = `SELECT cpf, renda_anual,
       CASE WHEN renda_anual > 100000 THEN 'alta'
            WHEN renda_anual > 50000  THEN 'média'
            ELSE 'baixa'
       END AS faixa
FROM renda
LIMIT 5;`;

const CADERNO = `CREATE TABLE caderno (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fase       integer,
  pista      text NOT NULL,
  suspeito   text,
  confirmada boolean DEFAULT false
);`;
const CADERNO_COM_LINHAS = CADERNO + `
INSERT INTO caderno (fase, pista) VALUES (2, 'Sabotagem na Sala de Vacinas'), (3, 'Testemunha 1 mora na última casa');`;
const NOTA_CADERNO = 'Rode antes o CREATE TABLE do caderno, na fase Extra.';

const DADOS = {
  // ---------- caso 1
  'Supabase': c(
    'O serviço na nuvem onde ficam as tabelas dos casos e a sua conta. Com ele você guarda o banco de dados sem instalar nada no computador.',
    'O armário de prontuários do hospital, só que guardado na nuvem.'),
  'SQL Editor': c(
    'A tela do Supabase onde você escreve os comandos SQL e aperta Run. Foi nela que você montou o laboratório de cada caso.',
    'O balcão onde você faz o pedido ao arquivo: “me traz as fichas de...”.',
    `SELECT COUNT(*)
FROM pessoa;`),
  'SELECT': c(
    'Escolhe quais colunas você quer ver. Todo comando de consulta começa com ele. O asterisco (*) quer dizer “todas as colunas”.',
    'Escolher quais campos da ficha ler: só o nome, ou o nome e o CPF.',
    `SELECT nome, cpf
FROM pessoa
LIMIT 5;`),
  'FROM': c(
    'Diz de qual tabela os dados vêm. Sem o FROM, o banco não sabe onde procurar.',
    'Dizer em qual gaveta do arquivo você vai procurar.',
    `SELECT *
FROM habilitacao
LIMIT 3;`),
  'LIMIT': c(
    'Mostra só as primeiras linhas do resultado. Ótimo para espiar uma tabela enorme sem despejar tudo na tela.',
    'Folhear só as 5 primeiras fichas da gaveta, em vez de tirar todas.',
    `SELECT nome
FROM pessoa
LIMIT 5;`),
  'COUNT': c(
    'Conta quantas linhas existem. COUNT(*) conta todas as linhas do resultado.',
    'Contar quantas fichas tem na gaveta, sem ler uma por uma.',
    `SELECT COUNT(*)
FROM pessoa;`),
  'WHERE': c(
    'Filtra: só ficam as linhas que obedecem à condição.',
    'Separar só as fichas que combinam com o que você procura, como “ocorrências de sabotagem”.',
    `SELECT *
FROM relatorio_ocorrencia
WHERE tipo = 'sabotagem';`),
  'AND': c(
    'Junta condições: a linha só entra se todas forem verdadeiras ao mesmo tempo.',
    'Sabotagem E na Sala de Vacinas: tem que ser as duas coisas.',
    `SELECT *
FROM relatorio_ocorrencia
WHERE tipo = 'sabotagem'
  AND setor = 'Sala de Vacinas';`),
  'OR': c(
    'Junta condições de outro jeito: basta uma ser verdadeira para a linha entrar.',
    '“Rua das Acácias OU Avenida dos Ipês”: serve quem mora em qualquer uma das duas.',
    `SELECT nome, rua_endereco
FROM pessoa
WHERE rua_endereco = 'Rua das Acácias'
   OR rua_endereco = 'Avenida dos Ipês'
LIMIT 10;`),
  'LIKE': c(
    'Procura texto por pedaço, em vez de pedir o valor inteiro. Combina com o curinga %.',
    'Lembrar só o começo do nome (“Lorena...”) e pedir todas as fichas que começam assim.',
    `SELECT nome
FROM pessoa
WHERE nome LIKE 'Lorena%';`),
  '%': c(
    'O curinga do LIKE: ocupa o lugar de qualquer quantidade de letras, até nenhuma. Pode ficar no começo, no fim ou nos dois lados.',
    'Escrever “Lorena” e um risquinho no resto do nome, que o banco completa.',
    `SELECT nome
FROM pessoa
WHERE nome LIKE '%Brandão';`),
  'ORDER BY': c(
    'Coloca o resultado em ordem, de A a Z ou do menor para o maior. Sem ele, a ordem não é garantida.',
    'Organizar as fichas pelo número da casa antes de entregar a pilha.',
    `SELECT nome, numero_endereco
FROM pessoa
WHERE rua_endereco = 'Rua das Acácias'
ORDER BY numero_endereco
LIMIT 5;`),
  'DESC': c(
    'Inverte a ordem do ORDER BY: do maior para o menor (decrescente). O padrão, do menor para o maior, é ASC.',
    'Começar a pilha pela ficha com o número de casa mais alto.',
    `SELECT nome, numero_endereco
FROM pessoa
WHERE rua_endereco = 'Rua das Acácias'
ORDER BY numero_endereco DESC
LIMIT 1;`),
  'JOIN': c(
    'Junta duas tabelas pelas linhas que combinam. É assim que você liga a pessoa ao depoimento dela.',
    'Grampear a ficha da pessoa na ficha do depoimento, pelo número que as duas têm em comum.',
    `SELECT p.nome, d.transcricao
FROM pessoa p
JOIN depoimento d ON d.pessoa_id = p.id
LIMIT 3;`),
  'ON': c(
    'Diz como as tabelas se ligam no JOIN: qual coluna de uma é igual a qual coluna da outra.',
    'O número do grampo: “o habilitacao_id da pessoa é o id da habilitação”.',
    `SELECT p.nome, h.placa
FROM pessoa p
JOIN habilitacao h ON h.id = p.habilitacao_id
LIMIT 5;`),
  'IN': c(
    'Testa se o valor está numa lista. É um OR resumido.',
    '“Mora em alguma destas ruas?”: uma pergunta só, em vez de várias.',
    `SELECT nome
FROM pessoa
WHERE rua_endereco IN ('Rua das Acácias', 'Avenida dos Ipês')
LIMIT 5;`),
  'JOIN + LIKE + vários filtros': c(
    'Juntar tudo o que você aprendeu: ligar tabelas com JOIN e filtrar com LIKE, = e outras condições no mesmo WHERE.',
    'Pegar a ficha do sócio da academia e a do check-in, e ficar só com o plano ouro do dia 09/03.',
    `SELECT m.id, m.nome, m.plano
FROM academia_membro m
JOIN academia_checkin c ON c.membro_id = m.id
WHERE m.id LIKE '48Z%'
  AND m.plano = 'ouro'
  AND c.data = 20260309;`),
  'JOIN de 4 tabelas': c(
    'Dá para encadear vários JOIN, um depois do outro. Cada JOIN liga uma tabela nova à cadeia.',
    'Seguir o fio: da pessoa para a habilitação, para a academia e para o check-in.',
    `SELECT p.nome, h.placa, m.plano
FROM pessoa p
JOIN habilitacao h ON h.id = p.habilitacao_id
JOIN academia_membro m ON m.pessoa_id = p.id
JOIN academia_checkin c ON c.membro_id = m.id
WHERE c.data = 20260309
LIMIT 5;`),
  'verificar_solucao': c(
    'Função do próprio jogo: você passa o nome de quem acha que é o culpado e ela diz se acertou.',
    'Entregar o nome ao delegado e esperar o veredito.',
    `SELECT verificar_solucao('Nome Completo');`,
    { nota: 'Troque Nome Completo pelo nome que você descobriu.', semLinhas: true }),
  'BETWEEN': c(
    'Filtra valores dentro de um intervalo, incluindo os dois extremos. No Caso 1 as datas são números, como 20260310.',
    '“Entre 1º e 15 de março”: as fichas com data dentro dessa janela.',
    `SELECT COUNT(*)
FROM evento_checkin
WHERE data BETWEEN 20260301 AND 20260315;`),
  'GROUP BY': c(
    'Agrupa as linhas que têm o mesmo valor e deixa você calcular um resultado por grupo, com COUNT, SUM, AVG...',
    'Separar as fichas em pilhas por rua e contar quantas tem em cada pilha.',
    `SELECT rua_endereco, COUNT(*) AS moradores
FROM pessoa
GROUP BY rua_endereco
ORDER BY moradores DESC
LIMIT 5;`),
  'HAVING': c(
    'Filtra os grupos depois de contados. O WHERE filtra linhas antes de agrupar; o HAVING filtra os grupos prontos.',
    'Das pilhas por rua, ficar só com as que têm mais de 58 fichas.',
    `SELECT rua_endereco, COUNT(*) AS moradores
FROM pessoa
GROUP BY rua_endereco
HAVING COUNT(*) > 58
ORDER BY moradores DESC;`),
  'CREATE TABLE': c(
    'Cria uma tabela nova e vazia, dizendo o nome de cada coluna e o tipo de dado que cabe nela.',
    'Imprimir um formulário em branco.',
    CADERNO,
    { semLinhas: true }),
  'INSERT': c(
    'Coloca uma linha nova na tabela. Você diz as colunas e os valores; o que você não preenche, o banco completa com o padrão.',
    'Preencher uma ficha nova e guardar na gaveta.',
    `INSERT INTO caderno (fase, pista)
VALUES (2, 'Sabotagem na Sala de Vacinas');`,
    { pre: CADERNO, nota: NOTA_CADERNO, semLinhas: true }),
  'UPDATE': c(
    'Muda dados de linhas que já existem. Use sempre com WHERE: sem ele, o banco muda todas as linhas.',
    'Corrigir a ficha a caneta, só a do paciente certo.',
    `UPDATE caderno
SET confirmada = true
WHERE id = 1;`,
    { pre: CADERNO_COM_LINHAS, nota: NOTA_CADERNO, semLinhas: true }),
  'DELETE': c(
    'Apaga linhas. Use sempre com WHERE: um DELETE sozinho apaga todas as linhas da tabela, e não tem desfazer.',
    'Rasgar uma ficha errada.',
    `DELETE FROM caderno
WHERE id = 2;`,
    { pre: CADERNO_COM_LINHAS, nota: NOTA_CADERNO, semLinhas: true }),
  'DISTINCT': c(
    'Tira as repetições: cada valor aparece uma vez só.',
    '“Quais ruas existem?”, sem repetir a mesma rua mil vezes.',
    `SELECT DISTINCT rua_endereco
FROM pessoa;`),
  'MIN': c(
    'Devolve o menor valor da coluna.',
    'Achar a menor renda da lista.',
    `SELECT MIN(renda_anual)
FROM renda;`),
  'MAX': c(
    'Devolve o maior valor da coluna.',
    'Achar a maior renda da lista.',
    `SELECT MAX(renda_anual)
FROM renda;`),
  'AVG': c(
    'Calcula a média: soma tudo e divide pela quantidade de linhas.',
    'Somar as idades de todas as fichas e dividir pelo número de fichas.',
    `SELECT AVG(idade)
FROM habilitacao;`),
  'SUM': c(
    'Soma os valores da coluna.',
    'O total de uma coluna, como o rodapé de uma planilha.',
    `SELECT SUM(renda_anual)
FROM renda;`),
  'ROUND': c(
    'Arredonda um número para a quantidade de casas decimais que você pedir.',
    'Arredondar a média da idade para uma casa só, para ficar legível no relatório.',
    `SELECT ROUND(AVG(idade), 1) AS idade_media
FROM habilitacao;`),
  'SUBCONSULTA': c(
    'Um SELECT dentro de outro. O de dentro roda primeiro, e o resultado dele vira parte do filtro do de fora.',
    'Perguntar primeiro “qual é a renda média?” e depois usar essa resposta para filtrar quem ganha acima dela.',
    `SELECT COUNT(*)
FROM renda
WHERE renda_anual > (SELECT AVG(renda_anual) FROM renda);`),
  '= (SELECT …)': c(
    'Compara uma coluna com o resultado de uma subconsulta que devolve um único valor, como um MAX ou um AVG.',
    '“Quem tem a maior renda?”: primeiro descobre o valor, depois acha a ficha dele.',
    `SELECT cpf, renda_anual
FROM renda
WHERE renda_anual = (SELECT MAX(renda_anual) FROM renda);`),
  'CASE': c(
    'Cria uma coluna nova a partir de regras, como um “se isso, então aquilo”. Começa com CASE e termina com END.',
    'Carimbar cada ficha como “alta”, “média” ou “baixa” conforme a renda.',
    CASO_FRASE),
  'WHEN': c(
    'Dentro do CASE, é a condição a testar. Os WHEN são testados em ordem, e vale o primeiro que for verdadeiro.',
    'A pergunta do carimbo: “a renda passa de 100 mil?”.',
    CASO_FRASE),
  'THEN': c(
    'O resultado que o CASE devolve quando o WHEN dele é verdadeiro.',
    'O carimbo que vai na ficha quando a resposta é sim.',
    CASO_FRASE),
  'ELSE': c(
    'O resultado para quem não passou em nenhum WHEN. Se você esquecer o ELSE, essas linhas ficam com NULL.',
    'O carimbo padrão, para todo o resto das fichas.',
    CASO_FRASE),
  'END': c(
    'Fecha o CASE. Sem o END o banco acusa erro de escrita.',
    'O ponto final da regra do carimbo.',
    CASO_FRASE),
  'LEFT JOIN': c(
    'Como o JOIN, mas mantém todas as linhas da tabela da esquerda, mesmo as que não têm par na da direita. Os campos da direita vêm como NULL.',
    'Listar todas as pessoas, tendo ou não ficha de renda.',
    `SELECT p.nome, r.renda_anual
FROM pessoa p
LEFT JOIN renda r ON r.cpf = p.cpf
LIMIT 5;`),
  'IS NULL': c(
    'Testa se o campo está vazio (NULL). Não se escreve = NULL: o certo é IS NULL.',
    'Achar quem ficou de fora: o sócio da academia que nunca fez check-in.',
    `SELECT m.nome
FROM academia_membro m
LEFT JOIN academia_checkin c ON c.membro_id = m.id
WHERE c.membro_id IS NULL
LIMIT 5;`),
  // ---------- caso 2
  'JOIN de 3 tabelas': c(
    'Três tabelas ligadas em cadeia. A do meio guarda os números que apontam para as outras duas.',
    'O registro de acesso aponta para o funcionário e para o prontuário, e você precisa das duas fichas ao mesmo tempo.',
    `SELECT f.nome, a.acao, pr.codigo
FROM acesso_prontuario a
JOIN funcionario f ON f.id = a.funcionario_id
JOIN prontuario pr ON pr.id = a.prontuario_id
LIMIT 5;`),
  'JOIN com condição dupla': c(
    'O ON pode ter mais de uma condição, ligadas com AND. As linhas só combinam se todas forem verdadeiras.',
    'Casar o registro da porta com o plantão: o mesmo funcionário E o mesmo dia.',
    `SELECT l.id, l.local, pl.turno
FROM porta_log l
JOIN plantao pl ON pl.funcionario_id = l.funcionario_id
               AND pl.data = l.data
LIMIT 5;`),
  'NOT': c(
    'Inverte uma condição. NOT IN, NOT LIKE e NOT BETWEEN fazem o contrário dos originais.',
    '“Quem NÃO é médico?”.',
    `SELECT nome, cargo
FROM funcionario
WHERE NOT cargo = 'Médico';`),
  'COUNT(DISTINCT)': c(
    'Conta quantos valores diferentes existem, sem contar os repetidos.',
    '“Em quantos dias diferentes ele passou pela porta?”, e não quantas vezes.',
    `SELECT funcionario_id, COUNT(DISTINCT data) AS dias_diferentes
FROM porta_log
GROUP BY funcionario_id
ORDER BY dias_diferentes DESC
LIMIT 5;`),
  // ---------- caso 3
  'comparar colunas': c(
    'Comparar uma coluna com outra, em vez de comparar com um valor fixo. Funciona entre tabelas ligadas por JOIN.',
    'Conferir se o que foi retirado é maior do que o médico prescreveu.',
    `SELECT m.id, m.quantidade AS retirou, r.quantidade AS prescrito
FROM movimento_estoque m
JOIN receita r ON r.id = m.receita_id
WHERE m.quantidade > r.quantidade
LIMIT 5;`),
  // ---------- caso 4
  'BETWEEN com datas': c(
    'Com colunas do tipo data, o BETWEEN pega do dia inicial ao final. Escreva as datas entre aspas, no formato AAAA-MM-DD.',
    'Culturas coletadas entre 1º e 31 de agosto.',
    `SELECT id, data_coleta, germe
FROM cultura
WHERE data_coleta BETWEEN '2026-08-01' AND '2026-08-31'
LIMIT 5;`),
  'JOIN por intervalo de datas': c(
    'Em vez de ligar por igualdade, liga pela data cair dentro de um período: entrada ≤ data ≤ saída. Se a saída é NULL, a pessoa ainda está internada.',
    'Descobrir em que leito o paciente estava no dia da coleta.',
    `SELECT c.paciente_id, c.data_coleta, i.setor, i.leito
FROM cultura c
JOIN internacao i
  ON i.paciente_id = c.paciente_id
 AND c.data_coleta >= i.data_entrada
 AND (i.data_saida IS NULL OR c.data_coleta <= i.data_saida)
LIMIT 5;`),
  'WITH': c(
    'Dá um nome a uma consulta temporária (CTE) e deixa você usá-la logo abaixo como se fosse uma tabela. Quebra consultas grandes em passos fáceis de ler.',
    'Fazer um rascunho num papel à parte antes de montar o relatório final.',
    `WITH positivas AS (
  SELECT paciente_id, data_coleta
  FROM cultura
  WHERE resultado = 'positivo'
)
SELECT COUNT(*) AS casos
FROM positivas;`),
  'JOIN por intervalo': c(
    'A mesma ideia do JOIN por intervalo de datas: a ligação é por “cai dentro do período”, e não por igualdade.',
    'Cruzar o uso do equipamento com a internação do paciente naquele dia.',
    `SELECT u.equipamento_id, u.data, i.setor
FROM uso_equipamento u
JOIN internacao i
  ON i.paciente_id = u.paciente_id
 AND u.data >= i.data_entrada
 AND (i.data_saida IS NULL OR u.data <= i.data_saida)
LIMIT 5;`),
  // ---------- caso 5
  'numeric': c(
    'Tipo de número com casas decimais exatas, ideal para dinheiro. Dá para arredondar com ROUND(valor, 2). O valor_cobrado das cobranças é numeric.',
    'A calculadora do caixa, que mostra os centavos certinhos.',
    `SELECT 10::numeric / 3 AS sem_arredondar,
       ROUND(10::numeric / 3, 2) AS arredondado;`),
  'NOT IN (SELECT MIN)': c(
    'Para achar repetidos: o MIN(id) de cada grupo é a linha “original”, e o NOT IN pega todas as outras, que são as cópias.',
    'Guardar a primeira ficha de cada grupo e separar as repetidas para conferir.',
    `SELECT id, atendimento_id, procedimento_id
FROM cobranca
WHERE id NOT IN (
  SELECT MIN(id)
  FROM cobranca
  GROUP BY atendimento_id, procedimento_id
);`),
  'IS NULL com 2 colunas': c(
    'Quando o par é formado por duas colunas (atendimento e procedimento), o LEFT JOIN liga as duas no ON. Quem ficou sem par vem com NULL do outro lado.',
    'Cobrança sem execução correspondente: cobraram, mas ninguém fez.',
    `SELECT c.id, c.atendimento_id, c.procedimento_id
FROM cobranca c
LEFT JOIN execucao e
  ON e.atendimento_id = c.atendimento_id
 AND e.procedimento_id = c.procedimento_id
WHERE e.atendimento_id IS NULL
LIMIT 5;`),
  'UNION ALL': c(
    'Empilha os resultados de dois SELECT, um embaixo do outro. As colunas precisam combinar em quantidade e tipo. O UNION ALL mantém os repetidos; o UNION tira.',
    'Juntar duas listas de ocorrências numa só.',
    `SELECT 'cobrada em dobro' AS erro, id
FROM cobranca
WHERE id NOT IN (SELECT MIN(id) FROM cobranca GROUP BY atendimento_id, procedimento_id)
UNION ALL
SELECT 'acima da tabela', c.id
FROM cobranca c
JOIN procedimento p ON p.id = c.procedimento_id
WHERE c.valor_cobrado > p.valor_tabela * c.quantidade;`),
  // ---------- caso 6
  'LAG': c(
    'Olha a linha anterior (dentro de uma janela com OVER) e traz o valor dela para a linha atual.',
    'Comparar a temperatura de agora com a da leitura anterior.',
    `SELECT geladeira_id, momento, temperatura,
       LAG(temperatura) OVER (PARTITION BY geladeira_id ORDER BY momento) AS anterior
FROM leitura
LIMIT 5;`),
  'OVER': c(
    'Transforma uma função (AVG, SUM, LAG, ROW_NUMBER...) em função de janela: ela calcula olhando um conjunto de linhas, mas sem juntar tudo numa linha só.',
    'Calcular a média da geladeira e escrever ao lado de cada leitura, sem perder as leituras.',
    `SELECT geladeira_id, momento, temperatura,
       AVG(temperatura) OVER (PARTITION BY geladeira_id) AS media_da_geladeira
FROM leitura
LIMIT 5;`),
  'PARTITION BY': c(
    'Dentro do OVER, divide as linhas em grupos. O cálculo recomeça do zero em cada grupo.',
    'Contar as leituras geladeira por geladeira, recomeçando em cada uma.',
    `SELECT geladeira_id, momento,
       ROW_NUMBER() OVER (PARTITION BY geladeira_id ORDER BY momento) AS n
FROM leitura
LIMIT 6;`),
  'ROW_NUMBER': c(
    'Numera as linhas: 1, 2, 3... na ordem que você pedir. Com PARTITION BY, recomeça do 1 em cada grupo.',
    'Numerar as leituras na ordem em que foram feitas.',
    `SELECT id, momento,
       ROW_NUMBER() OVER (ORDER BY momento) AS n
FROM leitura
LIMIT 5;`),
  'ilhas': c(
    'Técnica para achar sequências seguidas (“ilhas”) no meio dos dados. Ao subtrair dois ROW_NUMBER, linhas seguidas ganham o mesmo número de grupo, e aí dá para agrupar.',
    'Descobrir por quanto tempo a geladeira ficou seguidamente acima de 8 °C.',
    `SELECT geladeira_id, MIN(momento) AS inicio, MAX(momento) AS fim
FROM (
  SELECT geladeira_id, momento, temperatura,
         ROW_NUMBER() OVER (PARTITION BY geladeira_id ORDER BY momento)
       - ROW_NUMBER() OVER (PARTITION BY geladeira_id, (temperatura > 8) ORDER BY momento) AS grupo
  FROM leitura
) t
WHERE temperatura > 8
GROUP BY geladeira_id, grupo
ORDER BY inicio
LIMIT 5;`),
  'MAX − MIN': c(
    'A diferença entre o maior e o menor valor. Com datas e horas, dá a duração do período.',
    'Do primeiro alerta ao último: quanto tempo durou a excursão.',
    `SELECT geladeira_id, MAX(momento) - MIN(momento) AS duracao
FROM leitura
GROUP BY geladeira_id;`),
  'INTERVAL': c(
    'Um período de tempo para somar ou subtrair de datas e horas, como INTERVAL \'10 minutes\'.',
    'Perguntar “o que aconteceu nos 10 minutos antes?”.',
    `SELECT momento,
       momento - INTERVAL '10 minutes' AS dez_minutos_antes
FROM leitura
LIMIT 3;`),
  'timestamp': c(
    'Tipo que guarda data e hora juntas. Dá para subtrair dois timestamp e comparar o resultado com um INTERVAL.',
    'O carimbo de data e hora da ficha.',
    `SELECT MIN(momento) AS primeira_leitura,
       MAX(momento) AS ultima_leitura
FROM leitura;`),
  'LEAD': c(
    'O contrário do LAG: traz o valor da próxima linha.',
    'Olhar o que aconteceu logo depois: quando a porta abriu, ela fechou em seguida?',
    `SELECT geladeira_id, momento, evento,
       LEAD(evento) OVER (PARTITION BY geladeira_id ORDER BY momento) AS proximo_evento
FROM evento_porta
LIMIT 5;`),
  'IS DISTINCT FROM': c(
    'Compara dois valores tratando NULL como um valor comum. Com <> um NULL nunca é “diferente”; com IS DISTINCT FROM, é.',
    'Considerar “sem registro depois” como uma resposta de verdade, e não como dúvida. Na última porta aberta, o LEAD devolve NULL.',
    `SELECT NULL <> 'fechou'                AS com_diferente,
       NULL IS DISTINCT FROM 'fechou' AS com_is_distinct;`,
    { nota: 'Com <> o resultado é NULL (nem sim, nem não). Com IS DISTINCT FROM é true.' }),
  // ---------- caso 7
  'TRIM': c(
    'Tira os espaços do começo e do fim do texto.',
    'Apagar o espaço que alguém deixou sem querer ao digitar o nome.',
    `SELECT nome, TRIM(nome) AS sem_espacos
FROM cadastro
LIMIT 5;`),
  'UPPER': c(
    'Passa o texto para maiúsculas. Serve para comparar nomes sem se importar com maiúsculas e minúsculas. O LOWER faz o contrário.',
    'Padronizar a letra dos nomes antes de procurar duplicados.',
    `SELECT UPPER(TRIM(nome)) AS nome_padrao
FROM cadastro
LIMIT 5;`),
  'LENGTH': c(
    'Conta quantas letras tem o texto. Boa para achar um CPF com tamanho errado.',
    'Contar os dígitos do CPF para ver se está completo.',
    `SELECT cpf, LENGTH(cpf) AS tamanho
FROM cadastro
LIMIT 5;`),
  'REPLACE': c(
    'Troca um pedaço do texto por outro. Pode ser aninhado: REPLACE(REPLACE(x, ...), ...).',
    'Passar o corretor nos pontos e traços do CPF para sobrarem só os números.',
    `SELECT cpf,
       REPLACE(REPLACE(cpf, '.', ''), '-', '') AS so_numeros
FROM cadastro
LIMIT 5;`),
  'NULLIF': c(
    'Devolve NULL quando os dois valores são iguais. Serve para transformar texto vazio ("") em NULL de verdade.',
    'Tratar o campo em branco como “não informado”, e não como um dado.',
    `SELECT nome, NULLIF(convenio, '') AS convenio
FROM cadastro
LIMIT 5;`),
  'COALESCE': c(
    'Devolve o primeiro valor que não é NULL da lista. Serve para preencher o que está faltando.',
    '“Se o convênio não foi informado, escreva particular.”',
    `SELECT nome,
       COALESCE(NULLIF(convenio, ''), 'particular') AS convenio
FROM cadastro
LIMIT 5;`),
  'COUNT(coluna)': c(
    'Conta só as linhas em que a coluna não é NULL. O COUNT(*) conta todas as linhas.',
    'Contar só as fichas em que o convênio foi preenchido.',
    `SELECT COUNT(*) AS fichas,
       COUNT(convenio) AS com_convenio
FROM cadastro;`),
  'CAST': c(
    'Converte o dado de um tipo para outro, como texto para número, para poder fazer conta. Aqui o “R$ 1.250,00” é limpo com REPLACE antes de virar número.',
    'Transformar o valor escrito como texto no número que dá para somar.',
    `SELECT valor,
       CAST(REPLACE(REPLACE(REPLACE(valor, 'R$ ', ''), '.', ''), ',', '.') AS numeric) AS numero
FROM consulta
LIMIT 5;`),
  '::': c(
    'Atalho do CAST no Postgres: valor::tipo converte o valor para aquele tipo. Dá o mesmo resultado, com menos letras.',
    'A versão de bolso do CAST, para escrever menos.',
    `SELECT valor,
       REPLACE(REPLACE(REPLACE(valor, 'R$ ', ''), '.', ''), ',', '.')::numeric AS numero
FROM consulta
LIMIT 5;`),
  // ---------- caso 8
  'DATE_TRUNC': c(
    'Corta a data no começo do período: do mês, do dia, da hora. Perfeito para agrupar por mês.',
    'Pôr todas as folhas de ponto de um mês na mesma pasta.',
    `SELECT DATE_TRUNC('month', inicio) AS mes,
       COUNT(*) AS horas_extras
FROM hora_extra
GROUP BY 1
ORDER BY 1;`),
  'TO_CHAR': c(
    'Transforma data ou número em texto formatado, como 15/03/2026 ou 08:30.',
    'Escrever a data no formato que o relatório do hospital usa.',
    `SELECT TO_CHAR(inicio, 'DD/MM/YYYY HH24:MI') AS inicio_formatado
FROM hora_extra
LIMIT 3;`),
  'EXTRACT': c(
    'Tira uma parte da data ou da hora: o ano, o mês, o dia, a hora...',
    'Olhar só a hora do carimbo de ponto.',
    `SELECT inicio,
       EXTRACT(HOUR FROM inicio) AS hora
FROM hora_extra
LIMIT 5;`),
  'DOW': c(
    'Dentro do EXTRACT, dá o dia da semana como número: 0 é domingo e 6 é sábado.',
    'Descobrir se a hora extra caiu no fim de semana.',
    `SELECT inicio,
       EXTRACT(DOW FROM inicio) AS dia_da_semana
FROM hora_extra
LIMIT 5;`),
  'EPOCH': c(
    'Dentro do EXTRACT, converte um intervalo em segundos. Divida por 3600 e você tem as horas.',
    'Transformar “das 19h às 23h30” em 4,5 horas para pagar.',
    `SELECT id,
       EXTRACT(EPOCH FROM (fim - inicio)) / 3600 AS horas
FROM hora_extra
LIMIT 5;`),
  'RANK': c(
    'Dá a posição num ranking. Empates ficam com a mesma posição, e a seguinte pula.',
    'O pódio das horas extras: dois empatados em 1º, e o próximo é o 3º.',
    `SELECT profissional_id,
       COUNT(*) AS extras,
       RANK() OVER (ORDER BY COUNT(*) DESC) AS posicao
FROM hora_extra
GROUP BY profissional_id
ORDER BY posicao
LIMIT 5;`),
  'SUM OVER': c(
    'Soma acumulada: cada linha mostra o total até ali, sem perder as linhas.',
    'O extrato: cada hora extra com o total acumulado até aquele dia.',
    `SELECT id, profissional_id,
       SUM(EXTRACT(EPOCH FROM (fim - inicio)) / 3600)
         OVER (PARTITION BY profissional_id ORDER BY inicio) AS horas_acumuladas
FROM hora_extra
LIMIT 5;`),
  'NOT EXISTS': c(
    'Devolve as linhas para as quais a subconsulta não encontra nada. É o jeito de dizer “quem não tem registro”.',
    '“Quem fez hora extra sem passar na catraca perto do horário?”.',
    `SELECT p.nome, h.inicio
FROM hora_extra h
JOIN profissional p ON p.id = h.profissional_id
WHERE h.inicio >= '2026-09-01' AND h.inicio < '2026-10-01'
  AND NOT EXISTS (
    SELECT 1
    FROM catraca c
    WHERE c.profissional_id = h.profissional_id
      AND c.sentido = 'entrada'
      AND c.momento BETWEEN h.inicio - INTERVAL '1 hour'
                        AND h.inicio + INTERVAL '30 minutes'
  )
LIMIT 5;`),
  'subconsulta correlacionada': c(
    'Subconsulta que usa uma coluna da consulta de fora (aqui, h.profissional_id e h.inicio). Ela roda de novo para cada linha de fora.',
    'Para cada hora extra, ir conferir na catraca se a pessoa entrou perto do horário.',
    `SELECT p.nome, h.inicio
FROM hora_extra h
JOIN profissional p ON p.id = h.profissional_id
WHERE h.inicio >= '2026-09-01' AND h.inicio < '2026-10-01'
  AND EXISTS (
    SELECT 1
    FROM catraca c
    WHERE c.profissional_id = h.profissional_id
      AND c.sentido = 'entrada'
      AND c.momento BETWEEN h.inicio - INTERVAL '1 hour'
                        AND h.inicio + INTERVAL '30 minutes'
  )
LIMIT 5;`),
  // ---------- caso 9
  'LEFT JOIN … IS NULL': c(
    'A dupla que acha “quem não tem par”: o LEFT JOIN mantém todos, e o IS NULL deixa só os que não encontraram par.',
    'Acessos feitos por quem não fazia parte da equipe do paciente.',
    `SELECT l.id, l.usuario_id, l.internado_id
FROM log_acesso l
LEFT JOIN equipe_cuidado e
  ON e.internado_id = l.internado_id
 AND e.usuario_id = l.usuario_id
WHERE e.usuario_id IS NULL
LIMIT 5;`),
  'SUBSTRING': c(
    'Corta um pedaço do texto: a partir de qual posição e quantas letras.',
    'Pegar só os três primeiros números do CPF.',
    `SELECT cpf,
       SUBSTRING(cpf, 1, 3) AS tres_primeiros
FROM usuario
LIMIT 5;`),
  '||': c(
    'Cola textos, um depois do outro (concatenar).',
    'Juntar os três primeiros números do CPF com os asteriscos que escondem o resto.',
    `SELECT SUBSTRING(cpf, 1, 3) || '.***.***-**' AS cpf_mascarado
FROM usuario
LIMIT 5;`),
  'COUNT(*) FILTER': c(
    'Conta só as linhas que passam por uma condição, dentro de cada grupo, sem precisar de um WHERE para a consulta toda.',
    'Em cada login, contar só as tentativas que falharam.',
    `SELECT login,
       COUNT(*) FILTER (WHERE NOT sucesso) AS erros,
       COUNT(*) AS total
FROM log_login
GROUP BY login
ORDER BY erros DESC
LIMIT 5;`),
  'MIN/MAX': c(
    'Juntos, o MIN e o MAX mostram a primeira e a última ocorrência de cada grupo, como o começo e o fim da atividade de alguém.',
    'A primeira e a última vez que o usuário tentou entrar.',
    `SELECT login,
       MIN(momento) AS primeira_tentativa,
       MAX(momento) AS ultima_tentativa
FROM log_login
GROUP BY login
LIMIT 5;`),
  // ---------- caso 10
  'ILIKE': c(
    'Como o LIKE, mas ignora a diferença entre maiúscula e minúscula (é um recurso do Postgres).',
    'Procurar “maria” e achar “Maria” e “MARIA”.',
    `SELECT login, nome
FROM portal_usuario
WHERE nome ILIKE 'maria%'
LIMIT 5;`),
  'aspas dentro de texto': c(
    'O texto em SQL fica entre aspas simples. Para escrever uma aspa dentro do texto, ela precisa ser dobrada (\'\'). Uma aspa solta, digitada num campo, pode quebrar o comando, e é daí que nasce a injeção de SQL.',
    'Uma caneta que risca o formulário e muda o que a ficha diz.',
    `SELECT 'D''Ávila' AS sobrenome;`),
  'UNION SELECT': c(
    'Cola o resultado de outro SELECT embaixo do primeiro. Na injeção de SQL, é assim que o invasor faz dados de outra tabela aparecerem na tela.',
    'Alguém que pede “a ficha do paciente” e leva junto a lista das senhas.',
    `SELECT login, nome
FROM portal_usuario
UNION
SELECT paciente_login, exame
FROM exame_pedido
LIMIT 5;`),
  'information_schema': c(
    'Um conjunto de tabelas do próprio banco que descrevem o banco: quais tabelas e colunas existem. Quem invade usa para descobrir o que atacar; você usa para conhecer o banco.',
    'O índice do arquivo: a lista de todas as gavetas e dos campos de cada uma.',
    `SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;`),
  'GRANT/REVOKE': c(
    'GRANT dá uma permissão a alguém, e REVOKE tira. Menor privilégio é dar a cada pessoa só o que ela precisa.',
    'Dar a chave só das gavetas que cada funcionário precisa abrir.',
    `REVOKE ALL ON exame_resultado FROM anon;
GRANT SELECT ON portal_usuario TO anon;`,
    { nota: 'Comando que muda permissões: teste só num banco seu, como o do Supabase do jogo.', semLinhas: true }),
  'ROW LEVEL SECURITY': c(
    'O RLS faz o banco filtrar as linhas por quem está perguntando. Mesmo com acesso à tabela, cada pessoa só enxerga as linhas dela.',
    'A gaveta abre para todos, mas cada um só vê as fichas do próprio paciente.',
    `ALTER TABLE exame_resultado ENABLE ROW LEVEL SECURITY;`,
    { semLinhas: true }),
  'pg_policies': c(
    'Uma tabela do sistema que lista as regras (policies) de segurança criadas. Serve para conferir o que está valendo.',
    'O caderno de regras da portaria.',
    `SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public';`,
    { pre: `ALTER TABLE exame_resultado ENABLE ROW LEVEL SECURITY;
CREATE POLICY ver_proprio ON exame_resultado FOR SELECT USING (paciente_login = current_setting('app.login', true));` }),
  'parâmetros': c(
    'Na consulta parametrizada, o comando e o valor viajam separados ($1). O que a pessoa digitou é sempre dado, nunca vira pedaço do comando. É a defesa principal contra injeção de SQL.',
    'O formulário tem um campo fixo para o nome: ninguém consegue escrever ordens ali.',
    `PREPARE busca(text) AS
  SELECT nome FROM portal_usuario WHERE login = $1;
EXECUTE busca('ana');`,
    { semLinhas: true }),
  'CREATE POLICY': c(
    'Cria uma regra de RLS: define quais linhas cada pessoa pode ler ou alterar.',
    'Escrever na portaria: “paciente só pega os próprios exames”.',
    `CREATE POLICY ver_proprio ON exame_resultado
  FOR SELECT
  USING (paciente_login = current_setting('app.login', true));`,
    { semLinhas: true }),
  'current_setting': c(
    'Lê uma configuração da sessão. As regras de RLS usam para saber quem está perguntando.',
    'O crachá que a pessoa mostra na portaria.',
    `SET app.login = 'ana';
SELECT current_setting('app.login');`),

  // ---------- Treino, fases 1, 2 e 3 (criar o próprio banco: tabelas enf_*)
  'PRIMARY KEY': c(
    'Marca a coluna que identifica cada linha: nunca fica vazia e nunca se repete. Toda tabela deve ter uma.',
    'O número do prontuário: duas fichas nunca têm o mesmo.',
    `CREATE TABLE enf_leito (
  codigo  text PRIMARY KEY,
  setor   text NOT NULL
);`,
    { nota: 'Exemplo da fase 1 do Treino, onde você cria o banco da enfermaria.', semLinhas: true }),
  'NOT NULL': c(
    'Torna a coluna obrigatória: o banco recusa a linha se ela vier em branco.',
    'A ficha sem o nome do paciente não vale.',
    `CREATE TABLE enf_exemplo (id integer, nome text);
ALTER TABLE enf_exemplo ALTER COLUMN nome SET NOT NULL;`,
    { nota: 'Na criação da tabela, escreva direto: nome text NOT NULL.', semLinhas: true }),
  'UNIQUE': c(
    'O banco não aceita dois valores iguais na coluna. Valores em branco (NULL) são permitidos.',
    'Dois pacientes com o mesmo CPF: o banco recusa o segundo.',
    `CREATE TABLE enf_exemplo (
  cpf text UNIQUE
);`,
    { semLinhas: true }),
  'CHECK': c(
    'Uma regra que o valor precisa cumprir. Se a condição for falsa, o banco recusa a linha.',
    'O peso só pode ser maior que zero, e a saída nunca vem antes da entrada.',
    `CREATE TABLE enf_exemplo (
  peso_kg numeric(5,2) CHECK (peso_kg > 0)
);`,
    { semLinhas: true }),
  'DEFAULT': c(
    'O valor automático da coluna quando você não preenche. Pode ser fixo (true) ou uma função (now()).',
    'A hora do cadastro, carimbada sozinha na ficha.',
    `CREATE TABLE enf_exemplo (
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz DEFAULT now()
);`,
    { semLinhas: true }),
  'FOREIGN KEY': c(
    'Chave estrangeira: uma coluna cujo valor precisa existir em outra tabela. É a ligação que o banco confere por você.',
    'O número do paciente escrito dentro da internação.',
    `CREATE TABLE enf_exemplo (
  id           bigint PRIMARY KEY,
  paciente_id  bigint NOT NULL,
  FOREIGN KEY (paciente_id) REFERENCES enf_paciente (id)
);`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY);', nota: 'Exemplo da fase 2 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'REFERENCES': c(
    'Diz a qual tabela e coluna a chave estrangeira aponta. Dá para escrever direto na coluna, sem a palavra FOREIGN KEY.',
    '“Este número tem que existir na ficha do paciente.”',
    `CREATE TABLE enf_exemplo (
  paciente_id  bigint NOT NULL REFERENCES enf_paciente (id)
);`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY);', nota: 'Exemplo da fase 2 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'ON DELETE': c(
    'Define o que acontece quando apagam a linha “pai”. O padrão é recusar. CASCADE apaga junto as linhas que dependem dela, e SET NULL só esvazia a ligação.',
    'O que fazer com as prescrições quando alguém apaga o paciente.',
    `CREATE TABLE enf_exemplo (
  paciente_id  bigint REFERENCES enf_paciente (id) ON DELETE CASCADE
);`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY);', nota: 'Exemplo da fase 2 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'tabela de ligação': c(
    'Uma terceira tabela que liga duas coisas de muitos para muitos. Tem uma chave estrangeira para cada lado, e a chave primária é o par.',
    'Quais remédios cada paciente toma, e em quais pacientes cada remédio é usado.',
    `CREATE TABLE enf_prescricao (
  paciente_id     bigint REFERENCES enf_paciente (id),
  medicamento_id  bigint REFERENCES enf_medicamento (id),
  PRIMARY KEY (paciente_id, medicamento_id)
);`,
    { pre: `CREATE TABLE enf_paciente (id bigint PRIMARY KEY);
CREATE TABLE enf_medicamento (id bigint PRIMARY KEY);`, nota: 'Exemplo da fase 2 do Treino: precisa das tabelas enf_paciente e enf_medicamento.', semLinhas: true }),
  'ALTER TABLE': c(
    'Muda a estrutura de uma tabela que já existe, sem perder os dados: acrescentar, renomear ou apagar colunas, ou criar regras novas.',
    'Incluir o telefone na ficha sem refazer todas as fichas.',
    `ALTER TABLE enf_paciente
  ADD COLUMN telefone text;`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY);', nota: 'Exemplo da fase 3 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'CREATE INDEX': c(
    'Cria um índice para a busca ficar rápida: o banco vai direto ao ponto, em vez de ler a tabela inteira. A chave primária e o UNIQUE já criam índice sozinhos.',
    'O índice remissivo, no fim de um livro.',
    `CREATE INDEX idx_enf_paciente_nome
  ON enf_paciente (nome);`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY, nome text);', nota: 'Exemplo da fase 3 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'CREATE VIEW': c(
    'Guarda uma consulta com um nome. A view não guarda dados: a cada uso, a consulta roda de novo com os dados de agora.',
    'O relatório “quem está internado agora”, pronto para pedir quando quiser.',
    `CREATE VIEW enf_pacientes_adultos AS
SELECT id, nome
FROM enf_paciente
WHERE nascimento <= CURRENT_DATE - INTERVAL '18 years';`,
    { pre: 'CREATE TABLE enf_paciente (id bigint PRIMARY KEY, nome text, nascimento date);', nota: 'Exemplo da fase 3 do Treino: precisa da tabela enf_paciente.', semLinhas: true }),
  'DROP TABLE': c(
    'Apaga a tabela inteira, com os dados. Não pergunta nada e não tem desfazer. O banco recusa se outras tabelas dependem dela.',
    'Jogar fora a ficha de teste.',
    `DROP TABLE enf_rascunho;`,
    { pre: 'CREATE TABLE enf_rascunho (id integer);', nota: 'Apaga de verdade: use só em tabela sua.', semLinhas: true }),

  // ---------- caso 11 (fila do pronto-socorro)
  'timestamp − timestamp': c(
    'Subtrair um timestamp do outro dá um intervalo de tempo. É assim que você mede quanto tempo passou entre dois momentos.',
    'Olhar o relógio na chegada, o relógio na consulta, e calcular a diferença.',
    `SELECT paciente, chegada, inicio_medico,
       inicio_medico - chegada AS espera
FROM ps_atendimento
WHERE paciente = 'Ivone Siqueira';`),
  'interval': c(
    'Tipo de dado que guarda uma duração, como 1 hora e 20 minutos. É o que sai da subtração de dois timestamp.',
    'O tempo marcado no cronômetro, e não o horário do relógio.',
    `SELECT inicio_medico - chegada AS espera,
       pg_typeof(inicio_medico - chegada) AS tipo
FROM ps_atendimento
LIMIT 3;`),
  'EXTRACT(EPOCH)': c(
    'Converte um interval em segundos. Divida por 60 para ter minutos, ou por 3600 para ter horas. Só assim dá para comparar a espera com um número, como o tempo-alvo da cor.',
    'Transformar “1h20” em 80 minutos para comparar com a meta.',
    `SELECT paciente, cor,
       ROUND(EXTRACT(EPOCH FROM inicio_medico - chegada) / 60) AS espera_min
FROM ps_atendimento
WHERE paciente = 'Ivone Siqueira';`),
  'PERCENTILE_CONT(0.5)': c(
    'Calcula a mediana: o valor do meio, com metade dos casos abaixo e metade acima. Poucos casos extremos não a puxam, ao contrário da média.',
    'Pôr os pacientes em fila por tempo de espera e olhar quem está no meio da fila.',
    `SELECT ROUND(AVG(EXTRACT(EPOCH FROM inicio_medico - chegada) / 60), 1) AS media_min,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM inicio_medico - chegada) / 60)::numeric, 1) AS mediana_min
FROM ps_atendimento
WHERE cor = 'amarelo';`),
  'PERCENTILE_CONT(0.9)': c(
    'Calcula o percentil 90: o valor abaixo do qual ficam 90% dos casos. Mostra o “pior caso comum”, sem os 10% mais extremos.',
    '“Nove em cada dez pacientes esperaram até quanto tempo?”.',
    `SELECT ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM inicio_medico - chegada) / 60)::numeric, 1) AS p90_min
FROM ps_atendimento
WHERE cor = 'amarelo';`),
  'WITHIN GROUP': c(
    'Acompanha o PERCENTILE_CONT: diz em qual coluna e em que ordem o percentil é calculado. A escrita é PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY coluna).',
    'A régua em que a fila é colocada em ordem antes de contar até o meio.',
    `SELECT cor,
       ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM inicio_medico - chegada) / 60)::numeric, 1) AS mediana_min
FROM ps_atendimento
GROUP BY cor
ORDER BY cor;`),
  'timestamp − INTERVAL': c(
    'Subtrair um INTERVAL de um timestamp devolve outro timestamp, mais cedo. Serve para deslocar o relógio.',
    'Recuar o relógio em 7 horas para que a madrugada ainda conte como a noite anterior.',
    `SELECT chegada,
       chegada - INTERVAL '7 hours' AS deslocada,
       (chegada - INTERVAL '7 hours')::date AS noite
FROM ps_atendimento
WHERE EXTRACT(HOUR FROM chegada) < 7
LIMIT 5;`),
  '::date': c(
    'Corta o horário e fica só com o dia. É o ::tipo aplicado a date.',
    'Olhar só a data do carimbo, sem a hora.',
    `SELECT chegada::date AS dia, COUNT(*) AS atendimentos
FROM ps_atendimento
GROUP BY chegada::date
ORDER BY dia
LIMIT 5;`),
  'NTILE(4) OVER': c(
    'Divide as linhas ordenadas em 4 grupos do mesmo tamanho (quartos). O grupo 1 são os 25% do topo da ordem que você escolheu.',
    'Dividir as noites em quatro pilhas, da pior para a melhor, e olhar a pilha das piores.',
    `SELECT paciente,
       ROUND(EXTRACT(EPOCH FROM inicio_medico - chegada) / 60) AS espera_min,
       NTILE(4) OVER (ORDER BY inicio_medico - chegada DESC) AS quarto
FROM ps_atendimento
WHERE cor = 'amarelo'
LIMIT 6;`),
  'generate_series': c(
    'Gera uma sequência de números ou de horários que não existe na tabela, como todas as horas de 0 a 23. Serve de grade para você não perder as horas que ficaram sem registro.',
    'Desenhar a grade do relógio inteiro numa folha, antes de preencher com os atendimentos.',
    `SELECT hora
FROM generate_series(0, 23) AS h(hora);`),
  'LEFT JOIN na série': c(
    'Liga a grade gerada à tabela com LEFT JOIN: as horas sem nenhum registro continuam na lista, com contagem 0, e não somem do resultado.',
    'Preencher a grade hora a hora: as horas vazias aparecem com zero.',
    `SELECT h.hora, COUNT(a.id) AS atendimentos
FROM generate_series(0, 23) AS h(hora)
LEFT JOIN ps_atendimento a ON EXTRACT(HOUR FROM a.chegada) = h.hora
GROUP BY h.hora
ORDER BY h.hora;`),
  'JOIN duas vezes na mesma tabela': c(
    'Dá para usar a mesma tabela duas vezes, com apelidos diferentes, para comparar duas linhas dela. Aqui a ps_cor aparece como “ca” (cor antiga) e “cn” (cor nova).',
    'Consultar duas vezes a mesma tabela de cores: uma para a cor de antes, outra para a de depois.',
    `SELECT r.atendimento_id, ca.cor AS cor_antiga, cn.cor AS cor_nova
FROM ps_reclassificacao r
JOIN ps_cor ca ON ca.cor = r.cor_antiga
JOIN ps_cor cn ON cn.cor = r.cor_nova
WHERE cn.ordem < ca.ordem
LIMIT 5;`),
  'EXISTS': c(
    'Dá verdadeiro se a subconsulta encontrar pelo menos uma linha. É o contrário do NOT EXISTS: serve para dizer “existe alguém que...”.',
    '“Existe alguma reclassificação para este atendimento?”.',
    `SELECT a.paciente, a.cor
FROM ps_atendimento a
WHERE EXISTS (
  SELECT 1
  FROM ps_reclassificacao r
  WHERE r.atendimento_id = a.id
)
LIMIT 5;`),

  // ---------- caso 12 (lote que sumiu: WITH RECURSIVE)
  'WITH RECURSIVE': c(
    'Uma consulta que chama a si mesma: começa num ponto (a âncora) e repete o passo seguinte até não achar mais nada. É o jeito de seguir uma cadeia de tamanho desconhecido.',
    'Seguir o fio da guia: de onde saiu, para onde foi, de lá para onde seguiu, e assim por diante.',
    `WITH RECURSIVE arvore AS (
  SELECT id, guia_anterior, origem, destino, 1 AS nivel
  FROM lote_guia
  WHERE lote = 'IGH-2609-114'
  UNION ALL
  SELECT g.id, g.guia_anterior, g.origem, g.destino, a.nivel + 1
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT id, guia_anterior, origem, destino, nivel
FROM arvore
ORDER BY nivel, id;`),
  'âncora': c(
    'A primeira parte do WITH RECURSIVE: o ponto de partida, que roda uma vez só. A segunda parte (depois do UNION ALL) repete a partir dele.',
    'A primeira guia do lote, onde você começa a puxar o fio.',
    `WITH RECURSIVE arvore AS (
  SELECT id, origem, destino          -- âncora: só a primeira guia
  FROM lote_guia
  WHERE lote = 'IGH-2609-114' AND guia_anterior IS NULL
  UNION ALL
  SELECT g.id, g.origem, g.destino    -- passo: as guias que vieram dela
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT *
FROM arvore;`),
  'nível': c(
    'Uma coluna que você mesmo cria: começa em 1 na âncora e soma 1 a cada passo da recursão. Diz a que distância do começo cada linha está.',
    'O número do degrau: 1ª guia, 2ª guia, 3ª guia...',
    `WITH RECURSIVE arvore AS (
  SELECT id, 1 AS nivel
  FROM lote_guia
  WHERE lote = 'IGH-2609-114'
  UNION ALL
  SELECT g.id, a.nivel + 1
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT nivel, COUNT(*) AS guias
FROM arvore
GROUP BY nivel
ORDER BY nivel;`),
  'caminho com ||': c(
    'Dentro da recursão, o || cola cada novo destino no caminho que já existe, e cada guia ganha a rota completa desde a origem.',
    'Escrever o trajeto à caneta, trecho por trecho, até ter a rota inteira.',
    `WITH RECURSIVE arvore AS (
  SELECT id, origem || ' → ' || destino AS caminho
  FROM lote_guia
  WHERE lote = 'IGH-2609-114'
  UNION ALL
  SELECT g.id, a.caminho || ' → ' || g.destino
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT id, caminho
FROM arvore
ORDER BY caminho, id;`),
  'levar a âncora até o fim': c(
    'Para saber de qual lote cada guia veio, a âncora carrega o lote junto e cada passo copia esse valor para as guias seguintes. No fim, todas sabem de qual lote partiram.',
    'Carimbar o número do lote em cada guia que sai dele.',
    `WITH RECURSIVE arvore AS (
  SELECT id, lote
  FROM lote_guia
  WHERE guia_anterior IS NULL
  UNION ALL
  SELECT g.id, a.lote
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT lote, COUNT(*) AS guias
FROM arvore
GROUP BY lote
ORDER BY guias DESC
LIMIT 5;`),
  'SUM sobre a árvore': c(
    'Depois que a recursão monta a árvore, você soma sobre ela como numa tabela comum, por exemplo uma soma por lote.',
    'Somar tudo o que saiu e tudo o que chegou em cada lote, para ver a diferença.',
    `WITH RECURSIVE arvore AS (
  SELECT id, lote, qtd_enviada, qtd_recebida
  FROM lote_guia
  WHERE guia_anterior IS NULL
  UNION ALL
  SELECT g.id, a.lote, g.qtd_enviada, g.qtd_recebida
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT lote, SUM(qtd_enviada - qtd_recebida) AS perda
FROM arvore
GROUP BY lote
HAVING SUM(qtd_enviada - qtd_recebida) > 0
ORDER BY perda DESC;`),
  'ARRAY': c(
    'Uma lista de valores guardada numa coluna só, como ARRAY[\'ALM\', \'FARM\']. Na recursão serve para anotar os lugares por onde já passou. O || acrescenta um item.',
    'A lista de carimbos já recebidos pelo trajeto.',
    `SELECT ARRAY['ALM', 'FARM'] AS caminho,
       ARRAY['ALM', 'FARM'] || 'SAT-ONC'::text AS com_mais_um;`),
  '= ANY': c(
    'Testa se um valor aparece dentro de uma lista (ARRAY): valor = ANY(lista) é verdadeiro se for igual a algum item dela.',
    '“Este lugar já está na lista dos lugares visitados?”.',
    `SELECT 'FARM' = ANY(ARRAY['ALM', 'FARM']) AS ja_visitou,
       'UTI'  = ANY(ARRAY['ALM', 'FARM']) AS ainda_nao;`),
  'evitar ciclo': c(
    'Se as rotas voltam a um lugar onde já estiveram, a recursão nunca para. A saída é guardar os lugares visitados num ARRAY e proibir repeti-los: WHERE NOT (destino = ANY(caminho)).',
    'Riscar da lista os lugares já visitados, para não andar em círculos.',
    `WITH RECURSIVE alcance AS (
  SELECT destino, ARRAY['ALM', destino] AS caminho, 1 AS nivel
  FROM lote_rota
  WHERE origem = 'ALM'
  UNION ALL
  SELECT r.destino, a.caminho || r.destino, a.nivel + 1
  FROM alcance a
  JOIN lote_rota r ON r.origem = a.destino
  WHERE NOT (r.destino = ANY(a.caminho))
)
SELECT destino, MIN(nivel) AS passos
FROM alcance
GROUP BY destino
ORDER BY passos, destino;`),
  'vários WITH': c(
    'Num mesmo WITH dá para criar várias consultas temporárias, separadas por vírgula, e uma pode usar a outra. O RECURSIVE se escreve uma vez só, logo depois do WITH.',
    'Vários rascunhos na mesma folha: um para as guias, outro para as rotas.',
    `WITH RECURSIVE arvore AS (
  SELECT id, origem, destino
  FROM lote_guia
  WHERE lote = 'IGH-2609-114'
  UNION ALL
  SELECT g.id, g.origem, g.destino
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
),
alcance AS (
  SELECT destino, ARRAY['ALM', destino] AS caminho
  FROM lote_rota
  WHERE origem = 'ALM'
  UNION ALL
  SELECT r.destino, a.caminho || r.destino
  FROM alcance a
  JOIN lote_rota r ON r.origem = a.destino
  WHERE NOT (r.destino = ANY(a.caminho))
)
SELECT id, origem, destino
FROM arvore
WHERE destino NOT IN (SELECT destino FROM alcance)
ORDER BY id;`),
  'enviado × recebido': c(
    'Comparar o que foi enviado com o que foi recebido para achar onde a conta não fecha: qtd_recebida menor que qtd_enviada.',
    'Conferir se tudo o que saiu do almoxarifado chegou inteiro na outra ponta.',
    `SELECT id, origem, destino, qtd_enviada, qtd_recebida
FROM lote_guia
WHERE qtd_recebida < qtd_enviada
LIMIT 5;`),
  'SUM(…) FILTER': c(
    'Soma só as linhas que passam por uma condição. É o primo do COUNT(*) FILTER: SUM(coluna) FILTER (WHERE condição).',
    'Somar a perda só dos trechos que têm baixa registrada, separado dos que não têm.',
    `WITH RECURSIVE arvore AS (
  SELECT id, qtd_enviada, qtd_recebida
  FROM lote_guia
  WHERE lote = 'IGH-2609-114'
  UNION ALL
  SELECT g.id, g.qtd_enviada, g.qtd_recebida
  FROM lote_guia g
  JOIN arvore a ON g.guia_anterior = a.id
)
SELECT SUM(a.qtd_enviada - a.qtd_recebida) FILTER (WHERE b.id IS NOT NULL) AS com_baixa,
       SUM(a.qtd_enviada - a.qtd_recebida) FILTER (WHERE b.id IS NULL)     AS sem_baixa
FROM arvore a
LEFT JOIN lote_baixa b ON b.guia_id = a.id;`),
  'hierarquia recursiva': c(
    'Quando cada linha aponta para o chefe dela (chefe_id), o WITH RECURSIVE percorre a equipe inteira, de cima para baixo ou de baixo para cima.',
    'O organograma do hospital: quem responde a quem.',
    `WITH RECURSIVE equipe AS (
  SELECT id, nome, cargo, 1 AS nivel
  FROM lote_funcionario
  WHERE id = (SELECT responsavel_id FROM lote_local WHERE codigo = 'SAT-ONC')
  UNION ALL
  SELECT f.id, f.nome, f.cargo, e.nivel + 1
  FROM lote_funcionario f
  JOIN equipe e ON f.chefe_id = e.id
)
SELECT nome, cargo, nivel
FROM equipe
ORDER BY nivel, nome;`),
  'descer e subir a chefia': c(
    'Para descer, ligue f.chefe_id = e.id (quem tem a pessoa como chefe). Para subir, ligue f.id = c.chefe_id (o chefe da pessoa). Só o JOIN muda de lado.',
    'Ver quem a pessoa chefia, ou quem chefia a pessoa.',
    `WITH RECURSIVE cadeia AS (
  SELECT id, nome, cargo, chefe_id, 1 AS nivel
  FROM lote_funcionario
  WHERE nome = 'Hélio Loureiro'
  UNION ALL
  SELECT f.id, f.nome, f.cargo, f.chefe_id, c.nivel + 1
  FROM lote_funcionario f
  JOIN cadeia c ON f.id = c.chefe_id
)
SELECT nome, cargo, nivel
FROM cadeia
ORDER BY nivel;`),

  // ---------- caso 13 (dose reprogramada: JSON)
  'jsonb': c(
    'Tipo que guarda um documento JSON numa coluna, com campos e listas dentro. O jsonb é guardado de forma organizada, por isso dá para consultar e filtrar por dentro dele.',
    'Uma ficha com campos soltos, colada numa única célula da tabela.',
    `SELECT dados
FROM bomba_evento
LIMIT 2;`),
  '->': c(
    'Pega um campo do JSON e devolve outro JSON (um texto vem com aspas). Serve para descer um nível dentro do documento.',
    'Abrir a ficha e pegar o campo inteiro, do jeito que está escrito.',
    `SELECT dados -> 'tipo' AS tipo_json
FROM bomba_evento
LIMIT 3;`),
  '->>': c(
    'Pega um campo do JSON e devolve como texto comum, sem aspas. É o mais usado para filtrar e agrupar.',
    'Ler só o que está escrito no campo.',
    `SELECT dados ->> 'tipo' AS tipo, COUNT(*) AS eventos
FROM bomba_evento
GROUP BY dados ->> 'tipo'
ORDER BY eventos DESC;`),
  '#>>': c(
    'Pega um campo bem no fundo do JSON, seguindo um caminho, e devolve como texto. dados #>> \'{infusao,dose}\' entra em infusao e pega o campo dose.',
    'Seguir o caminho “infusão, depois dose” dentro da ficha.',
    `SELECT momento,
       dados #>> '{infusao,dose}' AS dose
FROM bomba_evento
WHERE dados ->> 'tipo' = 'programacao'
LIMIT 5;`),
  '::numeric': c(
    'O JSON entrega tudo como texto. Para comparar ou somar, converta o valor com ::numeric (ou ::int).',
    'Transformar o número escrito à mão no número com o qual dá para fazer conta.',
    `SELECT momento,
       (dados #>> '{infusao,dose}')::numeric * 2 AS dobro_da_dose
FROM bomba_evento
WHERE dados ->> 'tipo' = 'programacao'
LIMIT 5;`),
  'JOIN com JSON': c(
    'Dá para ligar uma tabela a um valor de dentro do JSON. Só é preciso converter o tipo: ON p.paciente_id = (e.dados ->> \'paciente\')::int.',
    'Pegar o número do paciente escrito na ficha da bomba e achar a prescrição dele.',
    `SELECT e.momento, e.aparelho,
       p.farmaco,
       (e.dados #>> '{infusao,dose}')::numeric AS dose_programada,
       p.dose AS dose_prescrita
FROM bomba_evento e
JOIN bomba_prescricao p
  ON p.paciente_id = (e.dados ->> 'paciente')::int
 AND p.farmaco = e.dados ->> 'farmaco'
WHERE e.dados ->> 'tipo' = 'programacao'
LIMIT 5;`),
  '?': c(
    'Pergunta se o JSON tem aquela chave: dados ? \'alarmes\' é verdadeiro quando o campo existe.',
    '“Esta ficha tem o campo alarmes?”.',
    `SELECT COUNT(*) AS com_alarmes
FROM bomba_evento
WHERE dados ? 'alarmes';`),
  '@>': c(
    'Pergunta se o JSON da esquerda contém o da direita. Funciona também dentro de listas: dados @> \'{"tipo":"programacao"}\'.',
    '“Esta ficha contém esta informação?”.',
    `SELECT COUNT(*) AS programacoes
FROM bomba_evento
WHERE dados @> '{"tipo":"programacao"}';`),
  'jsonb_array_elements': c(
    'Abre uma lista dentro do JSON e devolve cada item numa linha própria. Assim você consegue contar e filtrar os itens.',
    'Desfazer o maço e espalhar as folhas na mesa, uma por linha.',
    `SELECT a ->> 'codigo' AS codigo, COUNT(*) AS vezes
FROM bomba_evento e, jsonb_array_elements(e.dados -> 'alarmes') AS a
WHERE e.dados ? 'alarmes'
GROUP BY a ->> 'codigo'
ORDER BY vezes DESC;`),
  'jsonb_object_keys': c(
    'Lista os nomes dos campos de um JSON, um por linha. Útil para descobrir o que existe numa ficha desconhecida.',
    'Ler só os títulos dos campos de uma ficha.',
    `SELECT chave, COUNT(*) AS eventos
FROM bomba_evento, jsonb_object_keys(dados) AS chave
WHERE dados @> '{"tipo":"biblioteca"}'
GROUP BY chave
ORDER BY eventos DESC, chave;`),
  'jsonb_each': c(
    'Abre um JSON em pares chave e valor, uma linha por par.',
    'Listar cada campo da ficha com o valor que está escrito nele.',
    `SELECT l.key, l.value
FROM bomba_evento e, jsonb_each(e.dados -> 'limite') AS l
WHERE e.dados ->> 'tipo' = 'biblioteca'
LIMIT 5;`),
  'NOT ?': c(
    'Verdadeiro quando o JSON não tem a chave: NOT dados ? \'usuario\' acha os eventos sem usuário.',
    'A ficha em que falta o campo “quem fez”.',
    `SELECT momento, dados ->> 'tipo' AS tipo
FROM bomba_evento
WHERE NOT dados ? 'usuario'
LIMIT 5;`),
  'escala': c(
    'Tabela com os turnos (entrada e saída) de cada profissional. Cruzando o horário de um evento com ela, você descobre quem estava de plantão naquele momento.',
    'A folha de ponto da equipe, aberta na hora do evento.',
    `SELECT q.nome, q.cargo, s.entrada, s.saida
FROM bomba_escala s
JOIN bomba_equipe q ON q.cracha = s.cracha
WHERE '2026-10-12 02:43' BETWEEN s.entrada AND s.saida
ORDER BY q.nome;`),

  // ---------- caso 14 (banco que se corrigia sozinho: escrita e gatilhos)
  'UPDATE … WHERE': c(
    'O UPDATE sempre com WHERE, para mudar só as linhas certas. Sem WHERE, todas as linhas da tabela mudam.',
    'Corrigir só a ficha do paciente certo.',
    `UPDATE ctp_conta
SET desconto = 0
WHERE id = 1;`,
    { nota: 'Muda dados de verdade: use num banco seu, como o do Supabase do jogo.', semLinhas: true }),
  'DELETE … WHERE': c(
    'O DELETE sempre com WHERE, para apagar só as linhas certas. Sem WHERE, a tabela inteira fica vazia.',
    'Rasgar só a ficha errada.',
    `DELETE FROM ctp_auditoria
WHERE id = 1;`,
    { nota: 'Apaga dados de verdade: use num banco seu, como o do Supabase do jogo.', semLinhas: true }),
  'RETURNING': c(
    'Faz o INSERT, o UPDATE ou o DELETE devolverem as linhas que mudaram, sem precisar de um SELECT depois. É o recibo da operação.',
    'O recibo que o balcão entrega depois da correção.',
    `UPDATE ctp_conta
SET desconto = 0
WHERE id = 1
RETURNING id, desconto, valor_final;`,
    { nota: 'Muda dados de verdade: use num banco seu, como o do Supabase do jogo.' }),
  'BEGIN/ROLLBACK': c(
    'BEGIN abre uma transação: tudo o que vem depois só vale se você confirmar. ROLLBACK desfaz tudo e volta ao que era antes. COMMIT confirma.',
    'Escrever a lápis: se errou, apaga tudo; se está certo, passa a caneta.',
    `BEGIN;
UPDATE ctp_conta SET desconto = 0 WHERE id = 1;
SELECT id, desconto FROM ctp_conta WHERE id = 1;
ROLLBACK;`),
  'auditoria': c(
    'Uma tabela que guarda o antes e o depois de cada alteração, com quem alterou e quando. É o diário de bordo do banco.',
    'O livro de ocorrências da portaria: tudo o que mudou fica anotado.',
    `SELECT usuario_db, momento, desconto_antes, desconto_depois
FROM ctp_auditoria
ORDER BY momento
LIMIT 5;`),
  'OLD/NEW': c(
    'Dentro de um gatilho, OLD é a linha como era antes da alteração, e NEW é como ficou depois. É de onde a tabela de auditoria tira o antes e o depois.',
    'A ficha antes de corrigir e a ficha depois.',
    `SELECT prosrc
FROM pg_proc
WHERE proname = 'ctp_fn_auditoria';`,
    { nota: 'Procure OLD e NEW no texto da função que aparece.' }),
  'CREATE TRIGGER': c(
    'Cria um gatilho: uma função que o banco dispara sozinho antes ou depois de um INSERT, UPDATE ou DELETE numa tabela.',
    'Um alarme na gaveta: toda vez que alguém mexe numa ficha, uma regra dispara.',
    `CREATE TRIGGER meu_gatilho
  AFTER UPDATE ON ctp_conta
  FOR EACH ROW EXECUTE FUNCTION ctp_fn_auditoria();`,
    { semLinhas: true }),
  'BEFORE/AFTER': c(
    'No CREATE TRIGGER, BEFORE roda antes da gravação e pode mudar o valor que vai ser gravado. AFTER roda depois, ideal para registrar o que aconteceu.',
    'Revisar a ficha antes de guardar, ou anotar no livro depois de guardada.',
    `SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'ctp_conta'
ORDER BY trigger_name;`),
  'information_schema.triggers': c(
    'Lista os gatilhos do banco: em qual tabela estão, quando disparam e o que executam. É por aqui que se acha o gatilho escondido.',
    'O quadro com todos os alarmes instalados no arquivo.',
    `SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'ctp_conta'
ORDER BY trigger_name, event_manipulation;`),
  'pg_proc': c(
    'Tabela do sistema com todas as funções do banco e o texto de cada uma (prosrc). Para ler o que uma função faz de verdade.',
    'Abrir o manual de instruções de cada regra.',
    `SELECT proname, prosrc
FROM pg_proc
WHERE proname LIKE 'ctp_fn%'
ORDER BY proname;`),
  'log de DDL': c(
    'DDL são os comandos que mudam a estrutura (CREATE, ALTER, DROP). O log de DDL registra quem criou ou apagou o quê, de qual máquina e quando.',
    'O livro de entrada das obras do prédio: quem mexeu na estrutura.',
    `SELECT momento, usuario_db, comando, objeto, maquina, chamado
FROM ctp_ddl_log
ORDER BY momento
LIMIT 5;`),
  'EXTRACT(HOUR)': c(
    'Tira só a hora de um timestamp (de 0 a 23). Boa para achar mudanças feitas de madrugada ou fora do expediente.',
    'Olhar a hora no carimbo: foi às 3 da manhã?',
    `SELECT momento, usuario_db, comando, objeto
FROM ctp_ddl_log
WHERE EXTRACT(HOUR FROM momento) < 7
   OR EXTRACT(HOUR FROM momento) >= 19
ORDER BY momento
LIMIT 5;`),
  'DROP TRIGGER': c(
    'Remove um gatilho da tabela. A regra para de rodar na hora, então use com cuidado.',
    'Desligar o alarme da gaveta.',
    `DROP TRIGGER ctp_trg_ajuste_centavos ON ctp_conta;`,
    { nota: 'Remove o gatilho de verdade: use num banco seu, como o do Supabase do jogo.', semLinhas: true }),
  'UPDATE em transação': c(
    'Fazer o UPDATE dentro de BEGIN, conferir o resultado e só então confirmar. Se algo sair errado, o ROLLBACK volta tudo.',
    'Corrigir a lápis, conferir e só depois passar a caneta.',
    `BEGIN;
UPDATE ctp_conta SET desconto = 0 WHERE id = 1 RETURNING id, desconto;
ROLLBACK;`,
    { nota: 'Troque ROLLBACK por COMMIT quando tiver certeza do resultado.' }),
  'COMMIT': c(
    'Confirma a transação: tudo o que foi feito depois do BEGIN passa a valer para todos, e não dá mais para desfazer com ROLLBACK.',
    'Passar a caneta na ficha corrigida.',
    `BEGIN;
UPDATE ctp_conta SET desconto = 0 WHERE id = 1;
COMMIT;`,
    { nota: 'Confirma de verdade: use num banco seu, como o do Supabase do jogo.', semLinhas: true }),

  // ---------- caso 15 (receita falsa: expressões regulares)
  'SIMILAR TO': c(
    'Compara o texto com um padrão, a meio caminho entre o LIKE e as expressões regulares: aceita o % e o _ do LIKE, e também | (ou), ( ) e [ ] das regex.',
    'Um molde de carimbo livre: “CRM, duas letras, seis números”.',
    `SELECT crm_texto, COUNT(*) AS receitas
FROM rx_receita
WHERE crm_texto SIMILAR TO 'CRM-[A-Z]{2} [0-9]{6}'
GROUP BY crm_texto
LIMIT 5;`),
  '~': c(
    'Testa se o texto combina com uma expressão regular (regex). Diferencia maiúscula de minúscula. O ^ marca o começo, o $ marca o fim e o \\d é um dígito.',
    'Conferir se o CRM segue o molde “CRM-UF 000000”, em vez de comparar letra por letra.',
    `SELECT crm_texto
FROM rx_receita
WHERE crm_texto ~ '^CRM-[A-Z]{2} \\d{6}$'
LIMIT 5;`),
  '!~': c(
    'O contrário do ~: pega o texto que NÃO combina com o padrão. Ótimo para achar o que saiu do formato.',
    'Separar as fichas de CRM escrito fora do padrão.',
    `SELECT crm_texto, COUNT(*) AS receitas
FROM rx_receita
WHERE crm_texto !~ '^CRM-[A-Z]{2} \\d{6}$'
GROUP BY crm_texto
ORDER BY receitas DESC
LIMIT 5;`),
  '~*': c(
    'Igual ao ~, mas sem diferenciar maiúscula de minúscula.',
    'Procurar “crm” escrito de qualquer jeito: CRM, crm, Crm.',
    `SELECT DISTINCT crm_texto
FROM rx_receita
WHERE crm_texto ~* '^crm'
LIMIT 5;`),
  'regexp_replace': c(
    'Troca, dentro do texto, tudo o que combina com um padrão por outra coisa. É o REPLACE turbinado.',
    'Passar o corretor em todos os pontos, traços e espaços do CRM de uma vez só.',
    `SELECT crm_texto,
       regexp_replace(crm_texto, '[^0-9]', '', 'g') AS so_numeros
FROM rx_receita
LIMIT 5;`),
  '\\D': c(
    'Dentro de uma regex, \\D quer dizer “qualquer coisa que não seja dígito”. Já o \\d é o dígito. Trocar \\D por vazio deixa só os números.',
    'Rasgar tudo o que não é número no CRM escrito à mão.',
    `SELECT regexp_replace('CRM-SP 12.345-6', '\\D', '', 'g') AS so_numeros;`),
  "'g'": c(
    'A letra g (de global) no fim do regexp_replace manda trocar todas as ocorrências. Sem ela, só a primeira é trocada.',
    'Corrigir todos os pontos do número, e não só o primeiro.',
    `SELECT regexp_replace('1.234.567', '\\.', '')     AS sem_g,
       regexp_replace('1.234.567', '\\.', '', 'g') AS com_g;`),
  'regexp_match': c(
    'Devolve as partes do texto que combinam com os grupos ( ) do padrão, numa lista. O primeiro grupo é o item [1], o segundo é o [2]...',
    'Cortar o CRM em número e sufixo de uma vez.',
    `SELECT crm_texto,
       regexp_match(crm_texto, '(\\d+)(P?)') AS partes
FROM rx_receita
LIMIT 5;`),
  'grupos ( )': c(
    'Parênteses numa regex marcam um pedaço para guardar. No regexp_match, cada grupo vira um item do resultado: (\\d+) pega os dígitos, e (P?) pega um P, se houver.',
    'Separar o número do CRM e a letra que vem depois.',
    `SELECT (regexp_match('CRM-SP 093417P', '(\\d+)(P?)'))[1] AS numero,
       (regexp_match('CRM-SP 093417P', '(\\d+)(P?)'))[2] AS sufixo;`),
  '[^…]': c(
    'Colchetes definem um conjunto de caracteres. Com ^ logo no começo, [^A-Z0-9] quer dizer “qualquer coisa que NÃO seja letra maiúscula ou número”.',
    'Tudo o que não é letra nem número: pontos, traços e espaços.',
    `SELECT regexp_replace('CRM-SP 12.345', '[^A-Za-z0-9]', '', 'g') AS limpo;`),
  'substring … from': c(
    'Tira do texto o pedaço que combina com uma regex: substring(texto from \'padrão\'). Se o padrão tem parênteses, devolve só o grupo.',
    'Pegar só o número que está escrito no meio do CRM.',
    `SELECT crm_texto,
       substring(crm_texto from '\\d+') AS numero
FROM rx_receita
LIMIT 5;`),
  'regexp_matches': c(
    'Como o regexp_match, mas com a opção g devolve todas as ocorrências, uma por linha. Serve para contar quantas vezes uma palavra aparece.',
    'Contar de quantas maneiras diferentes a palavra “comprimido” foi escrita.',
    `SELECT lower(m[1]) AS palavra, COUNT(*) AS vezes
FROM rx_receita, regexp_matches(texto_receita, 'compr\\w*', 'gi') AS m
GROUP BY palavra
ORDER BY vezes DESC;`),
  "'gi'": c(
    'Opções do regexp_matches e do regexp_replace: g (todas as ocorrências) e i (ignora maiúsculas). Juntas: \'gi\'.',
    'Achar todas as vezes que a palavra aparece, em maiúscula ou minúscula.',
    `SELECT regexp_matches('Comprimido, comprimdo, COMPRIMIDO', 'compr\\w*', 'gi');`),
  'split_part': c(
    'Corta o texto por um separador e devolve o pedaço de número N. split_part(texto, \' | \', 4) pega o quarto pedaço.',
    'Abrir a receita nos traços e ler só o campo do carimbo.',
    `SELECT split_part(texto_receita, ' | ', 4) AS carimbo,
       COUNT(*) AS receitas
FROM rx_receita
GROUP BY carimbo
ORDER BY receitas DESC
LIMIT 5;`),
  'position': c(
    'Diz em que posição um texto aparece dentro de outro: 1 é a primeira letra, e 0 quer dizer que não achou. position(\'x\' IN texto).',
    'Descobrir em qual letra da linha está o traço do CRM.',
    `SELECT crm_texto,
       position('-' IN crm_texto) AS posicao_do_traco
FROM rx_receita
LIMIT 5;`),

  // ---------- caso 16 (relatório da diretoria: ROLLUP/CUBE, ilhas e lacunas)
  'ROLLUP': c(
    'Agrupa como o GROUP BY e acrescenta, de graça, as linhas de subtotal e a de total geral. ROLLUP (setor, mes) dá o valor de cada mês, o subtotal de cada setor e o total geral.',
    'O relatório da diretoria: um valor por setor, com a linha TOTAL no fim.',
    `WITH base AS (
  SELECT s.nome AS setor, c.qtd * m.valor_unit AS valor
  FROM opme_consumo c
  JOIN opme_material m ON m.codigo = c.material
  JOIN opme_setor s ON s.cc = c.cc
)
SELECT COALESCE(setor, 'TOTAL') AS setor, SUM(valor) AS valor
FROM base
GROUP BY ROLLUP (setor)
ORDER BY GROUPING(setor), valor DESC;`),
  'GROUPING()': c(
    'Diz se a linha é um subtotal: devolve 1 quando a coluna foi “somada” (fica NULL no subtotal) e 0 numa linha normal. Serve para escrever TOTAL no lugar do NULL e para ordenar os subtotais no fim.',
    'Distinguir a linha “TOTAL” de um setor que simplesmente tem o nome em branco.',
    `WITH base AS (
  SELECT s.nome AS setor,
         to_char(c.lancado_em, 'YYYY-MM') AS mes,
         c.qtd * m.valor_unit AS valor
  FROM opme_consumo c
  JOIN opme_material m ON m.codigo = c.material
  JOIN opme_setor s ON s.cc = c.cc
)
SELECT CASE WHEN GROUPING(setor) = 1 THEN 'TOTAL GERAL' ELSE setor END AS setor,
       CASE WHEN GROUPING(mes) = 1 THEN 'subtotal' ELSE mes END AS mes,
       SUM(valor) AS valor
FROM base
GROUP BY ROLLUP (setor, mes)
ORDER BY GROUPING(setor), setor, GROUPING(mes), mes;`),
  'pivot': c(
    'Virar linhas em colunas: o mês deixa de ser uma linha e vira uma coluna (julho, agosto, setembro). No Postgres se faz com SUM(...) FILTER ou com CASE.',
    'A tabela cruzada da planilha: setores nas linhas, meses nas colunas.',
    `WITH base AS (
  SELECT s.nome AS setor,
         to_char(c.lancado_em, 'YYYY-MM') AS mes,
         c.qtd * m.valor_unit AS valor
  FROM opme_consumo c
  JOIN opme_material m ON m.codigo = c.material
  JOIN opme_setor s ON s.cc = c.cc
)
SELECT setor,
       SUM(valor) FILTER (WHERE mes = '2026-07') AS julho,
       SUM(valor) FILTER (WHERE mes = '2026-08') AS agosto,
       SUM(valor) FILTER (WHERE mes = '2026-09') AS setembro,
       SUM(valor) AS trimestre
FROM base
GROUP BY setor
ORDER BY trimestre DESC;`),
  'CUBE': c(
    'Como o ROLLUP, mas calcula todas as combinações: por setor, por categoria, pelos dois juntos e o total geral.',
    'Olhar o gasto por todos os cantos: por setor, por tipo de material e pelos dois.',
    `SELECT COALESCE(s.nome, '(todos)') AS setor_que_pagou,
       COALESCE(m.categoria, '(todas)') AS categoria,
       SUM(c.qtd) AS unidades,
       SUM(c.qtd * m.valor_unit) AS valor
FROM opme_consumo c
JOIN opme_material m ON m.codigo = c.material
JOIN opme_setor s ON s.cc = c.cc
WHERE m.categoria LIKE 'stent%'
GROUP BY CUBE (s.nome, m.categoria)
ORDER BY GROUPING(s.nome), s.nome, GROUPING(m.categoria), m.categoria;`),
  'GROUPING SETS': c(
    'Você escolhe exatamente quais agrupamentos quer, numa consulta só. GROUPING SETS ((a, b), ()) agrupa por a e b e também dá o total geral (o conjunto vazio, ()).',
    'Pedir só os subtotais que interessam, sem as outras combinações.',
    `SELECT COALESCE(ci.setor, 'TOTAL') AS setor_que_operou,
       c.cc AS cc_que_pagou,
       COUNT(*) AS lancamentos,
       SUM(c.qtd * m.valor_unit) AS valor
FROM opme_consumo c
JOIN opme_cirurgia ci ON ci.id = c.cirurgia_id
JOIN opme_material m ON m.codigo = c.material
WHERE ci.setor <> c.cc
GROUP BY GROUPING SETS ((ci.setor, c.cc), ())
ORDER BY GROUPING(ci.setor), valor DESC;`),
  'ilhas e lacunas': c(
    'Técnica para achar sequências seguidas (as ilhas) e os buracos entre elas (as lacunas). Dias seguidos formam uma ilha: dia menos ROW_NUMBER dá o mesmo número para dias consecutivos, e aí dá para agrupar.',
    'Descobrir quantos dias seguidos o setor lançou material, e quando houve folga.',
    `WITH dias AS (
  SELECT DISTINCT c.lancado_em::date AS dia
  FROM opme_consumo c
),
grupos AS (
  SELECT dia, dia - ROW_NUMBER() OVER (ORDER BY dia)::int AS grupo
  FROM dias
)
SELECT MIN(dia) AS inicio, MAX(dia) AS fim, COUNT(*) AS dias_seguidos
FROM grupos
GROUP BY grupo
ORDER BY inicio
LIMIT 5;`),
  'ROW_NUMBER() OVER (PARTITION BY)': c(
    'O ROW_NUMBER numerando dentro de cada grupo (PARTITION BY): a numeração recomeça do 1 em cada pessoa, ou em cada pessoa e turno.',
    'Numerar os plantões de cada profissional, recomeçando em cada um.',
    `SELECT login, turno, data,
       ROW_NUMBER() OVER (PARTITION BY login, turno ORDER BY data) AS n
FROM opme_escala
ORDER BY login, turno, data
LIMIT 6;`),
  'ilhas por pessoa': c(
    'A mesma técnica das ilhas, mas separada por pessoa e turno (PARTITION BY login, turno). Mostra quem trabalhou vários dias seguidos no mesmo plantão.',
    'Achar quem pegou o plantão da noite por uma semana inteira.',
    `WITH t AS (
  SELECT login, turno, data,
         data - ROW_NUMBER() OVER (PARTITION BY login, turno ORDER BY data)::int AS grupo
  FROM opme_escala
)
SELECT q.nome, t.turno,
       MIN(t.data) AS inicio, MAX(t.data) AS fim,
       COUNT(*) AS plantoes_seguidos
FROM t
JOIN opme_equipe q ON q.login = t.login
GROUP BY q.nome, t.turno, t.grupo
HAVING COUNT(*) >= 3
ORDER BY plantoes_seguidos DESC;`),
  'JOIN com a escala': c(
    'Ligar um lançamento à escala de plantão pela data e pelo turno (dia ou noite, conforme a hora). Assim você descobre quem estava de plantão naquele momento.',
    'Abrir a folha de plantão do dia e do turno em que o material saiu.',
    `SELECT c.id, c.lancado_em, e.turno, q.nome
FROM opme_consumo c
JOIN opme_escala e
  ON e.data = c.lancado_em::date
 AND e.turno = CASE WHEN EXTRACT(HOUR FROM c.lancado_em) >= 19 THEN 'noite' ELSE 'dia' END
JOIN opme_equipe q ON q.login = e.login
LIMIT 5;`)
};

// ------------------------------------------------------------------ catálogo e validação
const win = {};
new Function('window', fs.readFileSync(path.join(raiz, 'js/catalogo.js'), 'utf8'))(win);
const catalogo = win.MISTERIO_CATALOGO;

const canonica = (t) => (CMD_ALIAS[t] || t);
const primeira = {};   // etiqueta canônica -> arquivo do primeiro caso em que aparece
for (const cs of catalogo) for (const fa of cs.fases) {
  for (const bruto of (fa.sub || '').split('·').map((x) => x.trim()).filter(Boolean)) {
    if (CMD_IGNORAR[bruto]) continue;
    const t = canonica(bruto);
    if (!(t in primeira)) primeira[t] = cs.arq;
  }
}

let erros = 0;
const aviso = (m) => { erros++; console.log('  ✗ ' + m); };
const faltam = Object.keys(primeira).filter((t) => !(t in DADOS));
const sobram = Object.keys(DADOS).filter((t) => !(t in primeira));
// etiqueta sem texto não trava: o pop-up avisa "ainda não escrevi a explicação" (casos novos entram assim)
if (faltam.length) console.log('  ! ' + faltam.length + ' etiqueta(s) ainda sem explicação: ' + faltam.join(' | '));
sobram.forEach((t) => aviso('explicação de [' + t + '] não tem etiqueta no jogo'));

const PREAMBULO = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
`;
const sqlDoCaso = (arq) => (arq === 'guia.html' ? 'banco_do_jogo.sql' : arq.replace('.html', '.sql'));
const mantem = (v) => v;
const PARSERS = { 1082: mantem, 1083: mantem, 1114: mantem, 1184: mantem, 1186: mantem, 1266: mantem };
console.log('conferindo ' + Object.keys(DADOS).length + ' explicações...');
// um banco aberto por vez (vários ao mesmo tempo estouram a memória): agrupa os exemplos por caso
const porBanco = {};
for (const [tag, d] of Object.entries(DADOS)) {
  if (!d.o || !d.h) aviso('[' + tag + '] sem "o" ou "h"');
  const arq = d.db || primeira[tag];
  if (!d.ex || !arq) continue;
  (porBanco[arq] = porBanco[arq] || []).push([tag, d]);
}
for (const [arq, lista] of Object.entries(porBanco)) {
  const db = new PGlite();
  await db.exec(PREAMBULO);
  await db.exec(fs.readFileSync(path.join(raiz, sqlDoCaso(arq)), 'utf8'));
  for (const [tag, d] of lista) {
    try {
      await db.exec('BEGIN');
      if (d.pre) await db.exec(d.pre);
      const rs = await db.exec(d.ex, { rowMode: 'array', parsers: PARSERS });
      const ult = [...rs].reverse().find((r) => r.fields && r.fields.length);
      if (!d.semLinhas && (!ult || ult.rows.length === 0)) aviso('[' + tag + '] o exemplo rodou, mas voltou sem linhas');
    } catch (e) {
      aviso('[' + tag + '] erro no exemplo: ' + String(e.message || e).slice(0, 160));
    } finally {
      try { await db.exec('ROLLBACK'); } catch (e) { /* já desfeito */ }
    }
  }
  await db.close();
}

if (erros) {
  console.log('\n' + erros + ' problema(s). Nada foi gravado.');
  process.exit(1);
}

// grava na ordem em que as etiquetas aparecem no jogo; "pre" e "semLinhas" são só da validação
const saida = {};
for (const t of Object.keys(primeira)) {
  if (!DADOS[t]) continue;
  const { o, h, ex, nota } = DADOS[t];
  saida[t] = { o, h, ...(ex ? { ex } : {}), ...(nota ? { nota } : {}) };
}
fs.writeFileSync(path.join(raiz, 'js', 'comandos-dados.json'), JSON.stringify(saida), 'utf8');
console.log('ok: ' + Object.keys(saida).length + ' explicações gravadas em js/comandos-dados.json');
