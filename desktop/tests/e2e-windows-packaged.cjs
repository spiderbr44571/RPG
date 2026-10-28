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
  await win.locator('#screen-master').waitFor({state:'attached',timeout:45000});
  await win.locator('.desktop-titlebar').waitFor({state:'visible',timeout:30000});
  const ready=await win.evaluate(()=>({
   url:location.href,
   win:window.MastermindDesktop?.platform,
   logo:!!document.querySelector('.desktop-titlebar-brand img')?.naturalWidth,
   hasAtelier:!!document.querySelector('#screen-atelier85 #p90-native-stage'),
   hasCanvas:!!document.querySelector('#screen-master'),
   hasSheet:!!document.querySelector('#screen-sheet'),
   desktopBridge:!!window.RpgLocalHost,
   navigate:typeof window.RPG_DEMO?.navigate,
   brand:document.querySelector('.desktop-titlebar-brand')?.textContent
  }));
  assert.ok(ready.url.startsWith('file:')&&ready.url.includes('/resources/server/assets/demo-offline.html'),'HTML Windows nao abriu: '+JSON.stringify(ready));
  assert.equal(ready.win,'win32','Bridge nao detectou Windows: '+JSON.stringify(ready));
  assert.ok(ready.logo&&ready.hasAtelier&&ready.hasCanvas&&ready.hasSheet&&ready.desktopBridge&&ready.navigate==='function','Interface Windows incompleta: '+JSON.stringify(ready));
  assert.ok(ready.brand.includes('WINDOWS'),'Rotulo nao foi adaptado: '+JSON.stringify(ready));

  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));
  await win.waitForFunction(()=>document.querySelector('#r11-campaign-status')?.textContent==='Conectado',null,{timeout:55000});
  const status=await win.evaluate(()=>JSON.parse(window.RpgLocalHost.status()));
  assert.ok(status.running&&status.port>=1024,'Java Windows nao iniciou: '+JSON.stringify(status));
  assert.equal(await win.locator('#r12-host-controls').isVisible(),false,'Controles exclusivos do celular ainda aparecem no Windows');
  await win.evaluate(()=>window.RPG_DEMO.navigate('settings'));
  await win.locator('#mastermind-linux-landscape').click();
  assert.ok(await win.evaluate(()=>document.body.classList.contains('mastermind-landscape')),'Modo paisagem nao funciona no Windows');
  await win.evaluate(()=>window.RPG_DEMO.navigate('master'));
  const sheetCount=await win.locator('#mastermind-linux-local-sheets .desktop-sheets-count').textContent();
  assert.ok(sheetCount&&sheetCount.includes('ficha(s)'),'Fichas locais nao foram expostas: '+sheetCount);
  console.log('PASS Windows: interface instalada, logo, Atelie, fichas, paisagem, Java 17 e mestragem local.');
 }finally{
  if(client)await client.close();
 }
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
