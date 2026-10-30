(()=>{'use strict';
const data=window.RPG15_SYSTEMS,lib=document.querySelector('#screen-library');
if(!data?.systems?.length||!lib)return;
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const folder=x=>/^https:\/\/drive\.google\.com\/(drive\/folders\/|file\/d\/)/.test(x||'')?x:'#';
const systems=data.systems,part='rpg15-fav-system';
let faves;try{faves=new Set(JSON.parse(localStorage.getItem(part)||'[]'))}catch{faves=new Set()}
let search='',filter='all',selected=null;
const old=document.createElement('div');old.id='r15-old';old.hidden=true;
while(lib.firstChild)old.appendChild(lib.firstChild);
lib.append(old);
const dashboard=document.createElement('div');dashboard.className='r15-ui r15-dashboard';
dashboard.innerHTML='<div class="eyebrow">SEU ACERVO DE RPG</div><div class="r15-head"><div><h1>Biblioteca de <em>mundos.</em></h1><p>Explore sistemas, edições e os livros do seu acervo pessoal.</p></div><div class="r15-count"><strong>'+systems.length+'</strong><small>SISTEMAS CADASTRADOS</small></div></div>'+
 '<section class="r15-hero"><div class="r15-hero-inner"><div class="eyebrow">EM DESTAQUE · MÓDULO INICIAL</div><h2>Ordem<br>Paranormal.</h2><p>O primeiro sistema com módulo de regras, ficha, rituais e mestragem em desenvolvimento.</p><button class="r15-main-btn" data-open-system="ordem-paranormal">Explorar sistema →</button></div></section>'+
 '<div class="r15-search"><input type="search" id="r15-query" placeholder="Buscar sistema, livro ou edição..." aria-label="Buscar sistemas"><div class="r15-filterbar" role="group" aria-label="Filtros"><button data-category="all" aria-pressed="true">Todos</button><button data-category="partial" aria-pressed="false">Em adaptação</button><button data-category="catalog" aria-pressed="false">Catalogados</button><button data-category="fav" aria-pressed="false">Favoritos</button></div></div>'+

 '<div class="r15-row-title"><h2>Todos os sistemas</h2><small id="r15-count-results"></small></div><div class="r15-grid" id="r15-grid"></div>'+
 '<p class="r15-footnote">Índice local de links para seu acervo no Google Drive. A classificação indica possíveis fontes de regras, criaturas e expansões; não altera as regras da ficha sem revisão manual.</p>';
lib.append(dashboard);
const detail=document.createElement('div');detail.className='r15-ui r15-detail';detail.hidden=true;lib.append(detail);
const palette=[['#3a1729','#a84065'],['#132d3e','#4ba9ba'],['#35230d','#af995d'],['#251a49','#8670cb'],['#223b2b','#77ad89'],['#382015','#b87945']];
function title(sys){return window.MastermindSystemEditor?.system(sys.id)?.metadata?.name||sys.title}
function colors(sys){let code=0;for(const x of title(sys))code+=x.charCodeAt(0);return palette[code%palette.length]}
function image(sys){
 const custom=window.MastermindSystemEditor?.system(sys.id)?.metadata?.photo;
 if(/^data:image\/(png|jpeg|webp);base64,/.test(custom||'')&&custom.length<480000)return custom;
 if(sys.id!=='ordem-paranormal')return '';
 try{let s=JSON.parse(localStorage.getItem('rpg-v09-cover')||'""');return /^data:image\/(png|jpeg|webp);base64,/.test(s)&&s.length<2000000?s:''}catch{return ''}
}
function card(sys){
 const color=colors(sys),thumb=image(sys),ready=sys.implementation==='partial';
 return '<article class="r15-card" style="--deep:'+color[0]+';--soft:'+color[1]+'"><div class="r15-art" data-open-system="'+esc(sys.id)+'" role="button" tabindex="0" aria-label="Abrir '+esc(title(sys))+'"><span class="glyph">✧</span>'+
 (thumb?'<img src="'+thumb+'" alt="Capa do PDF pessoal de Ordem Paranormal">':'')+
 '<div class="name">'+esc(title(sys))+'</div></div><div class="r15-card-info"><strong>'+esc(title(sys))+'</strong><small>'+sys.books.length+' arquivo(s) no Drive</small><span class="r15-tag">'+(ready?'Regras parciais':'Catalogado')+'</span><div class="r15-card-actions"><button data-open-system="'+esc(sys.id)+'">Detalhes ↗</button><button data-fav-system="'+esc(sys.id)+'" title="Marcar favorito" aria-pressed="'+faves.has(sys.id)+'">'+(faves.has(sys.id)?'★':'☆')+'</button></div></div></article>';
}
function visible(sys){const txt=(title(sys)+' '+sys.books.map(b=>b.title).join(' ')).toLocaleLowerCase('pt-BR');
 return (!search||txt.includes(search))&&(filter==='all'||filter==='fav'&&faves.has(sys.id)||filter===sys.implementation);
}
function render(){
 const out=systems.filter(visible);
 $('#r15-grid').innerHTML=out.length?out.map(card).join(''):'<p>Nenhum sistema encontrado com esses filtros.</p>';
 $('#r15-count-results').textContent=out.length+' de '+systems.length;
}
const oldOrder=old.querySelector('#rpg05-lib-home');
// Only metadata is cataloged. Mechanical effects are never inferred or installed from a book name.
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function bookType(b){
 const n=normalize((b.title||'')+' '+(b.category||'')), p=normalize((b.path||[]).join(' '));
 if(/ficha|character sheet|planilha personagem|character_sheet|personagem editavel|player sheet|character cards/.test(n)||/fichas/.test(p))return {label:'Ficha',role:'Personagens'};
 if(/mapa|maps|battlemap|grid|handout|tarot deck|tarot card/.test(n))return {label:'Mapa / apoio',role:'Material de mesa'};
 if(/bestiary|bestiario|monster manual|manual dos monstros|guia de campo|criaturas|abominac|horrores lovecraftianos/.test(n))return {label:'Bestiário',role:'Fonte de criaturas'};
 if(/aventura|adventure|case file|chariot of the gods|destroyer of worlds|os espinhos da aurora|strange adventures|convergencia|viral|portais para as trevas/.test(n))return {label:'Aventura',role:'Cenário / encontros'};
 if(/suplement|expans|sobrevivendo ao horror|spotlights|high fantasy|natural fantasy|techno fantasy|camarilla|sabbat|grimorio|codex extra|zona 0[12]|atlas of the dark/.test(n))return {label:'Expansão',role:'Conteúdo adicional'};
 if(/rulebook|livro de regras|livro basico|core book|corebook|sistema basico|pacote basico|manual do agente|guia do mestre|livro do jogador|^ldj |^gurps 4e|^gurps4e|quickstart|fastplay/.test(n))return {label:'Regras',role:'Referência de regras'};
 return {label:'Documento',role:'Fonte complementar'};
}
function driveAnchor(id,kind,href,title){
 const valid=/^[A-Za-z0-9_-]{10,160}$/.test(id||'') && /^https:\/\/drive\.google\.com\/(file\/d\/|drive\/folders\/)/.test(href||'');
 return valid?'<a class="r15-drive-link" href="'+esc(href)+'" data-drive-id="'+esc(id)+'" data-drive-kind="'+kind+'" target="_blank" rel="noopener noreferrer">'+title+'</a>':'<span class="r15-drive-unavailable">Link não cadastrado</span>';
}
function bookCard(b){
 const type=bookType(b), location=(b.path||[]).join(' / ');
 const url=folder(b.url);
 return '<article class="r15-doc"><div class="r15-doc-head"><span class="r15-book-icon" aria-hidden="true">▤</span><span class="r15-doc-category">'+esc(type.label)+'</span></div>'+
  '<strong title="'+esc(b.title)+'">'+esc(b.title)+'</strong>'+
  '<small>'+esc(type.role)+(location?' · '+esc(location):'')+'</small>'+
  '<span class="r15-doc-review">Fonte catalogada · conteúdo ainda não validado</span>'+
  '<div class="r15-doc-actions">'+driveAnchor(b.id,'file',url,'Abrir no Drive ↗')+'</div></article>';
}
function bookGroups(books){
 const groups=new Map();
 for(const b of books){const k=(b.path&&b.path.length)?b.path[0]:'Livros principais e suplementos';
  if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}
 const order=[...groups].sort((a,b)=>(a[0]==='Livros principais e suplementos'?-1:b[0]==='Livros principais e suplementos'?1:a[0].localeCompare(b[0],'pt-BR')));
 return order.map(([name,items])=>'<section class="r15-book-group"><div class="r15-row-title"><h2>'+esc(name)+'</h2><small>'+items.length+' arquivo(s)</small></div><div class="r15-doc-grid">'+items.map(bookCard).join('')+'</div></section>').join('');
}
function localBookSlot(){
 return '<section class="r15-order-slot"><div class="r15-order-mark" aria-hidden="true">✧</div><div class="r15-order-info"><h2>Livro local de Ordem Paranormal</h2><p>Importe seu PDF pessoal para ler e abrir as páginas indicadas por fichas, regras e criaturas do aplicativo.</p><small id="r15-order-status">Nenhum PDF local verificado.</small></div><div class="r15-order-actions"><button type="button" id="r15-order-import">+ Adicionar PDF</button><button type="button" id="r15-order-read">Abrir meu livro</button></div></section>';
}
function refreshLocalBook(){
 const source=old.querySelector('#rpg05-book-state'),target=detail.querySelector('#r15-order-status');
 if(target){target.textContent=source?.textContent?.trim()||'Importe o PDF v1.3 para ativar o leitor local.';}
}
document.addEventListener('rpg-book-selected',()=>setTimeout(refreshLocalBook,50));
document.addEventListener('mastermind:system-edited',e=>{render();if(selected===e.detail?.systemId){const h=detail.querySelector('.r15-detail-hero h1');if(h)h.textContent=title(systems.find(x=>x.id===selected));}});
function goHome(){render();if(oldOrder&&oldOrder.parentNode!==old)old.append(oldOrder);selected=null;detail.hidden=true;dashboard.hidden=false;window.scrollTo(0,0)}
function open(id){
 const sys=systems.find(x=>x.id===id);if(!sys)return;
 selected=id;dashboard.hidden=true;detail.hidden=false;
 const pal=colors(sys),arr=sys.books.slice().sort((a,b)=>(a.path||[]).join('/').localeCompare((b.path||[]).join('/'),'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
 detail.innerHTML='<button class="r15-back" id="r15-go-home">← Todos os sistemas</button>'+
 '<section class="r15-detail-hero" style="--deep:'+pal[0]+';--soft:'+pal[1]+'"><div class="eyebrow">BIBLIOTECA · SISTEMA</div><h1>'+esc(title(sys))+'</h1><p>'+sys.books.length+' documento(s) · '+sys.folders.length+' subpasta(s)</p>'+
 '<div class="r15-tag">'+(sys.implementation==='partial'?'Módulo em desenvolvimento':'Acervo catalogado')+'</div>'+
 '<p>Livros, expansões, aventuras e materiais relacionados. Cada fonte mantém seu próprio vínculo ao Drive; regras e criaturas são incorporadas somente após validação.</p>'+
 driveAnchor(sys.folderId,'folder',sys.driveUrl,'Abrir pasta no Drive ↗')+'</section>'+
 '<div id="r51-book-library" data-system-id="'+esc(id)+'"></div>'+ 
 '<div id="r15-ordem-book">'+(id==='ordem-paranormal'?localBookSlot():'')+'</div>'+
 '<div class="r15-row-title"><h2>Livros e arquivos relacionados</h2><small>'+arr.length+' registros</small></div>'+
 (arr.length?bookGroups(arr):'<p class="r15-footnote">Esta pasta não contém arquivos no catálogo atual.</p>');
 if(id==='ordem-paranormal')refreshLocalBook();
 if(id==='gurps'&&window.RPG16_GURPS){const slot=detail.querySelector('#r15-ordem-book');window.RPG16_GURPS.mount(slot);window.RPG17_PDF?.attachGurps(slot);}
 if(id==='d-d'&&window.RPG18_DND){window.RPG18_DND.mount(detail.querySelector('#r15-ordem-book'));}
 if(id==='chamado-de-ctchulhu'&&window.MastermindCoc7){window.MastermindCoc7.mount(detail.querySelector('#r15-ordem-book'));}
 document.dispatchEvent(new CustomEvent('mastermind:system-open',{detail:{systemId:id}}));
 window.scrollTo(0,0);
}
detail.addEventListener('click',e=>{
 if(e.target.closest('#r15-go-home')){goHome();return;}
 if(e.target.closest('#r15-order-import')){
   const btn=old.querySelector('#rpg05-import-pdf');if(btn)btn.click();else window.RPG_DEMO?.notify('Importação local indisponível');
   return;
 }
 if(e.target.closest('#r15-order-read')){
   const btn=old.querySelector('#rpg05-open-pdf');if(btn)btn.click();else window.RPG_DEMO?.notify('Leitor local indisponível');
   return;
 }
 const link=e.target.closest('[data-drive-id]');
 if(!link)return;
 const id=link.dataset.driveId,kind=link.dataset.driveKind;
 if(window.RpgDriveBridge?.openDocument && /^[A-Za-z0-9_-]{10,160}$/.test(id) && ['file','folder'].includes(kind)){
   e.preventDefault();window.RpgDriveBridge.openDocument(kind,id);
 }
});
dashboard.addEventListener('click',e=>{
 let action=e.target.closest('[data-open-system],[data-fav-system]');if(!action)return;
 if(action.dataset.openSystem){open(action.dataset.openSystem);return}
 let id=action.dataset.favSystem;if(faves.has(id))faves.delete(id);else faves.add(id);
 localStorage.setItem(part,JSON.stringify([...faves]));render();
});
dashboard.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.r15-art'))open(e.target.dataset.openSystem)});
$('#r15-query').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('pt-BR');render()});
dashboard.querySelector('.r15-filterbar').addEventListener('click',e=>{
 let b=e.target.closest('[data-category]');if(!b)return;filter=b.dataset.category;
 dashboard.querySelectorAll('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();
});
render();
window.RPG15={systemsCount:systems.length,filesCount:systems.reduce((n,s)=>n+s.books.length,0),openSystem:open,home:goHome,bookType,bookSources:(id)=>{const sys=systems.find(x=>x.id===id);return sys?sys.books.map(b=>({id:b.id,title:b.title,kind:bookType(b).label,driveUrl:b.url,path:b.path||[]})):[]}};
})();