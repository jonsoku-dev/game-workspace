"""Run with the workspace's configured Stagehand MCP. Preview URL is an argument."""
import json,sys,time,base64
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'studio/tools'))
from playcheck_browser import MCP
c=MCP();out=Path(__file__).parent.parent/'evidence';out.mkdir(exist_ok=True)
def run(code):
    v=c.run(code)
    return json.loads(v) if isinstance(v,str) else v
def check(value,message):
    assert value,message
    results.append(message)
results=[]
try:
    run(f"await page.goto({json.dumps(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:53033/')});await page.setViewportSize({{width:1100,height:1100}});return true")
    run("await page.locator('#start').click();return true")
    run("await page.evaluate(()=>{window.qaErrors=[];window.addEventListener('error',e=>window.qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.qaErrors.push(String(e.reason)));});return true")
    time.sleep(1)
    initial=run("return await page.evaluate(()=>window.pocket.snapshot())")
    check(initial['phase']=='playing' and len(initial['tokens'])==64,f'real start and 64 gravity bodies: {initial["phase"]} / {len(initial["tokens"])}')
    box=run("return await page.locator('#board').boundingBox()")
    def pos(t):return (box['x']+t['x']/420*box['width'],box['y']+t['y']/510*box['height'])
    def drag(ids,release=True):
        snap=run("return await page.evaluate(()=>window.pocket.snapshot())");ts={t['id']:t for t in snap['tokens']}
        return run("""return await page.evaluate(({ids,release})=>{const s=window.pocket.snapshot(),b=document.querySelector('#board'),r=b.getBoundingClientRect();const send=(name,id)=>{const t=s.tokens.find(t=>t.id===id);b.dispatchEvent(new PointerEvent(name,{pointerId:81,pointerType:'mouse',clientX:r.left+t.x/420*r.width,clientY:r.top+t.y/510*r.height,bubbles:true}));};const capture=b.setPointerCapture;b.setPointerCapture=()=>{};send('pointerdown',ids[0]);for(const id of ids.slice(1))send('pointermove',id);if(release)send('pointerup',ids.at(-1));b.setPointerCapture=capture;return window.pocket.snapshot();},"""+json.dumps({'ids':ids,'release':release})+")")
    a=initial['tokens'][0];b=min((t for t in initial['tokens'] if t['kind']!=a['kind']),key=lambda t:(t['x']-a['x'])**2+(t['y']-a['y'])**2)
    invalid=drag([a['id'],b['id']]);check(invalid['score']==0,'synthetic mouse rejects mixed / short chain')
    snap=run("return await page.evaluate(()=>window.pocket.snapshot())");path=snap['move'];check(len(path)==3,'reachable same-species chain exists')
    back=drag(path+[path[-2]],False);check(len(back['chain'])==2,f'synthetic mouse backtracks one step: path={path}, chain={back["chain"]}')
    run("await page.evaluate(()=>document.querySelector('#board').dispatchEvent(new PointerEvent('pointerup',{pointerId:81,bubbles:true})));return true")
    snap=run("return await page.evaluate(()=>window.pocket.snapshot())");valid=drag(snap['move']);check(valid['score']>=225 and valid['pops']==1,'synthetic mouse chain pops and scores')
    time.sleep(2);settled=run("return await page.evaluate(()=>window.pocket.snapshot())");check(len(settled['tokens'])==64,'gravity refill returns 64 bodies')
    run("await page.locator('#pause').click();return true");paused=run("return await page.evaluate(()=>window.pocket.snapshot())");time.sleep(.5);paused2=run("return await page.evaluate(()=>window.pocket.snapshot())");check(paused['remaining']==paused2['remaining'],'pause stops round timer');run("await page.locator('#pause').click();return true")
    path=run("return await page.evaluate(()=>window.pocket.snapshot().move)")
    for tid in path:
        run(f"await page.locator('[data-id=\"{tid}\"]').focus();return true")
        run("await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true})));return true")
    keys=run("await page.evaluate(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true})));return await page.evaluate(()=>window.pocket.snapshot())");check(keys['pops']==2,'synthesized keyboard focus / Space / Enter completes chain')
    run("await page.setViewportSize({width:390,height:960});return true");time.sleep(.3)
    mobile=run("return await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,imgs:[...document.images].every(i=>i.complete&&i.naturalWidth>0)}))");check(mobile['scroll']==mobile['width'],'390px responsive no horizontal overflow');check(mobile['imgs'],'all plush artwork loaded')
    touch=run("""return await page.evaluate(()=>{const s=window.pocket.snapshot(),b=document.querySelector('#board'),r=b.getBoundingClientRect();const send=(name,id)=>{const t=s.tokens.find(t=>t.id===id);b.dispatchEvent(new PointerEvent(name,{pointerId:81,pointerType:'touch',clientX:r.left+t.x/420*r.width,clientY:r.top+t.y/510*r.height,bubbles:true}));};const capture=b.setPointerCapture;b.setPointerCapture=()=>{};send('pointerdown',s.move[0]);for(const id of s.move.slice(1))send('pointermove',id);send('pointerup',s.move.at(-1));b.setPointerCapture=capture;return window.pocket.snapshot();})""")
    check(touch['pops']==3,'synthesized touch pointer path uses real handlers')
    run("await page.setViewportSize({width:1100,height:1100});return true")
    for part in c.call('tools/call',{'name':'screenshot','arguments':{'type':'png','fullPage':True}})['content']:
        if part['type']=='image':(out/'cover.png').write_bytes(base64.b64decode(part['data']))
    run("await page.setViewportSize({width:390,height:960});return true")
    for part in c.call('tools/call',{'name':'screenshot','arguments':{'type':'png','fullPage':True}})['content']:
        if part['type']=='image':(out/'mobile.png').write_bytes(base64.b64decode(part['data']))
    run("await page.setViewportSize({width:1100,height:1100});return true")
    deadline=time.monotonic()+100
    while time.monotonic()<deadline:
        state=run("return await page.evaluate(()=>window.pocket.snapshot())")
        if state['phase']=='ended':break
        time.sleep(3)
    check(state['phase']=='ended' and state['remaining']==0,'natural 75 second round ends')
    for part in c.call('tools/call',{'name':'screenshot','arguments':{'type':'png','fullPage':True}})['content']:
        if part['type']=='image':(out/'round-end.png').write_bytes(base64.b64decode(part['data']))
    replay=run("await page.locator('#again').click();return await page.evaluate(()=>window.pocket.snapshot())");check(replay['score']==0 and replay['phase']=='playing' and replay['remaining']>74,'replay resets timer score and board')
    health=run("return await page.evaluate(()=>({errors:window.qaErrors,failed:performance.getEntriesByType('resource').filter(r=>r.responseStatus>=400).map(r=>r.name)}))");check(not health['errors'] and not health['failed'],'no observed runtime errors or failed resource requests')
    check((out/'cover.png').exists() and (out/'mobile.png').exists(),'real browser screenshots saved')
    (out/'browser.json').write_text(json.dumps({'checks':results,'input_evidence':'synthetic mouse, touch and keyboard events through real handlers; physical CUA checks belong to parent evidence','preview':sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:53033/'},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(results,ensure_ascii=False),flush=True)
finally:c.close()
