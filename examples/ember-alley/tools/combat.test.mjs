import assert from "node:assert/strict";
import {
  createGame,
  begin,
  attack,
  dash,
  tick,
  inStrike,
  MOVES,
  nextRoom,
} from "../game/combat.mjs";
const advance = (g, t, input = {}) => {
  for (let n = 0; n < Math.ceil(t / 0.01); n++) tick(g, 0.01, input);
};
const dummy = (g, x = 260, y = 388) => {
  g.enemies = [
    {
      id: "target",
      kind: "thug",
      x,
      y,
      face: -1,
      hp: 999,
      maxHp: 999,
      state: "stunned",
      stun: 99,
      age: 0,
      cooldown: 99,
      hit: 0,
      z: 0,
      vz: 0,
      dead: false,
    },
  ];
  return g.enemies[0];
};
let g = createGame();
begin(g);
let e = dummy(g);
assert.equal(inStrike(g.player, e, MOVES[0]), true);
assert.equal(inStrike(g.player, { x: 260, y: 440 }, MOVES[0]), false);
assert.equal(inStrike(g.player, { x: 140, y: 388 }, MOVES[0]), false);
attack(g);
advance(g, 0.09);
assert.equal(e.hp, 999, "startup cannot damage");
advance(g, 0.05);
assert.equal(e.hp, 985, "active strike damages once");
advance(g, 0.15);
assert.equal(e.hp, 985, "one hit per move");
g = createGame();
begin(g);
e = dummy(g);
attack(g);
advance(g, 0.14);
attack(g);
advance(g, 0.36);
attack(g);
advance(g, 0.7);
assert.equal(g.stats.chains, 1);
assert.equal(g.stats.hits, 3, "three queued strikes");
assert.equal(e.hp, 940);
g = createGame();
begin(g);
e = dummy(g);
attack(g, true);
advance(g, 0.33);
assert.ok(e.z > 0, "launcher lifts target");
assert.equal(g.stats.launches, 1);
assert.equal(attack(g, true), false, "special cannot restart mid-move");
advance(g, 0.42);
assert.equal(attack(g, true), false, "cooldown enforced");
attack(g);
advance(g, 0.25);
assert.ok(g.stats.juggles > 0, "normal strike juggles launched target");
g = createGame();
begin(g);
dummy(g);
const x = g.player.x;
assert.ok(dash(g, 1, 0));
advance(g, 0.2);
assert.ok(g.player.x > x + 100);
assert.ok(g.player.invuln > 0);
assert.equal(dash(g, 1, 0), false);
advance(g, 0.7);
assert.ok(dash(g, 0, -1));
advance(g, 0.3);
assert.ok(g.player.y < 388, "depth dash");
g = createGame();
begin(g);
e = dummy(g, 220, 388);
e.state = "strike";
e.stun = 0;
e.cooldown = 0;
e.pattern = "punch";
e.face = -1;
dash(g, 0, -1);
advance(g, 0.1);
assert.equal(g.player.hp, 120, "dash invulnerability prevents damage");
assert.ok(g.stats.evades > 0);
g = createGame();
begin(g);
e = dummy(g, 220, 388);
e.state = "strike";
e.stun = 0;
e.pattern = "punch";
e.face = -1;
g.player.hp = 10;
advance(g, 0.02);
assert.equal(g.phase, "dead");
assert.equal(g.player.hp, 0);
g = createGame();
begin(g);
assert.equal(g.player.hp, 120, "retry fresh state");
assert.equal(g.room, 0);
g = createGame();
begin(g);
for (let room = 0; room < 2; room++) {
  for (let wave = 0; wave < 2; wave++) {
    for (const e of g.enemies) {
      e.dead = true;
      e.hp = 0;
    }
    advance(g, 1);
  }
  if (!room) {
    assert.ok(g.door);
    assert.equal(nextRoom(g), false, "door requires reaching it");
    g.player.x = 870;
    assert.ok(nextRoom(g));
    assert.equal(g.room, 1);
  }
}
assert.equal(g.phase, "clear");
g = createGame();
begin(g);
e = dummy(g, 380, 388);
e.kind = "boss";
e.state = "approach";
e.stun = 0;
e.cooldown = 0;
e.attackNo = 0;
advance(g, 0.02);
assert.equal(e.pattern, "rush");
assert.equal(e.state, "windup");
advance(g, 0.8);
assert.equal(g.player.hp, 120, "telegraph has no premature damage");
console.log(
  "PASS depth/facing, startup/active/single hit, 3-chain, launcher/juggle/cooldown, dash/iframes/depth, death/retry, room doors/clear, boss telegraph",
);

g = createGame();
begin(g);
e = dummy(g, 260, 388);
e.kind = "boss";
e.state = "windup";
e.stun = 0;
e.pattern = "rush";
e.targetX = 180;
e.targetY = 388;
e.cooldown = 0;
e.attackNo = 1;
attack(g);
advance(g, 0.16);
assert.equal(
  e.state,
  "windup",
  "boss armor preserves telegraphed attack through normal hit",
);
assert.ok(e.hp < 999, "armor still takes damage");
advance(g, 1);
assert.ok(
  ["strike", "recover"].includes(e.state),
  "boss proceeds through telegraphed attack",
);
g = createGame();
begin(g);
e = dummy(g, 260, 388);
e.kind = "boss";
e.state = "windup";
e.stun = 0;
e.pattern = "rush";
e.targetX = 180;
e.targetY = 388;
attack(g, true);
advance(g, 0.32);
assert.ok(e.z > 0, "launcher can break boss armor and lift");
assert.equal(e.state, "stunned");
console.log("PASS boss normal-hit armor retains tell, special breaks armor");

g = createGame();
begin(g);
const patterns = new Set();
for (let i = 0; i < 6000 && g.phase === "playing"; i++) {
  const p = g.player;
  const input = {};
  const e = g.enemies
    .filter((e) => !e.dead)
    .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (e?.kind === "boss" && e.state === "strike") patterns.add(e.pattern);
  if (i % 16 === 0 && e) {
    if (Math.abs(e.x - p.x) < 130 && Math.abs(e.y - p.y) < 40)
      attack(g, p.cd === 0);
    if (
      e.kind === "boss" &&
      e.state === "windup" &&
      e.age > 0.4 &&
      p.dashCd === 0
    )
      dash(g, 0, p.y > 390 ? -1 : 1);
  }
  if (g.door) {
    input.right = true;
    if (p.x > 825) nextRoom(g);
  } else if (e) {
    if (Math.abs(e.x - p.x) > 73) input[e.x > p.x ? "right" : "left"] = true;
    if (Math.abs(e.y - p.y) > 18) input[e.y > p.y ? "down" : "up"] = true;
  }
  tick(g, 0.01, input);
  g.events = [];
}
assert.equal(
  g.phase,
  "clear",
  "public movement/attack/dash/door commands can clear entire game",
);
assert.ok(
  g.player.hp > 0 && g.player.hp < 120,
  "boss can damage successful player",
);
assert.ok(g.stats.juggles > 0 && g.stats.chains > 0 && g.stats.dashes > 0);
assert.deepEqual(
  [...patterns].sort(),
  ["rush", "slam"],
  "both boss patterns execute",
);
g = createGame();
begin(g);
advance(g, 55);
assert.equal(g.phase, "dead", "unattended player naturally loses");
console.log(
  "PASS full command-driven clear with both boss patterns and natural idle defeat",
);
