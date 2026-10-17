'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../app/src/main/assets');
const ai=require(path.join(dir,'rpg23_ai_core.js'));
const q=[
 'Como funciona o descanso em ordem paranormal?',
 'O que é uma rolagem de vantagem no D&D?',
 'Me ajude a criar um personagem que odeia magia',
 'Pode explicar algo que não existe nos nossos livros?',
 'Qual é a diferença entre cena e turno?',
 'Quanto é 2 + 2?'
];
for(const text of q){
 const p=ai.plan(text,{systemId:'all',edition:'all',hits:[]});
 assert.equal(p.question,text);
 assert.equal(p.sources.length,0,'No source required: '+text);
 assert.equal(ai.modeFor(p),'conhecimento geral');
 assert.equal(p.model,'openrouter/free');
}
const hits=[
 {systemId:'ordem-paranormal',kind:'index',title:'Regras',book:'PDF Ordem',page:22,text:'Regras do sistema 1.3'},
 {systemId:'d-d',kind:'index',title:'Monstros',book:'Manual',page:19,text:'Criaturas de D&D 5e'},
 {systemId:'ordem-paranormal',kind:'metadata',title:'Livraria',book:'Drive',page:0,text:'Somente título'}
];
let p=ai.plan('O que são os testes?',{systemId:'ordem-paranormal',edition:'1.3',hits});
assert.equal(p.sources.length,1,'one valid contextual excerpt');
assert.equal(p.sources[0].systemId,'ordem-paranormal');
assert.equal(ai.modeFor(p),'documentos');
p=ai.plan('Pergunta geral',{systemId:'all',hits});
assert.equal(p.sources.length,0,'general mode must never leak unrelated systems');
const hist=Array.from({length:15},(_,i)=>({role:i%2?'assistant':'user',content:String(i).repeat(1200)}));
p=ai.plan('E se eu mudar meu personagem?',{systemId:'gurps',history:hist});
assert.equal(p.history.length,8);
assert.ok(p.history.every(x=>x.content.length<=900));
assert.ok(ai.generalInstruction.includes('NÃO houve conferência no livro'));
const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
assert.ok(java.includes('if(sources==null)sources=new JSONArray();'),'native accepts zero sources');
assert.ok(java.includes('JSONArray history=params.optJSONArray("history")'),'native receives conversation history');
assert.ok(!java.includes('A IA precisa de trechos dos livros do sistema'),'old hard block removed');
const html=fs.readFileSync(path.join(dir,'demo-offline.html'),'utf8');
assert.ok(html.includes('<script src="rpg23_ai_core.js"></script>'));
assert.ok(html.includes("let mode='ai';"),'cloud chat must be first');
assert.ok(html.includes("const request=ai.plan(query"),'chat uses general planner');
assert.ok(html.includes("hist"+"ory.push({role:'user'"),'conversation continuity');
assert.ok(html.includes("data.sources.length>4"),'browser validates sources count');
console.log('PASS: six unrelated questions; general AI without source; scoped books; remembered dialogue; Android native cloud.');
