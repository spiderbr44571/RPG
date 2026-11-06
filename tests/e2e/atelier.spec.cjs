const {test,expect}=require('@playwright/test');
const {start}=require('../runtime/server.cjs');
let server;
test.beforeAll(async()=>server=await start());
test.afterAll(()=>server.stop());

async function montar(page){
 await page.locator('.mm61-overlay [data-mm61="save"]:not([disabled])').waitFor({timeout:20000});
 await page.locator('.mm61-tab',{hasText:'Corpo'}).click();
 await page.locator('.mm61-slot[data-key="rosto"][data-val="redondo"]').click();
 await page.locator('.mm61-sw[data-key="pele"][data-val="#5e3b27"]').click();
 await page.locator('.mm61-tab',{hasText:'Cabeça'}).click();
 await page.locator('.mm61-slot[data-key="cabelo"][data-val="afro"]').click();
 await page.locator('.mm61-tab',{hasText:'Roupa'}).click();
 await page.locator('.mm61-slot[data-key="roupa"][data-val="moletom"]').click();
 await page.locator('.mm61-sw[data-key="roupaCor"][data-val="#7a6a9a"]').click();
 await page.locator('.mm61-overlay [data-mm61="save"]').click();
 await expect(page.locator('.mm61-overlay')).toHaveCount(0);
}

test('Android offline: Ateliê monta o agente e salva retrato e receita na ficha aberta',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8123/demo-offline.html');
 await page.evaluate(()=>window.RPG_DEMO.navigate('sheet'));
 const open=page.locator('#r09-profile .mm61-open');
 await expect(open).toBeVisible();await open.click();
 await montar(page);
 const saved=await page.evaluate(()=>window.MastermindCharacters.selected().character);
 expect(saved.photo).toMatch(/^data:image\/jpeg;base64,/);
 expect(saved.photo.length).toBeLessThan(160000);
 expect(saved.atelie).toMatchObject({rosto:'redondo',cabelo:'afro',roupa:'moletom',roupaCor:'#7a6a9a',pele:'#5e3b27'});
 await expect(page.locator('#r09-profile .r09-portrait img')).toHaveAttribute('src',/^data:image\/jpeg/);
 // reabrir traz a mesma receita
 await page.locator('#r09-profile .mm61-open').click();
 await page.locator('.mm61-overlay [data-mm61="save"]:not([disabled])').waitFor();
 await page.locator('.mm61-tab',{hasText:'Corpo'}).click();
 await expect(page.locator('.mm61-slot[data-key="rosto"][data-val="redondo"]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await expect(page.locator('.mm61-overlay')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('Ateliê: receita estranha é descartada e o rosto redondo fica à frente da roupa',async({page})=>{
 await page.goto('http://127.0.0.1:8123/demo-offline.html');
 const r=await page.evaluate(()=>window.MastermindAtelier.receita({rosto:'<img>',cabelo:'afro',roupaCor:'#123456',pele:'#5e3b27',extra:'x'}));
 expect(r.rosto).toBe('');expect(r.cabelo).toBe('afro');expect(r.roupaCor).toBe('original');expect(r.pele).toBe('#5e3b27');expect(r.extra).toBeUndefined();
 const cat=await page.evaluate(()=>window.MastermindAtelier.load().then(()=>window.MastermindAtelier.catalogo()));
 expect(cat.rosto.find(x=>x.id==='redondo').z).toBe(32);
 expect(cat.cabelo.length).toBe(20);expect(cat.roupa.length).toBe(13);
});

test('Mesa LAN: jogador monta o retrato pelo navegador e o servidor salva na ficha',async({page,context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const u=new URL(server.url);
 await context.addCookies([{name:'rpg_guest',value:'guest-test',domain:u.hostname,path:'/'}]);
 await page.goto(server.url+'/play/test');
 const open=page.locator('#hero .mm61-lan-open');
 await expect(open).toBeVisible();await open.click();
 await montar(page);
 await expect(page.locator('#hero img')).toHaveAttribute('src',/^data:image\/jpeg/);
 const fs=require('node:fs');
 const sheet=JSON.parse(fs.readFileSync(server.dir+'/campanhas-android.json')).campaigns[0].characters[0].sheet;
 expect(sheet.photo).toMatch(/^data:image\/jpeg;base64,/);
 expect(sheet.atelie).toMatchObject({rosto:'redondo',cabelo:'afro',roupa:'moletom'});
 expect(sheet.history).toBe('História preservada');
 expect(errors).toEqual([]);
});

test('Mesa LAN: servidor recusa retrato que não é imagem e receita com texto livre',async()=>{
 const post=body=>fetch(server.url+'/api/play/test/profile',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'rpg_guest=guest-test'},body:JSON.stringify(body)});
 expect((await post({photo:'javascript:alert(1)'})).status).toBe(400);
 expect((await post({photo:'data:image/svg+xml;base64,PHN2Zz4='})).status).toBe(400);
 expect((await post({atelie:{rosto:'<script>'}})).status).toBe(400);
 expect((await post({atelie:{rosto:'redondo',pele:'#5e3b27'}})).status).toBe(200);
 for(const asset of ['/atelier.js','/atelier.css','/atelier-layers.js']){const r=await fetch(server.url+asset);expect(r.status).toBe(200);}
});
