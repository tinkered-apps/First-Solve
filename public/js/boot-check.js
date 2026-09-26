/* Backstop: if the app never boots (e.g. the 3D cube library fails to load),
   show a banner. boot() in app.js sets __kostkaBooted. */
(function () {
  var MSG = {
    pl: { cdn: "Nie mogę załadować kostki 3D. Sprawdź połączenie z internetem.", retry: "Spróbuj jeszcze raz" },
    en: { cdn: "Can't load the 3D cube. Check your internet connection.", retry: "Try again" }
  };
  function showBanner() {
    if (window.__kostkaBooted) return;
    var lang = "en";
    try { lang = localStorage.getItem("kostka-lang") || "en"; } catch (e) {}
    var m = MSG[lang] || MSG.en;
    var el = document.getElementById("cdn-error");
    if (!el || !el.classList.contains("hidden")) return;
    el.innerHTML = "<span>" + m.cdn + "</span>";
    var b = document.createElement("button");
    b.className = "btn";
    b.textContent = m.retry;
    b.onclick = function () { location.reload(); };
    el.appendChild(b);
    el.classList.remove("hidden");
  }
  window.addEventListener("unhandledrejection", function () { setTimeout(showBanner, 200); });
  setTimeout(showBanner, 7000);
})();
