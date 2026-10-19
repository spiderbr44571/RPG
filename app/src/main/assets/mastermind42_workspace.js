/* Mastermind 0.42: biblioteca local de Canvas, conexoes coloridas e midias por IndexedDB. */
(()=>{
'use strict';
const app=window.RPG_DEMO, v3=window.RPGv3, v2=window.RPGv2, screen=document.getElementById('screen-canvas');
if(!app||!v3||!v2||!screen)return;
const $=s=>document.querySelector(s);
const key='mastermind42-canvas-index',prefix='mastermind42-board-',dbName='mastermind42-media';
const clone=v=>JSON.parse(JSON.stringify(v));
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=s=>app.notify?.(s);
const uuid=()=>window.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
const colors=['#c7a87b','#ec6969','#61a5f8','#60c5aa','#ba91ff','#f18fbd'];
const goodColor=c=>/^#[\da-f]{6}$/i.test(c)?c:colors[0];
const mediaUrls=new Map();
let busyMedia=false,linkMode=false,linkStart=null,selectedColor=colors[0],index=null,active=null;
let raf=0;

function metaSave(){try{localStorage.setItem(key,JSON.stringify(index));return true}catch(e){notify('Sem espaco para salvar a lista de Canvas.');return false}}
function boardKey(id){return prefix+id}
function currentMonsters(){return v2.connected?clone(readBoard(active.id).monsters):clone(v3.monsters||[])}
function boardSnapshot(){
 return {version:1,nodes:clone(app.S.nodes||[]),monsters:currentMonsters(),
  links:clone(active?.links||[]),view:{panX:app.S.panX,panY:app.S.panY,zoom:app.S.zoom}};
}
function saveBoard(){
 if(!active||!index)return false;
 const b=boardSnapshot();
 try{localStorage.setItem(boardKey(active.id),JSON.stringify(b));return true}
 catch(e){notify('O Canvas esta sem espaco. Remova anexos grandes antes de continuar.');return false}
}
function readBoard(id){
 try{const b=JSON.parse(localStorage.getItem(boardKey(id))||'null');
  if(b&&Array.isArray(b.nodes))return {nodes:b.nodes,monsters:Array.isArray(b.monsters)?b.monsters:[],
   links:Array.isArray(b.links)?b.links.filter(x=>x&&x.a&&x.b):[],view:b.view||{}}}
 catch(e){}
 return {nodes:[],monsters:[],links:[],view:{}};
}
function bootIndex(){
 try{index=JSON.parse(localStorage.getItem(key)||'null')}catch(e){}
 if(!index||!Array.isArray(index.boards)||!index.boards.length){
  const id=uuid();
  index={version:1,activeId:id,boards:[{id,campaign:'Campanha principal',name:'Canvas principal'}]};
  active={id,links:[]};
  // Preserva sem substituir o Canvas da versao anterior e suas criaturas ja salvas.
  saveBoard();metaSave();
 }else{
  index.boards=index.boards.filter(b=>b?.id&&typeof b.name==='string').slice(0,100);
  if(!index.boards.length){localStorage.removeItem(key);return bootIndex()}
  if(!index.boards.some(b=>b.id===index.activeId))index.activeId=index.boards[0].id;
  active={id:index.activeId,links:[]};
  const saved=readBoard(active.id);active.links=saved.links;
  app.S.nodes=saved.nodes;
  app.S.panX=Number.isFinite(saved.view.panX)?saved.view.panX:0;
  app.S.panY=Number.isFinite(saved.view.panY)?saved.view.panY:0;
  app.S.zoom=Math.max(.2,Math.min(3,Number(saved.view.zoom)||1));
  if(!v2.connected)v3.ingest({encounter:saved.monsters});
  app.renderCanvas();
 }
}
function boardNames(){return index.boards.map(b=>({id:b.id,name:b.name,campaign:b.campaign}))}
function activeName(){return index.boards.find(b=>b.id===index.activeId)||index.boards[0]}
function restoreBoard(id){
 const b=readBoard(id);active={id,links:b.links};
 app.S.nodes=b.nodes;
 app.S.panX=Number.isFinite(b.view.panX)?b.view.panX:0;
 app.S.panY=Number.isFinite(b.view.panY)?b.view.panY:0;
 app.S.zoom=Math.max(.2,Math.min(3,Number(b.view.zoom)||1));
 if(!v2.connected)v3.ingest({encounter:b.monsters});
 app.renderCanvas();
}
function switchBoard(id){
 if(id===index.activeId)return true;
 if(!index.boards.some(b=>b.id===id))return false;
 if(!saveBoard())return false;
 releaseMedia();
 index.activeId=id;metaSave();restoreBoard(id);
 linkMode=false;linkStart=null;refreshUI();
 return true;
}
function addBoard(){
 if(index.boards.length>=100){notify('Limite de 100 Canvas por dispositivo.');return}
 const campaign=window.prompt('Nome da campanha','Nova campanha');
 if(campaign===null)return;
 const name=window.prompt('Nome do Canvas','Mapa de investigacao');
 if(name===null)return;
 if(!saveBoard())return;
 const id=uuid(),meta={id,campaign:campaign.trim().slice(0,70)||'Campanha',name:name.trim().slice(0,70)||'Novo Canvas'};
 try{localStorage.setItem(boardKey(id),JSON.stringify({version:1,nodes:[],monsters:[],links:[],view:{panX:0,panY:0,zoom:1}}))}
 catch(e){notify('Nao foi possivel criar o Canvas: armazenamento cheio.');return}
 index.boards.push(meta);index.activeId=id;
 metaSave();releaseMedia();restoreBoard(id);linkMode=false;linkStart=null;refreshUI();
 notify('Novo Canvas criado para '+meta.campaign+'.');
}
function duplicateBoard(){
 if(index.boards.length>=100)return notify('Limite de Canvas atingido.');
 if(!saveBoard())return;
 const old=activeName(),id=uuid();
 try{localStorage.setItem(boardKey(id),localStorage.getItem(boardKey(active.id))||'')}
 catch(e){notify('Sem espaco para duplicar o Canvas.');return}
 index.boards.push({id,campaign:old.campaign,name:(old.name+' (copia)').slice(0,70)});
 index.activeId=id;metaSave();restoreBoard(id);refreshUI();notify('Canvas duplicado.');
}
function renameBoard(){
 const old=activeName(),campaign=window.prompt('Campanha',old.campaign);
 if(campaign===null)return;
 const name=window.prompt('Nome do Canvas',old.name);
 if(name===null)return;
 old.campaign=campaign.trim().slice(0,70)||old.campaign;
 old.name=name.trim().slice(0,70)||old.name;
 metaSave();refreshUI();
}
function deleteBoard(){
 if(index.boards.length===1)return notify('Mantenha ao menos um Canvas.');
 const old=activeName();
 if(!window.confirm('Excluir '+old.name+' da campanha '+old.campaign+'? Esta acao nao pode ser desfeita.'))return;
 const oldId=old.id;
 const next=index.boards.find(b=>b.id!==oldId);
 index.boards=index.boards.filter(b=>b.id!==oldId);
 index.activeId=next.id;metaSave();
 localStorage.removeItem(boardKey(oldId));
 releaseMedia();restoreBoard(next.id);linkMode=false;linkStart=null;refreshUI();
}
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('Armazenamento de midia indisponivel'));
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Falha no armazenamento'));
 });
}
async function putMedia(record){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('files','readwrite');
  tx.objectStore('files').put(record);
  tx.oncomplete=()=>resolve(true);
  tx.onerror=()=>reject(tx.error||Error('Nao foi possivel salvar midia'));
  tx.onabort=()=>reject(tx.error||Error('Espaco insuficiente para arquivo'));
 })}finally{db.close()}
}
async function getMedia(id){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('files','readonly'),req=tx.objectStore('files').get(id);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error);
 })}finally{db.close()}
}
async function removeMedia(id){
 const db=await openDB();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
 })}finally{db.close()}
}
function releaseMedia(){for(const url of mediaUrls.values())URL.revokeObjectURL(url);mediaUrls.clear()}
function safeMediaType(file){return /^(audio|video)\/[a-z0-9.+-]+$/i.test(file.type||'')}
async function attachMedia(files){
 if(busyMedia)return notify('Aguarde o anexo anterior.');
 busyMedia=true;
 try{
  for(const file of files){
   const audio=file.type.startsWith('audio/'),limit=audio?25*1024*1024:75*1024*1024;
   if(!safeMediaType(file)||file.size<=0||file.size>limit){
    notify('Use audio ate 25 MB ou video ate 75 MB. MP3 e MP4 sao recomendados.');continue;
   }
   if(app.S.nodes.length>=500){notify('O Canvas atingiu 500 itens.');break}
   const id=uuid(),rect=$('#canvas-viewport').getBoundingClientRect();
   const node={id:Date.now()+Math.random(),title:file.name.slice(0,110),
    type:audio?'ÁUDIO':'VÍDEO',text:'',mediaId:id,mediaKind:audio?'audio':'video',width:340,
    left:(rect.width*.5-app.S.panX)/app.S.zoom-140,
    top:(rect.height*.42-app.S.panY)/app.S.zoom-90,theme:''};
   try{
    await putMedia({id,blob:file,name:file.name,type:file.type});
    app.S.nodes.push(node);
    if(!saveBoard()){
      app.S.nodes.pop();await removeMedia(id);continue;
    }
    app.renderCanvas();notify('Midia adicionada a '+activeName().name+'.');
   }catch(err){notify('Nao foi possivel guardar este arquivo no dispositivo: '+(err.message||'erro'))}
  }
 }finally{busyMedia=false}
}
async function decorateMedia(){
 for(const el of $('#node-layer').querySelectorAll('[data-node]')){
  const node=app.S.nodes.find(n=>String(n.id)===el.dataset.node);
  if(!node?.mediaId||!['audio','video'].includes(node.mediaKind))continue;
  el.classList.add('mm42-media-node');
  el.style.width=Math.min(700,Math.max(240,Number(node.width)||340))+'px';
  const host=document.createElement('div');host.className='mm42-media-host';
  host.textContent='Carregando '+(node.mediaKind==='audio'?'audio':'video')+'...';
  const footer=el.querySelector('.node-footer');
  if(footer)footer.before(host);else el.append(host);
  try{
   const record=await getMedia(node.mediaId);
   if(!el.isConnected||String(node.id)!==el.dataset.node)return;
   if(!record?.blob){host.textContent='Arquivo nao encontrado neste aparelho.';continue}
   const url=URL.createObjectURL(record.blob);
   mediaUrls.set(node.mediaId,url);
   const media=document.createElement(node.mediaKind==='audio'?'audio':'video');
   media.controls=true;media.preload='metadata';media.src=url;
   if(node.mediaKind==='video')media.setAttribute('playsinline','');
   media.addEventListener('pointerdown',e=>e.stopPropagation());
   media.addEventListener('click',e=>e.stopPropagation());
   host.replaceChildren(media);
  }catch(e){host.textContent='Arquivo indisponivel no armazenamento local.'}
 }
}

const oldRender=app.renderCanvas.bind(app),oldSpawn=v3.spawnCatalog.bind(v3),oldCommand=v3.localCommand.bind(v3);
app.renderCanvas=function(){releaseMedia();oldRender();void decorateMedia();scheduleLinks()};
v2.saveCanvas=function(){return saveBoard()};
v3.spawnCatalog=function(r){const ok=oldSpawn(r);if(ok){saveBoard();scheduleLinks();refreshMaster()}return ok};
v3.localCommand=function(action,args){const value=oldCommand(action,args);if(action.startsWith('encounter_')){saveBoard();scheduleLinks();refreshMaster()}return value};
// Objetos sao vinculados por IDs locais estaveis, nao por posicao na lista.
function getTarget(ev){
 const el=ev.target.closest?.('#node-layer [data-node],#encounter-layer .encounter-token');
 if(!el)return null;
 return el.matches('.encounter-token')?'creature:'+el.dataset.id:'node:'+el.dataset.node;
}
function labelTarget(id){
 const [kind,...rest]=String(id).split(':'),key=rest.join(':');
 if(kind==='node')return app.S.nodes.find(n=>String(n.id)===key)?.title||'Cartao ausente';
 if(kind==='creature')return v3.monsters.find(m=>String(m.id)===key)?.name||'Criatura ausente';
 return 'Referencia ausente';
}
function midpoint(id){
 const [kind,...rest]=String(id).split(':'),key=rest.join(':');
 if(kind==='node'){
  const item=app.S.nodes.find(n=>String(n.id)===key);
  if(!item)return null;
  const el=[...$('#node-layer').querySelectorAll('[data-node]')].find(e=>e.dataset.node===key);
  return {x:Number(item.left)+(el?.offsetWidth||Number(item.width)||240)/2,
   y:Number(item.top)+(el?.offsetHeight||130)/2};
 }
 if(kind==='creature'){
  const m=v3.monsters.find(n=>String(n.id)===key);
  if(!m)return null;
  const el=[...$('#encounter-layer').querySelectorAll('.encounter-token')].find(e=>e.dataset.id===key);
  return {x:Number(m.x)+(el?.offsetWidth||245)/2,y:Number(m.y)+(el?.offsetHeight||145)/2};
 }
 return null;
}
function scheduleLinks(){
 if(raf)return;
 raf=requestAnimationFrame(()=>{raf=0;renderLines()});
}
const lineSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
lineSvg.id='mm42-edges';lineSvg.setAttribute('viewBox','-15000 -15000 30000 30000');
lineSvg.setAttribute('aria-label','Conexoes coloridas do Canvas');
$('#canvas-lines').after(lineSvg);
function renderLines(){
 const ns='http://www.w3.org/2000/svg';
 const out=document.createDocumentFragment();
 for(const edge of active?.links||[]){
  const a=midpoint(edge.a),b=midpoint(edge.b);
  if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
  const path=document.createElementNS(ns,'path');
  const bend=Math.min(160,Math.max(40,Math.abs(b.x-a.x)*.33));
  path.setAttribute('d','M '+a.x+' '+a.y+' C '+(a.x+bend)+' '+a.y+' '+(b.x-bend)+' '+b.y+' '+b.x+' '+b.y);
  path.setAttribute('stroke',goodColor(edge.color));
  path.setAttribute('stroke-width','3.5');
  path.setAttribute('fill','none');
  path.setAttribute('stroke-linecap','round');
  path.setAttribute('opacity','.92');
  out.append(path);
 }
 lineSvg.replaceChildren(out);
}
function pickTarget(ref){
 if(!linkStart){linkStart=ref;setLinkStatus('Primeiro item: '+labelTarget(ref)+'. Selecione o segundo.');return}
 if(linkStart===ref){setLinkStatus('Selecione um item diferente.');return}
 if((active.links||[]).length>=600){setLinkStatus('Limite de 600 conexoes neste Canvas.');return}
 const same=active.links.some(l=>(l.a===linkStart&&l.b===ref)||(l.b===linkStart&&l.a===ref));
 if(same){setLinkStatus('Estes itens ja estao conectados.');linkStart=null;return}
 active.links.push({id:uuid(),a:linkStart,b:ref,color:selectedColor});
 linkStart=null;saveBoard();scheduleLinks();renderLinkList();refreshMaster();
 setLinkStatus('Conexao adicionada. Continue tocando nos itens para criar outros links.');
}
const world=$('#canvas-world');
world.addEventListener('pointerdown',e=>{
 if(!linkMode)return;
 const ref=getTarget(e);
 if(!ref)return;
 e.preventDefault();e.stopImmediatePropagation();pickTarget(ref);
},true);
world.addEventListener('click',e=>{
 if(!linkMode||!getTarget(e))return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.detail===0)pickTarget(getTarget(e));
},true);
const watcher=new MutationObserver(scheduleLinks);
let monsterSaveTimer=null;
new MutationObserver(()=>{
 if(v2.connected)return;
 clearTimeout(monsterSaveTimer);
 monsterSaveTimer=setTimeout(()=>{if(active&&index)saveBoard()},180);
}).observe($('#encounter-layer'),{childList:true,subtree:false});
for(const layer of ['#node-layer','#encounter-layer']){
 const el=$(layer);
 if(el)watcher.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
}
function setLinkStatus(t){const el=$('#mm42-link-status');if(el)el.textContent=t}
function renderLinkList(){
 const list=$('#mm42-link-list');if(!list)return;
 list.innerHTML=active.links.length?active.links.map(l=>
 '<div class="mm42-link-item"><span class="mm42-link-dot" style="background:'+goodColor(l.color)+'"></span>'+
 '<span>'+escape(labelTarget(l.a))+' ↔ '+escape(labelTarget(l.b))+'</span>'+
 '<button type="button" data-unlink="'+escape(l.id)+'" aria-label="Remover conexao">×</button></div>').join(''):
 '<small>Nenhuma conexao ainda. Selecione uma cor e use Conectar itens.</small>';
}
function previewMap(){
 const objects=[...app.S.nodes.map(n=>({id:'node:'+n.id,x:Number(n.left)+120,y:Number(n.top)+65,
  label:n.title||'Cartao',kind:'node'})),
  ...v3.monsters.map(m=>({id:'creature:'+m.id,x:Number(m.x)+110,y:Number(m.y)+65,
  label:m.name||'Criatura',kind:'creature'}))].filter(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)).slice(0,60);
 if(!objects.length)return '<div class="mm42-mini-empty">Canvas vazio. Abra o quadro e adicione pistas, midias ou criaturas.</div>';
 const minX=Math.min(...objects.map(o=>o.x)),maxX=Math.max(...objects.map(o=>o.x));
 const minY=Math.min(...objects.map(o=>o.y)),maxY=Math.max(...objects.map(o=>o.y));
 const spanX=Math.max(380,maxX-minX),spanY=Math.max(180,maxY-minY),width=640,height=225;
 const scale=Math.min((width-75)/spanX,(height-55)/spanY,1.5);
 const map=new Map(objects.map(o=>[o.id,{...o,px:38+(o.x-minX)*scale,py:25+(o.y-minY)*scale}]));
 const paths=active.links.map(e=>{const a=map.get(e.a),b=map.get(e.b);if(!a||!b)return '';
  return '<path d="M'+a.px+' '+a.py+' L'+b.px+' '+b.py+'" stroke="'+goodColor(e.color)+'" stroke-width="3" opacity=".9"/>'}).join('');
 const pins=objects.map(o=>{const p=map.get(o.id),label=escape(o.label.slice(0,16));
  return '<g transform="translate('+p.px+' '+p.py+')">'+
   '<circle r="8" fill="'+(o.kind==='creature'?'#e1848a':'#b99b72')+'" stroke="#17151d" stroke-width="2"/>'+
   '<text x="11" y="3" fill="currentColor" font-size="10">'+label+'</text></g>'}).join('');
 return '<svg class="mm42-mini-map" viewBox="0 0 640 225" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mapa resumido das conexoes do Canvas">'+paths+pins+'</svg>';
}
function refreshMaster(){
 const sel=$('#mm42-master-select'),details=$('#mm42-master-detail');
 if(!sel||!details||!index)return;
 const previous=sel.value;
 sel.innerHTML=boardNames().map(b=>'<option value="'+escape(b.id)+'">'+escape(b.campaign)+' / '+escape(b.name)+'</option>').join('');
 sel.value=index.activeId;
 const nodes=app.S.nodes||[],monsters=v3.monsters||[],links=active.links||[];
 const entries=nodes.slice(0,7).map(n=>'<span>'+escape(n.title)+'</span>');
 const creatures=monsters.slice(0,5).map(m=>'<span>'+escape(m.name)+'</span>');
 const colored=links.slice(0,12).map(l=>'<i style="background:'+goodColor(l.color)+'"></i>').join('');
 details.innerHTML='<strong>'+escape(activeName().name)+'</strong>'+
 '<p>'+nodes.length+' cartoes/imagens/midias · '+monsters.length+' criaturas · '+links.length+' conexoes</p>'+
 '<div class="mm42-master-preview">'+previewMap()+'</div>'+ 
 '<div class="mm42-master-chips">'+entries.join('')+creatures.join('')+'</div>'+
 '<div class="mm42-master-colors">'+colored+'</div>';
}
function refreshUI(){
 const select=$('#mm42-select');if(!select)return;
 select.innerHTML=boardNames().map(b=>'<option value="'+escape(b.id)+'">'+escape(b.campaign)+' / '+escape(b.name)+'</option>').join('');
 select.value=index.activeId;
 const tag=$('#mm42-board-name');if(tag)tag.textContent=activeName().campaign+' · '+activeName().name;
 renderLinkList();scheduleLinks();refreshMaster();
}
const boardBar=document.createElement('section');
boardBar.id='mm42-board-library';boardBar.className='mm42-board-bar';
boardBar.innerHTML='<div><span class="mm42-eyebrow">BIBLIOTECA DE CAMPANHAS</span><h3>Seus Canvas</h3>'+
 '<p>Salve quadros independentes para cada campanha.</p></div>'+
 '<div class="mm42-board-controls"><select id="mm42-select" aria-label="Selecionar Canvas"></select>'+
 '<div class="mm42-board-buttons"><button type="button" id="mm42-create">+ Novo Canvas</button>'+
 '<button type="button" id="mm42-rename">Renomear</button>'+
 '<button type="button" id="mm42-duplicate">Duplicar</button>'+
 '<button type="button" id="mm42-delete">Excluir</button></div></div>';
const moduleHeading=screen.querySelector('.mm39-module-heading');
if(moduleHeading)moduleHeading.after(boardBar);else screen.querySelector('.page-row')?.after(boardBar);
const addMedia=document.createElement('button');
addMedia.id='mm42-add-media';addMedia.className='btn-primary';addMedia.type='button';
addMedia.textContent='+ Anexar video/audio';
const picker=document.createElement('input');
picker.type='file';picker.id='mm42-media-picker';
picker.accept='audio/*,video/*';picker.multiple=true;picker.setAttribute('aria-label','Escolher video ou audio do dispositivo');
picker.style.cssText='position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
if(moduleHeading)moduleHeading.append(addMedia);
else screen.querySelector('#add-image')?.after(addMedia);
boardBar.after(picker);
addMedia.addEventListener('click',()=>picker.click());
picker.addEventListener('change',()=>{const files=[...picker.files];picker.value='';if(files.length)void attachMedia(files)});

const linkBar=document.createElement('div');linkBar.id='mm42-links';linkBar.className='mm42-link-panel';
linkBar.innerHTML='<div class="mm42-link-top"><div><strong>Ligações do Canvas</strong>'+
 '<small id="mm42-link-status">Conecte cartões, imagens, criaturas, áudios e vídeos.</small></div>'+
 '<div class="mm42-link-controls"><label>Cor <input type="color" id="mm42-color" value="'+selectedColor+'"></label>'+
 '<button type="button" id="mm42-link-toggle">Conectar itens</button></div></div>'+
 '<div id="mm42-presets">'+colors.map(c=>'<button type="button" data-mm42-color="'+c+'" style="background:'+c+'" aria-label="Cor '+c+'"></button>').join('')+'</div>'+
 '<div id="mm42-link-list"></div>';
$('#canvas-viewport').before(linkBar);
const master=document.querySelector('#screen-master');
if(master){
 const panel=document.createElement('section');panel.id='mm42-master-library';
 panel.className='mm42-master-panel';
 panel.innerHTML='<div class="mm42-master-head"><div><span class="mm42-eyebrow">MEStrAGEM / ORGANIZACAO</span>'+
 '<h3>Canvas da campanha</h3><p>Consulte suas pistas e relacoes sem alterar os turnos da mesa.</p></div>'+
 '<div class="mm42-master-controls"><select id="mm42-master-select" aria-label="Canvas da mesa ao vivo"></select>'+
 '<button type="button" id="mm42-master-open">Abrir Canvas completo ↗</button></div></div>'+
 '<div id="mm42-master-detail"></div>';
 const area=master.querySelector('.rpg-master-layout');
 if(area)area.before(panel);else master.append(panel);
 $('#mm42-master-select').addEventListener('change',e=>switchBoard(e.target.value));
 $('#mm42-master-open').addEventListener('click',()=>app.navigate('canvas'));
}
$('#mm42-select').addEventListener('change',e=>{if(!switchBoard(e.target.value))refreshUI()});
$('#mm42-create').addEventListener('click',addBoard);
$('#mm42-rename').addEventListener('click',renameBoard);
$('#mm42-duplicate').addEventListener('click',duplicateBoard);
$('#mm42-delete').addEventListener('click',deleteBoard);
$('#mm42-color').addEventListener('input',e=>{selectedColor=goodColor(e.target.value)});
$('#mm42-presets').addEventListener('click',e=>{
 const sw=e.target.closest('[data-mm42-color]');if(sw){selectedColor=goodColor(sw.dataset.mm42Color);$('#mm42-color').value=selectedColor}
});
$('#mm42-link-toggle').addEventListener('click',()=>{
 linkMode=!linkMode;linkStart=null;
 $('#mm42-link-toggle').classList.toggle('active',linkMode);
 $('#mm42-link-toggle').textContent=linkMode?'Concluir ligacoes':'Conectar itens';
 setLinkStatus(linkMode?'Toque em dois itens, em sequencia, para ligar.':'Modo de conexao desativado.');
});
$('#mm42-link-list').addEventListener('click',e=>{
 const btn=e.target.closest('[data-unlink]');
 if(!btn)return;active.links=active.links.filter(l=>l.id!==btn.dataset.unlink);
 saveBoard();renderLinkList();scheduleLinks();refreshMaster();
});
window.addEventListener('pagehide',()=>{saveBoard();releaseMedia()});
bootIndex();refreshUI();
// Mantenha o modelo de encontros independente da colecao de Canvas.
window.MastermindWorkspace={
 version:'0.42.0',get boards(){return boardNames()},get selectedId(){return index.activeId},
 get links(){return clone(active.links)},select:switchBoard,save:saveBoard,addMedia:attachMedia,
 get current(){return activeName()}
};
})();
