import { createContactTracker } from './contact.mjs';

export const WIDTH = 960, HEIGHT = 540;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const trackers = new WeakMap();
const hints = {
  chain: 'J 두 번 · 두 회수기에 사슬 걸기', reel: 'J 누르기 · 사슬을 감아 두 장갑을 충돌시키세요',
  grind: '이음매에 톱을 대고 K 유지 · 장갑 절삭', pulse: '밝은 박자에 K를 짧게 세 번 · 절삭 펄스 저장',
  core: '3펄스 충전 완료 · 밝은 박자에 L / Space 한 번 · 중량 타격', 'round-clear': '회수 완료 · 다음 작업 준비',
  won: '두 구역 해체 완료', lost: '장비 정지 · 다시 시도하세요',
};
function rhythm(round) {
  return { clock: 0, next: .9, interval: round === 1 ? 1.2 : 1.05, window: round === 1 ? .23 : .19,
    progress: 0, inWindow: false, hits: 0, needed: 3, flash: 0, pulses: [] };
}
function setupRound(s, round) {
  Object.assign(s, { round, phase: 'chain', phaseTime: 0, separation: round === 1 ? 440 : 500,
    center: 480, pulses: 0, coreHits: 0, grindProgress: 0, guardClosed: false, lock: 0,
    machines: ['left', 'right'].map((id, i) => ({ id, x: 480 + (i ? 1 : -1) * (round === 1 ? 220 : 250),
      y: 405, width: 112, height: 120, facing: i ? -1 : 1, armor: 1, core: 1, stagger: 0, eye: { x: 0, y: 303 } })),
    chain: { anchors: [], attached: false, tension: 0, length: 0 },
    seam: { x: 480, y: 314, a: { x: 480, y: 285 }, b: { x: 480, y: 350 }, exposed: false, progress: 0 },
    shockwave: null,
    contact: { phase: 'none', grinding: false, contactPatch: null }, rhythm: rhythm(round), message: hints.chain });
  s.particles=[]; s.debris=[]; s.cuts=[]; s.shockwave=null;
  trackers.set(s, createContactTracker());
}
export function createGame() {
  const s = { width: WIDTH, height: HEIGHT, time: 0, health: 100, heat: 0, shake: 0, hitstop: 0,
    tool: { x: 480, y: 314, radius: 32, angle: 0, spin: 0, angularVelocity: 0,
      velocity: { x: 0, y: 0 }, pivot: { x: 480, y: 105 }, elbow: { x: 480, y: 210 } },
    particles: [], debris: [], cuts: [], events: [], _held: {}, _serial: 0 };
  setupRound(s, 1);
  return s;
}
function event(s, type, value = 0, point = s.seam) {
  s.events.push({ type, value, x: point.x, y: point.y });
}
function phase(s, name) {
  s.phase = name; s.phaseTime = 0; s.message = hints[name];
  if (name === 'pulse' || name === 'core') s.rhythm = rhythm(s.round);
  if (name === 'core') s.rhythm.needed = 1;
  event(s, name);
}
function burst(s, type, point, count = 10) {
  for (let i = 0; i < count; i++) {
    const seed = s._serial++ * 2.399963;
    const n = s.contact.normal ?? { x: -1, y: 0 };
    const tangent = Math.atan2(s.seam.b.y-s.seam.a.y,s.seam.b.x-s.seam.a.x) + ((s.contact.slip ?? 1) < 0 ? Math.PI : 0);
    const a = type === 'spark' ? tangent + Math.sin(seed) * .55 : seed, speed = type === 'chip' ? 65 + i * 5 : 100 + i * 9;
    s.particles.push({ x: point.x, y: point.y, vx: Math.cos(a) * speed + n.x*speed*.30 + (s.machines[0].vx ?? 0), vy: -20 + Math.sin(a) * speed + n.y*speed*.30,material:s.contact.material??'armor',
      origin: { x: point.x, y: point.y }, fixedOrigin: { x: s.machines[0].x, y: 345 },
      life: .3 + (i % 4) * .08, maxLife: .54, size: type === 'chip' ? 4 : 2, type, angle: a });
  }
}
function penalty(s, heat, damage = 0) {
  s.heat += heat; s.health -= damage; s.lock = .28; s.rhythm.flash = -.5;
  event(s, 'miss');
}
function tick(s, input, edges, dt) {
  if (s.hitstop > 0) { s.hitstop = Math.max(0, s.hitstop - dt); return; }
  s.time += dt; s.phaseTime += dt; s.lock = Math.max(0, s.lock - dt); s.shake = Math.max(0, s.shake - dt * 3);
  const active = !['won', 'lost', 'round-clear'].includes(s.phase);
  const oldCenter = s.center;
  if (s.shockwave) { s.shockwave.age += dt; if (s.shockwave.age > s.shockwave.life) s.shockwave = null; }
  if (s.phase === 'round-clear') {
    s.separation = Math.min(340, s.separation + dt * 230);
    if (s.phaseTime > .65) s.chain.anchors = [];
  }
  s.center = 480 + (s.round === 2 ? Math.sin(s.time * 1.1) * 55 : 0);
  s.guardClosed = s.round === 2 && ['grind', 'pulse'].includes(s.phase) && s.time % 3.8 > 2.65;
  if (s.phase === 'reel' && input.chain) {
    s.separation = Math.max(112, s.separation - dt * 200);
    s.chain.tension = Math.min(1, s.chain.tension + dt * 2);
    if (s.separation <= 112) {
      s.seam.exposed = true; s.shake = 1; s.hitstop = .08;
      s.machines.forEach(m => m.stagger = 1);
      burst(s, 'chip', s.seam, 16); event(s, 'collision'); phase(s, 'grind');
    }
  } else s.chain.tension = Math.max(0, s.chain.tension - dt);
  s.machines.forEach((m, i) => {
    m.x = s.center + (i ? 1 : -1) * s.separation / 2;
    m.vx = (s.center - oldCenter) / dt;
    m.eye.x = m.x; m.stagger = Math.max(0, m.stagger - dt * 2);
  });
  s.seam.x = s.center; s.seam.a.x = s.center; s.seam.b.x = s.center;
  s.chain.length = s.separation;
  const oldX = s.tool.x, oldY = s.tool.y;
  let aim = Number.isFinite(input.pointerX) ? input.pointerX : oldX + clamp(Number(input.move) || 0, -1, 1) * dt * 390;
  // shortcut: a small magnetic guide makes one-axis touch aiming usable; remove when two-axis crane controls exist.
  if (s.round === 1 && input.grind && s.seam.exposed && Math.abs(aim - s.seam.x) < 65) aim = s.seam.x - 29;
  s.tool.x = clamp(aim, 100, 860);
  const feedY = s.phase === 'grind' ? 290 + s.grindProgress * 54 : 314;
  s.tool.y += clamp(feedY - s.tool.y, -dt * 100, dt * 100);
  s.tool.velocity.y = (s.tool.y - oldY) / dt;
  s.tool.velocity.x = (s.tool.x - oldX) / dt;
  s.tool.spin = input.grind && active ? 22 : 2;
  s.tool.angularVelocity = s.tool.spin; s.tool.angle += s.tool.spin * dt;
  s.tool.elbow.x = (480 + s.tool.x) / 2; s.tool.elbow.y = (105 + s.tool.y) / 2 - Math.abs(s.tool.x - 480) * .1;
  const surface = { a: s.seam.a, b: s.seam.b,
    material: s.guardClosed ? 'guard' : s.machines[0].armor > 0 ? 'armor' : 'core', velocity: { x: (s.center - oldCenter) / dt, y: 0 } };
  const tracker = trackers.get(s);
  const result = tracker.update('disc', 'seam', s.tool, surface);
  const touching = s.seam.exposed && (result.phase === 'enter' || result.phase === 'stay');
  s.contact = { ...result, phase: s.seam.exposed ? result.phase : 'none', material: touching ? surface.material : null,
    grinding: touching && !!input.grind && active, contactPatch: touching ? {
      point: { ...result.point }, normal: { ...result.normal }, depth: result.depth, width: 8 + result.depth * 2 } : null };
  if (touching && input.grind && active) {
    s.heat += dt * (s.guardClosed ? 32 : 9);
    if (Math.floor(s.time * 30) !== Math.floor((s.time - dt) * 30)) burst(s, 'spark', result.point, 2);
    if (s.phase === 'grind' && !s.guardClosed) {
      const previous=s.grindProgress;
      s.grindProgress = Math.min(1, previous + dt / 1.6);
      if(Math.floor(previous*12)!==Math.floor(s.grindProgress*12)){
        s.cuts.push({target:'seam',x:result.point.x,y:result.point.y,localX:0,localY:result.point.y-s.seam.y,
          length:7,angle:Math.PI/2,life:Infinity});
      }
      s.seam.progress = s.grindProgress;
      s.machines.forEach(m => m.armor = 1 - s.grindProgress);
      if (s.grindProgress >= 1) {
        for (const side of [-1, 1]) s.debris.push({ x: s.seam.x + side * 14, y: 314, vx: side * 85 + s.machines[0].vx, vy: -60, angle: side * .3, side, life: 2 });
        burst(s, 'chip', result.point, 16); event(s, 'armor-break'); phase(s, 'pulse');
      }
    }
  } else s.heat = Math.max(0, s.heat - dt * 17);
  if (edges.chain && active && ['chain', 'reel'].includes(s.phase)) {
    const candidate = s.machines.filter(m => !s.chain.anchors.includes(m.id)).sort((a, b) => Math.abs(a.x - s.tool.x) - Math.abs(b.x - s.tool.x))[0];
    if (candidate) {
      s.chain.anchors.push(candidate.id); event(s, 'hook', 0, candidate.eye);
      if (s.chain.anchors.length === 2) { s.chain.attached = true; phase(s, 'reel'); }
      else s.message = '사슬 하나 연결 · J를 놓았다가 다시 눌러 두 번째 연결';
    }
  }
  if (edges.impact && active && s.phase !== 'core') { penalty(s, 8, 1); s.message = '미충전 타격 · 먼저 K 박자로 3펄스를 저장하세요'; }
  if (['pulse', 'core'].includes(s.phase)) {
    const r = s.rhythm; r.clock += dt;
    r.progress = clamp((r.clock - (r.next - r.interval)) / r.interval, 0, 1);
    r.inWindow = Math.abs(r.clock - r.next) <= r.window;
    const press = s.phase === 'pulse' ? edges.grind : edges.impact;
    if (press && s.lock > 0) { s.heat += 4; event(s, 'miss'); }
    if (press && s.lock <= 0) {
      if (r.inWindow && touching && !s.guardClosed) {
        r.hits++; r.flash = 1; r.next += r.interval;
        const kind = s.phase === 'pulse' ? 'pulse' : 'impact';
        if (kind === 'pulse') s.pulses++;
        else { s.coreHits++; s.machines.forEach(m => { m.core = 0; m.recoil = m.facing * -1; }); s.shake = 1; s.hitstop = .13;
          s.shockwave = { x: result.point.x, y: result.point.y, age: 0, life: .55, strength: 1 };
          for (const side of [-1, 1]) for (let i = 0; i < 2; i++) s.debris.push({
            x: result.point.x, y: result.point.y, origin: { ...result.point },
            vx: side * (130 + i * 55) + s.machines[0].vx, vy: -150 + i * 80,
            angle: side * .4, side, life: 2.5 });
          burst(s, 'chip', result.point, 26); event(s, 'core-shatter', s.pulses, result.point); }
        r.pulses.push({ x: result.point.x, y: result.point.y, age: 0, life: kind === 'impact' ? .65 : .45, strength: kind === 'impact' ? 3 : 1, type: kind });
        burst(s, 'spark', result.point, kind === 'impact' ? 14 : 7); event(s, kind, r.hits, result.point);
        s.cuts.push({ x: result.point.x, y: result.point.y, target: 'seam', localX: result.point.x - s.seam.x, localY: result.point.y - s.seam.y, length: 13 + r.hits * 6, angle: -.6, life: Infinity });
        if (r.hits === r.needed) {
          if (kind === 'pulse') phase(s, 'core');
          else { phase(s, 'round-clear'); s.chain.attached = false; s.machines.forEach(m => m.stagger = 1); s.heat = Math.max(0, s.heat - 25); }
        }
      } else penalty(s, 8, 1);
    }
    if (r.clock > r.next + r.window) { r.next += r.interval; penalty(s, 3); }
    r.flash *= Math.max(0, 1 - dt * 5);
  }
  if (active) {
    s.health -= dt * (s.round === 1 ? .42 : .65);
    if (s.heat >= 100) { s.heat = 65; s.health -= 23; s.shake = .7; event(s, 'overheat'); }
    s.heat = clamp(s.heat, 0, 100); s.health = clamp(s.health, 0, 100);
    if (s.health <= 0) phase(s, 'lost');
  }
  if (s.phase === 'round-clear' && s.phaseTime > 1.8) {
    if (s.round === 2) phase(s, 'won'); else { setupRound(s, 2); event(s, 'round-start'); }
  }
  for (const p of s.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 310 * dt; }
  s.particles = s.particles.filter(p => p.life > 0);
  for (const d of s.debris) { d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 190 * dt; d.angle += d.side * dt; }
  s.debris = s.debris.filter(d => d.life > 0);
  s.cuts.forEach(c => c.life -= dt); s.cuts = s.cuts.filter(c => c.life > 0);
  s.rhythm.pulses.forEach(p => p.age += dt); s.rhythm.pulses = s.rhythm.pulses.filter(p => p.age < p.life);
}
export function stepGame(s, input = {}, dt = 1 / 60) {
  if (!Number.isFinite(dt) || dt < 0) throw new TypeError('dt must be finite and nonnegative');
  const edges = {};
  for (const key of ['chain', 'grind', 'impact', 'retry']) { edges[key] = !!input[key] && !s._held[key]; s._held[key] = !!input[key]; }
  s.events = [];
  if (edges.retry) {
    const held = { ...s._held };
    Object.assign(s, createGame()); s._held = held; trackers.set(s, createContactTracker()); return s;
  }
  if (dt === 0) return s;
  const duration = Math.min(dt, .25), steps = Math.ceil(duration * 60), step = duration / steps;
  for (let i = 0; i < steps; i++) tick(s, input, i === 0 ? edges : {}, step);
  return s;
}
