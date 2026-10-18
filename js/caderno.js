// Caderno do detetive: perfil do jogador, evolução, diário de missões e anotações.
// Funciona sem conta (tudo no navegador). Com login, perfil e anotações vão para o Supabase.
(function () {
  var CAT = window.MISTERIO_CATALOGO || [];
  // "treino" = módulo sem culpado (construir um banco): conta nas fases, mas fica fora dos casos encerrados e da galeria
  var CASOS = CAT.filter(function (c) { return !c.treino; });
  function nomeCaso(cs) { return cs.treino ? "Treino" : "Caso " + cs.n; }
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
  var ICONES = {entrar:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4'/><path d='M10 17l5-5-5-5'/><path d='M15 12H3'/></svg>",play:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M8 5l11 7-11 7z'/></svg>",sair:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><path d='M16 17l5-5-5-5'/><path d='M21 12H9'/></svg>",sol:"<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='4.5'/><path d='M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8'/></svg>",lua:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/></svg>",caderno:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z'/><path d='M5 19a2 2 0 0 1 2-2h12'/><path d='M9 7h6M9 11h4'/></svg>",nuvem:"<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z'/></svg>"};
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
    pintaConta();
  }

  // ------------------------------------------------------------------ menu da conta (celular)
  // No celular a barra mostra só a foto; tocar nela abre esta lista com os botões da barra.
  var conta = null, contaBotao = null, contaLista = null;
  var SETA = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 9l6 6 6-6'/></svg>";
  function pintaConta() {
    if (!contaBotao) return;
    contaBotao.textContent = "";
    var s = el("span", "ic av"); s.setAttribute("aria-hidden", "true");
    s.appendChild(avatarNode(jog.foto, jog.nome));
    var seta = el("span", "seta"); seta.setAttribute("aria-hidden", "true"); seta.innerHTML = SETA;
    contaBotao.appendChild(s); contaBotao.appendChild(seta);
  }
  function criaMenuConta(topo) {
    conta = el("div", "conta");
    contaBotao = el("button", "syncbtn conta-botao"); contaBotao.type = "button"; contaBotao.id = "btnConta";
    contaBotao.title = "Menu"; contaBotao.setAttribute("aria-label", "Menu: caderno, tema e conta");
    contaBotao.setAttribute("aria-expanded", "false"); contaBotao.setAttribute("aria-controls", "contaLista");
    contaLista = el("div", "conta-lista"); contaLista.id = "contaLista"; contaLista.hidden = true;
    contaBotao.addEventListener("click", function () { if (contaLista.hidden) abreConta(); else fechaConta(); });
    conta.appendChild(contaBotao); conta.appendChild(contaLista);
    topo.appendChild(conta);
    pintaConta();
    document.addEventListener("click", function (e) { if (!contaLista.hidden && !conta.contains(e.target)) fechaConta(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !contaLista.hidden) { fechaConta(); contaBotao.focus(); }
    });
  }
  function itemConta(icone, texto, acao) {
    var b = el("button", "conta-item"); b.type = "button";
    var s = el("span", "ic"); s.setAttribute("aria-hidden", "true"); s.innerHTML = icone;
    b.appendChild(s); b.appendChild(el("span", null, texto));
    b.addEventListener("click", function () { fechaConta(); acao(); });
    contaLista.appendChild(b);
  }
  function abreConta() {
    contaLista.textContent = "";
    if (jog.nome) contaLista.appendChild(el("div", "conta-nome", jog.nome));
    itemConta(ICONES.caderno, "Caderno do detetive", function () { abrir("detetive"); });
    var nuvemBtn = document.getElementById("btnNuvem");
    // sem conta, a nuvem e o "Entrar" fazem a mesma coisa: fica só o "Entrar"
    var itens = [btnTema, nuvemBtn && nuvemBtn.dataset.on === "1" ? nuvemBtn : null, btnSair];
    itens.forEach(function (b) {
      if (!b || b.hidden) return;
      var ic = b.querySelector(".ic"), rot = b.querySelector(".rot");
      itemConta(ic ? ic.innerHTML : "", rot ? rot.textContent : b.title, function () { b.click(); });
    });
    contaLista.hidden = false; contaBotao.setAttribute("aria-expanded", "true");
  }
  function fechaConta() {
    if (!contaLista || contaLista.hidden) return;
    contaLista.hidden = true; contaBotao.setAttribute("aria-expanded", "false");
  }
  // imagem anexada a uma anotação: reduzida a no máximo 900 px e guardada como JPEG pequeno
  var IMG_MAX_CARACTERES = 300000;
  function imagemValida(d) {
    return typeof d === "string" && d.length <= IMG_MAX_CARACTERES && d.indexOf(PREFIXO_FOTO) === 0 &&
      /^[A-Za-z0-9+/=]+$/.test(d.slice(PREFIXO_FOTO.length));
  }
  function processaImagem(arquivo, pronto, falhou) {
    var erro = function (m) { toast(m); if (falhou) falhou(); };
    if (!arquivo || !/^image[/]/.test(arquivo.type || "")) { erro("Escolha um arquivo de imagem"); return; }
    if (arquivo.size > 15 * 1024 * 1024) { erro("A imagem é grande demais (máximo 15 MB)"); return; }
    var url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var maior = Math.max(img.width, img.height);
      if (!maior) { erro("Não consegui abrir essa imagem"); return; }
      var tentativas = [[900, 0.78], [800, 0.65], [640, 0.55], [480, 0.5]];
      for (var i = 0; i < tentativas.length; i++) {
        var esc = Math.min(1, tentativas[i][0] / maior);
        var cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * esc));
        cv.height = Math.max(1, Math.round(img.height * esc));
        var cx = cv.getContext("2d");
        cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        var d = cv.toDataURL("image/jpeg", tentativas[i][1]);
        if (imagemValida(d)) { pronto(d); return; }
      }
      erro("Essa imagem ficou grande demais mesmo reduzida");
    };
    img.onerror = function () { URL.revokeObjectURL(url); erro("Não consegui abrir essa imagem"); };
    img.src = url;
  }
  function escolherArquivoImagem(cb, multiplo) {
    var f = document.createElement("input");
    f.type = "file"; f.accept = "image/*"; f.style.display = "none";
    if (multiplo) f.multiple = true;
    f.addEventListener("change", function () {
      var a = [].slice.call(f.files || []);
      f.remove();
      if (!a.length) return;
      if (multiplo) cb(a); else cb(a[0]);
    });
    document.body.appendChild(f);
    f.click();
  }
  // feedback no próprio botão: o texto muda por um instante
  function avisaBtn(b, t) {
    var antes = b.getAttribute("data-rot") || b.textContent;
    b.setAttribute("data-rot", antes);
    b.textContent = t;
    clearTimeout(b._t);
    b._t = setTimeout(function () { b.textContent = antes; }, 1800);
  }
  // copia uma imagem (data URL) para a área de transferência, como PNG
  function copiaImagemPNG(src, btn) {
    if (!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)) {
      avisaBtn(btn, "Seu navegador não deixa"); return;
    }
    var png = new Promise(function (ok, no) {
      var im = new Image();
      im.onload = function () {
        var cv = document.createElement("canvas");
        cv.width = im.width; cv.height = im.height;
        cv.getContext("2d").drawImage(im, 0, 0);
        cv.toBlob(function (b) { b ? ok(b) : no(new Error("png")); }, "image/png");
      };
      im.onerror = no;
      im.src = src;
    });
    navigator.clipboard.write([new ClipboardItem({ "image/png": png })]).then(
      function () { avisaBtn(btn, "Copiada!"); },
      function () { avisaBtn(btn, "Não consegui copiar"); });
  }
  // popup para ver as imagens da anotação em detalhe (uma por vez, com setas para passar entre elas)
  var IMG_MAX_POR_FASE = 6;
  var TEXTO_DICA_EDITAR = "Clique na imagem para ver no tamanho real · setas ← → passam de imagem · Ctrl+V adiciona outra · Esc fecha";
  var TEXTO_DICA_LER = "Clique na imagem para ver no tamanho real · setas ← → passam de imagem · Esc fecha";
  var visorEl = null, visorFoto = null, visorImg = null, visorLegenda = null, visorAnt = null, visorProx = null, visorAtual = null, visorAcoes = null, visorDica = null;
  function criaVisor() {
    if (visorEl) return visorEl;
    var d = el("dialog", "cad-visor"); d.tabIndex = -1;
    d.setAttribute("aria-label", "Imagens da anotação");
    var painel = el("div", "cad-visor-painel");
    var topo = el("div", "cad-visor-topo");
    visorLegenda = el("span", "cad-visor-legenda");
    var x = el("button", "cad-visor-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fechar imagem");
    topo.appendChild(visorLegenda); topo.appendChild(x);
    var quadro = el("div", "cad-visor-quadro");
    visorAnt = el("button", "cad-visor-seta ant", "‹"); visorAnt.type = "button"; visorAnt.setAttribute("aria-label", "Imagem anterior");
    visorProx = el("button", "cad-visor-seta prox", "›"); visorProx.type = "button"; visorProx.setAttribute("aria-label", "Próxima imagem");
    visorFoto = el("figure", "cad-visor-foto");
    visorImg = el("img"); visorImg.alt = "Imagem da anotação, ampliada";
    visorFoto.appendChild(visorImg);
    quadro.appendChild(visorAnt); quadro.appendChild(visorFoto); quadro.appendChild(visorProx);
    var acoes = el("div", "cad-visor-acoes");
    var trocar = el("button", "btn", "🖼 Trocar imagem"); trocar.type = "button";
    trocar.title = "Troca só esta imagem por outra do computador";
    var copiar = el("button", "btn", "Copiar imagem"); copiar.type = "button";
    copiar.title = "Copia esta imagem para colar em outro lugar";
    var remover = el("button", "btn", "Remover imagem"); remover.type = "button";
    remover.title = "Tira só esta imagem da anotação";
    acoes.appendChild(trocar); acoes.appendChild(copiar); acoes.appendChild(remover);
    visorAcoes = acoes;
    var dica = el("p", "cad-visor-dica", TEXTO_DICA_EDITAR);
    visorDica = dica;
    painel.appendChild(topo); painel.appendChild(quadro); painel.appendChild(acoes); painel.appendChild(dica);
    d.appendChild(painel);
    x.addEventListener("click", fechaVisor);
    visorAnt.addEventListener("click", function () { moveVisor(-1); });
    visorProx.addEventListener("click", function () { moveVisor(1); });
    visorImg.addEventListener("click", function () {
      var real = visorFoto.classList.toggle("real");
      visorImg.title = real ? "Clique para caber na tela" : "Clique para ver no tamanho real";
    });
    trocar.addEventListener("click", function () {
      var c = visorAtual; if (!c) return;
      var i = c.i;
      escolherArquivoImagem(function (arq) {
        processaImagem(arq, function (dados) { c.ctrl.troca(i, dados); });
      });
    });
    copiar.addEventListener("click", function () {
      var c = visorAtual; if (c) copiaImagemPNG(c.ctrl.src(c.i), copiar);
    });
    remover.addEventListener("click", function () {
      var c = visorAtual; if (c) c.ctrl.remove(c.i);
    });
    // clicar no fundo escuro fecha
    d.addEventListener("click", function (e) { if (e.target === d) fechaVisor(); });
    d.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); moveVisor(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); moveVisor(1); }
    });
    d.addEventListener("close", function () {
      var a = visorAtual; visorAtual = null;
      if (a && a.ctrl.aoFechar) a.ctrl.aoFechar();
    });
    // Ctrl+V com o popup aberto adiciona outra imagem à anotação
    d.addEventListener("paste", function (e) { if (visorAtual && visorAtual.ctrl.cola) visorAtual.ctrl.cola(e); });
    document.body.appendChild(d);
    visorEl = d;
    return d;
  }
  function mostraNoVisor() {
    var c = visorAtual; if (!c || !visorEl) return;
    var n = c.ctrl.n();
    if (!n) { fechaVisor(); return; }
    if (c.i >= n) c.i = n - 1;
    if (c.i < 0) c.i = 0;
    visorImg.src = c.ctrl.src(c.i);
    visorLegenda.textContent = c.ctrl.legenda(c.i);
    visorFoto.classList.remove("real");
    visorImg.title = "Clique para ver no tamanho real";
    visorAnt.hidden = visorProx.hidden = n < 2;
    // na aba Achados as imagens só podem ser vistas: sem trocar, copiar nem remover
    visorAcoes.hidden = !!c.ctrl.somenteLeitura;
    visorDica.textContent = c.ctrl.somenteLeitura ? TEXTO_DICA_LER : TEXTO_DICA_EDITAR;
  }
  function moveVisor(passo) {
    var c = visorAtual; if (!c) return;
    var n = c.ctrl.n(); if (n < 2) return;
    c.i = (c.i + passo + n) % n;
    mostraNoVisor();
  }
  function irVisor(i) { if (visorAtual) { visorAtual.i = i; mostraNoVisor(); } }
  function abreVisor(ctrl, i) {
    var d = criaVisor();
    visorAtual = { ctrl: ctrl, i: i };
    mostraNoVisor();
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
  }
  function atualizaVisor() { if (visorEl && visorEl.open && visorAtual) mostraNoVisor(); }
  function fechaVisor() { if (visorEl && visorEl.open) visorEl.close(); }
  // as imagens ficam no IndexedDB do navegador (cabem mais do que no localStorage)
  function abreIDB() {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open("misterio-sql", 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore("imagens"); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function idbOp(modo, fn) {
    return abreIDB().then(function (db) {
      return new Promise(function (res) {
        var st = db.transaction("imagens", modo).objectStore("imagens");
        var rq = fn(st);
        rq.onsuccess = function () { res(rq.result === undefined ? null : rq.result); };
        rq.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function idbGet(k) { return idbOp("readonly", function (s) { return s.get(k); }); }
  function idbPut(k, v) { return idbOp("readwrite", function (s) { return s.put(v, k); }); }
  function idbDel(k) { return idbOp("readwrite", function (s) { return s["delete"](k); }); }
  function idbLimpa() { return idbOp("readwrite", function (s) { return s.clear(); }); }
  // ao sair da conta num computador compartilhado: tira do aparelho tudo o que é da pessoa
  // (o progresso e a sessão o app.js já limpa; o tema e o aviso de boas-vindas podem ficar)
  function apagarAparelho() {
    ["misterio-sql-jogador", "misterio-sql-notas", "misterio-sql-codigo", "misterio-sql-conferido", "misterio-sql-minhas-tabelas", "misterio-sql-tentou"]
      .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    notas = {}; jog = {};
    return idbLimpa();
  }
  function idbChaves() { return idbOp("readonly", function (s) { return s.getAllKeys(); }); }
  // cada fase guarda uma lista de imagens (o formato antigo guardava uma só, em texto)
  function listaImagens(v) {
    var l = Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
    return l.filter(imagemValida).slice(0, IMG_MAX_POR_FASE);
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
  function toast(m) {
    if (window.MisterioNuvem) window.MisterioNuvem.toast(m);
    // com o popup da imagem aberto, o aviso precisa nascer dentro dele (ele fica acima de tudo)
    if (visorEl && visorEl.open) { var t = document.querySelector(".toast"); if (t) visorEl.appendChild(t); }
  }

  var jog = ler(K_JOG, { nome: "" });
  if (!fotoValida(jog.foto)) delete jog.foto;
  var notas = ler(K_NOTAS, {});

  // ------------------------------------------------------------------ cálculos
  // Comandos da aba "Comandos": vêm do subtítulo de cada fase. "fechar o caso" e "tudo junto" não são
  // comandos, e "subconsulta" é o mesmo que "SUBCONSULTA" (mantenha igual em scripts/gerar-comandos.mjs).
  var CMD_IGNORAR = { "fechar o caso": 1, "tudo junto": 1 };
  var CMD_ALIAS = { "subconsulta": "SUBCONSULTA", "length": "LENGTH", "ROW_NUMBER()": "ROW_NUMBER", "SUM() FILTER": "SUM(…) FILTER" };
  function comandosDaFase(fa) {
    var lista = [];
    (fa.sub || "").split("·").forEach(function (h) {
      h = h.trim();
      if (!h || CMD_IGNORAR[h]) return;
      h = CMD_ALIAS[h] || h;
      if (lista.indexOf(h) === -1) lista.push(h);
    });
    return lista;
  }
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
          comandosDaFase(fa).forEach(function (h) { habil[h] = true; });
        }
      });
      if (!c.treino && c.fases.length && f === c.fases.length) casosOk++;
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
        if (pass === 1 && c.treino) return;
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
  // devolvem "ok", "erro" ou "sem-conta"; opt.keepalive deixa o envio terminar mesmo ao fechar a página
  function salvaPerfilNuvem(opt) {
    var n = nuvem(); if (!n) return Promise.resolve("sem-conta");
    return n.api("perfil?on_conflict=user_id", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      keepalive: !!(opt && opt.keepalive),
      body: JSON.stringify([{ user_id: n.uid(), nome: jog.nome || "", foto: fotoValida(jog.foto) ? jog.foto : null, atualizado_em: new Date().toISOString() }])
    }).then(function () { return "ok"; }, function () { return "erro"; });
  }
  function salvaNotaNuvem(fase, texto, opt) {
    var n = nuvem(); if (!n) return Promise.resolve("sem-conta");
    var linha = { user_id: n.uid(), fase: fase, texto: texto, atualizado_em: new Date().toISOString() };
    // a imagem só vai junto quando existe (ou quando foi removida), assim o banco antigo continua aceitando o texto
    if (opt && "imagem" in opt) linha.imagem = opt.imagem;
    return n.api("anotacao?on_conflict=user_id,fase", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      keepalive: !!(opt && opt.keepalive && !(opt && opt.imagem)),
      body: JSON.stringify([linha])
    }).then(function () { return "ok"; }, function () { return "erro"; });
  }
  // grava a lista inteira de imagens da fase (uma linha por imagem) e apaga as que sobraram
  function salvaImagensNuvem(fase, lista) {
    var n = nuvem(); if (!n) return Promise.resolve("sem-conta");
    var agora = new Date().toISOString();
    var envia = lista.length ? n.api("anotacao_imagem?on_conflict=user_id,fase,pos", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(lista.map(function (d, i) {
        return { user_id: n.uid(), fase: fase, pos: i, imagem: d, atualizado_em: agora };
      }))
    }) : Promise.resolve();
    return envia.then(function () {
      return n.api("anotacao_imagem?fase=eq." + encodeURIComponent(fase) + "&pos=gte." + lista.length, {
        method: "DELETE", headers: { Prefer: "return=minimal" }
      });
    }).then(function () { return "ok"; }, function () { return "erro"; });
  }
  // aviso discreto de "salvo", usado nas anotações e no nome
  function criaAviso(enviar) {
    var box = el("div", "cad-salvo");
    box.setAttribute("aria-live", "polite");
    var timer = null;
    var api = {
      no: box,
      mostra: function (txt, cls) { box.textContent = txt; box.className = "cad-salvo " + (cls || ""); },
      // chamado a cada alteração: grava no aparelho (já feito) e agenda o envio para a nuvem
      alterou: function () {
        if (nuvem()) {
          api.mostra("✓ Salvo neste aparelho · enviando para a nuvem…", "pend");
          clearTimeout(timer);
          timer = setTimeout(function () { api.envia(false); }, 800);
          api.pendente = true;
        } else {
          api.pendente = false;
          api.mostra("✓ Salvo neste aparelho. Entre na conta para guardar na nuvem.", "ok");
        }
      },
      envia: function (keepalive) {
        clearTimeout(timer); timer = null;
        if (!nuvem()) { api.pendente = false; return Promise.resolve(); }
        api.mostra("Enviando para a nuvem…", "pend");
        return enviar(keepalive).then(function (r) {
          api.pendente = false;
          if (r === "ok") { api.mostra("☁ Salvo na nuvem", "ok"); return; }
          api.mostra("⚠ Salvo neste aparelho, mas a nuvem não respondeu. ", "erro");
          var b = el("button", null, "Tentar de novo"); b.type = "button";
          b.addEventListener("click", function () { api.envia(false); });
          box.appendChild(b);
        });
      },
      // antes de qualquer alteração: já deixa claro que o que for escrito é salvo sozinho
      inicia: function () {
        if (nuvem()) api.mostra("☁ Salva sozinho: no aparelho e na nuvem", "");
        else api.mostra("✓ Salva sozinho neste aparelho. Entre na conta para guardar na nuvem.", "");
      },
      pendente: false
    };
    avisosPendentes.push(api);
    return api;
  }
  var avisosPendentes = [];
  // ao sair da página, termina de enviar o que ainda estava esperando
  function terminaEnvios() {
    avisosPendentes = avisosPendentes.filter(function (a) { return a.no.isConnected; });
    avisosPendentes.forEach(function (a) { if (a.pendente) a.envia(true); });
  }
  window.addEventListener("pagehide", terminaEnvios);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") terminaEnvios(); });
  function puxaNuvem(depois) {
    var n = nuvem(); if (!n) return;
    n.api("perfil?select=nome,foto").then(function (rows) {
      if (rows && rows[0]) {
        if (rows[0].nome) jog.nome = rows[0].nome;
        if (fotoValida(rows[0].foto)) jog.foto = rows[0].foto;
        gravar(K_JOG, jog);
      } else if (jog.nome) { salvaPerfilNuvem(); }
      return n.api("anotacao?select=fase,texto,imagem").catch(function () { return n.api("anotacao?select=fase,texto"); });
    }).then(function (rows) {
      var remoto = {}, legado = {};
      (rows || []).forEach(function (r) {
        remoto[r.fase] = r.texto; notas[r.fase] = r.texto;
        if (imagemValida(r.imagem)) legado[r.fase] = r.imagem;
      });
      gravar(K_NOTAS, notas);
      Object.keys(notas).forEach(function (f) { if (notas[f] && !(f in remoto)) salvaNotaNuvem(f, notas[f]); });
      return sincronizaImagens(n, legado);
    }).then(function () {
      atualizaBotao();
      marcaBotoesFase();
      if (depois) depois();
    }).catch(function () { if (depois) depois(); });
  }
  // junta as imagens da nuvem com as do aparelho (a nuvem vale quando tem imagens da fase)
  function sincronizaImagens(n, legado) {
    return n.api("anotacao_imagem?select=fase,pos,imagem&order=pos.asc").then(function (rows) { return rows || []; }, function () { return null; })
      .then(function (rows) {
        var tabelaOk = rows !== null, naNuvem = {};
        (rows || []).forEach(function (r) {
          if (imagemValida(r.imagem)) (naNuvem[r.fase] = naNuvem[r.fase] || []).push(r.imagem);
        });
        return idbChaves().then(function (chaves) {
          var tarefas = [], outras = {};
          Object.keys(naNuvem).forEach(function (f) { tarefas.push(idbPut(f, naNuvem[f].slice(0, IMG_MAX_POR_FASE))); });
          (chaves || []).forEach(function (f) { if (!naNuvem[f]) outras[f] = true; });
          Object.keys(legado).forEach(function (f) { if (!naNuvem[f]) outras[f] = true; });
          // só no aparelho (ou só na coluna antiga da anotação): sobe para a tabela nova
          Object.keys(outras).forEach(function (f) {
            tarefas.push(idbGet(f).then(function (v) {
              var lista = listaImagens(v);
              if (!lista.length && legado[f]) { lista = [legado[f]]; idbPut(f, lista); }
              if (lista.length && tabelaOk) return salvaImagensNuvem(f, lista);
            }));
          });
          return Promise.all(tarefas);
        });
      }).catch(function () {});
  }

  // ------------------------------------------------------------------ botão na barra
  var botao = null;
  function rotuloBotao() { return jog.nome ? jog.nome.split(" ")[0] : "Caderno"; }
  function atualizaBotao() { pintaCaderno(); }
  var btnSair = null, btnTema = null;
  function pintaTema() {
    var escuro = window.MisterioTema && window.MisterioTema.atual() === "dark";
    if (btnTema) comIcone(btnTema, escuro ? "sol" : "lua", escuro ? "Modo claro" : "Modo escuro");
  }
  // um botão só: "Sair" quando há conta ativa, "Entrar" quando não há
  function atualizaSair() {
    if (!btnSair) return;
    btnSair.hidden = false;
    if (nuvem()) comIcone(btnSair, "sair", "Sair da conta");
    else comIcone(btnSair, "entrar", "Entrar na conta");
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
    comIcone(btnSair, "entrar", "Entrar na conta");
    btnSair.type = "button"; btnSair.id = "btnSair";
    btnSair.addEventListener("click", function () {
      var n = window.MisterioNuvem;
      if (!n) return;
      if (n.logado()) n.sair(); else n.abrirLogin();
    });
    topo.appendChild(btnSair);
    atualizaSair();
    // página inicial: tudo no canto direito, e no celular só a foto com o menu; dentro do caso a linha de cima some (ficam as fases e a barra)
    var naInicial = !!document.querySelector(".casos");
    topo.classList.add(naInicial ? "topo-inicio" : "topo-caso");
    if (naInicial) criaMenuConta(topo);
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
    topo.appendChild(el("span", "cad-carimbo", "Confidencial"));
    var fechar = el("button", "cad-fechar", "×"); fechar.type = "button";
    fechar.title = "Fechar"; fechar.setAttribute("aria-label", "Fechar o caderno");
    fechar.addEventListener("click", function () { dlg.close(); });
    topo.appendChild(fechar);
    corpo = el("div", "cad-pagina");
    folha.appendChild(topo); folha.appendChild(corpo);
    livro.appendChild(folha);
    livro.appendChild(el("div", "cad-etiqueta"));
    var abas = el("nav", "cad-abas"); abas.setAttribute("aria-label", "Seções do caderno");
    [["detetive", "Detetive", "amarela"], ["missoes", "Missões", "coral"], ["achados", "Achados", "azul"], ["comandos", "Comandos", "verde"]].forEach(function (a) {
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
    fechaGaveta();
    if (!dlg) monta();
    abaAtual = aba || abaAtual;
    var r = resumo();
    dlg.querySelector(".cad-etiqueta").textContent = "ARQUIVO DO DETETIVE · " + (jog.nome ? jog.nome.toUpperCase() : "SEM NOME");
    [].forEach.call(dlg.querySelectorAll(".cad-aba"), function (b) {
      b.classList.toggle("ativa", b.getAttribute("data-aba") === abaAtual);
    });
    corpo.textContent = "";
    if (abaAtual === "detetive") paginaDetetive(r);
    else if (abaAtual === "missoes") paginaMissoes(r);
    else if (abaAtual === "achados") paginaAchados(r);
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
    var avisoNome = criaAviso(function (k) { return salvaPerfilNuvem({ keepalive: k }); });
    inp.addEventListener("input", function () {
      jog.nome = inp.value.trim().slice(0, 40); gravar(K_JOG, jog); atualizaBotao();
      if (!jog.foto) { av.textContent = ""; av.appendChild(avatarNode(null, jog.nome)); }
      avisoNome.alterou();
    });
    dados.appendChild(rotulo); dados.appendChild(inp); dados.appendChild(avisoNome.no);
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
    [[r.feitas + "/" + r.total, "fases concluídas"], [r.casosOk + "/" + CASOS.length, "casos encerrados"],
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
      s.title = nomeCaso(cs) + ": " + cs.titulo;
      s.style.setProperty("--r", ((cs.n * 7) % 11 - 5) + "deg");
      s.appendChild(el("div", "cad-selo-i", ok ? "🏅" : "○"));
      s.appendChild(el("div", "cad-selo-n", nomeCaso(cs)));
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
      if (!window.confirm("Recomeçar do zero? Isso apaga o progresso, as anotações, as imagens e os rascunhos do computador em todos os casos, neste aparelho e na nuvem.\n\nO nome e a foto do perfil ficam.")) return;
      var ids = []; CAT.forEach(function (cs) { cs.fases.forEach(function (fa) { ids.push(fa.id); }); });
      // neste aparelho: progresso, anotações, rascunhos do computador e as imagens (IndexedDB)
      var pronto = function () {
        ["misterio-sql-progresso", "misterio-sql-notas", "misterio-sql-codigo", "misterio-sql-conferido", "misterio-sql-minhas-tabelas", "misterio-sql-tentou"]
          .forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
        notas = {};
        idbLimpa().then(function () { location.reload(); }, function () { location.reload(); });
      };
      var nu = nuvem();
      if (nu) {
        var uid = nu.uid(), agora = new Date().toISOString();
        var filtro = "user_id=eq." + encodeURIComponent(uid);
        // na nuvem: fases voltam a "não concluída", anotações ficam vazias e as imagens são apagadas
        // (as regras do banco só deixam cada pessoa mexer nas próprias linhas). A coluna antiga "imagem"
        // não existe em todo projeto, por isso é limpa à parte e pode falhar sem estragar o resto.
        zera.disabled = true; zera.textContent = "Apagando…";
        nu.api("progresso?on_conflict=user_id,fase", {
          method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(ids.map(function (id) { return { user_id: uid, fase: id, concluida: false, atualizado_em: agora }; }))
        }).then(function () {
          return nu.api("anotacao?" + filtro, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ texto: "", atualizado_em: agora }) });
        }).then(function () {
          return nu.api("anotacao?" + filtro, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ imagem: null }) }).catch(function () {});
        }).then(function () {
          return nu.api("anotacao_imagem?" + filtro, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        }).then(pronto, function (e) {
          zera.disabled = false; zera.textContent = "Recomeçar do zero";
          toast("⚠ A nuvem não deixou apagar (" + String(e && e.message || e).slice(0, 80) + "). Nada foi apagado; tente de novo.");
        });
      } else pronto();
    });
    conta.appendChild(zera);
    c.appendChild(conta);
  }

  // editor de anotação de uma fase: texto + imagens + aviso de "salvo".
  // É usado no Caderno (aba Missões) e na gaveta que puxa ao lado da fase.
  function criaEditorNota(fa, opt) {
    var raiz = el("div", "cad-editor");
    var ta = el("textarea", "cad-nota-area"); ta.rows = (opt && opt.linhas) || 2; ta.maxLength = 4000;
    ta.placeholder = "Minhas anotações desta fase…"; ta.value = notas[fa.id] || "";
    var imagens = [], imagensSujas = false, verImg = 0, noVisor = false;
    var aoMudar = (opt && opt.aoMudar) || null;   // quem usa o editor pode querer saber do que mudou (prévia da linha)
    var avisoNota = criaAviso(function (k) {
      var v = verImg, lote = imagens.slice(), sujas = imagensSujas;
      var passoImg = sujas ? salvaImagensNuvem(fa.id, lote) : Promise.resolve("ok");
      return passoImg.then(function (ri) {
        var op = { keepalive: k && !sujas };
        // as imagens já estão na tabela nova: limpa a coluna antiga da anotação
        if (sujas && ri === "ok") op.imagem = null;
        return salvaNotaNuvem(fa.id, ta.value, op).then(function (rt) {
          if (sujas && ri === "ok" && v === verImg) imagensSujas = false;
          if (ri === "sem-conta" || rt === "sem-conta") return "sem-conta";
          return ri === "ok" && rt === "ok" ? "ok" : "erro";
        });
      });
    });
    var areaImg = el("div", "cad-img");
    var botoesImg = el("div", "cad-img-botoes");
    var addImg = el("button", "btn", "🖼 Adicionar imagem"); addImg.type = "button";
    addImg.title = "Escolha uma ou várias imagens do computador";
    var colImg = el("button", "btn", "📋 Colar imagem"); colImg.type = "button";
    colImg.title = "Cola o print ou a imagem que você copiou";
    var contaImg = el("span", "cad-img-conta");
    var fotos = el("div", "cad-fotos"); fotos.hidden = true;
    var titulo = fa.titulo || fa.nome;
    // as imagens aparecem como fotos presas no quadro; clicar abre o popup
    var pintaImg = function () {
      fotos.textContent = "";
      imagens.forEach(function (d, i) {
        var fig = el("figure", "cad-evidencia");
        fig.tabIndex = 0; fig.setAttribute("role", "button"); fig.setAttribute("aria-haspopup", "dialog");
        fig.title = "Clique para ver em detalhe";
        var im = el("img", "cad-img-vista"); im.alt = "Imagem " + (i + 1) + " da anotação"; im.src = d;
        fig.appendChild(im);
        fig.appendChild(el("figcaption", null, imagens.length > 1 ? "Evidência " + (i + 1) : "Evidência · " + titulo));
        fig.addEventListener("click", function () { abreFoto(i); });
        fig.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abreFoto(i); }
        });
        fotos.appendChild(fig);
      });
      fotos.hidden = !imagens.length;
      var cheio = imagens.length >= IMG_MAX_POR_FASE;
      addImg.disabled = colImg.disabled = cheio;
      addImg.title = cheio ? "Limite de " + IMG_MAX_POR_FASE + " imagens por anotação" : "Escolha uma ou várias imagens do computador";
      contaImg.textContent = imagens.length ? imagens.length + " de " + IMG_MAX_POR_FASE + " imagens" : "";
      atualizaVisor();
    };
    var mudou = function () {
      verImg++; imagensSujas = true;
      if (imagens.length) idbPut(fa.id, imagens.slice()); else idbDel(fa.id);
      pintaImg();
      avisoNota.alterou();
      if (aoMudar) aoMudar(imagens.length);
    };
    var adicionaImg = function (d) {
      if (imagens.length >= IMG_MAX_POR_FASE) { toast("Máximo de " + IMG_MAX_POR_FASE + " imagens por anotação"); return; }
      imagens.push(d); mudou();
      if (noVisor) irVisor(imagens.length - 1);
    };
    // várias de uma vez: processa todas e adiciona na ordem em que foram escolhidas
    var adicionaArquivos = function (arqs) {
      var livre = IMG_MAX_POR_FASE - imagens.length;
      if (livre <= 0) { toast("Máximo de " + IMG_MAX_POR_FASE + " imagens por anotação"); return; }
      var lote = [].slice.call(arqs, 0, livre);
      if (arqs.length > livre) toast("Só cabem mais " + livre + " nesta anotação");
      var res = new Array(lote.length), faltam = lote.length;
      var fim = function () {
        if (--faltam) return;
        res.forEach(function (d) { if (d) adicionaImg(d); });
      };
      lote.forEach(function (a, k) {
        processaImagem(a, function (d) { res[k] = d; fim(); }, fim);
      });
    };
    // colar um print (Ctrl+V) em qualquer ponto da anotação
    var colaDoEvento = function (e) {
      var itens = (e.clipboardData && e.clipboardData.items) || [], arqs = [];
      for (var i = 0; i < itens.length; i++) {
        if (itens[i].type && itens[i].type.indexOf("image/") === 0) {
          var arq = itens[i].getAsFile();
          if (arq) arqs.push(arq);
        }
      }
      if (arqs.length) { e.preventDefault(); adicionaArquivos(arqs); }
    };
    // o que o popup pode pedir a esta anotação
    var ctrl = {
      n: function () { return imagens.length; },
      src: function (i) { return imagens[i]; },
      legenda: function (i) {
        return imagens.length > 1 ? "Evidência " + (i + 1) + " de " + imagens.length + " · " + titulo : "Evidência · " + titulo;
      },
      troca: function (i, d) { if (i < imagens.length) { imagens[i] = d; mudou(); } },
      remove: function (i) { if (i < imagens.length) { imagens.splice(i, 1); mudou(); } },
      cola: colaDoEvento,
      aoFechar: function () { noVisor = false; }
    };
    var abreFoto = function (i) {
      if (noVisor || !imagens.length) return;
      noVisor = true;
      abreVisor(ctrl, i);
    };
    idbGet(fa.id).then(function (v) {
      var l = listaImagens(v);
      if (l.length && !imagens.length) { imagens = l; pintaImg(); if (aoMudar) aoMudar(imagens.length); }
    });
    addImg.addEventListener("click", function () { escolherArquivoImagem(adicionaArquivos, true); });
    // botão "Colar imagem": lê a imagem que está na área de transferência
    colImg.addEventListener("click", function () {
      var pedeAtalho = function () {
        ta.focus();
        avisaBtn(colImg, "Aperte Ctrl+V");
        toast("Clique no texto da anotação e aperte Ctrl+V");
      };
      if (!(navigator.clipboard && navigator.clipboard.read)) { pedeAtalho(); return; }
      navigator.clipboard.read().then(function (itens) {
        for (var i = 0; i < itens.length; i++) {
          for (var j = 0; j < itens[i].types.length; j++) {
            if (itens[i].types[j].indexOf("image/") === 0) {
              return itens[i].getType(itens[i].types[j]).then(function (blob) {
                adicionaArquivos([blob]);
                avisaBtn(colImg, "Colada!");
              });
            }
          }
        }
        avisaBtn(colImg, "Nenhuma imagem copiada");
      }, pedeAtalho);
    });
    raiz.addEventListener("paste", colaDoEvento);
    // arrastar imagens para cima da anotação
    raiz.addEventListener("dragover", function (e) {
      if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], "Files") > -1) e.preventDefault();
    });
    raiz.addEventListener("drop", function (e) {
      var fs = e.dataTransfer && e.dataTransfer.files
        ? [].filter.call(e.dataTransfer.files, function (f) { return /^image[/]/.test(f.type || ""); }) : [];
      if (fs.length) { e.preventDefault(); adicionaArquivos(fs); }
    });
    botoesImg.appendChild(addImg); botoesImg.appendChild(colImg); botoesImg.appendChild(contaImg);
    areaImg.appendChild(botoesImg); areaImg.appendChild(fotos);
    ta.addEventListener("input", function () {
      notas[fa.id] = ta.value; gravar(K_NOTAS, notas);
      avisoNota.alterou();
      if (aoMudar) aoMudar(imagens.length);
    });
    // na aba Missões o aviso fica uma vez só, no topo; o editor só fala quando algo for salvo
    if (!(opt && opt.semAvisoInicial)) avisoNota.inicia();
    raiz.appendChild(ta);
    raiz.appendChild(avisoNota.no);
    raiz.appendChild(areaImg);
    return {
      no: raiz,
      foca: function () { ta.focus(); },
      // termina de enviar o que ainda estava esperando (ao fechar a gaveta ou trocar de fase)
      descarrega: function () { if (avisoNota.pendente) avisoNota.envia(false); }
    };
  }

  function paginaMissoes(r) {
    var c = corpo;
    c.appendChild(el("p", "cad-nota cad-missoes-intro", "Toque numa fase para abrir o espaço de anotações dela. " +
      (nuvem() ? "☁ Tudo é salvo sozinho, neste aparelho e na nuvem." : "✓ Tudo é salvo sozinho neste aparelho. Entre na conta para guardar na nuvem também.")));
    var linhas = {};   // fase -> controle da linha (as que têm foto guardada abrem quando o IndexedDB responder)
    CAT.forEach(function (cs, ci) {
      var feitas = cs.fases.filter(function (fa) { return r.st[fa.id]; }).length;
      var d = el("details", "cad-caso");
      if (ci === 0 || feitas > 0 && feitas < cs.fases.length) d.open = true;
      var sm = el("summary", null, nomeCaso(cs) + " · " + cs.titulo + "  (" + feitas + "/" + cs.fases.length + ")");
      d.appendChild(sm);
      d.appendChild(barra(cs.fases.length ? Math.round(feitas / cs.fases.length * 100) : 0));
      var lista = el("div", "cad-fases");
      cs.fases.forEach(function (fa, i) {
        var feita = !!r.st[fa.id], lib = liberada(cs.fases, i, r.st);
        var emAndamento = lib && !feita && feitas > 0;   // a fase da vez, num caso que a pessoa já começou
        var linha = el("div", "cad-fase" + (feita ? " feita" : lib ? " atual" : " trava"));
        var cab = el("div", "cad-fase-cab");
        cab.appendChild(el("span", "cad-fase-i", feita ? "✓" : lib ? "▶" : "🔒"));
        var tit = el("div", "cad-fase-t");
        tit.appendChild(el("b", null, fa.num + " · " + (fa.titulo || fa.nome)));
        if (fa.sub) tit.appendChild(el("span", "cad-nota", fa.sub));
        var previa = el("span", "cad-fase-previa");
        tit.appendChild(previa);
        cab.appendChild(tit);
        var abrir = el("button", "cad-fase-abrir"); abrir.type = "button";
        abrir.setAttribute("aria-expanded", "false");
        cab.appendChild(abrir);
        if (lib) {
          var ir = el("a", "btn", feita ? "Rever" : "Ir"); ir.href = cs.arq + "#" + fa.id;
          ir.addEventListener("click", function () { dlg.close(); });
          cab.appendChild(ir);
        }
        var corpoFase = el("div", "cad-fase-corpo"); corpoFase.hidden = true;
        if (fa.missao) corpoFase.appendChild(el("p", "cad-missao", fa.missao));
        var ed = null, nImg = 0;
        var aberta = function () { return linha.classList.contains("aberta"); };
        // linha fechada: um resumo do que já tem ("texto…" · 2 fotos); botão diz o que fazer
        var resumo = function () {
          var txt = (notas[fa.id] || "").trim().replace(/\s+/g, " ");
          var partes = [];
          if (txt) partes.push("“" + (txt.length > 70 ? txt.slice(0, 70) + "…" : txt) + "”");
          if (nImg) partes.push(nImg + (nImg > 1 ? " fotos" : " foto"));
          previa.textContent = aberta() ? "" : partes.join(" · ");
          linha.classList.toggle("com-nota", !!(txt || nImg));
          abrir.textContent = aberta() ? "▾ Fechar" : (txt || nImg ? "▸ Abrir" : "✎ Anotar");
          abrir.title = aberta() ? "Fechar as anotações desta fase" : "Abrir as anotações desta fase";
        };
        var abre = function (foco) {
          if (!ed) {
            ed = criaEditorNota(fa, { semAvisoInicial: true, aoMudar: function (n) { nImg = n; resumo(); } });
            corpoFase.appendChild(ed.no);
          }
          corpoFase.hidden = false; linha.classList.add("aberta"); abrir.setAttribute("aria-expanded", "true");
          resumo();
          if (foco) ed.foca();
        };
        var fecha = function () {
          corpoFase.hidden = true; linha.classList.remove("aberta"); abrir.setAttribute("aria-expanded", "false");
          if (ed) ed.descarrega();
          resumo();
        };
        abrir.addEventListener("click", function () { if (aberta()) fecha(); else abre(true); });
        cab.addEventListener("click", function (e) {
          if (e.target.closest("a, button")) return;   // "Rever"/"Ir" e o botão têm vez própria
          if (aberta()) fecha(); else abre(false);
        });
        linha.appendChild(cab); linha.appendChild(corpoFase);
        lista.appendChild(linha);
        linhas[fa.id] = { linha: linha, abre: abre, fotos: function (n) { nImg = n; resumo(); } };
        resumo();
        if ((notas[fa.id] || "").trim() || emAndamento) abre(false);
      });
      d.appendChild(lista);
      c.appendChild(d);
    });
    // fases com fotos guardadas neste aparelho: já abrem mostrando as fotos
    idbChaves().then(function (ks) {
      (ks || []).forEach(function (k) {
        var l = linhas[k]; if (!l || !l.linha.isConnected) return;
        idbGet(k).then(function (v) {
          var n = listaImagens(v).length;
          if (n && l.linha.isConnected) { l.fotos(n); l.abre(false); }
        });
      });
    }).catch(function () {});
  }

  function paginaComandos(r) {
    var c = corpo;
    c.appendChild(el("p", "cad-nota", "Os comandos se acendem conforme você conclui as fases em que eles aparecem. Toque num comando aceso para ver a explicação."));
    var onde = {}, ordem = [];   // comando -> fases em que ele aparece
    CAT.forEach(function (cs) {
      cs.fases.forEach(function (fa, i) {
        comandosDaFase(fa).forEach(function (h) {
          if (!(h in onde)) { onde[h] = []; ordem.push(h); }
          onde[h].push({ caso: cs, fase: fa, i: i });
        });
      });
    });
    var g = el("div", "cad-cmds");
    ordem.forEach(function (h) {
      var aceso = !!r.habil[h];
      var b = el("button", "cad-cmd" + (aceso ? " ok" : ""), h); b.type = "button";
      b.title = aceso ? "Ver a explicação" : "Trancado: conclua uma fase em que ele aparece";
      b.addEventListener("click", function () { abreComando(h, onde[h]); });
      g.appendChild(b);
    });
    c.appendChild(g);
    c.appendChild(el("p", "cad-nota", Object.keys(r.habil).length + " de " + ordem.length + " aprendidos."));
  }

  // ------------------------------------------------------------------ pop-up de cada comando
  // Explicações em js/comandos-dados.json (gerado por scripts/gerar-comandos.mjs). Só abrem depois
  // que a pessoa conclui uma fase em que o comando aparece.
  var comandosDados = null, comandosPromessa = null;
  function carregaComandosDados() {
    if (comandosDados) return Promise.resolve(comandosDados);
    if (!comandosPromessa) {
      comandosPromessa = fetch(new URL("js/comandos-dados.json", document.baseURI).href, { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (d) { comandosDados = d; return d; })
        .catch(function () { comandosPromessa = null; return null; });
    }
    return comandosPromessa;
  }
  var cmdPop = null, cmdNome = null, cmdCorpo = null;
  function criaCmdPop() {
    if (cmdPop) return cmdPop;
    var d = el("dialog", "cad-cmd-pop"); d.tabIndex = -1;
    d.setAttribute("aria-labelledby", "cmdPopNome");
    var painel = el("div", "cad-cmd-painel");
    var topo = el("div", "cad-cmd-topo");
    cmdNome = el("h3", "cad-cmd-nome"); cmdNome.id = "cmdPopNome";
    var x = el("button", "cad-cmd-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Fechar explicação");
    topo.appendChild(cmdNome); topo.appendChild(x);
    cmdCorpo = el("div", "cad-cmd-corpo");
    painel.appendChild(topo); painel.appendChild(cmdCorpo);
    d.appendChild(painel);
    x.addEventListener("click", function () { d.close(); });
    // clicar no fundo escuro fecha
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
    document.body.appendChild(d);
    cmdPop = d;
    return d;
  }
  function cmdBloco(rotulo, texto) {
    var b = el("div", "cad-cmd-bloco");
    b.appendChild(el("b", "cad-cmd-rot", rotulo));
    b.appendChild(el("p", null, texto));
    return b;
  }
  function rotuloFase(x) { return nomeCaso(x.caso) + " · fase " + x.fase.num + " · " + (x.fase.titulo || x.fase.nome); }
  function copiaCmd(txt, btn) {
    var antes = btn.textContent;
    var ok = function () { btn.textContent = "Copiado!"; setTimeout(function () { btn.textContent = antes; }, 1500); };
    var falhou = function () { btn.textContent = "Selecione e use Ctrl+C"; setTimeout(function () { btn.textContent = antes; }, 2500); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok, falhou); return; }
    try {
      var t = document.createElement("textarea");
      t.value = txt; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      var certo = document.execCommand("copy");
      t.remove();
      certo ? ok() : falhou();
    } catch (e) { falhou(); }
  }
  function linkFase(x, texto) {
    var a = el("a", "btn", texto); a.href = x.caso.arq + "#" + x.fase.id;
    a.addEventListener("click", function () { if (cmdPop) cmdPop.close(); if (dlg) dlg.close(); });
    return a;
  }
  function abreComando(tag, fases) {
    var st = estado();
    var feitas = fases.filter(function (x) { return st[x.fase.id]; });
    var d = criaCmdPop();
    cmdNome.textContent = tag;
    cmdCorpo.textContent = "";
    if (!feitas.length) {
      // ainda trancado: diz onde ele aparece, sem entregar a explicação
      cmdCorpo.appendChild(el("p", "cad-cmd-trava", "🔒 Este comando ainda está trancado. Conclua uma destas fases para abrir a explicação:"));
      var lista = el("ul", "cad-cmd-fases");
      fases.slice(0, 4).forEach(function (x) {
        var li = el("li", null, rotuloFase(x) + "  ");
        if (liberada(x.caso.fases, x.i, st)) li.appendChild(linkFase(x, "Ir"));
        lista.appendChild(li);
      });
      cmdCorpo.appendChild(lista);
      if (fases.length > 4) cmdCorpo.appendChild(el("p", "cad-cmd-nota", "E mais " + (fases.length - 4) + " fase(s)."));
      if (!d.open) d.showModal();
      return;
    }
    var carregando = el("p", "cad-cmd-nota", "Abrindo o arquivo…");
    cmdCorpo.appendChild(carregando);
    if (!d.open) d.showModal();
    carregaComandosDados().then(function (dados) {
      if (!cmdPop.open || cmdNome.textContent !== tag) return;   // fechou ou trocou de comando enquanto carregava
      cmdCorpo.textContent = "";
      var info = dados && dados[tag];
      if (!info) {
        cmdCorpo.appendChild(el("p", "cad-cmd-nota", dados ? "Ainda não escrevi a explicação deste comando." : "Não consegui abrir a explicação agora. Confira a conexão e tente de novo."));
      } else {
        cmdCorpo.appendChild(cmdBloco("O que faz", info.o));
        cmdCorpo.appendChild(cmdBloco("No hospital", info.h));
        if (info.ex) {
          var bloco = el("div", "cad-cmd-bloco");
          bloco.appendChild(el("b", "cad-cmd-rot", "Exemplo"));
          bloco.appendChild(el("pre", "cad-cmd-ex", info.ex));
          if (info.nota) bloco.appendChild(el("p", "cad-cmd-nota", info.nota));
          var acoes = el("div", "cad-cmd-acoes");
          var cp = el("button", "btn", "Copiar exemplo"); cp.type = "button";
          cp.addEventListener("click", function () { copiaCmd(info.ex, cp); });
          acoes.appendChild(cp);
          bloco.appendChild(acoes);
          cmdCorpo.appendChild(bloco);
        }
      }
      var rodape = el("div", "cad-cmd-bloco");
      rodape.appendChild(el("b", "cad-cmd-rot", "Você viu isto em"));
      var ul = el("ul", "cad-cmd-fases");
      feitas.slice(0, 4).forEach(function (x) {
        var li = el("li", null, rotuloFase(x) + "  ");
        li.appendChild(linkFase(x, "Rever"));
        ul.appendChild(li);
      });
      rodape.appendChild(ul);
      if (feitas.length > 4) rodape.appendChild(el("p", "cad-cmd-nota", "E mais " + (feitas.length - 4) + " fase(s)."));
      cmdCorpo.appendChild(rodape);
    });
  }

  // ------------------------------------------------------------------ caso encerrado: carimbo + culpado
  // quem é o culpado de cada caso (aparece só quando todas as fases do caso foram concluídas)
  var CULPADOS = {
    "guia.html":   { nome: "Vitória Albuquerque", rotulo: "A mandante", papel: "Mandou sabotar a geladeira",
                     extra: [{ nome: "Rogério Valadares", rotulo: "O executor", papel: "Desligou a geladeira" }] },
    "caso2.html":  { nome: "Hamilton Seabra", papel: "Cargo: Técnico de Enfermagem · Enfermaria" },
    "caso3.html":  { nome: "Edson Carvalhaes", papel: "Cargo: Técnico de Farmácia · Farmácia Central" },
    "caso4.html":  { nome: "BI-07", rotulo: "O aparelho culpado", papel: "Bomba de infusão · UTI Adulto", tipo: "aparelho" },
    "caso5.html":  { nome: "Bianca Furtado", papel: "Faturista · assinou o lote L-0830-C" },
    "caso6.html":  { nome: "Valéria Montenegro", papel: "Deixou a geladeira G-03 aberta" },
    "caso7.html":  { nome: "Cláudio Menezes", papel: "Cargo: Atendente · criou os cadastros em dobro" },
    "caso8.html":  { nome: "Leonel Guedes", papel: "Setor: Manutenção · 14 plantões sem entrada" },
    "caso9.html":  { nome: "Sérgio Paixão", papel: "Cargo: Faturista · Faturamento (noite)" },
    "caso10.html": { nome: "Renan Duarte", papel: "Conta do portal · login renan.duarte" },
    "caso11.html": { nome: "Fabíola Silveira", papel: "Cargo: Supervisora de enfermagem · PS (noite)" },
    "caso12.html": { nome: "Wagner Veloso", papel: "Cargo: Auxiliar de farmácia · Satélite da Oncologia" },
    "caso13.html": { nome: "Heloísa Brandini", papel: "Cargo: Enfermeira · UTI Adulto (noite)" },
    "caso14.html": { nome: "Douglas Pacheco", papel: "Analista terceirizado · criou o gatilho" },
    "caso15.html": { nome: "Gervásio Toledo", papel: "Cargo: Atendente de farmácia · Farmácia Central (noite)" },
    "caso16.html": { nome: "Raquel Antunes", papel: "Cargo: Enfermeira coordenadora · Centro Cirúrgico (noite)" }
  };
  function casoCompleto(cs, st) {
    return !!cs && cs.fases.length > 0 && cs.fases.every(function (f) { return st[f.id]; });
  }
  function hashTexto(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // ---- retratos: personagens desenhados em SVG
  // Cada personagem tem seus traços definidos aqui (pele, cabelo, barba, óculos, roupa, olhos...).
  // Quem não está na lista (casos novos) recebe traços estáveis calculados a partir do nome.
  var PELES = {
    clara: ["#f8dfc9", "#e4bb98"], media: ["#edc59b", "#d3a275"], morena: ["#c98f62", "#a87448"],
    escura: ["#8e5b38", "#724427"], negra: ["#5f3b26", "#46291a"]
  };
  var CABELOS = {
    preto: "#1b1613", castanho: "#4b2d1a", castclaro: "#7a5232", mel: "#8a6a3a", ruivo: "#a24b21", loiro: "#c19a52", grisalho: "#9a9a98", branco: "#dcdcd6"
  };
  var OLHOS = { castanho: "#4a2c19", escuro: "#241710", verde: "#4d7a52", azul: "#4a7db0", mel: "#a2722c" };
  var ROUPA_COR = {
    "scrub-verde": "#2f8f7e", "scrub-azul": "#3b74b8", "scrub-bordo": "#8d3b52", "scrub-roxo": "#6a55a8",
    "polo-azul": "#2f4f86", "polo-cinza": "#5b6673", casual: "#6e8a5f", moletom: "#4b5563",
    macacao: "#d9822b", social: "#dbe4ee", blazer: "#2f3a4a", jaleco: "#f3f2ec"
  };
  // p=pele h=cabelo c=cor do cabelo e=olhos b=barba o=óculos r=roupa x=extra s=sorriso f=rosto
  // ci=cílios br=brincos pe=pérolas ru=marcas de expressão (mais velho)
  var RETRATOS = {
    "Otávio Brandão":      { p: "media",  h: "social",   c: "castanho", b: "bigode",  o: "redondo",    r: "casual",      s: "leve" },
    "Lorena Bittencourt":  { p: "morena", h: "ondulado", c: "preto",    ci: 1, br: 1,                   r: "casual",      s: "leve", f: "fino" },
    "Rogério Valadares":   { p: "media",  h: "curto",    c: "castanho", b: "barba",                    r: "moletom",     s: "serio" },
    "Jeremias Paiva":      { p: "escura", h: "raspado",  c: "preto",                  o: "retangular", r: "polo-cinza",  s: "leve" },
    "Vitória Albuquerque": { p: "clara",  h: "coque",    c: "loiro",    e: "azul", ci: 1, br: 1, pe: 1,  r: "blazer",      s: "serio", f: "fino" },
    "Hamilton Seabra":    { p: "morena", h: "entradas", c: "preto",    b: "bigode",                   r: "scrub-verde", x: "cracha", s: "serio", f: "largo" },
    "Márcia Barcelos":  { p: "media",  h: "chanel",   c: "castclaro", e: "mel", ci: 1,              r: "scrub-azul",  x: "cracha", s: "leve", f: "fino" },
    "Renata Figueiredo":   { p: "clara",  h: "ondulado", c: "ruivo",    e: "verde", ci: 1, sa: 1,       r: "scrub-bordo", x: "cracha", s: "largo" },
    "Breno Padilha":   { p: "media",  h: "topete",   c: "preto",                                  r: "scrub-verde", x: "cracha", s: "leve" },
    "Dalila Almada":    { p: "escura", h: "coque",    c: "preto",    ci: 1, br: 1,                   r: "jaleco",      x: "cracha", s: "largo", f: "fino" },
    "Edson Carvalhaes":    { p: "media",  h: "social",   c: "grisalho", b: "bigode",  o: "retangular", ru: 1, r: "jaleco",   x: "cracha", s: "serio", f: "largo" },
    "Leila Sandoval":    { p: "clara",  h: "franja",   c: "castanho", ci: 1,        o: "gatinho",    r: "jaleco",      x: "cracha", s: "leve" },
    "Solange Portela":   { p: "morena", h: "comprido", c: "preto",    ci: 1,        o: "redondo",    r: "jaleco",      x: "cracha", s: "leve" },
    "Sônia Zanella":      { p: "negra",  h: "volume",   c: "preto",    ci: 1, br: 1,                   r: "jaleco",      x: "cracha", s: "largo" },
    "Gilson Amorim":  { p: "escura", h: "careca",   c: "preto",    b: "cav",                      r: "jaleco",      x: "cracha", s: "leve" },
    "Bianca Furtado":      { p: "media",  h: "comprido", c: "castanho", ci: 1, br: 1,                   r: "social",      x: "cracha", s: "leve" },
    "Valéria Montenegro":  { p: "morena", h: "rabo",     c: "preto",    ci: 1,                         r: "polo-azul",   x: "cracha", s: "serio" },
    "Dulce Galdino":   { p: "clara",  h: "curto",    c: "branco",                 o: "redondo",    ru: 1, r: "polo-azul",  x: "cracha", s: "leve" },
    "Cláudio Menezes":     { p: "clara",  h: "curto",    c: "castclaro", b: "cav",                     r: "social",      gr: 1, x: "cracha", s: "serio", f: "fino" },
    "Rosângela Freitas":   { p: "escura", h: "afro",     c: "preto",    ci: 1, br: 1,                   r: "polo-cinza",  x: "cracha", s: "largo", e: "mel" },
    "Hugo Amaral":         { p: "clara",  h: "curto",    c: "loiro",    e: "azul", o: "retangular",    r: "polo-cinza",  x: "cracha", s: "leve", sa: 1 },
    "Leonel Guedes":       { p: "morena", h: "raspado",  c: "preto",    b: "barba",                    r: "macacao",     s: "serio", f: "largo" },
    "Irene Castilho":      { p: "clara",  h: "chanel",   c: "grisalho",                               ru: 1, r: "macacao",    s: "leve", f: "fino" },
    "Marta Guimarães":     { p: "media",  h: "ondulado", c: "mel",      e: "verde", ci: 1,             r: "macacao",     s: "leve" },
    "Moacir Teles":        { p: "negra",  h: "careca",   c: "grisalho", b: "bigode",                   ru: 1, r: "macacao",    s: "serio", f: "largo" },
    "Lia Moraes":          { p: "media",  h: "franja",   c: "preto",    ci: 1,                         r: "casual",      s: "leve" },
    "Beatriz Falcão":      { p: "clara",  h: "chanel",   c: "loiro",    e: "azul", ci: 1, sa: 1,       r: "social",      x: "cracha", s: "leve" },
    "Jaqueline Prado":     { p: "morena", h: "cacheado", c: "castclaro", ci: 1, br: 1,                  r: "social",      x: "cracha", s: "leve" },
    "Daniela Couto":       { p: "media",  h: "coque",    c: "preto",    ci: 1,                         r: "social",      x: "cracha", s: "largo" },
    "Caio Linhares":       { p: "clara",  h: "topete",   c: "castanho", e: "verde",                   sa: 1, r: "scrub-azul", x: "cracha", s: "leve" },
    "Fábio Rezende":       { p: "clara",  h: "social",   c: "preto",    e: "escuro", b: "barba",       r: "scrub-verde", x: "cracha", s: "serio" },
    "Tereza Botelho":        { p: "clara",  h: "rabo",     c: "castclaro", e: "verde", ci: 1,   o: "gatinho", r: "social",     x: "cracha", s: "serio" },
    "Sérgio Paixão":       { p: "media",  h: "entradas", c: "castanho", b: "barba",   o: "retangular", r: "social",      gr: 1, x: "cracha", s: "serio", f: "largo" },
    "Renan Duarte":        { p: "morena", h: "cacheado", c: "preto",    b: "cav",     o: "redondo",    r: "moletom",     s: "serio" },
    "Fabíola Silveira":   { p: "clara",  h: "ondulado", c: "castanho", e: "mel", ci: 1, ru: 1,       r: "scrub-roxo",  x: "cracha", s: "serio", f: "fino" },
    "Celso Drumond":      { p: "clara",  h: "entradas", c: "grisalho", o: "retangular", ru: 1,        r: "jaleco",      x: "cracha", s: "serio", f: "largo" },
    "Eliseu Quintana":    { p: "negra",  h: "curto",    c: "preto",                                  r: "scrub-azul",  x: "cracha", s: "leve" },
    "Ivone Siqueira":     { p: "media",  h: "coque",    c: "branco",   o: "redondo", ru: 1,            r: "casual",      s: "leve", f: "fino" },
    "Bruno Saldanha":     { p: "morena", h: "topete",   c: "castclaro", sa: 1,                        r: "casual",      s: "largo" },
    "Wagner Veloso":      { p: "escura", h: "topete",   c: "preto",    b: "bigode",                   r: "polo-cinza",  x: "cracha", s: "serio" },
    "Hélio Loureiro":     { p: "clara",  h: "careca",   c: "castclaro", b: "cav", o: "retangular",    r: "scrub-bordo", x: "cracha", s: "serio" },
    "Lúcia Nogueira":     { p: "escura", h: "franja",   c: "castclaro", ci: 1, o: "gatinho",           r: "jaleco",      x: "cracha", s: "leve" },
    "Sueli Arantes":      { p: "morena", h: "curto",    c: "grisalho", ci: 1, br: 1, ru: 1,           r: "polo-azul",   x: "cracha", s: "serio" },
    "Joana Leal":         { p: "clara",  h: "comprido", c: "ruivo",    e: "verde", ci: 1, sa: 1,       r: "polo-azul",   x: "cracha", s: "leve" },
    "Heloísa Brandini":   { p: "morena", h: "coque",    c: "castclaro", ci: 1, o: "gatinho",           r: "scrub-roxo",  x: "cracha", s: "serio", f: "fino" },
    "Simone Leitão":      { p: "negra",  h: "comprido", c: "preto",    ci: 1, br: 1,                   r: "scrub-verde", x: "cracha", s: "leve" },
    "Amélia Chagas":      { p: "media",  h: "rabo",     c: "castanho", e: "mel", ci: 1,              r: "scrub-azul",  x: "cracha", s: "leve" },
    "Wesley Coutinho":    { p: "negra",  h: "afro",     c: "preto",                                  r: "scrub-verde", x: "cracha", s: "largo" },
    "Patrícia Galvão":    { p: "morena", h: "volume",   c: "castanho", ci: 1, br: 1,                   r: "scrub-bordo", x: "cracha", s: "largo" },
    "Rosana Damasceno":   { p: "negra",  h: "chanel",   c: "preto",    ci: 1,                         r: "scrub-azul",  x: "cracha", s: "largo", f: "fino" },
    "Douglas Pacheco":    { p: "clara",  h: "raspado",  c: "castanho", b: "bigode", o: "retangular",  r: "polo-azul",   x: "cracha", s: "serio", f: "largo" },
    "Sílvia Miranda":     { p: "morena", h: "chanel",   c: "castanho", ru: 1, o: "gatinho",           r: "blazer",      s: "serio" },
    "Jussara Moura":      { p: "escura", h: "ondulado", c: "castclaro", ci: 1, br: 1,                  r: "social",      x: "cracha", s: "serio" },
    "Regina Varela":      { p: "escura", h: "curto",    c: "preto",    ci: 1, br: 1, o: "redondo",    r: "casual",      s: "leve" },
    "Vinícius Bastos":     { p: "morena", h: "social",   c: "preto",    b: "cav", o: "retangular",     r: "polo-cinza",  x: "cracha", s: "leve" },
    "Marlene Pacheco":    { p: "clara",  h: "ondulado", c: "grisalho", ru: 1,                         r: "casual",      s: "leve", f: "largo" },
    "Gervásio Toledo":    { p: "morena", h: "entradas", c: "grisalho", b: "bigode",  o: "retangular", ru: 1, r: "jaleco",   x: "cracha", s: "serio", f: "largo" },
    "Lucimara Bonfim":    { p: "morena", h: "coque",    c: "preto",    ci: 1, br: 1,                   r: "jaleco",      x: "cracha", s: "leve" },
    "Iolanda Feitosa":    { p: "clara",  h: "chanel",   c: "branco",   ci: 1,        o: "gatinho",    ru: 1, r: "jaleco",   x: "cracha", s: "leve", f: "fino" },
    "Anselmo Vilaça":      { p: "clara",  h: "careca",   c: "branco",   b: "barba",                    ru: 1, r: "casual",   s: "leve" },
    "Josué Prates":         { p: "negra",  h: "raspado",  c: "preto",                                  r: "jaleco",      x: "cracha", s: "largo" },
    "Ivo Sarandi":        { p: "media",  h: "social",   c: "castclaro", b: "cav",                     r: "jaleco",      x: "cracha", s: "leve" },
    "Raquel Antunes":      { p: "media",  h: "coque",    c: "castanho", ci: 1, br: 1, o: "retangular", r: "scrub-azul",  x: "cracha", s: "serio", f: "fino" },
    "Henrique Soutello":   { p: "clara",  h: "social",   c: "grisalho", b: "barba",                    ru: 1, r: "jaleco",   x: "cracha", s: "leve", f: "largo" },
    "Jonas Pimentel":     { p: "negra",  h: "social",   c: "preto",                  o: "retangular", r: "polo-azul",   x: "cracha", s: "leve" },
    "Humberto Campelo":    { p: "morena", h: "curto",    c: "preto",    b: "cav",                      r: "scrub-verde", x: "cracha", s: "serio" },
    "Denise Arruda":       { p: "negra",  h: "afro",     c: "grisalho", ci: 1, br: 1,                   ru: 1, r: "scrub-bordo", x: "cracha", s: "leve" }
  };
  // traços estáveis para quem não está na lista
  function retratoPeloNome(nome) {
    var h = hashTexto(nome), pick = function (arr, k) { return arr[(h >>> k) % arr.length]; };
    return {
      p: pick(["clara", "media", "morena", "escura", "negra"], 0),
      h: pick(["curto", "social", "raspado", "ondulado", "cacheado", "coque", "rabo", "comprido"], 3),
      c: pick(["preto", "castanho", "castanho", "ruivo", "loiro", "grisalho"], 7),
      b: pick(["", "", "", "bigode", "barba"], 11),
      o: pick(["", "", "redondo", "retangular"], 15),
      r: pick(["scrub-verde", "scrub-azul", "polo-azul", "social", "casual", "jaleco"], 19),
      e: pick(["castanho", "castanho", "escuro", "mel", "verde"], 27),
      ci: pick([0, 1], 5),
      gr: pick([0, 0, 1], 9), x: "cracha", s: pick(["leve", "serio", "largo"], 23)
    };
  }
  // mistura a cor com branco (f > 0) ou preto (f < 0)
  function clareia(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var alvo = f >= 0 ? 255 : 0, k = Math.abs(f);
    return "rgb(" + Math.round(r + (alvo - r) * k) + "," + Math.round(g + (alvo - g) * k) + "," + Math.round(b + (alvo - b) * k) + ")";
  }
  var retratoSeq = 0;
  var CABECAS = {
    oval:  { d: "M50 23.5 C64 23.5 70.5 34 70 46 C69.6 58 63 70.5 50 72.5 C37 70.5 30.4 58 30 46 C29.5 34 36 23.5 50 23.5Z", ex: 20 },
    largo: { d: "M50 24 C65 24 72 35 71.5 47 C71 60 64.5 72.5 50 73.5 C35.5 72.5 29 60 28.5 47 C28 35 35 24 50 24Z", ex: 21.5 },
    fino:  { d: "M50 22 C63 22 69 33 68.5 46 C68 59 62.5 72.5 50 75 C37.5 72.5 32 59 31.5 46 C31 33 37 22 50 22Z", ex: 18.5 }
  };
  // sugere cachos com pequenos arcos dentro da massa de cabelo
  function cachos(base, luz, pontos) {
    var a = "";
    pontos.forEach(function (p, i) {
      var r = 2.6 + (i % 3) * 0.5;
      a += '<path d="M' + (p[0] - r) + ' ' + p[1] + ' a' + r + ' ' + r + ' 0 0 1 ' + (2 * r) + ' 0 a' + (r * 0.7) + ' ' + (r * 0.7) + ' 0 0 1 -' + (r * 1.1) + ' ' + (r * 1.1) + '" fill="none" stroke="' + luz + '" stroke-width="1" stroke-linecap="round" opacity=".32"/>';
    });
    return base + a;
  }
  function cabeloTras(h, F, luz) {
    var f = ' fill="' + F + '"';
    if (h === "comprido" || h === "franja") return '<path d="M27 52 C19 12 81 12 73 52 L79 97 C60 104 40 104 21 97 Z"' + f + '/><path d="M30 40 Q27 70 30 94 M70 40 Q73 70 70 94" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".3"/>';
    if (h === "ondulado") return '<path d="M27.5 50 C19 13 81 13 72.5 50 C80 62 74 74 80 88 C72 91 68 82 62 90 L38 90 C32 82 28 91 20 88 C26 74 20 62 27.5 50Z"' + f + '/><path d="M27 58 Q24 72 26 84 M73 58 Q76 72 74 84" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".3"/>';
    if (h === "cacheado") return cachos('<circle cx="50" cy="38" r="26"' + f + '/><circle cx="27" cy="52" r="10"' + f + '/><circle cx="73" cy="52" r="10"' + f + '/><circle cx="32" cy="65" r="8"' + f + '/><circle cx="68" cy="65" r="8"' + f + '/><circle cx="33" cy="30" r="9"' + f + '/><circle cx="67" cy="30" r="9"' + f + '/>', luz, [[40, 21], [50, 17], [60, 21], [27, 54], [73, 54], [32, 66], [68, 66], [34, 30], [66, 30]]);
    if (h === "volume") return cachos('<circle cx="50" cy="37" r="28"' + f + '/><circle cx="24" cy="49" r="11"' + f + '/><circle cx="76" cy="49" r="11"' + f + '/><circle cx="31" cy="29" r="12"' + f + '/><circle cx="69" cy="29" r="12"' + f + '/><circle cx="50" cy="18" r="12"' + f + '/>', luz, [[38, 14], [50, 10], [62, 14], [28, 22], [72, 22], [21, 44], [79, 44], [30, 34], [70, 34], [44, 20], [56, 20]]);
    if (h === "coque") return '<circle cx="50" cy="12.5" r="10.5"' + f + '/><path d="M44 9 Q50 5.5 56 9 M43 13 Q50 10 57 13 M44.5 17 Q50 15 55.5 17" stroke="' + luz + '" stroke-width="1.1" fill="none" opacity=".4" stroke-linecap="round"/>';
    if (h === "rabo") return '<path d="M66 33 C87 29 96 57 86 86 C84 72 78 62 67 54Z"' + f + '/><path d="M76 42 Q85 56 82 76" stroke="' + luz + '" stroke-width="1.3" fill="none" opacity=".35" stroke-linecap="round"/>';
    if (h === "chanel") return '<path d="M26 52 C17 8 83 8 74 52 C76.5 60 76 68 72 74.5 C62 71.5 38 71.5 28 74.5 C24 68 23.5 60 26 52Z"' + f + '/><path d="M27.6 56 Q26.6 66 30 72 M72.4 56 Q73.4 66 70 72" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".3"/>';
    if (h === "afro") return cachos('<circle cx="50" cy="35" r="22.5"' + f + '/><circle cx="28.5" cy="45" r="7.5"' + f + '/><circle cx="71.5" cy="45" r="7.5"' + f + '/>', luz, [[40, 18], [50, 15], [60, 18], [27, 44], [73, 44], [33, 26], [67, 26]]);
    return "";
  }
  function cabeloFrente(h, F, luz, sombra, id, cabecaD) {
    var f = ' fill="' + F + '"';
    var fios = function (d) { return '<path d="' + d + '" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".42" stroke-linecap="round"/>'; };
    if (h === "careca") return '<path d="M30.4 49 C29.4 35 40 26.5 50 26.5 C60 26.5 70.6 35 69.6 49 C66.6 39.5 59.5 33 50 33 C40.5 33 33.4 39.5 30.4 49Z"' + f + ' opacity=".2"/><ellipse cx="48" cy="30" rx="13" ry="6.5" fill="url(#' + id + 'b)"/>';
    if (h === "raspado") {
      // cabelo rente: sombra suave sobre a pele, presa ao contorno da cabeça (nada de "touca")
      var k = id + "k", z = id + "z", z2 = id + "y";
      return '<clipPath id="' + k + '"><path d="' + cabecaD + '"/></clipPath>' +
        '<filter id="' + z + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.15"/></filter>' +
        '<filter id="' + z2 + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>' +
        '<g clip-path="url(#' + k + ')">' +
        '<path d="M26 54 C26 41 29.5 35 34 32.2 C40 28.6 45 30.2 50 29.6 C55 30.2 60 28.6 66 32.2 C70.5 35 74 41 74 54 L74 8 L26 8Z"' + f + ' opacity=".34" filter="url(#' + z2 + ')"/>' +
        '<path d="M28 50 C28 40 31 35.6 35 33.6 C40.5 31.2 45.5 32.4 50 32 C54.5 32.4 59.5 31.2 65 33.6 C69 35.6 72 40 72 50 L72 8 L28 8Z"' + f + ' opacity=".64" filter="url(#' + z + ')"/>' +
        '<ellipse cx="45" cy="28.5" rx="10" ry="4.4" fill="url(#' + id + 'b)" opacity=".6"/>' +
        '</g>';
    }
    if (h === "social") return '<path d="M29.5 49 C26 21 48 13 62 18 C71.5 22.5 74 36 70.5 49 C68.5 38.5 64 33 57.5 31 C48.5 35 38 31.5 33.5 39 C31.5 42 30.5 45.5 29.5 49Z"' + f + '/>' +
      '<path d="M43 31.5 C48 34.5 55 35 60 32" stroke="' + sombra + '" stroke-width="1.1" fill="none" opacity=".6"/>' + fios("M36 26 Q46 18.5 60 21 M52 24 Q64 24 69 32");
    if (h === "comprido") return '<path d="M29.6 52 C24 9 76 9 70.4 52 C69.2 41.6 63 34 55 31 C52.6 30.2 51.2 30 50 30 C48.8 30 47.4 30.2 45 31 C37 34 30.8 41.6 29.6 52Z"' + f + '/>' +
      '<path d="M50 23 L50 30" stroke="' + sombra + '" stroke-width="1" opacity=".5" stroke-linecap="round"/>' + fios("M33 37 Q35 27 43 22 M67 37 Q65 27 57 22");
    if (h === "ondulado") return '<path d="M29 50 C24 8 76 8 71 50 C69 37 62 30 51 29.5 C43 30 36 34 33 42 C31 45 30 47.5 29 50Z"' + f + '/>' + fios("M34 36 Q44 22 62 25 M60 28 Q68 31 69 40");
    if (h === "cacheado") return '<path d="M30 46 C29 27 71 27 70 46 C66 37 58 34 50 34 C42 34 34 37 30 46Z"' + f + '/><circle cx="35" cy="31" r="6.5"' + f + '/><circle cx="44" cy="26" r="7"' + f + '/><circle cx="54" cy="25" r="7"' + f + '/><circle cx="63" cy="29" r="6.5"' + f + '/><circle cx="68.5" cy="38" r="5"' + f + '/><circle cx="31.5" cy="39" r="5"' + f + '/>' +
      '<path d="M40 24 Q44 21 48 23 M55 22 Q60 21 63 25" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".4" stroke-linecap="round"/>';
    if (h === "volume") return '<path d="M29 47 C27 24 73 24 71 47 C66 37 58 33 50 33 C42 33 34 37 29 47Z"' + f + '/><circle cx="36" cy="28" r="8.5"' + f + '/><circle cx="50" cy="24" r="9.5"' + f + '/><circle cx="64" cy="28" r="8.5"' + f + '/>' +
      '<path d="M44 21 Q50 18 56 21" stroke="' + luz + '" stroke-width="1.2" fill="none" opacity=".4" stroke-linecap="round"/>';
    if (h === "coque") return '<path d="M30 48 C26 12 74 12 70 48 C68 37 60 31.5 50 31.5 C40 31.5 32 37 30 48Z"' + f + '/><path d="M50 21.5 L50 32" stroke="' + sombra + '" stroke-width="1" opacity=".45"/>' + fios("M36 30 Q42 24 49 24 M64 30 Q58 24 51 24") +
      '<rect x="44" y="20" width="12" height="3.2" rx="1.6" fill="#7a2f2f"/>';
    if (h === "rabo") return '<path d="M30 48 C26 12 74 12 70 48 C68 37 60 31.5 50 31.5 C40 31.5 32 37 30 48Z"' + f + '/><path d="M50 22 L50 32" stroke="' + sombra + '" stroke-width="1" opacity=".4"/>' + fios("M36 30 Q42 24 49 24 M64 30 Q58 24 51 24") +
      '<rect x="64.8" y="33" width="3.6" height="10" rx="1.8" fill="#7a2f2f" transform="rotate(-18 66.6 38)"/>';
    if (h === "chanel") return '<path d="M29.5 52 C23 8 77 8 70.5 52 C69.6 40.6 62.6 32.4 53.5 29.6 C47 33.6 38.5 34.6 32.8 43.6 C31.2 46.4 30.2 49 29.5 52Z"' + f + '/>' + fios("M34 31 Q43 20 59 22.5 M62 25 Q68 30 69 39");
    if (h === "franja") return '<path d="M29.5 50 C23.5 8 76.5 8 70.5 50 L69.6 39 C62 33.4 38 33.4 30.4 39Z"' + f + '/>' + fios("M40 22 Q39 29 38.4 34 M50 20.6 L50 33.6 M60 22 Q61 29 61.6 34");
    if (h === "topete") return '<path d="M30 47 C26.5 22 35 11 50 10 C64 9.5 73.5 21 70 47 C68.4 38.5 64.4 32.4 58 30.4 C51 33.4 43 32.6 37 35 C32.8 37.6 31 41.6 30 47Z"' + f + '/>' + fios("M36 22 Q45 12.5 58 14 M53 14.5 Q64 16 68 27");
    if (h === "entradas") return '<path d="M30 48 C28.4 27 39.5 19 50 19 C60.5 19 71.6 27 70 48 C69 42 67.6 38 65.4 34.4 C62.6 28.6 58.6 27.6 55.6 29.2 C53.4 30.4 51.8 33.4 50 33.4 C48.2 33.4 46.6 30.4 44.4 29.2 C41.4 27.6 37.4 28.6 34.6 34.4 C32.4 38 31 42 30 48Z"' + f + '/>' + fios("M38 24 Q50 19.6 62 24");
    if (h === "afro") return cachos('<path d="M29.5 47 C28 26 72 26 70.5 47 C66 38.5 58 34.6 50 34.6 C42 34.6 34 38.5 29.5 47Z"' + f + '/><circle cx="35" cy="30" r="5.6"' + f + '/><circle cx="43" cy="25.5" r="6"' + f + '/><circle cx="52" cy="24.5" r="6"' + f + '/><circle cx="60.5" cy="26.5" r="6"' + f + '/><circle cx="66.5" cy="32.5" r="5"' + f + '/><circle cx="32" cy="37.5" r="4.4"' + f + '/><circle cx="68.5" cy="39" r="3.8"' + f + '/>', luz, [[40, 24], [50, 21], [60, 24], [34, 30], [66, 31]]);
    // curto
    return '<path d="M30 47 C28 24 41 17 50 17 C60 17 72 24 70 47 C68.5 38 64.5 31.5 58.5 29.5 C52.5 33 42 33 36 35.5 C32.5 38 31 42 30 47Z"' + f + '/>' + fios("M37 26 Q44 21.5 52 22.5 M56 22 Q63 23 67 29");
  }
  function barbaSVG(b, F, luz) {
    var f = ' fill="' + F + '"';
    if (b === "barba") return '<path d="M30 51 C29.5 71 40 79.5 50 79.5 C60 79.5 70.5 71 70 51 C68 58 64 61.5 58.5 62.3 C55 60.5 45 60.5 41.5 62.3 C36 61.5 32 58 30 51Z"' + f + '/>' +
      '<path d="M33 60 Q36 70 44 74 M67 60 Q64 70 56 74 M46 74.5 Q50 76 54 74.5" stroke="' + luz + '" stroke-width="1" fill="none" opacity=".28"/>' +
        '<ellipse cx="50" cy="73.4" rx="6.5" ry="2.4" fill="#fff" opacity=".07"/>';
    if (b === "bigode") return '<path d="M41 62.2 Q45.5 58 50 60.8 Q54.5 58 59 62.2 Q54.5 65.6 50 63.4 Q45.5 65.6 41 62.2Z"' + f + '/>';
    if (b === "cav") return '<path d="M41 62.2 Q45.5 58 50 60.8 Q54.5 58 59 62.2 Q54.5 65.6 50 63.4 Q45.5 65.6 41 62.2Z"' + f + '/><path d="M44 70 Q50 78 56 70 Q50 73.5 44 70Z"' + f + '/>';
    return "";
  }
  function oculosSVG(o) {
    if (!o) return "";
    var arm = '<path d="M35.2 47.6 L30.2 46.6 M64.8 47.6 L69.8 46.6" stroke="#23201c" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    var ponte = '<path d="M48.6 47.8 Q50 46 51.4 47.8" stroke="#23201c" stroke-width="1.5" fill="none"/>';
    var brilho = '<path d="M37.2 45.4 L40.6 43.6 M53 45.4 L56.4 43.6" stroke="#fff" stroke-width="1" opacity=".55" stroke-linecap="round"/>';
    if (o === "gatinho") {
      return '<path d="M34.6 44.6 C36 42.6 39 42.8 42 43.2 C46 43.8 48.6 45 48.4 48.4 C48.2 51.6 45 53 41.5 53 C37.8 53 34.8 50.6 34.6 44.6Z" fill="#cfe6f2" fill-opacity=".18" stroke="#7a2a44" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M65.4 44.6 C64 42.6 61 42.8 58 43.2 C54 43.8 51.4 45 51.6 48.4 C51.8 51.6 55 53 58.5 53 C62.2 53 65.2 50.6 65.4 44.6Z" fill="#cfe6f2" fill-opacity=".18" stroke="#7a2a44" stroke-width="1.6" stroke-linejoin="round"/>' + ponte + arm + brilho;
    }
    if (o === "retangular") {
      return '<rect x="35.4" y="43.6" width="13" height="9.4" rx="2.4" fill="#cfe6f2" fill-opacity=".18" stroke="#23201c" stroke-width="1.7"/>' +
        '<rect x="51.6" y="43.6" width="13" height="9.4" rx="2.4" fill="#cfe6f2" fill-opacity=".18" stroke="#23201c" stroke-width="1.7"/>' + ponte + arm + brilho;
    }
    return '<circle cx="41.5" cy="48" r="6.8" fill="#cfe6f2" fill-opacity=".18" stroke="#23201c" stroke-width="1.7"/>' +
      '<circle cx="58.5" cy="48" r="6.8" fill="#cfe6f2" fill-opacity=".18" stroke="#23201c" stroke-width="1.7"/>' + ponte + arm + brilho;
  }
  function roupaSVG(r, x, pele, sombraId, pe, clipId, gr) {
    var cor = ROUPA_COR[r] || "#5b6673";
    var torso = "M3 112 C5 90 26 81 50 81 C74 81 95 90 97 112 Z";
    var s = '<path d="' + torso + '" fill="' + cor + '"/><g clip-path="url(#' + clipId + ')">';
    if (r.indexOf("scrub") === 0) {
      s += '<path d="M39 81 L50 99 L61 81 Z" fill="' + pele[0] + '"/><path d="M39 81 L50 99 L61 81" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<rect x="65" y="98" width="15" height="12" rx="2" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.2"/>';
    } else if (r === "jaleco") {
      s += '<path d="M42 81 L50 96 L58 81 Z" fill="#6fa8cf"/><path d="M37 82 L47 102 L41 112 M63 82 L53 102 L59 112" fill="none" stroke="#cfccbf" stroke-width="1.4"/>' +
        '<path d="M37 82 L44 84 M63 82 L56 84" stroke="#cfccbf" stroke-width="1.4"/><rect x="66" y="97" width="16" height="13" rx="2" fill="none" stroke="#cfccbf" stroke-width="1.2"/><path d="M71 97 V92" stroke="#2f6db0" stroke-width="2"/>';
    } else if (r === "social") {
      if (gr) s += '<path d="M41 80 L50 94 L59 80 L56.5 77.5 L50 86 L43.5 77.5 Z" fill="#fff"/><path d="M48.4 89 L51.6 89 L53.6 112 L50 107.5 L46.4 112 Z" fill="#7a2230"/>';
      else s += '<path d="M42 81 L50 93 L58 81 Z" fill="' + pele[0] + '"/><path d="M40.5 79 L50 93 L43 99 L35 85 Z" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width=".8" stroke-linejoin="round"/><path d="M59.5 79 L50 93 L57 99 L65 85 Z" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width=".8" stroke-linejoin="round"/><path d="M50 93 V112" stroke="rgba(0,0,0,.15)" stroke-width="1"/>';
    } else if (r === "blazer") {
      s += '<path d="M40 81 L50 102 L60 81 Z" fill="#f6f1e7"/><path d="M36 82 L48 106 L42 112 M64 82 L52 106 L58 112" fill="none" stroke="#1f2833" stroke-width="2"/>';
      if (pe) {
        // fio de pérolas acompanhando o decote
        for (var i = 0; i <= 8; i++) {
          var t = i / 8, px = (1 - t) * (1 - t) * 40.5 + 2 * (1 - t) * t * 50 + t * t * 59.5, py = (1 - t) * (1 - t) * 83 + 2 * (1 - t) * t * 99 + t * t * 83;
          s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="1.55" fill="#f8f4ea" stroke="#cdc5b3" stroke-width=".5"/>';
        }
      }
    } else if (r.indexOf("polo") === 0) {
      var gola = clareia(cor, .24);
      s += '<path d="M42 81 L50 92 L58 81 Z" fill="' + pele[0] + '"/>' +
        '<path d="M40.5 80 L50 92 L43 99 L34 86 Z" fill="' + gola + '" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round"/>' +
        '<path d="M59.5 80 L50 92 L57 99 L66 86 Z" fill="' + gola + '" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round"/>' +
        '<path d="M50 92 V104" stroke="rgba(255,255,255,.55)" stroke-width="1.3"/><circle cx="50" cy="97" r=".9" fill="rgba(255,255,255,.7)"/><circle cx="50" cy="102" r=".9" fill="rgba(255,255,255,.7)"/>';
    } else if (r === "moletom") {
      s += '<path d="M37 81 C41 90 59 90 63 81 L68 83 C64 94 36 94 32 83 Z" fill="' + clareia(cor, -.28) + '"/><path d="M38 83 C42 91 58 91 62 83" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1"/>' +
        '<path d="M45.5 91 L44.5 103 M54.5 91 L55.5 103" stroke="rgba(255,255,255,.6)" stroke-width="1.3" stroke-linecap="round"/><circle cx="44.5" cy="103.6" r="1" fill="rgba(255,255,255,.7)"/><circle cx="55.5" cy="103.6" r="1" fill="rgba(255,255,255,.7)"/>';
    } else if (r === "macacao") {
      s += '<path d="M40 80 L50 92 L60 80 L66 85 L50 100 L34 85 Z" fill="rgba(0,0,0,.18)"/><path d="M50 92 V112" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/>' +
        '<path d="M8 100 H92" stroke="#f1ec7a" stroke-width="2.2" opacity=".85"/>';
    } else {
      s += '<path d="M39 81 C43 91 57 91 61 81 Z" fill="' + pele[0] + '"/><path d="M39 81 C43 91 57 91 61 81" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.4"/>';
    }
    if (x === "cracha") {
      s += '<path d="M40 82 L47 103 M60 82 L53 103" stroke="#2c6fb7" stroke-width="1.5" fill="none"/>' +
        '<rect x="43.5" y="102" width="13" height="9.5" rx="1.6" fill="#fff" stroke="#4a5560" stroke-width="1"/><rect x="43.5" y="102" width="13" height="2.6" fill="#2c6fb7"/>' +
        '<path d="M46 107 H54" stroke="#9aa3ab" stroke-width="1"/>';
    }
    // volume e dobras: sombra lateral
    s += '<path d="' + torso + '" fill="url(#' + sombraId + ')"/></g>';
    return s;
  }
  // retrato desenhado (ficha de investigação)
  function svgBusto(nome) {
    var t = RETRATOS[nome] || retratoPeloNome(nome);
    var id = "r" + (++retratoSeq);
    var pele = PELES[t.p] || PELES.media, cab = CABELOS[t.c] || CABELOS.castanho;
    var olho = OLHOS[t.e] || OLHOS.castanho;
    var luz = clareia(cab, .38), sombra = clareia(cab, -.35);
    var F = "url(#" + id + "h)";
    var cabeca = CABECAS[t.f] || CABECAS.oval;
    var ex = cabeca.ex;
    // detalhes que mudam de pessoa para pessoa (estáveis, calculados do nome): cabeça levemente inclinada, nariz mais fino ou mais largo
    var hh = hashTexto(nome);
    var inclina = ((hh >>> 13) % 5 - 2) * 1.1, nariz = [0.9, 1, 1.13][(hh >>> 5) % 3];
    // rubor e brilho de pele: mais quentes e suaves nos tons escuros (o rosado fixo virava mancha)
    var RUBOR = { clara: ["#e0675c", .34], media: ["#dd6a55", .32], morena: ["#d2603f", .34], escura: ["#cf7448", .4], negra: ["#c27a4d", .44] };
    var LUZ_PELE = { clara: .12, media: .15, morena: .2, escura: .27, negra: .32 };
    var LUZ_COR = { clara: "#fff", media: "#fff", morena: "#ffe2c6", escura: "#ffc898", negra: "#ffc08a" };
    var rub = RUBOR[t.p] || RUBOR.media, luzPele = LUZ_PELE[t.p] || LUZ_PELE.media;
    // enquadramento fechado no rosto e nos ombros (o rosto ocupa mais a foto); ancorado embaixo
    var s = '<svg viewBox="3 6 94 94" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Retrato de ' + nome + '">';
    s += '<defs>' +
      '<radialGradient id="' + id + 'p" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="' + clareia(pele[0], .14) + '"/><stop offset=".55" stop-color="' + pele[0] + '"/><stop offset="1" stop-color="' + pele[1] + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'h" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="96"><stop offset="0" stop-color="' + clareia(cab, .16) + '"/><stop offset=".5" stop-color="' + cab + '"/><stop offset="1" stop-color="' + clareia(cab, -.3) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".26" stop-color="#000" stop-opacity="0"/><stop offset=".74" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>' +
      '<linearGradient id="' + id + 'n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + clareia(pele[1], -.12) + '"/><stop offset=".4" stop-color="' + pele[1] + '"/><stop offset=".75" stop-color="' + pele[0] + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'b"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".6" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'r"><stop offset="0" stop-color="' + rub[0] + '" stop-opacity="' + rub[1] + '"/><stop offset="1" stop-color="' + rub[0] + '" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'l"><stop offset="0" stop-color="' + (LUZ_COR[t.p] || "#fff") + '" stop-opacity="' + luzPele + '"/><stop offset="1" stop-color="' + (LUZ_COR[t.p] || "#fff") + '" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="' + id + 't"><path d="M3 112 C5 90 26 81 50 81 C74 81 95 90 97 112 Z"/></clipPath>' +
      '</defs>';
    var gira = '<g transform="rotate(' + inclina + ' 50 86)">';
    s += gira + cabeloTras(t.h, F, luz) + '</g>';
    // pescoço, com a sombra do queixo
    s += '<path d="M42.5 62 L42.5 84 C42.5 89 57.5 89 57.5 84 L57.5 62Z" fill="url(#' + id + 'n)"/>';
    s += roupaSVG(t.r || "casual", t.x, pele, id + "s", t.pe, id + "t", t.gr);
    // orelhas (com brinco, se tiver)
    s += gira;
    [50 - ex - 0.7, 50 + ex + 0.7].forEach(function (cx) {
      s += '<ellipse cx="' + cx.toFixed(1) + '" cy="49.5" rx="3.3" ry="5.4" fill="' + pele[0] + '"/><ellipse cx="' + (cx + (cx < 50 ? 0.5 : -0.5)).toFixed(1) + '" cy="50" rx="1.5" ry="3.2" fill="' + pele[1] + '" opacity=".6"/>';
      if (t.br) s += '<circle cx="' + (cx + (cx < 50 ? 0.4 : -0.4)).toFixed(1) + '" cy="55.6" r="1.5" fill="#e3b94f" stroke="#a88428" stroke-width=".5"/>';
    });
    // rosto
    s += '<path d="' + cabeca.d + '" fill="url(#' + id + 'p)"/>';
    s += '<path d="M31.4 56 C34 73 66 73 68.6 56 C64 67 36 67 31.4 56Z" fill="' + pele[1] + '" opacity=".24"/>';
    s += '<ellipse cx="37.2" cy="57.2" rx="6.6" ry="4.6" fill="url(#' + id + 'r)"/><ellipse cx="62.8" cy="57.2" rx="6.6" ry="4.6" fill="url(#' + id + 'r)"/>';
    // luz suave na testa, nas maçãs do rosto e na ponta do nariz (dá volume, principalmente aos tons escuros)
    s += '<ellipse cx="46.5" cy="34.5" rx="12" ry="6.4" fill="url(#' + id + 'l)"/>' +
      '<ellipse cx="35.4" cy="52.4" rx="5.2" ry="3.2" fill="url(#' + id + 'l)"/><ellipse cx="64.6" cy="52.4" rx="5.2" ry="3.2" fill="url(#' + id + 'l)"/>' +
      '<ellipse cx="49.3" cy="57.4" rx="2.8" ry="2.1" fill="url(#' + id + 'l)"/>';
    if (t.sa) {
      [[41, 55], [43.6, 57.2], [39.4, 57.8], [44.8, 54.2], [59, 55], [56.4, 57.2], [60.6, 57.8], [55.2, 54.2], [48.2, 56.4], [51.8, 56.4]].forEach(function (q, i) {
        s += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (0.5 + (i % 3) * 0.1).toFixed(1) + '" fill="#a0602f" opacity=".5"/>';
      });
    }
    if (t.ru) {
      s += '<path d="M42 33.6 Q50 32 58 33.6 M43.5 36.4 Q50 35 56.5 36.4" stroke="' + pele[1] + '" stroke-width=".8" fill="none" opacity=".55" stroke-linecap="round"/>' +
        '<path d="M38.4 56 Q36.8 60 38.8 64 M61.6 56 Q63.2 60 61.2 64 M34.6 47 L32.6 46 M65.4 47 L67.4 46" stroke="' + pele[1] + '" stroke-width=".8" fill="none" opacity=".55" stroke-linecap="round"/>';
    }
    // sobrancelhas
    var g = t.s === "serio" || t.b ? 0.5 : 0.2;
    // o humor aparece na sobrancelha: séria desce para dentro, sorriso largo sobe um pouco
    var inc = t.s === "serio" ? 4 : t.s === "largo" ? -2.5 : 0, alto = t.s === "largo" ? -0.8 : 0;
    s += '<g transform="translate(0 ' + alto + ')"><path transform="rotate(' + inc + ' 41.4 43.8)" d="M35.4 43.8 Q41 39.6 47.4 42.4 L47.2 44.1 Q41.6 41.9 36 45.6Z" fill="' + cab + '" stroke="' + cab + '" stroke-width="' + g + '" stroke-linejoin="round"/>' +
      '<path transform="rotate(' + (-inc) + ' 58.6 43.8)" d="M64.6 43.8 Q59 39.6 52.6 42.4 L52.8 44.1 Q58.4 41.9 64 45.6Z" fill="' + cab + '" stroke="' + cab + '" stroke-width="' + g + '" stroke-linejoin="round"/></g>';
    // olhos
    [41.5, 58.5].forEach(function (cx, k) {
      s += '<path d="M' + (cx - 4.8) + ' 47.8 Q' + cx + ' 44.2 ' + (cx + 4.8) + ' 47.8 Q' + cx + ' 50.8 ' + (cx - 4.8) + ' 47.8Z" fill="#fbf7f2"/>' +
        '<circle cx="' + (cx + 0.2) + '" cy="47.8" r="2.25" fill="' + olho + '"/><circle cx="' + (cx + 0.2) + '" cy="47.8" r="1.1" fill="#0d0b0a"/>' +
        '<circle cx="' + (cx + 1) + '" cy="47" r=".7" fill="#fff"/>' +
        '<path d="M' + (cx - 5.1) + ' 48 Q' + cx + ' 43.8 ' + (cx + 5.1) + ' 48" fill="none" stroke="' + clareia(cab, -.15) + '" stroke-width="1.1" stroke-linecap="round"/>' +
        '<path d="M' + (cx - 3.8) + ' 49.8 Q' + cx + ' 51.4 ' + (cx + 3.8) + ' 49.8" fill="none" stroke="' + pele[1] + '" stroke-width=".7" opacity=".6"/>';
      if (t.ci) s += '<path d="M' + (k ? cx + 5 : cx - 5) + ' 47.2 l' + (k ? 1.5 : -1.5) + ' -1.3" stroke="' + clareia(cab, -.3) + '" stroke-width=".8" fill="none" stroke-linecap="round"/>';
    });
    // nariz
    s += '<g transform="translate(50 59) scale(' + nariz + ' 1) translate(-50 -59)"><path d="M50.6 50 C51.4 54 52.4 57 51.2 59 Q50 60.2 48.8 59 C47.8 57.6 48.4 55.8 49 54" fill="none" stroke="' + pele[1] + '" stroke-width=".95" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M52.4 53 Q53.6 57 51.8 59" fill="none" stroke="#000" stroke-width="1.6" opacity=".05"/>' +
      '<ellipse cx="48.6" cy="59.6" rx=".9" ry=".5" fill="' + pele[1] + '" opacity=".75"/><ellipse cx="51.4" cy="59.6" rx=".9" ry=".5" fill="' + pele[1] + '" opacity=".75"/></g>';
    s += cabeloFrente(t.h, F, luz, sombra, id, cabeca.d);
    // boca (por cima da barba)
    var labio = t.ci ? "#b5504a" : "#9b5146";
    var boca = t.s === "serio" ? '<path d="M44.4 65.8 Q50 67.2 55.6 65.8" stroke="#7a3b2e" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M46.5 67.6 Q50 68.8 53.5 67.6" stroke="' + labio + '" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".75"/>'
      : t.s === "largo" ? '<path d="M42.6 64 Q50 72.4 57.4 64 Q50 66.4 42.6 64Z" fill="#fff" stroke="#7a3b2e" stroke-width="1.3" stroke-linejoin="round"/><path d="M44.5 66 Q50 69 55.5 66" stroke="' + labio + '" stroke-width="1.4" fill="none" opacity=".7"/>'
      : '<path d="M43.6 65 Q50 70.4 56.4 65" stroke="#7a3b2e" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M46 67.4 Q50 69.4 54 67.4" stroke="' + labio + '" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".75"/>';
    s += barbaSVG(t.b, F, luz) + boca + oculosSVG(t.o);
    return s + '</g></svg>';
  }
  // nome do arquivo da ilustração: minúsculas, sem acento, hífen no lugar dos espaços
  function slugRetrato(nome) {
    return String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  // usa a ilustração de img/personagens/ quando o arquivo existe; senão, o desenho
  function retratoMarkup(nome, aparelho) {
    var arq = (window.MISTERIO_PERSONAGENS || {})[slugRetrato(nome)];
    if (arq) return '<img src="' + arq + '" alt="Retrato de ' + nome + '" decoding="async">';
    return aparelho ? svgAparelho(nome) : svgBusto(nome);
  }
  function svgAparelho(codigo) {
    return '<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aparelho ' + codigo + '">' +
      '<path d="M50 2 V28" stroke="#6b7480" stroke-width="3"/><path d="M30 5 H70" stroke="#6b7480" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M36 8 C31 18 31 26 38 31 H46 C53 26 53 18 48 8 Z" fill="#cfe9f2" stroke="#6b7480" stroke-width="1.6"/><path d="M34 20 H50" stroke="#8fc3d6" stroke-width="2"/>' +
      '<rect x="20" y="30" width="60" height="62" rx="8" fill="#e6eaed" stroke="#5f6b76" stroke-width="2.4"/>' +
      '<rect x="26" y="36" width="48" height="26" rx="4" fill="#0f2d28" stroke="#33413d" stroke-width="1.5"/>' +
      '<text x="50" y="50" font-size="12" font-weight="700" fill="#7fffd4" text-anchor="middle" font-family="monospace">' + codigo + '</text>' +
      '<text x="50" y="59" font-size="6" fill="#3fbf9a" text-anchor="middle" font-family="monospace">125 ml/h</text>' +
      '<circle cx="33" cy="75" r="5" fill="#c0281c"/><circle cx="47" cy="75" r="5" fill="#2c9b57"/><rect x="58" y="70" width="16" height="10" rx="3" fill="#8a96a1"/>' +
      '<path d="M40 92 C40 102 56 102 60 108" stroke="#9fb7c4" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }
  // filtro de "tinta de carimbo" (bordas irregulares e falhas), criado uma vez por página
  function filtroCarimbo() {
    if (document.getElementById("tintaCarimbo")) return;
    var s = el("div"); s.id = "tintaCarimbo"; s.setAttribute("aria-hidden", "true");
    s.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    s.innerHTML = '<svg width="0" height="0" xmlns="http://www.w3.org/2000/svg"><defs><filter id="tinta-carimbo" x="-5%" y="-10%" width="110%" height="120%">' +
      '<feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" result="d"/>' +
      '<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="9" result="g"/>' +
      '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2.3 2.05" result="m"/>' +
      '<feComposite in="d" in2="m" operator="in"/></filter></defs></svg>';
    document.body.appendChild(s);
  }
  function carimboConcluido() {
    filtroCarimbo();
    var c = el("span", "carimbo-concluido", "Concluído");
    c.setAttribute("aria-label", "Caso concluído");
    return c;
  }
  // foto presa + nome de quem fez (no cartão da home e no painel do caso)
  // todas as pessoas culpadas de um caso (a principal e, se houver, as que agiram junto)
  function equipeDoCaso(cul) { return [cul].concat(cul.extra || []); }
  // retrato para a "foto do caso": uma pessoa, ou duas na mesma foto (a principal na frente)
  function retratoCulpado(cul) {
    var eq = equipeDoCaso(cul);
    if (eq.length < 2) return retratoMarkup(cul.nome, cul.tipo === "aparelho");
    var h = '<div class="duo">';
    eq.slice().reverse().forEach(function (p) { h += '<span class="duo-p">' + retratoMarkup(p.nome, p.tipo === "aparelho") + '</span>'; });
    return h + '</div>';
  }
  function nomesCurtos(cul) { return equipeDoCaso(cul).map(function (p) { return p.nome.split(" ")[0]; }).join(" e "); }
  function nomesCompletos(cul) { return equipeDoCaso(cul).map(function (p) { return p.nome; }).join(" e "); }
  function fichaCulpado(cul, grande) {
    var eq = equipeDoCaso(cul);
    var box = el("div", "ficha-culpado" + (grande ? " grande" : "") + (eq.length > 1 ? " dupla" : ""));
    var fotos = el("div", "ficha-fotos");
    eq.forEach(function (p) {
      var fig = el("figure", "ficha-foto");
      var ret = el("div", "ficha-retrato");
      ret.innerHTML = retratoMarkup(p.nome, p.tipo === "aparelho");
      fig.appendChild(ret);
      if (grande) fig.appendChild(el("figcaption", null, p.nome));
      fotos.appendChild(fig);
    });
    var tx = el("div", "ficha-texto");
    tx.appendChild(el("small", null, eq.length > 1 ? "Os culpados" : (cul.rotulo || "A pessoa culpada")));
    eq.forEach(function (p) {
      if (eq.length > 1) {
        var linha = el("div", "ficha-pessoa");
        linha.appendChild(el("b", null, p.nome));
        linha.appendChild(el("span", null, (p.rotulo ? p.rotulo + " · " : "") + p.papel));
        tx.appendChild(linha);
      } else {
        tx.appendChild(el("b", null, p.nome));
        tx.appendChild(el("span", null, p.papel));
      }
    });
    box.appendChild(fotos); box.appendChild(tx);
    return box;
  }
  // cartão do caso na home
  function marcaEncerrado(card, cs, st) {
    [].forEach.call(card.querySelectorAll(".ficha-culpado,.carimbo-concluido,.carimbo-ok"), function (n) { n.remove(); });
    var feito = casoCompleto(cs, st);
    card.classList.toggle("encerrado", feito);
    card.classList.toggle("resolvido", feito);
    if (!feito) return;
    var cul = CULPADOS[cs.arq];
    if (cul) {
      // o selo "Culpado" vai em cima do retrato de quem é culpado: não ocupa lugar no cartão
      var ficha = fichaCulpado(cul, false);
      [].forEach.call(ficha.querySelectorAll(".ficha-retrato"), function (ret) { ret.appendChild(el("span", "mural-selo", "Culpado")); });
      card.insertBefore(ficha, card.querySelector(".caso-go"));
    }
    card.appendChild(carimboConcluido());   // carimbo grande, na diagonal, atravessando o cartão
  }
  // painel no fim da página do caso
  var jaEncerrado = false;
  function atualizaEncerrado(aoVivo) {
    var cs = casoDaPagina(); if (!cs) return;
    var feito = casoCompleto(cs, estado());
    var atual = document.getElementById("casoEncerrado");
    if (!feito) { if (atual) atual.remove(); jaEncerrado = false; return; }
    if (atual) { jaEncerrado = true; return; }
    var cul = CULPADOS[cs.arq];
    var p = el("section", "enc-painel"); p.id = "casoEncerrado";
    var fim = cs.treino ? "Treino concluído" : "Caso encerrado";
    p.setAttribute("aria-label", fim);
    p.appendChild(carimboConcluido());
    p.appendChild(el("p", "enc-caso", nomeCaso(cs) + " · " + cs.titulo));
    p.appendChild(el("h2", null, jog.nome ? fim + ", " + jog.nome.split(" ")[0] + "!" : fim + "!"));
    if (cul) p.appendChild(fichaCulpado(cul, true));
    var prox = cs.treino ? CASOS[1] : CASOS[CASOS.indexOf(cs) + 1];
    var treinoDepois = CAT[CAT.indexOf(cs) + 1];
    var acoes = el("div", "enc-acoes");
    if (treinoDepois && treinoDepois.treino) { var t = el("a", "btn", "Treino opcional: " + treinoDepois.titulo + " →"); t.href = treinoDepois.arq; acoes.appendChild(t); }
    if (prox) { var a = el("a", "btn", "Próximo: Caso " + prox.n + " · " + prox.titulo + " →"); a.href = prox.arq; acoes.appendChild(a); }
    var home = el("a", "btn ghost", "Todos os casos"); home.href = "index.html"; acoes.appendChild(home);
    p.appendChild(acoes);
    var nav = document.querySelector(".caso-nav");
    var wrap = document.querySelector(".wrap");
    if (nav && nav.parentNode) nav.parentNode.insertBefore(p, nav);
    else if (wrap) wrap.appendChild(p);
    else return;
    if (aoVivo && !jaEncerrado) {
      p.classList.add("novo");
      try { p.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
      toast(cs.treino ? "🏆 Treino concluído!" : "🏆 Caso encerrado!" + (cul ? " Culpado: " + cul.nome : ""));
    }
    jaEncerrado = true;
  }
  function encerradoIniciar() {
    if (!casoDaPagina() || !document.querySelector("section.fase")) return;
    jaEncerrado = false;
    atualizaEncerrado(false);
  }

  // ------------------------------------------------------------------ achados: o que cada fase descobre
  // texto mostrado só depois que a fase é concluída (nada de spoiler antes)
  var MONTADO = "Banco do caso instalado: agora é só investigar.";
  var DESCOBERTAS = {
    fase0: "O laboratório está de pé: o banco do caso foi instalado e já dá para investigar.",
    fase1: "A tabela pessoa tem 655 registros.",
    fase2: "Relatório nº 57, de 10/03/2026: sabotagem na Sala de Vacinas. Às 3h a geladeira foi desligada da tomada e todo o estoque se perdeu. Há duas testemunhas.",
    fase3: "Testemunha 1: Otávio Brandão (id 22074), Rua das Acácias, 4919. Testemunha 2: Lorena Bittencourt (id 22092), Avenida dos Ipês, 103.",
    fase4: "O suspeito é sócio do plano ouro da academia Corpo em Movimento (número começa com 48Z), fugiu num carro com H42W na placa e a Lorena o viu na academia em 09/03/2026.",
    fase5: "Três sócios batem com as pistas: Rogério Valadares (48Z55), Jeremias Paiva (48Z7A) e Lorena Bittencourt (48Z90).",
    fase6: "A placa 0H42W2L aponta para uma pessoa só: Rogério Valadares, sócio 48Z55. Ele desligou a geladeira.",
    fase7: "Rogério Valadares agiu a mando de Vitória Albuquerque, a mandante: a maior renda da cidade (R$ 980.000 por ano).",
    fase8: "Você montou o seu próprio caderno de detetive em SQL, com uma tabela de pistas.",
    fase9: "Os relatórios citam 11 setores diferentes. A renda anual vai de R$ 18.317 a R$ 980.000, com média de cerca de R$ 134.334.",
    fase10: "328 pessoas ganham acima da média. A maior renda é de Vitória Albuquerque. 11 donos de Tesla foram ao Show no Parque.",
    fase11: "Por renda: 82 pessoas na faixa baixa, 445 na média e 128 na alta. Das ocorrências, 536 são graves e 369 leves.",
    fase12: "28 sócios nunca entraram na academia: 8 do plano bronze, 9 do prata e 11 do ouro.",
    fase13: "Você desenhou e criou o seu primeiro banco: pacientes e leitos, com regras (chave primária, NOT NULL, UNIQUE, CHECK) que o próprio banco faz valer.",
    fase14: "Você ligou as tabelas com chaves estrangeiras: internações, medicamentos e prescrições, sem nenhum dado solto.",
    fase15: "Você aprendeu a manter o banco em ordem: alterar tabelas sem perder dados, criar índice e criar uma view.",
    "c2-f0": MONTADO,
    "c2-f1": "Na madrugada de 14/08/2026, entre 02h00 e 03h59, houve 4 alterações de prontuário.",
    "c2-f2": "Na UTI Adulto, as alterações usaram a senha de 2 pessoas: Márcia Barcelos e Renata Figueiredo.",
    "c2-f3": "Só uma delas não estava de plantão: a Márcia Barcelos estava de folga. Alguém usou a senha dela.",
    "c2-f4": "Entre 01h50 e 02h20 entraram na porta da UTI 3 pessoas sem plantão noturno: Hamilton Seabra, Breno Padilha e Dalila Almada.",
    "c2-f5": "Em agosto, o Hamilton Seabra entrou de madrugada, sem plantão, em 5 noites diferentes. Esse é o culpado.",
    "c3-f0": MONTADO,
    "c3-f1": "A morfina 10 mg/mL tem a maior diferença: saíram 254 unidades e só 207 foram prescritas, 47 a mais.",
    "c3-f2": "9 unidades saíram sem receita (urgências). Isso explica só 9 dos 47: ainda sobram 38 sem explicação.",
    "c3-f3": "4 pessoas retiraram mais do que o prescrito e a soma fecha os 38: Edson Carvalhaes (28 a mais), Leila Sandoval (6), Solange Portela (2) e Sônia Zanella (2).",
    "c3-f4": "Sem justificativa: Edson Carvalhaes (28 a mais) e Solange Portela (2). Leila Sandoval (6) e Sônia Zanella (2) justificaram por quebra de ampola.",
    "c3-f5": "Edson Carvalhaes retirou a mais, sem justificativa e de madrugada, em 8 noites diferentes. Esse é o culpado.",
    "c4-f0": MONTADO,
    "c4-f1": "7 pacientes têm a cultura positiva que define o surto, com coletas de 05/08 a 22/08/2026.",
    "c4-f2": "6 dos 7 casos estavam na UTI Adulto no dia da coleta. O sétimo estava na Enfermaria.",
    "c4-f3": "Três aparelhos foram usados pelos 7 casos: as bombas de infusão BI-02 e BI-07 e o ventilador VT-03.",
    "c4-f4": "Taxa de ataque: BI-07 com 87,5% (7 de 8 pacientes), VT-03 com 70% (7 de 10) e BI-02 com 24,1% (7 de 29).",
    "c4-f5": "Só o BI-07 não tem nenhuma limpeza registrada em agosto. Esse é o culpado: a bomba de infusão da UTI Adulto.",
    "c5-f0": MONTADO,
    "c5-f1": "27 cobranças estão acima do valor de tabela, com R$ 9.897,86 a mais no total.",
    "c5-f2": "31 cobranças são cópias: o mesmo procedimento foi cobrado mais de uma vez para o mesmo atendimento.",
    "c5-f3": "30 cobranças não têm procedimento realizado: R$ 25.462,00 cobrados por serviços que não aconteceram.",
    "c5-f4": "O lote L-0830-C foge do padrão: 34 erros, enquanto os outros lotes têm 4 ou menos.",
    "c5-f5": "O lote L-0830-C foi assinado por Bianca Furtado: 100 linhas e R$ 88.045,91 cobrados.",
    "c6-f0": MONTADO,
    "c6-f1": "4 geladeiras saíram da faixa de 2 a 8 °C. A G-03, do Banco de Sangue, foi a pior: 10 leituras fora.",
    "c6-f2": "4 excursões de temperatura começaram em setembro, uma em cada geladeira com problema. A da G-03 começou em 14/09, às 02h30.",
    "c6-f3": "A excursão mais longa foi a da G-03, de 02h30 às 07h00 de 14/09/2026: 4h30 fora da faixa.",
    "c6-f4": "Antes da excursão, duas pessoas abriram a porta da G-03: Dulce Galdino (02h10) e Valéria Montenegro (02h21).",
    "c6-f5": "Valéria Montenegro abriu a G-03 às 02h21 e a porta só foi fechada às 06h48, por outra pessoa. Esse é o culpado.",
    "c7-f0": MONTADO,
    "c7-f1": "36 cadastros têm espaço sobrando no nome. São 225 nomes do jeito que estão gravados e 216 depois de arrumar.",
    "c7-f2": "10 CPFs têm cadastro em duplicidade. Já 3 nomes repetidos têm CPFs diferentes: são homônimos, não cópias.",
    "c7-f3": "Saúde Vida lidera os convênios (91 cadastros), seguida de Particular (89, contando os vazios) e MedPlus (49). Em outubro, o Cláudio Menezes fez 13 cadastros, o maior número.",
    "c7-f4": "Por convênio, a Saúde Vida somou R$ 73.630,00. Por especialidade, a Ressonância rendeu mais: R$ 41.250,00 em 33 consultas.",
    "c7-f5": "Cláudio Menezes criou 7 cadastros em dobro e lançou 7 consultas neles: R$ 5.370,00. Esse é o responsável.",
    "c8-f0": MONTADO,
    "c8-f1": "Em setembro de 2026, 21 pessoas diferentes fizeram hora extra.",
    "c8-f2": "Em setembro, 18 plantões caíram num domingo e 49 começaram às 19h.",
    "c8-f3": "Quem mais fez hora extra em setembro: Leonel Guedes, 120 h (R$ 6.156,00), seguido de Irene Castilho, 114 h (R$ 8.310,60).",
    "c8-f4": "No ranking de setembro, Leonel Guedes é o 1º, com 20,1% das horas do mês, e Irene Castilho a 2ª, com 19,1%.",
    "c8-f5": "Leonel Guedes lançou 14 plantões em setembro sem nenhuma entrada na catraca: 112 horas sem presença. Esse é o culpado.",
    "c9-f0": MONTADO,
    "c9-f1": "O prontuário da Lia Moraes teve 78 acessos de 13 pessoas na semana, com 4 impressões ou exportações.",
    "c9-f2": "6 pessoas abriram o prontuário sem ser da equipe de cuidado. Quem mais abriu foi a Daniela Couto, da Recepção: 3 acessos.",
    "c9-f3": "3 acessos foram feitos fora do turno. O mais grave: a Jaqueline Prado, do turno da manhã, exportou o prontuário às 23h47 de 23/10.",
    "c9-f4": "O login jaqueline.prado teve 20 senhas erradas e 1 acerto na estação FAT-PC07, na noite de 23/10: força bruta.",
    "c9-f5": "Antes da rajada de senhas, quem entrou no FAT-PC07 foi o Sérgio Paixão (login às 19h05 de 23/10). Esse é o culpado.",
    "c10-f0": MONTADO,
    "c10-f1": "59 requisições suspeitas de injeção de SQL: 50 vieram do IP 198.51.100.23 e 9 do IP 203.0.113.59.",
    "c10-f2": "O IP 198.51.100.23 começou a testar em 08/10. O 203.0.113.59 atacou em 11/10 e conseguiu 3 respostas com sucesso.",
    "c10-f3": "O ataque escalou com UNION SELECT até vazar dados: 112 pacientes diferentes tiveram resultados expostos.",
    "c10-f4": "O papel portal_web tem 12 privilégios, inclusive de escrita, e as 3 políticas de RLS usam a condição true: nada filtra.",
    "c10-f5": "O ataque partiu do IP 203.0.113.59, que antes tinha um login confirmado: renan.duarte (Renan Duarte). Esse é o culpado.",
    "c11-f0": MONTADO,
    "c11-f1": "A espera é a diferença entre chegada e início do atendimento. Dona Ivone, laranja (alvo de 10 minutos), esperou 01:55:00, ou 115 minutos. No mês, 120 atendimentos estouraram o alvo, 38 deles laranja.",
    "c11-f2": "Pela média, a tarde seria a pior (49,1 min), mas a mediana dela (24,0) é normal: os extremos vêm de um dia só, o acidente com um ônibus em 12/09. Sem esse dia, a tarde cai para 21,7 e a equipe do Dr. Celso Drumond sai da suspeita. A noite tem o maior P90 (109,8 min) e não muda.",
    "c11-f3": "Separando as 30 noites com NTILE(4), as 8 piores pelo P90 são 03, 07, 09, 13, 17, 19, 23 e 27/09. Fabíola Silveira (supervisora) e Eliseu Quintana (triagem) estavam de plantão nas 8.",
    "c11-f4": "Na grade de 24 horas, os estouros se concentram às 23h (27), com zeros em várias horas. Na noite da denúncia, a fila de graves chegou a 4 pessoas às 02h, com Dona Ivone nela.",
    "c11-f5": "Fabíola Silveira subiu 20 pacientes para laranja, só 4 com justificativa. Os 20 tiveram alta e 18 passaram na frente de alguém laranja que já esperava, entre eles o rapaz do tornozelo. As 11 subidas de Eliseu tinham motivo clínico e nenhuma furou a fila. Essa é a culpada.",
    "c12-f0": MONTADO,
    "c12-f1": "A árvore do lote IGH-2609-114 tem 16 guias em 5 níveis: a entrada na Farmácia Central, 3 guias para as satélites, 10 entregas aos setores e uma devolução que volta para a satélite.",
    "c12-f2": "Com o caminho de cada guia montado, o IGH-2609-114 lidera a perda em trânsito, com 3 frascos. Mas a auditoria fala em 13: faltam 10 que não aparecem como diferença.",
    "c12-f3": "12 locais são alcançáveis pelas rotas autorizadas. Duas guias (1097 e 1198) mandaram 6 + 4 frascos, tarde da noite, para ONC-ANX, um setor desativado e fora do mapa: são os 10 que faltavam.",
    "c12-f4": "Dois elos quebrados. A guia 1040 (12 → 11) tem termo de baixa por frasco quebrado. A guia 1065 (10 → 8) não tem termo, e quem assinou foi Hélio Loureiro, da UTI, cobrindo na Quimioterapia. 1 + 2 + 10 = 13.",
    "c12-f5": "Hélio não responde a ninguém da farmácia, e Joana só tem perda justificada. Wagner Veloso, auxiliar da SAT-ONC, enviou as 3 guias-problema (12 frascos) e ele mesmo assinou o recebimento no setor desativado. Esse é o culpado.",
    "c13-f0": MONTADO,
    "c13-f1": "Os eventos das bombas vêm em JSON e se abrem com -> e ->>. Na madrugada de 12/10, a bomba BMB-14 do leito 14 registrou um alarme à 1h12, o login do crachá C-2207 às 2h29, um alarme às 2h31, uma sincronização às 2h41 e a programação das 2h43, também no crachá C-2207.",
    "c13-f2": "Comparando a dose do JSON com a prescrição, três bolus de heparina parecem altos, mas estavam prescritos. Ligando também pelo modo, sobra uma linha: noradrenalina 2.4 contra 0.3 prescrito, às 2h43, no crachá de Simone Leitão.",
    "c13-f3": "Abrindo as listas de alarmes: a oclusão da 1h12 foi mecânica (equipo dobrado), resolvida pelo técnico Wesley. Às 2h31 a bomba RECUSOU a dose de 2.4 (LIMITE_RIGIDO, limite 0.5). Doze minutos depois, a mesma dose passou.",
    "c13-f4": "Dos 5 eventos de biblioteca, só um não tem a chave usuario: às 2h38 de 12/10, na sessão S-5763, o limite rígido da noradrenalina subiu de 0.5 para 3. A bomba sincronizou às 2h41.",
    "c13-f5": "Simone Leitão tinha saído à 1h04: alguém usou o crachá que ela esqueceu. A sessão S-5763 da central foi aberta às 2h35 com o crachá de Heloísa Brandini, que estava de plantão. Ela subiu o limite e programou a dose com o crachá da colega. Essa é a culpada.",
    "c14-f0": MONTADO,
    "c14-f1": "22 contas de só 7 pacientes têm desconto acima dos 10% da política: R$ 43.394,25. E um UPDATE de teste na conta 346 mostrou o desconto subindo sozinho.",
    "c14-f2": "A auditoria mostra exatamente 40% em 49 alterações, feitas por quatro logins diferentes, nenhum deles quem autoriza desconto. Começou em 19/09 às 02:00. É algo dentro do banco.",
    "c14-f3": "Na tabela ctp_conta há um segundo gatilho, BEFORE INSERT OR UPDATE, disfarçado de 'ajuste de centavos': ele força 40% de desconto para os pacientes 12, 27, 33, 48, 59, 71 e 84.",
    "c14-f4": "O gatilho foi criado em 18/09 às 23:41–23:43, sem chamado, pela conta compartilhada admin_sistemas, a partir da máquina NB-TERC-14. A auditoria da Regina tem chamado e foi criada em horário comercial.",
    "c14-f5": "Três pacientes da lista são da família Pacheco, e quem estava na NB-TERC-14, por VPN, das 22:58 às 00:21 era Douglas Pacheco. Esse é o culpado.",
    "c15-f0": MONTADO,
    "c15-f1": "Quase metade das receitas (204 de 483) tem o CRM fora do formato oficial. A Lucimara lidera (84), porque digita todo CRM como 126845-SP. Mas formato errado é bagunça, não fraude.",
    "c15-f2": "Limpando o CRM com regexp_replace, todas as grafias da Dra. Iolanda (10 jeitos!) levam a uma médica ativa. O alarme: 7 receitas com o CRM de Anselmo Vilaça, aposentado desde 2024. E dois números não acham médico: 093417 e 45871.",
    "c15-f3": "Os grupos do regexp_match devolvem o P que o regexp_replace tinha apagado: 45871-P é o Dr. Josué Prates, residente com registro provisório, tudo legítimo. Sobram 4 receitas com o CRM 093417, que não existe. São 11 receitas com CRM inválido.",
    "c15-f4": "A palavra 'comprimdo' (sem o i) aparece em 13 receitas. Em 11 delas o carimbo é o mesmo, copiado do médico aposentado, com dois espaços em volta dos pontinhos. As outras 2 são erros isolados do Ivo, com médicos ativos.",
    "c15-f5": "Só um atendente tem os três sinais juntos (CRM inválido, 'comprimdo' e carimbo de espaço duplo) nas mesmas 11 receitas: Gervásio Toledo, do turno da noite. Esse é o culpado.",
    "c16-f0": MONTADO,
    "c16-f1": "O relatório fecha: R$ 4.327.850,00 no trimestre, igual ao estoque. Mas dois subtotais saltam: a Ortopedia triplica em agosto, e a Cirurgia Vascular mais que dobra em agosto e setembro.",
    "c16-f2": "O salto da Ortopedia está explicado: 77 cirurgias em agosto, 40 delas do mutirão de joelho. Já a Vascular operou menos (13 e 15 cirurgias contra 16 em julho) e gastou o dobro.",
    "c16-f3": "A Vascular pagou 20 stents coronários (R$ 178.000,00), um material que só a Hemodinâmica usa. São 14 lançamentos de cirurgias da Hemodinâmica cobrados no centro de custo da Vascular.",
    "c16-f4": "Os dias sem lançamento (11 a 14/08) foram a queda do sistema. Os lançamentos em centro de custo trocado formam duas ilhas: 15 a 17/07, explicada pela reforma da sala da Vascular, e 14 dias seguidos, de 24/08 a 06/09, sem ocorrência nenhuma.",
    "c16-f5": "Raquel Antunes coordenou 14 noites seguidas, de 24/08 a 06/09, 9 delas por troca. No plantão dela foram lançados 29 stents coronários em cateterismos diagnósticos, que não usam stent: R$ 258.100,00. Essa é a culpada."
  };
  // popup só para ver (sem editar) as imagens de uma fase
  function ctrlSomenteLeitura(lista, titulo) {
    return {
      somenteLeitura: true,
      n: function () { return lista.length; },
      src: function (i) { return lista[i]; },
      legenda: function (i) { return (lista.length > 1 ? "Evidência " + (i + 1) + " de " + lista.length + " · " : "Evidência · ") + titulo; },
      aoFechar: function () {}
    };
  }
  // consultas de solução e o que devolvem (js/achados-dados.json, gerado por scripts/gerar-achados.mjs)
  var achadosDados = null, achadosPromessa = null;
  function carregaAchadosDados() {
    if (achadosDados) return Promise.resolve(achadosDados);
    if (!achadosPromessa) {
      achadosPromessa = fetch(new URL("js/achados-dados.json", document.baseURI).href, { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
        .then(function (d) { achadosDados = d; return d; })
        .catch(function () { achadosPromessa = null; return null; });
    }
    return achadosPromessa;
  }
  // detalhes de um achado: a consulta, o que ela devolveu, a anotação inteira e as imagens
  function preencheDetalhes(det, fa, pegaFotos) {
    var s1 = el("section", "ach-sec");
    s1.appendChild(el("h4", null, "Como você descobriu"));
    var lugar = el("div", "ach-consultas");
    lugar.appendChild(el("p", "ach-vazio", "Carregando as consultas…"));
    s1.appendChild(lugar);
    det.appendChild(s1);
    carregaAchadosDados().then(function (d) {
      lugar.textContent = "";
      if (!d) { lugar.appendChild(el("p", "ach-vazio", "Não consegui carregar as consultas agora. Tente de novo daqui a pouco.")); return; }
      var lista = d[fa.id];
      if (!lista || !lista.length) {
        lugar.appendChild(el("p", "ach-vazio", "Esta fase não tem consulta de solução: o que vale é o passo a passo que você fez nela."));
        return;
      }
      lista.forEach(function (q, i) {
        var bloco = el("div", "ach-consulta");
        if (lista.length > 1) bloco.appendChild(el("div", "ach-rotulo", "Consulta " + (i + 1) + " de " + lista.length));
        bloco.appendChild(el("pre", "ach-sql", q.sql));
        if (q.colunas) {
          var res = el("div", "ach-res");
          var tab = el("table", "ach-tab");
          var cab = el("tr");
          q.colunas.forEach(function (nome) { cab.appendChild(el("th", null, nome)); });
          tab.appendChild(cab);
          q.linhas.forEach(function (l) {
            var tr = el("tr");
            l.forEach(function (v) { tr.appendChild(el("td", v === null ? "nulo" : null, v === null ? "NULL" : v)); });
            tab.appendChild(tr);
          });
          res.appendChild(tab);
          bloco.appendChild(res);
          var resumo = "Devolveu " + q.total + (q.total === 1 ? " linha" : " linhas");
          if (q.total > q.linhas.length) resumo += " (mostrando as " + q.linhas.length + " primeiras)";
          if (q.maisColunas) resumo += " · mais " + q.maisColunas + " coluna(s) não mostrada(s)";
          bloco.appendChild(el("div", "ach-total", resumo));
        } else if (q.erro) {
          bloco.appendChild(el("div", "ach-total", "Esta consulta depende de algo que você cria durante a fase."));
        } else {
          bloco.appendChild(el("div", "ach-total", "Comando executado (não devolve linhas)."));
        }
        lugar.appendChild(bloco);
      });
    });
    var nota = (notas[fa.id] || "").trim();
    if (nota) {
      var s2 = el("section", "ach-sec");
      s2.appendChild(el("h4", null, "Sua anotação"));
      s2.appendChild(el("p", "ach-nota-cheia", nota));
      det.appendChild(s2);
    }
    var imgs = pegaFotos();
    if (imgs.length) {
      var s3 = el("section", "ach-sec");
      s3.appendChild(el("h4", null, "Suas imagens (" + imgs.length + ")"));
      var grade = el("div", "ach-grandes");
      imgs.forEach(function (src, k) {
        var fig = el("button", "ach-grande"); fig.type = "button";
        fig.title = "Clique para ver em detalhe";
        var im = el("img"); im.src = src; im.alt = "Imagem " + (k + 1) + " da anotação";
        fig.appendChild(im);
        fig.addEventListener("click", function () { abreVisor(ctrlSomenteLeitura(imgs, fa.titulo || fa.nome), k); });
        grade.appendChild(fig);
      });
      s3.appendChild(grade);
      det.appendChild(s3);
    }
  }
  // aba "Achados": uma linha vermelha por caso, com um cartão para cada fase
  function paginaAchados(r) {
    var c = corpo;
    var total = 0, achados = 0;
    CAT.forEach(function (cs) { cs.fases.forEach(function (fa) { total++; if (r.st[fa.id]) achados++; }); });
    c.appendChild(el("p", "cad-nota", "O que você já encontrou em cada caso. Cada achado aparece quando a fase é concluída. " + achados + " de " + total + " fases."));
    var algumAberto = false, primeiro = null;
    CAT.forEach(function (cs) {
      var feitas = cs.fases.filter(function (fa) { return r.st[fa.id]; }).length;
      var completo = casoCompleto(cs, r.st);
      var d = el("details", "cad-caso ach-caso" + (completo ? " completo" : ""));
      if (feitas > 0 && !completo) { d.open = true; algumAberto = true; }
      if (!primeiro) primeiro = d;
      d.appendChild(el("summary", null, nomeCaso(cs) + " · " + cs.titulo + "  (" + feitas + "/" + cs.fases.length + ")" + (completo ? "  ✓" : "")));
      var linha = el("ol", "ach-linha");
      cs.fases.forEach(function (fa, i) {
        var feita = !!r.st[fa.id], lib = liberada(cs.fases, i, r.st);
        var li = el("li", "ach-card " + (feita ? "feito" : lib ? "atual" : "trava"));
        li.appendChild(el("span", "ach-pino"));
        var cab = el("div", "ach-t");
        cab.appendChild(el("b", null, fa.num + " · " + (fa.titulo || fa.nome)));
        if (fa.sub) cab.appendChild(el("small", null, fa.sub));
        li.appendChild(cab);
        if (feita) li.appendChild(el("p", "ach-achado", DESCOBERTAS[fa.id] || "Fase concluída."));
        else li.appendChild(el("p", "ach-achado vazio", lib ? "? Ainda por descobrir" : "🔒 Conclua a fase anterior"));
        var nota = (notas[fa.id] || "").trim();
        if (nota) li.appendChild(el("p", "ach-nota", "📓 " + (nota.length > 200 ? nota.slice(0, 200) + "…" : nota)));
        var fotos = el("div", "ach-fotos"); fotos.hidden = true;
        li.appendChild(fotos);
        var listaFotos = [];
        idbGet(fa.id).then(function (v) {
          listaFotos = listaImagens(v);
          if (!listaFotos.length) return;
          fotos.hidden = false;
          listaFotos.slice(0, 4).forEach(function (src, k) {
            var im = el("img", "ach-mini"); im.src = src; im.alt = "Imagem " + (k + 1) + " da anotação";
            im.tabIndex = 0; im.setAttribute("role", "button"); im.title = "Clique para ver em detalhe";
            var abre = function () { abreVisor(ctrlSomenteLeitura(listaFotos, fa.titulo || fa.nome), k); };
            im.addEventListener("click", abre);
            im.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abre(); } });
            fotos.appendChild(im);
          });
          if (listaFotos.length > 4) fotos.appendChild(el("span", "ach-mais", "+" + (listaFotos.length - 4)));
        });
        if (feita) {
          var btn = el("button", "ach-detalhes-btn", "Ver detalhes ▾"); btn.type = "button";
          btn.setAttribute("aria-expanded", "false");
          var det = el("div", "ach-det"); det.hidden = true;
          btn.addEventListener("click", function () {
            var abre = det.hidden;
            det.hidden = !abre;
            btn.textContent = abre ? "Ocultar detalhes ▴" : "Ver detalhes ▾";
            btn.setAttribute("aria-expanded", abre ? "true" : "false");
            if (abre && !det.getAttribute("data-pronto")) {
              det.setAttribute("data-pronto", "1");
              preencheDetalhes(det, fa, function () { return listaFotos; });
            }
          });
          li.appendChild(btn);
          li.appendChild(det);
        }
        linha.appendChild(li);
      });
      var cul = CULPADOS[cs.arq];
      if (completo) {
        var fim = el("li", "ach-fim");
        fim.appendChild(carimboConcluido());
        if (cul) fim.appendChild(fichaCulpado(cul, false));
        linha.appendChild(fim);
      }
      d.appendChild(linha);
      c.appendChild(d);
    });
    if (!algumAberto && primeiro) primeiro.open = true;
  }

  // ------------------------------------------------------------------ mural do caso (laterais de telas grandes)
  // quem aparece em cada fase: [nome, papel, marcas]  (marcas: "c" = culpado, "a" = aparelho)
  var MURAL_PESSOAS = {
    fase3: [["Otávio Brandão", "Testemunha 1"], ["Lorena Bittencourt", "Testemunha 2"]],
    fase5: [["Rogério Valadares", "Suspeito"], ["Jeremias Paiva", "Suspeito"]],
    fase6: [["Rogério Valadares", "Desligou a geladeira", "c"]],
    fase7: [["Vitória Albuquerque", "A mandante", "c"]],
    "c2-f2": [["Márcia Barcelos", "Senha usada"], ["Renata Figueiredo", "Senha usada"]],
    "c2-f3": [["Márcia Barcelos", "Estava de folga"]],
    "c2-f4": [["Hamilton Seabra", "Entrou na porta"], ["Breno Padilha", "Entrou na porta"], ["Dalila Almada", "Entrou na porta"]],
    "c2-f5": [["Hamilton Seabra", "O culpado", "c"]],
    "c3-f2": [["Gilson Amorim", "Saída sem receita"]],
    "c3-f3": [["Edson Carvalhaes", "28 a mais"], ["Leila Sandoval", "6 a mais"], ["Solange Portela", "2 a mais"], ["Sônia Zanella", "2 a mais"]],
    "c3-f4": [["Leila Sandoval", "Justificou"], ["Sônia Zanella", "Justificou"], ["Edson Carvalhaes", "Sem justificativa"], ["Solange Portela", "Sem justificativa"]],
    "c3-f5": [["Edson Carvalhaes", "O culpado", "c"]],
    "c4-f3": [["BI-02", "Bomba de infusão", "a"], ["BI-07", "Bomba de infusão", "a"], ["VT-03", "Ventilador", "a"]],
    "c4-f5": [["BI-07", "Sem limpeza em agosto", "ac"]],
    "c5-f5": [["Bianca Furtado", "Assinou o lote L-0830-C", "c"]],
    "c6-f4": [["Dulce Galdino", "Abriu a G-03"], ["Valéria Montenegro", "Abriu a G-03"]],
    "c6-f5": [["Valéria Montenegro", "O culpado", "c"]],
    "c7-f3": [["Cláudio Menezes", "13 cadastros"], ["Rosângela Freitas", "6 cadastros"], ["Hugo Amaral", "5 cadastros"]],
    "c7-f5": [["Cláudio Menezes", "O responsável", "c"]],
    "c8-f3": [["Leonel Guedes", "120 h extras"], ["Irene Castilho", "114 h extras"], ["Marta Guimarães", "44,5 h extras"]],
    "c8-f5": [["Leonel Guedes", "O culpado", "c"]],
    "c9-f1": [["Lia Moraes", "Prontuário espiado"], ["Beatriz Falcão", "Imprimiu"], ["Jaqueline Prado", "Imprimiu"]],
    "c9-f2": [["Daniela Couto", "Fora da equipe"], ["Caio Linhares", "Fora da equipe"], ["Fábio Rezende", "Fora da equipe"]],
    "c9-f3": [["Jaqueline Prado", "Acesso fora do turno"]],
    "c9-f4": [["Tereza Botelho", "6 senhas erradas"]],
    "c9-f5": [["Sérgio Paixão", "O culpado", "c"]],
    "c10-f5": [["Renan Duarte", "O culpado", "c"]],
    "c11-f2": [["Celso Drumond", "Chefe da tarde"]],
    "c11-f3": [["Eliseu Quintana", "Triagem · noite"], ["Fabíola Silveira", "Supervisora · noite"]],
    "c11-f4": [["Ivone Siqueira", "Paciente da denúncia"]],
    "c11-f5": [["Bruno Saldanha", "Furou a fila"], ["Eliseu Quintana", "Reclassificou com motivo"], ["Fabíola Silveira", "A culpada", "c"]],
    "c12-f4": [["Hélio Loureiro", "Assinou o elo quebrado"], ["Lúcia Nogueira", "Recebeu com termo de baixa"]],
    "c12-f5": [["Sueli Arantes", "Responsável pela SAT-ONC"], ["Joana Leal", "Perda com termo de baixa"], ["Wagner Veloso", "O culpado", "c"]],
    "c13-f2": [["Simone Leitão", "Crachá usado na dose"], ["Amélia Chagas", "Bolus prescrito"]],
    "c13-f3": [["Wesley Coutinho", "Resolveu a oclusão"], ["Patrícia Galvão", "Erro barrado"]],
    "c13-f5": [["Rosana Damasceno", "Baixou a dose"], ["Heloísa Brandini", "A culpada", "c"]],
    "c14-f2": [["Sílvia Miranda", "Coordena o faturamento"], ["Jussara Moura", "Autoriza descontos"]],
    "c14-f4": [["Regina Varela", "DBA oficial"], ["Vinícius Bastos", "Analista terceirizado"]],
    "c14-f5": [["Marlene Pacheco", "Paciente da lista"], ["Douglas Pacheco", "O culpado", "c"]],
    "c15-f1": [["Lucimara Bonfim", "CRM no formato errado"]],
    "c15-f2": [["Iolanda Feitosa", "CRM de 10 jeitos"], ["Anselmo Vilaça", "Médico aposentado"]],
    "c15-f3": [["Josué Prates", "Residente · CRM provisório"]],
    "c15-f4": [["Ivo Sarandi", "2 erros de digitação"]],
    "c15-f5": [["Gervásio Toledo", "O culpado", "c"]],
    "c16-f2": [["Henrique Soutello", "Mutirão de joelho"]],
    "c16-f4": [["Jonas Pimentel", "Queda do sistema"], ["Humberto Campelo", "Reforma da sala 3"]],
    "c16-f5": [["Humberto Campelo", "3 plantões seguidos"], ["Denise Arruda", "Trocou plantões"], ["Raquel Antunes", "A culpada", "c"]]
  };
  var MURAL_LARGURA_MIN = 1500;      // abaixo disso a página não tem sobra nas laterais
  var mural = null, muralEsq = null, muralDir = null, muralTimer = null;
  function muralIniciar() {
    if (!casoDaPagina() || !document.querySelector("section.fase")) return;
    mural = el("div", "mural"); mural.setAttribute("aria-hidden", "true");
    muralEsq = el("div", "mural-lado esq"); muralDir = el("div", "mural-lado dir");
    mural.appendChild(muralEsq); mural.appendChild(muralDir);
    document.body.appendChild(mural);
    window.addEventListener("resize", agendaMural);
    atualizaMural();
  }
  var muralModoHome = false;
  function agendaMural(ms) {
    clearTimeout(muralTimer);
    muralTimer = setTimeout(function () { if (muralModoHome) atualizaMuralHome(); else atualizaMural(); }, typeof ms === "number" ? ms : 140);
  }
  // tela principal: galeria dos culpados (quem já foi pego e quem ainda é um "?") e o andamento em post-its
  function svgSilhueta() {
    return '<svg viewBox="3 6 94 94" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Culpado ainda desconhecido">' +
      '<path d="M6 112 C8 88 28 80 50 80 C72 80 92 88 94 112 Z" fill="#69767e"/>' +
      '<rect x="43" y="62" width="14" height="24" rx="6" fill="#7b8890"/>' +
      '<ellipse cx="50" cy="48" rx="19.5" ry="23" fill="#7b8890"/>' +
      '<text x="50" y="60" font-size="34" font-weight="800" fill="#2b3a41" text-anchor="middle" font-family="Arial,sans-serif">?</text></svg>';
  }
  function muralHomeIniciar() {
    if (mural || !document.querySelector(".casos")) return;
    muralModoHome = true;
    mural = el("div", "mural"); mural.setAttribute("aria-hidden", "true");
    muralEsq = el("div", "mural-lado esq"); muralDir = el("div", "mural-lado dir");
    mural.appendChild(muralEsq); mural.appendChild(muralDir);
    document.body.appendChild(mural);
    window.addEventListener("resize", function () { agendaMural(); });
    window.addEventListener("load", function () { agendaMural(0); });
    atualizaMuralHome();
  }
  function casosPorNumero() { return CASOS.slice().sort(function (a, b) { return a.n - b.n; }); }
  // tela pequena: uma fita de fotos com rolagem lateral, logo abaixo do cartão amarelo
  function galeriaCompacta() {
    var ant = document.getElementById("galeriaCulpados");
    if (ant) ant.remove();
    var boas = document.getElementById("cadBoasVindas");
    if (!boas || window.innerWidth >= MURAL_LARGURA_MIN) return;
    var r = resumo();
    var pinos = ["vermelho", "azul", "amarelo", "verde"];
    var sec = el("section", "galeria-culpados"); sec.id = "galeriaCulpados";
    sec.setAttribute("aria-label", "Galeria dos culpados");
    sec.appendChild(el("h3", null, "Galeria dos culpados"));
    var fita = el("div", "galeria-fita");
    var giros = [-3.6, 2.8, -2.4, 3.8, -3, 2.4, -3.8, 3.2, -2.6, 3.6];
    // a galeria segue o número do caso (1 a 16), mesmo que a ordem de jogo seja outra
    casosPorNumero().forEach(function (cs, i) {
      var cul = CULPADOS[cs.arq];
      var feito = casoCompleto(cs, r.st);
      var fig = el("figure", "galeria-foto");
      fig.style.setProperty("--giro", giros[i % giros.length] + "deg");
      fig.appendChild(el("span", "pino pino-" + pinos[i % 4]));
      fig.appendChild(el("span", "mural-num", String(cs.n)));
      var ret = el("div", "ficha-retrato");
      ret.innerHTML = feito && cul ? retratoCulpado(cul) : svgSilhueta();
      if (feito && cul) ret.appendChild(el("span", "mural-selo", "Culpado"));
      fig.appendChild(ret);
      var nome = feito && cul ? nomesCompletos(cul) : "?";
      var leg = el("figcaption");
      var b = el("b", null, feito && cul ? nomesCurtos(cul) : "?"); b.title = nome;
      leg.appendChild(b);
      fig.appendChild(leg);
      fita.appendChild(fig);
    });
    sec.appendChild(fita);
    boas.parentNode.insertBefore(sec, boas.nextSibling);
  }
  function atualizaMuralHome() {
    if (!mural || !muralModoHome) return;
    galeriaCompacta();
    muralEsq.textContent = ""; muralDir.textContent = "";
    muralEsq.classList.remove("grade", "duplo"); muralDir.classList.remove("grade", "duplo");
    muralEsq.classList.add("home"); muralDir.classList.add("home");
    if (window.innerWidth < MURAL_LARGURA_MIN) { muralEsq.hidden = muralDir.hidden = true; return; }
    var r = resumo();
    var pinos = ["vermelho", "azul", "amarelo", "verde"];
    var quadro = document.querySelector(".quadro-home") || document.querySelector(".wrap");
    var rq = quadro ? quadro.getBoundingClientRect() : { left: 0, right: window.innerWidth };
    var sobraEsq = rq.left - 28;
    // as fotos ficam na esquerda, em duas colunas (ou três, quando assim saem maiores); o tamanho acompanha a
    // altura e a largura da tela, e a disposição que deixa as fotos maiores é a escolhida
    var altura = window.innerHeight - 120;
    var AW = Math.min(sobraEsq, 440);          // largura que as colunas podem ocupar
    var medidas = function (ncol) {
      var lin = Math.ceil(CASOS.length / ncol);
      // com muitas fotos por coluna, o vão entre elas diminui para as fotos não ficarem minúsculas
      var espaco = lin > 5 ? 6 : 15;
      var fg = ncol > 2 ? 22 : 30;             // espaço para o "tortinho" de cada lado
      var wAlt = (altura - espaco * (lin - 1) - 42 * lin) / (0.94 * lin);
      var wLar = (AW - 16 * (ncol - 1)) / ncol - 2 * fg;
      return { ncol: ncol, linhas: lin, vao: espaco, folga: fg, w: Math.floor(Math.max(56, Math.min(140, wAlt, wLar))) };
    };
    var m2 = medidas(2), m3 = medidas(3);
    var med = CASOS.length > 10 && m3.w > m2.w ? m3 : m2;
    var linhas = med.linhas, vao = med.vao, w = med.w;
    // arrumado: fotos alinhadas no centro da coluna, só um leve tortinho alternado, em ordem de 1 a 16
    var giros = [-1.6, 1.3, -1.1, 1.5, -1.3, 1.1];
    muralEsq.style.setProperty("--foto-w", w + "px");
    var cols = [];
    for (var ci = 0; ci < med.ncol; ci++) {
      var col = el("div", "mural-col fotos");
      col.style.padding = "0 6px";
      col.style.gap = vao + "px";
      cols.push(col);
    }
    casosPorNumero().forEach(function (cs, i) {
      var cul = CULPADOS[cs.arq];
      var feito = casoCompleto(cs, r.st);
      var fig = el("figure", "mural-item mural-foto mini");
      fig.style.setProperty("--giro", giros[i % giros.length] + "deg");
      fig.style.setProperty("--dx", "0px");
      fig.appendChild(el("span", "pino pino-" + pinos[i % 4]));
      fig.appendChild(el("span", "mural-num", String(cs.n)));
      var ret = el("div", "ficha-retrato");
      ret.innerHTML = feito && cul ? retratoCulpado(cul) : svgSilhueta();
      // o carimbo fica dentro da foto, na parte de baixo do retrato (não cobre o nome)
      if (feito && cul) ret.appendChild(el("span", "mural-selo", "Culpado"));
      fig.appendChild(ret);
      var leg = el("figcaption");
      var nomeCompleto = feito && cul ? nomesCompletos(cul) : "?";
      // o nome inteiro quando cabe numa linha; senão, só o primeiro nome (dupla: os dois primeiros nomes)
      var cabem = Math.floor((w - 10) / 6.6);
      var nb = el("b", null, nomeCompleto.length <= cabem ? nomeCompleto : (feito && cul ? nomesCurtos(cul) : "?"));
      nb.title = nomeCompleto;
      leg.appendChild(nb);
      leg.appendChild(el("small", null, feito && cul ? "Caso " + cs.n + " · " + cs.titulo : "Culpado do Caso " + cs.n));
      fig.appendChild(leg);
      cols[Math.min(Math.floor(i / linhas), cols.length - 1)].appendChild(fig);
    });
    cols.forEach(function (col) { muralEsq.appendChild(col); });
    // à direita: o andamento, em post-its
    var colNotas = el("div", "mural-col notas");
    var cores = ["#fff1a0", "#ffd9e2", "#d6f0c5", "#cfe6fb"];
    var encerrados = CASOS.filter(function (cs) { return casoCompleto(cs, r.st); });
    var prox = proximaFase(r.st);
    var notas = [
      { t: "Nível " + (r.nivel + 1) + " · " + NIVEIS[r.nivel].nome, x: r.feitas + " de " + r.total + " fases concluídas." },
      { t: "Casos encerrados", x: encerrados.length + " de " + CASOS.length + (encerrados.length ? ". O último foi o Caso " + encerrados[encerrados.length - 1].n + "." : ". Falta pegar o primeiro culpado!") },
      prox ? { t: "Próxima pista", x: nomeCaso(prox.caso) + " · " + (prox.fase.titulo || prox.fase.nome) }
           : { t: "Parabéns, detetive!", x: "Você encerrou todos os casos." }
    ];
    if (r.qtdNotas) notas.push({ t: "Suas anotações", x: r.qtdNotas + (r.qtdNotas === 1 ? " fase com anotação." : " fases com anotação.") });
    // cada andamento é uma pasta de arquivo (fundo com aba, folha aparecendo, frente) com o post-it colado em cima
    notas.forEach(function (nt, i) {
      var no = el("div", "mural-item mural-nota pasta");
      no.style.setProperty("--giro", (i % 2 ? -1.2 : 1.1) + "deg");
      no.appendChild(el("span", "pasta-fundo"));
      no.appendChild(el("span", "pasta-papel"));
      no.appendChild(el("span", "pasta-frente"));
      var post = el("div", "pasta-post");
      post.style.setProperty("--cor", cores[i % 4]);
      post.style.setProperty("--giro-post", (i % 2 ? 2.4 : -2.2) + "deg");
      post.appendChild(el("span", "pino pino-" + pinos[(i + 2) % 4]));
      post.appendChild(el("small", null, nt.t));
      post.appendChild(el("p", null, nt.x));
      no.appendChild(post);
      colNotas.appendChild(no);
    });
    muralDir.appendChild(colNotas);
    medeMural();
  }

  var muralChaves = null;   // o que já estava no mural (para animar só o que acabou de chegar)
  function pessoasDoCaso(cs, st) {
    var lista = [];   // ordem de descoberta; quem reaparece vai para o fim, com o papel novo
    cs.fases.forEach(function (fa) {
      if (!st[fa.id]) return;
      (MURAL_PESSOAS[fa.id] || []).forEach(function (p) {
        for (var i = 0; i < lista.length; i++) { if (lista[i].nome === p[0]) { lista.splice(i, 1); break; } }
        var m = p[2] || "";
        lista.push({ nome: p[0], papel: p[1], culpado: m.indexOf("c") > -1, aparelho: m.indexOf("a") > -1 });
      });
    });
    return lista;
  }
  function atualizaMural() {
    if (!mural) return;
    var cs = casoDaPagina(); if (!cs) return;
    muralEsq.textContent = ""; muralDir.textContent = "";
    if (window.innerWidth < MURAL_LARGURA_MIN) { muralEsq.hidden = muralDir.hidden = true; return; }
    var stReal = estado();
    // o mural acompanha a fase que está sendo lida: só entra o que foi descoberto até ela
    var aberta = document.querySelector("section.fase.aberta");
    var limite = cs.fases.length;
    if (aberta) { for (var li = 0; li < cs.fases.length; li++) { if (cs.fases[li].id === aberta.id) { limite = li + 1; break; } } }
    var st = {};
    cs.fases.slice(0, limite).forEach(function (fa) { if (stReal[fa.id]) st[fa.id] = true; });
    var pinos = ["vermelho", "azul", "amarelo", "verde"];
    var chaves = {};
    var marcaNovo = function (no, chave) {
      chaves[chave] = true;
      if (muralChaves && !muralChaves[chave]) no.classList.add("novo");
    };
    // à esquerda: as pessoas (e aparelhos) que já apareceram na investigação
    pessoasDoCaso(cs, st).slice(-4).forEach(function (p, i) {
      var fig = el("figure", "mural-item mural-foto");
      marcaNovo(fig, "p:" + p.nome + "|" + p.papel);
      fig.style.setProperty("--giro", (i % 2 ? 2.4 : -2.8) + "deg");
      fig.appendChild(el("span", "pino pino-" + pinos[i % 4]));
      var ret = el("div", "ficha-retrato");
      ret.innerHTML = retratoMarkup(p.nome, p.aparelho);
      fig.appendChild(ret);
      var leg = el("figcaption");
      leg.appendChild(el("b", null, p.nome));
      leg.appendChild(el("small", null, p.papel));
      fig.appendChild(leg);
      if (p.culpado) fig.appendChild(el("span", "mural-selo", "Culpado"));
      muralEsq.appendChild(fig);
    });
    // à direita: os últimos achados, em post-its
    var cores = ["#fff1a0", "#ffd9e2", "#d6f0c5", "#cfe6fb"];
    cs.fases.filter(function (fa) { return st[fa.id] && DESCOBERTAS[fa.id] && DESCOBERTAS[fa.id] !== MONTADO; })
      .slice(-4).forEach(function (fa, i) {
        var nota = el("div", "mural-item mural-nota");
        marcaNovo(nota, "n:" + fa.id);
        nota.style.setProperty("--cor", cores[i % 4]);
        nota.style.setProperty("--giro", (i % 2 ? -2 : 1.8) + "deg");
        nota.appendChild(el("span", "pino pino-" + pinos[(i + 2) % 4]));
        nota.appendChild(el("small", null, "Fase " + fa.num + " · " + (fa.titulo || fa.nome)));
        nota.appendChild(el("p", null, DESCOBERTAS[fa.id]));
        muralDir.appendChild(nota);
      });
    muralChaves = chaves;
    medeMural();
  }
  // encaixa cada coluna na sobra da lateral; tira os itens que não cabem na altura e traça os fios
  function medeMural() {
    var wrap = document.querySelector(".quadro-home") || document.querySelector(".wrap");
    if (!mural || !wrap) return;
    var r = wrap.getBoundingClientRect();
    var larguraEsq = r.left - 28;
    // limite da direita: a abinha das anotações (64px) ou, com a gaveta aberta, a borda dela
    var limiteDir = window.innerWidth - (muralModoHome ? 12 : 64);
    if (gaveta && gaveta.classList.contains("aberta")) {
      var gp = gaveta.querySelector(".gaveta-painel");
      var gb = gp && gp.getBoundingClientRect();
      if (gb && gb.width > 0 && gb.left > r.right) limiteDir = Math.min(limiteDir, gb.left - 8);
    }
    var larguraDir = limiteDir - r.right - 28;
    var lados = [
      { no: muralEsq, w: Math.min(larguraEsq, muralModoHome ? 460 : 250), x0: 0, sobra: larguraEsq, min: muralModoHome ? 150 : 190, ref: 0 },
      { no: muralDir, w: Math.min(larguraDir, 250), x0: r.right, sobra: larguraDir, min: 200, ref: r.right }
    ];
    lados.forEach(function (l, k) {
      var tem = l.no.childElementCount > 0 && l.sobra >= l.min;
      l.no.hidden = !tem;
      l.no.classList.toggle("com-novo", !!l.no.querySelector(".novo"));
      var fio = l.no.querySelector("svg.mural-fios"); if (fio) fio.remove();
      if (!tem) return;
      l.no.style.width = l.w + "px";
      var centro = k === 0 ? r.left / 2 : (r.right + limiteDir) / 2;
      l.no.style.left = Math.round(centro - l.w / 2) + "px";
      var itens = [].slice.call(l.no.querySelectorAll(".mural-item"));
      // faltou altura: some o mais antigo (o mais recente, como o culpado, é o que importa)
      while (itens.length > 1 && l.no.scrollHeight > l.no.clientHeight + 2) { itens.shift().remove(); }
      desenhaFios(l.no);
    });
  }
  function desenhaFios(lado) {
    var colunas = [].slice.call(lado.querySelectorAll(".mural-col"));
    var grupos = colunas.length
      ? colunas.map(function (col) { return [].slice.call(col.querySelectorAll(".mural-item")); })
      : [[].slice.call(lado.querySelectorAll(".mural-item"))];
    if (!grupos.some(function (g) { return g.length >= 2; })) return;
    var NS = "http://www.w3.org/2000/svg";
    var box = lado.getBoundingClientRect();
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "mural-fios");
    svg.setAttribute("width", Math.ceil(box.width)); svg.setAttribute("height", Math.ceil(lado.scrollHeight));
    var ponto = function (item) {
      var p = item.querySelector(".pino").getBoundingClientRect();
      return [p.left + p.width / 2 - box.left, p.top + p.height / 2 - box.top];
    };
    // na tela inicial o fio desce quase reto de um alfinete ao outro (só uma leve barriga para baixo),
    // sem atravessar as fotos vizinhas; nos casos ele balança para os lados, como um barbante solto
    var reto = lado.classList.contains("home");
    grupos.forEach(function (itens) {
      for (var i = 0; i < itens.length - 1; i++) {
        var a = ponto(itens[i]), b = ponto(itens[i + 1]);
        var cx = (a[0] + b[0]) / 2 + (reto ? 0 : (i % 2 ? 34 : -34)), cy = (a[1] + b[1]) / 2 + (reto ? 8 : 26);
        var d = "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + b[0].toFixed(1) + " " + b[1].toFixed(1);
        var sombra = document.createElementNS(NS, "path");
        sombra.setAttribute("d", d); sombra.setAttribute("fill", "none"); sombra.setAttribute("stroke", "rgba(0,0,0,.35)"); sombra.setAttribute("stroke-width", "3.4");
        sombra.setAttribute("transform", "translate(1.5 2.5)");
        var fio = document.createElementNS(NS, "path");
        fio.setAttribute("d", d); fio.setAttribute("fill", "none"); fio.setAttribute("stroke", "#c0281c"); fio.setAttribute("stroke-width", "2.2"); fio.setAttribute("stroke-linecap", "round");
        svg.appendChild(sombra); svg.appendChild(fio);
      }
    });
    lado.insertBefore(svg, lado.firstChild);
  }

  // ------------------------------------------------------------------ navegação entre casos
  function arqAtual() {
    var p = location.pathname.split("/").pop() || "index.html";
    // alguns servidores (como o do "npm run dev") tiram o .html do endereço: /guia vira guia.html
    if (!/[.][a-z0-9]+$/i.test(p)) p += ".html";
    return p;
  }
  function rodapeNav() {
    var wrap = document.querySelector(".wrap");
    if (!wrap || document.querySelector(".caso-nav")) return;
    var arq = arqAtual();
    var i = CASOS.map(function (c) { return c.arq; }).indexOf(arq);
    var ehTreino = CAT.some(function (c) { return c.arq === arq && c.treino; });
    if (i < 0 && !ehTreino) return;
    var nav = el("nav", "caso-nav"); nav.setAttribute("aria-label", "Outros casos");
    var ant = ehTreino ? CASOS[0] : CASOS[i - 1], prox = ehTreino ? CASOS[1] : CASOS[i + 1];
    if (ant) { var a = el("a", "btn", "← Caso " + ant.n + " · " + ant.titulo); a.href = ant.arq; nav.appendChild(a); }
    var home = el("a", "btn", "Todos os casos"); home.href = "index.html"; nav.appendChild(home);
    if (prox) { var p = el("a", "btn", "Caso " + prox.n + " · " + prox.titulo + " →"); p.href = prox.arq; nav.appendChild(p); }
    wrap.appendChild(nav);
  }

  // ------------------------------------------------------------------ revisão: refazer de memória fases já concluídas
  // Sorteia entre as fases menos revisadas (nunca revisadas primeiro). A página da fase abre com
  // ?revisao=<id>, e o computador esconde a explicação e grava a data quando a pessoa acerta.
  var K_REV = "misterio-sql-revisao";
  function candidatosRevisao(st) {
    var lista = [];
    CAT.forEach(function (c) {
      if (c.treino) return;
      c.fases.forEach(function (fa) { if (fa.revisa && st[fa.id]) lista.push({ caso: c, fase: fa }); });
    });
    return lista;
  }
  function proximaRevisao(evita) {
    var rev = ler(K_REV, {});
    var lista = candidatosRevisao(estado()).filter(function (x) { return x.fase.id !== evita; });
    if (!lista.length) return null;
    lista.sort(function (a, b) { return (rev[a.fase.id] || 0) - (rev[b.fase.id] || 0); });
    var topo = lista.slice(0, Math.min(5, lista.length));
    var x = topo[Math.floor(Math.random() * topo.length)];
    return x.caso.arq + "?revisao=" + encodeURIComponent(x.fase.id) + "#" + x.fase.id;
  }
  window.MisterioRevisao = { proxima: proximaRevisao };

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
      marcaEncerrado(card, cs, r.st);
      var linha = el("div", "caso-prog");
      linha.appendChild(barra(cs.fases.length ? Math.round(f / cs.fases.length * 100) : 0));
      linha.appendChild(el("span", "cad-nota", f === cs.fases.length && f > 0 ? "✓ Caso encerrado" : f + " de " + cs.fases.length + " fases"));
      if (r.st["d:" + cs.arq.replace(/\.html$/, "")]) {
        var trofeu = el("span", "cad-trofeu", "🏆 Desafio vencido");
        trofeu.title = "Você venceu o desafio final deste caso sem ajuda";
        linha.appendChild(trofeu);
      }
      card.insertBefore(linha, card.querySelector(".caso-go"));
    });
    var box = el("section", "boas-vindas"); box.id = "cadBoasVindas";
    var topo = el("div", "bv-topo");
    var foto = el("div", "bv-foto");
    foto.appendChild(avatarNode(jog.foto, jog.nome));
    topo.appendChild(foto);
    var idb = el("div", "bv-id");
    idb.appendChild(el("h2", null, jog.nome ? "Olá, " + jog.nome + "!" : "Olá, detetive!"));
    var linhaNivel = el("div", "bv-nivel");
    linhaNivel.appendChild(el("span", "bv-pilula", "Nível " + (r.nivel + 1) + " · " + NIVEIS[r.nivel].nome));
    linhaNivel.appendChild(el("span", "cad-nota", r.feitas + " de " + r.total + " fases concluídas"));
    idb.appendChild(linhaNivel);
    idb.appendChild(barra(r.pct));
    topo.appendChild(idb);
    box.appendChild(topo);

    var acoes = el("div", "bv-acoes");
    var prox = proximaFase(r.st);
    if (prox) {
      var go = el("a", "bt-primario");
      go.href = prox.caso.arq + "#" + prox.fase.id;
      var ic = el("span", "ic"); ic.setAttribute("aria-hidden", "true"); ic.innerHTML = ICONES.play;
      var tx = el("span", "bt-texto");
      tx.appendChild(el("b", null, r.feitas > 0 ? "Continuar de onde parou" : "Começar a investigar"));
      tx.appendChild(el("small", null, nomeCaso(prox.caso) + " · " + (prox.fase.titulo || prox.fase.nome)));
      go.appendChild(ic); go.appendChild(tx);
      acoes.appendChild(go);
    } else {
      acoes.appendChild(el("p", "cad-nota", "🏅 Você encerrou todos os casos. Parabéns!"));
    }
    // revisão rápida: uma fase já feita, de memória
    var urlRev = proximaRevisao(null);
    var rev = el(urlRev ? "a" : "button", "bt-secundario bt-revisao");
    var icR = el("span", "ic"); icR.setAttribute("aria-hidden", "true");
    icR.innerHTML = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 12a9 9 0 0 1 15.5-6.3L21 8'/><path d='M21 3v5h-5'/><path d='M21 12a9 9 0 0 1-15.5 6.3L3 16'/><path d='M3 21v-5h5'/></svg>";
    rev.appendChild(icR);
    if (urlRev) {
      rev.href = urlRev;
      rev.appendChild(document.createTextNode("Revisão rápida"));
      rev.title = "Refaça de memória uma fase que você já concluiu";
    } else {
      rev.type = "button"; rev.disabled = true;
      rev.appendChild(document.createTextNode("Revisão: conclua uma fase"));
      rev.title = "A revisão sorteia fases que você já concluiu";
    }
    acoes.appendChild(rev);
    var cad = el("button", "bt-secundario"); cad.type = "button";
    var ic2 = el("span", "ic"); ic2.setAttribute("aria-hidden", "true"); ic2.innerHTML = ICONES.caderno;
    cad.appendChild(ic2); cad.appendChild(document.createTextNode("Meu caderno"));
    cad.addEventListener("click", function () { abrir("detetive"); });
    acoes.appendChild(cad);
    var ach = el("button", "bt-secundario"); ach.type = "button";
    var ic3 = el("span", "ic"); ic3.setAttribute("aria-hidden", "true"); ic3.innerHTML = ICONES.caderno;
    ach.appendChild(ic3); ach.appendChild(document.createTextNode("Meus achados"));
    ach.addEventListener("click", function () { abrir("achados"); });
    acoes.appendChild(ach);
    box.appendChild(acoes);
    if (!jog.nome) {
      var def = el("button", "bt-link", "Definir meu nome"); def.type = "button";
      def.addEventListener("click", function () { abrirBoasVindas(); });
      box.appendChild(def);
    }
    casos.parentNode.insertBefore(box, casos);
  }

  // ------------------------------------------------------------------ gaveta: o caderno puxado ao lado da fase
  var gaveta = null, gavetaAba = null, gavetaTitulo = null, gavetaCaso = null, gavetaMissao = null, gavetaCorpo = null;
  var gavetaFase = null, gavetaEditor = null;
  function casoDaPagina() {
    var arq = arqAtual();
    return CAT.filter(function (cs) { return cs.arq === arq; })[0] || null;
  }
  function faseDoCaso(cs, id) {
    return cs.fases.filter(function (f) { return f.id === id; })[0] || null;
  }
  // fase em foco: a que está aberta, senão a próxima a fazer, senão a primeira
  function faseEmFoco(cs) {
    var sec = document.querySelector("section.fase.aberta") || document.querySelector("section.fase.atual") || document.querySelector("section.fase");
    return (sec && faseDoCaso(cs, sec.id)) || cs.fases[0] || null;
  }
  function criaGaveta() {
    if (gaveta) return gaveta;
    var g = el("aside", "gaveta"); g.id = "gavetaNotas";
    g.setAttribute("aria-label", "Anotações da fase");
    gavetaAba = el("button", "gaveta-aba"); gavetaAba.type = "button";
    gavetaAba.setAttribute("aria-controls", "gavetaNotas"); gavetaAba.setAttribute("aria-expanded", "false");
    gavetaAba.title = "Puxar o caderno para anotar";
    gavetaAba.appendChild(el("span", "gaveta-aba-ic", "📓"));
    gavetaAba.appendChild(el("span", "gaveta-aba-t", "Anotações"));
    var painel = el("div", "gaveta-painel");
    var topo = el("div", "gaveta-topo");
    var tit = el("div", "gaveta-titulo");
    gavetaCaso = el("small"); gavetaTitulo = el("b");
    tit.appendChild(gavetaCaso); tit.appendChild(gavetaTitulo);
    var x = el("button", "gaveta-x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Guardar o caderno");
    topo.appendChild(tit); topo.appendChild(x);
    gavetaMissao = el("p", "gaveta-missao");
    gavetaCorpo = el("div", "gaveta-corpo");
    var rod = el("div", "gaveta-rodape");
    var todas = el("button", "btn", "📚 Ver todas as anotações"); todas.type = "button";
    rod.appendChild(todas);
    painel.appendChild(topo); painel.appendChild(gavetaMissao); painel.appendChild(gavetaCorpo); painel.appendChild(rod);
    g.appendChild(gavetaAba); g.appendChild(painel);
    gavetaAba.addEventListener("click", function () {
      if (g.classList.contains("aberta")) fechaGaveta(); else abreGaveta();
    });
    x.addEventListener("click", fechaGaveta);
    todas.addEventListener("click", function () { abrir("missoes"); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && g.classList.contains("aberta")) { e.preventDefault(); fechaGaveta(); gavetaAba.focus(); }
    });
    document.body.appendChild(g);
    document.body.classList.add("tem-gaveta");
    gaveta = g;
    return g;
  }
  function abreGaveta(id, opt) {
    var cs = casoDaPagina(); if (!cs) return;
    var fa = (typeof id === "string" && faseDoCaso(cs, id)) || faseEmFoco(cs);
    if (!fa) return;
    var semFoco = !!(opt && opt.semFoco);
    var g = criaGaveta();
    if (gavetaEditor && gavetaFase === fa.id && g.classList.contains("aberta")) {
      if (!semFoco) gavetaEditor.foca();
      return;
    }
    if (gavetaEditor) gavetaEditor.descarrega();
    gavetaFase = fa.id;
    gavetaCaso.textContent = nomeCaso(cs) + " · " + cs.titulo;
    gavetaTitulo.textContent = fa.num + " · " + (fa.titulo || fa.nome);
    gavetaMissao.textContent = fa.missao || ""; gavetaMissao.hidden = !fa.missao;
    gavetaCorpo.textContent = "";
    gavetaEditor = criaEditorNota(fa, { linhas: 7 });
    gavetaCorpo.appendChild(gavetaEditor.no);
    g.classList.add("aberta");
    document.body.classList.add("com-gaveta");
    ajustaEmpurrao();
    gavetaAba.setAttribute("aria-expanded", "true");
    gavetaAba.title = "Guardar o caderno";
    if (!semFoco) gavetaEditor.foca();
    setTimeout(function () { agendaMural(0); }, 400);
  }
  // com a gaveta aberta a página sai da frente: desliza para a esquerda (transform, sem refazer o texto)
  // quando há sobra na lateral; se não houver, encolhe com padding. Telas largas nem precisam mexer.
  var MQ_GAVETA_EMBAIXO = "(max-width:899px) and (min-height:521px), (max-width:599px)";
  function ajustaEmpurrao() {
    var b = document.body;
    b.classList.remove("gav-desliza", "gav-empurra");
    if (!gaveta || !gaveta.classList.contains("aberta")) return;
    if (window.matchMedia && window.matchMedia(MQ_GAVETA_EMBAIXO).matches) return;   // sobe de baixo: não empurra de lado
    var wrap = document.querySelector(".wrap"); if (!wrap) return;
    var natEsq = wrap.offsetLeft, natDir = natEsq + wrap.offsetWidth;                  // sem contar o deslocamento
    var gw = gaveta.offsetWidth || 420;
    var shift = Math.ceil(natDir - (window.innerWidth - gw - 16));
    if (shift <= 0) return;                                                           // cabe sem mexer em nada
    if (natEsq - shift >= 12) { b.style.setProperty("--gav-shift", shift + "px"); b.classList.add("gav-desliza"); }
    else b.classList.add("gav-empurra");
  }
  function fechaGaveta() {
    if (!gaveta || !gaveta.classList.contains("aberta")) return;
    if (gavetaEditor) gavetaEditor.descarrega();
    gavetaEditor = null; gavetaFase = null;
    gaveta.classList.remove("aberta");
    document.body.classList.remove("com-gaveta", "gav-desliza", "gav-empurra");
    gavetaAba.setAttribute("aria-expanded", "false");
    gavetaAba.title = "Puxar o caderno para anotar";
    marcaBotoesFase();
    setTimeout(function () { agendaMural(0); }, 400);
  }
  // botão "Anotar nesta fase" dentro de cada fase da página do caso
  function botoesDasFases() {
    var cs = casoDaPagina(); if (!cs) return;
    cs.fases.forEach(function (fa) {
      var sec = document.getElementById(fa.id);
      if (!sec || sec.querySelector(".fase-notas")) return;
      var corpoFase = sec.querySelector(".fase-corpo") || sec;
      var b = el("button", "fase-notas"); b.type = "button";
      b.setAttribute("data-fase-notas", fa.id);
      b.addEventListener("click", function () { abreGaveta(fa.id); });
      var ref = corpoFase.querySelector(".missao");
      if (ref) corpoFase.insertBefore(b, ref.nextSibling);
      else corpoFase.insertBefore(b, corpoFase.querySelector(".done-row"));
    });
    marcaBotoesFase();
  }
  // o botão avisa quando a fase já tem anotação (texto ou imagem)
  function marcaBotoesFase() {
    idbChaves().then(function (chaves) {
      var comImg = {};
      (chaves || []).forEach(function (k) { comImg[k] = true; });
      [].forEach.call(document.querySelectorAll(".fase-notas"), function (b) {
        var id = b.getAttribute("data-fase-notas");
        var tem = !!(notas[id] || "").trim() || !!comImg[id];
        b.classList.toggle("tem", tem);
        b.textContent = tem ? "📓 Minhas anotações desta fase" : "📓 Anotar nesta fase";
      });
    });
  }
  // com a gaveta aberta, ela acompanha a fase que o jogador abre
  function observaFases() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function () {
      atualizaEncerrado(true);
      agendaMural();
      if (!gaveta || !gaveta.classList.contains("aberta")) return;
      var sec = document.querySelector("section.fase.aberta");
      if (sec && sec.id !== gavetaFase) abreGaveta(sec.id, { semFoco: true });
    });
    [].forEach.call(document.querySelectorAll("section.fase"), function (s) {
      obs.observe(s, { attributes: true, attributeFilter: ["class"] });
    });
  }
  function gavetaIniciar() {
    if (!casoDaPagina() || !document.querySelector("section.fase")) return;
    criaGaveta();
    botoesDasFases();
    observaFases();
    window.addEventListener("resize", ajustaEmpurrao);
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
      var addp = el("button", "btn ghost", "Adicionar foto (opcional)"); addp.type = "button"; addp.id = "bvAddFoto";
      addp.addEventListener("click", function () {
        escolherFoto(function (d) { fotoTemp = d; addp.textContent = "Trocar foto"; pintaSelo(); });
      });
      fbp.appendChild(addp);
      popup.appendChild(fbp);
      var linha = el("div", "bv-botoes");
      var depois = el("button", "btn ghost", "Agora não"); depois.type = "button";
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
    gavetaIniciar();
    encerradoIniciar();
    muralIniciar();
    homeExtras();
    muralHomeIniciar();
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
    if (muralModoHome) agendaMural(0);
  }
  window.MisterioCaderno = { abrir: abrir, anotar: abreGaveta, guardar: fechaGaveta, retrato: svgBusto, aparelho: svgAparelho, retratoMarkup: retratoMarkup, slug: slugRetrato, apagarAparelho: apagarAparelho };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
