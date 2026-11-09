import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCampaign } from "../../../studio/engines/web/campaign.mjs";
import { createSession } from "../game/progression.mjs";
import {
  createGame,
  begin,
  tick,
  attack,
  nextRoom,
  dash,
  ventState,
  shieldClosed,
} from "../game/combat.mjs";
const manifest = JSON.parse(
  readFileSync(new URL("../genre.json", import.meta.url)),
);
const advance = (g, seconds, input = {}) => {
  for (let i = 0; i < Math.ceil(seconds / 0.01) && g.phase === "playing"; i++)
    tick(g, 0.01, input);
};
function shieldFixture(back = false) {
  const g = createGame({ dungeon: 1 });
  begin(g);
  g.enemies = [
    {
      id: "shield",
      kind: "warden",
      x: 260,
      y: 388,
      face: -1,
      hp: 96,
      maxHp: 96,
      shieldBreak: 0,
      blockFlash: 0,
      knockback: 0,
      state: "approach",
      age: 0,
      cooldown: 99,
      hit: 0,
      z: 0,
      vz: 0,
      stun: 0,
      attackNo: 0,
      dead: false,
    },
  ];
  if (back) {
    g.player.x = 340;
    g.player.face = -1;
  }
  return g;
}
let g = shieldFixture();
attack(g);
advance(g, 0.2);
assert.equal(g.enemies[0].hp, 96, "front basic is blocked");
assert.equal(g.stats.blocks, 1);
assert.equal(g.stats.hits, 0);
assert.ok(g.events.some((e) => e.type === "block"));
assert.ok(!g.events.some((e) => e.type === "hit"));
g = shieldFixture(true);
attack(g);
advance(g, 0.2);
assert.equal(
  g.enemies[0].hp,
  76,
  "rear contact opens shield and rewards20 damage",
);
assert.equal(g.stats.shieldBreaks, 1);
assert.ok(!shieldClosed(g.enemies[0]));
assert.ok(g.events.some((e) => e.type === "break"));
assert.ok(g.events.some((e) => e.type === "hit"));
g.enemies[0].stun = 99;
advance(g, 3);
assert.ok(shieldClosed(g.enemies[0]), "shield reforms after opening window");
g = shieldFixture();
attack(g, true);
advance(g, 0.3);
assert.equal(g.enemies[0].hp, 72, "launcher breaks front shield");
assert.ok(g.enemies[0].z > 0);
assert.equal(g.stats.shieldBreaks, 1);
const brute = shieldFixture();
for (let i = 0; i < 180; i++) {
  if (i % 16 === 0) attack(brute);
  tick(brute, 0.01);
}
assert.equal(
  brute.enemies[0].hp,
  96,
  "front mashing remains ineffective through entire chain",
);
console.log(
  "PASS shield front block vs rear/launcher reward, distinct contact events, timed shield recovery",
);
g = createGame({ dungeon: 1 });
begin(g);
g.player.y = 350;
advance(g, 0.94);
assert.equal(g.player.hp, 120, "vent outline warns before damage");
assert.equal(ventState(g).phase, "warning");
advance(g, 0.08);
assert.equal(g.player.hp, 104, "active vent deals16");
advance(g, 0.5);
assert.equal(g.player.hp, 104, "one vent damage per cycle");
advance(g, 0.3);
assert.equal(ventState(g).phase, "cooling");
assert.equal(g.stats.ventHits, 1);
g = createGame({ dungeon: 1 });
begin(g);
g.player.y = 350;
advance(g, 0.7);
advance(g, 0.4, { down: true });
assert.equal(g.player.hp, 120, "normal depth move escapes warned lane");
g.stageTime = 3.8;
assert.equal(ventState(g).lane, 2);
g.stageTime = 7.4;
assert.equal(ventState(g).lane, 1);
console.log(
  "PASS warning→active→cooling vents, once-per-cycle damage, alternating lanes, ordinary directional escape",
);
function play(g, { stopAfterKill = false } = {}) {
  const initialKills = g.kills;
  const patterns = new Set();
  let flanked = null;
  for (let i = 0; i < 18000 && g.phase === "playing"; i++) {
    if (stopAfterKill && g.kills > initialKills) return;
    const p = g.player,
      input = {};
    const e = g.enemies
      .filter((e) => !e.dead)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    if (g.door) {
      input.right = true;
      if (p.x > 825) nextRoom(g);
    } else if (e && g.dungeon === 0) {
      if (e.kind === "boss" && e.state === "strike") patterns.add(e.pattern);
      if (i % 16 === 0) {
        if (Math.abs(e.x - p.x) < 130 && Math.abs(e.y - p.y) < 40)
          attack(g, p.cd === 0 && (e.kind !== "boss" || patterns.size >= 2));
        if (
          e.kind === "boss" &&
          e.state === "windup" &&
          e.age > 0.9 &&
          p.dashCd === 0
        )
          dash(g, 0, p.y > 390 ? -1 : 1);
      }
      if (Math.abs(e.x - p.x) > 73 || Math.sign(e.x - p.x) !== p.face)
        input[e.x > p.x ? "right" : "left"] = true;
      if (Math.abs(e.y - p.y) > 18) input[e.y > p.y ? "down" : "up"] = true;
    } else if (e) {
      const behind = (p.x - e.x) * e.face < -25;
      let goalY = e.y,
        goalX = e.x - e.face * 65;
      if (shieldClosed(e) && !behind) {
        goalY = e.y < 390 ? e.y + 62 : e.y - 62;
        if (Math.abs(p.y - e.y) > 48)
          input[goalX > p.x ? "right" : "left"] = true;
      } else if (Math.abs(goalX - p.x) > 7)
        input[goalX > p.x ? "right" : "left"] = true;
      const vent = ventState(g);
      if (
        vent.phase !== "cooling" &&
        goalY >= vent.top &&
        goalY <= vent.bottom
      ) {
        goalY = [vent.top - 8, vent.bottom + 8]
          .filter((y) => y >= 318 && y <= 465)
          .sort((a, b) => Math.abs(a - e.y) - Math.abs(b - e.y))[0];
      }
      if (Math.abs(goalY - p.y) > 3) input[goalY > p.y ? "down" : "up"] = true;
      if (vent.phase !== "cooling" && p.y >= vent.top && p.y <= vent.bottom) {
        const safe = [vent.top - 8, vent.bottom + 8]
          .filter((y) => y >= 318 && y <= 465)
          .sort((a, b) => Math.abs(a - p.y) - Math.abs(b - p.y))[0];
        input.up = safe < p.y;
        input.down = safe > p.y;
      }
      if (!behind) flanked = null;
      if (behind && (flanked === e.id || Math.abs(goalX - p.x) <= 10)) {
        flanked = e.id;
        input.left = false;
        input.right = false;
        if (Math.sign(e.x - p.x) !== p.face)
          input[e.x > p.x ? "right" : "left"] = true;
        if (
          i % 16 === 0 &&
          Math.abs(e.x - p.x) < 125 &&
          Math.abs(e.y - p.y) < 31 &&
          Math.sign(e.x - p.x) === p.face
        )
          attack(g);
      }
    }
    tick(g, 0.01, input);
    g.events = [];
  }
}
const campaign = createCampaign(manifest.stages),
  session = createSession(campaign);
assert.equal(session.advance(), false);
assert.equal(session.retry(), false);
assert.ok(session.start());
assert.equal(session.start(), false);
play(session.game);
assert.equal(
  session.game.phase,
  "clear",
  "normal rules finish original dungeon",
);
assert.ok(session.finish());
assert.equal(campaign.index, 0);
assert.equal(campaign.phase, "between");
assert.equal(session.finish(), false);
assert.equal(session.start(), false, "no implicit next-stage entry");
const earned = {
  score: session.game.score,
  kills: session.game.kills,
  hp: session.game.player.hp,
  best: session.game.best,
};
assert.ok(session.advance());
assert.equal(campaign.index, 1);
assert.equal(campaign.stage.title, manifest.stages[1].title);
assert.equal(session.advance(), false);
assert.equal(session.game.dungeon, 1);
assert.equal(session.game.score, earned.score);
assert.equal(session.game.kills, earned.kills);
assert.equal(session.game.best, earned.best);
assert.equal(session.game.player.hp, Math.min(120, earned.hp + 32));
const entry = structuredClone(session.game);
play(session.game, { stopAfterKill: true });
assert.ok(
  session.game.kills > entry.kills,
  "rear-only ordinary play kills shield guard",
);
assert.ok(session.game.stats.shieldBreaks > entry.stats.shieldBreaks);
const target = session.game.enemies.find((e) => !e.dead);
for (let i = 0; i < 800 && session.game.phase === "playing"; i++) {
  const p = session.game.player;
  tick(session.game, 0.01, {
    right: p.x < target.x - 60,
    left: p.x > target.x - 50,
    down: p.y < target.y,
    up: p.y > target.y + 2,
  });
}
advance(session.game, 45);
assert.equal(
  session.game.phase,
  "dead",
  "stage-two guard and vents can defeat player",
);
assert.ok(session.fail());
assert.equal(campaign.phase, "failed");
assert.ok(session.retry());
assert.equal(campaign.index, 1);
assert.equal(session.game.dungeon, 1);
assert.equal(
  session.game.score,
  entry.score,
  "retry cannot farm partial score",
);
assert.equal(session.game.kills, entry.kills);
assert.equal(session.game.player.hp, entry.player.hp);
assert.deepEqual(session.game.stats, entry.stats);
play(session.game);
assert.equal(
  session.game.phase,
  "clear",
  "normal rear-flanking movement clears second dungeon without launcher shortcut",
);
assert.ok(session.game.stats.shieldBreaks >= 3);
assert.ok(session.finish());
assert.equal(campaign.phase, "complete");
assert.equal(campaign.index, 1);
assert.equal(session.advance(), false);
assert.equal(session.retry(), false);
assert.ok(session.restart());
assert.equal(campaign.index, 0);
assert.equal(campaign.phase, "playing");
assert.equal(session.game.dungeon, 0);
assert.equal(session.game.score, 0);
assert.equal(session.game.kills, 0);
assert.equal(session.game.player.hp, 120);
assert.equal(session.game.stats.shieldBreaks, 0);
console.log(
  "PASS real plugin campaign + normal-rule two-dungeon clear, deliberate continue, carry progress, rear-only strategy, stage-local retry baseline, no farming/skip, final fresh restart",
);
