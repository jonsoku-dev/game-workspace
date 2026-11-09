"""Normal-control campaign QA through configured isolated Stagehand MCP.
Run only after the primary grants the shared browser focus window.
"""
import sys,json
from pathlib import Path
out=Path(__file__).resolve().parent
sys.path.insert(0,str(out.parents[3]/'studio/tools'))
from playcheck_browser import MCP

def main():
    c=MCP();report={'url':'http://127.0.0.1:53045/comet-carom/','passed':False,'stage1':[],'misses':[],'stage2':[]}
    def snap():return c.run('return await page.evaluate(()=>window.cometSnapshot);')
    def shot(unit,angle,power=100,skill=False):
        c.run("await page.locator('[data-unit=\""+str(unit)+"\"]').click();await page.locator('#angle').focus();const value=Number(await page.locator('#angle').inputValue()),target="+str(angle)+";for(let i=0;i<Math.abs(target-value);i++)await page.keyboard.press(target>value?'ArrowRight':'ArrowLeft');await page.locator('#power').focus();await page.keyboard.press('"+('End' if power==100 else 'Home')+"');return true;")
        if skill:c.run("await page.locator('#skill').click();return true;")
        before=snap();c.run("await page.locator('#fire').click();return true;")
        c.run("await page.waitForTimeout("+str(3200 if power==100 else 2100)+");return true;")
        after=snap()
        for _ in range(8):
            if after['phase']!='flight':break
            c.run('await page.waitForTimeout(250);return true;');after=snap()
        assert after['phase']!='flight','Shot still in flight after bounded wait'
        return {'input':{'unit':unit,'angle':angle,'power':power,'skill':skill},'before':before,'after':after}
    def photo(name,full=False):
        c.run("await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:"+json.dumps(str(out/name))+",fullPage:"+str(full).lower()+"});return true;")
    try:
        c.run("await page.goto('http://127.0.0.1:53045/comet-carom/');await page.setViewportSize({width:1440,height:1200});await page.waitForTimeout(250);await page.evaluate(()=>{window.__qaErrors=[];addEventListener('error',e=>__qaErrors.push(String(e.message)));addEventListener('unhandledrejection',e=>__qaErrors.push(String(e.reason)));});return true;")
        report['initial']=snap();assert report['initial']['campaign']['phase']=='playing'
        angles=[-89,-127,-117,-43,-24,-118,-162,-115,-125,-67]
        for i,angle in enumerate(angles):
            result=shot(i%3,angle,skill=i in [3,6,9]);report['stage1'].append(result)
            print(json.dumps({'stage':1,'shot':i+1,'phase':result['after']['campaign']['phase']},ensure_ascii=False),flush=True)
        assert report['stage1'][-1]['after']['campaign']['phase']=='between'
        photo('between.png')
        report['continueLabel']=c.run("return {text:await page.locator('#again').textContent()};")
        c.run("await page.locator('#again').click();return true;")
        entry=snap();report['entry']=entry
        assert entry['campaign']['stage']['id']=='twin-observatory' and entry['campaign']['phase']=='playing'
        photo('cover.png')
        c.run("await page.setViewportSize({width:390,height:844});return true;")
        report['mobile']=c.run("return await page.evaluate(()=>({bodyWidth:document.body.scrollWidth,width:innerWidth,portraitVisible:getComputedStyle(document.querySelector('.guardian-card')).display!=='none',stage:document.querySelector('#stageTitle').textContent,preview:document.querySelector('#trajectory').textContent}));")
        assert report['mobile']['bodyWidth']<=report['mobile']['width'] and report['mobile']['portraitVisible']
        photo('mobile.png',True)
        report['chainBreak']=shot(entry['selected'],-176,100)
        assert report['chainBreak']['after']['lastShot']['latches']==1 and report['chainBreak']['after']['aperture']==0
        photo('chain-break.png',True)
        # A controlled miss never lights both nodes; repeated real misses lose to the core countdown.
        for i in range(20):
            g=snap()
            if g['campaign']['phase']=='failed':break
            result=shot(g['selected'],90,0);report['misses'].append(result)
            if i==1:photo('mobile-miss.png',True)
        failed=snap();report['failed']=failed
        assert failed['campaign']['phase']=='failed' and failed['foes'][0]['hp']==84
        photo('failed.png',True)
        c.run("await page.locator('#again').click();return true;")
        restored=snap();report['restored']=restored
        assert restored==entry,'Retry did not restore exact stage entry snapshot'
        c.run("await page.setViewportSize({width:1440,height:1200});return true;")
        photo('retry.png')
        # These whole-degree shots genuinely cross both latches in one shot, then hit the open core.
        for i,(unit,angle) in enumerate([(1,0),(0,-70),(1,180),(0,-65)]):
            result=shot(unit,angle);report['stage2'].append(result)
            if i==0:
                assert result['after']['lastShot']['latches']==2 and result['after']['aperture']==1
                photo('core-open.png')
            if i==1:assert result['after']['foes'][0]['hp']<84
            print(json.dumps({'stage':2,'shot':i+1,'phase':result['after']['campaign']['phase'],'core':result['after']['foes'][0]['hp']},ensure_ascii=False),flush=True)
        report['complete']=snap();assert report['complete']['campaign']['phase']=='complete'
        photo('complete.png')
        c.run("await page.locator('#again').click();return true;")
        report['restart']=snap();assert report['restart']==report['initial']
        report['errors']=c.run("return await page.evaluate(()=>({runtime:window.__qaErrors,resources:performance.getEntriesByType('resource').filter(e=>e.responseStatus>=400).map(e=>({url:e.name,status:e.responseStatus}))}));")
        assert not report['errors']['runtime'] and not report['errors']['resources']
        report['passed']=True
        report['limits']=['Normal buttons/range keyboard inputs only; no physical pointer drag or touch hardware.','No audio listening.','Runtime error listeners attached after navigation; successful campaign flow additionally constrains initial load failures.','No game-state injection. Only read-only snapshots plus UI scroll and error-listener instrumentation.']
    except Exception as e:
        report['failure']=str(e);raise
    finally:
        (out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));c.close()
if __name__=='__main__':main()
