const {test,expect}=require('@playwright/test');
const {start}=require('../runtime/server.cjs');
let server;
test.beforeAll(async()=>server=await start());
test.afterAll(()=>server.stop());

test('actual offline UI: theme-aware home button opens menu without a roll',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8123/demo-offline.html');
 const home=page.locator('#r09-dice');
 await expect(home.locator('svg.r09-home-svg')).toBeVisible();
 await expect(home.locator('.r09-die-num,.die-shell')).toHaveCount(0);
 await expect(home).toHaveAttribute('aria-label','Abrir menu principal do Mastermind');
 const colorBefore=await home.evaluate(el=>getComputedStyle(el).borderTopColor);
 await page.evaluate(()=>{
   document.documentElement.style.setProperty('--v10-light','#44ffaa');
   document.documentElement.style.setProperty('--accent','#33f5aa');
 });
 const colorAfter=await home.evaluate(el=>getComputedStyle(el).borderTopColor);
 expect(colorBefore).not.toBe(colorAfter);
 await home.click();
 await expect(page.locator('#r09-overlay.open')).toBeVisible();
 await expect(page.locator('#r09-overlay [data-r09-tool="dice"]')).toBeVisible();
 await expect(page.locator('#v10-roll-burst.active')).toHaveCount(0);
 await expect(home).toHaveAttribute('aria-expanded','true');
 await page.locator('#r09-overlay .r09-close').click();
 await expect(home).toHaveAttribute('aria-expanded','false');
 expect(errors).toEqual([]);
});

test('actual dice burst: SVG dice have no square background and are theme-aware',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/demo-offline.html');
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('rpg:roll',{detail:{
    faces:[16,8,5],sides:20,bonus:0,total:29,label:'Mestre'
 }})));
 const dice=page.locator('#v10-roll-burst .v101-die');
 await expect(dice).toHaveCount(3);
 const first=dice.first();
 const before=await first.evaluate(el=>({
   background:getComputedStyle(el).backgroundColor,
   fill:getComputedStyle(el.querySelector('svg path:first-child')).fill
 }));
 expect(before.background).toMatch(/rgba?\(0, 0, 0, 0\)|transparent/);
 await page.evaluate(()=>{
    document.documentElement.style.setProperty('--v10-accent','#33aaff');
    document.documentElement.style.setProperty('--accent','#33aaff');
 });
 const after=await first.evaluate(el=>({
    background:getComputedStyle(el).backgroundColor,
    fill:getComputedStyle(el.querySelector('svg path:first-child')).fill
 }));
 expect(after.background).toMatch(/rgba?\(0, 0, 0, 0\)|transparent/);
 expect(after.fill).not.toBe(before.fill);
 await expect(page.locator('#v10-roll-burst .v101-die-face')).toHaveText(['16','8','5']);
 expect(errors).toEqual([]);
});
