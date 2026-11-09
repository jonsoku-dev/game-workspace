import { createGame, stepGame } from './sim.mjs';
import { createRenderer } from './render.mjs';

const FPS = 60, DURATION = 7;
export function experimentInput(frame) {
  const t = frame / FPS;
  return {
    chain: (t >= .2 && t < .3) || (t >= .5 && t < 2.5),
    grind: (t >= 2.6 && t < 4.5) || (t >= 5.2 && t < 6),
    pointerX: t >= 5 ? 650 : 480,
  };
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function buildExperiment() {
  const game = createGame(), frames = [], births = [], events = [], seen = new WeakSet();
  frames.push(freeze({ game: structuredClone(game), input: {}, time: 0 }));
  for (let frame = 0; frame < FPS * DURATION; frame++) {
    const input = experimentInput(frame), time = (frame + 1) / FPS;
    stepGame(game, input, 1 / FPS);
    for (const particle of game.particles) {
      if (!seen.has(particle)) {
        seen.add(particle);
        if (particle.type === 'spark') births.push({ time, origin: { ...particle.origin }, fixedOrigin: { ...particle.fixedOrigin },
          distance: Math.hypot(particle.origin.x - particle.fixedOrigin.x, particle.origin.y - particle.fixedOrigin.y) });
      }
    }
    events.push(...game.events.map(event => ({ ...event, time })));
    frames.push(freeze({ game: structuredClone(game), input, time }));
  }
  const range = (source, axis) => births.length ? [Math.min(...births.map(p => p[source][axis])), Math.max(...births.map(p => p[source][axis]))] : null;
  const distances = births.map(p => p.distance);
  const metrics = { count: births.length, distanceMin: distances.length ? Math.min(...distances) : 0,
    distanceMax: distances.length ? Math.max(...distances) : 0,
    distanceMean: distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0,
    origin: { x: range('origin', 'x'), y: range('origin', 'y') }, fixedOrigin: { x: range('fixedOrigin', 'x'), y: range('fixedOrigin', 'y') } };
  const checks = {
    twoHooks: events.filter(event => event.type === 'hook').length === 2,
    reelCollision: events.some(event => event.type === 'collision'),
    armorCut: events.some(event => event.type === 'armor-break'),
    sparkBirths: births.length > 0 && metrics.distanceMin > 0,
    released: frames[288].game.tool.spin === 2 && !frames[288].game.contact.grinding,
    airSpin: frames[336].game.tool.spin === 22 && !frames[336].game.contact.grinding && !frames[336].game.particles.some(p => p.type === 'spark'),
  };
  return freeze({ frames, births, events, metrics, checks, success: Object.values(checks).every(Boolean), duration: DURATION, fps: FPS });
}

if (typeof document !== 'undefined') startLab();
async function startLab() {
  const $ = id => document.getElementById(id), experiment = buildExperiment();
  const root = $('lab'), timeline = $('timeline'), playButton = $('play');
  root.dataset.success = String(experiment.success);
  const canvases = [$('ab-fixed'), $('ab-contact')], renderers = canvases.map(createRenderer);
  const details = [$('detail-fixed'), $('detail-contact')];
  let cursor = 0, playing = false, speed = 1, previous = null;
  const f = n => n.toFixed(2), span = pair => pair ? `${f(pair[0])}–${f(pair[1])}` : '없음';
  const m = experiment.metrics;
  $('metrics').textContent = `전체 재생에서 실제 생성된 불꽃 ${m.count}개 · 발생점 거리 평균 ${f(m.distanceMean)}, 최소 ${f(m.distanceMin)}, 최대 ${f(m.distanceMax)} · B origin: x ${span(m.origin.x)}, y ${span(m.origin.y)} · A fixedOrigin: x ${span(m.fixedOrigin.x)}, y ${span(m.fixedOrigin.y)}`;
  function draw() {
    const frame = experiment.frames[Math.min(experiment.frames.length - 1, Math.round(cursor * FPS))];
    renderers.forEach((renderer, i) => {
      renderer.render({ ...frame.game, fixedFX: i === 0 }, 0, false);
      const ctx = details[i].getContext('2d');
      ctx.clearRect(0, 0, 480, 320);
      ctx.drawImage(canvases[i], 360, 220, 240, 160, 0, 0, 480, 320);
    });
    timeline.value = frame.time;
    $('time').textContent = `${f(frame.time)} / ${f(DURATION)}초`;
    const input = frame.input;
    const cue = frame.time >= 5.2 && frame.time < 6 ? 'K 공회전 · 접촉 없음' : input.grind ? 'K 유지 · 이음매 절삭' : input.chain ? 'J 입력 · 연결 / 회수' : frame.time >= 4.5 ? 'K 해제 · 잔여 불꽃 소멸' : '입력 대기';
    $('cue').textContent = `${cue} · 단계 ${frame.game.phase} · 현재 불꽃 ${frame.game.particles.filter(p => p.type === 'spark').length}개`;
    root.dataset.frame = String(Math.round(frame.time * FPS)); root.dataset.phase = frame.game.phase;
    root.dataset.time = String(frame.time); root.dataset.playing = String(playing);
    playButton.textContent = playing ? '일시정지' : cursor >= DURATION ? '다시 재생' : '재생';
    playButton.setAttribute('aria-pressed', String(playing));
    return frame;
  }
  function pause() { playing = false; previous = null; draw(); }
  function seek(seconds) {
    if (!Number.isFinite(seconds)) throw new TypeError('Time must be finite');
    cursor = Math.min(DURATION, Math.max(0, seconds)); previous = null;
    return draw();
  }
  function play() { if (cursor >= DURATION) cursor = 0; playing = true; previous = null; draw(); }
  function setSpeed(value) {
    if (![1, .25].includes(Number(value))) throw new RangeError('Speed must be 1 or .25');
    speed = Number(value); $('speed').value = String(speed); previous = null;
  }
  function animate(now) {
    if (playing && previous !== null) {
      cursor = Math.min(DURATION, cursor + Math.min(.1, (now - previous) / 1000) * speed);
      if (cursor >= DURATION) playing = false;
      draw();
    }
    previous = playing ? now : null;
    requestAnimationFrame(animate);
  }
  playButton.addEventListener('click', () => playing ? pause() : play());
  $('rewind').addEventListener('click', () => { pause(); seek(0); });
  timeline.addEventListener('input', () => { pause(); seek(Number(timeline.value)); });
  $('speed').addEventListener('change', () => setSpeed($('speed').value));
  const points = [['연결', .6], ['회수 충돌', 2.2], ['K 절삭', 3.3], ['절삭 완료', 4.4], ['K 해제', 4.8], ['공회전', 5.6]];
  for (const [label, time] of points) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = `${label} ${f(time)}s`;
    button.dataset.seek = String(time); button.addEventListener('click', () => { pause(); seek(time); }); $('events').append(button);
  }
  window.breakyardLab = { experiment, seek, play, pause, setSpeed,
    getState: () => ({ ready: root.dataset.ready === 'true', playing, speed, time: cursor, frame: Math.round(cursor * FPS),
      phase: experiment.frames[Math.round(cursor * FPS)].game.phase, metrics: experiment.metrics, success: experiment.success, checks: experiment.checks }) };
  draw();
  try {
    await Promise.all(['foundry', 'machine'].map(async name => {
      const image = new Image(); image.src = new URL(`./assets/${name}.webp`, import.meta.url).href; await image.decode();
    }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    draw(); root.dataset.ready = 'true';
    if (!experiment.success) $('cue').textContent = '입력 재생 검증 실패 · 실험 checks를 확인하세요.';
  } catch { root.dataset.ready = 'error'; $('cue').textContent = '배경 이미지 로드 실패 · 네트워크 상태를 확인하세요.'; }
  requestAnimationFrame(animate);
}
