/* RPG Mesa 0.30: estúdio de cenários em tela cheia, mapa, tokens e névoa. */
(function(root){
'use strict';
const $=(q,r=document)=>r.querySelector(q);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>('s'+(crypto.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'')).slice(0,28);
function creatureRecords(system){
 const own=window.RPG18_BESTIARY?.listFor?.(system)||[];
 const originals=system==='ordem-paranormal'?(window.RPG19_ORDER_CREATURES||[]):system==='d-d'?[
 {id:'srd51-goblin',name:'Goblin',systemId:'d-d',hp:7,defense:15,attack:'1d20+4',damage:'1d6+2',source:'SRD 5.1'},
 {id:'srd51-wolf',name:'Lobo',systemId:'d-d',hp:11,defense:13,attack:'1d20+4',damage:'2d4+2',source:'SRD 5.1'},
 {id:'srd51-skeleton',name:'Esqueleto',systemId:'d-d',hp:13,defense:13,attack:'1d20+4',damage:'1d6+2',source:'SRD 5.1'}
 ]:[];
 const result=new Map();for(const item of originals.concat(own)){if(item?.id&&item?.name)result.set(item.id,item)}
 return [...result.values()];
}
const presets=[['map-ruins','Ruínas','map','🪨'],['map-forest','Floresta','map','🌲'],['map-cave','Caverna','map','🕯️'],['char-hero','Herói','character','🛡️'],['char-scout','Explorador','character','🧭'],['char-mage','Mago','character','🪄'],['mob-wolf','Lobo','creature','🐺'],['mob-golem','Construto','creature','🗿'],['mob-shadow','Sombra','creature','👁️'],['item-chest','Baú','item','🧰'],['item-key','Chave','item','🗝️'],['item-door','Porta','object','🚪'],["map-dungeon","Masmorra","map","🧱"],["map-town","Cidade","map","🏘️"],["map-tavern","Taverna","map","🍻"],["map-desert","Deserto","map","🏜️"],["map-snow","Neve","map","❄️"],["map-swamp","Pântano","map","🪷"],["map-temple","Templo","map","⛩️"],["map-castle","Castelo","map","🏰"],["char-warrior","Guerreiro","character","⚔️"],["char-archer","Arqueira","character","🏹"],["char-rogue","Ladino","character","🗡️"],["char-cleric","Clériga","character","✨"],["mob-goblin","Goblin","creature","👺"],["mob-orc","Orc","creature","👹"],["mob-slime","Lodo","creature","🟢"],["mob-skeleton","Esqueleto","creature","🩻"],["mob-spider","Aranha","creature","🕷️"],["item-potion","Poção","item","🧪"],["item-scroll","Pergaminho","item","📜"],["item-torch","Tocha","item","🔥"],["item-crystal","Cristal","item","💎"],["obj-tree","Árvore","object","🌳"],["obj-rock","Rocha","object","🪨"],["obj-pillar","Pilar","object","🗿"],["obj-wall","Muro","object","🧱"],["obj-table","Mesa","object","🪑"],["obj-barrel","Barril","object","🛢️"],["obj-stairs","Escada","object","🪜"]].map(([id,name,kind,emoji])=>({id,name,kind,emoji,image:''}));
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=location.protocol==='file:'?'rpg30_studio.css':'/scene-editor.css';document.head.appendChild(stylesheet);
let current=null;
function close(force=false){
 const s=current;if(!s)return;
 if(s.dirty&&!force&&!confirm('Há mudanças que ainda não foram salvas. Sair do estúdio?'))return;
 current=null;s.root.remove();s.host.hidden=true;document.body.style.overflow=s.priorOverflow;
 try{root.RpgSceneDisplay?.setLandscape(false)}catch(_){}
 s.host.dispatchEvent(new CustomEvent('rpg29:closed',{bubbles:true}));
}
function open(host,opts){
 if(current)close();
 if(current)return Promise.resolve();
 const s={root:document.createElement('section'),host,opts,scenes:[],assets:[],active:'',selected:'',picked:'char-hero',
  category:'all',assetSearch:'',paintPack:'Todos',paintLayer:'terrain',paintAsset:'stone',brushSize:1,visibleLayers:{terrain:true,props:true,walls:true},undoByScene:new Map(),redoByScene:new Map(),importKind:'map',fogStyle:'shadow',creatureSystem:'ordem-paranormal',creatureSearch:'',creatureSelection:null,tool:'pan',token:'',showGrid:true,aside:true,dirty:false,
  scale:1,x:25,y:25,view:null,world:null,gesture:null,pointers:new Map(),pinch:null,priorOverflow:document.body.style.overflow};
 current=s;host.hidden=false;s.root.className='r30-studio';s.root.setAttribute('role','dialog');s.root.setAttribute('aria-label','Estúdio de cenários');
 document.body.appendChild(s.root);document.body.style.overflow='hidden';
 try{root.RpgSceneDisplay?.setLandscape(true)}catch(_){}
 const getScene=()=>s.scenes.find(m=>m.id===s.selected);
 const getAsset=id=>s.assets.find(a=>a.id===id);
 function creatureChoices(){
  const list=$('#r31-creature-list',s.root);if(!list)return;
  const search=s.creatureSearch.toLocaleLowerCase('pt-BR');
  const monsters=creatureRecords(s.creatureSystem).filter(a=>a.name.toLocaleLowerCase('pt-BR').includes(search));
  const sheets=(opts.characters||[]).filter(ch=>(ch.sheet?.systemId||'ordem-paranormal')===s.creatureSystem&&
    (ch.sheet?.name||'').toLocaleLowerCase('pt-BR').includes(search));
  list.innerHTML='<small>'+monsters.length+' criaturas • '+sheets.length+' fichas</small>'+
   monsters.slice(0,160).map(a=>'<button data-r31-creature="'+esc(a.id)+'">👁 '+esc(a.name)+'</button>').join('')+
   sheets.map(a=>'<button data-r31-sheet="'+esc(a.id)+'">👤 '+esc(a.sheet.name)+'</button>').join('');
 }
 function chooseTokenAsset(record,isCreature){
  const kind=isCreature?'creature':'character',name=String(record.name||record.sheet?.name||'Personagem').slice(0,70);
  let savedArt={};
  try{savedArt=JSON.parse(localStorage.getItem('rpg19-monster-art-v1')||'{}')}catch(_){}
  let image=isCreature?savedArt[s.creatureSystem+'::'+record.id]||'':record.sheet?.portrait||record.sheet?.photo||'';
  if(typeof image!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(image)||image.length>180000)image='';
  const asset={id:uid(),name,kind,emoji:isCreature?'👁':'👤',image};
  s.assets.push(asset);s.picked=asset.id;s.category=kind;
  if(isCreature){
   const hp=Math.max(1,Math.min(100000,Math.round(Number(record.hp)||1)));
   s.creatureSelection={assetId:asset.id,name,kind,systemId:s.creatureSystem,
     creatureId:String(record.id).slice(0,48),hp,maxHp:hp,defense:Math.max(0,Math.min(1000,Math.round(Number(record.defense)||0))),
     attacks:Array.isArray(record.attacks)?record.attacks.slice(0,25).map(a=>({name:String(a.name||'Ataque').slice(0,70),test:String(a.test||'').slice(0,60),damage:String(a.damage||'').slice(0,60)})):[],
     attack:String(record.attack||'').slice(0,60),damage:String(record.damage||'').slice(0,60),
     source:String(record.source||'').slice(0,150),notes:String(record.notes||'').slice(0,2000),
     powers:String(record.powers||'').slice(0,1000)};
  }else{
   const owner=(opts.players||[]).find(p=>p.characterId===record.id);
   s.creatureSelection={assetId:asset.id,name,kind,ownerPlayerId:owner?.id||'',characterId:owner?.characterId||''};
  }
  s.tool='token';change();render(false);signal(name+' selecionado. Toque sobre o grid para colocar.');
 }
 const signal=t=>{const target=$('#r30-message',s.root);if(target)target.textContent=t};
 function change(){s.dirty=true;const tag=$('#r30-state',s.root);if(tag)tag.textContent='● Não salvo'}
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.floor(n)));
 function dimensions(p,q,m){
  const minX=clamp(Math.floor(Math.min(p.x,q.x)/48),0,m.width-1),minY=clamp(Math.floor(Math.min(p.y,q.y)/48),0,m.height-1);
  const maxX=clamp(Math.floor(Math.max(p.x,q.x)/48),0,m.width-1),maxY=clamp(Math.floor(Math.max(p.y,q.y)/48),0,m.height-1);
  return {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
 }
 function cells(p,m){return {x:clamp(p.x/48,0,m.width-1),y:clamp(p.y/48,0,m.height-1)}}
 function coords(event){
  const r=s.view.getBoundingClientRect();
  return {x:(event.clientX-r.left-s.x)/s.scale,y:(event.clientY-r.top-s.y)/s.scale};
 }
 function updateTransform(){
  if(s.world)s.world.style.transform='translate('+s.x+'px,'+s.y+'px) scale('+s.scale+')';
  const z=$('#r30-zoom',s.root);if(z)z.textContent=Math.round(s.scale*100)+'%';
 }
 function fit(){
  const m=getScene(),v=s.view;if(!v||!m)return;
  s.scale=Math.max(.13,Math.min(2,(v.clientWidth-28)/(m.width*48),(v.clientHeight-28)/(m.height*48)));
  s.x=(v.clientWidth-m.width*48*s.scale)/2;s.y=(v.clientHeight-m.height*48*s.scale)/2;updateTransform();
 }
 function zoom(factor,cx,cy){
  const v=s.view;if(!v)return;
  cx=Number.isFinite(cx)?cx:v.clientWidth/2;cy=Number.isFinite(cy)?cy:v.clientHeight/2;
  const next=Math.max(.12,Math.min(3,s.scale*factor)),ratio=next/s.scale;
  s.x=cx-(cx-s.x)*ratio;s.y=cy-(cy-s.y)*ratio;s.scale=next;updateTransform();
 }

 const paintEngine=root.Mastermind68Map;
 const snap=()=>paintEngine?.saveSnapshot(getScene());
 function checkpoint(){
  const m=getScene();if(!m||!paintEngine)return;
  const list=s.undoByScene.get(m.id)||[],old=snap();
  if(old&&list[list.length-1]!==old)list.push(old);
  if(list.length>24)list.shift();s.undoByScene.set(m.id,list);s.redoByScene.set(m.id,[]);
 }
 function restoreStep(redo=false){
  const m=getScene();if(!m||!paintEngine)return;
  const from=(redo?s.redoByScene:s.undoByScene).get(m.id)||[];
  if(!from.length){signal('Sem alteração para '+(redo?'refazer.':'desfazer.'));return}
  const to=(redo?s.undoByScene:s.redoByScene).get(m.id)||[];
  to.push(snap());if(to.length>24)to.shift();
  (redo?s.undoByScene:s.redoByScene).set(m.id,to);
  paintEngine.restore(m,from.pop());change();mapPaintRefresh();
 }
 function paintPalette(){
  const target=$('#r68-palette',s.root);if(!target||!paintEngine)return;
  const q=(s.assetSearch||'').toLocaleLowerCase('pt-BR');
  const list=paintEngine.palette.filter(x=>x.layer===s.paintLayer&&(s.paintPack==='Todos'||s.paintPack===x.pack)&&(!q||x.name.toLocaleLowerCase('pt-BR').includes(q)));
  target.innerHTML=list.map(x=>'<button type="button" data-r68-asset="'+esc(x.id)+'" title="'+esc(x.name)+'" class="'+(s.paintAsset===x.id?'active':'')+'">'+paintEngine.glyph(x.id)+'<small>'+esc(x.name)+'</small></button>').join('')||'<small>Nenhum asset encontrado.</small>';
 }
 function mapPaintRefresh(){map();paintPalette()}
 function paintAt(point,first=false){
  const m=getScene(),M=paintEngine;if(!m||!M)return false;
  const x=Math.floor(point.x/48),y=Math.floor(point.y/48);
  if(x<0||y<0||x>=m.width||y>=m.height)return false;
  if(first)checkpoint();
  let applied=false;
  if(s.tool==='paint')applied=M.paint(m,s.paintLayer,s.paintAsset,x,y,s.brushSize);
  else if(s.tool==='wall'||s.tool==='door'){const edge=M.edgeFromPoint(point.x,point.y);applied=M.wall(m,s.tool,edge.x,edge.y,edge.side)}
  else if(s.tool==='erase-paint')applied=M.erase(m,s.paintLayer,x,y,s.brushSize);
  if(applied){change();mapPaintRefresh()}
  return applied;
 }
 function tile(a){return a?.image?'<img alt="" src="'+esc(a.image)+'">':'<span class="emoji">'+esc(a?.emoji||'✧')+'</span>'}
 function map(){
  const m=getScene();s.view=$('#r30-view',s.root);s.world=$('#r30-world',s.root);if(!m||!s.world)return;
  s.world.dataset.theme=m.theme||'stone';s.world.style.width=(m.width*48)+'px';s.world.style.height=(m.height*48)+'px';
  let html='',bg=getAsset(m.backgroundAssetId);
  if(bg?.image)html+='<img class="r30-bg" alt="" src="'+esc(bg.image)+'">';
  if(paintEngine&&s.visibleLayers.terrain)html+=paintEngine.renderLayer(m,'terrain',48);
  if(paintEngine&&s.visibleLayers.props)html+=paintEngine.renderLayer(m,'props',48);
  if(s.showGrid)html+='<div class="r30-grid"></div>';
  if(paintEngine&&s.visibleLayers.walls)html+=paintEngine.renderLayer(m,'walls',48);
  html+=m.rooms.map(r=>'<div class="r30-room r35-fog-'+esc(r.fogStyle||'shadow')+' '+(r.shape==='circle'?'circle ':'')+(r.hidden?'hidden':'')+'" style="left:'+(r.x*48)+'px;top:'+(r.y*48)+'px;width:'+(r.w*48)+'px;height:'+(r.h*48)+'px">'+esc(r.name)+'</div>').join('');
  html+=m.tokens.map(t=>'<div class="r30-token '+(t.id===s.token?'selected':'')+'" data-r30-token="'+esc(t.id)+'" style="left:'+(t.x*48+1)+'px;top:'+(t.y*48+1)+'px">'+tile(getAsset(t.assetId))+'<small>'+esc(t.name)+'</small></div>').join('');
  html+='<div id="r30-preview" class="r30-preview" hidden></div>';
  s.world.innerHTML=html;updateTransform();
 }
 function library(){
  const target=$('#r30-assets',s.root);if(!target)return;
  const q=(s.assetSearch||'').toLocaleLowerCase('pt-BR');
  target.innerHTML=s.assets.filter(a=>(s.category==='all'||a.kind===s.category)&&(!q||a.name.toLocaleLowerCase('pt-BR').includes(q))).map(a=>
   '<button data-r30-asset="'+esc(a.id)+'" title="'+esc(a.name)+'" class="'+(s.picked===a.id?'active':'')+'">'+tile(a)+'<small>'+esc(a.name)+'</small></button>').join('');
 }
 function details(){
  const target=$('#r30-details',s.root),m=getScene();if(!target||!m)return;
  const t=m.tokens.find(t=>t.id===s.token);
  let html='<h3>Mapa atual</h3><label>Nome<input data-r68-map-name maxlength="80" value="'+esc(m.name)+'"></label><div class="r30-line"><button data-r30="duplicate">Duplicar mapa</button><button data-r30="clear-layers">Limpar desenhos</button></div><h3>Selecionado</h3>';
  if(t){
   html+='<label>Nome<input data-r30-change="name" maxlength="70" value="'+esc(t.name)+'"></label>'+
     (t.kind==='creature'?'<h3>Ficha: '+esc(t.systemId||'')+'</h3><p>PV '+t.hp+'/'+t.maxHp+' · Defesa '+t.defense+'</p>'+
        (t.attacks||[]).map(a=>'<small>'+esc(a.name)+' — '+esc(a.test||'')+' — '+esc(a.damage||'')+'</small>').join('')+
        '<div class="r30-line"><button data-r31-hp="-1">−1 PV</button><button data-r31-hp="1">+1 PV</button></div>':'')+
     '<label>Jogador que controla<select data-r30-change="owner"><option value="">Somente mestre</option>'+
     (t.kind==='character'?(opts.players||[]).filter(p=>p.characterId).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===t.ownerPlayerId?'selected':'')+'>'+esc(p.nickname)+'</option>').join(''):'')+'</select></label>'+
     '<label><input data-r30-change="hidden" type="checkbox" '+(t.hidden?'checked':'')+'> Token oculto</label><button data-r30="delete-token" class="danger">Excluir token</button>';
  }else html+='<p>Selecione um token para renomeá-lo, ocultá-lo ou vincular uma ficha.</p>';
  html+='<h3>Áreas / salas ('+m.rooms.length+')</h3>'+
   '<label>Estilo das novas áreas<select id="r35-new-fog">'+
   [['shadow','Sombras listradas'],['dark','Escuridão'],['mist','Névoa densa'],['void','Escuro total']].map(([id,label])=>
    '<option value="'+id+'" '+(s.fogStyle===id?'selected':'')+'>'+label+'</option>').join('')+
   '</select></label>';
  html+=m.rooms.map(r=>'<div class="r30-line"><button data-r30-room="'+esc(r.id)+'">'+(r.hidden?'◼ Revelar':'◉ Ocultar')+' '+esc(r.name)+'</button>'+
   '<select aria-label="Efeito de ocultação da sala '+esc(r.name)+'" data-r35-room-fog="'+esc(r.id)+'">'+
   [['shadow','Sombras'],['dark','Escuridão'],['mist','Névoa'],['void','Escuro total']].map(([id,label])=>
    '<option value="'+id+'" '+((r.fogStyle||'shadow')===id?'selected':'')+'>'+label+'</option>').join('')+
   '</select><button data-r30-delroom="'+esc(r.id)+'" class="danger">×</button></div>').join('');
  if(!m.rooms.length)html+='<p>Selecione Retângulo ou Círculo e arraste para marcar uma área.</p>';
  const doorMarks=(m.layers?.walls||[]).filter(x=>x.kind==='door');
  html+='<h3>Portas ('+doorMarks.length+')</h3>'+
   (doorMarks.length?doorMarks.slice(0,40).map((door,i)=>'<div class="r30-line"><span>Porta '+(i+1)+' · ('+(door.x+1)+', '+(door.y+1)+')</span>'+
     '<button type="button" data-r68-door="'+door.x+':'+door.y+':'+door.side+'">'+(door.open?'Fechar':'Abrir')+'</button></div>').join(''):'<p>Use a ferramenta Porta e toque na borda de uma célula.</p>');
  target.innerHTML=html;
 }
 function render(shouldFit=false){
  const m=getScene(),scale=s.scale,ox=s.x,oy=s.y;
  s.root.innerHTML='<header class="r30-head"><strong class="r30-name">✦ Estúdio</strong><select id="r30-scenes" aria-label="Cenário">'+
   s.scenes.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===s.selected?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>'+
   '<button data-r30="new">＋ Cenário</button><button data-r30="settings">⚙ Mapa</button>'+
   '<small id="r30-state">'+(s.dirty?'● Não salvo':'✓ Salvo')+'</small><span class="r30-spacer"></span>'+
   '<button data-r30="assets">▣ Biblioteca</button><button data-r30="publish" class="'+(m&&m.id===s.active?'active':'')+'">'+(m&&m.id===s.active?'● Publicado':'Publicar')+'</button>'+
   '<button data-r30="save" class="primary">💾 Salvar</button><button data-r30="exit" class="danger">✕ Sair</button></header>'+
   '<div class="r30-body"><nav class="r30-toolbar" aria-label="Ferramentas">'+
   [['pan','✋','Navegar'],['paint','🖌','Pintar'],['wall','▦','Parede'],['door','🚪','Porta'],['erase-paint','⌫','Borracha'],['token','◉','Tokens'],['rect','▭','Retângulo'],['circle','◯','Círculo'],['erase','✕','Apagar token']].map(([id,ic,name])=>
   '<button data-r30-tool="'+id+'" title="'+name+'" class="'+(s.tool===id?'active':'')+'">'+ic+'</button><small>'+name+'</small>').join('')+
   '<button data-r30="zoom-in">＋</button><button data-r30="zoom-out">－</button><button data-r30="fit">⊡</button></nav>'+
   '<main id="r30-view" class="r30-view"><div id="r30-world" class="r30-world"></div></main>'+
   '<aside class="r30-side '+(s.aside?'':'folded')+'"><section class="r30-section"><h3>Biblioteca de assets</h3>'+
   '<select id="r30-category">'+[['all','Todos'],['map','Fundos'],['character','Personagens'],['creature','Criaturas'],['item','Itens'],['object','Objetos']].map(([k,n])=>'<option value="'+k+'" '+(k===s.category?'selected':'')+'>'+n+'</option>').join('')+'</select>'+
   '<div class="r30-assets" id="r30-assets"></div>'+
   '<section class="r68-paint-panel r30-section"><h3>Construtor de mapas</h3>'+
 '<div class="r68-actions"><button data-r30="undo" title="Desfazer desenho">↶ Desfazer</button><button data-r30="redo" title="Refazer desenho">↷ Refazer</button></div>'+
 '<label>Camada<select id="r68-layer">'+[['terrain','Terreno'],['props','Decoração'],['walls','Paredes / portas']].map(([k,n])=>'<option value="'+k+'"'+(s.paintLayer===k?' selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
 '<div class="r68-layer-vis">'+[['terrain','Terreno'],['props','Objetos'],['walls','Paredes']].map(([k,n])=>'<label><input type="checkbox" data-r68-visible="'+k+'"'+(s.visibleLayers[k]?' checked':'')+'>'+n+'</label>').join('')+'</div>'+
 '<label>Pacote de assets<select id="r68-pack">'+(paintEngine?.PACKS||['Todos']).map(n=>'<option value="'+esc(n)+'"'+(s.paintPack===n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>'+
 '<label>Pesquisar<input id="r68-search" value="'+esc(s.assetSearch)+'" placeholder="Pedra, água, árvore..."></label>'+
 '<label>Tamanho do pincel<select id="r68-brush">'+[1,2,3,4,5].map(n=>'<option value="'+n+'"'+(n===s.brushSize?' selected':'')+'>'+n+' × '+n+'</option>').join('')+'</select></label>'+
 '<div id="r68-palette" class="r68-palette"></div>'+
 '<p class="r68-caption">Arraste para pintar o terreno e a decoração. Paredes e portas encaixam na borda da célula. A borracha limpa a camada selecionada.</p></section>'+
   '<h3>Bestiário e fichas por sistema</h3><select id="r31-system">'+
   [...new Map([['ordem-paranormal','Ordem Paranormal'],['d-d','D&D 5e'],['gurps','GURPS']].concat((window.RPG15_SYSTEMS?.systems||[]).map(x=>[x.id,x.title||x.id])))].map(([id,name])=>
     '<option value="'+esc(id)+'" '+(s.creatureSystem===id?'selected':'')+'>'+esc(name)+'</option>').join('')+
   '</select><input id="r31-search" placeholder="Buscar no bestiário" value="'+esc(s.creatureSearch)+'">'+
   '<div id="r31-creature-list" class="r31-creature-list"></div>'+
   '<label>Importar PNG ou JPEG</label><select id="r30-import-kind">'+[['map','Fundo do mapa'],['character','Personagem'],['creature','Criatura'],['item','Item'],['object','Objeto']].map(([k,n])=>'<option value="'+k+'" '+(k===s.importKind?'selected':'')+'>'+n+'</option>').join('')+'</select>'+
   '<input id="r30-file" type="file" accept="image/png,image/jpeg,image/webp">'+
   '<p>A imagem é reduzida no aparelho antes de salvar. PNGs transparentes são aceitos como tokens.</p>'+
   '<label><input id="r30-gridcheck" type="checkbox" '+(s.showGrid?'checked':'')+'> Mostrar grade</label></section>'+
   '<section class="r30-section" id="r30-details"></section></aside></div>'+
   '<footer class="r30-foot"><span id="r30-zoom">100%</span><span>Arraste no mapa para desenhar ou mover</span><span id="r30-message">Toque em Salvar para publicar alterações.</span></footer>';
  s.view=$('#r30-view',s.root);s.world=$('#r30-world',s.root);
  s.scale=scale;s.x=ox;s.y=oy;library();paintPalette();creatureChoices();details();map();
  if(shouldFit)requestAnimationFrame(fit);
 }
 async function save(){
  await opts.request(opts.route+'/scenarios','POST',{scenarios:s.scenes,assets:s.assets,activeScenarioId:s.active});
  s.dirty=false;const el=$('#r30-state',s.root);if(el)el.textContent='✓ Salvo';signal('Salvo e sincronizado com a campanha.');
 }
 async function load(){
  const data=await opts.request(opts.route+'/scenarios');if(current!==s)return;
  s.scenes=data.scenarios||[];s.assets=presets.concat((data.assets||[]).filter(a=>!presets.some(x=>x.id===a.id)));
  if(!s.scenes.length)s.scenes=[{id:uid(),name:'Novo cenário',width:28,height:18,theme:'stone',backgroundAssetId:'',rooms:[],tokens:[]}];
  s.active=data.activeScenarioId||'';s.selected=s.scenes[0]?.id||'';render(true);
 }
 function upload(f){
  if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>15e6){signal('Escolha PNG/JPEG/WebP até 15 MB.');return}
  const objectUrl=URL.createObjectURL(f),im=new Image(),kind=s.importKind;
  im.onload=()=>{
   URL.revokeObjectURL(objectUrl);
   try{
    const max=kind==='map'?1700:370,ratio=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
    const cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(im.naturalWidth*ratio));cv.height=Math.max(1,Math.round(im.naturalHeight*ratio));
    const ctx=cv.getContext('2d');ctx.drawImage(im,0,0,cv.width,cv.height);
    const imageType=kind==='map'?'image/jpeg':'image/webp',limit=kind==='map'?860000:280000;
    let data='';
    for(const q of [.86,.74,.61,.48,.35]){
      data=cv.toDataURL(imageType,q);
      if(kind!=='map'&&!data.startsWith('data:image/webp'))data=cv.toDataURL('image/png');
      if(data.length<=limit)break;
    }
    if(data.length>limit)throw Error('Imagem muito grande após compressão. Reduza a resolução.');
    const a={id:uid(),name:f.name.replace(/\.[^.]+$/,'').slice(0,69)||'Imagem',kind,emoji:'✧',image:data};
    s.assets.push(a);s.picked=a.id;s.category=kind;
    if(kind==='map'&&getScene())getScene().backgroundAssetId=a.id;
    change();render(false);
    signal(kind==='map'?'Mapa de fundo aplicado. Salve a campanha.':'Token adicionado à biblioteca.');
   }catch(err){signal('Imagem: '+err.message)}
  };
  im.onerror=()=>{URL.revokeObjectURL(objectUrl);signal('Não foi possível ler a imagem.');};
  im.src=objectUrl;
 }
 function preview(area,shape){
  const el=$('#r30-preview',s.root);if(!el)return;
  el.hidden=false;el.classList.toggle('circle',shape==='circle');
  el.style.left=(area.x*48)+'px';el.style.top=(area.y*48)+'px';
  el.style.width=(area.w*48)+'px';el.style.height=(area.h*48)+'px';
 }
 function finish(e){
  const m=getScene(),g=s.gesture;s.gesture=null;if(!g||!m)return;
  const p=coords(e);
  if(g.kind==='shape'){
   if(m.rooms.length>=75){signal('Máximo de 75 áreas.');map();return}
   const area=dimensions(g.start,p,m),name=(g.shape==='circle'?'Círculo ':'Sala ')+(m.rooms.length+1);
   m.rooms.push({id:uid(),name,shape:g.shape,fogStyle:s.fogStyle,hidden:true,...area});change();render(false);signal(name+' criado, oculto aos jogadores.');
  }else if(g.kind==='token'){
   const t=m.tokens.find(x=>x.id===g.id);if(t){Object.assign(t,cells(p,m));s.token=t.id;change();render(false)}
  }
 }
 s.root.addEventListener('pointerdown',e=>{
  const viewport=e.target.closest('#r30-view'),m=getScene();if(!viewport||!m)return;
  const target=e.target.closest('[data-r30-token]');
  s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture(e.pointerId);e.preventDefault();
  if(s.pointers.size>1){s.gesture=null;return}
  const p=coords(e);
  if(target&&s.tool!=='pan'&&s.tool!=='erase'){
   s.token=target.dataset.r30Token;s.gesture={kind:'token',id:s.token};
   target.classList.add('selected');return;
  }
  if(['paint','wall','door','erase-paint'].includes(s.tool)){s.gesture={kind:'paint'};paintAt(p,true);return}
  if(s.tool==='pan'){s.gesture={kind:'pan',x:e.clientX,y:e.clientY,px:s.x,py:s.y};return}
  if(s.tool==='rect'||s.tool==='circle'){
   s.gesture={kind:'shape',shape:s.tool==='circle'?'circle':'rect',start:p};
   preview(dimensions(p,p,m),s.gesture.shape);return;
  }
  if(s.tool==='erase'){if(target){m.tokens=m.tokens.filter(x=>x.id!==target.dataset.r30Token);s.token='';change();render(false)}return}
  if(s.tool==='token'){
   const a=getAsset(s.picked);if(!a||a.kind==='map'){signal('Selecione um token na biblioteca.');return}
   if(m.tokens.length>=250){signal('Limite de tokens atingido.');return}
   const chosen=s.creatureSelection?.assetId===a.id?s.creatureSelection:a.kind==='creature'?{maxHp:1,hp:1,defense:0,attacks:[],systemId:s.creatureSystem}:{};
   const t={id:uid(),name:a.name,kind:a.kind,assetId:a.id,ownerPlayerId:'',characterId:'',hidden:false,...chosen,...cells(p,m)};
   m.tokens.push(t);s.token=t.id;change();render(false);
  }
 });
 s.root.addEventListener('pointermove',e=>{
  if(!s.pointers.has(e.pointerId))return;
  s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(s.pointers.size===2){
   const pts=[...s.pointers.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
   const mid={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
   if(s.pinch&&s.pinch.d>5){const box=s.view.getBoundingClientRect();zoom(d/s.pinch.d,mid.x-box.left,mid.y-box.top)}
   s.pinch={d};return;
  }
  const g=s.gesture,m=getScene();if(!g||!m)return;
  if(g.kind==='paint')paintAt(coords(e));
  if(g.kind==='pan'){s.x=g.px+e.clientX-g.x;s.y=g.py+e.clientY-g.y;updateTransform()}
  if(g.kind==='shape')preview(dimensions(g.start,coords(e),m),g.shape);
  if(g.kind==='token'){
   const target=$('.r30-token[data-r30-token="'+g.id+'"]',s.root);
   if(target){const c=cells(coords(e),m);target.style.left=(c.x*48+1)+'px';target.style.top=(c.y*48+1)+'px'}
  }
 });
 function release(e){
  if(!s.pointers.has(e.pointerId))return;
  s.pointers.delete(e.pointerId);
  if(s.pinch){if(s.pointers.size<2){s.pinch=null;s.gesture=null}return}
  finish(e);
 }
 s.root.addEventListener('pointerup',release);s.root.addEventListener('pointercancel',release);
 s.root.addEventListener('wheel',e=>{
  if(!e.target.closest('#r30-view'))return;
  e.preventDefault();const rect=s.view.getBoundingClientRect();
  zoom(e.deltaY<0?1.12:1/1.12,e.clientX-rect.left,e.clientY-rect.top);
 },{passive:false});
 s.root.addEventListener('input',e=>{if(e.target.id==='r68-search'){s.assetSearch=e.target.value;paintPalette()}});
 s.root.addEventListener('change',e=>{
  const m=getScene(),t=m?.tokens.find(x=>x.id===s.token);
  if(e.target.id==='r30-scenes'){s.selected=e.target.value;s.token='';render(true)}
  if(e.target.id==='r30-category'){s.category=e.target.value;library()}
  if(e.target.id==='r68-layer'){s.paintLayer=e.target.value;s.paintAsset=(paintEngine?.palette||[]).find(x=>x.layer===s.paintLayer)?.id||'stone';s.tool=s.paintLayer==='walls'?'wall':'paint';render(false)}
  if(e.target.id==='r68-pack'){s.paintPack=e.target.value;paintPalette()}
  if(e.target.id==='r68-brush')s.brushSize=Math.max(1,Math.min(5,Number(e.target.value)||1));
  if(e.target.dataset.r68Visible){s.visibleLayers[e.target.dataset.r68Visible]=e.target.checked;map()}
  if(e.target.id==='r31-system'){s.creatureSystem=e.target.value;creatureChoices()}
  if(e.target.id==='r31-search'){s.creatureSearch=e.target.value;creatureChoices()}
  if(e.target.id==='r35-new-fog')s.fogStyle=e.target.value;
  if(e.target.dataset.r35RoomFog){const room=m?.rooms.find(r=>r.id===e.target.dataset.r35RoomFog);
    if(room){room.fogStyle=e.target.value;change();map()}}
  if(e.target.dataset.r68MapName){const m=getScene();if(m){m.name=e.target.value.trim().slice(0,80)||m.name;change();render(false)}}
  if(e.target.id==='r30-import-kind')s.importKind=e.target.value;
  if(e.target.id==='r30-gridcheck'){s.showGrid=e.target.checked;map()}
  if(e.target.id==='r30-file')upload(e.target.files?.[0]);
  if(t&&e.target.dataset.r30Change==='name'){t.name=e.target.value.trim().slice(0,70)||t.name;change();render(false)}
  if(t&&e.target.dataset.r30Change==='owner'){
   const p=(opts.players||[]).find(p=>p.id===e.target.value);
   t.ownerPlayerId=p?.id||'';t.characterId=p?.characterId||'';change();details();
  }
  if(t&&e.target.dataset.r30Change==='hidden'){t.hidden=e.target.checked;change();details()}
 });
 s.root.addEventListener('click',async e=>{
  const monster=e.target.closest('[data-r31-creature]');
  if(monster){const creature=creatureRecords(s.creatureSystem).find(x=>x.id===monster.dataset.r31Creature);if(creature)chooseTokenAsset(creature,true);return}
  const sheetBtn=e.target.closest('[data-r31-sheet]');
  if(sheetBtn){const sheet=(opts.characters||[]).find(x=>x.id===sheetBtn.dataset.r31Sheet);if(sheet)chooseTokenAsset(sheet,false);return}
  const hpbtn=e.target.closest('[data-r31-hp]');if(hpbtn){
   const token=getScene()?.tokens.find(t=>t.id===s.token);if(token?.kind==='creature'){
     token.hp=Math.max(0,Math.min(token.maxHp,token.hp+Number(hpbtn.dataset.r31Hp)));change();details();
   }return;
  }
  const doorClick=e.target.closest('[data-r68-door]');
  if(doorClick){const [x,y,side]=doorClick.dataset.r68Door.split(':');
    const m=getScene();if(m&&paintEngine){checkpoint();if(paintEngine.toggleDoor(m,Number(x),Number(y),side)){change();render(false)}}return}
    const brushAsset=e.target.closest('[data-r68-asset]');if(brushAsset){const item=paintEngine?.get(brushAsset.dataset.r68Asset);if(item){s.paintAsset=item.id;s.paintLayer=item.layer;s.tool='paint';render(false);signal(item.name+' selecionado. Arraste pelo mapa para pintar.')}return}
  const a=e.target.closest('[data-r30-asset]');
  if(a){s.picked=a.dataset.r30Asset;library();return}
  const tool=e.target.closest('[data-r30-tool]');
  if(tool){s.tool=tool.dataset.r30Tool;s.root.querySelectorAll('[data-r30-tool]').forEach(b=>b.classList.toggle('active',b===tool));signal('Ferramenta: '+tool.title);return}
  const room=e.target.closest('[data-r30-room]');
  if(room){const r=getScene()?.rooms.find(x=>x.id===room.dataset.r30Room);if(r){r.hidden=!r.hidden;change();render(false)}return}
  const del=e.target.closest('[data-r30-delroom]');
  if(del){getScene().rooms=getScene().rooms.filter(x=>x.id!==del.dataset.r30Delroom);change();render(false);return}
  const b=e.target.closest('[data-r30]');if(!b)return;
  const m=getScene();
  try{
   switch(b.dataset.r30){
    case 'exit':close();break;
    case 'save':await save();break;
    case 'undo':restoreStep(false);break;
    case 'redo':restoreStep(true);break;
    case 'clear-layers':if(m&&confirm('Apagar terreno, decoração, paredes e portas desenhados?')){checkpoint();m.layers={terrain:[],props:[],walls:[]};change();mapPaintRefresh()}break;
    case 'duplicate':if(m){if(s.scenes.length>=16){signal('Limite de 16 cenários.');break}const copy=JSON.parse(JSON.stringify(m));copy.id=uid();copy.name=m.name+' (cópia)';copy.tokens=(copy.tokens||[]).map(t=>({...t,id:uid()}));copy.rooms=(copy.rooms||[]).map(r=>({...r,id:uid()}));s.scenes.push(copy);s.selected=copy.id;s.token='';change();render(true)}break;
    case 'new':{
     if(s.scenes.length>=16){signal('Limite de 16 cenários.');break}
     const map={id:uid(),name:'Novo cenário',width:28,height:18,theme:'stone',backgroundAssetId:'',rooms:[],tokens:[]};
     s.scenes.push(map);s.selected=map.id;s.token='';change();render(true);break;
    }
    case 'publish':if(m){s.active=s.active===m.id?'':m.id;change();render(false);signal('Salve para aplicar ao jogo.')}break;
    case 'assets':s.aside=!s.aside;$('.r30-side',s.root)?.classList.toggle('folded',!s.aside);break;
    case 'zoom-in':zoom(1.2);break;
    case 'zoom-out':zoom(1/1.2);break;
    case 'fit':fit();break;
    case 'delete-token':if(m){m.tokens=m.tokens.filter(x=>x.id!==s.token);s.token='';change();render(false)}break;
    case 'settings':{
     if(!m)break;
     const name=prompt('Nome do cenário',m.name);if(name===null)break;
     const w=prompt('Largura em quadrados (6 a 60)',m.width);if(w===null)break;
     const h=prompt('Altura em quadrados (6 a 60)',m.height);if(h===null)break;
     m.name=name.trim().slice(0,80)||m.name;
     m.width=clamp(Number(w)||m.width,6,60);m.height=clamp(Number(h)||m.height,6,60);
     m.rooms=m.rooms.filter(r=>r.x+r.w<=m.width&&r.y+r.h<=m.height);
     m.tokens=m.tokens.filter(t=>t.x<m.width&&t.y<m.height);if(m.layers){for(const layer of ['terrain','props','walls'])if(Array.isArray(m.layers[layer]))m.layers[layer]=m.layers[layer].filter(t=>t.x<m.width&&t.y<m.height)}change();render(true);break;
    }
   }
  }catch(err){signal('Erro: '+err.message)}
 });
 const observer=new ResizeObserver(()=>{if(current===s&&getScene()&&s.view)updateTransform()});
 observer.observe(s.root);host.addEventListener('rpg29:closed',()=>observer.disconnect(),{once:true});
 return load().catch(err=>signal('Falha ao carregar cenários: '+err.message));
}
root.RPG30_STUDIO={open,close};
root.RPG29_EDITOR=root.RPG30_STUDIO;
})(typeof window!=='undefined'?window:globalThis);
