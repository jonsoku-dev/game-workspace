"""Normal-input browser checks through the configured isolated Stagehand MCP."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[3]/'studio/tools'))
from playcheck_browser import MCP
client=MCP()
try:
    setup=client.run("await page.goto('http://127.0.0.1:53024/'); await page.setViewportSize({width:1440,height:1100}); await page.waitForTimeout(300); return {title:await page.title()};")
    # Aim with the pointer; pull backwards from Sol then release on the same canvas.
    aim=client.run("const b=await page.locator('canvas').boundingBox(); const x=b.x+190*b.width/720,y=b.y+670*b.height/840; await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x-4,y+110,{steps:12}); await page.screenshot({path:'"+str(Path(__file__).parent/'aim.png')+"'}); return {angle:await page.locator('#angle').inputValue(),power:await page.locator('#power').inputValue()};")
    pointer_verified=aim['angle']!='-90' or aim['power']!='85'
    hit=client.run("await page.mouse.up(); await page.waitForTimeout(650); await page.screenshot({path:'"+str(Path(__file__).parent/'hit.png')+"'}); return await page.evaluate(()=>window.cometSnapshot);")
    client.run("await page.waitForTimeout(5100); return true;")
    shots=[]
    for n in range(30):
        state=client.run("return await page.evaluate(()=>window.cometSnapshot);")
        shots.append(state)
        if state['phase'] in ['won','lost']:break
        outcome=client.run("const s=await page.evaluate(()=>window.cometSnapshot),h=s.heroes[s.selected],e=s.foes.find(e=>e.hp>0); const a=Math.round(Math.atan2(e.y-h.y,e.x-h.x)*180/Math.PI); await page.locator('#angle').focus(); await page.keyboard.press('Home'); for(let i=0;i<a+180;i++)await page.keyboard.press('ArrowRight'); await page.locator('#power').focus(); await page.keyboard.press('End'); if(s.charge>=3)await page.locator('#skill').click(); await page.locator('#fire').click(); await page.waitForTimeout(5100); return await page.evaluate(()=>window.cometSnapshot);")
        print(json.dumps({'turn':outcome['turn'],'wave':outcome['wave'],'hp':outcome['hp'],'phase':outcome['phase'],'hits':outcome['totalHits']},ensure_ascii=False),flush=True)
    final=client.run("await page.screenshot({path:'"+str(Path(__file__).parent/'result.png')+"'}); return await page.evaluate(()=>({state:window.cometSnapshot,bodyWidth:document.body.scrollWidth,viewport:innerWidth}));")
    assert final['state']['phase']=='won',final
    client.run("await page.locator('#again').click(); await page.locator('#sound').click(); await page.locator('#fx').click(); await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(200); return true;")
    mobile=client.run("await page.screenshot({path:'"+str(Path(__file__).parent/'mobile.png')+"',fullPage:true}); return await page.evaluate(()=>({state:window.cometSnapshot,bodyWidth:document.body.scrollWidth,viewport:innerWidth,sound:document.querySelector('#sound').textContent,fx:document.querySelector('#fx').textContent}));")
    assert mobile['bodyWidth']<=mobile['viewport']
    assert mobile['state']['turn']==1
    (Path(__file__).parent/'browser.json').write_text(json.dumps({'setup':setup,'pointerAim':aim,'physicalDragVerified':pointer_verified,'pointerLimitation':'Stagehand mouse down/up emitted no pointer events; unchanged initial state is not a successful shot.','hit':hit,'shots':shots,'final':final,'mobile':mobile},ensure_ascii=False,indent=2))
    print('PASS normal-input 2-wave victory, restart, sound/FX toggles, mobile overflow; physical pointer drag not verified',flush=True)
finally:client.close()
