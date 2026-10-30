'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const source=fs.readFileSync(path.join(assets,'mastermind_system_editor.js'),'utf8');
function create(){
 const storage=new Map(),w={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(source,{window:w,console,CustomEvent:class CustomEvent{}});
 return {api:w.MastermindSystemEditor,storage,w};
}
test('System editor persists metadata in an isolated namespace without modifying any original rules',()=>{
 const {api,storage}=create();
 assert.ok(api.setMetadata('ordem-paranormal',{name:'Ordem Personalizada',description:'Regras da mesa'}));
 assert.equal(api.system('ordem-paranormal').metadata.name,'Ordem Personalizada');
 assert.ok(storage.get('mastermind-system-editor-v097'));
 assert.equal(storage.size,1);
 api.reset('ordem-paranormal');
 assert.deepEqual(Object.keys(api.system('ordem-paranormal').metadata),[]);
});
test('Create, edit, remove and restore powers for one system without affecting others',()=>{
 const {api}=create();
 api.saveItem('ordem-paranormal','powers',{name:'Poder novo',className:'Ocultista',minNex:30},'power-id');
 assert.equal(api.all('ordem-paranormal','powers',[]).length,1);
 assert.equal(api.powerOptions('class','Ocultista',[])[0].name,'Poder novo');
 assert.equal(api.powerOptions('class','Combatente',[]).length,0);
 api.saveItem('ordem-paranormal','powers',{name:'Poder alterado',className:'Ocultista'},'power-id');
 assert.equal(api.all('ordem-paranormal','powers',[])[0].name,'Poder alterado');
 api.removeItem('ordem-paranormal','powers','power-id');
 assert.equal(api.all('ordem-paranormal','powers',[]).length,0);
 api.restoreItem('ordem-paranormal','powers','power-id');
 assert.equal(api.all('ordem-paranormal','powers',[]).length,0);
 api.saveItem('d-d','abilities',{name:'Magia pessoal'});
 assert.equal(api.all('d-d','abilities',[]).length,1);
 assert.equal(api.all('gurps','abilities',[]).length,0);
});
test('Official powers can be hidden and restored without changing their defaults',()=>{
 const {api}=create(),defaults=[{name:'Artista Marcial',id:'Artista Marcial',className:'Combatente'}];
 api.removeItem('ordem-paranormal','powers','Artista Marcial');
 assert.equal(api.all('ordem-paranormal','powers',defaults).length,0);
 api.restoreItem('ordem-paranormal','powers','Artista Marcial');
 assert.equal(api.all('ordem-paranormal','powers',defaults)[0].name,'Artista Marcial');
});
test('All curses are shown in parenthesis with duplicates removed and original item name preserved',()=>{
 const {api}=create();
 const it={nome:'Gadanho',maldicoes:[{nome:'Senciente',elemento:'Conhecimento'},{nome:'Cruel',elemento:'Sangue'},'Senciente']};
 assert.equal(api.displayItem(it),'Gadanho (Senciente, Cruel)');
 assert.equal(it.nome,'Gadanho');
 assert.equal(api.displayItem('Algemas'),'Algemas');
});
test('New editor is wired into real RPG screen, character export and PDF without removing portable JSON',()=>{
 const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8');
 const power=fs.readFileSync(path.join(assets,'mastermind56_local_powers.js'),'utf8');
 const pdf=fs.readFileSync(path.join(assets,'mastermind_system_pdf.js'),'utf8');
 const op=fs.readFileSync(path.join(assets,'mastermind_ordem_template.js'),'utf8');
 assert.match(html,/mastermind_system_editor\.js/);
 assert.match(html,/MastermindSystemEditor\?\.displayItem/);
 assert.match(power,/removeChoice/);
 assert.match(power,/updateChoice/);
 assert.match(power,/data-v56-remove/);
 assert.match(pdf,/MastermindSystemEditor\?\.displayItem/);
 assert.match(op,/MastermindSystemEditor\?\.displayItem/);
 assert.match(fs.readFileSync(path.join(assets,'rpg17_sheet_pdf.js'),'utf8'),/RPG-SHEET-DATA-V1/);
});
test('Ordem treats attribute dice separately from flat training bonus',()=>{
 const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8');
 assert.match(html,/const bonus=grade\*5\+effectsFor\('pericias'\)/);
 const op=require(path.join(assets,'mastermind_ordem_template.js'));
 assert.equal(op.grade('Treinado')*5,5);
 assert.equal(op.grade('Veterano')*5,10);
 assert.equal(op.grade('Expert')*5,15);
});
