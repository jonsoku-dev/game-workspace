import assert from "node:assert/strict";
import {
  createGame,
  launch,
  step,
  simulate,
  select,
  previewShot,
  W,
  H,
  R,
} from "../game/combat.mjs";
const a = createGame(),
  b = createGame();
launch(a, -90, 100);
launch(b, -90, 100);
simulate(a);
simulate(b);
assert.deepEqual(a, b);
assert(a.totalHits > 0);
assert(a.foes[0].hp < 68);
const wall = createGame();
launch(wall, 180, 100);
let bounced = false;
for (let i = 0; i < 150; i++) {
  step(wall);
  if (wall.events.some((e) => e.type === "bounce")) bounced = true;
  for (const h of wall.heroes) {
    assert(h.x >= R + 18 && h.x <= W - R - 18);
    assert(h.y >= R + 18 && h.y <= H - R - 18);
  }
}
assert(bounced);
const assist = createGame();
launch(assist, 0, 100);
simulate(assist);
assert.equal(
  assist.events.filter((e) => e.type === "assist" && e.text.startsWith("달"))
    .length,
  1,
);
assert(assist.totalHits > 0);
const nova = createGame();
select(nova, 0);
launch(nova, -42, 100);
simulate(nova);
assert(nova.events.some((e) => e.type === "assist" && e.text.startsWith("별")));
const countdown = createGame();
launch(countdown, 90, 0);
simulate(countdown);
launch(countdown, 90, 0);
simulate(countdown);
assert(countdown.hp < 180);
const skill = createGame();
skill.charge = 3;
launch(skill, -90, 100, true);
assert.equal(skill.charge, 0);
assert(skill.foes.every((e) => e.hp < e.max));
simulate(skill);
const win = createGame();
for (let t = 0; t < 100 && win.phase !== "won" && win.phase !== "lost"; t++) {
  const h = win.heroes[win.selected],
    e = win.foes.find((e) => e.hp > 0);
  launch(
    win,
    Math.round((Math.atan2(e.y - h.y, e.x - h.x) * 180) / Math.PI),
    100,
    win.charge >= 3,
  );
  simulate(win);
}
assert.equal(win.phase, "won");
assert(win.weakHits > 0 && win.bounces > 0 && win.assists > 0);
assert.equal(createGame().phase, "aim");
const lose = createGame();
for (let t = 0; t < 40 && lose.phase === "aim"; t++) {
  launch(lose, 90, 0);
  simulate(lose);
}
assert.equal(lose.phase, "lost");
assert.equal(lose.hp, 0);
console.log(
  "PASS deterministic simulation, bounded wall reflection, no tunneling, one-shot ally assists, AoE assist, enemy countdown, charged damage, normal-rule win and loss",
);

// Isolated geometry fixtures pin the damage of the first physical contact.
function duel({ boss = false, weakAngle = Math.PI, linked = false } = {}) {
  const g = createGame();
  g.wave = boss ? 2 : 1;
  g.heroes[0].x = 360;
  g.heroes[0].y = 670;
  g.heroes[1].x = linked ? 600 : 80;
  g.heroes[1].y = linked ? 508 : 760;
  g.heroes[2].x = 80;
  g.heroes[2].y = 90;
  g.foes = [
    {
      id: boss ? "boss" : "target",
      x: 360,
      y: 245,
      r: boss ? 72 : 42,
      hp: 999,
      max: 999,
      timer: 9,
      period: 9,
      weakAngle,
    },
  ];
  return g;
}
function firstContact(g, angle) {
  launch(g, angle, 100);
  for (let tick = 0; tick < 576 && g.phase === "flight"; tick++) {
    step(g);
    const impact = g.events.find((e) => e.contact);
    if (impact) return impact;
  }
  assert.fail("Shot did not contact the expected target");
}
const bankAngle =
  (Math.atan2(245 - 670, 2 * (W - R - 18) - 360 - 360) * 180) / Math.PI;
assert.equal(firstContact(duel(), -90).damage, 26);
const bankHit = firstContact(duel(), bankAngle);
assert.equal(bankHit.damage, 36);
assert(bankHit.bank);
assert(!bankHit.linked);
assert.equal(firstContact(duel({ boss: true }), -90).damage, 8);
const weakHit = firstContact(duel({ boss: true, weakAngle: Math.PI / 2 }), -90);
assert.equal(weakHit.damage, 52);
assert.equal(weakHit.kind, "weak");
assert.equal(firstContact(duel({ boss: true }), bankAngle).damage, 26);
const prepared = firstContact(duel({ boss: true, linked: true }), bankAngle);
assert.equal(prepared.damage, 44);
assert(prepared.bank && prepared.linked);
const rotation = duel({ boss: true });
launch(rotation, 90, 0);
simulate(rotation);
assert.equal(rotation.foes[0].weakAngle, Math.PI * 1.5);

// Preview must leave the source untouched and match every predicted sample.
for (const [g, angle] of [
  [createGame(), -90],
  [duel(), bankAngle],
  [duel({ boss: true }), -90],
]) {
  const before = structuredClone(g),
    preview = previewShot(g, angle, 100);
  assert.deepEqual(g, before);
  const real = structuredClone(g);
  launch(real, angle, 100);
  const predictedEvents = [];
  real.events = [];
  for (let i = 1; i < preview.points.length; i++) {
    const selected = real.selected;
    step(real);
    assert.deepEqual(
      { x: real.heroes[selected].x, y: real.heroes[selected].y },
      preview.points[i],
    );
    predictedEvents.push(
      ...real.events.splice(0).filter((e) => e.type === "bounce" || e.contact),
    );
  }
  assert.deepEqual(predictedEvents, preview.impacts);
  assert(preview.impacts.length > 0);
}
const corner = duel();
corner.foes = [];
// Corner reflection is covered with a live foe outside the outgoing path.
corner.foes = [
  { id: "far", x: 90, y: 100, r: 30, hp: 999, max: 999, timer: 9, period: 9 },
];
const cornerAngle =
  (Math.atan2(H - R - 18 - 670, W - R - 18 - 360) * 180) / Math.PI;
const cornerPreview = previewShot(corner, cornerAngle, 100);
assert(cornerPreview.impacts.filter((e) => e.type === "bounce").length >= 2);
console.log(
  "PASS V2 exact normal26/bank36, guard8/weak52, prepared44, rotating shield, non-mutating same-physics enemy/wall/corner preview",
);
