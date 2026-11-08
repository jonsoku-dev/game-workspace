"""Check the installed player locally with the configured Stagehand browser."""
from pathlib import Path
import hashlib
import json
import sys

project = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project.parents[1] / 'studio/tools'))
from playcheck_browser import MCP

client = MCP()
try:
    observed = []
    for width, url in [(1280, 'http://127.0.0.1:52991/player.html'),
                       (390, (project/'build/final/bundle/player.html').as_uri())]:
        report = client.run("""
        await page.setViewportSize({width:WIDTH,height:820});await page.goto(URL);
        await page.locator('#actions button:not([disabled])').first().waitFor({timeout:20000});
        const buttons=page.locator('#actions button'), selected=[];
        for(const i of [6,1,4,0,2,5,7,3]){
          await buttons.nth(i).click();
          const shot=await page.evaluate(()=>document.querySelector('canvas').toDataURL());
          await page.waitForTimeout(110);
          const name=await buttons.nth(i).textContent();
          selected.push({name,changed:shot!==await page.evaluate(()=>document.querySelector('canvas').toDataURL())});
        }
        await buttons.nth(4).click();await page.waitForTimeout(150);
        await page.locator('#pause').click();
        const a=await page.evaluate(()=>document.querySelector('canvas').toDataURL());
        await page.waitForTimeout(130);
        const paused=a===await page.evaluate(()=>document.querySelector('canvas').toDataURL());
        return {selected,paused,ui:await page.evaluate(()=>({local:location.protocol,lang:document.documentElement.lang,title:document.querySelector('h1').textContent,
          native:[document.querySelector('canvas').width,document.querySelector('canvas').height],
          overflow:document.documentElement.scrollWidth>innerWidth,
          external:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)).map(r=>r.name),
          embeddedDownload:document.querySelector('#download').href.startsWith('data:application/octet-stream;')}))};
        """.replace('WIDTH',str(width)).replace('URL);',json.dumps(url)+');'))
        if report['ui']['overflow'] or report['ui']['external'] or not report['paused'] or not report['ui']['embeddedDownload']:
            raise ValueError('Player controls or offline presentation check failed')
        screenshot=(project/'evidence'/('player-desktop.png' if width>400 else 'player-mobile.png')).resolve()
        client.run('await page.screenshot({path:'+json.dumps(str(screenshot))+',fullPage:true});return true;')
        observed.append(report)
    record={'rive_sha256':hashlib.sha256((project/'build/final/bundle/character.riv').read_bytes()).hexdigest(),
            'viewports':observed, 'scope':'Browser controls, local HTTP + file URL, reference artwork not approved by user.'}
    (project/'evidence/player-ui.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
finally:
    client.close()
