import assert from "node:assert/strict";
import { progression, portalOpen, landing } from "../game/rules.mjs";
assert.equal(progression(1).spell, false);
assert.equal(progression(2).level, 2);
assert.equal(progression(2).spell, true);
assert.equal(portalOpen(3, false), false);
assert.equal(portalOpen(2, true), false);
assert.equal(portalOpen(3, true), true);
assert.equal(landing(430, 460, 500, false).y, 450);
assert.equal(landing(430, 460, 500, true), undefined);
assert.equal(landing(450, 430, 500, false), undefined);
console.log(
  "PASS level unlock, three-leaf gate, charged portal, one-way platform/drop",
);

const { createSpell, advanceSpell, windBloom } = await import(
  "../game/rules.mjs"
);
assert.equal(createSpell(0, 0, 1, false), null, "LV1 cannot cast");
const flower = createSpell(100, 525, 1, true);
const casting = advanceSpell(flower, 0.17, [{ id: "foe", x: 170, y: 525 }]);
assert.equal(casting.x, 100, "cast anticipation stays at wand");
assert.equal(casting.hit, undefined, "casting never damages");
const contact = advanceSpell(casting, 0.13, [
  { id: "far", x: 220, y: 525 },
  { id: "near", x: 165, y: 525 },
]);
assert.equal(contact.phase, "travel");
assert.equal(
  contact.hit,
  "near",
  "first contact consumes directional projectile",
);
assert.equal(
  advanceSpell(flower, 0.4, [{ id: "behind", x: 0, y: 525 }]).hit,
  undefined,
  "wrong direction misses",
);
assert.equal(
  advanceSpell(flower, 0.4, [{ id: "above", x: 200, y: 340 }]).hit,
  undefined,
  "different platform height misses",
);
assert.equal(
  advanceSpell(createSpell(2100, 525, 1, true), 0.7, [windBloom]).hit,
  "bloom",
  "traveling flower contacts gate bloom",
);
assert.equal(
  advanceSpell(createSpell(2100, 390, 1, true), 0.7, [windBloom]).hit,
  undefined,
  "casting from high platform cannot remotely open gate",
);
assert.equal(portalOpen(2, true), false, "bloom cannot bypass third leaf");
console.log(
  "PASS cast windup, directional travel, nearest hit, height/direction misses and actual bloom contact",
);

const {
  moonPlatforms,
  moonBeacons,
  beaconWindow,
  beaconResponse,
  stageBaseline,
} = await import("../game/rules.mjs");
assert.equal(landing(430, 470, 500, false, moonPlatforms).y, 450);
assert.equal(landing(320, 345, 1100, false, moonPlatforms).y, 330);
assert.equal(
  advanceSpell(createSpell(450, 525, 1, true), 0.8, moonBeacons).hit,
  undefined,
  "ground spam misses both beacon heights",
);
assert.equal(
  advanceSpell(createSpell(450, 400, 1, true), 0.6, moonBeacons).hit,
  "beacon-1",
  "first platform aligns lower beacon",
);
assert.equal(
  advanceSpell(createSpell(1100, 280, -1, true), 0.5, moonBeacons).hit,
  "beacon-2",
  "upper right stance aligns second beacon leftward",
);
assert.deepEqual(beaconResponse(0, "beacon-2", -1, 1), {
  lit: 0,
  reason: "order",
});
assert.deepEqual(beaconResponse(0, "beacon-1", -1, 1), {
  lit: 0,
  reason: "direction",
});
assert.deepEqual(beaconResponse(0, "beacon-1", 1, 1), {
  lit: 1,
  reason: "lit",
});
assert.equal(beaconWindow(2.3), false);
assert.deepEqual(beaconResponse(1, "beacon-2", -1, 2.3), {
  lit: 1,
  reason: "pulse",
});
assert.deepEqual(beaconResponse(1, "beacon-2", 1, 0.7), {
  lit: 1,
  reason: "direction",
});
assert.deepEqual(beaconResponse(1, "beacon-2", -1, 4.7), {
  lit: 2,
  reason: "lit",
});
assert.equal(
  beaconResponse(2, "beacon-2", -1, 0.7).lit,
  2,
  "completed beacons do not increment",
);
assert.deepEqual(
  stageBaseline(0, 4),
  { hp: 100, kills: 0 },
  "full restart clears earned progression",
);
assert.deepEqual(
  stageBaseline(1, 3),
  { hp: 100, kills: 3 },
  "stage2 retry restores full entry health and earned spell",
);
assert.equal(progression(stageBaseline(1, 3).kills).spell, true);
console.log(
  "PASS moon layout, ground miss, aligned casts, beacon order/direction/pulse, stage-entry retry and full restart baselines",
);

const { missedHeight } = await import("../game/rules.mjs");
const groundMiss = advanceSpell(
  createSpell(450, 525, 1, true),
  1.1,
  moonBeacons,
);
assert.equal(
  missedHeight(groundMiss, moonBeacons[0]),
  true,
  "ground miss explains required lower platform height",
);
assert.equal(
  missedHeight(
    advanceSpell(createSpell(450, 400, -1, true), 1.1, []),
    moonBeacons[0],
  ),
  false,
  "wrong direction is not misreported as height",
);
assert.equal(
  missedHeight(
    advanceSpell(createSpell(450, 400, 1, true), 1.1, []),
    moonBeacons[0],
  ),
  false,
  "same height miss keeps ordinary miss cue",
);
console.log("PASS distinct height-miss classification");
