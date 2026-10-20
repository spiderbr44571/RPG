'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main');
const read=file=>fs.readFileSync(path.join(root,'assets',file),'utf8');
const html=read('demo-offline.html'),script=read('mastermind56_visible_powers.js'),
 css=read('mastermind56_visible_powers.css'),original=read('lan_player.html'),
 scene=read('lan_scene.html'),table=read('rpg31_player_table.js');
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(gradle,/versionCode 56/);
assert.doesNotThrow(()=>new Function(script),'Android main sheet powers JS must parse');
assert.match(html,/<section id="screen-sheet"/);
assert.match(html,/<script src="mastermind56_visible_powers\.js"><\/script><\/body>/);
assert.match(html,/<link rel="stylesheet" href="mastermind56_visible_powers\.css">/);
assert.match(css,/#screen-sheet #v56-powers/);
assert.match(css,/@media\(max-width:620px\)/);
assert.match(original,/<button data-tab="powers">✦ Poderes & Transcender<\/button>/);
assert.match(original,/<section id="powers" class="tabpage" hidden><div id="v55-original-powers"><\/div><\/section>/);
assert.match(original,/✦ Abrir mesa imersiva/);
assert.match(scene,/id="r56-visible-powers"/);
assert.match(scene,/id="r56-visible-wheel"/);
assert.match(scene,/openSheetTab\?\.\('Poderes e Transcender'\)/);
assert.match(table,/openSheetTab\(name\)/);
assert.match(table,/groups\['Poderes e Transcender'\]/);
assert.match(scene,/MastermindPlayerShell\.init\(\)/);
const app={name:'Primeiro agente',class:'Combatente',nex:5,powers:[],powerChoices:[]};
let updates=0,mounted=null,rootNode;
const handlers={},docHandlers={};
const fakeRoot=()=>{
 const o={innerHTML:'',dataset:{},hidden:false,className:'',handlers:{},setAttribute(){},
  addEventListener(event,callback){this.handlers[event]=callback},
  scrollIntoView(){},parentNode:{insertBefore(node){mounted=node}}};
 return o;
};
const op={parentNode:{insertBefore(node){mounted=node}}};
const doc={
 querySelector(selector){
  if(selector==='#screen-sheet')return {id:'screen-sheet'};
  if(selector==='#rpg05-sheet-op')return op;
  return null;
 },
 createElement(type){assert.equal(type,'section');rootNode=fakeRoot();return rootNode},
 addEventListener(type,callback){docHandlers[type]=callback}
};
const chars={
 selected:()=>({character:app}),selectedId:()=> 'charA',
 update(id,patch){assert.equal(id,'charA');Object.assign(app,patch);updates++;return true}
};
const windowStub={MastermindCharacters:chars,OP13:{pack:{poderesParanormais:[
 {nome:'Surto Temporal',elemento:'Morte',paginaLivro:115},
 {nome:'Potência Mortífera',elemento:'Morte',paginaLivro:115},
 {nome:'Escapar da Morte',elemento:'Morte',paginaLivro:115},
 {nome:'Visão Anômala',elemento:'Conhecimento',paginaLivro:114}
]},state:app}};
vm.runInNewContext(script,{window:windowStub,document:doc,setTimeout});
assert.ok(mounted,'Powers panel must mount directly inside #screen-sheet Android');
assert.equal(mounted.id,'v56-powers');
assert.match(mounted.innerHTML,/Poderes e Transcender/);
assert.match(mounted.innerHTML,/0 \/ 0 escolhas/);
assert.match(mounted.innerHTML,/data-v56-type="transcend"/);
assert.match(mounted.innerHTML,/Surto Temporal/);
assert.match(mounted.innerHTML,/Requer dois poderes de Morte anteriores/);
function click(selector,props={}){
 const target={...props,closest(sel){return sel===selector?this:null}};
 mounted.handlers.click({target});
}
app.nex=15;windowStub.MastermindVisiblePowers.render();
assert.match(mounted.innerHTML,/1 \/ 1 escolhas/);
click('[data-v56-power]',{dataset:{v56Power:'Potência Mortífera'}});
click('#v56-learn');
assert.equal(updates,1);
assert.equal(app.powerChoices.length,1);
assert.equal(app.powerChoices[0].type,'transcend');
assert.ok(app.powers.includes('Potência Mortífera'));
app.nex=30;windowStub.MastermindVisiblePowers.render();
click('[data-v56-power]',{dataset:{v56Power:'Escapar da Morte'}});
click('#v56-learn');
assert.equal(app.powerChoices.length,2);
assert.equal(app.powerChoices[1].element,'Morte');
app.nex=45;windowStub.MastermindVisiblePowers.render();
assert.doesNotMatch(mounted.innerHTML,/Requer dois poderes de Morte anteriores/);
click('[data-v56-power]',{dataset:{v56Power:'Surto Temporal'}});
click('#v56-learn');
assert.ok(app.powers.includes('Surto Temporal'),'Prerequisite power must be learnable once Morte2 is acquired');
assert.equal(app.powerChoices.length,3);
app.nex=5;windowStub.MastermindVisiblePowers.render();
assert.match(mounted.innerHTML,/0 \/ 3 escolhas/);
assert.ok(docHandlers['rpg:character-selected'],'switching characters must update visible powers');
console.log('PASS v0.56: Android sheet actually mounts and persists power choices; Morte2 and NEX constraints verified; both live player entry paths visible');
