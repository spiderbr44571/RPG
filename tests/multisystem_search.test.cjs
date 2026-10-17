'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../app/src/main/assets');
const core=require(path.join(base,'rpg20_search_core.js'));
global.window={};
require(path.join(base,'rpg15_catalog_data.js'));
const systems=window.RPG15_SYSTEMS.systems;
const docs=core.makeCatalogDocs(systems);
assert.equal(systems.length,39);
const count=systems.reduce((sum,s)=>sum+s.books.length,0);
assert.equal(docs.length,count);
assert.ok(count>=200);
for(const sys of systems){
 const books=docs.filter(x=>x.systemId===sys.id);
 assert.equal(books.length,sys.books.length);
 if(books.length){
  const q=books[0].title;
  const results=core.search(q,{docs,systemId:sys.id,limit:10});
  assert.ok(results.some(x=>x.sourceBookId===books[0].sourceBookId),sys.id+': '+q);
  assert.ok(results.every(x=>x.systemId===sys.id),sys.id+': cross-system matches');
  assert.ok(results.every(x=>x.kind==='metadata'),sys.id+': unindexed book presented as content');
 }
}
const op=core.makeOrderDocs({pack:{
 regras:[{nome:'Investigação',resumo:'Uma regra de investigação.',paginaLivro:25}],
 pericias:[{nome:'Fortitude',atributo:'Vigor'}],rituais:[],poderesParanormais:[],condicoes:[]}});
assert.ok(op.every(x=>x.systemId==='ordem-paranormal'));
const mechanics=core.makeRulesDocs(
 {CLASSES:{Guerreiro:{hitDie:10}},CLASSES_PT:{Guerreiro:'Guerreiro'},SKILLS:{Atletismo:'STR'},LABELS:{STR:'Força',Atletismo:'Atletismo'}},
 {costs:{ST:10,IQ:20}});
assert.equal(core.search('Guerreiro',{docs:mechanics,systemId:'d-d'})[0].title,'Guerreiro');
assert.ok(core.search('Atributos 3d6',{docs:mechanics,systemId:'gurps'}).length>0);
assert.equal(core.search('Guerreiro',{docs:mechanics,systemId:'gurps'}).length,0);
assert.equal(core.inferSystem('Como funciona uma ficha GURPS 4e?',systems),'gurps');
assert.equal(core.inferSystem('Eu quero jogar dnd',systems),'d-d');
assert.equal(core.inferSystem('Como funciona investigação?',systems),null);
const indexes=[
 {id:'1',systemId:'alien-rpg',edition:'',book:{title:'Alien PDF próprio'},chunks:[{title:'Stress',page:46,text:'Stress é descrito no livro na página 46.'}]},
 {id:'2',systemId:'gurps',edition:'4e',book:{title:'GURPS PDF próprio'},chunks:[{title:'Stress',page:19,text:'Um campo chamado Stress neste índice teste GURPS.'}]}
];
const ix=core.docsFromIndexes(indexes,systems);
assert.equal(ix.length,2);
assert.deepEqual(core.search('Stress',{docs:ix,systemId:'alien-rpg'}).map(x=>x.book),['Alien PDF próprio']);
assert.equal(core.search('Stress',{docs:ix,systemId:'alien-rpg',edition:'4e'}).length,0);
assert.equal(core.search('Stress',{docs:ix,systemId:'gurps',edition:'4e'}).length,1);
assert.equal(core.search('Stress',{docs:ix,systemId:'gurps',edition:'2024'}).length,0);
const h=fs.readFileSync(path.join(base,'demo-offline.html'),'utf8');
assert.ok(h.includes('<script src="rpg20_search_core.js"></script>'));
assert.ok(h.includes('r11-system')&&h.includes('r11-index-system'));
assert.ok(h.includes('usable=hits.filter(x=>x.kind!=='));
assert.ok(h.includes('RpgAiProxyBridge.request('));
assert.ok(fs.existsSync(path.join(__dirname,'../scripts/indexar_pdf.py')));
assert.ok(fs.existsSync(path.join(__dirname,'../server/ai_proxy.py')));
console.log('PASS: 39 systems, '+count+' books, strict scope/edition, index import and AI grounding');
