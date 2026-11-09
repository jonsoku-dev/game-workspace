export const platforms = [
  { x: 0, y: 575, w: 2800 },
  { x: 460, y: 450, w: 300 },
  { x: 860, y: 340, w: 270 },
  { x: 1220, y: 445, w: 330 },
  { x: 1650, y: 330, w: 330 },
  { x: 2060, y: 440, w: 270 },
];
export function progression(kills) {
  return {
    xp: kills * 35,
    level: kills >= 2 ? 2 : 1,
    leaves: Math.min(kills, 3),
    spell: kills >= 2,
  };
}
export function portalOpen(kills, charged) {
  return progression(kills).leaves === 3 && charged;
}
export function landing(previousY, y, x, drop, surfaces = platforms) {
  return drop
    ? undefined
    : surfaces
        .filter(
          (p) =>
            x + 19 > p.x && x - 19 < p.x + p.w && previousY <= p.y && y >= p.y,
        )
        .sort((a, b) => a.y - b.y)[0];
}

export const windBloom = { id: "bloom", x: 2390, y: 525, radius: 28 };
export function createSpell(x, y, dir, unlocked) {
  return unlocked
    ? { x, originX: x, y, dir, age: 0, phase: "cast", life: 1.08 }
    : null;
}
export function advanceSpell(spell, dt, targets) {
  const age = spell.age + dt;
  const travel = Math.max(0, age - 0.18) - Math.max(0, spell.age - 0.18);
  const x = spell.x + spell.dir * 620 * travel;
  const hit =
    travel > 0
      ? targets
          .filter(
            (target) =>
              Math.abs(target.y - spell.y) <= (target.radius ?? 28) &&
              Math.max(spell.x, x) >= target.x - (target.radius ?? 28) &&
              Math.min(spell.x, x) <= target.x + (target.radius ?? 28),
          )
          .sort((a, b) => (a.x - b.x) * spell.dir)[0]
      : undefined;
  return {
    ...spell,
    x,
    age,
    phase: age < 0.18 ? "cast" : "travel",
    life: spell.life - dt,
    hit: hit?.id,
  };
}

export const moonPlatforms = [
  { x: 0, y: 575, w: 2800 },
  { x: 420, y: 450, w: 300 },
  { x: 900, y: 330, w: 300 },
  { x: 1320, y: 440, w: 330 },
  { x: 1760, y: 350, w: 300 },
  { x: 2140, y: 440, w: 260 },
];
export const moonBeacons = [
  { id: "beacon-1", x: 660, y: 400, radius: 24, direction: 1 },
  { id: "beacon-2", x: 950, y: 280, radius: 24, direction: -1 },
];
export function beaconWindow(time) {
  return time % 4 < 2.2;
}
export function beaconResponse(lit, hit, direction, time) {
  const expected = moonBeacons[lit];
  if (!expected || hit !== expected.id) return { lit, reason: "order" };
  if (direction !== expected.direction) return { lit, reason: "direction" };
  if (lit === 1 && !beaconWindow(time)) return { lit, reason: "pulse" };
  return { lit: lit + 1, reason: "lit" };
}
export function stageBaseline(index, earnedKills = 0) {
  return { hp: 100, kills: index === 0 ? 0 : Math.max(2, earnedKills) };
}

export function missedHeight(spell, target) {
  return Boolean(
    target &&
      Math.abs(spell.y - target.y) > (target.radius ?? 28) &&
      Math.min(spell.originX, spell.x) <= target.x &&
      Math.max(spell.originX, spell.x) >= target.x,
  );
}
