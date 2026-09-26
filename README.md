# First Solve

An interactive course that teaches the beginner layer-by-layer Rubik's Cube solve in eight steps,
with a live 3D cube instead of static diagrams. English by default, Polish behind the language
toggle. Live at <https://firstsolve.tinkered.app>.

## Running it

Open [public/index.html](public/index.html) in a browser; it works straight from disk. To run it as
production does, see the commands in [AGENTS.md](AGENTS.md).

## Data

No accounts, no analytics, no server-side storage and no third-party requests (opened from disk,
the page loads the cube library from `cdn.cubing.net`). The browser's
`localStorage` keeps the chosen language, theme and finished steps on the device. The notice for
visitors is [public/privacy.html](public/privacy.html), linked from the footer.

The site is static assets on a Cloudflare Worker, with no Worker script and request logging turned
off ([wrangler.jsonc](wrangler.jsonc)). Restoring it means redeploying a known-good commit; there is
no server-side data to restore.

## Credits

- Author: Kuba (kuba@tinkered.app)
- 3D cube: [cubing.js](https://github.com/cubing/cubing.js), vendored unmodified under MPL-2.0, see
  [public/vendor/cubing/NOTICE.md](public/vendor/cubing/NOTICE.md)
- Fonts: Rubik and Atkinson Hyperlegible Next, SIL Open Font License 1.1, licence texts in
  [public/fonts/](public/fonts)
