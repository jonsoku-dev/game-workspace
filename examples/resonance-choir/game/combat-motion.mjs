import manifest from './motion/manifest.mjs';

const sheets = new Map();
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
export const motionReady = Promise.all(Object.entries(manifest).map(([kind, actor]) => {
  const image = new Image();
  const entry = { image, loaded: false };
  sheets.set(kind, entry);
  return new Promise((resolve, reject) => {
    image.onload = () => {
      if (!actor.frames.length || actor.frames.some(f => f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0 || f.x + f.w > image.naturalWidth || f.y + f.h > image.naturalHeight || f.ms <= 0)) {
        reject(new Error(`Invalid motion atlas bounds: ${kind}`));
        return;
      }
      entry.loaded = true;
      resolve();
    };
    image.onerror = () => reject(new Error(`Motion atlas failed to load: ${kind}`));
    image.src = new URL(`./motion/${actor.image}`, import.meta.url).href;
  });
}));
motionReady.catch(() => {});

export function drawActor(ctx, { kind, x, groundY, height, face = 1, pose = 'idle', progress = 0, time = 0 }) {
  const actor = manifest[kind];
  const entry = sheets.get(kind);
  if (!actor || !entry?.loaded || !Number.isFinite(height) || height <= 0) return false;
  const alias = pose === 'walk' || pose === 'run' ? 'move' : pose === 'jump' ? 'evade' : 'idle';
  const sequence = actor.actions[pose] ?? actor.actions[alias] ?? actor.actions.idle;
  const total = sequence.reduce((sum, index) => sum + actor.frames[index].ms, 0);
  const looping = ['idle', 'move', 'walk', 'run'].includes(pose);
  let remaining = looping ? ((Math.max(0, time) * 1000) % total) : clamp(progress) * total;
  let index = sequence.at(-1);
  for (const candidate of sequence) {
    if (remaining < actor.frames[candidate].ms) { index = candidate; break; }
    remaining -= actor.frames[candidate].ms;
  }
  const frame = actor.frames[index];
  const scale = height / actor.bodyHeight;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(face < 0 ? -scale : scale, scale);
  ctx.drawImage(entry.image, frame.x, frame.y, frame.w, frame.h,
    -actor.pivot[0], -actor.pivot[1], frame.w, frame.h);
  ctx.restore();
  return true;
}
