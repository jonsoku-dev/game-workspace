import { createFeedback } from "./feedback.mjs";
import { platforms, progression, portalOpen, landing } from "./rules.mjs";
const canvas = document.querySelector("canvas"),
  c = canvas.getContext("2d"),
  $ = (s) => document.querySelector(s);
const feedback = createFeedback({ sound: false }),
  keys = new Set(),
  pressed = new Set();
const scenery = new Image();
scenery.src = "./scenery/canopy.webp";
const art = {};
for (const name of ["player", "creature"]) {
  art[name] = new Image();
  art[name].src = `./art/${name}.png`;
}
let p,
  enemies,
  kills,
  charged,
  mode,
  camera,
  time = 0,
  last = 0,
  particles = [],
  texts = [],
  toastTime = 10,
  stepClock = 0;
const W = 1200,
  H = 680;
const rand = (n) => Math.sin(n * 127.1 + 13.9) * 0.5 + 0.5;
function cue(name) {
  feedback.emit(name);
}
function toast(t) {
  $("#toast").textContent = t;
  toastTime = 4;
}
function reset() {
  p = {
    x: 150,
    y: 575,
    vy: 0,
    dir: 1,
    hp: 100,
    ground: true,
    drop: 0,
    attack: 0,
    cool: 0,
    magic: 0,
    inv: 0,
  };
  enemies = [
    { x: 570, y: 450, home: 570, platform: 1 },
    { x: 1010, y: 340, home: 1010, platform: 2 },
    { x: 1390, y: 445, home: 1390, platform: 3 },
    { x: 1830, y: 330, home: 1830, platform: 4 },
  ].map((e, i) => ({
    ...e,
    hp: 3,
    max: 3,
    state: "walk",
    timer: 1 + i * 0.3,
    dir: -1,
    hit: 0,
  }));
  kills = 0;
  charged = false;
  mode = "play";
  camera = 0;
  particles = [];
  texts = [];
  $("#modal").hidden = true;
  $("#pause").textContent = "Ⅱ 쉬기";
  toast("별지기 루나: 별잎 세 장을 찾아 고원의 문으로 와 줘!");
  hud();
}
function hud() {
  const q = progression(kills);
  $("#level").innerHTML =
    `LV. ${q.level} <span>${q.level === 2 ? "별꽃의 수호자" : "견습 별지기"}</span>`;
  $("#health").textContent = `HP ${Math.ceil(p.hp)} / 100`;
  $("#hpbar").style.width = `${p.hp}%`;
  $("#xpbar").style.width = `${q.level === 1 ? (q.xp / 70) * 100 : 100}%`;
  $("#xp").textContent =
    q.level === 1 ? `EXP ${q.xp} / 70` : "EXP 70 / 70 · 별꽃 개화";
  $("#quest").textContent = `별잎 되찾기 ${q.leaves} / 3`;
  $("#spell").textContent = charged
    ? "✧ 고원의 문 열림"
    : q.spell
      ? "✿ K 별꽃으로 문을 깨우기"
      : "레벨 2 · 별꽃 마법 잠김";
  $("#magic").style.background = q.spell ? "#f7e2a7" : "#e5e8d9";
  $("#distance").textContent =
    `0${Math.min(3, 1 + Math.floor(p.x / 920))} / 03`;
}
function burst(x, y, color, n = 18) {
  for (let i = 0; i < n; i++)
    particles.push({
      x,
      y,
      vx: (rand(i + time) * 2 - 1) * 160,
      vy: -rand(i * 3 + time) * 180,
      life: 0.8,
      color,
    });
}
function float(t, x, y, color = "#fff8c9") {
  texts.push({ t, x, y, life: 1.3, color });
}
function hurt(e, damage) {
  if (e.hp <= 0) return;
  e.hp -= damage;
  e.hit = 0.25;
  e.x += p.dir * 14;
  cue("hit");
  burst(e.x, e.y - 35, "#ffdd79", 10);
  float(`−${damage}`, e.x, e.y - 75);
  if (e.hp <= 0) {
    kills++;
    burst(e.x, e.y - 40, "#c9ee86", 28);
    float("+35 EXP · 별잎 +1", e.x, e.y - 95, "#fff7b5");
    cue("pickup");
    if (kills === 2) {
      p.hp = Math.min(100, p.hp + 35);
      p.magic = 1.4;
      toast("LEVEL UP! 별꽃 마법 개방 · K로 원거리 공격 / 문 깨우기");
      cue("win");
      burst(p.x, p.y - 50, "#fff2a2", 55);
    } else if (kills === 3)
      toast("별잎 세 장을 모았다! 오른쪽 고원 문에서 K → ↑");
    hud();
  }
}
function attack(magic = false) {
  if (mode !== "play" || p.cool > 0) return;
  if (magic && !progression(kills).spell) {
    toast("아직 잠긴 힘이에요. 두 마리를 물리쳐 레벨 2가 되어 보세요.");
    cue("denied");
    return;
  }
  p.cool = magic ? 0.65 : 0.35;
  p.attack = magic ? 0.45 : 0.22;
  p.magic = magic ? 0.55 : 0;
  cue(magic ? "progress" : "attack");
  for (const e of enemies) {
    if (
      e.hp > 0 &&
      Math.abs(e.y - p.y) < 95 &&
      Math.abs(e.x - p.x) < (magic ? 300 : 105) &&
      (e.x - p.x) * p.dir > -25
    )
      hurt(e, magic ? 3 : 1);
  }
  if (magic) {
    burst(p.x + p.dir * 70, p.y - 50, "#fff5ac", 25);
    if (Math.abs(p.x - 2570) < 220) {
      if (kills >= 3) {
        charged = true;
        cue("finish");
        toast("고원의 문이 깨어났어요. ↑로 별지기에게 돌아가기");
      } else {
        cue("denied");
        toast("문에 별잎 세 장이 필요해요.");
      }
      hud();
    }
  }
}
function end(win) {
  mode = win ? "win" : "lose";
  cue(win ? "finish" : "lose");
  $("#endingTag").textContent = win ? "QUEST COMPLETE" : "TRY AGAIN";
  $("#ending").textContent = win ? "고원에 별이 피었어요" : "잠깐, 숨을 골라요";
  $("#endingText").innerHTML = win
    ? "별잎을 되찾고 별꽃의 수호자가 되었습니다.<br>루나와 함께 다음 계절에도 다시 만나요."
    : "숲의 친구들은 공격 전에 몸을 붉게 부풀려요.<br>점프로 피한 뒤 별가지를 휘둘러 보세요.";
  $("#modal").hidden = false;
  keys.clear();
}
function togglePause() {
  if (!["play", "pause"].includes(mode)) return;
  mode = mode === "play" ? "pause" : "play";
  $("#pause").textContent = mode === "pause" ? "▶ 계속하기" : "Ⅱ 쉬기";
  toast(
    mode === "pause" ? "잠시 쉬는 중 · P 또는 계속하기" : "모험을 계속합니다",
  );
  cue(mode === "pause" ? "pause" : "resume");
  keys.clear();
}
function down(k) {
  k = k.toLowerCase();
  if (!keys.has(k)) pressed.add(k);
  keys.add(k);
}
addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
    e.preventDefault();
  if (e.repeat) return;
  if (e.key.toLowerCase() === "r") {
    reset();
    cue("restart");
    return;
  }
  if (e.key.toLowerCase() === "p") {
    togglePause();
    return;
  }
  down(e.key);
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
for (const b of document.querySelectorAll("[data-key]")) {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    down(b.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => keys.delete(b.dataset.key));
}
addEventListener("blur", () => {
  keys.clear();
  pressed.clear();
  if (mode === "play") togglePause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "play") togglePause();
});
$("#sound").onclick = () => {
  const on = !feedback.sound;
  feedback.setSound(on);
  $("#sound").textContent = on ? "♫ 소리 켜짐" : "♫ 소리 켜기";
  $("#sound").setAttribute("aria-pressed", on);
  cue("select");
};
$("#pause").onclick = togglePause;
$("#restart").onclick = () => {
  reset();
  cue("restart");
};
const has = (...ks) => ks.some((k) => keys.has(k)),
  tap = (...ks) => ks.some((k) => pressed.has(k));
function update(dt) {
  time += dt;
  if (mode !== "play") {
    pressed.clear();
    return;
  }
  p.cool = Math.max(0, p.cool - dt);
  p.attack = Math.max(0, p.attack - dt);
  p.magic = Math.max(0, p.magic - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.drop = Math.max(0, p.drop - dt);
  toastTime -= dt;
  $("#toast").style.opacity = toastTime > 0 ? "1" : "0";
  let move = (has("d", "arrowright") ? 1 : 0) - (has("a", "arrowleft") ? 1 : 0);
  if (move) {
    p.dir = move;
    p.x += move * 230 * dt;
    if (p.ground) {
      stepClock += dt;
      if (stepClock > 0.23) {
        cue("step");
        stepClock = 0;
        burst(p.x, p.y, "#d7dbb1", 2);
      }
    }
  }
  p.x = Math.max(30, Math.min(2750, p.x));
  if (tap(" ") && p.ground) {
    p.vy = -650;
    p.ground = false;
    cue("jump");
  }
  if (tap("s", "arrowdown") && p.ground && p.y < 570) {
    p.drop = 0.26;
    p.y += 5;
    p.ground = false;
    cue("move");
  }
  const inDraft = [800, 1580, 2010].some((x) => Math.abs(p.x - x) < 53);
  if (has("w", "arrowup") && inDraft) {
    p.vy = -370;
    p.ground = false;
    if (tap("w", "arrowup")) {
      cue("jump");
      toast("바람을 타고 ↑ · 옆 발판으로 이동하세요");
    }
  }
  const old = p.y;
  p.vy += 1350 * dt;
  p.y += p.vy * dt;
  if (p.y < 135) {
    p.y = 135;
    p.vy = 0;
  }
  p.ground = false;
  if (p.vy >= 0) {
    const floor = landing(old, p.y, p.x, p.drop > 0);
    if (floor) {
      if (p.vy > 250) cue("land");
      p.y = floor.y;
      p.vy = 0;
      p.ground = true;
    }
  }
  if (has("j") || tap("j")) attack();
  if (has("k") || tap("k")) attack(true);
  if (tap("w", "arrowup") && Math.abs(p.x - 2570) < 100) {
    if (portalOpen(kills, charged)) end(true);
    else {
      cue("denied");
      toast(
        kills < 3
          ? "별잎 세 장과 별꽃 마법이 필요해요."
          : "K 별꽃 마법으로 문을 먼저 깨워 주세요.",
      );
    }
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt);
    e.timer -= dt;
    let close = Math.abs(e.x - p.x) < 95 && Math.abs(e.y - p.y) < 65;
    if (e.state === "walk") {
      e.x += e.dir * 40 * dt;
      const pf = platforms[e.platform];
      if (e.x < pf.x + 35 || e.x > pf.x + pf.w - 35) e.dir *= -1;
      if (close) {
        e.state = "tell";
        e.timer = 0.75;
        e.dir = Math.sign(p.x - e.x) || 1;
      }
    } else if (e.state === "tell" && e.timer <= 0) {
      e.state = "lunge";
      e.timer = 0.32;
    } else if (e.state === "lunge") {
      e.x += e.dir * 235 * dt;
      const pf = platforms[e.platform];
      e.x = Math.max(pf.x + 25, Math.min(pf.x + pf.w - 25, e.x));
      if (Math.abs(e.x - p.x) < 58 && Math.abs(e.y - p.y) < 60 && p.inv <= 0) {
        p.hp = Math.max(0, p.hp - 25);
        p.inv = 1.1;
        p.vy = -220;
        p.x += e.dir * 35;
        cue("hurt");
        float("−25", p.x, p.y - 95, "#ffb5a5");
        hud();
        if (p.hp <= 0) end(false);
      }
      if (e.timer <= 0) {
        e.state = "rest";
        e.timer = 0.8;
      }
    } else if (e.state === "rest" && e.timer <= 0) {
      e.state = "walk";
      e.timer = 1;
    }
  }
  camera +=
    (Math.max(0, Math.min(1600, p.x - 420)) - camera) * Math.min(1, dt * 6);
  for (const a of particles) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.vy += 290 * dt;
    a.life -= dt;
  }
  particles = particles.filter((a) => a.life > 0);
  for (const t of texts) {
    t.y -= 28 * dt;
    t.life -= dt;
  }
  texts = texts.filter((t) => t.life > 0);
  hud();
  pressed.clear();
}
function path(fill, stroke = "#557c67", width = 2) {
  c.fillStyle = fill;
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.fill();
  if (stroke) c.stroke();
}
function ellipse(x, y, rx, ry, fill, stroke) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  path(fill, stroke);
}
function line(x, y, x2, y2, color, width = 2) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function text(t, x, y, size = 16, color = "#426c57") {
  c.fillStyle = color;
  c.font = `${size}px Jua, sans-serif`;
  c.textAlign = "center";
  c.fillText(t, x, y);
}
function leaf(x, y, size, fill) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(x + y) * 0.7);
  c.beginPath();
  c.moveTo(-size, 0);
  c.quadraticCurveTo(0, -size * 1.2, size, 0);
  c.quadraticCurveTo(0, size * 0.7, -size, 0);
  path(fill, "#659a69", 1);
  line(-size, 0, size, 0, "#93bf73", 1);
  c.restore();
}
function tree(x, y, s, parallax = 1) {
  c.save();
  c.translate(x - camera * parallax, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-25, 0);
  c.bezierCurveTo(-15, -100, -40, -240, -8, -340);
  c.lineTo(23, -340);
  c.bezierCurveTo(14, -210, 12, -95, 38, 0);
  path("#bcac78", "#84916c", 3);
  line(1, -10, -2, -260, "#d7c491", 4);
  for (let i = 0; i < 7; i++)
    ellipse(
      (rand(i + x) - 0.5) * 180,
      -320 + rand(i + 8 + x) * 75,
      90 + rand(i + x) * 20,
      65,
      ["#83bb8c", "#99cb91", "#b8d991"][i % 3],
      "#76a97f",
    );
  c.restore();
}
function mushroom(x, y, s = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-8, 0);
  c.lineTo(-6, -26);
  c.lineTo(7, -26);
  c.lineTo(10, 0);
  path("#fff0c7", "#b2a77a", 1.5);
  c.beginPath();
  c.moveTo(-29, -22);
  c.bezierCurveTo(-30, -60, 30, -60, 31, -22);
  c.quadraticCurveTo(0, -10, -29, -22);
  path("#e8a174", "#b98466", 2);
  ellipse(-10, -33, 5, 4, "#fff2ce", null);
  ellipse(12, -37, 4, 3, "#fff2ce", null);
  c.restore();
}
function background() {
  if (scenery.complete && scenery.naturalWidth) {
    c.drawImage(scenery, -camera * 0.1, 0, 1400, 680);
    for (let i = 0; i < 14; i++)
      leaf(
        (i * 137 - time * 10 - camera * 0.3 + 3000) % 1300,
        130 + rand(i + 3) * 400 + Math.sin(time + i) * 20,
        4,
        "#e2efa9",
      );
    return;
  }
  const g = c.createLinearGradient(0, 0, 0, 680);
  g.addColorStop(0, "#9bcfc8");
  g.addColorStop(0.55, "#e1f2c9");
  g.addColorStop(1, "#96bd93");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  ellipse(930 - camera * 0.04, 128, 58, 58, "#fff5be", null);
  for (let i = 0; i < 12; i++) {
    let x = i * 250 - camera * 0.1;
    c.beginPath();
    c.moveTo(x - 170, 470);
    c.quadraticCurveTo(x - 30, 90, x + 80, 400);
    c.quadraticCurveTo(x + 160, 180, x + 260, 470);
    path("#91c3ad", null);
  }
  for (let i = 0; i < 11; i++)
    tree(i * 270 + 70, 575, 0.9 + rand(i) * 0.5, 0.28);
  c.fillStyle = "#d3e8bbaa";
  c.fillRect(0, 400, W, 180);
  for (let i = 0; i < 8; i++) tree(i * 430 - 100, 590, 1.25, 0.6);
  for (let i = 0; i < 24; i++) {
    let x = (i * 137 - time * (8 + rand(i) * 9) - camera * 0.45) % 1300;
    if (x < 0) x += 1300;
    leaf(
      x,
      130 + rand(i + 3) * 400 + Math.sin(time + i) * 20,
      4 + rand(i) * 3,
      "#d8ea9d",
    );
  }
}
function terrain() {
  for (const pf of platforms) {
    const x = pf.x - camera,
      y = pf.y;
    if (x > 1250 || x + pf.w < 0) continue;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + pf.w, y);
    c.lineTo(x + pf.w - 9, y + 29);
    c.quadraticCurveTo(x + pf.w * 0.6, y + 70, x + pf.w * 0.4, y + 46);
    c.lineTo(x + 8, y + 37);
    c.closePath();
    path("#ae9166", "#7f8c60", 2);
    c.beginPath();
    c.moveTo(x - 6, y);
    for (let i = 0; i <= pf.w; i += 12)
      c.lineTo(x + i, y - 6 - rand(i + pf.x) * 9);
    c.lineTo(x + pf.w + 6, y + 8);
    c.quadraticCurveTo(x + pf.w * 0.5, y + 20, x - 6, y + 9);
    c.closePath();
    path("#92bc6a", "#648b58", 2);
    for (let j = 0; j < pf.w; j += 60) {
      leaf(x + j + 15, y + 22, 7, "#b4ce7b");
      if (j % 120 === 0) mushroom(x + j + 40, y - 7, 0.4);
    }
    for (let j = 30; j < pf.w; j += 95) {
      line(x + j, y + 22, x + j + 10, y + 45, "#8eac65", 2);
      ellipse(x + j + 10, y + 45, 5, 8, "#99bc6d", null);
    }
  }
  for (const x of [800, 1580, 2010]) {
    const sx = x - camera;
    for (let i = 0; i < 7; i++) {
      let yy = 565 - ((time * 115 + i * 39) % 250);
      c.globalAlpha = 0.35;
      c.strokeStyle = "#f3ffe4";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(sx + Math.sin(i + time) * 13, yy, 36, 10, 0, 0, Math.PI);
      c.stroke();
      c.globalAlpha = 1;
    }
    text("↑ 바람길", sx, 605, 13, "#faffdd");
  }
  for (let i = 0; i < 40; i++) {
    let x = i * 83 - camera;
    const y = 574;
    for (let j = 0; j < 3; j++)
      line(
        x + j * 7,
        y,
        x + j * 9 - 8,
        y - 13 - rand(i + j) * 15,
        "#698d5b",
        2,
      );
    if (i % 3 === 0) {
      mushroom(x + 20, y, 0.7);
      ellipse(x + 4, y - 18, 4, 4, "#fff4a0", null);
    }
  }
}
function portal() {
  const x = 2570 - camera;
  ellipse(x, 575, 95, 16, "#668c6244", null);
  c.save();
  c.translate(x, 485);
  c.beginPath();
  c.moveTo(-68, 90);
  c.lineTo(-68, -5);
  c.bezierCurveTo(-68, -110, 68, -110, 68, -5);
  c.lineTo(68, 90);
  path("#c9ba8a", "#839a70", 5);
  c.beginPath();
  c.moveTo(-47, 87);
  c.lineTo(-47, -3);
  c.bezierCurveTo(-47, -77, 47, -77, 47, -3);
  c.lineTo(47, 87);
  const g = c.createLinearGradient(0, -80, 0, 90);
  g.addColorStop(0, charged ? "#a9e5db" : "#668c79");
  g.addColorStop(1, charged ? "#fff7b6" : "#a2ba8b");
  path(g, "#ecdfac", 3);
  for (let i = 0; i < 8; i++) {
    leaf(-70 + (i % 2) * 140, -50 + Math.floor(i / 2) * 35, 20, "#94b96b");
  }
  text(charged ? "✧" : "✿", 0, 10, 44, charged ? "#fff7c6" : "#cfdfb8");
  text(
    charged ? "↑ 별지기에게" : "별잎 3 + 별꽃",
    0,
    56,
    13,
    charged ? "#477e71" : "#eef4cf",
  );
  c.restore();
  text("별지기의 문", x, 355, 22);
}
function sprite(img, frame, size, x, y, w, h, dir = 1) {
  if (!img.complete || !img.naturalWidth) return false;
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  c.imageSmoothingEnabled = false;
  c.drawImage(
    img,
    frame * size,
    0,
    size,
    size,
    -w / 2,
    -h + (size === 96 ? 11 / 96 : 7 / 72) * h,
    w,
    h,
  );
  c.restore();
  return true;
}
function player() {
  const x = p.x - camera,
    bob =
      p.ground && has("a", "d", "arrowleft", "arrowright")
        ? Math.sin(time * 18) * 2
        : 0;
  c.globalAlpha = p.inv > 0 && Math.floor(time * 16) % 2 ? 0.4 : 1;
  ellipse(x, p.y + 2, 24, 6, "#335f4c33", null);
  let frame =
    p.inv > 0
      ? 6
      : p.attack > 0
        ? p.magic > 0
          ? 5
          : 4
        : !p.ground
          ? p.vy < 0
            ? 3
            : 7
          : has("a", "d", "arrowleft", "arrowright")
            ? 1 + (Math.floor(time * 9) % 2)
            : 0;
  if (!sprite(art.player, frame, 96, x, p.y + bob, 110, 110, p.dir)) {
    ellipse(x, p.y - 55, 26, 30, "#ffe2ac", "#775f4a");
    ellipse(x, p.y - 72, 35, 22, "#b98258", "#775f4a");
    ellipse(x, p.y - 21, 23, 22, "#aac27a", "#5c8059");
    ellipse(x - 9, p.y - 57, 3, 5, "#4c5141", null);
    ellipse(x + 9, p.y - 57, 3, 5, "#4c5141", null);
  }
  c.globalAlpha = 1;
  if (p.attack > 0) {
    c.save();
    c.translate(x, p.y - 45);
    c.scale(p.dir, 1);
    c.strokeStyle = p.magic > 0 ? "#fff4b1" : "#fffbe8";
    c.lineWidth = p.magic > 0 ? 17 : 10;
    c.beginPath();
    c.arc(20, 0, p.magic > 0 ? 105 : 64, -1.3, 1.2);
    c.stroke();
    c.strokeStyle = "#d3f69e";
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }
  if (p.magic > 0) {
    for (let i = 0; i < 6; i++) {
      const angle = time * 4 + (i * Math.PI) / 3;
      ellipse(
        x + Math.cos(angle) * 65,
        p.y - 50 + Math.sin(angle) * 50,
        5,
        9,
        "#fff2ab",
        null,
      );
    }
  }
  text("나래", x, p.y - 116, 13);
}
function creature(e) {
  if (e.hp <= 0) return;
  let x = e.x - camera,
    bob = Math.sin(time * 5 + e.home) * 3;
  ellipse(x, e.y + 3, 29, 6, "#335f4c33", null);
  if (e.state === "tell") {
    ellipse(x, e.y - 35, 44, 38, "#ff947744", null);
    text("!", x, e.y - 88, 25, "#c55442");
  }
  let frame =
    e.hit > 0 ? 3 : e.state === "lunge" ? 2 : Math.floor(time * 4) % 2;
  if (!sprite(art.creature, frame, 72, x, e.y + bob, 83, 83, e.dir)) {
    ellipse(
      x,
      e.y - 25,
      30,
      25,
      e.state === "tell" ? "#e59775" : "#e4bd75",
      "#9a8656",
    );
    leaf(x, e.y - 53, 18, "#9fbc6c");
    ellipse(x - 10, e.y - 25, 3, 4, "#5c644c", null);
    ellipse(x + 10, e.y - 25, 3, 4, "#5c644c", null);
  }
  c.fillStyle = "#6c8868";
  c.fillRect(x - 24, e.y - 85, 48, 5);
  c.fillStyle = "#f4bd7b";
  c.fillRect(x - 24, e.y - 85, (e.hp / e.max) * 48, 5);
  text("잎도둑 밤톨", x, e.y - 97, 11);
}
function draw() {
  c.clearRect(0, 0, W, H);
  background();
  terrain();
  portal();
  const nx = 220 - camera;
  line(nx, 575, nx, 492, "#997d57", 7);
  c.save();
  c.translate(nx, 510);
  c.rotate(-0.06);
  c.fillStyle = "#e4cb91";
  c.strokeStyle = "#9c8f64";
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(-65, -25, 130, 46, 5);
  c.fill();
  c.stroke();
  text("고원으로 →", 0, 3, 17);
  c.restore();
  for (const e of enemies) creature(e);
  player();
  for (const a of particles) {
    c.globalAlpha = Math.min(1, a.life * 2);
    ellipse(a.x - camera, a.y, 3, 3, a.color, null);
  }
  c.globalAlpha = 1;
  for (const t of texts) {
    c.globalAlpha = Math.min(1, t.life * 2);
    text(t.t, t.x - camera, t.y, 18, t.color);
  }
  c.globalAlpha = 1;
  for (let i = 0; i < 7; i++) {
    const x = i * 430 - camera * 1.2;
    leaf(x, 660, 85, "#729d65");
    leaf(x + 90, 685, 100, "#85ad6f");
  }
  if (mode === "pause") {
    c.fillStyle = "#264f4577";
    c.fillRect(0, 0, W, H);
    text("잠시 쉬어 가기", 600, 330, 38, "#fff8d8");
    text("P 또는 계속하기를 눌러 모험으로", 600, 365, 18, "#fff8d8");
  }
}
function loop(t) {
  const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
  last = t;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
