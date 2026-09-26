/* Classic script (runs when index.html is opened directly from disk, where
   ES-module imports are blocked). The 3D-cube library is loaded via dynamic
   import() in boot(): the copy in vendor/ over http(s), the CDN from file://.
   Wrapped in an IIFE so top-level names don't collide with steps.js. */
(function () {
  "use strict";

  // Version shown in the footer; CACHE in sw.js carries the same number (see AGENTS.md).
  const APP_VERSION = "1.00";

  const dicts = { pl: window.I18N_PL, en: window.I18N_EN };
  const steps = window.STEPS;
  const setupFor = window.setupFor;
  const algorithms = window.ALGORITHMS;
  const stepColor = window.STEP_COLOR;

  /* ---------- i18n ---------- */
  let lang = "en";
  try {
    const saved = localStorage.getItem("kostka-lang");
    if (saved in dicts) lang = saved;
  } catch {}
  const langListeners = [];

  function t(key) {
    const s = dicts[lang][key];
    if (s === undefined) {
      console.warn("missing i18n:", key);
      return key;
    }
    return s;
  }
  function onLangChange(fn) {
    langListeners.push(fn);
  }

/* ============================================================
   Marks. Icons are small authored SVGs; each step's icon is the
   3x3 face it finishes, drawn as rounded stickers.
   ============================================================ */

function icon(path, size, weight) {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" fill="none" ` +
    `stroke="currentColor" stroke-width="${weight || 2}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
  );
}
const ICON = {
  next: (s) => icon('<path d="M3 8h10M9 4l4 4-4 4"/>', s || 16),
  prev: (s) => icon('<path d="M13 8H3M7 4L3 8l4 4"/>', s || 16),
  check: (s) => icon('<path d="M3 8.5l3.2 3L13 4.5"/>', s || 16, 2.4)
};

/* tinkered.app logo, inlined so the footer loads nothing from another origin */
const TINKERED_LOGO =
  '<svg class="footer-logo" viewBox="79 180 1260 842" aria-hidden="true" focusable="false"><path class="footer-logo-t" fill-rule="evenodd" d="m 729.04769,199.78241 -621.00001,-1 -15.999996,3 -11,5 -13,9 -13,17 -5,13 -2,17.99999 1,68 3,11 7,12 15,14 20,7 H 277.04769 l 5,2 8,10 1,553 6,13 220.42051,-334.04584 -13.42051,-0.95416 -12,-6 -8,-8 -5,-12 -1,-200 2,-7 6,-7 7,-3 h 114 l 11,-4 6,-5 68,-103 38,-53.99999 1,-8 z"/><path class="footer-logo-a" fill-rule="evenodd" d="m 690.04769,623.7824 -5,-4 h -168 l -198,298 -24,34 5,9 12,11 9,4 10,2 h 200 l 15,-3 12,-6 6,-5 13,-17 157,-239 v -7 z m 95,-69 -7,9 -36,59 v 6 l 40,68 5,2 h 76 l 4,-2 41,-68 v -5 l -28,-50 -10,-17 -5,-3 z m 2,-352.99999 -15,17 -218,336.99999 -11,20 166,-1 7,-5 35,-57 8,-7 137,-1 7,3 7,8 57,103 1,9 -4,10 -66,103 -9,4 -124,1 -7,5 -33,51 -6,14 3,3 h 197 l 8,3 8,8 70.00001,125 12,13 15.9999,8 10,2 h 199 l 23,-8 15,-15 7,-16 1,-16 -4,-16 -357.99991,-675.99999 -17,-19 -11,-7 -15,-5 -87,-1 z"/></svg>';

const FACE = {
  w: "var(--c-white)",
  y: "var(--c-yellow)",
  r: "var(--c-red)",
  o: "var(--c-orange)",
  b: "var(--c-blue)",
  g: "var(--c-green)",
  k: "currentColor"
};
/* nine cells, reading order; "." is an unsolved cell */
const STEP_FACE = {
  "intro": "....k....",
  "daisy": ".w.wyw.w.",
  "white-cross": ".w.www.w.",
  "white-corners": "wwwwwwwww",
  "middle-layer": "...gggggg",
  "yellow-cross": ".y.yyy.y.",
  "yellow-edges": ".y.yyy.y.",
  "yellow-corners": "yyyyyyyyy"
};
/* the sides matched in step 6, drawn as bars outside the face */
const FACE_TICKS = {
  "yellow-edges": [
    ['x="10" y="-5" width="9" height="3" rx="1.5"', "b"],
    ['x="10" y="31" width="9" height="3" rx="1.5"', "g"],
    ['x="-5" y="10" width="3" height="9" rx="1.5"', "o"],
    ['x="31" y="10" width="3" height="9" rx="1.5"', "r"]
  ]
};

function faceChart(stepId, size) {
  const cells = STEP_FACE[stepId] || ".........";
  let out = `<rect x="-1" y="-1" width="32" height="32" rx="4" style="fill:var(--plastic)"/>`;
  for (let i = 0; i < 9; i++) {
    const c = cells[i];
    const x = (i % 3) * 10 + 0.75;
    const y = Math.floor(i / 3) * 10 + 0.75;
    const fill = c === "k" ? "var(--plastic-3)" : FACE[c] || "var(--plastic-2)";
    out += `<rect x="${x}" y="${y}" width="8.5" height="8.5" rx="2" style="fill:${fill}"/>`;
  }
  for (const [box, col] of FACE_TICKS[stepId] || [])
    out += `<rect ${box} style="fill:${FACE[col]}"/>`;
  return `<svg class="face" width="${size}" height="${size}" viewBox="-6 -6 42 42" aria-hidden="true">${out}</svg>`;
}

/* accents that need dark text on top of them */
const LIGHT_ACCENT = {
  "var(--c-yellow)": 1,
  "var(--c-white)": 1,
  "var(--c-orange)": 1,
  "var(--c-green)": 1
};
const toneOf = (step) => (LIGHT_ACCENT[step.color] ? "light" : "dark");

function applyStaticI18n() {
  document.documentElement.lang = lang;
  document.title = t("app.docTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  renderLangSwitch();
  applyTheme();
}

function renderLangSwitch() {
  const wrap = document.getElementById("lang-toggle");
  wrap.setAttribute("aria-label", t("nav.language"));
  wrap.innerHTML = ["en", "pl"]
    .map(
      (code) =>
        `<button type="button" data-lang="${code}" aria-pressed="${code === lang}">${code.toUpperCase()}</button>`
    )
    .join("");
}

document.getElementById("lang-toggle").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-lang]");
  if (!btn || btn.dataset.lang === lang) return;
  lang = btn.dataset.lang;
  try {
    localStorage.setItem("kostka-lang", lang);
  } catch {}
  applyStaticI18n();
  langListeners.forEach((fn) => fn());
});

/* ---------- theme: system -> light -> dark ---------- */
const THEMES = ["system", "light", "dark"];
const THEME_COLOR = { light: "#e9eaee", dark: "#0f1013" };
const THEME_ICON = {
  system: '<rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 14h4M8 11v3"/>',
  light:
    '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
  dark: '<path d="M13.5 9.6A5.7 5.7 0 0 1 6.4 2.5a5.7 5.7 0 1 0 7.1 7.1z"/>'
};
let theme = window.FIRST_SOLVE_THEME.value;

function applyTheme() {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  /* a forced theme overrides both media-scoped theme-color metas */
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    if (m.dataset.auto === undefined) m.dataset.auto = m.content;
    m.content = theme === "system" ? m.dataset.auto : THEME_COLOR[theme];
  });
  const btn = document.getElementById("theme-toggle");
  const label = `${t("nav.theme")}: ${t("theme." + theme)}`;
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = icon(THEME_ICON[theme], 18);
  const privacyLink = document.getElementById("privacy-link");
  if (privacyLink) privacyLink.href = window.FIRST_SOLVE_THEME.href("privacy.html");
}

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

/* ---------- progress ---------- */
function getProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem("kostka-progress") || "[]"));
  } catch {
    return new Set();
  }
}
function markDone(stepId) {
  const done = getProgress();
  done.add(stepId);
  try {
    localStorage.setItem("kostka-progress", JSON.stringify([...done]));
  } catch {}
}

/* ---------- confetti ---------- */
const CONFETTI_COLORS = ["#ffd500", "#e0402f", "#ff8c1a", "#2f6de0", "#2bb673", "#f4f4f0"];
function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.getElementById("confetti-canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const parts = [];
  for (let i = 0; i < 140; i++) {
    parts.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.3,
      y: canvas.height * 0.25,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 10 - 3,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 7 + Math.random() * 7,
      h: 5 + Math.random() * 5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]
    });
  }
  const t0 = performance.now();
  function frame(now) {
    const dt = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += 0.25 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (now - t0 < 2600) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  requestAnimationFrame(frame);
}

/* ---------- notation chips ---------- */
/* each move is a sticker in the colour of the face it turns; the letter
   carries the meaning, so colour is never the only signal */
const FACE_OF_MOVE = { U: "white", D: "yellow", F: "green", B: "blue", R: "red", L: "orange" };
function moveLabel(tok) {
  const face = t("face." + tok[0]) || tok[0];
  const suffix = tok.endsWith("'")
    ? " " + t("face.prime")
    : tok.endsWith("2")
      ? " " + t("face.double")
      : "";
  return face + suffix;
}
function chipsHtml(alg) {
  const moves = alg.trim().split(/\s+/);
  const cells = moves
    .map((tok) => {
      const face = FACE_OF_MOVE[tok[0]] || "neutral";
      const label = FACE_OF_MOVE[tok[0]] ? moveLabel(tok) : tok;
      return `<span class="chip chip-${face}" role="img" aria-label="${label}">${tok.replace("'", "′")}</span>`;
    })
    .join("");
  return (
    `<div class="chips"><div class="chip-row">${cells}</div>` +
    `<span class="chips-count">${t("unit.moves")}: ${moves.length}</span></div>`
  );
}

/* ---------- lesson engine ---------- */
let stepIdx = 0;
let slideIdx = 0; // steps[stepIdx].slides.length == completion card
let celebrated = false;
let lastRendered = { step: -1, slide: -1 };

function stepById(id) {
  return Math.max(0, steps.findIndex((s) => s.id === id));
}

/* Autoplay looping: keep the demo playing on a gentle loop instead of
   freezing on the final frame (so you always catch it running, even if you
   land on the slide mid-read). One listener is wired up at boot; per-slide
   state lives in loopState. */
const END_PAUSE = 1200; // ms holding the finished state before replaying
const START_PAUSE = 500; // ms showing the start state before it plays again
const loopState = { active: false, token: 0, started: false, timer: null };

function stopAutoplayLoop() {
  loopState.active = false;
  loopState.started = false;
  loopState.token++;
  if (loopState.timer) {
    clearTimeout(loopState.timer);
    loopState.timer = null;
  }
}

function initAutoplayLoop(player) {
  player.experimentalModel.coarseTimelineInfo.addFreshListener((info) => {
    if (!loopState.active) return;
    if (info.playing) {
      loopState.started = true;
      return;
    }
    // playback stopped; if it ran to the end, schedule a replay
    if (loopState.started && info.atEnd && !loopState.timer) {
      const tk = loopState.token;
      loopState.timer = setTimeout(() => {
        loopState.timer = null;
        if (!loopState.active || tk !== loopState.token) return;
        player.jumpToStart();
        loopState.started = false;
        loopState.timer = setTimeout(() => {
          loopState.timer = null;
          if (!loopState.active || tk !== loopState.token) return;
          player.play();
        }, START_PAUSE);
      }, END_PAUSE);
    }
  });
}

function configurePlayer(slide) {
  const p = document.getElementById("lesson-player");
  stopAutoplayLoop();
  p.pause();
  p.experimentalSetupAlg = setupFor(slide);
  p.alg = slide.alg || "";
  p.experimentalStickering = slide.stickering || "full";
  // per-piece highlight mask (e.g. "only the edges"); clear it otherwise
  if (slide.mask) p.setAttribute("experimental-stickering-mask-orbits", slide.mask);
  else p.removeAttribute("experimental-stickering-mask-orbits");
  p.setAttribute("control-panel", slide.alg ? "bottom-row" : "none");
  p.timestamp = 0;
  if (slide.alg && slide.autoplay) {
    loopState.active = true;
    loopState.started = false;
    p.jumpToStart();
    p.play();
  }
}

// Undo any manual drag-rotation left over from a previous slide: the
// element is reused across slides, so without this a demo can open facing
// the wrong way. Values are this cube's default Cube3D orbit (white U,
// green F).
function resetLessonCamera() {
  const p = document.getElementById("lesson-player");
  p.cameraLatitude = 35;
  p.cameraLongitude = 30;
  p.cameraDistance = 6;
}

/* the course strip: every step as a sticker; the current one is ringed */
function renderLessonTop(step) {
  const done = getProgress();
  const stickers = steps
    .map((s, i) => {
      const cls = [
        "strip-sticker",
        done.has(s.id) ? "is-done" : "",
        i === stepIdx ? "is-current" : ""
      ].join(" ");
      return (
        `<a class="${cls}" href="#/krok/${s.id}" style="--accent:${s.color}" data-tone="${toneOf(s)}"` +
        `${i === stepIdx ? ' aria-current="step"' : ""} aria-label="${t("lesson.step")} ${i + 1}: ${t(s.id + ".name")}">` +
        `${done.has(s.id) && i !== stepIdx ? ICON.check(12) : i + 1}</a>`
      );
    })
    .join("");
  document.getElementById("lesson-top").innerHTML = `
    <nav class="strip" aria-label="${t("home.steps.title")}">${stickers}</nav>
    <div class="lesson-where">
      <span class="lesson-where-count">${t("lesson.step")} ${stepIdx + 1}/${steps.length}</span>
      <span class="lesson-where-name">${t(step.id + ".name")}</span>
    </div>`;
}

function renderDock(step, done) {
  const total = step.slides.length;
  let segs = "";
  for (let i = 0; i <= total; i++) {
    const isEnd = i === total;
    const state = i < slideIdx ? " is-past" : i === slideIdx ? " is-current" : "";
    const label = isEnd ? t("lesson.stepDone") : `${t("lesson.slide")} ${i + 1}`;
    segs +=
      `<button type="button" class="seg${isEnd ? " seg-end" : ""}${state}" data-jump="${i}"` +
      `${i === slideIdx ? ' aria-current="true"' : ""} aria-label="${label}"><span></span></button>`;
  }
  const count = done ? t("lesson.doneShort") : `${slideIdx + 1} / ${total}`;
  const last = stepIdx === steps.length - 1;
  const next = done
    ? last
      ? `<a class="btn btn-primary dock-next" href="#/sciaga">${t("lesson.toCheatsheet")}${ICON.next()}</a>`
      : `<a class="btn btn-primary dock-next" href="#/krok/${steps[stepIdx + 1].id}">${t("lesson.nextStep")}${ICON.next()}</a>`
    : `<button type="button" class="btn btn-primary dock-next" id="slide-next">${t("lesson.next")}${ICON.next()}</button>`;

  document.getElementById("lesson-dock").innerHTML = `
    <div class="dock-inner" style="--accent:${step.color}">
      <button type="button" class="btn btn-ghost dock-back" id="slide-back" aria-label="${t("lesson.back")}" ${slideIdx === 0 ? "disabled" : ""}>${ICON.prev()}<span>${t("lesson.back")}</span></button>
      <div class="dock-progress">
        <div class="segs" role="group" aria-label="${t("lesson.jump")}">${segs}</div>
        <span class="dock-count">${count}</span>
      </div>
      ${next}
    </div>`;
}

function renderLesson() {
  const step = steps[stepIdx];
  const pane = document.getElementById("lesson-text-pane");
  const done = slideIdx >= step.slides.length;

  // direction of travel, for the text's entrance
  const dir =
    lastRendered.step !== stepIdx || slideIdx >= lastRendered.slide ? "fwd" : "back";
  const moved = lastRendered.step !== stepIdx || lastRendered.slide !== slideIdx;
  lastRendered = { step: stepIdx, slide: slideIdx };
  pane.dataset.dir = moved ? dir : "none";

  renderLessonTop(step);

  if (!done) {
    const slide = step.slides[slideIdx];
    configurePlayer(slide);
    resetLessonCamera();
    pane.innerHTML = `
      <div class="slide">
        <h1 class="slide-title">${t(slide.key + ".title")}</h1>
        <p class="slide-body">${t(slide.key + ".body")}</p>
        ${slide.chips && slide.alg ? chipsHtml(slide.alg) : ""}
      </div>`;
  } else {
    if (!celebrated) {
      celebrated = true;
      markDone(step.id);
      fireConfetti();
      renderLessonTop(step);
    }
    const last = stepIdx === steps.length - 1;
    const titleKey = last ? "lesson.finished.title" : "lesson.bravo.title";
    const bodyKey = last ? "lesson.finished.body" : "lesson.bravo.body";
    let nextCard;
    if (last) {
      nextCard = `
        <a class="next-card" href="#/sciaga">
          <span class="next-card-mark mini-stickers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
          <span class="next-card-text">
            <span class="next-card-eyebrow">${t("nav.cheatsheet")}</span>
            <span class="next-card-name">${t("home.cheatsheet.title")}</span>
          </span>
          <span class="next-card-go" aria-hidden="true">${ICON.next(20)}</span>
        </a>`;
    } else {
      const ns = steps[stepIdx + 1];
      nextCard = `
        <a class="next-card" href="#/krok/${ns.id}">
          <span class="next-card-mark">${faceChart(ns.id, 56)}</span>
          <span class="next-card-text">
            <span class="next-card-eyebrow">${t("lesson.nextStep")} · ${stepIdx + 2}/${steps.length}</span>
            <span class="next-card-name">${t(ns.id + ".name")}</span>
            <span class="next-card-meta">${t("unit.slides")}: ${ns.slides.length}</span>
          </span>
          <span class="next-card-go" aria-hidden="true">${ICON.next(20)}</span>
        </a>`;
    }
    pane.innerHTML = `
      <div class="slide slide-done">
        <div class="done-badge" style="--accent:${step.color}" data-tone="${toneOf(step)}">
          ${faceChart(step.id, 44)}
          <span>${ICON.check(14)}${t(step.id + ".name")} · ${t("lesson.stepDone")}</span>
        </div>
        <h1 class="slide-title">${t(titleKey)}</h1>
        <p class="slide-body">${t(bodyKey)}</p>
        ${nextCard}
      </div>`;
  }

  renderDock(step, done);

  const dock = document.getElementById("lesson-dock");
  dock.querySelector("#slide-back")?.addEventListener("click", goBack);
  dock.querySelector("#slide-next")?.addEventListener("click", goNext);
  dock.querySelectorAll("[data-jump]").forEach((b) =>
    b.addEventListener("click", () => {
      const to = Number(b.dataset.jump);
      if (to === slideIdx) return;
      slideIdx = to;
      renderLesson();
    })
  );
}

function goNext() {
  const step = steps[stepIdx];
  if (slideIdx < step.slides.length) {
    slideIdx++;
    renderLesson();
  } else if (stepIdx < steps.length - 1) {
    location.hash = `#/krok/${steps[stepIdx + 1].id}`;
  } else {
    location.hash = "#/sciaga";
  }
}
function goBack() {
  if (slideIdx > 0) {
    slideIdx--;
    renderLesson();
  }
}

/* arrow keys move through the deck, so a hand holding a cube can use the keyboard */
document.addEventListener("keydown", (e) => {
  if (document.getElementById("view-lesson").classList.contains("hidden")) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest && e.target.closest("input, textarea, select, twisty-player")) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    goNext();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    goBack();
  }
});

/* tempo control */
let currentSpeed = 0.5;
function buildSpeedControls() {
  const wrap = document.getElementById("speed-controls");
  const speeds = [0.5, 1, 2];
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", t("player.speed"));
  wrap.innerHTML =
    `<span class="speed-label" aria-hidden="true">${t("player.speed")}</span>` +
    speeds
      .map(
        (s) =>
          `<button type="button" data-speed="${s}" aria-pressed="${s === currentSpeed}">${s}×</button>`
      )
      .join("");
  wrap.querySelectorAll("[data-speed]").forEach((b) =>
    b.addEventListener("click", () => {
      currentSpeed = Number(b.dataset.speed);
      document.getElementById("lesson-player").tempoScale = currentSpeed;
      wrap.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
    })
  );
}

/* ---------- home screen ---------- */
const HERO_ALG = "R U R' U' F' U2 F R U R' F R U R' U'"; // pleasant idle loop
let heroTimer = null;

function stopHeroLoop() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

function startHeroLoop(player) {
  stopHeroLoop();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    player.alg = "";
    return;
  }
  const replay = () => {
    player.alg = HERO_ALG;
    player.timestamp = 0;
    player.play();
  };
  replay();
  heroTimer = setInterval(replay, 9000);
}

function firstUndoneStep() {
  const done = getProgress();
  const step = steps.find((s) => !done.has(s.id));
  return step || steps[steps.length - 1];
}

/* the steps run clockwise around the centre, like stickers round a centre piece */
const RING = [
  [1, 1], [1, 2], [1, 3],
  [2, 3], [3, 3], [3, 2],
  [3, 1], [2, 1]
];

function renderHome() {
  const done = getProgress();
  const nextStep = firstUndoneStep();
  const hasProgress = done.size > 0;
  const view = document.getElementById("view-home");

  const stickers = steps
    .map((step, i) => {
      const isDone = done.has(step.id);
      const isNext = step.id === nextStep.id && !isDone;
      const state = isDone ? "is-done" : isNext ? "is-next" : "is-todo";
      const badge = isDone
        ? `<span class="sticker-badge" aria-label="${t("home.worked")}">${ICON.check(14)}</span>`
        : isNext
          ? `<span class="sticker-badge sticker-here">${t("home.marker")}</span>`
          : "";
      const [r, c] = RING[i];
      return `
        <a class="sticker ${state}" href="#/krok/${step.id}" data-tone="${toneOf(step)}"
           style="--accent:${step.color};grid-area:${r} / ${c};--i:${i}">
          <span class="sticker-top">
            <span class="sticker-num">${i + 1}</span>
            ${badge}
          </span>
          <span class="sticker-name">${t(step.id + ".name")}</span>
        </a>`;
    })
    .join("");

  const ctaLabel = hasProgress ? t("home.continue") : t("home.start");
  const ctaStep = nextStep;

  view.innerHTML = `
    <div class="home-intro">
      <h1 class="home-title">${t("app.title")}</h1>
      <p class="home-lead">${t("home.subtitle")}</p>
      <a class="cta" href="#/krok/${ctaStep.id}">
        <span class="cta-text">
          <span class="cta-label">${ctaLabel}</span>
          <span class="cta-sub">${t("lesson.step")} ${stepById(ctaStep.id) + 1} · ${t(ctaStep.id + ".name")}</span>
        </span>
        <span class="cta-go" aria-hidden="true">${ICON.next(22)}</span>
      </a>
      <div class="home-progress" aria-label="${t("home.worked")} ${done.size}/${steps.length}">
        <span class="home-progress-bar" aria-hidden="true">${steps
          .map((s) => `<i class="${done.has(s.id) ? "on" : ""}" style="--accent:${s.color}"></i>`)
          .join("")}</span>
        <span>${t("home.worked")}: <b>${done.size}/${steps.length}</b></span>
      </div>
    </div>
    <div class="home-face-wrap">
      <nav class="home-face" aria-label="${t("home.steps.title")}">
        ${stickers}
        <div class="face-center" style="grid-area:2 / 2">
          <twisty-player id="hero-player" background="none" control-panel="none"
            hint-facelets="none" tempo-scale="0.9" visualization="3D"></twisty-player>
        </div>
      </nav>
      <p class="home-face-caption">${t("home.steps.title")}</p>
    </div>
    <a class="side-link" href="#/sciaga">
      <span class="mini-stickers" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      <span class="side-link-text">
        <b>${t("home.cheatsheet.title")}</b>
        <span>${t("home.cheatsheet.body")}</span>
      </span>
      <span class="side-link-go" aria-hidden="true">${ICON.next(18)}</span>
    </a>
    <footer class="app-footer" aria-label="${t("footer.label")}">
      <p class="footer-credit">First Solve v${APP_VERSION} by <a href="mailto:kuba@tinkered.app">Kuba</a> · <a href="https://tinkered.app">${TINKERED_LOGO}tinkered.app</a> · <a id="privacy-link" href="${window.FIRST_SOLVE_THEME.href("privacy.html")}">${t("footer.privacy")}</a></p>
      <span class="app-footer-credit">
        <a href="https://github.com/cubing/cubing.js/tree/v0.63.6" target="_blank" rel="noopener noreferrer">${t("footer.cubing")}</a>
      </span>
    </footer>`;

  startHeroLoop(view.querySelector("#hero-player"));
}

/* ---------- cheat sheet ---------- */
function makeCheatCube(holder) {
  if (holder.querySelector("twisty-player")) return;
  const player = document.createElement("twisty-player");
  player.setAttribute("background", "none");
  player.setAttribute("control-panel", "bottom-row");
  player.setAttribute("hint-facelets", "none");
  player.experimentalSetupAlg = holder.dataset.setup;
  player.alg = holder.dataset.alg;
  player.tempoScale = 1.4;
  holder.appendChild(player);
}

/* the notation key: the six letters, their faces, and what a mark means */
function keyBoxHtml() {
  const order = ["U", "D", "F", "B", "R", "L"];
  const items = order
    .map(
      (letter) => `
      <div class="key-item">
        <span class="chip chip-${FACE_OF_MOVE[letter]}" aria-hidden="true">${letter}</span>
        <span class="key-text">
          <span class="key-word">${t("face." + letter)}</span>
          <span class="key-sub">${t("face." + letter + ".sub")}</span>
        </span>
      </div>`
    )
    .join("");
  return `
    <section class="key-box">
      <div class="key-box-head">
        <h2>${t("cheat.key.title")}</h2>
        <span>${t("cheat.key.lead")}</span>
      </div>
      <div class="key-grid">${items}</div>
      <div class="key-notes">
        <span><b class="chip chip-red">R</b>${t("cheat.key.plain")}</span>
        <span><b class="chip chip-red">R′</b>${t("cheat.key.primeNote")}</span>
        <span><b class="chip chip-red">R2</b>${t("cheat.key.doubleNote")}</span>
      </div>
    </section>`;
}

function renderCheatsheet() {
  const view = document.getElementById("view-cheatsheet");

  // group algorithms by step, preserving course order
  const groups = [];
  for (const alg of algorithms) {
    let g = groups.find((x) => x.step === alg.step);
    if (!g) {
      g = { step: alg.step, items: [] };
      groups.push(g);
    }
    g.items.push(alg);
  }

  const groupsHtml = groups
    .map(
      (g) => `
      <section class="cheat-group">
        <a class="cheat-group-head" href="#/krok/${g.step}">
          ${faceChart(g.step, 40)}
          <span class="cheat-group-text">
            <span class="cheat-group-step">${t("lesson.step")} ${stepById(g.step) + 1}</span>
            <h2>${t(g.step + ".name")}</h2>
          </span>
        </a>
        <div class="cheat-cards">
          ${g.items
            .map(
              (a) => `
            <article class="cheat-card" style="--accent:${stepColor[g.step]}">
              <h3 class="cheat-name">${t(a.key)}</h3>
              ${chipsHtml(a.alg)}
              <div class="cheat-cube" data-setup="${a.setup}" data-alg="${a.alg}"></div>
            </article>`
            )
            .join("")}
        </div>
      </section>`
    )
    .join("");

  view.innerHTML = `
    <header class="cheat-head">
      <a class="back-link" href="#/">${ICON.prev()}${t("cheat.back")}</a>
      <h1 class="cheat-title">${t("cheat.title")}</h1>
      <p class="cheat-lead">${t("cheat.intro")}</p>
    </header>
    ${keyBoxHtml()}
    ${groupsHtml}`;

  view.querySelectorAll(".cheat-cube").forEach(makeCheatCube);
}

/* ---------- router ---------- */
const views = ["home", "lesson", "cheatsheet"];
function showView(name) {
  for (const v of views)
    document.getElementById(`view-${v}`).classList.toggle("hidden", v !== name);
  document.body.dataset.view = name;
  const nav = document.getElementById("nav-cheatsheet");
  if (name === "cheatsheet") nav.setAttribute("aria-current", "page");
  else nav.removeAttribute("aria-current");
}
function route() {
  const h = location.hash;
  if (h.startsWith("#/krok/")) {
    const id = h.slice("#/krok/".length);
    const idx = stepById(id);
    if (idx !== stepIdx || location.hash !== route.lastHash) {
      stepIdx = idx;
      slideIdx = 0;
      celebrated = false;
    }
    route.lastHash = location.hash;
    showView("lesson");
    stopHeroLoop();
    renderLesson();
    window.scrollTo(0, 0);
  } else if (h === "#/sciaga") {
    route.lastHash = h;
    showView("cheatsheet");
    stopHeroLoop();
    renderCheatsheet();
    window.scrollTo(0, 0);
  } else {
    route.lastHash = h;
    showView("home");
    renderHome();
    window.scrollTo(0, 0);
  }
}
window.addEventListener("hashchange", route);

/* The skip link must not touch the hash: the hash is the router. */
document.querySelector(".skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.getElementById("main");
  main.setAttribute("tabindex", "-1");
  main.focus();
});

/* dev guard: every slide needs .title/.body and every step .name in both dicts */
for (const step of steps) {
  for (const d of ["pl", "en"]) {
    if (dicts[d][`${step.id}.name`] === undefined)
      console.warn(`missing i18n [${d}]: ${step.id}.name`);
    for (const slide of step.slides)
      for (const suffix of ["title", "body"])
        if (dicts[d][`${slide.key}.${suffix}`] === undefined)
          console.warn(`missing i18n [${d}]: ${slide.key}.${suffix}`);
  }
}

/* ---------- CDN error banner ---------- */
function showCdnError() {
  const el = document.getElementById("cdn-error");
  if (!el) return;
  el.innerHTML = `<span>${t("error.cdn")}</span>`;
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = t("error.retry");
  btn.addEventListener("click", () => location.reload());
  el.appendChild(btn);
  el.classList.remove("hidden");
}

/* ---------- boot ---------- */
async function boot() {
  // header/language work even before the cube library loads
  applyStaticI18n();
  /* Served copy in vendor/ (see vendor/cubing/NOTICE.md). Browsers refuse to
     load local modules from file://, so the disk version still uses the CDN. */
  const cubingSrc =
    location.protocol === "file:"
      ? "https://cdn.cubing.net/v0/js/cubing/twisty"
      : new URL("vendor/cubing/js/cubing/twisty.js", document.baseURI).href;
  try {
    await import(cubingSrc);
  } catch (e) {
    console.error("Failed to load cubing.js:", e);
    showCdnError();
    return;
  }
  window.__kostkaBooted = true; // tells the index.html backstop the app is alive
  buildSpeedControls();
  initAutoplayLoop(document.getElementById("lesson-player"));
  onLangChange(() => {
    buildSpeedControls();
    if (!document.getElementById("view-lesson").classList.contains("hidden")) renderLesson();
    if (!document.getElementById("view-home").classList.contains("hidden")) renderHome();
    if (!document.getElementById("view-cheatsheet").classList.contains("hidden")) renderCheatsheet();
  });
  route();
}
boot();

/* Service workers need http(s); from file:// the app simply runs uncached. */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
})();
