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
  strikeContact,
  DODGE,
  COUNTER,
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
advance(g, 0.15);
assert.ok(g.player.invuln > 0);
advance(g, 0.05);
assert.ok(g.player.x > x + 100);
assert.equal(
  g.player.invuln,
  0,
  "dash is not invulnerable for its entire travel",
);
assert.equal(dash(g, 1, 0), false);
advance(g, 1.1);
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
      attack(g, p.cd === 0 && (e.kind !== "boss" || patterns.size >= 2));
    if (
      e.kind === "boss" &&
      e.state === "windup" &&
      e.age > 0.82 &&
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
assert.ok(g.player.hp > 0, "successful command-driven player survives");
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

g = createGame();
begin(g);
e = dummy(g, 282, 388);
e.hp = 55;
e.maxHp = 55;
assert.ok(
  inStrike(g.player, e, MOVES[0]),
  "body edge at dx102 is inside visible100px sweep",
);
const contact = strikeContact(g.player, e, MOVES[0]);
assert.equal(contact.x, 260);
assert.equal(contact.y, 330);
assert.ok(
  contact.x <= g.player.x + MOVES[0].reach,
  "impact stays inside actual weapon reach",
);
attack(g);
advance(g, 0.1);
assert.equal(e.hp, 55, "first J startup");
advance(g, 0.02);
assert.equal(e.hp, 41, "first J contact55→41");
assert.ok(
  e.x > 282 && e.x < 300,
  "contact begins recoil instead of teleporting the full knockback",
);
advance(g, 0.3);
assert.equal(e.hp, 41, "first J only hits once");
for (const [x, y] of [
  [303, 388],
  [140, 388],
  [282, 420],
]) {
  g = createGame();
  begin(g);
  e = dummy(g, x, y);
  e.hp = 55;
  attack(g);
  advance(g, 0.5);
  assert.equal(e.hp, 55, "out of reach, behind, or wrong depth is a miss");
  assert.equal(g.stats.hits, 0);
  assert.ok(
    !g.events.some((e) => ["hit", "counter", "juggle"].includes(e.type)),
    "miss has no contact event",
  );
}
function threat(age = 0.92, x = 260) {
  const game = createGame();
  begin(game);
  const foe = dummy(game, x, 388);
  Object.assign(foe, {
    kind: "boss",
    hp: 250,
    maxHp: 250,
    state: "windup",
    stun: 0,
    cooldown: 0,
    age,
    pattern: "slam",
    targetX: 180,
    targetY: 388,
    attackNo: 2,
  });
  return { game, foe };
}
({ game: g, foe: e } = threat());
dash(g, 1, 0);
advance(g, 0.08);
assert.equal(g.stats.perfectDodges, 1);
assert.ok(g.player.counterWindow > 1);
assert.equal(g.player.hp, 120);
assert.ok(g.events.some((e) => e.type === "perfect"));
advance(g, 0.18);
advance(g, 0.01, { left: true });
assert.ok(attack(g));
assert.equal(
  g.player.counterWindow,
  0,
  "next basic consumes counter opportunity",
);
advance(g, 0.16);
assert.equal(e.hp, 218, "counter adds18 to basic14");
assert.equal(g.stats.counterHits, 1);
assert.equal(e.state, "stunned", "counter breaks boss guard");
advance(g, 0.3);
assert.equal(e.hp, 218, "counter single hit");
({ game: g, foe: e } = threat());
dash(g, 1, 0);
advance(g, 0.26);
assert.ok(attack(g), "next basic may whiff");
advance(g, 0.5);
assert.equal(g.stats.counterHits, 0);
assert.equal(g.player.counterWindow, 0, "whiff consumes counter");
({ game: g, foe: e } = threat());
dash(g, 1, 0);
advance(g, 0.08);
e.stun = 99;
advance(g, COUNTER.window + 0.1);
assert.equal(g.player.counterWindow, 0, "counter expires");
advance(g, 0.01, { left: true });
attack(g);
advance(g, 0.16);
assert.equal(e.hp, 236, "expired counter returns to14 damage");
({ game: g, foe: e } = threat(0.4));
dash(g, 1, 0);
advance(g, 0.7);
assert.equal(g.stats.perfectDodges, 0, "early dodge does not earn counter");
assert.equal(g.player.counterWindow, 0);
assert.equal(
  dash(g),
  false,
  "dodge cooldown prevents generic invulnerability spam",
);
({ game: g, foe: e } = threat());
e.targetX = 500;
dash(g, 0, -1);
advance(g, 0.15);
assert.equal(g.stats.perfectDodges, 0, "unthreatened dodge gives no reward");
g = createGame();
begin(g);
dummy(g);
dash(g);
advance(g, 0.2);
assert.equal(g.player.invuln, 0);
assert.equal(g.player.counterWindow, 0, "empty dash gives no reward");
g = createGame();
begin(g);
assert.equal(g.player.counterWindow, 0);
assert.equal(g.player.counterAttack, false);
assert.equal(g.player.dodgeWindow, 0);
assert.equal(g.stats.perfectDodges, 0);
console.log(
  "PASS V2 first-J exact55→41, front/depth/reach misses, contact locations, precision dodge, boss guard counter, consume/whiff/expiry, early/empty dodge, cooldown/restart",
);

({ game: g, foe: e } = threat(0.3));
g.player.counterWindow = 0.8;
attack(g);
advance(g, 0.16);
assert.equal(
  e.state,
  "stunned",
  "counter interrupts guarded windup that normal strike preserves",
);
assert.equal(e.hp, 218);
({ game: g, foe: e } = threat());
dash(g, 1, 0);
advance(g, 0.26);
assert.ok(attack(g, true));
assert.ok(
  g.player.counterWindow > 0,
  "special does not spend next-basic counter",
);
advance(g, 0.75);
advance(g, 0.01, { left: true });
assert.ok(attack(g));
assert.equal(g.player.counterAttack, true);
console.log(
  "PASS recoil continuity, guarded windup counter interrupt, special preserves next-basic opportunity",
);
