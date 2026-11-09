"""Published normal-control QA through the configured Studio Stagehand MCP."""
from pathlib import Path
import argparse
import hashlib
import json
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'studio/tools'))
from playcheck_browser import MCP

OUT = Path(__file__).resolve().parent
URL = 'http://127.0.0.1:53045/ember-alley-final/'

HELPERS = r'''
const out=OUT;
const nativeKeyboard=NATIVE;
const held=new Set();
const state=()=>page.evaluate(()=>window.emberState);
const tap=key=>page.locator(`[data-key="${key}"]`).click();
async function move(wanted){
  if(nativeKeyboard){for(const k of ['w','a','s','d']){
    if(wanted.includes(k)&&!held.has(k)){await page.keyboard.down(k);held.add(k);}
    if(!wanted.includes(k)&&held.has(k)){await page.keyboard.up(k);held.delete(k);}
  }}else await page.evaluate(keys=>{for(const k of ['w','a','s','d'])window.dispatchEvent(new KeyboardEvent(keys.includes(k)?'keydown':'keyup',{key:k,bubbles:true}));},wanted);
}
async function release(){
  if(nativeKeyboard){for(const k of ['w','a','s','d'])await page.keyboard.up(k);held.clear();}
  else await move([]);
}
async function resume(s){if(s.paused){await page.locator('#pause').click();return true;}return false;}
async function pause(){await release();const s=await state();if(s.phase==='playing'&&!s.paused)await page.locator('#pause').click();}
async function shot(name){
 const box=await page.evaluate(()=>{const b=document.querySelector('#game').getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};});
 const before=await state();await page.screenshot({path:out+'/'+name,clip:box});return before;
}
function vents(s){const cycle=Math.floor(s.stageTime/3.6),age=s.stageTime-cycle*3.6,lane=[0,2,1][cycle%3];const bounds=[[326,366],[377,417],[428,468]][lane];return{top:bounds[0],bottom:bounds[1],phase:age<.95?'warning':age<1.65?'active':'cooling',lane};}
'''

STAGE_ONE = r'''
await page.locator('#start').click();
const log=[];let last='';
for(let i=0;i<650;i++){
 const s=await state(),p=s.player;
 if(await resume(s))continue;
 const phase=`${s.campaign.phase}/${s.room}/${s.wave}`;
 if(phase!==last){log.push({phase,time:s.time,hp:p.hp,score:s.score});last=phase;}
 if(s.campaign.phase!=='playing')break;
 const e=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];let keys=[];
 if(s.door){keys=['d'];if(p.x>825)await tap('enter');}
 else if(e){const dx=e.x-p.x,dy=e.y-p.y;
   if(p.move<0&&(Math.abs(dx)>73||Math.sign(dx)!==p.face))keys.push(dx>0?'d':'a');
   if(p.move<0&&Math.abs(dy)>18)keys.push(dy>0?'s':'w');
   if(Math.abs(dx)<130&&Math.abs(dy)<40&&Math.sign(dx)===p.face)await tap(p.cd===0&&p.move<0?'k':'j');
 }
 await move(keys);await page.waitForTimeout(e?.kind==='boss'?65:100);
}
await release();const result=await state();
if(result.campaign.phase==='between')await shot('first-dungeon-clear.png');else await pause();
return{log,state:result};
'''

ENTRY_AND_FRONT = r'''
const before=await state();await page.waitForTimeout(350);const noAutoSkip=await state();
await page.locator('#start').click();await page.waitForTimeout(50);const entry=await state();await shot('vent-warning.png');
for(let i=0;i<110;i++){
 const s=await state(),p=s.player,e=s.enemies.find(e=>!e.dead);if(s.phase!=='playing')break;
 let keys=[];const goalX=e.x+e.face*85,goalY=e.y+24;
 if(Math.abs(goalX-p.x)>12)keys.push(goalX>p.x?'d':'a');
 if(Math.abs(goalY-p.y)>6)keys.push(goalY>p.y?'s':'w');
 if(Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<30&&p.face===-e.face){await release();break;}
 await move(keys);await page.waitForTimeout(50);
}
await release();const frontBefore=await state();await tap('j');await page.waitForTimeout(140);const blocked=await state();await shot('cover.png');await shot('shield-blocked.png');await pause();
return{before,noAutoSkip,entry,frontBefore,blocked};
'''

TACTICAL = r'''
const initial=await state();let flanked=null,opened=false,activeShot=false;
for(let i=0;i<900;i++){
 const s=await state(),p=s.player;if(await resume(s))continue;
 if(s.campaign.phase!=='playing')break;
 if(STOP && s.kills>initial.kills)break;
 const e=s.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];let keys=[],wait=70;
 if(e){
  const behind=(p.x-e.x)*e.face<-25,closed=e.shieldBreak<=0&&e.z<=0;
  const goalX=e.x-e.face*65;let goalY=e.y;
  if(closed&&!behind){goalY=e.y<390?e.y+62:e.y-62;if(Math.abs(p.y-e.y)>48)keys.push(goalX>p.x?'d':'a');}
  else if(Math.abs(goalX-p.x)>10)keys.push(goalX>p.x?'d':'a');
  const vent=vents(s);
  if(vent.phase!=='cooling'&&goalY>=vent.top&&goalY<=vent.bottom)goalY=[vent.top-12,vent.bottom+12].filter(y=>y>=318&&y<=465).sort((a,b)=>Math.abs(a-e.y)-Math.abs(b-e.y))[0];
  if(Math.abs(goalY-p.y)>5)keys.push(goalY>p.y?'s':'w');
  if(Math.abs(goalY-p.y)<18)wait=25;
  if(vent.phase!=='cooling'&&p.y>=vent.top&&p.y<=vent.bottom){
    const safe=[vent.top-12,vent.bottom+12].filter(y=>y>=318&&y<=465).sort((a,b)=>Math.abs(a-p.y)-Math.abs(b-p.y))[0];
    keys=keys.filter(k=>k!=='w'&&k!=='s');keys.push(safe>p.y?'s':'w');
  }
  if(!behind)flanked=null;
  if(behind&&(flanked===e.id||Math.abs(goalX-p.x)<=15)){
    flanked=e.id;keys=keys.filter(k=>k!=='a'&&k!=='d');
    if(Math.sign(e.x-p.x)!==p.face){keys.push(e.x>p.x?'d':'a');wait=20;}
    else if(Math.abs(e.x-p.x)<125&&Math.abs(e.y-p.y)<31)await tap('j');
  }
  if(!opened&&s.stats.shieldBreaks>initial.stats.shieldBreaks){await shot('flank-open.png');opened=true;}
  if(!activeShot&&vent.phase==='active'){await shot('vent-active.png');activeShot=true;}
 }
 await move(keys);await page.waitForTimeout(wait);
}
await release();const result=await state();
if(result.campaign.phase==='complete')await shot('complete.png');
else await pause();
return{initial,state:result,opened,activeShot};
'''

FAIL_RETRY = r'''
let s=await state();await resume(s);s=await state();const target=s.enemies.find(e=>!e.dead);
for(let i=0;i<180;i++){
 s=await state();if(s.phase!=='playing')break;const p=s.player,keys=[];
 const goalX=target.x+target.face*70;
 if(Math.abs(goalX-p.x)>10)keys.push(goalX>p.x?'d':'a');
 if(Math.abs(target.y-p.y)>5)keys.push(target.y>p.y?'s':'w');
 if(Math.abs(goalX-p.x)<16&&Math.abs(target.y-p.y)<12)break;
 await move(keys);await page.waitForTimeout(60);
}
await release();
for(let i=0;i<300;i++){
 s=await state();if(s.campaign.phase==='failed')break;
 const keys=[],p=s.player,goalX=target.x+target.face*75;
 if(Math.abs(goalX-p.x)>15)keys.push(goalX>p.x?'d':'a');
 if(Math.abs(target.y-p.y)>8)keys.push(target.y>p.y?'s':'w');
 await move(keys);await page.waitForTimeout(70);
}
await release();
const failed=await state();if(failed.campaign.phase==='failed')await shot('second-dungeon-defeat.png');
if(failed.campaign.phase==='failed'){await page.locator('#start').click();await page.waitForTimeout(80);}
const retried=await state();await pause();return{failed,retried};
'''


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url',default=URL);args=parser.parse_args()
    report={'schema_version':1,'url':args.url,'driver':'studio/tools/playcheck_browser.py:MCP','inputs':{},'observations':{},'prior_attempt':'Initial unattended-loss wait ended at20HP after knockback moved player outside guard aggro. Revised QA uses ordinary approach input to stay in attack range; no product change.', 'limitations':['No simulation state mutation or stage injection.','Audio listening and human artistic acceptance are not automated proof.']}
    client=None
    def save():
        (OUT/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    def run(body):
        code=HELPERS.replace('OUT',json.dumps(str(OUT))).replace('NATIVE','true' if report['inputs'].get('native_held_keyboard') else 'false')+body
        return client.run(code)
    try:
        client=MCP()
        initial=client.run('await page.setViewportSize({width:1440,height:1080});await page.goto('+json.dumps(args.url)+');await page.waitForTimeout(800);await page.evaluate(()=>{window.__qaErrors=[];window.__qaKeys=[];window.addEventListener("keydown",e=>window.__qaKeys.push({key:e.key,code:e.code,trusted:e.isTrusted}));window.addEventListener("error",e=>window.__qaErrors.push(e.message));window.addEventListener("unhandledrejection",e=>window.__qaErrors.push(String(e.reason)));});await page.keyboard.press("d",{delay:80});return{downAvailable:typeof page.keyboard.down==="function",events:await page.evaluate(()=>window.__qaKeys),ready:await page.evaluate(()=>window.emberState)};')
        native=initial['downAvailable'] and any(e['key']=='d' and e['trusted'] for e in initial['events'])
        report['inputs']={'native_held_keyboard':native,'key_probe':initial['events'],'battle':'Native visible J/K/Space/door/start/retry buttons.','movement':'Native Playwright keyboard down/up' if native else 'Synthetic KeyboardEvent keydown/up through normal handlers; native held-key driver unavailable.'}
        report['observations']['initial']=initial['ready'];save();print('READY '+json.dumps(report['inputs']),flush=True)
        first=run(STAGE_ONE);report['observations']['first_dungeon']=first;save();print('FIRST '+first['state']['campaign']['phase'],flush=True)
        assert first['state']['campaign']['phase']=='between','First dungeon did not reach deliberate continue screen'
        front=run(ENTRY_AND_FRONT);report['observations']['entry_and_block']=front;save();print('ENTRY_AND_BLOCK',front['entry']['campaign']['index'],front['blocked']['stats']['blocks'],flush=True)
        assert front['noAutoSkip']['campaign']['index']==0 and front['entry']['campaign']['index']==1
        assert front['blocked']['stats']['blocks']>front['entry']['stats']['blocks'],'No blocked front hit observed'
        partial=run(TACTICAL.replace('STOP','true'));report['observations']['partial_flank']=partial;save();print('FLANK',partial['state']['phase'],partial['state']['stats']['shieldBreaks'],flush=True)
        assert partial['state']['kills']>front['entry']['kills'],'No shield guard killed by flank'
        stage_mobile=run('await page.setViewportSize({width:390,height:844});let reduced="unavailable";try{await page.emulateMedia({reducedMotion:"reduce"});reduced=await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);}catch{}await page.locator("#start").click();await page.waitForTimeout(100);await page.screenshot({path:out+"/mobile-stage2.png",fullPage:true});const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,campaign:window.emberState.campaign}));await pause();try{await page.emulateMedia({reducedMotion:"no-preference"});}catch{}await page.setViewportSize({width:1440,height:1080});return{...result,reducedMotion:reduced};')
        report['observations']['stage2_mobile_reduced_motion']=stage_mobile;save()
        assert stage_mobile['scrollWidth']==390
        retry=run(FAIL_RETRY);report['observations']['failed_retry']=retry;save();print('RETRY',retry['retried']['campaign']['index'],flush=True)
        assert retry['failed']['campaign']['phase']=='failed','Natural defeat was not reached by normal approach inputs'
        assert retry['retried']['score']==front['entry']['score'] and retry['retried']['kills']==front['entry']['kills'] and retry['retried']['player']['hp']==front['entry']['player']['hp'],'Retry baseline drift'
        full=run(TACTICAL.replace('STOP','false'));report['observations']['second_clear']=full;save();print('SECOND',full['state']['campaign']['phase'],flush=True)
        assert full['state']['campaign']['phase']=='complete','Second dungeon did not clear via normal flanking controls'
        final=run('await page.locator("#start").click();const restarted=await state();await pause();await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+"/mobile.png",fullPage:true});return{restarted,mobile:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,targets:[...document.querySelectorAll("[data-key]")].map(e=>({key:e.dataset.key,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))})),errors:await page.evaluate(()=>window.__qaErrors),resources:await page.evaluate(()=>performance.getEntriesByType("resource").map(e=>({url:e.name,status:e.responseStatus})))};')
        report['observations']['restart_mobile']=final
        assert final['restarted']['campaign']['index']==0 and final['restarted']['score']==0 and final['restarted']['player']['hp']==120
        assert final['mobile']['scrollWidth']==390
        report['passed']=True
    except Exception as error:
        report['passed']=False;report['error']=str(error);print('FAILED '+str(error),flush=True)
        if client:
            try:report['failure_state']=run('const s=await state();await pause();return s;')
            except Exception:pass
    finally:
        save()
        if client:client.close()
    print('DONE '+str(OUT/'qa.json'),flush=True)

if __name__=='__main__':main()
