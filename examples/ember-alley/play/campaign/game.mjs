import { loadCampaign } from "./campaign.mjs";
import { createSession } from "./progression.mjs";
import { createFeedback } from "./feedback.mjs";
import {
  MOVES,
  DODGE,
  COUNTER,
  windupDuration,
  ventState,
  shieldClosed,
  begin,
  tick,
  attack,
  dash,
  nextRoom,
  clamp,
} from "./combat.mjs";
const campaign = await loadCampaign();
const session = createSession(campaign);
const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d");
const ui = Object.fromEntries(
  [
    "overlay",
    "kicker",
    "heading",
    "description",
    "start",
    "status",
    "sound",
    "pause",
    "stageName",
    "stageObjective",
    "stageTactic",
  ].map((id) => [id, document.getElementById(id)]),
);
ctx.setTransform(2, 0, 0, 2, 0, 0);
const attackButton = document.querySelector('[data-key="j"]');
const feedback = createFeedback({ sound: false });
const scenery = new Image();
scenery.src = "./scenery/foundry.webp";
const furnaceScenery = new Image();
furnaceScenery.src = "./scenery/furnace-v2.webp";
const liftScenery = new Image();
liftScenery.src = "./scenery/lift.webp";
let g = session.game,
  keys = new Set(),
  last = 0,
  paused = false,
  fx = [],
  floaters = [],
  banner = { text: "", time: 0 },
  art,
  images = {},
  counterShown = false,
  assetsReady = false;
const W = 960,
  H = 540;
const artReady = fetch("./art/atlas.json")
  .then((r) => {
    if (!r.ok) throw Error("아트 메타데이터 로드 실패");
    return r.json();
  })
  .then(async (data) => {
    art = data;
    for (const key of ["player", "foe", "boss"]) {
      const spec = art[key];
      spec.frameWidth *= 2;
      spec.frameHeight *= 2;
      spec.pivot = spec.pivot.map((v) => v * 2);
    }
    for (const [key, path] of Object.entries({
      player: "player.v2.png",
      foe: "foe.v2.png",
      boss: "boss.v2.png",
    })) {
      const im = new Image();
      im.src = `./art/${path}`;
      await im.decode();
      if (
        im.naturalWidth !== art[key].frameWidth * art[key].frames ||
        im.naturalHeight !== art[key].frameHeight
      )
        throw Error(`V2 작화 크기가 맞지 않습니다: ${key}`);
      images[key] = im;
    }
    await Promise.all([
      scenery.decode(),
      furnaceScenery.decode(),
      liftScenery.decode(),
    ]);
    assetsReady = true;
  })
  .catch((error) => {
    ui.status.textContent = error.message;
    ui.start.disabled = true;
  });
function emit(name, details = {}) {
  feedback.emit(name, details);
}
function clearInput() {
  keys.clear();
  for (const button of document.querySelectorAll("button.held"))
    button.classList.remove("held");
}
function showStage() {
  ui.stageName.textContent = `던전 ${campaign.index + 1} · ${campaign.stage.title}`;
  ui.stageObjective.textContent = campaign.stage.objective;
  ui.stageTactic.textContent = campaign.stage.tactic;
}
showStage();
ui.heading.textContent = campaign.stage.title;
ui.description.textContent = `${campaign.stage.objective} ${campaign.stage.tactic}`;
function enterBattle() {
  g = session.game;
  paused = false;
  clearInput();
  fx = [];
  floaters = [];
  banner = { text: campaign.stage.title, time: 2.4 };
  showStage();
  ui.overlay.hidden = true;
  canvas.focus();
  ui.pause.textContent = "일시정지 P";
  ui.status.textContent = campaign.stage.tactic;
  emit("restart");
}
function activate() {
  if (paused) {
    togglePause();
    return;
  }
  const changed =
    campaign.phase === "between"
      ? session.advance()
      : campaign.phase === "failed"
        ? session.retry()
        : campaign.phase === "complete"
          ? session.restart()
          : session.start();
  if (changed) enterBattle();
}
ui.start.addEventListener("click", async () => {
  await artReady;
  if (assetsReady) activate();
});
ui.sound.addEventListener("click", () => {
  feedback.setSound(!feedback.sound);
  ui.sound.textContent = feedback.sound ? "소리 켜짐" : "소리 꺼짐";
  ui.sound.setAttribute("aria-pressed", String(feedback.sound));
  emit("select");
});
function togglePause() {
  if (g.phase !== "playing") return;
  paused = !paused;
  clearInput();
  ui.overlay.hidden = !paused;
  ui.pause.textContent = paused ? "계속 P" : "일시정지 P";
  if (!paused) canvas.focus();
  if (paused) {
    ui.kicker.textContent = "PAUSED";
    ui.heading.textContent = "숨을 고르다.";
    ui.description.textContent = "계속 버튼 또는 P로 전투에 돌아갑니다.";
    ui.start.textContent = "계속 싸우기 ↗";
  }
  emit(paused ? "pause" : "resume");
}
ui.pause.addEventListener("click", togglePause);
function action(key) {
  if (!assetsReady) return;
  if (key === "r") {
    session.restart();
    enterBattle();
    return;
  }
  if (key === "p") {
    togglePause();
    return;
  }
  if (paused) return;
  if (key === "j") attack(g);
  if (key === "k") attack(g, true);
  if (key === " ")
    dash(
      g,
      Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft")),
      Number(keys.has("s") || keys.has("arrowdown")) -
        Number(keys.has("w") || keys.has("arrowup")),
    );
  if (key === "enter") {
    if (campaign.phase === "between") {
      if (session.advance()) enterBattle();
    } else nextRoom(g);
  }
}
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (e.target instanceof HTMLButtonElement && [" ", "enter"].includes(key))
    return;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
    e.preventDefault();
  if (!keys.has(key)) action(key);
  keys.add(key);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  clearInput();
  if (g.phase === "playing" && !paused) togglePause();
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(button.dataset.key);
    button.classList.add("held");
    action(button.dataset.key);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(name, () => {
      keys.delete(button.dataset.key);
      button.classList.remove("held");
    });
}
function input() {
  return {
    left: keys.has("a") || keys.has("arrowleft"),
    right: keys.has("d") || keys.has("arrowright"),
    up: keys.has("w") || keys.has("arrowup"),
    down: keys.has("s") || keys.has("arrowdown"),
  };
}
function text(s, x, y, size = 14, color = "#eee3cf", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${size > 25 ? "900" : "600"} ${size}px system-ui,sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function poly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function background() {
  const furnace = g.room === 1;
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, "#121a25");
  sky.addColorStop(0.6, furnace ? "#5d3430" : "#3f4447");
  sky.addColorStop(1, "#24272a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  rect(0, 35, 960, 10, "#10151b");
  for (let i = 0; i < 9; i++) {
    const x = i * 130 - 45;
    rect(x, 15, 68, 205, "#1e2933");
    rect(x + 6, 21, 56, 155, "#18222d");
    for (let j = 0; j < 4; j++) rect(x + 10, 55 + j * 30, 45, 3, "#34414a");
  }
  rect(0, 102, 960, 8, "#10171d");
  rect(0, 112, 960, 3, "#606466");
  rect(0, 219, 960, 6, "#191c21");
  for (let i = 0; i < 6; i++) {
    const x = i * 185 - 20;
    rect(x, 155, 139, 145, furnace ? "#373338" : "#343d43");
    rect(x + 5, 160, 129, 133, "#232c34");
    for (let j = 0; j < 5; j++) rect(x + 9, 168 + j * 24, 120, 2, "#465057");
    rect(x + 125, 160, 6, 133, "#151c23");
  }
  if (furnace) {
    rect(286, 125, 340, 180, "#14171c");
    poly(
      [
        [286, 153],
        [320, 126],
        [596, 126],
        [626, 153],
        [626, 290],
        [286, 290],
      ],
      "#684438",
    );
    for (let i = 0; i < 8; i++) {
      rect(310 + i * 37, 150, 11, 137, "#151b21");
      rect(322 + i * 37, 156, 15, 119, "#d46e3b");
    }
    text("第 二 製 錬 所", 456, 113, 18, "#dcac74", "center");
  } else {
    rect(345, 157, 251, 69, "#171f29");
    rect(352, 164, 237, 55, "#23303c");
    text("灰 / IRON DISTRICT", 471, 196, 21, "#df895a", "center");
    rect(352, 218, 237, 3, "#ed9b63");
  }
  for (const x of [65, 870]) {
    rect(x, 32, 18, 273, "#1b2027");
    rect(x + 3, 33, 5, 273, "#647079");
    for (let y = 55; y < 290; y += 48) {
      rect(x - 3, y, 24, 8, "#252a31");
      rect(x - 2, y, 4, 6, "#977650");
    }
  }
  poly(
    [
      [0, 297],
      [960, 297],
      [960, 540],
      [0, 540],
    ],
    "#34363a",
  );
  poly(
    [
      [0, 301],
      [960, 301],
      [960, 319],
      [0, 319],
    ],
    "#181f25",
  );
  for (let row = 0; row < 6; row++) {
    const y = 320 + row * 42;
    rect(0, y, 960, 2, "#171e24");
    rect(0, y + 2, 960, 1, "#555451");
    for (let x = (row % 2) * 80 - 80; x < 960; x += 160)
      rect(x, y, 2, 42, "#20262d");
  }
  for (let i = 0; i < 22; i++) {
    const x = (i * 173 + 41) % 960,
      y = 327 + ((i * 73) % 200);
    rect(x, y, 24 + (i % 6) * 8, 2, "#272b30");
    rect(x + 11, y + 3, 9, 1, "#5e5348");
  }
  poly(
    [
      [0, 306],
      [154, 306],
      [38, 540],
      [0, 540],
    ],
    "#1d252b",
  );
  poly(
    [
      [817, 306],
      [960, 306],
      [960, 540],
      [931, 540],
    ],
    "#20272d",
  );
  for (let i = 0; i < 8; i++) {
    poly(
      [
        [i * 23, 309],
        [i * 23 + 12, 309],
        [i * 23 - 3, 324],
        [i * 23 - 15, 324],
      ],
      "#b18245",
    );
    poly(
      [
        [804 + i * 23, 309],
        [816 + i * 23, 309],
        [831 + i * 23, 324],
        [819 + i * 23, 324],
      ],
      "#b18245",
    );
  }
  for (const [x, y] of [
    [27, 287],
    [887, 292],
  ]) {
    rect(x, y - 32, 42, 39, "#46413a");
    rect(x + 3, y - 28, 36, 29, "#282c30");
    rect(x + 7, y - 25, 3, 27, "#766350");
    rect(x + 30, y - 25, 3, 27, "#766350");
  }
  const glow = ctx.createRadialGradient(
    furnace ? 470 : 600,
    240,
    3,
    furnace ? 470 : 600,
    240,
    320,
  );
  glow.addColorStop(0, furnace ? "#ff9b4428" : "#e7c59112");
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  if (scenery.complete && scenery.naturalWidth) {
    const plate =
      g.dungeon === 1 ? liftScenery : furnace ? furnaceScenery : scenery;
    ctx.drawImage(plate, 0, 0, W, H);
    rect(0, 297, W, 1, "#dbb99030");
  }
  const t = g.time;
  for (let i = 0; i < 15; i++) {
    const x = (i * 113 + t * (9 + (i % 3) * 7)) % 960,
      y = 295 - ((t * 12 + i * 31) % 260);
    rect(x, y, 2, 2, i % 3 ? "#a66c4b" : "#ecb77d");
  }
  if (g.door) {
    rect(895, 166, 60, 139, "#131f24");
    rect(900, 170, 50, 130, "#487668");
    text("EXIT", 925, 206, 14, "#c7ffe0", "center");
    poly(
      [
        [910, 245],
        [931, 245],
        [931, 236],
        [945, 251],
        [931, 266],
        [931, 257],
        [910, 257],
      ],
      "#a0ebbb",
    );
    ellipse(916, 356, 38, 13, "#8fdfac25");
    text("ENTER", 913, 326, 11, "#c0eecb", "center");
  }
}
function drawVents() {
  const vent = ventState(g);
  if (!vent) return;
  for (const [top, bottom] of [
    [326, 366],
    [377, 417],
    [428, 468],
  ]) {
    for (let x = 155; x < 895; x += 28) rect(x, top + 3, 17, 2, "#88a4b744");
    ctx.strokeStyle = "#8dabb144";
    ctx.lineWidth = 1;
    ctx.strokeRect(140, top, 760, bottom - top);
  }
  const warn = vent.phase === "warning",
    active = vent.phase === "active";
  const color = active ? "#ffb880" : warn ? "#ffda94" : "#a0cfc1";
  rect(
    140,
    vent.top,
    760,
    vent.bottom - vent.top,
    active ? "#ef713e55" : warn ? "#e2a65c25" : "#7aada311",
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = warn || active ? 3 : 1;
  ctx.setLineDash(warn ? [9, 5] : []);
  ctx.strokeRect(140, vent.top, 760, vent.bottom - vent.top);
  ctx.setLineDash([]);
  text(
    `${active ? "!!! 분출" : warn ? "△ 증기 예고" : "냉각 · 이동 가능"} · ${vent.name}`,
    150,
    vent.top + 15,
    11,
    color,
  );
  if (active)
    for (let x = 230; x < 900; x += 150) {
      const h = feedback.reducedMotion
        ? 28
        : 28 + Math.sin(g.stageTime * 15 + x) * 12;
      poly(
        [
          [x - 9, vent.bottom],
          [x - 5, vent.top - h],
          [x + 1, vent.top - 9],
          [x + 8, vent.top - h * 0.7],
          [x + 13, vent.bottom],
        ],
        "#ffd6ac66",
      );
    }
}
function drawShield(a) {
  const front = a.x + a.face * 37,
    y = a.y - a.z - 82;
  if (shieldClosed(a)) {
    ctx.save();
    ctx.translate(front, y);
    ctx.scale(a.face, 1);
    poly(
      [
        [-13, -38],
        [12, -31],
        [18, 23],
        [0, 40],
        [-17, 25],
      ],
      a.blockFlash > 0 ? "#b9e8ee" : "#344c61",
    );
    ctx.strokeStyle = "#adcccf";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, -38);
    ctx.lineTo(12, -31);
    ctx.lineTo(18, 23);
    ctx.lineTo(0, 40);
    ctx.lineTo(-17, 25);
    ctx.closePath();
    ctx.stroke();
    rect(-2, -25, 4, 48, "#9ecacb");
    ctx.restore();
    text("뒤쪽", a.x - a.face * 58, a.y - 10, 11, "#b9edc9", "center");
  } else if (!a.dead) {
    text(
      `방패 개방 ${a.shieldBreak.toFixed(1)}`,
      a.x,
      a.y - a.z - 154,
      12,
      "#b9edc9",
      "center",
    );
  }
}
function tells() {
  for (const e of g.enemies) {
    if (e.dead || !["windup", "strike"].includes(e.state)) continue;
    const strike = e.state === "strike",
      alpha = strike ? "88" : "44";
    const tellY = e.y - (["boss", "warden"].includes(e.kind) ? 194 : 112);
    if (e.pattern === "slam") {
      ellipse(e.targetX, e.targetY, 102, 65, `#ff593f${alpha}`);
      ctx.strokeStyle = "#ff9c6a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.targetX, e.targetY, 102, 65, 0, 0, Math.PI * 2);
      ctx.stroke();
      text("分 碎", e.targetX, e.targetY + 5, 17, "#ffd0a2", "center");
    } else {
      const range = e.pattern === "rush" ? 540 : 114;
      const x = e.face > 0 ? e.x : e.x - range;
      rect(x, e.targetY - 28, range, 56, `#ee594a${alpha}`);
      for (let i = 0; i < range; i += 30)
        poly(
          [
            [x + i, e.targetY - 10],
            [x + i + e.face * 12, e.targetY],
            [x + i, e.targetY + 10],
          ],
          "#ffad7d88",
        );
    }
    if (e.state === "windup") {
      const remaining = windupDuration(e) - e.age,
        perfect = remaining <= DODGE.perfect;
      rect(e.x - 22, tellY + 6, 44, 3, "#221e22");
      rect(
        e.x - 22,
        tellY + 6,
        44 * clamp(e.age / windupDuration(e), 0, 1),
        3,
        perfect ? "#b9fff0" : "#ee9871",
      );
    }
    if (e.state === "windup")
      text(
        windupDuration(e) - e.age <= DODGE.perfect
          ? "회피!"
          : e.pattern === "rush"
            ? "쇄도"
            : e.pattern === "slam"
              ? "분쇄"
              : "!",
        e.x,
        tellY,
        17,
        "#ffad75",
        "center",
      );
  }
}
function frameIndex(key, state, age) {
  const states = art[key].states;
  if (key !== "player") {
    if (state === "windup") return states.attack[0];
    if (state === "attack")
      return states.attack[key === "boss" ? 1 : states.attack.length - 1];
    if (state === "recover" && key === "boss") return states.attack[2];
  }
  const frames = states[state] || states[state === "dead" ? "hurt" : "idle"];
  const move =
    state === "launcher"
      ? 3
      : key === "player" && state.startsWith("attack")
        ? Number(state.slice(-1)) - 1
        : -1;
  if (move >= 0) {
    const active = MOVES[move].active;
    return frames[age < active[0] ? 0 : age <= active[1] ? 1 : 2];
  }
  return frames[Math.floor(age * 9) % frames.length];
}
function sprite(
  key,
  state,
  x,
  y,
  face,
  age,
  scale = 1,
  hit = false,
  alpha = 1,
) {
  const im = images[key];
  if (!im) return;
  const spec = art[key];
  const fw = spec.frameWidth,
    fh = spec.frameHeight;
  let f = frameIndex(key, state, age);
  f = clamp(f, 0, Math.floor(im.width / fw) - 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face * scale, scale);
  ctx.imageSmoothingEnabled = true;
  if (hit) ctx.filter = "brightness(1.4) sepia(.15)";
  ctx.drawImage(
    im,
    f * fw,
    0,
    fw,
    fh,
    -(spec.pivot?.[0] ?? fw / 2),
    -(spec.pivot?.[1] ?? fh),
    fw,
    fh,
  );
  ctx.restore();
}
function actors() {
  const p = g.player;
  const actors = [
    ...g.enemies.map((e) => ({ ...e, player: false })),
    { ...p, player: true },
  ].sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.dead && a.age > 1) continue;
    const scale = a.player
      ? 0.86
      : ["boss", "warden"].includes(a.kind)
        ? 0.76
        : a.kind === "elite"
          ? 1.02
          : 0.94;
    const deadAlpha = a.dead ? Math.max(0, 1 - a.age) : 1;
    ellipse(
      a.x,
      a.y + 1,
      a.player ? 31 : ["boss", "warden"].includes(a.kind) ? 52 : 30,
      9,
      `rgba(0,0,0,${0.38 * deadAlpha})`,
    );
    if (a.player) {
      let state =
        a.hurt > 0
          ? "hurt"
          : a.dash > 0
            ? "dash"
            : a.move >= 0
              ? a.move === 3
                ? "launcher"
                : `attack${a.move + 1}`
              : Object.values(input()).some(Boolean)
                ? "walk"
                : "idle";
      if (a.dash > 0 && !feedback.reducedMotion)
        for (let i = 3; i > 0; i--)
          sprite(
            "player",
            "dash",
            a.x - a.dashX * i * 17,
            a.y - a.dashY * i * 11,
            a.face,
            g.time,
            scale,
            false,
            0.09,
          );
      sprite(
        "player",
        state,
        a.x,
        a.y,
        a.face,
        a.move >= 0 ? a.age : a.walk || g.time,
        scale,
        a.hurt > 0,
        a.invuln > 0 && Math.floor(g.time * 19) % 2 ? 0.5 : 1,
      );
      if (a.move >= 0) {
        const m = MOVES[a.move];
        if (a.age >= m.active[0] && a.age <= m.active[1])
          slash(a.x, a.y - 58, a.face, a.move, a.age);
      }
    } else {
      const state = a.dead
        ? "dead"
        : a.hit > 0
          ? "hurt"
          : a.state === "strike"
            ? "attack"
            : a.state === "windup"
              ? "windup"
              : a.state === "approach"
                ? "walk"
                : a.state === "recover"
                  ? "recover"
                  : "idle";
      sprite(
        ["boss", "warden"].includes(a.kind) ? "boss" : "foe",
        state,
        a.x,
        a.y - a.z,
        a.face,
        a.age,
        scale,
        a.hit > 0,
        deadAlpha,
      );
      if (a.kind === "warden") drawShield(a);
      if (!a.dead) {
        const healthY = a.y - a.z - (a.kind === "warden" ? 176 : 124);
        rect(a.x - 28, healthY, 56, 4, "#111820");
        rect(
          a.x - 28,
          healthY,
          (56 * a.hp) / a.maxHp,
          4,
          a.kind === "elite" ? "#e7aa69" : "#d15f50",
        );
        if (a.kind === "elite")
          text("철갑", a.x, a.y - 132 - a.z, 10, "#e6c19b", "center");
      }
    }
  }
}
function slash(x, y, face, move, age) {
  const m = MOVES[move],
    t = (age - m.active[0]) / (m.active[1] - m.active[0]),
    r = m.reach;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.globalAlpha = 0.42 * (1 - t) + 0.16;
  ctx.fillStyle = move === 3 ? "#ffbe70" : "#f2e0bc";
  ctx.beginPath();
  ctx.moveTo(18, move === 3 ? 47 : -31);
  ctx.quadraticCurveTo(
    r * 0.65,
    move === 3 ? -61 : -40,
    r,
    move === 3 ? -72 : 6,
  );
  ctx.quadraticCurveTo(
    r * 0.7,
    move === 3 ? -20 : 25,
    24,
    move === 3 ? 48 : 33,
  );
  ctx.quadraticCurveTo(
    r * 0.78,
    move === 3 ? -4 : 8,
    r - 9,
    move === 3 ? -52 : 4,
  );
  ctx.quadraticCurveTo(
    r * 0.62,
    move === 3 ? -36 : -27,
    18,
    move === 3 ? 47 : -31,
  );
  ctx.fill();
  ctx.restore();
}
function contactMark(f) {
  if (f.block) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.strokeStyle = "#b1d8ee";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, -13);
    ctx.lineTo(8, 0);
    ctx.lineTo(-9, 13);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const progress = 1 - f.life / 0.16;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.globalAlpha = Math.max(0, 1 - progress);
  ctx.scale(1 + progress * 0.35, 1 + progress * 0.35);
  poly(
    [
      [0, -17],
      [4, -5],
      [17, -9],
      [8, 0],
      [21, 8],
      [5, 6],
      [0, 20],
      [-4, 5],
      [-17, 10],
      [-8, 0],
      [-18, -8],
      [-4, -5],
    ],
    f.counter ? "#b5fff1" : "#ffce8b",
  );
  poly(
    [
      [0, -9],
      [3, -2],
      [10, 1],
      [3, 3],
      [0, 10],
      [-2, 3],
      [-9, 0],
      [-3, -2],
    ],
    "#fff9e8",
  );
  ctx.restore();
}
function hud() {
  const p = g.player;
  rect(24, 21, 256, 52, "#101720e8");
  text("焰  /  잿불", 36, 42, 13, "#e8b998");
  rect(36, 52, 229, 8, "#3d3032");
  rect(36, 52, (229 * p.hp) / 120, 8, "#e8855b");
  text(`${p.hp} / 120`, 277, 42, 11, "#dad4c5", "right");
  text(
    `${campaign.stage.title} · ${g.dungeon === 0 ? `${g.room + 1}구역 · ` : ""}${g.door ? "봉쇄 해제" : `${g.wave + 1}차 봉쇄`}`,
    480,
    35,
    14,
    "#c8c8be",
    "center",
  );
  text(String(g.score).padStart(6, "0"), 933, 39, 22, "#eedbc1", "right");
  text("SCORE", 934, 55, 9, "#999d9d", "right");
  if (g.combo > 0) {
    text(`${g.combo}`, 908, 137, 55, "#ffba78", "right");
    text(
      g.combo > 2 ? "CHAIN / 연격" : "HIT",
      910,
      156,
      12,
      "#f1d9b8",
      "right",
    );
    rect(829, 164, (81 * g.comboTime) / 2.3, 3, "#f4a365");
  }
  rect(24, 481, 164, 37, "#111820dd");
  text("K  잿불 승천", 33, 499, 12, p.cd > 0 ? "#8e959b" : "#ffc68d");
  rect(33, 506, 143 * (1 - p.cd / 3.8), 3, p.cd > 0 ? "#6f6660" : "#f1b174");
  text(
    p.cd > 0 ? `${p.cd.toFixed(1)}초` : "READY",
    175,
    499,
    10,
    "#e5c2a0",
    "right",
  );
  rect(201, 481, 145, 37, "#111820dd");
  text("SPACE  회피", 210, 499, 12, p.dashCd > 0 ? "#8e959b" : "#c5e5df");
  rect(210, 506, 126 * (1 - p.dashCd / DODGE.cooldown), 3, "#8fbeb6");
  const ready = p.counterWindow > 0;
  rect(359, 481, 239, 37, ready ? "#173b3aee" : "#111820dd");
  text(
    ready
      ? g.dungeon === 1
        ? "J 반격 · 방패는 뒤쪽에서"
        : "J  반격 · 가드 파괴"
      : g.dungeon === 1
        ? "방패 뒤로 / K · 증기 구역 회피"
        : "공격 직전 회피 → J 반격",
    369,
    499,
    12,
    ready ? "#b9fff0" : "#9baaa9",
  );
  rect(369, 506, 218 * (p.counterWindow / COUNTER.window), 3, "#a2edda");
  if (ready !== counterShown) {
    counterShown = ready;
    attackButton.classList.toggle("counter-ready", ready);
    attackButton.querySelector("b").textContent = ready ? "반격" : "연격";
    attackButton.setAttribute(
      "aria-label",
      ready ? "간파 성공, J로 반격" : "3연속 공격",
    );
  }
  const boss = g.enemies.find(
    (e) => e.kind === "boss" || (e.kind === "warden" && g.wave === 1),
  );
  if (boss && !boss.dead) {
    text(
      boss.kind === "warden"
        ? `${campaign.stage.title} · 방패 수문장`
        : "쇠사슬 감독관  /  THE FOREMAN",
      480,
      80,
      13,
      "#f1bd8e",
      "center",
    );
    rect(318, 90, 324, 7, "#231f26");
    rect(318, 90, (324 * boss.hp) / boss.maxHp, 7, "#b64e43");
    const broken = boss.state === "stunned" || boss.z > 0;
    text(
      boss.kind === "warden"
        ? shieldClosed(boss)
          ? "정면 방패 · 뒤쪽 / K"
          : "방패 개방 · 연격 기회"
        : broken
          ? "가드 붕괴"
          : "가드 · 회피 반격으로 끊기",
      480,
      113,
      10,
      broken ? "#b5fff1" : "#c3b6a4",
      "center",
    );
  }
  if (banner.time > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, banner.time * 2);
    rect(247, 200, 466, 61, "#111820db");
    rect(247, 200, 3, 61, "#d38f55");
    text(banner.text, 480, 237, 23, "#edd2af", "center");
    ctx.restore();
  }
}
function processEvents() {
  for (const e of g.events) {
    if (e.type === "block") {
      fx.push({ kind: "contact", block: true, x: e.x, y: e.y, life: 0.12 });
      floaters.push({
        text: "방패",
        x: e.x,
        y: e.y - 20,
        life: 0.45,
        color: "#b1d8ee",
      });
      ui.status.textContent =
        "정면은 막힙니다. 방패 뒤쪽으로 돌아가거나 K 올려치기로 개방하세요.";
    }
    if (e.type === "break") {
      floaters.push({
        text: e.text,
        x: e.x,
        y: e.y,
        life: 0.8,
        color: "#b9edc9",
      });
      ui.status.textContent = "방패 개방! 연격으로 빈틈을 공략하세요.";
    }
    if (e.type === "ventwarn") ui.status.textContent = e.text;
    if (["hit", "juggle", "counter", "hurt"].includes(e.type)) {
      floaters.push({
        text: e.text,
        x: e.x,
        y: e.y - 23,
        life: 0.7,
        color:
          e.type === "hurt"
            ? "#ff8070"
            : e.type === "counter"
              ? "#b5fff1"
              : e.type === "juggle"
                ? "#ffe095"
                : "#fff1dc",
      });
      if (e.type !== "hurt")
        fx.push({
          kind: "contact",
          x: e.x,
          y: e.y,
          life: 0.16,
          counter: e.type === "counter",
        });
      if (e.type !== "hurt")
        for (let i = 0; i < 7; i++)
          fx.push({
            x: e.x,
            y: e.y,
            vx: (i - 4) * 69,
            vy: -80 - (i % 4) * 52,
            life: 0.22 + (i % 3) * 0.06,
          });
    }
    const cues = {
      hit: "hit",
      juggle: "crit",
      counter: "crit",
      perfect: "pickup",
      block: "denied",
      break: "crit",
      attack: "attack",
      dash: "move",
      hurt: "hurt",
      kill: "finish",
      wave: "progress",
      door: "pickup",
      room: "progress",
      win: g.dungeon === 0 ? "progress" : "win",
      lose: "lose",
    };
    if (cues[e.type]) emit(cues[e.type], { combo: g.combo });
    if (["wave", "room", "door"].includes(e.type) && e.text) {
      banner = { text: e.text, time: 2 };
      ui.status.textContent = e.text;
    }
    if (e.type === "perfect")
      floaters.push({
        text: "간파",
        x: e.x,
        y: e.y,
        life: 0.65,
        color: "#b5fff1",
      });
    if (e.type === "perfect")
      ui.status.textContent =
        "간파 성공! 1.35초 안에 J. 다음 기본 공격이 감독관의 가드를 깨뜨립니다.";
    if (e.type === "counter") ui.status.textContent = "반격 명중 · 가드 파괴!";
    if (e.type === "warn" && e.text) ui.status.textContent = e.text;
    if (e.type === "hurt")
      ui.status.textContent = `피격. 남은 체력 ${g.player.hp}. 붉은 공격 범위 밖으로 이동하세요.`;
  }
  g.events = [];
}
function endScreen() {
  if (g.phase === "clear") session.finish();
  if (g.phase === "dead") session.fail();
  if (!["clear", "dead"].includes(g.phase) || !ui.overlay.hidden) return;
  ui.overlay.hidden = false;
  clearInput();
  const failed = campaign.phase === "failed",
    between = campaign.phase === "between";
  ui.kicker.textContent = failed
    ? "DOWN / STAGE RETRY"
    : between
      ? "DUNGEON CLEAR / CONTINUE"
      : "CAMPAIGN COMPLETE";
  ui.heading.textContent = failed
    ? `${campaign.stage.title} · 다시 도전`
    : between
      ? `${campaign.stage.title} 해방`
      : "모든 사슬이 풀렸다.";
  const summary = `점수 ${g.score.toLocaleString()} · 최대 ${g.best}연격 · 처치 ${g.kills}. `;
  ui.description.textContent =
    summary +
    (failed
      ? "현재 던전의 입장 상태로 재도전합니다. " + campaign.stage.tactic
      : between
        ? "점수와 전적을 이어 다음 던전으로 계속합니다. 체력 32 회복."
        : campaign.stage.objective + " 캠페인을 모두 완료했습니다.");
  ui.start.textContent = failed
    ? "이 던전 재도전 ↗"
    : between
      ? "다음 던전으로 계속 ↗"
      : "첫 던전부터 다시 ↗";
  ui.status.textContent = failed
    ? "쓰러졌습니다. 입장 시점의 점수와 체력으로 이 던전을 재도전합니다."
    : between
      ? "던전 완료. 계속 버튼 또는 Enter로 다음 던전으로 이동합니다."
      : "캠페인 완료. 모든 던전을 돌파했습니다.";
  ui.start.focus();
}
function render(dt) {
  processEvents();
  for (const f of fx) {
    f.life -= dt;
    if (f.kind === "contact") continue;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 600 * dt;
  }
  fx = fx.filter((f) => f.life > 0);
  for (const f of floaters) {
    f.life -= dt;
    f.y -= 35 * dt;
  }
  floaters = floaters.filter((f) => f.life > 0);
  banner.time -= dt;
  ctx.save();
  if (!feedback.reducedMotion && g.shake > 0)
    ctx.translate(
      Math.sin(g.time * 199) * g.shake,
      Math.cos(g.time * 143) * g.shake * 0.4,
    );
  background();
  drawVents();
  tells();
  actors();
  for (const f of fx) {
    if (f.kind === "contact") contactMark(f);
    else rect(f.x, f.y, 4, 1, "#ffdca5");
  }
  for (const f of floaters) text(f.text, f.x, f.y, 20, f.color, "center");
  ctx.restore();
  const shade = ctx.createLinearGradient(0, 400, 0, 540);
  shade.addColorStop(0, "#0000");
  shade.addColorStop(1, "#060c1666");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  hud();
}
function loop(ts) {
  const dt = Math.min((ts - last) / 1000 || 0, 0.035);
  last = ts;
  if (!paused) tick(g, dt, input());
  render(paused ? 0 : dt);
  endScreen();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Read-only state exposes the same simulation shown on the canvas for runtime evidence.
Object.defineProperty(window, "emberState", {
  get: () =>
    JSON.parse(
      JSON.stringify({
        ...g,
        campaign: {
          index: campaign.index,
          stage: campaign.stage,
          phase: campaign.phase,
        },
        events: undefined,
        particles: undefined,
        floaters: undefined,
        paused,
      }),
    ),
});
