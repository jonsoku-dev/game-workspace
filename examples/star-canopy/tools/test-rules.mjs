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
