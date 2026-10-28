'use strict';
/* Desktop v1.0.3: integração real da mestragem sem depender da rede do Godot. */
const { _electron:electron }=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 let client;
 try{
  client=await electron.launch({
   args:['.','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],
   env:{...process.env,MASTERMIND_E2E:'1'},
   timeout:45000
  });
  const win=await client.firstWindow({timeout:30000});
  await win.locator('#screen-master').waitFor({state:'attached'});
  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));
  await win.waitForFunction(()=>document.querySelector('#r11-campaign-status')?.textContent==='Conectado',null,{timeout:30000});
  assert.equal(await win.locator('#r12-host-controls').isVisible(),false,'O botão de ligar servidor do Android ficou no PC');
  const state=await win.evaluate(()=>JSON.parse(window.RpgLocalHost.status()));
  assert.ok(state.running,'Servidor não iniciou automaticamente');
  await win.evaluate(()=>window.RPG_DEMO.navigate('settings'));
  await win.locator('#mastermind-linux-landscape').click();
  assert.equal(await win.evaluate(()=>document.body.classList.contains('mastermind-landscape')),true);
  assert.equal(await win.evaluate(()=>localStorage.getItem('mastermind-linux-landscape-v1')),'true');
  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));

  await win.locator('#r11-name').fill('Mestragem E2E 1.0.3');
  await win.locator('#r11-admin [data-r11="new"]').click();
  await win.locator('#r11-invite').waitFor({state:'attached',timeout:15000});
  const invite=await win.locator('#r11-invite').inputValue();
  const campaignId=await win.locator('#r11-list [data-choose].active').getAttribute('data-choose');
  assert.ok(campaignId&&invite.includes(campaignId));
  const join=await (async()=>{
   const http=require('node:http');
   const u=new URL(invite);
   const url=new URL(u.origin+u.pathname.replace('/join/','/api/join/'));
   const payload=JSON.stringify({nickname:'Jogador E2E Linux'});
   return await new Promise((resolve,reject)=>{
    const req=http.request(url,{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{
     let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({status:res.statusCode,body}));
    });
    req.on('error',reject);req.write(payload);req.end();
   });
  })();
  assert.equal(join.status,201,join.body);
  const readCampaign=()=>win.evaluate(async()=>{
   const s=JSON.parse(window.RpgLocalHost.status());
   const ret=await window.MastermindDesktop.action('campaign-request',{
    base:'http://'+s.ip+':'+s.port,secret:window.RpgLocalHost.masterKey(),
    method:'GET',route:'/api/admin/campaigns/'+document.querySelector('#r11-list [data-choose].active').dataset.choose
   });
   return JSON.parse(ret.body).campaign;
  });
  const details=await readCampaign();
  const player=details.players.find(p=>p.nickname==='Jogador E2E Linux');
  assert.ok(player?.id,'Jogador não registrado');
  await win.locator('#r11-detail [data-r11="refresh"]').click();
  const select=win.locator('#r11-player-'+player.id);
  await select.waitFor({state:'attached'});
  const localKey=await win.evaluate(()=>{
   const c=window.MastermindCharacters.list()[0];
   return 'local:ordem:'+c.id;
  });
  await win.waitForFunction(localKey=>!!document.querySelector('#r11-detail option[value="'+localKey+'"]'),localKey);
  await select.selectOption(localKey);
  await win.locator('[data-r11="assign"][data-player="'+player.id+'"]').click();
  await win.waitForFunction(async playerId=>{
   const s=JSON.parse(window.RpgLocalHost.status());
   const c=document.querySelector('#r11-list [data-choose].active')?.dataset.choose;
   if(!c)return false;
   const resp=await window.MastermindDesktop.action('campaign-request',{
    base:'http://'+s.ip+':'+s.port,secret:window.RpgLocalHost.masterKey(),
    method:'GET',route:'/api/admin/campaigns/'+c
   });
   const data=JSON.parse(resp.body).campaign;
   const p=data.players.find(x=>x.id===playerId);
   return !!(p?.characterId&&data.characters.some(x=>x.id===p.characterId&&x.sheet?.mastermindLocalRef?.startsWith('ordem:')));
  },player.id,{timeout:20000});

  await win.locator('#r11-detail [data-r11="live"]').click();
  await win.locator('.r31-live [data-action="edit"]').waitFor({state:'attached',timeout:15000});
  await win.locator('.r31-live [data-action="edit"]').click();
  await win.locator('.r30-studio .r30-grid').waitFor({state:'attached',timeout:15000});
  const grid=await win.evaluate(()=>{
   const el=document.querySelector('.r30-studio .r30-grid');
   const s=getComputedStyle(el);
   return {display:s.display,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
    background:s.backgroundImage,position:s.position,zIndex:Number(s.zIndex),size:s.backgroundSize};
  });
  assert.ok(grid.display!=='none'&&grid.width>400&&grid.height>300,'Grid invisível: '+JSON.stringify(grid));
  assert.ok(grid.zIndex>=15&&grid.background.includes('linear-gradient'),'Grid encoberto: '+JSON.stringify(grid));
  assert.match(grid.size,/48px/);
  console.log('PASS v1.0.3 Linux: servidor automático, fichas locais, atribuição, grid e modo paisagem');
 }finally{if(client)await client.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
