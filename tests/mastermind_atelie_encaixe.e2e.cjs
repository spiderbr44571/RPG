'use strict';
/* Encaixe das peças do Ateliê medido em pixels num Chromium real (sem rede):
 * rostos sem o rosto padrão aparecendo por baixo, olhos do Jovem limpos, Redondo sem sobras na
 * gola e barba cheia encaixada no rosto. Uso: node tests/mastermind_atelie_encaixe.e2e.cjs
 * (MASTERMIND_LAYERS=caminho testa outro arquivo de camadas). */
const path=require('node:path'),fs=require('node:fs'),os=require('node:os'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('@playwright/test'));}catch{({chromium}=require('playwright'));}
const {checarEncaixe}=require('./atelie_encaixe_checagens.cjs');
const assets=path.join(__dirname,'..','app/src/main/assets');
const layers=path.resolve(process.env.MASTERMIND_LAYERS||path.join(assets,'mastermind99_atelier_layers.js'));
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atelie-encaixe-'));
 const url=f=>'file://'+f.split(path.sep).join('/');
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><div id="ma99-atelier"><div id="ma99-stage"><canvas id="ma99-token" width="880" height="1720"></canvas></div>'+
  '<div id="ma99-stagebar"></div><div id="ma99-chips"></div><div id="ma99-tabs"></div><div id="ma99-panel"></div><div id="ma99-presets"></div><div id="ma99-status"></div></div>'+
  '<script src="'+url(layers)+'"></script><script src="'+url(path.join(assets,'mastermind99_atelier.js'))+'"></script>');
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));
  await page.route(/^https?:/,r=>r.abort()); // offline
  await page.goto(url(path.join(dir,'index.html')));
  await page.waitForFunction(()=>window.MastermindAtelier99,null,{timeout:30000});
  const r=await page.evaluate(checarEncaixe);
  console.log(JSON.stringify({rostos:r.rostos,olhosJovem:r.olhosJovem,redondoAbaixoDoQueixo:r.redondoAbaixoDoQueixo,barba:r.barba,desenhos:r.desenhos}));
  assert.deepEqual(erros,[],'Erros na página: '+erros.join(' | '));
  assert.deepEqual(r.erros,[],'Encaixe do Ateliê:\n - '+r.erros.join('\n - '));
  assert.equal(r.desenhos,54);
  console.log('PASS encaixe do Ateliê: 8 rostos sem frestas, olhos do Jovem limpos, Redondo sem sobras na gola, barba encaixada e 54 combinações desenhadas.');
 }finally{await browser.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
