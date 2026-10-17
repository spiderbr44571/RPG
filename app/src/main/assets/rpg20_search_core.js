/* RPG Mesa v0.20: search infrastructure for every catalogued system.
 * Indexing and retrieval only: never creates game rules from a PDF.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RPG20_SEARCH=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const FOLDERS=['sistema','rpg','livro','regra','regras','qual','quais','como','que','o','a','os','as','um','uma','de','da','do','dos','das','e','em','no','na','nos','nas','para','por','com','sem','ao','aos','ou','se','eu','voce','vc','ser','sobre','meu','minha','onde','quando','mais','funciona','fazer','funcionam','personagem','me','pode','tem','sao'];
 const STOP=new Set(FOLDERS),MAX=350;
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ');
 const tokens=query=>[...new Set(norm(query).split(/\s+/).filter(x=>x.length>=2&&!STOP.has(x)))].slice(0,20);
 const aliases={
  'ordem-paranormal':['ordem','ordem paranormal','op','op rpg'],
  'd-d':['dnd','d&d','dungeons and dragons','dungeons dragons','5e','d d'],
  'gurps':['gurps','gurps 4e','gurps lite'],
  'tormenta-20':['tormenta','t20'],'chamado-de-ctchulhu':['call of cthulhu','chamado de cthulhu','coc'],
  'basic-roleplaying':['brp'],'cyberpunk-red':['cyberpunk','red rpg'],'world-of-darkness':['vampiro','world of darkness','wod']
 };
 function edition(b){
  const text=norm((b.title||'')+' '+(b.path||[]).join(' '));
  if(/\b2024\b/.test(text))return '2024';
  if(/\b(2014|5e 2014)\b/.test(text))return '5e-2014';
  if(/\b(3 5|3e)\b/.test(text))return '3.5';
  if(/\b(4e|quarta edicao|4 edicao)\b/.test(text))return '4e';
  if(/\bv1 3\b/.test(text))return '1.3';
  return '';
 }
 function makeCatalogDocs(systems){
  if(!Array.isArray(systems))return [];
  return systems.flatMap(system=>(system.books||[]).map(book=>({
    id:'catalog:'+system.id+':'+book.id,
    systemId:system.id,systemName:system.title,edition:edition(book),book:book.title,title:book.title,
    text:(book.path||[]).join(' / '),page:0,kind:'metadata',type:'Livro catalogado (sem texto indexado)',
    sourceBookId:book.id,url:/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{10,160}\/view/.test(book.url||'')?book.url:'',
    labels:(aliases[system.id]||[]).concat(system.title)
  })));
 }
 function makeOrderDocs(op){
  const pack=op?.pack;if(!pack)return [];
  const base={systemId:'ordem-paranormal',systemName:'Ordem Paranormal',edition:'1.3',book:'Ordem Paranormal RPG v1.3',kind:'structured',type:'Regras cadastradas',sourceBookId:'1DrbbitCLXMlP3eV0A_iHrcOU9SBehcr4'};
  const entries=[];
  const add=(type,array,project)=>{for(const r of (Array.isArray(array)?array:[])){
    const x=project(r);if(!x.title||!x.text)continue;
    entries.push({...base,...x,type,title:String(x.title).slice(0,150),text:String(x.text).slice(0,1500),page:Number(x.page)||0});
  }};
  add('Regra',pack.regras,r=>({title:r.nome,text:r.resumo,page:r.paginaLivro}));
  add('Perícia',pack.pericias,r=>({title:r.nome,page:39,text:'Atributo: '+r.atributo+'. '+(r.soTreinado?'Há usos que exigem treinamento.':'Pode ter usos sem treinamento.')+' Consulte o PDF para testes e dificuldade.'}));
  add('Ritual',pack.rituais,r=>({title:r.nome,page:r.paginaLivro,text:'Elemento '+r.elemento+'. Círculo '+r.circulo+'.'+(r.custoBasePE?' Custo base '+r.custoBasePE+' PE.':'')+' Confira o PDF para a descrição completa.'}));
  add('Poder',pack.poderesParanormais,r=>({title:r.nome,page:r.paginaLivro,text:'Poder paranormal '+r.nome+'. Elemento '+(r.elemento||'não cadastrado')+'. Consulte a regra completa.'}));
  add('Condição',pack.condicoes,r=>({title:r.nome,page:r.paginaLivro||0,text:r.resumo||r.efeito||'Condição '+r.nome+'. Consulte a regra completa.'}));
  return entries;
 }
 function makeRulesDocs(dnd,gurps){
  const docs=[];
  if(dnd){
   docs.push({systemId:'d-d',systemName:'D&D',edition:'5e-2014',book:'SRD 5.1 · D&D 5e (2014)',title:'Atributos, testes e proficiência',page:0,
    text:'Teste com d20 e modificador de atributo. Modificador = piso((atributo - 10) / 2). Proficiência cresce de +2 a +6 entre os níveis 1 e 20. Vantagem: dois d20 e usar o maior; desvantagem: usar o menor.',kind:'structured',type:'Mecânica implementada (SRD 5.1)',url:'https://dnd.wizards.com/resources/systems-reference-document'});
   for(const [id,val] of Object.entries(dnd.CLASSES||{})){
    docs.push({systemId:'d-d',systemName:'D&D',edition:'5e-2014',book:'SRD 5.1 · D&D 5e (2014)',title:(dnd.CLASSES_PT?.[id]||id),page:0,
      text:'Classe '+(dnd.CLASSES_PT?.[id]||id)+'. Dado de vida: d'+val.hitDie+'. Mecânicas especiais e subclasses devem ser conferidas na fonte.',kind:'structured',type:'Motor de regras implementado'});
   }
   for(const [name,attr] of Object.entries(dnd.SKILLS||{}))
    docs.push({systemId:'d-d',systemName:'D&D',edition:'5e-2014',book:'SRD 5.1 · D&D 5e (2014)',title:dnd.LABELS?.[name]||name,page:0,
     text:'Perícia '+(dnd.LABELS?.[name]||name)+' usa '+(dnd.LABELS?.[attr]||attr)+'. Adicione o bônus de proficiência quando aplicável; especialização dobra o bônus de proficiência.',kind:'structured',type:'Motor de regras implementado'});
  }
  if(gurps){
   docs.push({systemId:'gurps',systemName:'GURPS',edition:'4e',book:'GURPS Lite 4ª edição',title:'Atributos e testes 3d6',page:0,
    text:'Atributos básicos ST, DX, IQ e HT. Teste de habilidade com 3d6 comparado ao nível efetivo da perícia ou atributo. Níveis e modificadores de dificuldades variam conforme as regras.',kind:'structured',type:'Motor de regras implementado'});
   docs.push({systemId:'gurps',systemName:'GURPS',edition:'4e',book:'GURPS Lite 4ª edição',title:'Pontos de personagem',page:0,
    text:'A criação de personagem utiliza orçamento de pontos para atributos, vantagens, desvantagens e perícias. Valores dependem do sistema GURPS 4e.',kind:'structured',type:'Motor de regras implementado'});
  }
  return docs;
 }
 function inferSystem(query,systems){
  const input=norm(query);
  // Require an explicit system name or alias within the question; don't infer from subject matter.
  const hits=systems.filter(x=>{
    const words=(aliases[x.id]||[]).concat([x.title]).map(norm);
    return words.some(w=>w.length>=3&&(' '+input+' ').includes(' '+w+' '));
  });
  return hits.length===1?hits[0].id:null;
 }
 function docMatch(d,query,ts){
  const title=norm(d.title),text=norm(d.text),book=norm(d.book),name=norm(d.systemName);
  const q=norm(query).trim();let score=0;
  if(q.length>=3 && title.includes(q))score+=45;
  if(q.length>=3 && text.includes(q))score+=23;
  for(const t of ts){
   if(title.includes(t))score+=10;
   if(text.includes(t))score+=Math.min(4,text.split(t).length-1)*2;
   if(book.includes(t))score+=3;
  }
  // An entire system name by itself must NOT make every book appear relevant.
  if(ts.some(t=>name.split(' ').includes(t)) && ts.length===1)score=Math.max(score,1);
  return score;
 }
 function search(query,options={}){
  const q=String(query||'').slice(0,MAX),ts=tokens(q);
  if(!ts.length)return [];
  const docs=Array.isArray(options.docs)?options.docs:[];
  const sys=options.systemId||'all',filter=options.edition||'all',max=Math.min(30,Math.max(1,options.limit||10));
  return docs.filter(d=>(sys==='all'||d.systemId===sys)&&(filter==='all'||!d.edition||d.edition===filter))
    .map(d=>({...d,score:docMatch(d,q,ts)})).filter(d=>d.score>0)
    .sort((a,b)=>b.score-a.score || (a.kind==='metadata'?1:-1) - (b.kind==='metadata'?1:-1))
    .slice(0,max);
 }
 function docsFromIndexes(books,systems){
  const registry=new Map(systems.map(s=>[s.id,s.title]));
  return (Array.isArray(books)?books:[]).flatMap(b=>{
   const systemId=b.systemId||'ordem-paranormal'; // legacy index was only for Ordem.
   if(!registry.has(systemId))return [];
   return (Array.isArray(b.chunks)?b.chunks:[]).map((x,i)=>({
    id:'private:'+b.id+':'+i,systemId,systemName:registry.get(systemId),edition:b.edition||'',book:b.book?.title||'PDF indexado',
    title:x.title||'Trecho da página',page:Number(x.page)||0,text:String(x.text||'').slice(0,1700),
    kind:'index',type:'Índice privado de PDF',sourceBookId:b.sourceBookId||'',url:''
   }));
  });
 }
 return {aliases,edition,norm,tokens,makeCatalogDocs,makeOrderDocs,makeRulesDocs,inferSystem,docMatch,search,docsFromIndexes};
});