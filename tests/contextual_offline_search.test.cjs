'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const engine=require(path.join(assets,'rpg28_context_search.js'));
const core=require(path.join(assets,'rpg20_search_core.js'));
const templates=require(path.join(assets,'rpg27_answer_templates.js'));
global.window={};require(path.join(assets,'rpg15_catalog_data.js'));
const systems=window.RPG15_SYSTEMS.systems;
const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8');
assert.ok(html.includes('<script src="rpg28_context_search.js"></script>'),'contextual module should load before UI');
const pack=JSON.parse(/<script id="op-pack-json" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1]);
const ordem=core.makeOrderDocs({pack});
const other=[
 {id:'alien-descanso',kind:'index',systemId:'alien-rpg',edition:'1',book:'Livro pessoal Alien',page:16,title:'Pausa entre encontros',text:'Ao parar para repousar, o grupo pode recuperar recursos de acordo com as condições da pausa.'},
 {id:'dnd-descanso',kind:'index',systemId:'d-d',edition:'5e-2014',book:'SRD',page:18,title:'Descanso longo',text:'Durante um descanso longo os personagens podem recuperar pontos de vida.'},
 {id:'dnd-outro',kind:'index',systemId:'d-d',edition:'2024',book:'Outro livro',page:42,title:'Descanso',text:'Descanso e recuperação de recursos.'}
];
const corpus=ordem.concat(other);
const ask=(q,id='ordem-paranormal',edition='1.3')=>engine.answer(q,corpus,{systemId:id,edition,systems});
const scenarios=[
 ['Como funciona o descanso em Ordem Paranormal?',/Interlúdio/],
 ['Quando eu durmo, o que recupero?',/Dormir/],
 ['Se o grupo parar depois da missão, como recuperamos energia?',/Interlúdio/],
 ['Como recupero minha sanidade?',/Relaxar/],
 ['Qual a diferença entre descanso precário e confortável?',/Dormir/]
];
for(const [question,top] of scenarios){
 const result=ask(question);
 assert.equal(result.state,'found',question);
 assert.match(result.hits[0].title,top,question);
 assert.ok(result.hits.every(x=>x.systemId==='ordem-paranormal'&&x.edition==='1.3'),question);
 assert.ok(result.points.length>0,'verifiable points for '+question);
 assert.ok(result.points.every(x=>x.source.text.includes(x.text.replace(/…$/,''))),question);
 const formatted=templates.format(question,result,{systemId:'ordem-paranormal',edition:'1.3'});
 assert.equal(formatted.state,'formatted',question);
 assert.ok(formatted.lead&&formatted.sources.length>0,question);
}
assert.equal(ask('Como funcionam as pausas?', 'alien-rpg','1').hits[0].id,'alien-descanso');
assert.ok(ask('Como funciona descanso?', 'd-d','2024').hits.every(x=>x.edition==='2024'));
assert.ok(ask('Como funciona descanso?', 'd-d','5e-2014').hits.every(x=>x.edition==='5e-2014'));
assert.equal(ask('Como funcionam os testes 3d6?', 'd-d','2024').state,'missing');
assert.equal(ask('teletransporte entre dimensões').state,'missing');
assert.deepEqual(engine.queryModel('Quando durmo, o que recupero?', 'ordem-paranormal',systems).concepts.includes('repouso'),true);
assert.ok(fs.readFileSync(path.join(assets,'rpg26_offline_search_ui.js'),'utf8').includes("if(activeSystem==='all'&&named)"),'selected system must not be overwritten');
console.log('PASS: v0.28 contextual retrieval, multiple systems, precise editions, grounded excerpts, no fabricated matches.');
