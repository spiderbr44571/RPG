/* RPG Bestiário 0.19: cards uniformes, acervo por sistema, dados no canvas.
 * Nenhuma arte protegida é incluída. Imagens locais pertencem ao usuário.
 */
(()=>{'use strict';
 const best=document.querySelector('#screen-bestiary'),cat=window.RPG15_SYSTEMS;
 if(!best||!cat?.systems?.length)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const SYSTEM='rpg18-bestiary-selected-system',KEY='rpg18-bestiary-by-system-v1',IMAGE='rpg19-monster-art-v1';
 const systems=cat.systems,valid=new Set(systems.map(s=>s.id)),order=(window.RPG19_ORDER_CREATURES||[]);
 const byId=id=>systems.find(s=>s.id===id);
 const deep=x=>JSON.parse(JSON.stringify(x));
 const numeric=(v,max=100000)=>Math.max(0,Math.min(max,Number(v)||0));
 const uid=()=>crypto?.randomUUID?.()||'own-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
 const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch{return fallback}};
 let custom=read(KEY,{}),art=read(IMAGE,{}),oldArt=read('rpg-v06-monster-images',{});
 let selected=localStorage.getItem(SYSTEM)||'ordem-paranormal',search='',currentId=null,editorId=null,imageCandidate=null,lookupPending='';
 if(!valid.has(selected))selected='ordem-paranormal';
 if(!custom||typeof custom!=='object'||Array.isArray(custom))custom={};
 if(!art||typeof art!=='object'||Array.isArray(art))art={};
 function normalizeOlder(){
   const legacy=read('rpg-v07-bestiary-custom',[]),oldOverrides=read('rpg-v07-bestiary-edit',{});
   const seen=read('rpg19-legacy-migration',false);
   if(seen)return;
   const originals=order.map(x=>deep(x));
   const over=read('rpg19-order-overrides-v1',{});
   for(const record of originals){
    const x=oldOverrides[record.id];if(!x)continue;
    over[record.id]={...record,name:String(x.name||record.name),hp:numeric(x.pv||x.hp||record.hp),defense:numeric(x.defesa||x.defense||record.defense),challenge:String(x.vd??record.challenge??''),attack:String(x.teste||record.attack||''),damage:String(x.dano||record.damage||''),notes:String(x.descricao||record.notes||'').slice(0,1000),powers:String(x.efeitos||''),speed:String(x.deslocamento||record.speed||''),skills:String(x.pericias||''),immunity:String(x.imunidades||record.immunity||''),resistance:String(x.resistencias||record.resistance||''),source:record.source,page:record.page};
   }
   try{localStorage.setItem('rpg19-order-overrides-v1',JSON.stringify(over))}catch{}
   const arr=Array.isArray(custom['ordem-paranormal'])?custom['ordem-paranormal'].slice():[];
   if(Array.isArray(legacy))for(const x of legacy){
    if(!x||!x.name)continue;
    if(arr.some(a=>a.id===x.id||a.name===x.name))continue;
    arr.push({id:String(x.id||uid()),name:String(x.name),systemId:'ordem-paranormal',element:String(x.elemento||''),hp:numeric(x.pv||x.hp),defense:numeric(x.defesa||x.defense),challenge:String(x.vd||''),attack:String(x.teste||''),damage:String(x.dano||''),notes:String(x.descricao||''),powers:String(x.efeitos||''),page:x.paginaLivro||null,source:'Personalizado · Ordem Paranormal',verified:false});
   }
   custom['ordem-paranormal']=arr;save();localStorage.setItem('rpg19-legacy-migration','true');
 }
 function save(){localStorage.setItem(KEY,JSON.stringify(custom))}
 const orderOverrides=()=>read('rpg19-order-overrides-v1',{});
 const srd=[
  {id:'srd51-goblin',name:'Goblin',systemId:'d-d',edition:'5e-2014',hp:7,defense:15,challenge:'1/4',bonus:4,attack:'1d20+4',damage:'1d6+2',type:'Humanoide',source:'SRD 5.1 (CC BY 4.0)',notes:'Referência de combate; confira ações e características especiais no SRD.',verified:true},
  {id:'srd51-wolf',name:'Lobo',systemId:'d-d',edition:'5e-2014',hp:11,defense:13,challenge:'1/4',bonus:4,attack:'1d20+4',damage:'2d4+2',type:'Animal',source:'SRD 5.1 (CC BY 4.0)',notes:'Referência de combate; confira habilidades adicionais no SRD.',verified:true},
  {id:'srd51-skeleton',name:'Esqueleto',systemId:'d-d',edition:'5e-2014',hp:13,defense:13,challenge:'1/4',bonus:4,attack:'1d20+4',damage:'1d6+2',type:'Morto-vivo',source:'SRD 5.1 (CC BY 4.0)',notes:'Consulte imunidades e características especiais na referência.',verified:true}
 ];
 // Migrate earlier bestiary cards and keep all current personalizations.
 function recordsFor(systemId){
  const built=systemId==='ordem-paranormal'?order.map(o=>{
    const mod=orderOverrides()[o.id];return mod?{...o,...mod,systemId,edition:'1.3',page:o.page,sourceBookId:o.sourceBookId,customized:true}:o;
  }):systemId==='d-d'?srd:[];
  const user=Array.isArray(custom[systemId])?custom[systemId]:[];
  return built.concat(user.map(r=>({...r,systemId})));
 }
 function getRecord(id){return recordsFor(selected).find(x=>String(x.id)===String(id))}
 const key=(s,id)=>s+'::'+id;
 const artFor=r=>{const v=art[key(r.systemId||selected,r.id)];return v==='none'?'':v||((r.systemId||selected)==='ordem-paranormal'&&oldArt[r.name])||''};
 // Old grimoire remains instantiated behind the scenes for compatibility with legacy controls,
 // but never appears in the new bestiary.
 const legacy=document.createElement('div');legacy.hidden=true;legacy.id='r19-legacy-hidden';
 while(best.firstChild)legacy.append(best.firstChild);
 const head=document.createElement('section'),main=document.createElement('section'),modal=document.createElement('div');
 best.append(head,main,legacy);document.body.append(modal);
 head.className='r19-head';main.className='r19-main';modal.id='r19-modal';modal.hidden=true;
 modal.innerHTML='<div class="r19-modal-content" role="dialog" aria-modal="true" aria-label="Ficha da criatura"><button class="r19-close" aria-label="Fechar ficha">×</button><div id="r19-modal-body"></div></div>';
 head.innerHTML='<div class="eyebrow">BESTIÁRIO · MULTISSISTEMA</div><h1 class="page-h">Criaturas <i>do seu mundo.</i></h1><p>Um catálogo por sistema, com fichas editáveis, imagens e conexão com o canvas.</p><div class="r19-controls"><label>Sistema <select id="r19-system"></select></label><label>Buscar criaturas <input id="r19-search" type="search" placeholder="Nome, elemento, tipo..." autocomplete="off"></label><span id="r19-count"></span></div>';
 head.querySelector('select').innerHTML=systems.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join('');
 function overview(r){
  const img=artFor(r);
  return '<article class="r19-card" data-record="'+esc(r.id)+'">'+
   '<button class="r19-art" data-open="'+esc(r.id)+'">'+(img?'<img loading="lazy" src="'+esc(img)+'" alt="Ilustração da criatura '+esc(r.name)+'">':'<div class="r19-art-missing"><span>✧</span><small>Imagem não cadastrada</small></div>')+'</button>'+
   '<div class="r19-card-meta"><small>'+esc(r.element||r.type||'Criatura')+'</small><span>'+(r.verified?'Fonte indexada':'Personalizada')+'</span></div>'+
   '<h3>'+esc(r.name)+'</h3><div class="r19-metrics"><span><small>PV</small><strong>'+esc(r.hp??'—')+'</strong></span><span><small>'+(selected==='d-d'?'CA':'DEF')+'</small><strong>'+esc(r.defense??'—')+'</strong></span><span><small>'+(selected==='ordem-paranormal'?'VD':'Desafio')+'</small><strong>'+esc(r.challenge??'—')+'</strong></span></div>'+
   '<div class="r19-card-actions"><button data-open="'+esc(r.id)+'">Detalhes</button><button class="r19-primary" data-canvas="'+esc(r.id)+'">+ Canvas</button></div></article>';
 }
 function redraw(){
  const list=recordsFor(selected),filtered=list.filter(r=>(r.name+' '+(r.element||'')+' '+(r.type||'')).toLocaleLowerCase('pt-BR').includes(search));
  head.querySelector('select').value=selected;head.querySelector('input').value=search;
  head.querySelector('#r19-count').textContent=list.length+' criatura(s)';
  main.innerHTML='<div class="r19-subhead"><div><h2>'+esc(byId(selected)?.title||'Sistema')+'</h2><small>'+esc(selected==='d-d'?'5e 2014 (SRD 5.1)':selected==='ordem-paranormal'?'Livro 1.3 + fichas personalizadas':'Criaturas personalizadas do sistema')+'</small></div><button id="r19-create">+ Nova criatura</button></div>'+
   '<div class="r19-grid">'+(filtered.length?filtered.map(overview).join(''):'<div class="r19-empty">Nenhuma criatura encontrada. Você pode cadastrar a primeira criatura deste sistema.</div>')+'</div>';
  updateCanvasPicker();
 }
 function info(r){
  const list=[
   ['Sistema',byId(r.systemId)?.title||r.systemId],['Versão',r.edition],['Elemento / Tipo',r.element||r.type],['PV',r.hp],['Defesa / CA',r.defense],['Desafio / VD',r.challenge],
   ['Deslocamento',r.speed],['Atributos',r.attributes&&typeof r.attributes==='object'?Object.entries(r.attributes).map(([k,v])=>k+' '+v).join(' · '):r.attributes],
   ['Iniciativa',r.initiative],['Fortitude',r.fortitude],['Reflexos',r.reflexes],['Vontade',r.will],['Sentidos',r.senses],
   ['Perícias',r.skills],['Resistências',r.resistance],['Vulnerabilidades',r.vulnerability],['Imunidades',r.immunity],
   ['Presença perturbadora · DT',r.presenceDC],['Ataque base',r.attack],['Dano base',r.damage],['Poderes / ações',r.powers],['Condições',r.conditions],['Enigma',r.enigma],['Notas',r.notes]
  ];
  return list.filter(([k,v])=>v!==undefined&&v!==null&&String(v).trim()!=='').map(([k,v])=>'<div class="r19-info-row"><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('');
 }
 function details(r){
  currentId=r.id;editorId=null;imageCandidate=null;lookupPending='';modal.hidden=false;
  const picture=artFor(r);
  const k=key(selected,r.id),credit=read('rpg19-monster-image-attribution',{})[k]||'';
  modal.querySelector('#r19-modal-body').innerHTML='<div class="r19-modal-grid">'+
   '<section><div class="r19-large-art" id="r19-hero-art">'+(picture?'<img src="'+esc(picture)+'" alt="Arte de '+esc(r.name)+'">':'<div class="r19-art-missing">✧<small>Busque ou adicione uma imagem</small></div>')+'</div>'+
   '<div class="r19-art-actions"><button data-image-search="'+esc(r.id)+'">Buscar imagem</button><label>Adicionar imagem<input id="r19-upload" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>'+(picture?'<button data-image-remove="'+esc(r.id)+'">Remover imagem</button>':'')+'</div><small class="r19-image-credit">'+esc(credit)+'</small><small id="r19-image-msg" role="status">Imagens com licença adequada são sugeridas; imagens próprias ficam neste aparelho.</small></section>'+
   '<section class="r19-detail-text"><small>'+esc(byId(selected)?.title||'Sistema')+'</small><h2>'+esc(r.name)+'</h2><div class="r19-full-data">'+info(r)+'</div>'+
    ((r.attacks?.length)?'<h3>Testes e ataques cadastrados</h3>'+r.attacks.map(a=>'<div class="r19-action-line"><strong>'+esc(a.name)+'</strong><span>'+esc(a.test||'')+' · '+esc(a.damage||'')+'</span></div>').join(''):'')+
   '<p class="r19-source"><strong>Fonte:</strong> '+esc(r.source||'Cadastro local')+(r.page?' · página '+esc(r.page):'')+'. Ações não cadastradas devem ser consultadas no livro.</p>'+
   '<div class="r19-detail-actions"><button class="r19-primary" data-canvas="'+esc(r.id)+'">Adicionar ao canvas</button><button data-edit="'+esc(r.id)+'">Editar ficha</button>'+(r.page&&selected==='ordem-paranormal'?'<button data-page="'+esc(r.page)+'">Abrir página original</button>':'')+
   (!r.id.startsWith('official-')&&!r.id.startsWith('srd51-')?'<button data-delete="'+esc(r.id)+'">Excluir</button>':'')+'</div></section></div>';
  // Search only when opening details and without a local image, not for dozens of cards in parallel.
  if(!picture)requestImage(r,false);
 }
 const fields=[
  ['name','Nome','text'],['element','Elemento','text'],['type','Tipo','text'],['hp','PV','number'],['defense','Defesa / CA','number'],
  ['challenge','VD / Nível de desafio','text'],['attack','Teste de ataque (ex.: 3O+10, 1d20+4)','text'],['damage','Dano (ex.: 2d8+5)','text'],
  ['speed','Deslocamento','text'],['initiative','Iniciativa','text'],['fortitude','Fortitude','text'],['reflexes','Reflexos','text'],
  ['will','Vontade','text'],['attributes','Atributos (JSON ou texto)','text'],['skills','Perícias','text'],['senses','Sentidos','text'],
  ['resistance','Resistências','text'],['vulnerability','Vulnerabilidades','text'],['immunity','Imunidades','text'],
  ['presenceDC','DT Presença','text'],['page','Página do livro','number'],['source','Livro / fonte','text'],
  ['powers','Habilidades e poderes','textarea'],['conditions','Condições','textarea'],['enigma','Enigma / requisitos','textarea'],
  ['notes','Descrição e observações','textarea']
 ];
 function editForm(r){
  editorId=r?.id||null;
  const holder=modal.querySelector('#r19-modal-body');
  const values=Object.assign({name:'',systemId:selected,hp:1,defense:10},r||{});
  holder.innerHTML='<h2>Editar criatura · '+esc(byId(selected)?.title||selected)+'</h2><p>Todos os campos são editáveis. Fichas oficiais recebem substituições locais sem alterar os livros.</p>'+
   '<form id="r19-edit-form"><div class="r19-edit-grid">'+fields.map(([id,label,type])=>{
    let value=values[id]??'';
    if(typeof value==='object')value=JSON.stringify(value);
    return '<label>'+esc(label)+(type==='textarea'?'<textarea name="'+id+'" maxlength="4000" rows="4">'+esc(value)+'</textarea>':
      '<input name="'+id+'" type="'+type+'" '+(id==='name'?'required ':'')+(type==='number'?'min="0" max="1000000" ':'')+'maxlength="1000" value="'+esc(value)+'">')+'</label>';
   }).join('')+'</div><div class="r19-detail-actions"><button type="submit" class="r19-primary">Salvar ficha</button><button type="button" data-edit-cancel>Cancelar</button></div></form>';
 }
 function currentRecords(){return Array.isArray(custom[selected])?custom[selected]:[]}
 function saveRecord(r){
  const fixed=r.id.startsWith('official-')&&selected==='ordem-paranormal';
  if(fixed){
   const existing=orderOverrides();existing[r.id]=r;
   localStorage.setItem('rpg19-order-overrides-v1',JSON.stringify(existing));
  }else{
   const arr=currentRecords();const at=arr.findIndex(x=>x.id===r.id);
   if(at<0&&arr.length>=200)throw Error('Limite de 200 criaturas personalizadas por sistema.');
   if(at>=0)arr[at]=r;else arr.push(r);
   custom[selected]=arr;save();
  }
 }
 function fromForm(f){
  const v=k=>String(f.elements.namedItem(k)?.value||'').trim();
  let attrs=v('attributes');if(attrs.startsWith('{')){try{attrs=JSON.parse(attrs)}catch{throw Error('Atributos JSON inválidos.')}}
  const original=editorId?getRecord(editorId):null;
  const rec={...original,id:editorId||uid(),systemId:selected,verified:false,customized:true};
  for(const [id,,type] of fields){if(id==='attributes'){rec.attributes=attrs;continue}rec[id]=type==='number'?numeric(v(id),1000000):v(id).slice(0,type==='textarea'?4000:1000)}
  if(!rec.name)throw Error('Informe o nome.');
  if(rec.id.startsWith('srd51-'))rec.id=uid(); // SRD originals are immutable.
  if(!original)rec.edition=selected==='d-d'?'5e-2014':selected==='ordem-paranormal'?'1.3':'';
  return rec;
 }
 function itemForCanvas(r){
  const damage=/^\d{1,2}d(?:4|6|8|10|12|20|100)(?:[+-]\d{1,3})?$/i.test(r.damage||'')?r.damage:(r.roll||'');
  const attacks=Array.isArray(r.attacks)?r.attacks:[];
  return {...deep(r),systemId:selected,damage,roll:damage,bonus:Math.max(-1000,Math.min(1000,Number(r.bonus)||0)),abilities:[],attacks:attacks.map(a=>({name:a.name,test:a.test,damage:a.damage}))};
 }
 function spawn(r){
  if(!window.RPGv3?.spawnCatalog){alert('Canvas indisponível nesta tela.');return}
  const ok=window.RPGv3.spawnCatalog(itemForCanvas(r));if(ok){modal.hidden=true;window.RPG_DEMO?.navigate?.('canvas')}
 }
 function updateCanvasPicker(){
  const select=document.querySelector('#canvas-creature-select');
  if(!select)return;
  const prev=select.value;select.innerHTML=recordsFor(selected).map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+'</option>').join('');
  if(recordsFor(selected).some(m=>m.id===prev))select.value=prev;
 }
 // Reuse player-owned legacy tokens, with new per-system keys.
 function updateTokenArt(){
  document.querySelectorAll('#encounter-layer .encounter-token').forEach(node=>{
   const monster=window.RPGv3?.monsters?.find(m=>m.id===node.dataset.id);
   if(!monster?.creatureId)return;
   const image=artFor({id:monster.creatureId,name:monster.name,systemId:monster.systemId});
   if(!image)return;
   let img=node.querySelector('.r19-token-image');
   if(!img){img=document.createElement('img');img.className='r19-token-image';img.alt='Token da criatura';node.querySelector('.token-body')?.prepend(img)}
   if(img.src!==image)img.src=image;
  });
 }
 const tokenLayer=document.querySelector('#encounter-layer');
 if(tokenLayer)new MutationObserver(updateTokenArt).observe(tokenLayer,{childList:true});
 function showBookPage(r){
  if(!r.page)return;
  const old=document.querySelector('#rpg07-pdf-lightbox'),oldLabel=document.querySelector('#rpg07-book-caption');
  if(window.RpgBookBridge?.renderPage&&old){
   old.hidden=false;if(oldLabel)oldLabel.textContent=r.name+' · Ordem v1.3 · p.'+r.page;
   document.querySelector('#rpg07-book-loading').textContent='Carregando PDF importado...';
   window.RpgBookBridge.renderPage(Math.round(Number(r.page)));modal.hidden=true;return;
  }
  window.RPG_DEMO?.notify?.('Importe o PDF de Ordem Paranormal primeiro na Biblioteca.');
 }
 // MediaCommons search results are suggestions, NEVER automatically assigned to a creature.
 function requestImage(r,force){
  if(artFor(r))return;
  const out=modal.querySelector('#r19-image-msg');if(!window.RpgCreatureImageBridge?.search){
   if(out)out.textContent='Busca automática indisponível nesta plataforma. Adicione sua imagem ou use a pesquisa externa.';
   return;
  }
  const id=uid();lookupPending=id;
  if(out)out.textContent='Procurando imagem licenciada no Wikimedia Commons...';
  window.RpgCreatureImageBridge.search(selected,r.name,id);
 }
 function acceptImage(bytes,name,attribution=''){
  if(!currentId)return;
  const r=getRecord(currentId);if(!r)return;
  art[key(selected,r.id)]=bytes;
  try{localStorage.setItem(IMAGE,JSON.stringify(art))}catch(e){delete art[key(selected,r.id)];alert('Espaço insuficiente para imagem.');return}
  if(attribution){
   let k=read('rpg19-monster-image-attribution',{});k[key(selected,r.id)]=attribution;localStorage.setItem('rpg19-monster-image-attribution',JSON.stringify(k));
  }
  details(r);redraw();updateTokenArt();
 }
 async function imageFromFile(file){
  if(!file||!/image\/(png|jpeg|webp)/.test(file.type)||file.size>6*1024*1024)throw Error('Use PNG/JPG/WebP até 6 MB.');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();
   await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('Imagem inválida'));img.src=url});
   const w=Math.max(1,img.naturalWidth),h=Math.max(1,img.naturalHeight),ratio=Math.min(1,320/Math.max(w,h));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   return canvas.toDataURL('image/jpeg',.65);
  }finally{URL.revokeObjectURL(url)}
 }
 window.addEventListener('rpg19-image-search-result',e=>{
  const p=e.detail||{};if(!p.requestId||p.requestId!==lookupPending||modal.hidden)return;
  const out=modal.querySelector('#r19-image-msg');if(!out)return;
  if(p.error||!p.url){out.textContent='Nenhuma imagem com licença adequada encontrada. Use Adicionar imagem.';return}
  imageCandidate=p;
  const preview=modal.querySelector('#r19-hero-art');
  preview.innerHTML='<img src="'+esc(p.url)+'" alt="Imagem sugerida por busca livre">';
  out.innerHTML='Sugestão do Wikimedia Commons · '+esc(p.license||'Licença não identificada')+' · '+esc(p.artist||'Autor não identificado').slice(0,110)+'. <button id="r19-approve-art">Usar esta imagem</button>';
 });
 window.addEventListener('rpg19-image-saved',e=>{
  const p=e.detail||{};if(p.requestId!==lookupPending||!p.image)return;
  acceptImage(p.image,currentId,(p.license||'')+' · '+(p.credit||''));
 });
 main.addEventListener('click',e=>{
  const open=e.target.closest('[data-open]');if(open){let r=getRecord(open.dataset.open);if(r)details(r);return}
  const canvas=e.target.closest('[data-canvas]');if(canvas){const r=getRecord(canvas.dataset.canvas);if(r)spawn(r);return}
  if(e.target.closest('#r19-create')){currentId=null;modal.hidden=false;editForm(null)}
 });
 modal.addEventListener('click',e=>{
  if(e.target===modal||e.target.closest('.r19-close')){modal.hidden=true;return}
  const toCanvas=e.target.closest('[data-canvas]');if(toCanvas){let r=getRecord(toCanvas.dataset.canvas);if(r)spawn(r);return}
  const edit=e.target.closest('[data-edit]');if(edit){let r=getRecord(edit.dataset.edit);if(r)editForm(r);return}
  const page=e.target.closest('[data-page]');if(page){const r=getRecord(currentId);if(r)showBookPage(r);return}
  if(e.target.closest('[data-edit-cancel]')){const r=getRecord(currentId);if(r)details(r);else modal.hidden=true;return}
  const del=e.target.closest('[data-delete]');if(del){if(confirm('Excluir esta criatura personalizada?')){custom[selected]=currentRecords().filter(r=>r.id!==del.dataset.delete);save();modal.hidden=true;redraw()}return}
  const start=e.target.closest('[data-image-search]');if(start){let r=getRecord(start.dataset.imageSearch);if(r)requestImage(r,true);return}
  const remove=e.target.closest('[data-image-remove]');if(remove){art[key(selected,remove.dataset.imageRemove)]='none';localStorage.setItem(IMAGE,JSON.stringify(art));details(getRecord(remove.dataset.imageRemove));redraw();return}
  if(e.target.closest('#r19-approve-art')&&imageCandidate){
   const p=imageCandidate;if(!window.RpgCreatureImageBridge?.saveFromCommons)return;
   modal.querySelector('#r19-image-msg').textContent='Guardando a imagem sugerida neste dispositivo...';
   window.RpgCreatureImageBridge.saveFromCommons(p.url,p.requestId,p.license||'',p.artist||'');return;
  }
 });
 modal.addEventListener('change',async e=>{
  if(e.target.id!=='r19-upload')return;
  const f=e.target.files?.[0];e.target.value='';
  try{acceptImage(await imageFromFile(f),f?.name)}catch(error){alert(error.message)}
 });
 modal.addEventListener('submit',e=>{
  if(e.target.id!=='r19-edit-form')return;e.preventDefault();
  try{let r=fromForm(e.target);saveRecord(r);currentId=r.id;redraw();details(r)}
  catch(err){alert('Não foi possível salvar: '+err.message)}
 });
 head.querySelector('select').addEventListener('change',e=>{selected=e.target.value;search='';localStorage.setItem(SYSTEM,selected);redraw()});
 head.querySelector('input').addEventListener('input',e=>{search=e.target.value.toLocaleLowerCase('pt-BR').slice(0,120);redraw()});
 // Canvas "adicionar criatura" uses the same active system as the bestiary.
 const addToCanvas=document.querySelector('#canvas-add-creature');
 if(addToCanvas){
   // A escolha do catálogo multissistema é a única fonte da criatura no Canvas.
   addToCanvas.onclick=null;
   addToCanvas.addEventListener('click',e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const id=document.querySelector('#canvas-creature-select')?.value;
    const r=getRecord(id);
    if(!r){window.RPG_DEMO?.notify?.('Selecione uma criatura válida no bestiário.');return}
    spawn(r);
   },true);
  }
 const css=document.createElement('style');css.textContent=
 '.r19-head p{font-size:12px;color:var(--muted)}.r19-controls{display:flex;gap:13px;align-items:end;flex-wrap:wrap;margin:15px 0}.r19-controls label{display:grid;gap:5px;flex:1;min-width:160px;font-size:11px}.r19-controls select,.r19-controls input{padding:12px;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:10px;width:100%}.r19-controls span{font-size:10px;color:var(--muted)}.r19-subhead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:15px 0;flex-wrap:wrap}.r19-subhead h2{font:600 30px Cormorant Garamond,Georgia,serif;margin:0}.r19-subhead small{color:var(--muted)}.r19-subhead button,.r19-detail-actions button,.r19-card-actions button,.r19-art-actions button,.r19-art-actions label{border:1px solid var(--accent);padding:10px 12px;border-radius:9px;background:var(--panel2);color:var(--fg);cursor:pointer;font:600 11px system-ui}.r19-primary{background:var(--accent)!important;color:#17121a!important}.r19-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.r19-card{border:1px solid var(--line);background:var(--panel);border-radius:15px;padding:12px;min-width:0;display:flex;flex-direction:column}.r19-art{height:158px;border:1px solid var(--line);border-radius:10px;width:100%;display:grid;place-items:center;overflow:hidden;padding:0;background:var(--panel2);cursor:pointer}.r19-art img{width:100%;height:100%;object-fit:contain}.r19-art-missing{height:100%;width:100%;display:grid;place-items:center;align-content:center;gap:10px;color:var(--accent);background:radial-gradient(circle,#76629522,transparent 75%),var(--panel2)}.r19-art-missing span{font-size:40px}.r19-art-missing small{font-size:9px}.r19-card-meta{display:flex;align-items:center;justify-content:space-between;gap:6px;padding-top:8px}.r19-card-meta small{font-size:10px;color:var(--accent)}.r19-card-meta span{font-size:9px;color:var(--muted)}.r19-card h3{font:600 clamp(19px,3vw,27px) Cormorant Garamond,Georgia,serif;margin:6px 0}.r19-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:6px 0 12px}.r19-metrics span{padding:7px;background:var(--panel2);border-radius:7px}.r19-metrics small,.r19-metrics strong{display:block;font-size:10px}.r19-metrics strong{font-size:18px}.r19-card-actions,.r19-detail-actions,.r19-art-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:auto}.r19-card-actions button{flex:1}.r19-empty{padding:22px;color:var(--muted)}#r19-modal{position:fixed;inset:0;z-index:2000;background:#070611de;display:grid;place-items:center;padding:12px;overflow-y:auto}#r19-modal[hidden]{display:none!important}.r19-modal-content{width:min(100%,950px);max-height:95vh;overflow:auto;border:1px solid var(--accent);background:var(--panel);border-radius:18px;padding:18px;position:relative}.r19-close{position:sticky;top:0;float:right;z-index:2;background:var(--panel2);border:1px solid var(--line);color:var(--fg);font-size:22px;border-radius:8px;cursor:pointer}.r19-modal-grid{display:grid;grid-template-columns:minmax(180px,35%) minmax(0,1fr);gap:18px}.r19-large-art{height:270px;border-radius:13px;background:var(--panel2);overflow:hidden;display:grid;place-items:center}.r19-large-art img{width:100%;height:100%;object-fit:contain}.r19-art-actions{margin:12px 0}.r19-art-actions input{display:none}#r19-image-msg{font-size:10px;color:var(--muted)}.r19-detail-text h2,.r19-modal-content h2{font:600 36px Cormorant Garamond,Georgia,serif;margin:5px 0 12px}.r19-detail-text>small{font-size:10px;color:var(--accent)}.r19-full-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.r19-info-row{padding:9px;background:var(--panel2);border-radius:8px;overflow-wrap:anywhere}.r19-info-row small{display:block;color:var(--muted);font-size:9px}.r19-info-row strong{font-size:12px;white-space:pre-wrap;font-weight:500}.r19-action-line{padding:8px;border-bottom:1px solid var(--line);display:flex;gap:9px;justify-content:space-between}.r19-action-line strong,.r19-action-line span{font-size:11px}.r19-source{color:var(--muted);font-size:11px;margin:14px 0}.r19-edit-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.r19-edit-grid label{display:grid;gap:5px;font-size:11px}.r19-edit-grid input,.r19-edit-grid textarea{width:100%;min-width:0;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:10px}.r19-edit-grid label:has(textarea){grid-column:1 / -1}.r19-token-image{width:52px;height:52px;object-fit:contain;float:left;margin-right:8px}.r19-modal-content .r19-detail-actions{margin-top:12px}#r19-legacy-hidden[hidden]{display:none!important}@media(max-width:620px){.r19-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.r19-card{padding:8px}.r19-art{height:120px}.r19-card-actions button{font-size:9px;padding:8px 5px}.r19-card-meta span{font-size:8px}.r19-metrics strong{font-size:15px}.r19-modal-grid{grid-template-columns:1fr}.r19-large-art{height:190px}.r19-full-data{grid-template-columns:1fr}.r19-edit-grid{grid-template-columns:1fr}}';
 document.head.append(css);
 normalizeOlder();redraw();
 window.RPG18_BESTIARY={handlesCanvas:true,changeSystem:id=>{if(valid.has(id)){selected=id;localStorage.setItem(SYSTEM,id);redraw()}},listFor:recordsFor,get currentSystem(){return selected}};
})();