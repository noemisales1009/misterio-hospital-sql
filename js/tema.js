// Tema claro/escuro. Roda cedo, no <head>, para a página não piscar.
(function () {
  var K = "misterio-sql-tema";
  try {
    var t = localStorage.getItem(K);
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
  function atual() {
    var a = document.documentElement.getAttribute("data-theme");
    if (a) return a;
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return "light"; }
  }
  window.MisterioTema = {
    atual: atual,
    alternar: function () {
      var novo = atual() === "dark" ? "light" : "dark";
      try { localStorage.setItem(K, novo); } catch (e) {}
      document.documentElement.setAttribute("data-theme", novo);
      // os diagramas são desenhados com o tema da hora: recarrega mantendo a fase aberta
      var aberta = document.querySelector("section.fase.aberta");
      try {
        if (aberta && aberta.id) history.replaceState(null, "", "#" + aberta.id);
      } catch (e) {}
      location.reload();
    }
  };
})();
