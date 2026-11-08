'use strict';
/* Desktop (Linux): Mestragem da nova interface com o servidor Java local de verdade —
 * ligar o servidor, criar campanha, convite, jogador entrando pela rede, ficha do aparelho
 * levada para a campanha e atribuída ao jogador, e a Mesa ao vivo abrindo o cenário.
 */
const { _electron:electron }=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mastermind-mestragem-e2e-'));
 let client;
 try{
  client=await electron.launch({
   args:['.','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],
   env:{...process.env,XDG_CONFIG_HOME:profile,MASTERMIND_E2E:'1'},
   timeout:45000
  });
  const win=await client.firstWindow({timeout:30000});
  await win.waitForFunction(()=>!!window.RV?.Net&&!!window.RV?.Sheets,null,{timeout:30000});
  assert.equal(await win.evaluate(()=>window.RV.Net.canHost()),true,'O desktop deveria poder hospedar a mesa');

  // Perfil limpo: uma ficha de D&D salva neste aparelho (mesma chave das fichas do app).
  await win.evaluate(()=>{if(!window.RV.Sheets.list().length)localStorage.setItem('rpg-dnd5e-characters-v1',JSON.stringify([{id:'e2e-dnd',name:'Agente E2E',level:1,className:'Guerreiro'}]))});
  await win.evaluate(()=>{location.hash='#mestragem'});
  await win.locator('#mest-grid [data-m="start"]').click({timeout:20000});
  try{
   await win.waitForFunction(()=>window.RV.Net.host()?.running===true,null,{timeout:50000});
  }catch(error){
   console.error('Mastermind servidor diagnóstico:',await win.evaluate(()=>({local:window.RpgLocalHost?.status?.(),platform:window.MastermindDesktop?.platform})));
   throw error;
  }
  await win.locator('#mest-grid [data-m="stop"]').waitFor({state:'visible',timeout:20000});

  // Campanha nova
  await win.locator('#mest-grid [data-m-form="create"] input[name="name"]').fill('Mestragem E2E');
  await win.locator('#mest-grid [data-m-form="create"] button[type="submit"]').click();
  const inviteBtn=win.locator('#mest-grid [data-copy*="/join/"]').first();
  await inviteBtn.waitFor({state:'attached',timeout:20000});
  const invite=await inviteBtn.getAttribute('data-copy');
  assert.match(invite,/^http:\/\/[^/]+\/join\/[^/]+\/[^/]+$/,'Convite inválido: '+invite);
  assert.ok(await win.locator('#mest-grid [data-copy*="/v2/join/"]').count(),'Convite para navegador ausente');

  // Jogador entra pela rede local
  const u=new URL(invite);
  const payload=JSON.stringify({nickname:'Jogador E2E Linux'});
  const join=await new Promise((resolve,reject)=>{
   const req=http.request(new URL(u.origin+u.pathname.replace('/join/','/api/join/')),{method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}},res=>{
    let body='';res.on('data',part=>body+=part);res.on('end',()=>resolve({status:res.statusCode,body}));
   });
   req.on('error',reject);req.write(payload);req.end();
  });
  assert.equal(join.status,201,join.body);
  const campaignId=u.pathname.split('/')[2];
  const readCampaign=()=>win.evaluate(async id=>{
   const s=JSON.parse(window.RpgLocalHost.status());
   const ret=await window.MastermindDesktop.action('campaign-request',{base:'http://'+s.ip+':'+s.port,secret:window.RpgLocalHost.masterKey(),method:'GET',route:'/api/admin/campaigns/'+id});
   return JSON.parse(ret.body).campaign;
  },campaignId);
  const player=(await readCampaign()).players.find(p=>p.nickname==='Jogador E2E Linux');
  assert.ok(player?.id,'Jogador não registrado');
  await win.evaluate(()=>{location.hash='#inicio'});
  await win.evaluate(()=>{location.hash='#mestragem'});
  const assign=win.locator('#mest-grid [data-m-assign="'+player.id+'"]');
  await assign.waitFor({state:'attached',timeout:20000});

  // Ficha deste aparelho levada para a campanha e atribuída ao jogador
  const hasLocal=await win.evaluate(()=>window.RV.Sheets.list().length);
  assert.ok(hasLocal>0,'Nenhuma ficha neste aparelho para levar à campanha');
  await win.locator('#mest-grid [data-m="add-sheet"]').click();
  await win.waitForFunction(()=>document.querySelector('#mest-grid [data-m-assign] option[value]:not([value=""])'),null,{timeout:20000});
  const characterId=await assign.locator('option:not([value=""])').first().getAttribute('value');
  await assign.selectOption(characterId);
  let assigned=false;
  for(let i=0;i<40&&!assigned;i++){
   const c=await readCampaign();
   assigned=c.players.find(p=>p.id===player.id)?.characterId===characterId;
   if(!assigned)await win.waitForTimeout(500);
  }
  assert.ok(assigned,'Ficha não foi atribuída ao jogador no servidor');

  // Mesa ao vivo
  await win.evaluate(()=>{location.hash='#mesa'});
  await win.locator('[data-view="mesa"] canvas').first().waitFor({state:'visible',timeout:20000});
  console.log('PASS Linux: Mestragem da nova interface com servidor local, convite, jogador, ficha atribuída e mesa ao vivo');
 }finally{if(client)await client.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
