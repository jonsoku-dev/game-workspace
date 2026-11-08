import assert from "node:assert/strict";
import {
  extend,
  points,
  findMove,
  seeded,
  step,
  R,
  H,
  W,
  RESCUE_GOAL,
  seamFrom,
  burstIds,
  takeSeam,
  stitchedBadges,
} from "../game/rules.mjs";
const ts = [
  { id: 1, kind: 0, x: 30, y: 100 },
  { id: 2, kind: 0, x: 85, y: 100 },
  { id: 3, kind: 0, x: 140, y: 100 },
  { id: 4, kind: 1, x: 85, y: 150 },
  { id: 5, kind: 0, x: 350, y: 100 },
];
let c = [];
for (const t of ts.slice(0, 3)) c = extend(c, t, ts);
assert.deepEqual(c, [1, 2, 3]);
assert.deepEqual(extend(c, ts[0], ts), c);
assert.deepEqual(extend(c, ts[1], ts), [1, 2]);
assert.deepEqual(extend(c, ts[3], ts), c);
assert.deepEqual(extend(c, ts[4], ts), c);
assert.equal(points(2), 0);
assert.equal(points(3), 225);
assert.equal(points(7, true), 2450);
assert.equal(findMove(ts).length, 3);
assert.deepEqual(findMove(ts.slice(0, 2)), []);
const a = seeded(42),
  b = seeded(42);
for (let i = 0; i < 100; i++) assert.equal(a(), b());
const balls = [
  { x: 30, y: 20, vx: 0, vy: 0 },
  { x: 70, y: 40, vx: 0, vy: 0 },
];
for (let i = 0; i < 1000; i++) step(balls, 1 / 120);
for (const t of balls) {
  assert.ok(t.x >= R && t.x <= W - R);
  assert.ok(t.y <= H - R);
  assert.ok(Number.isFinite(t.vy));
}
assert.ok(
  Math.hypot(balls[0].x - balls[1].x, balls[0].y - balls[1].y) > R * 1.9,
);
console.log(
  "PASS chain adjacency / no reuse / backtrack / wrong species / minimum / score / fever / seeded repeat / gravity bounds / collision settling",
);

const longChain = Array.from({ length: 7 }, (_, id) => ({
  id,
  kind: 0,
  x: 30 + id * 50,
  y: 200,
}));
assert.equal(
  seamFrom([0, 1, 2], longChain, 11),
  null,
  "short chains keep ordinary scoring",
);
const seam = seamFrom(
  longChain.map((t) => t.id),
  longChain,
  11,
);
assert.deepEqual(
  seam,
  { id: 11, x: 330, y: 200 },
  "long chain leaves button at chosen endpoint",
);
assert.deepEqual(
  burstIds(longChain, seam),
  [5, 6],
  "button affects nearby toys only",
);
assert.deepEqual(
  burstIds(longChain, { x: 330, y: 400 }),
  [],
  "empty location can wait for refill",
);
const spent = takeSeam([seam], 11);
assert.deepEqual(spent.remaining, [], "button is consumed once");
assert.equal(
  takeSeam(spent.remaining, 11),
  null,
  "retry cannot spend the same button twice",
);
assert.equal(takeSeam([seam], 99), null, "unknown button is harmless");
assert.deepEqual(
  [0, 19, 20, 39, 40, 59, 60, 80].map(stitchedBadges),
  [0, 0, 1, 1, 2, 2, 3, 3],
);
assert.equal(RESCUE_GOAL, 60);
console.log(
  "PASS endpoint seam / short-chain preservation / local burst / empty burst retry / one-use bonus / rescue badges",
);
assert.deepEqual(
  burstIds(
    [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: R * 3.6, y: 0 },
      { id: 3, x: R * 3.6 + 1, y: 0 },
    ],
    { x: 0, y: 0 },
  ),
  [1, 2],
  "burst radius includes boundary and excludes outside",
);

assert.deepEqual(
  burstIds(
    [
      { id: 1, x: 200, y: -27 },
      { id: 2, x: 200, y: -57 },
      { id: 3, x: 200, y: 0 },
      { id: 4, x: 200, y: 27 },
      { id: 5, x: 200, y: 57 },
    ],
    { x: 200, y: 27 },
  ),
  [3, 4, 5],
  "top seam only rescues toys admitted by visible center selection, not offscreen refills",
);
assert.deepEqual(
  burstIds([{ id: 1, x: 200, y: H + 1 }], { x: 200, y: H - 27 }),
  [],
  "below-board toys are not rescued",
);
console.log("PASS bonus excludes offscreen refill toys at top and bottom");
