await page.locator('#pause').click();await page.keyboard.press('ArrowRight',{delay:1500});
await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(1100);
if((await page.locator('#quest').innerText()).includes('2 / 3')){await page.keyboard.press('ArrowLeft',{delay:30});await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(1100);}
const leaves=await page.locator('#quest').innerText();
await page.keyboard.press('ArrowRight',{delay:5400});await page.keyboard.press('ArrowLeft',{delay:35});await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(800);await page.keyboard.press('ArrowUp',{delay:40});
await page.screenshot({path:'/Users/jongseoklee/Documents/ChatGPT/game-workspace/examples/star-canopy/evidence/campaign/final-stage1-clear.png'});
return {leaves,ending:await page.locator('#ending').innerText(),next:await page.locator('#restart').innerText()};
