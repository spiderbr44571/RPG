'use strict';
/* Electron empacotado: o Ateliê em camadas abre offline, desenha o personagem,
 * esconde o cabelo de trás sob o moletom e grava retrato e token na ficha. */
const { _electron:electron }=require('@playwright/test');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {checarEncaixe}=require('../../tests/atelie_encaixe_checagens.cjs');
(async()=>{
 const binary=path.resolve(process.argv[2]||(process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'));
 assert.ok(fs.existsSync(binary),'Mastermind empacotado nao existe: '+binary);
 let client;
 try{
  client=await electron.launch({executablePath:binary,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']:['--disable-gpu'],env:{...process.env,MASTERMIND_E2E:'1'},timeout:60000});
  const win=await client.firstWindow({timeout:40000});
  // O Ateliê abre pela nova interface, na página de ferramentas.
  await win.waitForFunction(()=>!!window.RV?.tool,null,{timeout:40000});
  await win.evaluate(()=>window.RV.tool('atelier85'));
  await win.waitForURL(/ferramentas\.html#atelier85$/,{timeout:30000});
  const errors=[];win.on('pageerror',e=>errors.push(e.message));
  await win.locator('#screen-atelier85').waitFor({state:'attached',timeout:40000});
  await win.evaluate(()=>window.RPG_DEMO.navigate('atelier85'));
  await win.locator('#ma99-atelier.ma99-ready').waitFor({state:'attached',timeout:30000});
  assert.equal(await win.locator('#p90-native-stage').count(),0,'Tela do lyime ainda presente');
  const painted=await win.evaluate(async()=>{
   const A=window.MastermindAtelier99;await A.ready();
   A.set(Object.assign(A.state(),{cabelo:'longo',roupa:'moletom',cabeloCor:'#7a1820'}));
   const c=document.getElementById('ma99-token'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n/(c.width*c.height);
  });
  assert.ok(painted>.15,'Personagem nao desenhado: '+painted);
  const encaixe=await win.evaluate(checarEncaixe);
  assert.deepEqual(encaixe.erros,[],'Encaixe do Atelie no app empacotado:\n - '+encaixe.erros.join('\n - '));
  const saved=await win.evaluate(()=>{
   const C=window.MastermindCharacters;if(!C?.selectedId?.())return {skip:true};
   window.MastermindAtelier99.save();const ch=C.selected().character;
   return {source:ch.portraitEditor?.source,photo:(ch.photo||'').length,token:(ch.tokenImage||'').length,recipe:ch.portraitEditor?.recipe?.roupa};
  });
  if(!saved.skip){
   assert.equal(saved.source,'mastermind-atelie-camadas');
   assert.ok(saved.photo>10000&&saved.photo<1800000,'Retrato invalido '+saved.photo);
   assert.ok(saved.token>10000&&saved.token<1200000,'Token invalido '+saved.token);
   assert.equal(saved.recipe,'moletom');
  }
  assert.deepEqual(errors,[],'Erros na pagina: '+errors.join(' | '));
  console.log('PASS Atelie em camadas: desenho offline ('+Math.round(painted*100)+'% da tela), rostos/olhos/barba encaixados em '+encaixe.desenhos+' combinacoes, '+(saved.skip?'sem ficha selecionada':'retrato e token gravados na ficha')+'.');
 }finally{if(client)await client.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
