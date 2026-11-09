await page.bringToFront();await page.locator('#pause').click();
await page.keyboard.press('ArrowRight',{delay:1280});await page.keyboard.press('ArrowUp',{delay:1000});await page.keyboard.press('ArrowRight',{delay:1100});
await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(1200);
await page.keyboard.press('ArrowLeft',{delay:100});for(let i=0;i<4;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}
await page.screenshot({path:'/Users/jongseoklee/Documents/ChatGPT/game-workspace/examples/star-canopy/evidence/campaign/final-upper.png'});await page.locator('#pause').click();
return {hud:await page.locator('.hud').innerText(),quest:await page.locator('#quest').innerText(),pulse:await page.locator('#pulseStatus').innerText()};
