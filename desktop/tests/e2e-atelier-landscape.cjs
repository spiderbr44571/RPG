'use strict';
/* Real packaged Electron smoke test for full-width horizontal layout and
   menu visibility signals used to hide the native Godot WebContentsView. */
const { _electron: electron }=require('@playwright/test');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const executable=path.resolve(process.argv[2]||(process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'));
 assert.ok(fs.existsSync(executable),'Packaged Mastermind missing '+executable);
 let app;
 try{
  app=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage']:['--disable-gpu'],env:{...process.env,MASTERMIND_E2E:'1',MASTERMIND_GODOT_FIXTURE:'black'},timeout:65000});
  const page=await app.firstWindow({timeout:35000});
  // O Ateliê abre pela nova interface, na página de ferramentas; no computador ela ocupa a largura toda.
  await page.waitForFunction(()=>!!window.RV?.tool,null,{timeout:40000});
  await page.evaluate(()=>window.RV.tool('atelier85'));
  await page.waitForURL(/ferramentas\.html#atelier85$/,{timeout:30000});
  await page.locator('#screen-atelier85').waitFor({state:'visible',timeout:30000});
  await page.setViewportSize({width:1900,height:850});
  await page.waitForFunction(()=>document.body.classList.contains('mastermind-landscape'),null,{timeout:15000});
  await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>{
   const content=document.querySelector('.main .content');
   const screen=document.querySelector('.screen.active');
   const a=content.getBoundingClientRect(),s=screen.getBoundingClientRect();
   const dock=document.querySelector('.r09-dock');
   return {width:innerWidth,contentWidth:a.width,screenWidth:s.width,dockVisible:!!dock&&getComputedStyle(dock).display!=='none',
    back:!!document.querySelector('#mmt-back')?.getBoundingClientRect().width};
  });
  assert.ok(geometry.width>=1800,'Expected wide desktop viewport: '+JSON.stringify(geometry));
  assert.ok(geometry.contentWidth>=geometry.width-8,'Landscape content is still capped: '+JSON.stringify(geometry));
  assert.ok(geometry.screenWidth>=geometry.width-60,'Active screen not full width: '+JSON.stringify(geometry));
  assert.equal(geometry.dockVisible,false,'Old menu dock still visible over the Atelier');
  assert.ok(geometry.back,'Back button to the interface missing');
  const notified=await page.evaluate(()=>{let n=0;addEventListener('mastermind:overlay-visibility',()=>n++);dispatchEvent(new Event('mastermind:overlay-visibility'));return n;});
  assert.ok(notified>=1,'Godot compositor signal not delivered');
  console.log('PASS landscape: Atelier at full desktop width, no legacy dock, back button and Godot overlay signal.');
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
