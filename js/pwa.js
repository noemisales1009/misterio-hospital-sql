// Offline: registra o service worker (sw.js), que guarda o jogo no aparelho.
(function () {
  if (!("serviceWorker" in navigator)) return;
  // dentro do aplicativo Android (APK) os arquivos já estão no aparelho: não precisa de service worker
  try { if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return; } catch (e) {}
  // no localhost (npm run dev) o service worker entregaria css/js velhos enquanto se edita:
  // lá ele não roda, e quem já tinha um registrado perde ele e o cache
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (local) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
    if (window.caches) caches.keys().then(function (nomes) {
      nomes.forEach(function (n) { if (n.indexOf("misterio-sql-") === 0) caches.delete(n); });
    }).catch(function () {});
    return;
  }
  if (location.protocol !== "https:") return;
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
