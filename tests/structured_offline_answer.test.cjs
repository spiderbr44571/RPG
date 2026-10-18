'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/assets');
const core=require(path.join(dir,'rpg20_search_core.js'));
const search=require(path.join(dir,'rpg26_local_answers.js'));
const templates=require(path.join(dir,'rpg27_answer_templates.js'));
global.window={};require(path.join(dir,'rpg15_catalog_data.js'));
const systems=window.RPG15_SYSTEMS.systems;
assert.equal(systems.length,39);
const html=fs.readFileSync(path.join(dir,'demo-offline.html'),'utf8');
const embedded=/<script id="op-pack-json" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
assert.ok(embedded,'Ordem data must exist');
const op=core.makeOrderDocs({pack:JSON.parse(embedded[1])});
function answer(q,docs,systemId,edition){
 const opt={systemId,edition,systems,core};
 return templates.format(q,search.answer(q,docs,opt),opt);
}
const q='Como funciona o descanso em Ordem Paranormal?';
const rest=answer(q,op,'ordem-paranormal','1.3');
assert.equal(rest.state,'formatted');
assert.ok(rest.lead,'short introduction required');
assert.ok(rest.sections.length>=1,'structured sections');
assert.ok(rest.sources.length>=1,'real book sources');
assert.ok(rest.sources.every(x=>x.systemId==='ordem-paranormal'&&x.edition==='1.3'),'do not mix systems');
assert.ok(rest.sources.some(x=>[92,93].includes(x.page)),'correct printed book pages');
assert.ok(rest.values.some(x=>/descanso normal/i.test(x.label)),'normal rest table');
assert.ok(rest.values.some(x=>/descanso (precário|precario)/i.test(x.label)),'poor rest table');
assert.ok(rest.values.some(x=>/descanso confortável/i.test(x.label)),'comfortable rest table');
assert.ok(rest.values.some(x=>/descanso luxuoso/i.test(x.label)),'luxury rest table');
for(const item of [rest.lead,...rest.sections.flatMap(x=>x.items)]){
 assert.ok(item.source&&item.source.book);
 assert.ok(item.source.text.replace(/\s+/g,' ').includes(item.text.replace(/…$/,'')), 'displayed excerpts must come from source');
}
for(const row of rest.values){assert.ok(row.source.text.includes(row.label+': '+row.value),'table cannot invent a value')} 
const dnd=[{
 systemId:'d-d',systemName:'D&D',edition:'5e-2014',book:'SRD 5.1',
 title:'Testes e proficiência',text:'Para fazer um teste, role 1d20 e adicione o modificador do atributo. Se o personagem for proficiente, adicione o bônus de proficiência. O bônus varia conforme o nível. A dificuldade depende do mestre.',page:18,kind:'index'
}];
const dd=answer('Como funcionam os testes e a proficiência em D&D?',dnd,'d-d','5e-2014');
assert.equal(dd.state,'formatted','independent model for D&D');
assert.ok(dd.sections.some(s=>s.id==='values')||dd.sections.some(s=>s.id==='conditions'),'mechanics should be categorized');
assert.ok(dd.sources.every(x=>x.systemId==='d-d'));
const gurps=[{
 systemId:'gurps',systemName:'GURPS',edition:'4e',book:'Guia de regras GURPS',title:'Teste de habilidade',
 text:'O jogador lança três dados de seis faces (3d6). Para ter sucesso, o resultado precisa ser menor ou igual ao nível efetivo da perícia. Se a dificuldade for elevada, o mestre poderá aplicar modificadores.',page:42,kind:'index'
}];
const gp=answer('Como funcionam testes em GURPS?',gurps,'gurps','4e');
assert.equal(gp.state,'formatted','general-purpose template for GURPS');
assert.ok(gp.sources.every(x=>x.edition==='4e'));
const other=[
 {systemId:'alien-rpg',systemName:'Alien RPG',edition:'',book:'Livro pessoal',title:'Recursos e uso',
  text:'Ao usar um recurso, a personagem verifica sua disponibilidade. Se o recurso se esgotar, não pode realizar a ação novamente até reabastecer. Existe um limite de 3 usos em cada cena.',page:55,kind:'index'}
];
const al=answer('Como usar recursos em Alien RPG?',other,'alien-rpg','all');
assert.equal(al.state,'formatted','generic indexed book works beyond three rule engines');
assert.ok(al.sources.every(x=>x.systemId==='alien-rpg'));
assert.equal(templates.format('D&D',search.answer('proficiência',dnd,{systemId:'gurps',edition:'4e',systems,core}),{systemId:'gurps',edition:'4e'}).state,'unavailable');
const unknown=answer('Como funcionam as classes secretas do livro inexistente?',[],'d-d','2024');
assert.equal(unknown.state,'unavailable');
assert.equal(unknown.values.length,0,'never hallucinate numeric effects');
const ui=fs.readFileSync(path.join(dir,'rpg26_offline_search_ui.js'),'utf8');
assert.ok(html.includes('<script src="rpg27_answer_templates.js"></script>'));
assert.ok(html.indexOf('rpg27_answer_templates.js')<html.indexOf('rpg26_offline_search_ui.js'));
assert.ok(ui.includes('templates.format(')&&ui.includes('formattedAnswer.values'));
assert.ok(ui.includes("data-r27-source"));
const css=fs.readFileSync(path.join(dir,'rpg26_offline_search.css'),'utf8');
assert.ok(css.includes('r27-values'));
console.log('PASS: formatted source-grounded rest (4 categories), D&D, GURPS, Alien, missing data, cross-edition and source links');
