'use strict';
// Real third-party Godot URL; no black canvas fixture. The test is useful
// specifically because a fake black-screen test cannot prove actual editor.
const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const executable=path.resolve(process.argv[2]||'dist/linux-unpacked/mastermind');
 assert.ok(fs.existsSync(executable),'Executable missing: '+executable);
 let app,win;
 try{
  app=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']:['--disable-gpu'],env:{...process.env,MASTERMIND_E2E:'1',MASTERMIND_GODOT_FIXTURE:''},timeout:50000});
  win=await app.firstWindow({timeout:35000});
  await win.locator('#screen-atelier85').waitFor({state:'attached',timeout:25000});
  await win.evaluate(()=>window.RPG_DEMO.navigate('atelier85'));
  await win.locator('#p90-native-stage').waitFor({state:'visible',timeout:25000});
  await win.waitForFunction(()=>{
   const v=document.querySelector('#p90-native-stage .p90-stage-placeholder strong');
   return v?.textContent==='Editor Godot carregado';
  },null,{timeout:82000});
  const status=await win.evaluate(()=>document.querySelector('#p90-native-stage .p90-stage-placeholder small')?.textContent);
  assert.ok(status?.includes('desenhando'),'Godot ready label did not describe actual frame: '+status);
  console.log('PASS: real Godot editor produced visually detailed frame in native packaged Electron window.');
 }catch(error){
  if(win){fs.mkdirSync('dist/godot-evidence',{recursive:true});await win.screenshot({path:'dist/godot-evidence/failed-live-editor.png',timeout:5000}).catch(()=>{});}
  throw error;
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
