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
 left.append(logo,el('strong',null,'MASTERMIND'),el('span',null,'LINUX · v1.0.7'));
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
 const sidebar=$('.sidebar');
 if(!sidebar)return;
 const b=el('button','desktop-library-import','＋ Importar PDF local');
 b.type='button';
 b.addEventListener('click',async()=>{
  try{
   const result=await desktop.action('pick-pdf');
   if(result?.name)toast('PDF adicionado: '+result.name);
  }catch(error){toast('Falha ao importar PDF: '+error.message);}
 });
 const bottom=sidebar.querySelector('.sidebar-bottom');
 sidebar.insertBefore(b,bottom);
 const drawer=el('section','desktop-book-drawer');
 drawer.innerHTML='<h3>Livros locais <button type="button" class="desktop-books-refresh">↻</button></h3><div class="desktop-books-list">Carregando…</div>';
 const library=$('#screen-library');
 if(library)library.append(drawer);
 const list=drawer.querySelector('.desktop-books-list');
 const refresh=async()=>{
  try{
   const books=await desktop.action('list-books');
   list.replaceChildren();
   if(!books.length){list.textContent='Nenhum PDF local importado. Use Importar PDF local.';return;}
   books.forEach(book=>{
    const row=el('div','desktop-book-row');
    const name=el('span',null,book.name);
    const open=el('button',null,'Abrir');
    open.addEventListener('click',()=>desktop.action('open-book',book.id).catch(e=>toast(e.message)));
    const search=el('button',null,'Pesquisar');
    search.addEventListener('click',()=>{
     const existing=row.querySelector('.desktop-search');
     if(existing){existing.remove();return;}
     const panel=el('div','desktop-search');
     const field=el('input');field.placeholder='Pergunte ou digite palavras-chave…';field.type='search';
     const results=el('div','desktop-search-results');
     const run=async()=>{
      if(!field.value.trim())return;
      results.textContent='Pesquisando no PDF…';
      try{
       const found=await desktop.action('search-book',book.id,field.value,12,0);
       results.replaceChildren();
       if(found.error){results.textContent=found.error;return;}
       if(!found.results?.length){results.textContent='Nenhuma correspondência.';return;}
       found.results.forEach(hit=>{
        const card=el('article','desktop-book-hit');
        card.append(el('strong',null,'Página '+hit.page),el('p',null,hit.excerpt));
        results.append(card);
       });
      }catch(error){results.textContent='Falha na pesquisa: '+error.message;}
     };
     field.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
     const button=el('button',null,'Buscar');button.addEventListener('click',run);
     panel.append(field,button,results);row.append(panel);field.focus();
    });
    row.append(name,open,search);list.append(row);
   });
  }catch(error){list.textContent='Erro: '+error.message;}
 };
 drawer.querySelector('.desktop-books-refresh').addEventListener('click',refresh);
 desktop.onPdf(()=>{refresh();toast('PDF importado.');});
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
