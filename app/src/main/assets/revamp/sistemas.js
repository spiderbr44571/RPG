/* Mastermind · nova interface — sistemas próprios (criados pelo usuário) e as fichas deles.
   Um sistema próprio guarda os valores que a mesa usa: dado do teste e como o atributo entra nele, atributos
   (com mínimo, máximo e valor inicial), recursos (com o máximo inicial) e o nome/valor da defesa. Perícias, poderes,
   equipamentos e o resto do conteúdo ficam no editor de regras da Biblioteca (MastermindSystemEditor), como nos
   outros sistemas. Tudo fica neste aparelho:
   - mastermind-custom-systems-v1: lista de sistemas próprios
   - mastermind-custom-sheets-v1: fichas desses sistemas
   As fichas usam o formato que o servidor da mesa já aceita (systemId, name, attrs, resources {current,max}). */
(function(){
'use strict';
const {$,esc,ic,toast,emit}=RV;
const SYS_KEY='mastermind-custom-systems-v1',SHEET_KEY='mastermind-custom-sheets-v1';
const LIMIT={systems:40,attrs:12,res:8,sheets:300};
const MODES={soma:'Dado + atributo (ex.: 1d20 + valor)',dados:'Atributo = quantidade de dados, fica o maior (como Ordem Paranormal)',abaixo:'Rolar abaixo do atributo (ex.: 1d100 ≤ valor, como Cthulhu)'};
const COLORS=['#e0707c','#6db7e0','#9c90dd','#86bd9c','#e3a85a','#c7a87b','#e8e7e7'];
const read=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(_){return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const num=(v,a,b,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(a,Math.min(b,n)):d};
const txt=(v,max)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const abbrOf=(v,name)=>{const a=txt(v,6).toUpperCase().replace(/[^A-Z0-9À-Ü]/g,'');return a||String(name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)||'ATR'};
const newId=p=>p+'-'+Array.from(crypto.getRandomValues?crypto.getRandomValues(new Uint8Array(6)):[...Array(6)].map(()=>Math.random()*256|0),b=>(b%36).toString(36)).join('');
const DICE=/^([1-9]\d?)?d(4|6|8|10|12|20|100)$/i;

/* ---------- sistemas ---------- */
function clean(s){const out={id:/^proprio-[a-z0-9]{4,40}$/.test(s.id||'')?s.id:newId('proprio'),name:txt(s.name,60),edition:txt(s.edition,40),description:txt(s.description,1200),
 dice:DICE.test(String(s.dice||'').trim())?String(s.dice).trim().toLowerCase():'1d20',mode:MODES[s.mode]?s.mode:'soma',
 attributes:[],resources:[],defense:{name:txt(s.defense?.name,30)||'Defesa',base:num(s.defense?.base,0,999,10)},createdAt:s.createdAt||Date.now(),updatedAt:Date.now()};
 if(!out.name)throw Error('Dê um nome ao sistema.');
 const seen=new Set();
 for(const a of (s.attributes||[]).slice(0,LIMIT.attrs)){const name=txt(a.name,30);if(!name)continue;let ab=abbrOf(a.abbr,name);while(seen.has(ab))ab=ab.slice(0,5)+seen.size;seen.add(ab);
  const min=num(a.min,-99,999,0),max=Math.max(min,num(a.max,-99,999,10));out.attributes.push({name,abbr:ab,min,max,def:num(a.def,min,max,min)})}
 for(const r of (s.resources||[]).slice(0,LIMIT.res)){const name=txt(r.name,30);if(!name)continue;let ab=abbrOf(r.abbr,name);while(seen.has(ab))ab=ab.slice(0,5)+seen.size;seen.add(ab);
  out.resources.push({name,abbr:ab,max:num(r.max,1,100000,10),color:COLORS.includes(r.color)?r.color:COLORS[out.resources.length%COLORS.length]})}
 if(!out.attributes.length)throw Error('Crie pelo menos um atributo.');
 return out}
function list(){const l=read(SYS_KEY,[]);return Array.isArray(l)?l.filter(s=>s&&/^proprio-/.test(s.id)&&s.name):[]}
function get(id){return list().find(s=>s.id===id)||null}
function save(s){const all=list(),c=clean(s),i=all.findIndex(x=>x.id===c.id);if(i<0&&all.length>=LIMIT.systems)throw Error('Limite de '+LIMIT.systems+' sistemas próprios.');
 if(i>=0){c.createdAt=all[i].createdAt;all[i]=c}else all.push(c);if(!write(SYS_KEY,all))throw Error('Sem espaço neste aparelho.');labels();emit&&emit('systems:changed');return c}
function remove(id){write(SYS_KEY,list().filter(s=>s.id!==id));labels();emit&&emit('systems:changed')}
/* nomes dos sistemas próprios nas listas que já usam SYSTEM_LABEL (Fichas, Mestragem, mesa) */
function labels(){const L=RV.Sheets?.SYSTEM_LABEL;if(!L)return;for(const k of Object.keys(L))if(/^proprio-/.test(k))delete L[k];for(const s of list())L[s.id]=s.name}

/* ---------- formulário do sistema ---------- */
function attrRow(a={},i){return `<div class="cs-row" data-row="attr"><input class="input" name="an" maxlength="30" placeholder="Nome (ex.: Força)" value="${esc(a.name||'')}" aria-label="Nome do atributo ${i+1}"><input class="input" name="aa" maxlength="6" placeholder="Sigla" value="${esc(a.abbr||'')}" aria-label="Sigla"><input class="input num" name="amin" type="number" value="${a.min??0}" aria-label="Mínimo" title="Mínimo"><input class="input num" name="amax" type="number" value="${a.max??10}" aria-label="Máximo" title="Máximo"><input class="input num" name="adef" type="number" value="${a.def??a.min??0}" aria-label="Valor inicial" title="Inicial"><button class="ibtn" type="button" data-cs="del-row" aria-label="Remover">${ic('trash')}</button></div>`}
function resRow(r={},i){return `<div class="cs-row res" data-row="res"><input class="input" name="rn" maxlength="30" placeholder="Nome (ex.: Vida)" value="${esc(r.name||'')}" aria-label="Nome do recurso ${i+1}"><input class="input" name="ra" maxlength="6" placeholder="Sigla" value="${esc(r.abbr||'')}" aria-label="Sigla"><input class="input num" name="rmax" type="number" min="1" value="${r.max??10}" aria-label="Máximo inicial" title="Máximo inicial"><select class="input" name="rc" aria-label="Cor">${COLORS.map(c=>`<option value="${c}" ${r.color===c?'selected':''} style="color:${c}">● ${({'#e0707c':'Vermelho','#6db7e0':'Azul','#9c90dd':'Roxo','#86bd9c':'Verde','#e3a85a':'Laranja','#c7a87b':'Dourado','#e8e7e7':'Branco'})[c]}</option>`).join('')}</select><button class="ibtn" type="button" data-cs="del-row" aria-label="Remover">${ic('trash')}</button></div>`}
const STARTER={attributes:[{name:'Força',abbr:'FOR',min:0,max:5,def:1},{name:'Agilidade',abbr:'AGI',min:0,max:5,def:1},{name:'Mente',abbr:'MEN',min:0,max:5,def:1}],resources:[{name:'Vida',abbr:'PV',max:20,color:'#e0707c'},{name:'Energia',abbr:'PE',max:5,color:'#6db7e0'}]};
function openForm(id,done){const cur=id?get(id):null,s=cur||Object.assign({name:'',edition:'',description:'',dice:'1d20',mode:'soma',defense:{name:'Defesa',base:10}},STARTER);
 const b=document.createElement('div');b.className='modal-back';
 b.innerHTML=`<form class="modal cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-h"><div class="fh" style="padding:0"><div><span class="kicker">${cur?'Editar sistema':'Novo sistema'}</span><h2 id="cs-h" style="font-size:30px;margin:2px 0 0">${cur?esc(cur.name):'Seu sistema, seus valores.'}</h2></div><button class="x-btn" type="button" data-x aria-label="Fechar">${ic('x')}</button></div>
  <div class="grid2f"><div class="field"><label for="cs-name">Nome do sistema</label><input class="input" id="cs-name" maxlength="60" value="${esc(s.name)}" required></div><div class="field"><label for="cs-ed">Edição ou versão</label><input class="input" id="cs-ed" maxlength="40" value="${esc(s.edition)}" placeholder="ex.: 1ª edição"></div></div>
  <div class="field"><label for="cs-desc">Descrição</label><textarea class="input" id="cs-desc" rows="2" maxlength="1200" placeholder="Do que se trata, tom, cenário…">${esc(s.description)}</textarea></div>
  <h3 class="cs-h3">Teste</h3>
  <div class="grid2f"><div class="field"><label for="cs-dice">Dado do teste</label><input class="input" id="cs-dice" maxlength="6" value="${esc(s.dice)}" placeholder="1d20, 3d6, 1d100" pattern="([1-9][0-9]?)?[dD](4|6|8|10|12|20|100)"></div>
   <div class="field"><label for="cs-mode">Como o atributo entra no teste</label><select class="input" id="cs-mode">${Object.entries(MODES).map(([k,l])=>`<option value="${k}" ${s.mode===k?'selected':''}>${esc(l)}</option>`).join('')}</select></div></div>
  <div class="grid2f"><div class="field"><label for="cs-dn">Nome da defesa</label><input class="input" id="cs-dn" maxlength="30" value="${esc(s.defense?.name||'Defesa')}"></div><div class="field"><label for="cs-db">Defesa inicial</label><input class="input num" id="cs-db" type="number" min="0" max="999" value="${s.defense?.base??10}"></div></div>
  <div class="row between"><h3 class="cs-h3">Atributos</h3><span class="small muted">nome · sigla · mínimo · máximo · inicial</span></div>
  <div id="cs-attrs" class="cs-rows">${s.attributes.map(attrRow).join('')}</div><button class="btn sm" type="button" data-cs="add-attr">${ic('plus')}Atributo</button>
  <div class="row between"><h3 class="cs-h3">Recursos</h3><span class="small muted">nome · sigla · máximo inicial · cor</span></div>
  <div id="cs-res" class="cs-rows">${s.resources.map(resRow).join('')}</div><button class="btn sm" type="button" data-cs="add-res">${ic('plus')}Recurso</button>
  <p class="small faint" style="margin:0">Perícias, poderes, equipamentos e o resto do conteúdo você cria depois, na tela do sistema, em "Regras e conteúdo". Mudar valores aqui não altera fichas já criadas.</p>
  <div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-x>Cancelar</button><button class="btn primary" type="submit">${ic('check')}${cur?'Salvar':'Criar sistema'}</button></div></form>`;
 document.body.appendChild(b);RV.hydrateIcons(b);b.querySelector('#cs-name').focus();
 b.addEventListener('click',e=>{if(e.target===b||e.target.closest('[data-x]')){b.remove();return}const a=e.target.closest('[data-cs]')?.dataset.cs;
  if(a==='add-attr'){const host=b.querySelector('#cs-attrs');if(host.children.length>=LIMIT.attrs)return toast('Até '+LIMIT.attrs+' atributos.');host.insertAdjacentHTML('beforeend',attrRow({},host.children.length));RV.hydrateIcons(host);host.lastElementChild.querySelector('input').focus()}
  if(a==='add-res'){const host=b.querySelector('#cs-res');if(host.children.length>=LIMIT.res)return toast('Até '+LIMIT.res+' recursos.');host.insertAdjacentHTML('beforeend',resRow({color:COLORS[host.children.length%COLORS.length]},host.children.length));RV.hydrateIcons(host);host.lastElementChild.querySelector('input').focus()}
  if(a==='del-row')e.target.closest('.cs-row').remove()});
 b.addEventListener('submit',e=>{e.preventDefault();const f=b.querySelector('form'),v=sel=>f.querySelector(sel).value;
  const rows=(sel,map)=>[...f.querySelectorAll(sel)].map(map);
  try{const out=save({id:cur?.id,createdAt:cur?.createdAt,name:v('#cs-name'),edition:v('#cs-ed'),description:v('#cs-desc'),dice:v('#cs-dice'),mode:v('#cs-mode'),defense:{name:v('#cs-dn'),base:v('#cs-db')},
   attributes:rows('[data-row="attr"]',r=>({name:r.querySelector('[name=an]').value,abbr:r.querySelector('[name=aa]').value,min:r.querySelector('[name=amin]').value,max:r.querySelector('[name=amax]').value,def:r.querySelector('[name=adef]').value})),
   resources:rows('[data-row="res"]',r=>({name:r.querySelector('[name=rn]').value,abbr:r.querySelector('[name=ra]').value,max:r.querySelector('[name=rmax]').value,color:r.querySelector('[name=rc]').value}))});
   b.remove();toast(cur?'Sistema salvo.':'Sistema criado. Agora dá para criar fichas e criaturas dele.');done&&done(out)}catch(err){toast(err.message)}})}

/* ---------- fichas dos sistemas próprios ---------- */
function sheets(){const l=read(SHEET_KEY,[]);return Array.isArray(l)?l.filter(x=>x&&x.id&&x.systemId):[]}
function sheetOf(x){const s=get(x.systemId);const attrs={},resources={};
 for(const a of s?.attributes||[])attrs[a.abbr]=num(x.attrs?.[a.abbr],a.min,a.max,a.def);
 for(const r of s?.resources||[]){const v=x.resources?.[r.abbr]||{};const max=num(v.max,1,100000,r.max);resources[r.abbr]={current:num(v.current,0,max,max),max}}
 return{systemId:x.systemId,name:x.name,concept:x.concept||'',attrs,resources,defense:num(x.defense,0,999,s?.defense?.base??10),skills:x.skills||{},notes:x.notes||'',customSystem:s?{name:s.name,edition:s.edition,dice:s.dice,mode:s.mode}:null}}
function createSheet(systemId){const s=get(systemId);if(!s)throw Error('Sistema não encontrado.');const all=sheets();if(all.length>=LIMIT.sheets)throw Error('Limite de fichas deste tipo.');
 const x={id:newId('ficha'),systemId,name:'Novo personagem',concept:'',attrs:Object.fromEntries(s.attributes.map(a=>[a.abbr,a.def])),resources:Object.fromEntries(s.resources.map(r=>[r.abbr,{current:r.max,max:r.max}])),defense:s.defense.base,skills:{},notes:'',updatedAt:Date.now()};
 all.push(x);if(!write(SHEET_KEY,all))throw Error('Sem espaço neste aparelho.');return x}
function updateSheet(id,fn){const all=sheets(),x=all.find(y=>y.id===id);if(!x)return null;fn(x);x.updatedAt=Date.now();write(SHEET_KEY,all);return x}
function removeSheet(id){write(SHEET_KEY,sheets().filter(x=>x.id!==id))}
/* entradas para a lista de Fichas (mesmo formato de RV.Sheets.list) */
function entries(){return sheets().filter(x=>get(x.systemId)).map(x=>({id:'proprio:'+x.id,system:x.systemId,name:x.name||'Sem nome',detail:x.concept||'',sheet:sheetOf(x),custom:x.id,select:()=>true,screen:null}))}
/* recursos para barras/HUD */
function resourcesOf(sheet){const s=get(sheet?.systemId);if(!s)return null;return s.resources.map(r=>{const v=sheet.resources?.[r.abbr]||{};return{key:r.abbr,label:r.name,cur:Number(v.current??r.max),max:Number(v.max??r.max),color:r.color}})}
/* teste de atributo pela regra do sistema */
function rollAttr(sys,abbr,value){const m=/^([1-9]\d?)?d(\d+)$/i.exec(sys.dice)||[0,'1','20'],n=+(m[1]||1),sides=+m[2];let r,label,ok=null;
 if(sys.mode==='dados'){const k=value>0?value:2;r=RV.doRoll(k+'d'+sides,value>0?'highest':'lowest');label=`${k}d${sides} (${value>0?'maior':'menor'})`}
 else if(sys.mode==='abaixo'){r=RV.doRoll(n+'d'+sides,'sum');label=`${n}d${sides} ≤ ${value}`;ok=r&&r.total<=value}
 else{r=RV.doRoll(`${n}d${sides}${value>=0?'+':''}${value}`,'sum');label=`${n}d${sides}${value>=0?'+':''}${value}`}
 return r?{faces:r.faces,total:r.total,label,ok}:null}

/* editor da ficha (painel em Fichas) */
function editor(entry){const x=sheets().find(y=>y.id===entry.custom),s=get(entry.system);if(!x||!s)return'<p class="muted">Ficha indisponível.</p>';const sh=sheetOf(x);
 const E=window.MastermindSystemEditor,skills=E?E.all(s.id,'skills',[]):[];
 return `<div class="cs-sheet" data-cs-sheet="${esc(x.id)}">
  <div class="grid2f"><div class="field"><label for="cs-sn">Nome</label><input class="input" id="cs-sn" data-cs-f="name" maxlength="90" value="${esc(x.name)}"></div><div class="field"><label for="cs-sc">Conceito</label><input class="input" id="cs-sc" data-cs-f="concept" maxlength="120" value="${esc(x.concept||'')}" placeholder="quem é, de onde vem"></div></div>
  <h3 class="cs-h3">Recursos</h3>
  <div class="cs-res">${s.resources.map(r=>{const v=sh.resources[r.abbr];const pct=v.max?Math.round(v.current/v.max*100):0;return `<div class="cs-resrow"><span class="label">${esc(r.name)}</span><div class="bar"><i style="width:${pct}%;--c:${r.color}"></i></div>
   <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="ibtn sm" type="button" data-cs-res="${esc(r.abbr)}" data-d="-1" aria-label="Menos ${esc(r.name)}">${ic('minus')}</button><input class="input num cs-small" type="number" data-cs-cur="${esc(r.abbr)}" value="${v.current}" min="0" max="${v.max}" aria-label="${esc(r.name)} atual"><span class="muted">/</span><input class="input num cs-small" type="number" data-cs-max="${esc(r.abbr)}" value="${v.max}" min="1" aria-label="${esc(r.name)} máximo"><button class="ibtn sm" type="button" data-cs-res="${esc(r.abbr)}" data-d="1" aria-label="Mais ${esc(r.name)}">${ic('plus')}</button></div></div>`}).join('')||'<p class="muted small" style="margin:0">Este sistema não tem recursos.</p>'}
   <div class="cs-resrow"><span class="label">${esc(s.defense.name)}</span><span></span><input class="input num cs-small" type="number" data-cs-f="defense" value="${sh.defense}" min="0" max="999" aria-label="${esc(s.defense.name)}"></div></div>
  <div class="row between"><h3 class="cs-h3">Atributos</h3><span class="small muted">Teste: ${esc(MODES[s.mode].split(' (')[0])} · ${esc(s.dice)}</span></div>
  <div class="cs-attrs">${s.attributes.map(a=>`<div class="cs-attr"><span title="${esc(a.name)}">${esc(a.abbr)}</span><input class="input num" type="number" data-cs-attr="${esc(a.abbr)}" value="${sh.attrs[a.abbr]}" min="${a.min}" max="${a.max}" aria-label="${esc(a.name)}"><small class="muted">${esc(a.name)}</small><button class="btn sm" type="button" data-cs-roll="${esc(a.abbr)}">${ic('dice-5')}Testar</button></div>`).join('')}</div>
  <p class="small" id="cs-roll-out" aria-live="polite" style="margin:0"></p>
  ${skills.length?`<h3 class="cs-h3">Perícias</h3><div class="cs-skills">${skills.slice(0,120).map(k=>`<label class="cs-skill"><span>${esc(k.name)}</span><input class="input num cs-small" type="number" min="-99" max="999" data-cs-skill="${esc(k.name)}" value="${Number(x.skills?.[k.name]||0)}" aria-label="${esc(k.name)}"></label>`).join('')}</div>`:`<p class="small muted" style="margin:0">Perícias deste sistema: crie em Biblioteca → ${esc(s.name)} → Regras e conteúdo → Perícias.</p>`}
  <div class="field"><label for="cs-notes">Anotações</label><textarea class="input" id="cs-notes" data-cs-f="notes" rows="4" maxlength="8000">${esc(x.notes||'')}</textarea></div>
  <div class="row"><button class="btn ghost" type="button" data-cs-sheet-del>${ic('trash')}Excluir ficha</button></div></div>`}
function bindEditor(host,rerender){if(host.dataset.csBound)return;host.dataset.csBound='1';
 const id=()=>host.querySelector('[data-cs-sheet]')?.dataset.csSheet;
 host.addEventListener('change',e=>{const t=e.target,sid=id();if(!sid||!t.closest('[data-cs-sheet]'))return;
  updateSheet(sid,x=>{if(t.dataset.csF){x[t.dataset.csF]=t.dataset.csF==='defense'?num(t.value,0,999,0):txt(t.value,t.dataset.csF==='notes'?8000:120);if(t.dataset.csF==='name'&&!x.name)x.name='Sem nome'}
   if(t.dataset.csAttr){const s=get(x.systemId),a=s?.attributes.find(y=>y.abbr===t.dataset.csAttr);if(a){x.attrs=x.attrs||{};x.attrs[a.abbr]=num(t.value,a.min,a.max,a.def);t.value=x.attrs[a.abbr]}}
   if(t.dataset.csSkill){x.skills=x.skills||{};x.skills[t.dataset.csSkill]=num(t.value,-99,999,0)}
   if(t.dataset.csCur||t.dataset.csMax){const k=t.dataset.csCur||t.dataset.csMax;x.resources=x.resources||{};const v=x.resources[k]||{current:0,max:1};
    if(t.dataset.csMax){v.max=num(t.value,1,100000,v.max);v.current=Math.min(v.current,v.max)}else v.current=num(t.value,0,v.max,v.current);x.resources[k]=v}});
  if(t.dataset.csF==='name'||t.dataset.csCur||t.dataset.csMax)rerender()});
 host.addEventListener('click',e=>{const sid=id();if(!sid)return;const r=e.target.closest('[data-cs-res]');
  if(r){updateSheet(sid,x=>{const k=r.dataset.csRes,s=get(x.systemId),def=s?.resources.find(y=>y.abbr===k);x.resources=x.resources||{};const v=x.resources[k]||{current:def?.max||0,max:def?.max||1};v.current=num(v.current+Number(r.dataset.d),0,v.max,v.current);x.resources[k]=v});rerender();return}
  const ro=e.target.closest('[data-cs-roll]');if(ro){const x=sheets().find(y=>y.id===sid),s=get(x?.systemId);if(!s)return;const v=sheetOf(x).attrs[ro.dataset.csRoll],a=s.attributes.find(y=>y.abbr===ro.dataset.csRoll);const res=rollAttr(s,a.abbr,v);
   const out=host.querySelector('#cs-roll-out');if(res&&out)out.innerHTML=`<b>${esc(a.name)}</b>: ${esc(res.label)} → [${res.faces.join(', ')}] = <b class="num">${res.total}</b>${res.ok===true?' · <span style="color:var(--green)">sucesso</span>':res.ok===false?' · <span style="color:var(--danger)">falha</span>':''}`;return}
  if(e.target.closest('[data-cs-sheet-del]')){const x=sheets().find(y=>y.id===sid);if(!confirm(`Excluir a ficha "${x?.name||''}"? Não dá para desfazer.`))return;removeSheet(sid);rerender(true)}})}

/* ---------- criaturas personalizadas ----------
   Mesmo lugar e formato do bestiário anterior (rpg18-bestiary-by-system-v1: {sistema:[criaturas]}), então as
   criaturas criadas antes aparecem aqui, e as novas continuam compatíveis. */
const BEAST_KEY='rpg18-bestiary-by-system-v1';
const B2RV={'ordem-paranormal':'ordem','d-d':'dnd'},RV2B={ordem:'ordem-paranormal',dnd:'d-d'};
const BUILTIN={'ordem-paranormal':'Ordem Paranormal','d-d':'D&D 5e','chamado-de-ctchulhu':'Chamado de Cthulhu',gurps:'GURPS'};
const SIZES=['PEQUENO','MEDIO','GRANDE','ENORME','COLOSSAL'];
function beastStore(){const v=read(BEAST_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function beastSysName(sid){return BUILTIN[sid]||get(sid)?.name||sid}
function beastList(){const out=[];for(const[sid,arr]of Object.entries(beastStore())){if(!Array.isArray(arr))continue;if(!BUILTIN[sid]&&!get(sid))continue;for(const r of arr)if(r&&r.id&&r.name)out.push(Object.assign({},r,{systemId:sid}))}return out}
function toCreature(r){const size=String(r.size||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
 return{name:txt(r.name,60),sys:B2RV[r.systemId]||r.systemId,systemId:r.systemId,system:beastSysName(r.systemId),element:['Sangue','Morte','Conhecimento','Energia','Medo'].includes(r.element)?r.element:null,elementText:txt(r.element,40),
  type:txt(r.type,40),size:SIZES.includes(size)?size:'MEDIO',hp:num(r.hp,1,1000000,10),defense:num(r.defense,0,100000,10),attack:txt(r.attack,60)||'—',damage:txt(r.damage,60)||'—',
  speed:txt(r.speed,20)||null,initiative:txt(r.initiative,30),vd:txt(r.challenge,20),powers:txt(r.powers,4000),notes:txt(r.notes,4000),
  source:txt(r.source,120)?txt(r.source,120)+(r.page?' · p.'+num(r.page,1,99999,1):''):'Criatura personalizada',custom:true,id:r.id}}
/* põe as criaturas personalizadas em RV.CREATURES (Bestiário, Mesa e Canvas usam essa lista) */
function syncBeasts(){for(const[k,c]of Object.entries(RV.CREATURES))if(c&&c.custom)delete RV.CREATURES[k];
 for(const r of beastList()){const c=toCreature(r);let n=c.name||'Criatura',i=2;if(RV.CREATURES[n])n=c.name+' (personalizada)';while(RV.CREATURES[n])n=c.name+' ('+(i++)+')';c.name=n;RV.CREATURES[n]=c}}
function saveBeast(sid,data,id){if(!BUILTIN[sid]&&!get(sid))throw Error('Escolha o sistema da criatura.');const name=txt(data.name,60);if(!name)throw Error('Dê um nome à criatura.');
 const st=beastStore();for(const k of Object.keys(st))if(id&&k!==sid&&Array.isArray(st[k]))st[k]=st[k].filter(r=>r.id!==id);
 const arr=Array.isArray(st[sid])?st[sid]:[];const at=id?arr.findIndex(r=>r.id===id):-1;if(at<0&&arr.length>=200)throw Error('Limite de 200 criaturas personalizadas por sistema.');
 const old=at>=0?arr[at]:{};const rec=Object.assign({},old,{id:id||newId('own'),systemId:sid,verified:false,customized:true,name,element:txt(data.element,40),type:txt(data.type,40),size:SIZES.includes(data.size)?data.size:'MEDIO',
  hp:num(data.hp,1,1000000,10),defense:num(data.defense,0,100000,10),challenge:txt(data.challenge,20),attack:txt(data.attack,60),damage:txt(data.damage,60),speed:txt(data.speed,20),initiative:txt(data.initiative,30),
  powers:txt(data.powers,4000),notes:txt(data.notes,4000),source:txt(data.source,120),page:data.page?num(data.page,1,99999,1):0});
 if(!old.edition)rec.edition=sid==='d-d'?'5e-2014':sid==='ordem-paranormal'?'1.3':'';
 if(at>=0)arr[at]=rec;else arr.push(rec);st[sid]=arr;if(!write(BEAST_KEY,st))throw Error('Sem espaço neste aparelho.');syncBeasts();return toCreature(rec)}
function removeBeast(id){const st=beastStore();for(const k of Object.keys(st))if(Array.isArray(st[k]))st[k]=st[k].filter(r=>r.id!==id);write(BEAST_KEY,st);syncBeasts()}
RV.CustomCreatures={list:beastList,sync:syncBeasts,save:saveBeast,remove:removeBeast,SIZES,toSys:sid=>B2RV[sid]||sid,fromSys:k=>RV2B[k]||k,BUILTIN};
syncBeasts();

RV.CustomSystems={MODES,list,get,save,remove,openForm,labels,sheets,entries,createSheet,removeSheet,resourcesOf,sheetOf,rollAttr,editor,bindEditor,isCustom:id=>/^proprio-/.test(String(id||''))};
})();
