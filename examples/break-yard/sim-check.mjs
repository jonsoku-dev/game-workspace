import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Run against an exported game's real sim/contact pair: node sim-check.mjs /export/game/sim.mjs.
const modulePath = process.argv[2];
assert(modulePath, 'Pass the exported game/sim.mjs path');
const { createGame, stepGame } = await import(pathToFileURL(path.resolve(modulePath)));
const dt = 1 / 60;
function frames(s, n, input = {}) {
  for (let i = 0; i < n; i++) stepGame(s, typeof input === 'function' ? input(s) : input, dt);
}
function tap(s, key, input = {}) {
  stepGame(s, { ...input, [key]: false }, dt);
  stepGame(s, { ...input, [key]: true }, dt);
}
function collide(s) {
  tap(s, 'chain');
  assert.equal(s.chain.anchors.length, 1);
  frames(s, 20, { chain: true });
  assert.equal(s.chain.anchors.length, 1, 'held hook cannot connect second machine');
  tap(s, 'chain');
  assert.equal(s.phase, 'reel');
  const before = s.machines[1].x - s.machines[0].x;
  frames(s, 30, { chain: true });
  assert(s.machines[1].x - s.machines[0].x < before, 'reel changes world distance');
  for (let i = 0; i < 200 && s.phase === 'reel'; i++) stepGame(s, { chain: true }, dt);
  assert.equal(s.phase, 'grind');
  assert.equal(s.separation, 112);
  assert(s.seam.exposed);
}
function cut(s) {
  const contactYs = [];
  for (let i = 0; i < 500 && s.phase === 'grind'; i++) {
    const before = s.grindProgress;
    const wasGuarded = s.guardClosed;
    stepGame(s, { pointerX: s.seam.x - 29, grind: true }, dt);
    if (s.contact.grinding) contactYs.push(s.contact.point.y);
    if (wasGuarded && s.guardClosed) { assert.equal(s.grindProgress, before); }
  }
  assert.equal(s.phase, 'pulse');
  assert(Math.max(...contactYs) - Math.min(...contactYs) > 35, 'actual contact patch travels down seam');
  assert.equal(s.machines[0].armor, 0);
  assert(s.contact.contactPatch);
  assert(Number.isFinite(s.contact.slip));
  assert(s.tool.y > 330, 'disc physically feeds down the seam while cutting');
}
function finish(s, phaseName, key) {
  for (let i = 0; i < 1800 && s.phase === phaseName; i++) {
    const r = s.rhythm;
    const targetX = s.seam.x - 29;
    const press = !s.guardClosed && Math.abs(r.clock - r.next) < .045;
    stepGame(s, { pointerX: targetX, [key]: press }, dt);
  }
  assert.notEqual(s.phase, phaseName, `manual ${phaseName} completes`);
  assert.notEqual(s.phase, 'lost');
}
const game = createGame();
assert.equal(game.phase, 'chain');
frames(game, 180, { grind: true, impact: true });
assert.equal(game.phase, 'chain', 'unconnected grinding and impacts cannot advance');
assert(game.heat > 0 || game.health < 100, 'uncharged strike has a cost');
collide(game); cut(game);
const pulseCount = game.pulses;
frames(game, 170, s => ({ pointerX: s.seam.x, grind: true }));
assert.equal(game.pulses, pulseCount, 'held grind cannot bank pulses');
finish(game, 'pulse', 'grind');
assert.equal(game.pulses, 3);
assert.equal(game.phase, 'core');
assert.equal(game.rhythm.needed, 1, 'charged core needs one heavy strike');
const earlyHeat = game.heat;
tap(game, 'impact', { pointerX: game.seam.x - 29 });
assert.equal(game.coreHits, 0, 'early impact cannot break core');
assert(game.heat > earlyHeat, 'early strike costs heat');
finish(game, 'core', 'impact');
assert.equal(game.coreHits, 1);
assert.equal(game.machines[0].core, 0);
assert(game.shockwave, 'heavy strike transmits shockwave');
assert(game.hitstop > 0, 'heavy impact freezes contact briefly');
const contactDistance = game.separation;
frames(game, 30, { impact: true });
assert.equal(game.coreHits, 1, 'held impact cannot repeat');
assert(game.separation > contactDistance, 'heavy impact physically knocks chassis apart');
assert.equal(game.phase, 'round-clear');
frames(game, 120);
assert.equal(game.round, 2);
assert.equal(game.phase, 'chain');
const firstX = game.machines[0].x;
frames(game, 30);
assert.notEqual(game.machines[0].x, firstX, 'round two moves world targets');
collide(game);
for (let i = 0; i < 300 && !(game.guardClosed && game.time % 3.8 > 2.8 && game.time % 3.8 < 3.0); i++) stepGame(game, {}, dt);
assert(game.guardClosed, 'round two closes a moving guard');
const guardedProgress = game.grindProgress, guardedHeat = game.heat;
frames(game, 6, s => ({ pointerX: s.seam.x - 29, grind: true }));
assert.equal(game.grindProgress, guardedProgress, 'guard denies cutting');
assert(game.heat > guardedHeat, 'guard contact produces extra heat');
cut(game); finish(game, 'pulse', 'grind'); finish(game, 'core', 'impact');
frames(game, 120);
assert.equal(game.phase, 'won');
frames(game, 300, { impact: true, chain: true, grind: true });
assert.equal(game.phase, 'won', 'completion is terminal');

const contact = createGame(); collide(contact); frames(contact, 8);
stepGame(contact, { pointerX: contact.seam.x, grind: true }, dt);
assert(['enter', 'stay'].includes(contact.contact.phase));
assert(contact.contact.depth > 0);
assert.equal(contact.contact.material, 'armor');
assert(contact.contact.normal.x < 0);
assert(Math.abs(contact.contact.slip) > 100, 'rotating disc has real material slip');
stepGame(contact, { pointerX: 100 }, dt);
assert.equal(contact.contact.phase, 'exit');
assert.equal(contact.contact.contactPatch, null);
stepGame(contact, { pointerX: 100 }, dt);
assert.equal(contact.contact.phase, 'none');
assert.equal(contact.contact.material, null);
const progress = contact.grindProgress;
frames(contact, 60, { pointerX: 100, grind: true });
assert.equal(contact.grindProgress, progress, 'off-material saw cannot cut');

const spam = createGame(); collide(spam); cut(spam);
for (let i = 0; i < 2400 && spam.phase !== 'lost'; i++) {
  stepGame(spam, { pointerX: spam.seam.x, grind: i % 2 === 0, impact: i % 2 === 0 }, dt);
}
assert.equal(spam.phase, 'lost', 'repeated spam overheats instead of auto-winning');
tap(spam, 'retry');
assert.equal(spam.phase, 'chain');
assert.equal(spam.round, 1);
assert.equal(spam.health, 100);
frames(spam, 60, { retry: true });
assert(spam.time > .9, 'held retry cannot reset every frame');
assert.equal(spam.chain.anchors.length, 0);
assert.equal(spam.particles.length, 0);
assert.throws(() => stepGame(spam, {}, NaN), /dt/);
assert.throws(() => stepGame(spam, {}, -1), /dt/);
stepGame(spam, {}, .25);
assert(Number.isFinite(spam.tool.velocity.x));
console.log('PASS: 2 rounds, world collision, contact/slip/detach, timed manual pulses/core, hold/spam rejection, loss/retry and terminal state');
