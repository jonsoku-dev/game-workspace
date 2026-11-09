import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createCampaign } from "../../../studio/engines/web/campaign.mjs";
import * as rules from "../game/rules.mjs";
const manifest = JSON.parse(
  fs.readFileSync(new URL("../genre.json", import.meta.url)),
);
const adapter = createCampaign(manifest.stages);
const nodes = new Map();
let document;
class Element {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.events = {};
    this.className = "";
    this.hidden = false;
    this.style = { setProperty() {} };
    this.textContent = "";
    this.disabled = false;
    this.attrs = {};
    const classes = new Set();
    this.classList = {
      add: (...xs) => xs.forEach((x) => classes.add(x)),
      remove: (...xs) => xs.forEach((x) => classes.delete(x)),
      toggle: (x, on) => (on ? classes.add(x) : classes.delete(x)),
      contains: (x) => classes.has(x),
    };
  }
  set innerHTML(html) {
    this.children = [];
    this.html = html;
    for (const match of html.matchAll(/id="([^"]+)"/g))
      nodes.set("#" + match[1], new Element());
  }
  get innerHTML() {
    return this.html || "";
  }
  append(child) {
    this.children.push(child);
    child.parent = this;
  }
  replaceChildren() {
    this.children = [];
  }
  remove() {
    if (this.parent)
      this.parent.children = this.parent.children.filter(
        (child) => child !== this,
      );
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
  removeAttribute(k) {
    delete this.attrs[k];
  }
  addEventListener(k, fn) {
    (this.events[k] ||= []).push(fn);
  }
  dispatch(k, props = {}) {
    for (const fn of this.events[k] || [])
      fn({ preventDefault() {}, stopPropagation() {}, ...props });
  }
  focus() {
    document.activeElement = this;
    this.dispatch("focus");
  }
  decode() {
    return Promise.resolve();
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 420, height: 510 };
  }
  setPointerCapture() {}
  querySelector(s) {
    return s === "img"
      ? this.children.find((c) => c.tag === "img")
      : new Element();
  }
  querySelectorAll(s) {
    return this.children.flatMap((c) => [
      ...(c.tag === s ? [c] : []),
      ...c.querySelectorAll(s),
    ]);
  }
  cloneNode() {
    const copy = new Element(this.tag);
    copy.style = { ...this.style };
    return copy;
  }
  get dataset() {
    return (this.data ||= {});
  }
}
for (const key of [
  "#restart-all",
  "#chain-label",
  "#board",
  "#tokens",
  "polyline",
  "#overlay",
  "#seams",
  "#particles",
  "#mend-sites",
  "#mend-thread",
  "#start",
  "#sound",
  "#pause",
  "#shake",
  "#continue",
  "#score",
  "#time",
  "#rescued",
  "#rescue-progress",
  "#mission-label",
  "#mission-target",
  "#round-label",
  "#stage-name",
  "#stage-objective",
  "#stage-tactic",
  "#bonus-hint",
  "#status",
  "#fever",
  "#fever-label",
  "#fever-caption",
  ".game-shell",
])
  nodes.set(key, new Element());
const badges = [new Element(), new Element(), new Element()];
document = {
  activeElement: null,
  hidden: false,
  querySelector: (s) => nodes.get(s) || null,
  querySelectorAll: (s) => (s === ".stitch-badge" ? badges : []),
  createElement: (tag) => new Element(tag),
  createElementNS: (_, tag) => new Element(tag),
  addEventListener() {},
};
const context = vm.createContext({
  ...rules,
  document,
  window: {},
  campaignAdapter: adapter,
  createFeedback: () => ({ emit() {}, setSound() {}, sound: false }),
  requestAnimationFrame() {},
  setTimeout() {},
  console,
});
let source = fs
  .readFileSync(new URL("../game/game.mjs", import.meta.url), "utf8")
  .replace(/import[\s\S]*?from "[^\"]+";\n/g, "")
  .replace("await loadCampaign()", "globalThis.campaignAdapter");
vm.runInContext(source, context);
const snapshot = () =>
  JSON.parse(JSON.stringify(context.window.pocket.snapshot()));
const click = (id) => {
  assert.equal(
    typeof nodes.get(id)?.onclick,
    "function",
    `available control ${id}`,
  );
  nodes.get(id).onclick();
};
let clock = 0;
function settle(seconds = 1.6) {
  for (let i = 0; i < seconds * 60; i++) {
    clock += 1000 / 60;
    vm.runInContext(`frame(${clock})`, context);
  }
}
function drag(ids) {
  const s = snapshot(),
    ts = new Map(s.tokens.map((t) => [t.id, t])),
    board = nodes.get("#board");
  const first = ts.get(ids[0]);
  board.dispatch("pointerdown", {
    clientX: first.x,
    clientY: first.y,
    pointerId: 1,
  });
  for (const id of ids.slice(1)) {
    const t = ts.get(id);
    board.dispatch("pointermove", { clientX: t.x, clientY: t.y, pointerId: 1 });
  }
  board.dispatch("pointerup");
}
function burstLatest() {
  const el = nodes.get("#seams").children.at(-1);
  assert.ok(el, "earned star control");
  el.onclick();
  settle();
}
click("#start");
assert.equal(snapshot().stageIndex, 0);
click("#continue");
assert.equal(snapshot().campaignPhase, "playing", "unmet goal cannot skip");
for (let i = 0; i < 30 && snapshot().rescued < 60; i++) {
  const ids = rules.findMove(snapshot().tokens);
  assert.equal(ids.length, 3);
  drag(ids);
  settle(0.5);
}
assert.ok(
  snapshot().rescued >= 60,
  "normal short-chain input reaches rescue objective",
);
const carry = snapshot().score;
click("#continue");
assert.equal(snapshot().campaignPhase, "between");
assert.equal(
  adapter.phase,
  "between",
  "production game calls real finishStage",
);
assert.equal(snapshot().stageIndex, 0, "win waits for explicit next");
click("#next");
assert.equal(snapshot().stageIndex, 1);
assert.equal(
  adapter.index,
  1,
  "real controller advances only after next input",
);
assert.equal(
  snapshot().phase,
  "ready",
  "second tactic is taught before clock starts",
);
assert.equal(snapshot().score, carry);
assert.equal(snapshot().entryScore, carry);
click("#stage-start");
let wrongPath = [];
for (const end of snapshot().tokens) {
  if (rules.mendHits(snapshot().sites, end).length) continue;
  const ordered = [
    end,
    ...snapshot().tokens.filter((token) => token.id !== end.id),
  ];
  const candidate = rules.findChain(ordered, 7, end);
  const endpoint = snapshot().tokens.find(
    (token) => token.id === candidate.at(-1),
  );
  if (
    candidate.length === 7 &&
    endpoint &&
    !rules.mendHits(snapshot().sites, endpoint).length
  ) {
    wrongPath = candidate;
    break;
  }
}
assert.equal(
  wrongPath.length,
  7,
  "normal seven-chain route can demonstrate a misplaced star",
);
drag(wrongPath);
burstLatest();
assert.ok(
  snapshot().sites.every((site) => !site.mended),
  "wrong-area burst does not repair",
);
const firstMove = rules.findMove(snapshot().tokens);
drag(firstMove);
settle();
assert.ok(
  snapshot().sites.every((s) => !s.mended),
  "ordinary rescues do not mend",
);
let target = snapshot().sites[0];
let path = rules.findChain(snapshot().tokens, 7, target);
assert.equal(
  path.length,
  7,
  "opening/safe assist supplies seven toward first seam",
);
drag(path);
assert.ok(
  snapshot().sites.every((s) => !s.mended),
  "long chain alone does not mend",
);
burstLatest();
assert.ok(snapshot().sites[0].mended, "stored star burst mends marked site");
assert.equal(snapshot().sites.filter((s) => s.mended).length, 1);
clock += 100000;
vm.runInContext(`frame(${clock})`, context);
assert.equal(
  snapshot().campaignPhase,
  "failed",
  "fixture clock expires unmet second round",
);
assert.equal(
  adapter.phase,
  "failed",
  "timeout reaches real controller failure",
);
click("#retry");
assert.equal(
  adapter.phase,
  "playing",
  "real retry returns current stage to playing",
);
assert.equal(adapter.index, 1, "real retry cannot reset or skip stage");
assert.equal(snapshot().stageIndex, 1);
assert.equal(
  snapshot().score,
  carry,
  "retry restores exact second-round entry score",
);
assert.ok(snapshot().sites.every((s) => !s.mended));
assert.equal(snapshot().rescued, 0);
assert.equal(snapshot().seams.length, 0);
click("#stage-start");
for (let i = 0; i < 2; i++) {
  target = snapshot().sites.find((s) => !s.mended);
  path = rules.findChain(snapshot().tokens, 7, target);
  assert.equal(
    path.length,
    7,
    "safe assist supplies actionable path for remaining seam",
  );
  drag(path);
  burstLatest();
}
assert.ok(snapshot().sites.every((s) => s.mended));
click("#continue");
assert.equal(
  snapshot().campaignPhase,
  "complete",
  "both tactics complete the two-round campaign",
);
assert.equal(
  adapter.phase,
  "complete",
  "real controller completes second objective",
);
click("#again");
assert.equal(adapter.index, 0, "real restart resets controller index");
assert.equal(adapter.phase, "playing", "real restart resets controller phase");
assert.equal(snapshot().stageIndex, 0);
assert.equal(snapshot().score, 0);
assert.equal(snapshot().entryScore, 0);
assert.equal(snapshot().rescued, 0);
assert.deepEqual(snapshot().sites, []);
console.log(
  "PASS production input handlers with DOM fixture and real shared campaign controller: rescue -> explicit next -> seam burst -> timed failure -> same-stage fair retry -> two-site win -> fresh restart. Fixture clock/DOM are not browser evidence.",
);
