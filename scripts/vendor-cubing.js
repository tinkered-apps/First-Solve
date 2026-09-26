/* Copies the browser build of cubing.js that the app uses from the CDN into
   public/vendor/cubing/, following every relative import from the twisty
   entry point. Run `node scripts/vendor-cubing.js` to update, then test the
   cube in all views and update the version in public/vendor/cubing/NOTICE.md. */
const fs = require("fs");
const path = require("path");

const base = "https://cdn.cubing.net/v0/js/";
const out = path.join(__dirname, "..", "public", "vendor", "cubing", "js");
const imports = /(?:import|from)\s*\(?\s*["'`](\.{1,2}\/[^"'`]+)["'`]|new URL\(\s*["'`](\.{1,2}\/[^"'`]+)["'`]\s*,\s*import\.meta\.url/g;

(async () => {
  fs.rmSync(out, { recursive: true, force: true });
  const seen = new Set();
  const queue = ["cubing/twisty"];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const res = await fetch(base + rel);
    if (!res.ok) throw new Error(`${res.status} ${base + rel}`);
    const text = await res.text();
    /* The CDN entry has no extension; static hosts need .js to serve it as a module. */
    const file = path.join(out, rel === "cubing/twisty" ? "cubing/twisty.js" : rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    for (const m of text.matchAll(imports)) {
      const next = new URL(m[1] || m[2], base + rel).href.slice(base.length);
      if (!seen.has(next)) queue.push(next);
    }
  }
  console.log(`copied ${seen.size} files to ${path.relative(process.cwd(), out)}`);
})();
