// Diagramas (Mermaid) com zoom: passe o mouse para ampliar, clique para ver em tela cheia.
(function () {
  if (typeof mermaid === "undefined") return;

  var escuro = false;
  try { escuro = window.MisterioTema ? window.MisterioTema.atual() === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
  try {
    mermaid.initialize({ startOnLoad: false, theme: escuro ? "dark" : "default" });
  } catch (e) { return; }

  var lupa = null;

  function abreLupa(svg) {
    if (!lupa) {
      lupa = document.createElement("dialog");
      lupa.className = "lupa";
      lupa.setAttribute("aria-label", "Diagrama ampliado");
      var fechar = document.createElement("button");
      fechar.type = "button";
      fechar.className = "btn lupa-fechar";
      fechar.textContent = "Fechar";
      fechar.addEventListener("click", function () { lupa.close(); });
      var corpo = document.createElement("div");
      corpo.className = "lupa-corpo";
      lupa.appendChild(fechar);
      lupa.appendChild(corpo);
      lupa.addEventListener("click", function (e) { if (e.target === lupa) lupa.close(); });
      lupa.addEventListener("close", function () { lupa.querySelector(".lupa-corpo").textContent = ""; });
      document.body.appendChild(lupa);
    }
    var copia = svg.cloneNode(true);
    copia.removeAttribute("height");
    copia.style.maxWidth = "none";
    copia.style.width = "max(1100px, 100%)";
    copia.style.height = "auto";
    var corpoEl = lupa.querySelector(".lupa-corpo");
    corpoEl.textContent = "";
    corpoEl.appendChild(copia);
    if (lupa.showModal) lupa.showModal(); else lupa.setAttribute("open", "");
  }

  function prepara() {
    var pres = document.querySelectorAll("pre.mermaid");
    for (var i = 0; i < pres.length; i++) {
      (function (pre) {
        var svg = pre.querySelector("svg");
        if (!svg || pre.getAttribute("data-zoom")) return;
        pre.setAttribute("data-zoom", "1");
        pre.classList.add("zoomavel");
        pre.setAttribute("tabindex", "0");
        pre.setAttribute("role", "button");
        pre.setAttribute("aria-label", "Diagrama. Pressione Enter para ampliar");

        // diagrama de tabelas (ER) tem letras pequenas: amplia mais
        var papel = svg.getAttribute("aria-roledescription") || "";
        pre.style.setProperty("--zoom", /er/i.test(papel) ? "2.2" : "1.6");

        // a área ampliada acompanha o mouse
        pre.addEventListener("mousemove", function (e) {
          var r = pre.getBoundingClientRect();
          if (!r.width || !r.height) return;
          var x = ((e.clientX - r.left) / r.width) * 100;
          var y = ((e.clientY - r.top) / r.height) * 100;
          svg.style.transformOrigin = x + "% " + y + "%";
        });
        pre.addEventListener("mouseleave", function () { svg.style.transformOrigin = "50% 50%"; });

        pre.addEventListener("click", function () { abreLupa(svg); });
        pre.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abreLupa(svg); }
        });

        var dica = document.createElement("div");
        dica.className = "foot zoom-dica";
        dica.textContent = "Passe o mouse para ampliar. Clique para ver em tela cheia.";
        if (pre.parentNode) pre.parentNode.insertBefore(dica, pre.nextSibling);
      })(pres[i]);
    }
  }

  try {
    var p = mermaid.run({ querySelector: "pre.mermaid" });
    if (p && p.then) p.then(prepara, prepara); else prepara();
  } catch (e) {
    try { mermaid.init(undefined, document.querySelectorAll("pre.mermaid")); } catch (e2) {}
    setTimeout(prepara, 800);
  }
})();
