'use strict';
/* Packaged desktop regression test: canvas is empty of implicit connections;
 * only an explicit, two-target action by the master creates a persisted edge.
 */
const {_electron:electron}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const executable=path.resolve(process.argv[2]||(process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'));
 assert.ok(fs.existsSync(executable),'Missing packaged binary '+executable);
 let client;
 try{
  client=await electron.launch({executablePath:executable,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage']:['--disable-gpu'],env:{...process.env,MASTERMIND_E2E:'1'},timeout:60000});
  const win=await client.firstWindow({timeout:45000});
  await win.waitForFunction(()=>!!window.MastermindWorkspace&&!!window.RPG_DEMO?.renderCanvas,null,{timeout:40000});
  await win.evaluate(()=>{
   window.RPG_DEMO.navigate('canvas');
   window.RPG_DEMO.S.nodes=[
    {id:700001,title:'Pista alfa',type:'PISTA',text:'Uma pista sem ligacao',left:90,top:160,theme:''},
    {id:700002,title:'Pista beta',type:'PISTA',text:'Outra pista sem ligacao',left:490,top:160,theme:''}
   ];
   window.RPG_DEMO.renderCanvas();
  });
  await win.waitForTimeout(400);
  assert.equal(await win.locator('#canvas-lines path').count(),0,'Legacy dotted links were generated automatically');
  assert.equal(await win.locator('#mm42-edges .mm43-link-visible').count(),0,'Manual connections appeared without user action');
  await win.locator('#mm42-link-toggle').click();
  for(const id of [700001,700002]){
   await win.locator('#node-layer [data-node="'+id+'"]').dispatchEvent('pointerdown',{pointerId:101,button:0,bubbles:true,pointerType:'mouse',isPrimary:true});
  }
  await win.waitForFunction(()=>window.MastermindWorkspace?.links.length===1,null,{timeout:5000});
  assert.equal(await win.locator('#mm42-edges .mm43-link-visible').count(),1,'Manual line not drawn');
  const snapshot=await win.evaluate(()=>{
   window.MastermindWorkspace.save();
   const board=JSON.parse(localStorage.getItem('mastermind42-board-'+window.MastermindWorkspace.selectedId));
   return {memory:window.MastermindWorkspace.links,stored:board.links,legacy:document.querySelector('#canvas-lines')?.children.length};
  });
  assert.equal(snapshot.memory.length,1);
  assert.equal(snapshot.stored.length,1,'Manually connected line not persisted in campaign board');
  assert.equal(snapshot.legacy,0,'Legacy auto lines came back after saving');
  await win.locator('#mm42-link-toggle').click();
  console.log('PASS: no automatic links; explicit two-card manual connection is visible and persisted.');
 }finally{if(client)await client.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
