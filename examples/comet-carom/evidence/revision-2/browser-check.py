"""V2 QA through configured isolated Stagehand; normal controls and read-only game snapshots."""
import sys,json
from pathlib import Path
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'studio/tools'))
from playcheck_browser import MCP
c=MCP();report={'url':'http://127.0.0.1:53044/comet-carom/','passed':False,'shots':[]}
def state():return c.run("return await page.evaluate(()=>window.cometSnapshot);")
def screenshot(name,full=False):
    c.run("await page.screenshot({path:"+json.dumps(str(out/name))+",fullPage:"+str(full).lower()+"});return true;")
def aim(angle):
    c.run("await page.locator('#angle').focus();await page.keyboard.press('Home');for(let i=0;i<"+str(angle+180)+";i++)await page.keyboard.press('ArrowRight');await page.locator('#power').focus();await page.keyboard.press('End');return true;")
try:
    report['initial']=c.run("await page.goto('http://127.0.0.1:53044/comet-carom/');await page.setViewportSize({width:1440,height:1100});await page.waitForTimeout(300);await page.evaluate(()=>{window.__cometQaErrors=[];addEventListener('error',e=>window.__cometQaErrors.push(String(e.message)));addEventListener('unhandledrejection',e=>window.__cometQaErrors.push(String(e.reason)));});return await page.evaluate(()=>({title:document.title,portraitLoaded:document.querySelector('#guardianPortrait').complete&&document.querySelector('#guardianPortrait').naturalWidth===1400,bodyWidth:document.body.scrollWidth,width:innerWidth}));")
    assert report['initial']['portraitLoaded']
    screenshot('cover.png')
    # First actual shot is taken with mobile viewport controls and crosses Luna then the right wall.
    c.run("await page.setViewportSize({width:390,height:844});return true;")
    aim(0)
    report['mobileAim']=c.run("await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);return await page.evaluate(()=>({width:innerWidth,bodyWidth:document.body.scrollWidth,portraitVisible:getComputedStyle(document.querySelector('.guardian-card')).display!=='none',preview:document.querySelector('#trajectory').textContent,angle:document.querySelector('#angle').value,power:document.querySelector('#power').value}));")
    assert report['mobileAim']['bodyWidth']<=report['mobileAim']['width'] and report['mobileAim']['portraitVisible']
    screenshot('mobile.png',True)
    c.run("await page.locator('#fire').click();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(450);return true;")
    report['mobileDuring']=state();screenshot('ally.png')
    c.run("await page.waitForTimeout(400);return true;")
    report['mobileBank']=state();screenshot('bank.png')
    c.run("await page.waitForTimeout(5200);return true;")
    report['mobileNextTurn']=state()
    assert report['mobileNextTurn']['turn']==2
    assert report['mobileNextTurn']['lastShot']['assists']==1 and report['mobileNextTurn']['lastShot']['banks']>=1
    c.run("await page.setViewportSize({width:1440,height:1100});return true;")
    for count in range(20):
        before=state()
        if before['phase'] in ['won','lost']:break
        if before['wave']==2 and not report.get('bossShown'):
            c.run("await page.evaluate(()=>scrollTo(0,0));return true;");screenshot('boss.png');report['bossShown']=before
        # The same simple player strategy uses whole-degree aim at the first live foe.
        shot=c.run("const s=await page.evaluate(()=>window.cometSnapshot),h=s.heroes[s.selected],e=s.foes.find(e=>e.hp>0);return {angle:Math.round(Math.atan2(e.y-h.y,e.x-h.x)*180/Math.PI),skill:s.charge>=3};")
        aim(shot['angle'])
        if shot['skill']:c.run("await page.locator('#skill').click();return true;")
        c.run("await page.locator('#fire').click();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(700);return true;")
        during=state()
        c.run("await page.waitForTimeout(5200);return true;")
        after=state()
        if after['weakHits']>before['weakHits']:
            screenshot('weak-hit.png');report['weakShot']={'before':before,'input':shot,'during':during,'after':after}
        report['shots'].append({'before':{'turn':before['turn'],'wave':before['wave'],'selected':before['selected']},'input':shot,'during':during,'after':after})
        print(json.dumps({'turn':after['turn'],'phase':after['phase'],'wave':after['wave'],'hp':after['hp'],'weakHits':after['weakHits']},ensure_ascii=False),flush=True)
    report['final']=state();screenshot('result.png')
    report['errors']=c.run("return await page.evaluate(()=>({runtime:window.__cometQaErrors,resources:performance.getEntriesByType('resource').filter(e=>e.responseStatus>=400).map(e=>({url:e.name,status:e.responseStatus}))}));")
    assert report['final']['phase']=='won'
    assert report['final']['weakHits']>0 and report['final']['assists']>0 and report['final']['bounces']>0
    report['warnings']=[e for e in report['errors']['resources'] if e['url'].endswith('/favicon.ico')]
    report['errors']['resources']=[e for e in report['errors']['resources'] if not e['url'].endswith('/favicon.ico')]
    assert not report['errors']['runtime'] and not report['errors']['resources']
    report['passed']=True
    report['limits']=['Physical pointer drag is verified separately by primary CUA, not this run.','No audio listening or physical touch hardware.','Error listeners attached after navigation; early load errors additionally constrained by successful game flow and loaded art.','No game state injection; snapshot reads and UI-only scroll/error instrumentation.']
except Exception as e:
    report['failure']=str(e)
    raise
finally:
    (out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));c.close()
