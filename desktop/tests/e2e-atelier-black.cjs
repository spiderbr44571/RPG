'use strict';
/* The Godot page may load HTML while its WebGL canvas stays black.
 * Only enable the E2E fixture when MASTERMIND_E2E=1.
 * This verifies the error is visible and recovery controls are actionable
 * in the actual packaged application, without dependence on itch.io uptime.
 */
const { _electron:electron }=require('@playwright/test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
(async()=>{
 const binary=path.resolve(process.argv[2]||(
  process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'
 ));
 assert.ok(fs.existsSync(binary),'Mastermind empacotado nao existe: '+binary);
 let client;
 try{
  client=await electron.launch({
   executablePath:binary,
   args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']:['--disable-gpu'],
   env:{...process.env,MASTERMIND_E2E:'1',MASTERMIND_GODOT_FIXTURE:'black'},
   timeout:60000
  });
  const win=await client.firstWindow({timeout:40000});
  await win.locator('#screen-atelier85').waitFor({state:'attached'});
  await win.evaluate(()=>window.RPG_DEMO.navigate('atelier85'));
  const stage=win.locator('#p90-native-stage');
  await stage.waitFor({state:'visible',timeout:30000});
  const tools=win.locator('.desktop-godot-tools');
  await tools.getByRole('button',{name:'◈ Compatibilidade'}).waitFor({state:'visible'});
  await tools.getByRole('button',{name:'↗ Navegador'}).waitFor({state:'visible'});
  await win.waitForFunction(()=>{
   const el=document.querySelector('#p90-native-stage .p90-stage-placeholder');
   return el?.classList.contains('desktop-godot-error')&&
    el.querySelector('strong')?.textContent==='O criador não conseguiu carregar';
  },null,{timeout:25000});
  const message=await stage.locator('.p90-stage-placeholder small').textContent();
  assert.match(message,/Compatibilidade|Navegador/);
  assert.ok(!message.includes('Editor Godot carregado'),'Uma tela preta foi marcada como sucesso');
  console.log('PASS Atelie: tela preta real do WebContentsView detectada, aviso visivel e botoes de recuperacao presentes.');
 }finally{if(client)await client.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
