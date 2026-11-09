export const W = 720,
  H = 840,
  R = 27;
const RAIL = 18;
export const WEAK_ARC = Math.PI / 3;
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
        color: "#8ce5b4",
        art: "guardian-nova.png",
      },
    ],
    encounter: "sanctum",
    latches: [],
    aperture: 0,
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
    weakHits: 0,
    shieldBlocks: 0,
    lastShot: null,
    events: [],
    last: "구슬을 뒤로 당겨 궤도를 만드세요.",
    result: null,
  };
}
function event(g, type, x, y, text, detail = {}) {
  if (type === "bounce") g.bounces++;
  if (type === "assist") g.assists++;
  g.events.push({ type, x, y, text, ...detail });
}
function damage(g, e, n, detail = {}) {
  if (e.hp <= 0) return;
  if (e.id === "core" && g.aperture <= 0) {
    n = 0;
    detail = { ...detail, kind: "sealed" };
  }
  e.hp = Math.max(0, e.hp - n);
  g.combo++;
  g.totalHits++;
  if (detail.kind === "weak") g.weakHits++;
  if (detail.kind === "guard" || detail.kind === "sealed") g.shieldBlocks++;
  event(g, "hit", e.x, e.y, n === 0 ? "핵 봉인" : `−${n}`, {
    ...detail,
    damage: n,
    target: e.id,
  });
}
function impactProfile(foe, nx, ny, shot) {
  const bank = shot.banks > 0,
    linked = shot.assists.size > 0;
  const difference = Math.atan2(
    Math.sin(Math.atan2(ny, nx) - (foe.weakAngle || 0)),
    Math.cos(Math.atan2(ny, nx) - (foe.weakAngle || 0)),
  );
  const weak = foe.id === "boss" && Math.abs(difference) <= WEAK_ARC;
  const guard = foe.id === "boss" && !weak;
  let damage = foe.id === "core" ? 42 : guard ? 8 : weak ? 52 : 26;
  damage += bank ? (guard ? 18 : weak ? 16 : 10) : 0;
  damage += linked ? (guard ? 18 : weak ? 16 : 8) : 0;
  return {
    damage: damage * (shot.skill ? 2 : 1),
    kind: weak ? "weak" : guard ? "guard" : "strike",
    bank,
    linked,
  };
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
    banks: 0,
    assists: new Set(),
    contacts: new Set(),
    skill: charged,
  };
  for (const latch of g.latches) latch.lit = false;
  g.phase = "flight";
  g.combo = 0;
  g.last = charged
    ? "성좌 해방 · 충돌 피해 2배"
    : "혜성 발사 · 동료를 스쳐 연계하세요";
  event(g, "attack", h.x, h.y, charged ? "성좌 해방" : "");
  if (charged) g.foes.forEach((e) => damage(g, e, 28, { kind: "skill" }));
  return true;
}
function assist(g, i) {
  const h = g.heroes[i],
    live = g.foes.filter((e) => e.hp > 0);
  live.sort(
    (a, b) =>
      Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y),
  );
  event(
    g,
    "assist",
    h.x,
    h.y,
    ["태양창 · 방어 관통", "달의 샘 · 체력 +22", "별비 · 전장 관통"][i],
    {
      ally: i,
      targets: (i === 2 ? live : live.slice(0, 1)).map((e) => ({
        x: e.x,
        y: e.y,
      })),
    },
  );
  if (i === 1) g.hp = Math.min(g.maxHp, g.hp + 22);
  if (i === 2)
    live.forEach((e) => damage(g, e, 18, { kind: "assist", ally: i }));
  else {
    if (live[0])
      damage(g, live[0], i === 0 ? 38 : 20, { kind: "assist", ally: i });
  }
}
function finish(g) {
  g.lastShot = {
    banks: g.shot.banks,
    assists: g.shot.assists.size,
    hits: g.combo,
    latches: g.latches.filter((latch) => latch.lit).length,
  };
  g.shot = null;
  if (g.foes.every((e) => e.hp <= 0)) {
    if (g.wave === 2 || g.encounter === "twin-observatory") {
      g.phase = "won";
      g.result =
        g.encounter === "twin-observatory"
          ? "쌍성의 궤도가 이어졌습니다"
          : "월식이 걷혔습니다";
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
        weakAngle: Math.PI / 2,
      },
      { id: "d", x: 180, y: 420, r: 38, hp: 52, max: 52, timer: 3, period: 3 },
      { id: "e", x: 540, y: 420, r: 38, hp: 52, max: 52, timer: 3, period: 3 },
    ];
    g.hp = Math.min(g.maxHp, g.hp + 30);
    g.last = "월식의 심장 · 금빛 틈을 노리세요. 벽·연계로 방어 관통";
    event(g, "progress", 360, 240, "월식의 심장");
  } else {
    let hurt = 0;
    g.foes
      .filter((e) => e.hp > 0)
      .forEach((e) => {
        if (e.id === "boss")
          e.weakAngle = (e.weakAngle + Math.PI / 2) % (Math.PI * 2);
        e.timer--;
        if (e.timer === 0) {
          hurt += e.id === "core" ? 24 : e.id === "boss" ? 38 : 17;
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
  if (
    g.encounter === "twin-observatory" &&
    g.aperture === 0 &&
    g.latches.some((l) => l.lit)
  ) {
    g.last = "연결 끊김 · 두 고리를 같은 한 발로 이어야 합니다";
    event(g, "chainbreak", 360, 320, "연결 끊김 · 한 발에 두 고리");
  }
  if (g.aperture > 0) {
    g.aperture--;
    if (g.phase !== "lost")
      g.last = g.aperture
        ? "쌍성 동기화 · 다음 발사까지 관측핵이 열립니다"
        : "노출 종료 · 한 발에 두 고리를 다시 켜세요";
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
      const max = (axis === "x" ? W : H) - R - RAIL,
        min = R + RAIL,
        v = axis === "x" ? "vx" : "vy";
      if (h[axis] < min) {
        h[axis] = min + (min - h[axis]);
        s[v] = Math.abs(s[v]);
        s.banks++;
        event(g, "bounce", h.x, h.y, "", { axis });
      }
      if (h[axis] > max) {
        h[axis] = max - (h[axis] - max);
        s[v] = -Math.abs(s[v]);
        s.banks++;
        event(g, "bounce", h.x, h.y, "", { axis });
      }
    }
    for (const latch of g.latches) {
      if (
        !latch.lit &&
        (s.banks > 0 || s.assists.size > 0) &&
        Math.hypot(h.x - latch.x, h.y - latch.y) <= R + latch.r
      ) {
        latch.lit = true;
        event(
          g,
          "latch",
          latch.x,
          latch.y,
          `${g.latches.filter((item) => item.lit).length === 1 ? "첫 고리" : "둘째 고리"} · ${latch.name}`,
          { latch: latch.id },
        );
        if (g.latches.every((item) => item.lit)) {
          g.aperture = 2;
          event(g, "open", 360, 180, "쌍성 동기화 · 핵 노출");
        }
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
            const impact = impactProfile(e, nx, ny, s);
            damage(g, e, impact.damage, {
              ...impact,
              contact: true,
              nx,
              ny,
              contactX: h.x,
              contactY: h.y,
            });
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

// Predict with the same fixed-step collisions as a real shot, including foes.
export function previewShot(g, angle, power, skill = false) {
  const copy = structuredClone(g);
  copy.events = [];
  if (!launch(copy, angle, power, skill))
    return { points: [], impacts: [], assists: [] };
  const points = [
      { x: copy.heroes[copy.selected].x, y: copy.heroes[copy.selected].y },
    ],
    impacts = [],
    assists = [],
    latches = [];
  let firstTick = -1;
  copy.events = [];
  for (let tick = 0; tick < 576 && copy.phase === "flight"; tick++) {
    const selected = copy.selected;
    step(copy);
    const h = copy.heroes[selected];
    points.push({ x: h.x, y: h.y });
    for (const e of copy.events.splice(0)) {
      if (e.type === "bounce" || (e.type === "hit" && e.contact)) {
        impacts.push(e);
        if (firstTick < 0) firstTick = tick;
      }
      if (e.type === "assist") assists.push(e);
      if (e.type === "latch") latches.push(e);
    }
    if (
      firstTick >= 0 &&
      tick - firstTick >= 26 &&
      g.encounter !== "twin-observatory"
    )
      break;
  }
  return { points, impacts, assists, latches, opensCore: latches.length === 2 };
}

export function enterStage(previous, id) {
  if (id === "sanctum") return createGame();
  if (id !== "twin-observatory") throw new Error(`Unknown encounter: ${id}`);
  const g = structuredClone(previous);
  Object.assign(g, {
    encounter: id,
    wave: 1,
    turn: 1,
    hp: g.maxHp,
    selected: 1,
    phase: "aim",
    shot: null,
    combo: 0,
    result: null,
    aperture: 0,
    events: [],
    lastShot: null,
    last: "벽 반사로 두 고리를 한 발에 켜세요 · 관측핵은 다음 발사까지 노출됩니다",
  });
  [
    [180, 650],
    [540, 320],
    [360, 500],
  ].forEach(([x, y], i) => Object.assign(g.heroes[i], { x, y }));
  g.latches = [
    { id: "dawn", name: "새벽 고리", x: 260, y: 320, r: 32, lit: false },
    { id: "dusk", name: "저녁 고리", x: 460, y: 320, r: 32, lit: false },
  ];
  g.foes = [
    { id: "core", x: 360, y: 160, r: 63, hp: 84, max: 84, timer: 2, period: 2 },
  ];
  return g;
}
