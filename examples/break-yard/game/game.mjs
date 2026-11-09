import { createGame, stepGame } from './sim.mjs';
import { createRenderer } from './render.mjs';
import { createFeedback } from './feedback.mjs';
import { createSawSound } from './saw-sound.mjs';

const $ = id => document.getElementById(id);
const host = $('game'), canvas = $('stage'), renderer = createRenderer(canvas);
const feedback = createFeedback({ sound: false });
const sawSound = createSawSound();
const keys = new Set(), pointers = new Map(), stagePointers = new Map(), activations = new Set();
const inputButtons = [...document.querySelectorAll('[data-input]')];
const phaseSteps = [...document.querySelectorAll('[data-step]')];
const actionKeys = { chain: ['KeyJ'], grind: ['KeyK'], impact: ['KeyL', 'Space'] };
const instructions = {
  chain: ['두 기계를 체인으로 연결하세요.', 'J 두 번 누르기 · 놓았다 다시 누르면 두 번째 연결'],
  reel: ['체인을 감아 기계를 충돌시키세요.', 'J 길게 누르기'],
  grind: ['이음매에 톱을 대고 장갑을 벗기세요.', 'A / D 또는 작업장 터치로 이동 · K 길게 누르기'],
  pulse: ['신호에 맞춰 펄스를 세 번 충전하세요.', 'K를 놓고, 밝은 신호에 짧게 누르기'],
  core: ['충전 완료. 신호에 코어를 한 번에 파쇄하세요.', '톱을 균열에 유지 · 밝은 신호에 L / Space 한 번'],
  'round-clear': ['기계 해체 완료.', '잠시 후 다음 작업으로 자동 이동합니다.'],
  won: ['두 구역 해체 완료.', '브레이크야드 작업을 마쳤습니다.'],
  lost: ['장비가 정지했습니다.', '다시 시작해 작업을 완료하세요.'],
};
const sounds = { hook: 'select', collision: 'hit', 'armor-break': 'crit', pulse: 'progress', impact: 'hit',
  miss: 'miss', overheat: 'hurt', 'round-start': 'restart', 'round-clear': 'finish', won: 'win', lost: 'lose' };
let state = createGame(), mode = 'ready', wantsSound = true, lowMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let fixedFX = false, lastTime = 0, previousPhase = '', previousRound = 0, lastAnnouncement = '';

function unlockSound() {
  host.dataset.audio = feedback.setSound(wantsSound);
  sawSound.unlock(wantsSound);
  if (!wantsSound) sawSound.silence();
}
function clearInput() {
  keys.clear(); pointers.clear(); stagePointers.clear(); activations.clear();
  for (const button of inputButtons) button.classList.remove('is-held');
  stepGame(state, {}, 0);
}
function announce(text) {
  if (text === lastAnnouncement) return;
  lastAnnouncement = text;
  $('announcer').textContent = text;
}
function start() {
  sawSound.silence(); unlockSound(); clearInput(); state = createGame(); mode = 'playing';
  previousPhase = ''; previousRound = 0; feedback.emit('restart');
  update(); canvas.focus({ preventScroll: true });
}
function pause() {
  if (mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
  mode = 'paused'; sawSound.silence(); clearInput(); feedback.emit('pause'); update();
  $('continue').focus({ preventScroll: true });
}
function resume() {
  unlockSound(); clearInput(); mode = 'playing'; feedback.emit('resume'); update();
  canvas.focus({ preventScroll: true });
}
function held(name) {
  return activations.has(name) || [...pointers.values()].includes(name) || (actionKeys[name] || []).some(key => keys.has(key));
}
function readInput() {
  const left = keys.has('KeyA') || keys.has('ArrowLeft') || held('left');
  const right = keys.has('KeyD') || keys.has('ArrowRight') || held('right');
  const input = { move: Number(right) - Number(left), chain: held('chain'), grind: held('grind'), impact: held('impact') };
  if (stagePointers.size) input.pointerX = [...stagePointers.values()].at(-1);
  return input;
}
function update() {
  const terminal = state.phase === 'won' || state.phase === 'lost';
  const status = terminal ? state.phase : mode;
  Object.assign(host.dataset, { status, phase: state.phase, round: String(state.round), health: state.health.toFixed(1),
    heat: state.heat.toFixed(1), pulses: String(state.pulses), coreHits: String(state.coreHits),
    variant: fixedFX ? 'baseline' : 'contact', reducedMotion: String(lowMotion) });
  $('round').textContent = String(state.round).padStart(2, '0');
  $('health').value = state.health; $('health-value').textContent = Math.ceil(state.health);
  $('heat').value = state.heat; $('heat-value').textContent = `${Math.floor(state.heat)}%`;
  $('charges').textContent = Array.from({ length: 3 }, (_, i) => i < state.pulses ? '●' : '○').join(' ');
  $('charges').setAttribute('aria-label', `펄스 충전 ${state.pulses} / 3`);
  const [objective, hint] = instructions[state.phase];
  $('objective').textContent = state.message || objective;
  $('hint').textContent = state.round === 2 && state.phase === 'core'
    ? '균열을 따라 이동 · 밝은 신호에 L / Space 한 번'
    : state.guardClosed ? '보호판 닫힘 · K를 놓고 열을 식히세요' : hint;
  const guideVisible = mode === 'playing' && ['grind', 'pulse', 'core'].includes(state.phase);
  const touching = Boolean(state.contact.contactPatch);
  const aimX = state.seam.x - state.tool.radius + 3;
  const moveRight = state.tool.x < aimX;
  $('aim-guide').hidden = !guideVisible;
  $('aim-guide').classList.toggle('touching', touching);
  $('aim-direction').textContent = state.guardClosed ? '보호판 닫힘 · 톱을 놓으세요' : touching ? '톱니 접촉 · 위치 유지' : moveRight ? '→ 오른쪽으로 이동' : '← 왼쪽으로 이동';
  $('aim-copy').textContent = state.guardClosed ? '열을 식힌 뒤 보호판이 열리면 계속하세요.' : touching ? state.phase === 'core' ? '밝은 신호에 L / Space 한 번으로 파쇄하세요.' : state.phase === 'pulse' ? '밝은 신호에 K를 짧게 누르세요.' : 'K를 길게 눌러 장갑을 벗기세요.' : '밝은 ▽ 표시 아래로 톱 중심을 옮기세요.';
  const activeStep = ['chain', 'reel'].includes(state.phase) ? 0 : ['grind', 'pulse'].includes(state.phase) ? 1 : 2;
  phaseSteps.forEach((item, i) => { item.classList.toggle('current', i === activeStep); item.classList.toggle('done', i < activeStep); });
  for (const button of inputButtons) {
    const action = button.dataset.input;
    button.classList.toggle('is-held', mode === 'playing' && held(action));
    button.classList.toggle('active-tool', action === ['chain', 'grind', 'impact'][activeStep]);
    button.setAttribute('aria-disabled', String(mode !== 'playing' || terminal));
  }
  $('grind-label').textContent = state.phase === 'pulse' ? '펄스 충전' : '톱으로 절삭';
  $('grind-help').textContent = state.phase === 'pulse' ? `${state.pulses} / 3 · 신호에 짧게 누르기` : '균열에서 길게 누르기';
  $('chain-help').textContent = state.phase === 'reel' ? '길게 눌러 충돌시키기' : `${state.chain.anchors.length} / 2 연결 · 누른 뒤 놓기`;
  $('impact-help').textContent = state.phase === 'core' ? '밝은 신호에 한 번 눌러 파쇄' : '펄스 3회 충전 후 사용';
  const timed = ['pulse', 'core'].includes(state.phase);
  $('timing').hidden = !timed;
  $('timing').classList.toggle('active', state.rhythm.inWindow && !state.guardClosed);
  $('timing-cursor').style.left = `${Math.min(99, state.rhythm.progress * 100)}%`;
  document.querySelector('.timing-window').style.left = `${(1 - state.rhythm.window / state.rhythm.interval) * 100}%`;
  $('timing-text').textContent = state.guardClosed ? '보호판 열림 대기' : state.rhythm.inWindow ? `${state.phase === 'pulse' ? 'K' : 'L'} 지금 누르기!` : '밝은 신호 대기';
  $('overlay').hidden = mode === 'playing' && !terminal;
  $('intro').hidden = mode !== 'ready';
  $('result').hidden = mode === 'ready' || (mode === 'playing' && !terminal);
  $('pause').disabled = mode === 'ready' || terminal;
  $('pause').innerHTML = mode === 'paused' ? '계속하기 <kbd>P</kbd>' : '일시정지 <kbd>P</kbd>';
  if (mode === 'paused' || terminal) {
    $('result-label').textContent = terminal ? state.phase === 'won' ? 'SALVAGE COMPLETE' : 'EQUIPMENT OFFLINE' : 'OPERATION PAUSED';
    $('result-title').textContent = terminal ? state.phase === 'won' ? '폐기장, 정리 완료.' : '아직 끝나지 않았습니다.' : '잠깐, 공구를 내려놓고.';
    $('result-copy').textContent = terminal ? state.phase === 'won' ? '두 작업장의 코어를 모두 해체했습니다.' : '열이 높으면 톱을 놓고, 밝은 신호를 기다려 보세요.' : '준비되면 작업을 이어가세요.';
    $('continue').textContent = terminal ? '다시 작업하기 ↗' : '계속 작업하기 ↗';
    $('restart-overlay').hidden = terminal;
  }
  if (previousPhase !== state.phase || previousRound !== state.round) {
    announce(`작업 ${state.round}. ${state.message || objective}`);
    if (terminal) { clearInput(); $('continue').focus({ preventScroll: true }); }
    previousPhase = state.phase; previousRound = state.round;
  }
}

$('start').addEventListener('click', start);
$('continue').addEventListener('click', () => ['won', 'lost'].includes(state.phase) ? start() : resume());
$('restart-overlay').addEventListener('click', start);
$('retry').addEventListener('click', start);
$('pause').addEventListener('click', () => mode === 'paused' ? resume() : pause());
$('sound').addEventListener('click', () => {
  wantsSound = !wantsSound; unlockSound();
  $('sound').setAttribute('aria-pressed', String(wantsSound));
  $('sound').textContent = wantsSound ? '소리 켜짐' : '소리 꺼짐';
});
$('motion').setAttribute('aria-pressed', String(lowMotion));
$('motion').addEventListener('click', () => { lowMotion = !lowMotion; $('motion').setAttribute('aria-pressed', String(lowMotion)); update(); });
$('variant').addEventListener('click', () => {
  fixedFX = !fixedFX; $('variant').setAttribute('aria-pressed', String(!fixedFX));
  $('variant').textContent = fixedFX ? '기준 효과' : '접촉 효과'; update();
});

for (const button of inputButtons) {
  const action = button.dataset.input;
  button.addEventListener('pointerdown', event => {
    if (event.button !== 0 || mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
    event.preventDefault(); unlockSound();
    button.setPointerCapture(event.pointerId); pointers.set(event.pointerId, action); update();
  });
  const release = event => { pointers.delete(event.pointerId); update(); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('keydown', event => {
    if (!['Space', 'Enter'].includes(event.code)) return;
    event.preventDefault(); event.stopPropagation();
    if (mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
    unlockSound(); activations.add(action);
  });
  button.addEventListener('keyup', event => {
    if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); event.stopPropagation(); activations.delete(action); }
  });
  button.addEventListener('blur', () => activations.delete(action));
  button.addEventListener('click', event => {
    if (event.detail !== 0 || mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
    unlockSound(); activations.add(action); setTimeout(() => activations.delete(action), 80);
  });
}
function pointerX(event) {
  const rect = canvas.getBoundingClientRect();
  return (event.clientX - rect.left) / rect.width * canvas.width;
}
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
  event.preventDefault(); unlockSound(); canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId); stagePointers.set(event.pointerId, pointerX(event));
});
canvas.addEventListener('pointermove', event => { if (stagePointers.has(event.pointerId)) stagePointers.set(event.pointerId, pointerX(event)); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => stagePointers.delete(event.pointerId));
window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (event.code === 'KeyR' && !event.repeat) { event.preventDefault(); start(); return; }
  if (['KeyP', 'Escape'].includes(event.code) && !event.repeat) {
    event.preventDefault(); if (mode === 'paused') resume(); else pause(); return;
  }
  if (!['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyJ', 'KeyK', 'KeyL', 'Space'].includes(event.code)) return;
  if (event.code === 'Space' && event.target.closest('button,a')) return;
  event.preventDefault();
  if (mode !== 'playing' || ['won', 'lost'].includes(state.phase)) return;
  unlockSound(); keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { sawSound.silence(); clearInput(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { sawSound.silence(); clearInput(); pause(); } });

function frame(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
  lastTime = now;
  if (mode === 'playing' && !['won', 'lost'].includes(state.phase)) {
    const input = readInput();
    host.dataset.input = [input.move < 0 ? 'left' : input.move > 0 ? 'right' : '', ...['chain', 'grind', 'impact'].filter(key => input[key])].filter(Boolean).join(' ');
    stepGame(state, input, dt);
    for (const event of state.events) if (sounds[event.type]) feedback.emit(sounds[event.type]);
  }
  sawSound.update(state, mode === 'playing' && !['won', 'lost'].includes(state.phase));
  state.fixedFX = fixedFX;
  renderer.render(state, dt, lowMotion);
  update(); requestAnimationFrame(frame);
}
update(); requestAnimationFrame(frame);
$('start').disabled = false;
host.dataset.ready = 'true';
