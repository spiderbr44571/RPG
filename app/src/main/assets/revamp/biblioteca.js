/* Mastermind · revamp — Biblioteca: os livros dos sistemas com motor no app (Ordem Paranormal, D&D 5e,
   Chamado de Cthulhu 7e e GURPS 4e), abertos dentro do app, e o editor das regras de cada sistema.
   - Livros do aparelho: os PDFs que você importou (Android: RpgBookBridge; computador: MastermindDesktop).
     No Android a página é desenhada pelo próprio app (renderPersonalBookPage); no navegador, pelo pdf.js, no aparelho.
   - Catálogo do Drive: só nomes e links (rpg15_catalog_data.js). O app não guarda cópia; "Trazer para o app"
     abre o seletor de arquivos do aparelho, de onde dá para escolher o PDF no Drive.
   - Regras: MastermindSystemEditor (o mesmo da interface clássica). Mudanças ficam neste aparelho,
     são reversíveis e nunca alteram o livro nem as fichas existentes. */
(function(){
'use strict';
const {$,$$,esc,ic,toast,store,emit}=RV;
/* scripts da interface clássica que a Biblioteca e a busca usam (mesmos arquivos do app) */
const loaded={};
RV.loadClassic=files=>Promise.all(files.map(f=>loaded[f]||(loaded[f]=new Promise(ok=>{if(RV.Net?.served){ok(false);return}const s=document.createElement('script');s.src='../'+f;s.onload=()=>ok(true);s.onerror=()=>ok(false);document.head.appendChild(s)}))));
const DEPS=['rpg15_catalog_data.js','rpg18_dnd_engine.js','rpg16_gurps_engine.js','mastermind_coc7_engine.js','mastermind59_class_catalog.js','mastermind_system_editor.js'];
RV.SYSTEMS=[['ordem-paranormal','Ordem Paranormal','1.3'],['d-d','D&D 5e','SRD 5.1'],['chamado-de-ctchulhu','Chamado de Cthulhu','7ª edição'],['gurps','GURPS','4ª edição']];
const SYS_IDS=RV.SYSTEMS.map(s=>s[0]);
const L={view:'shelf',fq:'',filter:'all',sys:SYS_IDS.includes(store.get('mm-rv-lib-sys'))?store.get('mm-rv-lib-sys'):'ordem-paranormal',type:null,q:'',dq:'',edit:null,showHidden:false,personal:[],status:{},ready:false};
const TYPE_LABEL={'ordem-paranormal':{minNex:'NEX mínimo (%)',element:'Elemento ou atributo'},'d-d':{minNex:'Nível mínimo',element:'Atributo'},'chamado-de-ctchulhu':{minNex:'Valor mínimo',element:'Característica'},gurps:{minNex:'Mínimo',element:'Atributo'}};
const provider=()=>window.RpgBookBridge?.listPersonalBooks?'android':window.MastermindDesktop?.action?'desktop':'browser';
const editor=()=>window.MastermindSystemEditor;

/* ---------- livros do aparelho ---------- */
async function loadPersonal(){const p=provider();let list=[];
 try{if(p==='android')list=JSON.parse(RpgBookBridge.listPersonalBooks()||'[]');else if(p==='desktop')list=await MastermindDesktop.action('list-books')||[];
  else list=Object.values(RV.Books?.state.local||{}).map(b=>({id:b.id,name:b.name,systemId:b.systemId||L.sys,pages:b.pages.length}))}catch(_){list=[]}
 L.personal=Array.isArray(list)?list:[];
 for(const b of L.personal){try{L.status[b.id]=p==='android'?JSON.parse(RpgBookBridge.personalBookStatus(b.id)||'{}'):p==='desktop'?await MastermindDesktop.action('book-status',b.id)||{}:{state:'ready',pages:b.pages}}catch(_){L.status[b.id]={}}}
 render()}
function statusText(st){const all=+st.pages||+st.total||0,done=+st.progress||+st.done||0;
 return st.state==='ready'?`Pronto para busca${all?' · '+all+' páginas':''}`:st.state==='indexing'?`Indexando ${done}/${all||'?'} páginas`:st.state==='partial'?`Índice parcial (${done}/${all||'?'})`:st.state==='no_text'?'PDF sem texto selecionável (precisa de OCR)':st.state==='error'?'Falha ao ler o PDF':st.state==='missing'?'Arquivo indisponível':'Ainda não indexado'}
function importPdf(){const p=provider();
 try{if(p==='android'){RpgBookBridge.pickPdfForSystem(L.sys);toast('Escolha o PDF (pode ser do Google Drive). Ele fica na Biblioteca deste sistema.');setTimeout(loadPersonal,4000)}
  else if(p==='desktop'){MastermindDesktop.action('pick-pdf',L.sys).then(()=>setTimeout(loadPersonal,800))}
  else{$('#lib-file').click()}}catch(_){toast('Não foi possível abrir o seletor de PDF.')}}

/* ---------- leitor dentro do app ---------- */
const R={id:null,page:1,pages:0,name:''};
RV.openBook=(id,page=1)=>{const b=L.personal.find(x=>x.id===id)||Object.values(RV.Books?.state.local||{}).find(x=>x.id===id)&&{id,name:RV.Books.state.local[id].name};const p=provider();
 if(!b){toast('Livro indisponível neste aparelho.');return}
 if(p==='desktop'){MastermindDesktop.action('open-book',id).then(()=>toast(`"${b.name}" aberto no leitor de PDF do computador${page>1?', vá até a página '+page:''}.`)).catch(()=>toast('Não foi possível abrir o PDF.'));return}
 R.id=id;R.name=b.name;R.page=Math.max(1,page|0);R.pages=+(L.status[id]?.pages)||(RV.Books?.state.local[id]?.pages.length)||0;
 let m=$('#reader');if(!m){m=document.createElement('div');m.id='reader';m.className='modal-back reader-back';document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-rd="x"]')){m.remove();R.id=null;return}const a=e.target.closest('[data-rd]')?.dataset.rd;if(a==='prev')show(R.page-1);if(a==='next')show(R.page+1)});
  m.addEventListener('change',e=>{if(e.target.id==='rd-page')show(parseInt(e.target.value,10)||1)})}
 m.innerHTML=`<section class="reader" role="dialog" aria-modal="true" aria-label="Leitor de PDF"><header class="row between" style="flex-wrap:nowrap"><div style="min-width:0"><span class="kicker">Biblioteca · leitor</span><h3 style="margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.name)}</h3></div>
  <div class="row" style="flex-wrap:nowrap;gap:6px"><button class="ibtn" type="button" data-rd="prev" aria-label="Página anterior">${ic('chevron-left')}</button><input class="input num" id="rd-page" type="number" min="1" value="${R.page}" aria-label="Página" style="width:76px;min-height:36px"><span class="small muted num" id="rd-total">${R.pages?'de '+R.pages:''}</span><button class="ibtn" type="button" data-rd="next" aria-label="Próxima página">${ic('chevron-right')}</button><button class="x-btn" type="button" data-rd="x" aria-label="Fechar">${ic('x')}</button></div></header>
  <div class="reader-body"><p class="muted small" id="rd-wait">Abrindo a página…</p><img id="rd-img" alt="" hidden><canvas id="rd-cv" hidden></canvas></div></section>`;
 m.querySelector('[data-rd="x"]').focus();show(R.page)};
async function show(page){if(!R.id)return;if(R.pages)page=Math.min(page,R.pages);R.page=Math.max(1,page);const inp=$('#rd-page');if(inp)inp.value=R.page;$('#rd-wait').hidden=false;$('#rd-wait').textContent='Abrindo a página '+R.page+'…';
 const local=RV.Books?.state.local[R.id];
 if(local?.doc){try{const pg=await local.doc.getPage(R.page);const vp=pg.getViewport({scale:1.6});const cv=$('#rd-cv');cv.width=vp.width;cv.height=vp.height;await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;cv.hidden=false;$('#rd-img').hidden=true;$('#rd-wait').hidden=true}catch(e){$('#rd-wait').textContent='Não foi possível desenhar esta página.'}return}
 if(provider()==='android'){$('#rd-img').hidden=true;try{RpgBookBridge.renderPersonalBookPage(R.id,R.page)}catch(_){$('#rd-wait').textContent='Não foi possível abrir esta página.'}}}
window.addEventListener('rpg-private-page-rendered',e=>{const d=e.detail||{};if(d.id!==R.id||+d.page!==R.page)return;const img=$('#rd-img');if(!img)return;img.src=d.src;img.alt='Página '+d.page+' de '+R.name;img.hidden=false;$('#rd-cv').hidden=true;$('#rd-wait').hidden=true});
window.addEventListener('rpg-page-error',e=>{if(R.id&&$('#rd-wait')){$('#rd-wait').hidden=false;$('#rd-wait').textContent=String(e.detail||'Não foi possível abrir esta página.').slice(0,200)}});

/* ---------- catálogo do Drive ---------- */
function driveBooks(){const s=(window.RPG15_SYSTEMS?.systems||[]).find(x=>x.id===L.sys);return s?(s.books||[]).map(b=>Object.assign({},b,{folder:s.driveUrl})):[]}
function openDrive(id){if(!/^[A-Za-z0-9_-]{10,160}$/.test(id))return;if(window.RpgDriveBridge?.openDocument)RpgDriveBridge.openDocument('file',id);else window.open('https://drive.google.com/file/d/'+id+'/view','_blank','noopener,noreferrer')}
RV.openDrive=openDrive;

/* ---------- regras (MastermindSystemEditor) ---------- */
function items(){const E=editor();if(!E||!L.type)return[];return E.all(L.sys,L.type,E.defaults(L.sys,L.type))}
function hiddenItems(){const E=editor();if(!E||!L.type)return[];return(E.system(L.sys).deleted?.[L.type]||[])}
function firstType(){const E=editor();if(!E)return null;const t=Object.keys(E.TYPES).find(t=>E.defaults(L.sys,t).length||Object.keys(E.system(L.sys).overrides?.[t]||{}).length);return t||'skills'}

/* ---------- estante (duas fileiras, como a biblioteca anterior: mesmas cores, favoritos e capa) ---------- */
const PALETTE=[['#3a1729','#a84065'],['#132d3e','#4ba9ba'],['#35230d','#af995d'],['#251a49','#8670cb'],['#223b2b','#77ad89'],['#382015','#b87945']];
const FAV='rpg15-fav-system';
const favs=()=>{try{return new Set(JSON.parse(localStorage.getItem(FAV)||'[]'))}catch(_){return new Set()}};
function sysName(id){const E=editor(),r=RV.SYSTEMS.find(s=>s[0]===id);return E?.system(id)?.metadata?.name||r?.[1]||id}
function colorsOf(id){let c=0;for(const x of sysName(id))c+=x.charCodeAt(0);return PALETTE[c%PALETTE.length]}
function catalog(id){return(window.RPG15_SYSTEMS?.systems||[]).find(x=>x.id===id)||null}
function cover(id){if(id!=='ordem-paranormal')return'';try{const v=JSON.parse(localStorage.getItem('rpg-v09-cover')||'""');return /^data:image\/(png|jpeg|webp);base64,/.test(v)&&v.length<2000000?v:''}catch(_){return''}}
const SPARK='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4C54 34 66 46 96 50 66 54 54 66 50 96 46 66 34 54 4 50 34 46 46 34 50 4Z"/></svg>';
function renderShelf(){const grid=$('#lib-grid');if(!grid)return;const fv=favs(),q=L.fq.trim().toLocaleLowerCase('pt-BR');
 const rows=RV.SYSTEMS.filter(([id])=>{const c=catalog(id),txt=(sysName(id)+' '+(c?.books||[]).map(b=>b.title).join(' ')).toLocaleLowerCase('pt-BR');
  return(!q||txt.includes(q))&&(L.filter==='all'||L.filter==='fav'&&fv.has(id)||L.filter==='device'&&L.personal.some(b=>b.systemId===id))});
 $$('#lib-filter [data-f]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.f===L.filter)));
 $('#lib-count').textContent=RV.SYSTEMS.length;$('#lib-shown').textContent=rows.length+' de '+RV.SYSTEMS.length;
 grid.innerHTML=rows.map(([id,label,ed])=>{const c=catalog(id),[deep,soft]=colorsOf(id),n=sysName(id),img=cover(id),mine=L.personal.filter(b=>b.systemId===id).length;
  return `<article class="lib-card" style="--deep:${deep};--soft:${soft}"><button class="lib-art" type="button" data-lib="system" data-v="${id}" aria-label="Abrir ${esc(n)}">${SPARK}${img?`<img src="${img}" alt="">`:''}<span class="nm">${esc(n)}</span></button>
   <div class="lib-info"><b>${esc(n)}</b><small>${c?c.books.length+' arquivo(s) no Drive':'Sem pasta no Drive'}${mine?` · ${mine} PDF${mine>1?'s':''} no aparelho`:''}</small><span class="lib-tag">Regras no app · ${esc(ed)}</span>
    <div class="lib-acts"><button class="btn sm" type="button" data-lib="system" data-v="${id}">Detalhes${ic('external-link')}</button><button class="ibtn lib-fav" type="button" data-lib="fav" data-v="${id}" aria-pressed="${fv.has(id)}" aria-label="${fv.has(id)?'Tirar dos favoritos':'Marcar como favorito'}">${ic('bookmark')}</button></div></div></article>`}).join('')
  ||'<p class="muted" style="margin:0">Nenhum sistema com esse filtro.</p>';
 RV.hydrateIcons(grid)}

/* ---------- desenho ---------- */
function render(){const host=$('#lib');if(!host)return;const shelf=L.view==='shelf';$('#lib-shelf').hidden=!shelf;$('#lib-detail').hidden=shelf;
 if(shelf){renderShelf();return}
 const E=editor(),sys=RV.SYSTEMS.find(s=>s[0]===L.sys);
 const p=provider(),mine=L.personal.filter(b=>b.systemId===L.sys),drive=driveBooks(),dq=L.dq.toLowerCase();
 const dlist=drive.filter(b=>!dq||(b.title+' '+(b.path||[]).join(' ')).toLowerCase().includes(dq));
 const cats={livro:'Livros principais',suplemento:'Suplementos',aventura:'Aventuras',ficha:'Fichas',documento:'Documentos'};
 const TYPE_NAME={livro:'Livro',suplemento:'Suplemento',aventura:'Aventura',ficha:'Ficha',documento:'Documento'};
 const meta=E?E.system(L.sys).metadata||{}:{};
 const cat=catalog(L.sys),[deep,soft]=colorsOf(L.sys),hero=$('#lib-hero');hero.style.setProperty('--deep',deep);hero.style.setProperty('--soft',soft);
 hero.innerHTML=`<p class="kicker lib-line">Biblioteca · sistema</p><h2>${esc(meta.name||sys[1])}</h2>
  <p class="small">${drive.length} documento(s) no Drive${cat?.folders?.length?' · '+cat.folders.length+' subpasta(s)':''} · ${mine.length} PDF(s) neste aparelho</p><span class="lib-tag">Regras no app · ${esc(meta.edition||sys[2])}</span>
  ${meta.description?`<p class="muted">${esc(meta.description)}</p>`:'<p class="muted">Livros, expansões, aventuras e fichas da pasta do Drive. Os PDFs que você trouxer para o app ficam separados por sistema, neste aparelho, e entram na busca.</p>'}
  <div class="row">${cat&&/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{10,160}/.test(cat.driveUrl||'')?`<button class="btn sm" type="button" data-lib="folder">${ic('folder')}Abrir pasta no Drive</button>`:''}${E?`<button class="btn sm ghost" type="button" data-lib="meta">${ic('pencil')}Editar sistema</button>`:''}</div>`;
 RV.hydrateIcons(hero);
 $('#lib-books').innerHTML=`<div class="card-h"><div><p class="kicker">Biblioteca pessoal</p><h2>PDFs de ${esc(meta.name||sys[1])}</h2></div><button class="btn sm primary" type="button" data-lib="import">${ic('upload')}Trazer PDF para o app</button></div>
  ${mine.length?`<ul class="list">${mine.map(b=>{const st=L.status[b.id]||{};return `<li class="item"><span class="ti" style="color:var(--accent)">${ic('book')}</span><div class="grow"><b>${esc(b.name)}</b><span class="small muted">${esc(statusText(st))}</span></div>
   ${p==='android'&&!['ready','indexing'].includes(st.state)?`<button class="btn sm ghost" type="button" data-lib="index" data-v="${esc(b.id)}">Indexar</button>`:''}<button class="btn sm" type="button" data-lib="open" data-v="${esc(b.id)}">${ic('file-text')}Abrir</button><a class="btn sm ghost" href="#buscar" data-lib="search" data-v="${esc(b.id)}">${ic('search')}Buscar</a></li>`}).join('')}</ul>`
  :`<p class="muted small" style="margin:0">Nenhum PDF de ${esc(sys[1])} neste aparelho. Toque em "Trazer PDF para o app": no celular, o seletor também mostra o seu Google Drive. ${p==='browser'?'Aqui no navegador, o PDF é lido só nesta aba.':''}</p>`}
  <p class="small faint" style="margin:0">${p==='desktop'?'No computador, o PDF abre no leitor de PDF do sistema. A busca usa o índice do app.':p==='android'?'O PDF abre aqui dentro, página por página, e o texto fica indexado no aparelho para a busca.':'O PDF abre aqui dentro e não é enviado para lugar nenhum.'}</p>`;
 $('#lib-drive').innerHTML=`<div class="card-h"><h2>Livros e arquivos relacionados</h2><span class="chip">${drive.length} registro${drive.length===1?'':'s'} · só links</span></div>
  <input class="input" id="lib-dq" placeholder="Filtrar por nome" value="${esc(L.dq)}" aria-label="Filtrar arquivos do Drive">
  ${Object.entries(cats).map(([k,lab])=>{const g=dlist.filter(b=>(b.category||'documento')===k);if(!g.length)return'';return `<div class="row between" style="margin-top:6px"><h3 style="margin:0;font:600 22px var(--font-head)">${lab}</h3><span class="small muted">${g.length} arquivo(s)</span></div><div class="lib-files">${g.slice(0,60).map(b=>`<div class="lib-file"><div class="row between" style="flex-wrap:nowrap"><span style="color:var(--accent)">${ic('file-text')}</span><span class="chip">${esc(TYPE_NAME[k])}</span></div><b>${esc(b.title.replace(/\.pdf$/i,''))}</b><span class="small muted">${esc((b.path||[]).join(' / ')||'Pasta principal')}${b.sizeBytes?' · '+(b.sizeBytes/1048576).toFixed(1)+' MB':''}</span><button class="btn sm" type="button" data-lib="drive" data-v="${esc(b.id)}">${ic('external-link')}Abrir no Drive</button></div>`).join('')}</div>${g.length>60?`<p class="small muted" style="margin:0">Mostrando 60 de ${g.length}. Filtre pelo nome.</p>`:''}`}).join('')||'<p class="muted small" style="margin:0">Nada com esse nome.</p>'}
  <p class="small faint" style="margin:0">Os arquivos ficam na sua conta do Drive. Para ler aqui dentro e buscar no texto, use "Trazer PDF para o app" e escolha o arquivo.</p>`;
 if(!E){$('#lib-rules').innerHTML='<p class="muted" style="margin:0">Carregando as regras do sistema…</p>';return}
 if(!L.type)L.type=firstType();
 const all=items(),q=L.q.toLowerCase(),list=all.filter(x=>!q||(x.name+' '+(x.description||'')+' '+(x.className||'')+' '+(x.element||'')).toLowerCase().includes(q)),hid=hiddenItems(),lab=TYPE_LABEL[L.sys];
 const custom=E.system(L.sys).overrides?.[L.type]||{};
 $('#lib-rules').innerHTML=`<div class="card-h"><div><p class="kicker">Regras e conteúdo</p><h2>${esc(meta.name||sys[1])}${meta.edition||sys[2]?` <span class="small muted" style="font-family:var(--font-body)">${esc(meta.edition||sys[2])}</span>`:''}</h2></div><div class="row"><button class="btn sm ghost" type="button" data-lib="meta">${ic('pencil')}Nome e descrição</button><button class="btn sm ghost" type="button" data-lib="reset">${ic('refresh')}Restaurar original</button></div></div>
  ${meta.description?`<p class="muted small" style="margin:0">${esc(meta.description)}</p>`:''}
  <div class="chips" role="tablist" aria-label="Tipo de conteúdo">${Object.entries(E.TYPES).map(([k,n])=>{const c=E.all(L.sys,k,E.defaults(L.sys,k)).length;return `<button type="button" class="fchip" role="tab" data-lib="type" data-v="${k}" aria-pressed="${k===L.type}">${esc(n)} <span class="faint num">${c}</span></button>`}).join('')}</div>
  <div class="row"><input class="input" id="lib-q" placeholder="Filtrar ${esc(E.TYPES[L.type].toLowerCase())}" value="${esc(L.q)}" aria-label="Filtrar" style="flex:1 1 200px"><button class="btn sm primary" type="button" data-lib="new">${ic('plus')}Nova entrada</button></div>
  ${L.edit?form(L.edit,lab):''}
  <ul class="list lib-items">${list.slice(0,200).map(x=>`<li class="item"><div class="grow" style="min-width:0"><b>${esc(x.name)}</b>${custom[x.id]?' <span class="chip gold">editado</span>':''}<span class="small muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc([x.className,x.element,x.cost,x.description].filter(Boolean).join(' · '))}</span></div>
   <button class="btn sm ghost icon" type="button" data-lib="edit" data-v="${esc(x.id)}" aria-label="Editar ${esc(x.name)}">${ic('pencil')}</button><button class="btn sm ghost icon" type="button" data-lib="del" data-v="${esc(x.id)}" aria-label="Ocultar ${esc(x.name)}">${ic('trash')}</button></li>`).join('')||`<li class="muted small">${all.length?'Nada com esse filtro.':'O app não tem esses dados para este sistema. Você pode criar as entradas da sua mesa.'}</li>`}</ul>
  ${list.length>200?`<p class="small muted" style="margin:0">Mostrando 200 de ${list.length}. Use o filtro.</p>`:''}
  ${hid.length?`<button class="btn sm ghost" type="button" data-lib="hidden">${ic(L.showHidden?'eye-off':'eye')}${hid.length} oculto${hid.length>1?'s':''}</button>${L.showHidden?`<ul class="list">${hid.map(id=>`<li class="item"><span class="grow muted">${esc(id)}</span><button class="btn sm" type="button" data-lib="restore" data-v="${esc(id)}">Restaurar</button></li>`).join('')}</ul>`:''}`:''}
  <p class="small faint" style="margin:0">As mudanças valem neste aparelho, para o app todo (fichas e escolhas de poderes usam esta lista). O livro e as fichas que já existem não mudam, e "Restaurar original" desfaz tudo.</p>`;
 RV.hydrateIcons(host)}
function form(it,lab){const isNew=it==='new',x=isNew?{}:it;const ordem=L.sys==='ordem-paranormal';
 return `<form class="card lib-form" id="lib-form" style="padding:14px"><div class="card-h"><h3 style="margin:0">${isNew?'Nova entrada':'Editar '+esc(x.name)}</h3><button class="x-btn" type="button" data-lib="cancel" aria-label="Fechar">${ic('x')}</button></div>
  <div class="grid2f"><div class="field"><label for="lf-name">Nome</label><input class="input" id="lf-name" maxlength="100" value="${esc(x.name||'')}" required></div>
   <div class="field"><label for="lf-el">${esc(lab.element)}</label><input class="input" id="lf-el" maxlength="100" value="${esc(x.element||'')}"></div>
   ${ordem?`<div class="field"><label for="lf-class">Classe</label><input class="input" id="lf-class" maxlength="100" value="${esc(x.className||'')}" placeholder="Combatente, Especialista ou Ocultista"></div>`:''}
   <div class="field"><label for="lf-min">${esc(lab.minNex)}</label><input class="input num" id="lf-min" type="number" min="0" max="100" value="${esc(x.minNex||0)}"></div>
   <div class="field"><label for="lf-cost">Custo</label><input class="input" id="lf-cost" maxlength="100" value="${esc(x.cost||'')}"></div></div>
  <div class="field"><label for="lf-req">Requisitos</label><textarea class="input" id="lf-req" rows="2" maxlength="3000">${esc(x.requirements||'')}</textarea></div>
  <div class="field"><label for="lf-desc">Descrição</label><textarea class="input" id="lf-desc" rows="4" maxlength="12000">${esc(x.description||'')}</textarea></div>
  <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-lib="cancel">Cancelar</button><button class="btn primary" type="submit">${ic('check')}Salvar</button></div></form>`}
function metaModal(){const E=editor(),m=E.system(L.sys).metadata||{},sys=RV.SYSTEMS.find(s=>s[0]===L.sys);const b=document.createElement('div');b.className='modal-back';
 b.innerHTML=`<form class="modal" role="dialog" aria-modal="true" aria-labelledby="lm-h"><div class="fh" style="padding:0"><h2 id="lm-h" style="font-size:28px">Nome e descrição</h2><button class="x-btn" type="button" data-x aria-label="Fechar">${ic('x')}</button></div>
  <div class="field"><label for="lm-name">Nome do sistema</label><input class="input" id="lm-name" maxlength="100" value="${esc(m.name||sys[1])}"></div><div class="field"><label for="lm-ed">Edição</label><input class="input" id="lm-ed" maxlength="80" value="${esc(m.edition||sys[2])}"></div>
  <div class="field"><label for="lm-desc">Descrição</label><textarea class="input" id="lm-desc" rows="3" maxlength="6000">${esc(m.description||'')}</textarea></div>
  <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`;
 document.body.appendChild(b);b.querySelector('#lm-name').focus();b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-x]'))b.remove()});
 b.addEventListener('submit',e=>{e.preventDefault();try{E.setMetadata(L.sys,{name:$('#lm-name').value,edition:$('#lm-ed').value,description:$('#lm-desc').value});b.remove();render();toast('Informações do sistema salvas.')}catch(err){toast(err.message)}})}

/* ---------- ligações ---------- */
function bind(){const host=$('#lib');
 const sec=$('[data-view="biblioteca"]');
 sec.addEventListener('click',e=>{const b=e.target.closest('[data-lib]');if(!b||host.contains(b))return;const a=b.dataset.lib,v=b.dataset.v;
  if(a==='system'){L.sys=v;store.set('mm-rv-lib-sys',v);L.view='system';L.type=null;L.q='';L.dq='';L.edit=null;L.showHidden=false;render();window.scrollTo?.(0,0);$('#lib-detail>.btn')?.focus()}
  if(a==='shelf'){L.view='shelf';render();$('#lib-grid [data-v="'+L.sys+'"]')?.focus()}
  if(a==='fav'){const f=favs();f.has(v)?f.delete(v):f.add(v);try{localStorage.setItem(FAV,JSON.stringify([...f]))}catch(_){}renderShelf()}
  if(a==='explore'){e.preventDefault();$('#lib-grid')?.scrollIntoView({behavior:'smooth',block:'start'})}
  if(a==='folder'){const c=catalog(L.sys),m=/folders\/([A-Za-z0-9_-]{10,160})/.exec(c?.driveUrl||'');if(!m)return;if(window.RpgDriveBridge?.openDocument)RpgDriveBridge.openDocument('folder',m[1]);else window.open('https://drive.google.com/drive/folders/'+m[1],'_blank','noopener,noreferrer')}
  if(a==='meta'&&editor())metaModal()});
 $('#lib-filter').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;L.filter=b.dataset.f;renderShelf()});
 $('#lib-search').addEventListener('input',e=>{L.fq=e.target.value;renderShelf()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&location.hash==='#biblioteca'&&L.view==='system'&&!document.querySelector('.modal-back')){L.view='shelf';render()}});
 host.addEventListener('click',e=>{const b=e.target.closest('[data-lib]');if(!b)return;const a=b.dataset.lib,v=b.dataset.v,E=editor();
  try{
   if(a==='import')importPdf();
   if(a==='index'){RpgBookBridge.indexPersonalBook(v);toast('Indexando o PDF no aparelho…');setTimeout(loadPersonal,1500)}
   if(a==='open')RV.openBook(v,1);
   if(a==='search'){RV.Books&&(RV.Books.state.book=v);}
   if(a==='drive')openDrive(v);
   if(a==='type'){L.type=v;L.q='';L.edit=null;render()}
   if(a==='new'){L.edit='new';render();$('#lf-name')?.focus()}
   if(a==='edit'){L.edit=items().find(x=>x.id===v)||null;render();$('#lf-name')?.focus()}
   if(a==='cancel'){L.edit=null;render()}
   if(a==='del'){const it=items().find(x=>x.id===v);if(!confirm(`Ocultar "${it?.name||v}" deste sistema? Fichas existentes não mudam e dá para restaurar.`))return;E.removeItem(L.sys,L.type,v);render();toast('Entrada oculta. Use "ocultos" para restaurar.')}
   if(a==='restore'){E.restoreItem(L.sys,L.type,v);render();toast('Entrada restaurada.')}
   if(a==='hidden'){L.showHidden=!L.showHidden;render()}
   if(a==='meta')metaModal();
   if(a==='reset'){if(!confirm('Restaurar este sistema como veio no app? Suas entradas e edições deste sistema são apagadas. Fichas não mudam.'))return;E.reset(L.sys);L.edit=null;render();toast('Sistema restaurado.')}
  }catch(err){toast(err.message||String(err))}});
 host.addEventListener('submit',e=>{if(e.target.id!=='lib-form')return;e.preventDefault();const E=editor(),prev=L.edit==='new'?'':L.edit?.id;
  try{E.saveItem(L.sys,L.type,{name:$('#lf-name').value,element:$('#lf-el').value,className:$('#lf-class')?.value||'',minNex:$('#lf-min').value,cost:$('#lf-cost').value,requirements:$('#lf-req').value,description:$('#lf-desc').value},prev||undefined);L.edit=null;render();toast('Entrada salva neste aparelho.');emit('rules:edited')}catch(err){toast(err.message)}});
 host.addEventListener('input',e=>{if(e.target.id==='lib-q'){L.q=e.target.value;const pos=e.target.selectionStart;render();const i=$('#lib-q');i.focus();i.setSelectionRange(pos,pos)}
  if(e.target.id==='lib-dq'){L.dq=e.target.value;const pos=e.target.selectionStart;render();const i=$('#lib-dq');i.focus();i.setSelectionRange(pos,pos)}});
 $('#lib-file').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length&&RV.Books)RV.Books.openLocal(fs,L.sys).then(loadPersonal)};
 if(window.MastermindDesktop?.onBookIndex)MastermindDesktop.onBookIndex(()=>{clearTimeout(L.t);L.t=setTimeout(loadPersonal,900)});
 document.addEventListener('mastermind:system-edited',()=>{if(location.hash==='#biblioteca')render()})}
async function open(){if(!L.ready){L.ready=true;await RV.loadClassic(DEPS);if(!window.OP13&&window.RV_ORDEM_PACK)window.OP13={pack:window.RV_ORDEM_PACK}}render();loadPersonal()}
RV.on(e=>{if(e==='route:biblioteca')open()});
RV.Library={bind,open,render,state:L,loadPersonal,provider};
})();
