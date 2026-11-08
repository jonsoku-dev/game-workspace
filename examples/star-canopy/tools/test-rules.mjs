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
