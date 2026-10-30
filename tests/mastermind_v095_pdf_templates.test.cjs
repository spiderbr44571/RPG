'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.join(__dirname,'../app/src/main/assets');
const mod=require(path.join(assets,'mastermind_system_pdf.js'));
const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8');
const legacy=fs.readFileSync(path.join(assets,'rpg17_sheet_pdf.js'),'utf8');
const cases={
 ordem:{name:'Ana Silva',class:'Ocultista',origin:'Acadêmico',trail:'Graduado',nex:45,attrs:{Força:1,Agilidade:2,Vigor:1,Intelecto:3,Presença:2},resources:{PV:22,PE:25,SAN:40},skills:{Ocultismo:10,Investigação:5},powers:['Surto Temporal'],rituaisConhecidos:['Paradoxo'],description:'Exemplo de ficha'},
 dnd:{name:'Brina',systemId:'d-d',klass:'Mago',level:4,ancestry:'Elfa',attrs:{STR:8,DEX:14,CON:12,INT:18,WIS:10,CHA:10},hitPointsCurrent:21,hitPointsMax:25,spells:[{name:'Magia de teste'}],features:['Conjuração'],inventory:['Livro']},
 gurps:{name:'Caio',systemId:'gurps',edition:'4e',attrs:{ST:10,DX:13,IQ:12,HT:11},skills:[{name:'Acrobacia',level:12,points:4}],advantages:[{name:'Visão Aguçada',points:2}],disadvantages:[],items:[{name:'Lanterna'}]},
 coc:{name:'Dora',systemId:'chamado-de-ctchulhu',occupation:'Investigadora',era:'1920',age:30,attributes:{STR:60,CON:50,DEX:65,POW:70},resources:{HP:{current:10,max:11},SAN:{current:55,max:70}},skills:{Encontrar:65,Psicologia:50},inventory:['Caderno']}
};
test('PDF export module is loaded inside the same character screen without replacing portable JSON export',()=>{
 assert.match(html,/src="pdf-lib\.min\.js"/);
 assert.match(html,/src="mastermind_system_pdf\.js"/);
 assert.ok(html.indexOf('mastermind_system_pdf.js')>html.indexOf('mastermind_sheet_studio.js'));
 assert.match(legacy,/r17-op-panel/);
 assert.match(legacy,/RPG-SHEET-DATA-V1/);
});
test('Original printable layouts cover real data of all four RPG systems',()=>{
 for(const [system,sheet] of Object.entries(cases)){
  const result=mod.model(system,sheet);
  assert.equal(result.system,system);
  assert.equal(result.name,sheet.name);
  assert.ok(result.sections.length>=4,system);
  const whole=JSON.stringify(result);
  if(system==='ordem'){assert.match(whole,/Paradoxo/);assert.match(whole,/Surto Temporal/);assert.match(whole,/NEX/);}
  if(system==='dnd'){assert.match(whole,/Magia de teste/);assert.match(whole,/Mago/);}
  if(system==='gurps'){assert.match(whole,/Acrobacia/);assert.match(whole,/Visão Aguçada/);}
  if(system==='coc'){assert.match(whole,/Encontrar/);assert.match(whole,/Investigadora/);}
 }
});
test('Compatible fields are matched by literal form names and custom attributes',()=>{
 const data=mod.fields('ordem',cases.ordem);
 assert.equal(mod.match('Nome',data),'Ana Silva');
 assert.equal(mod.match('AGENTE.Nome',data),'Ana Silva');
 assert.equal(mod.match('NEX',data),'45%');
 assert.equal(mod.match('Ocultismo',data),'10');
 assert.equal(mod.match('CampoSemCorrespondencia',data),null);
});
let pdf=null;
try{pdf=require('pdf-lib');}catch{}
test('Original PDF export creates real PDF pages and can be reopened', {skip:!pdf}, async()=>{
 for(const [system,sheet] of Object.entries(cases)){
  const bytes=await mod.renderOwn(mod.model(system,sheet),pdf);
  assert.equal(Buffer.from(bytes.subarray(0,5)).toString(),'%PDF-');
  const check=await pdf.PDFDocument.load(bytes);
  assert.ok(check.getPageCount()>=1,system);
  assert.ok((check.getTitle()||'').includes(sheet.name),system);
 }
});
test('User provided AcroForm PDF keeps its layout and fills actual fields', {skip:!pdf},async()=>{
 const base=await pdf.PDFDocument.create(),page=base.addPage([595,842]);
 const form=base.getForm(),name=form.createTextField('Nome'),nex=form.createTextField('NEX');
 name.addToPage(page,{x:80,y:740,width:260,height:30});nex.addToPage(page,{x:80,y:690,width:80,height:30});
 const original=await base.save();
 const result=await mod.fillUploaded(original,'ordem',cases.ordem,pdf);
 assert.equal(result.filled,2);
 const restored=await pdf.PDFDocument.load(result.bytes);
 assert.equal(restored.getForm().getTextField('Nome').getText(),'Ana Silva');
 assert.equal(restored.getForm().getTextField('NEX').getText(),'45%');
});
test('Uploaded PDF with no AcroForm fields is rejected instead of guessing coordinates', {skip:!pdf},async()=>{
 const doc=await pdf.PDFDocument.create();doc.addPage([595,842]);
 const bytes=await doc.save();
 await assert.rejects(()=>mod.fillUploaded(bytes,'ordem',cases.ordem,pdf),/não possui campos editáveis/);
});
