# Agent notes

## Commands

```bash
npm install                       # dev tooling only: wrangler, @playwright/test, @axe-core/playwright, eslint
npx playwright install chromium   # once, before the first e2e run
npm start                         # wrangler dev on http://localhost:8787, production headers
npm test                          # ESLint (eslint.config.mjs), then scripts/check.js: syntax, PL/EN keys, SHELL and manifest files, version
npm run test:e2e                  # Playwright, desktop and mobile, against npm start; includes an axe scan and an offline run
npm run deploy                    # npm test, then wrangler deploy
```

- `.claude/launch.json` has `cube-app` (plain static server on port 8666) and `cube-app-worker`
  (`npm start`). `public/index.html` must also keep working opened from disk.
- Deploys: Worker `first-solve`, custom domain `firstsolve.tinkered.app`, one environment (no data,
  no migrations). Workers Builds (Worker settings, Builds) deploys pushes to `main` with an empty
  build command and `npm run deploy` as the deploy command; other branches run `npm test` only.
- Playwright is not part of the deploy gate: the Workers Builds image cannot start Chromium (no
  root, no system libraries). Run `npm run test:e2e` locally before pushing UI changes.
- `allowScripts` in `package.json` pins the `esbuild` and `workerd` versions whose install scripts
  npm may run. Update it when a Wrangler upgrade changes those versions.

## Versions

- `APP_VERSION` in `public/js/app.js` is the version shown in the footer, starting at 1.00.
- `CACHE` in `public/sw.js` names the service worker cache and carries the same number
  (`first-solve-v1.00`). Changing it makes installed copies drop the old cache.
- Bump both together on a user-visible release and whenever `SHELL` or the caching rules change.
  `npm test` fails if they differ.

## Conventions and constraints

- **No build step, on purpose.** `package.json` holds dev tooling only; the browser loads
  `public/` as written. Never introduce top-level ES-module imports or a bundler. `cubing.js` is the
  sole exception, loaded via dynamic `import()` inside `boot()` in `public/js/app.js`: from
  `public/vendor/cubing/` over http(s), from `cdn.cubing.net` under `file://` (browsers block local
  modules there).
- **Only `public/` is served.** Keep docs, scripts, tests and config outside it.
- **Vendored cubing.js is pinned.** Do not edit files in `public/vendor/cubing/js/`. To update, run
  `node scripts/vendor-cubing.js`, set the version in `public/vendor/cubing/NOTICE.md` and the footer
  link in `app.js`, and test the cube in the home, lesson and cheat-sheet views.
- **Service worker.** `public/sw.js` caches same-origin files only, network-first, and registers only
  on http(s). Every file a page loads goes in `SHELL`, the vendored cubing.js scripts included, so a
  fresh install has the cube offline. `npm test` fails if one is missing. Pages are listed by the URL
  the host serves (`./`, `privacy`), never the `.html` form: the host redirects that form, and a cached
  redirect cannot open a page offline. The fetch handler maps an offline `.html` visit to the clean URL.
- **Link preview.** The `og:*` tags in `public/index.html` point to `public/icons/social-card.png`
  (1200×630). They are static English with absolute URLs because crawlers do not run scripts; the
  image is not in `SHELL` because no page loads it.
- **Cube behavior is settled; do not touch it.** Cube rendering, cube states, algorithms, setup
  strings, stickering, per-orbit masks and the autoplay-loop logic in `public/js/steps.js`, plus the
  player wiring (`configurePlayer`, the autoplay loop, the hero loop) in `public/js/app.js`, are
  verified against cubing.js's kpuzzle and must not be changed.
- **Languages.** English is the default, Polish the alternative. Copy lives in
  `public/js/i18n/en.js` and `public/js/i18n/pl.js`; change both and keep their keys in parity. The
  fallback text in `index.html` is English. Route slugs stay Polish (`#/krok/…`, `#/sciaga`) so
  existing links keep working.
- **Theme.** `data-theme` on `<html>` is `light` or `dark`; absent means follow the system. Dark
  tokens live in two identical blocks in `public/css/style.css`; change both.
- **Security headers.** `public/_headers` sets a strict CSP (`script-src 'self'`): no inline scripts,
  no external origins. Inline styles are allowed. `npm run test:e2e` fails on a CSP violation.
- **Footer.** The credit reads "First Solve vX.XX by Kuba · tinkered.app · Privacy": Kuba links to
  `mailto:kuba@tinkered.app`, tinkered.app to `https://tinkered.app`, Privacy to `privacy.html`.
  The tinkered.app logo is inlined (`TINKERED_LOGO` in `app.js`), so nothing loads from another
  origin; its blue `#0070fc` is fixed.
- **No emoji in the UI chrome.** Icons are small stroked SVGs (`ICON` in `public/js/app.js`).
- **`prefers-reduced-motion` must stay honored** (disables confetti, card pulsing, hero autoplay).
- **Twisty-player elements:** never set `display` on them. Size them by width with `aspect-ratio`,
  not a fixed height. The exception is a player that fills a container with its own aspect ratio
  (the hero cube face and the cheat-sheet cubes), where it takes 100% of that container.
- **Privacy.** No accounts, analytics, third-party requests or server-side data. Adding any of them
  needs a new legal check (`audyt-prawny-pl`) and an update to the privacy page first.
- **Privacy page.** `public/privacy.html` (EN and PL articles) with `public/js/privacy.js`, which
  shares `kostka-lang` and `kostka-theme` with the app. The hosting, email and rights sections come
  from the shared tinkered.app template (`.tinkered-legal/privacy-template.html` beside the repos)
  and are not reworded per app; the table of what the app stores in the browser is this app's own.
  Update it when a `localStorage` key or the cache changes. Links use file names (`privacy.html`,
  `index.html#/sciaga`) so they work from disk. `noindex` is set in the page and in `_headers`.
