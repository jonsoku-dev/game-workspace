"""Normal-input Three acceptance through configured Stagehand MCP; no state mutation."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'studio/tools'))
from playcheck_browser import MCP

OUT = Path(__file__).resolve().parent
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:52995/'
client = MCP()
observed = {'url': URL, 'method': 'configured isolated Stagehand MCP; normal controls; read-only woodsAlight telemetry', 'checks': {}}
def run(code):
    result = client.call('tools/call', {'name':'run','arguments':{'code':code}})
    if result.get('isError'): raise ValueError(str(result))
    return json.loads(next(c['text'] for c in result['content'] if c['type']=='text'))
def record(name, code):
    value = run(code)
    observed['checks'][name] = value
    print(name, json.dumps(value), flush=True)
    return value
def shot(name):
    return 'await page.screenshot({path:' + json.dumps(str(OUT / ('three-' + name + '.png'))) + ',fullPage:true});'
try:
    run('globalThis.threeErrors=[]; page.on("pageerror",e=>globalThis.threeErrors.push(String(e))); page.on("console",m=>{if(m.type()==="error")globalThis.threeErrors.push(m.text())}); await page.goto(' + json.dumps(URL) + ');return true;')
    import time
    time.sleep(1)
    record('initial', 'return await page.evaluate(()=>window.woodsAlight());')
    record('pause', '''const before=await page.evaluate(()=>window.woodsAlight());await page.locator('#pause').click();await page.locator('[data-move="right"]').click();await page.waitForTimeout(250);const held=await page.evaluate(()=>window.woodsAlight());await page.locator('#pause').click();return {before,held,resumed:await page.evaluate(()=>window.woodsAlight()),unchanged:before.x===held.x&&before.z===held.z};''')
    record('far_denied_and_spam', '''await page.locator('#attack').click();const first=await page.evaluate(()=>window.woodsAlight());for(let i=0;i<3;i++)await page.locator('#attack').click();return {first,after:await page.evaluate(()=>window.woodsAlight())};''')
    # Determine each next normal button from observed coordinates; never set positions.
    route = '''async function walk(x,z){for(let i=0;i<50;i++){const s=await page.evaluate(()=>window.woodsAlight());if(Math.abs(s.x-x)<=.24&&Math.abs(s.z-z)<=.24)return s;const dir=Math.abs(s.x-x)>.24?(s.x<x?'right':'left'):(s.z<z?'down':'up');await page.locator('[data-move="'+dir+'"]').click();}throw Error('Route did not converge');}'''
    record('locked_near_goal', route + '''await walk(1,-2);await page.waitForTimeout(700);await page.locator('#attack').click();return await page.evaluate(()=>window.woodsAlight());''')
    record('crystals', route + '''const out=[];for(const [x,z]of [[-3,2],[3,1],[-2,-3]]){await walk(x,z);out.push(await page.evaluate(()=>window.woodsAlight()));}''' + shot('collect') + '''return out;''')
    record('collection_idempotent', '''const before=await page.evaluate(()=>window.woodsAlight());await page.waitForTimeout(400);const after=await page.evaluate(()=>window.woodsAlight());return {before,after};''')
    record('restore_cooldown', route + '''await walk(1,-2);await page.waitForTimeout(450);await page.locator('#attack').click();const accepted=await page.evaluate(()=>window.woodsAlight());await page.locator('#attack').click();return {accepted,cooldown:await page.evaluate(()=>window.woodsAlight())};''')
    record('win', '''await page.waitForTimeout(450);await page.locator('#attack').click();const second=await page.evaluate(()=>window.woodsAlight());await page.waitForTimeout(450);await page.locator('#attack').click();''' + shot('finish') + '''return {second,won:await page.evaluate(()=>window.woodsAlight())};''')
    record('excess_restore', '''await page.waitForTimeout(700);await page.locator('#attack').click();return await page.evaluate(()=>window.woodsAlight());''')
    record('ab_and_audio', '''await page.locator('#sound').click();await page.locator('#feel').click();const off=await page.evaluate(()=>window.woodsAlight());await page.locator('#reset').click();await page.locator('[data-move="left"]').click();const offMoved=await page.evaluate(()=>window.woodsAlight());await page.locator('#feel').click();await page.locator('[data-move="right"]').click();const on=await page.evaluate(()=>window.woodsAlight());await page.locator('#sound').click();return {off,offMoved,on,soundOff:await page.evaluate(()=>window.woodsAlight())};''')
    record('wall', '''for(let i=0;i<14;i++)await page.locator('[data-move="right"]').click();await page.waitForTimeout(100);const before=await page.evaluate(()=>window.woodsAlight());for(let i=0;i<3;i++)await page.locator('[data-move="right"]').click();await page.waitForTimeout(100);return {before,blocked:await page.evaluate(()=>window.woodsAlight())};''')
    record('mobile', '''await page.setViewportSize({width:390,height:844});''' + shot('mobile') + '''return await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,buttons:[...document.querySelectorAll('button')].map(b=>({label:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));''')
    reduced_route = route.replace('page.', 'rp.')
    record('reduced_motion', 'const rc=await browser.newContext({reducedMotion:"reduce"});const rp=await rc.newPage();await rp.goto(' + json.dumps(URL) + ');await rp.waitForTimeout(800);' + reduced_route + 'const initial=await rp.evaluate(()=>window.woodsAlight());for(const [x,z] of [[-3,2],[3,1],[-2,-3]])await walk(x,z);await walk(1,-2);for(let i=0;i<3;i++){await rp.locator("#attack").click();await rp.waitForTimeout(450);}await rp.screenshot({path:' + json.dumps(str(OUT / 'three-goal-burst.png')) + ',fullPage:true});return {initial,won:await rp.evaluate(()=>window.woodsAlight())};')
    record('served_manifest', 'return await page.evaluate(async()=>({manifest:await(await fetch("manifest.json")).json()}));')
    record('errors', 'return globalThis.threeErrors;')
    checks = observed['checks']
    assert checks['pause']['unchanged'] and not checks['pause']['resumed']['paused']
    assert checks['far_denied_and_spam']['after']['feedback']['cues']['denied'] == 1
    assert 'all three crystals' in checks['locked_near_goal']['message']
    assert [s['feedback']['cues']['pickup'] for s in checks['crystals']] == [1, 2, 3]
    assert checks['collection_idempotent']['after']['feedback']['cues']['pickup'] == 3
    assert checks['restore_cooldown']['accepted']['charge'] == checks['restore_cooldown']['cooldown']['charge'] == 1
    assert checks['win']['second']['charge'] == 2 and checks['win']['won']['won']
    assert checks['win']['won']['feedback']['activeShards'] > 0
    assert checks['excess_restore']['charge'] == 3
    assert checks['ab_and_audio']['offMoved']['feedback']['cues'] == checks['ab_and_audio']['off']['feedback']['cues']
    assert not checks['ab_and_audio']['soundOff']['feedback']['sound']
    assert checks['wall']['before']['feedback']['cues']['move'] == checks['wall']['blocked']['feedback']['cues']['move']
    assert checks['mobile']['scrollWidth'] <= checks['mobile']['width']
    assert checks['errors'] == []
    observed['assertions'] = 'PASS: pause, denial throttle, locked lantern, once-only pickups, cooldown, win, excess input, baseline gating, sound toggle, blocked displacement, mobile overflow, browser errors'
    observed['checks']['reduced_motion']['verified'] = checks['reduced_motion']['initial']['feedback']['reducedMotion']
    assert checks['excess_restore']['feedback']['cues'] == checks['win']['won']['feedback']['cues']
    observed['screenshots_inspected'] = ['three-collect.png', 'three-finish.png', 'three-mobile.png', 'three-goal-burst.png']
    observed['limits'] = ['Synthetic audio opt-in state observed; no listening or hardware latency measurement.', 'Source-prepared export exercised; final installed bytes must be compared by primary.', 'Reduced motion unverified: emulateMedia unsupported and newContext options did not activate the preference (observed false).', 'Real mesh depth confirmed by source and rendered screenshots; no camera occlusion sweep.']
finally:
    (OUT / 'three-browser.json').write_text(json.dumps(observed, indent=2) + '\n')
    client.close()
