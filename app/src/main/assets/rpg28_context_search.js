/* RPG Mesa 0.28 — busca contextual deterministica, 100% local, sem modelos ou APIs.
 * Busca por conceitos, flexoes e relevancia probabilistica (BM25 simplificado).
 * Nenhum texto de resposta e inventado; somente passagens do acervo escolhido.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RPG28_CONTEXT=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 const vocabulary=(typeof window!=='undefined'?window.MastermindSearchVocabulary:null)||
  (typeof module!=='undefined'&&module.exports?require('./mastermind_search_vocabulary.js'):null);
 const stop=new Set('a o as os um uma uns umas de do da dos das em no na nos nas e ou ao aos por para com sem sobre que qual quais como quando onde quem oque voce vc eu me meu minha meus minhas seu sua seus suas isso isto aquele aquela seria posso pode podem poderia quero saber explicar explique fale diga funciona funcionam funcionamento regra regras livro livros rpg sistema sistemas personagem personagens jogo jogos dentro'.split(' '));
 const irregular={dormi:'dormir',dormimos:'dormir',dormindo:'dormir',durmo:'dormir',durma:'dormir',durante:'durante',recupero:'recuperar',recupera:'recuperar',recuperamos:'recuperar',recuperando:'recuperar',recuperei:'recuperar',ganho:'ganhar',ganha:'ganhar',gasto:'gastar',gasta:'gastar',custam:'custo',dura:'duracao',durar:'duracao',descansamos:'descanso',descansando:'descanso',descansar:'descanso',descansa:'descanso',san:'san',pv:'pv',pe:'pe'};
 const stem=w=>{
  w=irregular[w]||w;
  if(w.length<5)return w;
  return w.replace(/(amentos|imentos|adoras|adores|amento|imento|idades|idade|acoes|acao|mente|ando|endo|indo|ados|adas|idos|idas|ando|aria|eriam|ariam|coes|cao|ndo|ando|endo|indo|es|s)$/,'');
 };
 const tok=t=>norm(t).split(' ').filter(Boolean);
 const distinct=a=>[...new Set(a)];
 const wordset=t=>distinct(tok(t).filter(x=>x.length>=2&&!stop.has(x)));
 const COMMON=[
  {id:'repouso',terms:['descanso','descansar','repouso','descansando','dormir','dorme','dormindo','sono','dormimos','durmo','pernoite','interludio','pausa','recuperar dormindo']},
  {id:'recuperacao',terms:['recuperacao','recuperar','regeneracao','restaurar','restauracao','recobrar','recupero','recupera','repor','reabastecer']},
  {id:'vitalidade',terms:['vida','pv','pontos de vida','ferimentos','ferimento','saude','cura','curar','curado','machucado']},
  {id:'recurso',terms:['pe','pontos de esforco','esforco','energia','mana','recurso','recursos','pontos de magia']},
  {id:'mental',terms:['san','sanidade','sanidade mental','relaxar','relaxamento','estabilidade mental','estresse','loucura']},
  {id:'teste',terms:['teste','rolagem','jogada','checar','verificar','dado','dados','pericia','dificuldade','dt','cd','sucesso','falha']},
  {id:'combate',terms:['combate','atacar','ataque','acertar','dano','ferir','defesa','iniciativa','turno','rodada']},
  {id:'habilidades',terms:['habilidade','poder','talento','ritual','magia','feitico','conjurar','conjuracao','especial']},
  {id:'movimento',terms:['movimento','mover','deslocamento','andar','correr','velocidade','metros','distancia']},
  {id:'evolucao',terms:['evoluir','evolucao','nivel','subir de nivel','experiencia','xp','nex','progressao','patamar']}
 ];
 const SPECIFIC={
  'ordem-paranormal':[
   {id:'op-interludio',terms:['interludio','descanso','dormir','relaxar','alimentar se','revisar caso','recuperacao','repouso','pausa entre missoes','apos a missao']},
   {id:'op-esforco',terms:['pe','esforco','pontos de esforco','limite de pe','ritual','habilidade']},
   {id:'op-sanidade',terms:['san','sanidade','relaxar','terror','insanidade','mental']}
  ],
  'd-d':[
   {id:'dnd-descanso',terms:['descanso curto','descanso longo','short rest','long rest','dados de vida','recuperacao']},
   {id:'dnd-teste',terms:['proficiência','proficiencia','bonus de proficiencia','vantagem','desvantagem','teste de atributo','salvaguarda']}
  ],
  'gurps':[
   {id:'gurps-teste',terms:['3d6','teste de habilidade','nivel efetivo','modificador','sucesso','falha']},
   {id:'gurps-pontos',terms:['pontos de personagem','vantagem','desvantagem','pericia','atributo']}
  ]
 };
 const INTENTS={
  cost:/\b(quanto custa|qual custo|gasta|gastar|consome|preco|despesa)\b/,
  time:/\b(quanto tempo|demora|duracao|dura|turnos|rodadas|horas|minutos)\b/,
  conditions:/\b(quando|posso|pode|permitido|requisito|preciso|exige|necessario|condicao|limite|restricao)\b/,
  effects:/\b(o que acontece|o que ganho|ganha|ganho|efeito|beneficio|recupero|recupera|dano|penalidade)\b/,
  comparison:/\b(diferenca|comparacao|melhor|pior|comparado|versus| vs )\b/,
  process:/\b(como|funciona|fazer|uso|usar|ativar|passo|processo)\b/
 };
 function intentOf(question){
  const q=' '+norm(question)+' ';
  return Object.keys(INTENTS).filter(x=>INTENTS[x].test(q));
 }
 const hints={
  cost:['custo','pe','gasta','consome','pontos'],
  time:['tempo','duracao','turnos','rodadas','horas','minutos','cena','interludio'],
  conditions:['quando','se','apenas','somente','exige','requer','necessario','limite','pode'],
  effects:['recupera','recebe','ganha','causa','dano','efeito','pv','pe','sanidade'],
  comparison:['maior','menor','diferente','dobro','metade','triplo','tipo'],
  process:['acao','realizar','teste','durante','usar','funciona','executa']
 };
 function queryModel(question,systemId='all',systems=[]){
  let q=' '+norm(question)+' ';
  const selected=(systems||[]).find(s=>s.id===systemId);
  const aliases=(selected?.title?[selected.title]:[]).concat(systemId==='ordem-paranormal'?['ordem paranormal']:systemId==='d-d'?['dungeons and dragons','d d','dnd']:[]);
  for(const alias of aliases){const a=' '+norm(alias)+' ';if(a.length>3)q=q.replace(a,' ')}
  const original=wordset(q);
  const weights=new Map();
  for(const w of original)weights.set(w,2.5);
  // The aliases affect retrieval, but never invent answers without indexed evidence.
  for(const w of vocabulary?.variants(question,systemId,65)||[]){if(!weights.has(w))weights.set(w,0.82);}
  const originalStems=new Set(original.map(stem));
  const concepts=[];
  const families=COMMON.concat(SPECIFIC[systemId]||[]);
  for(const family of families){
   const isPresent=family.terms.some(t=>{
    const v=norm(t);return v.includes(' ')?q.includes(' '+v+' '):originalStems.has(stem(v));
   });
   if(!isPresent)continue;
   concepts.push(family.id);
   for(const phrase of family.terms){
    for(const term of wordset(phrase)){
     const weight=original.includes(term)?2.5:0.55;
     if(!weights.has(term)||weights.get(term)<weight)weights.set(term,weight);
    }
   }
  }
  // Intent words guide evidence selection, but never create a topical match alone.
  const intents=intentOf(question);
  if(systemId==='ordem-paranormal'&&/\b(?:entre missoes|depois da missao|apos a missao|parar depois|pausa da missao)\b/.test(q)){
   weights.set('interludio',3.3);weights.set('descanso',2.8);concepts.push('op-interludio');
  }
  return {original,terms:[...weights.entries()].slice(0,145).map(([term,weight])=>({term,weight,stem:stem(term)})),concepts,intents};
 }
 const cache=new WeakMap();
 function indexDoc(d){
  let v=cache.get(d);
  if(!v){
   const title=norm(d.title),body=norm(d.text),book=norm(d.book);
   v={title:' '+title+' ',body:' '+body+' ',book:' '+book+' ',len:Math.max(10,tok(body).length),words:new Set(tok(title+' '+body))};
   cache.set(d,v);
  }
  return v;
 }
 function present(text,term,base){
  if(text.includes(' '+term+' '))return true;
  if(term.length>=5&&base.length>=4){
   const terms=term===base?base:stem(term);
   // Portuguese verb/number inflections: prefix must remain selective.
   return text.includes(' '+terms) && (terms.length>=4);
  }
  return false;
 }
 const relevantKinds=new Set(['index','structured']);
 function retrieval(question,docs,options={}){
  const systemId=options.systemId||'all',edition=options.edition||'all';
  const subset=(Array.isArray(docs)?docs:[]).filter(d=>
   d&&d.text&&d.kind!=='metadata'&&(systemId==='all'||d.systemId===systemId)&&(edition==='all'||d.edition===edition));
  const model=queryModel(question,systemId,options.systems||[]);
  if(!model.original.length||!subset.length)return {model,hits:[],related:[],state:'missing'};
  const originalStems=new Set(model.original.map(stem));
  const scoreDoc=d=>{
   const v=indexDoc(d);
   let relevance=0,literal=0,related=0,anchor=false;
   for(const t of model.terms){
    const inTitle=present(v.title,t.term,t.stem),inBody=present(v.body,t.term,t.stem);
    if(!inTitle&&!inBody)continue;
    const isOriginal=t.weight>=2,amount=(inTitle?3.8:0)+(inBody?1.5:0);
    const bonus=t.weight*amount;
    relevance+=bonus/(1+Math.log10(1+v.len)/2);
    if(isOriginal){literal++;anchor=true}else related++;
   }
   // A match to a title/term related to a query concept is eligible,
   // but never retrieve unrelated documents just for generic intent words.
   if(!anchor&&related===0)return null;
   const originalCoverage=literal/Math.max(1,model.original.length);
   // Require substantive thematic evidence, not one incidental two-letter term.
   if(!anchor&&related<2)return null;
   if(anchor&&literal===1&&related===0&&model.original.length>2&&relevance<7)return null;
   const titleText=v.title,bodyText=v.body;
   const cleanQuery=norm(question);
   if(cleanQuery.length>=7&&titleText.includes(cleanQuery))relevance+=24;
   if(cleanQuery.length>=9&&bodyText.includes(cleanQuery))relevance+=10;
   relevance+=originalCoverage*13+Math.min(related,5)*1.2;
   for(const i of model.intents){
    const found=hints[i].filter(w=>present(titleText,w,stem(w))||present(bodyText,w,stem(w))).length;
    relevance+=Math.min(found,3)*1.7;
   }
   if(relevantKinds.has(d.kind))relevance+=1.4;
   // Um ritual do elemento Energia nao e a regra de recuperar PE.
   // Resumos cadastrais genericos nao devem superar regras completas por uma palavra.
   const entityQuery=model.original.some(w=>present(titleText,w,stem(w))&&w.length>4);
   if((d.type==='Ritual'||d.type==='Poder'||d.type==='Perícia')&&!entityQuery&&
      (model.intents.includes('effects')||model.concepts.includes('recuperacao')||model.concepts.includes('repouso')))relevance-=25;
   if(/(?:confira o pdf|consulte o pdf|consulte a regra completa|consulte o pdf para)/.test(v.body)&&literal<=1)relevance-=12;
   return {...d,matchScore:Math.round(relevance*100)/100,matchedCount:literal,coverage:originalCoverage,semanticMatches:related};
  };
  const scores=subset.map(scoreDoc).filter(x=>x&&x.matchScore>=5.8);
  scores.sort((a,b)=>b.matchScore-a.matchScore||b.coverage-a.coverage||((a.page||0)-(b.page||0)));
  const max=Math.min(Math.max(Number(options.limit)||12,1),25),top=scores[0];
  if(!top)return {model,hits:[],related:[],state:'missing'};
  // Neighbour pages and sections are relevant when connected to a strong match.
  const primary=scores.filter(x=>x.matchScore>=Math.max(6.5,top.matchScore*.30)).slice(0,max);
  const picked=new Set(primary.map(d=>d.id||[d.book,d.page,d.title].join('|')));
  const near=[];
  for(const lead of primary.slice(0,4)){
   for(const d of subset){
    const key=d.id||[d.book,d.page,d.title].join('|');
    if(picked.has(key)||d.systemId!==lead.systemId||d.edition!==lead.edition||d.book!==lead.book)continue;
    if(!d.page||!lead.page||Math.abs(d.page-lead.page)>1)continue;
    const v=indexDoc(d),a=indexDoc(lead);
    const intersection=tok(lead.title).filter(t=>t.length>4&&v.body.includes(' '+t+' ')).length;
    const shared=model.terms.filter(t=>t.weight<2.5&&present(v.title+' '+v.body,t.term,t.stem)).length;
    if(intersection>=1||shared>=2){
     near.push({...d,matchScore:Math.max(2,lead.matchScore*.15),matchedCount:0,coverage:0,semanticMatches:shared,contextNeighbour:true});
     picked.add(key);
    }
    if(near.length>=5)break;
   }
   if(near.length>=5)break;
  }
  return {model,hits:primary,related:near,state:'found'};
 }
 function sentenceSplit(text){
  const v=String(text||'').replace(/\s+/g,' ').trim();
  return (v.match(/[^.!?;]+(?:[.!?;]+|$)/g)||[v]).map(s=>s.trim()).filter(s=>s.length>=16);
 }
 function excerpts(hits,model){
  const out=[],seen=new Set();
  for(const d of hits){
   const ranked=sentenceSplit(d.text).map((sentence,n)=>{
    const body=' '+norm(sentence)+' ';
    const literal=model.terms.filter(t=>t.weight>=2&&present(body,t.term,t.stem)).length;
    const semantic=model.terms.filter(t=>t.weight<2&&present(body,t.term,t.stem)).length;
    const intent=model.intents.reduce((n,k)=>n+hints[k].filter(w=>present(body,w,stem(w))).length,0);
    return {text:sentence,source:d,score:literal*6+Math.min(semantic,5)*1.1+Math.min(intent,4)+Math.max(0,3-n)};
   }).sort((a,b)=>b.score-a.score);
   for(const s of ranked.slice(0,2)){
    const unique=norm(s.text).slice(0,180);
    if(!unique||seen.has(unique)||s.score<1.2)continue;
    seen.add(unique);out.push({text:s.text.slice(0,380),source:d});
    if(out.length>=7)return out;
   }
  }
  return out;
 }
 function answer(question,docs,options={}){
  const q=String(question||'').trim();
  if(!q)return {state:'empty',title:'Digite uma pergunta para pesquisar.',points:[],hits:[]};
  const outcome=retrieval(q,docs,{...options,limit:20});
  const catalog=(options.catalogDocs||[]).filter(d=>
   (options.systemId==='all'||!options.systemId||d.systemId===options.systemId)&&
   (options.edition==='all'||!options.edition||d.edition===options.edition)&&
   wordset(q).some(w=>(' '+norm(d.title)+' ').includes(' '+w+' '))).slice(0,5);
  if(outcome.state!=='found')return {state:catalog.length?'catalog':'missing',title:'Nenhuma passagem verificável encontrada neste sistema.',explanation:'O sistema selecionado não contém trechos indexados suficientes para responder. Importe um índice PDF desse sistema.',points:[],hits:[],catalog,queryTerms:outcome.model.terms.map(x=>x.term)};
  const hits=outcome.hits,points=excerpts(hits,outcome.model);
  const confidence=hits[0].matchedCount>=2||hits[0].coverage>=.65?'alta':'parcial';
  return {state:'found',title:'Resposta localizada no sistema selecionado',explanation:'Trechos originais relacionados por assunto e contexto, sem IA.',points,hits,related:outcome.related,confidence,intents:outcome.model.intents,concepts:outcome.model.concepts,queryTerms:outcome.model.terms.map(x=>x.term),catalog};
 }
 function rankDocuments(query,docs,options={}){return retrieval(query,docs,options).hits;}
 return {norm,stem,wordset,queryModel,intentOf,retrieval,rankDocuments,answer};
});