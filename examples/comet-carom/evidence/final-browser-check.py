"""Read-only final deployment QA using normal UI controls in isolated Stagehand."""
import sys,json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root/'studio/tools'))
from playcheck_browser import MCP
client=MCP()
try:
    initial=client.run("await page.goto('http://127.0.0.1:53040/comet-carom/'); await page.setViewportSize({width:1440,height:1100}); await page.waitForTimeout(400); return await page.evaluate(()=>({title:document.title,state:window.cometSnapshot,portrait:{loaded:document.querySelector('#guardianPortrait').complete,width:document.querySelector('#guardianPortrait').naturalWidth,alt:document.querySelector('#guardianPortrait').alt},bodyWidth:document.body.scrollWidth,viewport:innerWidth}));")
    assert initial['portrait']['loaded'] and initial['portrait']['width']>0
    portraits=[]
    for i in [1,2,0]:
        client.run(f"await page.locator('[data-unit=\"{i}\"]').click(); return true;")
        portraits.append(client.run("return await page.evaluate(()=>({selected:window.cometSnapshot.selected,name:document.querySelector('#guardianName').textContent,ability:document.querySelector('#guardianAbility').textContent,alt:document.querySelector('#guardianPortrait').alt,transform:getComputedStyle(document.querySelector('#guardianPortrait')).transform,portraitRect:document.querySelector('.guardian-art').getBoundingClientRect().toJSON()}));"))
    assert [x['selected'] for x in portraits]==[1,2,0]
    assert len({x['transform'] for x in portraits})==3
    client.run("await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:'"+str(Path(__file__).parent/'cover.png')+"'}); return true;")
    client.run("await page.locator('#fire').click(); return true;")
    hit=client.run("await page.waitForTimeout(700); await page.screenshot({path:'"+str(Path(__file__).parent/'first-hit.png')+"'}); return await page.evaluate(()=>window.cometSnapshot);")
    assert hit['totalHits']>0
    settled=client.run("await page.waitForTimeout(5100); return await page.evaluate(()=>window.cometSnapshot);")
    assert settled['turn']==2 and settled['bounces']>0
    responsive=[]
    for width,height in [(1024,900),(390,844)]:
        client.run(f"await page.setViewportSize({{width:{width},height:{height}}}); await page.waitForTimeout(150); return true;")
        state=client.run("return await page.evaluate(()=>({viewport:innerWidth,bodyWidth:document.body.scrollWidth,portraitVisible:getComputedStyle(document.querySelector('.guardian-card')).display!=='none',portrait:document.querySelector('.guardian-art').getBoundingClientRect().toJSON(),canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),fire:!document.querySelector('#fire').disabled}));")
        assert state['bodyWidth']<=state['viewport']
        assert state['canvas']['width']>300 and state['fire']
        responsive.append(state)
    client.run("await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:'"+str(Path(__file__).parent/'final-mobile.png')+"',fullPage:true}); return true;")
    result={'url':'http://127.0.0.1:53040/comet-carom/','initial':initial,'portraits':portraits,'firstHit':hit,'settled':settled,'responsive':responsive,'verified':['local guardian illustration loaded','all three normal-click portrait/name/ability transitions','normal fire button shot hit enemy','wall reflection during actual shot','turn advanced after actual shot','1024px and 390px no horizontal overflow','desktop and mobile screenshots'],'unverified':['physical pointer drag owned by primary CUA','audio listening','native touch hardware','full boss replay on final build']}
    (Path(__file__).parent/'final-qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({'pass':True,'firstHit':hit['totalHits'],'turn':settled['turn'],'bounces':settled['bounces'],'portraits':[x['name'] for x in portraits],'widths':[x['viewport'] for x in responsive]},ensure_ascii=False))
finally:client.close()
