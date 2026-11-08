"use strict";
const machine = "Character Actions";
const canvas = document.querySelector("canvas");
const status = document.querySelector("#status");
const actions = [...document.querySelectorAll("[data-action]")];
const pause = document.querySelector("#pause");
let actionInput;
let selected = 0;
let paused = false;
rive.RuntimeLoader.setWasmUrl("./vendor/rive.wasm");
rive.RuntimeLoader.setWasmFallbackUrl("./vendor/rive_fallback.wasm");
function fail(message) {
  status.textContent = message;
  document.querySelectorAll("button").forEach(button => { button.disabled = true; });
}
function connectInput() {
  actionInput = player.stateMachineInputs(machine).find(input => input.name === "action");
  if (!actionInput || actionInput.type !== rive.StateMachineInputType.Number) {
    fail("Rive 파일의 동작 입력을 확인할 수 없습니다.");
    player.pause();
    return false;
  }
  return true;
}
function resizeCanvas() {
  if (!actionInput) return;
  const scale = Math.max(1, Math.floor(Math.min(canvas.parentElement.clientWidth, 640) / canvas.width));
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;
}
function updateStatus() {
  const label = actions[selected].textContent;
  status.textContent = `${label} · ${paused ? "일시 정지" : "재생 중"}`;
  canvas.setAttribute("aria-label", `솔바람 정찰대 캐릭터의 ${label} 동작`);
  pause.textContent = paused ? "계속 재생" : "일시 정지";
}
const player = new rive.Rive({
  src: "./hero.riv?v=2feafcf7a4898caf",
  canvas,
  artboard: "Character",
  stateMachines: machine,
  autoplay: true,
  enableRiveAssetCDN: false,
  layout: new rive.Layout({fit: rive.Fit.Contain, alignment: rive.Alignment.Center}),
  onLoad() {
    if (!connectInput()) return;
    actionInput.value = selected;
    const bounds = player.bounds;
    canvas.width = Math.round(bounds.maxX - bounds.minX);
    canvas.height = Math.round(bounds.maxY - bounds.minY);
    player.resizeToCanvas();
    resizeCanvas();
    document.querySelectorAll("button").forEach(button => { button.disabled = false; });
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paused = true;
      player.pause(machine);
    }
    updateStatus();
  },
  onLoadError() { fail("Rive 파일을 불러오지 못했습니다. hero.riv와 로컬 서버를 확인해 주세요."); },
});
actions.forEach(button => button.addEventListener("click", () => {
  selected = Number(button.dataset.action);
  actionInput.value = selected;
  actions.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  paused = false;
  player.play(machine);
  updateStatus();
}));
pause.addEventListener("click", () => {
  paused = !paused;
  if (paused) player.pause(machine); else player.play(machine);
  updateStatus();
});
document.querySelector("#replay").addEventListener("click", () => {
  player.reset({artboard: "Character", stateMachines: machine, autoplay: true});
  if (!connectInput()) return;
  actionInput.value = selected;
  paused = false;
  updateStatus();
});
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
window.addEventListener("pagehide", () => player.cleanup(), {once: true});
