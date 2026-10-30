'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const html=read('demo-offline.html'),studio=read('mastermind_sheet_studio.js'),source=read('mastermind56_local_powers.js');
const embedded=html.match(/<script id="op-pack-json" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(embedded,'Expected local curated Ordem pack');
const pack=JSON.parse(embedded[1]);
function boot(override={}){
 const state=Object.assign({name:'Agente teste',class:'Combatente',nex:15,attrs:{Força:1,Agilidade:1,Intelecto:1,Presença:1,Vigor:1},skills:{},powers:[],powerChoices:[]},override);
 const panel={innerHTML:'',addEventListener(){},scrollIntoView(){}},sheet={},tabs={addEventListener(){}};
 const document={querySelector(selector){return {'[data-r14-panel="advancement"]':panel,'#screen-sheet':sheet,'.r14-tabs':tabs}[selector]||null;},addEventListener(){}};
 const win={OP13:{pack,state},MastermindCharacters:{selectedId:()=> 'agent-1',update(id,patch){if(id!=='agent-1')return false;Object.assign(state,patch);return true;}},RPG_DEMO:{notify(){}},confirm:()=>true};
 const context={window:win,document,setTimeout(){},console};
 vm.runInNewContext(read('mastermind59_class_catalog.js'),context);
 vm.runInNewContext(source,context);
 assert.ok(win.Mastermind56Powers,'Power module did not mount');
 return {api:win.Mastermind56Powers,state,panel};
}
test('No duplicate portrait/theme card or dice panel; theme still follows the global appearance',()=>{
 assert.doesNotMatch(html,/id="r09-sheet-theme"/);
 assert.doesNotMatch(html,/diceComponent\('sheet'\)/);
 assert.doesNotMatch(html,/data-r09-theme=/);
 assert.match(studio,/id="mss-upload-portrait"/);
 assert.match(studio,/id="mss-portrait"/);
 assert.match(studio,/powers:'advancement'/);
 assert.match(studio,/rituals:'powers'/);
 assert.match(studio,/data-mss-tab="rituals"/);
 assert.match(read('mastermind_sheet_studio.css'),/--mss-accent:var\(--v10-accent/);
});
test('NEX slots, duplicate checks, class eligibility and real character persistence',()=>{
 const {api,state}=boot();
 assert.equal(api.evaluate('Artista Marcial').allowed,true);
 assert.equal(api.evaluate('Armamento Pesado').allowed,false,'Requires Força 2');
 assert.equal(api.evaluate('Hacker').allowed,false,'Cannot learn another class power');
 assert.equal(api.learn('Artista Marcial'),true);
 assert.equal(state.powerChoices.length,1);
 assert.equal(state.powerChoices[0].type,'class');
 assert.equal(state.powerChoices[0].nex,15);
 assert.ok(state.powers.includes('Artista Marcial'));
 assert.equal(api.learn('Artista Marcial'),false,'Duplicate power must be rejected');
 assert.equal(api.evaluate('Golpe Pesado').allowed,false,'Already used the only NEX 15 slot');
});
test('Transcender unlocks paranormal powers, but Surto Temporal needs two prior Morte powers',()=>{
 const {api,state}=boot({nex:60});
 api.setMode('transcend');
 assert.equal(api.evaluate('Surto Temporal').allowed,false);
 assert.equal(api.learn('Encarar a Morte'),true);
 assert.equal(api.learn('Potencial Aprimorado'),true);
 assert.equal(api.evaluate('Surto Temporal').allowed,true);
 assert.equal(api.learn('Surto Temporal'),true);
 assert.equal(state.powerChoices.length,3);
 assert.deepEqual(Array.from(state.powerChoices.map(x=>x.nex)),[15,30,45]);
 assert.ok(state.powerChoices.every(x=>x.type==='transcend'));
 assert.equal(api.learn('Surto Temporal'),false,'Non-repeatable paranormal power');
});
test('Repeatable class training and general paranormal selections spend distinct NEX slots',()=>{
 const first=boot({nex:30});
 assert.equal(first.api.learn('Treinamento em Perícia'),true);
 assert.equal(first.api.learn('Treinamento em Perícia'),true);
 assert.equal(first.state.powerChoices.length,2);
 assert.equal(first.state.powers.filter(x=>x==='Treinamento em Perícia').length,1);
 const second=boot({nex:30});
 second.api.setMode('transcend');
 assert.equal(second.api.learn('Aprender Ritual'),true);
 assert.equal(second.api.learn('Aprender Ritual'),true);
 assert.equal(second.state.powerChoices.length,2);
 assert.equal(second.state.powers.filter(x=>x==='Aprender Ritual').length,1);
});
test('LAN catalog and server use same repeatable power rules',()=>{
 const catalog=JSON.parse(read('mastermind55_powers.json'));
 for(const name of ['Aprender Ritual','Resistir a Elemento'])assert.equal(catalog.powers.find(x=>x.name===name)?.repeatable,true);
 const server=fs.readFileSync(path.join(root,'desktop/server/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
 assert.match(server,/private boolean repeatablePower\(/);
 assert.match(server,/power\.optBoolean\("repeatable",false\)/);
 assert.match(server,/validateChoice\(sheet,type,name\)/);
});
