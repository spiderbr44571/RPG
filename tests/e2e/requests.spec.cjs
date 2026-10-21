const {test,expect}=require('@playwright/test');
const {start}=require('../runtime/server.cjs');
let server;
test.beforeEach(async()=>server=await start());test.afterEach(()=>server.stop());
async function api(path,body,master=false){const r=await fetch(server.url+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(master?{Authorization:'Bearer master-test'}:{Cookie:'rpg_guest=guest-test'})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
const player=(path,body)=>api('/api/play/test'+path,body);
const gm=(path,body)=>api('/api/admin/campaigns/test'+path,body,true);
async function choose(name){const r=await player('/power-requests',{type:'transcend',name});expect(r.status).toBe(200);expect((await gm('/power-request',{id:r.data.request.id,action:'approve'})).status).toBe(200);}
async function surto(){await choose('Encarar a Morte');await choose('Potencial Aprimorado');await choose('Surto Temporal');}
test('progression: NEX, prerequisites, GM-only approval, SAN, duplicate/rejection and durable records',async()=>{
 expect((await player('/power-requests',{type:'transcend',name:'Surto Temporal'})).status).toBe(400);
 let r=await player('/power-requests',{type:'class',name:'Golpe Pesado'});expect(r.status).toBe(200);
 expect((await api('/api/admin/campaigns/test/power-request',{id:r.data.request.id,action:'approve'})).status).toBe(403);
 expect((await gm('/power-request',{id:r.data.request.id,action:'reject'})).status).toBe(200);
 expect((await player('')).data.character.powers).toEqual([]);
 await surto();const sheet=(await player('')).data.character;
 expect(sheet.powerChoices.map(x=>x.nex)).toEqual([15,30,45]);expect(sheet.resources.SAN.max).toBe(27);
 expect(sheet.history).toBe('História preservada');expect(sheet.inventory[0].name).toBe('Item preservado');
 expect((await player('/power-requests',{type:'class',name:'Golpe Pesado'})).status).toBe(400);
 const fs=require('node:fs');const saved=JSON.parse(fs.readFileSync(server.dir+'/campanhas-android.json'));expect(saved.campaigns[0].characters[0].sheet.powerChoices).toHaveLength(3);
});
test('Surto: spends exactly 3 PE, consumes once, cannot reuse in scene; new scene resets',async()=>{
 await surto();let r=await player('/power-requests',{type:'surto'});
 expect((await player('')).data.character.resources.PE.current).toBe(12);
 expect((await gm('/power-request',{id:r.data.request.id,action:'approve'})).status).toBe(200);
 expect((await player('')).data.character.resources.PE.current).toBe(9);
 expect((await player('/scenario')).data.bonusActions).toBe(1);
 expect((await player('/consume-bonus',{})).status).toBe(200);
 expect((await player('/consume-bonus',{})).status).toBe(400);
 expect((await player('/power-requests',{type:'surto'})).status).toBe(400);
 await gm('/advance',{kind:'scene'});await gm('/initiative',{action:'set',tokenId:'t1',score:20});
 expect((await player('/power-requests',{type:'surto'})).status).toBe(200);
});
test('full turn is explicit GM variant; ordinary extra actions expire on next turn',async()=>{
 await surto();let r=await player('/power-requests',{type:'surto'});
 await gm('/power-request',{id:r.data.request.id,action:'approve',fullTurn:true});
 expect((await player('/scenario')).data.bonusActions).toBe(0);
 expect((await gm('/initiative',{action:'next'})).data.extraTurn).toBe(true);
 expect((await player('/scenario')).data.initiative.activeId).toBe('t1');
 await gm('/initiative',{action:'next'});expect((await player('/scenario')).data.initiative.activeId).toBe('t2');
 await gm('/advance',{kind:'scene'});await gm('/initiative',{action:'set',tokenId:'t1',score:20});await gm('/initiative',{action:'set',tokenId:'t2',score:10});
 r=await player('/power-requests',{type:'surto'});await gm('/power-request',{id:r.data.request.id,action:'approve'});
 await gm('/initiative',{action:'next'});expect((await player('/scenario')).data.bonusActions).toBe(0);
 expect((await player('/consume-bonus',{})).status).toBe(400);
});
test('pass/delay require approval, reject stale request even after active token returns',async()=>{
 let r=await player('/power-requests',{type:'delay',targetId:'t2'});expect(r.status).toBe(200);
 expect((await player('/scenario')).data.initiative.activeId).toBe('t1');
 await gm('/power-request',{id:r.data.request.id,action:'approve'});
 expect((await player('/scenario')).data.initiative.entries.map(x=>x.tokenId)).toEqual(['t2','t1']);
 expect((await player('/power-requests',{type:'pass'})).status).toBe(400);
 await gm('/initiative',{action:'next'});r=await player('/power-requests',{type:'pass'});
 await gm('/initiative',{action:'next'});await gm('/initiative',{action:'next'});
 expect((await gm('/power-request',{id:r.data.request.id,action:'approve'})).status).toBe(400);
 await gm('/power-request',{id:r.data.request.id,action:'reject'});
 r=await player('/power-requests',{type:'pass'});await gm('/power-request',{id:r.data.request.id,action:'approve'});
 expect((await player('/scenario')).data.initiative.activeId).toBe('t2');
});
test('browser power request and GM approval synchronize without reloading',async({page,context})=>{
 await context.addCookies([{name:'rpg_guest',value:'guest-test',url:server.url}]);await page.goto(server.url+'/play/test');
 await page.locator('[data-tab="powers"]').click();await page.locator('[data-v55-select="Encarar a Morte"]').click();await page.locator('#v55-request-power').click();
 await expect(page.locator('.v55-pending')).toContainText('Encarar a Morte');
 const pending=(await player('/power-requests')).data.requests[0];await gm('/power-request',{id:pending.id,action:'approve'});
 await expect(page.locator('.v55-progress')).toContainText('NEX 15%');
 await expect(page.locator('.v55-pending')).toHaveCount(0);await expect(page.locator('.v55-budget')).toContainText('2 escolhas disponíveis');
});
test('live player requests Surto and master approves through the actual tabletop controls',async({page,context,browser})=>{
 await surto();await context.addCookies([{name:'rpg_guest',value:'guest-test',url:server.url}]);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.url+'/scene/test');
 await expect(page.locator('#hero-name')).toHaveText('Agente Teste');
 await page.locator('#r54-toggle').click();await page.locator('[data-r54-action="actions"]').click();
 await page.locator('#v55-delay-target').selectOption('t2');
 await page.evaluate(()=>MastermindPowerUI.renderTurns());
 await expect(page.locator('#v55-delay-target')).toHaveValue('t2');
 await page.locator('[data-v55-turn="surto"]').click();
 const master=await browser.newPage();master.on('pageerror',e=>errors.push(e.message));await master.goto(server.url+'/master');
 await master.locator('#key').fill('master-test');await master.locator('#sign').click();await master.locator('[data-camp="test"]').click();
 await master.locator('[data-act="live"]').click();
 await expect(master.locator('[data-r55-decision="approve"]')).toBeVisible();await master.locator('[data-r55-decision="approve"]').click();
 await expect(page.locator('.v55-bonus')).toContainText('1 ação');await page.locator('[data-v55-turn="consume"]').click();
 await expect(page.locator('.v55-bonus')).toHaveCount(0);
 expect(errors).toEqual([]);await page.screenshot({path:'test-results/live-mobile.png'});await master.close();
});
test('switching to interlude invalidates pending turn requests even when combat resumes',async()=>{
 const r=await player('/power-requests',{type:'pass'});
 await gm('/session-mode',{mode:'interlude'});await gm('/session-mode',{mode:'combat'});
 expect((await gm('/power-request',{id:r.data.request.id,action:'approve'})).status).toBe(400);
 expect((await player('/scenario')).data.initiative.activeId).toBe('t1');
});
