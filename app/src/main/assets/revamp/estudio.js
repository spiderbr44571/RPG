/* Mastermind · revamp — Estúdio de cenários: montagem completa do mapa.
   Edita uma cópia da cena publicada; só "Publicar na mesa" muda o que os jogadores veem. */
(function(){
'use strict';
const {$,$$,esc,ic,clamp,emit,toast,CELL}=RV;
const TOOLS=[['select','pointer','Selecionar e mover','V'],['terrain','brush','Pintar terreno','B'],['fill','droplet','Balde de terreno','G'],['room','square','Sala','R'],['wall','wall','Parede','W'],['door','door','Porta e janela','O'],['stamp','plus','Colocar objeto','S'],['light','bulb','Luz','L'],['fog','cloud-fog','Área oculta','F'],['note','notes','Nota do mestre','N'],['erase','eraser','Borracha','E'],['pan','hand-move','Mover a vista','H']];
const TINTS=[[null,'Sem tom'],['#e0707c','Vermelho'],['#6db7e0','Azul'],['#86bd9c','Verde'],['#c7a87b','Dourado'],['#9c90dd','Roxo']];
const LIGHT_COLORS=[['#ffb35c','Fogo'],['#ffcf6b','Vela'],['#cfe3ff','Fria'],['#e0707c','Ritual'],['#7cff8a','Verde'],['#9c90dd','Roxa']];
const OBJ_LAYERS=[['chao','Decoração do chão'],['objetos','Objetos'],['luzes','Luzes'],['efeitos','Efeitos']];
const HIT_ORDER=['efeitos','luzes','objetos','chao'];
class Studio{
 constructor(root){this.root=root;this.z=1;this.px=0;this.py=0;this.tool='select';this.pointers=new Map();this.space=false;
  this.set={terrain:'pedra',brush:1,roomFloor:'pedra',wallMat:'pedra',doorType:'porta',stamp:null,stampRot:0,lightAsset:'tocha',fogMode:'hide',eraseMode:'auto'};
  this.libTab='objetos';this.libCat='all';this.libQ='';this.panelTab='props';this.sel=null;this.history=[];this.future=[];this.dirty=false;this.preview=false;this.backTo='#mestragem';this.dpr=Math.min(window.devicePixelRatio||1,1.5);this.build()}
 open(from){if(from&&from!=='#estudio')this.backTo=from;const other=RV.studioScene;RV.studioScene=null;if(other){this.scene=Cena.clone(other)}else{this.scene=Cena.clone(RV.state.scene);this.scene.fog=[...RV.state.fog]}this.history=[];this.future=[];this.dirty=false;this.sel=null;this.mapDirty=true;this.renderAll();requestAnimationFrame(()=>this.fit(false))}
 get W(){return this.scene.cols*CELL}get H(){return this.scene.rows*CELL}
 build(){const R=this.root;
  R.innerHTML=`<div class="stage st-stage" data-tool="select"><div class="world"><div class="map-shadow"></div><canvas class="cv-map"></canvas><canvas class="cv-dark"></canvas><canvas class="cv-veil"></canvas><canvas class="cv-over"></canvas></div><div class="weather" aria-hidden="true"></div></div>
  <header class="float st-top">
   <button class="x-btn" type="button" data-sa="close" aria-label="Fechar o Estúdio">${ic('x')}</button>
   <div class="st-title"><span class="kicker">Mestragem · Cenários</span><input class="st-name" id="st-name" aria-label="Nome do cenário"></div>
   <div class="st-group"><button class="ibtn" type="button" data-sa="undo" aria-label="Desfazer">${ic('arrow-back-up')}<span class="tip">Desfazer<kbd>Ctrl Z</kbd></span></button><button class="ibtn flip" type="button" data-sa="redo" aria-label="Refazer">${ic('arrow-back-up')}<span class="tip">Refazer<kbd>Ctrl Y</kbd></span></button>
    <span class="sep"></span><button class="ibtn" type="button" data-sa="grid" aria-label="Mostrar grade">${ic('layout-grid')}<span class="tip">Grade</span></button><button class="ibtn" type="button" data-sa="preview" aria-label="Ver como jogador">${ic('eye')}<span class="tip">Ver como jogador</span></button></div>
   <span class="st-sp"></span>
   <button class="btn sm ghost st-save" type="button" data-sa="save" aria-label="Salvar rascunho">${ic('check')}<span class="hide-sm">Salvar rascunho</span></button>
   <button class="btn sm primary st-publish" type="button" data-sa="publish" aria-label="Publicar na mesa">${ic('upload')}<span class="hide-sm">Publicar na mesa</span></button>
  </header>
  <div class="float tools st-tools" role="toolbar" aria-label="Ferramentas do Estúdio" aria-orientation="vertical">${TOOLS.map(t=>`<button class="ibtn" type="button" data-stool="${t[0]}" aria-label="${t[2]}" aria-pressed="${t[0]==='select'}">${ic(t[1])}<span class="tip">${t[2]}<kbd>${t[3]}</kbd></span></button>`).join('')}<div class="sep" role="separator"></div><button class="ibtn" type="button" data-sa="lib" aria-label="Biblioteca de peças" aria-pressed="true">${ic('books')}<span class="tip">Biblioteca</span></button></div>
  <aside class="float st-lib" aria-label="Biblioteca de peças">${RV.fh('Biblioteca','Peças do cenário','lib')}<div class="panel-tabs" role="tablist"><button type="button" role="tab" data-ltab="objetos">${ic('photo')}Objetos</button><button type="button" role="tab" data-ltab="terrenos">${ic('brush')}Terrenos</button><button type="button" role="tab" data-ltab="modelos">${ic('map')}Modelos</button></div><div class="panel-body st-lib-body"></div></aside>
  <aside class="float st-panel" aria-label="Propriedades">${RV.fh('','Propriedades','panel')}<div class="panel-tabs" role="tablist"><button type="button" role="tab" data-ptab="props">${ic('adjustments')}Peça</button><button type="button" role="tab" data-ptab="scene">${ic('settings')}Cena</button><button type="button" role="tab" data-ptab="layers">${ic('layout-sidebar-right')}Camadas</button></div><div class="panel-body st-panel-body"></div></aside>
  <div class="float optbar st-opt"></div>
  <div class="float zoom"><button class="ibtn" type="button" data-z="-1" aria-label="Diminuir zoom">${ic('zoom-out')}</button><span class="num zoom-v">100%</span><button class="ibtn" type="button" data-z="1" aria-label="Aumentar zoom">${ic('zoom-in')}</button><button class="ibtn" type="button" data-z="0" aria-label="Ajustar à tela">${ic('focus-2')}</button></div>
  <div class="float st-status num" aria-live="polite"></div>
  <input type="file" accept="image/png,image/jpeg,image/webp" class="st-file" hidden>`;
  this.stage=$('.stage',R);this.world=$('.world',R);this.cvMap=$('.cv-map',R);this.cvDark=$('.cv-dark',R);this.cvVeil=$('.cv-veil',R);this.cvOver=$('.cv-over',R);
  const st=this.stage;
  st.addEventListener('wheel',e=>{e.preventDefault();this.zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.012:.0016)),e.clientX,e.clientY)},{passive:false});
  st.addEventListener('contextmenu',e=>e.preventDefault());
  st.addEventListener('pointerdown',e=>this.down(e));st.addEventListener('pointermove',e=>this.move(e));st.addEventListener('pointerup',e=>this.up(e));st.addEventListener('pointercancel',e=>this.up(e));
  st.addEventListener('pointerleave',()=>{this.hover=null;this.renderOver()});
  R.addEventListener('click',e=>this.click(e));R.addEventListener('input',e=>this.input(e));R.addEventListener('change',e=>this.change(e));
  window.addEventListener('resize',()=>{if(!R.hidden)this.fit(false)});
  if(window.innerWidth<760||window.innerHeight<460){$('.st-lib',R).hidden=true;$('.st-panel',R).hidden=true;$('[data-sa="lib"]',R).setAttribute('aria-pressed','false')}
 }
 /* ---- câmera ---- */
 apply(){this.world.style.transform=`translate(${this.px}px,${this.py}px) scale(${this.z})`;$('.zoom-v',this.root).textContent=Math.round(this.z*100)+'%';if(RV.Tut?.flow)requestAnimationFrame(()=>RV.Tut.place())}
 fit(){const r=this.stage.getBoundingClientRect();if(!r.width)return;const phone=r.width<760,short=r.height<460;
  const L=phone||short?16:(!$('.st-lib',this.root).hidden?84+306:84),Rr=phone||short?16:(!$('.st-panel',this.root).hidden?332:16),T=phone?128:short?118:120,B=phone?60:56;
  const aw=Math.max(80,r.width-L-Rr),ah=Math.max(80,r.height-T-B);this.z=clamp(Math.min(aw/this.W,ah/this.H),.15,2.5);this.px=L+(aw-this.W*this.z)/2;this.py=T+(ah-this.H*this.z)/2;this.apply()}
 zoomAt(f,cx,cy){const r=this.stage.getBoundingClientRect();const x=cx-r.left,y=cy-r.top;const nz=clamp(this.z*f,.15,3);this.px=x-(x-this.px)*(nz/this.z);this.py=y-(y-this.py)*(nz/this.z);this.z=nz;this.apply()}
 toWorld(cx,cy){const r=this.stage.getBoundingClientRect();return{x:(cx-r.left-this.px)/this.z,y:(cy-r.top-this.py)/this.z}}
 cellAt(cx,cy){const p=this.toWorld(cx,cy);return{x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL),wx:p.x,wy:p.y}}
 inside(x,y){return x>=0&&y>=0&&x<this.scene.cols&&y<this.scene.rows}
 /* ---- histórico ---- */
 snap(){this.history.push(JSON.stringify(this.scene));if(this.history.length>80)this.history.shift();this.future=[];this.dirty=true}
 undo(){if(!this.history.length){toast('Nada para desfazer.');return}this.future.push(JSON.stringify(this.scene));this.scene=JSON.parse(this.history.pop());this.sel=null;this.mapDirty=true;this.renderAll()}
 redo(){if(!this.future.length){toast('Nada para refazer.');return}this.history.push(JSON.stringify(this.scene));this.scene=JSON.parse(this.future.pop());this.sel=null;this.mapDirty=true;this.renderAll()}
 commit(evt){this.dirty=true;this.mapDirty=true;this.renderAll();if(evt)emit(evt)}
 /* ---- busca de peças ---- */
 objAt(wx,wy){const L=this.scene.layers;for(const layer of HIT_ORDER){if(L[layer]&&(L[layer].visible===false||L[layer].locked))continue;const list=this.scene.objects.filter(o=>o.layer===layer);for(let i=list.length-1;i>=0;i--){const o=list[i];if(wx>=o.x*CELL&&wx<(o.x+o.w)*CELL&&wy>=o.y*CELL&&wy<(o.y+o.h)*CELL)return o}}return null}
 nearestEdge(wx,wy){const cx=Math.floor(wx/CELL),cy=Math.floor(wy/CELL),fx=wx/CELL-cx,fy=wy/CELL-cy;const c=[[fy,Cena.ek.h(cx,cy)],[1-fy,Cena.ek.h(cx,cy+1)],[fx,Cena.ek.v(cx,cy)],[1-fx,Cena.ek.v(cx+1,cy)]].sort((a,b)=>a[0]-b[0])[0];return{key:c[1],dist:c[0]*CELL}}
 noteAt(wx,wy){return this.scene.notes.find(n=>Math.hypot((n.x+.5)*CELL-wx,(n.y+.5)*CELL-wy)<18)}
 roomCells(x,y){const s=this.scene;if(!s.terrain[x+','+y])return[];const out=[],seen=new Set([x+','+y]),q=[[x,y]];while(q.length&&out.length<4000){const[cx,cy]=q.shift();out.push(cx+','+cy);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=(cx+dx)+','+(cy+dy);if(seen.has(k)||!s.terrain[k])continue;const e=dx?Cena.ek.v(Math.max(cx,cx+dx),cy):Cena.ek.h(cx,Math.max(cy,cy+dy));if(s.walls[e]||s.doors[e])continue;seen.add(k);q.push([cx+dx,cy+dy])}}return out}
 /* ---- ponteiro ---- */
 down(e){const st=this.stage;st.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.closePops();
  if(this.pointers.size===2){const p=[...this.pointers.values()];this.pinch={d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1,z:this.z};this.op=null;return}
  const c=this.cellAt(e.clientX,e.clientY),s=this.scene;
  if(e.button===1||e.button===2||this.space||this.tool==='pan'){this.op={kind:'pan',x:e.clientX,y:e.clientY,px:this.px,py:this.py};st.classList.add('panning');return}
  switch(this.tool){
   case 'select':{const o=this.objAt(c.wx,c.wy);if(o){this.sel={kind:'obj',id:o.id};this.panelTab='props';if(!o.locked){this.snap();this.op={kind:'drag',o,ox:c.x-o.x,oy:c.y-o.y,moved:false}}else toast('Peça travada. Destrave em Propriedades para mover.');this.renderAll();return}
    const n=this.noteAt(c.wx,c.wy);if(n){this.sel={kind:'note',id:n.id};this.panelTab='props';this.renderAll();return}
    const ed=this.nearestEdge(c.wx,c.wy);if(ed.dist<9&&s.doors[ed.key]){this.sel={kind:'door',key:ed.key};this.panelTab='props';this.renderAll();return}
    this.sel=null;this.op={kind:'pan',x:e.clientX,y:e.clientY,px:this.px,py:this.py};st.classList.add('panning');this.renderAll();return}
   case 'terrain':this.snap();this.op={kind:'paint'};this.paintAt(c);return;
   case 'fill':if(!this.inside(c.x,c.y))return;this.snap();this.flood(c.x,c.y);this.commit('studio:terrain');return;
   case 'room':this.op={kind:'room',a:c,b:c};this.renderOver();return;
   case 'wall':{const a={x:Math.round(c.wx/CELL),y:Math.round(c.wy/CELL)};this.op={kind:'wall',a,b:a};this.renderOver();return}
   case 'door':{if(!this.inside(c.x,c.y))return;const ed=this.nearestEdge(c.wx,c.wy);this.snap();const cur=s.doors[ed.key];if(!cur||cur.type!==this.set.doorType)s.doors[ed.key]={type:this.set.doorType,open:false};if(!s.walls[ed.key])s.walls[ed.key]=this.set.wallMat;
    this.sel={kind:'door',key:ed.key};this.panelTab='props';this.commit('studio:door');return}
   case 'stamp':{if(!this.set.stamp){toast('Escolha um objeto na Biblioteca.');$('.st-lib',this.root).hidden=false;this.fit();return}if(!this.inside(c.x,c.y))return;this.place(this.set.stamp,c.x,c.y,this.set.stampRot);return}
   case 'light':if(!this.inside(c.x,c.y))return;this.place(this.set.lightAsset,c.x,c.y,0);return;
   case 'fog':{if(this.set.fogMode==='room-hide'||this.set.fogMode==='room-show'){const cells=this.roomCells(c.x,c.y);if(!cells.length){toast('Toque dentro de uma sala com piso.');return}this.snap();const f=new Set(s.fog);cells.forEach(k=>this.set.fogMode==='room-hide'?f.add(k):f.delete(k));s.fog=[...f];this.commit('studio:fog');toast(`${cells.length} casas ${this.set.fogMode==='room-hide'?'ocultas':'reveladas'}.`);return}
    this.snap();this.op={kind:'fog'};this.fogAt(c);return}
   case 'note':{if(!this.inside(c.x,c.y))return;this.snap();const n={id:'n'+Date.now(),x:c.x,y:c.y,text:''};s.notes.push(n);this.sel={kind:'note',id:n.id};this.panelTab='props';this.commit('studio:note');setTimeout(()=>$('#st-note-text',this.root)?.focus(),50);return}
   case 'erase':this.snap();this.op={kind:'erase',mode:null};this.eraseAt(c);return;
  }}
 move(e){const c=this.cellAt(e.clientX,e.clientY);this.hover=c;
  if(this.pointers.has(e.pointerId))this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pinch&&this.pointers.size===2){const p=[...this.pointers.values()];const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);this.zoomAt(d/this.pinch.d*this.pinch.z/this.z,(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);return}
  const op=this.op;this.renderStatus(c);
  if(!op){this.renderOver();return}
  if(op.kind==='pan'){this.px=op.px+e.clientX-op.x;this.py=op.py+e.clientY-op.y;this.apply();return}
  if(op.kind==='drag'){const nx=clamp(c.x-op.ox,0,this.scene.cols-op.o.w),ny=clamp(c.y-op.oy,0,this.scene.rows-op.o.h);if(nx!==op.o.x||ny!==op.o.y){op.o.x=nx;op.o.y=ny;op.moved=true;this.mapDirty=true;this.schedule()}return}
  if(op.kind==='paint'){this.paintAt(c);return}
  if(op.kind==='fog'){this.fogAt(c);return}
  if(op.kind==='erase'){this.eraseAt(c);return}
  if(op.kind==='room'){op.b=c;this.renderOver();return}
  if(op.kind==='wall'){op.b={x:Math.round(c.wx/CELL),y:Math.round(c.wy/CELL)};this.renderOver();return}}
 up(e){this.pointers.delete(e.pointerId);if(this.pinch){if(this.pointers.size<2)this.pinch=null;return}const op=this.op;this.op=null;this.stage.classList.remove('panning');if(!op)return;const s=this.scene;
  if(op.kind==='drag'){if(!op.moved)this.history.pop();this.commit(op.moved?'studio:prop':null);return}
  if(op.kind==='paint'){this.commit('studio:terrain');return}
  if(op.kind==='fog'){this.commit('studio:fog');return}
  if(op.kind==='erase'){this.commit();return}
  if(op.kind==='room'){const x=clamp(Math.min(op.a.x,op.b.x),0,s.cols-1),y=clamp(Math.min(op.a.y,op.b.y),0,s.rows-1),x2=clamp(Math.max(op.a.x,op.b.x),0,s.cols-1),y2=clamp(Math.max(op.a.y,op.b.y),0,s.rows-1);
   this.snap();Cena.paintRect(s,x,y,x2-x+1,y2-y+1,this.set.roomFloor);Cena.roomWalls(s,x,y,x2-x+1,y2-y+1,this.set.wallMat);toast(`Sala de ${x2-x+1} × ${y2-y+1} casas. Use Porta para abrir passagens.`);this.commit('studio:room');return}
  if(op.kind==='wall'){const a=op.a,b=op.b;if(a.x===b.x&&a.y===b.y){this.renderOver();return}this.snap();let n=0;
   if(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)){for(let x=Math.min(a.x,b.x);x<Math.max(a.x,b.x);x++)if(x>=0&&x<s.cols&&a.y>=0&&a.y<=s.rows){s.walls[Cena.ek.h(x,a.y)]=this.set.wallMat;n++}}
   else{for(let y=Math.min(a.y,b.y);y<Math.max(a.y,b.y);y++)if(y>=0&&y<s.rows&&a.x>=0&&a.x<=s.cols){s.walls[Cena.ek.v(a.x,y)]=this.set.wallMat;n++}}
   toast(`${n} trecho${n>1?'s':''} de parede.`);this.commit('studio:wall')}}
 paintAt(c){const n=this.set.brush,o=Math.floor((n-1)/2);let ch=false;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const x=c.x-o+i,y=c.y-o+j;if(!this.inside(x,y))continue;const k=x+','+y;if(this.set.terrain==='nenhum'){if(this.scene.terrain[k]){delete this.scene.terrain[k];ch=true}}else if(this.scene.terrain[k]!==this.set.terrain){this.scene.terrain[k]=this.set.terrain;ch=true}}if(ch){this.mapDirty=true;this.schedule()}}
 flood(x,y){const s=this.scene,from=s.terrain[x+','+y]||null,to=this.set.terrain==='nenhum'?null:this.set.terrain;if(from===to)return;const q=[[x,y]],seen=new Set([x+','+y]);let n=0;
  while(q.length&&n<3600){const[cx,cy]=q.shift();const k=cx+','+cy;if(to)s.terrain[k]=to;else delete s.terrain[k];n++;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy,nk=nx+','+ny;if(seen.has(nk)||!this.inside(nx,ny)||(s.terrain[nk]||null)!==from)continue;const e=dx?Cena.ek.v(Math.max(cx,nx),cy):Cena.ek.h(cx,Math.max(cy,ny));if(s.walls[e])continue;seen.add(nk);q.push([nx,ny])}}toast(`${n} casas preenchidas.`)}
 fogAt(c){if(!this.inside(c.x,c.y))return;const k=c.x+','+c.y,f=new Set(this.scene.fog),hide=this.set.fogMode==='hide';if(hide===f.has(k))return;hide?f.add(k):f.delete(k);this.scene.fog=[...f];this.renderVeil()}
 eraseAt(c){const s=this.scene,op=this.op,m=this.set.eraseMode;let mode=op.mode||(m!=='auto'?m:null);
  const o=(!mode||mode==='objetos')?this.objAt(c.wx,c.wy):null;if(o){s.objects=s.objects.filter(x=>x!==o);op.mode='objetos';if(this.sel?.id===o.id)this.sel=null;this.mapDirty=true;this.schedule();return}
  if(!mode||mode==='paredes'){const ed=this.nearestEdge(c.wx,c.wy);if(ed.dist<12&&(s.walls[ed.key]||s.doors[ed.key])){if(s.doors[ed.key])delete s.doors[ed.key];else delete s.walls[ed.key];op.mode='paredes';this.mapDirty=true;this.schedule();return}if(mode)return}
  if(!mode||mode==='terreno'){const k=c.x+','+c.y;if(s.terrain[k]){delete s.terrain[k];op.mode='terreno';this.mapDirty=true;this.schedule()}}}
 place(assetId,x,y,rot){const a=Cena.ASSET[assetId];const custom=assetId.startsWith('img:');const w=custom?1:a.w,h=custom?1:a.h;this.snap();
  const o=custom?Object.assign(Cena.obj('caixote',0,0),{asset:assetId,src:this.customs[assetId].src,w:this.customs[assetId].w,h:this.customs[assetId].h,blocks:false,blocksSight:false,light:null,layer:'objetos',label:this.customs[assetId].name}):Cena.obj(assetId,0,0,{rot});
  if(rot%180&&!custom){o.w=h;o.h=w}o.x=clamp(x-Math.floor((o.w-1)/2),0,this.scene.cols-o.w);o.y=clamp(y-Math.floor((o.h-1)/2),0,this.scene.rows-o.h);
  this.scene.objects.push(o);this.sel={kind:'obj',id:o.id};this.commit(this.tool==='light'?'studio:light':'studio:stamp')}
 schedule(){if(this.raf)return;this.raf=requestAnimationFrame(()=>{this.raf=0;this.renderMap();this.renderOver()})}
 selObj(){return this.sel?.kind==='obj'?this.scene.objects.find(o=>o.id===this.sel.id):null}
 /* ---- interface ---- */
 closePops(){$$('.pop',this.root).forEach(p=>p.remove())}
 pickTool(t){this.tool=t;this.stage.dataset.tool=t;if(t!=='select')this.sel=null;$$('[data-stool]',this.root).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stool===t)));this.panelTab='props';this.renderAll();emit('studio:tool:'+t)}
 click(e){const b=e.target.closest('button');if(!b||!this.root.contains(b))return;const s=this.scene;
  if(b.dataset.close==='lib'){$('.st-lib',this.root).hidden=true;$('[data-sa="lib"]',this.root).setAttribute('aria-pressed','false');this.fit();return}
  if(b.dataset.close==='panel'){$('.st-panel',this.root).hidden=true;this.fit();return}
  if(b.dataset.close==='pop'){this.closePops();return}
  if(b.classList.contains('central-open')){RV.openCentral();return}
  if(b.dataset.stool){this.pickTool(b.dataset.stool);return}
  if(b.dataset.z!=null){const z=+b.dataset.z;if(!z)this.fit();else{const r=this.stage.getBoundingClientRect();this.zoomAt(z>0?1.2:1/1.2,r.left+r.width/2,r.top+r.height/2)}return}
  if(b.dataset.ltab){this.libTab=b.dataset.ltab;this.renderLib();emit('studio:library');return}
  if(b.dataset.lcat){this.libCat=b.dataset.lcat;this.renderLib();return}
  if(b.dataset.ptab){this.panelTab=b.dataset.ptab;$('.st-panel',this.root).hidden=false;this.renderPanel();return}
  if(b.dataset.asset){this.set.stamp=b.dataset.asset;if(Cena.ASSET[b.dataset.asset]?.cat==='luzes'){this.set.lightAsset=b.dataset.asset;this.pickTool('light')}else this.pickTool('stamp');emit('studio:library');return}
  if(b.dataset.terrain){this.set.terrain=b.dataset.terrain;if(this.tool!=='fill')this.pickTool('terrain');else this.renderAll();emit('studio:library');return}
  if(b.dataset.template){this.confirm(`Usar o modelo "${Cena.TEMPLATES.find(t=>t[0]===b.dataset.template)[1]}"?`,'O cenário atual será substituído. Dá para desfazer com Ctrl Z.','Usar modelo',()=>{this.snap();const keep={cols:s.cols,rows:s.rows};this.scene=Cena.template(b.dataset.template,keep.cols,keep.rows);this.sel=null;this.commit('studio:template');this.fit()});return}
  if(b.dataset.upload){this.uploadFor=b.dataset.upload;$('.st-file',this.root).click();return}
  if(b.dataset.sa)return this.action(b.dataset.sa,b);
  if(b.dataset.set){const[k,v]=b.dataset.set.split(':');this.set[k]=isNaN(+v)||k==='stamp'||k==='terrain'||k==='lightAsset'?v:+v;this.renderAll();return}
  if(b.dataset.prop){this.prop(b.dataset.prop,b.dataset.v,b);return}}
 action(a,b){const s=this.scene,o=this.selObj();
  switch(a){
   case 'close':if(this.dirty){this.confirm('Sair do Estúdio?','As mudanças ainda não foram publicadas na mesa.','Publicar e sair',()=>{this.publish();location.hash=this.backTo},'Sair sem publicar',()=>{this.dirty=false;location.hash=this.backTo})}else location.hash=this.backTo;break;
   case 'undo':this.undo();break;case 'redo':this.redo();break;
   case 'grid':this.snap();s.grid.show=!s.grid.show;this.commit();break;
   case 'preview':this.preview=!this.preview;b.setAttribute('aria-pressed',String(this.preview));this.mapDirty=true;this.renderAll();toast(this.preview?'Vendo como jogador: áreas ocultas, notas e peças escondidas somem.':'De volta à visão do mestre.');break;
   case 'save':if(RV.Live?.active('master')){RV.Live.sceneSave({scene:Cena.clone(this.scene),activate:false}).then(()=>{this.dirty=false;this.renderAll();toast('Rascunho salvo na campanha. A mesa só muda quando você publicar.')})}else toast('Campanha de treino: o rascunho fica só nesta tela. Ligue o servidor na Mestragem para guardar na campanha.');break;
   case 'publish':this.publish();break;
   case 'lib':{const l=$('.st-lib',this.root);l.hidden=!l.hidden;b.setAttribute('aria-pressed',String(!l.hidden));if(!l.hidden&&window.innerWidth<760)$('.st-panel',this.root).hidden=true;this.renderLib();this.fit();break}
   case 'dup':if(o){this.snap();const c=Object.assign(Cena.clone(o),{id:'o'+Date.now()+Math.random().toString(36).slice(2,4),x:clamp(o.x+1,0,s.cols-o.w),y:clamp(o.y+1,0,s.rows-o.h)});s.objects.push(c);this.sel={kind:'obj',id:c.id};this.commit('studio:prop')}break;
   case 'front':if(o){this.snap();s.objects=s.objects.filter(x=>x!==o).concat(o);this.commit('studio:prop')}break;
   case 'back':if(o){this.snap();s.objects=[o].concat(s.objects.filter(x=>x!==o));this.commit('studio:prop')}break;
   case 'delete':this.deleteSel();break;
   case 'rot-l':case 'rot-r':if(o){this.snap();this.rotate(o,a==='rot-r'?90:-90);this.commit('studio:prop')}else{this.set.stampRot=(this.set.stampRot+(a==='rot-r'?90:270))%360;this.renderAll()}break;
   case 'fog-all-show':this.snap();s.fog=[];this.commit('studio:fog');break;
   case 'fog-all-hide':this.snap();s.fog=Object.keys(s.terrain);this.commit('studio:fog');break;
   case 'resize':{const c=clamp(parseInt($('#st-cols',this.root).value,10)||s.cols,6,60),r=clamp(parseInt($('#st-rows',this.root).value,10)||s.rows,6,60);this.snap();s.cols=c;s.rows=r;
    Object.keys(s.terrain).forEach(k=>{const[x,y]=k.split(',').map(Number);if(x>=c||y>=r)delete s.terrain[k]});s.objects=s.objects.filter(o=>o.x+o.w<=c&&o.y+o.h<=r);s.fog=s.fog.filter(k=>{const[x,y]=k.split(',').map(Number);return x<c&&y<r});
    this.commit('studio:prop');this.fit();toast(`Cena com ${c} × ${r} casas.`);break}
   case 'auto-walls':this.snap();Cena.autoWalls(s,this.set.wallMat);this.commit('studio:wall');toast('Paredes criadas no contorno de todo o piso.');break;
   case 'clear-walls':this.snap();s.walls={};s.doors={};this.commit('studio:wall');break;
   case 'img-remove':this.snap();s.image=null;this.commit('studio:prop');break;
  }}
 deleteSel(){const s=this.scene;if(!this.sel)return;this.snap();if(this.sel.kind==='obj')s.objects=s.objects.filter(o=>o.id!==this.sel.id);if(this.sel.kind==='door')delete s.doors[this.sel.key];if(this.sel.kind==='note')s.notes=s.notes.filter(n=>n.id!==this.sel.id);this.sel=null;this.commit('studio:prop')}
 rotate(o,d){o.rot=((o.rot||0)+d+360)%360;if(Math.abs(d)===90){const w=o.w;o.w=o.h;o.h=w;o.x=clamp(o.x,0,this.scene.cols-o.w);o.y=clamp(o.y,0,this.scene.rows-o.h)}}
 prop(k,v,b){const o=this.selObj(),s=this.scene;this.snap();
  const sceneKey=['grid-color','time','weather','grid-width','grid-floor','layer-vis','layer-lock'].includes(k);
  if(!sceneKey&&this.sel?.kind==='door'){const d=s.doors[this.sel.key];if(k==='door-type')d.type=v;if(k==='door-open')d.open=!d.open}
  else if(!sceneKey&&o){if(k==='tint')o.tint=v||null;if(k==='lightcolor'&&o.light)o.light.color=v;if(k==='toggle'){if(v==='hidden')o.hidden=!o.hidden;if(v==='blocks')o.blocks=!o.blocks;if(v==='blocksSight')o.blocksSight=!o.blocksSight;if(v==='locked')o.locked=!o.locked;if(v==='light'){if(o.light)o.light.on=!o.light.on;else o.light={r:3,color:'#ffb35c',on:true}}}}
  else if(k==='grid-color')s.grid.color=v;else if(k==='time')s.ambient.time=v;else if(k==='weather')s.ambient.weather=v;else if(k==='grid-width')s.grid.width=+v;else if(k==='grid-floor')s.grid.overTerrainOnly=!s.grid.overTerrainOnly;
  else if(k==='layer-vis')s.layers[v].visible=s.layers[v].visible===false;else if(k==='layer-lock')s.layers[v].locked=!s.layers[v].locked;
  this.commit('studio:prop')}
 input(e){const t=e.target,o=this.selObj(),s=this.scene;if(!this.root.contains(t))return;
  if(t.id==='st-name'){s.name=t.value||'Sem nome';this.dirty=true;return}
  if(t.id==='st-lib-q'){this.libQ=t.value;const pos=t.selectionStart;this.renderLib();const n=$('#st-lib-q',this.root);n.focus();n.setSelectionRange(pos,pos);return}
  if(t.dataset.live){const v=+t.value;if(!this.liveSnap){this.snap();this.liveSnap=true}
   if(o&&t.dataset.live==='rot'){o.rot=v}if(o&&t.dataset.live==='opacity')o.opacity=v/100;if(o&&t.dataset.live==='light-r'&&o.light)o.light.r=v;
   if(t.dataset.live==='grid-alpha')s.grid.alpha=v/100;if(t.dataset.live==='img-opacity')s.imageOpacity=v/100;if(t.dataset.live==='meters')s.meters=v||1.5;
   const lab=t.parentElement.querySelector('.val');if(lab)lab.textContent=t.dataset.live==='rot'?v+'°':t.dataset.live==='light-r'?v+' casas':t.dataset.live==='meters'?v+' m':v+'%';
   this.mapDirty=true;this.dirty=true;this.schedule();return}
  if(t.id==='st-note-text'){const n=s.notes.find(n=>n.id===this.sel?.id);if(n){n.text=t.value;this.dirty=true}return}
  if(o&&t.id==='st-label'){o.label=t.value;this.dirty=true}}
 change(e){const t=e.target,o=this.selObj(),s=this.scene;if(t.dataset.live){this.liveSnap=false;emit('studio:prop');this.renderPanel();return}
  if(t.classList.contains('st-file')){const f=t.files[0];t.value='';if(!f)return;if(f.size>3.8e6){toast('Imagem grande demais. O limite é de cerca de 3,8 MB.');return}const rd=new FileReader();rd.onload=()=>{const src=rd.result;Cena.loadImage(src,im=>{
    if(this.uploadFor==='bg'){this.snap();s.image=src;this.commit('studio:prop');toast('Imagem de fundo aplicada. Ajuste a grade em Cena.')}
    else{this.customs=this.customs||{};const id='img:'+Date.now();const ratio=im.naturalWidth/im.naturalHeight;this.customs[id]={src,name:f.name.replace(/\.[a-z]+$/i,''),w:ratio>=1?clamp(Math.round(ratio),1,4):1,h:ratio<1?clamp(Math.round(1/ratio),1,4):1};this.set.stamp=id;this.libCat='minhas';this.renderLib();this.pickTool('stamp');toast('Imagem importada. Toque no mapa para colocar.')}})};rd.readAsDataURL(f);return}
  if(o&&t.dataset.num){this.snap();const v=parseInt(t.value,10);if(!isNaN(v)){if(t.dataset.num==='x')o.x=clamp(v,0,s.cols-o.w);if(t.dataset.num==='y')o.y=clamp(v,0,s.rows-o.h);if(t.dataset.num==='w')o.w=clamp(v,1,12);if(t.dataset.num==='h')o.h=clamp(v,1,12)}this.commit('studio:prop');return}
  if(o&&t.id==='st-layer'){this.snap();o.layer=t.value;this.commit('studio:prop');return}
  if(t.id==='st-bg'){this.snap();s.bg=t.value;this.commit('studio:prop');return}
  if(t.id==='st-system'){this.snap();s.system=t.value;this.commit('studio:prop');return}
  if(t.id==='st-wallmat'){this.set.wallMat=t.value;return}
  if(t.id==='st-floor'){this.set.roomFloor=t.value;return}}
 publish(){const st=RV.state;const live=RV.Live?.active('master');if(live&&this.scene.id!==RV.Live.table?.activeScenarioId){st.scene=Cena.clone(this.scene);st.fog=new Set(this.scene.fog);st.sceneVer++;this.dirty=false;emit('studio:publish');emit('state');
   RV.Live.sceneSave({scene:Cena.clone(this.scene),activate:true}).then(()=>toast(`"${this.scene.name}" publicado. A mesa e os jogadores já veem este cenário.`));return}
  st.scene=Cena.clone(this.scene);Object.values(st.scene.layers).forEach(l=>{l.visible=true;l.locked=false});st.fog=new Set(this.scene.fog);st.sceneVer++;
  st.tokens.forEach(t=>{t.x=clamp(t.x,0,st.scene.cols-t.size);t.y=clamp(t.y,0,st.scene.rows-t.size)});this.dirty=false;emit('studio:publish');emit('state');
  if(live){RV.Live.sceneSave({activate:true}).then(()=>toast(`"${this.scene.name}" publicado. A mesa e os jogadores já veem este cenário.`));return}
  toast(`"${this.scene.name}" publicado na campanha de treino.`)}
 confirm(title,text,okLabel,ok,altLabel,alt){const m=document.createElement('div');m.className='modal-back';m.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="st-cf-h"><div class="fh" style="padding:0"><h2 id="st-cf-h" style="font-size:28px">${esc(title)}</h2><button class="x-btn" type="button" data-m="x" aria-label="Fechar">${ic('x')}</button></div><p class="muted" style="margin:0">${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-m="x">Continuar editando</button>${altLabel?`<button class="btn" type="button" data-m="alt">${esc(altLabel)}</button>`:''}<button class="btn primary" type="button" data-m="ok">${esc(okLabel)}</button></div></div>`;
  document.body.appendChild(m);m.querySelector('[data-m="ok"]').focus();m.addEventListener('click',e=>{const k=e.target.closest('[data-m]')?.dataset.m;if(!k&&e.target!==m)return;m.remove();if(k==='ok')ok();if(k==='alt')alt()})}
 escape(){if($('.modal-back')){$('.modal-back').remove();return true}if(this.op){this.op=null;this.renderOver();return true}if(this.sel){this.sel=null;this.renderAll();return true}if(this.tool!=='select'){this.pickTool('select');return true}return false}
 key(e){const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();return}if(mod&&k==='y'){e.preventDefault();this.redo();return}if(mod&&k==='d'){e.preventDefault();this.action('dup');return}
  if(k==='delete'||k==='backspace'){if(this.sel){e.preventDefault();this.deleteSel()}return}
  if(k==='['||k===']'){this.action(k===']'?'rot-r':'rot-l');return}
  const o=this.selObj();if(o&&k.startsWith('arrow')&&!o.locked){e.preventDefault();this.snap();const d={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[k];o.x=clamp(o.x+d[0],0,this.scene.cols-o.w);o.y=clamp(o.y+d[1],0,this.scene.rows-o.h);this.commit();return}
  const t={v:'select',b:'terrain',g:'fill',r:'room',w:'wall',o:'door',s:'stamp',l:'light',f:'fog',n:'note',e:'erase',h:'pan'}[k];if(t&&!mod)this.pickTool(t);if(k==='0')this.fit()}
 /* ---- desenho ---- */
 renderAll(){if(!this.scene)return;$('#st-name',this.root).value=this.scene.name;$('[data-sa="grid"]',this.root).setAttribute('aria-pressed',String(this.scene.grid.show));
  $('[data-sa="undo"]',this.root).disabled=!this.history.length;$('[data-sa="redo"]',this.root).disabled=!this.future.length;$('.st-publish',this.root).classList.toggle('pulse',this.dirty);
  this.renderMap();this.renderVeil();this.renderOver();this.renderLib();this.renderPanel();this.renderOpts();this.renderStatus(this.hover)}
 renderMap(){if(!this.mapDirty&&this.painted)return;this.mapDirty=false;this.painted=true;const s=this.scene;
  Cena.render(this.cvMap,s,{dpr:this.dpr,forPlayer:this.preview,showNotes:!this.preview});
  Cena.renderDark(this.cvDark,s,{dpr:this.dpr,master:!this.preview,forPlayer:this.preview});
  [this.cvVeil,this.cvOver].forEach(c=>{if(c.width!==Math.round(this.W*this.dpr)){c.width=Math.round(this.W*this.dpr);c.height=Math.round(this.H*this.dpr)}c.style.width=this.W+'px';c.style.height=this.H+'px'});
  this.world.style.width=this.W+'px';this.world.style.height=this.H+'px';$('.weather',this.root).className='weather w-'+(s.ambient.weather||'nenhum')}
 renderVeil(){const g=this.cvVeil.getContext('2d');g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,this.W,this.H);const L=this.scene.layers;if(L.nevoa&&L.nevoa.visible===false)return;
  if(!this.hatch){const p=document.createElement('canvas');p.width=p.height=12;const pg=p.getContext('2d');pg.strokeStyle='rgba(156,144,221,.55)';pg.lineWidth=2;pg.beginPath();pg.moveTo(0,12);pg.lineTo(12,0);pg.stroke();this.hatch=g.createPattern(p,'repeat')}
  this.scene.fog.forEach(k=>{const[x,y]=k.split(',').map(Number);if(this.preview){g.fillStyle='#07080b';g.fillRect(x*CELL-.5,y*CELL-.5,CELL+1,CELL+1)}else{g.fillStyle='rgba(10,12,20,.45)';g.fillRect(x*CELL,y*CELL,CELL,CELL);g.fillStyle=this.hatch;g.fillRect(x*CELL,y*CELL,CELL,CELL)}})}
 renderOver(){const g=this.cvOver.getContext('2d'),s=this.scene;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,this.W,this.H);const A='#c7a87b',h=this.hover,op=this.op;
  const box=(x,y,w,hh,dash)=>{g.strokeStyle=A;g.lineWidth=2;g.setLineDash(dash?[6,5]:[]);g.strokeRect(x+1,y+1,w-2,hh-2);g.setLineDash([])};
  if(h&&this.inside(h.x,h.y)&&!op){if(this.tool==='terrain'){const n=this.set.brush,o=Math.floor((n-1)/2);box((h.x-o)*CELL,(h.y-o)*CELL,n*CELL,n*CELL,true)}
   else if(['fill','fog','note','light','erase','room'].includes(this.tool))box(h.x*CELL,h.y*CELL,CELL,CELL,true);
   else if(this.tool==='stamp'&&this.set.stamp){const a=Cena.ASSET[this.set.stamp];if(a){const rot=this.set.stampRot,w=rot%180?a.h:a.w,hh=rot%180?a.w:a.h,x=clamp(h.x-Math.floor((w-1)/2),0,s.cols-w),y=clamp(h.y-Math.floor((hh-1)/2),0,s.rows-hh);g.save();g.globalAlpha=.6;Cena.drawObject(g,{asset:this.set.stamp,x,y,w,h:hh,rot,opacity:1});g.restore();box(x*CELL,y*CELL,w*CELL,hh*CELL,true)}}
   else if(this.tool==='door'||this.tool==='wall'){const ed=this.nearestEdge(h.wx,h.wy);if(this.tool==='door'){const[t,xy]=ed.key.split(':'),[x,y]=xy.split(',').map(Number);g.strokeStyle=A;g.lineWidth=6;g.beginPath();g.moveTo(x*CELL,y*CELL);g.lineTo((t==='h'?x+1:x)*CELL,(t==='h'?y:y+1)*CELL);g.stroke()}
    else{g.fillStyle=A;g.beginPath();g.arc(Math.round(h.wx/CELL)*CELL,Math.round(h.wy/CELL)*CELL,5,0,7);g.fill()}}}
  if(op?.kind==='room'){const x=Math.min(op.a.x,op.b.x),y=Math.min(op.a.y,op.b.y),w=Math.abs(op.a.x-op.b.x)+1,hh=Math.abs(op.a.y-op.b.y)+1;g.fillStyle='rgba(199,168,123,.18)';g.fillRect(x*CELL,y*CELL,w*CELL,hh*CELL);box(x*CELL,y*CELL,w*CELL,hh*CELL);
   g.fillStyle=A;g.font='700 14px DM Sans, sans-serif';g.fillText(`${w} × ${hh}`,x*CELL+8,y*CELL+20)}
  if(op?.kind==='wall'){const a=op.a,b=op.b,hz=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);g.strokeStyle=A;g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(a.x*CELL,a.y*CELL);g.lineTo((hz?b.x:a.x)*CELL,(hz?a.y:b.y)*CELL);g.stroke()}
  const o=this.selObj();if(o){box(o.x*CELL-3,o.y*CELL-3,o.w*CELL+6,o.h*CELL+6);[[0,0],[1,0],[0,1],[1,1]].forEach(([i,j])=>{g.fillStyle='#17131c';g.fillRect(o.x*CELL-6+i*(o.w*CELL+6),o.y*CELL-6+j*(o.h*CELL+6),7,7);g.strokeStyle=A;g.lineWidth=2;g.strokeRect(o.x*CELL-6+i*(o.w*CELL+6),o.y*CELL-6+j*(o.h*CELL+6),7,7)});
   if(o.light&&o.light.on){g.strokeStyle='rgba(199,168,123,.5)';g.setLineDash([4,6]);g.beginPath();g.arc((o.x+o.w/2)*CELL,(o.y+o.h/2)*CELL,o.light.r*CELL,0,7);g.stroke();g.setLineDash([])}}
  if(this.sel?.kind==='door'){const[t,xy]=this.sel.key.split(':'),[x,y]=xy.split(',').map(Number);g.strokeStyle=A;g.lineWidth=3;g.setLineDash([5,4]);g.strokeRect((x-(t==='v'?.25:0))*CELL,(y-(t==='h'?.25:0))*CELL,(t==='h'?1:.5)*CELL,(t==='h'?.5:1)*CELL);g.setLineDash([])}
  if(this.sel?.kind==='note'){const n=s.notes.find(n=>n.id===this.sel.id);if(n){g.strokeStyle=A;g.lineWidth=2;g.beginPath();g.arc((n.x+.5)*CELL,(n.y+.5)*CELL-4,15,0,7);g.stroke()}}}
 renderStatus(c){const el=$('.st-status',this.root),s=this.scene;if(!el)return;const parts=[`${s.cols} × ${s.rows} casas`,`${s.objects.length} peças`,`${s.objects.filter(o=>o.light&&o.light.on).length} luzes`];
  if(c&&this.inside(c.x,c.y)){const t=Cena.TERRAIN[s.terrain[c.x+','+c.y]];parts.unshift(`Casa ${c.x+1}, ${c.y+1} · ${t?t.name+(Cena.DIFFICULT.has(t.id)?' · terreno difícil':Cena.IMPASSABLE.has(t.id)?' · intransponível':''):'sem piso'}`)}el.textContent=parts.join('  ·  ')}
 renderOpts(){const o=$('.st-opt',this.root),S=this.set,P=(k,v,l,i)=>`<button class="opt" type="button" data-set="${k}:${v}" aria-pressed="${String(S[k])===String(v)}">${i?ic(i):''}${l}</button>`;let h='';const tn=Cena.TERRAIN[S.terrain]?.name||'Apagar piso';
  switch(this.tool){
   case 'select':h=`<span class="t">Selecionar</span><span class="hint">Toque numa peça para editar; arraste para mover. Setas ajustam, [ ] giram, Delete apaga.</span>`;break;
   case 'terrain':h=`<span class="t">Terreno</span><span class="hint">${esc(tn)}</span>${[1,2,3,5].map(n=>P('brush',n,n+'×'+n)).join('')}`;break;
   case 'fill':h=`<span class="t">Balde</span><span class="hint">Preenche a área do mesmo piso com ${esc(tn)}, sem atravessar paredes.</span>`;break;
   case 'room':h=`<span class="t">Sala</span><span class="hint">Arraste um retângulo. Piso e paredes em Propriedades.</span>`;break;
   case 'wall':h=`<span class="t">Parede</span><span class="hint">Arraste entre os cantos da grade.</span><button class="opt" type="button" data-sa="auto-walls">${ic('wall')}Contornar o piso</button>`;break;
   case 'door':h=`<span class="t">Portas</span>${Cena.DOOR_TYPES.map(([id,l])=>P('doorType',id,l)).join('')}`;break;
   case 'stamp':h=`<span class="t">Objeto</span><span class="hint">${S.stamp?esc(this.assetName(S.stamp)):'Escolha na Biblioteca'}</span><button class="opt" type="button" data-sa="rot-l" aria-label="Girar para a esquerda">${ic('rotate-clockwise','rv-icon flip')}</button><button class="opt" type="button" data-sa="rot-r" aria-label="Girar para a direita">${ic('rotate-clockwise')}</button><span class="hint num">${S.stampRot}°</span>`;break;
   case 'light':h=`<span class="t">Luz</span>${Cena.ASSETS.filter(a=>a.cat==='luzes'||a.id==='fogueira'||a.id==='poste').map(a=>P('lightAsset',a.id,a.name)).join('')}`;break;
   case 'fog':h=`<span class="t">Área oculta</span>${P('fogMode','hide','Ocultar','eye-off')}${P('fogMode','show','Revelar','eye')}${P('fogMode','room-hide','Ocultar sala','door')}${P('fogMode','room-show','Revelar sala','door-exit')}<button class="opt" type="button" data-sa="fog-all-show">Revelar tudo</button>`;break;
   case 'note':h=`<span class="t">Nota</span><span class="hint">Toque para pôr uma nota. Só o mestre vê.</span>`;break;
   case 'erase':h=`<span class="t">Borracha</span>${P('eraseMode','auto','Automática')}${P('eraseMode','objetos','Objetos')}${P('eraseMode','paredes','Paredes e portas')}${P('eraseMode','terreno','Piso')}`;break;
   case 'pan':h=`<span class="t">Mover a vista</span><span class="hint">Arraste para andar pelo mapa. Roda ou pinça para zoom.</span>`;break}
  o.innerHTML=h}
 assetName(id){return Cena.ASSET[id]?.name||this.customs?.[id]?.name||id}
 renderLib(){const body=$('.st-lib-body',this.root);if(!body||$('.st-lib',this.root).hidden)return;$$('[data-ltab]',this.root).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ltab===this.libTab)));
  if(this.libTab==='objetos'){const q=this.libQ.toLowerCase();const cats=[['all','Todos']].concat(Cena.CATS).concat([['minhas','Minhas imagens']]);
   let list=this.libCat==='minhas'?Object.entries(this.customs||{}).map(([id,c])=>({id,name:c.name,custom:true})):Cena.ASSETS.filter(a=>this.libCat==='all'||a.cat===this.libCat);if(q)list=list.filter(a=>a.name.toLowerCase().includes(q));
   body.innerHTML=`<input class="input" id="st-lib-q" placeholder="Procurar entre ${Cena.ASSETS.length} peças" value="${esc(this.libQ)}" aria-label="Procurar peça"><div class="chips">${cats.map(([id,l])=>`<button type="button" class="fchip" data-lcat="${id}" aria-pressed="${this.libCat===id}">${l}</button>`).join('')}</div>
    <div class="tiles">${list.map(a=>`<button type="button" class="tile" data-asset="${a.id}" aria-pressed="${this.set.stamp===a.id&&(this.tool==='stamp'||this.tool==='light')}" title="${esc(a.name)}"><canvas width="112" height="112" data-thumb="${a.id}"></canvas><span>${esc(a.name)}</span></button>`).join('')||'<p class="muted small">Nada encontrado.</p>'}</div>
    <button class="btn sm" type="button" data-upload="obj">${ic('upload')}Importar imagem (JPG, PNG, WebP)</button>`;
   $$('canvas[data-thumb]',body).forEach(cv=>{const id=cv.dataset.thumb;if(Cena.ASSET[id])Cena.thumb(cv,id);else{const c=this.customs[id];const g=cv.getContext('2d');const im=Cena.imageCache[c.src];if(im)g.drawImage(im,8,8,96,96)}});
   $$('.tile',body).forEach(t=>t.addEventListener('pointerdown',e=>this.tileDrag(e,t)))}
  if(this.libTab==='terrenos'){body.innerHTML=`<div class="tiles terr">${Cena.TERRAINS.map(t=>`<button type="button" class="tile" data-terrain="${t.id}" aria-pressed="${this.set.terrain===t.id&&(this.tool==='terrain'||this.tool==='fill')}"><canvas width="112" height="112" data-sw="${t.id}"></canvas><span>${t.name}${Cena.DIFFICULT.has(t.id)?' · difícil':Cena.IMPASSABLE.has(t.id)?' · intransponível':''}</span></button>`).join('')}<button type="button" class="tile" data-terrain="nenhum" aria-pressed="${this.set.terrain==='nenhum'}"><span class="erase-sw">${ic('eraser')}</span><span>Apagar piso</span></button></div><p class="small faint" style="margin:0">Terreno difícil e intransponível valem para o cálculo de movimento na mesa.</p>`;
   $$('canvas[data-sw]',body).forEach(cv=>Cena.terrainSwatch(cv,cv.dataset.sw))}
  if(this.libTab==='modelos'){body.innerHTML=`<p class="small muted" style="margin:0">Comece de um modelo e ajuste à vontade. O tamanho da cena atual é mantido.</p>${Cena.TEMPLATES.map(([id,l])=>`<button type="button" class="tmpl" data-template="${id}"><canvas width="240" height="150" data-tp="${id}"></canvas><span><b>${l}</b><small class="muted">${{vazio:'Sem piso, só a grade',masmorra:'Salas, corredor e portas',taverna:'Balcão, mesas e lareira',floresta:'Trilha, árvores e fogueira',caverna:'Galerias naturais e água',rua:'Asfalto, postes e um escritório'}[id]}</small></span></button>`).join('')}`;
   requestAnimationFrame(()=>$$('canvas[data-tp]',body).forEach(cv=>{const sc=Cena.template(cv.dataset.tp,24,16),full=document.createElement('canvas');Cena.render(full,sc,{dpr:.25,gridAlpha:.06});const g=cv.getContext('2d');g.fillStyle='#101216';g.fillRect(0,0,cv.width,cv.height);g.drawImage(full,0,0,cv.width,cv.height)}))}}
 tileDrag(e,t){const id=t.dataset.asset;if(!id)return;const sx=e.clientX,sy=e.clientY;let moved=false;let gh=null;
  const mv=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)>8){moved=true;gh=document.createElement('canvas');gh.width=gh.height=72;gh.className='tile-ghost';if(Cena.ASSET[id])Cena.thumb(gh,id);document.body.appendChild(gh)}if(gh){gh.style.left=ev.clientX+'px';gh.style.top=ev.clientY+'px'}};
  const up=ev=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);if(!moved)return;gh?.remove();const over=document.elementFromPoint(ev.clientX,ev.clientY);if(!over||!this.stage.contains(over))return;const c=this.cellAt(ev.clientX,ev.clientY);if(!this.inside(c.x,c.y))return;
   this.set.stamp=id;this.place(id,c.x,c.y,0);this.pickTool('select');this.sel={kind:'obj',id:this.scene.objects[this.scene.objects.length-1].id};this.renderAll();emit('studio:stamp')};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up)}
 renderPanel(){const p=$('.st-panel',this.root);if(p.hidden)return;const body=$('.st-panel-body',this.root),s=this.scene,o=this.selObj();$$('[data-ptab]',p).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ptab===this.panelTab)));
  const sw=(prop,list,cur)=>`<div class="swatches sm">${list.map(([c,l])=>`<button type="button" aria-label="${l}" title="${l}" data-prop="${prop}" data-v="${c||''}" aria-pressed="${(cur||null)===c}" style="background:${c||'transparent'}" class="${c?'':'none'}"></button>`).join('')}</div>`;
  const tg=(v,label,on,sub)=>`<button type="button" class="switch-row" data-prop="toggle" data-v="${v}" aria-pressed="${on}"><span><b>${label}</b>${sub?`<small class="muted">${sub}</small>`:''}</span><span class="switch"></span></button>`;
  const rg=(live,label,min,max,step,val,suffix)=>`<label class="range-row"><span class="row between"><b>${label}</b><span class="val num">${val}${suffix}</span></span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-live="${live}"></label>`;
  const title=t=>{$('.st-panel .fh h3',this.root).textContent=t};
  if(this.panelTab==='props'){
   if(o){title(o.label||this.assetName(o.asset));const a=Cena.ASSET[o.asset];
    body.innerHTML=`<div class="row" style="flex-wrap:nowrap"><canvas class="prop-thumb" width="112" height="112" data-pt="${o.asset}"></canvas><div class="field" style="flex:1"><label for="st-label">Nome no mapa</label><input class="input" id="st-label" value="${esc(o.label)}" placeholder="${esc(this.assetName(o.asset))}"></div></div>
     <div class="grid2f"><div class="field"><label for="st-x">Coluna</label><input class="input num" id="st-x" type="number" data-num="x" value="${o.x}"></div><div class="field"><label for="st-y">Linha</label><input class="input num" id="st-y" type="number" data-num="y" value="${o.y}"></div><div class="field"><label for="st-w">Largura</label><input class="input num" id="st-w" type="number" min="1" max="12" data-num="w" value="${o.w}"></div><div class="field"><label for="st-h">Altura</label><input class="input num" id="st-h" type="number" min="1" max="12" data-num="h" value="${o.h}"></div></div>
     <div class="row between"><b>Rotação</b><span class="row" style="gap:4px"><button class="btn sm icon" type="button" data-sa="rot-l" aria-label="Girar 90° à esquerda">${ic('rotate-clockwise','rv-icon flip')}</button><button class="btn sm icon" type="button" data-sa="rot-r" aria-label="Girar 90° à direita">${ic('rotate-clockwise')}</button></span></div>
     ${rg('rot','Ajuste fino',0,345,15,o.rot||0,'°')}${rg('opacity','Opacidade',10,100,5,Math.round((o.opacity??1)*100),'%')}
     <div class="field"><label for="st-layer">Camada</label><select class="input" id="st-layer">${OBJ_LAYERS.map(([id,l])=>`<option value="${id}" ${o.layer===id?'selected':''}>${l}</option>`).join('')}</select></div>
     <div class="field"><span class="label">Tom</span>${sw('tint',TINTS,o.tint)}</div>
     ${tg('hidden','Visível para os jogadores',!o.hidden,'Desligado: só você vê esta peça')}${tg('blocks','Bloqueia movimento',o.blocks,'Ninguém para nesta casa')}${tg('blocksSight','Bloqueia visão',o.blocksSight)}${tg('locked','Travada',o.locked,'Não sai do lugar por engano')}
     ${tg('light','Emite luz',!!(o.light&&o.light.on))}${o.light&&o.light.on?rg('light-r','Alcance da luz',1,10,1,o.light.r,' casas')+`<div class="field"><span class="label">Cor da luz</span>${sw('lightcolor',LIGHT_COLORS,o.light.color)}</div>`:''}
     <div class="row"><button class="btn sm" type="button" data-sa="dup">${ic('copy')}Duplicar</button><button class="btn sm" type="button" data-sa="front">Para frente</button><button class="btn sm" type="button" data-sa="back">Para trás</button><button class="btn sm danger-btn" type="button" data-sa="delete">${ic('trash')}Excluir</button></div>`;
    const pt=$('canvas[data-pt]',body);if(a)Cena.thumb(pt,o.asset);else if(o.src){const im=Cena.imageCache[o.src];if(im)pt.getContext('2d').drawImage(im,8,8,96,96)}return}
   if(this.sel?.kind==='door'){const d=s.doors[this.sel.key];title(Cena.DOOR_TYPES.find(t=>t[0]===d.type)[1]);
    body.innerHTML=`<div class="field"><span class="label">Tipo</span><div class="chips">${Cena.DOOR_TYPES.map(([id,l])=>`<button type="button" class="fchip" data-prop="door-type" data-v="${id}" aria-pressed="${d.type===id}">${l}</button>`).join('')}</div></div>${tg('x','Aberta',d.open,'Na mesa, o mestre abre e fecha com a ferramenta Portas').replace('data-prop="toggle" data-v="x"','data-prop="door-open"')}
     <p class="small muted" style="margin:0">Porta secreta aparece como parede para os jogadores até ser aberta. Janela e grade deixam ver, mas não passar.</p><button class="btn sm danger-btn" type="button" data-sa="delete">${ic('trash')}Remover (vira parede)</button>`;return}
   if(this.sel?.kind==='note'){const n=s.notes.find(n=>n.id===this.sel.id);title('Nota do mestre');body.innerHTML=`<div class="field"><label for="st-note-text">Texto</label><textarea class="input" id="st-note-text" rows="5" placeholder="Ex.: a estátua esconde uma alavanca">${esc(n.text)}</textarea></div><p class="small muted" style="margin:0">Só o mestre vê as notas, na mesa e aqui.</p><button class="btn sm danger-btn" type="button" data-sa="delete">${ic('trash')}Remover nota</button>`;return}
   title('Ferramenta');const T=this.tool;
   if(T==='room')body.innerHTML=`<div class="field"><label for="st-floor">Piso da sala</label><select class="input" id="st-floor">${Cena.TERRAINS.map(t=>`<option value="${t.id}" ${this.set.roomFloor===t.id?'selected':''}>${t.name}</option>`).join('')}</select></div><div class="field"><label for="st-wallmat">Parede</label><select class="input" id="st-wallmat">${Cena.WALL_MATERIALS.map(([id,l])=>`<option value="${id}" ${this.set.wallMat===id?'selected':''}>${l}</option>`).join('')}</select></div><p class="small muted" style="margin:0">A sala ganha parede em todo o contorno. Depois, use Porta para abrir passagens.</p>`;
   else if(T==='wall')body.innerHTML=`<div class="field"><label for="st-wallmat">Material</label><select class="input" id="st-wallmat">${Cena.WALL_MATERIALS.map(([id,l])=>`<option value="${id}" ${this.set.wallMat===id?'selected':''}>${l}</option>`).join('')}</select></div><div class="row"><button class="btn sm" type="button" data-sa="auto-walls">${ic('wall')}Contornar todo o piso</button><button class="btn sm ghost" type="button" data-sa="clear-walls">Apagar todas as paredes</button></div>`;
   else if(T==='terrain'||T==='fill')body.innerHTML=`<p class="muted small" style="margin:0">Piso escolhido: <b>${esc(Cena.TERRAIN[this.set.terrain]?.name||'Apagar piso')}</b>. Troque na aba Terrenos da Biblioteca.</p><div class="mini-sw">${Cena.TERRAINS.slice(0,12).map(t=>`<button type="button" data-terrain="${t.id}" title="${t.name}" aria-pressed="${this.set.terrain===t.id}"><canvas width="56" height="56" data-sw="${t.id}"></canvas></button>`).join('')}</div>`;
   else body.innerHTML=`<p class="muted" style="margin:0">Selecione uma peça no mapa para editar posição, tamanho, rotação, luz, camada e visibilidade.</p><div class="kv"><span>Peças</span><b class="num">${s.objects.length}</b><span>Luzes</span><b class="num">${s.objects.filter(o=>o.light&&o.light.on).length}</b><span>Portas</span><b class="num">${Object.keys(s.doors).length}</b><span>Casas ocultas</span><b class="num">${s.fog.length}</b><span>Notas</span><b class="num">${s.notes.length}</b></div>`;
   $$('canvas[data-sw]',body).forEach(cv=>Cena.terrainSwatch(cv,cv.dataset.sw));return}
  if(this.panelTab==='scene'){title('Cena');
   body.innerHTML=`<div class="field"><label for="st-system">Sistema</label><select class="input" id="st-system">${[['ordem-paranormal','Ordem Paranormal'],['d-d','D&D 5e'],['gurps','GURPS 4e']].map(([v,l])=>`<option value="${v}" ${s.system===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="grid2f"><div class="field"><label for="st-cols">Colunas</label><input class="input num" id="st-cols" type="number" min="6" max="60" value="${s.cols}"></div><div class="field"><label for="st-rows">Linhas</label><input class="input num" id="st-rows" type="number" min="6" max="60" value="${s.rows}"></div></div><button class="btn sm" type="button" data-sa="resize">Aplicar tamanho (até 60 × 60)</button>
    ${rg('meters','Metros por casa',.5,5,.5,s.meters,' m')}
    <h4>Grade</h4>${tg('x','Mostrar grade',s.grid.show).replace('data-prop="toggle" data-v="x"','data-sa="grid"')}${tg('x','Só sobre o piso',s.grid.overTerrainOnly).replace('data-prop="toggle" data-v="x"','data-prop="grid-floor"')}
    ${rg('grid-alpha','Intensidade',0,40,1,Math.round(s.grid.alpha*100),'%')}<div class="row between"><span class="label">Cor</span>${sw('grid-color',[['#ffffff','Branca'],['#000000','Preta'],['#c7a87b','Dourada']],s.grid.color)}</div>
    <div class="row between"><span class="label">Espessura</span><div class="seg">${[1,2].map(w=>`<button type="button" data-prop="grid-width" data-v="${w}" aria-pressed="${s.grid.width===w}">${w} px</button>`).join('')}</div></div>
    <h4>Fundo</h4><div class="field"><label for="st-bg">Ao redor do mapa</label><select class="input" id="st-bg">${Cena.BACKGROUNDS.map(([v,l])=>`<option value="${v}" ${s.bg===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="row"><button class="btn sm" type="button" data-upload="bg">${ic('photo')}${s.image?'Trocar':'Importar'} imagem de mapa</button>${s.image?`<button class="btn sm ghost" type="button" data-sa="img-remove">Remover</button>`:''}</div>${s.image?rg('img-opacity','Opacidade da imagem',10,100,5,Math.round((s.imageOpacity??1)*100),'%'):''}
    <h4>Ambiente</h4><div class="seg">${[['dia','Dia','sun'],['entardecer','Entardecer','cloud-fog'],['noite','Noite','moon']].map(([v,l,i])=>`<button type="button" data-prop="time" data-v="${v}" aria-pressed="${s.ambient.time===v}">${ic(i)}${l}</button>`).join('')}</div>
    <div class="field"><span class="label">Clima</span><div class="chips">${[['nenhum','Nenhum'],['chuva','Chuva'],['neve','Neve'],['neblina','Neblina']].map(([v,l])=>`<button type="button" class="fchip" data-prop="weather" data-v="${v}" aria-pressed="${(s.ambient.weather||'nenhum')===v}">${l}</button>`).join('')}</div></div>`;return}
  if(this.panelTab==='layers'){title('Camadas');const count={fundo:Object.keys(s.terrain).length+' casas',paredes:Object.keys(s.walls).length+' trechos',tokens:'na Mesa',nevoa:s.fog.length+' casas',notas:s.notes.length+''};
   body.innerHTML=Cena.LAYERS.map(([id,l])=>{const L=s.layers[id]||{},n=count[id]||s.objects.filter(o=>o.layer===id).length+' peças';const fixed=id==='tokens';
    return `<div class="layer-row"><span class="grow"><b>${l}</b><small class="muted">${n}</small></span>${fixed?'<span class="small faint">editados na Mesa</span>':`<button class="ibtn sm" type="button" data-prop="layer-vis" data-v="${id}" aria-pressed="${L.visible!==false}" aria-label="Mostrar ${l}">${ic(L.visible===false?'eye-off':'eye')}</button><button class="ibtn sm" type="button" data-prop="layer-lock" data-v="${id}" aria-pressed="${!!L.locked}" aria-label="Travar ${l}">${ic('lock')}</button>`}</div>`}).join('')+`<p class="small faint" style="margin:0">Esconder uma camada aqui só afeta o Estúdio. Para esconder dos jogadores, use "Visível para os jogadores" na peça ou a Área oculta.</p>`}}
}
RV.Studio=Studio;
})();
