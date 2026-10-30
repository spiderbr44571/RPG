/* Mastermind — offline multilingual search vocabulary.
 * Only query aliases and text cleanup. Never ships book text or creates rule answers. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MastermindSearchVocabulary=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=s=>String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
 const STOP=new Set('a o as os um uma de da do das dos no na nos nas em por para com sem como quando qual quais quem que e ou is the of to on in and how what do does my me your quero saber explique funciona funcionam funcionamento livro livros sistema sistemas rpg jogo personagem personagens regra regras'.split(' '));
 const words=s=>[...new Set(norm(s).split(/\s+/).filter(x=>x.length>2&&!STOP.has(x)))];
 const families={
  common:[
   ['cura','curar','recuperar','recuperacao','healing','heal','restaurar','rest','descanso','repouso'],
   ['magia','magias','feitico','feiticos','spell','spells','conjurar','conjuracao'],
   ['ataque','atacar','attack','acertar','hit','combate','combat'],
   ['pericia','pericias','skill','skills','habilidade','habilidades','aptidao'],
   ['teste','testes','test','check','rolagem','roll','jogada'],
   ['resistencia','salvaguarda','saving throw','save','defesa','defense'],
   ['movimento','deslocamento','speed','movement','velocidade','correr'],
   ['dano','damage','ferimento','injury','lesao'],
   ['iniciativa','initiative','turno','turn','rodada','round']
  ],
  'd-d':[
   ['descanso longo','long rest','longrest','longa recuperacao','repouso longo','dormir'],
   ['descanso curto','short rest','shortrest','recuperacao curta','repouso curto'],
   ['dados de vida','hit dice','hit die','dado de vida','recuperacao de vida'],
   ['proficiencia','proficiência','proficiency','proficiency bonus','bonus de proficiencia','treinamento'],
   ['concentracao','concentration','concentrar','concentrando','manter magia'],
   ['espacos de magia','espacos de feitico','spell slots','spell slot','slot','preparar magia','magias preparadas'],
   ['resistencia de morte','salvaguarda contra morte','death saving throw','death saves','morrendo','inconsciente'],
   ['classe de armadura','armor class','armour class','ac','ca','defesa'],
   ['vantagem','advantage','desvantagem','disadvantage'],
   ['talento','talentos','feat','feats','habilidade de classe','class feature'],
   ['descanso','resting','short rest','long rest'],
   ['reacao','reaction','acao bonus','bonus action','acao','action'],
   ['agarrar','grapple','grappling','empurrar','shove'],
   ['exaustao','exhaustion','exausto','cansaco'],
   ['multiclasse','multiclass','multiclassing','multi classe'],
   ['ritual','ritual casting','conjurar como ritual']
  ],
  gurps:[
   ['fadiga','fatigue','fatigue points','fp','pontos de fadiga','energia'],
   ['pontos de vida','hit points','hp','ferimentos','lesoes','injury'],
   ['defesa ativa','active defense','aparar','parry','bloquear','block','esquiva','dodge'],
   ['vantagem','advantages','advantage','perks','qualidades'],
   ['desvantagem','disadvantages','disadvantage','quirks','peculiaridades'],
   ['nivel de habilidade','skill level','skill','pericia','pericias','dificuldade'],
   ['levantamento basico','basic lift','carga','encumbrance','sobrecarga'],
   ['teste de reacao','reaction roll','reacao','reacoes'],
   ['teste de medo','fright check','susto','medo','horror','terror'],
   ['dano basico','basic damage','thrust','swing','gdp','geb','balanco','golpe'],
   ['modificador','modifier','modificadores','penalidade','bonus'],
   ['sucesso decisivo','critical success','falha critica','critical failure','sucesso critico'],
   ['aparencia','appearance','status','reputacao','reputation'],
   ['magia','spells','ritual','conjuracao'],
   ['forca','st','destreza','dx','inteligencia','iq','vitalidade','ht']
  ],
  'chamado-de-ctchulhu':[
   ['sanidade','sanity','san','san loss','perda de sanidade','insanidade'],
   ['sorte','luck','luck roll','teste de sorte','pontos de sorte'],
   ['teste forcado','pushed roll','pushing','forcar teste','forcando rolagem'],
   ['sucesso extremo','extreme success','sucesso dificil','hard success','sucesso regular','regular success'],
   ['dados de bonus','bonus die','bonus dice','dados de penalidade','penalty dice','penalty die'],
   ['mitos de cthulhu','cthulhu mythos','mythos','conhecimento dos mitos','mitos'],
   ['investigador','investigadores','investigator','ocupacao','occupation','profissao','profissoes'],
   ['magia','spell','spells','feitico','feiticos','grimorio','grimoire','ritual'],
   ['pericia','skill','skills','biblioteca','library use','pesquisa','investigacao'],
   ['loucura temporaria','temporary insanity','loucura indefinida','indefinite insanity','insanidade'],
   ['combate','fight','fighting','dodge','esquiva','contra ataque'],
   ['perseguicao','chase','chases','fuga','velocidade','movimento'],
   ['ferimento grave','major wound','major wounds','pontos de vida','hit points'],
   ['dificuldade','difficulty','roll','test','teste','rolagem'],
   ['resistencia','opposed roll','teste resistido','oposto']
  ]
 };
 const sys=id=>id==='coc'||id==='cthulhu'?'chamado-de-ctchulhu':id==='dnd'?'d-d':id;
 function variants(query,systemId='all',limit=22){
  const input=norm(query),original=words(query),pool=new Set(original),selected=sys(systemId);
  const groups=[...families.common,...(selected==='all'?Object.values(families).slice(1).flat():families[selected]||[])];
  // Group must match a whole word or an entire phrase in the actual user query.
  // Do not cascade on newly-added synonyms or invent a rule when evidence is missing.
  for(const group of groups){
   if(!group.some(alias=>{
    const value=norm(alias);
    return value.includes(' ')?(' '+input+' ').includes(' '+value+' '):original.includes(value);
   }))continue;
   for(const alias of group){for(const word of words(alias))if(pool.size<limit)pool.add(word);}
  }
  return [...pool].slice(0,limit);
 }
 function safeExcerpt(source){
  let text=String(source??'').replace(/\u0000/g,' ').replace(/[\u0001-\u0008\u000b-\u001f]/g,' ')
   .replace(/\uFB01/g,'fi').replace(/\uFB02/g,'fl');
  const invalid=(text.match(/\ufffd/g)||[]).length;
  const corrupted=invalid>=3 && invalid/Math.max(text.length,1)>.018;
  text=text.replace(/\ufffd+/g,' ').replace(/\s+/g,' ').trim();
  return {text,corrupted};
 }
 return {norm,words,variants,safeExcerpt};
});
