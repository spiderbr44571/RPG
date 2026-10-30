'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../app/src/main/assets');
const V=require(path.join(dir,'mastermind_search_vocabulary.js'));
const Q=require(path.join(dir,'rpg28_context_search.js'));
test('D&D Portuguese and English queries include both long/short rest and proficiency terms',()=>{
 const rest=V.variants('Como funciona o descanso longo em D&D?','d-d',65);
 assert.ok(rest.includes('long'));assert.ok(rest.includes('rest'));
 const prof=V.variants('Quanto é meu bônus de proficiência?','d-d',65);
 assert.ok(prof.includes('proficiency'));assert.ok(prof.includes('treinamento'));
});
test('GURPS searches active defenses, encumbrance, fatigue in Portuguese and English',()=>{
 assert.ok(V.variants('Como faço para aparar?', 'gurps').includes('parry'));
 assert.ok(V.variants('Quanto é a minha sobrecarga?', 'gurps').includes('encumbrance'));
 assert.ok(V.variants('Fadiga em GURPS', 'gurps').includes('fatigue'));
});
test('Call of Cthulhu searches sanity, luck, pushed rolls and investigations',()=>{
 const id='chamado-de-ctchulhu';
 assert.ok(V.variants('Teste de sorte',id).includes('luck'));
 assert.ok(V.variants('Como funcionam testes forçados?',id).includes('pushed'));
 assert.ok(V.variants('Perda de sanidade',id).includes('sanity'));
});
test('PDF snippets remove replacement glyphs and preserve readable text',()=>{
 const damaged=V.safeExcerpt('GURPS � � � sorte: 3d6 e sucesso.');
 assert.equal(damaged.text.includes('�'),false);
 assert.ok(damaged.corrupted);
 assert.match(damaged.text,/sorte/);
});
test('No fabricated rules when a source index has no matching passage',()=>{
 const docs=[{id:'1',systemId:'d-d',edition:'5e-2014',kind:'index',book:'Livro pessoal',title:'Descanso longo',text:'Long rest recupera recursos conforme a regra do livro.',page:55}];
 const a=Q.retrieval('descanso longo',docs,{systemId:'d-d'});
 assert.equal(a.state,'found');assert.equal(a.hits[0].page,55);
 const absent=Q.retrieval('teletransporte interplanetário',docs,{systemId:'d-d'});
 assert.equal(absent.state,'missing');
});
test('Catalog no longer advertises Ordem as the only initial system',()=>{
 const file=fs.readFileSync(path.join(dir,'rpg15_catalog.js'),'utf8');
 assert.doesNotMatch(file,/EM DESTAQUE · MÓDULO INICIAL/);
 assert.doesNotMatch(file,/O primeiro sistema com módulo de regras/);
 const html=fs.readFileSync(path.join(dir,'demo-offline.html'),'utf8');
 assert.ok(html.indexOf('mastermind_search_vocabulary.js')<html.indexOf('rpg28_context_search.js'));
});
test('Native Android PDF search has protected alternate-term fallback and warns about invalid PDF fonts',()=>{
 const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/PdfTextSearch.java'),'utf8');
 assert.match(java,/List<String> alternatives=synonyms\(words\)/);
 assert.match(java,/encodingWarning/);
 assert.match(java,/new String\[\]\{match,Integer\.toString\(limit\)/);
});
