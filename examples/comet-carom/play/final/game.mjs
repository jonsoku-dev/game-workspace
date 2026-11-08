import { createGame, select, launch, step, W, H, R } from "./combat.mjs";
import { createFeedback } from "./feedback.mjs";
const $ = (s) => document.querySelector(s),
  canvas = $("#arena"),
  ctx = canvas.getContext("2d");
let game = createGame(),
  angle = -90,
  power = 85,
  skill = false,
  drag = null,
  fx = !matchMedia("(prefers-reduced-motion: reduce)").matches,
  particles = [],
  labels = [],
  trail = [],
  last = 0,
  acc = 0,
  clock = 0,
  hitFlash = 0;
const guardianCopy = [
  {
    name: "솔",
    ability: "태양창",
    effect: "동료가 스치면 가까운 적에게 38 피해",
    description: "황금빛 태양의 수호자 솔",
  },
  {
    name: "루나",
    ability: "달의 샘",
    effect: "동료가 스치면 체력 +22, 추적탄 20",
    description: "은빛 달의 수호자 루나",
  },
  {
    name: "노바",
    ability: "별비",
    effect: "동료가 스치면 모든 적에게 18 피해",
    description: "초록빛 별의 수호자 노바",
  },
];
let displayedGuardian = -1;
const feedback = createFeedback({ enabled: fx, sound: false }),
  images = {};
for (const name of [
  "guardian-sun.png",
  "guardian-moon.png",
  "guardian-nova.png",
  "foe-orb.png",
  "boss-orb.png",
]) {
  const im = new Image();
  im.src = `art/${name}`;
  images[name] = im;
}
const bg = document.createElement("canvas");
bg.width = W;
bg.height = H;
const b = bg.getContext("2d");
function line(c, x1, y1, x2, y2, color, width = 1) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
function circle(c, x, y, r, fill, stroke, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function background() {
  const grad = b.createRadialGradient(360, 380, 10, 360, 390, 600);
  grad.addColorStop(0, "#21334b");
  grad.addColorStop(0.6, "#111e36");
  grad.addColorStop(1, "#070f22");
  b.fillStyle = grad;
  b.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const c = i % 2 ? "#547f9450" : "#c5aa6b45";
    line(b, 360, 380, 360 + 680 * Math.cos(a), 380 + 680 * Math.sin(a), c);
    b.beginPath();
    b.moveTo(360 + 120 * Math.cos(a), 380 + 120 * Math.sin(a));
    b.lineTo(360 + 450 * Math.cos(a + 0.095), 380 + 450 * Math.sin(a + 0.095));
    b.lineTo(360 + 450 * Math.cos(a - 0.095), 380 + 450 * Math.sin(a - 0.095));
    b.closePath();
    b.fillStyle = i % 2 ? "#2d66822c" : "#6c536e24";
    b.fill();
    b.strokeStyle = c;
    b.stroke();
  }
  for (const r of [120, 205, 290, 380, 470]) {
    circle(b, 360, 380, r, null, "#64818e35");
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        x = 360 + r * Math.cos(a),
        y = 380 + r * Math.sin(a);
      circle(b, x, y, 3, "#8caaad66");
    }
  }
  for (let y = 40; y < H; y += 70)
    for (let x = 35; x < W; x += 70) {
      const n = (x * 17 + y * 29) % 23;
      circle(b, x + n, y - n, n % 3 === 0 ? 1.4 : 0.7, "#b9dce180");
    }
  b.strokeStyle = "#b9a277";
  b.lineWidth = 2;
  b.strokeRect(18, 18, W - 36, H - 36);
  b.strokeStyle = "#35546d";
  b.lineWidth = 8;
  b.strokeRect(9, 9, W - 18, H - 18);
  b.strokeStyle = "#6590a2";
  b.lineWidth = 1;
  b.strokeRect(29, 29, W - 58, H - 58);
  for (const [x, y] of [
    [18, 18],
    [W - 18, 18],
    [18, H - 18],
    [W - 18, H - 18],
  ]) {
    circle(b, x, y, 12, "#18263d", "#d3b478");
    circle(b, x, y, 5, "#afd6d3");
  }
  b.fillStyle = "#8197aa44";
  b.textAlign = "center";
  b.font = "11px Georgia";
  b.fillText("✧  THE CELESTIAL SANCTUM  ✧", 360, 74);
}
background();
function updateUI() {
  const g = game;
  if (displayedGuardian !== g.selected) {
    const hero = guardianCopy[g.selected];
    $(".guardian-card").style.setProperty("--portrait", g.selected);
    $(".guardian-card").style.setProperty(
      "--guardian-color",
      g.heroes[g.selected].color,
    );
    $("#guardianPortrait").alt = hero.description;
    $("#guardianName").replaceChildren(
      document.createTextNode(`${hero.name} `),
      Object.assign(document.createElement("span"), {
        textContent: hero.ability,
      }),
    );
    $("#guardianAbility").textContent = hero.effect;
    displayedGuardian = g.selected;
  }
  $("#guardianRole").textContent =
    g.phase === "flight" ? "궤도를 잇는 중" : "이번 궤도의 수호자";
  $("#hp").textContent = `${g.hp} / ${g.maxHp}`;
  $("#health").value = g.hp;
  $("#turn").textContent = String(g.turn).padStart(2, "0");
  $("#wave").textContent = `WAVE 0${g.wave} / 02`;
  $("#waveName").textContent = g.wave === 1 ? "별의 잔영" : "월식의 심장";
  $("#status").textContent = g.last;
  $("#combo").innerHTML = `${g.combo} <span>HITS</span>`;
  $("#phase").textContent =
    g.phase === "flight"
      ? "혜성 이동 중"
      : g.phase === "aim"
        ? "조준하세요"
        : "전투 종료";
  $("#fire").disabled = g.phase !== "aim";
  $("#skill").disabled = g.phase !== "aim" || g.charge < 3;
  $("#skill").setAttribute("aria-pressed", String(skill));
  $("#charge").textContent = `${g.charge} / 3`;
  $("#angle").value = angle;
  $("#power").value = power;
  $("#angleValue").textContent = `${angle}°`;
  $("#powerValue").textContent = `${power}%`;
  document.querySelectorAll("[data-unit]").forEach((e, i) => {
    e.classList.toggle("selected", g.selected === i);
    e.setAttribute("aria-pressed", String(g.selected === i));
    e.disabled = g.phase !== "aim";
  });
  const done = ["won", "lost"].includes(g.phase);
  $("#result").hidden = !done;
  if (done) {
    $("#resultTag").textContent =
      g.phase === "won" ? "CONSTELLATION RESTORED" : "CONSTELLATION LOST";
    $("#resultTitle").textContent = g.result;
    $("#resultDetail").textContent =
      `${g.turn}턴 · 총 ${g.totalHits}회 명중 · ${g.phase === "won" ? "수호자들이 성소를 되찾았습니다." : "벽과 동료를 이용해 궤도를 다시 설계하세요."}`;
  }
}
function cues() {
  for (const e of game.events.splice(0)) {
    if (e.type === "hit") {
      feedback.emit("hit", { combo: game.combo });
      hitFlash = 0.12;
    } else
      feedback.emit(
        e.type === "assist"
          ? "pickup"
          : e.type === "enemy"
            ? "attack"
            : e.type === "bounce"
              ? "step"
              : e.type,
      );
    if (e.text) {
      labels.push({ ...e, life: e.type === "assist" ? 1.7 : 1.15 });
      $("#log").textContent = e.text;
    }
    if (fx) {
      const color =
        e.type === "hit"
          ? "#ffd38a"
          : e.type === "hurt"
            ? "#ef9397"
            : "#96f3f0";
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * (45 + i * 7),
          vy: Math.sin(a) * (45 + i * 7),
          life: 0.5 + i * 0.02,
          color,
        });
      }
    }
  }
  updateUI();
}
function portrait(name, x, y, r, tint) {
  const im = images[name];
  circle(ctx, x, y, r + 3, "#0b172a", tint, 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (im?.complete && im.naturalWidth)
    ctx.drawImage(im, x - r, y - r, r * 2, r * 2);
  else {
    const glow = ctx.createRadialGradient(x - r / 3, y - r / 3, 2, x, y, r);
    glow.addColorStop(0, tint);
    glow.addColorStop(0.5, "#355775");
    glow.addColorStop(1, "#152136");
    circle(ctx, x, y, r, glow);
    ctx.fillStyle = tint;
    ctx.font = `${r}px Georgia`;
    ctx.textAlign = "center";
    ctx.fillText("✧", x, y + r * 0.32);
  }
  ctx.restore();
}
function aim() {
  const h = game.heroes[game.selected];
  let x = h.x,
    y = h.y,
    dx = Math.cos((angle * Math.PI) / 180),
    dy = Math.sin((angle * Math.PI) / 180),
    remain = 210 + power * 4.6;
  ctx.save();
  ctx.strokeStyle = "#b5f5eb";
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i < 4 && remain > 0; i++) {
    const tx = dx > 0 ? (W - 45 - x) / dx : dx < 0 ? (45 - x) / dx : Infinity,
      ty = dy > 0 ? (H - 45 - y) / dy : dy < 0 ? (45 - y) / dy : Infinity,
      d = Math.min(tx, ty, remain);
    x += dx * d;
    y += dy * d;
    ctx.lineTo(x, y);
    remain -= d;
    if (tx <= ty) dx = -dx;
    else dy = -dy;
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const a = (angle * Math.PI) / 180,
    ax = h.x + Math.cos(a) * 90,
    ay = h.y + Math.sin(a) * 90;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - Math.cos(a - 0.45) * 20, ay - Math.sin(a - 0.45) * 20);
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - Math.cos(a + 0.45) * 20, ay - Math.sin(a + 0.45) * 20);
  ctx.stroke();
  if (drag) {
    line(ctx, h.x, h.y, drag.x, drag.y, "#edc58699", 5);
    circle(ctx, drag.x, drag.y, 9, null, "#f4c77c");
  }
  ctx.restore();
}
function draw(dt) {
  clock += dt;
  ctx.drawImage(bg, 0, 0);
  if (game.phase === "aim") aim();
  if (fx) {
    trail.forEach((p, i) =>
      circle(
        ctx,
        p.x,
        p.y,
        ((R * i) / trail.length) * 0.6,
        `rgba(148,231,242,${(i / trail.length) * 0.2})`,
      ),
    );
  }
  for (const e of game.foes) {
    if (e.hp <= 0) continue;
    const boss = e.id === "boss";
    circle(ctx, e.x, e.y, e.r + 10, null, boss ? "#9c7cb76e" : "#c7a4da38");
    portrait(
      boss ? "boss-orb.png" : "foe-orb.png",
      e.x,
      e.y,
      e.r,
      boss ? "#d5a1e5" : "#b19bd4",
    );
    ctx.fillStyle = "#242b43";
    ctx.fillRect(e.x - e.r, e.y + e.r + 12, e.r * 2, 5);
    ctx.fillStyle = boss ? "#dd9ab8" : "#c8b4e7";
    ctx.fillRect(e.x - e.r, e.y + e.r + 12, (e.r * 2 * e.hp) / e.max, 5);
    circle(ctx, e.x + e.r * 0.7, e.y - e.r * 0.7, 16, "#382b48", "#dcba85");
    ctx.fillStyle = "#ffe7ae";
    ctx.textAlign = "center";
    ctx.font = "bold 16px system-ui";
    ctx.fillText(e.timer, e.x + e.r * 0.7, e.y - e.r * 0.7 + 6);
    if (boss) {
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#e9c8db";
      ctx.fillText("월식의 심장", e.x, e.y - e.r - 21);
    }
  }
  game.heroes.forEach((h, i) => {
    if (i === game.selected) {
      circle(
        ctx,
        h.x,
        h.y,
        R + 12 + Math.sin(clock * 3) * 2,
        null,
        h.color,
        1.5,
      );
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(clock * 0.3);
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        line(ctx, R + 17, 0, R + 24, 0, h.color, 3);
      }
      ctx.restore();
    }
    portrait(h.art, h.x, h.y, R, h.color);
    ctx.fillStyle = h.color;
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(h.name, h.x, h.y + R + 23);
  });
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.globalAlpha = Math.max(0, p.life);
    circle(ctx, p.x, p.y, 2.5, p.color);
  }
  ctx.globalAlpha = 1;
  labels = labels.filter((p) => p.life > 0);
  for (const p of labels) {
    p.life -= dt;
    p.y -= dt * 25;
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle =
      p.type === "hit" ? "#ffe1aa" : p.type === "hurt" ? "#ffb0bb" : "#b7ffef";
    ctx.font = `bold ${p.type === "hit" ? 28 : 18}px system-ui`;
    ctx.textAlign = "center";
    ctx.shadowColor = "#071020";
    ctx.shadowBlur = 8;
    ctx.fillText(p.text, p.x, p.y - 24);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  if (fx && hitFlash > 0) {
    hitFlash -= dt;
    ctx.fillStyle = `rgba(255,220,170,${Math.max(0, hitFlash)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  acc += dt;
  while (acc >= 1 / 120) {
    if (game.phase === "flight") {
      step(game);
      const h = game.heroes[game.selected];
      trail.push({ x: h.x, y: h.y });
      if (trail.length > 22) trail.shift();
    } else trail = [];
    acc -= 1 / 120;
  }
  cues();
  draw(dt);
  requestAnimationFrame(frame);
}
function shoot() {
  if (launch(game, angle, power, skill)) {
    skill = false;
    drag = null;
    cues();
  }
}
function reset() {
  game = createGame();
  angle = -90;
  power = 85;
  skill = false;
  particles = [];
  labels = [];
  trail = [];
  feedback.emit("restart");
  updateUI();
}
function point(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * W) / rect.width,
    y: ((e.clientY - rect.top) * H) / rect.height,
  };
}
canvas.addEventListener("pointerdown", (e) => {
  if (game.phase !== "aim") return;
  const p = point(e);
  const i = game.heroes.findIndex(
    (h) => Math.hypot(h.x - p.x, h.y - p.y) < R + 20,
  );
  if (i >= 0) select(game, i);
  drag = { ...p, start: p, moved: false };
  canvas.setPointerCapture(e.pointerId);
  canvas.focus({ preventScroll: true });
  updateUI();
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = point(e),
    h = game.heroes[game.selected];
  drag.x = p.x;
  drag.y = p.y;
  if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 7) drag.moved = true;
  if (drag.moved) {
    angle = Math.round((Math.atan2(h.y - p.y, h.x - p.x) * 180) / Math.PI);
    power = Math.min(100, Math.round(Math.hypot(h.x - p.x, h.y - p.y) / 1.6));
    updateUI();
  }
});
canvas.addEventListener("pointerup", () => {
  const fire = drag?.moved;
  drag = null;
  if (fire) shoot();
});
canvas.addEventListener("pointercancel", () => {
  drag = null;
});
document.querySelectorAll("[data-unit]").forEach((e) =>
  e.addEventListener("click", () => {
    select(game, Number(e.dataset.unit));
    feedback.emit("select");
    updateUI();
  }),
);
$("#angle").addEventListener("input", (e) => {
  angle = Number(e.target.value);
  updateUI();
});
$("#power").addEventListener("input", (e) => {
  power = Number(e.target.value);
  updateUI();
});
$("#fire").onclick = shoot;
$("#retry").onclick = reset;
$("#again").onclick = reset;
$("#skill").onclick = () => {
  skill = !skill;
  feedback.emit("select");
  updateUI();
};
$("#sound").onclick = () => {
  const on = !feedback.sound;
  feedback.setSound(on);
  $("#sound").textContent = `소리 ${on ? "ON" : "OFF"}`;
  $("#sound").setAttribute("aria-pressed", String(on));
  if (on) feedback.emit("select");
};
$("#fx").onclick = () => {
  fx = !fx;
  feedback.setEnabled(fx);
  $("#fx").textContent = `연출 ${fx ? "ON" : "OFF"}`;
  $("#fx").setAttribute("aria-pressed", String(fx));
  if (!fx) {
    particles = [];
    labels = [];
  }
};
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input,button,a")) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
    e.preventDefault();
  if (e.key.toLowerCase() === "r") {
    reset();
    return;
  }
  if (game.phase !== "aim") return;
  if (["1", "2", "3"].includes(e.key)) select(game, Number(e.key) - 1);
  if (e.key === "ArrowLeft") angle = angle <= -180 ? 180 : angle - 3;
  if (e.key === "ArrowRight") angle = angle >= 180 ? -180 : angle + 3;
  if (e.key === "ArrowUp") power = Math.min(100, power + 5);
  if (e.key === "ArrowDown") power = Math.max(0, power - 5);
  if (e.key.toLowerCase() === "s" && game.charge >= 3) skill = !skill;
  if (e.key === " ") shoot();
  updateUI();
});
// Read-only combat snapshot supports normal-input browser verification.
Object.defineProperty(window, "cometSnapshot", {
  get: () =>
    JSON.parse(
      JSON.stringify({
        ...game,
        events: [],
        shot: game.shot ? { elapsed: game.shot.elapsed } : null,
      }),
    ),
});
$("#fx").textContent = `연출 ${fx ? "ON" : "OFF"}`;
$("#fx").setAttribute("aria-pressed", String(fx));
updateUI();
requestAnimationFrame(frame);
