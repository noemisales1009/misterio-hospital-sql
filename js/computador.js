// Computador da investigação: um terminal SQL dentro de cada fase.
// O banco do caso roda no próprio navegador (Postgres via PGlite), então nada é enviado ao Supabase
// e ninguém consegue estragar nada. A correção compara o resultado com o das soluções da fase.
(function () {
  "use strict";

  // PGlite guardado em vendor/pglite: o computador funciona sem internet
  var CDN = new URL("vendor/pglite/index.js", document.baseURI).href;
  var K_CODIGO = "misterio-sql-codigo";
  var K_CONF = "misterio-sql-conferido";
  var K_MINHAS = "misterio-sql-minhas-tabelas";
  var MAX_LINHAS = 100;
  var MAX_MINHAS = 300;
  var SEM_ANIMACAO = false;
  try { SEM_ANIMACAO = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function ler(k, def) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; }
  }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function toast(m) { if (window.MisterioNuvem) window.MisterioNuvem.toast(m); }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ------------------------------------------------------------------ motor (um por página)
  var motor = { db: null, pronto: false, carregando: null, tabelas: [], cache: {}, avisos: [] };
  var mantem = function (s) { return s; };
  var PARSERS = { 1082: mantem, 1083: mantem, 1114: mantem, 1184: mantem, 1186: mantem, 1266: mantem };

  function sqlDoCaso() {
    var src = document.getElementById("sqlsrc");
    var s = src ? src.textContent : "";
    // o Caso 1 traz também as tabelas da conta (login), que não existem no navegador
    var a = s.indexOf("-- Progresso do jogo");
    var b = s.indexOf("-- Conferir a resposta:");
    if (a > -1 && b > a) s = s.slice(0, a) + s.slice(b);
    return s;
  }
  // Baixa o banco como bytes e compila na mão. Assim não importa o tipo de arquivo que o servidor
  // declara para o .wasm (alguns hospedam como text/plain, e o navegador recusa nesse caso).
  function baixa(url, comoBytes) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("não foi possível baixar " + url.split("/").pop() + " (" + r.status + ")");
      return comoBytes ? r.arrayBuffer() : r.blob();
    });
  }
  function novoBanco() {
    var pasta = new URL("vendor/pglite/", document.baseURI).href;
    return Promise.all([
      import(CDN),
      baixa(pasta + "postgres.wasm", true).then(function (bytes) { return WebAssembly.compile(bytes); }),
      baixa(pasta + "postgres.data", false)
    ]).then(function (v) {
      var db = new v[0].PGlite({ wasmModule: v[1], fsBundle: v[2] });
      return db.waitReady.then(function () { return db; });
    });
  }
  function carregaTabelas() {
    return motor.db.query(
      "SELECT table_name, column_name, data_type FROM information_schema.columns " +
      "WHERE table_schema = 'public' ORDER BY table_name, ordinal_position"
    ).then(function (r) {
      var mapa = {}, ordem = [];
      r.rows.forEach(function (x) {
        if (!mapa[x.table_name]) { mapa[x.table_name] = []; ordem.push(x.table_name); }
        mapa[x.table_name].push({ nome: x.column_name, tipo: x.data_type });
      });
      motor.tabelas = ordem.map(function (n) { return { nome: n, colunas: mapa[n] }; });
    });
  }
  // ------------------------------------------------------------------ o caderno do detetive
  // A tabela "caderno" (fase Extra) é da pessoa, não do caso. O banco nasce de novo a cada visita,
  // então guardamos no navegador os comandos que mexem SÓ no caderno e os refazemos ao ligar.
  var ALVO_ESCRITA = /\b(?:insert\s+into|update|delete\s+from|drop\s+table(?:\s+if\s+exists)?|alter\s+table(?:\s+if\s+exists)?|truncate(?:\s+table)?|create\s+table(?:\s+if\s+not\s+exists)?)\s+"?([a-z_][a-z0-9_]*)"?/gi;
  var MUDA_ESQUEMA = /\b(create|drop|alter)\s+table\b/i;
  function paginaAtual() { return location.pathname.split("/").pop().replace(/\.html$/, "") || "index"; }
  function soMexeNoCaderno(sql) {
    var limpo = sql.replace(/--[^\n]*/g, "");
    var alvos = [], m;
    ALVO_ESCRITA.lastIndex = 0;
    while ((m = ALVO_ESCRITA.exec(limpo))) alvos.push(m[1].toLowerCase());
    return alvos.length > 0 && alvos.every(function (a) { return a === "caderno"; });
  }
  function guardaMinhas(sql) {
    if (!soMexeNoCaderno(sql)) return;
    var todas = ler(K_MINHAS, {});
    var lista = todas[paginaAtual()] || [];
    if (lista.length >= MAX_MINHAS) return;
    lista.push(sql);
    todas[paginaAtual()] = lista;
    gravar(K_MINHAS, todas);
  }
  function temMinhas() { return (ler(K_MINHAS, {})[paginaAtual()] || []).length > 0; }
  function refazMinhas(db) {
    return (ler(K_MINHAS, {})[paginaAtual()] || []).reduce(function (p, sql) {
      return p.then(function () { return db.exec(sql); }).catch(function () {});
    }, Promise.resolve());
  }
  // depois de CREATE/DROP/ALTER TABLE, o painel TABELAS precisa mostrar a mudança
  function atualizaTabelas() {
    return carregaTabelas().then(function () { document.dispatchEvent(new Event("misterio:banco")); });
  }

  function ligar() {
    if (motor.pronto) return Promise.resolve();
    if (motor.carregando) return motor.carregando;
    motor.carregando = novoBanco().then(function (db) {
      motor.db = db;
      return db.exec(sqlDoCaso()).then(function () { return refazMinhas(db); });
    }).then(carregaTabelas).then(function () {
      motor.pronto = true;
    }).catch(function (e) {
      motor.carregando = null;
      throw e;
    });
    return motor.carregando;
  }
  function reiniciar() {
    var antigo = motor.db;
    motor.pronto = false; motor.carregando = null; motor.cache = {}; motor.db = null;
    var fecha = antigo && antigo.close ? antigo.close().catch(function () {}) : Promise.resolve();
    return fecha.then(ligar);
  }
  function executa(sql) {
    return motor.db.exec(sql, { rowMode: "array", parsers: PARSERS }).then(function (rs) {
      var ult = null;
      rs.forEach(function (r) { if (r.fields && r.fields.length) ult = r; });
      if (!ult) return { campos: [], linhas: [], afetadas: rs.length ? rs[rs.length - 1].affectedRows || 0 : 0, semTabela: true };
      return { campos: ult.fields.map(function (f) { return f.name; }), linhas: ult.rows, afetadas: ult.affectedRows || 0, semTabela: false };
    });
  }

  // ------------------------------------------------------------------ comparação com as soluções
  function norm(v) {
    if (v === null || v === undefined) return "∅NULL";
    if (typeof v === "bigint") return v.toString();
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "object") return JSON.stringify(v);
    var s = String(v);
    return /^-?\d+(\.\d+)?$/.test(s) ? String(parseFloat(s)) : s;
  }
  function assinatura(linhas) {
    return linhas.map(function (r) { return r.map(norm).join("␟"); }).sort().join("␞");
  }
  function somenteLeitura(sql) {
    var limpo = sql.replace(/--[^\n]*/g, "").trim();
    if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i.test(limpo)) return false;
    var partes = limpo.split(";").map(function (p) { return p.trim(); }).filter(Boolean);
    return partes.length > 0 && partes.every(function (p) { return /^(select|with)\b/i.test(p); });
  }
  function solucoesDa(sec) {
    return [].map.call(sec.querySelectorAll("details.sol pre[data-sql]"), function (p) { return p.textContent; });
  }
  function esperado(sql) {
    if (!somenteLeitura(sql)) return Promise.resolve(null);
    if (sql in motor.cache) return Promise.resolve(motor.cache[sql]);
    return executa(sql).then(function (r) {
      var v = r.semTabela ? null : { campos: r.campos.length, n: r.linhas.length, sig: assinatura(r.linhas) };
      motor.cache[sql] = v;
      return v;
    }).catch(function () { motor.cache[sql] = null; return null; });
  }

  // ------------------------------------------------------------------ mensagens de erro em português
  function traduz(msg) {
    var m;
    if ((m = /relation "([^"]+)" does not exist/.exec(msg))) return "A tabela \"" + m[1] + "\" não existe. Veja os nomes no mapa de tabelas.";
    if ((m = /column "([^"]+)" does not exist/.exec(msg))) return "A coluna \"" + m[1] + "\" não existe. Confira o nome no mapa de tabelas.";
    if ((m = /syntax error at or near "([^"]*)"/.exec(msg))) return "Erro de escrita perto de \"" + m[1] + "\". Confira vírgulas, parênteses, aspas e a ordem dos comandos.";
    if (/syntax error at end of input/.test(msg)) return "A consulta parece incompleta. Falta algum pedaço no final?";
    if (/ambiguous/.test(msg)) return "Essa coluna existe em mais de uma tabela. Escreva tabela.coluna.";
    if (/must appear in the GROUP BY/.test(msg)) return "Toda coluna do SELECT precisa estar no GROUP BY ou dentro de COUNT, SUM, MAX…";
    if (/operator does not exist/.test(msg)) return "Os tipos não combinam (texto com número?). Confira aspas e valores.";
    if (/unterminated quoted string/.test(msg)) return "Faltou fechar uma aspa.";
    return null;
  }

  // ------------------------------------------------------------------ digitação
  // escreve um texto na tela, letra por letra
  function digita(no, texto, ms) {
    if (SEM_ANIMACAO) { no.textContent += texto; return Promise.resolve(); }
    return new Promise(function (resolve) {
      var i = 0;
      (function passo() {
        no.textContent += texto.charAt(i++);
        if (i < texto.length) setTimeout(passo, ms || 9); else resolve();
      })();
    });
  }

  // ------------------------------------------------------------------ painel de cada fase
  function criaComputador(sec) {
    var faseId = sec.id;
    var pc = el("div", "pc");
    pc.setAttribute("data-fase", faseId);

    var monitor = el("div", "pc-monitor");
    var moldura = el("div", "pc-moldura");
    var tela = el("div", "pc-tela");

    var barra = el("div", "pc-barra");
    var luzes = el("span", "pc-luzes");
    luzes.appendChild(el("i")); luzes.appendChild(el("i")); luzes.appendChild(el("i"));
    barra.appendChild(luzes);
    barra.appendChild(el("b", null, "detetive@hospital  ·  consultas SQL"));
    var status = el("span", "pc-status", "desligado");
    barra.appendChild(status);
    tela.appendChild(barra);

    var corpo = el("div", "pc-corpo");
    var lateral = el("aside", "pc-tabelas");
    lateral.appendChild(el("div", "pc-tit", "TABELAS"));
    var lista = el("div", "pc-lista");
    lista.appendChild(el("p", "pc-vazio", "Ligue o computador para ver as tabelas."));
    lateral.appendChild(lista);

    var principal = el("div", "pc-principal");
    var editor = el("div", "pc-editor");
    editor.appendChild(el("span", "pc-prompt", "sql>"));
    var area = el("textarea", "pc-codigo");
    area.setAttribute("spellcheck", "false"); area.setAttribute("autocomplete", "off");
    area.setAttribute("autocapitalize", "off"); area.setAttribute("rows", "5");
    area.setAttribute("aria-label", "Digite sua consulta SQL");
    area.placeholder = "Digite sua consulta aqui e aperte Ctrl+Enter…";
    var rascunhos = ler(K_CODIGO, {});
    area.value = rascunhos[faseId] || "";
    editor.appendChild(area);
    principal.appendChild(editor);

    var acoes = el("div", "pc-acoes");
    var rodar = el("button", "pc-botao pc-rodar", "▶ Rodar"); rodar.type = "button";
    var ligarBtn = el("button", "pc-botao", "⏻ Ligar"); ligarBtn.type = "button";
    var copiar = el("button", "pc-botao", "Copiar"); copiar.type = "button";
    copiar.title = "Copia o que está no editor";
    var colar = el("button", "pc-botao", "Colar"); colar.type = "button";
    colar.title = "Cola o que você copiou, no ponto onde está o cursor";
    var limpar = el("button", "pc-botao", "Limpar"); limpar.type = "button";
    var reset = el("button", "pc-botao", "Reiniciar banco"); reset.type = "button";
    reset.title = "Volta as tabelas do mistério ao começo, desfazendo o que você alterou nelas. Seu caderno é mantido (para apagá-lo: DROP TABLE caderno;)";
    acoes.appendChild(ligarBtn); acoes.appendChild(rodar); acoes.appendChild(copiar); acoes.appendChild(colar);
    acoes.appendChild(limpar); acoes.appendChild(reset);
    acoes.appendChild(el("span", "pc-dica", "Ctrl+Enter roda"));
    principal.appendChild(acoes);

    var saida = el("div", "pc-saida"); saida.setAttribute("aria-live", "polite");
    var linhaSaida = el("pre", "pc-texto");
    linhaSaida.textContent = "Computador desligado. Aperte ⏻ Ligar, ou ▶ Rodar, para começar.";
    saida.appendChild(linhaSaida);
    principal.appendChild(saida);

    corpo.appendChild(lateral);
    corpo.appendChild(principal);
    tela.appendChild(corpo);
    moldura.appendChild(tela);

    var queixo = el("div", "pc-queixo");
    var led = el("span", "pc-led");
    queixo.appendChild(el("span", "pc-marca", "HOSPITAL-PC"));
    queixo.appendChild(led);
    moldura.appendChild(queixo);
    monitor.appendChild(moldura);
    monitor.appendChild(el("div", "pc-pescoco"));
    monitor.appendChild(el("div", "pc-base"));
    pc.appendChild(monitor);


    // ---------------- estado visual
    function marca(estado, texto) {
      pc.setAttribute("data-estado", estado);
      status.textContent = texto;
    }
    function limpaSaida() { saida.textContent = ""; }
    function mensagem(txt, classe) {
      limpaSaida();
      var p = el("pre", "pc-texto " + (classe || ""), txt);
      saida.appendChild(p);
      return p;
    }
    function pintaTabelas() {
      lista.textContent = "";
      if (!motor.tabelas.length) { lista.appendChild(el("p", "pc-vazio", "Sem tabelas.")); return; }
      motor.tabelas.forEach(function (t) {
        var d = el("details", "pc-tab");
        var s = el("summary", null, t.nome);
        d.appendChild(s);
        var ul = el("ul");
        t.colunas.forEach(function (c) {
          var li = el("li");
          var b = el("button", "pc-col", c.nome); b.type = "button"; b.title = c.tipo;
          b.addEventListener("click", function () { inserir(c.nome); });
          li.appendChild(b); li.appendChild(el("span", "pc-tipo", c.tipo));
          ul.appendChild(li);
        });
        var ver = el("button", "pc-ver", "ver as 10 primeiras linhas"); ver.type = "button";
        ver.addEventListener("click", function () {
          area.value = "SELECT * FROM " + t.nome + " LIMIT 10;"; guardaRascunho(); area.focus();
        });
        d.appendChild(ul); d.appendChild(ver);
        lista.appendChild(d);
      });
    }
    function inserir(texto) {
      var ini = area.selectionStart, fim = area.selectionEnd;
      var v = area.value;
      area.value = v.slice(0, ini) + texto + v.slice(fim);
      area.selectionStart = area.selectionEnd = ini + texto.length;
      guardaRascunho(); area.focus();
    }
    function guardaRascunho() {
      var r = ler(K_CODIGO, {});
      r[faseId] = area.value;
      gravar(K_CODIGO, r);
    }

    // ---------------- ligar
    var primeiraVez = true;
    function liga() {
      if (motor.pronto) {
        marca("ligado", "ligado");
        pintaTabelas();
        return Promise.resolve();
      }
      marca("ligando", "ligando…");
      var p = mensagem("", "boot");
      var tTexto = "> ligando o computador…\n> carregando o banco de dados do caso…\n";
      var animacao = digita(p, tTexto, 8);
      // relógio: mostra que não travou e avisa se estiver demorando
      var seg = 0;
      var relogio = setInterval(function () {
        seg++;
        status.textContent = "ligando… " + seg + " s";
        if (seg === 12) p.textContent += "\n> está demorando mais que o normal, aguarde mais um pouco…";
      }, 1000);
      return Promise.all([ligar(), animacao]).then(function () {
        clearInterval(relogio);
        marca("ligado", "ligado");
        pintaTabelas();
        var n = motor.tabelas.length;
        return digita(p, "> pronto: " + n + " tabelas carregadas.\n> digite uma consulta e aperte Ctrl+Enter.", 8);
      }).catch(function (e) {
        clearInterval(relogio);
        marca("erro", "sem conexão");
        mensagem("Não consegui ligar o computador.\nTente recarregar a página (Ctrl+F5). Se você abriu o arquivo direto da pasta, abra pelo endereço do site.\n(" + (e && e.message ? e.message : e) + ")", "erro");
        throw e;
      });
    }
    function sincronizaSeJaLigado() {
      if (motor.pronto) { marca("ligado", "ligado"); pintaTabelas(); linhaSaida.textContent = "Computador ligado. Digite uma consulta e aperte Ctrl+Enter."; }
    }

    // ---------------- executar
    function marcarConferido(idx, total) {
      var c = ler(K_CONF, {});
      var lista2 = c[faseId] || [];
      if (lista2.indexOf(idx) === -1) lista2.push(idx);
      c[faseId] = lista2;
      gravar(K_CONF, c);
      return lista2;
    }
    function tabelaDe(res) {
      var moldura2 = el("div", "pc-tabela-rolagem");
      var tb = el("table", "pc-tabela");
      var th = el("thead"), trh = el("tr");
      res.campos.forEach(function (c) { trh.appendChild(el("th", null, c)); });
      th.appendChild(trh); tb.appendChild(th);
      var tbody = el("tbody");
      res.linhas.slice(0, MAX_LINHAS).forEach(function (r) {
        var tr = el("tr");
        r.forEach(function (v) {
          var td = el("td");
          if (v === null || v === undefined) { td.textContent = "NULL"; td.className = "nulo"; }
          else td.textContent = typeof v === "object" ? JSON.stringify(v) : String(v);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tb.appendChild(tbody); moldura2.appendChild(tb);
      return moldura2;
    }
    function resumoDe(n) {
      return n + (n === 1 ? " linha" : " linhas") + (n > MAX_LINHAS ? " (mostrando as " + MAX_LINHAS + " primeiras)" : "");
    }
    function relatorio(res) {
      limpaSaida();
      var topo = el("div", "pc-resumo");
      if (res.semTabela) {
        topo.textContent = "Comando executado" + (res.afetadas ? " · " + res.afetadas + " linha(s) afetada(s)" : "") + ".";
        saida.appendChild(topo);
        return;
      }
      topo.textContent = resumoDe(res.linhas.length);
      saida.appendChild(topo);
      saida.appendChild(tabelaDe(res));
    }
    // CREATE/INSERT/UPDATE/DELETE não devolvem linhas: mostra como o caderno ficou depois do comando
    function mostraCaderno(sql, res) {
      if (!res.semTabela || !soMexeNoCaderno(sql) || /\bdrop\s+table\b/i.test(sql)) return Promise.resolve();
      return executa("SELECT * FROM caderno ORDER BY id").then(function (c) {
        saida.appendChild(el("div", "pc-resumo", "Como o caderno ficou: " + resumoDe(c.linhas.length) + "."));
        saida.appendChild(tabelaDe(c));
      }).catch(function () {});
    }
    function veredito(res) {
      var sols = solucoesDa(sec);
      if (!sols.length || res.semTabela) return Promise.resolve();
      var minha = { campos: res.campos.length, n: res.linhas.length, sig: assinatura(res.linhas) };
      return Promise.all(sols.map(esperado)).then(function (exps) {
        var comparaveis = [];
        exps.forEach(function (x, i) { if (x) comparaveis.push(i); });
        if (!comparaveis.length) return;
        var achou = -1;
        comparaveis.forEach(function (i) { if (achou === -1 && exps[i].sig === minha.sig) achou = i; });
        var aviso = el("div", "pc-veredito");
        if (achou > -1) {
          var feitos = marcarConferido(achou, comparaveis.length);
          var certos = comparaveis.filter(function (i) { return feitos.indexOf(i) > -1; }).length;
          aviso.classList.add("ok");
          aviso.appendChild(el("b", null, "✅ Resultado certo!"));
          if (comparaveis.length > 1) {
            aviso.appendChild(document.createTextNode(" Missões conferidas nesta fase: " + certos + " de " + comparaveis.length + "."));
          }
          saida.appendChild(aviso);
          if (certos === comparaveis.length) {
            var cb = sec.querySelector('input[type="checkbox"]');
            if (cb && !cb.checked) {
              var b = el("button", "pc-botao pc-concluir", "🏁 Concluir esta fase"); b.type = "button";
              b.addEventListener("click", function () { cb.click(); });
              aviso.appendChild(document.createElement("br"));
              aviso.appendChild(b);
            }
          }
        } else {
          var alvo = null;
          comparaveis.forEach(function (i) { if (!alvo && exps[i].campos === minha.campos) alvo = exps[i]; });
          alvo = alvo || exps[comparaveis[0]];
          aviso.classList.add("quase");
          aviso.appendChild(el("b", null, "Ainda não bate com o esperado."));
          var dica = " O seu resultado tem " + minha.n + " linha(s) e " + minha.campos + " coluna(s); o esperado tem " + alvo.n + " linha(s) e " + alvo.campos + " coluna(s).";
          if (minha.n === alvo.n && minha.campos === alvo.campos) dica = " O formato está igual, mas algum valor difere. Confira filtros, colunas e arredondamento.";
          aviso.appendChild(document.createTextNode(dica));
          saida.appendChild(aviso);
        }
      });
    }
    function roda() {
      var sql = area.value.trim();
      if (!sql) { mensagem("Digite uma consulta primeiro. Dica: clique no nome de uma tabela, à esquerda.", "dica"); area.focus(); return; }
      guardaRascunho();
      var prepara = motor.pronto ? Promise.resolve() : liga();
      prepara.then(function () {
        marca("ligado", "rodando…");
        var t0 = performance.now();
        return executa(sql).then(function (res) {
          marca("ligado", "ligado");
          relatorio(res);
          var seg = ((performance.now() - t0) / 1000).toFixed(2);
          var rod = el("div", "pc-rodape", "executado em " + seg + " s");
          saida.appendChild(rod);
          guardaMinhas(sql);
          var fim = function () { return mostraCaderno(sql, res).then(function () { return veredito(res); }); };
          if (!MUDA_ESQUEMA.test(sql)) return fim();
          return atualizaTabelas().then(function () {
            if (/\bcreate\s+table\b/i.test(sql)) saida.appendChild(el("div", "pc-rodape", "A tabela nova já aparece no painel TABELAS, à esquerda."));
            return fim();
          });
        });
      }).catch(function (e) {
        if (!motor.pronto) return;
        marca("ligado", "ligado");
        var msg = String(e && e.message ? e.message : e);
        var p = mensagem("ERRO: " + msg, "erro");
        var t = traduz(msg);
        if (t) {
          var d = el("div", "pc-veredito quase");
          d.appendChild(el("b", null, "Dica: "));
          d.appendChild(document.createTextNode(t));
          saida.appendChild(d);
        }
      });
    }

    // ---------------- eventos
    ligarBtn.addEventListener("click", function () { liga().catch(function () {}); });
    rodar.addEventListener("click", roda);
    limpar.addEventListener("click", function () { area.value = ""; guardaRascunho(); area.focus(); });

    // feedback no próprio botão: "Copiado!" por um instante
    function aviso(btn, texto) {
      var antes = btn.getAttribute("data-rot") || btn.textContent;
      btn.setAttribute("data-rot", antes);
      btn.textContent = texto;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = antes; }, 1500);
    }
    function copiaTexto(txt) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
      return new Promise(function (ok, no) {
        try {
          var t = document.createElement("textarea");
          t.value = txt; t.style.position = "fixed"; t.style.opacity = "0";
          document.body.appendChild(t); t.select();
          var r = document.execCommand("copy");
          t.remove();
          r ? ok() : no(new Error("copy"));
        } catch (e) { no(e); }
      });
    }
    copiar.addEventListener("click", function () {
      var txt = area.value;
      if (!txt.trim()) { aviso(copiar, "Nada para copiar"); return; }
      copiaTexto(txt).then(function () { aviso(copiar, "Copiado!"); }, function () {
        area.focus(); area.select();
        aviso(copiar, "Selecionado: use Ctrl+C");
      });
    });
    colar.addEventListener("click", function () {
      var coloca = function (txt) {
        var ini = area.selectionStart, fim = area.selectionEnd;
        area.value = area.value.slice(0, ini) + txt + area.value.slice(fim);
        area.selectionStart = area.selectionEnd = ini + txt.length;
        guardaRascunho(); area.focus();
        aviso(colar, "Colado!");
      };
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) {
          if (t) coloca(t); else aviso(colar, "Nada copiado");
        }, function () {
          // o navegador pode não deixar ler a área de transferência: pede o atalho
          area.focus();
          aviso(colar, "Aperte Ctrl+V");
        });
      } else {
        area.focus();
        aviso(colar, "Aperte Ctrl+V");
      }
    });
    reset.addEventListener("click", function () {
      marca("ligando", "reiniciando…");
      mensagem("> reiniciando o banco de dados…", "boot");
      reiniciar().then(function () {
        marca("ligado", "ligado");
        mensagem(temMinhas() ? "> banco reiniciado. As tabelas do mistério voltaram ao começo; seu caderno foi mantido." : "> banco reiniciado. Tudo voltou ao começo.", "boot");
        document.dispatchEvent(new Event("misterio:banco"));
      }).catch(function () { marca("erro", "sem conexão"); });
    });
    area.addEventListener("input", guardaRascunho);
    area.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); roda(); return; }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        var ini = area.selectionStart;
        area.value = area.value.slice(0, ini) + "  " + area.value.slice(area.selectionEnd);
        area.selectionStart = area.selectionEnd = ini + 2;
      }
    });
    document.addEventListener("misterio:banco", function () {
      if (motor.pronto) pintaTabelas();
    });

    marca("desligado", "desligado");
    sincronizaSeJaLigado();
    pc._leva = function (sql) { area.value = sql; guardaRascunho(); area.focus(); area.scrollIntoView({ block: "center", behavior: "smooth" }); };
    return pc;
  }

  // ------------------------------------------------------------------ montagem nas fases
  function monta() {
    var secoes = [].slice.call(document.querySelectorAll("section[data-fase]"));
    secoes.forEach(function (sec, i) {
      var corpo = sec.querySelector(".fase-corpo") || sec;
      if (corpo.querySelector(".pc")) return;
      var pc = criaComputador(sec);
      var missao = corpo.querySelector(".missao");
      if (missao) missao.parentNode.insertBefore(pc, missao.nextSibling);
      else {
        var fim = corpo.querySelector(".done-row");
        corpo.insertBefore(pc, fim || null);
      }
      // aviso na primeira fase (montar o laboratório)
      if (i === 0) {
        var caixa = el("div", "box");
        caixa.appendChild(el("b", "l", "Atalho"));
        caixa.appendChild(el("p", null, "Você pode pular a instalação no Supabase para começar a jogar: em cada fase há um computador que já traz o banco deste caso. O Supabase só é necessário se quiser praticar no painel de verdade."));
        corpo.insertBefore(caixa, corpo.firstChild);
      }
      // exemplos viram "levar para o computador"
      [].forEach.call(corpo.querySelectorAll(".code"), function (bloco) {
        if (bloco.closest("details.sol")) return;
        var pre = bloco.querySelector("pre[data-sql]");
        if (!pre || bloco.querySelector(".pc-leva")) return;
        var b = el("button", "btn pc-leva", "Levar para o computador"); b.type = "button";
        b.addEventListener("click", function () { pc._leva(pre.textContent); });
        bloco.appendChild(b);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", monta);
  else monta();
  window.MisterioComputador = { motor: motor, reiniciar: reiniciar };
})();
