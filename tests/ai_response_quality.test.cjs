'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/assets');
const Q=require(path.join(dir,'rpg24_ai_quality.js'));
function choice(content,model='good/instruct:free'){return {model,choices:[{message:{role:'assistant',content}}]}}
const bad=[
 choice(null,'nvidia/nemotron-3-super-120b-a12b:free'),
 choice('null'),
 choice('undefined'),
 choice('User Safety: safe','nvidia/nemotron-3.5-content-safety:free'),
 choice('User Safety: unsafe'),
 choice('Assistant Safety: safe'),
 choice('Safety: safe'),
 choice('Policy classification: safe'),
 {model:'example/model:free',choices:[]},
 {model:'example/model:free',choices:[{message:{role:'assistant',content:[]}}]}
];
for(const r of bad){const parsed=Q.completion(r);assert.equal(parsed.ok,false,JSON.stringify(r));assert.equal(parsed.answer,'');}
const valid=[
 choice('O combate se divide em rodadas, mas confira a edição do sistema.'),
 choice('A regra específica depende do livro utilizado.'),
 choice('Não posso ajudar com isso.'),
 choice([{type:'text',text:'Um exemplo de regra '},{type:'text',text:'com duas partes.'}])
];
for(const r of valid){let parsed=Q.completion(r);assert.equal(parsed.ok,true,JSON.stringify(r));assert.ok(parsed.answer.length>8);}
const models=[
 {id:'nvidia/nemotron-3.5-content-safety:free',name:'Nemotron 3.5 Content Safety',pricing:{prompt:'0',completion:'0'},architecture:{input_modalities:['text'],output_modalities:['text']}},
 {id:'example/embed:free',name:'Embedding classifier',pricing:{prompt:'0',completion:'0'}},
 {id:'example/instruct-7b:free',name:'Example Instruct',pricing:{prompt:'0.0',completion:'0'},context_length:32000,architecture:{input_modalities:['text'],output_modalities:['text']}},
 {id:'example/chat-small:free',name:'Example Chat',pricing:{prompt:0,completion:0}},
 {id:'example/audio:free',name:'Example Audio',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['audio']}},
 {id:'example/paid-chat:free',name:'Paid Test',pricing:{prompt:'0.0001',completion:'0'}},
 {id:'example/no-pricing:free',name:'Unknown',pricing:{}}
];
const ranked=Q.rankFreeModels(models);
assert.ok(ranked.length>=2);
assert.equal(ranked[0].id,'example/instruct-7b:free');
assert.ok(ranked.every(m=>!/(safety|embed|audio|paid|no-pricing)/.test(m.id)));
const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
const html=fs.readFileSync(path.join(dir,'demo-offline.html'),'utf8');
assert.ok(java.includes('private String answerFromResponse(JSONObject raw)'), 'native parser');
assert.ok(java.includes('message.isNull("content")'), 'native must detect JSON null');
assert.ok(java.includes('java.util.LinkedHashSet<String> candidates=') && java.includes('if(++attempt>3)break'), 'native bounded free-model fallback');
assert.ok(java.includes('conversationalFree(entry)'), 'filter free list in native');
assert.ok(html.includes('quality.validAnswer(answer)'), 'browser never displays null');
assert.ok(html.includes("const accepted=quality.completion(json)"), 'browser parser');
assert.ok(html.includes("model=cachedModels.some(x=>x.id===data.recommended)"),'best free model automatically selected');
console.log('PASS: mock OpenRouter null, classifier, multipart, refusal, free model filtering and retry pathways.');
