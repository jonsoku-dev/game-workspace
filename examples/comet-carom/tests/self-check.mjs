import assert from "node:assert/strict";
import {
  createGame,
  enterStage,
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

// Use the installed plugin implementation and manifest, not a campaign fixture.
const { readFileSync } = await import("node:fs");
const { createCampaign } =
  await import("../../../studio/engines/web/campaign.mjs");
const { createRun } = await import("../game/campaign-flow.mjs");
const manifest = JSON.parse(
  readFileSync(new URL("../genre.json", import.meta.url), "utf8"),
);
const campaign = createCampaign(manifest.stages),
  run = createRun(campaign);
assert.equal(run.advance(), false);
const campaignRoute = [];
for (let i = 0; i < 20 && campaign.phase === "playing"; i++) {
  const g = run.game,
    h = g.heroes[g.selected],
    e = g.foes.find((e) => e.hp > 0);
  const angle = Math.round((Math.atan2(e.y - h.y, e.x - h.x) * 180) / Math.PI);
  campaignRoute.push({
    stage: campaign.stage.id,
    unit: g.selected,
    angle,
    power: 100,
    skill: g.charge >= 3,
  });
  launch(g, angle, 100, g.charge >= 3);
  simulate(g);
  run.settle();
}
assert.equal(campaign.phase, "between");
assert.equal(campaign.index, 0);
const carried = {
  hits: run.game.totalHits,
  charge: run.game.charge,
  assists: run.game.assists,
};
assert(run.advance());
assert.equal(campaign.stage.id, "twin-observatory");
const entry = structuredClone(run.game);
assert.equal(entry.totalHits, carried.hits);
assert.equal(entry.charge, carried.charge);
assert.equal(entry.assists, carried.assists);
assert.equal(entry.hp, entry.maxHp);
const sealed = structuredClone(entry);
launch(sealed, -138, 100, true);
simulate(sealed);
assert.equal(sealed.foes[0].hp, 84);
assert(sealed.events.some((e) => e.kind === "sealed" && e.damage === 0));
const broken = structuredClone(entry);
launch(broken, -176, 100);
simulate(broken);
assert.equal(broken.lastShot.latches, 1);
assert.equal(broken.aperture, 0);
assert(broken.events.some((e) => e.type === "chainbreak"));
const predicted = previewShot(entry, 0, 100);
assert(predicted.opensCore);
assert.equal(predicted.latches.length, 2);
assert.deepEqual(run.game, entry);
const opened = structuredClone(entry);
launch(opened, 0, 100);
simulate(opened);
assert.equal(opened.aperture, 1);
assert.equal(opened.lastShot.latches, 2);
assert.deepEqual(
  opened.events.filter((e) => e.type === "latch").map((e) => e.latch),
  predicted.latches.map((e) => e.latch),
);
assert.equal(opened.foes[0].hp, 84); // Latches open a window, not automatic damage.
const expired = structuredClone(opened);
select(expired, 2);
launch(expired, 90, 0);
simulate(expired);
assert.equal(expired.aperture, 0);
// Lose with bounded real inputs, then restore exactly the stage entry snapshot.
for (let i = 0; i < 30 && run.game.phase === "aim"; i++) {
  launch(run.game, 90, 0);
  simulate(run.game);
  run.settle();
}
assert.equal(campaign.phase, "failed");
assert(run.retry());
assert.deepEqual(run.game, entry);
assert.equal(run.retry(), false);
for (let i = 0; i < 8 && campaign.phase === "playing"; i++) {
  const g = run.game;
  let angle;
  if (!g.aperture) {
    select(g, 1);
    angle = g.heroes[1].x < 360 ? 180 : 0;
  } else {
    select(g, 0);
    const h = g.heroes[0],
      e = g.foes[0];
    angle = Math.round((Math.atan2(e.y - h.y, e.x - h.x) * 180) / Math.PI);
  }
  campaignRoute.push({
    stage: campaign.stage.id,
    unit: g.selected,
    angle,
    power: 100,
    skill: false,
  });
  launch(g, angle, 100, false);
  simulate(g);
  run.settle();
}
assert.equal(campaign.phase, "complete");
assert.equal(run.game.phase, "won");
assert.equal(run.advance(), false);
assert.equal(
  campaignRoute.filter((s) => s.stage === "twin-observatory").length,
  4,
);
assert(run.restart());
assert.equal(campaign.index, 0);
assert.deepEqual(run.game, createGame());
console.log(
  "PASS installed campaign: genuine whole-degree two-stage clear, one-node chain break, sealed core, expiry, carried counters, real-loss checkpoint retry, complete/restart",
);
console.log("NORMAL_ROUTE " + JSON.stringify(campaignRoute));

// Exercise the actual render entrypoint and cue consumer under identical RAF times.
// DOM, sound and drawing are inert; actual impacts still drive the cosmetic branches.
const { runInNewContext } = await import("node:vm");
const renderer = readFileSync(
  new URL("../game/game.mjs", import.meta.url),
  "utf8",
);
const actualFrame = renderer.slice(
  renderer.indexOf("function frame(t)"),
  renderer.indexOf("function shoot()"),
);
const actualCues = renderer.slice(
  renderer.indexOf("function cues()"),
  renderer.indexOf("function portrait("),
);
function frameTrace(mode) {
  const game = createGame();
  launch(game, -90, 100);
  const context = {
    game,
    step,
    last: 0,
    acc: 0,
    fx: mode !== "off",
    hitStop: 0,
    hitFlash: 0,
    kick: 0,
    trail: [],
    particles: [],
    labels: [],
    impacts: [],
    beams: [],
    feedback: { emit() {} },
    $: () => ({ textContent: "" }),
    run: { settle() {} },
    updateUI() {},
    draw() {},
    requestAnimationFrame() {},
  };
  runInNewContext(
    actualCues + actualFrame + "globalThis.testFrame=frame;",
    context,
  );
  const samples = [];
  for (let i = 0; i <= 360; i++) {
    if (mode === "toggle") context.fx = i < 45 || i > 90;
    context.testFrame((i * 1000) / 60);
    samples.push(
      JSON.parse(
        JSON.stringify({
          heroes: game.heroes,
          foes: game.foes,
          hp: game.hp,
          turn: game.turn,
          phase: game.phase,
          elapsed: game.shot?.elapsed ?? null,
          totalHits: game.totalHits,
        }),
      ),
    );
  }
  assert(samples.some((s) => s.totalHits > 0 && s.phase === "flight"));
  assert.equal(samples.at(-1).phase, "aim");
  return samples;
}
const effectsOn = frameTrace("on");
assert.deepEqual(frameTrace("off"), effectsOn);
assert.deepEqual(frameTrace("toggle"), effectsOn);
console.log(
  "PASS actual RAF/cue path: FX on/off/mid-flight toggle have identical per-frame position, elapsed, damage and next-turn timing",
);
