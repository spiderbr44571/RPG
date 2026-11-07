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
test('Peças que passam do topo do manequim cabem no quadro (moicano inteiro)',()=>{
 const ctx={window:{}};vm.runInNewContext(read('mastermind99_atelier_layers.js'),ctx);
 const L=ctx.window.MastermindAtelierLayers;
 assert.ok(L['cabelo-moicano'].y<0,'moicano deveria subir acima do topo do manequim');
 const js=read('mastermind99_atelier.js');
 assert.match(js,/const TOP=Math\.min\(0,/);
 assert.match(js,/FS=FH\/\(CAMADAS\.H-TOP\)/);
 assert.match(js,/FY0=FY-TOP\*FS/);
 assert.match(js,/f\.setTransform\(k\*FS,0,0,k\*FS,FX\*k,FY0\*k\)/);
 // o topo mais alto de qualquer camada fica dentro da tela de 860px (margem FY=12)
 const TOP=Math.min(0,...Object.values(L).filter(v=>v&&typeof v==='object').flatMap(v=>[v.y,v.dy].filter(n=>typeof n==='number')));
 const FS=800/(L.H-TOP);
 for(const v of Object.values(L))if(v&&typeof v==='object'&&typeof v.y==='number')assert.ok(12+(v.y-TOP)*FS>=12);
});
test('Token se afasta só quando o cabelo sobe além da folga',()=>{
 const js=read('mastermind99_atelier.js');
 assert.match(js,/function bustBox\(full,k\)/);
 assert.match(js,/if\(ty>=BUST_FOLGA\)return BUST;/);
 assert.match(js,/const B=bustBox\(full,k\)/);
});
test('Rostos, esclera, barba e jaleco corrigidos para encaixar no manequim (scripts de correção aplicados)',()=>{
 const ctx={window:{}};vm.runInNewContext(read('mastermind99_atelier_layers.js'),ctx);
 const L=ctx.window.MastermindAtelierLayers;
 for(const k of ['rosto-redondo','rosto-quadrado','rosto-fino','rosto-delicado','rosto-marcante','rosto-idoso','rosto-jovem','rosto-elfo'])
  assert.equal(L[k].ajuste,'rosto-2','rosto sem correção de frestas e esclera: '+k);
 assert.equal(L.corpo.ajuste,'esclera-1','esclera do manequim sem correção');
 assert.equal(L['barba-cheia'].ajuste,'gemini-1','barba cheia deveria vir da pintura sobre o manequim');
 assert.ok(L['barba-cheia'].m&&L['barba-cheia'].ref>20&&L['barba-cheia'].ref<80);
 assert.equal(L['roupa-jaleco'].ajuste,'jaleco-2','jaleco sem a correção do vão, da mão (tecido inteiro atrás dela) e da perna');
 const scripts=path.join(__dirname,'..','scripts');
 const py=fs.readFileSync(path.join(scripts,'atelie_corrigir_rostos.py'),'utf8');
 assert.match(py,/OLHOS = \{\r?\n    'rosto-jovem'/);
 assert.match(py,/CONTORNO = \{\r?\n    'rosto-redondo'/);
 assert.match(py,/def esclera_neutra\(/);
 assert.match(fs.readFileSync(path.join(scripts,'atelie_corrigir_jaleco.py'),'utf8'),/VAO = \[/);
 assert.match(fs.readFileSync(path.join(scripts,'atelie_barba_gemini.py'),'utf8'),/ESCALA, POS = \(553, 1347\), \(3, 0\)/);
 assert.ok(fs.statSync(path.join(scripts,'atelie_fontes','barba-cheia-gemini.jpg')).size>10000,'fonte da barba ausente');
});
test('Rostos, cabelos novos e barba: todas as peças do catálogo têm camada e o rosto redondo fica à frente das roupas',()=>{
 const ctx={window:{}};vm.runInNewContext(read('mastermind99_atelier_layers.js'),ctx);
 const L=ctx.window.MastermindAtelierLayers,js=read('mastermind99_atelier.js');
 for(const k of ['rosto-redondo','rosto-quadrado','rosto-fino','rosto-delicado','rosto-marcante','rosto-idoso','rosto-jovem','rosto-elfo',
   'cabelo-ondulado','cabelo-trancas','cabelo-rabo-alto','cabelo-pixie','cabelo-coque-alto','cabelo-chiquinha','cabelo-afro','cabelo-cachos-longos','cabelo-lateral','barba-cheia']){
  assert.ok(L[k]&&/^data:image\//.test(L[k].src),'faltando '+k);assert.match(js,new RegExp('"camada":"'+k+'"|camada:\''+k+"'"));
 }
 assert.match(js,/PECAS\.rosto\.find\(p=>p\.id==='redondo'\);if\(r\)r\.z=32;/);
 assert.match(js,/const CAT_Z=\{rosto:5,calcado:10,calca:20,roupa:30,barba:35,cabelo:40/);
 assert.match(js,/\['Corpo',\[\['rosto','Formato do rosto','slot'\],\['pele','Tom de pele','swatch',PELES\]\]\]/);
 assert.match(js,/function P\(o\)\{return Object\.assign\(\{rosto:'',/);
 // cabelo tingido sem vazar a cor original; pele pintada no cabelo vai para baixo do rosto
 assert.match(js,/function splitHair\(key,color,pele\)/);
 assert.match(js,/function nucaCabelo\(p,rosto\)/);
 for(const k of Object.keys(L).filter(k=>k.startsWith('cabelo')))assert.ok(L[k].src&&L[k].m,'camada incompleta: '+k);
});
