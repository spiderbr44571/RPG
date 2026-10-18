/* RPG Mesa 0.27 - apresentação determinística de respostas baseada só em trechos indexados.
 * Não gera regras nem adiciona valores ausentes: agrupamento/rotulagem dos textos encontrados.
 */
(function(root,factory){
 const engine=factory();
 if(typeof module==='object'&&module.exports)module.exports=engine;
 if(root)root.RPG27_TEMPLATES=engine;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 const KEYWORDS={
  conditions:/\b(?:se|caso|quando|durante|desde que|somente|apenas|requer|exige|necessari[oa]s?|precisa|permitid[oa]s?|pode|podem|nao pode|depende|uma vez|limitad[oa]s?|mestre|condic[ao]es|custa)\b/i,
  values:/\b(?:\d{1,3}d\d{1,3}|\d+[,.]?\d*\s*(?:pv|pe|san|pontos?|dados?|turnos?|rodadas?|horas?|minutos?|metros?|m|%|vezes)|metade|dobro|triplo|triplica|multiplica|nivel\s*\d+|dt\s*\d+|ca\s*\d+|limite de pe|bonus)\b|[+-]\s*\d+/i
 };
 const STOP=new Set('como qual quais quando onde quem o a os as um uma de do da dos das no na nos nas em e ou por para com seu seus sua suas isso isto que funciona funcionam ser tem sobre explicar explicacao regra regras sistema sistemas rpg livro livros quero saber pode voce'.split(' '));
 const meaningful=q=>[...new Set(norm(q).split(' ').filter(w=>w.length>=3&&!STOP.has(w)))];
 const evidenceId=x=>[x.systemId||'',x.edition||'',x.book||'',x.page||'',x.title||''].join('|');
 const shorten=(s,max=330)=>{const v=String(s||'').replace(/\s+/g,' ').trim();return v.length>max?v.slice(0,max-1).replace(/\s+\S*$/,'')+'…':v};
 function splitEvidence(doc){
  // Keeps short original passages, rather than conflating statements from different pages.
  const s=String(doc?.text||'').replace(/\s+/g,' ').trim();
  if(!s)return [];
  const segments=s.match(/[^.!?;]+(?:[.!?;]+|$)/g)||[s];
  return segments.map(x=>x.trim()).filter(x=>x.length>=18&&x.length<=1000);
 }
 function classify(sentence,query){
  const normalized=norm(sentence);
  const matched=meaningful(query).filter(t=>normalized.includes(t)).length;
  const values=KEYWORDS.values.test(normalized);
  const conditions=KEYWORDS.conditions.test(normalized);
  return {matched,values,conditions};
 }
 function factFrom(doc,text,section,score){
  return {text:shorten(text),source:doc,sourceId:evidenceId(doc),section,score};
 }
 function valuesTable(documents,query,semanticTerms=[]){
  const groups=new Map();
  for(const doc of documents){
   const text=String(doc.text||'').replace(/\s+/g,' ');
   const matches=[...text.matchAll(/(?:^|[.;]\s*)([\p{L}][\p{L}\s/()-]{2,53}):\s*([^.;]{2,165})/gu)];
   for(const m of matches){
    const label=m[1].trim(),value=m[2].trim(),words=norm(label).split(' ');
    if(label.length<4||label.length>50||value.length<2||value.length>150||/^(?:em|por|sao|exemplo|como|fonte|regra)\b/i.test(label))continue;
    const base=words.length>1?words.slice(0,-1).join(' '):words[0];
    const overlap=meaningful(query).concat(semanticTerms).some(w=>norm(label+' '+doc.title).includes(w));
    if(!overlap)continue;
    const key=evidenceId(doc)+'::'+base;
    const row={label:shorten(label,55),value:shorten(value,155),source:doc,sourceId:evidenceId(doc)};
    const bucket=groups.get(key)||[];
    if(!bucket.some(x=>norm(x.label)===norm(row.label)))bucket.push(row);
    groups.set(key,bucket);
   }
  }
  const order=[...groups.values()].filter(items=>items.length>=2).sort((a,b)=>b.length-a.length);
  if(!order.length)return [];
  return order[0].slice(0,8);
 }
 function format(query,result,options={}){
  if(!result||result.state!=='found'||!Array.isArray(result.hits)||!result.hits.length)
   return {state:'unavailable',sections:[],values:[],sources:[],lead:null};
  const hits=result.hits.filter(d=>d?.kind!=='metadata'&&d?.text&&
    (options.systemId==='all'||!options.systemId||d.systemId===options.systemId)&&
    (options.edition==='all'||!options.edition||d.edition===options.edition)).slice(0,8);
  if(!hits.length)return {state:'unavailable',sections:[],values:[],sources:[],lead:null};
  const queryWords=meaningful(query);
  const semanticWords=(result.queryTerms||[]).filter(x=>x.length>=3).slice(0,70);
  const pool=[],seen=new Set();
  for(const [rank,doc] of hits.entries()){
   for(const [position,sentence] of splitEvidence(doc).entries()){
    const clean=shorten(sentence),normalized=norm(clean);
    if(!clean||seen.has(normalized))continue;
    seen.add(normalized);
    const flags=classify(clean,query);
    const titleMatches=queryWords.filter(w=>norm(doc.title).includes(w)).length;
    const contextualMatches=semanticWords.filter(w=>normalized.includes(w)).length;
    let points=flags.matched*8+Math.min(5,contextualMatches)*2+titleMatches*6+(rank===0?9:Math.max(0,7-rank))+(position===0?3:0);
    if(points<3)continue;
    const section=flags.values?'values':flags.conditions?'conditions':'explanation';
    pool.push(factFrom(doc,clean,section,points));
   }
  }
  pool.sort((a,b)=>b.score-a.score);
  // Ensure a clear introductory explanation when supported by a real passage.
  const initial=pool.find(x=>x.section==='explanation') ||
    pool.find(x=>x.section==='conditions'&&!/^\b(?:nao|so)\b/i.test(x.text)) ||
    pool[0]||null;
  const lead=initial?{...initial,text:shorten(initial.text,320)}:null;
  const used=new Set(lead?[norm(lead.text)]:[]);
  const grouped={explanation:[],conditions:[],values:[]};
  const quotas={explanation:2,conditions:3,values:4};
  for(const entry of pool){
   if(used.has(norm(entry.text)))continue;
   const type=entry.section;
   if(grouped[type].length>=quotas[type])continue;
   used.add(norm(entry.text));grouped[type].push(entry);
  }
  // Avoid implying a value table is comprehensive: only values explicitly present in a single passage.
  const table=valuesTable(hits,query,semanticWords);
  if(table.length){
   const tableContent=new Set(table.map(x=>norm(x.label+' '+x.value)));
   grouped.values=grouped.values.filter(x=>![...tableContent].some(v=>norm(x.text).includes(v))).slice(0,2);
  }
  const sections=[
   {id:'explanation',title:'Como funciona',items:grouped.explanation},
   {id:'conditions',title:'Condições e limitações',items:grouped.conditions},
   {id:'values',title:'Valores e efeitos',items:grouped.values}
  ].filter(x=>x.items.length);
  const allItems=[...(lead?[lead]:[]),...sections.flatMap(x=>x.items),...table];
  const distinctSources=[],sourceKeys=new Set();
  for(const item of allItems){
   if(!sourceKeys.has(item.sourceId)){sourceKeys.add(item.sourceId);distinctSources.push(item.source)}
  }
  return {state:'formatted',title:'Resposta encontrada na biblioteca',lead,sections,values:table,sources:distinctSources,
   sourceQuality:hits.some(h=>h.kind==='index')?'Índices de PDF + registros estruturados':'Registros estruturados'};
 }
 return {norm,meaningful,splitEvidence,classify,valuesTable,format};
});