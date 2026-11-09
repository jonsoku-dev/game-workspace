export const W = 420,
  H = 510,
  R = 27,
  LINK = R * 2.65,
  COUNT = 64;
export function seeded(seed = 81273) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function extend(chain, token, tokens) {
  if (!token) return chain;
  if (chain.length > 1 && chain.at(-2) === token.id) return chain.slice(0, -1);
  if (chain.includes(token.id)) return chain;
  const last = tokens.find((t) => t.id === chain.at(-1));
  if (
    last &&
    (last.kind !== token.kind ||
      Math.hypot(last.x - token.x, last.y - token.y) > LINK)
  )
    return chain;
  return [...chain, token.id];
}
export function points(n, fever = false) {
  return n < 3 ? 0 : n * n * 25 * (fever ? 2 : 1);
}
export function findMove(tokens) {
  for (const a of tokens)
    for (const b of tokens) {
      if (
        a === b ||
        a.kind !== b.kind ||
        Math.hypot(a.x - b.x, a.y - b.y) > LINK
      )
        continue;
      const c = tokens.find(
        (c) =>
          c !== a &&
          c !== b &&
          c.kind === a.kind &&
          Math.hypot(b.x - c.x, b.y - c.y) <= LINK,
      );
      if (c) return [a.id, b.id, c.id];
    }
  return [];
}
export function step(tokens, dt) {
  for (const t of tokens) {
    t.vy += 750 * dt;
    t.vx *= 0.997;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    if (t.x < R) {
      t.x = R;
      t.vx = Math.abs(t.vx) * 0.35;
    }
    if (t.x > W - R) {
      t.x = W - R;
      t.vx = -Math.abs(t.vx) * 0.35;
    }
    if (t.y > H - R) {
      t.y = H - R;
      t.vy = -Math.abs(t.vy) * 0.22;
    }
  }
  for (let pass = 0; pass < 4; pass++)
    for (let i = 0; i < tokens.length; i++)
      for (let j = i + 1; j < tokens.length; j++) {
        const a = tokens[i],
          b = tokens[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          d = Math.hypot(dx, dy);
        if (d >= R * 2 || !d) continue;
        const nx = dx / d,
          ny = dy / d,
          push = (R * 2 - d) * 0.5;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const v = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (v < 0) {
          a.vx += v * nx * 0.55;
          a.vy += v * ny * 0.55;
          b.vx -= v * nx * 0.55;
          b.vy -= v * ny * 0.55;
        }
      }
  for (const t of tokens) {
    t.x = Math.max(R, Math.min(W - R, t.x));
    t.y = Math.min(H - R, t.y);
  }
}
export const RESCUE_GOAL = 60;
export function seamFrom(chain, tokens, id) {
  if (chain.length < 7) return null;
  const end = tokens.find((token) => token.id === chain.at(-1));
  return end ? { id, x: end.x, y: end.y } : null;
}
export function burstIds(tokens, seam) {
  return tokens
    .filter(
      (token) =>
        token.y >= 0 &&
        token.y <= H &&
        Math.hypot(token.x - seam.x, token.y - seam.y) <= R * 3.6,
    )
    .map((token) => token.id);
}
export function takeSeam(seams, id) {
  const seam = seams.find((item) => item.id === id);
  return seam
    ? { seam, remaining: seams.filter((item) => item.id !== id) }
    : null;
}
export function stitchedBadges(rescued) {
  return Math.min(3, Math.floor(rescued / 20));
}
export const MEND_SITES = [
  { id: "left", title: "왼쪽 터진 솔기", x: 96, y: 330 },
  { id: "right", title: "오른쪽 터진 솔기", x: 324, y: 330 },
];
export function mendHits(sites, seam) {
  return sites
    .filter(
      (site) =>
        !site.mended && Math.hypot(site.x - seam.x, site.y - seam.y) <= R * 3.6,
    )
    .map((site) => site.id);
}
export function stageWon(index, rescued, sites) {
  return index === 0
    ? rescued >= RESCUE_GOAL
    : sites.length > 0 && sites.every((site) => site.mended);
}
export function openingKind(index, row, column, rolled) {
  if (index === 1) {
    if (((row === 3 || row === 4) && column < 3) || (row === 2 && column === 0))
      return 1;
    if (((row === 3 || row === 4) && column > 3) || (row === 2 && column === 6))
      return 2;
  } else if ((row === 6 && column < 5) || (row === 7 && column < 2)) return 0;
  return rolled;
}
export function findChain(tokens, minimum, site = null, sameKind = true) {
  const visible = tokens.filter((token) => token.y >= 0 && token.y <= H);
  function walk(path) {
    if (path.length === minimum)
      return [...path].reverse().map((token) => token.id);
    const last = path.at(-1);
    for (const token of visible) {
      if (
        path.includes(token) ||
        (sameKind && token.kind !== last.kind) ||
        Math.hypot(token.x - last.x, token.y - last.y) > LINK
      )
        continue;
      const found = walk([...path, token]);
      if (found) return found;
    }
    return null;
  }
  for (const end of visible) {
    if (site && Math.hypot(end.x - site.x, end.y - site.y) > R * 3.6) continue;
    const found = walk([end]);
    if (found) return found;
  }
  return [];
}
export function mendPlan(tokens, sites) {
  const site = sites.find((site) => !site.mended);
  if (!site || findChain(tokens, 7, site).length) return null;
  const ids = findChain(tokens, 7, site, false);
  return ids.length
    ? { ids, kind: tokens.find((token) => token.id === ids.at(-1)).kind }
    : null;
}
