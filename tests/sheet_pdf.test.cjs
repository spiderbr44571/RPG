'use strict';
const assert=require('node:assert/strict');
const P=require('../app/src/main/assets/rpg17_sheet_pdf.js');
const td=new TextDecoder();
function obj(n){return {name:n,attrs:{Força:3,Agilidade:2,Vigor:2,Intelecto:1,Presença:1},class:'Combatente',origin:'Acadêmico',trail:'Aniquilador',nex:5,resources:{PV:28,PE:4,SAN:18},skills:{Fortitude:5},powers:['Combate'],rituaisConhecidos:[],history:'História: ação e coragem.'};}
const op=P.exported('sistema-op-v13',obj('Ágata, a Guardiã'),[{nome:'Lanterna',categoriaItem:'equipamento',modificacoes:[],uid:'xyz'}]);
const gurps=P.exported('gurps',{id:'a',systemId:'gurps',edition:'4e',name:'Martim',attrs:{ST:10,DX:11,IQ:12,HT:9},mod:{},skills:[{name:'Furtividade',points:2,attr:'DX',diff:'A'}],items:[{name:'Mochila',qty:1}],advantages:[],disadvantages:[],currentHP:10,currentFP:9});
for(const original of [op,gurps]){
 const pdf=P.makePdf(original);
 assert.equal(td.decode(pdf.subarray(0,5)),'%PDF-');
 assert.match(td.decode(pdf.subarray(pdf.length-40)),/%%EOF/);
 assert.match(td.decode(pdf),/\/EmbeddedFiles/);
 const again=P.readPdf(pdf);
 assert.deepEqual(again,original);
 const text=td.decode(pdf);
 const match=/startxref\n(\d+)\n%%EOF/.exec(text);
 assert.ok(match,'PDF must include xref offset');
 const offset=Number(match[1]);
 assert.equal(td.decode(pdf.subarray(offset,offset+4)),'xref','xref must point to valid byte location');
}
assert.equal(P.readPdf(P.makePdf(op)).items[0].nome,'Lanterna');
assert.equal(P.readPdf(P.makePdf(op)).sheet.name,'Ágata, a Guardiã');
assert.throws(()=>P.makePdf({kind:'rpg-sheet-pdf-v1',systemId:'unsupported',sheet:{}}),/compativel/);
assert.throws(()=>P.readPdf(new TextEncoder().encode('%PDF-1.4\n%%EOF\n'+ ' '.repeat(300))),/anexo/);
assert.throws(()=>P.readPdf(new TextEncoder().encode('not pdf '.repeat(50))),/PDF valido/);
console.log('PASS: PDF de Ordem/GURPS com leitura, anexo JSON, caracteres e xref corretos.');
