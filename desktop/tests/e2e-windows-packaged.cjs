'use strict';
/* Real Windows x64 ELECTRON.exe smoke test. Runs AFTER electron-builder, so a
 * missing HTML, Godot bridge, local Java or campaign assets blocks publication.
 */
const { _electron: electron }=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
 const executable=path.resolve('dist/win-unpacked/Mastermind.exe');
 assert.ok(fs.existsSync(executable),'Executavel Windows nao gerado: '+executable);
 let client;
 try{
  client=await electron.launch({
   executablePath:executable,
   args:['--disable-gpu','--no-sandbox'],
   env:{...process.env,MASTERMIND_E2E:'1',ELECTRON_DISABLE_SECURITY_WARNINGS:'true'},
   timeout:60000
  });
  const win=await client.firstWindow({timeout:45000});
  // v1.4.0: abre a nova interface; a interface clássica foi retirada.
  await win.locator('#canvas-v').waitFor({state:'attached',timeout:45000});
  await win.waitForFunction(()=>!!window.RV?.Canvas&&!!window.RV?.tool,null,{timeout:30000});
  const ready=await win.evaluate(()=>({
   url:location.href,
   win:window.MastermindDesktop?.platform,
   inApp:window.RV.inApp,
   host:!!window.RV.Net?.canHost(),
   desktopBridge:!!window.RpgLocalHost
  }));
  assert.ok(ready.url.startsWith('file:')&&ready.url.includes('/resources/server/assets/revamp/index.html'),'Interface Windows nao abriu: '+JSON.stringify(ready));
  assert.equal(ready.win,'win32','Bridge nao detectou Windows: '+JSON.stringify(ready));
  assert.ok(ready.inApp&&ready.host&&ready.desktopBridge,'Interface Windows incompleta: '+JSON.stringify(ready));

  // Mestragem: liga o servidor Java 17 local pela nova interface.
  await win.evaluate(()=>{location.hash='#mestragem'});
  await win.locator('#mest-grid [data-m="start"]').click({timeout:30000});
  await win.waitForFunction(()=>window.RV.Net.host()?.running===true,null,{timeout:55000});
  const status=await win.evaluate(()=>JSON.parse(window.RpgLocalHost.status()));
  assert.ok(status.running&&status.port>=1024,'Java Windows nao iniciou: '+JSON.stringify(status));
  await win.locator('#mest-grid [data-m="stop"]').waitFor({state:'visible',timeout:30000});

  // Canvas infinito e ferramentas (ficha completa e Ateliê).
  await win.evaluate(()=>{location.hash='#canvas'});
  await win.locator('#canvas-v .cv-stage').waitFor({state:'visible',timeout:15000});
  await win.evaluate(()=>window.RV.tool('atelier85'));
  await win.waitForURL(/\/resources\/server\/assets\/ferramentas\.html#atelier85$/,{timeout:20000});
  await win.locator('#screen-atelier85 #ma99-atelier').waitFor({state:'attached',timeout:30000});
  const tools=await win.evaluate(()=>({sheet:!!document.querySelector('#screen-sheet'),navigate:typeof window.RPG_DEMO?.navigate,
   back:document.querySelector('#mmt-back')?.getAttribute('href')||''}));
  assert.ok(tools.sheet&&tools.navigate==='function'&&tools.back.includes('revamp/index.html'),'Ferramentas incompletas no Windows: '+JSON.stringify(tools));
  await win.locator('#mmt-back').click();
  await win.waitForURL(/\/revamp\/index\.html#canvas$/,{timeout:20000});
  console.log('PASS Windows: nova interface instalada, Mestragem com Java 17 local, Canvas, Atelie e ficha completa.');
 }finally{
  if(client)await client.close();
 }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
