'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=path.resolve(__dirname,'../app/src/main/assets');
function textFile(name){return fs.readFileSync(path.join(assets,name),'utf8');}
function setup(){
 const values=new Map();
 const root={
  localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},
  RPG16_GURPS:{current:{items:[{name:'Lanterna',weight:1}],weapons:[{name:'Arco',damage:'1d'}],spells:[{name:'Encanto particular'}],techniques:[{name:'Técnica de teste'}]}},
  RPG18_DND:{current:{inventory:[{name:'Corda'}],attacks:[{name:'Machado',damage:'1d8'}]}},
  MastermindCoc7:{current:{inventory:['Lanterna'],spells:['Ritual de teste']}}
 };
 const context={window:root,console,Uint32Array,Set,Map};
 const run=name=>vm.runInNewContext(textFile(name),context,{filename:name,timeout:10000});
 const html=textFile('demo-offline.html');
 const pack=JSON.parse(html.match(/<script[^>]*id="op-pack-json"[^>]*>([\s\S]*?)<\/script>/)[1]);
 root.OP13={pack};
 [
  'mastermind59_class_catalog.js','rpg16_gurps_skills.js','rpg16_gurps_traits.js',
  'rpg16_gurps_engine.js','rpg18_dnd_engine.js','mastermind_coc7_engine.js',
  'mastermind66_spells.js','mastermind63_srd_summaries.js',
  'mastermind_system_catalog.js','mastermind_system_editor.js'
 ].forEach(run);
 return {root,editor:root.MastermindSystemEditor,catalog:root.MastermindSystemCatalog,values};
}
test('Real installed metadata covers four system identifiers without copying creature entries',()=>{
 const {catalog}=setup();
 assert.deepEqual(Array.from(catalog.systems),['ordem-paranormal','d-d','gurps','chamado-de-ctchulhu']);
 for(const system of catalog.systems){
  assert.equal(Object.keys(catalog.labels(system)).length,7);
  assert.ok(!Object.keys(catalog.labels(system)).includes('creatures'));
 }
});
test('Ordem has previously missing ability and equipment categories plus all known mechanics',()=>{
 const {catalog}=setup();
 assert.ok(catalog.defaults('ordem-paranormal','abilities').length>=30);
 assert.ok(catalog.defaults('ordem-paranormal','equipment').length>=100);
 assert.ok(catalog.defaults('ordem-paranormal','powers').length>=45);
 assert.ok(catalog.defaults('ordem-paranormal','rituals').length>=80);
 assert.ok(catalog.defaults('ordem-paranormal','progression').length>=20);
 assert.ok(catalog.defaults('ordem-paranormal','skills').length>=28);
 assert.ok(catalog.defaults('ordem-paranormal','equipment').some(x=>x.name==='Faca'));
 assert.ok(catalog.defaults('ordem-paranormal','abilities').some(x=>x.name==='Ataque Especial'));
 assert.ok(catalog.defaults('ordem-paranormal','equipment').some(x=>x.category==='Maldição'));
});
test('D&D uses SRD classes, class features, all spells, level progression and skills',()=>{
 const {catalog}=setup();
 assert.ok(catalog.defaults('d-d','powers').length>=12);
 assert.ok(catalog.defaults('d-d','abilities').length>=350);
 assert.ok(catalog.defaults('d-d','rituals').length>=300);
 assert.equal(catalog.defaults('d-d','progression').length,20);
 assert.equal(catalog.defaults('d-d','skills').length,18);
 assert.ok(catalog.defaults('d-d','equipment').some(x=>x.name==='Corda'));
 assert.ok(catalog.defaults('d-d','rituals').some(x=>x.name==='Wish'));
});
test('GURPS has actual advantages, disadvantages, perks, skills, equipment and sheet spells',()=>{
 const {catalog}=setup();
 assert.ok(catalog.defaults('gurps','powers').length>=300);
 assert.ok(catalog.defaults('gurps','paranormal').length>=300);
 assert.ok(catalog.defaults('gurps','abilities').length>=40);
 assert.ok(catalog.defaults('gurps','skills').length>=40);
 assert.ok(catalog.defaults('gurps','progression').length>=4);
 assert.ok(catalog.defaults('gurps','equipment').some(x=>x.name==='Lanterna'));
 assert.ok(catalog.defaults('gurps','rituals').some(x=>x.name==='Encanto particular'));
});
test('Call of Cthulhu exposes professions, characteristics, percentile skills and investigator entries',()=>{
 const {catalog}=setup();
 assert.ok(catalog.defaults('chamado-de-ctchulhu','powers').length>=5);
 assert.equal(catalog.defaults('chamado-de-ctchulhu','abilities').length,8);
 assert.ok(catalog.defaults('chamado-de-ctchulhu','skills').length>=30);
 assert.ok(catalog.defaults('chamado-de-ctchulhu','progression').length>=1);
 assert.ok(catalog.defaults('chamado-de-ctchulhu','equipment').some(x=>x.name==='Lanterna'));
 assert.ok(catalog.defaults('chamado-de-ctchulhu','rituals').some(x=>x.name==='Ritual de teste'));
});
test('Overrides stay isolated and editable in all systems without changing bundled catalogs',()=>{
 const {catalog,editor,values}=setup();
 for(const id of catalog.systems){
  const base=catalog.defaults(id,'skills');
  const first=base[0];
  assert.ok(first,'A real skill is required in '+id);
  editor.saveItem(id,'skills',{name:'Nome customizado',description:'Anotação específica',category:'Perícia',level:2,points:4},first.id);
  assert.equal(editor.all(id,'skills',base).find(x=>x.id===first.id).name,'Nome customizado');
  assert.equal(catalog.defaults(id,'skills').find(x=>x.id===first.id).name,first.name);
  editor.removeItem(id,'skills',first.id);
  assert.equal(editor.all(id,'skills',base).some(x=>x.id===first.id),false);
  editor.restoreItem(id,'skills',first.id);
  assert.equal(editor.all(id,'skills',base).find(x=>x.id===first.id).name,first.name);
 }
 assert.ok(values.has('mastermind-system-editor-v097'),'Existing user save key must remain unchanged');
});
test('Ordem class powers include every class, and modifications reach actual class power options',()=>{
 const {catalog,editor}=setup();
 for(const name of ['Combatente','Especialista','Ocultista'])assert.ok(editor.powerOptions('class',name,[]).length>=10,name);
 const target=catalog.defaults('ordem-paranormal','powers').find(x=>x.name==='Golpe Pesado'&&x.className==='Combatente');
 assert.ok(target);
 editor.saveItem('ordem-paranormal','powers',{name:'Golpe modificado',className:'Combatente',minNex:15},target.id);
 assert.ok(editor.powerOptions('class','Combatente',[]).some(x=>x.name==='Golpe modificado'));
 assert.ok(!editor.powerOptions('class','Especialista',[]).some(x=>x.name==='Golpe modificado'));
});
test('App loads catalog before editor, with search, paging, and native integrations',()=>{
 const html=textFile('demo-offline.html'),ui=textFile('mastermind_system_editor.js');
 assert.ok(html.indexOf('mastermind_system_catalog.js')<html.indexOf('mastermind_system_editor.js'));
 assert.match(ui,/mse-search/);
 assert.match(ui,/mse-more/);
 assert.match(ui,/data-mse-restore/);
 assert.match(ui,/Bestiário/);
 assert.match(html,/function availableEquipment\(/);
 assert.match(textFile('mastermind66_grimoire_ui.js'),/MastermindSystemEditor/);
 assert.match(textFile('rpg16_gurps_ui.js'),/MastermindSystemEditor/);
});
