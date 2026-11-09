import { loadCampaign } from "./campaign.mjs";
const campaign = await loadCampaign();
import { createFeedback } from "./feedback.mjs";
import {
  platforms as forestPlatforms,
  moonPlatforms,
  moonBeacons,
  beaconWindow,
  beaconResponse,
  stageBaseline,
  missedHeight,
  progression,
  portalOpen,
  landing,
  createSpell,
  advanceSpell,
  windBloom,
} from "./rules.mjs";
const canvas = document.querySelector("canvas"),
  c = canvas.getContext("2d"),
  $ = (s) => document.querySelector(s);
const feedback = createFeedback({ sound: false }),
  keys = new Set(),
  pressed = new Set();
const scenery = new Image();
scenery.src = "./scenery/canopy.webp";
const art = {};
const terrainArt = {};
for (const name of [
  "platform-island",
  "ground-strip",
  "wind-stump",
  "portal",
]) {
  terrainArt[name] = new Image();
  terrainArt[name].src = `./scenery/${name}.png`;
}
art.walk = new Image();
art.walk.src = "./art/walk-cycle.png";
for (const name of ["player", "creature"]) {
  art[name] = new Image();
  art[name].src = `./art/${name}.png`;
}
let platforms = forestPlatforms,
  litBeacons = 0,
  stageTime = 0,
  entryKills = 0;
let visualTime = 0,
  pulseWasOpen = true;
let p,
  enemies,
  spells = [],
  impacts = [],
  levelGlow = 0,
  shake = 0,
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
function enterStage() {
  const baseline = stageBaseline(campaign.index, entryKills);
  platforms = campaign.index === 0 ? forestPlatforms : moonPlatforms;
  scenery.src =
    campaign.index === 0
      ? "./scenery/canopy.webp"
      : "./scenery/moon-grove.webp";
  litBeacons = 0;
  stageTime = 0;
  pulseWasOpen = true;
  keys.clear();
  pressed.clear();
  p = {
    x: 150,
    y: 575,
    vy: 0,
    dir: 1,
    hp: baseline.hp,
    ground: true,
    drop: 0,
    attack: 0,
    cool: 0,
    magic: 0,
    inv: 0,
  };
  spells = [];
  impacts = [];
  levelGlow = 0;
  shake = 0;
  enemies = (
    campaign.index === 0
      ? [
          { x: 570, y: 450, home: 570, platform: 1 },
          { x: 1010, y: 340, home: 1010, platform: 2 },
          { x: 1390, y: 445, home: 1390, platform: 3 },
          { x: 1830, y: 330, home: 1830, platform: 4 },
        ]
      : [
          { x: 520, y: 450, home: 520, platform: 1 },
          { x: 1100, y: 330, home: 1100, platform: 2 },
        ]
  ).map((e, i) => ({
    id: `creature-${i}`,
    ...e,
    hp: 3,
    max: 3,
    state: "walk",
    timer: 1 + i * 0.3,
    dir: -1,
    hit: 0,
  }));
  kills = baseline.kills;
  charged = false;
  mode = "play";
  camera = 0;
  particles = [];
  texts = [];
  $("#modal").hidden = true;
  $("#pause").textContent = "Ⅱ 쉬기";
  $("#questTitle").textContent = campaign.stage.title;
  $("#regionTitle").textContent = campaign.stage.title;
  $("#stageObjective").textContent = campaign.stage.objective;
  canvas.setAttribute(
    "aria-label",
    `${campaign.stage.title}. ${campaign.stage.objective} ${campaign.stage.tactic} 화살표 이동, Space 점프, J 공격, K 별꽃.`,
  );
  canvas.focus({ preventScroll: true });
  toast(campaign.stage.tactic);
  hud();
}
function restartCampaign() {
  if (!campaign.restart()) return false;
  entryKills = 0;
  enterStage();
  return true;
}
function continueCampaign() {
  const action = campaign.confirmResult();
  if (!action) return false;
  if (action === "advance") entryKills = kills;
  if (action === "restart") entryKills = 0;
  enterStage();
  return true;
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
  $("#quest").textContent =
    campaign.index === 0
      ? `별잎 되찾기 ${q.leaves} / 3`
      : `달빛 봉화 ${litBeacons} / 2 · ${litBeacons === 0 ? "첫 봉화 →" : litBeacons === 1 ? "둘째 봉화 ←" : "별길 완성"}`;
  $("#spell").textContent =
    campaign.index === 1
      ? charged
        ? "✧ 별길의 문 열림"
        : litBeacons === 0
          ? "아래 발판에서 오른쪽으로 K"
          : "위 발판 오른편에서 왼쪽으로 K · 밝을 때"
      : charged
        ? "✧ 고원의 문 열림"
        : q.spell
          ? "K · 별꽃을 바람꽃에 맞히기"
          : "두 마리 처치 → 별꽃 개방";
  $("#magic").style.background = q.spell ? "#f7e2a7" : "#e5e8d9";
  $("#distance").textContent = `구역 ${campaign.index + 1} / 2`;
  const pulseText =
    campaign.index === 1 && litBeacons === 1
      ? beaconWindow(stageTime)
        ? "둘째 봉화: 밝음 · 지금 명중"
        : "둘째 봉화: 어두움 · 다음 빛을 기다리기"
      : "";
  if ($("#pulseStatus").textContent !== pulseText)
    $("#pulseStatus").textContent = pulseText;
}
function burst(x, y, color, n = 18) {
  if (feedback.reducedMotion) return;
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
function hurt(e, damage, direction = p.dir) {
  if (e.hp <= 0) return;
  e.hp -= damage;
  e.hit = 0.25;
  e.x += direction * 14;
  e.state = "rest";
  e.timer = 0.32;
  shake = damage > 1 ? 0.12 : 0.06;
  cue(damage > 1 ? "crit" : "hit");
  burst(e.x, e.y - 35, "#ffdd79", 10);
  float(`−${damage}`, e.x, e.y - 75);
  if (e.hp <= 0) {
    kills++;
    burst(e.x, e.y - 40, "#c9ee86", 28);
    float(
      campaign.index === 0 ? "+35 EXP · 별잎 +1" : "길 확보",
      e.x,
      e.y - 95,
      "#fff7b5",
    );
    cue("pickup");
    if (campaign.index === 0 && kills === 2) {
      p.hp = Math.min(100, p.hp + 35);
      levelGlow = 2.4;
      toast("레벨 2 · 별꽃 개방! K를 눌러 전방으로 꽃을 날려 보세요.");
      cue("win");
      burst(p.x, p.y - 50, "#fff2a2", 55);
    } else if (campaign.index === 0 && kills === 3)
      toast("별잎을 다 모았어요. 오른쪽 바람꽃에 별꽃을 맞혀 주세요.");
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
  p.cool = magic ? 1.05 : 0.35;
  p.attack = magic ? 0.42 : 0.22;
  p.magic = magic ? 0.42 : 0;
  cue(magic ? "progress" : "attack");
  if (magic) {
    spells.push(createSpell(p.x + p.dir * 32, p.y - 50, p.dir, true));
    return;
  }
  let hit = false;
  for (const e of enemies) {
    if (
      e.hp > 0 &&
      Math.abs(e.y - p.y) < 70 &&
      Math.abs(e.x - p.x) < 100 &&
      (e.x - p.x) * p.dir > -20
    ) {
      hurt(e, 1);
      hit = true;
    }
  }
  if (!hit) cue("miss");
}
function end(win) {
  if (!(win ? campaign.finishStage() : campaign.failStage())) return;
  mode = win ? "win" : "lose";
  cue(win ? (campaign.phase === "between" ? "win" : "finish") : "lose");
  $("#endingTag").textContent = win
    ? campaign.phase === "between"
      ? "STAGE CLEAR"
      : "JOURNEY COMPLETE"
    : "TRY AGAIN";
  $("#ending").textContent = win
    ? campaign.phase === "between"
      ? "고원 너머의 초대"
      : "두 숲에 별길이 이어졌어요"
    : "잠깐, 숨을 골라요";
  $("#endingText").textContent = win
    ? campaign.phase === "between"
      ? "별꽃의 힘을 간직한 채 달빛 상층숲으로 향합니다."
      : "높이와 방향, 달의 맥동을 읽어 별길을 완성했습니다."
    : "현재 구역 진입 상태로 재도전합니다. 봉화는 높이와 방향을 읽고 맞혀 주세요.";
  $("#restart").textContent =
    campaign.phase === "between"
      ? "다음 구역 · 달빛 상층숲 →"
      : campaign.phase === "failed"
        ? "이 구역 재도전 ↗"
        : "첫 모험부터 다시";
  $("#fresh").hidden = campaign.phase === "complete";
  $("#modal").hidden = false;
  $("#restart").focus();
  keys.clear();
  pressed.clear();
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
    if (restartCampaign()) cue("restart");
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
  if (continueCampaign()) cue("restart");
};
$("#fresh").onclick = () => {
  if (restartCampaign()) cue("restart");
};
const has = (...ks) => ks.some((k) => keys.has(k)),
  tap = (...ks) => ks.some((k) => pressed.has(k));
function update(dt) {
  time += dt;
  visualTime = feedback.reducedMotion ? 0 : time;
  if (mode !== "play") {
    pressed.clear();
    return;
  }
  levelGlow = Math.max(0, levelGlow - dt);
  shake = Math.max(0, shake - dt);
  stageTime += dt;
  const pulseOpen = beaconWindow(stageTime);
  if (campaign.index === 1 && litBeacons === 1 && pulseOpen && !pulseWasOpen)
    cue("select");
  pulseWasOpen = pulseOpen;
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
    p.x += move * 230 * dt * (p.magic > 0.24 ? 0.25 : 1);
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
  const draftXs =
    campaign.index === 0
      ? [800, 1580, 2010]
      : [
          ...(litBeacons >= 1 ? [800] : []),
          ...(litBeacons >= 2 ? [1660, 2080] : []),
        ];
  const inDraft = draftXs.some((x) => Math.abs(p.x - x) < 53);
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
    const floor = landing(old, p.y, p.x, p.drop > 0, platforms);
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
    if (campaign.index === 0 ? portalOpen(kills, charged) : litBeacons === 2) {
      end(true);
      return;
    } else {
      cue("denied");
      toast(
        campaign.index === 1
          ? "높이와 방향을 맞춰 두 봉화를 순서대로 깨워 주세요."
          : kills < 3
            ? "별잎 세 장과 별꽃 마법이 필요해요."
            : "문 왼쪽의 바람꽃에 별꽃을 맞혀 주세요.",
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
  const targets = enemies
    .filter((e) => e.hp > 0)
    .map((e) => ({ id: e.id, x: e.x, y: e.y - 40, radius: 30 }));
  if (campaign.index === 0 && !charged) targets.push(windBloom);
  if (campaign.index === 1) targets.push(...moonBeacons.slice(litBeacons));
  spells = spells
    .map((spell) => {
      const next = advanceSpell(spell, dt, targets);
      if (next.hit) {
        const beaconHit = next.hit.startsWith("beacon-");
        if (!beaconHit) {
          impacts.push({ x: next.x, y: next.y, life: 0.45 });
          burst(next.x, next.y, "#fff0ae", 24);
        }
        if (beaconHit) {
          const result = beaconResponse(
            litBeacons,
            next.hit,
            next.dir,
            stageTime,
          );
          litBeacons = result.lit;
          charged = litBeacons === 2;
          if (result.reason === "lit") {
            impacts.push({ x: next.x, y: next.y, life: 0.45 });
            burst(next.x, next.y, "#fff0ae", 24);
            cue(charged ? "crit" : "progress");
            levelGlow = 1;
            toast(
              charged
                ? "둘째 봉화 점등 · 별길의 문으로 →"
                : "첫 봉화 점등! 오른쪽 바람길 ↑, 위 발판에서 왼쪽으로 별꽃을 쏘세요.",
            );
          } else {
            cue("denied");
            float(
              result.reason === "pulse"
                ? "맥동 대기"
                : result.reason === "direction"
                  ? "방향 확인"
                  : "순서 확인",
              next.x,
              next.y - 25,
              "#d6cce9",
            );
            toast(
              result.reason === "pulse"
                ? "달빛이 어두워요. 봉화의 밝은 맥동에 맞혀 주세요."
                : result.reason === "direction"
                  ? "봉화의 화살표 방향에서 별꽃을 보내 주세요."
                  : "첫 봉화를 먼저 밝혀 주세요.",
            );
          }
        } else if (next.hit === "bloom") {
          if (kills >= 3) {
            charged = true;
            cue("finish");
            levelGlow = 1.5;
            toast("바람꽃이 피었어요 · 열린 문에서 ↑");
          } else {
            cue("denied");
            toast("바람꽃을 깨우려면 별잎 세 장이 필요해요.");
          }
        } else {
          const enemy = enemies.find((e) => e.id === next.hit);
          hurt(enemy, 3, next.dir);
        }
        next.life = 0;
      }
      if (next.life <= 0 && !next.hit) {
        const target = campaign.index === 1 ? moonBeacons[litBeacons] : null;
        if (missedHeight(next, target)) {
          cue("denied");
          toast("높이가 달라요 · 봉화와 같은 발판에서 별꽃을 보내 주세요.");
        } else cue("miss");
      }
      return next;
    })
    .filter((spell) => spell.life > 0);
  impacts = impacts
    .map((impact) => ({ ...impact, life: impact.life - dt }))
    .filter((impact) => impact.life > 0);
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
    c.drawImage(
      scenery,
      -camera * (feedback.reducedMotion ? 0 : 0.1),
      0,
      1400,
      680,
    );
    for (let i = 0; i < 14; i++)
      leaf(
        (i * 137 - visualTime * 10 - camera * 0.3 + 3000) % 1300,
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
    let x = (i * 137 - visualTime * (8 + rand(i) * 9) - camera * 0.45) % 1300;
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
    const image = terrainArt[pf.y === 575 ? "ground-strip" : "platform-island"];
    if (image.complete && image.naturalWidth) {
      if (pf.y === 575) {
        for (let tx = pf.x; tx < pf.x + pf.w; tx += 512)
          c.drawImage(image, tx - camera, pf.y - 16, 512, 128);
      } else {
        const scale = pf.w / 480;
        c.drawImage(
          image,
          x - 16 * scale,
          y - 32 * scale,
          512 * scale,
          192 * scale,
        );
      }
      continue;
    }
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
  for (const x of campaign.index === 0
    ? [800, 1580, 2010]
    : [800, 1660, 2080]) {
    const sx = x - camera;
    const stump = terrainArt["wind-stump"];
    if (stump.complete && stump.naturalWidth)
      c.drawImage(stump, sx - 72, 575 - 132, 144, 144);
    for (let i = 0; i < 7; i++) {
      let yy = 565 - ((visualTime * 115 + i * 39) % 250);
      c.globalAlpha =
        campaign.index === 1 &&
        ((x === 800 && litBeacons < 1) || (x !== 800 && litBeacons < 2))
          ? 0.06
          : 0.35;
      c.strokeStyle = "#f3ffe4";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(sx + Math.sin(i + time) * 13, yy, 36, 10, 0, 0, Math.PI);
      c.stroke();
      c.globalAlpha = 1;
    }
  }
  for (let i = 0; i < (terrainArt["ground-strip"].naturalWidth ? 0 : 40); i++) {
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
  if (charged) {
    const glow = c.createRadialGradient(x, 465, 10, x, 465, 140);
    glow.addColorStop(0, "#fffac5dd");
    glow.addColorStop(1, "#d7f7cb00");
    c.fillStyle = glow;
    c.fillRect(x - 150, 320, 300, 260);
  }
  const image = terrainArt.portal;
  if (image.complete && image.naturalWidth)
    c.drawImage(image, x - 128, 575 - 300, 256, 320);
  else {
    ellipse(x, 480, 70, 95, charged ? "#ddf5c3" : "#82a594", "#b3c58d");
  }
  if (!charged) {
    c.fillStyle = "#29493677";
    c.beginPath();
    c.ellipse(x, 468, 46, 82, 0, 0, Math.PI * 2);
    c.fill();
  }
  text(charged ? "↑ 들어가기" : "", x, 597, 15, "#f7f4d6");
  if (campaign.index === 1) {
    for (let i = 0; i < moonBeacons.length; i++) {
      const b = moonBeacons[i],
        bx = b.x - camera,
        lit = i < litBeacons,
        ready = i === 0 || beaconWindow(stageTime);
      line(bx, b.y + 50, bx, b.y, "#72879b", 6);
      const glow = c.createRadialGradient(bx, b.y, 2, bx, b.y, 65);
      glow.addColorStop(
        0,
        lit ? "#c8fcece0" : ready ? "#e7d9ffb0" : "#485a7844",
      );
      glow.addColorStop(1, "#a8d9ec00");
      c.fillStyle = glow;
      c.fillRect(bx - 65, b.y - 65, 130, 130);
      for (let petal = 0; petal < 5; petal++) {
        const a = (petal * Math.PI * 2) / 5 + visualTime * 0.3;
        ellipse(
          bx + Math.cos(a) * 17,
          b.y + Math.sin(a) * 17,
          12,
          8,
          lit ? "#b9ffe3" : ready ? "#e4d3fc" : "#69708c",
          "#7b8baa",
        );
      }
      text(lit ? "✧" : i === 0 ? "1 →" : "← 2", bx, b.y - 42, 18, "#f4edff");
      if (i === 1 && !lit) {
        c.strokeStyle = ready ? "#e5dcff" : "#748097";
        c.lineWidth = 4;
        c.beginPath();
        c.arc(
          bx,
          b.y,
          36,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * (stageTime % 4)) / 4,
        );
        c.stroke();
        text(ready ? "지금" : "기다리기", bx, b.y + 66, 12, "#e3e9ff");
      }
    }
    return;
  }
  const bx = windBloom.x - camera,
    by = windBloom.y;
  line(bx, 575, bx, by, "#6d9960", 5);
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 + Math.sin(visualTime) * 0.08;
    const reach = charged ? 20 : 9;
    ellipse(
      bx + Math.cos(angle) * reach,
      by + Math.sin(angle) * reach,
      charged ? 14 : 8,
      charged ? 9 : 12,
      charged ? "#ffecc0" : "#9bad79",
      "#6b8b60",
    );
  }
  ellipse(
    bx,
    by,
    charged ? 9 : 5,
    charged ? 9 : 9,
    charged ? "#fff7b4" : "#a1bb85",
    null,
  );
  if (progression(kills).spell && !charged) {
    text(
      kills >= 3 ? "별꽃으로 깨우기" : "별잎 3장이 필요해요",
      bx,
      by - 45,
      13,
      "#fff8d3",
    );
    c.strokeStyle = "#f6ebbe";
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(bx, by, 35 + Math.sin(visualTime * 3) * 3, 0, Math.PI * 2);
    c.stroke();
  }
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
  const walking = frame === 1 || frame === 2;
  const sheet =
    walking && art.walk.complete && art.walk.naturalWidth
      ? art.walk
      : art.player;
  if (sheet === art.walk) frame = Math.floor(time * 10) % 6;
  if (!sprite(sheet, frame, 96, x, p.y + bob, 110, 110, p.dir)) {
    ellipse(x, p.y - 55, 26, 30, "#ffe2ac", "#775f4a");
    ellipse(x, p.y - 72, 35, 22, "#b98258", "#775f4a");
    ellipse(x, p.y - 21, 23, 22, "#aac27a", "#5c8059");
    ellipse(x - 9, p.y - 57, 3, 5, "#4c5141", null);
    ellipse(x + 9, p.y - 57, 3, 5, "#4c5141", null);
  }
  c.globalAlpha = 1;
  if (p.attack > 0 && p.magic <= 0) {
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
}
function creature(e) {
  if (e.hp <= 0) return;
  let x = e.x - camera,
    bob = Math.sin(visualTime * 5 + e.home) * 3;
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
  if (e.hp === e.max && Math.abs(e.x - p.x) > 180) return;
  c.fillStyle = "#6c8868";
  c.fillRect(x - 24, e.y - 85, 48, 5);
  c.fillStyle = "#f4bd7b";
  c.fillRect(x - 24, e.y - 85, (e.hp / e.max) * 48, 5);
}
function draw() {
  c.clearRect(0, 0, W, H);
  background();
  c.save();
  if (shake > 0 && !feedback.reducedMotion)
    c.translate(
      Math.sin(time * 170) * shake * 28,
      Math.cos(time * 150) * shake * 18,
    );
  terrain();
  portal();
  for (const e of enemies) creature(e);
  player();
  for (const spell of spells) {
    c.save();
    c.globalAlpha = Math.min(1, spell.life * 4);
    const x = spell.x - camera,
      y = spell.y;
    if (spell.phase === "travel") {
      const trail = c.createLinearGradient(x - spell.dir * 95, y, x, y);
      trail.addColorStop(0, "#fff6ba00");
      trail.addColorStop(1, "#fff6bac0");
      c.fillStyle = trail;
      c.beginPath();
      c.ellipse(x - spell.dir * 40, y, 55, 8, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(x, y);
    c.rotate(visualTime * 7);
    const size = spell.phase === "cast" ? 9 + spell.age * 65 : 18;
    for (let i = 0; i < 5; i++) {
      c.rotate((Math.PI * 2) / 5);
      ellipse(size, 0, size * 0.7, size * 0.4, "#fff1af", "#e6cd7c");
    }
    ellipse(0, 0, 8, 8, "#fffce1", null);
    c.restore();
    c.restore();
  }
  for (const impact of impacts) {
    c.strokeStyle = `rgba(255,247,199,${impact.life / 0.45})`;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(
      impact.x - camera,
      impact.y,
      feedback.reducedMotion ? 28 : (0.45 - impact.life) * 150 + 15,
      0,
      Math.PI * 2,
    );
    c.stroke();
  }
  if (levelGlow > 0) {
    const x = p.x - camera,
      y = p.y - 60;
    c.save();
    c.globalAlpha = Math.min(1, levelGlow);
    for (let i = 0; i < 7; i++) {
      const a = (i * Math.PI * 2) / 7 + visualTime * 0.6;
      line(
        x + Math.cos(a) * 55,
        y + Math.sin(a) * 55,
        x + Math.cos(a) * 95,
        y + Math.sin(a) * 95,
        "#fff4bd",
        3,
      );
    }
    text("별꽃의 수호자", x, y - 95, 23, "#fff4bd");
    c.restore();
  }
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
  c.restore();
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
enterStage();
requestAnimationFrame(loop);
