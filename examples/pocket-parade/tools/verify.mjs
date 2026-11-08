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
