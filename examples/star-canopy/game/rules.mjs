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
export function landing(previousY, y, x, drop) {
  return drop
    ? undefined
    : platforms
        .filter(
          (p) =>
            x + 19 > p.x && x - 19 < p.x + p.w && previousY <= p.y && y >= p.y,
        )
        .sort((a, b) => a.y - b.y)[0];
}

export const windBloom = { id: "bloom", x: 2390, y: 525, radius: 28 };
export function createSpell(x, y, dir, unlocked) {
  return unlocked ? { x, y, dir, age: 0, phase: "cast", life: 1.08 } : null;
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
