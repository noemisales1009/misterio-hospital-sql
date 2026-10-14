// Caderno do detetive: perfil do jogador, evolução, diário de missões e anotações.
// Funciona sem conta (tudo no navegador). Com login, perfil e anotações vão para o Supabase.
(function () {
  var CAT = window.MISTERIO_CATALOGO || [];
  var K_PROG = "misterio-sql-progresso", K_JOG = "misterio-sql-jogador", K_NOTAS = "misterio-sql-notas";
  // foto do jogador: reduzida a 256x256 e guardada como JPEG pequeno (data URL)
  var FOTO_MAX = 150000;
  var PREFIXO_FOTO = "data:image/jpeg;base64,";
  function fotoValida(f) {
    return typeof f === "string" && f.length <= FOTO_MAX && f.indexOf(PREFIXO_FOTO) === 0 &&
      /^[A-Za-z0-9+/=]+$/.test(f.slice(PREFIXO_FOTO.length));
  }
  function iniciais(nome) {
    var p = String(nome || "").trim().split(/ +/).filter(Boolean);
    if (!p.length) return "🕵️";
    var a = p[0].charAt(0), b = p.length > 1 ? p[p.length - 1].charAt(0) : "";
    return (a + b).toUpperCase();
  }
  // foto, se houver; senão um círculo com as iniciais
  function avatarNode(foto, nome) {
    if (fotoValida(foto)) {
      var img = document.createElement("img");
      img.className = "av-foto"; img.alt = "Foto do detetive"; img.src = foto;
      return img;
    }
    var s = document.createElement("span");
    s.className = "av-ini"; s.textContent = iniciais(nome);
    return s;
  }
  function processaFoto(arquivo, pronto) {
    if (!arquivo || !/^image[/]/.test(arquivo.type || "")) { toast("Escolha um arquivo de imagem"); return; }
    if (arquivo.size > 8 * 1024 * 1024) { toast("A imagem é grande demais (máximo 8 MB)"); return; }
    var url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = function () {
      var lado = Math.min(img.width, img.height);
      if (!lado) { URL.revokeObjectURL(url); toast("Não consegui abrir essa imagem"); return; }
      var cv = document.createElement("canvas");
      cv.width = 256; cv.height = 256;
      cv.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      var d = cv.toDataURL("image/jpeg", 0.82);
      if (!fotoValida(d)) { toast("Não foi possível usar essa foto"); return; }
      pronto(d);
    };
    img.onerror = function () { URL.revokeObjectURL(url); toast("Não consegui abrir essa imagem"); };
    img.src = url;
  }
  // abre o seletor de arquivo (câmera ou galeria no celular)
  function escolherFoto(pronto) {
    var f = document.createElement("input");
    f.type = "file"; f.accept = "image/*"; f.style.display = "none";
    f.addEventListener("change", function () {
      processaFoto(f.files && f.files[0], pronto);
      f.remove();
    });
    document.body.appendChild(f);
    f.click();
  }
  var ICONES = {sair:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><path d='M16 17l5-5-5-5'/><path d='M21 12H9'/></svg>",sol:"<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='4.5'/><path d='M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8'/></svg>",lua:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/></svg>",caderno:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z'/><path d='M5 19a2 2 0 0 1 2-2h12'/><path d='M9 7h6M9 11h4'/></svg>",nuvem:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'/></svg>"};
  // botão da barra: ícone desenhado + texto
  function comIcone(btn, nome, texto) {
    btn.textContent = "";
    var s = document.createElement("span");
    s.className = "ic"; s.setAttribute("aria-hidden", "true"); s.innerHTML = ICONES[nome] || "";
    var r = document.createElement("span");
    r.className = "rot"; r.textContent = texto;
    btn.appendChild(s); btn.appendChild(r);
    btn.title = texto; btn.setAttribute("aria-label", texto); btn.classList.add("icone");
  }
  // botão do caderno: mostra a foto do jogador (ou as iniciais)
  function pintaCaderno() {
    if (!botao) return;
    botao.textContent = "";
    var s = document.createElement("span");
    s.className = "ic av"; s.setAttribute("aria-hidden", "true");
    s.appendChild(avatarNode(jog.foto, jog.nome));
    var texto = jog.nome ? jog.nome : "Caderno do detetive";
    var r = document.createElement("span");
    r.className = "rot"; r.textContent = texto;
    botao.appendChild(s); botao.appendChild(r);
    botao.title = "Caderno de " + (jog.nome || "detetive"); botao.setAttribute("aria-label", botao.title); botao.classList.add("icone");
  }
  var NIVEIS = [
    { min: 0, nome: "Aprendiz" },
    { min: 15, nome: "Investigação" },
    { min: 35, nome: "Perícia" },
    { min: 60, nome: "Auditoria" },
    { min: 85, nome: "Mestria em SQL" }
  ];

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
  function nuvem() {
    var n = window.MisterioNuvem;
    return n && n.logado() ? n : null;
  }
  function toast(m) { if (window.MisterioNuvem) window.MisterioNuvem.toast(m); }

  var jog = ler(K_JOG, { nome: "" });
  if (!fotoValida(jog.foto)) delete jog.foto;
  var notas = ler(K_NOTAS, {});

  // ------------------------------------------------------------------ cálculos
  function estado() { return ler(K_PROG, {}); }
  function liberada(fases, i, st) {
    return i === 0 || !!st[fases[i - 1].id] || !!st[fases[i].id];
  }
  function resumo() {
    var st = estado();
    var total = 0, feitas = 0, casosOk = 0, habil = {};
    CAT.forEach(function (c) {
      var f = 0;
      c.fases.forEach(function (fa) {
        total++;
        if (st[fa.id]) {
          feitas++; f++;
          (fa.sub || "").split("·").forEach(function (h) { h = h.trim(); if (h) habil[h] = true; });
        }
      });
      if (c.fases.length && f === c.fases.length) casosOk++;
    });
    var pct = total ? Math.round(feitas / total * 100) : 0;
    var nivel = 0;
    NIVEIS.forEach(function (n, i) { if (pct >= n.min) nivel = i; });
    var qtdNotas = Object.keys(notas).filter(function (k) { return (notas[k] || "").trim(); }).length;
    return { st: st, total: total, feitas: feitas, casosOk: casosOk, pct: pct, nivel: nivel, habil: habil, qtdNotas: qtdNotas };
  }
  function proximaFase(st) {
    // primeira fase pendente e liberada, preferindo casos que já foram começados
    var melhor = null;
    for (var pass = 0; pass < 2 && !melhor; pass++) {
      CAT.forEach(function (c) {
        if (melhor) return;
        var comecou = c.fases.some(function (fa) { return st[fa.id]; });
        if (pass === 0 && !comecou) return;
        for (var i = 0; i < c.fases.length; i++) {
          if (!st[c.fases[i].id] && liberada(c.fases, i, st)) { melhor = { caso: c, fase: c.fases[i] }; return; }
        }
      });
    }
    return melhor;
  }

  // ------------------------------------------------------------------ nuvem
  function salvaPerfilNuvem() {
    var n = nuvem(); if (!n) return;
    n.api("perfil?on_conflict=user_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: n.uid(), nome: jog.nome || "", foto: fotoValida(jog.foto) ? jog.foto : null, atualizado_em: new Date().toISOString() }])
    }).catch(function () {});
  }
  function salvaNotaNuvem(fase, texto) {
    var n = nuvem(); if (!n) return;
    n.api("anotacao?on_conflict=user_id,fase", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: n.uid(), fase: fase, texto: texto, atualizado_em: new Date().toISOString() }])
    }).catch(function () {});
  }
  function puxaNuvem(depois) {
    var n = nuvem(); if (!n) return;
    n.api("perfil?select=nome,foto").then(function (rows) {
      if (rows && rows[0]) {
        if (rows[0].nome) jog.nome = rows[0].nome;
        if (fotoValida(rows[0].foto)) jog.foto = rows[0].foto;
        gravar(K_JOG, jog);
      } else if (jog.nome) { salvaPerfilNuvem(); }
      return n.api("anotacao?select=fase,texto");
    }).then(function (rows) {
      var remoto = {};
      (rows || []).forEach(function (r) { remoto[r.fase] = r.texto; notas[r.fase] = r.texto; });
      gravar(K_NOTAS, notas);
      Object.keys(notas).forEach(function (f) { if (notas[f] && !(f in remoto)) salvaNotaNuvem(f, notas[f]); });
      atualizaBotao();
      if (depois) depois();
    }).catch(function () { if (depois) depois(); });
  }

  // ------------------------------------------------------------------ botão na barra
  var botao = null;
  function rotuloBotao() { return jog.nome ? jog.nome.split(" ")[0] : "Caderno"; }
  function atualizaBotao() { pintaCaderno(); }
  var btnSair = null, btnTema = null;
  function pintaTema() {
    var escuro = window.MisterioTema && window.MisterioTema.atual() === "dark";
    if (btnTema) comIcone(btnTema, escuro ? "sol" : "lua", escuro ? "Claro" : "Escuro");
  }
  function atualizaSair() {
    if (btnSair) btnSair.hidden = !nuvem();
  }
  function criaBotao() {
    var topo = document.querySelector(".trail-top");
    if (!topo || document.getElementById("btnCaderno")) return;
    botao = el("button", "syncbtn push");
    pintaCaderno();
    botao.type = "button"; botao.id = "btnCaderno";
    botao.addEventListener("click", function () { abrir("detetive"); });
    var nu = document.getElementById("btnNuvem");
    topo.insertBefore(botao, nu || null);

    btnTema = el("button", "syncbtn");
    pintaTema();
    btnTema.type = "button"; btnTema.id = "btnTema";
    btnTema.setAttribute("aria-label", "Alternar entre modo claro e escuro");
    btnTema.addEventListener("click", function () { if (window.MisterioTema) window.MisterioTema.alternar(); });
    topo.insertBefore(btnTema, nu || null);

    btnSair = el("button", "syncbtn");
    comIcone(btnSair, "sair", "Sair");
    btnSair.type = "button"; btnSair.id = "btnSair";
    btnSair.setAttribute("aria-label", "Sair da conta");
    btnSair.addEventListener("click", function () {
      if (window.MisterioNuvem) window.MisterioNuvem.sair();
    });
    topo.appendChild(btnSair);
    atualizaSair();
  }

  // ------------------------------------------------------------------ caderno
  var dlg = null, corpo = null, abaAtual = "detetive";
  function monta() {
    dlg = el("dialog", "caderno");
    dlg.setAttribute("aria-label", "Caderno do detetive");
    var livro = el("div", "cad-livro");
    livro.appendChild(el("div", "cad-capa-livro"));
    livro.appendChild(el("div", "cad-espiral"));
    var folha = el("div", "cad-folha");
    var topo = el("div", "cad-topo");
    topo.appendChild(el("h2", "cad-titulo", "Caderno do detetive"));
    var fechar = el("button", "cad-fechar", "×"); fechar.type = "button";
    fechar.title = "Fechar"; fechar.setAttribute("aria-label", "Fechar o caderno");
    fechar.addEventListener("click", function () { dlg.close(); });
    topo.appendChild(fechar);
    corpo = el("div", "cad-pagina");
    folha.appendChild(topo); folha.appendChild(corpo);
    livro.appendChild(folha);
    var abas = el("nav", "cad-abas"); abas.setAttribute("aria-label", "Seções do caderno");
    [["detetive", "Detetive", "amarela"], ["missoes", "Missões", "coral"], ["comandos", "Comandos", "verde"]].forEach(function (a) {
      var bt = el("button", "cad-aba " + a[2], a[1]); bt.type = "button"; bt.setAttribute("data-aba", a[0]);
      bt.addEventListener("click", function () { abrir(a[0]); });
      abas.appendChild(bt);
    });
    livro.appendChild(abas);
    dlg.appendChild(livro);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    document.body.appendChild(dlg);
  }

  function abrir(aba) {
    if (!dlg) monta();
    abaAtual = aba || abaAtual;
    var r = resumo();
    [].forEach.call(dlg.querySelectorAll(".cad-aba"), function (b) {
      b.classList.toggle("ativa", b.getAttribute("data-aba") === abaAtual);
    });
    corpo.textContent = "";
    if (abaAtual === "detetive") paginaDetetive(r);
    else if (abaAtual === "missoes") paginaMissoes(r);
    else paginaComandos(r);
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    corpo.scrollTop = 0;
  }

  function barra(pct) {
    var b = el("div", "cad-barra"), i = el("i"); i.style.width = pct + "%"; b.appendChild(i); return b;
  }

  function paginaDetetive(r) {
    var c = corpo;
    var topo = el("div", "cad-perfil");
    var av = el("div", "cad-avatar");
    av.appendChild(avatarNode(jog.foto, jog.nome));
    topo.appendChild(av);
    var dados = el("div", "cad-dados");
    var rotulo = el("label", null, "Nome do detetive"); rotulo.setAttribute("for", "cadNome");
    var inp = el("input"); inp.id = "cadNome"; inp.type = "text"; inp.maxLength = 40;
    inp.placeholder = "Como devemos te chamar?"; inp.value = jog.nome || "";
    var t;
    inp.addEventListener("input", function () {
      jog.nome = inp.value.trim().slice(0, 40); gravar(K_JOG, jog); atualizaBotao();
      if (!jog.foto) { av.textContent = ""; av.appendChild(avatarNode(null, jog.nome)); }
      clearTimeout(t); t = setTimeout(salvaPerfilNuvem, 700);
    });
    dados.appendChild(rotulo); dados.appendChild(inp);
    var fb = el("div", "cad-foto-botoes");
    var addFoto = el("button", "btn", jog.foto ? "Trocar foto" : "Adicionar foto"); addFoto.type = "button"; addFoto.id = "cadAddFoto";
    addFoto.addEventListener("click", function () {
      escolherFoto(function (d) { jog.foto = d; gravar(K_JOG, jog); salvaPerfilNuvem(); atualizaBotao(); abrir("detetive"); });
    });
    fb.appendChild(addFoto);
    if (jog.foto) {
      var rmFoto = el("button", "btn", "Remover foto"); rmFoto.type = "button"; rmFoto.id = "cadRmFoto";
      rmFoto.addEventListener("click", function () { delete jog.foto; gravar(K_JOG, jog); salvaPerfilNuvem(); abrir("detetive"); });
      fb.appendChild(rmFoto);
    }
    dados.appendChild(fb);
    dados.appendChild(el("p", "cad-nota", "A foto fica reduzida e só aparece para você."));
    topo.appendChild(dados);
    c.appendChild(topo);

    var nv = el("div", "cad-nivel");
    nv.appendChild(el("div", "cad-nivel-t", "Nível " + (r.nivel + 1) + " · " + NIVEIS[r.nivel].nome));
    nv.appendChild(barra(r.pct));
    var prox = NIVEIS[r.nivel + 1];
    nv.appendChild(el("div", "cad-nota", r.pct + "% do jogo concluído" + (prox ? ". Próximo nível aos " + prox.min + "%." : ". Nível máximo!")));
    c.appendChild(nv);

    var grade = el("div", "cad-stats");
    [[r.feitas + "/" + r.total, "fases concluídas"], [r.casosOk + "/" + CAT.length, "casos encerrados"],
     [Object.keys(r.habil).length, "comandos aprendidos"], [r.qtdNotas, "anotações"]].forEach(function (s) {
      var d = el("div", "cad-stat"); d.appendChild(el("b", null, String(s[0]))); d.appendChild(el("span", null, s[1])); grade.appendChild(d);
    });
    c.appendChild(grade);

    c.appendChild(el("h3", null, "Selos dos casos"));
    var selos = el("div", "cad-selos");
    CAT.forEach(function (cs) {
      var f = cs.fases.filter(function (fa) { return r.st[fa.id]; }).length;
      var ok = cs.fases.length && f === cs.fases.length;
      var s = el("div", "cad-selo" + (ok ? " ok" : ""));
      s.appendChild(el("div", "cad-selo-i", ok ? "🏅" : "○"));
      s.appendChild(el("div", "cad-selo-n", "Caso " + cs.n));
      s.appendChild(el("div", "cad-selo-t", cs.titulo));
      s.appendChild(el("div", "cad-nota", f + "/" + cs.fases.length));
      selos.appendChild(s);
    });
    c.appendChild(selos);

    var conta = el("div", "cad-conta");
    var n = window.MisterioNuvem;
    if (n && n.logado()) {
      conta.appendChild(el("p", null, "☁ Conectado como " + n.email() + ". Progresso, nome e anotações ficam salvos na nuvem."));
    } else {
      conta.appendChild(el("p", null, "Sem conta, tudo fica salvo só neste navegador."));
      var ent = el("button", "btn", "Entrar para salvar na nuvem"); ent.type = "button";
      ent.addEventListener("click", function () { dlg.close(); if (n) n.abrirLogin(); });
      conta.appendChild(ent);
    }
    var zera = el("button", "btn cad-perigo", "Recomeçar do zero"); zera.type = "button";
    zera.addEventListener("click", function () {
      if (!window.confirm("Zerar o seu progresso em todos os casos? As anotações são mantidas.")) return;
      var ids = []; CAT.forEach(function (cs) { cs.fases.forEach(function (fa) { ids.push(fa.id); }); });
      var pronto = function () {
        try { localStorage.removeItem(K_PROG); } catch (e) {}
        location.reload();
      };
      var nu = nuvem();
      if (nu) {
        nu.api("progresso?on_conflict=user_id,fase", {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(ids.map(function (id) { return { user_id: nu.uid(), fase: id, concluida: false, atualizado_em: new Date().toISOString() }; }))
        }).then(pronto, pronto);
      } else pronto();
    });
    conta.appendChild(zera);
    c.appendChild(conta);
  }

  function paginaMissoes(r) {
    var c = corpo;
    c.appendChild(el("p", "cad-nota", "Cada fase tem seu espaço de anotações. Ele fica salvo automaticamente."));
    CAT.forEach(function (cs, ci) {
      var feitas = cs.fases.filter(function (fa) { return r.st[fa.id]; }).length;
      var d = el("details", "cad-caso");
      if (ci === 0 || feitas > 0 && feitas < cs.fases.length) d.open = true;
      var sm = el("summary", null, "Caso " + cs.n + " · " + cs.titulo + "  (" + feitas + "/" + cs.fases.length + ")");
      d.appendChild(sm);
      d.appendChild(barra(cs.fases.length ? Math.round(feitas / cs.fases.length * 100) : 0));
      var lista = el("div", "cad-fases");
      cs.fases.forEach(function (fa, i) {
        var feita = !!r.st[fa.id], lib = liberada(cs.fases, i, r.st);
        var linha = el("div", "cad-fase" + (feita ? " feita" : lib ? " atual" : " trava"));
        var cab = el("div", "cad-fase-cab");
        cab.appendChild(el("span", "cad-fase-i", feita ? "✓" : lib ? "▶" : "🔒"));
        var tit = el("div", "cad-fase-t");
        tit.appendChild(el("b", null, fa.num + " · " + (fa.titulo || fa.nome)));
        if (fa.sub) tit.appendChild(el("span", "cad-nota", fa.sub));
        cab.appendChild(tit);
        if (lib) {
          var ir = el("a", "btn", feita ? "Rever" : "Ir"); ir.href = cs.arq + "#" + fa.id;
          ir.addEventListener("click", function () { dlg.close(); });
          cab.appendChild(ir);
        }
        linha.appendChild(cab);
        if (fa.missao) linha.appendChild(el("p", "cad-missao", fa.missao));
        var ta = el("textarea", "cad-nota-area"); ta.rows = 2; ta.maxLength = 4000;
        ta.placeholder = "Minhas anotações desta fase…"; ta.value = notas[fa.id] || "";
        var tm;
        ta.addEventListener("input", function () {
          notas[fa.id] = ta.value; gravar(K_NOTAS, notas);
          clearTimeout(tm); tm = setTimeout(function () { salvaNotaNuvem(fa.id, ta.value); }, 800);
        });
        linha.appendChild(ta);
        lista.appendChild(linha);
      });
      d.appendChild(lista);
      c.appendChild(d);
    });
  }

  function paginaComandos(r) {
    var c = corpo;
    c.appendChild(el("p", "cad-nota", "Os comandos se acendem conforme você conclui as fases em que eles aparecem."));
    var todos = {}, ordem = [];
    CAT.forEach(function (cs) {
      cs.fases.forEach(function (fa) {
        (fa.sub || "").split("·").forEach(function (h) {
          h = h.trim(); if (!h) return;
          if (!(h in todos)) { todos[h] = false; ordem.push(h); }
          if (r.st[fa.id]) todos[h] = true;
        });
      });
    });
    var g = el("div", "cad-cmds");
    ordem.forEach(function (h) {
      g.appendChild(el("span", "cad-cmd" + (todos[h] ? " ok" : ""), h));
    });
    c.appendChild(g);
    c.appendChild(el("p", "cad-nota", Object.keys(r.habil).length + " de " + ordem.length + " aprendidos."));
  }

  // ------------------------------------------------------------------ navegação entre casos
  function arqAtual() {
    var p = location.pathname.split("/").pop() || "index.html";
    return p;
  }
  function rodapeNav() {
    var wrap = document.querySelector(".wrap");
    if (!wrap || document.querySelector(".caso-nav")) return;
    var arq = arqAtual();
    var i = CAT.map(function (c) { return c.arq; }).indexOf(arq);
    if (i < 0) return;
    var nav = el("nav", "caso-nav"); nav.setAttribute("aria-label", "Outros casos");
    var ant = CAT[i - 1], prox = CAT[i + 1];
    if (ant) { var a = el("a", "btn", "← Caso " + ant.n + " · " + ant.titulo); a.href = ant.arq; nav.appendChild(a); }
    var home = el("a", "btn", "Todos os casos"); home.href = "index.html"; nav.appendChild(home);
    if (prox) { var p = el("a", "btn", "Caso " + prox.n + " · " + prox.titulo + " →"); p.href = prox.arq; nav.appendChild(p); }
    wrap.appendChild(nav);
  }

  // ------------------------------------------------------------------ home
  function homeExtras() {
    var casos = document.querySelector(".casos");
    if (!casos || document.getElementById("cadBoasVindas")) return;
    var r = resumo();
    [].forEach.call(casos.querySelectorAll(".caso-card"), function (card) {
      var cs = CAT.filter(function (c) { return c.arq === card.getAttribute("data-arq"); })[0];
      if (!cs) return;
      var f = cs.fases.filter(function (fa) { return r.st[fa.id]; }).length;
      var antiga = card.querySelector(".caso-prog"); if (antiga) antiga.remove();
      var linha = el("div", "caso-prog");
      linha.appendChild(barra(cs.fases.length ? Math.round(f / cs.fases.length * 100) : 0));
      linha.appendChild(el("span", "cad-nota", f === cs.fases.length && f > 0 ? "✓ Caso encerrado" : f + " de " + cs.fases.length + " fases"));
      card.insertBefore(linha, card.querySelector(".caso-go"));
    });
    var box = el("section", "boas-vindas"); box.id = "cadBoasVindas";
    var titulo = el("h2");
    titulo.appendChild(avatarNode(jog.foto, jog.nome));
    titulo.appendChild(document.createTextNode(" " + (jog.nome ? "Olá, " + jog.nome : "Olá, detetive") + "!"));
    box.appendChild(titulo);
    box.appendChild(el("p", null, "Nível " + (r.nivel + 1) + " · " + NIVEIS[r.nivel].nome + " · " + r.feitas + " de " + r.total + " fases concluídas."));
    var prox = proximaFase(r.st);
    var linha2 = el("div", "bv-form");
    if (prox) {
      var go = el("a", "btn big", "Continuar: Caso " + prox.caso.n + " · " + (prox.fase.titulo || prox.fase.nome));
      go.href = prox.caso.arq + "#" + prox.fase.id;
      linha2.appendChild(go);
    } else {
      linha2.appendChild(el("p", null, "🏅 Você encerrou todos os casos. Parabéns!"));
    }
    var cad = el("button", "btn", "Abrir o caderno"); cad.type = "button";
    cad.addEventListener("click", function () { abrir("detetive"); });
    linha2.appendChild(cad);
    if (!jog.nome) {
      var def = el("button", "btn", "Definir meu nome"); def.type = "button";
      def.addEventListener("click", function () { abrirBoasVindas(); });
      linha2.appendChild(def);
    }
    box.appendChild(linha2);
    casos.parentNode.insertBefore(box, casos);
  }

  // ------------------------------------------------------------------ pop-up da primeira entrada
  var K_BV = "misterio-sql-boasvindas";
  var popup = null;
  function jaVisto() { try { return localStorage.getItem(K_BV) === "1"; } catch (e) { return false; } }
  function marcaVisto() { try { localStorage.setItem(K_BV, "1"); } catch (e) {} }
  function loginVisivel() {
    var t = document.getElementById("telaLogin");
    return !!(t && !t.hidden);
  }
  function abrirBoasVindas() {
    if (popup && popup.open) return;
    if (!popup) {
      popup = el("dialog", "bv-popup");
      popup.setAttribute("aria-labelledby", "bvTitulo");
      var selo = el("div", "bv-selo");
      var t = el("h2", null, "Bem-vindo ao hospital!"); t.id = "bvTitulo";
      popup.appendChild(selo);
      popup.appendChild(t);
      popup.appendChild(el("p", null, "Antes de começar: como devemos te chamar, detetive?"));
      var inp = el("input"); inp.type = "text"; inp.maxLength = 40; inp.id = "bvNome";
      inp.placeholder = "Seu nome"; inp.setAttribute("aria-label", "Seu nome"); inp.autocomplete = "nickname";
      popup.appendChild(inp);
      var fotoTemp = jog.foto || null;
      var pintaSelo = function () { selo.textContent = ""; selo.appendChild(avatarNode(fotoTemp, inp.value || jog.nome)); };
      pintaSelo();
      inp.addEventListener("input", pintaSelo);
      var fbp = el("div", "cad-foto-botoes");
      var addp = el("button", "btn", "Adicionar foto (opcional)"); addp.type = "button"; addp.id = "bvAddFoto";
      addp.addEventListener("click", function () {
        escolherFoto(function (d) { fotoTemp = d; addp.textContent = "Trocar foto"; pintaSelo(); });
      });
      fbp.appendChild(addp);
      popup.appendChild(fbp);
      var linha = el("div", "bv-botoes");
      var depois = el("button", "btn", "Agora não"); depois.type = "button";
      var ok = el("button", "btn big", "Começar"); ok.type = "button"; ok.id = "bvOk";
      linha.appendChild(depois); linha.appendChild(ok);
      popup.appendChild(linha);
      depois.addEventListener("click", function () { marcaVisto(); popup.close(); });
      popup.addEventListener("cancel", function () { marcaVisto(); });
      var salvar = function () {
        var v = inp.value.trim().slice(0, 40);
        if (!v) { inp.focus(); inp.classList.add("erro"); return; }
        jog.nome = v; if (fotoTemp) jog.foto = fotoTemp;
        gravar(K_JOG, jog); marcaVisto(); salvaPerfilNuvem(); atualizaBotao();
        popup.close(); homeRefaz();
      };
      ok.addEventListener("click", salvar);
      inp.addEventListener("input", function () { inp.classList.remove("erro"); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); salvar(); } });
      document.body.appendChild(popup);
    }
    popup.querySelector("#bvNome").value = jog.nome || "";
    if (popup.showModal) popup.showModal(); else popup.setAttribute("open", "");
    popup.querySelector("#bvNome").focus();
  }
  function talvezBoasVindas() {
    if (jog.nome || jaVisto() || loginVisivel()) return;
    abrirBoasVindas();
  }

  // ------------------------------------------------------------------ início
  function rodapeAutoria() {
    if (document.querySelector(".rodape-autoria")) return;
    var f = el("footer", "rodape-autoria", "Aplicativo criado por Noemi Sales");
    document.body.appendChild(f);
    var card = document.querySelector(".tela-card");
    if (card && !card.querySelector(".tela-autoria")) card.appendChild(el("p", "tela-autoria", "Aplicativo criado por Noemi Sales"));
  }
  function iniciar() {
    rodapeAutoria();
    criaBotao();
    rodapeNav();
    homeExtras();
    document.addEventListener("misterio:login", function () { puxaNuvem(function () { homeRefaz(); talvezBoasVindas(); }); });
    document.addEventListener("misterio:sessao", function () { atualizaSair(); atualizaBotao(); });
    var tela = document.getElementById("telaLogin");
    if (tela && window.MutationObserver) {
      new MutationObserver(function () {
        // tela de login fechou sem entrar ("continuar sem entrar"): pergunta o nome já
        if (tela.hidden && !nuvem()) talvezBoasVindas();
      }).observe(tela, { attributes: true, attributeFilter: ["hidden"] });
    }
    if (nuvem()) puxaNuvem(function () { homeRefaz(); talvezBoasVindas(); });
    else talvezBoasVindas();
  }
  function homeRefaz() {
    var b = document.getElementById("cadBoasVindas");
    if (b) { b.remove(); homeExtras(); }
  }
  window.MisterioCaderno = { abrir: abrir };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
