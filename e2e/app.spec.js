const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const fs = require("node:fs");
const path = require("node:path");

// Read from the source so a version bump does not need a matching edit here.
const APP_VERSION = fs.readFileSync(path.resolve(__dirname, "../public/js/app.js"), "utf8")
  .match(/const APP_VERSION = "([^"]+)"/)[1];

/* Collects console errors, which fail the test. Requests to other origins are
   reported as warnings: avoiding them is a goal, not a hard limit. */
function watch(page) {
  const problems = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol !== "data:")
      warnThirdParty(r.url());
  });
  return problems;
}

function warnThirdParty(url) {
  test.info().annotations.push({ type: "warning", description: `third-party request: ${url}` });
  console.warn(`warning: third-party request: ${url}`);
}

const cubeLoaded = (page) =>
  expect.poll(() => page.evaluate(() => !!customElements.get("twisty-player"))).toBe(true);

test("home opens in English with the 3D cube and no horizontal scroll", async ({ page }) => {
  const problems = watch(page);
  const res = await page.goto("/");
  expect(res.headers()["content-security-policy"]).toContain("script-src 'self';");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Let's go!")).toBeVisible();
  const credit = page.locator(".footer-credit");
  await expect(credit).toHaveText(`First Solve v${APP_VERSION} by Kuba · tinkered.app · Privacy`);
  await expect(credit.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "privacy.html");
  await expect(credit.getByRole("link", { name: "Kuba" })).toHaveAttribute("href", "mailto:kuba@tinkered.app");
  await expect(credit.getByRole("link", { name: "tinkered.app" })).toHaveAttribute("href", "https://tinkered.app");
  await cubeLoaded(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBe(0);
  expect(problems).toEqual([]);
});

test("the course starts from home and moves through slides", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  await page.getByText("Let's go!").click();
  await expect(page).toHaveURL(/#\/krok\/intro$/);
  await expect(page.locator("#view-lesson")).toBeVisible();
  const title = page.locator("#lesson-text-pane h2, #lesson-text-pane h1").first();
  const first = await title.textContent();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(title).not.toHaveText(first);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(title).toHaveText(first);
  expect(problems).toEqual([]);
});

test("the yellow cross ends after the dot case", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/#/krok/yellow-cross");
  await expect(page.locator(".dock-count")).toHaveText("1 / 5");
  await page.getByRole("button", { name: "Slide 5" }).click();
  await expect(page.getByRole("heading", { name: "The dot" })).toBeVisible();
  await expect(page.locator(".dock-count")).toHaveText("5 / 5");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".slide-done")).toBeVisible();
  await expect(page.locator(".dock-next")).toHaveAttribute("href", "#/krok/yellow-edges");
  expect(problems).toEqual([]);
});

test("the edge swap ends on the cube shown in the next slide", async ({ page }) => {
  await page.goto("/#/krok/yellow-edges");
  await page.getByRole("button", { name: "Slide 2" }).click();
  const player = page.locator("#lesson-player");
  const endPattern = await player.evaluate(async (cube) => {
    cube.pause();
    cube.jumpToEnd();
    return (await cube.experimentalModel.currentPattern.get()).patternData;
  });
  await page.getByRole("button", { name: "Slide 3" }).click();
  await expect(page.getByRole("heading", { name: "Edges done!" })).toBeVisible();
  await expect.poll(() => player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  )).toEqual(endPattern);
  await page.goto("/#/krok/yellow-corners");
  await page.getByRole("button", { name: "Slide 5" }).click();
  const solvedPattern = await player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  );
  expect(endPattern).not.toEqual(solvedPattern);
});

test("the corner swap leaves the twists shown in the next slide", async ({ page }) => {
  await page.goto("/#/krok/yellow-corners");
  await page.getByRole("button", { name: "Slide 2" }).click();
  const player = page.locator("#lesson-player");
  const endPattern = await player.evaluate(async (cube) => {
    cube.pause();
    cube.jumpToEnd();
    return (await cube.experimentalModel.currentPattern.get()).patternData;
  });
  await page.getByRole("button", { name: "Slide 3" }).click();
  await expect.poll(() => player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  )).toEqual(endPattern);
  await page.getByRole("button", { name: "Slide 5" }).click();
  const solvedPattern = await player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  );
  expect(endPattern).not.toEqual(solvedPattern);
});

test("the corner inserter finale ends on the solved cube", async ({ page }) => {
  await page.goto("/#/krok/yellow-corners");
  await page.getByRole("button", { name: "Slide 3" }).click();
  const player = page.locator("#lesson-player");
  const startPattern = await player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  );
  await page.getByRole("button", { name: "Slide 4" }).click();
  await expect.poll(() => player.evaluate(async (cube) => {
    cube.pause();
    cube.jumpToStart();
    return (await cube.experimentalModel.currentPattern.get()).patternData;
  })).toEqual(startPattern);
  const endPattern = await player.evaluate(async (cube) => {
    cube.jumpToEnd();
    return (await cube.experimentalModel.currentPattern.get()).patternData;
  });
  await page.getByRole("button", { name: "Slide 5" }).click();
  await expect.poll(() => player.evaluate(async (cube) =>
    (await cube.experimentalModel.currentPattern.get()).patternData
  )).toEqual(endPattern);
});

test("the cheat sheet opens from the header", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Cheat sheet", exact: true }).click();
  await expect(page).toHaveURL(/#\/sciaga$/);
  await expect(page.getByRole("heading", { name: "Algorithm cheat sheet" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("language and theme choices survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "PL" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await page.locator("#theme-toggle").click();
  const theme = await page.locator("html").getAttribute("data-theme");
  expect(["light", "dark"]).toContain(theme);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await expect(page.getByRole("link", { name: "Ściąga", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
});

test("the footer links to a privacy page that search engines skip", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "PL" }).click();
  await page.getByRole("link", { name: "Prywatność" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dane i prywatność");

  await page.getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Data and privacy");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("link", { name: "Cheat sheet", exact: true }).click();
  await expect(page).toHaveURL(/#\/sciaga$/);
  await expect(page.getByRole("heading", { name: "Algorithm cheat sheet" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("the home page carries a link preview with a large image", async ({ page, request }) => {
  await page.goto("/");
  const meta = (name) => page.locator(`meta[property="${name}"], meta[name="${name}"]`);
  await expect(meta("og:title")).toHaveAttribute("content", await page.title());
  await expect(meta("og:description")).toHaveAttribute("content", await meta("description").getAttribute("content"));
  await expect(meta("og:url")).toHaveAttribute("content", "https://firstsolve.tinkered.app/");
  await expect(meta("twitter:card")).toHaveAttribute("content", "summary_large_image");

  const image = new URL(await meta("og:image").getAttribute("content"));
  expect(image.origin).toBe("https://firstsolve.tinkered.app");
  const res = await request.get(image.pathname);
  expect(res.headers()["content-type"]).toBe("image/png");
  // Width and height sit at bytes 16 to 23 of a PNG.
  const png = await res.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
});

test("a fresh install opens every page offline, by either URL", async ({ page, context }) => {
  const problems = watch(page);
  await page.goto("/");
  await cubeLoaded(page);

  // Wait for the worker to control this page and to finish filling the cache, then cut the network.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    }
  });
  const shellSize = fs.readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8")
    .match(/^\s+"[^"]+",?$/gm).length;
  await expect.poll(
    () => page.evaluate(async () => {
      const [name] = await caches.keys();
      return name ? (await (await caches.open(name)).keys()).length : 0;
    }),
    { timeout: 15_000 }
  ).toBeGreaterThanOrEqual(shellSize);

  await context.setOffline(true);
  try {
    // The host redirects the .html forms to the clean URLs; offline, the worker has to map them.
    for (const url of ["/", "/index.html"]) {
      await page.goto(url);
      await expect(page.getByText("Let's go!"), url).toBeVisible();
      await cubeLoaded(page);
    }
    for (const url of ["/privacy", "/privacy.html"]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 }), url).toHaveText("Data and privacy");
    }
    await page.goto("/#/krok/white-cross");
    await expect(page.locator("#view-lesson")).toBeVisible();
    await cubeLoaded(page);
  } finally {
    await context.setOffline(false);
  }
  expect(problems).toEqual([]);
});

// The desktop and mobile projects cover both layouts; this covers both themes.
for (const theme of ["light", "dark"]) {
  test(`axe finds no accessibility violations in the ${theme} theme`, async ({ page }) => {
    // Reduced motion stops the pulsing cards, so contrast is measured on the final colours.
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    // Every view is scanned before the assertion, so one run lists all violations.
    const found = [];
    const scan = async (view) => {
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const violation of violations)
        for (const node of violation.nodes) found.push(`${view}: ${violation.id}: ${node.target.join(" ")}`);
    };

    await page.goto("/");
    await cubeLoaded(page);
    await expect(page.getByText("Let's go!")).toBeVisible();
    await scan("home");
    await page.goto("/#/krok/white-cross");
    await expect(page.locator("#view-lesson")).toBeVisible();
    await expect(page.locator("#lesson-text-pane h1, #lesson-text-pane h2").first()).toBeVisible();
    await scan("lesson");
    await page.goto("/#/sciaga");
    await expect(page.getByRole("heading", { name: "Algorithm cheat sheet" })).toBeVisible();
    await scan("cheat sheet");
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Data and privacy");
    await scan("privacy");
    expect(found).toEqual([]);
  });
}

test("the privacy page is sent with a noindex header", async ({ request }) => {
  const res = await request.get("/privacy");
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
});
