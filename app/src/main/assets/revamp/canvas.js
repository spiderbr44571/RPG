/* Mastermind · nova interface — Canvas infinito.
   Usa os mesmos dados salvos de antes, sem migração: lista de quadros em "mastermind42-canvas-index", cada quadro em
   "mastermind42-board-<id>" (cartões, criaturas, ligações e enquadramento) e áudio/vídeo no IndexedDB
   "mastermind42-media". Imagens ficam no próprio cartão (WebP comprimido, como antes). Tudo só neste aparelho. */
(function(){
'use strict';
const {$,$$,esc,ic,clamp,toast}=RV;
const KEY='mastermind42-canvas-index',PREFIX='mastermind42-board-',DBNAME='mastermind42-media';
const COLORS=['#c7a87b','#ec6969','#61a5f8','#60c5aa','#ba91ff','#f18fbd'];
const TYPES=['ANOTAÇÃO','PISTA','PERSONAGEM','LOCALIZAÇÃO','EVENTO','ITEM','OUTRO'];
const TYPE_COLOR={'ANOTAÇÃO':'var(--accent)','PISTA':'#60c5aa','PERSONAGEM':'#ba91ff','LOCALIZAÇÃO':'#61a5f8','EVENTO':'#ec6969','ITEM':'#e3a85a','OUTRO':'var(--muted)','IMAGEM':'#f18fbd','ÁUDIO':'#61a5f8','VÍDEO':'#61a5f8'};
const LIMIT={nodes:500,links:600,monsters:80,boards:100,image:10*1024*1024,imageData:510000,audio:25*1024*1024,video:75*1024*1024};
const uuid=()=>window.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
const goodColor=c=>/^#[\da-f]{6}$/i.test(c)?c:COLORS[0];
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const fin=v=>Number.isFinite(Number(v));
const okNode=n=>n&&typeof n.title==='string'&&fin(n.left)&&fin(n.top);
const okMonster=m=>m&&typeof m.name==='string'&&fin(m.x)&&fin(m.y);
const safeImage=d=>typeof d==='string'&&d.length<=LIMIT.imageData&&/^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(d);
/* tema da interface anterior, mantido para quem ainda lê o campo */
const themeOf=t=>t==='PISTA'?'node-teal':t==='PERSONAGEM'?'node-purple':'';

const C={index:null,id:null,nodes:[],monsters:[],links:[],view:{panX:0,panY:0,zoom:1},sel:null,tool:'move',linkStart:null,color:COLORS[0],
 panel:null,drawer:false,drawerSys:'ordem',drawerQ:'',custom:false,log:[],root:null,built:false,media:new Map(),busy:false,ptr:new Map(),drag:null,pan:null,pinch:null,saveT:0,raf:0};

/* ---------------- dados ---------------- */
function readBoard(id){const b=read(PREFIX+id);
 if(b&&Array.isArray(b.nodes))return{nodes:b.nodes,monsters:Array.isArray(b.monsters)?b.monsters:[],links:Array.isArray(b.links)?b.links.filter(l=>l&&l.a&&l.b):[],view:b.view||{}};
 return{nodes:[],monsters:[],links:[],view:{}}}
function boot(){let idx=read(KEY);
 if(idx&&Array.isArray(idx.boards))idx.boards=idx.boards.filter(b=>b&&b.id&&typeof b.name==='string').slice(0,LIMIT.boards);
 if(!idx||!Array.isArray(idx.boards)||!idx.boards.length){
  /* primeira vez: o quadro principal herda o Canvas e as criaturas das versões antigas (rpg_canvas_v2 / rpg_encounter_v3) */
  const id=uuid(),old=read('rpg_canvas_v2')||{},mons=read('rpg_encounter_v3');
  write(PREFIX+id,{version:1,nodes:Array.isArray(old.nodes)?old.nodes.filter(okNode):[],monsters:Array.isArray(mons)?mons.filter(okMonster).slice(0,LIMIT.monsters):[],links:[],
   view:{panX:Number(old.panX)||0,panY:Number(old.panY)||0,zoom:clamp(Number(old.zoom)||1,.2,3)}});
  idx={version:1,activeId:id,boards:[{id,campaign:'Campanha principal',name:'Canvas principal'}]};write(KEY,idx)}
 if(!idx.boards.some(b=>b.id===idx.activeId))idx.activeId=idx.boards[0].id;
 C.index=idx;load(idx.activeId)}
function load(id){const b=readBoard(id);C.id=id;C.nodes=b.nodes;C.monsters=b.monsters;C.links=b.links;
 C.view={panX:fin(b.view.panX)?Number(b.view.panX):0,panY:fin(b.view.panY)?Number(b.view.panY):0,zoom:clamp(Number(b.view.zoom)||1,.2,3)};
 C.sel=null;C.linkStart=null;C.log=[];releaseMedia()}
function save(){if(!C.id)return false;clearTimeout(C.saveT);
 const ok=write(PREFIX+C.id,{version:1,nodes:C.nodes,monsters:C.monsters,links:C.links,view:C.view});
 if(!ok)toast('O Canvas está sem espaço neste aparelho. Remova imagens grandes antes de continuar.');return ok}
const saveSoon=()=>{clearTimeout(C.saveT);C.saveT=setTimeout(save,250)};
const saveIndex=()=>write(KEY,C.index)||(toast('Sem espaço para salvar a lista de Canvas.'),false);
const board=()=>C.index.boards.find(b=>b.id===C.index.activeId)||C.index.boards[0];

/* ---------------- mídia (IndexedDB, igual à versão anterior) ---------------- */
function db(){return new Promise((ok,no)=>{if(!window.indexedDB)return no(Error('Armazenamento de mídia indisponível'));const r=indexedDB.open(DBNAME,1);
 r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error||Error('Falha no armazenamento'))})}
async function tx(mode,fn){const d=await db();try{return await new Promise((ok,no)=>{const t=d.transaction('files',mode),req=fn(t.objectStore('files'));
 t.oncomplete=()=>ok(req?.result??true);t.onerror=()=>no(t.error||Error('Falha no armazenamento'));t.onabort=()=>no(t.error||Error('Espaço insuficiente para o arquivo'))})}finally{d.close()}}
const putMedia=rec=>tx('readwrite',s=>s.put(rec)),getMedia=id=>tx('readonly',s=>s.get(id)),delMedia=id=>tx('readwrite',s=>s.delete(id));
function releaseMedia(){for(const u of C.media.values())URL.revokeObjectURL(u);C.media.clear()}

/* ---------------- geometria ---------------- */
const stage=()=>$('.cv-stage',C.root);
function center(){const r=stage().getBoundingClientRect(),v=C.view;return{x:(r.width/2-v.panX)/v.zoom,y:(r.height*.42-v.panY)/v.zoom}}
function toWorld(cx,cy){const r=stage().getBoundingClientRect(),v=C.view;return{x:(cx-r.left-v.panX)/v.zoom,y:(cy-r.top-v.panY)/v.zoom}}
function applyView(){const v=C.view,w=$('.cv-world',C.root),s=stage();if(!w)return;w.style.transform=`translate(${v.panX}px,${v.panY}px) scale(${v.zoom})`;
 const g=24*v.zoom;s.style.backgroundSize=`${g}px ${g}px`;s.style.backgroundPosition=`${v.panX}px ${v.panY}px`;$('.zoom-v',C.root).textContent=Math.round(v.zoom*100)+'%'}
function zoomAt(f,cx,cy){const v=C.view,r=stage().getBoundingClientRect(),nz=clamp(v.zoom*f,.2,3);const px=cx-r.left,py=cy-r.top;
 v.panX=px-(px-v.panX)*nz/v.zoom;v.panY=py-(py-v.panY)*nz/v.zoom;v.zoom=nz;applyView();saveSoon()}
function fit(){const els=$$('.cv-item',C.root);if(!els.length){C.view={panX:0,panY:0,zoom:1};applyView();saveSoon();return}
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const el of els){const x=parseFloat(el.style.left),y=parseFloat(el.style.top);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+el.offsetWidth);y1=Math.max(y1,y+el.offsetHeight)}
 /* área livre: abaixo das barras do topo e longe da barra lateral */
 const r=stage().getBoundingClientRect(),top=Math.max(0,...$$('.room,.optbar:not(:empty),.tools',C.root).filter(e=>e.getClientRects().length&&e.getBoundingClientRect().top-r.top<r.height/3&&e.offsetWidth>e.offsetHeight).map(e=>e.getBoundingClientRect().bottom-r.top))+24,
  side=innerWidth<760?20:96,bot=24,aw=Math.max(80,r.width-side*2),ah=Math.max(80,r.height-top-bot),z=clamp(Math.min(aw/Math.max(1,x1-x0),ah/Math.max(1,y1-y0)),.2,1.4);
 C.view={zoom:z,panX:r.width/2-(x0+x1)/2*z,panY:top+ah/2-(y0+y1)/2*z};applyView();saveSoon()}
/* lugar livre perto do centro da tela, para o item novo não cair em cima de outro */
function spot(w,h){const c=center(),boxes=$$('.cv-item',C.root).map(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top),w:el.offsetWidth,h:el.offsetHeight}));
 const free=(x,y)=>boxes.every(b=>x+w+16<b.x||b.x+b.w+16<x||y+h+16<b.y||b.y+b.h+16<y);
 for(let r=0;r<14;r++)for(let k=0;k<Math.max(1,r*8);k++){const a=k/Math.max(1,r*8)*Math.PI*2,x=c.x-w/2+Math.cos(a)*r*70,y=c.y-h/2+Math.sin(a)*r*55;if(free(x,y))return{x,y}}
 return{x:c.x-w/2,y:c.y-h/2}}
const find=ref=>{const[k,...r]=String(ref).split(':'),id=r.join(':');return k==='node'?C.nodes.find(n=>String(n.id)===id):k==='creature'?C.monsters.find(m=>String(m.id)===id):null};
const labelOf=ref=>{const o=find(ref);return o?(o.title??o.name)||'Sem título':String(ref).startsWith('creature:')?'Criatura ausente':'Cartão ausente'};
function mid(ref){const el=C.root.querySelector(`.cv-item[data-ref="${CSS.escape(ref)}"]`);if(!el)return null;return{x:parseFloat(el.style.left)+el.offsetWidth/2,y:parseFloat(el.style.top)+el.offsetHeight/2}}

/* ---------------- desenho ---------------- */
const defBonus=m=>(m.effects||[]).reduce((s,f)=>s+(f.stat==='defense'?Number(f.amount)||0:0),0);
function nodeHTML(n){const ref='node:'+n.id,img=n.type==='IMAGEM'&&safeImage(n.imageData),med=n.mediaId&&['audio','video'].includes(n.mediaKind);
 const w=img?clamp(Number(n.width)||320,200,850):med?clamp(Number(n.width)||340,240,700):null;
 return `<article class="cv-item cv-card${img?' cv-img':''}${med?' cv-media':''}" data-ref="${esc(ref)}" style="left:${Number(n.left)}px;top:${Number(n.top)}px;${w?`width:${w}px;`:''}--tc:${TYPE_COLOR[n.type]||'var(--accent)'}" aria-selected="${C.sel===ref}" tabindex="0" aria-label="${esc(n.type||'Cartão')}: ${esc(n.title)}">
  <header><span class="cv-type">${esc(n.type||'ANOTAÇÃO')}</span>${C.linkStart===ref?`<span class="chip gold">${ic('link')}Origem</span>`:''}</header>
  <h4>${esc(n.title)}</h4>${img?`<figure><img src="${n.imageData}" alt="${esc(n.title||'Imagem')}" draggable="false" loading="lazy"></figure>`:''}${med?`<div class="cv-mhost" data-media="${esc(n.mediaId)}" data-kind="${esc(n.mediaKind)}">Carregando ${n.mediaKind==='audio'?'áudio':'vídeo'}…</div>`:''}
  ${n.text?`<p>${esc(n.text)}</p>`:''}${img||med?`<button class="cv-resize" type="button" aria-label="Redimensionar" data-resize>${ic('arrows-maximize')}</button>`:''}</article>`}
function beastHTML(m){const ref='creature:'+m.id,pct=m.max_hp?clamp(m.hp*100/m.max_hp,0,100):0,b=defBonus(m);
 return `<article class="cv-item cv-beast" data-ref="${esc(ref)}" data-dead="${m.hp<=0}" style="left:${Number(m.x)}px;top:${Number(m.y)}px" aria-selected="${C.sel===ref}" tabindex="0" aria-label="Criatura ${esc(m.name)}">
  <header><span class="cv-disc">${esc(RV.initials(m.name||'?'))}</span><div style="min-width:0"><b>${esc(m.name)}</b><small>${esc(sysLabel(m))}</small></div>${C.linkStart===ref?`<span class="chip gold">${ic('link')}</span>`:''}</header>
  <div class="cv-hp"><div class="bar"><i style="width:${pct}%;--c:var(--danger)"></i></div><span class="num">${m.hp}/${m.max_hp}</span></div>
  <div class="cv-stats"><span>Def <b class="num">${(Number(m.defense)||0)+b}</b>${b?` <small>(${b>0?'+':''}${b})</small>`:''}</span>${m.effects?.length?`<span class="chip violet">${m.effects.length} efeito${m.effects.length>1?'s':''}</span>`:''}</div>
  <div class="cv-acts"><button type="button" data-hp="-5">−5</button><button type="button" data-hp="-1">−1</button><button type="button" data-hp="1">+1</button><button type="button" data-roll="attack">${ic('dice-5')}Ataque</button><button type="button" data-roll="damage">${ic('sword')}Dano</button></div></article>`}
function sysLabel(m){const s=m.systemId;return s==='ordem-paranormal'?'Ordem Paranormal':s==='d-d'?'D&D 5e':s==='gurps'?'GURPS':s==='chamado-de-ctchulhu'?'Chamado de Cthulhu':m.template&&m.template!=='custom'?'Criatura de exemplo':'Personalizada'}
function render(){if(!C.root)return;const items=$('.cv-items',C.root);
 items.innerHTML=C.nodes.filter(okNode).map(nodeHTML).join('')+C.monsters.filter(okMonster).map(beastHTML).join('');RV.hydrateIcons(items);
 $('.cv-empty',C.root).hidden=!!(C.nodes.length||C.monsters.length);applyView();decorateMedia();lines();chrome()}
function lines(){if(C.raf)return;C.raf=requestAnimationFrame(()=>{C.raf=0;const svg=$('.cv-links',C.root);if(!svg)return;
 svg.innerHTML=C.links.map(l=>{const a=mid(l.a),b=mid(l.b);if(!a||!b)return'';const bend=clamp(Math.abs(b.x-a.x)*.33,40,160),d=`M ${a.x} ${a.y} C ${a.x+bend} ${a.y} ${b.x-bend} ${b.y} ${b.x} ${b.y}`;
  return `<path d="${d}" class="cv-line${C.sel==='link:'+l.id?' on':''}" stroke="${goodColor(l.color)}"/><path d="${d}" class="cv-hit" data-link="${esc(l.id)}" tabindex="0" role="button" aria-label="Ligação entre ${esc(labelOf(l.a))} e ${esc(labelOf(l.b))}"/>`}).join('')})}
async function decorateMedia(){for(const host of $$('.cv-mhost',C.root)){const id=host.dataset.media,kind=host.dataset.kind;
 try{let url=C.media.get(id);if(!url){const rec=await getMedia(id);if(!host.isConnected)continue;if(!rec?.blob){host.textContent='Arquivo não encontrado neste aparelho.';continue}url=URL.createObjectURL(rec.blob);C.media.set(id,url)}
  const el=document.createElement(kind==='audio'?'audio':'video');el.controls=true;el.preload='metadata';el.src=url;if(kind==='video')el.setAttribute('playsinline','');host.replaceChildren(el)}
 catch(_){host.textContent='Arquivo indisponível no armazenamento local.'}}}

/* ---------------- barras e painéis ---------------- */
const TOOLS=[['move','pointer','Selecionar e mover','V'],['card','note','Novo cartão','N'],['image','photo','Imagem do aparelho',''],['media','music','Áudio ou vídeo',''],['beast','skull','Criaturas','A'],['link','link','Conectar itens','L'],'|',['links','list-search','Lista de ligações','']];
function build(){C.root=$('#canvas-v');C.root.innerHTML=`
 <div class="cv-stage" tabindex="-1"><div class="cv-world"><svg class="cv-links" aria-label="Ligações do Canvas"></svg><div class="cv-items"></div></div>
  <div class="cv-empty"><span data-i="layout-board"></span><b>Canvas vazio</b><p class="muted small">Crie cartões de pistas, personagens e locais, traga imagens, áudios e vídeos do aparelho, coloque criaturas e ligue tudo com linhas coloridas.</p><div class="row"><button class="btn sm primary" type="button" data-cv-tool="card">${ic('note')}Novo cartão</button><button class="btn sm" type="button" data-cv-tool="beast">${ic('skull')}Criaturas</button></div></div></div>
 <div class="float room"><a class="ibtn room-back cv-back" href="#inicio" aria-label="Voltar">${ic('chevron-left')}<span class="tip">Voltar</span></a><button class="room-btn cv-board-btn" type="button" aria-haspopup="menu"><span><b class="cv-board-name"></b><small class="cv-board-camp"></small></span>${ic('chevron-down')}</button><span class="chip gold num cv-count"></span></div>
 <div class="float tools" role="toolbar" aria-label="Ferramentas do Canvas" aria-orientation="vertical">${TOOLS.map(t=>t==='|'?'<div class="sep"></div>':`<button class="ibtn" type="button" data-cv-tool="${t[0]}" aria-pressed="false" aria-label="${t[2]}">${ic(t[1])}<span class="tip">${t[2]}${t[3]?` <kbd>${t[3]}</kbd>`:''}</span></button>`).join('')}</div>
 <div class="float optbar cv-opt" aria-live="polite"></div>
 <aside class="float panel cv-panel" aria-label="Detalhes" hidden></aside>
 <aside class="float drawer cv-drawer" aria-label="Criaturas" hidden></aside>
 <div class="float zoom"><button class="ibtn" type="button" data-cz="-1" aria-label="Diminuir zoom">${ic('zoom-out')}</button><span class="num zoom-v">100%</span><button class="ibtn" type="button" data-cz="1" aria-label="Aumentar zoom">${ic('zoom-in')}</button><button class="ibtn" type="button" data-cz="0" aria-label="Enquadrar tudo">${ic('focus-2')}</button></div>
 <input type="file" class="cv-file-img" accept="image/*" multiple hidden><input type="file" class="cv-file-media" accept="audio/*,video/*" multiple hidden>`;
 RV.hydrateIcons(C.root);bind();C.built=true}
function chrome(){const b=board();$('.cv-board-name',C.root).textContent=b.name;$('.cv-board-camp',C.root).textContent=b.campaign;
 $('.cv-count',C.root).textContent=`${C.nodes.length} cartões · ${C.monsters.length} criaturas · ${C.links.length} ligações`;
 $$('[data-cv-tool]',C.root).forEach(x=>{const t=x.dataset.cvTool;if(!x.classList.contains('ibtn'))return;x.setAttribute('aria-pressed',String(t===C.tool||(t==='beast'&&C.drawer)||(t==='links'&&C.panel==='links')))});
 const o=$('.cv-opt',C.root);
 if(C.tool==='link')o.innerHTML=`<span class="t">Conectar</span><span class="hint">${C.linkStart?'Primeiro: '+esc(labelOf(C.linkStart))+'. Toque no segundo item.':'Toque em dois itens, um depois do outro.'}</span><span class="sep"></span>${COLORS.map(c=>`<button type="button" class="cv-sw" data-color="${c}" style="background:${c}" aria-label="Cor ${c}" aria-pressed="${C.color===c}"></button>`).join('')}<label class="cv-sw cv-sw-free" aria-label="Outra cor" style="background:${C.color}"><input type="color" value="${C.color}"></label><span class="sep"></span><button class="btn sm" type="button" data-cv-tool="move">Concluir</button>`;
 else o.innerHTML='';
 if(C.panel)panel();if(C.drawer)drawer()}
function setTool(t){if(t==='card')return addCard();if(t==='image')return $('.cv-file-img',C.root).click();if(t==='media')return $('.cv-file-media',C.root).click();
 if(t==='beast'){C.drawer=!C.drawer;$('.cv-drawer',C.root).hidden=!C.drawer;chrome();return}
 if(t==='links'){C.panel=C.panel==='links'?null:'links';$('.cv-panel',C.root).hidden=!C.panel;chrome();return}
 C.tool=t==='link'&&C.tool==='link'?'move':t;C.linkStart=null;stage().dataset.tool=C.tool;render()}
function select(ref){C.sel=ref;C.panel=ref?(ref.startsWith('link:')?'link':'item'):(C.panel==='links'?'links':null);$('.cv-panel',C.root).hidden=!C.panel;
 $$('.cv-item',C.root).forEach(el=>el.setAttribute('aria-selected',String(el.dataset.ref===ref)));lines();chrome()}

function panel(){const p=$('.cv-panel',C.root);if(!C.panel){p.hidden=true;return}p.hidden=false;
 if(C.panel==='links'){p.innerHTML=RV.fh('Canvas','Ligações','cv-panel')+`<div class="panel-body">${C.links.length?C.links.map(l=>`<div class="item cv-li"><span class="cv-dot" style="background:${goodColor(l.color)}"></span><span class="grow small">${esc(labelOf(l.a))} ↔ ${esc(labelOf(l.b))}</span><button class="ibtn sm" type="button" data-unlink="${esc(l.id)}" aria-label="Remover ligação">${ic('trash')}</button></div>`).join(''):'<p class="muted small">Nenhuma ligação ainda. Use Conectar itens e toque em dois itens.</p>'}</div>`;return}
 if(C.panel==='link'){const l=C.links.find(x=>'link:'+x.id===C.sel);if(!l){select(null);return}
  p.innerHTML=RV.fh('Ligação',labelOf(l.a)+' ↔ '+labelOf(l.b),'cv-panel')+`<div class="panel-body"><span class="label">Cor</span><div class="row">${COLORS.map(c=>`<button type="button" class="cv-sw" data-link-color="${c}" style="background:${c}" aria-label="Cor ${c}" aria-pressed="${l.color===c}"></button>`).join('')}</div><button class="btn sm danger-btn" type="button" data-unlink="${esc(l.id)}">${ic('trash')}Excluir ligação</button></div>`;return}
 const o=find(C.sel);if(!o){select(null);return}
 if(C.sel.startsWith('node:')){const media=o.type==='IMAGEM'||o.mediaId,types=TYPES.includes(o.type)||!o.type?TYPES:TYPES.concat([o.type]);
  p.innerHTML=RV.fh('Cartão',o.title||'Sem título','cv-panel')+`<div class="panel-body">
   <div class="field"><label for="cv-title">Título</label><input class="input" id="cv-title" maxlength="110" value="${esc(o.title)}" style="min-height:40px"></div>
   ${media?'':`<div class="field"><label for="cv-type">Tipo</label><select class="input" id="cv-type">${types.map(t=>`<option ${o.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>`}
   <div class="field"><label for="cv-text">${media?'Legenda':'Descrição'}</label><textarea class="input" id="cv-text" maxlength="10000" rows="6">${esc(o.text||'')}</textarea></div>
   <div class="row"><button class="btn sm" type="button" data-cv-act="link-from">${ic('link')}Ligar a outro item</button><button class="btn sm" type="button" data-cv-act="dup">${ic('copy')}Duplicar</button><button class="btn sm danger-btn" type="button" data-cv-act="del">${ic('trash')}Excluir</button></div></div>`;return}
 const m=o,b=defBonus(m),atk=m.profile?.attacks||[],abil=(m.abilities||[]).filter(a=>a&&a.op);
 p.innerHTML=RV.fh(sysLabel(m),m.name,'cv-panel')+`<div class="panel-body">
  <div class="cv-hp"><div class="bar"><i style="width:${m.max_hp?clamp(m.hp*100/m.max_hp,0,100):0}%;--c:var(--danger)"></i></div><span class="num">${m.hp}/${m.max_hp}</span></div>
  <div class="row"><button class="btn sm" type="button" data-hp="-5">−5</button><button class="btn sm" type="button" data-hp="-1">−1</button><button class="btn sm" type="button" data-hp="1">+1</button><button class="btn sm" type="button" data-hp="5">+5</button><input class="input num" id="cv-hpset" type="number" min="0" max="${m.max_hp}" value="${m.hp}" aria-label="Vida atual" style="width:84px;min-height:32px;padding:4px 8px"></div>
  <div class="kv"><span>Defesa</span><b class="num">${(Number(m.defense)||0)+b}${b?` (${b>0?'+':''}${b})`:''}</b><span>Ataque</span><b>${esc(m.attackNotation||(fin(m.attack_bonus)?'1d20'+(m.attack_bonus>=0?'+':'')+m.attack_bonus:'—'))}</b><span>Dano</span><b>${esc(m.damageNotation||m.damage||'—')}</b>${m.source?`<span>Fonte</span><b class="small">${esc(m.source)}${m.page?' · p.'+m.page:''}</b>`:''}</div>
  <div class="row"><button class="btn sm primary" type="button" data-roll="attack">${ic('dice-5')}Rolar ataque</button><button class="btn sm" type="button" data-roll="damage">${ic('sword')}Rolar dano</button></div>
  ${atk.length?`<span class="label">Ataques</span><div class="row">${atk.slice(0,8).map((a,i)=>`<button class="btn sm" type="button" data-atk="${i}">${esc(a.name||'Ataque')}</button>`).join('')}</div>`:''}
  ${abil.length?`<span class="label">Habilidades</span><div class="row">${abil.map(a=>`<button class="btn sm" type="button" data-abil="${esc(a.id)}">${ic('sparkles')}${esc(a.name)}</button>`).join('')}</div>`:''}
  ${m.effects?.length?`<span class="label">Efeitos</span><div class="row">${m.effects.map(f=>`<span class="chip violet">${esc(f.name)} · ${f.remaining} turno${f.remaining>1?'s':''}</span>`).join('')}<button class="btn sm" type="button" data-cv-act="turn">${ic('player-skip-forward')}Avançar turno</button></div>`:''}
  ${C.log.length?`<span class="label">Rolagens</span><div class="cv-log">${C.log.slice(0,6).map(r=>`<div class="small"><b class="num">${r.total}</b> · ${esc(r.text)}</div>`).join('')}</div>`:''}
  <div class="row"><button class="btn sm" type="button" data-cv-act="link-from">${ic('link')}Ligar a outro item</button><button class="btn sm danger-btn" type="button" data-cv-act="del">${ic('trash')}Remover criatura</button></div></div>`}

function drawer(){const d=$('.cv-drawer',C.root);d.hidden=!C.drawer;if(!C.drawer)return;const q=C.drawerQ.toLowerCase();
 const list=Object.values(RV.CREATURES).filter(c=>(C.drawerSys==='outras'?!['ordem','dnd'].includes(c.sys):c.sys===C.drawerSys)&&(!q||c.name.toLowerCase().includes(q)));
 d.innerHTML=RV.fh('Canvas','Criaturas','cv-drawer')+`<div class="panel-body">
  <div class="seg" role="group" aria-label="Sistema"><button type="button" data-dsys="ordem" aria-pressed="${C.drawerSys==='ordem'}">Ordem Paranormal</button><button type="button" data-dsys="dnd" aria-pressed="${C.drawerSys==='dnd'}">D&amp;D 5e</button><button type="button" data-dsys="outras" aria-pressed="${C.drawerSys==='outras'}">Outras</button></div>
  <input class="input" id="cv-q" placeholder="Procurar criatura" value="${esc(C.drawerQ)}" aria-label="Procurar criatura" style="min-height:40px">
  <button class="btn sm" type="button" data-cv-act="custom" aria-expanded="${C.custom}">${ic('plus')}Criar personalizada</button>
  ${C.custom?`<form class="cv-custom"><div class="field"><label>Nome</label><input class="input" name="name" maxlength="56" required style="min-height:36px"></div><div class="grid2"><div class="field"><label>Vida</label><input class="input num" name="hp" type="number" min="1" max="9999" value="30" required style="min-height:36px"></div><div class="field"><label>Defesa</label><input class="input num" name="defense" type="number" min="0" max="999" value="12" required style="min-height:36px"></div><div class="field"><label>Bônus de ataque</label><input class="input num" name="bonus" type="number" min="-20" max="30" value="3" required style="min-height:36px"></div><div class="field"><label>Dano</label><input class="input num" name="damage" value="1d6+2" required pattern="[1-9]d(4|6|8|10|12|20|100)([+-][0-9]{1,2})?" style="min-height:36px"></div></div><button class="btn sm primary" type="submit">Criar e colocar</button></form>`:''}
  ${list.map(c=>`<button type="button" class="item cv-add" data-beast="${esc(c.name)}"><span class="avatar" style="background:${RV.ELEMENT[c.element]||'#e0707c'}">${esc(RV.initials(c.name))}</span><span class="grow" style="text-align:left"><b>${esc(c.name)}</b><span class="small muted" style="display:block">PV ${c.hp} · Def ${c.defense} · ${esc(c.attack)}</span></span>${ic('plus')}</button>`).join('')||'<p class="muted small">Nenhuma criatura encontrada.</p>'}</div>`;
 RV.hydrateIcons(d)}

/* ---------------- ações ---------------- */
function addCard(){if(C.nodes.length>=LIMIT.nodes)return toast('O Canvas chegou a 500 itens.');const p=spot(250,110),n={id:Date.now()+Math.random(),title:'Nova anotação',type:'ANOTAÇÃO',text:'',left:p.x,top:p.y,theme:''};
 C.nodes.push(n);save();render();select('node:'+n.id);setTimeout(()=>{const t=$('#cv-title');if(t){t.focus();t.select()}},30)}
function compress(img){const cv=document.createElement('canvas'),ctx=cv.getContext('2d');if(!ctx)throw Error('Processamento de imagem indisponível');
 for(const side of [1200,1000,800,650,500]){const r=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));cv.width=Math.max(1,Math.round(img.naturalWidth*r));cv.height=Math.max(1,Math.round(img.naturalHeight*r));
  ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);for(const q of [.86,.73,.6]){const d=cv.toDataURL('image/webp',q);if(safeImage(d))return d}}
 throw Error('Imagem grande demais para o Canvas. Tente uma foto menor.')}
const loadImage=f=>new Promise((ok,no)=>{const r=new FileReader();r.onerror=()=>no(Error('Falha ao ler o arquivo'));r.onload=()=>{const i=new Image();i.onerror=()=>no(Error('Imagem inválida'));i.onload=()=>ok(i);i.src=r.result};r.readAsDataURL(f)});
async function addImages(files){if(C.busy)return toast('Aguarde o arquivo anterior.');C.busy=true;let last=null;
 try{for(const f of files){if(C.nodes.length>=LIMIT.nodes){toast('O Canvas chegou a 500 itens.');break}
  /* qualquer imagem que o aparelho consiga abrir (PNG, JPG, WebP, GIF, HEIC no Android); vira WebP comprimido como antes */
  if(!(/^image\//.test(f.type)||(!f.type&&/\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(f.name)))||!f.size||f.size>LIMIT.image){toast('Use uma imagem (PNG, JPG, WebP…) de até 10 MB.');continue}
  try{const im=await loadImage(f).catch(()=>{throw Error('Este aparelho não conseguiu abrir "'+f.name+'". Tente PNG ou JPG.')}),data=compress(im),p=spot(320,Math.round(290*im.naturalHeight/Math.max(1,im.naturalWidth))+80);const n={id:Date.now()+Math.random(),title:(f.name.replace(/\.[^.]+$/,'')||'Imagem').slice(0,110),type:'IMAGEM',text:'',imageData:data,width:320,left:p.x,top:p.y,theme:''};
   C.nodes.push(n);if(!save()){C.nodes.pop();continue}last=n;render()}catch(e){toast(e.message)}}}
 finally{C.busy=false}if(last){render();select('node:'+last.id);toast('Imagem adicionada ao Canvas.')}}
/* No Android, o arquivo escolhido pode chegar sem tipo: o tipo vem da extensão. */
const MEDIA_EXT={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime',mkv:'video/x-matroska','3gp':'video/3gpp',ogv:'video/ogg',mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',wav:'audio/wav',flac:'audio/flac'};
function mediaType(f){if(/^(audio|video)\/[a-z0-9.+-]+$/i.test(f.type||''))return f.type;const ext=(/\.([a-z0-9]+)$/i.exec(f.name||'')||[])[1];return MEDIA_EXT[(ext||'').toLowerCase()]||''}
async function addMedia(files){if(C.busy)return toast('Aguarde o arquivo anterior.');C.busy=true;let last=null;
 try{for(const f of files){const kind=mediaType(f),audio=/^audio\//.test(kind),okType=!!kind;
  if(!okType||!f.size||f.size>(audio?LIMIT.audio:LIMIT.video)){toast('Use áudio de até 25 MB ou vídeo de até 75 MB. MP3 e MP4 são os mais compatíveis.');continue}
  if(C.nodes.length>=LIMIT.nodes){toast('O Canvas chegou a 500 itens.');break}
  const id=uuid(),p=spot(340,audio?150:300),n={id:Date.now()+Math.random(),title:f.name.slice(0,110),type:audio?'ÁUDIO':'VÍDEO',text:'',mediaId:id,mediaKind:audio?'audio':'video',width:340,left:p.x,top:p.y,theme:''};
  try{await putMedia({id,blob:f.type?f:new Blob([f],{type:kind}),name:f.name,type:kind});C.nodes.push(n);if(!save()){C.nodes.pop();await delMedia(id).catch(()=>{});continue}last=n;render()}
  catch(e){toast('Não foi possível guardar o arquivo neste aparelho: '+(e.message||'erro'))}}}
 finally{C.busy=false}if(last){render();select('node:'+last.id);toast('Mídia adicionada ao Canvas.')}}
function removeSel(){const ref=C.sel;if(!ref)return;const o=find(ref);if(!o)return;
 confirmBox(ref.startsWith('node:')?'Excluir este cartão?':'Remover esta criatura?',`“${o.title??o.name}” e as ligações dele saem deste Canvas.`,'Excluir',()=>{
  if(ref.startsWith('node:')){C.nodes=C.nodes.filter(n=>n!==o);if(o.mediaId&&!C.nodes.some(n=>n.mediaId===o.mediaId))delMedia(o.mediaId).catch(()=>{})}else C.monsters=C.monsters.filter(m=>m!==o);
  C.links=C.links.filter(l=>l.a!==ref&&l.b!==ref);C.sel=null;C.panel=null;save();render()})}
function dup(){const o=find(C.sel);if(!o||!C.sel.startsWith('node:'))return;if(C.nodes.length>=LIMIT.nodes)return toast('O Canvas chegou a 500 itens.');
 const n=Object.assign({},o,{id:Date.now()+Math.random(),title:(o.title+' (cópia)').slice(0,110),left:Number(o.left)+42,top:Number(o.top)+30});C.nodes.push(n);save();render();select('node:'+n.id)}
function pick(ref){if(!C.linkStart){C.linkStart=ref;render();return}
 if(C.linkStart===ref){toast('Escolha um item diferente.');return}
 if(C.links.length>=LIMIT.links){toast('Limite de 600 ligações neste Canvas.');return}
 const a=C.linkStart;C.linkStart=null;
 if(C.links.some(l=>(l.a===a&&l.b===ref)||(l.a===ref&&l.b===a))){toast('Esses itens já estão ligados.');render();return}
 C.links.push({id:uuid(),a,b:ref,color:C.color});save();render();toast('Ligação criada. Continue tocando para criar outras.')}
function unlink(id){C.links=C.links.filter(l=>l.id!==id);if(C.sel==='link:'+id){C.sel=null;C.panel=C.panel==='link'?null:C.panel}save();render()}

/* criaturas: mesmo formato e mesmas regras de rolagem da versão anterior */
function addBeast(c){if(C.monsters.length>=LIMIT.monsters)return toast('Limite de 80 criaturas neste Canvas.');const p=spot(246,190);
 const bonus=Number((/([+-]\d+)\s*$/.exec(c.attack||'')||[])[1])||0,dmgOk=/^[1-9]\d?d(?:4|6|8|10|12|20|100)(?:[+-]\d{1,3})?$/i.test(c.damage||'');
 const m={id:uuid(),template:'custom',name:String(c.name).slice(0,100),hp:c.hp,max_hp:c.hp,defense:Number(c.defense)||0,attack_bonus:bonus,damage:dmgOk?c.damage:'1d6',abilities:[],effects:[],x:p.x,y:p.y,
  systemId:c.sys==='ordem'?'ordem-paranormal':'d-d',edition:c.sys==='dnd'?'5e':'1.3',creatureId:String(c.name).slice(0,100),source:String(c.source||'').slice(0,220),page:Number(c.page)||null,
  attackNotation:String(c.attack||'').slice(0,40),damageNotation:String(c.damage||'').slice(0,50),profile:{element:c.element||'',type:c.type||'',challenge:c.vd||'',attacks:[]}};
 C.monsters.push(m);save();render();select('creature:'+m.id);toast(m.name+' está no Canvas.')}
function addCustom(f){const v=Object.fromEntries(new FormData(f));if(!String(v.name||'').trim())return;const hp=clamp(parseInt(v.hp)||1,1,9999);
 if(!/^[1-9]d(4|6|8|10|12|20|100)([+-]\d{1,2})?$/.test(v.damage))return toast('Dano no formato 1d6+2.');
 if(C.monsters.length>=LIMIT.monsters)return toast('Limite de 80 criaturas neste Canvas.');const p=spot(246,190);
 const m={id:uuid(),template:'custom',name:String(v.name).trim().slice(0,56),hp,max_hp:hp,defense:clamp(parseInt(v.defense)||0,0,999),attack_bonus:clamp(parseInt(v.bonus)||0,-20,30),damage:v.damage,abilities:[],effects:[],x:p.x,y:p.y};
 C.monsters.push(m);C.custom=false;save();render();select('creature:'+m.id)}
function hp(m,d){m.hp=clamp((Number(m.hp)||0)+d,0,Number(m.max_hp)||0);save();render()}
function logRoll(m,text,r){C.log.unshift({total:r.total,text:`${m.name} · ${text} (${r.label}${r.faces?' → '+r.faces.join(', '):''})`});C.log=C.log.slice(0,12);toast(`${m.name} · ${text}: ${r.total}`);if(C.sel==='creature:'+m.id)panel()}
function roll(m,kind,idx){const atk=idx!=null?(m.profile?.attacks||[])[idx]:null;let f;
 if(m.systemId&&m.systemId!=='custom')f=kind==='damage'?(atk?.damage||m.damageNotation||m.damage):(atk?.test||m.attackNotation||(m.systemId==='d-d'?'1d20'+(m.attack_bonus>=0?'+':'')+(m.attack_bonus||0):''));
 else f=kind==='attack'?'1d20'+(m.attack_bonus>=0?'+':'')+(m.attack_bonus||0):m.damage;
 if(!f)return toast('Rolagem não automatizada: veja a ficha original.');const r=RV.doRoll(String(f).replace(/\s+/g,''));if(!r)return toast('Fórmula não automatizada: '+f);
 logRoll(m,(atk?.name?atk.name+' · ':'')+(kind==='damage'?'Dano':'Ataque')+(m.systemId==='gurps'&&kind!=='damage'?' · compare com o nível-alvo':''),r)}
function ability(m,id){const a=(m.abilities||[]).find(x=>x.id===id);if(!a||!a.op)return;
 if(a.op==='buff'||a.op==='debuff'){m.effects=m.effects||[];m.effects.push({id:'e-'+Date.now(),name:a.name,stat:a.stat,amount:a.amount,remaining:a.turns});save();render();toast(`${m.name} usou ${a.name}: ${a.amount>0?'+':''}${a.amount} Defesa por ${a.turns} turnos.`);return}
 const r=RV.doRoll(a.dice);if(!r)return;if(a.op==='heal'){m.hp=Math.min(m.max_hp,m.hp+r.total);save();render()}logRoll(m,a.name+(a.op==='heal'?' · cura':' · dano'),r)}
function turn(m){m.effects=(m.effects||[]).filter(e=>(--e.remaining)>0);save();render()}

/* ---------------- quadros ---------------- */
function boardForm(title,b,onOk){const m=document.createElement('div');m.className='modal-back';
 m.innerHTML=`<form class="modal" role="dialog" aria-modal="true" aria-labelledby="cvb-h"><div class="fh" style="padding:0"><span class="kicker">Canvas</span><button class="x-btn" type="button" data-x aria-label="Fechar">${ic('x')}</button></div><h2 id="cvb-h">${esc(title)}</h2>
  <div class="field"><label for="cvb-c">Campanha</label><input class="input" id="cvb-c" maxlength="70" value="${esc(b.campaign)}" style="min-height:40px" required></div>
  <div class="field"><label for="cvb-n">Nome do Canvas</label><input class="input" id="cvb-n" maxlength="70" value="${esc(b.name)}" style="min-height:40px" required></div>
  <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>`;
 document.body.append(m);RV.hydrateIcons(m);$('#cvb-n',m).focus();m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-x]'))m.remove()});
 $('form',m).addEventListener('submit',e=>{e.preventDefault();onOk($('#cvb-c',m).value.trim().slice(0,70)||'Campanha',$('#cvb-n',m).value.trim().slice(0,70)||'Novo Canvas');m.remove()})}
function confirmBox(title,text,okLabel,onOk){const m=document.createElement('div');m.className='modal-back';
 m.innerHTML=`<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="cvc-h"><h2 id="cvc-h" style="font-size:28px">${esc(title)}</h2><p class="muted" style="margin:0">${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-x>Cancelar</button><button class="btn primary" type="button" data-ok>${esc(okLabel)}</button></div></div>`;
 document.body.append(m);$('[data-ok]',m).focus();m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-x]'))m.remove();if(e.target.closest('[data-ok]')){m.remove();onOk()}})}
function switchBoard(id){if(id===C.index.activeId||!C.index.boards.some(b=>b.id===id))return;if(!save())return;C.index.activeId=id;saveIndex();load(id);render();select(null)}
function newBoard(){if(C.index.boards.length>=LIMIT.boards)return toast('Limite de 100 Canvas neste aparelho.');
 boardForm('Novo Canvas',{campaign:board().campaign,name:'Mapa de investigação'},(campaign,name)=>{if(!save())return;const id=uuid();
  if(!write(PREFIX+id,{version:1,nodes:[],monsters:[],links:[],view:{panX:0,panY:0,zoom:1}}))return toast('Não foi possível criar o Canvas: armazenamento cheio.');
  C.index.boards.push({id,campaign,name});C.index.activeId=id;saveIndex();load(id);render();toast('Canvas criado em '+campaign+'.')})}
function renameBoard(){const b=board();boardForm('Renomear Canvas',b,(campaign,name)=>{b.campaign=campaign;b.name=name;saveIndex();chrome()})}
function dupBoard(){if(C.index.boards.length>=LIMIT.boards)return toast('Limite de 100 Canvas neste aparelho.');if(!save())return;const b=board(),id=uuid();
 try{localStorage.setItem(PREFIX+id,localStorage.getItem(PREFIX+C.id)||'')}catch(_){return toast('Sem espaço para duplicar o Canvas.')}
 C.index.boards.push({id,campaign:b.campaign,name:(b.name+' (cópia)').slice(0,70)});C.index.activeId=id;saveIndex();load(id);render();toast('Canvas duplicado.')}
function delBoard(){if(C.index.boards.length===1)return toast('Mantenha ao menos um Canvas.');const b=board();
 confirmBox('Excluir este Canvas?',`“${b.name}”, da campanha ${b.campaign}, será apagado deste aparelho. Não dá para desfazer.`,'Excluir Canvas',()=>{
  const old=C.id;C.index.boards=C.index.boards.filter(x=>x.id!==old);C.index.activeId=C.index.boards[0].id;saveIndex();try{localStorage.removeItem(PREFIX+old)}catch(_){}load(C.index.activeId);render()})}
function boardMenu(btn){const old=$('.cv-menu');if(old){old.remove();return}const r=btn.getBoundingClientRect(),m=document.createElement('div');m.className='pop menu cv-menu';m.setAttribute('role','menu');
 m.innerHTML=`<span class="mh">Seus Canvas</span>${C.index.boards.map(b=>`<button type="button" class="mi" role="menuitemradio" aria-checked="${b.id===C.index.activeId}" data-board="${esc(b.id)}">${ic(b.id===C.index.activeId?'check':'layout-board')}<span><b>${esc(b.name)}</b><small class="muted" style="display:block">${esc(b.campaign)}</small></span></button>`).join('')}
  <hr><button type="button" class="mi" role="menuitem" data-bact="new">${ic('plus')}Novo Canvas</button><button type="button" class="mi" role="menuitem" data-bact="rename">${ic('pencil')}Renomear</button><button type="button" class="mi" role="menuitem" data-bact="dup">${ic('copy')}Duplicar</button><button type="button" class="mi" role="menuitem" data-bact="del" class="danger">${ic('trash')}Excluir</button>`;
 C.root.append(m);const cr=C.root.getBoundingClientRect();m.style.left=(r.left-cr.left)+'px';m.style.top=(r.bottom-cr.top+8)+'px';m.style.maxHeight=(cr.height-(r.bottom-cr.top)-24)+'px';m.style.overflow='auto';
 m.addEventListener('click',e=>{const b=e.target.closest('[data-board]'),a=e.target.closest('[data-bact]');if(!b&&!a)return;m.remove();if(b)switchBoard(b.dataset.board);
  else({new:newBoard,rename:renameBoard,dup:dupBoard,del:delBoard})[a.dataset.bact]()})}

/* ---------------- ponteiro: arrastar, navegar, pinça ---------------- */
function bind(){const st=stage(),R=C.root;
 st.addEventListener('pointerdown',e=>{if(e.button>0&&e.pointerType==='mouse'&&e.button!==1)return;$('.cv-menu')?.remove();
  if(e.target.closest('button,input,textarea,select,audio,video,a,label'))return;
  C.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(C.ptr.size===2){const p=[...C.ptr.values()];C.pinch={d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),z:C.view.zoom};C.drag=C.pan=null;return}
  const hit=e.target.closest('.cv-hit');if(hit){select('link:'+hit.dataset.link);return}
  const it=e.target.closest('.cv-item'),rz=e.target.closest('[data-resize]');
  if(it&&C.tool==='link'&&e.button!==1){e.preventDefault();pick(it.dataset.ref);return}
  if(it&&e.button!==1){const o=find(it.dataset.ref);if(!o)return;const node=it.dataset.ref.startsWith('node:');
   C.drag={ref:it.dataset.ref,el:it,o,node,sx:e.clientX,sy:e.clientY,x:Number(node?o.left:o.x),y:Number(node?o.top:o.y),w:it.offsetWidth,resize:!!rz,moved:false};
   try{st.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault();return}
  C.pan={sx:e.clientX,sy:e.clientY,x:C.view.panX,y:C.view.panY,moved:false};try{st.setPointerCapture(e.pointerId)}catch(_){}st.classList.add('panning')});
 st.addEventListener('pointermove',e=>{if(!C.ptr.has(e.pointerId))return;C.ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(C.pinch&&C.ptr.size===2){const p=[...C.ptr.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);zoomAt(C.pinch.z*d/C.pinch.d/C.view.zoom,(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);return}
  const g=C.drag;if(g){const dx=(e.clientX-g.sx)/C.view.zoom,dy=(e.clientY-g.sy)/C.view.zoom;if(!g.moved&&Math.hypot(e.clientX-g.sx,e.clientY-g.sy)<4)return;g.moved=true;
   if(g.resize){const lim=g.o.type==='IMAGEM'?[200,850]:[240,700];g.o.width=Math.round(clamp(g.w+dx,lim[0],lim[1]));g.el.style.width=g.o.width+'px'}
   else{const x=clamp(g.x+dx,-100000,100000),y=clamp(g.y+dy,-100000,100000);if(g.node){g.o.left=x;g.o.top=y}else{g.o.x=x;g.o.y=y}g.el.style.left=x+'px';g.el.style.top=y+'px'}
   lines();return}
  const p=C.pan;if(p){if(!p.moved&&Math.hypot(e.clientX-p.sx,e.clientY-p.sy)<4)return;p.moved=true;C.view.panX=p.x+e.clientX-p.sx;C.view.panY=p.y+e.clientY-p.sy;applyView()}});
 const up=e=>{C.ptr.delete(e.pointerId);if(C.pinch){if(C.ptr.size<2)C.pinch=null;return}st.classList.remove('panning');
  const g=C.drag;C.drag=null;if(g){if(g.moved)save();else select(g.ref);return}
  const p=C.pan;C.pan=null;if(p){if(p.moved)saveSoon();else if(C.sel)select(null)}};
 st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
 st.addEventListener('wheel',e=>{e.preventDefault();if(e.ctrlKey||e.deltaMode||Math.abs(e.deltaY)>=50&&!e.deltaX)zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.012:.0016)),e.clientX,e.clientY);
  else{C.view.panX-=e.deltaX;C.view.panY-=e.deltaY;applyView();saveSoon()}},{passive:false});
 st.addEventListener('keydown',e=>{const h=e.target.closest('.cv-hit');if(h&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select('link:'+h.dataset.link)}
  const it=e.target.closest('.cv-item');if(it&&(e.key==='Enter'||e.key===' ')&&e.target===it){e.preventDefault();C.tool==='link'?pick(it.dataset.ref):select(it.dataset.ref)}});
 /* botões dentro dos itens e dos painéis */
 R.addEventListener('click',e=>{const t=e.target;
  const tool=t.closest('[data-cv-tool]');if(tool){setTool(tool.dataset.cvTool);return}
  const z=t.closest('[data-cz]');if(z){const k=+z.dataset.cz;if(!k)fit();else{const r=stage().getBoundingClientRect();zoomAt(k>0?1.2:1/1.2,r.left+r.width/2,r.top+r.height/2)}return}
  if(t.closest('.cv-board-btn')){boardMenu(t.closest('.cv-board-btn'));return}
  const cl=t.closest('[data-close]');if(cl){if(cl.dataset.close==='cv-drawer'){C.drawer=false;$('.cv-drawer',R).hidden=true}else{C.panel=null;C.sel=null;$('.cv-panel',R).hidden=true;render()}chrome();return}
  const sw=t.closest('[data-color]');if(sw){C.color=goodColor(sw.dataset.color);chrome();return}
  const lc=t.closest('[data-link-color]');if(lc){const l=C.links.find(x=>'link:'+x.id===C.sel);if(l){l.color=goodColor(lc.dataset.linkColor);save();lines();panel()}return}
  const ul=t.closest('[data-unlink]');if(ul){unlink(ul.dataset.unlink);return}
  const ds=t.closest('[data-dsys]');if(ds){C.drawerSys=ds.dataset.dsys;drawer();return}
  const ab=t.closest('[data-beast]');if(ab){const c=RV.CREATURES[ab.dataset.beast];if(c)addBeast(c);return}
  const item=t.closest('.cv-item'),ref=item?.dataset.ref||C.sel,m=ref&&ref.startsWith('creature:')?find(ref):null;
  const hpb=t.closest('[data-hp]');if(hpb&&m){hp(m,+hpb.dataset.hp);return}
  const rb=t.closest('[data-roll]');if(rb&&m){roll(m,rb.dataset.roll);return}
  const at=t.closest('[data-atk]');if(at&&m){roll(m,'attack',+at.dataset.atk);return}
  const ai=t.closest('[data-abil]');if(ai&&m){ability(m,ai.dataset.abil);return}
  const act=t.closest('[data-cv-act]');if(!act)return;const a=act.dataset.cvAct;
  if(a==='custom'){C.custom=!C.custom;drawer();if(C.custom)$('.cv-custom [name="name"]',R)?.focus();return}
  if(a==='del')removeSel();if(a==='dup')dup();if(a==='turn'&&m)turn(m);
  if(a==='link-from'&&C.sel){C.tool='link';stage().dataset.tool='link';const s=C.sel;C.linkStart=null;pick(s)}});
 R.addEventListener('submit',e=>{if(e.target.closest('.cv-custom')){e.preventDefault();addCustom(e.target)}});
 R.addEventListener('input',e=>{const t=e.target;
  if(t.id==='cv-q'){C.drawerQ=t.value;const pos=t.selectionStart;drawer();const q=$('#cv-q');q.focus();q.setSelectionRange(pos,pos);return}
  if(t.type==='color'&&t.closest('.cv-opt')){C.color=goodColor(t.value);t.parentElement.style.background=C.color;return}
  const o=C.sel&&C.sel.startsWith('node:')?find(C.sel):null;
  if(o&&(t.id==='cv-title'||t.id==='cv-text'||t.id==='cv-type')){if(t.id==='cv-title')o.title=t.value.slice(0,110);if(t.id==='cv-text')o.text=t.value.slice(0,10000);
   if(t.id==='cv-type'){o.type=t.value;o.theme=themeOf(o.type)}saveSoon();
   const el=C.root.querySelector(`.cv-item[data-ref="${CSS.escape(C.sel)}"]`);if(el){$('h4',el).textContent=o.title||'Sem título';$('.cv-type',el).textContent=o.type;el.style.setProperty('--tc',TYPE_COLOR[o.type]||'var(--accent)');
    let p=$('p',el);if(o.text){if(!p){p=document.createElement('p');el.querySelector('.cv-resize')?el.querySelector('.cv-resize').before(p):el.append(p)}p.textContent=o.text}else p?.remove();lines()}
   if(t.id==='cv-title')$('.cv-panel h3',C.root).textContent=o.title||'Sem título';return}
  const m=C.sel&&C.sel.startsWith('creature:')?find(C.sel):null;if(m&&t.id==='cv-hpset'&&t.value!==''){m.hp=clamp(parseInt(t.value)||0,0,m.max_hp);save();const sel=C.sel;render();C.sel=sel}});
 R.addEventListener('change',e=>{const t=e.target;if(t.classList.contains('cv-file-img')){const f=[...t.files];t.value='';if(f.length)addImages(f)}
  if(t.classList.contains('cv-file-media')){const f=[...t.files];t.value='';if(f.length)addMedia(f)}});
 document.addEventListener('keydown',e=>{if(location.hash!=='#canvas'||e.target.closest('input,textarea,select')||$('.modal-back'))return;const k=e.key.toLowerCase();
  if(e.key==='Escape'){if($('.cv-menu')){$('.cv-menu').remove();return}if(C.tool==='link'){setTool('move');return}if(C.sel){select(null);return}if(C.drawer){setTool('beast');return}return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='v')setTool('move');else if(k==='n'){e.preventDefault();addCard()}else if(k==='l')setTool('link');else if(k==='a')setTool('beast');else if(k==='0')fit();
  else if(k==='+'||k==='='){const r=stage().getBoundingClientRect();zoomAt(1.2,r.left+r.width/2,r.top+r.height/2)}else if(k==='-'){const r=stage().getBoundingClientRect();zoomAt(1/1.2,r.left+r.width/2,r.top+r.height/2)}
  else if((k==='delete'||k==='backspace')&&C.sel){e.preventDefault();if(C.sel.startsWith('link:'))unlink(C.sel.slice(5));else removeSel()}});
 window.addEventListener('pagehide',()=>{if(C.id)save()});window.addEventListener('resize',()=>{if(location.hash==='#canvas')lines()})}

/* ---------------- entrada ---------------- */
RV.Canvas={open(back){if(!C.built){build();boot()}const b=$('.cv-back',C.root);b.href=back&&back!=='#canvas'?back:'#inicio';b.querySelector('.tip').textContent=back==='#mesa'?'Mesa ao vivo':back==='#mestragem'?'Mestragem':'Voltar';
  stage().dataset.tool=C.tool;render();requestAnimationFrame(()=>{lines();if(!C.nodes.length&&!C.monsters.length)return;const r=stage().getBoundingClientRect();if(!r.width)return})},
 /* resumo para a Mestragem: quantos itens, quais quadros */
 summary(){const idx=read(KEY);if(!idx||!Array.isArray(idx.boards))return{boards:[],active:null};const act=idx.boards.find(b=>b.id===idx.activeId)||idx.boards[0];const b=act?readBoard(act.id):null;
  return{boards:idx.boards,active:act,nodes:b?b.nodes.length:0,monsters:b?b.monsters.length:0,links:b?b.links.length:0,titles:b?b.nodes.slice(0,6).map(n=>n.title):[]}},
 /* cartão da Mestragem: o Canvas da campanha, sem sair da tela */
 card(){const s=this.summary();if(!s.active)return `<article class="card c12"><div class="card-h"><h2>Canvas da campanha</h2></div><p class="muted small" style="margin:0">Pistas, personagens, locais e criaturas ligados num quadro livre.</p><a class="btn sm" href="#canvas">${ic('layout-grid')}Abrir o Canvas</a></article>`;
  return `<article class="card c12"><div class="card-h"><h2>Canvas da campanha</h2><span class="small muted">${s.boards.length} quadro${s.boards.length>1?'s':''} neste aparelho</span></div>
   <div class="row between"><div style="min-width:0"><b style="font:600 20px var(--font-head)">${esc(s.active.name)}</b><span class="small muted" style="display:block">${esc(s.active.campaign)} · ${s.nodes} cartões · ${s.monsters} criaturas · ${s.links} ligações</span></div><a class="btn sm primary" href="#canvas">${ic('layout-grid')}Abrir o Canvas</a></div>
   ${s.titles.length?`<div class="row" style="gap:6px">${s.titles.map(t=>`<span class="chip">${esc(String(t).slice(0,40))}</span>`).join('')}</div>`:''}</article>`},
 get state(){return C}};
})();
