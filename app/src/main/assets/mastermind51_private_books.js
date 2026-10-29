/* Mastermind v0.51 — PDFs individuais indexados para qualquer sistema (somente SAF do usuário).
   Nunca copia livros comerciais para o APK ou envia texto para a rede. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bridge=()=>window.RpgBookBridge&&typeof window.RpgBookBridge.listPersonalBooks==='function'?window.RpgBookBridge:null;
 const systems=()=>window.RPG15_SYSTEMS?.systems||[];
 const validSys=id=>systems().some(s=>s.id===id);
 const title=id=>systems().find(s=>s.id===id)?.title||id;
 const notify=msg=>window.RPG_DEMO?.notify?.(msg);
 const shortMsg=v=>String(v??'').slice(0,250);
 const localKey='mastermind51-custom-sheets';
 const unsupported=id=>validSys(id)&&!['ordem-paranormal','d-d','gurps','chamado-de-ctchulhu'].includes(id);
 let activeBook='',activePage=0,seenProgress='',openSystemId='',lastSearchQuery='';
 const systemHost=()=>$('#r51-book-library');
 function list(){
  if(!bridge())return [];
  try{
   const data=JSON.parse(bridge().listPersonalBooks());
   return Array.isArray(data)?data.filter(b=>/^[A-Za-z0-9_-]{1,72}$/.test(b.id||'')&&validSys(b.systemId)):[];
  }catch{return []}
 }
 function booksFor(systemId){
  return list().filter(b=>systemId==='all'||b.systemId===systemId);
 }
 function status(id){
  try{return bridge()?JSON.parse(bridge().personalBookStatus(id)):{state:'unavailable'}}
  catch{return {state:'error',message:'Não foi possível consultar o índice local.'}}
 }
 function stateText(b){
  const st=status(b.id),count=Number(st.progress)||0,all=Number(st.pages)||0;
  if(st.state==='ready')return 'Pesquisável · '+all+' páginas';
  if(st.state==='indexing')return 'Indexando '+count+'/'+(all||'?')+' páginas · '+shortMsg(st.message||'');
  if(st.state==='partial')return 'Índice parcial: '+count+'/'+(all||'?')+' páginas · toque em Retomar';
  if(st.state==='no_text')return 'PDF sem texto pesquisável · OCR necessário';
  if(st.state==='error')return 'Falha: '+shortMsg(st.message);
  if(st.state==='missing')return 'Documento indisponível';
  return 'Aguardando leitura · '+shortMsg(st.message||'');
 }
 function openPick(systemId){
  if(!validSys(systemId)){notify('Selecione um sistema válido.');return}
  if(!bridge()){notify('Importação por arquivos disponível no APK Android.');return}
  // ACTION_OPEN_DOCUMENT permite escolher PDFs no Google Drive do próprio Android.
  bridge().pickPdfForSystem(systemId);
 }
 function callBook(id,action){
  if(!bridge()||!list().some(b=>b.id===id))return;
  if(action==='index')bridge().indexPersonalBook(id);
  if(action==='open')bridge().openPersonalBook(id);
  if(action==='page')return;
  renderSystem();
  refreshResults();
 }
 function manualData(){
  try{const o=JSON.parse(localStorage.getItem(localKey)||'{}');return o&&typeof o==='object'?o:{}}
  catch{return {}}
 }
 function writeManual(o){
  try{localStorage.setItem(localKey,JSON.stringify(o));return true}catch{notify('Armazenamento cheio. Faça backup de seus dados.');return false}
 }
 function manualSheets(id){
  return (manualData()[id]||[]).filter(s=>s&&s.id).slice(0,100);
 }
 function currentManual(id){return manualSheets(id)[0]||null}
 function manualForm(id){
  if(!unsupported(id))return '';
  const entries=manualSheets(id),active=entries[0];
  return '<section class="r51-manual"><h3>Ficha livre de '+esc(title(id))+'</h3>'+
   '<p>Base personalizável para personagens deste sistema. As regras específicas ainda precisam ser cadastradas e verificadas; nenhum valor automático é inventado.</p>'+
   '<button type="button" data-r51-manual-new="'+esc(id)+'">+ Criar ficha manual</button>'+
   (active?'<div class="r51-manual-form"><label>Nome da ficha <input data-r51-manual-name="'+esc(id)+'" value="'+esc(active.name)+'" maxlength="90"></label>'+
    '<label>Campanha <input data-r51-manual-campaign="'+esc(id)+'" value="'+esc(active.campaign||'')+'" maxlength="90"></label>'+
    '<label>Anotações e regras próprias <textarea data-r51-manual-notes="'+esc(id)+'" maxlength="20000">'+esc(active.notes||'')+'</textarea></label>'+
    '<div class="r51-manual-attrs"><strong>Campos personalizados</strong>'+
    (active.fields||[]).map(f=>'<label>'+esc(f.label)+' <input data-r51-manual-field="'+esc(f.id)+'" value="'+esc(f.value||'')+'" maxlength="170"></label>').join('')+
    '</div><button type="button" data-r51-add-field="'+esc(id)+'">+ Novo atributo / recurso</button>'+
    '<button type="button" data-r51-remove-sheet="'+esc(id)+'">Excluir esta ficha</button></div>':'<p>Nenhuma ficha manual criada ainda.</p>')+
   (entries.length>1?'<p>'+entries.length+' fichas salvas. Use o seletor para alternar.</p><select id="r51-manual-select">'+
    entries.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Sem nome')+'</option>').join('')+'</select>':'')+'</section>';
 }
 function renderSystem(){
  const root=systemHost();
  if(!root)return;
  const sys=root.dataset.systemId||openSystemId;
  if(!validSys(sys))return;
  openSystemId=sys;
  const selected=booksFor(sys);
  root.innerHTML='<section class="r51-private"><div class="r51-private-top"><div><small>BIBLIOTECA PESSOAL</small><h3>PDFs de '+esc(title(sys))+'</h3>'+
   '<p>Importe arquivos que você tem autorização para utilizar, incluindo pelo Google Drive no seletor Android. Eles ficam separados por sistema e não são enviados a servidores.</p></div>'+
   '<button type="button" data-r51-add="'+esc(sys)+'">+ Adicionar PDF</button></div>'+
   '<div class="r51-private-files">'+(selected.length?selected.map(b=>'<div class="r51-private-book">'+
    '<div><strong>'+esc(b.name)+'</strong><small data-r51-status="'+esc(b.id)+'">'+esc(stateText(b))+'</small></div>'+
    '<div class="r51-private-actions"><button type="button" data-r51-reindex="'+esc(b.id)+'">Indexar / retomar</button>'+
    '<button type="button" data-r51-open="'+esc(b.id)+'">Abrir PDF ↗</button></div></div>').join(''):
    '<p>Nenhum PDF deste sistema foi importado neste dispositivo.</p>')+'</div></section>'+manualForm(sys);
 }
 function editManual(id,mutate){
  if(!unsupported(id))return;
  const data=manualData();
  const list=Array.isArray(data[id])?data[id]:[];
  mutate(list);
  data[id]=list.slice(0,100);
  if(writeManual(data))renderSystem();
 }
 function manualNew(id){
  editManual(id,items=>items.unshift({id:'s'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
   name:'Novo personagem',campaign:'',notes:'',fields:[]}));
 }
 function manualChange(id,field,value){
  const data=manualData(),items=data[id]||[];
  if(!items[0])return;
  items[0][field]=String(value).slice(0,20000);
  writeManual(data);
 }
 document.addEventListener('mastermind:system-open',event=>{
  openSystemId=event.detail?.systemId||'';
  renderSystem();
 });
 const library=$('#screen-library');
 library?.addEventListener('click',event=>{
  const btn=event.target.closest('[data-r51-add],[data-r51-reindex],[data-r51-open],[data-r51-manual-new],[data-r51-add-field],[data-r51-remove-sheet]');
  if(!btn)return;
  if(btn.dataset.r51Add)openPick(btn.dataset.r51Add);
  if(btn.dataset.r51Reindex)callBook(btn.dataset.r51Reindex,'index');
  if(btn.dataset.r51Open)callBook(btn.dataset.r51Open,'open');
  if(btn.dataset.r51ManualNew)manualNew(btn.dataset.r51ManualNew);
  if(btn.dataset.r51AddField){
   const label=window.prompt('Nome do atributo ou recurso (ex.: Sanidade, Defesa, Fôlego)');
   if(label?.trim())editManual(btn.dataset.r51AddField,items=>{
    if(items[0]){
     items[0].fields=Array.isArray(items[0].fields)?items[0].fields:[];
     if(items[0].fields.length<40)items[0].fields.push({id:'f'+Date.now(),label:label.trim().slice(0,70),value:''});
    }
   });
  }
  if(btn.dataset.r51RemoveSheet&&window.confirm('Excluir somente esta ficha manual?')){
   editManual(btn.dataset.r51RemoveSheet,items=>items.shift());
  }
 });
 library?.addEventListener('change',event=>{
  const el=event.target;
  const id=el.dataset.r51ManualName||el.dataset.r51ManualCampaign||el.dataset.r51ManualNotes||openSystemId;
  if(el.dataset.r51ManualName)manualChange(id,'name',el.value);
  if(el.dataset.r51ManualCampaign)manualChange(id,'campaign',el.value);
  if(el.dataset.r51ManualNotes)manualChange(id,'notes',el.value);
  if(el.dataset.r51ManualField){
   const data=manualData(),items=data[id]||[],f=items[0]?.fields?.find(v=>v.id===el.dataset.r51ManualField);
   if(f){f.value=el.value.slice(0,170);writeManual(data)}
  }
  if(el.id==='r51-manual-select'){
   editManual(id,items=>{
    const ix=items.findIndex(x=>x.id===el.value);
    if(ix>0)items.unshift(items.splice(ix,1)[0]);
   });
  }
 });
 // Search across PDFs imported locally on the phone, scoped to the selected system.
 const answer=$('#r26-answer');
 const panel=document.createElement('section');panel.id='r51-search';panel.className='r51-search';
 if(answer)answer.after(panel);
 const scope=()=>$('#r26-system')?.value||'all';
 function refreshResults(query=lastSearchQuery){
  if(!panel.isConnected)return;
  const items=booksFor(scope());
  const collection=items.slice(0,12);
  if(!bridge()){
   panel.innerHTML='<p class="r51-empty">A pesquisa de PDFs pessoais está disponível no APK Android. Os links do catálogo continuam disponíveis.</p>';
   return;
  }
  if(!query){
   panel.innerHTML='<h3>Meus PDFs indexados</h3><p>'+items.length+' documento(s) importado(s) no dispositivo para '+esc(scope()==='all'?'todos os sistemas':title(scope()))+'.</p>'+
    (items.length?'<div class="r51-book-badges">'+items.slice(0,12).map(b=>'<span>'+esc(b.name)+' · '+esc(stateText(b))+'</span>').join('')+'</div>':
     '<p>Abra um sistema na Biblioteca e toque em Adicionar PDF. Você pode escolher um arquivo no Google Drive pelo seletor Android.</p>');
   return;
  }
  let total=0,ready=0,partial=0;
  const blocks=[];
  for(const b of collection){
   const st=status(b.id);
   if(['ready','indexing','partial'].includes(st.state)){
    if(st.state==='ready')ready++;else partial++;
    let res=null;
    try{res=JSON.parse(bridge().searchPersonalBook(b.id,query,5,0))}catch{}
    if(res?.hits?.length){
     total+=Number(res.total)||res.hits.length;
     const snippets=res.hits.map(hit=>'<div class="r51-hit"><p>'+esc(hit.excerpt||'Trecho encontrado no livro.')+
      '</p><button type="button" data-r51-page="'+esc(b.id)+'" data-r51-page-number="'+Math.max(1,Number(hit.page)||1)+'">Página '+Math.max(1,Number(hit.page)||1)+' ↗</button></div>').join('');
     blocks.push('<article class="r51-result"><h4>'+esc(b.name)+'</h4><small>'+esc(title(b.systemId))+' · '+(Number(res.total)||0)+' página(s) encontradas'+(st.state==='ready'?'':' · busca parcial')+'</small>'+snippets+'</article>');
    }
   }
  }
  const more=items.length>12?'<p>Buscando nos primeiros 12 PDFs. Selecione um sistema para reduzir o conjunto de livros.</p>':'';
  panel.innerHTML='<h3>Ctrl+F nos meus PDFs</h3><p>Busca no texto integral dos arquivos importados e indexados no dispositivo. Trechos curtos com referência à página original.</p>'+
   '<p><strong>'+total+' páginas encontradas</strong> · '+ready+' livro(s) completos'+(partial?' · '+partial+' em indexação':'')+'</p>'+
   (blocks.join('')||'<p class="r51-empty">Ainda não há correspondências nos arquivos locais deste sistema. Confira se seus PDFs foram importados e indexados.</p>')+more;
 }
 let viewer=null;
 function bookViewer(){
  if(viewer)return viewer;
  viewer=document.createElement('div');
  viewer.id='r51-book-viewer';viewer.hidden=true;
  viewer.innerHTML='<div class="r51-dialog" role="dialog" aria-modal="true" aria-label="Página do livro pessoal">'+
   '<header><strong id="r51-viewer-name"></strong><button id="r51-viewer-close" type="button">Fechar ×</button></header>'+
   '<p id="r51-viewer-wait">Abrindo página...</p><img id="r51-viewer-img" hidden alt="Página do PDF importado"></div>';
  document.body.appendChild(viewer);
  $('#r51-viewer-close').addEventListener('click',()=>{viewer.hidden=true;activeBook='';activePage=0;$('#r51-viewer-img').removeAttribute('src');});
  viewer.addEventListener('click',event=>{if(event.target===viewer)$('#r51-viewer-close').click()});
  return viewer;
 }
 panel.addEventListener('click',event=>{
  const el=event.target.closest('[data-r51-page]');
  if(!el||!bridge())return;
  const book=list().find(b=>b.id===el.dataset.r51Page);
  if(!book)return;
  activeBook=book.id;activePage=Number(el.dataset.r51PageNumber)||0;
  const v=bookViewer();v.hidden=false;
  $('#r51-viewer-name').textContent=book.name+' · página '+activePage;
  $('#r51-viewer-wait').textContent='Renderizando a página escolhida...';
  $('#r51-viewer-img').hidden=true;
  bridge().renderPersonalBookPage(activeBook,activePage);
 });
 window.addEventListener('rpg-private-page-rendered',event=>{
  if(viewer?.hidden||event.detail?.id!==activeBook||Number(event.detail?.page)!==activePage)return;
  const img=$('#r51-viewer-img');img.src=event.detail.src;img.hidden=false;
  $('#r51-viewer-wait').textContent='';
 });
 window.addEventListener('rpg-page-error',event=>{
  if(viewer&&!viewer.hidden)$('#r51-viewer-wait').textContent=shortMsg(event.detail||'Erro ao abrir a página.');
 });
 function runSearch(){
  lastSearchQuery=$('#r26-query')?.value.trim()||'';
  refreshResults(lastSearchQuery);
 }
 $('#r26-form')?.addEventListener('submit',runSearch);
 $('#screen-ai')?.addEventListener('click',event=>{
  if(event.target.closest('[data-r26-quick]'))setTimeout(runSearch,0);
 });
 $('#r26-system')?.addEventListener('change',runSearch);
 window.addEventListener('rpg-private-book-added',event=>{
  renderSystem();refreshResults();
  notify('PDF '+String(event.detail?.name||'')+' adicionado a '+title(event.detail?.systemId)+'.');
 });
 setInterval(()=>{
  if(!bridge())return;
  if(openSystemId&&systemHost()){
   for(const el of systemHost().querySelectorAll('[data-r51-status]')){
    const b=list().find(x=>x.id===el.dataset.r51Status);
    if(b)el.textContent=stateText(b);
   }
  }
  const fingerprint=booksFor(scope()).map(b=>b.id+':'+status(b.id).state+':'+(status(b.id).progress||0)).join('|');
  if(fingerprint!==seenProgress){seenProgress=fingerprint;refreshResults();}
 },4000);
 refreshResults();
 window.MastermindPrivateBooks={list,booksFor,search:query=>{lastSearchQuery=query;refreshResults(query)}};
})();
