/* Mastermind · revamp — busca nos PDFs como um Ctrl+F, com resumo do que foi encontrado.
   Fontes de dados, nesta ordem:
   1. Android: RpgBookBridge.listPersonalBooks / searchPersonalBook (índice SQLite FTS4 do app);
   2. Desktop: MastermindDesktop.action('list-books' | 'search-book') (book-index.cjs);
   3. Navegador: o PDF escolhido é lido no próprio aparelho com pdf.js, nada é enviado.
   O resumo usa só frases dos trechos devolvidos, com a página de cada uma. Nada é inventado,
   e o tamanho segue a regra do app: trechos curtos e no máximo 3 passagens. */
(function(){
'use strict';
const {$,$$,esc,ic,toast}=RV;
const STOP=new Set('a o e de da do das dos em no na nos nas um uma uns umas para por com sem que se ao aos as os ou mas como mais menos sua seu suas seus ele ela eles elas isso esta este essa esse pelo pela pelos pelas entre sobre ate até quando onde qual quais ser ter tem foi sao são nao não sim ja já cada pode podem deve devem ainda tambem também muito pouco então entao'.split(' '));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const termsOf=q=>[...new Set(norm(q).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)))].slice(0,8);
const B={provider:null,books:[],book:'all',q:'',terms:[],hits:[],total:0,cur:0,loading:false,local:{},summary:null,more:false};
/* ---------- provedores ---------- */
function detect(){
 if(window.RpgBookBridge&&typeof RpgBookBridge.searchPersonalBook==='function')return 'android';
 if(window.MastermindDesktop&&typeof MastermindDesktop.action==='function')return 'desktop';
 return 'browser'}
async function listBooks(){B.provider=detect();
 try{if(B.provider==='android')B.books=JSON.parse(RpgBookBridge.listPersonalBooks()||'[]');
  else if(B.provider==='desktop')B.books=await MastermindDesktop.action('list-books')||[];
  else B.books=Object.values(B.local).map(b=>({id:b.id,name:b.name,systemId:'local'}))}catch(e){B.books=[]}
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
 const books=B.book==='all'?B.books:B.books.filter(b=>b.id===B.book);if(!books.length){render('Nenhum PDF para buscar. Adicione um PDF primeiro.');return}
 B.loading=true;render();
 try{let total=0,occ=0,errs=[];const per=more?10:Math.max(6,Math.ceil(24/books.length));
  for(const b of books){const off=more?B.hits.filter(h=>h.book.id===b.id).length:0;const r=await searchOne(b,q,per,off);total+=r.total;if(r.occurrences)occ+=r.occurrences;if(r.error)errs.push(b.name+': '+r.error);if(r.state&&!['ready','partial','indexing'].includes(r.state))errs.push(b.name+': índice ainda não pronto ('+r.state+')');B.hits.push(...r.hits)}
  if(!more){B.total=total;B.occ=occ||null}B.more=B.hits.length<B.total;B.errs=errs;B.summary=summarize(B.hits,B.terms)}
 catch(e){B.errs=['Falha na busca: '+(e.message||e)]}
 B.loading=false;render();RV.emit('books:searched')}
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
 $('#bk-book').innerHTML=`<option value="all">Todos os PDFs (${B.books.length})</option>`+B.books.map(b=>`<option value="${esc(b.id)}" ${B.book===b.id?'selected':''}>${esc(b.name)}</option>`).join('');
 $('#bk-open').hidden=B.provider!=='browser';$('#bk-add').hidden=B.provider==='browser';
 const n=B.hits.length,cnt=$('#bk-count');cnt.textContent=B.loading?'Buscando…':n?`${B.cur+1} de ${B.total}${B.more?'+':''}`:B.terms.length&&B.q?'0 resultados':'';
 $('#bk-prev').disabled=$('#bk-next').disabled=!n;
 const res=$('#bk-results'),sum=$('#bk-summary');
 if(!B.books.length){sum.innerHTML='';res.innerHTML=`<div class="empty"><span data-i="books"></span><b>Nenhum PDF ainda</b><p class="muted small" style="margin:0">${B.provider==='browser'?'Abra um PDF do seu computador ou celular. Ele é lido só neste aparelho, nada é enviado.':'Adicione os PDFs dos seus livros. O app indexa o texto no aparelho para a busca funcionar sem internet.'}</p></div>`;RV.hydrateIcons(res);return}
 if(msg||(!B.q&&!B.loading)){sum.innerHTML='';res.innerHTML=`<p class="muted" style="margin:0">${esc(msg||'Digite um termo e aperte Enter. Ex.: "sanidade", "teste de resistência", "ritual".')}</p>`;return}
 const s=B.summary;
 sum.innerHTML=s&&n?`<div class="card-h"><h2>Resumo do que foi encontrado</h2><span class="chip">${s.pages.length} página${s.pages.length>1?'s':''} lida${s.pages.length>1?'s':''}</span></div>
  <p class="small muted" style="margin:0">"${esc(B.q)}" aparece em <b>${B.total}</b> página${B.total>1?'s':''}${B.occ?` (${B.occ} ocorrências)`:''}. Páginas: ${s.pages.slice(0,14).map(p=>`<button type="button" class="pg" data-goto-page="${p}">${p}</button>`).join(' ')}${s.pages.length>14?' …':''}</p>
  ${s.passages.length?`<ol class="passages">${s.passages.map(p=>`<li><span>${mark(p.s)}</span><small class="muted">p. ${p.page}${B.book==='all'&&B.books.length>1?' · '+esc(p.book):''}</small></li>`).join('')}</ol>`:'<p class="muted small" style="margin:0">Os trechos encontrados não têm frases completas sobre o termo. Veja as ocorrências ao lado.</p>'}
  ${s.near.length?`<div class="row" style="gap:6px"><span class="label">Aparece junto com</span>${s.near.map(w=>`<button type="button" class="fchip" data-near="${esc(w)}">${esc(w)}</button>`).join('')}</div>`:''}
  <p class="small faint" style="margin:0">Resumo montado só com frases do seu PDF, com a página de cada uma. O app não completa nem interpreta regras.</p>`:'';
 res.innerHTML=(B.errs||[]).map(e=>`<p class="small" style="color:var(--danger);margin:0">${esc(e)}</p>`).join('')+(n?B.hits.map((h,i)=>`<article class="hit ${i===B.cur?'cur':''}" data-hit="${i}"><div class="row between"><b>p. ${h.page}</b><span class="small muted">${esc(h.book.name)}${h.count?` · ${h.count}×`:''}</span></div><p>${mark(h.excerpt)}</p>${B.provider!=='browser'?`<button class="btn sm ghost" type="button" data-open-hit="${i}">${ic('file-text')}Abrir página</button>`:''}</article>`).join('')+(B.more?`<button class="btn sm" type="button" id="bk-more">Carregar mais</button>`:''):(B.loading?'':'<p class="muted" style="margin:0">Nada encontrado. Tente outra palavra ou só o começo dela.</p>'))}
function go(d){if(!B.hits.length)return;B.cur=(B.cur+d+B.hits.length)%B.hits.length;$$('.hit').forEach((el,i)=>el.classList.toggle('cur',i===B.cur));$('#bk-count').textContent=`${B.cur+1} de ${B.total}${B.more?'+':''}`;$(`.hit[data-hit="${B.cur}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'})}
/* ---------- PDF no navegador (pdf.js, sem enviar nada) ---------- */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadScript(src){return new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(Error('Não foi possível carregar o leitor de PDF.'));document.head.appendChild(s)})}
async function pdfjs(){if(window.pdfjsLib)return window.pdfjsLib;await loadScript(PDFJS+'pdf.min.js');await loadScript(PDFJS+'pdf.worker.min.js');window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';return window.pdfjsLib}
async function openLocal(files){const prog=$('#bk-progress');
 for(const f of files){try{const lib=await pdfjs();const doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;const pages=[];prog.hidden=false;
  for(let i=1;i<=doc.numPages;i++){const p=await doc.getPage(i);const tc=await p.getTextContent();pages.push(tc.items.map(t=>t.str).join(' '));if(i%5===0||i===doc.numPages){prog.querySelector('span').textContent=`Lendo ${esc(f.name)}: página ${i} de ${doc.numPages}`;prog.querySelector('i').style.width=(i/doc.numPages*100)+'%';await new Promise(r=>setTimeout(r))}}
  const id='local-'+Date.now()+Math.random().toString(36).slice(2,5);B.local[id]={id,name:f.name.replace(/\.pdf$/i,''),pages};
  if(!pages.some(t=>t.trim()))toast(`${f.name} não tem texto selecionável (PDF escaneado precisa de OCR).`,$('#app'));else toast(`${f.name}: ${doc.numPages} páginas prontas para busca.`,$('#app'))}
  catch(e){toast(String(e.message||e),$('#app'))}}
 prog.hidden=true;await listBooks();if($('#bk-q').value.trim())run()}
/* ---------- ligações ---------- */
function bind(){
 $('#bk-form').addEventListener('submit',e=>{e.preventDefault();if(B.hits.length&&$('#bk-q').value.trim()===B.q)go(1);else run()});
 $('#bk-q').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.shiftKey){e.preventDefault();go(-1)}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('#bk-q').value='';B.q='';B.hits=[];render()}});
 $('#bk-prev').onclick=()=>go(-1);$('#bk-next').onclick=()=>go(1);
 $('#bk-book').onchange=e=>{B.book=e.target.value;if(B.q)run()};
 $('#bk-open').onclick=()=>$('#bk-file').click();$('#bk-file').onchange=e=>{const fs=[...e.target.files];e.target.value='';if(fs.length)openLocal(fs)};
 $('#bk-add').onclick=async()=>{try{if(B.provider==='android'){RpgBookBridge.pickPdfForSystem('ordem-paranormal');toast('Escolha o PDF. Depois de indexado, ele aparece aqui.',$('#app'));setTimeout(listBooks,4000)}else{await MastermindDesktop.action('pick-pdf');setTimeout(listBooks,1500)}}catch(e){toast('Não foi possível abrir o seletor de PDF.',$('#app'))}};
 $('#books').addEventListener('click',e=>{const h=e.target.closest('[data-hit]');if(h&&!e.target.closest('button')){B.cur=+h.dataset.hit;go(0)}
  const pg=e.target.closest('[data-goto-page]');if(pg){const i=B.hits.findIndex(x=>x.page===+pg.dataset.gotoPage);if(i>=0){B.cur=i;go(0)}}
  const nw=e.target.closest('[data-near]');if(nw){$('#bk-q').value=B.q+' '+nw.dataset.near;run()}
  if(e.target.closest('#bk-more'))run(true);
  const o=e.target.closest('[data-open-hit]');if(o){const h=B.hits[+o.dataset.openHit];try{if(B.provider==='android')RpgBookBridge.renderPersonalBookPage(h.book.id,h.page);else MastermindDesktop.action('open-book',h.book.id)}catch(_){toast('Não foi possível abrir a página.',$('#app'))}}});
 if(window.MastermindDesktop?.onBookIndex)MastermindDesktop.onBookIndex(()=>{clearTimeout(B.t);B.t=setTimeout(listBooks,800)});
 // Ctrl+F nas telas do app leva à busca nos livros
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){const v=location.hash.slice(1);if(['mesa','estudio','jogador','entrar'].includes(v))return;e.preventDefault();if(v!=='biblioteca')location.hash='#biblioteca';setTimeout(()=>{$('#bk-q').focus();$('#bk-q').select()},60)}});
 listBooks()}
RV.Books={bind,listBooks,run,state:B,summarize,termsOf};
})();
