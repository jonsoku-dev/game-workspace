import {
  createGame,
  select,
  launch,
  step,
  previewShot,
  WEAK_ARC,
  W,
  H,
  R,
} from "./combat.mjs";
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
  hitFlash = 0,
  impacts = [],
  beams = [],
  kick = 0,
  hitStop = 0,
  cachedAim = null,
  aimKey = "";
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
  "sanctum.webp",
]) {
  const im = new Image();
  im.src = `art/${name}`;
  images[name] = im;
  if (name === "sanctum.webp") im.onload = background;
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
  const grad = b.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#080d25");
  grad.addColorStop(0.48, "#23364b");
  grad.addColorStop(1, "#08162c");
  b.fillStyle = grad;
  b.fillRect(0, 0, W, H);
  const scene = images["sanctum.webp"];
  if (scene?.complete && scene.naturalWidth) b.drawImage(scene, 0, 0, W, H);
  const veil = b.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, "#07122233");
  veil.addColorStop(0.5, "#0712220a");
  veil.addColorStop(1, "#07122255");
  b.fillStyle = veil;
  b.fillRect(0, 0, W, H);
  b.strokeStyle = "#edce8ba8";
  b.lineWidth = 2;
  b.strokeRect(18, 18, W - 36, H - 36);
  b.strokeStyle = "#8ae3ea55";
  b.lineWidth = 1;
  b.strokeRect(25, 25, W - 50, H - 50);
  for (const [x, y] of [
    [18, 18],
    [W - 18, 18],
    [18, H - 18],
    [W - 18, H - 18],
  ]) {
    circle(b, x, y, 9, "#0c1c2d", "#f2d092", 2);
    circle(b, x, y, 3, "#9dffff");
  }
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
  const boss = g.foes.find((e) => e.id === "boss" && e.hp > 0);
  const direction = boss
    ? ["오른쪽 →", "아래 ↓", "왼쪽 ←", "위 ↑"][
        Math.round(boss.weakAngle / (Math.PI / 2)) % 4
      ]
    : "";
  $("#shieldNote").textContent = boss
    ? `월식 방벽 · 약점 ${direction} · 다음 턴 90° 회전`
    : "벽을 먼저 맞히면 +10 · 동료를 스치면 +8";
  $("#setup").textContent = g.shot
    ? `${g.shot.banks ? "반사 준비 ✓" : "반사 미준비"} / ${g.shot.assists.size ? "연계 준비 ✓" : "연계 미준비"}`
    : g.lastShot
      ? `지난 궤도 · 반사 ${g.lastShot.banks}회 / 연계 ${g.lastShot.assists}회`
      : "금빛 틈 ×2 · 반사·연계로 방어 관통";
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
    const hit = e.type === "hit",
      weak = e.kind === "weak",
      guard = e.kind === "guard";
    if (hit) {
      feedback.emit(weak ? "crit" : guard ? "denied" : "hit", {
        combo: game.combo,
      });
      if (fx) {
        hitFlash = weak ? 0.18 : 0.07;
        kick = weak ? 8 : guard ? 2 : 4;
        hitStop = weak ? 0.065 : 0.025;
      }
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
    const color = weak
      ? "#ffe28e"
      : guard
        ? "#8aafe1"
        : e.kind === "assist"
          ? game.heroes[e.ally].color
          : e.type === "hurt"
            ? "#ff829c"
            : game.heroes[game.selected].color;
    if (e.text) {
      const prefix = weak ? "약점! " : guard ? "방어 " : e.bank ? "반사! " : "";
      labels.push({
        ...e,
        text: prefix + e.text,
        color,
        life: e.type === "assist" ? 1.7 : 1.15,
      });
      $("#log").textContent = prefix + e.text;
    }
    if (fx) {
      impacts.push({
        x: e.contactX ?? e.x,
        y: e.contactY ?? e.y,
        life: 1,
        color,
        kind: e.type === "assist" ? "assist" : e.kind || e.type,
      });
      if (e.type === "assist")
        for (const target of e.targets)
          beams.push({
            x: e.x,
            y: e.y,
            tx: target.x,
            ty: target.y,
            life: 0.48,
            color: game.heroes[e.ally].color,
            ally: e.ally,
          });
      if (e.type === "enemy")
        beams.push({
          x: e.x,
          y: e.y,
          tx: 360,
          ty: 740,
          life: 0.65,
          color: "#ff7196",
          ally: -1,
        });
      for (let i = 0; i < (weak ? 28 : hit ? 16 : 8); i++) {
        const a = i * 2.39996;
        particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * (65 + i * 7),
          vy: Math.sin(a) * (65 + i * 7),
          life: 0.45 + i * 0.015,
          color,
          shard: hit,
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
  const key = `${game.turn}:${game.selected}:${angle}:${power}:${skill}`;
  if (key !== aimKey) {
    cachedAim = previewShot(game, angle, power, skill);
    aimKey = key;
  }
  const route = cachedAim,
    h = game.heroes[game.selected];
  ctx.save();
  ctx.strokeStyle = "#befff2";
  ctx.lineWidth = 2.3;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  route.points.forEach((p, i) =>
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
  );
  ctx.stroke();
  ctx.setLineDash([]);
  const first = route.impacts[0];
  if (first) {
    const x = first.contactX ?? first.x,
      y = first.contactY ?? first.y;
    circle(
      ctx,
      x,
      y,
      12,
      null,
      first.kind === "weak" ? "#ffe28e" : "#a7fff2",
      2,
    );
  }
  for (const assist of route.assists)
    circle(
      ctx,
      assist.x,
      assist.y,
      R + 9,
      null,
      game.heroes[assist.ally].color,
      2,
    );
  const a = (angle * Math.PI) / 180,
    ax = h.x + Math.cos(a) * 70,
    ay = h.y + Math.sin(a) * 70;
  ctx.beginPath();
  ctx.moveTo(ax - Math.cos(a - 0.5) * 15, ay - Math.sin(a - 0.5) * 15);
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax - Math.cos(a + 0.5) * 15, ay - Math.sin(a + 0.5) * 15);
  ctx.stroke();
  if (drag) {
    line(ctx, h.x, h.y, drag.x, drag.y, "#edc58699", 4);
    circle(ctx, drag.x, drag.y, 9, null, "#f4c77c");
  }
  ctx.restore();
  const note = first
    ? first.type === "bounce"
      ? "첫 반사 · 벽 → 관통 준비"
      : first.kind === "weak"
        ? "첫 충돌 · 보스 약점"
        : first.kind === "guard"
          ? "첫 충돌 · 보스 방어면"
          : "첫 충돌 · 잔영"
    : "이번 위력으로는 충돌하지 않습니다";
  if ($("#trajectory").textContent !== note)
    $("#trajectory").textContent = note;
}
function draw(dt) {
  clock += dt;
  ctx.fillStyle = "#071021";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (fx && kick > 0) {
    ctx.translate(
      Math.sin(clock * 73) * kick,
      Math.cos(clock * 87) * kick * 0.7,
    );
    kick = Math.max(0, kick - dt * 35);
  }
  ctx.drawImage(bg, 0, 0);
  if (game.phase === "aim") aim();
  if (fx) {
    const tint = game.heroes[game.selected].color;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 1; i < trail.length; i++) {
      const strength = i / trail.length;
      line(
        ctx,
        trail[i - 1].x,
        trail[i - 1].y,
        trail[i].x,
        trail[i].y,
        `${tint}${Math.round(strength * 90)
          .toString(16)
          .padStart(2, "0")}`,
        R * strength * 0.8,
      );
    }
    for (let i = 1; i < trail.length; i += 2)
      line(
        ctx,
        trail[i - 1].x,
        trail[i - 1].y,
        trail[i].x,
        trail[i].y,
        "#eaffff99",
        2,
      );
    ctx.restore();
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
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(
        e.x,
        e.y,
        e.r + 14,
        e.weakAngle + WEAK_ARC,
        e.weakAngle + Math.PI * 2 - WEAK_ARC,
      );
      ctx.strokeStyle = "#a780d6cc";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        e.x,
        e.y,
        e.r + 14,
        e.weakAngle - WEAK_ARC,
        e.weakAngle + WEAK_ARC,
      );
      ctx.strokeStyle = "#ffe29b";
      ctx.shadowColor = "#ffc95c";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
      const gx = e.x + Math.cos(e.weakAngle) * (e.r + 34),
        gy = e.y + Math.sin(e.weakAngle) * (e.r + 34);
      ctx.font = "bold 13px system-ui";
      ctx.fillStyle = "#ffe4a4";
      ctx.fillText("약점", gx, gy + 5);
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#e9c8db";
      ctx.fillText("월식의 심장", e.x, e.y - e.r - 38);
    } else {
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#ddc8ef";
      ctx.fillText(
        e.id === "c" ? "중앙 파수꾼" : "수정 잔영",
        e.x,
        e.y - e.r - 18,
      );
    }
  }
  game.heroes.forEach((h, i) => {
    if (i === game.selected) {
      circle(
        ctx,
        h.x,
        h.y,
        R + 12 + (fx ? Math.sin(clock * 3) * 2 : 0),
        null,
        h.color,
        1.5,
      );
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(fx ? clock * 0.3 : 0);
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
  beams = beams.filter((e) => e.life > 0);
  for (const beam of beams) {
    beam.life -= dt;
    ctx.save();
    ctx.globalAlpha = Math.max(0, beam.life * 2);
    ctx.shadowColor = beam.color;
    ctx.shadowBlur = 18;
    line(
      ctx,
      beam.x,
      beam.y,
      beam.tx,
      beam.ty,
      beam.color,
      beam.ally === 0 ? 6 : 3,
    );
    line(ctx, beam.x, beam.y, beam.tx, beam.ty, "#efffff", 1.5);
    ctx.restore();
  }
  impacts = impacts.filter((e) => e.life > 0);
  for (const impact of impacts) {
    impact.life -= dt * 2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, impact.life);
    circle(
      ctx,
      impact.x,
      impact.y,
      12 + (1 - impact.life) * (impact.kind === "weak" ? 90 : 50),
      null,
      impact.color,
      impact.kind === "guard" ? 5 : 2,
    );
    if (impact.kind === "assist")
      circle(
        ctx,
        impact.x,
        impact.y,
        20 + (1 - impact.life) * 85,
        null,
        impact.color,
        1,
      );
    ctx.restore();
  }
  particles = particles.filter((p) => p.life > 0);
  for (const p of particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.shard) {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(clock * 4);
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.restore();
    } else circle(ctx, p.x, p.y, 2.5, p.color);
  }
  ctx.globalAlpha = 1;
  labels = labels.filter((p) => p.life > 0);
  for (const p of labels) {
    p.life -= dt;
    if (fx) p.y -= dt * 25;
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = p.color;
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
  ctx.restore();
}
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  if (hitStop > 0) hitStop = Math.max(0, hitStop - dt);
  else acc += dt;
  while (acc >= 1 / 120) {
    if (game.phase === "flight") {
      step(game);
      const h = game.heroes[game.selected];
      trail.push({ x: h.x, y: h.y });
      if (trail.length > 42) trail.shift();
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
  impacts = [];
  beams = [];
  kick = 0;
  hitStop = 0;
  aimKey = "";
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
    impacts = [];
    beams = [];
    kick = 0;
    hitStop = 0;
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
