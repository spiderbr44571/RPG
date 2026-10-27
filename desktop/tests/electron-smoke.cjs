'use strict';
/** Desktop headless GUI smoke test: intended for xvfb-run in Ubuntu CI. */
const assert=require('node:assert/strict');
const { _electron }=require('playwright');
(async()=>{
 let launched;
 try{
  launched=await _electron.launch({
   args:['.','--disable-gpu-sandbox','--disable-dev-shm-usage'],
   timeout:45000,
   env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true',MASTERMIND_CI_TEST:'1'}
  });
  const page=await launched.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(()=>!!window.MastermindDesktop&&!!window.RPG_DEMO&&
       !!document.querySelector('.desktop-gm-panel'),null,{timeout:18000});
  assert.equal(await page.evaluate(()=>window.MastermindDesktop.version),'1.0.2');
  await page.evaluate(()=>window.RPG_DEMO.navigate('master'));
  const localStatus=await page.evaluate(()=>window.MastermindDesktop.action('gm-status'));
  assert.equal(localStatus.active,false);
  const start=await page.evaluate(()=>window.MastermindDesktop.action('gm-start'));
  assert.equal(start.active,true,'Native LAN server failed to start');
  assert.ok(start.url.includes('/master')&&start.key.length>20);
  const status=await page.evaluate(()=>window.MastermindDesktop.action('gm-status'));
  assert.equal(status.active,true,'GM status IPC denied after #master navigation');
  const api=await fetch('http://127.0.0.1:'+start.port+'/api/admin/campaigns',{
   headers:{Authorization:'Bearer '+start.key}});
  assert.equal(api.status,200,'GM server unavailable outside Electron process');
  await page.evaluate(()=>window.RPG_DEMO.navigate('atelier85'));
  const action=await page.evaluate(()=>window.MastermindDesktop.action('gm-status'));
  assert.equal(action.active,true,'App hash #atelier85 should not deny native IPC');
  const noGame=await page.evaluate(()=>window.MastermindDesktop.action('godot-bounds',{visible:false}));
  assert.equal(noGame,true,'Godot bounds handler should respond to trusted IPC');
  await page.evaluate(()=>window.MastermindDesktop.action('gm-stop'));
  console.log('PASS Electron/Xvfb: native desktop starts, GM LAN server works, hash navigation allows IPC, Godot bridge responds');
 }catch(e){console.error('FAIL Electron desktop GUI smoke:',e);process.exitCode=1;}
 finally{if(launched)await launched.close().catch(console.error);}
})();
