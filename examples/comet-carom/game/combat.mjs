export const W = 720,
  H = 840,
  R = 27;
const initialFoes = () => [
  { id: "a", x: 200, y: 230, r: 42, hp: 68, max: 68, timer: 2, period: 2 },
  { id: "b", x: 520, y: 230, r: 42, hp: 68, max: 68, timer: 3, period: 3 },
  { id: "c", x: 360, y: 390, r: 46, hp: 80, max: 80, timer: 2, period: 2 },
];
export function createGame() {
  return {
    heroes: [
      { x: 190, y: 670, name: "솔", color: "#ffc777", art: "guardian-sun.png" },
      {
        x: 530,
        y: 670,
        name: "루나",
        color: "#87e9ff",
        art: "guardian-moon.png",
      },
      {
        x: 360,
        y: 550,
        name: "노바",
        color: "#d1abff",
        art: "guardian-nova.png",
      },
    ],
    foes: initialFoes(),
    hp: 180,
    maxHp: 180,
    selected: 0,
    turn: 1,
    wave: 1,
    charge: 0,
    phase: "aim",
    shot: null,
    combo: 0,
    totalHits: 0,
    bounces: 0,
    assists: 0,
    events: [],
    last: "구슬을 뒤로 당겨 궤도를 만드세요.",
    result: null,
  };
}
function event(g, type, x, y, text) {
  if (type === "bounce") g.bounces++;
  if (type === "assist") g.assists++;
  g.events.push({ type, x, y, text });
}
function damage(g, e, n) {
  if (e.hp <= 0) return;
  e.hp = Math.max(0, e.hp - n);
  g.combo++;
  g.totalHits++;
  event(g, "hit", e.x, e.y, `−${n}`);
}
export function select(g, i) {
  if (g.phase === "aim" && i >= 0 && i < 3) g.selected = i;
}
export function launch(g, angle = -90, power = 85, skill = false) {
  if (g.phase !== "aim") return false;
  const h = g.heroes[g.selected],
    a = (angle * Math.PI) / 180,
    speed = 420 + Math.max(0, Math.min(100, power)) * 8;
  const charged = skill && g.charge >= 3;
  if (charged) g.charge = 0;
  g.shot = {
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    elapsed: 0,
    assists: new Set(),
    contacts: new Set(),
    skill: charged,
  };
  g.phase = "flight";
  g.combo = 0;
  g.last = charged
    ? "성좌 해방 · 충돌 피해 2배"
    : "혜성 발사 · 동료를 스쳐 연계하세요";
  event(g, "attack", h.x, h.y, charged ? "성좌 해방" : "");
  if (charged) g.foes.forEach((e) => damage(g, e, 28));
  return true;
}
function assist(g, i) {
  const h = g.heroes[i],
    live = g.foes.filter((e) => e.hp > 0);
  event(
    g,
    "assist",
    h.x,
    h.y,
    ["태양창 · 추적", "달의 샘 · 회복", "별비 · 전체"][i],
  );
  if (i === 1) g.hp = Math.min(g.maxHp, g.hp + 22);
  if (i === 2) live.forEach((e) => damage(g, e, 18));
  else {
    live.sort(
      (a, b) =>
        Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y),
    );
    if (live[0]) damage(g, live[0], i === 0 ? 38 : 20);
  }
}
function finish(g) {
  g.shot = null;
  if (g.foes.every((e) => e.hp <= 0)) {
    if (g.wave === 2) {
      g.phase = "won";
      g.result = "월식이 걷혔습니다";
      g.last = g.result;
      event(g, "win", 360, 330, "궤도 수복");
      return;
    }
    g.wave = 2;
    g.foes = [
      {
        id: "boss",
        x: 360,
        y: 245,
        r: 72,
        hp: 200,
        max: 200,
        timer: 2,
        period: 2,
      },
      { id: "d", x: 180, y: 420, r: 38, hp: 52, max: 52, timer: 3, period: 3 },
      { id: "e", x: 540, y: 420, r: 38, hp: 52, max: 52, timer: 3, period: 3 },
    ];
    g.hp = Math.min(g.maxHp, g.hp + 30);
    g.last = "WAVE 02 · 월식의 심장 출현 · 체력 +30";
    event(g, "progress", 360, 240, "월식의 심장");
  } else {
    let hurt = 0;
    g.foes
      .filter((e) => e.hp > 0)
      .forEach((e) => {
        e.timer--;
        if (e.timer === 0) {
          hurt += e.id === "boss" ? 38 : 17;
          e.timer = e.period;
          event(g, "enemy", e.x, e.y, "잔영 포격");
        }
      });
    g.hp = Math.max(0, g.hp - hurt);
    g.last = hurt
      ? `적의 반격 · 파티 체력 −${hurt}`
      : "적이 기운을 모읍니다 · 다음 궤도를 선택하세요";
    if (hurt) event(g, "hurt", 360, 700, `체력 −${hurt}`);
    if (g.hp === 0) {
      g.phase = "lost";
      g.result = "궤도가 흩어졌습니다";
      g.last = g.result;
      event(g, "lose", 360, 330, "다시 별을 잇다");
      return;
    }
  }
  g.turn++;
  g.charge = Math.min(3, g.charge + 1);
  g.selected = (g.selected + 1) % 3;
  g.phase = "aim";
}
// Fixed 120 Hz simulation; <= 3 px spatial substeps prevent circle tunneling.
export function step(g, dt = 1 / 120) {
  if (g.phase !== "flight") return;
  const s = g.shot,
    h = g.heroes[g.selected];
  const count = Math.max(1, Math.ceil((Math.hypot(s.vx, s.vy) * dt) / 3));
  for (let k = 0; k < count; k++) {
    h.x += (s.vx * dt) / count;
    h.y += (s.vy * dt) / count;
    for (const axis of ["x", "y"]) {
      const max = (axis === "x" ? W : H) - R - 18,
        min = R + 18,
        v = axis === "x" ? "vx" : "vy";
      if (h[axis] < min) {
        h[axis] = min + (min - h[axis]);
        s[v] = Math.abs(s[v]);
        event(g, "bounce", h.x, h.y, "");
      }
      if (h[axis] > max) {
        h[axis] = max - (h[axis] - max);
        s[v] = -Math.abs(s[v]);
        event(g, "bounce", h.x, h.y, "");
      }
    }
    for (const e of g.foes) {
      if (e.hp <= 0) continue;
      let dx = h.x - e.x,
        dy = h.y - e.y,
        d = Math.hypot(dx, dy),
        min = R + e.r;
      if (d < min) {
        if (d < 0.001) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const nx = dx / d,
          ny = dy / d,
          dot = s.vx * nx + s.vy * ny;
        h.x = e.x + nx * (min + 0.2);
        h.y = e.y + ny * (min + 0.2);
        if (dot < 0) {
          s.vx -= 2 * dot * nx;
          s.vy -= 2 * dot * ny;
          if (!s.contacts.has(e.id)) {
            damage(g, e, s.skill ? 52 : 26);
            s.contacts.add(e.id);
          }
        }
      } else if (d > min + 8) s.contacts.delete(e.id);
    }
    g.heroes.forEach((a, i) => {
      if (
        i !== g.selected &&
        !s.assists.has(i) &&
        Math.hypot(h.x - a.x, h.y - a.y) < R * 2 + 8
      ) {
        s.assists.add(i);
        assist(g, i);
      }
    });
  }
  s.elapsed += dt;
  const decay = Math.pow(0.991, dt * 120);
  s.vx *= decay;
  s.vy *= decay;
  if (
    s.elapsed > 4.8 ||
    Math.hypot(s.vx, s.vy) < 55 ||
    g.foes.every((e) => e.hp <= 0)
  )
    finish(g);
}
export function simulate(g) {
  let n = 0;
  while (g.phase === "flight" && n++ < 1000) step(g);
  return g;
}
