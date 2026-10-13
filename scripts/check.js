/* Pre-deploy check: `node scripts/check.js`. No dependencies. Verifies that scripts
   parse, PL and EN copy have identical keys, files the manifest and service
   worker point at exist, CACHE matches APP_VERSION, and pages have no inline
   scripts. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..", "public");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const errors = [];

for (const f of ["js/theme-init.js", "js/boot-check.js", "js/app.js", "js/privacy.js", "js/steps.js", "js/i18n/pl.js", "js/i18n/en.js", "sw.js"]) {
  try {
    new vm.Script(read(f), { filename: f });
  } catch (e) {
    errors.push(`syntax error in ${f}: ${e.message}`);
  }
}

const load = (f, name) => {
  const sandbox = { window: {} };
  vm.runInNewContext(read(f), sandbox);
  return sandbox.window[name];
};
const pl = load("js/i18n/pl.js", "I18N_PL");
const en = load("js/i18n/en.js", "I18N_EN");
for (const k of Object.keys(pl)) if (!(k in en)) errors.push(`missing in EN: ${k}`);
for (const k of Object.keys(en)) if (!(k in pl)) errors.push(`missing in PL: ${k}`);

const manifest = JSON.parse(read("manifest.webmanifest"));
const shell = [...read("sw.js").matchAll(/^\s+"([^"]+)",?$/gm)].map((m) => m[1]);
/* The host serves privacy.html at /privacy and redirects the .html form there.
   A cached redirect cannot open a page offline, so SHELL lists the served URL. */
for (const f of shell.filter((s) => s.endsWith(".html")))
  errors.push(`sw.js SHELL lists ${f}: use the URL without .html ("./" for index.html)`);
for (const f of [...manifest.icons.map((i) => i.src), ...shell.filter((s) => s !== "./")])
  if (!fs.existsSync(path.join(root, f)) && !fs.existsSync(path.join(root, `${f}.html`)))
    errors.push(`referenced file not found: ${f}`);

const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));
for (const f of walk("vendor").filter((f) => f.endsWith(".js")))
  if (!shell.includes(f)) errors.push(`vendored script missing from sw.js SHELL: ${f}`);

const appVersion = read("js/app.js").match(/const APP_VERSION = "([^"]+)"/)?.[1];
const cacheName = read("sw.js").match(/const CACHE = "([^"]+)"/)?.[1];
if (cacheName !== `first-solve-v${appVersion}`)
  errors.push(`CACHE in sw.js (${cacheName}) must be first-solve-v${appVersion}, matching APP_VERSION`);

/* The CSP allows script-src 'self' only. */
for (const f of ["index.html", "privacy.html"])
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(read(f))) errors.push(`inline script in ${f}: move it to a file`);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok: ${Object.keys(pl).length} i18n keys, ${shell.length} cached files`);
