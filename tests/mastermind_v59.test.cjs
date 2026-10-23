'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../app/src/main/assets'),read=x=>fs.readFileSync(path.join(dir,x),'utf8');
const data=JSON.parse(read('mastermind55_powers.json')),offline=read('demo-offline.html'),local=read('mastermind56_local_powers.js'),lan=read('mastermind55_player_powers.js');
const java=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
const catalogJs=read('mastermind59_class_catalog.js');
const window={};vm.runInNewContext(catalogJs,{window});
const cat=window.MastermindClassCatalog;
assert.ok(cat,'Shared power catalog did not initialize');
for(const [klass,count] of [['Combatente',18],['Especialista',14],['Ocultista',15]]){
 assert.equal(cat.classPowers[klass].length,count,'Incomplete '+klass+' list');
 assert.equal(new Set(cat.classPowers[klass]).size,count,'Duplicate powers for '+klass);
 assert.equal(JSON.stringify(cat.classPowers[klass]),JSON.stringify(data.classPowers[klass]));
 assert.ok(cat.classPowers[klass].includes('Treinamento em Perícia'));
 assert.ok(!cat.classPowers[klass].includes('Transcender'),'Transcender must be a distinct switch');
}
assert.equal(JSON.stringify(cat.classPowerRules),JSON.stringify(data.classPowerRules));
assert.equal(cat.classPowerRules['Treinamento em Perícia'].repeatable,true);
assert.equal(cat.classPowerRules['Proteção Pesada'].minNex,30);
assert.equal(cat.classPowerRules['Fluxo de Poder'].minNex,60);
assert.ok(offline.indexOf('src="mastermind59_class_catalog.js"')<offline.indexOf('src="mastermind56_local_powers.js"'));
assert.doesNotMatch(local,/v56-quick-powers|v56-go-powers|Sugestões iniciais/);
assert.doesNotMatch(local,/const jump=document\.createElement/);
assert.doesNotMatch(lan,/Outro poder de classe do seu livro|id="v55-custom"/);
assert.match(local,/Este poder não pertence à classe selecionada/);
assert.match(java,/Este poder não pertence à classe no livro básico 1\.3/);
assert.match(java,/repeatableClassPower/);
assert.match(java,/Atributo mínimo não cumprido/);
assert.match(java,/NEX insuficiente para /);
assert.match(java,/used\.put\(choice\)/);
assert.doesNotThrow(()=>new Function(local));
assert.doesNotThrow(()=>new Function(catalogJs));
assert.doesNotThrow(()=>new Function(lan));
// Actual local widget's category switching + persistence, without a shortcut.
let character={name:'Teste',class:'Combatente',nex:15,powers:[],powerChoices:[],
  attrs:{Agilidade:1,Força:1,Intelecto:1,Presença:1,Vigor:1},skills:{},resources:{SAN:30}};
const components=new Map();
function element(){return {innerHTML:'',dataset:{},listeners:{},children:[],
 append(node){this.children.push(node)},addEventListener(type,fn){this.listeners[type]=fn},
 querySelector(){return null},scrollIntoView(){},setAttribute(){}}}
for(const sel of ['[data-r14-panel="advancement"]','#screen-sheet','.r14-tabs','#rpg05-char-select',
 '#rpg05-new-char','#rpg05-del-char','#op-nex'])components.set(sel,element());
const doc={querySelector:sel=>components.get(sel)||null,addEventListener(){}};
const env={window:{
 MastermindClassCatalog:cat,
 OP13:{get state(){return structuredClone(character)},pack:{poderesParanormais:data.powers.map(p=>({nome:p.name,elemento:p.element,paginaLivro:p.page}))}},
 MastermindCharacters:{selectedId(){return 'same'},update(id,patch){assert.equal(id,'same');character={...character,...patch};return true}},
 RPG14:{show(){}},RPG_DEMO:{navigate(){},notify(){}},confirm(){return true}},
 document:doc,setTimeout(fn){fn()}};
vm.runInNewContext(local,env);
const ui=env.window.Mastermind56Powers;assert.ok(ui);
const panel=components.get('[data-r14-panel="advancement"]');
function mode(which){panel.listeners.click({target:{closest(q){return q==='[data-v56-mode]'?{dataset:{v56Mode:which}}:null}}})}
mode('class');
assert.match(panel.innerHTML,/Ataque de Oportunidade/);
assert.match(panel.innerHTML,/Treinamento em Perícia/);
assert.doesNotMatch(panel.innerHTML,/Poder de classe não listado/);
ui.learn('Proteção Pesada');assert.equal(character.powerChoices.length,0,'NEX prerequisite must block class power');
ui.learn('Hacker');assert.equal(character.powerChoices.length,0,'Cannot learn powers of another class');
ui.learn('Golpe Pesado');assert.equal(character.powerChoices.length,1);
character.nex=90;ui.learn('Treinamento em Perícia');ui.learn('Treinamento em Perícia');
assert.equal(character.powerChoices.length,3,'Skill training can be chosen repeatedly in advancement slots');
assert.equal(character.powers.filter(p=>p==='Treinamento em Perícia').length,1,'No duplicate names for repeatable training');
character.class='Especialista';ui.show();assert.match(panel.innerHTML,/Balística Avançada/);
assert.doesNotMatch(panel.innerHTML,/Segurar o Gatilho/);
character.class='Ocultista';ui.show();assert.match(panel.innerHTML,/Mestre em Elemento/);
console.log('PASS v0.59: complete three-class catalogs, single tab UI, NEX/class validation and repeatable training without duplicate names');
