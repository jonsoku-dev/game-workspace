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
