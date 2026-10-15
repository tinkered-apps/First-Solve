/* Unit tests for the course data in public/js/steps.js. Run: node --test test/

   steps.js is a classic browser script, so it is run in a fresh context and
   read back from its `window`. The cube below is a second, independent model
   (stickers as position + facing, turned by plain coordinate rotations); it
   shares no code with cubing.js, which draws the cube in the app. The tests
   check what each lesson says about the cube it shows. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const publicDir = path.join(__dirname, "..", "public");
const load = (file) => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, file), "utf8"), sandbox);
  return sandbox.window;
};
const { STEPS, ALGORITHMS, setupFor } = load("js/steps.js");
const EN = load("js/i18n/en.js").I18N_EN;
const PL = load("js/i18n/pl.js").I18N_PL;

/* ---------- the cube ---------- */

/* Axes: x to the right, y up, z towards the viewer. Colours follow the
   twisty-player default: white up, green in front. */
const FACES = {
  U: { axis: 1, side: 1, color: "white" },
  D: { axis: 1, side: -1, color: "yellow" },
  F: { axis: 2, side: 1, color: "green" },
  B: { axis: 2, side: -1, color: "blue" },
  R: { axis: 0, side: 1, color: "red" },
  L: { axis: 0, side: -1, color: "orange" }
};

/* A quarter turn clockwise as seen from the positive end of each axis. */
const CLOCKWISE = [
  ([x, y, z]) => [x, z, -y],
  ([x, y, z]) => [-z, y, x],
  ([x, y, z]) => [y, -x, z]
];

/* layer: the coordinate of the slice that turns, or null for the whole cube.
   side: 1 turns like the positive face (R, U, F), -1 like the negative one. */
const MOVES = {
  R: [0, 1, 1], L: [0, -1, -1], x: [0, null, 1],
  U: [1, 1, 1], D: [1, -1, -1], y: [1, null, 1], E: [1, 0, -1],
  F: [2, 1, 1], B: [2, -1, -1], z: [2, null, 1]
};

function solvedCube() {
  const stickers = [];
  for (const { axis, side, color } of Object.values(FACES)) {
    for (const a of [-1, 0, 1]) {
      for (const b of [-1, 0, 1]) {
        const at = [a, b];
        at.splice(axis, 0, side);
        const facing = [0, 0, 0];
        facing[axis] = side;
        stickers.push({ at, facing, color });
      }
    }
  }
  return stickers;
}

function turn(stickers, token) {
  const [, name, suffix] = /^([A-Za-z])(2|')?$/.exec(token) || [];
  assert.ok(MOVES[name], `unknown move "${token}"`);
  const [axis, layer, side] = MOVES[name];
  const quarters = (suffix === "2" ? 2 : suffix === "'" ? 3 : 1) * (side === 1 ? 1 : 3);
  return stickers.map((sticker) => {
    if (layer !== null && sticker.at[axis] !== layer) return sticker;
    let { at, facing } = sticker;
    for (let i = 0; i < quarters % 4; i += 1) {
      at = CLOCKWISE[axis](at);
      facing = CLOCKWISE[axis](facing);
    }
    return { at, facing, color: sticker.color };
  });
}

const tokens = (alg) => alg.trim().split(/\s+/).filter(Boolean);
const apply = (alg, cube = solvedCube()) => tokens(alg).reduce(turn, cube);

/* Whole state as text, so two cubes compare with assert.equal. */
const key = (cube) => cube.map((s) => `${s.at}|${s.facing}|${s.color}`).sort().join(" ");

/* Colour of the sticker at a place, looking at it from a face. */
function colorAt(cube, face, at) {
  const { axis, side } = FACES[face];
  return cube.find((s) => s.facing[axis] === side && String(s.at) === String(at)).color;
}

const faceColors = (cube, face) =>
  cube.filter((s) => s.facing[FACES[face].axis] === FACES[face].side).map((s) => s.color);

/* Solved means every face is one colour, however the cube is held. */
const isSolved = (cube) => Object.keys(FACES).every((face) => new Set(faceColors(cube, face)).size === 1);

const SIDES = ["F", "R", "B", "L"];
/* The edge sticker on the top (or bottom) face that touches each side face. */
const edgeSpot = (side, y) => {
  const at = [0, y, 0];
  at[FACES[side].axis] = FACES[side].side;
  return at;
};
const center = (cube, face) => {
  const at = [0, 0, 0];
  at[FACES[face].axis] = FACES[face].side;
  return colorAt(cube, face, at);
};
const topEdgeColors = (cube) => SIDES.map((side) => colorAt(cube, "U", edgeSpot(side, 1)));

/* Every side sticker in the given rows (y = 1 top, 0 middle, -1 bottom) matches its centre. */
function rowsMatchCenters(cube, rows) {
  return SIDES.every((side) => {
    const { axis, side: sign } = FACES[side];
    return cube
      .filter((s) => s.facing[axis] === sign && rows.includes(s.at[1]))
      .every((s) => s.color === center(cube, side));
  });
}

const allOf = (cube, face, color) => faceColors(cube, face).every((c) => c === color);

const slide = (slideKey) => {
  const found = STEPS.flatMap((step) => step.slides).find((s) => s.key === slideKey);
  assert.ok(found, `no slide ${slideKey}`);
  return found;
};
const startOf = (slideKey) => apply(setupFor(slide(slideKey)));
const endOf = (slideKey) => apply(slide(slideKey).alg, startOf(slideKey));

/* ---------- the model itself ---------- */

test("the cube model: every move returns after four turns, and the inserter after six rounds", () => {
  const solved = key(solvedCube());
  for (const move of Object.keys(MOVES)) {
    assert.notEqual(key(apply(move)), solved, move);
    assert.equal(key(apply(`${move} ${move} ${move} ${move}`)), solved, move);
    assert.equal(key(apply(`${move} ${move}'`)), solved, move);
    assert.equal(key(apply(`${move}2 ${move}2`)), solved, move);
  }
  /* Known orders: R U R' U' has order 6, and R U has order 105. */
  const repeat = (alg, times) => Array(times).fill(alg).join(" ");
  assert.equal(key(apply(repeat("R U R' U'", 6))), solved);
  assert.notEqual(key(apply(repeat("R U R' U'", 3))), solved);
  assert.equal(key(apply(repeat("R U", 105))), solved);
  assert.notEqual(key(apply(repeat("R U", 35))), solved);
});

test("the cube model: turns move the stickers the notation says", () => {
  /* R carries the front face's right column up to the top face. */
  assert.equal(colorAt(apply("R"), "U", [1, 1, 0]), "green");
  /* U carries the front face's top row round to the left face. */
  assert.equal(colorAt(apply("U"), "L", [-1, 1, 0]), "green");
  /* F carries the top face's front row to the right face. */
  assert.equal(colorAt(apply("F"), "R", [1, 0, 1]), "white");
  /* x2 holds the cube yellow up, with blue in front. */
  assert.equal(center(apply("x2"), "U"), "yellow");
  assert.equal(center(apply("x2"), "F"), "blue");
  /* A rotation moves no piece relative to the others. */
  assert.ok(isSolved(apply("x y z'")));
});

/* ---------- the course data ---------- */

test("every slide and algorithm has its text in both languages", () => {
  for (const [name, dict] of [["EN", EN], ["PL", PL]]) {
    for (const step of STEPS) {
      assert.ok(dict[`${step.id}.name`], `${name}: ${step.id}.name`);
      for (const s of step.slides) {
        assert.ok(dict[`${s.key}.title`], `${name}: ${s.key}.title`);
        assert.ok(dict[`${s.key}.body`], `${name}: ${s.key}.body`);
      }
    }
    for (const a of ALGORITHMS) assert.ok(dict[a.key], `${name}: ${a.key}`);
  }
});

test("step ids and slide keys are unique, and slides are numbered in order", () => {
  const ids = STEPS.map((step) => step.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const step of STEPS) {
    assert.deepEqual(step.slides.map((s) => s.key), step.slides.map((_, i) => `${step.id}.${i + 1}`));
  }
  for (const a of ALGORITHMS) assert.ok(ids.includes(a.step), `${a.key} names step ${a.step}`);
});

test("every setup and algorithm uses only moves the cube model knows", () => {
  for (const s of STEPS.flatMap((step) => step.slides)) {
    assert.doesNotThrow(() => apply(`${setupFor(s)} ${s.alg}`), s.key);
    if (s.autoplay || s.chips) assert.ok(s.alg, `${s.key} plays or shows chips but has no moves`);
  }
});

test("each cheat-sheet algorithm starts from a scrambled cube and ends on the solved one", () => {
  for (const a of ALGORITHMS) {
    const start = apply(a.setup);
    assert.ok(!isSolved(start), `${a.key} starts solved`);
    assert.ok(isSolved(apply(a.alg, start)), `${a.key} does not end solved`);
    assert.equal(center(start, "U"), "yellow", `${a.key} is not held yellow up`);
  }
});

/* ---------- what the lessons say about the cube they show ---------- */

test("daisy: four white petals around the yellow centre, at the start of the step and at its check", () => {
  for (const k of ["daisy.1", "daisy.7", "white-cross.1"]) {
    const cube = startOf(k);
    assert.equal(center(cube, "U"), "yellow", k);
    assert.deepEqual(topEdgeColors(cube), ["white", "white", "white", "white"], k);
  }
  /* The recognition slide shows two petals in place and two still hiding. */
  assert.equal(topEdgeColors(startOf("daisy.2")).filter((c) => c === "white").length, 2);
});

test("daisy: each demo starts one petal short and ends with all four", () => {
  for (const k of ["daisy.3", "daisy.4", "daisy.5", "daisy.6"]) {
    assert.equal(topEdgeColors(startOf(k)).filter((c) => c === "white").length, 3, `${k} start`);
    assert.deepEqual(topEdgeColors(endOf(k)), ["white", "white", "white", "white"], `${k} end`);
  }
});

test("white cross: a dropped petal lands white down, under the centre of its own colour", () => {
  for (const k of ["white-cross.2", "white-cross.3"]) {
    const cube = endOf(k);
    assert.equal(colorAt(cube, "D", edgeSpot("F", -1)), "white", k);
    assert.equal(colorAt(cube, "F", [0, -1, 1]), center(cube, "F"), k);
  }
  /* Turned over, the finished cross shows white edges that match the side centres. */
  for (const k of ["white-cross.4", "white-corners.1"]) {
    const cube = startOf(k);
    assert.equal(center(cube, "U"), "white", k);
    assert.deepEqual(topEdgeColors(cube), ["white", "white", "white", "white"], k);
    for (const side of SIDES) {
      const at = edgeSpot(side, 1);
      assert.equal(colorAt(cube, side, at), center(cube, side), `${k} ${side}`);
    }
    assert.ok(!isSolved(cube), `${k} shows a solved cube`);
  }
});

/* The cross on the bottom face is whole: four white edges over matching centres. */
function bottomCrossIntact(cube) {
  return SIDES.every((side) =>
    colorAt(cube, "D", edgeSpot(side, -1)) === "white" &&
    colorAt(cube, side, edgeSpot(side, -1)) === center(cube, side));
}

test("white corners: the inserter puts the corner home and leaves the cross alone", () => {
  for (const k of ["white-corners.4", "white-corners.5", "white-corners.6"]) {
    assert.ok(bottomCrossIntact(startOf(k)), `${k} starts with a broken cross`);
    assert.ok(bottomCrossIntact(endOf(k)), `${k} breaks the cross`);
  }
  for (const k of ["white-corners.4", "white-corners.5"]) {
    /* The slot the inserter fills is the bottom corner at the front right. */
    const home = [1, -1, 1];
    const solvedThere = (cube) =>
      colorAt(cube, "D", home) === "white" &&
      colorAt(cube, "F", home) === center(cube, "F") &&
      colorAt(cube, "R", home) === center(cube, "R");
    assert.ok(!solvedThere(startOf(k)), `${k} starts with the corner already home`);
    assert.ok(solvedThere(endOf(k)), `${k} does not bring the corner home`);
    assert.ok(!allOf(endOf(k), "D", "white"), `${k} ends with every corner in, which hides the lesson`);
  }
});

test("first layer done: a white face with the row beside it matching the centres", () => {
  const shown = startOf("white-corners.7");
  assert.ok(allOf(shown, "U", "white"));
  assert.ok(rowsMatchCenters(shown, [1]));
  const held = startOf("middle-layer.1");
  assert.ok(allOf(held, "D", "white"));
  assert.ok(rowsMatchCenters(held, [-1]));
  assert.ok(!rowsMatchCenters(held, [0]), "the middle layer is already solved");
});

/* The front slots of the middle layer, and the first-layer sticker under each of their two faces. */
const MIDDLE_SEATS = { "middle-layer.3": [1, 0, 1], "middle-layer.4": [-1, 0, 1] };
const firstLayerRows = (cube) => SIDES.map((side) => {
  const { axis, side: sign } = FACES[side];
  return cube.filter((s) => s.facing[axis] === sign && s.at[1] === -1).map((s) => s.color);
});

test("middle layer: each inserter keeps the first layer and seats its edge above matching colours", () => {
  for (const [k, at] of Object.entries(MIDDLE_SEATS)) {
    const side = at[0] === 1 ? "R" : "L";
    const below = [at[0], -1, at[2]];
    const seated = (cube) =>
      colorAt(cube, "F", at) === colorAt(cube, "F", below) && colorAt(cube, side, at) === colorAt(cube, side, below);
    assert.ok(!seated(startOf(k)), `${k} starts with the edge already in`);
    const end = endOf(k);
    assert.ok(seated(end), `${k} does not seat the edge`);
    assert.ok(allOf(end, "D", "white"), `${k} breaks the white face`);
    for (const row of firstLayerRows(end)) assert.equal(new Set(row).size, 1, `${k} breaks the first layer`);
  }
});

/* Until 1.02 these two setups scrambled the belt with an E turn, which carries the
   four side centres a quarter turn round: the cube showed a blue face with an orange
   centre while the text said to match the edge to the centres. */
test("middle layer: on the inserter slides the centres match the first layer and the edge matches the centres", () => {
  for (const [k, at] of Object.entries(MIDDLE_SEATS)) {
    const side = at[0] === 1 ? "R" : "L";
    const start = startOf(k);
    assert.ok(rowsMatchCenters(start, [-1]), `${k}: centres are off from the first layer`);
    /* The edge waits on top, its front colour over the centre of the same colour (the upside-down T). */
    assert.equal(colorAt(start, "F", [0, 1, 1]), center(start, "F"), `${k}: no T at the start`);
    assert.equal(colorAt(start, "U", [0, 1, 1]), center(start, side), `${k}: the top colour does not name the side`);
    const end = endOf(k);
    assert.ok(rowsMatchCenters(end, [-1]), `${k}: the demo ends with centres off`);
    assert.equal(colorAt(end, "F", at), center(end, "F"), `${k}: seated edge does not match the front centre`);
    assert.equal(colorAt(end, side, at), center(end, side), `${k}: seated edge does not match the side centre`);
    assert.ok(!rowsMatchCenters(end, [0]), `${k} ends with the whole belt solved, which hides that three edges remain`);
  }
});

test("middle layer: the stuck edge is a real swap, and the eject keeps the first layer", () => {
  const stuck = startOf("middle-layer.5");
  assert.equal(key(stuck), key(startOf("middle-layer.6")));
  assert.ok(allOf(stuck, "D", "white") && rowsMatchCenters(stuck, [-1]));
  assert.ok(!rowsMatchCenters(stuck, [0]));
  const end = endOf("middle-layer.6");
  assert.ok(allOf(end, "D", "white") && rowsMatchCenters(end, [-1]));
});

test("yellow cross: the dot has two layers done and no yellow edge on top", () => {
  for (const k of ["middle-layer.7", "yellow-cross.2", "yellow-cross.5"]) {
    const cube = startOf(k);
    assert.ok(allOf(cube, "D", "white") && rowsMatchCenters(cube, [-1, 0]), `${k}: two layers`);
    assert.equal(center(cube, "U"), "yellow", k);
    assert.equal(topEdgeColors(cube).filter((c) => c === "yellow").length, 0, k);
  }
});

test("yellow cross: the line and the L start with two yellow edges, and every case ends on the cross", () => {
  const yellowOnTop = (cube) => topEdgeColors(cube).map((c) => c === "yellow");
  /* Sides are listed F, R, B, L: the line is two opposite edges, the L two neighbours. */
  const line = yellowOnTop(startOf("yellow-cross.3"));
  assert.equal(line.filter(Boolean).length, 2);
  assert.ok(line[0] === line[2] && line[1] === line[3], "the line case is not a line");
  const bend = yellowOnTop(startOf("yellow-cross.4"));
  assert.equal(bend.filter(Boolean).length, 2);
  assert.ok(bend[0] !== bend[2] && bend[1] !== bend[3], "the L case is not an L");
  /* The text puts the L at the back and left; one run then leaves a left-to-right line. */
  assert.deepEqual(bend, [false, false, true, true], "the L is not at the back-left");
  const afterOne = yellowOnTop(apply(slide("yellow-cross.3").alg, startOf("yellow-cross.4")));
  assert.deepEqual(afterOne, [false, true, false, true], "one run from the L does not give a left-to-right line");
  assert.equal(slide("yellow-cross.4").alg, `${slide("yellow-cross.3").alg} ${slide("yellow-cross.3").alg}`, "the L demo is not two plain runs");

  for (const k of ["yellow-cross.3", "yellow-cross.4", "yellow-cross.5"]) {
    const end = endOf(k);
    assert.deepEqual(topEdgeColors(end), ["yellow", "yellow", "yellow", "yellow"], k);
    assert.ok(rowsMatchCenters(end, [-1, 0]), `${k} breaks the two layers`);
    assert.ok(!isSolved(end), `${k} ends on a solved cube, though the corners come later`);
  }
  const goal = startOf("yellow-cross.1");
  assert.deepEqual(topEdgeColors(goal), ["yellow", "yellow", "yellow", "yellow"]);
  assert.ok(!isSolved(goal));
});

test("yellow edges: the swap ends on the cube the next slide shows, with corners still to do", () => {
  const end = endOf("yellow-edges.2");
  assert.equal(key(startOf("yellow-edges.1")), key(startOf("yellow-edges.2")));
  assert.equal(key(end), key(startOf("yellow-edges.3")));
  assert.ok(!isSolved(end));
  /* Edges done: every top edge matches the centre beside it. */
  for (const side of SIDES) assert.equal(colorAt(end, side, edgeSpot(side, 1)), center(end, side), side);
});

test("yellow corners: the cycle ends on the next slide's cube, and the finale on the solved one", () => {
  assert.equal(key(startOf("yellow-corners.1")), key(startOf("yellow-corners.2")));
  const cycled = endOf("yellow-corners.2");
  assert.equal(key(cycled), key(startOf("yellow-corners.3")));
  assert.ok(!isSolved(cycled));

  assert.equal(key(startOf("yellow-corners.3")), key(startOf("yellow-corners.4")));
  const finale = endOf("yellow-corners.4");
  assert.ok(isSolved(finale));
  assert.equal(key(finale), key(startOf("yellow-corners.5")));
});
