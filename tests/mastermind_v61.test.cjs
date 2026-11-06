'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../app/src/main');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('assets/demo-offline.html'),atelier=read('assets/mastermind61_atelier.js'),css=read('assets/mastermind61_atelier.css');
const layers=read('assets/mastermind61_atelier_layers.js'),server=read('java/dev/rpgmesa/demo/LocalCampaignServer.java');
const player=read('assets/lan_player.html'),gurpsPage=read('assets/lan_gurps.html'),gurpsUi=read('assets/rpg16_gurps_ui.js');
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');

assert.ok(Number(gradle.match(/versionCode ([0-9]+)/)?.[1])>=61,'Ateliê exige v0.61 ou mais nova');
assert.match(html,/>v0\.6[1-9]<\/small>/);
assert.match(html,/href="mastermind61_atelier\.css"><script src="mastermind61_atelier\.js"><\/script>/);
assert.doesNotMatch(html,/mastermind61_atelier_layers\.js/,'camadas pesadas só carregam ao abrir o Ateliê');

// Camadas: dados apenas, todas as peças do catálogo existem e as imagens são data: URI locais.
const sandbox={window:{}};vm.runInNewContext(layers,sandbox);
const C=sandbox.window.MM61_CAMADAS;
assert.equal(C.W,560);assert.equal(C.H,1360);
for(const k of ['corpo','pele','cabelo','cabelo-afro','cabelo-lateral','rosto-redondo','roupa-moletom','barba-cheia','calca','bota'])assert.ok(C[k]&&C[k].src,'camada ausente: '+k);
for(const [k,v] of Object.entries(C)){if(!v||typeof v!=='object')continue;for(const f of ['src','m','pm','del'])if(v[f])assert.match(v[f],/^data:image\/(webp|png);base64,/,k+'.'+f);}
assert.doesNotMatch(layers,/https?:\/\//,'nenhuma imagem remota');
const camadas=[...atelier.matchAll(/camada:'([a-z0-9-]+)'/g)].map(m=>m[1]);
assert.ok(camadas.length>=45);for(const k of camadas)assert.ok(C[k],'catálogo aponta para camada inexistente: '+k);

// Regras aprovadas no protótipo.
assert.match(atelier,/id:'redondo',nome:'Redondo',camada:'rosto-redondo',z:32/,'rosto redondo fica à frente das roupas');
assert.match(atelier,/CAT_Z=\{rosto:5,calcado:10,calca:20,roupa:30,barba:35,cabelo:40\}/);
assert.match(atelier,/toDataURL\('image\/jpeg',\.82\)/);
assert.match(atelier,/MastermindCharacters/);assert.match(atelier,/RPG16_GURPS/);
assert.match(css,/var\(--accent/);assert.match(css,/@media\(max-width:720px\)/);

// Receita: só valores conhecidos.
const win={document:{readyState:'loading',addEventListener(){},querySelector(){return null}}};
vm.runInNewContext(atelier,{window:win,document:win.document,setInterval,clearInterval,Promise,Map,Set,Image:function(){},MutationObserver:function(){}});
const r=win.MastermindAtelier.receita({rosto:'redondo',cabelo:'../x',pele:'#5E3B27',roupaCor:'#000001',barba:'cheia',extra:1});
assert.equal(r.rosto,'redondo');assert.equal(r.cabelo,'topete');assert.equal(r.pele,'#5e3b27');assert.equal(r.roupaCor,'original');assert.equal(r.barba,'cheia');assert.equal(r.extra,undefined);

// Mesa LAN: rotas, salvamento do jogador e validação no servidor.
for(const route of ['/atelier.js','/atelier.css','/atelier-layers.js'])assert.ok(server.includes('path.equals("'+route+'")'),route);
assert.match(server,/"photo","atelie","sheetTheme"/);
assert.match(server,/photo\.length\(\)>160000/);
assert.match(server,/data:image\/\(\?:png\|jpeg\|webp\);base64,/);
assert.match(server,/"gurps"\.equals\(sheet\.optString\("systemId"\)\)\?"portrait":"photo"/);
assert.match(player,/<script src="\/atelier\.js"><\/script>/);assert.match(player,/saveProfile\(\{photo:r\.photo,atelie:r\.recipe\}\)/);
assert.match(gurpsPage,/<script src="\/atelier\.js"><\/script>/);
assert.match(gurpsUi,/mm61-open-gurps/);assert.match(gurpsUi,/function setPortrait\(photo,recipe\)/);
console.log('PASS v0.61: Ateliê no app Android (Ordem e GURPS) e na mesa LAN (Ordem e GURPS), camadas locais, receita validada e retrato salvo na ficha');
