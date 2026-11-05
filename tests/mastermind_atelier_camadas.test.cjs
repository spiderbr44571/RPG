'use strict';
/* Ateliê em camadas (Android v0.99 / Linux v1.1.7 / Windows v1.1.13): substitui o lyime e roda offline. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=path.join(__dirname,'..','app/src/main/assets');
const read=f=>fs.readFileSync(path.join(assets,f),'utf8');
test('Ateliê em camadas substitui o lyime na tela do app',()=>{
 const html=read('demo-offline.html'),ui=read('mastermind39_ui.js');
 assert.match(html,/id="screen-atelier85"/);
 assert.match(html,/id="ma99-atelier"/);
 assert.match(html,/mastermind99_atelier_layers\.js"><\/script><script src="mastermind99_atelier\.js"/);
 assert.match(html,/mastermind99_atelier\.css/);
 assert.doesNotMatch(html,/p90-native-stage|pixelportrait86_companion|lyime/);
 assert.doesNotMatch(ui,/lyime/);
});
test('Ateliê salva retrato e token na ficha sem rede e dentro do limite',()=>{
 const js=read('mastermind99_atelier.js');
 assert.match(js,/source:'mastermind-atelie-camadas'/);
 assert.match(js,/MastermindCharacters/);
 assert.match(js,/photo\.length>1800000\|\|tokenImage\.length>1200000/);
 assert.doesNotMatch(js,/https?:\/\//);
 assert.match(read('mastermind99_atelier.css'),/#screen-atelier85 \.ma99/);
});
test('Camadas trazem as peças base e o cabelo longo esconde a parte de trás sob moletom e capa',()=>{
 const ctx={window:{}};vm.runInNewContext(read('mastermind99_atelier_layers.js'),ctx);
 const L=ctx.window.MastermindAtelierLayers;
 assert.equal(L.W,560);assert.equal(L.H,1360);
 for(const k of ['corpo','pele','cabelo','cabelo-longo','roupa-moletom','roupa-capa','camisa','calca','bota'])assert.ok(L[k]&&/^data:image\//.test(L[k].src),'faltando '+k);
 const js=read('mastermind99_atelier.js');
 assert.match(js,/id:'longo',nome:'Longo liso',camada:'cabelo-longo',tras:\[\[380,250\]/);
 assert.match(js,/id:'capa',nome:'Capa',camada:'roupa-capa',cobreTras:true/);
 assert.match(js,/id:'moletom',nome:'Moletom',camada:'roupa-moletom',cobreTras:true/);
 assert.match(js,/if\(p\.camada&&!CAMADAS\[p\.camada\]\)p\.camada=null/);
});
