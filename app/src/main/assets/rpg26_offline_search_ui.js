/* RPG Mesa v0.26 — consulta só por pesquisa local e trechos verificáveis. */
(()=>{'use strict';
 const $=(s,r=document)=>r.querySelector(s);
 const app=window.RPG_DEMO,op=window.OP13,core=window.RPG20_SEARCH,extract=window.RPG28_CONTEXT||window.RPG26_LOCAL,templates=window.RPG27_TEMPLATES,area=$('#screen-ai');
 if(!area||!op?.pack||!core||!extract||!templates)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const systems=()=>window.RPG15_SYSTEMS?.systems||[];
 const base=core.makeOrderDocs(op).concat(core.makeCreatureDocs(window.RPG19_ORDER_CREATURES),core.makeRulesDocs(window.RPG18_DND_ENGINE,window.GURPS4_ENGINE));
 const dbName='RPG-Mesa-Private-Search';
 let activeSystem='all',activeEdition='all',indexed=[],latest=[],latestAnswer=null,formattedAnswer=null;
 let pdfPreviousState='',pdfLastQuery='',pdfPageOffset=0,pdfPageTotal=0,pdfPendingView=0,pdfLastProgress=-1;
 area.innerHTML=[
 '<div class="r26-top"><div><div class="eyebrow">CONSULTA CONTEXTUAL · 100% OFFLINE</div><h1 class="page-h">Pergunte <i>aos livros.</i></h1><p class="page-sub">Encontre regras por contexto, sinônimos e assuntos relacionados, sempre com fontes do sistema selecionado.</p></div><span id="r26-status" class="r26-status">● Pronto para pesquisar</span></div>',
 '<div class="r26-scope"><label>Sistema <select id="r26-system"><option value="all">Todos os sistemas</option></select></label><label>Edição <select id="r26-edition"><option value="all">Todas as edições</option><option value="1.3">Ordem v1.3</option><option value="5e-2014">D&D 5e (2014)</option><option value="2024">D&D 2024</option><option value="3.5">D&D 3.5</option><option value="4e">4ª edição</option></select></label></div>',
 '<div class="r26-layout"><main class="r26-panel"><h2>Buscar respostas nas regras</h2><p>Escreva sua dúvida. O aplicativo organiza os trechos encontrados por assunto e informa livro e página, sem criar valores ou regras não cadastrados.</p>',
 '<form id="r26-form" class="r26-form"><input id="r26-query" maxlength="450" autocomplete="off" placeholder="Ex.: Como funciona o descanso em Ordem Paranormal?" aria-label="Pergunta para pesquisar nos livros" required><button type="submit">Pesquisar ↗</button></form>',
 '<div class="r26-quick"><button type="button" data-r26-quick="Como funciona o descanso em Ordem Paranormal?">Descanso</button><button type="button" data-r26-quick="Como funcionam testes e proficiência no D&D 5e?">Testes D&D</button><button type="button" data-r26-quick="Como funciona um teste 3d6 no GURPS?">GURPS 3d6</button></div>',
 '<div id="r26-answer" class="r26-answer" aria-live="polite"><div class="r26-empty">Faça uma pesquisa para ver a resposta resumida e suas fontes.</div></div></main>',
 '<aside class="r26-aside"><section class="r26-aside-box"><h3>Fontes da pesquisa</h3><div id="r26-sources" class="r26-muted">As páginas serão exibidas após a pesquisa.</div></section>',
 '<section class="r26-aside-box"><h3>Biblioteca pesquisável</h3><div id="r45-pdf-status" class="r45-pdf-status" aria-live="polite">Verificando PDF importado...</div><button type="button" id="r47-retry-index" hidden>Retomar indexação</button><p id="r26-count">Carregando índices do aparelho...</p><label class="r26-index-select">Vincular índice ao sistema<select id="r26-index-system"><option value="">Selecione um sistema</option></select></label>',
 '<label class="r26-file">+ Importar índice PDF (JSON)<input id="r26-import" type="file" accept=".json,application/json"></label><div id="r26-books"></div>',
 '<p>PDFs pessoais importados na Biblioteca são indexados automaticamente neste Android, sem internet. Índices JSON continuam opcionais para outras fontes.</p></section></aside></div>'
 ].join('');
 const status=msg=>$('#r26-status').textContent='● '+msg;
 const sysName=id=>systems().find(s=>s.id===id)?.title||id;
 const pageLabel=doc=>doc?.page?'p. '+doc.page+(doc.kind==='index'?' (PDF)':''):'sem página';
 function openSource(doc){
  if(doc.sourceBookId&&/^[A-Za-z0-9_-]{10,160}$/.test(doc.sourceBookId)){
   if(window.RpgDriveBridge?.openDocument){window.RpgDriveBridge.openDocument('file',doc.sourceBookId);return}
   window.open('https://drive.google.com/file/d/'+doc.sourceBookId+'/view','_blank','noopener,noreferrer');return;
  }
  if(/^https:\/\//.test(doc.url||'')){window.open(doc.url,'_blank','noopener,noreferrer');return}
  app?.notify?.('Consulte a página indicada no PDF original.');
 }
 const native=()=>window.RpgBookBridge&&typeof window.RpgBookBridge.searchPdf==='function'?
  window.RpgBookBridge:null;
 function nativeStatus(){
  try{return native()?JSON.parse(native().pdfIndexStatus()):{state:'unavailable'}}catch{return {state:'error',message:'Pesquisa nativa indisponível.'}}
 }
 function showIndexStatus(force=false){
  const state=nativeStatus(),el=$('#r45-pdf-status');
  if(!el)return;
  const type=state.state;
  const texts={
   ready:'PDF pesquisável: '+(state.pages||0)+' páginas · '+(state.title||'Livro pessoal'),
   indexing:(state.pages?'Processadas '+(state.progress||0)+' / '+state.pages+' páginas. ':'Verificando o total de páginas do PDF. ')+(state.message||'Preparando busca...'),
   partial:'Índice parcial: '+(state.progress||0)+' / '+(state.pages||'?')+' páginas. A busca funciona nessas páginas.',
   pending:state.message||'PDF importado, aguardando extração de texto...',
   missing:'Nenhum PDF pessoal importado na Biblioteca.',
   no_text:'Este PDF não tem texto selecionável. Se for escaneado, é necessário OCR.',
   unavailable:'Busca do PDF disponível na versão Android instalada.',
   error:'Falha na extração: '+(state.message||'Não foi possível ler este PDF. Tente selecioná-lo novamente na Biblioteca.')
  };
  el.textContent=texts[type]||'Verificando PDF...';
  el.dataset.state=type;
  $('#r47-retry-index').hidden=!(type==='partial'||type==='pending'||type==='error');
  if((type==='pending'||type==='partial')&&native()&&force)native().indexSavedPdf();
  // Atualiza só a busca textual enquanto novas páginas são indexadas;
  // não recalcula catálogos nem recria o restante da resposta.
  const progress=Number(state.progress)||0;
  if(pdfLastQuery&&$('#r26-query')?.value.trim()===pdfLastQuery&&
   (progress>pdfLastProgress||type!==pdfPreviousState)&&
   (type==='indexing'||type==='partial'||type==='ready'||type==='no_text'||type==='error')){
    renderPdfResults(pdfLastQuery);
  }
  pdfLastProgress=progress;
  pdfPreviousState=type;
 }
 function pdfResults(query,offset=0){
  if(!native())return null;
  try{return JSON.parse(native().searchPdf(query,20,offset))}
  catch{return {state:'error',message:'Falha na busca interna do PDF.',hits:[]}}
 }
 function renderPdfResults(query,offset=0,append=false){
  if(!native())return;
  const data=pdfResults(query,offset),container=$('#r26-answer');
  if(!container||!data)return;
  const ready=['ready','indexing','partial'].includes(data.state);
  const old=container.querySelector('#r45-pdf-hits');
  if(append&&old?.dataset.query!==query)return;
  if(!append&&old)old.remove();
  if(!ready){
   if(!append){
    const msg=document.createElement('section');msg.id='r45-pdf-hits';msg.className='r45-pdf-hits';
    msg.innerHTML='<h3>Pesquisa no livro importado</h3><p class="r26-muted">'+esc(
     data.state==='indexing'?'Buscando nas páginas já extraídas do livro. Os resultados aparecem conforme a leitura avança.':
     data.state==='no_text'?'PDF sem camada de texto pesquisável (provavelmente escaneado).':
     data.state==='missing'?'Importe seu PDF na Biblioteca para pesquisar dentro dele.':
     data.state==='pending'?'Preparando índice do PDF...':data.state==='error'?(data.status?.message||data.message||'Erro ao ler o PDF.'):'Pesquisa textual do PDF indisponível.'
    )+'</p>';
    container.prepend(msg);
   }
   return;
  }
  const hits=Array.isArray(data.hits)?data.hits:[];
  pdfPageTotal=Number(data.total)||0;pdfPageOffset=offset+hits.length;
  // Síntese extrativa: não inventa explicações; mostra trechos curtos da fonte e página.
  const highlights=hits.slice(0,3).map(item=>
   '<li><span>PDF · p. '+Number(item.page)+'</span> '+esc(String(item.excerpt||'').slice(0,180))+'</li>').join('');
  const partial=data.complete===false;
  const coverage=partial?' · parcial ('+(Number(data.indexedPages)||0)+' / '+(Number(data.totalPages)||'?')+' páginas indexadas)':'';
  const summary=hits.length?'<section class="r47-snippets"><h4>Resumo dos trechos encontrados</h4>'+
   '<p>Principais passagens localizadas no PDF, sem interpretação por IA:</p><ul>'+highlights+'</ul></section>':'';
  const list=hits.map(item=>'<article class="r45-pdf-hit"><div><strong>Página '+Number(item.page)+
   ' do arquivo PDF</strong><p>'+esc(item.excerpt||'Trecho encontrado nesta página.')+
   '</p></div><button type="button" data-r45-page="'+Number(item.page)+'">Abrir página ↗</button></article>').join('');
  if(append&&old){
   const rows=old.querySelector('.r45-pdf-hit-list');
   rows?.insertAdjacentHTML('beforeend',list);
   old.querySelector('.r45-pdf-count').textContent=pdfPageTotal+' páginas com correspondências'+coverage;
   const more=old.querySelector('#r45-pdf-more');if(more)more.hidden=pdfPageOffset>=pdfPageTotal;
   return;
  }
  const panel=document.createElement('section');
  panel.id='r45-pdf-hits';panel.className='r45-pdf-hits';panel.dataset.query=query;
  panel.innerHTML='<h3>Busca rápida no PDF</h3>'+
   '<p class="r45-pdf-count">'+pdfPageTotal+' páginas com correspondências'+coverage+' · '+esc(data.book||'Livro importado')+'</p>'+summary+
   '<div class="r45-pdf-hit-list">'+(list||'<p class="r26-muted">'+(partial?'Ainda não encontrei este termo nas páginas indexadas. Continuarei procurando enquanto preparo o PDF.':'Nenhuma ocorrência literal encontrada neste PDF.')+'</p>')+'</div>'+
   '<button type="button" id="r45-pdf-more" '+(pdfPageOffset>=pdfPageTotal?'hidden':'')+'>Mostrar mais páginas</button>';
  container.prepend(panel);
  if(hits.length){
   const placeholders=container.querySelectorAll('.r26-empty');
   for(const hint of placeholders)if(/Sem uma passagem|Importe um índice/.test(hint.textContent))hint.remove();
  }
 }
 const viewer=document.createElement('div');
 viewer.id='r45-page-viewer';viewer.hidden=true;
 viewer.innerHTML='<div class="r45-page-dialog" role="dialog" aria-modal="true" aria-label="Página pesquisada do PDF">'+
  '<div class="r45-page-top"><strong id="r45-page-caption">Página do livro</strong><button type="button" id="r45-page-close">Fechar ×</button></div>'+
  '<p id="r45-page-loading">Abrindo página do arquivo pessoal...</p>'+
  '<img id="r45-page-img" alt="Página do PDF pessoal pesquisado" hidden></div>';
 document.body.append(viewer);
 function closePdfViewer(){
  viewer.hidden=true;pdfPendingView=0;$('#r45-page-img').removeAttribute('src');
  $('#r45-page-img').hidden=true;
 }
 $('#r45-page-close').addEventListener('click',closePdfViewer);
 viewer.addEventListener('click',event=>{if(event.target===viewer)closePdfViewer()});
 function openPdfHit(page){
  if(!native()||!Number.isInteger(page)||page<1)return;
  pdfPendingView=page;viewer.hidden=false;
  $('#r45-page-caption').textContent='PDF · página '+page+' do arquivo';
  $('#r45-page-loading').textContent='Abrindo a página do PDF pessoal...';
  $('#r45-page-img').hidden=true;
  native().renderIndexPage(page);
 }
 window.addEventListener('rpg-page-rendered',event=>{
  if(!pdfPendingView||!event.detail?.physical||event.detail.page!==pdfPendingView)return;
  const img=$('#r45-page-img');img.src=event.detail.src;img.hidden=false;
  $('#r45-page-loading').textContent='';
 });
 window.addEventListener('rpg-page-error',event=>{
  if(pdfPendingView)$('#r45-page-loading').textContent=String(event.detail||'Não foi possível abrir a página.');
 });
 function indexDB(){return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('Armazenamento local indisponível'));
  const r=indexedDB.open(dbName,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('books'))r.result.createObjectStore('books',{keyPath:'id'})};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Falha no banco local'));
 })}
 async function getBooks(){const db=await indexDB();return new Promise((resolve,reject)=>{
  const t=db.transaction('books','readonly'),r=t.objectStore('books').getAll();
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Falha ao carregar'));
  t.oncomplete=()=>db.close();t.onerror=()=>db.close();
 })}
 async function putBook(book){const db=await indexDB();return new Promise((resolve,reject)=>{
  const t=db.transaction('books','readwrite');t.objectStore('books').put(book);
  t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)};
 })}
 async function removeBook(id){const db=await indexDB();return new Promise((resolve,reject)=>{
  const t=db.transaction('books','readwrite');t.objectStore('books').delete(id);
  t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error)};
 })}
 function refresh(books){
  indexed=core.docsFromIndexes(books,systems());
  const count=systems().reduce((n,s)=>n+(s.books||[]).length,0);
  $('#r26-count').textContent=systems().length+' sistemas · '+count+' livros catalogados · '+(base.length+indexed.length)+' trechos pesquisáveis';
  $('#r26-books').innerHTML=books.map(b=>'<div class="r26-book"><span>'+esc(b.book?.title||'Índice')+'<small>'+esc(sysName(b.systemId||'ordem-paranormal'))+' · '+(b.chunks?.length||0)+' trechos</small></span><button type="button" data-r26-remove="'+esc(b.id)+'" aria-label="Remover índice">×</button></div>').join('')||'<span class="r26-muted">Nenhum índice PDF adicional importado.</span>';
 }
 async function load(){try{refresh(await getBooks())}catch{refresh(window.rpgVolatileBooks||[]);status('Armazenamento limitado; dados temporários')}}
 function catalog(){return core.makeCatalogDocs(systems())}
 function answerQuestion(question){
  const named=core.inferSystem(question,systems());
  // A escolha explícita do sistema nunca é sobrescrita pelo texto da pergunta.
  if(activeSystem==='all'&&named){
   activeSystem=named;activeEdition='all';$('#r26-system').value=named;$('#r26-edition').value='all';
   $('#r26-index-system').value=named;localStorage.setItem('rpg-rules-system',named);
  }
  const result=extract.answer(question,base.concat(indexed),{systemId:activeSystem,edition:activeEdition,systems:systems(),core,catalogDocs:catalog()});
  latestAnswer=result;latest=(result.hits||[]).concat(result.related||[]);
  return result;
 }
 function sourceTag(doc){
  const slot=formattedAnswer?.sources?.indexOf(doc)??-1;
  const name=esc(doc.systemName||sysName(doc.systemId));
  const book=esc(doc.book||'Fonte cadastrada');
  const page=esc(pageLabel(doc));
  const link=slot>=0&&(doc.sourceBookId||doc.url)?
   ' <button class="r27-link" data-r27-source="'+slot+'" type="button" title="Abrir livro">Abrir livro ↗</button>':'';
  return '<span class="r26-source">'+name+' · '+book+' · '+page+link+'</span>';
 }
 function render(result){
  const el=$('#r26-answer'),side=$('#r26-sources');
  if(result.state==='empty'){el.innerHTML='<div class="r26-empty">Digite uma pergunta.</div>';return}
  formattedAnswer=templates.format($('#r26-query').value,result,{systemId:activeSystem,edition:activeEdition});
  let out='<h3>'+esc(formattedAnswer.state==='formatted'?formattedAnswer.title:result.title)+'</h3>';
   if(result.state==='found'&&result.concepts?.length){
    const names={'repouso':'Descanso','recuperacao':'Recuperação','vitalidade':'Vida / PV','recurso':'Energia / PE','mental':'Sanidade','teste':'Testes','combate':'Combate','habilidades':'Habilidades','movimento':'Movimento','evolucao':'Evolução','op-interludio':'Interlúdio','op-esforco':'Esforço','op-sanidade':'Sanidade','dnd-descanso':'Descanso D&D','dnd-teste':'Testes D&D','gurps-teste':'Testes 3d6','gurps-pontos':'Pontos de personagem'};
    out+='<div class="r28-context"><span>Assuntos identificados:</span> '+result.concepts.slice(0,5).map(x=>'<small>'+esc(names[x]||x)+'</small>').join('')+'</div>';
   }
  if(formattedAnswer.state==='formatted'){
   out+='<p class="r26-note">Trechos relacionados por contexto. Relevância '+esc(result.confidence==='alta'?'alta':'parcial')+'; não é uma interpretação livre das regras. Confira as páginas originais.</p>';
   if(formattedAnswer.lead){
    out+='<article class="r27-lead"><strong>Em resumo</strong><p>'+esc(formattedAnswer.lead.text)+'</p>'+
      sourceTag(formattedAnswer.lead.source)+'</article>';
   }
   for(const section of formattedAnswer.sections){
    out+='<section class="r27-section"><h4>'+esc(section.title)+'</h4>'+
      section.items.map(entry=>'<article class="r26-fact"><p>'+esc(entry.text)+'</p>'+sourceTag(entry.source)+'</article>').join('')+'</section>';
   }
   if(formattedAnswer.values.length){
    out+='<section class="r27-section"><h4>Valores encontrados</h4><div class="r27-table-wrap"><table class="r27-values"><thead><tr><th>Situação</th><th>Valor / efeito</th></tr></thead><tbody>'+
      formattedAnswer.values.map(row=>'<tr><td>'+esc(row.label)+'</td><td>'+esc(row.value)+'</td></tr>').join('')+
      '</tbody></table></div>'+sourceTag(formattedAnswer.values[0].source)+'</section>';
   }
   out+='<div class="r26-result-actions"><button id="r26-more" type="button">Ver trechos relacionados</button></div>';
  }else{
   if(result.explanation)out+='<p class="r26-note">'+esc(result.explanation)+'</p>';
   out+='<div class="r26-empty">Sem uma passagem verificável, o aplicativo não cria respostas. Importe um índice do livro para consultar seu conteúdo.</div>';
  }
  if(result.catalog?.length){
   out+='<h3 class="r27-related-title">Livros relacionados</h3>'+
    result.catalog.map((d,i)=>'<article class="r26-related"><strong>'+esc(d.title)+'</strong><small>'+esc(d.systemName)+' · '+esc(d.edition||'edição não identificada')+'</small>'+
     (d.url?'<a href="#" data-r26-related="'+i+'">Abrir no Drive ↗</a>':'')+'</article>').join('');
  }
  el.innerHTML=out;
  side.innerHTML=latest.length?latest.slice(0,12).map((d,i)=>'<button type="button" class="r26-src" data-r26-src="'+i+'"><strong>'+esc(d.title)+'</strong><small>'+esc(sysName(d.systemId))+' · '+esc(d.book)+' · '+esc(pageLabel(d))+'</small></button>').join(''):
   '<p class="r26-muted">Sem páginas indexadas correspondentes.</p>';
 }
 function perform(question){
  const q=String(question||'').trim().slice(0,450);
  if(!q)return;
  $('#r26-query').value=q;status('Pesquisando nos índices locais...');
  try{const result=answerQuestion(q);render(result);pdfLastQuery=q;renderPdfResults(q);const nativeMatches=$('#r45-pdf-hits .r45-pdf-hit');status(nativeMatches?.length?'PDF pesquisado · '+pdfPageTotal+' página(s) encontrada(s)':result.state==='found'?result.points.length+' passagem(ns) · '+(activeSystem==='all'?'vários sistemas':sysName(activeSystem)):'Nenhuma regra indexada correspondente')}
  catch(err){status('Erro na pesquisa');$('#r26-answer').textContent=err.message||'Não foi possível pesquisar.'}
 }
 $('#r26-form').addEventListener('submit',e=>{e.preventDefault();perform($('#r26-query').value)});
 let delay=0;
 $('#r26-query').addEventListener('input',e=>{
  clearTimeout(delay);const value=e.target.value.trim();
  if(value.length>=6)delay=setTimeout(()=>perform(value),500);
 });
 area.addEventListener('click',e=>{
  const nativePage=e.target.closest('[data-r45-page]');if(nativePage){openPdfHit(Number(nativePage.dataset.r45Page));return}
  if(e.target.id==='r45-pdf-more'){renderPdfResults($('#r26-query').value.trim(),pdfPageOffset,true);return}
  const quick=e.target.closest('[data-r26-quick]');if(quick){perform(quick.dataset.r26Quick);return}
  const book=e.target.closest('[data-r26-open]');if(book){e.preventDefault();openSource(latestAnswer?.points?.[Number(book.dataset.r26Open)]?.source||{});return}
  const formatted=e.target.closest('[data-r27-source]');
  if(formatted){const doc=formattedAnswer?.sources?.[Number(formatted.dataset.r27Source)];if(doc)openSource(doc);return}
  const related=e.target.closest('[data-r26-related]');if(related){e.preventDefault();openSource(latestAnswer?.catalog?.[Number(related.dataset.r26Related)]||{});return}
  const reference=e.target.closest('[data-r26-src]');if(reference){openSource(latest[Number(reference.dataset.r26Src)]||{});return}
  if(e.target.id==='r26-more'){
   const el=$('#r26-answer'),prior=el.querySelector('#r26-extra');
   if(prior){prior.remove();e.target.textContent='Ver trechos relacionados';return}
   const extra=document.createElement('div');extra.id='r26-extra';extra.innerHTML=latest.slice(0,8).map(d=>'<div class="r26-related"><strong>'+esc(d.title)+'</strong><small>'+esc(sysName(d.systemId))+' · '+esc(d.book)+' · '+esc(pageLabel(d))+'</small><p class="r26-muted">'+esc(String(d.text).slice(0,190))+'</p></div>').join('');
   el.append(extra);e.target.textContent='Ocultar trechos relacionados';return;
  }
  const remove=e.target.closest('[data-r26-remove]');if(remove){
   if(!confirm('Remover somente este índice local?'))return;
   removeBook(remove.dataset.r26Remove).then(load).catch(err=>app?.notify?.(err.message));return;
  }
 });
 $('#r26-import').addEventListener('change',async e=>{
  const f=e.target.files?.[0];e.target.value='';if(!f)return;
  try{
   const systemId=$('#r26-index-system').value;
   if(!systems().some(s=>s.id===systemId))throw Error('Selecione o sistema do livro antes de importar.');
   if(f.size>12*1024*1024)throw Error('Índice acima do limite de 12 MB.');
   const data=JSON.parse(await f.text());
   if(data.kind!=='rpg-book-index-v1'||!data.book||!Array.isArray(data.chunks)||data.chunks.length>14000)
    throw Error('Arquivo não corresponde ao índice PDF do RPG Mesa.');
   if(data.systemId&&data.systemId!==systemId)throw Error('O arquivo foi gerado para '+data.systemId+'. Selecione o sistema correto.');
   const chunks=data.chunks.map(x=>({page:Math.max(0,Number(x.page)||0),title:String(x.title||'Página do PDF').slice(0,120),text:String(x.text||'').slice(0,1600)})).filter(x=>x.text.trim());
   if(!chunks.length)throw Error('O índice não contém texto pesquisável.');
   const book={id:'private-'+crypto.randomUUID(),systemId,edition:String(data.edition||'').slice(0,36),
    sourceBookId:String(data.sourceBookId||'').slice(0,160),book:{title:String(data.book.title||'PDF pessoal').slice(0,135)},chunks};
   try{await putBook(book);await load()}catch{window.rpgVolatileBooks=(window.rpgVolatileBooks||[]).concat(book);refresh(window.rpgVolatileBooks);}
   app?.notify?.('Índice importado: '+chunks.length+' trechos.');status('Índice pronto para pesquisa');
  }catch(err){app?.notify?.('Não foi possível importar: '+err.message);status('Falha ao importar índice');}
 });
 function selectSystem(){
  const ss=systems(),options=ss.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join('');
  $('#r26-system').innerHTML='<option value="all">Todos os sistemas</option>'+options;
  $('#r26-index-system').innerHTML='<option value="">Selecione um sistema</option>'+options;
  const saved=localStorage.getItem('rpg-rules-system');
  if(ss.some(s=>s.id===saved)){activeSystem=saved;$('#r26-system').value=saved;$('#r26-index-system').value=saved}
  $('#r26-system').addEventListener('change',e=>{
   activeSystem=e.target.value;activeEdition='all';$('#r26-edition').value='all';
   if(activeSystem!=='all')$('#r26-index-system').value=activeSystem;
   localStorage.setItem('rpg-rules-system',activeSystem);
   if($('#r26-query').value.trim())perform($('#r26-query').value);
  });
  $('#r26-edition').addEventListener('change',e=>{activeEdition=e.target.value;if($('#r26-query').value.trim())perform($('#r26-query').value)});
 }
 $('#r47-retry-index').addEventListener('click',()=>{if(native()){native().indexSavedPdf();showIndexStatus(false)}});
 selectSystem();load();showIndexStatus(true);
 window.addEventListener('rpg-book-selected',()=>{pdfPreviousState='pending';showIndexStatus(true)});
 setInterval(()=>showIndexStatus(false),1500);
 window.RPG11={search:q=>extract.rankDocuments(q,base.concat(indexed),{systemId:activeSystem,edition:activeEdition,systems:systems(),core}),
  ask:q=>{perform(q);return latestAnswer},imported:()=>indexed.length,baseCount:base.length,get currentSystem(){return activeSystem}};
})();