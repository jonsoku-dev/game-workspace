"""Verify the delivered Rive player through the configured Stagehand MCP."""
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path.home()/'.codex/plugins/cache/game-studio/game-studio/0.7.1/tools'))
from playcheck_browser import MCP

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SHA = '2feafcf7a4898cafbd3eaf421135941939c1c8ffa1a2e6c5c64e9495fd5f2af2'
assert hashlib.sha256((ROOT/'release/rive-player/hero.riv').read_bytes()).hexdigest() == SHA
c = MCP()
try:
    identity = c.run("""await page.setViewportSize({width:1280,height:1000});
      await page.goto('http://127.0.0.1:8876/?v=2feafcf7');
      await page.locator('#actions button:not(:disabled)').first().waitFor();
      return await page.evaluate(async()=>({source:player.source,bounds:player.bounds,contents:player.contents,
        downloadURL:document.querySelector('a[download]').href,downloadName:document.querySelector('a[download]').download,
        fetchedSHA:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(player.source)).arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('')}));""")
    assert identity['fetchedSHA'] == SHA
    assert identity['downloadName'] == 'hero.riv'
    assert '?v=2feafcf7a4898caf' in identity['source']
    results = {}
    for size, width, height in [('desktop',1280,1000),('mobile',390,844)]:
        results[size] = c.run("""const errors=[];page.on('pageerror',e=>errors.push(String(e)));
          page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
          await page.setViewportSize({width:WIDTH,height:HEIGHT});await page.reload();
          await page.locator('#actions button:not(:disabled)').first().waitFor();
          await page.evaluate(()=>{window.check={states:[]};player.on(rive.EventType.StateChange,e=>window.check.states.push(...e.data));
            window.hash=()=>{const d=canvas.getContext('2d').getImageData(0,0,96,96).data;let h=2166136261,n=0,edge=0;
            for(let i=0;i<d.length;i++){h=Math.imul(h^d[i],16777619);if(i%4===3&&d[i]){n++;const p=(i-3)/4;if(p<96||p>=9120||p%96===0||p%96===95)edge++;}}
            return {hash:(h>>>0).toString(16),opaque:n,edge};};});
          const actions=[];for(const action of [7,2,5,1,6,4,3,0]){await page.evaluate(()=>window.check.states=[]);
            await page.locator(`[data-action='${action}']`).click();const samples=[];
            for(let i=0;i<12;i++){await page.waitForTimeout(80);samples.push(await page.evaluate(()=>window.hash()));}
            actions.push({action,input:await page.evaluate(()=>actionInput.value),states:await page.evaluate(()=>window.check.states),samples,unique:new Set(samples.map(x=>x.hash)).size});}
          const replay=[];for(const action of [3,4,5]){await page.locator(`[data-action='${action}']`).click();await page.waitForTimeout(1200);
            const held=await page.evaluate(()=>window.hash());await page.locator('#replay').click();const samples=[];
            for(let i=0;i<10;i++){await page.waitForTimeout(80);samples.push(await page.evaluate(()=>window.hash()));}
            replay.push({action,held,samples,unique:new Set(samples.map(x=>x.hash)).size,input:await page.evaluate(()=>actionInput.value)});}
          await page.locator('[data-action="2"]').click();await page.waitForTimeout(180);await page.locator('#pause').click();await page.waitForTimeout(80);
          const before=await page.evaluate(()=>window.hash().hash);await page.waitForTimeout(300);const after=await page.evaluate(()=>window.hash().hash);
          await page.locator('#pause').click();const resumed=[];for(let i=0;i<5;i++){await page.waitForTimeout(80);resumed.push(await page.evaluate(()=>window.hash().hash));}
          return {actions,replay,pause:{before,after,stable:before===after},resume:{unique:new Set(resumed).size,samples:resumed},errors,
            layout:await page.evaluate(()=>({viewport:[innerWidth,innerHeight],backing:[canvas.width,canvas.height],rect:canvas.getBoundingClientRect().toJSON(),overflow:document.documentElement.scrollWidth>innerWidth})),
            network:await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:r.name,status:r.responseStatus})).filter(r=>r.url.startsWith('http')))};
          """.replace('WIDTH',str(width)).replace('HEIGHT',str(height)))
        data = results[size]
        assert not data['errors'] and not data['layout']['overflow']
        assert data['pause']['stable'] and data['resume']['unique'] > 1
        for action in data['actions']:
            assert action['input'] == action['action'] and action['unique'] > 1 and action['states']
            assert all(s['opaque'] > 0 and s['edge'] == 0 for s in action['samples'])
        assert all(r['unique'] > 1 and r['input'] == r['action'] for r in data['replay'])
        assert all(r['url'].startswith('http://127.0.0.1:8876/') and r['status'] < 400 for r in data['network'])
        screenshot = str(OUT/f'player-{size}.png')
        c.run("await page.locator('[data-action=\"6\"]').click();await page.waitForTimeout(240);await page.locator('#pause').click();await page.screenshot({path:"+json.dumps(screenshot)+",fullPage:true});return {saved:true};")
    report = {'status':'runtime-verified-artwork-not-human-approved','sha256':SHA,'bytes':107312,'url':'http://127.0.0.1:8876/?v=2feafcf7','driver':'configured Stagehand MCP independent stdio','identity':identity,'results':results,'limitations':['Actual mobile hardware not tested.','Reduced-motion media emulation unavailable in Stagehand facade; source behavior not browser verified.','Runtime frame changes do not imply user visual acceptance.']}
    (OUT/'player-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'verified':True,'sha256':SHA,'viewports':list(results),'report':str(OUT/'player-browser.json')}))
finally:
    c.close()
