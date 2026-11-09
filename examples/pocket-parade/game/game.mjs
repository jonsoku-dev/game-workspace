import { loadCampaign } from "./campaign.mjs";
import { createFeedback } from "./feedback.mjs";
import {
  W,
  H,
  R,
  COUNT,
  extend,
  points,
  findMove,
  step,
  seeded,
  RESCUE_GOAL,
  seamFrom,
  burstIds,
  takeSeam,
  stitchedBadges,
  MEND_SITES,
  mendHits,
  stageWon,
  openingKind,
  findChain,
  mendPlan,
} from "./rules.mjs";
const campaign = await loadCampaign();
const $ = (s) => document.querySelector(s),
  board = $("#board"),
  host = $("#tokens"),
  line = $("polyline"),
  overlay = $("#overlay");
const names = ["토끼", "곰", "고양이", "개구리"],
  files = ["bunny", "bear", "cat", "frog"];
let random = seeded(93471);
const feedback = createFeedback({ sound: false });
let tokens = [],
  chain = [],
  score = 0,
  remaining = 75,
  charge = 0,
  feverLeft = 0,
  phase = "ready",
  nextId = 0,
  held = false,
  last = 0,
  accumulator = 0,
  focusId = null,
  shakeWait = 0,
  pops = 0,
  rescued = 0,
  seams = [],
  nextSeamId = 0,
  entryScore = 0,
  sites = [],
  assistDelay = 0;
function cue(name) {
  feedback.emit(name);
}
function say(text) {
  $("#status").textContent = text;
}
function spawn(initial = false) {
  const id = nextId++,
    column = id % 7,
    row = Math.floor(id / 7);
  const t = {
    id,
    kind: initial
      ? openingKind(campaign.index, row, column, Math.floor(random() * 4))
      : Math.floor(random() * 4),
    x: 35 + column * 57 + (row % 2 ? 8 : 0),
    y: initial ? H - 35 - row * 49 : -R - (id % 7) * 30,
    vx: (random() - 0.5) * 20,
    vy: 0,
  };
  const el = document.createElement("button");
  el.className = "token";
  el.tabIndex = -1;
  el.dataset.id = id;
  el.setAttribute("aria-label", `${names[t.kind]} ${id + 1}`);
  const img = document.createElement("img");
  img.src = `art/plush-${files[t.kind]}.png`;
  img.alt = "";
  img.draggable = false;
  el.append(img);
  el.addEventListener("focus", () => {
    focusId = id;
  });
  t.el = el;
  host.append(el);
  tokens.push(t);
  return t;
}
function hud() {
  const repairing = campaign.index === 1;
  const repaired = sites.filter((site) => site.mended).length;
  const goal = repairing ? sites.length : RESCUE_GOAL;
  const progress = repairing ? repaired : rescued;
  $("#stage-name").textContent =
    `${String(campaign.index + 1).padStart(2, "0")} · ${campaign.stage.title}`;
  $("#stage-objective").textContent = campaign.stage.objective;
  $("#stage-tactic").textContent = campaign.stage.tactic;
  $("#round-label").textContent = campaign.stage.title;
  $("#mission-target").textContent = repairing
    ? " / 2곳 수선"
    : " / 60 친구 구조";
  $("#rescued").textContent = Math.min(progress, goal);
  $("#rescue-progress").max = goal;
  $("#rescue-progress").value = Math.min(progress, goal);
  $("#rescue-progress").setAttribute("aria-label", campaign.stage.objective);
  $("#mission-label").textContent = stageWon(campaign.index, rescued, sites)
    ? "목표 달성! 지금 마무리하거나 점수를 더 모아도 좋아요"
    : repairing
      ? `별 단추로 ${2 - repaired}곳의 터진 솔기를 덮어주세요`
      : `친구 ${RESCUE_GOAL - rescued}마리만 더 꺼내주세요`;
  document.querySelectorAll(".stitch-badge").forEach((badge, index) => {
    badge.hidden = repairing && index === 2;
    const earned = repairing
      ? Boolean(sites[index]?.mended)
      : index < stitchedBadges(rescued);
    badge.textContent = repairing
      ? ["왼쪽", "오른쪽", ""][index]
      : String((index + 1) * 20);
    badge.classList.toggle("earned", earned);
    badge.setAttribute(
      "aria-label",
      `${repairing ? sites[index]?.title || "수선" : (index + 1) * 20 + "친구 배지"} ${earned ? "완료" : "미완료"}`,
    );
  });
  $("#bonus-hint").textContent = repairing
    ? "7마리 연결의 마지막 친구를 솔기 표시 가까이에! 별 단추로 톡."
    : seams.length
      ? `별 단추 ${seams.length}개 · 눌러서 주변 친구 구조`
      : "7마리를 이으면 끝자리에 별 단추가 생겨요";
  $("#continue").hidden =
    phase !== "playing" || !stageWon(campaign.index, rescued, sites);
  $("#continue").textContent = repairing
    ? "두 솔기 완성 · 수선 마무리 ✓"
    : "60친구 구조 완료 · 다음 라운드 준비 →";
  $("#shake").textContent = repairing ? "↝ 실 정리" : "↝ 흔들기";
  $("#score").textContent = score.toLocaleString("ko-KR");
  $("#time").textContent = Math.ceil(remaining);
  $("#fever").value = feverLeft > 0 ? feverLeft * 3 : charge;
  $("#fever-label").textContent =
    feverLeft > 0
      ? `✦ FEVER! ${Math.ceil(feverLeft)}초 · 점수 두 배`
      : `바느질 충전 ${Math.min(charge, 24)} / 24`;
  $("#fever-caption").textContent =
    feverLeft > 0 ? "지금 모든 연결 점수 ×2" : "가득 채우면 8초간 점수 두 배";
  $(".game-shell").classList.toggle("fevering", feverLeft > 0);
  board.classList.toggle("paused", phase === "paused");
  for (const seam of seams) seam.el.disabled = phase !== "playing";
  $("#shake").disabled = phase !== "playing" || shakeWait > 0;
  $("#pause").disabled = phase === "ready" || phase === "ended";
}
function render() {
  for (const t of tokens) {
    t.el.style.left = `${((t.x - R) / W) * 100}%`;
    t.el.style.top = `${((t.y - R) / H) * 100}%`;
    const index = chain.indexOf(t.id);
    t.el.classList.toggle("selected", index >= 0);
    t.el.style.setProperty("--lean", `${index % 2 ? 9 : -9}deg`);
    t.el.setAttribute("aria-pressed", String(chain.includes(t.id)));
  }
  line.setAttribute(
    "points",
    chain
      .map((id) => {
        const t = tokens.find((t) => t.id === id);
        return t ? `${t.x},${t.y}` : "";
      })
      .join(" "),
  );
  const label = $("#chain-label");
  label.style.display = chain.length ? "block" : "none";
  label.textContent =
    chain.length < 3
      ? `${chain.length} / 3 · 조금 더!`
      : `${chain.length} 연결 · +${points(chain.length, feverLeft > 0).toLocaleString()}${chain.length >= 7 ? " · 별 단추 준비!" : ""}`;
}
function begin() {
  tokens = [];
  host.replaceChildren();
  chain = [];
  score = entryScore;
  remaining = campaign.index === 1 ? 90 : 75;
  random = seeded(93471 + campaign.index * 1709);
  sites =
    campaign.index === 1
      ? MEND_SITES.map((site) => ({ ...site, mended: false }))
      : [];
  assistDelay = 0;
  board.classList.toggle("repair-room", campaign.index === 1);
  drawSites();
  charge = 0;
  feverLeft = 0;
  shakeWait = 0;
  pops = 0;
  rescued = 0;
  seams = [];
  nextSeamId = 0;
  $("#seams").replaceChildren();
  $("#particles").replaceChildren();
  focusId = null;
  accumulator = 0;
  phase = "playing";
  nextId = 0;
  held = false;
  for (let i = 0; i < COUNT; i++) spawn(true);
  for (let i = 0; i < 240; i++) step(tokens, 1 / 120);
  overlay.hidden = true;
  $("#pause").textContent = "Ⅱ 잠깐 쉬기";
  say(
    campaign.index === 1
      ? "표시 가까이에 7마리 연결의 끝을 놓고 별 단추를 눌러요."
      : "75초 안에 60친구 구조! 목표를 채우면 다음 주머니로 갈 수 있어요.",
  );
  if (campaign.index === 1) {
    ensureMendMove();
    phase = "ready";
    overlay.hidden = false;
    overlay.innerHTML =
      '<div class="badge">두 번째 주머니 · 다른 바느질</div><h2>별실 수선실</h2><p id="lesson"></p><div class="lesson-example">7마리 쭈욱 → 끝자리에 ✦ → 솔기 위에서 톡</div><button class="primary" id="stage-start">수선 시작하기 →</button><small>90초 · 친구 수가 아니라 두 솔기를 수선해요</small>';
    $("#lesson").textContent = campaign.stage.tactic;
    $("#stage-start").onclick = () => {
      phase = "playing";
      overlay.hidden = true;
      hud();
      board.focus();
    };
  }
  cue("restart");
  hud();
  render();
  board.focus();
}
function showResult(success) {
  phase = "ended";
  chain = [];
  held = false;
  render();
  overlay.hidden = false;
  if (!success) {
    overlay.innerHTML =
      '<div class="badge">조금만 더, 한 땀씩</div><h2>이 주머니부터 다시 해요</h2><p id="result-detail"></p><button class="primary" id="retry">현재 라운드 다시하기 ↻</button><button id="restart">처음 주머니부터</button>';
    $("#result-detail").textContent =
      `${campaign.stage.objective} · 이번 점수 ${score.toLocaleString()}점. 재시도는 이 라운드 진입 점수 ${entryScore.toLocaleString()}점부터예요.`;
    $("#retry").onclick = () => {
      if (campaign.retry()) begin();
    };
    $("#retry").focus();
  } else if (campaign.phase === "between") {
    overlay.innerHTML =
      '<div class="badge">첫 번째 주머니 완료</div><h2>친구들을 모두 구했어요!</h2><p id="result-detail"></p><button class="primary" id="next">다음 주머니 열기 →</button><button id="restart">처음부터 새로</button><small>다음에는 별 단추의 위치가 중요해져요</small>';
    $("#result-detail").textContent =
      `${rescued}친구 구조 · ${score.toLocaleString()}점을 가지고 다음 라운드로 가요.`;
    $("#next").onclick = () => {
      if (campaign.advance()) {
        entryScore = score;
        begin();
      }
    };
    $("#next").focus();
  } else {
    overlay.innerHTML =
      '<div class="badge">두 주머니의 바느질 완성</div><h2>친구도, 주머니도 포근하게!</h2><p id="result-detail"></p><button class="primary" id="again">처음부터 새 주머니 ↻</button>';
    $("#result-detail").textContent =
      `두 솔기 수선 완료 · 총 ${score.toLocaleString()}점. 구조와 수선, 서로 다른 두 바느질을 마쳤어요.`;
    $("#again").onclick = restart;
    $("#again").focus();
  }
  if ($("#restart")) $("#restart").onclick = restart;
  cue(success ? "win" : "progress");
  hud();
}
function restart() {
  if (campaign.restart()) {
    entryScore = 0;
    begin();
  }
}
function finishRound() {
  if (phase !== "playing" || !stageWon(campaign.index, rescued, sites)) return;
  if (campaign.finishStage()) showResult(true);
}
function end() {
  if (stageWon(campaign.index, rescued, sites)) finishRound();
  else if (campaign.failStage()) showResult(false);
}
$("#continue").onclick = finishRound;
function drawSites() {
  $("#mend-sites").replaceChildren();
  $("#mend-thread").replaceChildren();
  for (const [index, site] of sites.entries()) {
    const el = document.createElement("div");
    el.className = "mend-site";
    el.setAttribute("role", "img");
    el.style.left = `${(site.x / W) * 100}%`;
    el.style.top = `${(site.y / H) * 100}%`;
    el.innerHTML = `<span class="torn-stitch">× ×</span><b>${index + 1} · ${site.title}</b>`;
    el.setAttribute(
      "aria-label",
      `${site.title} 미수선. 가까운 별 단추로 수선하세요.`,
    );
    site.el = el;
    $("#mend-sites").append(el);
  }
}
function ensureMendMove() {
  if (campaign.index !== 1) return;
  const plan = mendPlan(tokens, sites);
  if (!plan) return;
  for (const token of tokens.filter((token) => plan.ids.includes(token.id))) {
    token.kind = plan.kind;
    token.el.querySelector("img").src = `art/plush-${files[token.kind]}.png`;
    token.el.setAttribute("aria-label", `${names[token.kind]} ${token.id + 1}`);
    token.el.classList.add("retied");
    setTimeout(() => token.el.classList.remove("retied"), 900);
  }
  say(
    "실 정리 완료! 솔기 가까이에 같은 친구 7마리를 모았어요. 끝자리를 골라 이어요.",
  );
}
function repairSites(seam, hits) {
  for (const site of sites.filter((site) => hits.includes(site.id))) {
    site.mended = true;
    site.el.classList.add("mended");
    site.el.setAttribute("aria-label", `${site.title} 수선 완료`);
    const thread = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    for (const [key, value] of Object.entries({
      x1: seam.x,
      y1: seam.y,
      x2: site.x,
      y2: site.y,
    }))
      thread.setAttribute(key, value);
    $("#mend-thread").append(thread);
    setTimeout(() => thread.remove(), 1200);
  }
}
function add(t) {
  if (phase !== "playing") return;
  const next = extend(chain, t, tokens);
  if (next.length !== chain.length) {
    chain = next;
    cue("select");
    render();
  }
}
function release() {
  if (phase !== "playing") return;
  held = false;
  if (chain.length < 3) {
    if (chain.length) {
      say("세 마리부터 연결할 수 있어요.");
      cue("denied");
    }
    chain = [];
    render();
    return;
  }
  const n = chain.length;
  const seam = seamFrom(chain, tokens, nextSeamId);
  const gain = points(n, feverLeft > 0);
  removeToys(new Set(chain));
  score += gain;
  rescued += n;
  pops++;
  charge += n;
  if (charge >= 24 && feverLeft <= 0) {
    charge = 0;
    feverLeft = 8;
    cue("win");
  } else cue(seam ? "progress" : "pickup");
  chain = [];
  if (seam) {
    nextSeamId++;
    addSeam(seam);
  }
  say(
    `${n}친구 구조 · +${gain.toLocaleString()}점${seam ? " · 끝자리에 별 단추! 원하는 때 눌러요" : ""}`,
  );
  while (tokens.length < COUNT) spawn();
  if (campaign.index === 1) assistDelay = 1.4;
  hud();
  render();
}
function removeToys(ids) {
  for (const t of tokens.filter((t) => ids.has(t.id))) {
    t.el.remove();
    const ghost = t.el.cloneNode(true);
    ghost.removeAttribute("data-id");
    ghost.removeAttribute("aria-label");
    ghost.tabIndex = -1;
    ghost.className = "token pop-toy";
    $("#particles").append(ghost);
    setTimeout(() => ghost.remove(), 420);
    const p = document.createElement("span");
    p.className = "spark";
    p.textContent = ["✦", "♡", "✧"][t.id % 3];
    p.style.cssText = `left:${(t.x / W) * 100}%;top:${(t.y / H) * 100}%;--dx:${(random() - 0.5) * 100}px`;
    $("#particles").append(p);
    setTimeout(() => p.remove(), 750);
  }
  tokens = tokens.filter((t) => !ids.has(t.id));
}
function addSeam(seam) {
  const el = document.createElement("button");
  el.className = "seam-button";
  el.style.setProperty(
    "--reach",
    `${(board.getBoundingClientRect().width / W) * R * 7.2}px`,
  );
  const img = document.createElement("img");
  img.src = "art/star-button.png";
  img.alt = "";
  el.append(img);
  el.style.left = `${(seam.x / W) * 100}%`;
  el.style.top = `${(seam.y / H) * 100}%`;
  el.setAttribute(
    "aria-label",
    campaign.index === 1
      ? "별 단추: 폭발 범위가 솔기를 덮으면 수선. Enter 또는 Space로 사용"
      : "별 단추: 주변 친구 꺼내기. Enter 또는 Space로 사용",
  );
  el.addEventListener("pointerdown", (event) => event.stopPropagation());
  el.addEventListener("keydown", (event) => event.stopPropagation());
  el.onclick = () => useSeam(seam.id);
  seam.el = el;
  seams.push(seam);
  $("#seams").append(el);
}
function useSeam(id) {
  if (phase !== "playing") return;
  const selected = takeSeam(seams, id);
  if (!selected) return;
  const ids = burstIds(tokens, selected.seam);
  const hits = campaign.index === 1 ? mendHits(sites, selected.seam) : [];
  if (!ids.length && !hits.length) {
    say("단추 주변이 비었어요. 친구가 내려오면 눌러요.");
    return;
  }
  const hadFocus = document.activeElement === selected.seam.el;
  selected.seam.el.remove();
  seams = selected.remaining;
  held = false;
  chain = [];
  removeToys(new Set(ids));
  rescued += ids.length;
  score += ids.length * 75 * (feverLeft > 0 ? 2 : 1);
  while (tokens.length < COUNT) spawn();
  const pulse = document.createElement("span");
  pulse.className = `star-pulse ${hits.length ? "repair-pulse" : campaign.index === 1 ? "miss-pulse" : ""}`;
  const reach = (board.getBoundingClientRect().width / W) * R * 7.2;
  pulse.style.cssText = `left:${(selected.seam.x / W) * 100}%;top:${(selected.seam.y / H) * 100}%;width:${reach}px;height:${reach}px`;
  $("#particles").append(pulse);
  setTimeout(() => pulse.remove(), 850);
  if (campaign.index === 1) {
    repairSites(selected.seam, hits);
    score += hits.length * 500;
    if (hits.length) {
      const complete = stageWon(campaign.index, rescued, sites);
      say(
        complete
          ? "두 솔기 완성! 수선 마무리 버튼으로 마지막 매듭을 지어요."
          : "한 땀 성공! 솔기가 수선됐어요. 이제 반대쪽 표시로 가요.",
      );
      cue(complete ? "win" : "progress");
    } else {
      const distance = Math.min(
        ...sites
          .filter((site) => !site.mended)
          .map((site) =>
            Math.hypot(site.x - selected.seam.x, site.y - selected.seam.y),
          ),
      );
      say(
        distance < R * 5
          ? "거의 닿았어요! 다음 연결의 끝을 솔기 표시 쪽에 더 가까이 놓아요."
          : "친구만 꺼냈어요. 수선하려면 별 단추를 솔기 표시 가까이에 놓아요.",
      );
      const nearestSite = sites
        .filter((site) => !site.mended)
        .sort(
          (a, b) =>
            Math.hypot(a.x - selected.seam.x, a.y - selected.seam.y) -
            Math.hypot(b.x - selected.seam.x, b.y - selected.seam.y),
        )[0];
      if (nearestSite) {
        nearestSite.el.classList.add("missed");
        setTimeout(() => nearestSite.el.classList.remove("missed"), 650);
      }
      cue("denied");
    }
    assistDelay = 1.4;
  } else {
    say(`별 단추 톡! ${ids.length}친구를 함께 구했어요.`);
    cue("win");
  }
  if (hadFocus) board.focus();
  hud();
  render();
}

function point(e) {
  const rect = board.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}
function nearest(p) {
  return tokens
    .filter((t) => t.y >= 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
    )
    .find((t) => Math.hypot(t.x - p.x, t.y - p.y) < R * 1.05);
}
board.addEventListener("pointerdown", (e) => {
  if (phase !== "playing") return;
  e.preventDefault();
  board.focus();
  chain = [];
  held = true;
  board.setPointerCapture(e.pointerId);
  add(nearest(point(e)));
});
board.addEventListener("pointermove", (e) => {
  if (held) add(nearest(point(e)));
});
board.addEventListener("pointerup", () => {
  if (held) release();
});
board.addEventListener("pointercancel", () => {
  held = false;
  chain = [];
  render();
  say("연결을 취소했어요.");
});
board.addEventListener("keydown", (e) => {
  if (phase !== "playing") return;
  const arrows = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  let current =
    tokens.find((t) => t.id === focusId) ||
    tokens.filter((t) => t.y > 0).sort((a, b) => b.y - a.y)[0];
  if (arrows[e.key]) {
    e.preventDefault();
    const [dx, dy] = arrows[e.key];
    const choices = tokens
      .filter(
        (t) =>
          t !== current &&
          t.y > 0 &&
          (t.x - current.x) * dx + (t.y - current.y) * dy > 5,
      )
      .sort((a, b) => {
        const cost = (t) =>
          Math.hypot(t.x - current.x, t.y - current.y) +
          Math.abs((t.x - current.x) * dy - (t.y - current.y) * dx) * 2;
        return cost(a) - cost(b);
      });
    current = choices[0] || current;
    focusId = current.id;
    current.el.focus();
  }
  if (e.key === " ") {
    e.preventDefault();
    focusId = current.id;
    add(current);
    current.el.focus();
    say(
      `${names[current.kind]} · ${chain.length}마리 연결 중. Enter로 확정해요.`,
    );
  }
  if (e.key === "Enter") {
    e.preventDefault();
    release();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    chain = [];
    render();
    say("연결을 취소했어요.");
  }
});
function pause() {
  if (!["playing", "paused"].includes(phase)) return;
  phase = phase === "playing" ? "paused" : "playing";
  held = false;
  chain = [];
  $("#pause").textContent = phase === "paused" ? "▶ 계속 놀기" : "Ⅱ 잠깐 쉬기";
  say(
    phase === "paused" ? "쉬는 중 · 시간도 기다려요." : "다시 친구들을 이어요!",
  );
  cue(phase === "paused" ? "pause" : "resume");
  hud();
  render();
}
$("#pause").onclick = pause;
$("#shake").onclick = () => {
  if (phase !== "playing" || shakeWait > 0) return;
  chain = [];
  held = false;
  shakeWait = 5;
  for (const t of tokens) {
    t.vx = (random() - 0.5) * 430;
    t.vy = -200 - random() * 160;
  }
  board.classList.add("shake");
  setTimeout(() => board.classList.remove("shake"), 350);
  if (campaign.index === 1) assistDelay = 1.4;
  say(
    campaign.index === 1
      ? "실 정리 중… 솔기 주변에 긴 연결을 준비해요."
      : "살랑살랑! 친구들이 자리를 바꿔요.",
  );
  cue("interact");
  hud();
};
$("#sound").onclick = () => {
  feedback.setSound(!feedback.sound);
  $("#sound").textContent = feedback.sound ? "소리 켜짐" : "소리 꺼짐";
  $("#sound").setAttribute("aria-pressed", String(feedback.sound));
  cue("menu");
};
$("#start").onclick = begin;
$("#restart-all").onclick = restart;
globalThis.addEventListener?.("resize", () => {
  for (const seam of seams)
    seam.el.style.setProperty(
      "--reach",
      `${(board.getBoundingClientRect().width / W) * R * 7.2}px`,
    );
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && phase === "playing") pause();
});
function frame(now) {
  const elapsed = Math.max(0, (now - last) / 1000),
    dt = Math.min(elapsed, 0.05);
  last = now;
  if (phase === "playing") {
    remaining = Math.max(0, remaining - elapsed);
    feverLeft = Math.max(0, feverLeft - elapsed);
    shakeWait = Math.max(0, shakeWait - elapsed);
    if (!chain.length && !held) {
      accumulator += dt;
      while (accumulator > 1 / 120) {
        step(tokens, 1 / 120);
        accumulator -= 1 / 120;
      }
    }
    if (assistDelay > 0) {
      assistDelay -= dt;
      if (assistDelay <= 0 && !chain.length && !held) ensureMendMove();
      else if (assistDelay <= 0) assistDelay = 0.25;
    }
    if (remaining <= 0) end();
    hud();
    render();
  }
  requestAnimationFrame(frame);
}
for (let i = 0; i < COUNT; i++) spawn(true);
for (let i = 0; i < 240; i++) step(tokens, 1 / 120);
render();
hud();
requestAnimationFrame(frame);
Promise.all([...host.querySelectorAll("img")].map((img) => img.decode()))
  .then(() => {
    if (phase === "ready") {
      $("#start").disabled = false;
      $("#restart-all").disabled = false;
      $("#start").innerHTML = "주머니 열기 <span>→</span>";
    }
  })
  .catch(() => {
    if (phase === "ready") {
      overlay.querySelector("h2").textContent = "친구들을 불러오지 못했어요";
      overlay.querySelector("p").textContent =
        "이미지 파일을 확인하고 새로고침해 주세요.";
      $("#start").textContent = "이미지 불러오기 실패";
    }
  });
window.pocket = {
  snapshot: () => ({
    phase,
    campaignPhase: campaign.phase,
    stageIndex: campaign.index,
    stage: campaign.stage,
    entryScore,
    sites: sites.map(({ id, x, y, mended }) => ({ id, x, y, mended })),
    score,
    remaining,
    charge,
    feverLeft,
    chain: [...chain],
    tokens: tokens.map(({ id, kind, x, y }) => ({ id, kind, x, y })),
    move: findMove(tokens),
    pops,
    rescued,
    badges: stitchedBadges(rescued),
    seams: seams.map(({ id, x, y }) => ({ id, x, y })),
  }),
};
