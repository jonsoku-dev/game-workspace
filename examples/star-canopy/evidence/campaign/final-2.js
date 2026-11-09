if((await page.locator('#pause').innerText()).includes('계속'))await page.locator('#pause').click();
await page.keyboard.press('ArrowRight',{delay:1200});await page.keyboard.press('ArrowUp',{delay:1000});await page.keyboard.press('ArrowRight',{delay:700});await page.waitForTimeout(400);
for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}
if((await page.locator('#level').innerText()).includes('1')){await page.keyboard.press('ArrowLeft',{delay:30});for(let i=0;i<3;i++){await page.getByRole('button',{name:'공격',exact:true}).click();await page.waitForTimeout(370);}}
await page.locator('#pause').click();return {hud:await page.locator('.hud').innerText(),quest:await page.locator('#quest').innerText()};
