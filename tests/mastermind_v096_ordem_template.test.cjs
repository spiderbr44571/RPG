'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../app/src/main/assets');
const tpl=require(path.join(base,'mastermind_ordem_template.js'));
const main=require(path.join(base,'mastermind_system_pdf.js'));
const html=fs.readFileSync(path.join(base,'demo-offline.html'),'utf8');
let lib=null;try{lib=require('pdf-lib');}catch{}
const sample={name:'Agente Exemplo',player:'Jogadora',origin:'Cultista Arrependido',class:'Combatente',trail:'Aniquilador',rank:'Operador',nex:40,
 attrs:{Agilidade:3,Força:2,Intelecto:1,Presença:2,Vigor:2},resources:{PV:12,PE:6,SAN:22},
 skills:{Acrobacia:1,Investigação:2,Ocultismo:3},powerChoices:[{name:'Golpe Pesado',type:'class',nex:15},{name:'Aprender Ritual',type:'transcend',nex:30}],rituaisConhecidos:['Ritual exemplo'],notes:'Anotações do agente',attacks:[{name:'Espada',damage:'1d8',test:'+10'}]};
test('The export links keep user PDF and portable JSON paths',()=>{
 assert.match(html,/mastermind_ordem_template\.js/);
 assert.ok(html.indexOf('mastermind_ordem_template.js')<html.indexOf('mastermind_system_pdf.js'));
 const pdf=fs.readFileSync(path.join(base,'mastermind_system_pdf.js'),'utf8');
 assert.match(pdf,/MastermindOrdemPdfTemplate\?\.supports\(pdf\)/);
 assert.match(pdf,/MastermindOrdemPdfTemplate\.fill\(pdf,s,lib/);
 assert.match(fs.readFileSync(path.join(base,'rpg17_sheet_pdf.js'),'utf8'),/RPG-SHEET-DATA-V1/);
});
test('Skill names and grades are normalized without guessing values',()=>{
 assert.equal(tpl.SKILLS.length,28);
 assert.equal(tpl.grade(1),1);
 assert.equal(tpl.grade('Veterano'),2);
 assert.equal(tpl.grade('Expert'),3);
 assert.equal(tpl.grade(undefined),0);
 assert.equal(tpl.grade(9),3);
});
test('Reject unknown two-page or wrong-system PDFs instead of writing arbitrary positions',()=>{
 const fake={getPageCount:()=>2,getForm:()=>({getFields:()=>[{getName:()=> 'Personagem'}]})};
 assert.equal(tpl.supports(fake),false);
 assert.equal(tpl.supports({...fake,getPageCount:()=>1}),false);
});
test('Recognized two-page PDF with AcroForm fields is replaced, flattened, and expanded for overflow',{skip:!lib},async()=>{
 const doc=await lib.PDFDocument.create(),p1=doc.addPage([595,842]),p2=doc.addPage([597,844]),form=doc.getForm();
 const names=['Personagem','Origem','Classe','PV','PE','DEF','NEX','Texto17','Texto5','aaac'];
 for(let i=0;i<names.length;i++){
  const field=form.createTextField(names[i]);field.addToPage(i===6||i===8||i===9?p2:p1,{x:40,y:720-i*20,width:115,height:18});
  field.setText('VALOR ANTIGO');
 }
 assert.equal(tpl.supports(doc),true);
 const rich={...sample,rituaisConhecidos:Array.from({length:42},(_,i)=>'Ritual '+(i+1)),inventory:Array.from({length:38},(_,i)=>({name:'Equipamento '+i}))};
 const r=await tpl.fill(doc,rich,lib,{calc:{PV:35,PE:12,SAN:35,defesa:14,peTurn:4},pack:{pericias:[{nome:'Investigação',atributo:'Intelecto'},{nome:'Acrobacia',atributo:'Agilidade'}],origens:[],rituais:[]}});
 assert.equal(r.recognized,true);
 assert.equal(r.fields,10);
 assert.ok(r.filled>40,r.filled);
 assert.ok(r.extraPages>=1);
 const saved=await lib.PDFDocument.load(r.bytes);
 assert.equal(saved.getForm().getFields().length,0,'Old form values must not remain');
 assert.ok(saved.getPageCount()>=3);
});
test('Generic PDF format remains available for D&D, GURPS and Cthulhu',()=>{
 for(const id of ['ordem','dnd','gurps','coc'])assert.ok(main.SYSTEMS[id]);
});
