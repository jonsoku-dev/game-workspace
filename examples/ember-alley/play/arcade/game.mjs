import { createFeedback } from "./feedback.mjs";
import {
  MOVES,
  createGame,
  begin,
  tick,
  attack,
  dash,
  nextRoom,
  clamp,
} from "./combat.mjs";
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
  ].map((id) => [id, document.getElementById(id)]),
);
const feedback = createFeedback({ sound: false });
const scenery = new Image();
scenery.src = "./scenery/foundry.webp";
let g = createGame(),
  keys = new Set(),
  last = 0,
  paused = false,
  fx = [],
  floaters = [],
  banner = { text: "", time: 0 },
  art,
  images = {};
const W = 960,
  H = 540;
const artReady = fetch("./art/atlas.json")
  .then((r) => {
    if (!r.ok) throw Error("아트 메타데이터 로드 실패");
    return r.json();
  })
  .then(async (data) => {
    art = data;
    for (const [key, path] of Object.entries({
      player: "player.png",
      foe: "foe.png",
      boss: "boss.png",
    })) {
      const im = new Image();
      im.src = `./art/${path}`;
      await im.decode();
      images[key] = im;
    }
  })
  .catch((error) => {
    ui.status.textContent = error.message;
    ui.start.disabled = true;
  });
function emit(name, details = {}) {
  feedback.emit(name, details);
}
function reset() {
  g = createGame();
  begin(g);
  paused = false;
  keys.clear();
  fx = [];
  floaters = [];
  banner = { text: "第 01 区 · 잿불 골목", time: 2.6 };
  ui.overlay.hidden = true;
  canvas.focus();
  ui.pause.textContent = "일시정지 P";
  ui.status.textContent =
    "봉쇄 해제까지 적을 처치하세요. 붉은 예고선은 위아래로 피할 수 있습니다.";
  emit("restart");
}
ui.start.addEventListener("click", async () => {
  await artReady;
  if (!images.player) return;
  if (paused) {
    togglePause();
    return;
  }
  reset();
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
  keys.clear();
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
  if (key === "r") {
    reset();
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
  if (key === "enter") nextRoom(g);
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
  keys.clear();
  if (g.phase === "playing" && !paused) togglePause();
});
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    keys.add(button.dataset.key);
    action(button.dataset.key);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(name, () => keys.delete(button.dataset.key));
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
    ctx.drawImage(scenery, 0, 0, W, H);
    if (furnace) {
      rect(0, 0, W, H, "#c8431718");
    }
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
function tells() {
  for (const e of g.enemies) {
    if (e.dead || !["windup", "strike"].includes(e.state)) continue;
    const strike = e.state === "strike",
      alpha = strike ? "88" : "44";
    if (e.pattern === "slam") {
      ellipse(e.targetX, e.targetY, 102, 65, `#ff593f${alpha}`);
      ctx.strokeStyle = "#ff9c6a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(e.targetX, e.targetY, 102, 65, 0, 0, Math.PI * 2);
      ctx.stroke();
      text("分 碎", e.targetX, e.targetY + 5, 17, "#ffd0a2", "center");
    } else {
      const range = e.pattern === "rush" ? 540 : 110;
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
    if (e.state === "windup")
      text(
        e.pattern === "rush" ? "쇄도" : e.pattern === "slam" ? "분쇄" : "!",
        e.x,
        e.y - 112,
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
  const size = key === "boss" ? 144 : key === "foe" ? 72 : 96;
  const spec = art[key];
  const fw = spec.frameWidth || spec.width || size,
    fh = spec.frameHeight || spec.height || size;
  let f = frameIndex(key, state, age);
  f = clamp(f, 0, Math.floor(im.width / fw) - 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face * scale, scale);
  ctx.imageSmoothingEnabled = false;
  if (hit) ctx.filter = "brightness(2.4) sepia(.4)";
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
      ? 1.55
      : a.kind === "boss"
        ? 1.45
        : a.kind === "elite"
          ? 1.95
          : 1.8;
    const deadAlpha = a.dead ? Math.max(0, 1 - a.age) : 1;
    ellipse(
      a.x,
      a.y + 1,
      a.player ? 31 : a.kind === "boss" ? 52 : 30,
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
          slash(a.x + a.face * 54, a.y - 64, a.face, a.move);
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
        a.kind === "boss" ? "boss" : "foe",
        state,
        a.x,
        a.y - a.z,
        a.face,
        a.age,
        scale,
        a.hit > 0,
        deadAlpha,
      );
      if (!a.dead) {
        rect(a.x - 28, a.y - 124 - a.z, 56, 4, "#111820");
        rect(
          a.x - 28,
          a.y - 124 - a.z,
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
function slash(x, y, face, move) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  poly(
    move === 3
      ? [
          [0, 50],
          [18, -70],
          [48, -110],
          [32, -30],
          [76, -74],
          [31, 27],
        ]
      : [
          [0, -42],
          [92, -24],
          [120, 4],
          [78, 33],
          [19, 44],
          [74, 16],
          [94, 1],
          [65, -12],
        ],
    move === 3 ? "#ffd181aa" : "#fff1c6ba",
  );
  poly(
    [
      [12, -11],
      [108, -1],
      [47, 10],
    ],
    "#fff7e7",
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
    `제 ${g.room + 1} 구역 · ${g.door ? "봉쇄 해제" : `${g.wave + 1}차 봉쇄`}`,
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
  rect(210, 506, 126 * (1 - p.dashCd / 0.72), 3, "#8fbeb6");
  const boss = g.enemies.find((e) => e.kind === "boss");
  if (boss && !boss.dead) {
    text("쇠사슬 감독관  /  THE FOREMAN", 480, 80, 13, "#f1bd8e", "center");
    rect(318, 90, 324, 7, "#231f26");
    rect(318, 90, (324 * boss.hp) / boss.maxHp, 7, "#b64e43");
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
    if (["hit", "juggle", "hurt"].includes(e.type)) {
      floaters.push({
        text: e.text,
        x: e.x,
        y: e.y,
        life: 0.7,
        color:
          e.type === "hurt"
            ? "#ff8070"
            : e.type === "juggle"
              ? "#ffe095"
              : "#fff1dc",
      });
      if (e.type !== "hurt")
        for (let i = 0; i < 9; i++)
          fx.push({
            x: e.x,
            y: e.y + 30,
            vx: (i - 4) * 69,
            vy: -80 - (i % 4) * 52,
            life: 0.22 + (i % 3) * 0.06,
          });
    }
    const cues = {
      hit: "hit",
      juggle: "crit",
      attack: "attack",
      dash: "move",
      hurt: "hurt",
      kill: "finish",
      wave: "progress",
      door: "pickup",
      room: "progress",
      win: "win",
      lose: "lose",
    };
    if (cues[e.type]) emit(cues[e.type], { combo: g.combo });
    if (["wave", "room", "door"].includes(e.type) && e.text) {
      banner = { text: e.text, time: 2 };
      ui.status.textContent = e.text;
    }
    if (e.type === "warn" && e.text) ui.status.textContent = e.text;
    if (e.type === "hurt") ui.status.textContent = `피격. 남은 체력 ${g.player.hp}. 붉은 공격 범위 밖으로 이동하세요.`;
  }
  g.events = [];
}
function endScreen() {
  if (!["clear", "dead"].includes(g.phase) || !ui.overlay.hidden) return;
  ui.overlay.hidden = false;
  ui.kicker.textContent =
    g.phase === "clear" ? "DISTRICT LIBERATED / CLEAR" : "DOWN / RETRY";
  ui.heading.innerHTML =
    g.phase === "clear"
      ? "골목에 다시<br>새벽이 온다."
      : "한 번 더,<br>잿불을 일으켜라.";
  ui.description.textContent = `점수 ${g.score.toLocaleString()} · 최대 ${g.best}연격 · 처치 ${g.kills} · ${Math.floor(g.time)}초. ${g.phase === "clear" ? "두 구역의 봉쇄를 모두 해제했습니다." : "위아래 이동으로 붉은 공격선을 벗어나세요. 회피 중에는 무적입니다."}`;
  ui.start.textContent = "처음부터 다시 ↗";
  ui.status.textContent =
    g.phase === "clear"
      ? "클리어. 두 구역 봉쇄 해제."
      : "쓰러졌습니다. 재도전 버튼으로 처음부터 시작합니다.";
  ui.start.focus();
}
function render(dt) {
  processEvents();
  for (const f of fx) {
    f.life -= dt;
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
  tells();
  actors();
  for (const f of fx) {
    rect(f.x, f.y, 5, 2, "#ffdca5");
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
        events: undefined,
        particles: undefined,
        floaters: undefined,
        paused,
      }),
    ),
});
