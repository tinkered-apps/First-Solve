/* Loaded as a classic script (so index.html works when opened directly
   from the file system, where ES-module imports are blocked). Everything
   is attached to `window` at the bottom. */

/*
  Slide shape:
  {
    key: "intro.1",       // i18n: `${key}.title`, `${key}.body`
    alg: "R U R' U'",     // moves to animate ("" = static)
    setup: "auto"|""|alg  // "auto" = inverse of alg (state the alg solves)
    stickering: "full",   // twisty-player experimental-stickering
    chips: false,         // render alg as sticker chips
    autoplay: false
  }
  Cube orientation note: twisty-player default is white U / green F.
  From the "daisy" step on, lessons hold the cube yellow-up (setup "x2").

  All non-trivial cube states below (daisy sub-cases, yellow-cross shapes,
  the ejection demos) were facelet-verified against a standalone cube
  simulator outside this file before being pasted in here, so the visible
  cube for each slide is guaranteed to actually match what its text
  describes.
*/

const DAISY = "x2 F2 B2 R2 L2"; // solved → daisy (yellow up, white petals)
/* Same daisy, but with the hidden bottom layer, belt and top corners
   scrambled too - plain DAISY comes from a solved cube, so every face but
   the top is a flat, uniform color, which no real cube looks like at this
   point. "R D R' D'" is a no-op on the 4 top-layer petals (facelet-checked:
   their piece IDs and orientations come out byte-identical to plain DAISY)
   so the taught petal-drop moves still land exactly as before. */
const DAISY_MESSY = `${DAISY} R D R' D'`;
const CROSS_DONE = "x2 R U R' U' F' U2 F R' U R"; // white cross done, top messy
/* Same cross, flipped white-face-up so the finished cross is actually
   visible (it is built on the hidden bottom face). Used on the "check /
   here it is" slides, where the text tells the learner to turn the cube. */
const CROSS_REVEAL = `${CROSS_DONE} z2`;

/* Per-orbit highlight masks: "-" = normal, "I" = ignored (rendered grey).
   Used to point at just the edges or just the corners on the intro slides. */
const MASK_EDGES = "EDGES:------------,CORNERS:IIIIIIII,CENTERS:IIIIII";
const MASK_CORNERS = "CORNERS:--------,EDGES:IIIIIIIIIIII,CENTERS:IIIIII";
/* core algorithms of the course (cube held yellow-up / white-down) */
const SEXY = "R U R' U'"; // white corner insert (repeat)
/* Scrambles the other 3 not-yet-inserted white corners without touching a
   single edge - each "X D X' D'", repeated 3 times, is a pure corner
   3-cycle (facelet-checked via kpuzzle: identity on every edge slot), so
   the white cross stays fully intact on the bottom. R/B/L (never F) so it
   also never reaches the R+U corner the inserter itself is working on.
   Checked that the target slot still ends up correctly solved after the
   trigger plays, for both a single insert and the triple-round demo,
   while the other 3 corners stay genuinely unsolved. */
const CORNER_MESS =
  "R D R' D' R D R' D' R D R' D' " +
  "B D B' D' B D B' D' B D B' D' " +
  "L D L' D' L D L' D' L D L' D'";
const MID_R = "U R U' R' U' F' U F"; // middle edge → right
const MID_L = "U' L' U L U F U' F'"; // middle edge → left
const YC = "F R U R' U' F'"; // yellow cross
const SUNE = "R U R' U R U2 R' U"; // yellow edges around
const PCYC = "U R U' L' U R' U' L"; // yellow corner positions
const TRIG = "R' D' R D"; // final corner twist trigger
const ORIENT = `${TRIG} ${TRIG} U ${TRIG} ${TRIG} U ${TRIG} ${TRIG} U2`; // 3 corners finale
/* After the cube is flipped white-up, twist the bottom-front-right corner
   with the familiar inserter. This example needs four rounds per corner;
   only D moves between corners, then D2 aligns the solved bottom layer. */
const FOUR_INSERTS = Array(4).fill(SEXY).join(" ");
const FINAL_CORNERS = `x2 y ${FOUR_INSERTS} D ${FOUR_INSERTS} D ${FOUR_INSERTS} D2`;

/* Invert a simple move sequence (face turns + x rotations only): reverse
   the moves and flip each (X<->X', X2 stays). Matches cubing.js Alg.invert
   for the algorithms used here — and is what every setup state below was
   facelet-verified against. */
function invertAlg(alg) {
  return alg
    .trim()
    .split(/\s+/)
    .reverse()
    .map((m) => (m.endsWith("'") ? m.slice(0, -1) : m.endsWith("2") ? m : m + "'"))
    .join(" ");
}

/* "x2 " + inverse(alg): the state that `alg` solves, held yellow-up */
const xinv = (alg) => "x2 " + invertAlg(alg);

/* verified mid-solve states (facelet-checked) */
const FIRST_LAYER_DONE = `${xinv(MID_R)} U2 ${invertAlg(MID_L)} U`;
/* Scrambles the 3 belt slots the MID_R/MID_L inserter demos aren't
   currently filling, so those demos don't end with a fully-solved-looking
   cube. E is the belt-only slice turn: it never touches a U or D piece,
   so the first layer and the specific edge each demo carries stay exactly
   as designed - kpuzzle-checked that the inserted edge still lands
   correctly regardless of what E did to the other 3 belt slots first. */
const BELT_MESS = "E";
/* PCYC only re-cycles the 3 top corners (edges/centers/first-two-layers
   untouched, verified) - appended here so the "cross achieved" reveals
   never coincidentally leave the WHOLE cube solved-looking, which would
   contradict the point of this step (corners are still a separate,
   later step). */
const DOT_CASE = `${xinv(`${YC} U2 ${YC} ${YC}`)} ${PCYC}`; // also: two layers done, top messy
/* The edge-swap demo ends with the same unsolved corners shown on its reveal slide. */
const YELLOW_EDGES_START = `${xinv(PCYC)} ${invertAlg(SUNE)}`;
/* The corner-cycle demo leaves the corners twisted for the final orientation step. */
const YELLOW_CORNERS_START = `${xinv(ORIENT)} ${invertAlg(PCYC)}`;
/* A real middle-edge swap: the first layer, centers and yellow top edges
   stay solved, but two belt edges are genuinely in each other's slots.
   The macro sequence is kpuzzle-checked; MID_R then ejects one of them. */
const STUCK_MID_EDGE = `x2 ${MID_R} U ${MID_R} U' ${MID_L} ${invertAlg(MID_R)}`;

const steps = [
  {
    id: "intro",
    color: "var(--c-red)",
    icon: "🧭",
    slides: [
      { key: "intro.1", alg: "", setup: "", stickering: "full" },
      { key: "intro.2", alg: "R U F R' U'", setup: "", stickering: "centers-only", autoplay: true },
      { key: "intro.3", alg: "", setup: "", stickering: "full", mask: MASK_EDGES },
      { key: "intro.4", alg: "", setup: "", stickering: "full", mask: MASK_CORNERS },
      { key: "intro.5", alg: "", setup: "", stickering: "full" },
      { key: "intro.6", alg: "U U' U2", setup: "", stickering: "full", chips: true, autoplay: true },
      { key: "intro.7", alg: "R R'", setup: "", stickering: "full", chips: true, autoplay: true },
      { key: "intro.8", alg: "L L'", setup: "", stickering: "full", chips: true, autoplay: true },
      { key: "intro.9", alg: "F F'", setup: "", stickering: "full", chips: true, autoplay: true },
      { key: "intro.10", alg: "D D' B B'", setup: "", stickering: "full", chips: true, autoplay: true },
      { key: "intro.11", alg: "R U R' U'", setup: "", stickering: "full", chips: true, autoplay: true }
    ]
  },
  {
    id: "daisy",
    color: "var(--c-yellow)",
    icon: "🌼",
    slides: [
      /* 1. goal */
      { key: "daisy.1", alg: "", setup: DAISY, stickering: "full" },
      /* 2. recognize: 2 petals done, 1 hiding in the belt, 1 hiding on the bottom */
      { key: "daisy.2", alg: "", setup: `${DAISY} F2 R'`, stickering: "full" },
      /* 3. white facing straight down on the bottom -> spin D, then F2 */
      { key: "daisy.3", alg: "F2", setup: `${DAISY} F2`, stickering: "full", chips: true, autoplay: true },
      /* 4. white edge stuck in the middle belt -> turn the OTHER face to lift it */
      { key: "daisy.4", alg: "R", setup: `${DAISY} R'`, stickering: "full", chips: true, autoplay: true },
      /* 5. white peeking sideways at the very top -> quarter turn drops it to the belt, then lift */
      { key: "daisy.5", alg: "R' U F'", setup: `${DAISY} F U' R`, stickering: "full", chips: true, autoplay: true },
      /* 6. white peeking sideways at the very bottom -> same idea, one extra step */
      { key: "daisy.6", alg: "F L' F'", setup: `${DAISY} F L F'`, stickering: "full", chips: true, autoplay: true },
      /* 7. check */
      { key: "daisy.7", alg: "", setup: DAISY, stickering: "full" }
    ]
  },
  {
    id: "white-cross",
    color: "var(--c-blue)",
    icon: "➕",
    slides: [
      /* 1. recap the daisy (full colors so the petals' side colors show) */
      { key: "white-cross.1", alg: "", setup: DAISY_MESSY, stickering: "full" },
      /* 2. matched petal drops straight down (front petal is already aligned) */
      { key: "white-cross.2", alg: "F2", setup: DAISY_MESSY, stickering: "full", chips: true, autoplay: true },
      /* 3. misaligned petal: spin the top to match, then drop */
      { key: "white-cross.3", alg: "U F2", setup: DAISY_MESSY + " U'", stickering: "full", chips: true, autoplay: true },
      /* 4. reveal: turn the cube over to actually see the finished white cross */
      { key: "white-cross.4", alg: "", setup: CROSS_REVEAL, stickering: "full" }
    ]
  },
  {
    id: "white-corners",
    color: "var(--c-green)",
    icon: "🧱",
    slides: [
      /* 1. reveal the finished cross, then tell them to hold it white-down */
      { key: "white-corners.1", alg: "", setup: CROSS_REVEAL, stickering: "full" },
      /* 2. find a white corner up top and read its home */
      { key: "white-corners.2", alg: "", setup: xinv(SEXY), stickering: "full" },
      /* 3. spin the top to park the white corner right above its home slot */
      { key: "white-corners.3", alg: "U", setup: `${xinv(SEXY)} U'`, stickering: "full", chips: true, autoplay: true },
      /* 4. the inserter */
      { key: "white-corners.4", alg: SEXY, setup: `${xinv(SEXY)} ${CORNER_MESS}`, stickering: "full", chips: true, autoplay: true },
      /* 5. repeat until it clicks (three rounds) */
      { key: "white-corners.5", alg: `${SEXY} ${SEXY} ${SEXY}`, setup: `${xinv(`${SEXY} ${SEXY} ${SEXY}`)} ${CORNER_MESS}`, stickering: "full", autoplay: true },
      /* 6. a wrong corner squats at the bottom -> one insert trigger pops it up */
      { key: "white-corners.6", alg: SEXY, setup: `${FIRST_LAYER_DONE} F' U F`, stickering: "full", chips: true, autoplay: true },
      /* 7. first layer done (turn it over to admire the white face) */
      { key: "white-corners.7", alg: "", setup: `${FIRST_LAYER_DONE} z2`, stickering: "full" }
    ]
  },
  {
    id: "middle-layer",
    color: "var(--c-orange)",
    icon: "🥪",
    slides: [
      { key: "middle-layer.1", alg: "", setup: FIRST_LAYER_DONE, stickering: "full" },
      { key: "middle-layer.2", alg: "", setup: xinv(MID_R), stickering: "full" },
      { key: "middle-layer.3", alg: MID_R, setup: `${xinv(MID_R)} ${BELT_MESS}`, stickering: "full", chips: true, autoplay: true },
      { key: "middle-layer.4", alg: MID_L, setup: `${xinv(MID_L)} ${BELT_MESS}`, stickering: "full", chips: true, autoplay: true },
      /* 5. a real edge stuck in the wrong belt slot, top all yellow (static recognition) */
      { key: "middle-layer.5", alg: "", setup: STUCK_MID_EDGE, stickering: "full" },
      /* 6. the same start, now autoplay the crowbar-eject */
      { key: "middle-layer.6", alg: MID_R, setup: STUCK_MID_EDGE, stickering: "full", chips: true, autoplay: true },
      { key: "middle-layer.7", alg: "", setup: DOT_CASE, stickering: "full" }
    ]
  },
  {
    id: "yellow-cross",
    color: "var(--c-yellow)",
    icon: "✨",
    slides: [
      /* 1. goal: cross solved, corners visibly messy on purpose */
      { key: "yellow-cross.1", alg: "", setup: `x2 ${PCYC}`, stickering: "full" },
      /* 2. shape reading, static dot */
      { key: "yellow-cross.2", alg: "", setup: DOT_CASE, stickering: "full" },
      /* 3. recipe + the line case */
      { key: "yellow-cross.3", alg: YC, setup: `${xinv(YC)} ${PCYC}`, stickering: "full", chips: true, autoplay: true },
      /* 4. the L case (bend at back-left) */
      { key: "yellow-cross.4", alg: `${YC} U2 ${YC}`, setup: `${xinv(`${YC} U2 ${YC}`)} ${PCYC}`, stickering: "full", autoplay: true },
      /* 5. the dot case, full 3-round demo */
      { key: "yellow-cross.5", alg: `${YC} U2 ${YC} ${YC}`, setup: DOT_CASE, stickering: "full", autoplay: true }
    ]
  },
  {
    id: "yellow-edges",
    color: "var(--c-blue)",
    icon: "🔄",
    slides: [
      { key: "yellow-edges.1", alg: "", setup: YELLOW_EDGES_START, stickering: "full" },
      { key: "yellow-edges.2", alg: SUNE, setup: YELLOW_EDGES_START, stickering: "full", chips: true, autoplay: true },
      { key: "yellow-edges.3", alg: "", setup: xinv(PCYC), stickering: "full" }
    ]
  },
  {
    id: "yellow-corners",
    color: "var(--c-red)",
    icon: "👑",
    slides: [
      { key: "yellow-corners.1", alg: "", setup: YELLOW_CORNERS_START, stickering: "full" },
      { key: "yellow-corners.2", alg: PCYC, setup: YELLOW_CORNERS_START, stickering: "full", chips: true, autoplay: true },
      { key: "yellow-corners.3", alg: "", setup: xinv(ORIENT), stickering: "full" },
      { key: "yellow-corners.4", alg: FINAL_CORNERS, setup: xinv(ORIENT), stickering: "full", autoplay: true },
      { key: "yellow-corners.5", alg: "", setup: "y", stickering: "full" }
    ]
  }
];

function setupFor(slide) {
  if (slide.setup === "auto") return invertAlg(slide.alg);
  return slide.setup || "";
}

/* Cheat sheet: the named algorithms of the course, grouped by step.
   `setup` shows the cube (yellow up) in the state the alg solves, so
   pressing play demonstrates what the algorithm does. */
const algorithms = [
  { step: "white-corners", key: "alg.sexy", alg: SEXY },
  { step: "middle-layer", key: "alg.midRight", alg: MID_R },
  { step: "middle-layer", key: "alg.midLeft", alg: MID_L },
  { step: "yellow-cross", key: "alg.yellowCross", alg: YC },
  { step: "yellow-edges", key: "alg.sune", alg: SUNE },
  { step: "yellow-corners", key: "alg.posCorners", alg: PCYC }
].map((a) => ({ ...a, setup: xinv(a.alg) }));

const stepColor = Object.fromEntries(steps.map((s) => [s.id, s.color]));

/* expose for the classic-script consumers */
window.STEPS = steps;
window.setupFor = setupFor;
window.ALGORITHMS = algorithms;
window.STEP_COLOR = stepColor;
