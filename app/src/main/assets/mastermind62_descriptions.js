/* Mastermind 0.62: consulta literal de descrições cadastradas e referência dos livros.
   Nunca inventa textos de regras ou exibe resumo como transcrição do livro. */
(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
const sources=()=>root.OP13?.pack||{};
const overridesKey='mastermind63-personal-descriptions-v1';
const getOverrides=()=>{try{return JSON.parse(localStorage.getItem(overridesKey)||'{}')}catch{return {}}};
const itemKey=x=>[x.systemId||'',norm(x.name),norm(x.kind||''),norm(x.element||''),norm(x.className||''),String(x.level||'')].join('|');
function packItems(){
 const p=sources(),arr=[];
 const scan=(value,kind)=>{
  if(!value)return;
  if(Array.isArray(value)){for(const x of value)scan(x,kind);return}
  if(typeof value!=='object')return;
  const name=value.nome||value.name||value.titulo;
  if(name&&typeof name==='string'){arr.push({systemId:'ordem-paranormal',kind,name,
   description:value.textoIntegral||value.descricaoIntegral||value.descricaoCompleta||value.descricao||value.description||'',
   summary:value.resumo||'',page:value.paginaLivro||value.paginaPDF||value.page||'',origin:'Ordem Paranormal — livro cadastrado'});return}
  for(const [key,v] of Object.entries(value))if(key!=='manifest')scan(v,kind);
 };
 for(const key of ['rituais','poderesParanormais','pericias','classes','origens','regras','condicoes','equipamentos'])scan(p[key],key);
 return arr;
}
function allEntries(){
 const g=(root.GURPS4_BASIC_TRAITS||[]).map(x=>({systemId:'gurps',kind:x.category,name:x.namePt||x.name,english:x.name,
  page:x.pagePt||'',reference:x.reference,origin:x.namePt?'GURPS — Lista de Características (PT–EN)':'GURPS — Basic Set (índice)',
  summary:x.points===null?'Custo variável: confirme no livro.':'Custo básico: '+x.points+' pontos (sem modificadores).'}));
 const skills=(root.GURPS4_LITE_SKILLS||[]).map(x=>({systemId:'gurps',kind:'pericia',name:x.name,summary:x.attr+' / '+x.diff,origin:'GURPS Lite — índice de perícias'}));
 const dnd=root.RPG18_DND_ENGINE;
 const d=dnd?Object.keys(dnd.SKILLS||{}).map(x=>({systemId:'d-d',kind:'pericia',name:dnd.LABELS?.[x]||x,summary:'Atributo: '+dnd.SKILLS[x],origin:'D&D 5e SRD 5.1'})):[];
 const u=root.RPG18_DND?.current;
 for(const key of ['features','spells','attacks','inventory'])for(const item of Array.isArray(u?.[key])?u[key]:[])d.push({systemId:'d-d',kind:key,name:item.name||String(item),description:item.description||'',summary:item.details||item.notes||'',origin:'Ficha do jogador'});
 const order=root.Mastermind63Order||[],gurps=root.Mastermind63GURPS||[],srd=root.Mastermind63SRD||[];
 const ptSkill=new Map((root.Mastermind63GURPSSkillPT||[]).map(x=>[norm(x.english),x]));
 const gskills=Object.entries(root.Mastermind63GURPSSkills||{}).map(([name,x])=>{
  const pt=ptSkill.get(norm(name)),dif=({E:'fácil',A:'média',H:'difícil',VH:'muito difícil'}[String(x.dif||'').toUpperCase()]||'especial');
  return {systemId:'gurps',kind:'Perícia',name:pt?.pt||name,english:name,page:pt?.page||'',reference:x.reference||'',origin:'GURPS 4ª edição · catálogo de perícias',
   description:'Perícia com base em '+(x.attr||'atributo configurado')+' e dificuldade '+dif+'. O nível de habilidade depende do atributo, da dificuldade e dos pontos investidos.',
   sourceDetail:'mechanics'};
 });
 const all=[...order,...gurps,...gskills,...srd,...packItems(),...g,...skills,...d],seen=new Set();
 return all.filter(x=>{const id=itemKey(x);if(seen.has(id))return false;seen.add(id);return true;});
}
function find(name,systemId){
 const q=norm(name);if(!q)return null;
 const opts=allEntries().filter(x=>(!systemId||x.systemId===systemId)&&(norm(x.name)===q||norm(x.english)===q));
 return opts[0]||null;
}
let dialog=null,previousFocus=null,searchResults=[],selected=null,lookupId=0;
function ensure(){
 if(dialog)return dialog;
 dialog=document.createElement('section');dialog.id='mm62-descriptions';dialog.hidden=true;
 dialog.innerHTML='<div class="mm62-backdrop" data-mm62-close="1"></div><div class="mm62-dialog" role="dialog" aria-modal="true" aria-label="Consulta de descrições"><header><strong>📖 Consulta de descrições</strong><button type="button" data-mm62-close="1" aria-label="Fechar">✕</button></header><div id="mm62-content"></div></div>';
 document.body.appendChild(dialog);
 dialog.addEventListener('click',e=>{
  if(e.target.closest('[data-mm62-close]')){close();return}
  const b=e.target.closest('[data-mm62-result]');
  if(b){let x=searchResults[Number(b.dataset.mm62Result)];if(x)open(x);return}
  if(e.target.closest('[data-mm63-save]')){
   if(!selected)return;const v=dialog.querySelector('#mm63-user-description')?.value||'';
   if(v.length>12000)return alert('Limite de 12.000 caracteres.');
   const store=getOverrides(),key=itemKey(selected);
   if(v.trim())store[key]=v.trim();else delete store[key];
   try{localStorage.setItem(overridesKey,JSON.stringify(store));open(selected)}catch{alert('Não foi possível salvar no armazenamento local.')}return
  }
  if(e.target.closest('[data-mm62-find]')){
   const q=dialog.querySelector('#mm62-query')?.value.trim();const sys=dialog.querySelector('#mm62-system')?.value;
   showSearch(q,sys);return
  }
  if(e.target.closest('[data-mm62-book]')){
   const d=dialog.querySelector('[data-mm62-title]'),q=d?.dataset.mm62Title||'';
   const sys=d?.dataset.mm62System||'';
   close();root.RPG_DEMO?.navigate?.('ai');
   const input=document.querySelector('#r26-query'),system=document.querySelector('#r26-system');
   if(system&&sys&&[...system.options].some(x=>x.value===sys)){system.value=sys;system.dispatchEvent(new Event('change',{bubbles:true}))}
   if(input){input.value=q;document.querySelector('#r26-form')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
   else root.RPG_DEMO?.notify?.('Abra Consulta aos livros e pesquise: '+q);
   return;
  }
 });
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){close();e.preventDefault()}});
 return dialog;
}
function show(){previousFocus=document.activeElement;ensure().hidden=false;document.body.classList.add('mm62-description-open')}
function close(){if(!dialog)return;lookupId++;dialog.hidden=true;document.body.classList.remove('mm62-description-open');previousFocus?.focus?.();}
function open(data){
 let item=typeof data==='string'?find(data):data;
 if(!item)return showSearch(typeof data==='string'?data:'','');
 const val=find(item.name,item.systemId)||{},o={...val,...item};
 for(const key of ['description','summary','page','reference','origin','english'])if(!o[key]&&val[key])o[key]=val[key];
 selected=o;
 const desc=typeof o.description==='string'?o.description.trim():'';
 const summary=typeof o.summary==='string'?o.summary.trim():'';
 const note=typeof o.notes==='string'?o.notes.trim():'';
 const book=o.origin||o.book||o.source||'Conteúdo cadastrado na ficha';
 const personal=getOverrides()[itemKey(o)]||'';
 const page=o.page||o.reference||'';
 show();
 ensure().querySelector('#mm62-content').innerHTML='<div class="mm62-info" data-mm62-title="'+esc(o.name)+'" data-mm62-system="'+esc(o.systemId||'')+'">'+
 '<h2>'+esc(o.name)+'</h2><div class="mm62-meta">'+esc(o.kind||'Característica')+' · '+esc(book)+(page?' · '+esc(String(page).startsWith('B')?page:'p. '+page):'')+'</div>'+
 (desc?'<h3>Descrição funcional</h3><div class="mm62-literal">'+esc(desc)+'</div>':
 '<p class="mm62-unavailable">Esta entrada ainda não tem uma explicação mecânica verificada no índice. Consulte os trechos do seu livro particular abaixo ou adicione suas anotações.</p>')+
 (summary?'<h3>Dados resumidos (não são transcrição)</h3><p>'+esc(summary)+'</p>':'')+
 (note?'<h3>Notas da ficha</h3><p>'+esc(note)+'</p>':'')+
 '<div id="mm63-private-excerpts"><p class="mm62-helper">Verificando os livros particulares indexados…</p></div>'+ 
 '<h3>Anotações pessoais</h3><textarea id="mm63-user-description" rows="4" maxlength="12000" placeholder="Descrição adicional a salvar nesta ficha.">'+esc(personal)+'</textarea><button type="button" data-mm63-save="1">Salvar anotações</button>'+ 
 '<button type="button" data-mm62-book="1">Pesquisar no meu livro ↗</button><button type="button" id="mm62-another">Consultar outra característica</button></div>';
 const b=dialog.querySelector('#mm62-another');b?.addEventListener('click',()=>showSearch('',''));
 const id=++lookupId;lookupPrivate(o).then(hits=>{
  if(id!==lookupId||dialog.hidden)return;
  const target=dialog.querySelector('#mm63-private-excerpts');if(!target)return;
  target.innerHTML=hits.length?'<h3>Trechos do seu livro</h3>'+
   hits.slice(0,2).map(h=>'<div class="mm63-excerpt"><small>'+esc(h.book)+' · página '+esc(h.page)+'</small><p>'+esc(h.text)+'</p></div>').join('')+
   '<p class="mm62-helper">Trechos da fonte pessoal, separados dos resumos do aplicativo.</p>':
   '<p class="mm62-helper">Nenhum trecho encontrado no índice privado deste sistema. O resumo acima permanece disponível.</p>';
 }).catch(()=>{if(id===lookupId){const target=dialog?.querySelector('#mm63-private-excerpts');if(target)target.textContent='Não foi possível ler o índice particular.'}});

}
function showSearch(query='',systemId=''){
 lookupId++;selected=null;
 show();
 let results=allEntries(),q=norm(query);
 if(q)results=results.filter(x=>norm(x.name).includes(q)||norm(x.english).includes(q));
 if(systemId)results=results.filter(x=>x.systemId===systemId);
 searchResults=results.slice(0,80);
 ensure().querySelector('#mm62-content').innerHTML='<p class="mm62-helper">Pesquise rituais, perícias, magias, habilidades, poderes ou características. A biblioteca inclui descrições funcionais e os dados das regras cadastradas; trechos originais podem aparecer quando seus PDFs estão indexados.</p>'+
 '<label>Nome<input id="mm62-query" type="search" value="'+esc(query)+'" placeholder="Ex.: Reflexos em Combate"></label>'+
 '<label>Sistema<select id="mm62-system"><option value="">Todos</option>'+
 [['ordem-paranormal','Ordem Paranormal'],['gurps','GURPS 4e'],['d-d','D&D 5e']].map(([id,label])=>'<option value="'+id+'"'+(id===systemId?' selected':'')+'>'+label+'</option>').join('')+
 '</select></label><button data-mm62-find="1" type="button">Pesquisar</button>'+
 '<p class="mm62-helper">'+results.length+' entradas encontradas · exibindo até 80</p>'+
 '<div class="mm62-results">'+searchResults.map((x,i)=>'<button type="button" data-mm62-result="'+i+'"><strong>'+esc(x.name)+'</strong><small>'+esc(x.kind)+' · '+esc(x.origin)+' · '+esc(x.page||x.reference||'')+'</small></button>').join('')+'</div>';
 dialog.querySelector('#mm62-query')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();showSearch(e.target.value,dialog.querySelector('#mm62-system')?.value)}});
}
async function lookupPrivate(item){
 const hits=[],name=norm(item.name),parts=name.split(' ');
 if(item.systemId==='ordem-paranormal'&&root.RpgBookBridge?.searchPdf){
  try{
   const data=JSON.parse(root.RpgBookBridge.searchPdf(item.name,8,0));
   if(['ready','indexing','partial'].includes(data.state))
    for(const h of data.hits||[])if(h.excerpt&&h.page)hits.push({book:data.book||'Livro local de Ordem Paranormal',page:h.page,text:String(h.excerpt).slice(0,280)});
  }catch{}
 }
 if(typeof indexedDB==='undefined')return hits.slice(0,2);
 const books=await new Promise(resolve=>{
  const req=indexedDB.open('RPG-Mesa-Private-Search');
  req.onerror=()=>resolve([]);
  req.onsuccess=()=>{
   const db=req.result;if(!db.objectStoreNames.contains('books')){db.close();resolve([]);return;}
   const q=db.transaction('books','readonly').objectStore('books').getAll();
   q.onerror=()=>{db.close();resolve([])};
   q.onsuccess=()=>{const all=q.result||[];db.close();resolve(all)};
  };
 });
 for(const book of books){
  if(book.systemId!==item.systemId)continue;
  for(const chunk of book.chunks||[]){
   if(hits.length>=8)break;
   const text=String(chunk.text||''),normalized=norm(text);
   if(!normalized.includes(name)&&!parts.every(w=>w.length<3||normalized.includes(w)))continue;
   const offset=Math.max(0,normalized.indexOf(parts[0]||'')-30);
   hits.push({book:book.book?.title||'Índice particular',page:chunk.page||'?',text:text.slice(offset,offset+280).replace(/\s+/g,' ')});
  }
 }
 return hits.slice(0,2);
}

root.Mastermind62Descriptions={open,find,search:showSearch,close,allEntries,lookupPrivate};
})(window);
