// Offline: registra o service worker (sw.js), que guarda o jogo no aparelho.
(function () {
  if (!("serviceWorker" in navigator)) return;
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (location.protocol !== "https:" && !local) return;
  var K = "misterio-sql-offline-avisado";

  function avisa() {
    try { if (localStorage.getItem(K)) return; localStorage.setItem(K, "1"); } catch (e) {}
    try {
      if (window.MisterioNuvem && window.MisterioNuvem.toast) window.MisterioNuvem.toast("Pronto: o jogo agora funciona sem internet");
    } catch (e) {}
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      reg.addEventListener("updatefound", function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", function () {
          if (w.state === "activated") avisa();
        });
      });
    }).catch(function () {});
  });
})();
