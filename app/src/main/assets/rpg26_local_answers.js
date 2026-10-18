/* RPG Mesa 0.26 — resposta extrativa local, determinística e sem modelos de IA.
 * Título / página / edição preservados; nenhum dado é gerado além dos trechos existentes.
 */
(function(root, factory){
 const lib=factory();
 if(typeof module==='object'&&module.exports)module.exports=lib;
 if(root)root.RPG26_LOCAL=lib;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const stop=new Set('a o e as os um uma umas uns de da do dos das no na nos nas em por para com como qual quais que quando onde quanto quantos quais seria saber explicar funciona funcionam funcionamento funciona funciona quero meu minha seus sua me ajuda uma sobre existe tem pode devo algo livro livros pagina paginas sistema sistemas rpg regra regras do da ao aos seu seus voce vc eu'.split(' '));
 const normalize=t=>String(t??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 const words=t=>[...new Set(normalize(t).split(' ').filter(x=>x.length>=3&&!stop.has(x)))].slice(0,24);
 const stems=term=>term.length>5?term.replace(/(amentos|imento|imentos|idades|idade|acoes|acao|mente|ando|endo|indo|ados|adas|idos|idas|ares|ores|ar|er|ir|es|s)$/,''):term;
 function terms(query,systemId,systems,core){
  const fromCore=core?.searchTerms?.(query,systemId,systems)||[];
  const base=fromCore.length?fromCore:words(query);
  return [...new Set(base.concat(base.map(stems)).filter(x=>x.length>=3&&!stop.has(x)))].slice(0,30);
 }
 const kindRank={structured:2,index:1};
 function rankDocuments(query,docs,options={}){
  const systemId=options.systemId||'all',edition=options.edition||'all',max=Math.max(1,Math.min(30,options.limit||14));
  const qTerms=terms(query,systemId,options.systems||[],options.core);
  if(!qTerms.length)return [];
  const list=Array.isArray(docs)?docs:[];
  const filtered=list.filter(d=>d?.kind!=='metadata'&&d?.text&&(systemId==='all'||d.systemId===systemId)&&(edition==='all'||d.edition===edition));
  if(!filtered.length)return [];
  const qNorm=normalize(query);
  const baseTerms=words(query).filter(x=>!((options.systems||[]).find(s=>s.id===systemId)?.title||'').toLowerCase().includes(x));
  const effective=baseTerms.length?baseTerms:qTerms;
  const matches=[];
  for(const d of filtered){
    const title=normalize(d.title),body=normalize(d.text);
    const titleTerms=new Set(title.split(' ')),bodyTerms=new Set(body.split(' '));
    let score=0,unique=0;
    for(const t of qTerms){
      const inTitle=title.includes(t),inBody=body.includes(t);
      if(inTitle||inBody)unique++;
      if(titleTerms.has(t))score+=12;
      else if(inTitle)score+=6;
      if(bodyTerms.has(t))score+=5;
      else if(inBody)score+=2;
    }
    const matched=effective.filter(t=>title.includes(t)||body.includes(t)||(t.length>=5&&(title.includes(stems(t))||body.includes(stems(t))))).length;
    if(!matched)continue;
    if(qNorm.length>8&&body.includes(qNorm))score+=24;
    if(qNorm.length>8&&title.includes(qNorm))score+=33;
    score+=(matched/effective.length)*18;
    score+=Math.min(8,unique);
    // Purely generic word overlap should not look like a verified answer.
    if(score<7)continue;
    matches.push({...d,matchScore:score,matchedCount:matched,coverage:matched/effective.length});
  }
  matches.sort((a,b)=>b.matchScore-a.matchScore||b.coverage-a.coverage||((kindRank[b.kind]||0)-(kindRank[a.kind]||0)));
  return matches.slice(0,max);
 }
 function splitSentences(text){
  return String(text||'').replace(/\s+/g,' ').trim().match(/[^.!?;]+(?:[.!?;]+|$)/g)?.map(s=>s.trim()).filter(s=>s.length>=18)||[];
 }
 function extractSentences(query,docs,options={}){
  const qTerms=terms(query,options.systemId,options.systems,options.core);
  const selections=[];
  const distinct=new Set();
  for(const doc of docs){
    const sentences=splitSentences(doc.text);
    const all=sentences.length?sentences:[String(doc.text).slice(0,260)];
    const ranked=all.map((sentence,i)=>{
      const v=normalize(sentence);
      let match=0;
      for(const term of qTerms)if(v.includes(term))match+=v.split(term).length>2?5:3;
      return {sentence,i,score:match+(i===0?2:0)+(normalize(doc.title).includes(qTerms[0]||'__x')?2:0)};
    }).sort((a,b)=>b.score-a.score||a.i-b.i);
    for(const entry of ranked.slice(0,2)){
      if(selections.length>=5)break;
      if(entry.score<2 && doc.kind==='index')continue;
      const sentence=entry.sentence.slice(0,260);
      const normalized=normalize(sentence).slice(0,90);
      if(!normalized||distinct.has(normalized))continue;
      distinct.add(normalized);
      selections.push({text:sentence,source:doc});
    }
    if(selections.length>=5)break;
  }
  return selections.slice(0,5);
 }
 function answer(query,docs,options={}){
  const q=String(query||'').trim();
  if(!q)return {state:'empty',title:'Digite uma pergunta para pesquisar.',points:[],hits:[]};
  const hits=rankDocuments(q,docs,{...options,limit:20});
  const metadata=(Array.isArray(options.catalogDocs)?options.catalogDocs:[]).filter(d=>
    (options.systemId==='all'||d.systemId===options.systemId)&&
    (options.edition==='all'||d.edition===options.edition) &&
    words(q).some(w=>normalize(d.title).includes(w))).slice(0,5);
  if(!hits.length)return {
   state:metadata.length?'catalog':'missing',
   title:metadata.length?'Encontrei livros relacionados, mas não o texto da regra.':'Não encontrei uma resposta comprovável nos textos disponíveis.',
   explanation:'Sem um trecho pesquisável não é possível sintetizar essa regra com segurança. Importe um índice PDF vinculado ao sistema para pesquisar o conteúdo do livro.',
   points:[],hits:[],catalog:metadata
  };
  // Prefer matching excerpts to blind concatenation of different pages.
  const top=hits[0];
  const candidates=hits.filter(h=>h.matchScore>=Math.max(7,top.matchScore*.42)).slice(0,7);
  const points=extractSentences(q,candidates,{...options,core:options.core});
  if(!points.length)return {state:'missing',title:'Nenhuma passagem legível corresponde à pergunta.',points:[],hits};
  return {state:'found',title:'Resposta localizada nos livros',explanation:'Síntese extrativa: somente informações existentes nos trechos indexados. Confira o contexto da página original.',
   points,hits:candidates,catalog:metadata};
 }
 return {normalize,words,stems,terms,rankDocuments,splitSentences,extractSentences,answer};
});