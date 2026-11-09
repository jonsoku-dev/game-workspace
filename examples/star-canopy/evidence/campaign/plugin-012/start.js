await page.goto('http://127.0.0.1:53045/star-canopy-release/');await page.setViewportSize({width:740,height:850});await page.waitForTimeout(1200);await page.bringToFront();
if((await page.locator('#pause').innerText()).includes('계속'))await page.locator('#pause').click();await page.locator('canvas').click();await page.waitForTimeout(150);
await page.keyboard.press('ArrowRight',{delay:1600});await page.getByRole('button',{name:'점프',exact:true}).click();await page.waitForTimeout(850);
await page.keyboard.press('ArrowLeft',{delay:30});for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}
if((await page.locator('#quest').innerText()).includes('0 / 3')){await page.keyboard.press('ArrowRight',{delay:30});for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}}
await page.screenshot({path:'/Users/jongseoklee/Documents/ChatGPT/game-workspace/examples/star-canopy/evidence/campaign/plugin-012/first-fight.png'});await page.locator('#pause').click();
return {quest:await page.locator('#quest').innerText(),hud:await page.locator('.hud').innerText()};
