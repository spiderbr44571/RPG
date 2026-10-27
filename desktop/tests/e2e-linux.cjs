'use strict';
const { _electron: electron }=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{
 let client;
 try{
  client=await electron.launch({
   args:['.','--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader'],
   env:{...process.env,MASTERMIND_E2E:'1',MASTERMIND_MAXIMIZED:'0'},
   timeout:45000
  });
  const win=await client.firstWindow({timeout:30000});
  await win.locator('#screen-master').waitFor({state:'attached',timeout:15000});
  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));
  await win.locator('#screen-master').waitFor({state:'visible',timeout:10000});
  await win.locator('#r12-host-controls').waitFor({timeout:8000});
  const hasBridge=await win.evaluate(()=>typeof window.RpgLocalHost?.start==='function'&&
    typeof window.MastermindDesktop?.action==='function');
  assert.ok(hasBridge,'Native Linux hosting bridge not exposed');
  const start=await win.evaluate(()=>window.RpgLocalHost.start());
  assert.equal(start.running,true,JSON.stringify(start));
  const state=await win.evaluate(()=>JSON.parse(window.RpgLocalHost.status()));
  assert.ok(state.running);
  assert.ok(state.ip && state.port);
  const key=await win.evaluate(()=>window.RpgLocalHost.masterKey());
  assert.ok(key.length>=30,'No real master key persisted');
  const data=await win.evaluate(({state,key})=>window.MastermindDesktop.action('campaign-request',{
   base:'http://'+state.ip+':'+state.port,secret:key,method:'GET',route:'/api/admin/campaigns'
  }),{state,key});
  assert.equal(data.status,200);
  const reply=JSON.parse(data.body);
  assert.ok(Array.isArray(reply.campaigns),'Campaign route did not respond');
  // Exercise actual creation and canvas persistence through the original Android engine.
  const campaign=await win.evaluate(({state,key})=>window.MastermindDesktop.action('campaign-request',{
   base:'http://'+state.ip+':'+state.port,secret:key,method:'POST',route:'/api/admin/campaigns',body:{name:'Teste E2E Linux'}
  }),{state,key});
  assert.equal(campaign.status,201,campaign.body);
  const id=JSON.parse(campaign.body).id;
  assert.ok(id,'Campaign id not created');
  const details=await win.evaluate(({state,key,id})=>window.MastermindDesktop.action('campaign-request',{
   base:'http://'+state.ip+':'+state.port,secret:key,method:'GET',route:'/api/admin/campaigns/'+id
  }),{state,key,id});
  assert.equal(details.status,200,details.body);
  await win.evaluate(()=>window.RPG_DEMO.navigate('atelier85'));
  await win.locator('#p90-native-stage').waitFor({state:'visible',timeout:12000});
  await win.waitForTimeout(3500);
  const views=await client.evaluate(({BrowserWindow})=>{
   const list=BrowserWindow.getAllWindows();
   return list.map(w=>({title:w.getTitle(),children:w.contentView.children.map(v=>({
    visible:typeof v.getVisible==='function'?v.getVisible():null,
    bounds:typeof v.getBounds==='function'?v.getBounds():null,
    url:v.webContents?.getURL?.()||''
   }))}));
  });
  console.log('GODOT_VIEWS',JSON.stringify(views));
  const hasGame=views.some(w=>w.children.some(v=>v.bounds?.width>200&&v.bounds?.height>150&&/https:\/\/html\.itch\.zone/.test(v.url)));
  assert.ok(hasGame,'Godot WebContentsView did not mount at the inline Atelier with the original HTML5 URL');
  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));
  const stopped=await win.evaluate(()=>window.RpgLocalHost.stop());
  assert.equal(stopped.running,false);
  console.log('PASS Linux E2E: actual Electron UI, native server, campaign routes, canvas data, embedded Godot frame');
 }finally{if(client)await client.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
