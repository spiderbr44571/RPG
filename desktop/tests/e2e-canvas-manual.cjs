'use strict';
/* Packaged desktop regression test for the infinite Canvas of the new interface (revamp/canvas.js):
 * nothing is connected automatically; only an explicit two-item action by the master creates a link,
 * and it is saved in the same board format as before ("mastermind42-board-<id>").
 */
const {_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const executable=path.resolve(process.argv[2]||(process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'));
 assert.ok(fs.existsSync(executable),'Missing packaged binary '+executable);
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'mastermind-canvas-e2e-'));
 let client;
 try{
  client=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage']:['--disable-gpu'],
   env:{...process.env,XDG_CONFIG_HOME:profile,MASTERMIND_E2E:'1'},timeout:60000});
  const win=await client.firstWindow({timeout:45000});
  await win.waitForFunction(()=>!!window.RV?.Canvas,null,{timeout:40000});
  // Um quadro salvo pela versão anterior, com dois cartões e nenhuma ligação.
  await win.evaluate(()=>{
   localStorage.setItem('mastermind42-canvas-index',JSON.stringify({version:1,activeId:'e2e',boards:[{id:'e2e',campaign:'Teste',name:'Quadro E2E'}]}));
   localStorage.setItem('mastermind42-board-e2e',JSON.stringify({version:1,nodes:[
    {id:700001,title:'Pista alfa',type:'PISTA',text:'Uma pista sem ligacao',left:90,top:160,width:260,theme:''},
    {id:700002,title:'Pista beta',type:'PISTA',text:'Outra pista sem ligacao',left:490,top:160,width:260,theme:''}],monsters:[],links:[],view:{panX:0,panY:0,zoom:1}}));
   location.hash='#canvas';
  });
  await win.locator('.cv-item[data-ref="node:700001"]').waitFor({state:'visible',timeout:20000});
  await win.waitForTimeout(300);
  assert.equal(await win.locator('.cv-item').count(),2,'Saved cards were not loaded');
  assert.equal(await win.locator('.cv-line').count(),0,'Links were generated automatically');
  await win.locator('[data-cv-tool="link"].ibtn').click();
  await win.locator('.cv-item[data-ref="node:700001"] h4').click();
  await win.locator('.cv-item[data-ref="node:700002"] h4').click();
  await win.waitForFunction(()=>window.RV.Canvas.state.links.length===1,null,{timeout:5000});
  await win.waitForFunction(()=>document.querySelectorAll('.cv-line').length===1,null,{timeout:15000});
  await win.waitForTimeout(700); // gravação adiada do quadro
  const stored=await win.evaluate(()=>JSON.parse(localStorage.getItem('mastermind42-board-e2e')));
  assert.equal(stored.links.length,1,'Manual link not persisted in the board');
  assert.deepEqual([stored.links[0].a,stored.links[0].b],['node:700001','node:700002']);
  assert.equal(stored.nodes.length,2,'Cards were lost when saving');
  await win.locator('.cv-opt [data-cv-tool="move"]').click();
  console.log('PASS: Canvas da nova interface, sem ligações automáticas; ligação manual visível e salva no mesmo formato.');
 }finally{if(client)await client.close();fs.rmSync(profile,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
