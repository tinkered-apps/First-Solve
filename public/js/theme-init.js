/* Apply the theme before first paint and carry it between local HTML files. */
(function () {
  const key = "kostka-theme";
  const localFile = location.protocol === "file:";
  const tabPrefix = "first-solve-theme:";
  const tabValue = localFile && window.name.startsWith(tabPrefix)
    ? window.name.slice(tabPrefix.length) : null;
  const fromTab = ["system", "light", "dark"].includes(tabValue) ? tabValue : null;
  const incoming = localFile ? new URLSearchParams(location.search).get("theme") : null;
  const fromLink = ["system", "light", "dark"].includes(incoming) ? incoming : null;
  let theme = fromTab || fromLink || "system";

  try {
    if (fromLink || fromTab) {
      if (theme === "system") localStorage.removeItem(key);
      else localStorage.setItem(key, theme);
    } else {
      const saved = localStorage.getItem(key);
      if (saved === "light" || saved === "dark") theme = saved;
    }
  } catch (e) {}

  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
  if (localFile) window.name = tabPrefix + theme;

  function updateFileUrl(value) {
    const url = new URL(location.href);
    url.searchParams.set("theme", value);
    try { history.replaceState(null, "", url); } catch (e) {}
  }

  window.FIRST_SOLVE_THEME = {
    get value() { return theme; },
    save(value) {
      theme = value;
      try {
        if (value === "system") localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (e) {}
      if (localFile) {
        window.name = tabPrefix + value;
        updateFileUrl(value);
      }
    },
    href(file, hash = "") {
      return `${file}${localFile ? `?theme=${theme}` : ""}${hash}`;
    },
    refresh() {
      if (localFile && window.name.startsWith(tabPrefix)) {
        const value = window.name.slice(tabPrefix.length);
        if (["system", "light", "dark"].includes(value) && value !== theme) {
          this.save(value);
        }
      }
      return theme;
    }
  };
  if (localFile) window.addEventListener("load", () => {
    if (new URLSearchParams(location.search).get("theme") !== theme) updateFileUrl(theme);
  });
})();
