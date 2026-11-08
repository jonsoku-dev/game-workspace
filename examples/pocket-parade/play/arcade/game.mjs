import {createFeedback} from './feedback.mjs';
import {W,H,R,COUNT,extend,points,findMove,step,seeded} from './rules.mjs';
const $=s=>document.querySelector(s),board=$('#board'),host=$('#tokens'),line=$('polyline'),overlay=$('#overlay');
const names=['토끼','곰','고양이','개구리'],files=['bunny','bear','cat','frog'],random=seeded(93471);
const feedback=createFeedback({sound:false});
let tokens=[],chain=[],score=0,remaining=75,charge=0,feverLeft=0,phase='ready',nextId=0,held=false,last=0,accumulator=0,focusId=null,shakeWait=0,pops=0;
function cue(name){feedback.emit(name);}
function say(text){$('#status').textContent=text;}
function spawn(initial=false){
  const id=nextId++,column=id%7,row=Math.floor(id/7);
  const t={id,kind:initial&&row===6&&column<4?0:Math.floor(random()*4),x:35+column*57+(row%2?8:0),y:initial?H-35-row*49:-R-(id%7)*30,vx:(random()-.5)*20,vy:0};
  const el=document.createElement('button');el.className='token';el.tabIndex=-1;el.dataset.id=id;el.setAttribute('aria-label',`${names[t.kind]} ${id+1}`);
  const img=document.createElement('img');img.src=`art/plush-${files[t.kind]}.png`;img.alt='';img.draggable=false;el.append(img);el.addEventListener('focus',()=>{focusId=id;});t.el=el;host.append(el);tokens.push(t);return t;
}
function hud(){
  $('#score').textContent=score.toLocaleString('ko-KR');$('#time').textContent=Math.ceil(remaining);
  $('#fever').value=feverLeft>0?feverLeft*3:charge;$('#fever-label').textContent=feverLeft>0?`✦ FEVER! ${Math.ceil(feverLeft)}초 · 점수 두 배`:'✦ 피버를 모아요';
  $('.game-shell').classList.toggle('fevering',feverLeft>0);
  $('#shake').disabled=phase!=='playing'||shakeWait>0;$('#pause').disabled=phase==='ready'||phase==='ended';
}
function render(){
  for(const t of tokens){t.el.style.left=`${(t.x-R)/W*100}%`;t.el.style.top=`${(t.y-R)/H*100}%`;t.el.classList.toggle('selected',chain.includes(t.id));t.el.setAttribute('aria-pressed',String(chain.includes(t.id)));}
  line.setAttribute('points',chain.map(id=>{const t=tokens.find(t=>t.id===id);return t?`${t.x},${t.y}`:'';}).join(' '));
  const label=$('#chain-label');label.style.display=chain.length?'block':'none';label.textContent=chain.length<3?`${chain.length} / 3 · 조금 더!`:`${chain.length} 연결 · +${points(chain.length,feverLeft>0).toLocaleString()}${chain.length>=7?' · 보너스!':''}`;
}
function begin(){
  tokens=[];host.replaceChildren();chain=[];score=0;remaining=75;charge=0;feverLeft=0;shakeWait=0;pops=0;phase='playing';nextId=0;held=false;
  for(let i=0;i<COUNT;i++)spawn(true);for(let i=0;i<240;i++)step(tokens,1/120);
  overlay.hidden=true;$('#pause').textContent='Ⅱ 잠깐 쉬기';say('같은 친구를 3마리 이상 이어요.');cue('restart');hud();render();board.focus();
}
function end(){phase='ended';chain=[];held=false;render();overlay.hidden=false;overlay.innerHTML=`<div class="badge">${score>=6000?'목표 달성! 친구들이 반겨요':'오늘도 함께라서 즐거웠어'}</div><h2>${score>=6000?'주머니가 행복으로 가득!':'다음엔 더 길게 이어봐요'}</h2><p><b>${score.toLocaleString()}점</b> · ${pops}번 연결<br>목표 6,000점 · ${Math.round(score/6000*100)}% 달성</p><button class="primary" id="again">한 번 더 놀기 ↻</button><small>새로운 친구 배치로 다시 시작해요</small>`;$('#again').onclick=begin;$('#again').focus();cue(score>=6000?'win':'progress');hud();}
function add(t){if(phase!=='playing')return;const next=extend(chain,t,tokens);if(next.length!==chain.length){chain=next;cue('select');render();}}
function release(){
  if(phase!=='playing')return;held=false;
  if(chain.length<3){if(chain.length){say('세 마리부터 연결할 수 있어요.');cue('denied');}chain=[];render();return;}
  const n=chain.length,selected=tokens.filter(t=>chain.includes(t.id)),removed=new Set(chain),gain=points(n,feverLeft>0);
  if(n>=7){const center=selected[Math.floor(n/2)];for(const t of tokens)if(Math.hypot(t.x-center.x,t.y-center.y)<R*2.8)removed.add(t.id);}
  for(const t of tokens.filter(t=>removed.has(t.id))){t.el.remove();const p=document.createElement('span');p.className='spark';p.textContent=['✦','♡','✧'][t.id%3];p.style.cssText=`left:${t.x/W*100}%;top:${t.y/H*100}%;color:${['#de8c92','#94bfa8','#cfb16f'][t.id%3]};--dx:${(random()-.5)*100}px`;$('#particles').append(p);setTimeout(()=>p.remove(),750);}
  tokens=tokens.filter(t=>!removed.has(t.id));score+=gain+(removed.size-n)*75;pops++;charge+=n;
  if(charge>=24&&feverLeft<=0){charge=0;feverLeft=8;cue('win');}else cue(n>=7?'win':'pickup');
  say(`${n}마리 연결! +${gain.toLocaleString()}점${n>=7?` · 보너스 ${removed.size-n}마리 톡!`:''}`);chain=[];
  while(tokens.length<COUNT)spawn();hud();render();
}
function point(e){const rect=board.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};}
function nearest(p){return tokens.filter(t=>t.y>=0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).find(t=>Math.hypot(t.x-p.x,t.y-p.y)<R*1.05);}
board.addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();board.focus();chain=[];held=true;board.setPointerCapture(e.pointerId);add(nearest(point(e)));});
board.addEventListener('pointermove',e=>{if(held)add(nearest(point(e)));});
board.addEventListener('pointerup',()=>{if(held)release();});
board.addEventListener('pointercancel',()=>{held=false;chain=[];render();say('연결을 취소했어요.');});
board.addEventListener('keydown',e=>{
  if(phase!=='playing')return;const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  let current=tokens.find(t=>t.id===focusId)||tokens.filter(t=>t.y>0).sort((a,b)=>b.y-a.y)[0];
  if(arrows[e.key]){e.preventDefault();const [dx,dy]=arrows[e.key];const choices=tokens.filter(t=>t!==current&&t.y>0&&(t.x-current.x)*dx+(t.y-current.y)*dy>5).sort((a,b)=>{const cost=t=>Math.hypot(t.x-current.x,t.y-current.y)+Math.abs((t.x-current.x)*dy-(t.y-current.y)*dx)*2;return cost(a)-cost(b);});current=choices[0]||current;focusId=current.id;current.el.focus();}
  if(e.key===' '){e.preventDefault();focusId=current.id;add(current);current.el.focus();say(`${names[current.kind]} · ${chain.length}마리 연결 중. Enter로 확정해요.`);}
  if(e.key==='Enter'){e.preventDefault();release();}
  if(e.key==='Escape'){e.preventDefault();chain=[];render();say('연결을 취소했어요.');}
});
function pause(){if(!['playing','paused'].includes(phase))return;phase=phase==='playing'?'paused':'playing';held=false;chain=[];$('#pause').textContent=phase==='paused'?'▶ 계속 놀기':'Ⅱ 잠깐 쉬기';say(phase==='paused'?'쉬는 중 · 시간도 기다려요.':'다시 친구들을 이어요!');cue(phase==='paused'?'pause':'resume');render();}
$('#pause').onclick=pause;
$('#shake').onclick=()=>{if(phase!=='playing'||shakeWait>0)return;chain=[];held=false;shakeWait=5;for(const t of tokens){t.vx=(random()-.5)*430;t.vy=-200-random()*160;}board.classList.add('shake');setTimeout(()=>board.classList.remove('shake'),350);say('살랑살랑! 친구들이 자리를 바꿔요.');cue('interact');hud();};
$('#sound').onclick=()=>{feedback.setSound(!feedback.sound);$('#sound').textContent=feedback.sound?'소리 켜짐':'소리 꺼짐';$('#sound').setAttribute('aria-pressed',String(feedback.sound));cue('menu');};
$('#start').onclick=begin;
document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause();});
function frame(now){const elapsed=Math.max(0,(now-last)/1000),dt=Math.min(elapsed,.05);last=now;
  if(phase==='playing'){remaining=Math.max(0,remaining-elapsed);feverLeft=Math.max(0,feverLeft-elapsed);shakeWait=Math.max(0,shakeWait-elapsed);if(!chain.length&&!held){accumulator+=dt;while(accumulator>1/120){step(tokens,1/120);accumulator-=1/120;}}if(remaining<=0)end();hud();render();}
  requestAnimationFrame(frame);
}
for(let i=0;i<COUNT;i++)spawn(true);for(let i=0;i<240;i++)step(tokens,1/120);render();hud();requestAnimationFrame(frame);
Promise.all([...host.querySelectorAll('img')].map(img=>img.decode())).then(()=>{if(phase==='ready'){$('#start').disabled=false;$('#start').innerHTML='주머니 열기 <span>→</span>';}}).catch(()=>{if(phase==='ready'){overlay.querySelector('h2').textContent='친구들을 불러오지 못했어요';overlay.querySelector('p').textContent='이미지 파일을 확인하고 새로고침해 주세요.';$('#start').textContent='이미지 불러오기 실패';}});
window.pocket={snapshot:()=>({phase,score,remaining,charge,feverLeft,chain:[...chain],tokens:tokens.map(({id,kind,x,y})=>({id,kind,x,y})),move:findMove(tokens),pops})};
