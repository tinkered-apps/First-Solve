/* Privacy page: shows the note in the language chosen in the app and keeps the top bar's
   language and theme controls working. Both are read from, and saved to, the same
   localStorage keys as app.js, so the two pages stay in step. */
(function () {
  "use strict";

  const dicts = { pl: window.I18N_PL, en: window.I18N_EN };
  const TITLE = { en: "Data and privacy · First Solve", pl: "Dane i prywatność · First Solve" };
  /* same cycle, colours and icons as the theme button in app.js */
  const THEMES = ["system", "light", "dark"];
  const THEME_COLOR = { light: "#e9eaee", dark: "#0f1013" };
  const THEME_ICON = {
    system: '<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 14h4M8 11v3"/>',
    light:
      '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
    dark: '<path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.7 5.7 0 1 0 7.1 7.1z"/>'
  };

  let lang = "en";
  let theme = window.FIRST_SOLVE_THEME.value;
  try {
    const savedLang = localStorage.getItem("kostka-lang");
    if (savedLang in dicts) lang = savedLang;
  } catch {}

  const t = (key) => dicts[lang][key];

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = TITLE[lang];
    document.querySelectorAll("[data-locale]").forEach((el) => {
      el.hidden = el.dataset.locale !== lang;
    });
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18n);
    });
    const wrap = document.getElementById("lang-toggle");
    wrap.setAttribute("aria-label", t("nav.language"));
    wrap.innerHTML = ["en", "pl"]
      .map(
        (code) =>
          `<button type="button" data-lang="${code}" aria-pressed="${code === lang}">${code.toUpperCase()}</button>`
      )
      .join("");
    applyTheme();
  }

  function applyTheme() {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (m.dataset.auto === undefined) m.dataset.auto = m.content;
      m.content = theme === "system" ? m.dataset.auto : THEME_COLOR[theme];
    });
    const btn = document.getElementById("theme-toggle");
    const label = `${t("nav.theme")}: ${t("theme." + theme)}`;
    btn.setAttribute("aria-label", label);
    btn.title = label;
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" ' +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${THEME_ICON[theme]}</svg>`;
    document.querySelector(".brand").href = window.FIRST_SOLVE_THEME.href("index.html");
    document.querySelector(".nav-link").href = window.FIRST_SOLVE_THEME.href("index.html", "#/sciaga");
  }

  document.getElementById("lang-toggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang]");
    if (!btn || btn.dataset.lang === lang) return;
    lang = btn.dataset.lang;
    try {
      localStorage.setItem("kostka-lang", lang);
    } catch {}
    applyLang();
  });

  document.getElementById("theme-toggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    window.FIRST_SOLVE_THEME.save(theme);
    applyTheme();
  });
  window.addEventListener("pageshow", () => {
    const restored = window.FIRST_SOLVE_THEME.refresh();
    if (restored !== theme) {
      theme = restored;
      applyTheme();
    }
  });

  applyLang();
})();
