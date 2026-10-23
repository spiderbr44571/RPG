'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'../app/src/main');
const asset=name=>fs.readFileSync(path.join(base,'assets',name),'utf8');
const html=asset('demo-offline.html'),tabs=asset('rpg14_sheet_tabs.js'),
 script=asset('mastermind56_local_powers.js'),css=asset('mastermind56_local_powers.css');
const lobby=asset('lan_player.html'),scene=asset('lan_scene.html'),live=asset('rpg31_player_table.js');
const camps=asset('rpg11_campaigns.js'),gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
const pack=JSON.parse(asset('mastermind55_powers.json'));
assert.ok(Number(gradle.match(/versionCode ([0-9]+)/)?.[1])>=56,'v0.56 regression support');
assert.match(html,/id="mm-release"[^>]*>v0\.(?:56|57|58|59|60|61|62|63|64)</);
assert.match(html,/href="mastermind56_local_powers\.css"/);
assert.match(html,/src="mastermind56_local_powers\.js"/);
assert.ok(html.indexOf('src="rpg14_sheet_tabs.js"')<html.indexOf('src="mastermind56_local_powers.js"'),
 'Actual user screen must initialize tab navigation before adding powers');
assert.match(html,/id="screen-sheet"/);
assert.match(html,/id="rpg05-char-select"/);
assert.match(tabs,/\['advancement','✦ Poderes \/ Transcender'\]/);
assert.match(tabs,/window\.RPG14=\{show,readBio\}/);
assert.match(script,/data-r14-panel="advancement"/);
assert.match(script,/MastermindCharacters/);
assert.match(script,/pc\.update\(selected\(\),/);
assert.match(html,/powerChoices:\[\],rituaisConhecidos:\[\]/,'new character must not inherit old character powers');
assert.match(html,/transcends\*c\.san\[1\]/,'Transcender forfeits SAN gain');
assert.match(lobby,/data-tab="powers">✦ Poderes \/ Transcender/);
assert.match(lobby,/id="powers" class="tabpage"/);
assert.match(lobby,/id="v55-original-powers"/);
assert.match(lobby,/MastermindPowerUI\?\.mountOriginal/);
assert.match(camps,/sheet\.systemId='ordem-paranormal'/);
assert.match(live,/!s\.systemId&&s\.class&&s\.attrs\?\.Agilidade!==undefined/);
assert.match(scene,/MastermindPlayerShell\.init\(\)/);
assert.match(scene,/MastermindPowerUI\.initLive\(\)/);
assert.doesNotMatch(script,/v56-quick-powers|v56-go-powers/);
assert.doesNotThrow(()=>new Function(script),'Power module must parse on Android WebView');
// A lightweight runtime test of the ACTUAL main-screen power widget, rather than
// merely checking APK assets or files named after features.
const elements=new Map();
function element(){
 return {innerHTML:'',dataset:{},children:[],listeners:{},
  append(child){this.children.push(child)},addEventListener(name,fn){this.listeners[name]=fn},
  insertAdjacentHTML(pos,html){this.innerHTML+=html},
  setAttribute(){},scrollIntoView(){},
  closest(){return elements.get('.rpg05-heading')||null},
  querySelector(){return null}};
}
for(const name of ['[data-r14-panel="advancement"]','#screen-sheet','.r14-tabs',
 '#rpg05-char-select','.rpg05-heading','#op-poderes','#op-nex'])elements.set(name,element());
const documentMock={
 querySelector:key=>elements.get(key)||null,
 createElement:()=>element(),addEventListener(){},
};
const powers=pack.powers.map(p=>({nome:p.name,elemento:p.element,paginaLivro:p.page}));
let character={class:'Combatente',name:'Teste Android',nex:45,powers:[],powerChoices:[],resources:{SAN:40}};
let decisions=0;
const windowMock={
 OP13:{get state(){return JSON.parse(JSON.stringify(character))},pack:{poderesParanormais:powers}},
 MastermindCharacters:{selectedId(){return 'character-1'},
  update(id,patch){assert.equal(id,'character-1');character={...character,...patch};return true;}},
 RPG_DEMO:{notify(){},navigate(){}},
 RPG14:{show(){}},confirm(){decisions++;return true}
};
vm.runInNewContext(asset('mastermind59_class_catalog.js'),{window:windowMock},{timeout:1000});
const ctx={window:windowMock,document:documentMock,setTimeout(fn){fn()}};
vm.runInNewContext(script,ctx,{timeout:1000});
const ui=windowMock.Mastermind56Powers;
assert.ok(ui&&ui.panel===elements.get('[data-r14-panel="advancement"]'));
assert.equal(ui.count,pack.powers.length);
assert.match(ui.panel.innerHTML,/Poderes &amp; Transcender|Poderes & Transcender/);
assert.match(ui.panel.innerHTML,/Surto Temporal/);
assert.match(ui.panel.innerHTML,/Adicionar poder à ficha/);
assert.equal(elements.get('.rpg05-heading').children.length,0,'No redundant powers CTA in the character header');
ui.learn('Surto Temporal');
assert.equal(character.powers.length,0,'Temporal Surge cannot bypass Morte 2');
const death=pack.powers.filter(x=>x.element==='Morte'&&x.name!=='Surto Temporal');
assert.ok(death.length>=2);
ui.learn(death[0].name);
ui.learn(death[1].name);
assert.equal(character.powerChoices.length,2);
assert.equal(character.powerChoices[0].nex,15);
assert.equal(character.powerChoices[1].nex,30);
ui.learn('Surto Temporal');
assert.equal(character.powers.length,3);
assert.equal(character.powerChoices[2].nex,45);
assert.equal(character.powerChoices[2].element,'Morte');
assert.equal(decisions,3);
ui.learn('Surto Temporal');
assert.equal(character.powerChoices.length,3,'duplicate powers are prevented');
character.nex=5;ui.learn(pack.powers.find(p=>p.name!=='Surto Temporal'&&!character.powers.includes(p.name)).name);
assert.equal(character.powerChoices.length,3,'NEX 5 may not learn an additional class/paranormal power');
console.log('PASS v0.56: user-visible main APK powers tab + live/lobby tabs + working NEX and Morte prerequisites');
