await page.goto('http://127.0.0.1:53045/star-canopy-final/');
await page.setViewportSize({width:740,height:850});
await page.waitForTimeout(400);await page.bringToFront();
if((await page.locator('#pause').innerText()).includes('계속'))await page.locator('#pause').click();
await page.locator('canvas').click();
await page.keyboard.press('ArrowRight',{delay:1600});
await page.getByRole('button',{name:'점프',exact:true}).click();await page.waitForTimeout(750);
await page.keyboard.press('ArrowLeft',{delay:30});
for(let i=0;i<4;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}
const first=await page.locator('#quest').innerText();
await page.keyboard.press('ArrowRight',{delay:1170});await page.keyboard.press('ArrowUp',{delay:1000});await page.keyboard.press('ArrowRight',{delay:700});await page.waitForTimeout(400);
for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}
if((await page.locator('#level').innerText()).includes('1')){await page.keyboard.press('ArrowLeft',{delay:30});for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}}
await page.screenshot({path:'/Users/jongseoklee/Documents/ChatGPT/game-workspace/examples/star-canopy/evidence/campaign/final-level2.png'});
await page.locator('#pause').click();return {first,hud:await page.locator('.hud').innerText(),quest:await page.locator('#quest').innerText()};
