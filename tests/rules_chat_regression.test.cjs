'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const core=require(path.join(assets,'rpg20_search_core.js'));
global.window={};require(path.join(assets,'rpg15_catalog_data.js'));
const systems=window.RPG15_SYSTEMS.systems;
const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8');
const block=/<script id="op-pack-json" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
assert.ok(block,'Real Ordem Paranormal pack must be embedded');
const op={pack:JSON.parse(block[1])};
assert.ok(Array.isArray(op.pack.regras));
assert.ok(!op.pack.regras.some(x=>/descanso/i.test(x.nome)),'Regression: missing in older dataset');
const curated=core.makeOrderDocs(op);
const data=curated.concat(core.makeCatalogDocs(systems));
const cases=[
 'Como funciona o descanso em ordem paranormal',
 'Como funciona o descanso em Ordem Paranormal?',
 'Posso descansar e recuperar PV em Ordem Paranormal?',
 'Como dormir em um interlúdio em ordem paranormal?',
 'Recuperação de sanidade ao relaxar no ordem paranormal'
];
for(const q of cases){
 const inferred=core.inferSystem(q,systems);
 assert.equal(inferred,'ordem-paranormal','system detection: '+q);
 const hits=core.search(q,{systemId:inferred,edition:'1.3',docs:data,systems,limit:12});
 assert.ok(hits.length,'no hits for '+q);
 assert.equal(hits[0].systemId,'ordem-paranormal','wrong system '+q);
 assert.equal(hits[0].kind,'structured','catalog metadata must not be presented as a rule');
 assert.ok(hits.some(x=>x.title.includes('Dormir')||x.title.includes('Interlúdio')||x.title.includes('Relaxar')),'no relevant interlude rules: '+q);
 assert.ok(hits.some(x=>[92,93].includes(x.page)&&[102,103].includes(x.pdfPage)),'wrong original page '+q);
}
const quoted=core.search('Como funciona o descanso em Ordem Paranormal?',{systemId:'ordem-paranormal',edition:'1.3',docs:data,systems});
assert.ok(quoted.every(x=>x.systemId==='ordem-paranormal'));
assert.ok(quoted.filter(x=>x.kind==='metadata').length<=1,'metadata flooding');
assert.equal(core.search('descanso',{systemId:'ordem-paranormal',edition:'2024',docs:data,systems}).length,0,'wrong edition');
assert.equal(core.search('descanso',{systemId:'d-d',edition:'1.3',docs:data,systems}).length,0,'cross-system leak');
assert.ok(html.includes('IA aguardando configuração ou autorização'),'chat should explain missing consent/key');
assert.ok(html.includes('quality.validAnswer(answer)'),'empty and classifier replies must be rejected');
assert.ok(html.includes('systems:systems()'),'search should receive system alias context');
console.log('PASS: exact user rest question and four variations, real OP pack, correct source pages, cloud/offline fallback.');
