// Quadro de detetive: cortiça, alfinetes e barbante vermelho ligando as pistas.
// Na página inicial os casos ficam pregados e ligados em sequência.
// Em cada caso, as pistas destacadas na história viram bilhetes ligados ao dossiê.
(function () {
  "use strict";

  var K_PROG = "misterio-sql-progresso";
  var CAT = window.MISTERIO_CATALOGO || [];
  var CORES = ["vermelho", "azul", "amarelo", "verde"];
  var GIROS = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9, -1.9, 1.4];
  var NS = "http://www.w3.org/2000/svg";

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function estado() {
    try { return JSON.parse(localStorage.getItem(K_PROG)) || {}; } catch (e) { return {}; }
  }

  function criaQuadro() {
    var q = el("div", "quadro");
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "quadro-fios");
    svg.setAttribute("aria-hidden", "true");
    q.appendChild(svg);
    q._svg = svg;
    q._liga = [];
    return q;
  }
  function pino(i) {
    var p = el("span", "pino pino-" + CORES[i % CORES.length]);
    p.setAttribute("aria-hidden", "true");
    return p;
  }
  function centro(no, q) {
    var a = no.getBoundingClientRect(), b = q.getBoundingClientRect();
    // o SVG começa dentro da borda de madeira, então ela é descontada
    return { x: a.left - b.left - q.clientLeft + a.width / 2, y: a.top - b.top - q.clientTop + a.height / 2 };
  }
  function linha(svg, d, cor, largura, desloca) {
    var p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", cor);
    p.setAttribute("stroke-width", largura);
    p.setAttribute("stroke-linecap", "round");
    if (desloca) p.setAttribute("transform", "translate(" + desloca[0] + " " + desloca[1] + ")");
    svg.appendChild(p);
  }
  function desenha(q) {
    var svg = q._svg;
    var w = q.clientWidth, h = q.clientHeight;
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    q._liga.forEach(function (par) {
      var a = centro(par[0], q), b = centro(par[1], q);
      var dx = b.x - a.x, dy = b.y - a.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var folga = Math.min(80, 16 + dist * 0.13);
      var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2 + folga;
      var d = "M" + a.x.toFixed(1) + " " + a.y.toFixed(1) + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + b.x.toFixed(1) + " " + b.y.toFixed(1);
      linha(svg, d, "rgba(0,0,0,.38)", 3.2, [2, 4]);
      linha(svg, d, "#b3261e", 2.4);
      linha(svg, d, "rgba(255,255,255,.28)", 0.8, [-0.6, -0.6]);
    });
  }
  function observa(q) {
    var f = function () { desenha(q); };
    window.addEventListener("resize", f);
    window.addEventListener("load", f);
    if (window.ResizeObserver) new ResizeObserver(f).observe(q);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(f);
    f();
  }

  // ------------------------------------------------------------------ página inicial
  function home() {
    var casos = document.querySelector(".casos");
    if (!casos || document.querySelector(".quadro")) return false;
    var hero = document.querySelector("header.hero");
    var boas = document.getElementById("cadBoasVindas");
    var q = criaQuadro();
    q.classList.add("quadro-home");
    casos.parentNode.insertBefore(q, hero || casos);
    if (hero) q.appendChild(hero);
    if (boas) q.appendChild(boas);
    q.appendChild(casos);

    var st = estado();
    [].forEach.call(casos.querySelectorAll(".caso-card"), function (card, i) {
      card.style.setProperty("--giro", GIROS[i % GIROS.length] + "deg");
      var arq = card.getAttribute("data-arq");
      var cs = CAT.filter(function (c) { return c.arq === arq; })[0];
      if (cs && cs.fases.length && cs.fases.every(function (f) { return st[f.id]; })) {
        card.classList.add("resolvido");
        card.appendChild(el("span", "carimbo-ok", "RESOLVIDO"));
      }
    });

    // alfinetes e barbantes: refeitos sempre que o cartão de boas-vindas é recriado
    function pinoDe(no, cor) {
      var p = no.querySelector(":scope > .pino");
      if (!p) { p = pino(cor); no.appendChild(p); }
      return p;
    }
    function ligacoes() {
      var ordem = [];
      var titulo = q.querySelector("header.hero h1");
      if (titulo) ordem.push(pinoDe(titulo, 2));
      var b = q.querySelector("#cadBoasVindas");
      if (b) ordem.push(pinoDe(b, 0));
      [].forEach.call(q.querySelectorAll(".caso-card"), function (card, i) { ordem.push(pinoDe(card, i + 1)); });
      q._liga = [];
      for (var i = 0; i < ordem.length - 1; i++) q._liga.push([ordem[i], ordem[i + 1]]);
      desenha(q);
    }
    ligacoes();
    if (window.MutationObserver) {
      new MutationObserver(function () {
        var b = q.querySelector("#cadBoasVindas");
        if (b && !b.querySelector(":scope > .pino")) ligacoes();
      }).observe(q, { childList: true });
    }
    observa(q);
    return true;
  }

  // ------------------------------------------------------------------ página de um caso
  function caso() {
    var hero = document.querySelector("header.hero");
    if (!hero || document.querySelector(".casos") || document.querySelector(".quadro")) return;
    var dossie = hero.querySelector(".case");
    if (!dossie) return;
    var q = criaQuadro();
    q.classList.add("quadro-caso");
    hero.parentNode.insertBefore(q, hero);
    q.appendChild(hero);
    // a barra com "Todos os casos", progresso e conta fica acima do quadro, sempre à mão
    var barra = document.querySelector("nav.trail");
    if (barra && barra.parentNode) barra.parentNode.insertBefore(barra, q);

    var pinoDossie = pino(0);
    dossie.appendChild(pinoDossie);
    var h1 = hero.querySelector("h1");
    var pinoTitulo = null;
    if (h1) { pinoTitulo = pino(2); h1.appendChild(pinoTitulo); }

    var vistos = {}, textos = [];
    [].forEach.call(dossie.querySelectorAll("mark"), function (m) {
      var t = (m.textContent || "").trim();
      if (t && !vistos[t.toLowerCase()]) { vistos[t.toLowerCase()] = true; textos.push(t); }
    });
    if (textos.length) {
      var faixa = el("div", "pistas");
      faixa.setAttribute("role", "list");
      faixa.setAttribute("aria-label", "Pistas do caso");
      textos.slice(0, 5).forEach(function (t, i) {
        var n = el("div", "pista", t);
        n.setAttribute("role", "listitem");
        n.style.setProperty("--giro", GIROS[(i + 3) % GIROS.length] + "deg");
        var p = pino(i + 1);
        n.appendChild(p);
        faixa.appendChild(n);
        q._liga.push([pinoDossie, p]);
      });
      dossie.parentNode.insertBefore(faixa, dossie.nextSibling);
    }
    // o dossiê começa recolhido para o quadro ocupar pouco espaço
    var ler = el("button", "dossie-ler", "Ler o dossiê completo ▾");
    ler.type = "button"; ler.setAttribute("aria-expanded", "false");
    ler.addEventListener("click", function () {
      var aberto = q.classList.toggle("aberto");
      ler.textContent = aberto ? "Recolher o dossiê ▴" : "Ler o dossiê completo ▾";
      ler.setAttribute("aria-expanded", aberto ? "true" : "false");
      desenha(q);
    });
    dossie.appendChild(ler);
    if (pinoTitulo) q._liga.unshift([pinoTitulo, pinoDossie]);
    observa(q);
  }

  function iniciar() {
    if (!home()) caso();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
