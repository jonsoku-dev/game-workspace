async function resume(){await page.bringToFront();if((await page.locator('#pause').innerText()).includes('계속'))await page.locator('#pause').click();}
await resume();await page.keyboard.press('ArrowLeft',{delay:5050});await resume();await page.getByRole('button',{name:'점프',exact:true}).click();await page.waitForTimeout(850);
await resume();await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(1200);
await resume();await page.keyboard.press('ArrowRight',{delay:30});await resume();await page.getByRole('button',{name:'별꽃 마법',exact:true}).click();await page.waitForTimeout(1200);
await page.screenshot({path:'/Users/jongseoklee/Documents/ChatGPT/game-workspace/examples/star-canopy/evidence/campaign/plugin-012/third.png'});if((await page.locator('#pause').innerText()).includes('쉬기'))await page.locator('#pause').click();return {quest:await page.locator('#quest').innerText(),hud:await page.locator('.hud').innerText()};
