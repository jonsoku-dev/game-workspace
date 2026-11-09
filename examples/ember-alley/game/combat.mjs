export const MOVES = [
  {
    name: "갈라치기",
    duration: 0.32,
    active: [0.105, 0.205],
    damage: 14,
    reach: 100,
    depth: 31,
    push: 18,
  },
  {
    name: "되베기",
    duration: 0.36,
    active: [0.12, 0.23],
    damage: 18,
    reach: 112,
    depth: 35,
    push: 20,
  },
  {
    name: "쇄철",
    duration: 0.48,
    active: [0.17, 0.3],
    damage: 27,
    reach: 131,
    depth: 41,
    push: 38,
  },
  {
    name: "잿불 승천",
    duration: 0.62,
    active: [0.19, 0.35],
    damage: 24,
    reach: 114,
    depth: 43,
    push: 10,
    launch: true,
  },
];
export const DODGE = {
  duration: 0.23,
  cooldown: 1.05,
  invulnerable: 0.18,
  perfect: 0.14,
};
export const COUNTER = { window: 1.35, damage: 18, stun: 0.65 };
export const windupDuration = (e) =>
  e.kind === "boss"
    ? 0.95
    : e.kind === "warden"
      ? 0.9
      : e.kind === "elite"
        ? 0.72
        : 0.66;
export const hurtRadius = (e) =>
  ["boss", "warden"].includes(e.kind) ? 40 : e.kind ? 22 : 14;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function inStrike(a, b, move) {
  const dx = (b.x - a.x) * a.face;
  return (
    dx >= -12 &&
    dx - hurtRadius(b) <= move.reach &&
    Math.abs(b.y - a.y) <= move.depth
  );
}
export function strikeContact(a, b, move) {
  return {
    x:
      a.x + a.face * clamp((b.x - a.x) * a.face - hurtRadius(b), 0, move.reach),
    y: b.y - (b.z || 0) - (["boss", "warden"].includes(b.kind) ? 94 : 58),
  };
}
function enemyConnects(e, p) {
  return e.pattern === "slam"
    ? Math.hypot((p.x - e.targetX) / 1.1, (p.y - e.targetY) * 1.5) < 92
    : e.pattern === "rush"
      ? Math.abs(p.x - e.x) < 70 && Math.abs(p.y - e.targetY) < 27
      : inStrike(e, p, { reach: 100, depth: 28 });
}
export const shieldClosed = (e) =>
  e.kind === "warden" && !e.dead && e.shieldBreak <= 0 && e.z <= 0;
export const VENT_LANES = [
  { top: 326, bottom: 366, name: "상단" },
  { top: 377, bottom: 417, name: "중단" },
  { top: 428, bottom: 468, name: "하단" },
];
export function ventState(g) {
  if (g.dungeon !== 1) return null;
  const cycle = Math.floor(g.stageTime / 3.6),
    age = g.stageTime - cycle * 3.6,
    lane = [0, 2, 1][cycle % 3];
  return {
    ...VENT_LANES[lane],
    cycle,
    lane,
    age,
    phase: age < 0.95 ? "warning" : age < 1.65 ? "active" : "cooling",
  };
}
export function createGame({ dungeon = 0, progress } = {}) {
  const game = {
    dungeon,
    stageTime: 0,
    ventAnnounced: -1,
    ventHitCycle: -1,
    phase: "ready",
    room: 0,
    wave: 0,
    time: 0,
    kills: 0,
    score: 0,
    combo: 0,
    comboTime: 0,
    best: 0,
    hitstop: 0,
    shake: 0,
    events: [],
    enemies: [],
    door: false,
    player: {
      x: 180,
      y: 388,
      hp: 120,
      maxHp: 120,
      face: 1,
      move: -1,
      age: 0,
      queue: false,
      chain: 0,
      chainWindow: 0,
      cd: 0,
      dash: 0,
      dashCd: 0,
      dodgeWindow: 0,
      dodgeOrigin: null,
      dodgeThreats: [],
      counterWindow: 0,
      counterAttack: false,
      invuln: 0,
      hurt: 0,
      walk: 0,
    },
    stats: {
      hits: 0,
      whiffs: 0,
      dashes: 0,
      evades: 0,
      perfectDodges: 0,
      counterHits: 0,
      launches: 0,
      juggles: 0,
      chains: 0,
      rooms: 0,
      blocks: 0,
      shieldBreaks: 0,
      ventHits: 0,
    },
  };
  if (progress) {
    for (const key of ["score", "kills", "best", "time"])
      game[key] = progress[key];
    game.stats = { ...progress.stats };
    game.player.hp = Math.min(120, progress.player.hp + 32);
  }
  return game;
}
export function spawnWave(g) {
  const groups =
    g.dungeon === 1
      ? [
          [
            ["warden", 490, 350],
            ["warden", 755, 432],
          ],
          [["warden", 560, 390]],
        ]
      : g.room === 0
        ? [
            [
              ["thug", 650, 354],
              ["thug", 780, 424],
            ],
            [
              ["thug", 645, 420],
              ["elite", 815, 358],
            ],
          ]
        : [
            [
              ["thug", 600, 350],
              ["thug", 800, 425],
            ],
            [["boss", 770, 390]],
          ];
  g.enemies = groups[g.wave].map(([kind, x, y], id) => ({
    id: `${g.dungeon}-${g.room}-${g.wave}-${id}`,
    kind,
    x,
    y,
    face: kind === "warden" && g.wave === 1 ? 1 : -1,
    hp:
      kind === "warden"
        ? g.wave === 1
          ? 160
          : 96
        : kind === "boss"
          ? 250
          : kind === "elite"
            ? 90
            : 55,
    maxHp:
      kind === "warden"
        ? g.wave === 1
          ? 160
          : 96
        : kind === "boss"
          ? 250
          : kind === "elite"
            ? 90
            : 55,
    shieldBreak: 0,
    blockFlash: 0,
    state: "approach",
    age: 0,
    cooldown: 0.7 + id * 0.45,
    hit: 0,
    knockback: 0,
    z: 0,
    vz: 0,
    stun: 0,
    attackNo: 0,
    dead: false,
  }));
  g.events.push({
    type: "wave",
    text:
      g.dungeon === 1
        ? g.wave === 0
          ? "방패의 뒤로 · 증기 예고를 읽으세요"
          : "승강장 수문장 · 정면 방패 주의"
        : g.room === 1 && g.wave === 1
          ? "쇠사슬 감독관"
          : "구역 봉쇄 · 적을 처치하세요",
  });
}
export function begin(g) {
  g.phase = "playing";
  spawnWave(g);
}
function event(g, type, text, x, y) {
  g.events.push({ type, text, x, y });
}
export function attack(g, special = false) {
  const p = g.player;
  if (g.phase !== "playing" || p.hurt > 0 || p.dash > 0) return false;
  if (p.move >= 0) {
    if (!special && p.move < 3 && p.age > 0.09) p.queue = true;
    return false;
  }
  if (special && p.cd > 0) return false;
  p.move = special ? 3 : p.chainWindow > 0 ? p.chain : 0;
  p.age = 0;
  p.queue = false;
  p.struck = [];
  p.counterAttack = !special && p.counterWindow > 0;
  if (p.counterAttack) p.counterWindow = 0;
  if (special) {
    p.cd = 3.8;
    g.stats.launches++;
  } else if (p.move === 2) g.stats.chains++;
  event(g, "attack", MOVES[p.move].name, p.x, p.y);
  return true;
}
export function dash(g, dx = 0, dy = 0) {
  const p = g.player;
  if (g.phase !== "playing" || p.dashCd > 0 || p.hurt > 0) return false;
  const len = Math.hypot(dx, dy) || 1;
  p.dashX = dx / len || (!dy ? p.face : 0);
  p.dashY = dy / len;
  p.dash = DODGE.duration;
  p.dashCd = DODGE.cooldown;
  p.invuln = Math.max(p.invuln, DODGE.invulnerable);
  p.dodgeWindow = DODGE.perfect;
  p.dodgeOrigin = { x: p.x, y: p.y };
  p.dodgeThreats = g.enemies
    .filter((e) => !e.dead && e.state === "windup")
    .map((e) => e.id);
  p.counterAttack = false;
  p.move = -1;
  p.queue = false;
  g.stats.dashes++;
  event(g, "dash", "", p.x, p.y);
  return true;
}
export function nextRoom(g) {
  if (g.phase !== "playing" || g.dungeon !== 0 || !g.door || g.player.x < 820)
    return false;
  g.room++;
  g.wave = 0;
  g.door = false;
  g.player.x = 130;
  g.player.y = 390;
  g.player.hp = Math.min(120, g.player.hp + 28);
  g.stats.rooms++;
  spawnWave(g);
  event(g, "room", "第 02 区 · 용광로", 480, 270);
  return true;
}
function hurtPlayer(g, e, damage) {
  const p = g.player;
  if (p.invuln > 0) {
    if (p.dash > 0) g.stats.evades++;
    return;
  }
  p.hp = Math.max(0, p.hp - damage);
  p.counterWindow = 0;
  p.counterAttack = false;
  p.hurt = 0.3;
  p.invuln = 0.85;
  p.move = -1;
  p.queue = false;
  p.x = clamp(p.x + e.face * 30, 60, 920);
  g.combo = 0;
  g.shake = 12;
  g.hitstop = 0.055;
  event(g, "hurt", `−${damage}`, p.x, p.y - 90);
  if (!p.hp) {
    g.phase = "dead";
    event(g, "lose", "잿불은 아직 꺼지지 않았다", 480, 260);
  }
}
function hitEnemy(g, e, m) {
  const p = g.player;
  const shield = shieldClosed(e),
    flank = (p.x - e.x) * e.face < -8;
  if (shield && !flank && !m.launch) {
    e.blockFlash = 0.2;
    g.stats.blocks++;
    g.hitstop = 0.025;
    const contact = strikeContact(p, e, m);
    event(g, "block", "방패 · 뒤쪽 / K", contact.x, contact.y);
    return;
  }
  if (shield) {
    e.shieldBreak = 2.6;
    g.stats.shieldBreaks++;
    g.score += 100;
    event(g, "break", "방패 개방!", e.x, e.y - 110);
  }
  const air = e.z > 8,
    counter = p.counterAttack,
    damage =
      m.damage +
      (air ? 9 : 0) +
      (counter ? COUNTER.damage : 0) +
      (shield && flank ? 6 : 0),
    contact = strikeContact(p, e, m);
  e.hp = Math.max(0, e.hp - damage);
  e.hit = 0.19;
  e.stun = counter
    ? COUNTER.stun
    : m.launch
      ? 0.75
      : e.kind === "warden"
        ? 0.36
        : e.kind === "boss"
          ? 0
          : 0.36;
  e.knockback =
    p.face * m.push * (["boss", "warden"].includes(e.kind) ? 0.3 : 1) * 12;
  if (e.kind !== "warden" && (e.kind !== "boss" || m.launch)) e.face = -p.face;
  if (m.launch) {
    e.vz = 340;
    e.z = Math.max(e.z, 3);
  } else if (air) {
    e.vz = ["boss", "warden"].includes(e.kind) ? Math.min(e.vz, 0) : 220;
    g.stats.juggles++;
  }
  if (e.kind !== "boss" || m.launch || air || counter) {
    e.state = "stunned";
    e.age = 0;
  }
  g.combo++;
  g.comboTime = 2.3;
  g.best = Math.max(g.best, g.combo);
  g.stats.hits++;
  if (counter) g.stats.counterHits++;
  g.score += damage * 10 + g.combo * 25;
  g.shake = counter || m.launch || p.move === 2 ? 9 : 4;
  g.hitstop = counter ? 0.075 : p.move === 2 ? 0.07 : 0.045;
  event(
    g,
    counter ? "counter" : air ? "juggle" : "hit",
    `${damage}${counter ? " 반격" : air ? " 공중" : ""}`,
    contact.x,
    contact.y,
  );
  if (e.hp === 0) {
    e.dead = true;
    e.state = "dead";
    e.age = 0;
    g.kills++;
    g.score += e.kind === "boss" ? 2000 : 300;
    event(g, "kill", "", e.x, e.y);
  }
}
export function tick(g, dt, input = {}) {
  if (g.phase !== "playing") return;
  dt = Math.min(dt, 0.035);
  if (g.hitstop > 0) {
    g.hitstop = Math.max(0, g.hitstop - dt);
    return;
  }
  g.time += dt;
  g.stageTime += dt;
  g.shake = Math.max(0, g.shake - dt * 38);
  const p = g.player;
  for (const k of [
    "cd",
    "dashCd",
    "invuln",
    "hurt",
    "chainWindow",
    "dodgeWindow",
    "counterWindow",
  ])
    p[k] = Math.max(0, p[k] - dt);
  g.comboTime -= dt;
  if (g.comboTime <= 0) g.combo = 0;
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0),
    dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (p.dash > 0) {
    p.dash = Math.max(0, p.dash - dt);
    p.x += p.dashX * 650 * dt;
    p.y += p.dashY * 480 * dt;
  } else if (p.move >= 0) {
    const m = MOVES[p.move],
      before = p.age;
    p.age += dt;
    if (p.age >= m.active[0] && before < m.active[1])
      for (const e of g.enemies) {
        if (!e.dead && !p.struck.includes(e.id) && inStrike(p, e, m)) {
          p.struck.push(e.id);
          hitEnemy(g, e, m);
        }
      }
    if (p.age >= m.duration) {
      const queued = p.queue,
        previous = p.move;
      p.chain = previous < 2 ? previous + 1 : 0;
      p.chainWindow = 0.24;
      p.move = -1;
      p.queue = false;
      if (!p.struck.length) g.stats.whiffs++;
      if (queued) attack(g);
    }
  } else if (p.hurt <= 0) {
    const len = Math.hypot(dx, dy) || 1;
    p.x += (dx / len) * 222 * dt;
    p.y += (dy / len) * 158 * dt;
    if (dx) p.face = dx;
    p.walk += (Math.abs(dx) + Math.abs(dy)) * dt;
  }
  p.x = clamp(p.x, 55, 935);
  p.y = clamp(p.y, 318, 465);
  for (const e of g.enemies) {
    e.age += dt;
    if (e.knockback) {
      e.x = clamp(e.x + e.knockback * dt, 45, 930);
      e.knockback *= Math.exp(-12 * dt);
      if (Math.abs(e.knockback) < 0.5) e.knockback = 0;
    }
    e.hit = Math.max(0, e.hit - dt);
    e.shieldBreak = Math.max(0, (e.shieldBreak || 0) - dt);
    e.blockFlash = Math.max(0, (e.blockFlash || 0) - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.z > 0 || e.vz > 0) {
      e.z = Math.max(0, e.z + e.vz * dt);
      e.vz -= 720 * dt;
      if (e.z === 0) e.vz = 0;
    }
    if (e.dead) continue;
    if (e.stun > 0 || e.z > 0) continue;
    if (e.state === "stunned") {
      e.state = "approach";
      e.cooldown = 0.35;
      e.age = 0;
    }
    if (e.state === "approach") {
      const ex = p.x - e.x,
        ey = p.y - e.y;
      if (e.kind !== "warden") e.face = ex >= 0 ? 1 : -1;
      const speed = e.kind === "boss" ? 72 : e.kind === "elite" ? 104 : 89;
      if (e.kind !== "warden") {
        if (Math.abs(ex) > 67) e.x += Math.sign(ex) * speed * dt;
        if (Math.abs(ey) > 8) e.y += Math.sign(ey) * speed * 0.66 * dt;
      }
      if (
        e.cooldown <= 0 &&
        Math.abs(ex) <
          (e.kind === "warden" ? 190 : e.kind === "boss" ? 235 : 105) &&
        Math.abs(ey) < 48
      ) {
        e.state = "windup";
        e.age = 0;
        e.targetX = p.x;
        e.attackNo++;
        e.pattern =
          e.kind === "warden"
            ? "slam"
            : e.kind === "boss"
              ? e.attackNo % 2
                ? "rush"
                : "slam"
              : "punch";
        e.targetY = e.pattern === "slam" ? p.y : e.y;
        event(
          g,
          "warn",
          e.pattern === "rush"
            ? "쇄도! 깊이축으로 피하세요"
            : e.pattern === "slam"
              ? "분쇄! 원 밖으로 회피"
              : "",
          e.x,
          e.y,
        );
      }
    } else if (e.state === "windup") {
      const windup = windupDuration(e);
      if (e.age >= windup) {
        e.state = "strike";
        e.age = 0;
        e.hasHit = false;
        e.startX = e.x;
      }
    } else if (e.state === "strike") {
      if (e.pattern === "rush") e.x = clamp(e.x + e.face * 680 * dt, 55, 925);
      if (!e.hasHit) {
        const perfect =
          p.dodgeWindow > 0 &&
          p.dodgeThreats.includes(e.id) &&
          enemyConnects(e, p.dodgeOrigin);
        if (perfect) {
          p.dodgeWindow = 0;
          p.counterWindow = COUNTER.window;
          g.stats.perfectDodges++;
          g.stats.evades++;
          e.hasHit = true;
          event(g, "perfect", "간파 · J 반격 준비", p.x, p.y - 100);
        }
        const connects = !e.hasHit && enemyConnects(e, p);
        if (connects) {
          e.hasHit = true;
          hurtPlayer(
            g,
            e,
            e.kind === "boss"
              ? 27
              : e.kind === "warden"
                ? 20
                : e.kind === "elite"
                  ? 18
                  : 12,
          );
        }
      }
      if (e.age > (e.pattern === "rush" ? 0.48 : 0.22)) {
        e.state = "recover";
        e.age = 0;
      }
    } else if (
      e.state === "recover" &&
      e.age > (e.kind === "boss" ? 0.95 : 0.65)
    ) {
      e.state = "approach";
      e.age = 0;
      e.cooldown = 0.5;
    }
  }
  const vent = ventState(g);
  if (vent) {
    if (g.ventAnnounced !== vent.cycle) {
      g.ventAnnounced = vent.cycle;
      event(
        g,
        "ventwarn",
        `${vent.name} 증기 예고 · 표시된 깊이에서 벗어나세요`,
        480,
        300,
      );
    }
    if (
      vent.phase === "active" &&
      p.x >= 140 &&
      p.x <= 900 &&
      p.y >= vent.top &&
      p.y <= vent.bottom &&
      g.ventHitCycle !== vent.cycle &&
      p.invuln <= 0
    ) {
      g.ventHitCycle = vent.cycle;
      g.stats.ventHits++;
      hurtPlayer(g, { face: 0 }, 16);
    }
  }
  if (g.phase !== "playing") return;
  if (
    g.enemies.length &&
    g.enemies.every((e) => e.dead) &&
    g.enemies.every((e) => e.age > 0.7)
  ) {
    if (g.wave === 0) {
      g.wave = 1;
      spawnWave(g);
    } else if (g.dungeon === 0 && g.room === 0) {
      if (!g.door) {
        g.door = true;
        event(g, "door", "봉쇄 해제 · 오른쪽 문으로 이동", 840, 310);
      }
    } else {
      g.phase = "clear";
      event(
        g,
        "win",
        g.dungeon === 1 ? "승강장이 열린다" : "골목에 다시 새벽이 온다",
        480,
        250,
      );
    }
  }
}
