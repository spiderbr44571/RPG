/* Mastermind Desktop — shared Android UI adapted to mouse, keyboard and 1080p+ */
(()=>{
'use strict';
const desktop=window.MastermindDesktop;
if(!desktop)return;
document.documentElement.classList.add('mastermind-desktop');
document.body.classList.add('mastermind-desktop');
const $=s=>document.querySelector(s);
const el=(tag,cl,text)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(text)x.textContent=text;return x;};
function toast(message){
 const notice=$('#toast');if(notice){notice.textContent=message;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),3000);}
}
function mountHeader(){
 const bar=el('div','desktop-titlebar');
 const left=el('div','desktop-titlebar-brand');
 const logo=el('img');logo.src='mastermind_logo.png';logo.alt='';
 left.append(logo,el('strong',null,'MASTERMIND'),el('span',null,'LINUX · v1.1.6'));
 const right=el('div','desktop-titlebar-actions');
 const mk=(text,title,action)=>{const b=el('button','desktop-titlebar-btn',text);b.type='button';b.title=title;b.addEventListener('click',action);right.appendChild(b);};
 mk('⌕','Buscar livros',()=>$('#quick-search')?.click());
 mk('⛶','Alternar tela cheia',()=>desktop.action('window-action','fullscreen'));
 bar.append(left,right);
 const app=$('.app');
 if(app)app.parentNode.insertBefore(bar,app);
}
function stageToolbar(){
 const stage=$('#p90-native-stage');
 if(!stage)return;
 const parent=stage.closest('.p90-studio-card');
 if(!parent)return;
 const toolbar=el('div','desktop-godot-tools');
 const buttons=[
  ['−','Reduzir zoom','zoom-out'],['+','Ampliar','zoom-in'],
  ['▣ Ajustar','Enquadrar o criador','fit'],
  ['↻','Recarregar Godot','reload'],
  ['◈ Compatibilidade','Alternar renderização WebGL por software (reinicia o Mastermind)','compatibility'],
  ['↗ Navegador','Abrir criador original no navegador','browser'],
  ['▣ Capturar para ficha','Capturar a tela do Godot','capture']
 ];
 buttons.forEach(([text,title,action])=>{
  const b=el('button','desktop-tool-btn',text);
  b.type='button';b.title=title;
  b.addEventListener('click',async()=>{
   try{
    if(action==='capture'){const ok=await desktop.action('godot-capture');if(!ok)toast('Abra o Ateliê e aguarde o Godot carregar.');}
    else await desktop.action('godot-action',action);
   }catch(error){toast('Editor: '+error.message);}
  });
  toolbar.append(b);
 });
 parent.insertBefore(toolbar,stage);
 const loading=stage.querySelector('.p90-stage-placeholder');
 desktop.onGodotStatus(info=>{
  if(!loading)return;
  const title=loading.querySelector('strong');
  const subtitle=loading.querySelector('small');
  if(!title||!subtitle)return;
  if(info.status==='ready'){
   title.textContent='Editor Godot carregado';
   subtitle.textContent='O editor está desenhando corretamente. Personalize e capture o retrato.';
   loading.classList.remove('desktop-godot-error');
  }else if(info.status==='loading'){
   title.textContent='Carregando Pixel Portrait Creator…';
   subtitle.textContent=info.message||'Conectando ao Godot do lyime.';
   loading.classList.remove('desktop-godot-error');
  }else if(info.status==='error'){
   title.textContent='O criador não conseguiu carregar';
   subtitle.textContent=(info.message||'Verifique a conexão.')+' Clique em Recarregar, Compatibilidade ou Navegador acima.';
   loading.classList.add('desktop-godot-error');
   toast('Ateliê: '+(info.message||'Falha ao carregar Godot'));
  }
 });
 desktop.onCapture(()=>{
  document.dispatchEvent(new Event('mastermind:lyime-capture-ready'));
  $('#p90-token-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  toast('Captura recebida. Ajuste o recorte e salve na ficha.');
 });
}
function rectangle(){
 const stage=$('#p90-native-stage');
 const screen=$('#screen-atelier85');
 const content=$('#content');
 if(!stage||!screen?.classList.contains('active')||!content)return {visible:false};
 // WebContentsView always composites above the local HTML: hide it behind any
 // main menu/modal rather than trying to fight the HTML z-index.
 if(document.querySelector('.r09-overlay.open,.modal-backdrop.open,.rpg05-dialog:not([hidden])')||document.body.classList.contains('rpg08-menu-open'))return {visible:false};
 const a=stage.getBoundingClientRect(),c=content.getBoundingClientRect();
 const x=Math.max(a.left,c.left,0),y=Math.max(a.top,c.top,0);
 const right=Math.min(a.right,c.right,innerWidth),bottom=Math.min(a.bottom,c.bottom,innerHeight);
 if(right-x<100||bottom-y<80)return {visible:false};
 return {visible:true,x,y,width:right-x,height:bottom-y};
}
let last='';
function tick(){
 const r=rectangle(),next=JSON.stringify(r);
 if(next!==last){last=next;desktop.action('godot-bounds',r).catch(console.error);}
}
function shortcuts(){
 document.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#quick-search')?.click();}
  if(event.key==='F11'){event.preventDefault();desktop.action('window-action','fullscreen');}
 });
}
function desktopBooks(){
 const library=$('#screen-library');if(!library)return;
 const systems=[{id:'all',title:'Todos os sistemas'},{id:'custom',title:'Sem sistema definido'},...(window.RPG15_SYSTEMS?.systems||[]).map(x=>({id:x.id,title:x.title}))];
 const drawer=el('section','desktop-book-drawer');
 const title=el('h3',null,'Meus livros locais · pesquisa offline');
 const guide=el('p','desktop-book-guide','Anexe PDFs pessoais, organize por sistema e encontre termos e regras por página. Tudo fica salvo apenas neste computador.');
 const tools=el('div','desktop-book-tools');
 const system=el('select','desktop-book-system');system.setAttribute('aria-label','Sistema dos PDFs');
 for(const x of systems){const opt=el('option',null,x.title);opt.value=x.id;system.append(opt);}
 const add=el('button','desktop-library-import','＋ Anexar PDFs');
 const global=el('input','desktop-global-books-query');global.placeholder='Pergunte algo ou pesquise termos em todos os PDFs…';global.type='search';global.setAttribute('aria-label','Pesquisar regras nos PDFs');
 const submit=el('button',null,'Pesquisar regras');const message=el('small','desktop-library-message');
 const results=el('div','desktop-global-book-hits');
 const list=el('div','desktop-books-list');
 const reload=el('button',null,'↻ Atualizar livros');
 tools.append(system,add,global,submit,reload);drawer.append(title,guide,tools,message,results,list);library.append(drawer);
 const state=id=>desktop.action('book-status',id).catch(()=>({state:'error'}));
 async function refresh(){
  try{
   const books=await desktop.action('list-books');list.replaceChildren();
   const selected=system.value;const relevant=books.filter(b=>selected==='all'||b.systemId===selected);
   message.textContent=books.length+' PDF(s) no computador · '+relevant.length+' neste filtro.';
   if(!relevant.length){list.textContent='Nenhum PDF anexado neste sistema. Use Anexar PDFs.';return;}
   for(const book of relevant){
    const row=el('div','desktop-book-row'),head=el('div','desktop-book-row-head');
    row.dataset.bookId=book.id;
    const name=el('strong',null,book.name);
    const sys=systems.find(s=>s.id===book.systemId);
    const status=el('small','desktop-index-status','Verificando índice…');
    head.append(name,el('span',null,sys?.title||book.systemId),status);
    const open=el('button',null,'Abrir PDF');
    open.onclick=()=>desktop.action('open-book',book.id).catch(err=>toast(err.message));
    const index=el('button',null,'Indexar / atualizar');
    index.onclick=async()=>{status.textContent='Lendo páginas localmente…';try{const d=await desktop.action('index-book',book.id);status.textContent=d.state==='ready'?'Pesquisável: '+d.pages+' páginas':'PDF digitalizado · OCR necessário';}catch(e){status.textContent='Falha: '+e.message;}};
    const remove=el('button','desktop-delete-pdf','Remover');
    remove.onclick=async()=>{if(!confirm('Remover somente este livro local e seu índice?'))return;await desktop.action('remove-book',book.id);await refresh();};
    const lookup=el('input','desktop-book-query');lookup.type='search';lookup.placeholder='Pesquisar somente neste livro';lookup.setAttribute('aria-label','Pesquisar em '+book.name);
    const go=el('button',null,'Buscar no livro'),hits=el('div','desktop-search-results');
    function showHits(found){
     hits.replaceChildren();
     if(found.error){hits.textContent=found.error;return;}
     if(!found.results?.length){hits.textContent='Nenhum resultado encontrado.';return;}
     hits.append(el('small',null,found.total+' página(s) encontrada(s)'));
     for(const hit of found.results){
      const card=el('article','desktop-book-hit');
      const go=el('button',null,'Página '+hit.page+' · abrir livro');
      go.onclick=()=>desktop.action('open-book',book.id).catch(e=>toast(e.message));
      card.append(go,el('p',null,hit.excerpt||''));hits.append(card);
     }
    }
    const query=async()=>{if(!lookup.value.trim())return;hits.textContent='Pesquisando e indexando as páginas localmente…';try{showHits(await desktop.action('search-book',book.id,lookup.value,20,0));}catch(e){hits.textContent='Pesquisa falhou: '+e.message;}};
    go.onclick=query;lookup.onkeydown=e=>{if(e.key==='Enter')query();};
    const actions=el('div','desktop-book-actions');actions.append(open,index,remove,lookup,go);
    row.append(head,actions,hits);list.append(row);
    state(book.id).then(x=>{status.textContent=x.state==='ready'?'Pesquisável · '+x.pages+' páginas':x.state==='no_text'?'Sem texto · OCR necessário':x.state==='indexing'?'Indexando… '+(x.done||0)+'/'+(x.total||'?'):x.state==='error'?'Falha de indexação': 'Aguardando leitura';});
   }
  }catch(err){list.textContent='Não foi possível ler a biblioteca: '+err.message;}
 }
 async function searchAll(){
  if(!global.value.trim())return;
  results.textContent='Procurando regras nos PDFs locais, por página…';
  try{
   const found=await desktop.action('search-library',global.value,system.value,50);results.replaceChildren();
   results.append(el('p',null,found.total+' resultado(s) em '+found.books+' livro(s).'));
   for(const hit of found.results||[]){
    const article=el('article','desktop-book-hit');
    const link=el('button',null,hit.title+' · página '+hit.page);
    link.onclick=()=>desktop.action('open-book',hit.bookId).catch(e=>toast(e.message));
    article.append(link,el('p',null,hit.excerpt));results.append(article);
   }
   if(found.errors?.length)results.append(el('small',null,found.errors.join(' | ').slice(0,650)));
  }catch(err){results.textContent='Erro na pesquisa: '+err.message;}
 }
 add.onclick=async()=>{
  try{
   const found=await desktop.action('pick-pdf',system.value==='all'?'custom':system.value);
   if(found?.length){toast(found.length+' PDF(s) anexado(s) e enviados para indexação local.');await refresh();}
  }catch(e){toast('Não foi possível importar PDFs: '+e.message);}
 };
 reload.onclick=refresh;submit.onclick=searchAll;global.onkeydown=e=>{if(e.key==='Enter')searchAll();};system.onchange=()=>{results.replaceChildren();refresh();};
 desktop.onPdf(()=>refresh());
 desktop.onBookIndex(update=>{for(const row of list.querySelectorAll('.desktop-book-row')){if(!row.querySelector('strong'))continue;}
  const status=list.querySelector('.desktop-book-row[data-book-id="'+update.id+'"] .desktop-index-status');
  if(status)status.textContent=update.state==='indexing'?'Indexando '+update.done+'/'+(update.total||'?'):update.state==='ready'?'Pesquisável · '+update.total+' páginas':update.state==='no_text'?'PDF digitalizado: OCR necessário':update.message||update.state;
 });
 document.addEventListener('mastermind:system-open',e=>{if(e.detail?.systemId&&systems.some(s=>s.id===e.detail.systemId)){system.value=e.detail.systemId;refresh();}});
 const side=$('.sidebar'),bottom=side?.querySelector('.sidebar-bottom');
 if(side&&bottom){const shortcut=el('button','desktop-library-import-shortcut','＋ Anexar PDFs');shortcut.onclick=()=>{window.RPG_DEMO?.navigate('library');add.click();};side.insertBefore(shortcut,bottom);}
 refresh();
}
function fixMobileStrings(){
 // Replace Android-specific hints in shared UI without modifying Android.
 const status=$('#p86-status');
 if(status)status.textContent='Capture no editor acima ou importe PNG; ajuste e salve retrato e token na ficha.';
}
function start(){
 mountHeader();stageToolbar();desktopBooks();shortcuts();fixMobileStrings();
 const content=$('#content');
 content?.addEventListener('scroll',tick,{passive:true});
 addEventListener('resize',tick,{passive:true});
 addEventListener('mastermind:overlay-visibility',tick);
 const observer=new MutationObserver(tick);
 const screen=$('#screen-atelier85');
 if(screen)observer.observe(screen,{attributes:true,attributeFilter:['class']});
 for(const overlay of document.querySelectorAll('.r09-overlay,.modal-backdrop,.rpg05-dialog')){
  observer.observe(overlay,{attributes:true,attributeFilter:['class','hidden']});
 }
 observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 setInterval(tick,220);tick();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
