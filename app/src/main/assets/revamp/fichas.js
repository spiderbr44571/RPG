/* Mastermind · revamp — fichas salvas neste aparelho, dos quatro sistemas com motor no app.
   Lê as mesmas chaves que a interface clássica usa e prepara cada ficha no formato que o servidor
   da mesa aceita (LocalCampaignServer.sheet). Não altera nenhuma ficha. */
(function(){
'use strict';
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(_){return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const STUDIO='mastermind-sheet-studio-system';
const KEYS={ordem:'rpg-ordem-v13-character',ordemList:'rpg-v05-characters',dnd:'rpg-dnd5e-characters-v1',dndSel:'rpg-dnd5e-current-v1',gurps:'rpg-gurps4-characters-v1',gurpsSel:'rpg-gurps4-selected-v1',coc:'mastermind-coc7-investigadores-v1',cocSel:'mastermind-coc7-selected-v1'};
const SYSTEM_LABEL={'ordem-paranormal':'Ordem Paranormal','d-d':'D&D 5e',gurps:'GURPS 4e','chamado-de-ctchulhu':'Chamado de Cthulhu 7e'};
const store=(k,v)=>{try{localStorage.setItem(k,v);return true}catch(_){return false}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
/* Mesma fórmula de OP13.calc (ferramentas.html): PV, PE e SAN pela classe, NEX, atributos, origem e trilha. */
function ordemMax(state,pack){
 if(!pack||!state)return null;const c=pack.classes?.[state.class]||pack.classes?.Combatente;if(!c)return null;
 const s=(pack.progressao||[]).filter(x=>x.nex<=state.nex).length,a=state.attrs||{},o=(pack.origens||[]).find(x=>x.nome===state.origin)||pack.origens?.[0]||{};
 const pv=c.pv[0]+a.Vigor+(s-1)*(c.pv[1]+a.Vigor)+(o.nome==='Desgarrado'?s:0)+(state.trail==='Tropa de Choque'&&state.nex>=10?s:0);
 const uni=o.nome==='Universitário'?(1+Array.from({length:9},(_,i)=>15+i*10).filter(n=>n<=state.nex).length):0;
 const pe=c.pe[0]+a.Presença+(s-1)*(c.pe[1]+a.Presença)+uni;
 const transcends=(Array.isArray(state.powerChoices)?state.powerChoices:[]).filter(p=>p?.type==='transcend').length;
 const san=Math.max(0,c.san[0]+(s-1)*c.san[1]+(o.nome==='Vítima'?s:0)-transcends*c.san[1]);
 return{PV:pv,PE:pe,SAN:san}}
function ordemSheet(state){const pack=window.RV_ORDEM_PACK,max=ordemMax(state,pack);const sheet=JSON.parse(JSON.stringify(state));sheet.systemId='ordem-paranormal';sheet.resources=sheet.resources||{};
 if(max)for(const k of ['PV','PE','SAN']){const v=sheet.resources[k];const cur=typeof v==='object'?Number(v?.current):Number(v??max[k]);sheet.resources[k]={current:clamp(Number.isFinite(cur)?cur:max[k],0,max[k]),max:max[k]}}
 return sheet}
/* Recursos para o HUD, pelo sistema da ficha (mesmas regras do servidor em /resource). */
function resources(sheet){if(!sheet)return[];const sys=sheet.systemId||'ordem-paranormal';
 if(sys==='gurps'){const a=sheet.attrs||{},m=sheet.mod||{};const hp=Math.max(1,(+a.ST||10)+(+m.hp||0)),fp=Math.max(1,(+a.HT||10)+(+m.fp||0));return[{key:'HP',label:'HP',cur:sheet.currentHP??hp,max:hp,color:'var(--danger)'},{key:'FP',label:'FP',cur:sheet.currentFP??fp,max:fp,color:'var(--blue)'}]}
 if(sys==='d-d'){const mx=+sheet.hitPointsMax||0;return[{key:'PV',label:'PV',cur:sheet.hitPointsCurrent??mx,max:mx,color:'var(--danger)'}]}
 if(sys==='chamado-de-ctchulhu'){const r=sheet.resources||{};return[['HP','PV','var(--danger)',true],['SAN','Sanidade','var(--purple)',false],['MP','PM','var(--blue)',true]].filter(([k])=>r[k]).map(([k,l,c,ro])=>({key:k,label:l,cur:+r[k].current,max:+r[k].max,color:c,readOnly:ro}))}
 const r=sheet.resources||{};return[['PV','Vida','var(--danger)'],['PE','Esforço','var(--blue)'],['SAN','Sanidade','var(--purple)']].filter(([k])=>r[k]).map(([k,l,c])=>{const v=r[k];return{key:k,label:l,cur:typeof v==='object'?+v.current:+v,max:typeof v==='object'?+v.max:+v,color:c}})}
function detailOf(sheet){const sys=sheet.systemId;if(sys==='ordem-paranormal')return[sheet.class,sheet.nex!=null?'NEX '+sheet.nex+'%':''].filter(Boolean).join(' · ');
 if(sys==='d-d')return[sheet.klass,sheet.level?'nível '+sheet.level:''].filter(Boolean).join(' · ');if(sys==='gurps')return[sheet.concept,sheet.points?sheet.points+' pontos':''].filter(Boolean).join(' · ');
 return[sheet.occupation||'',sheet.era||'',sheet.age?sheet.age+' anos':''].filter(Boolean).join(' · ')}
/* Todas as fichas do aparelho. "select" deixa a ficha escolhida como atual na interface clássica. */
function list(){const out=[];
 const op=read(KEYS.ordem,null);if(op&&op.name){const sheet=ordemSheet(op);out.push({id:'ordem:atual',system:'ordem-paranormal',name:op.name,detail:detailOf(sheet),sheet,select:()=>store(STUDIO,'ordem-paranormal'),screen:'sheet'})}
 const dnd=read(KEYS.dnd,[]);if(Array.isArray(dnd))dnd.forEach(c=>{if(!c?.name)return;const sheet=Object.assign({},c,{systemId:'d-d'});out.push({id:'dnd:'+c.id,system:'d-d',name:c.name,detail:detailOf(sheet),sheet,select:()=>write(KEYS.dndSel,c.id)&&store(STUDIO,'d-d'),screen:'sheet'})});
 const gurps=read(KEYS.gurps,[]);if(Array.isArray(gurps))gurps.forEach(c=>{if(!c?.name)return;const sheet=Object.assign({},c,{systemId:'gurps',edition:c.edition||'4e'});out.push({id:'gurps:'+(c.id||c.name),system:'gurps',name:c.name,detail:detailOf(sheet),sheet,select:()=>write(KEYS.gurpsSel,c.id)&&store(STUDIO,'gurps'),screen:'sheet'})});
 const coc=read(KEYS.coc,[]);if(Array.isArray(coc))coc.forEach(c=>{if(!c?.name&&!c?.nome)return;const sheet=Object.assign({},c,{name:c.name||c.nome,systemId:'chamado-de-ctchulhu'});out.push({id:'coc:'+(c.id||sheet.name),system:'chamado-de-ctchulhu',name:sheet.name,detail:detailOf(sheet),sheet,select:()=>write(KEYS.cocSel,c.id)&&store(STUDIO,'chamado-de-ctchulhu'),screen:'sheet'})});
 return out}
/* ---------- tela Fichas e cartão do Início ---------- */
const COLOR={'ordem-paranormal':'#c7a87b','d-d':'#6db7e0',gurps:'#e3a85a','chamado-de-ctchulhu':'#86bd9c'};
const esc=s=>RV.esc(s),ic=(n)=>RV.ic(n);
const bars=sheet=>resources(sheet).map(r=>{const pct=r.max?Math.round(Math.max(0,r.cur)/r.max*100):0;return `<div class="res-row"><span>${esc(r.label)}</span><div class="bar"><i style="width:${pct}%;--c:${r.color}"></i></div><span class="num">${r.cur}/${r.max}</span></div>`}).join('');
const attrs=sheet=>{const a=sheet.attrs||sheet.attributes||sheet.characteristics||sheet.abilities||{};const e=Object.entries(a).filter(([,v])=>typeof v==='number').slice(0,9);
 const ab=k=>k.length<=3?k:String(k).normalize('NFD').replace(/[\u0300-\u036f]/g,'').slice(0,3).toUpperCase();return e.length?`<div class="attrs">${e.map(([k,v])=>`<div class="attr"><b>${esc(v)}</b><span title="${esc(k)}">${esc(ab(k))}</span></div>`).join('')}</div>`:''};
const P={open:null,sys:'all'};
function openTool(entry,screen){entry.select();RV.tool?RV.tool(screen||entry.screen):location.href='../ferramentas.html#'+(screen||entry.screen)}
function page(){const host=document.getElementById('fichas');if(!host)return;const all=list(),shown=all.filter(e=>P.sys==='all'||e.system===P.sys),cur=all.find(e=>e.id===P.open)||null;
 const inApp=RV.inApp;
 host.innerHTML=`<div class="row between"><div class="seg" role="group" aria-label="Sistema" id="fx-sys">${[['all','Todas'],['ordem-paranormal','Ordem'],['d-d','D&D 5e'],['chamado-de-ctchulhu','Cthulhu'],['gurps','GURPS']].map(([k,l])=>`<button type="button" data-fx-sys="${k}" aria-pressed="${P.sys===k}">${l}</button>`).join('')}</div>
  ${inApp?`<button class="btn primary" type="button" data-fx="new">${ic('plus')}Nova ficha</button>`:''}</div>
  <div class="grid">${shown.map(e=>`<button type="button" class="card c4 fx-card" data-fx-open="${esc(e.id)}" aria-pressed="${P.open===e.id}" style="--el:${COLOR[e.system]}"><div class="row" style="gap:12px;flex-wrap:nowrap"><span class="char-glyph" style="background:${COLOR[e.system]}">${esc((e.name||'?')[0])}</span><div style="min-width:0;text-align:left"><b style="font:600 22px var(--font-head);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.name)}</b><span class="small muted">${esc(SYSTEM_LABEL[e.system])}${e.detail?' · '+esc(e.detail):''}</span></div></div>${bars(e.sheet)}</button>`).join('')||
   `<article class="card c12"><div class="empty"><span data-i="user"></span><b>Nenhuma ficha ${P.sys==='all'?'neste aparelho':'deste sistema'}</b><p class="muted small" style="margin:0">${inApp?'Crie uma ficha: ela fica salva neste aparelho e pode ser enviada ao mestre quando você entrar numa mesa.':'As fichas ficam no app Mastermind. Abra esta interface pelo app para criar e editar fichas.'}</p></div></article>`}</div>
  ${cur?`<article class="card"><div class="sheet-head"><div class="portrait" aria-hidden="true" style="background:${COLOR[cur.system]}">${esc((cur.name||'?')[0])}</div><div style="min-width:0"><p class="kicker">${esc(SYSTEM_LABEL[cur.system])}</p><h2 style="font-size:40px;line-height:1">${esc(cur.name)}</h2>${cur.detail?`<p class="muted" style="margin:6px 0 0">${esc(cur.detail)}</p>`:''}</div>
   <div class="row sh-actions">${inApp?`<button class="btn primary" type="button" data-fx="full">${ic('file-text')}Abrir ficha completa</button><button class="btn" type="button" data-fx="atelier">${ic('palette')}Ateliê</button>`:''}<a class="btn" href="#entrar">${ic('map')}Levar para uma mesa</a><button class="x-btn" type="button" data-fx="close" aria-label="Fechar">${ic('x')}</button></div></div>
   <div class="grid"><div class="c6">${bars(cur.sheet)||'<p class="muted small">Sem recursos registrados.</p>'}</div><div class="c6">${attrs(cur.sheet)}</div></div>
   <p class="small faint" style="margin:0">${inApp?'Perícias, inventário, rituais, poderes e exportação em PDF ficam na ficha completa do app, com os mesmos dados.':'Somente leitura nesta prévia.'}</p></article>`:''}`;
 RV.hydrateIcons(host)}
function home(){const host=document.getElementById('home-sheet');if(!host)return;const all=list();const e=all[0];
 if(!e){host.innerHTML=`<div class="card-h"><p class="kicker">Continuar de onde parou</p></div><div class="empty"><span data-i="user"></span><b>Nenhuma ficha ainda</b><p class="muted small" style="margin:0">Crie um personagem em Fichas.</p><a class="btn sm" href="#ficha">${ic('user')}Abrir Fichas</a></div>`;RV.hydrateIcons(host);return}
 host.innerHTML=`<div class="card-h"><p class="kicker">Continuar de onde parou</p><span class="small muted">${all.length} ficha${all.length>1?'s':''}</span></div>
  <div class="char-card"><div class="char-glyph" style="background:${COLOR[e.system]}">${esc(e.name[0])}</div><div style="min-width:0"><p class="kicker" style="color:var(--muted)">${esc(SYSTEM_LABEL[e.system])}</p><h2 style="font-size:30px">${esc(e.name)}</h2>${e.detail?`<div class="row" style="gap:6px;margin-top:6px"><span class="chip">${esc(e.detail)}</span></div>`:''}</div></div>
  ${bars(e.sheet)}<div class="row"><a class="btn primary" href="#ficha" data-fx-pick="${esc(e.id)}" style="flex:1">${ic('user')}Abrir esta ficha</a><a class="btn" href="#entrar">${ic('map')}Mesa</a></div>`;RV.hydrateIcons(host)}
document.addEventListener('click',ev=>{const t=ev.target;const pick=t.closest('[data-fx-pick]');if(pick)P.open=pick.dataset.fxPick;
 const sy=t.closest('[data-fx-sys]');if(sy){P.sys=sy.dataset.fxSys;page();return}
 const o=t.closest('[data-fx-open]');if(o){P.open=P.open===o.dataset.fxOpen?null:o.dataset.fxOpen;page();return}
 const a=t.closest('[data-fx]');if(!a)return;const cur=list().find(e=>e.id===P.open);
 if(a.dataset.fx==='close'){P.open=null;page()}
 if(a.dataset.fx==='full'&&cur)openTool(cur,'sheet');
 if(a.dataset.fx==='atelier'&&cur)openTool(cur,'atelier85');
 if(a.dataset.fx==='new'){if(P.sys!=='all')store(STUDIO,P.sys);RV.tool?RV.tool('sheet'):0}});
RV.on&&RV.on(e=>{if(e==='route:ficha')page();if(e==='route:inicio')home()});
RV.Sheets={list,resources,ordemSheet,ordemMax,detailOf,SYSTEM_LABEL,KEYS,page,home};
})();
