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
 '<div class="r15-row-title"><h2>Comece por aqui</h2><small>Em destaque</small></div><div class="r15-rail" id="r15-highlights"></div>'+
 '<div class="r15-row-title"><h2>Todos os sistemas</h2><small id="r15-count-results"></small></div><div class="r15-grid" id="r15-grid"></div>'+
 '<p class="r15-footnote">Catálogo offline com metadados dos arquivos encontrados no Google Drive. Os PDFs não estão embutidos no aplicativo e os demais sistemas ainda precisam ser implementados um a um.</p>';
lib.append(dashboard);
const detail=document.createElement('div');detail.className='r15-ui r15-detail';detail.hidden=true;lib.append(detail);
const palette=[['#3a1729','#a84065'],['#132d3e','#4ba9ba'],['#35230d','#af995d'],['#251a49','#8670cb'],['#223b2b','#77ad89'],['#382015','#b87945']];
function colors(sys){let code=0;for(const x of sys.title)code+=x.charCodeAt(0);return palette[code%palette.length]}
function image(sys){
 if(sys.id!=='ordem-paranormal')return '';
 try{let s=JSON.parse(localStorage.getItem('rpg-v09-cover')||'""');return /^data:image\/(png|jpeg|webp);base64,/.test(s)&&s.length<2000000?s:''}catch{return ''}
}
function card(sys){
 const color=colors(sys),thumb=image(sys),ready=sys.implementation==='partial';
 return '<article class="r15-card" style="--deep:'+color[0]+';--soft:'+color[1]+'"><div class="r15-art" data-open-system="'+esc(sys.id)+'" role="button" tabindex="0" aria-label="Abrir '+esc(sys.title)+'"><span class="glyph">✧</span>'+
 (thumb?'<img src="'+thumb+'" alt="Capa do PDF pessoal de Ordem Paranormal">':'')+
 '<div class="name">'+esc(sys.title)+'</div></div><div class="r15-card-info"><strong>'+esc(sys.title)+'</strong><small>'+sys.books.length+' arquivo(s) no Drive</small><span class="r15-tag">'+(ready?'Regras parciais':'Catalogado')+'</span><div class="r15-card-actions"><button data-open-system="'+esc(sys.id)+'">Detalhes ↗</button><button data-fav-system="'+esc(sys.id)+'" title="Marcar favorito" aria-pressed="'+faves.has(sys.id)+'">'+(faves.has(sys.id)?'★':'☆')+'</button></div></div></article>';
}
function visible(sys){const txt=(sys.title+' '+sys.books.map(b=>b.title).join(' ')).toLocaleLowerCase('pt-BR');
 return (!search||txt.includes(search))&&(filter==='all'||filter==='fav'&&faves.has(sys.id)||filter===sys.implementation);
}
function render(){
 const out=systems.filter(visible);
 $('#r15-grid').innerHTML=out.length?out.map(card).join(''):'<p>Nenhum sistema encontrado com esses filtros.</p>';
 $('#r15-highlights').innerHTML=systems.slice(0,9).map(card).join('');
 $('#r15-count-results').textContent=out.length+' de '+systems.length;
}
const oldOrder=old.querySelector('#rpg05-lib-home');
function goHome(){if(oldOrder&&oldOrder.parentNode!==old)old.append(oldOrder);selected=null;detail.hidden=true;dashboard.hidden=false;window.scrollTo(0,0)}
function open(id){
 const sys=systems.find(x=>x.id===id);if(!sys)return;
 if(oldOrder&&oldOrder.parentNode!==old)old.append(oldOrder);
 selected=id;dashboard.hidden=true;detail.hidden=false;
 const pal=colors(sys),arr=sys.books.slice().sort((a,b)=>(a.path||[]).join('/').localeCompare((b.path||[]).join('/'),'pt-BR')||a.title.localeCompare(b.title,'pt-BR'));
 detail.innerHTML='<button class="r15-back" id="r15-go-home">← Todos os sistemas</button>'+
 '<section class="r15-detail-hero" style="--deep:'+pal[0]+';--soft:'+pal[1]+'"><div class="eyebrow">BIBLIOTECA · SISTEMA</div><h1>'+esc(sys.title)+'</h1><p>'+sys.books.length+' documento(s) · '+sys.folders.length+' subpasta(s) registradas</p><div class="r15-tag">'+(sys.implementation==='partial'?'Fichas e regras parcialmente implementadas':'Sistema catalogado · regras ainda não adaptadas')+'</div><p>Os livros ficam aqui; fichas e regras serão vinculadas à edição escolhida durante a adaptação.</p>'+
 '<a class="r15-drive-link" href="'+folder(sys.driveUrl)+'" target="_blank" rel="noopener noreferrer">Ver pasta no Google Drive ↗</a></section>'+
 '<div id="r15-ordem-book"></div><div class="r15-row-title"><h2>Documentos do acervo</h2><small>'+arr.length+' registros</small></div>'+
 (arr.length?arr.map(b=>'<article class="r15-doc"><div><strong>'+esc(b.title)+'</strong><small>'+esc((b.path||[]).join(' / '))+(b.path?.length?' · ':'')+esc(b.category)+' · referência no Drive</small></div><a href="'+folder(b.url)+'" target="_blank" rel="noopener noreferrer">Abrir ↗</a></article>').join(''):'<p class="r15-footnote">Pasta vazia no índice. Pode receber livros depois.</p>');
 detail.querySelector('#r15-go-home').onclick=goHome;
 if(id==='ordem-paranormal'&&oldOrder){detail.querySelector('#r15-ordem-book').appendChild(oldOrder);oldOrder.hidden=false}
 if(id==='gurps'&&window.RPG16_GURPS){window.RPG16_GURPS.mount(detail.querySelector('#r15-ordem-book'));}
 window.scrollTo(0,0);
}
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
window.RPG15={systemsCount:systems.length,filesCount:systems.reduce((n,s)=>n+s.books.length,0),openSystem:open,home:goHome};
})();