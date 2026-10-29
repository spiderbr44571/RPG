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
  await page.locator('#screen-settings').waitFor({state:'attached',timeout:35000});
  await page.evaluate(()=>window.RPG_DEMO.navigate('settings'));
  const toggle=page.locator('#mastermind-linux-landscape');
  await toggle.waitFor({state:'visible',timeout:10000});
  if(await toggle.getAttribute('aria-pressed')!=='true')await toggle.click();
  await page.setViewportSize({width:1900,height:850});
  await page.waitForTimeout(500);
  const geometry=await page.evaluate(()=>{
   const content=document.querySelector('.main .content');
   const screen=document.querySelector('.screen.active');
   const d=document.querySelector('.r09-dock');
   const a=content.getBoundingClientRect(),s=screen.getBoundingClientRect(),dock=d.getBoundingClientRect();
   return {width:innerWidth,contentWidth:a.width,screenWidth:s.width,contentX:a.x,screenX:s.x,
    paddingBottom:getComputedStyle(content).paddingBottom,appHeight:document.querySelector('.app').getBoundingClientRect().height,
    screenHeight:innerHeight,dockX:dock.x};
  });
  assert.ok(geometry.width>=1800,'Expected wide desktop viewport: '+JSON.stringify(geometry));
  assert.ok(geometry.contentWidth>=geometry.width-8,'Landscape content is still 1450px capped: '+JSON.stringify(geometry));
  assert.ok(geometry.screenWidth>=geometry.width-10,'Active screen not full width: '+JSON.stringify(geometry));
  assert.equal(geometry.paddingBottom,'0px','Old mobile navigation left a dead footer in landscape');
  assert.ok(geometry.dockX>geometry.width*.7,'Home menu should not block the middle of landscape screen');
  await page.evaluate(()=>{window.RPG_DEMO.navigate('atelier85');window.__atelierOverlayNotifications=0;window.addEventListener('mastermind:overlay-visibility',()=>window.__atelierOverlayNotifications++);});
  await page.locator('#r09-dice').click();
  assert.equal(await page.locator('#r09-overlay').evaluate(el=>el.classList.contains('open')),true,'Menu did not open');
  await page.locator('#r09-overlay .r09-close').click();
  assert.equal(await page.locator('#r09-overlay').evaluate(el=>el.classList.contains('open')),false,'Menu did not close');
  const notifications=await page.evaluate(()=>window.__atelierOverlayNotifications);
  assert.ok(notifications>=2,'Godot compositor not notified on opening and closing: '+notifications);
  console.log('PASS landscape: full desktop width without footer padding, menu closed/opened, Godot overlay visibility signalled.');
 }finally{if(app)await app.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
