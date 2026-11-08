import assert from "node:assert/strict";
import {
  createGame,
  launch,
  step,
  simulate,
  select,
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
    (Math.atan2(e.y - h.y, e.x - h.x) * 180) / Math.PI,
    100,
    win.charge >= 3,
  );
  simulate(win);
}
assert.equal(win.phase, "won");
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
