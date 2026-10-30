'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),asset=n=>fs.readFileSync(path.join(root,'app/src/main/assets',n),'utf8');
const names=require(path.join(root,'app/src/main/assets/mastermind_item_names.js'));
const editor=require(path.join(root,'app/src/main/assets/mastermind_system_editor.js'));
const pdf=require(path.join(root,'app/src/main/assets/mastermind_system_pdf.js'));
test('Equipment labels include both curses and upgrades once, preserving exact names',()=>{
 const item={nome:'Gadanho',modificacoes:['Cruel'],maldicoes:[{nome:'Senciente',elemento:'Conhecimento'}]};
 assert.equal(names.format(item),'Gadanho (Senciente, Cruel)');
 assert.equal(names.format({nome:'Pistola',modificacoes:[],maldicoes:[]}), 'Pistola');
 assert.equal(names.format({...item,modificacoes:['Cruel','Cruel']}),'Gadanho (Senciente, Cruel)');
});
test('Portable PDF, system PDF, native PDF and character inventory all use item formatter',()=>{
 assert.match(asset('demo-offline.html'),/MastermindItemNames\?\.format\(it\)/);
 assert.match(asset('rpg17_sheet_pdf.js'),/MastermindItemNames\?\.format/);
 assert.match(asset('mastermind_system_pdf.js'),/MastermindItemNames\?\.format/);
 assert.match(asset('mastermind_ordem_template.js'),/MastermindItemNames\?\.format/);
 const out=pdf.model('ordem',{name:'Gadanho',class:'Combatente',attrs:{Força:2},skills:{Ocultismo:2},resources:{PV:20,PE:4,SAN:30},inventory:[{nome:'Gadanho',modificacoes:['Cruel'],maldicoes:[{nome:'Senciente'}]}]});
 assert.equal(out.system,'ordem');
});
test('Ordem skills use attribute as number of d20 and training alone as fixed +5/+10/+15',()=>{
 const html=asset('demo-offline.html');
 assert.match(html,/const bonus=grade\*5\+effectsFor\('pericias'\)/);
 assert.doesNotMatch(html,/const bonus=grade\*5\+attr/);
 const pdfText=asset('mastermind_ordem_template.js');
 assert.match(pdfText,/w0\(\[513,top,18,16\],g\*5/);
 assert.match(asset('rpg17_sheet_pdf.js'),/Math\.max\(0,Math\.min\(3,rank\)\)\*5/);
});
test('System editor supports separate power, ability, ritual and progression lists',()=>{
 assert.deepEqual(Array.from(editor.KINDS),['powers','abilities','rituals','progression']);
 editor.setMeta('d-d',{title:'Minha campanha',description:'Regras pessoais'});
 assert.equal(editor.get('d-d').title,'Minha campanha');
 editor.setCatalog('gurps','abilities',[{name:'Vantagem de teste',description:'Anotação'}]);
 assert.equal(editor.list('gurps','abilities')[0].name,'Vantagem de teste');
 assert.throws(()=>editor.setCatalog('gurps','rituals',[{name:''}]),/nome/);
 editor.reset('gurps');
 assert.equal(editor.list('gurps','abilities').length,0);
});
test('Learned powers can be edited, replaced and deleted without recreating character',()=>{
 const src=asset('mastermind56_local_powers.js');
 assert.match(src,/function editPower\(index\)/);
 assert.match(src,/function removePower\(index\)/);
 assert.match(src,/data-v56-delete/);
 assert.match(src,/data-v56-edit/);
 assert.match(src,/pc\.update\(id,\{powerChoices:choices,powers:powerList\}\)/);
 assert.match(src,/powers\(\)\.find/);
});
test('System customization is reachable inside each library system with original covers kept',()=>{
 const lib=asset('rpg15_catalog.js');
 assert.match(lib,/MastermindSystemEditor\?\.get/);
 assert.match(lib,/refresh:render/);
 assert.match(asset('mastermind_system_editor.js'),/mastermind:system-open/);
 assert.match(asset('mastermind_sheet_studio.js'),/MastermindSystemEditor\?\.list/);
});
