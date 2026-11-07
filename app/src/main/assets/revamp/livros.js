/* Mastermind · revamp — busca nos PDFs como um Ctrl+F, com resumo do que foi encontrado.
   Fontes de dados, nesta ordem:
   1. Android: RpgBookBridge.listPersonalBooks / searchPersonalBook (índice SQLite FTS4 do app);
   2. Desktop: MastermindDesktop.action('list-books' | 'search-book') (book-index.cjs);
   3. Navegador: o PDF escolhido é lido no próprio aparelho com pdf.js, nada é enviado.
   O resumo junta duas fontes, sem inventar nada:
   - as regras que o app já tem (pacote de Ordem 1.3, bestiário, motores de D&D, GURPS e CoC e o que você editou na
     Biblioteca), organizadas pelo mesmo motor da busca clássica (RPG28_CONTEXT + RPG27_TEMPLATES);
   - frases dos trechos dos seus PDFs, com a página de cada uma (no máximo 3 passagens). */
(function(){
'use strict';
const {$,$$,esc,ic,toast}=RV;
const STOP=new Set('a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos as os ou mas como mais menos sua seu suas seus ele ela eles elas isso esta este essa esse pelo pela pelos pelas entre sobre ate até quando onde qual quais ser ter tem foi sao são nao não sim ja já cada pode podem deve devem ainda tambem também muito pouco então entao'.split(' '));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const termsOf=q=>[...new Set(norm(q).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)))].slice(0,8);
const B={provider:null,books:[],book:'all',sys:'all',q:'',terms:[],hits:[],total:0,cur:0,loading:false,local:{},summary:null,rules:null,more:false};
const SYS_NAME={'ordem-paranormal':'Ordem Paranormal','d-d':'D&D 5e','chamado-de-ctchulhu':'Chamado de Cthulhu 7e',gurps:'GURPS 4e'};
const DEPS=['rpg15_catalog_data.js','rpg19_order_creatures.js','rpg18_dnd_engine.js','rpg16_gurps_engine.js','mastermind_coc7_engine.js','rpg20_search_core.js','rpg27_answer_templates.js','rpg28_context_search.js','mastermind59_class_catalog.js','mastermind_system_editor.js'];
const inSys=b=>B.sys==='all'||b.systemId===B.sys||b.systemId==='local';
const scope=()=>B.books.filter(inSys);
/* ---------- provedores ---------- */
function detect(){
 if(window.RpgBookBridge&&typeof RpgBookBridge.searchPersonalBook==='function')return 'android';
 if(window.MastermindDesktop&&typeof MastermindDesktop.action==='function')return 'desktop';
 return 'browser'}
async function listBooks(){B.provider=detect();
 try{if(B.provider==='android')B.books=JSON.parse(RpgBookBridge.listPersonalBooks()||'[]');
  else if(B.provider==='desktop')B.books=await MastermindDesktop.action('list-books')||[];
  else B.books=Object.values(B.local).map(b=>({id:b.id,name:b.name,systemId:b.systemId||'local'}))}catch(e){B.books=[]}
 render()}
async function searchOne(book,q,limit,offset){
 if(B.provider==='android'){const r=JSON.parse(RpgBookBridge.searchPersonalBook(book.id,q,limit,offset)||'{}');return{total:r.total||0,hits:(r.hits||[]).map(h=>({page:h.page,excerpt:h.excerpt||'',book})),state:r.state}}
 if(B.provider==='desktop'){const r=await MastermindDesktop.action('search-book',book.id,q,limit,offset)||{};return{total:r.total||0,hits:(r.results||[]).map(h=>({page:h.page,excerpt:h.excerpt||h.text||'',book})),error:r.error}}
 const L=B.local[book.id];if(!L)return{total:0,hits:[]};const all=[];
 L.pages.forEach((txt,i)=>{const n=norm(txt);let count=0,first=-1;B.terms.forEach(t=>{let p=n.indexOf(t);while(p>=0){count++;if(first<0||p<first)first=p;p=n.indexOf(t,p+t.length)}});
  if(count){const start=Math.max(0,first-90);all.push({page:i+1,excerpt:(start?'… ':'')+txt.slice(start,start+300).replace(/\s+/g,' ').trim()+' …',count,book})}});
 return{total:all.length,occurrences:all.reduce((a,h)=>a+h.count,0),hits:all.slice(offset,offset+limit)}}
async function run(more){
 const q=$('#bk-q').value.trim();B.terms=termsOf(q);if(!more){B.q=q;B.hits=[];B.cur=0;B.total=0;B.occ=null}
 if(!B.terms.length){B.summary=null;render(q?'Digite um termo com 3 letras ou mais.':'');return}
 const books=B.book==='all'?scope():B.books.filter(b=>b.id===B.book);
 B.loading=true;render();
 try{let total=0,occ=0,errs=[];const per=more?10:Math.max(6,Math.ceil(24/books.length));
  for(const b of books){const off=more?B.hits.filter(h=>h.book.id===b.id).length:0;const r=await searchOne(b,q,per,off);total+=r.total;if(r.occurrences)occ+=r.occurrences;if(r.error)errs.push(b.name+': '+r.error);if(r.state&&!['ready','partial','indexing'].includes(r.state))errs.push(b.name+': índice ainda não pronto ('+r.state+')');B.hits.push(...r.hits)}
  if(!more){B.total=total;B.occ=occ||null}B.more=B.hits.length<B.total;B.errs=errs;B.summary=summarize(B.hits,B.terms);B.rules=await rulesAnswer(q,B.hits)}
 catch(e){B.errs=['Falha na busca: '+(e.message||e)]}
 B.loading=false;render();RV.emit('books:searched')}
/* ---------- resumo das regras: o mesmo motor da busca clássica ---------- */
let base=null;
function cocDocs(){const e=window.COC7_ENGINE;if(!e)return[];const b={systemId:'chamado-de-ctchulhu',systemName:'Chamado de Cthulhu',edition:'7e',book:'Chamado de Cthulhu 7e · regras usadas pelo app',kind:'structured',type:'Mecânica implementada',page:0};
 const d=[Object.assign({},b,{id:'coc:teste',title:'Testes percentuais (1d100)',text:'Role 1d100 contra o valor da perícia ou característica. Sucesso regular: resultado menor ou igual ao valor. Sucesso difícil: até a metade do valor. Sucesso extremo: até um quinto do valor. Resultado 01 é crítico. Desastre: 100, ou de 96 a 100 quando o valor é menor que 50. Dado de bônus: rola dezenas extras e fica com a menor. Dado de penalidade: fica com a maior.'})];
 Object.entries(e.BASE_SKILLS||{}).forEach(([n,v])=>d.push(Object.assign({},b,{id:'coc:p:'+n,title:'Perícia '+n,text:'Perícia '+n+'. Valor base: '+v+'%. Teste com 1d100 contra o valor da perícia.'})));
 Object.entries(e.professions||{}).forEach(([n,sk])=>d.push(Object.assign({},b,{id:'coc:o:'+n,title:'Ocupação '+n,text:'Ocupação '+n+'. Perícias da ocupação: '+sk.join(', ')+'.'})));return d}
function editedDocs(){const E=window.MastermindSystemEditor;if(!E)return[];const out=[];
 Object.keys(SYS_NAME).forEach(sys=>{const st=E.system(sys);Object.entries(st.overrides||{}).forEach(([type,items])=>Object.values(items||{}).forEach(it=>{if(!it?.name)return;
  const text=[it.description,it.requirements?'Requisitos: '+it.requirements:'',it.cost?'Custo: '+it.cost:'',it.element?'Elemento ou atributo: '+it.element:'',it.className?'Classe: '+it.className:''].filter(Boolean).join('. ');if(!text)return;
  out.push({id:'edit:'+sys+':'+type+':'+it.name,systemId:sys,systemName:SYS_NAME[sys],edition:'all',book:'Editado na Biblioteca ('+(E.TYPES[type]||type)+')',kind:'structured',type:'Conteúdo da sua mesa',title:it.name,text:text.slice(0,1500),page:0})}))});return out}
function baseDocs(){if(base)return base;const core=window.RPG20_SEARCH;if(!core)return[];
 base=core.makeOrderDocs({pack:window.RV_ORDEM_PACK}).concat(core.makeCreatureDocs(window.RPG19_ORDER_CREATURES||[]),core.makeRulesDocs(window.RPG18_DND_ENGINE,window.GURPS4_ENGINE),cocDocs());return base}
async function rulesAnswer(q,hits){await RV.loadClassic(DEPS);const ctx=window.RPG28_CONTEXT,tpl=window.RPG27_TEMPLATES,core=window.RPG20_SEARCH;if(!ctx||!tpl||!core)return null;
 const pdf=hits.map((h,i)=>({id:'pdf:'+h.book.id+':'+h.page+':'+i,systemId:h.book.systemId&&SYS_NAME[h.book.systemId]?h.book.systemId:(B.sys!=='all'?B.sys:'ordem-paranormal'),systemName:SYS_NAME[h.book.systemId]||'PDF',edition:'all',book:h.book.name,title:h.book.name,page:h.page,text:h.excerpt.replace(/…/g,' '),kind:'index',pdfBook:h.book.id}));
 const systems=window.RPG15_SYSTEMS?.systems||[];const docs=baseDocs().concat(editedDocs(),pdf);
 const ans=ctx.answer(q,docs,{systemId:B.sys,edition:'all',systems,core,catalogDocs:[]});if(ans.state!=='found')return null;
 const f=tpl.format(q,ans,{systemId:B.sys});return f.state==='formatted'?f:null}
/* ---------- resumo: frases do próprio PDF ---------- */
function summarize(hits,terms){const sents=[],freq={},orig={};
 hits.forEach(h=>{const text=h.excerpt.replace(/^…\s*/,'').replace(/\s*…$/,'');
  text.replace(/[^\p{L}\s]/gu,' ').split(/\s+/).forEach(o=>{const w=norm(o);if(w.length>3&&!STOP.has(w)&&!terms.includes(w)){freq[w]=(freq[w]||0)+1;if(!orig[w])orig[w]=o.toLowerCase()}});
  text.split(/(?<=[.!?;:])\s+/).forEach(s=>{const n=norm(s);const hitsN=terms.reduce((a,t)=>a+(n.split(t).length-1),0);if(!hitsN||s.length<25)return;
   const all=terms.every(t=>n.includes(t));sents.push({s:s.trim().replace(/\s+/g,' '),page:h.page,book:h.book.name,score:hitsN*2+(all?3:0)-Math.abs(s.length-140)/140})})});
 const seen=new Set(),pick=[];sents.sort((a,b)=>b.score-a.score).forEach(x=>{const k=norm(x.s).slice(0,48);if(seen.has(k)||pick.length>=3)return;seen.add(k);pick.push(x)});
 pick.sort((a,b)=>a.page-b.page);
 const pages=[...new Set(hits.map(h=>h.page))].sort((a,b)=>a-b);
 const near=Object.entries(freq).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([w])=>orig[w]||w);
 return{passages:pick,pages,near}}
/* ---------- desenho ---------- */
function mark(text){if(!B.terms.length)return esc(text);const n=norm(text);const ranges=[];B.terms.forEach(t=>{let p=n.indexOf(t);while(p>=0){ranges.push([p,p+t.length]);p=n.indexOf(t,p+t.length)}});
 ranges.sort((a,b)=>a[0]-b[0]);let out='',i=0;ranges.forEach(([a,b])=>{if(a<i)return;out+=esc(text.slice(i,a))+'<mark>'+esc(text.slice(a,b))+'</mark>';i=b});return out+esc(text.slice(i))}
function render(msg){const root=$('#books');if(!root)return;const prov={android:'Índice do app no Android',desktop:'Índice do app no computador',browser:'Leitura local no navegador'}[B.provider||detect()];
 $('#bk-source').textContent=prov;
 $('#bk-book').innerHTML=`<option value="all">Todos os PDFs (${scope().length})</option>`+scope().map(b=>`<option value="${esc(b.id)}" ${B.book===b.id?'selected':''}>${esc(b.name)}</option>`).join('');
 $('#bk-open').hidden=B.provider!=='browser';$('#bk-add').hidden=B.provider==='browser';
 const n=B.hits.length,cnt=$('#bk-count');cnt.textContent=B.loading?'Buscando…':n?`${B.cur+1} de ${B.total}${B.more?'+':''}`:B.terms.length&&B.q?'0 resultados':'';
 $('#bk-prev').disabled=$('#bk-next').disabled=!n;
 const res=$('#bk-results'),sum=$('#bk-summary');
 $$('#bk-sys button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sys===B.sys)));
 if(msg||(!B.q&&!B.loading)){sum.innerHTML='';res.innerHTML=`<p class="muted" style="margin:0">${esc(msg||'Digite um termo e aperte Enter. Ex.: "sanidade", "teste de resistência", "ritual", "vantagem".')}</p>`+(scope().length?'':`<div class="empty"><span data-i="books"></span><b>Sem PDF ${B.sys==='all'?'neste aparelho':'de '+esc(SYS_NAME[B.sys])}</b><p class="muted small" style="margin:0">A busca já usa as regras que o app tem. Para buscar também no texto dos livros, traga os PDFs na Biblioteca.</p><a class="btn sm" href="#biblioteca">${ic('books')}Abrir a Biblioteca</a></div>`);RV.hydrateIcons(res);return}
 const s=B.summary,F=B.rules;
 const src=d=>{if(!d)return'';const pg=d.page?'p. '+d.page:'';const open=d.pdfBook?`<button type="button" class="pg" data-open-book="${esc(d.pdfBook)}" data-page="${d.page||1}">abrir</button>`:d.sourceBookId?`<button type="button" class="pg" data-drive="${esc(d.sourceBookId)}">Drive</button>`:'';return `<small class="muted">${esc([d.systemName,d.book,pg].filter(Boolean).join(' · '))} ${open}</small>`};
 const rulesHtml=F?`<div class="card-h"><h2>O que é</h2><span class="chip gold">${/PDF/.test(F.sourceQuality||'')?'Regras do app + seus PDFs':'Regras do app'}</span></div>
  ${F.lead?`<p class="lead-ans">${mark(F.lead.text)}</p>${src(F.lead.source)}`:''}
  ${F.sections.map(sec=>`<div class="label" style="margin-top:6px">${esc(sec.title)}</div><ul class="ans-list">${sec.items.map(it=>`<li><span>${mark(it.text)}</span>${src(it.source)}</li>`).join('')}</ul>`).join('')}
  ${F.values.length?`<div class="label" style="margin-top:6px">Valores</div><div class="kv">${F.values.map(v=>`<span>${esc(v.label)}</span><b>${esc(v.value)}</b>`).join('')}</div>`:''}
  <p class="small faint" style="margin:0">Montado só com textos do app e dos seus PDFs, com a fonte de cada um. Confira a regra completa no livro.</p>`:'';
 const pdfHtml=s&&n?`<div class="card-h"><h2>${F?'Nos seus PDFs':'Resumo do que foi encontrado'}</h2><span class="chip">${s.pages.length} página${s.pages.length>1?'s':''} lida${s.pages.length>1?'s':''}</span></div>
  <p class="small muted" style="margin:0">"${esc(B.q)}" aparece em <b>${B.total}</b> página${B.total>1?'s':''}${B.occ?` (${B.occ} ocorrências)`:''}. Páginas: ${s.pages.slice(0,14).map(p=>`<button type="button" class="pg" data-goto-page="${p}">${p}</button>`).join(' ')}${s.pages.length>14?' …':''}</p>
  ${s.passages.length?`<ol class="passages">${s.passages.map(p=>`<li><span>${mark(p.s)}</span><small class="muted">p. ${p.page}${B.book==='all'&&B.books.length>1?' · '+esc(p.book):''}</small></li>`).join('')}</ol>`:'<p class="muted small" style="margin:0">Os trechos encontrados não têm frases completas sobre o termo. Veja as ocorrências ao lado.</p>'}
  ${s.near.length?`<div class="row" style="gap:6px"><span class="label">Aparece junto com</span>${s.near.map(w=>`<button type="button" class="fchip" data-near="${esc(w)}">${esc(w)}</button>`).join('')}</div>`:''}
  <p class="small faint" style="margin:0">Frases do seu PDF, com a página de cada uma. O app não completa nem interpreta regras.</p>`:'';
 sum.innerHTML=rulesHtml+(rulesHtml&&pdfHtml?'<hr>':'')+pdfHtml;
 res.innerHTML=(B.errs||[]).map(e=>`<p class="small" style="color:var(--danger);margin:0">${esc(e)}</p>`).join('')+(n?B.hits.map((h,i)=>`<article class="hit ${i===B.cur?'cur':''}" data-hit="${i}"><div class="row between"><b>p. ${h.page}</b><span class="small muted">${esc(h.book.name)}${h.count?` · ${h.count}×`:''}</span></div><p>${mark(h.excerpt)}</p><button class="btn sm ghost" type="button" data-open-hit="${i}">${ic('file-text')}Abrir página</button></article>`).join('')+(B.more?`<button class="btn sm" type="button" id="bk-more">Carregar mais</button>`:''):(B.loading?'':`<p class="muted" style="margin:0">${B.rules?(scope().length?'Nada nos seus PDFs com esse termo. O resumo ao lado vem das regras do app.':'O resumo ao lado vem das regras do app. Traga os PDFs na Biblioteca para buscar também no texto dos livros.'):'Nada encontrado. Tente outra palavra ou só o começo dela.'}</p>`))}
function go(d){if(!B.hits.length)return;B.cur=(B.cur+d+B.hits.length)%B.hits.length;$$('.hit').forEach((el,i)=>el.classList.toggle('cur',i===B.cur));$('#bk-count').textContent=`${B.cur+1} de ${B.total}${B.more?'+':''}`;$(`.hit[data-hit="${B.cur}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'})}
/* ---------- PDF no navegador (pdf.js, sem enviar nada) ---------- */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('Não foi possível carregar o leitor de PDF.'));document.head.appendChild(s)})}
async function pdfjs(){if(window.pdfjsLib)return window.pdfjsLib;await loadScript(PDFJS+'pdf.min.js');await loadScript(PDFJS+'pdf.worker.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';return window.pdfjsLib}
async function openLocal(files,systemId){const prog=$('#bk-progress')||{hidden:true,querySelector:()=>({style:{}})};
 for(const f of files){try{const lib=await pdfjs();const doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;const pages=[];prog.hidden=false;
  for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const tc=await p.getTextContent();pages.push(tc.items.map(t=>t.str).join(' '));if(i%5===0||i===doc.numPages){prog.querySelector('span').textContent=`Lendo ${esc(f.name)}: página ${i} de ${doc.numPages}`;prog.querySelector('i').style.width=(i/doc.numPages*100)+'%';await new Promise(r=>setTimeout(r))}}
  const id='local-'+Date.now()+Math.random().toString(36).slice(2,5);B.local[id]={id,name:f.name.replace(/\.pdf$/i,''),pages,doc,systemId:systemId||(B.sys!=='all'?B.sys:'local')};
  if(!pages.some(t=>t.trim()))toast(`${f.name} não tem texto selecionável (PDF escaneado precisa de OCR).`,$('#app'));else toast(`${f.name}: ${doc.numPages} páginas prontas para busca.`,$('#app'))}
  catch(e){toast(String(e.message||e),$('#app'))}}
 prog.hidden=true;await listBooks();if(location.hash==='#buscar'&&$('#bk-q').value.trim())run()}
/* ---------- ligações ---------- */
function bind(){
 $('#bk-form').addEventListener('submit',e=>{e.preventDefault();if(B.hits.length&&$('#bk-q').value.trim()===B.q)go(1);else run()});
 $('#bk-q').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.shiftKey){e.preventDefault();go(-1)}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('#bk-q').value='';B.q='';B.hits=[];render()}});
 $('#bk-prev').onclick=()=>go(-1);$('#bk-next').onclick=()=>go(1);
 $('#bk-book').onchange=e=>{B.book=e.target.value;if(B.q)run()};
 $('#bk-sys').onclick=e=>{const b=e.target.closest('[data-sys]');if(!b)return;B.sys=b.dataset.sys;B.book='all';render();if(B.q)run()};
 $('#bk-open').onclick=()=>$('#bk-file').click();$('#bk-file').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)openLocal(fs)};
 $('#bk-add').onclick=()=>{location.hash='#biblioteca'};
 $('#books').addEventListener('click',e=>{const h=e.target.closest('[data-hit]');if(h&&!e.target.closest('button')){B.cur=+h.dataset.hit;go(0)}
  const pg=e.target.closest('[data-goto-page]');if(pg){const i=B.hits.findIndex(x=>x.page===+pg.dataset.gotoPage);if(i>=0){B.cur=i;go(0)}}
  const nw=e.target.closest('[data-near]');if(nw){$('#bk-q').value=B.q+' '+nw.dataset.near;run()}
  if(e.target.closest('#bk-more'))run(true);
  const o=e.target.closest('[data-open-hit]');if(o){const h=B.hits[+o.dataset.openHit];RV.openBook(h.book.id,h.page)}
  const ob=e.target.closest('[data-open-book]');if(ob)RV.openBook(ob.dataset.openBook,+ob.dataset.page||1);
  const dv=e.target.closest('[data-drive]');if(dv)RV.openDrive(dv.dataset.drive)});
 if(window.MastermindDesktop?.onBookIndex)MastermindDesktop.onBookIndex(()=>{clearTimeout(B.t);B.t=setTimeout(listBooks,800)});
 // Ctrl+F nas telas do app leva à busca nos livros
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){const v=location.hash.slice(1);if(['mesa','estudio','jogador','entrar'].includes(v))return;e.preventDefault();if(v!=='buscar')location.hash='#buscar';setTimeout(()=>{$('#bk-q').focus();$('#bk-q').select()},60)}});
 listBooks()}
RV.on(e=>{if(e==='route:buscar'){RV.loadClassic(DEPS);if(B.provider)listBooks()}});
RV.Books={bind,listBooks,run,state:B,summarize,termsOf,openLocal,rulesAnswer};
})();
