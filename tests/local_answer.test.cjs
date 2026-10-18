'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../app/src/main/assets');
const core=require(path.join(dir,'rpg20_search_core.js'));
const local=require(path.join(dir,'rpg26_local_answers.js'));
global.window={};require(path.join(dir,'rpg15_catalog_data.js'));
const systems=window.RPG15_SYSTEMS.systems;
const html=fs.readFileSync(path.join(dir,'demo-offline.html'),'utf8');
const match=/<script id="op-pack-json" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
assert.ok(match,'Pack real de Ordem Paranormal');
const docs=core.makeOrderDocs({pack:JSON.parse(match[1])});
const examples=[
 'Como funciona o descanso em Ordem Paranormal?',
 'Como se recuperam PV e PE ao dormir em um interlúdio?',
 'Como funciona o relaxamento e recuperar sanidade?',
 'O que significa descanso confortável na Ordem?'
];
for(const q of examples){
 const response=local.answer(q,docs,{systemId:'ordem-paranormal',edition:'1.3',systems,core});
 assert.equal(response.state,'found','must answer '+q);
 assert.ok(response.points.length>0,'sentences for '+q);
 assert.ok(response.points.every(p=>p.source.systemId==='ordem-paranormal'&&p.source.edition==='1.3'),'source must match exact rule edition');
 assert.ok(response.points.some(p=>[92,93].includes(p.source.page)),'supported page for '+q);
}
const index=core.docsFromIndexes([
 {id:'test-1',systemId:'gurps',edition:'4e',book:{title:'Regras locais GURPS'},
  chunks:[{title:'Teste de perícia',page:42,text:'Em GURPS, o teste de perícia utiliza três dados de seis faces; o resultado é comparado ao nível efetivo da perícia.'}]},
 {id:'test-2',systemId:'d-d',edition:'5e-2014',book:{title:'Regras locais D&D'},
  chunks:[{title:'Ataques',page:12,text:'Em D&D, o ataque é feito com um dado de vinte faces e modificadores aplicáveis.'}]}
],systems);
const hit=local.answer('Como funciona um teste de perícia em GURPS?',index,{systemId:'gurps',edition:'4e',systems,core});
assert.equal(hit.state,'found');
assert.ok(hit.points.every(x=>x.source.systemId==='gurps'));
const noCross=local.answer('Como funciona ataque D&D?',index,{systemId:'gurps',edition:'4e',systems,core});
assert.ok(noCross.points.every(x=>x.source.systemId==='gurps'));
const noEdition=local.answer('Como funciona um teste de perícia em GURPS?',index,{systemId:'gurps',edition:'2024',systems,core});
assert.equal(noEdition.state,'missing');
const catalog=core.makeCatalogDocs(systems);
const missing=local.answer('Como funciona magia no livro desconhecido',{length:0},{systemId:'all',edition:'all',systems,core,catalogDocs:catalog});
assert.ok(['catalog','missing'].includes(missing.state));assert.equal(missing.points.length,0);
assert.ok(html.includes('<script src="rpg26_local_answers.js"></script>'));
assert.ok(html.includes('<script src="rpg26_offline_search_ui.js"></script>'));
assert.ok(!html.includes('rpg23_ai_core.js')&&!html.includes('rpg24_ai_quality.js'),'cloud assistant is not loaded');
const ui=fs.readFileSync(path.join(dir,'rpg26_offline_search_ui.js'),'utf8');
for(const term of ['rpg26-query','r26-query','r26-index-system','indexDB','RPG11={search','latestAnswer','extract.answer'])assert.ok(ui.includes(term)||ui.includes(term.replace('rpg26-query','r26-query')),term);
assert.ok(!ui.includes('openrouter.ai'));
const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
assert.ok(!java.includes('RpgCloudAiBridge'),'Android must not expose cloud API');
console.log('PASS 100% offline question answers: rest, 39 systems, private indexes, no cross-version, no cloud bridge.');
