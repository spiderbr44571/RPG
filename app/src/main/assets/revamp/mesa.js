/* Mastermind · revamp — Mesa ao vivo (mestre e jogador). Desenha a cena publicada pelo Estúdio. */
(function(){
'use strict';
const {$,$$,esc,ic,clamp,on,emit,toast,copyText,CELL}=RV;
class Table{
 constructor(root,role){
  this.root=root;this.role=role;this.z=1;this.px=0;this.py=0;this.tool='move';this.variant={draw:'pen',fog:'hide'};this.color='#c7a87b';
  this.sel=role==='master'&&!RV.Live?.active('master')?'aurora':null;this.pointers=new Map();this.space=false;this.measure=null;this.pending=null;this.panelTab='init';this.drawerTab='beasts';this.paintedVer=0;
  this.build();this.fit(false);this.render();on(e=>{if(e==='state')this.render()});
 }
 S(){return this.role==='player'&&RV.pstate?RV.pstate:RV.state}
 get W(){return this.S().scene.cols*CELL}get H(){return this.S().scene.rows*CELL}
 visibleTokens(){return this.S().tokens.filter(t=>this.role==='master'||(!t.hidden&&!this.cellsOf(t).every(k=>this.S().fog.has(k))))}
 cellsOf(t){const a=[];for(let y=t.y;y<t.y+t.size;y++)for(let x=t.x;x<t.x+t.size;x++)a.push(x+','+y);return a}
 tok(id){return this.S().tokens.find(t=>t.id===id)}
 activeId(){const e=this.S().init.entries[this.S().init.idx];return e?e.id:null}
 build(){
  const R=this.root,M=this.role==='master';
  R.innerHTML=`
  <div class="stage" data-tool="move"><div class="world"><div class="map-shadow"></div><canvas class="cv-map"></canvas><canvas class="cv-fx"></canvas><div class="tokens"></div><canvas class="cv-dark"></canvas><canvas class="cv-veil"></canvas><div class="pins"></div></div><div class="weather" aria-hidden="true"></div></div>
  <div class="float room">${M?`<a class="ibtn room-back" href="#mestragem" aria-label="Voltar à Mestragem">${ic('chevron-left')}<span class="tip">Mestragem</span></a>`:''}<button class="room-btn" type="button" aria-haspopup="menu"><span><b class="room-name">${esc(RV.Live?.detail?.name||'Campanha de treino')}</b><small class="scene-name">${esc(this.S().scene.name)}</small></span>${ic('chevron-down')}</button><span class="chip gold state-chip num"></span></div>
  <div class="float tools" role="toolbar" aria-label="Ferramentas do mapa" aria-orientation="vertical"></div>
  <div class="float optbar" aria-live="polite"></div>
  <div class="float people">${M?`<button class="btn sm invite-btn" type="button">${ic('link')}Convidar</button>`:''}<div class="stack"></div><button class="ibtn panel-toggle" type="button" aria-label="Mostrar ou ocultar painel" aria-pressed="true">${ic('layout-sidebar-right')}</button></div>
  <div class="float banner" hidden></div>
  <aside class="float panel" aria-label="Painel da mesa">${RV.fh('','Mesa','panel')}<div class="panel-tabs" role="tablist">
    <button type="button" role="tab" data-ptab="init" aria-selected="true">${ic('list-numbers')}Iniciativa</button>
    <button type="button" role="tab" data-ptab="log" aria-selected="false">${ic('dice-5')}Rolagens</button>
    ${M?`<button type="button" role="tab" data-ptab="players" aria-selected="false">${ic('users')}Jogadores</button>`:''}
  </div><div class="panel-body"></div></aside>
  ${M?`<aside class="float drawer" aria-label="Adicionar ao mapa" hidden>${RV.fh('Adicionar ao mapa','Biblioteca da mesa','drawer')}<div class="panel-tabs" role="tablist"><button type="button" role="tab" data-dtab="sheets" aria-selected="false">Fichas</button><button type="button" role="tab" data-dtab="beasts" aria-selected="true">Bestiário</button><button type="button" role="tab" data-dtab="objs" aria-selected="false">Objetos</button></div><div class="panel-body"></div><div class="drawer-foot"><a class="btn sm" href="#estudio">${ic('brush')}Editar em Cenários</a><button class="btn sm primary" type="button" data-close="drawer">Concluir</button></div></aside>`:''}
  <div class="float zoom"><button class="ibtn" type="button" data-z="-1" aria-label="Diminuir zoom">${ic('zoom-out')}</button><span class="num zoom-v">100%</span><button class="ibtn" type="button" data-z="1" aria-label="Aumentar zoom">${ic('zoom-in')}</button><button class="ibtn" type="button" data-z="0" aria-label="Ajustar mapa à tela">${ic('focus-2')}</button></div>
  ${M?`<div class="float dice"><button class="ibtn dice-btn" type="button" aria-haspopup="dialog">${ic('dice-5')}Dados</button></div>`:''}
  <div class="float tcard" hidden></div>
  ${M?'':`<div class="float hud"></div><div class="sheet" role="dialog" aria-label="Sua ficha"><div class="grab"></div><div class="sheet-body"></div></div>`}`;
  this.stage=$('.stage',R);this.world=$('.world',R);this.tokensEl=$('.tokens',R);this.pinsEl=$('.pins',R);
  this.cvMap=$('.cv-map',R);this.cvFx=$('.cv-fx',R);this.cvDark=$('.cv-dark',R);this.cvVeil=$('.cv-veil',R);this.dpr=Math.min(window.devicePixelRatio||1,1.5);
  this.sizeCanvases();this.buildTools();this.bind();
  if(window.innerWidth<760||window.innerHeight<460){$('.panel',R).hidden=true;$('.panel-toggle',R).setAttribute('aria-pressed','false')}
 }
 sizeCanvases(){const W=this.W,H=this.H;[this.cvFx,this.cvVeil].forEach(c=>{c.width=W*this.dpr;c.height=H*this.dpr;c.style.width=W+'px';c.style.height=H+'px'});this.world.style.width=W+'px';this.world.style.height=H+'px'}
 buildTools(){
  const M=this.role==='master';
  const tools=M?[['move','pointer','Mover','V'],['measure','ruler','Medir','M'],['draw','brush','Desenhar','D',1],['fog','cloud-fog','Névoa','F',1],['doors','door','Portas','O'],['pin','map-pin','Marcar ponto','P'],'|',['light','bulb','Lanterna','L','toggle'],['add','plus','Adicionar ao mapa','A','toggle'],'|',['undo','arrow-back-up','Desfazer desenho','Ctrl Z','action']]
   :[['move','pointer','Mover','V'],['measure','ruler','Medir','M'],['pin','map-pin','Marcar ponto','P'],['inspect','eye','Inspecionar','I'],'|',['light','bulb','Lanterna','L','toggle']];
  $('.tools',this.root).innerHTML=tools.map(t=>t==='|'?'<div class="sep" role="separator"></div>':`<button class="ibtn ${t[4]===1?'has-sub':''}" type="button" data-tool="${t[0]}" aria-label="${t[2]}" aria-pressed="${t[0]==='move'}">${ic(t[1])}<span class="tip">${t[2]}<kbd>${t[3]}</kbd></span></button>`).join('');
 }
 /* ---- câmera ---- */
 apply(anim){this.world.classList.toggle('anim',!!anim);this.world.style.transform=`translate(${this.px}px,${this.py}px) scale(${this.z})`;$('.zoom-v',this.root).textContent=Math.round(this.z*100)+'%';if(RV.Tut?.flow)requestAnimationFrame(()=>RV.Tut.place())}
 fit(anim=true){const r=this.stage.getBoundingClientRect();if(!r.width)return;
  const phone=r.width<760,short=r.height<460,P=this.role==='player',panelOn=!$('.panel',this.root).hidden&&!phone;
  let L=phone?16:84,Rr=panelOn?332:16,T=phone?116:76,B=phone?(P?190:80):(P?118:84);if(short){L=16;T=124;B=P?78:70;Rr=panelOn?320:16}
  const aw=Math.max(80,r.width-L-Rr),ah=Math.max(80,r.height-T-B),W=this.W,H=this.H;
  if(phone&&!short){const me=this.tok(P?RV.me?.token:this.sel)||this.tok(RV.me?.token);this.z=clamp(ah/H*.95,.35,1);const cx=me?(me.x+me.size/2)*CELL:W/2;this.px=clamp(L+aw/2-cx*this.z,L+aw-W*this.z,L);this.py=T+(ah-H*this.z)/2}
  else{this.z=clamp(Math.min(aw/W,ah/H),.2,2.5);this.px=L+(aw-W*this.z)/2;this.py=T+(ah-H*this.z)/2}this.apply(anim)}
 zoomAt(f,cx,cy){const r=this.stage.getBoundingClientRect();const x=cx-r.left,y=cy-r.top;const nz=clamp(this.z*f,.2,3);this.px=x-(x-this.px)*(nz/this.z);this.py=y-(y-this.py)*(nz/this.z);this.z=nz;this.apply(false)}
 toWorld(cx,cy){const r=this.stage.getBoundingClientRect();return{x:(cx-r.left-this.px)/this.z,y:(cy-r.top-this.py)/this.z}}
 cellAt(cx,cy){const p=this.toWorld(cx,cy);return{x:Math.floor(p.x/CELL),y:Math.floor(p.y/CELL),wx:p.x,wy:p.y}}
 tokenAtPoint(cx,cy){const c=this.cellAt(cx,cy);return this.visibleTokens().slice().reverse().find(t=>c.x>=t.x&&c.x<t.x+t.size&&c.y>=t.y&&c.y<t.y+t.size)}
 /* ---- alcance: paredes, portas, objetos sólidos, outros tokens e (para o jogador) névoa ---- */
 reach(t){const st=this.S(),sc=st.scene,P=this.role==='player';const left=st.mode==='interlude'?99:t.speed-t.used;const out=new Map();if(left<=0||t.size>1)return out;
  const blocked=Cena.blockedCells(sc);st.tokens.forEach(o=>{if(o.id!==t.id)this.cellsOf(o).forEach(k=>blocked.add(k))});
  const q=[[t.x,t.y,0]],seen=new Set([t.x+','+t.y]);
  while(q.length){const[x,y,d]=q.shift();if(d>0)out.set(x+','+y,d);if(d>=left)continue;
   for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(seen.has(k)||blocked.has(k)||!Cena.stepOk(sc,x,y,dx,dy,P))continue;if(P&&st.fog.has(k))continue;seen.add(k);q.push([nx,ny,d+1])}}
  return out}
 canDrag(t){if(this.role==='master')return true;if(!RV.me?.token)return 'O mestre ainda não aprovou ou atribuiu a sua ficha.';if(t.owner!==RV.me.player||t.id!==RV.me.token)return 'Você só move o seu token.';if(this.S().mode==='combat'&&this.activeId()!==t.id)return 'Aguarde a sua vez na iniciativa.';return true}
 /* ---- eventos ---- */
 bind(){
  const st=this.stage,R=this.root;
  st.addEventListener('wheel',e=>{e.preventDefault();this.zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.012:.0016)),e.clientX,e.clientY)},{passive:false});
  // Com setPointerCapture o contextmenu chega no palco; o token é achado pela casa sob o cursor.
  st.addEventListener('contextmenu',e=>{e.preventDefault();const t=this.tokenAtPoint(e.clientX,e.clientY);if(t&&this.role==='master')this.openCtx(t.id,e.clientX,e.clientY)});
  st.addEventListener('pointerdown',e=>this.down(e));st.addEventListener('pointermove',e=>this.move(e));
  st.addEventListener('pointerup',e=>this.up(e));st.addEventListener('pointercancel',e=>this.up(e,true));
  R.addEventListener('click',e=>this.click(e));
  window.addEventListener('resize',()=>{if(!R.hidden)this.fit(false)});
 }
 down(e){
  this.closePops();this.stage.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointers.size===2){this.pinch={d:this.pdist(),z:this.z};this.drag=null;this.pan=null;return}
  const tokEl=e.target.closest('.tok'),c=this.cellAt(e.clientX,e.clientY);
  if(this.pending){this.placePending(c.x,c.y);return}
  if(e.button===2&&tokEl){this.select(tokEl.dataset.id);return}
  if(e.button===1||this.space||e.button===2){this.startPan(e);return}
  if(tokEl&&(this.tool==='move'||this.tool==='inspect')){const t=this.tok(tokEl.dataset.id);this.select(t.id);if(this.tool==='inspect')return;
   this.longPress=setTimeout(()=>{if(this.drag&&!this.drag.moved&&this.role==='master'){this.openCtx(t.id,e.clientX,e.clientY);this.drag=null}},550);
   const ok=this.canDrag(t);if(ok!==true){this.denied=ok;this.drag={t,blocked:true,sx:e.clientX,sy:e.clientY};return}
   // select() redesenha os tokens: pega o elemento novo, não o que recebeu o clique
   const p=this.toWorld(e.clientX,e.clientY);this.drag={t,el:this.tokensEl.querySelector(`[data-id="${t.id}"]`),ox:p.x-t.x*CELL,oy:p.y-t.y*CELL,sx:e.clientX,sy:e.clientY,moved:false,reach:this.reach(t)};this.renderFx();return}
  if(this.tool==='move'||this.tool==='inspect'){if(this.role==='master')this.select(null);this.startPan(e);return}
  if(this.tool==='measure'){this.measure={a:c,b:c};this.renderFx();return}
  if(this.tool==='draw'){const p=this.toWorld(e.clientX,e.clientY);if(this.variant.draw==='erase'){this.eraseAt(p);this.erasing=true;return}
   this.stroke={kind:this.variant.draw,color:this.color,pts:[[p.x,p.y]]};this.S().strokes.push(this.stroke);this.renderFx();return}
  if(this.tool==='fog'){if(this.variant.fog==='room-hide'||this.variant.fog==='room-show'){const cells=this.roomAt(c.x,c.y);if(cells.length){cells.forEach(k=>this.variant.fog==='room-hide'?this.S().fog.add(k):this.S().fog.delete(k));toast(this.variant.fog==='room-hide'?`Área oculta (${cells.length} casas).`:`Área revelada (${cells.length} casas).`);emit('fog:painted');emit('state')}return}
   this.fogPaint=true;this.paintFogAt(c);return}
  if(this.tool==='pin'){this.addPin(c.wx,c.wy);return}
  if(this.tool==='doors'){this.toggleDoorAt(c.wx,c.wy);return}
 }
 move(e){
  if(!this.pointers.has(e.pointerId))return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pinch&&this.pointers.size===2){const pts=[...this.pointers.values()];const f=this.pdist()/this.pinch.d*this.pinch.z/this.z;this.zoomAt(f,(pts[0].x+pts[1].x)/2,(pts[0].y+pts[1].y)/2);return}
  if(this.pan){this.px=this.pan.px+e.clientX-this.pan.x;this.py=this.pan.py+e.clientY-this.pan.y;this.apply(false);return}
  if(this.drag){const d=this.drag;if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>5){d.moved=true;clearTimeout(this.longPress)}
   if(d.blocked||!d.moved)return;const p=this.toWorld(e.clientX,e.clientY);d.el.classList.add('drag');d.el.style.left=(p.x-d.ox)+'px';d.el.style.top=(p.y-d.oy)+'px';
   const tx=Math.floor((p.x-d.ox+CELL/2)/CELL),ty=Math.floor((p.y-d.oy+CELL/2)/CELL);d.cell={x:tx,y:ty};
   const cost=d.reach.get(tx+','+ty),showBudget=this.role==='player'||d.t.id===this.activeId();
   let lab=d.el.querySelector('.drag-cost');if(!lab){lab=document.createElement('span');lab.className='drag-cost num';d.el.appendChild(lab)}
   if(!showBudget||d.t.size>1){lab.textContent=d.t.name;lab.classList.remove('over')}
   else if(this.S().mode==='interlude'){lab.textContent='Interlúdio · livre';lab.classList.remove('over')}
   else if(cost!=null){lab.textContent=`${cost} de ${d.t.speed-d.t.used} casas`;lab.classList.remove('over')}
   else{const home=tx===d.t.x&&ty===d.t.y;lab.textContent=home?'Origem':'Fora do alcance';lab.classList.toggle('over',!home)}return}
  if(this.measure){this.measure.b=this.cellAt(e.clientX,e.clientY);this.renderFx();return}
  if(this.stroke){const p=this.toWorld(e.clientX,e.clientY);if(this.stroke.kind==='pen')this.stroke.pts.push([p.x,p.y]);else this.stroke.pts[1]=[p.x,p.y];this.renderFx();return}
  if(this.erasing){this.eraseAt(this.toWorld(e.clientX,e.clientY));return}
  if(this.fogPaint)this.paintFogAt(this.cellAt(e.clientX,e.clientY));
 }
 up(e,cancel){
  this.pointers.delete(e.pointerId);clearTimeout(this.longPress);
  if(this.pinch){if(this.pointers.size<2)this.pinch=null;return}
  if(this.pan){this.pan=null;this.stage.classList.remove('panning');return}
  if(this.drag){const d=this.drag;this.drag=null;
   if(d.blocked){if(this.denied&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>5)toast(this.denied);this.denied=null;return}
   d.el.classList.remove('drag');d.el.querySelector('.drag-cost')?.remove();if(!d.moved||cancel||!d.cell){this.render();return}
   const{x,y}=d.cell,t=d.t,sc=this.S().scene;
   if(this.role==='master'){if(x<0||y<0||x+t.size>sc.cols||y+t.size>sc.rows){this.render();return}
    if(RV.Live?.active('master')){t.x=x;t.y=y;emit('token:moved',t.id);emit('state');RV.Live.move(this,t,x,y);return}
    const cost=d.reach.get(x+','+y);if(t.id===this.activeId()&&cost!=null&&this.S().mode==='combat')t.used+=cost;t.x=x;t.y=y;this.S().log.unshift({who:'Mestre',text:`${t.name} foi movido`});emit('token:moved',t.id);emit('state');return}
   const cost=d.reach.get(x+','+y);
   if(cost==null){toast(this.S().fog.has(x+','+y)?'Essa área está oculta.':'Fora do alcance desta rodada, ou há uma parede no caminho.');this.render();return}
   if(RV.Live?.active('player')){t.x=x;t.y=y;if(this.S().mode==='combat')t.used+=cost;emit('state');RV.Live.move(this,t,x,y);return}
   if(this.S().mode==='combat')t.used+=cost;t.x=x;t.y=y;this.S().log.unshift({who:RV.me?.name||'Você',text:`${t.name} andou ${cost} casa${cost>1?'s':''}`});emit('token:moved',t.id);emit('state');return}
  if(this.measure){const m=this.measure;this.measure=null;const d=Math.max(Math.abs(m.a.x-m.b.x),Math.abs(m.a.y-m.b.y));if(d>0){this.lastMeasure={...m,until:Date.now()+1800};setTimeout(()=>this.renderFx(),1900);emit('measure:done')}this.renderFx();return}
  if(this.stroke){const s=this.stroke;this.stroke=null;if(s.pts.length<2)this.S().strokes.pop();this.renderFx();return}
  if(this.erasing){this.erasing=false;return}
  if(this.fogPaint){this.fogPaint=false;emit('fog:painted');emit('state')}
 }
 pdist(){const p=[...this.pointers.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1}
 startPan(e){this.pan={x:e.clientX,y:e.clientY,px:this.px,py:this.py};this.stage.classList.add('panning')}
 roomAt(x,y){const sc=this.S().scene;if(!sc.terrain[x+','+y])return[];const out=[],seen=new Set([x+','+y]),q=[[x,y]];
  while(q.length&&out.length<4000){const[cx,cy]=q.shift();out.push(cx+','+cy);for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=(cx+dx)+','+(cy+dy);if(seen.has(k)||!sc.terrain[k])continue;const ek=dx?Cena.ek.v(Math.max(cx,cx+dx),cy):Cena.ek.h(cx,Math.max(cy,cy+dy));if(sc.walls[ek]||sc.doors[ek])continue;seen.add(k);q.push([cx+dx,cy+dy])}}return out}
 paintFogAt(c){const sc=this.S().scene;if(c.x<0||c.y<0||c.x>=sc.cols||c.y>=sc.rows)return;const k=c.x+','+c.y,hide=this.variant.fog==='hide';if(hide?this.S().fog.has(k):!this.S().fog.has(k))return;hide?this.S().fog.add(k):this.S().fog.delete(k);this.renderVeil()}
 eraseAt(p){const before=this.S().strokes.length;this.S().strokes=this.S().strokes.filter(s=>!s.pts.some(([x,y])=>Math.hypot(x-p.x,y-p.y)<18));if(this.S().strokes.length!==before)this.renderFx()}
 toggleDoorAt(wx,wy){const sc=this.S().scene;let best=null,bd=14;Object.keys(sc.doors).forEach(k=>{const[t,xy]=k.split(':'),[x,y]=xy.split(',').map(Number);const mx=(t==='h'?x+.5:x)*CELL,my=(t==='h'?y:y+.5)*CELL;const d=Math.hypot(mx-wx,my-wy);if(d<bd+CELL*.35){bd=d;best=k}});
  if(!best){toast('Toque perto de uma porta, janela ou grade para abrir ou fechar.');return}const d=sc.doors[best];d.open=!d.open;this.S().sceneVer++;const name=Cena.DOOR_TYPES.find(t=>t[0]===d.type)[1];
  this.S().log.unshift({who:'Mestre',text:`${name} ${d.open?'aberta':'fechada'}`});toast(`${name} ${d.open?'aberta':'fechada'}.`);emit('door:toggled');emit('state')}
 addPin(x,y){const el=document.createElement('div');el.className='pin';el.style.left=x+'px';el.style.top=y+'px';el.innerHTML='<i></i><b></b>';this.pinsEl.appendChild(el);setTimeout(()=>el.remove(),4200);toast(this.role==='master'?'Ponto marcado para todos.':'Você marcou um ponto no mapa.');emit('pin:placed')}
 placePending(x,y){const p=this.pending;this.pending=null;$$('.asset',this.root).forEach(a=>a.setAttribute('aria-pressed','false'));const sc=this.S().scene;if(!sc.terrain[x+','+y]){toast('Solte o token sobre o piso do mapa.');return}
  const t=p.kind==='creature'?RV.mkCreature(p.name,x,y):{id:'o'+Date.now(),name:p.name,ini:RV.initials(p.name),kind:p.kind,x,y,size:1,speed:p.characterId?6:0,used:0,characterId:p.characterId||null};
  t.x=Math.min(t.x,sc.cols-t.size);t.y=Math.min(t.y,sc.rows-t.size);this.S().tokens.push(t);this.select(t.id);this.S().log.unshift({who:'Mestre',text:`${t.name} entrou no mapa`});toast(t.name+' adicionado. Feche a biblioteca no ✕ ou em Concluir.');emit('token:added',t.id);emit('state')}
 select(id){this.sel=id;this.renderTokens();this.renderCard();this.renderFx()}
 /* ---- interface flutuante ---- */
 close(what){
  if(what==='panel'){const p=$('.panel',this.root);p.hidden=true;$('.panel-toggle',this.root).setAttribute('aria-pressed','false');if(window.innerWidth>=760)this.fit()}
  if(what==='drawer'){$('.drawer',this.root).hidden=true;this.pending=null;this.renderToolState()}
  if(what==='tcard'){this.sel=null;this.renderTokens();this.renderCard();this.renderFx()}
  if(what==='pop')this.closePops();
  if(what==='sheet')$('.sheet',this.root)?.classList.remove('open');
 }
 /* Esc fecha o que estiver mais por cima */
 escape(){if($('.pop',this.root)){this.closePops();return true}if(this.pending){this.pending=null;$$('.asset',this.root).forEach(a=>a.setAttribute('aria-pressed','false'));return true}
  if($('.sheet.open',this.root)){this.close('sheet');return true}if($('.drawer',this.root)&&!$('.drawer',this.root).hidden){this.close('drawer');return true}if(!$('.tcard',this.root).hidden){this.close('tcard');return true}return false}
 click(e){
  const b=e.target.closest('button,a[data-close]');if(!b||!this.root.contains(b))return;
  if(b.dataset.close){this.close(b.dataset.close);return}
  if(b.classList.contains('central-open')){RV.openCentral();return}
  if(b.dataset.tool){this.pickTool(b.dataset.tool);return}
  if(b.dataset.opt){const[k,v]=b.dataset.opt.split(':');if(k==='color')this.color=v;else if(k==='fogall'){if(v==='show')this.S().fog.clear();else Object.keys(this.S().scene.terrain).forEach(c=>this.S().fog.add(c));emit('fog:painted');emit('state');toast(v==='show'?'Mapa todo revelado.':'Mapa todo oculto.')}
   else if(k==='clear'){this.S().strokes=[];this.renderFx()}else this.variant[k]=v;this.renderOpts();return}
  if(b.dataset.z!=null){const z=+b.dataset.z;if(!z)this.fit();else{const r=this.stage.getBoundingClientRect();this.zoomAt(z>0?1.2:1/1.2,r.left+r.width/2,r.top+r.height/2)}return}
  if(b.dataset.ptab){this.panelTab=b.dataset.ptab;this.renderPanel();if(b.dataset.ptab==='players')emit('players:opened');return}
  if(b.dataset.dtab){this.drawerTab=b.dataset.dtab;this.renderDrawer();return}
  if(b.classList.contains('panel-toggle')){const p=$('.panel',this.root);p.hidden=!p.hidden;b.setAttribute('aria-pressed',String(!p.hidden));if(window.innerWidth>=760)this.fit();return}
  if(b.classList.contains('room-btn')){this.openRoomMenu(b);return}
  if(b.classList.contains('invite-btn')){this.openInvite(b);return}
  if(b.classList.contains('dice-btn')||b.classList.contains('hud-dice')){this.openDice();return}
  if(b.dataset.act)this.act(b.dataset.act,b);
 }
 pickTool(t){
  if(t==='light'){this.S().light=!this.S().light;emit('state');toast(this.S().light?'Lanterna ligada: fora da luz dos personagens e das fontes do mapa, fica escuro.':'Lanterna desligada.');return}
  if(t==='add'){const d=$('.drawer',this.root);d.hidden=!d.hidden;if(!d.hidden){this.renderDrawer();if(window.innerWidth<760)$('.panel',this.root).hidden=true}else this.pending=null;this.renderToolState();return}
  if(t==='undo'){if(this.S().strokes.length){this.S().strokes.pop();this.renderFx();toast('Último desenho desfeito.')}else toast('Nada para desfazer.');return}
  this.tool=t;this.stage.dataset.tool=t;this.renderToolState();this.renderOpts();emit('tool:'+t);this.renderFx();
 }
 renderToolState(){$$('[data-tool]',$('.tools',this.root)).forEach(b=>{const t=b.dataset.tool;b.setAttribute('aria-pressed',String(t===this.tool||(t==='light'&&this.S().light)||(t==='add'&&!!$('.drawer',this.root)&&!$('.drawer',this.root).hidden)))})}
 renderOpts(){
  const o=$('.optbar',this.root),v=this.variant,P=(k,val,label,i)=>`<button class="opt" type="button" data-opt="${k}:${val}" aria-pressed="${v[k]===val}">${i?ic(i):''}${label}</button>`;const M=this.role==='master';let h='';
  if(this.tool==='move')h=`<span class="t">Mover</span><span class="hint">${M?'Arraste tokens. Clique direito abre as ações.':'Arraste o seu token na sua vez.'} Espaço + arrastar move o mapa.</span>`;
  if(this.tool==='inspect')h=`<span class="t">Inspecionar</span><span class="hint">Toque num token para ver o que você conhece dele.</span>`;
  if(this.tool==='measure')h=`<span class="t">Medir</span><span class="hint">Arraste de um ponto a outro · 1 casa = ${String(this.S().scene.meters).replace('.',',')} m</span>`;
  if(this.tool==='pin')h=`<span class="t">Marcar</span><span class="hint">Toque no mapa para chamar a atenção da mesa.</span>`;
  if(this.tool==='doors')h=`<span class="t">Portas</span><span class="hint">Toque numa porta, janela ou grade para abrir ou fechar.</span><a class="opt" href="#estudio">${ic('brush')}Editar em Cenários</a>`;
  if(this.tool==='draw')h=`<span class="t">Desenhar</span>${P('draw','pen','Pincel','brush')}${P('draw','rect','Retângulo','square')}${P('draw','circle','Círculo','circle')}${P('draw','erase','Borracha','eraser')}<span class="sep"></span>${['#c7a87b','#e0707c','#6db7e0','#e8e7e7'].map(c=>`<button class="opt" type="button" data-opt="color:${c}" aria-label="Cor" aria-pressed="${this.color===c}"><span class="cdot" style="background:${c}"></span></button>`).join('')}<button class="opt" type="button" data-opt="clear:1">${ic('trash')}Limpar</button>`;
  if(this.tool==='fog')h=`<span class="t">Névoa</span>${P('fog','hide','Ocultar','eye-off')}${P('fog','show','Revelar','eye')}${P('fog','room-hide','Ocultar sala','door')}${P('fog','room-show','Revelar sala','door-exit')}<button class="opt" type="button" data-opt="fogall:show">${ic('sun')}Revelar tudo</button>`;
  o.innerHTML=h;
 }
 closePops(){$$('.pop',this.root).forEach(p=>p.remove())}
 pop(html,cls,anchor,place){this.closePops();const p=document.createElement('div');p.className='pop '+(cls||'');p.innerHTML=html;this.root.appendChild(p);
  if(anchor){const r=anchor.getBoundingClientRect(),hr=this.root.getBoundingClientRect();const left=place==='right'?r.right-hr.left-p.offsetWidth:r.left-hr.left;p.style.left=clamp(left,8,hr.width-p.offsetWidth-8)+'px';p.style.top=(r.bottom-hr.top+8)+'px'}
  setTimeout(()=>{const close=ev=>{if(!p.isConnected){document.removeEventListener('pointerdown',close,true);return}if(!p.contains(ev.target)&&!ev.target.closest('.room-btn,.invite-btn,.dice-btn,.hud-dice')){p.remove();document.removeEventListener('pointerdown',close,true)}};document.addEventListener('pointerdown',close,true)});return p}
 openRoomMenu(b){const M=this.role==='master';
  this.pop(`<div class="mh">${esc(M?RV.Live?.detail?.name||'Campanha de treino':RV.Live?.conn?.campaign||'Mesa')}</div>
   ${M?`<div style="padding:6px 8px 8px"><div class="seg" role="group" aria-label="Modo da sessão"><button type="button" data-act="mode-combat" aria-pressed="${this.S().mode==='combat'}">${ic('swords')}Combate</button><button type="button" data-act="mode-interlude" aria-pressed="${this.S().mode==='interlude'}">${ic('coffee')}Interlúdio</button></div></div><hr>
   <div class="mh">Cenário publicado</div><button type="button" data-act="noop">${ic('check')}${esc(this.S().scene.name)}</button><a href="#estudio">${ic('brush')}Editar em Cenários</a><hr>
   <button type="button" data-act="canvas">${ic('layout-grid')}Canvas da campanha</button><a href="#mestragem">${ic('crown')}Voltar à Mestragem</a>`:
   `<button type="button" data-act="sheet">${ic('file-text')}Minha ficha</button><button type="button" data-act="journal">${ic('notes')}Caderno</button><button type="button" data-act="central">${ic('layout-grid')}Central</button><hr><a href="#entrar">${ic('door-exit')}Sair da mesa</a>`}`,'menu',b)}
 openInvite(b){const inv=RV.Live?.invites?.();
  this.pop(`${RV.fh('','Convide para a mesa','pop')}<div style="display:flex;flex-direction:column;gap:10px;width:min(340px,80vw)">${inv?`
  <div class="item"><span class="grow"><span class="small muted">Pelo app Mastermind (recomendado): cole em Entrar numa mesa</span><br><span class="num small" style="word-break:break-all">${esc(inv.app)}</span></span><button class="btn sm" type="button" data-act="copy-invite" data-v="${esc(inv.app)}">${ic('copy')}Copiar</button></div>
  <div class="item"><span class="grow"><span class="small muted">Pelo navegador</span><br><span class="num small" style="word-break:break-all">${esc(inv.web)}</span></span><button class="btn sm" type="button" data-act="copy-invite" data-v="${esc(inv.web)}">${ic('copy')}Copiar</button></div>
  <p class="small muted" style="margin:0">Pelo app, o jogador escolhe uma ficha salva no celular e envia para você aprovar. A mesa só funciona na rede local.</p>`:
  `<p class="small muted" style="margin:0">Esta é a campanha de treino. Para convidar jogadores, ligue o servidor da mesa na Mestragem (no app Mastermind) e escolha uma campanha.</p><button class="btn sm" type="button" data-act="copy-invite" data-v="exemplo: http://192.168.0.12:8765/join/…">${ic('copy')}Copiar convite de exemplo</button><a class="btn sm ghost" href="#mestragem">${ic('crown')}Ir para a Mestragem</a>`}</div>`,'',b,'right')}
 openDice(){const M=this.role==='master';
  const p=this.pop(`${RV.fh('Calculados pelo servidor','Dados','pop')}
   <div class="dgrid">${['d4','d6','d8','d10','d12','d20','d100'].map(d=>`<button type="button" data-act="die" data-d="${d}">${d}</button>`).join('')}</div>
   <div class="row" style="flex-wrap:nowrap"><input class="input num" id="dice-f-${this.role}" value="1d20" aria-label="Notação" style="min-height:38px"><button class="btn primary" type="button" data-act="roll">Rolar</button></div>
   <div class="row between"><div class="seg" role="group" aria-label="Como somar">${[['sum','Soma'],['highest','Maior'],['lowest','Menor']].map(([v,l])=>`<button type="button" data-act="rmode" data-v="${v}" aria-pressed="${(this.rmode||'sum')===v}">${l}</button>`).join('')}</div>
   ${M?`<div class="seg" role="group" aria-label="Quem vê"><button type="button" data-act="rvis" data-v="public" aria-pressed="${(this.rvis||'public')==='public'}">Todos</button><button type="button" data-act="rvis" data-v="self" aria-pressed="${this.rvis==='self'}">Só eu</button></div>`:''}</div>
   <div class="dice-result"></div><p class="small faint" style="margin:0">Ordem: 3O+5 rola 3 dados de atributo e fica o maior.</p>`,'dice-pop');
  if(!M){p.style.left='50%';p.style.transform='translateX(-50%)';p.style.bottom=(this.root.clientHeight<460?'70px':'110px')}}
 openCtx(id,x,y){const t=this.tok(id);if(!t)return;this.select(id);const hr=this.root.getBoundingClientRect();
  const p=this.pop(`<div class="mh">${esc(t.name)}</div><button type="button" data-act="card">${ic('file-text')}Abrir ficha</button>
   ${t.hp||t.res?`<button type="button" data-act="hp" data-v="-1">${ic('heart')}Dano −1</button><button type="button" data-act="hp" data-v="1">${ic('heart')}Cura +1</button>`:''}
   <button type="button" data-act="rotate">${ic('rotate-clockwise')}Girar 45°</button><button type="button" data-act="hide">${ic(t.hidden?'eye':'eye-off')}${t.hidden?'Mostrar aos jogadores':'Ocultar dos jogadores'}</button>
   <button type="button" data-act="init-add">${ic('list-numbers')}${this.S().init.entries.some(e=>e.id===id)?'Já está na iniciativa':'Adicionar à iniciativa'}</button><hr><button type="button" class="danger" data-act="remove">${ic('trash')}Remover do mapa</button>`,'menu');
  p.style.left=clamp(x-hr.left,8,hr.width-p.offsetWidth-8)+'px';p.style.top=clamp(y-hr.top,8,hr.height-p.offsetHeight-8)+'px'}
 act(a,b){const st=this.S(),t=this.tok(this.sel);if(RV.Live&&RV.Live.act(this,a,b,t))return;const done=()=>{this.closePops();emit('state')};
  switch(a){
   case 'mode-combat':case 'mode-interlude':st.mode=a==='mode-combat'?'combat':'interlude';if(st.mode==='interlude')emit('mode:interlude');toast(st.mode==='combat'?'Combate: movimento pela iniciativa.':'Interlúdio: movimento livre, iniciativa pausada.');done();break;
   case 'canvas':emit('canvas:opened');this.closePops();if(RV.classic)RV.classic('canvas');else toast('O Canvas da campanha abre no app Mastermind.');break;
   case 'journal':this.openJournal();break;
   case 'jn-save':this.saveJournal(b);break;
   case 'jn-del':this.journal=(this.journal||[]).filter(n=>n.id!==b.dataset.v);this.saveJournal(null);break;
   case 'central':this.closePops();RV.openCentral();break;
   case 'soon':toast((b.dataset.what||'Esta parte')+' fica na interface clássica do app.');this.closePops();break;
   case 'noop':this.closePops();break;
   case 'copy-invite':copyText(b.dataset.v).then(ok=>toast(ok?'Copiado.':'Selecione e copie: '+b.dataset.v));emit('invite:copied');break;
   case 'die':$(`#dice-f-${this.role}`,this.root).value='1'+b.dataset.d;break;
   case 'rmode':this.rmode=b.dataset.v;$$('[data-act="rmode"]',this.root).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));break;
   case 'rvis':this.rvis=b.dataset.v;$$('[data-act="rvis"]',this.root).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));break;
   case 'roll':this.rollAndShow($(`#dice-f-${this.role}`,this.root).value,this.role==='master'?'Mestre':(RV.me?.name||'Você'),$('.dice-result',this.root));break;
   case 'card':this.renderCard();this.closePops();break;
   case 'hp':if(t){const v=+b.dataset.v,r=t.hp||(t.res&&Object.values(t.res)[0]);if(r)r[0]=clamp(r[0]+v,0,r[1]);done()}break;
   case 'rotate':if(t){t.rot=((t.rot||0)+45)%360;done()}break;
   case 'hide':if(t){t.hidden=!t.hidden;toast(t.hidden?t.name+' agora está oculto dos jogadores.':t.name+' agora está visível.');done()}break;
   case 'init-add':if(t&&!st.init.entries.some(e=>e.id===t.id)){st.init.entries.push({id:t.id,score:null});this.panelTab='init'}done();break;
   case 'remove':if(t){st.tokens=st.tokens.filter(x=>x!==t);st.init.entries=st.init.entries.filter(e=>e.id!==t.id);st.init.idx=Math.min(st.init.idx,Math.max(0,st.init.entries.length-1));this.sel=null}done();break;
   case 'atk':case 'dmg':{const c=RV.CREATURES[t?.creature];if(c){this.rollAndShow(a==='atk'?c.attack:c.damage,t.name+(a==='atk'?': ataque':': dano'),null)}break}
   case 'init-next':if(st.mode==='interlude'){toast('A iniciativa fica pausada no Interlúdio.');break}if(!st.init.entries.length)break;st.init.idx=(st.init.idx+1)%st.init.entries.length;if(st.init.idx===0)st.init.round++;{const n=this.tok(st.init.entries[st.init.idx].id);if(n){n.used=0;this.sel=n.id}st.log.unshift({who:'Mesa',text:`Vez de ${n?n.name:'—'} · rodada ${st.init.round}`})}emit('initiative:next');done();break;
   case 'init-roll':st.init.entries.forEach(e=>{if(e.score==null){const tk=this.tok(e.id),c=RV.CREATURES[tk?.creature];const r=RV.doRoll(c&&c.initiative?c.initiative:'1d20');e.score=r?r.total:10}});st.init.entries.sort((x,y)=>(y.score??-99)-(x.score??-99));st.init.idx=0;toast('Iniciativa rolada para quem estava sem valor.');done();break;
   case 'init-clear':st.init.entries=[];st.init.idx=0;st.init.round=1;done();break;
   case 'init-set':{const v=parseInt($('.init-set-v',this.root)?.value,10);if(!t||isNaN(v)){toast('Digite um número para a iniciativa.');break}const e=st.init.entries.find(e=>e.id===t.id);const cur=st.init.entries[st.init.idx]?.id;if(e)e.score=v;else st.init.entries.push({id:t.id,score:v});st.init.entries.sort((x,y)=>(y.score??-99)-(x.score??-99));st.init.idx=Math.max(0,st.init.entries.findIndex(e=>e.id===cur));done();break}
   case 'sheet':this.openSheet(b?.dataset.v);this.closePops();break;
   case 'stab':this.sheetTab=b.dataset.v;this.renderSheet();if(b.dataset.v==='powers')emit('powers:opened');break;
   case 'power-req':toast('Pedido enviado ao mestre. O poder só vale depois da aprovação.');b.disabled=true;b.textContent='Pedido enviado';break;
   case 'res':{const me=this.me();if(!me)break;const[k,d]=b.dataset.v.split('|');const r=me.res?.[k];if(!r)break;r[0]=clamp(r[0]+(+d),0,r[1]);emit('state');break}
  }}
 /* Caderno do jogador: notas só dele, guardadas na mesa (o mestre não vê) */
 openJournal(){const live=RV.Live?.active('player');const draw=()=>{const notes=this.journal||[];
   this.pop(`${RV.fh(live?'Só você vê':'Campanha de treino','Caderno','pop')}<div style="display:flex;flex-direction:column;gap:8px;width:min(360px,84vw);max-height:60vh;overflow:auto">
    ${notes.map(n=>`<div class="item" style="align-items:flex-start"><div class="grow"><b>${esc(n.title)}</b><p class="small muted" style="margin:2px 0 0;white-space:pre-wrap">${esc(n.body)}</p></div><button class="btn sm ghost icon" type="button" data-act="jn-del" data-v="${esc(n.id)}" aria-label="Apagar nota">${ic('trash')}</button></div>`).join('')||'<p class="small muted" style="margin:0">Nenhuma nota ainda.</p>'}
    <input class="input jn-title" maxlength="100" placeholder="Título" aria-label="Título da nota"><textarea class="input jn-body" rows="3" maxlength="5000" placeholder="O que você quer lembrar?" aria-label="Texto da nota"></textarea>
    <button class="btn sm primary" type="button" data-act="jn-save">${ic('plus')}Guardar nota</button></div>`,'journal-pop');const p=$('.journal-pop',this.root);if(p){p.style.left='50%';p.style.transform='translateX(-50%)';p.style.top='70px'}};
  if(live&&!this.journalLoaded){RV.Net.player(RV.Live.conn,'GET',RV.Live.ppath('/journal')).then(d=>{this.journal=d.notes||[];this.journalLoaded=true;draw()}).catch(e=>toast(e.message));return}draw()}
 saveJournal(b){const live=RV.Live?.active('player');if(b){const t=$('.jn-title',this.root)?.value.trim(),body=$('.jn-body',this.root)?.value.trim();if(!body){toast('Escreva a nota.');return}
   this.journal=(this.journal||[]).concat([{id:'n'+Date.now().toString(36),title:t||'Nota',body}]).slice(-80)}
  if(!live){this.openJournal();return}
  RV.Net.player(RV.Live.conn,'POST',RV.Live.ppath('/journal'),{notes:this.journal}).then(d=>{if(d?.notes)this.journal=d.notes;this.openJournal();toast('Caderno salvo.')}).catch(e=>toast(e.message))}
 rollAndShow(f,who,target){if(RV.Live?.active(this.role)){RV.Live.roll(this,f,'Rolagem',target);return}const r=RV.doRoll(f,this.rmode);if(!r){toast('Notação inválida. Exemplos: 1d20+3, 2d6, 3O+5');return}
  const vis=this.role==='master'?(this.rvis||'public'):'public';this.S().log.unshift({who,text:r.label+(r.mode!=='sum'?(r.mode==='highest'?' · maior':' · menor'):''),faces:r.faces,kept:r.kept,total:r.total,vis});
  const html=`<div class="result"><div><div>${r.faces.map(v=>`<span class="die-face roll ${r.kept===v?'kept':''}">${v}</span>`).join('')}</div><div class="small muted" style="margin-top:4px">${esc(r.label)}${vis==='self'?' · só você vê':' · todos veem'}</div></div><span class="total num">${r.total}</span></div>`;
  if(target)target.innerHTML=html;else toast(`${who}: ${r.label} = ${r.total}`);emit('dice:rolled');emit('state')}
 /* ---- render ---- */
 render(){if(!this.stage)return;const st=this.S();
  if(this.paintedVer!==st.sceneVer||this.paintedAlpha!==RV.prefs.gridAlpha){this.paintedVer=st.sceneVer;this.paintedAlpha=RV.prefs.gridAlpha;this.sizeCanvases();Cena.render(this.cvMap,st.scene,{dpr:this.dpr,gridAlpha:RV.prefs.gridAlpha??undefined,forPlayer:this.role==='player',showNotes:this.role==='master'});$('.scene-name',this.root).textContent=st.scene.name}
  const lights=st.light?st.tokens.filter(t=>t.kind==='pc'||t.kind==='ally').map(t=>[(t.x+t.size/2)*CELL,(t.y+t.size/2)*CELL,CELL*4.5]):[];
  Cena.renderDark(this.cvDark,st.scene,{dpr:this.dpr,master:this.role==='master',flashlight:st.light,forPlayer:this.role==='player',lights});
  $('.weather',this.root).className='weather w-'+(st.scene.ambient.weather||'nenhum');
  this.renderTokens();this.renderFx();this.renderVeil();this.renderPanel();this.renderCard();this.renderOpts();this.renderToolState();this.renderChrome();this.renderDrawer();if(this.role==='player'){this.renderHud();this.renderSheet()}}
 renderChrome(){const st=this.S(),act=this.tok(this.activeId());const rn=$('.room-name',this.root);if(rn)rn.textContent=this.role==='master'?(RV.Live?.detail?.name||'Campanha de treino'):(RV.Live?.conn?.campaign||'Mesa');
  const stack=$('.people .stack',this.root);if(stack&&this.role==='master'){const html=RV.PLAYERS.filter(p=>p.online!==false).map(p=>`<span class="avatar" title="${esc(p.name)}${p.char?' · '+esc(p.char):''}" style="background:${p.color}">${esc(p.ini)}${p.online?'<span class="dot on"></span>':''}</span>`).join('');if(stack.innerHTML!==html)stack.innerHTML=html}$('.state-chip',this.root).textContent=st.mode==='combat'?`Combate · rodada ${st.init.round}`:'Interlúdio';const bn=$('.banner',this.root);
  if(this.role==='player'){bn.hidden=false;const mine=act&&act.id===RV.me?.token;bn.className='float banner'+(mine&&st.mode==='combat'?' you':'');bn.innerHTML=st.mode==='interlude'?`${ic('coffee')}Interlúdio · movimento livre`:mine?`${ic('hourglass')}Sua vez · ${Math.max(0,act.speed-act.used)} casas para andar`:`${ic('hourglass')}Vez de ${esc(act?act.name:'—')}`}
  else{bn.hidden=st.mode!=='interlude';bn.innerHTML=`${ic('coffee')}Interlúdio · movimento livre, iniciativa pausada`}this.stage.classList.toggle('names',RV.prefs.showNames)}
 renderTokens(){const act=this.activeId();
  this.tokensEl.innerHTML=this.visibleTokens().map(t=>{const col=RV.COLORS[t.kind]||RV.COLORS.npc,s=t.size;const hp=t.hp?t.hp[0]/t.hp[1]:t.res?t.res.Vida[0]/t.res.Vida[1]:null;const showBar=hp!=null&&(this.role==='master'||t.kind!=='foe');
   return `<div class="tok ${t.kind} ${t.id===this.sel?'sel':''} ${t.hidden?'ghosted':''}" data-id="${t.id}" style="left:${t.x*CELL}px;top:${t.y*CELL}px;width:${s*CELL}px;height:${s*CELL}px;--ring:${col.ring};--hi:${col.hi};--lo:${col.lo};--s:${s};--rot:${t.rot||0}deg" aria-label="${esc(t.name)}">
    <div class="tok-disc">${esc(t.ini)}</div>${showBar?`<div class="tok-bar"><i style="width:${Math.round(hp*100)}%;--c:${hp<.35?'#e0707c':hp<.6?'#e3a85a':'#86bd9c'}"></i></div>`:''}
    <span class="tok-name">${esc(t.name)}</span>${t.hidden?`<span class="tok-badge" title="Oculto dos jogadores">${ic('eye-off')}</span>`:act===t.id?`<span class="tok-badge turn" title="Vez deste token">${ic('hourglass')}</span>`:''}</div>`}).join('')}
 renderFx(){const g=this.cvFx.getContext('2d'),W=this.W,H=this.H;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,W,H);
  this.S().strokes.forEach(s=>{g.strokeStyle=s.color;g.lineWidth=4;g.lineCap='round';g.lineJoin='round';g.beginPath();const[a,b]=[s.pts[0],s.pts[s.pts.length-1]];
   if(s.kind==='pen')s.pts.forEach(([x,y],i)=>g[i?'lineTo':'moveTo'](x,y));else if(s.kind==='rect'&&b)g.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]);else if(s.kind==='circle'&&b)g.arc(a[0],a[1],Math.hypot(b[0]-a[0],b[1]-a[1]),0,7);g.stroke()});
  const t=this.role==='player'?this.tok('aurora'):this.tok(this.drag?.t?.id||this.sel);
  if(t&&this.tool==='move'&&t.size===1&&(this.S().mode==='interlude'?this.role==='player':t.id===this.activeId())){const r=this.drag?.reach||this.reach(t);
   r.forEach((d,k)=>{const[x,y]=k.split(',').map(Number);g.fillStyle='rgba(199,168,123,.16)';g.fillRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4);g.beginPath();g.arc(x*CELL+CELL/2,y*CELL+CELL/2,3,0,7);g.fillStyle='rgba(199,168,123,.7)';g.fill()})}
  const m=this.measure||(this.lastMeasure&&this.lastMeasure.until>Date.now()?this.lastMeasure:null);$$('.measure-label',this.world).forEach(l=>l.remove());
  if(m){const ax=m.a.x*CELL+CELL/2,ay=m.a.y*CELL+CELL/2,bx=m.b.x*CELL+CELL/2,by=m.b.y*CELL+CELL/2,d=Math.max(Math.abs(m.a.x-m.b.x),Math.abs(m.a.y-m.b.y));
   g.strokeStyle='#c7a87b';g.lineWidth=4;g.setLineDash([10,8]);g.beginPath();g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();g.setLineDash([]);[[ax,ay],[bx,by]].forEach(([x,y])=>{g.fillStyle='#c7a87b';g.beginPath();g.arc(x,y,7,0,7);g.fill();g.strokeStyle='#17131c';g.lineWidth=2;g.stroke()});
   const l=document.createElement('div');l.className='measure-label num';l.style.left=bx+'px';l.style.top=by+'px';l.textContent=`${d} casa${d===1?'':'s'} · ${(d*this.S().scene.meters).toLocaleString('pt-BR')} m`;this.world.appendChild(l)}}
 renderVeil(){const g=this.cvVeil.getContext('2d'),W=this.W,H=this.H;g.setTransform(this.dpr,0,0,this.dpr,0,0);g.clearRect(0,0,W,H);const M=this.role==='master',fog=this.S().fog;
  if(!this.hatch){const p=document.createElement('canvas');p.width=p.height=12;const pg=p.getContext('2d');pg.strokeStyle='rgba(156,144,221,.55)';pg.lineWidth=2;pg.beginPath();pg.moveTo(0,12);pg.lineTo(12,0);pg.stroke();this.hatch=g.createPattern(p,'repeat')}
  fog.forEach(k=>{const[x,y]=k.split(',').map(Number);if(M){g.fillStyle='rgba(10,12,20,.55)';g.fillRect(x*CELL,y*CELL,CELL,CELL);g.fillStyle=this.hatch;g.fillRect(x*CELL,y*CELL,CELL,CELL)}else{g.fillStyle='#07080b';g.fillRect(x*CELL-.5,y*CELL-.5,CELL+1,CELL+1)}});
  if(!M){g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=10;g.filter='blur(6px)';fog.forEach(k=>{const[x,y]=k.split(',').map(Number);if(!fog.has((x+1)+','+y)||!fog.has((x-1)+','+y)||!fog.has(x+','+(y+1))||!fog.has(x+','+(y-1)))g.strokeRect(x*CELL,y*CELL,CELL,CELL)});g.filter='none'}}
 renderPanel(){const body=$('.panel-body',this.root),st=this.S(),M=this.role==='master';$$('[data-ptab]',this.root).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ptab===this.panelTab)));
  $('.panel .fh h3',this.root).textContent={init:'Iniciativa',log:'Rolagens',players:'Jogadores'}[this.panelTab];$('.panel .fh',this.root).querySelector('.kicker')?.remove();
  if(this.panelTab==='init'){const rows=st.init.entries.map((e,i)=>{const t=this.tok(e.id);if(!t)return'';if(!M&&(t.hidden||this.cellsOf(t).every(k=>st.fog.has(k))))return'';const col=RV.COLORS[t.kind]||RV.COLORS.npc;
    return `<div class="init-row ${i===st.init.idx?'now':''}"><span class="score num">${e.score??'—'}</span><div style="min-width:0"><b>${esc(t.name)}</b><span class="small muted">${i===st.init.idx?(st.mode==='combat'?'Agora':'Pausado'):t.kind==='foe'?'Inimigo':(RV.PLAYERS.find(p=>p.id===t.owner)?.name||'Aliado')}${t.hidden?' · oculto':''}</span></div><span class="avatar" style="width:26px;height:26px;font-size:10px;background:${col.ring}">${esc(t.ini)}</span></div>`}).join('');
   body.innerHTML=`<div class="row between"><span class="label">Rodada <span class="num">${st.init.round}</span></span>${st.mode==='interlude'?'<span class="chip violet">Pausada</span>':''}</div>${rows||(M?'<p class="muted small">Ninguém na iniciativa. Use o menu do token para adicionar.</p>':'<p class="muted small">Ninguém na iniciativa ainda.</p>')}
    ${M?`<div class="row" style="margin-top:4px"><button class="btn sm primary init-next" type="button" data-act="init-next" ${st.mode==='interlude'?'disabled':''}>${ic('player-skip-forward')}Próximo</button><button class="btn sm" type="button" data-act="init-roll">${ic('dice-5')}Rolar faltantes</button><button class="btn sm ghost" type="button" data-act="init-clear">Limpar</button></div>`:'<p class="small faint" style="margin:0">A ordem é definida pelo mestre.</p>'}`}
  if(this.panelTab==='log'){const rows=st.log.filter(l=>M||l.vis!=='self').slice(0,30).map(l=>`<div class="log-row"><div class="row between" style="flex-wrap:nowrap"><span><b>${esc(l.who)}</b> <span class="muted">${esc(l.text)}</span>${l.vis==='self'?' <span class="chip violet">só você</span>':''}</span>${l.total!=null?`<span class="total num">${l.total}</span>`:''}</div>${l.faces?`<div class="faces num">[${l.faces.join(', ')}]${l.kept!=null?' · fica '+l.kept:''}</div>`:''}</div>`).join('');body.innerHTML=rows||'<p class="muted small">Nenhuma rolagem ainda.</p>'}
  if(this.panelTab==='players')body.innerHTML=(RV.PLAYERS.map(p=>{const t=st.tokens.find(t=>t.owner===p.id);return `<div class="item"><span class="avatar" style="background:${p.color}">${esc(p.ini)}</span><div class="grow"><b>${esc(p.name)}</b><span class="small muted">${p.char?esc(p.char)+(t?' · token no mapa':' · sem token neste cenário'):p.status==='aguardando'||p.id==='rafa'?'Aguardando aprovação da ficha':'Sem ficha'}</span></div>${p.via?`<span class="chip">${p.via==='app'?ic('device-mobile')+'app':ic('world')+'navegador'}</span>`:''}${p.online==null?'':`<span class="dot ${p.online?'on':''}" title="${p.online?'Conectado':'Desconectado'}"></span>`}</div>`}).join('')||'<p class="muted small">Ninguém entrou ainda. Use Convidar.</p>')+'<p class="small faint" style="margin:0">Cada jogador só move o próprio token e só vê o que você revelou. Aprovar e atribuir fichas fica na Mestragem.</p>'}
 renderDrawer(){const d=$('.drawer',this.root);if(!d||d.hidden)return;const tab=this.drawerTab;$$('[data-dtab]',d).forEach(b=>b.setAttribute('aria-selected',String(b.dataset.dtab===tab)));const body=$('.panel-body',d);
  const item=(kind,name,sub,k)=>{const col=RV.COLORS[kind]||RV.COLORS.npc;return `<button type="button" class="asset ${kind}" data-asset="${esc(name)}" data-akind="${k}" data-tkind="${kind}" style="--ring:${col.ring};--hi:${col.hi};--lo:${col.lo}"><span class="disc">${esc(RV.initials(name))}</span><span class="grow"><b>${esc(name)}</b><small>${sub}</small></span>${ic('plus')}</button>`};
  const q=(this.drawerQ||'').toLowerCase();
  if(tab==='sheets'){const live=RV.Live?.active('master');const chars=live?(RV.Live.table.characters||[]):[{id:'aurora',sheet:{name:'Aurora'}},{id:'bras',sheet:{name:'Brás'}}];
   body.innerHTML=`<p class="small muted" style="margin:0">Fichas da campanha. As que já estão no mapa aparecem marcadas.</p>`+chars.map(c=>{const on=this.S().tokens.some(t=>t.characterId===c.id||(!live&&t.id===c.id));const pl=live?(RV.Live.table.players||[]).find(x=>x.characterId===c.id):null;
    return item(on?'pc':'ally',c.sheet?.name||'Ficha',(pl?esc(pl.nickname)+' · ':'')+(on?'já está no mapa':'toque para pôr no mapa'),on?'sheet':'sheet-new').replace('data-asset=',`data-cid="${esc(c.id)}" data-asset=`)}).join('')||'<p class="muted small">Nenhuma ficha na campanha. Adicione na Mestragem.</p>'}
  if(tab==='beasts'){const list=Object.values(RV.CREATURES).filter(c=>!q||c.name.toLowerCase().includes(q));
   body.innerHTML=`<input class="input" id="drawer-q-${this.role}" placeholder="Procurar criatura" value="${esc(this.drawerQ||'')}" aria-label="Procurar criatura"><div class="row between"><span class="label">Ordem Paranormal</span><span class="small muted">${list.filter(c=>c.sys==='ordem').length} de 48</span></div>`+list.filter(c=>c.sys==='ordem').map(c=>item('foe',c.name,`${RV.SIZE_LABEL[c.size]||'Médio'} · PV ${c.hp} · ${c.element}`,'creature')).join('')+`<div class="row between" style="margin-top:8px"><span class="label">D&amp;D 5e · SRD</span></div>`+list.filter(c=>c.sys==='dnd').map(c=>item('foe',c.name,`PV ${c.hp} · VD ${c.vd}`,'creature')).join('');
   const inp=$('input',body);inp.addEventListener('input',()=>{this.drawerQ=inp.value;const pos=inp.selectionStart;this.renderDrawer();const ni=$(`#drawer-q-${this.role}`,this.root);ni.focus();ni.setSelectionRange(pos,pos)})}
  if(tab==='objs')body.innerHTML=[['Baú','obj'],['Barril','obj'],['Tocha','obj'],['Aliado','npc']].map(([n,k])=>item(k,n,k==='npc'?'token de NPC':'marcador de objeto','obj')).join('')+`<p class="small muted" style="margin:0">Paredes, terreno, mobília e luzes ficam no Estúdio de cenários.</p>`;
  body.insertAdjacentHTML('beforeend','<p class="small faint" style="margin:6px 0 0">Arraste para o mapa, ou toque no item e depois numa casa.</p>');$$('.asset',body).forEach(a=>a.addEventListener('pointerdown',e=>this.assetDown(e,a)))}
 assetDown(e,a){e.preventDefault();const k=a.dataset.akind,name=a.dataset.asset,kind=a.dataset.tkind;if(k==='sheet'){toast(name+' já está no mapa.');return}const cid=a.dataset.cid||null;
  const col=RV.COLORS[kind]||RV.COLORS.npc;const gh=document.createElement('div');gh.className='drag-ghost';gh.style.cssText=`--ring:${col.ring};--hi:${col.hi};--lo:${col.lo};left:${e.clientX}px;top:${e.clientY}px`;gh.textContent=RV.initials(name);let moved=false;const sx=e.clientX,sy=e.clientY;
  const mv=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>6&&!moved){moved=true;document.body.appendChild(gh)}gh.style.left=ev.clientX+'px';gh.style.top=ev.clientY+'px'};
  const up=ev=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);gh.remove();
   if(!moved){this.pending={name,kind:k==='creature'?'creature':kind,characterId:k==='sheet-new'?cid:null};$$('.asset',this.root).forEach(x=>x.setAttribute('aria-pressed',String(x===a)));toast('Agora toque numa casa do mapa.');return}
   const over=document.elementFromPoint(ev.clientX,ev.clientY);if(!over||!this.stage.contains(over))return;const c=this.cellAt(ev.clientX,ev.clientY);this.pending={name,kind:k==='creature'?'creature':kind,characterId:k==='sheet-new'?cid:null};this.placePending(c.x,c.y)};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up)}
 renderCard(){const c=$('.tcard',this.root),t=this.tok(this.sel),M=this.role==='master';
  if(!t||(!M&&this.tool!=='inspect')||(!M&&!this.visibleTokens().includes(t))){c.hidden=true;return}
  const col=RV.COLORS[t.kind]||RV.COLORS.npc,cr=RV.CREATURES[t.creature];c.hidden=false;c.className='float tcard '+t.kind;c.style.cssText=`--ring:${col.ring};--hi:${col.hi};--lo:${col.lo}`;
  const x=`<button class="x-btn tcard-x" type="button" data-close="tcard" aria-label="Fechar">${ic('x')}</button>`;
  if(!M){c.innerHTML=`${x}<div class="disc">${esc(t.ini)}</div><div><h3>${esc(t.name)}</h3><div class="meta">${t.kind==='foe'?'Criatura · as estatísticas ficam com o mestre':esc(t.cls||'Aliado')}</div></div>`;return}
  const hp=t.hp||(t.res&&Object.values(t.res)[0]),hpLabel=t.hp?'PV':t.res?Object.keys(t.res)[0]:'PV';const pct=hp?Math.round(hp[0]/hp[1]*100):0;const left=t.speed-t.used;
  c.innerHTML=`${x}<div class="disc">${esc(t.ini)}</div><div style="min-width:0"><div class="row" style="gap:8px"><h3>${esc(t.name)}</h3>${t.hidden?'<span class="chip violet">oculto</span>':''}${t.id===this.activeId()?'<span class="chip gold">na vez</span>':''}</div>
   <div class="meta">${cr?`<span>Defesa <b class="num">${cr.defense}</b></span><span>Ataque <b>${esc(cr.attack)}</b></span><span>Dano <b>${esc(cr.damage)}</b></span><span>${RV.SIZE_LABEL[cr.size]||'Médio'}${cr.speed?' · '+esc(String(cr.speed).replace('M',' m')):''}</span>`:t.cls?`<span>${esc(t.cls)}</span><span>Jogador <b>${esc(RV.PLAYERS.find(p=>p.id===t.owner)?.name||'')}</b></span>`:'<span>Objeto</span>'}${t.speed&&t.size===1?`<span>Movimento <b class="num">${this.S().mode==='interlude'?'livre':Math.max(0,left)+' de '+t.speed}</b></span>`:''}</div>
   ${hp?`<div class="hp"><span>${esc(hpLabel)}</span><div class="bar"><i style="width:${pct}%;--c:${pct<35?'var(--danger)':pct<60?'#e3a85a':'var(--green)'}"></i></div><span class="num"><b>${hp[0]}</b>/${hp[1]}</span><span class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm icon" type="button" data-act="hp" data-v="-1" aria-label="Dano">−</button><button class="btn sm icon" type="button" data-act="hp" data-v="1" aria-label="Cura">+</button></span></div>`:''}
   ${t.effects?.length?`<div class="row" style="margin-top:6px">${t.effects.map(e=>`<span class="chip bad">${esc(e)}</span>`).join('')}</div>`:''}
   ${cr?`<div class="small faint" style="margin-top:6px">${esc(cr.source)} · ${cr.sys==='ordem'?esc(RV.NOTE):'Confira ações e características especiais no SRD.'}</div>`:''}</div>
   <div class="actions">${cr?`<button class="btn sm primary" type="button" data-act="atk">${ic('sword')}Atacar</button><button class="btn sm" type="button" data-act="dmg">${ic('droplet')}Dano</button>`:''}<div class="row" style="gap:4px;flex-wrap:nowrap"><input class="input num init-set-v" style="width:56px;min-height:32px;padding:4px 8px" aria-label="Valor de iniciativa" placeholder="Ini"><button class="btn sm" type="button" data-act="init-set">Definir</button></div></div>`}
 /* HUD e ficha do jogador: recursos e atributos da ficha que o servidor guarda (qualquer um dos quatro sistemas) */
 me(){return this.tok(RV.me?.token)}
 resBars(me,edit){const cols=['var(--danger)','var(--blue)','var(--purple)','#e3a85a'];return Object.entries(me.res||{}).map(([k,[v,m]],i)=>{const c=me.resMeta?.[k]?.color||cols[i%4],pct=m?Math.round(Math.max(0,v)/m*100):0;
   return edit?`<div class="res-row"><span>${esc(k)}</span><div class="bar"><i style="width:${pct}%;--c:${c}"></i></div><span class="row" style="gap:4px;flex-wrap:nowrap;justify-content:flex-end">${me.resMeta?.[k]?.readOnly?'':`<button class="btn sm icon" type="button" data-act="res" data-v="${esc(k)}|-1" aria-label="Diminuir ${esc(k)}">−</button>`}<b class="num">${v}/${m}</b>${me.resMeta?.[k]?.readOnly?'':`<button class="btn sm icon" type="button" data-act="res" data-v="${esc(k)}|1" aria-label="Aumentar ${esc(k)}">+</button>`}</span></div>`
   :`<div><span class="row between" style="flex-wrap:nowrap"><span>${esc(k)}</span><b class="num">${v}/${m}</b></span><span class="bar"><i style="width:${pct}%;--c:${c}"></i></span></div>`}).join('')}
 renderHud(){const h=$('.hud',this.root);if(!h)return;const me=this.me();
  if(!me){h.innerHTML=`<div class="disc" aria-hidden="true">${ic('hourglass')}</div><div style="min-width:0"><b style="font:600 19px var(--font-head)">${esc(RV.me?.name||'Você')}</b><p class="small muted" style="margin:2px 0 0">${RV.Live?.pdata?'Aguardando o mestre aprovar ou atribuir a sua ficha. Você já vê a mesa e pode rolar dados.':'Sem token nesta mesa.'}</p></div><div class="hud-actions"><button class="btn hud-dice" type="button">${ic('dice-5')}Dados</button></div>`;return}
  h.innerHTML=`<div class="disc" aria-hidden="true">${esc((me.name||'?')[0])}</div><div style="min-width:0"><div class="row between" style="flex-wrap:nowrap;margin-bottom:6px"><b style="font:600 19px var(--font-head)">${esc(me.name)}</b><span class="small muted">${esc(me.cls||'')}</span></div><div class="bars">${this.resBars(me,false)}</div></div>
   <div class="hud-actions"><button class="btn hud-dice" type="button">${ic('dice-5')}Dados</button><button class="btn hud-sheet" type="button" data-act="sheet">${ic('file-text')}Ficha</button>${this.isOrdem(me)?`<button class="btn hud-powers" type="button" data-act="sheet" data-v="powers">${ic('sparkles')}Poderes</button>`:''}</div>`}
 isOrdem(me){return!me.sheet||(me.sheet.systemId||'ordem-paranormal')==='ordem-paranormal'}
 openSheet(tab){$('.sheet',this.root).classList.add('open');this.sheetTab=tab||this.sheetTab||'summary';this.renderSheet();emit('sheet:opened');if(this.sheetTab==='powers')emit('powers:opened')}
 attrs(me){const sh=me.sheet||{};const src=sh.attrs||sh.attributes||sh.characteristics||sh.abilities||sh.atributos||{};
  return Object.entries(src).filter(([,v])=>typeof v==='number'||(typeof v==='object'&&v&&typeof v.value==='number')).slice(0,9).map(([k,v])=>[k,typeof v==='number'?v:v.value])}
 renderSheet(){const s=$('.sheet-body',this.root);if(!s)return;const me=this.me();
  if(!me){s.innerHTML=`<div class="fh" style="padding:0"><h3>Sua ficha</h3><button class="x-btn" type="button" data-close="sheet" aria-label="Fechar ficha">${ic('x')}</button></div><p class="muted">O mestre ainda não aprovou ou atribuiu uma ficha para você.</p>`;return}
  const ordem=this.isOrdem(me),tab=ordem?(this.sheetTab||'summary'):'summary',live=RV.Live?.active('player');
  const tabs=[['summary','Resumo']].concat(ordem?[['powers','Poderes e Transcender']]:[]);
  const ab=k=>String(k).normalize('NFD').replace(/[̀-ͯ]/g,'').slice(0,3).toUpperCase();
  let body='';
  if(tab==='summary'){const at=this.attrs(me);body=`${this.resBars(me,true)}${at.length?`<div class="attrs">${at.map(([k,v])=>`<div class="attr"><b>${esc(v)}</b><span title="${esc(k)}">${esc(k.length<=3?k:ab(k))}</span></div>`).join('')}</div>`:''}
   <p class="small faint" style="margin:0">${live?'Esta é a cópia da ficha que está com o mestre. Mudanças de vida, esforço e sanidade vão direto para a mesa. Perícias, inventário e rituais ficam na ficha completa do app.':'Ficha de exemplo da campanha de treino.'}</p>`}
  else body=this.powersHtml(live);
  s.innerHTML=`<div class="fh" style="padding:0"><div><span class="kicker">Ficha · ${esc(RV.me?.name||'')}</span><h3 style="font-size:30px">${esc(me.name)}</h3></div><button class="x-btn" type="button" data-close="sheet" aria-label="Fechar ficha">${ic('x')}</button></div>
   <div class="tabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" type="button" data-act="stab" data-v="${k}" data-sheet-tab="${k}" aria-selected="${tab===k}">${l}</button>`).join('')}</div>${body}`;
  if(tab==='powers'&&live&&!this.powers&&!this.powersLoading){this.powersLoading=true;RV.Net.player(RV.Live.conn,'GET',RV.Live.ppath('/power-requests')).then(d=>{this.powers=d}).catch(e=>{this.powers={error:e.message}}).finally(()=>{this.powersLoading=false;this.renderSheet()})}}
 powersHtml(live){
  if(!live)return `<ul class="list"><li class="item power"><span class="el energia">${ic('bolt')}</span><div class="grow"><b>Golpe de Sorte</b><span class="small muted">Energia · aprovado</span></div><span class="chip ok">Ativo</span></li><li class="item power"><span class="el energia">${ic('shield')}</span><div class="grow"><b>Campo Protetor</b><span class="small muted">Energia · disponível no NEX 35%</span></div><button class="btn sm primary" type="button" data-act="power-req">Pedir ao mestre</button></li><li class="item power"><span class="el morte">${ic('hourglass')}</span><div class="grow"><b>Surto Temporal</b><span class="small muted">Morte · exige 2 poderes de Morte aprovados</span></div><span class="chip">Bloqueado</span></li></ul><p class="small faint" style="margin:0">Exemplo da campanha de treino. Na mesa de verdade, os pedidos vão para o mestre aprovar.</p>`;
  const d=this.powers;if(!d)return '<p class="muted">Carregando seus poderes…</p>';if(d.error)return `<p class="warn-t">${esc(d.error)}</p>`;
  const el=e=>String(e||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const chosen=(d.choices||[]).map(c=>`<li class="item power"><span class="el ${el(c.element)}">${ic('sparkles')}</span><div class="grow"><b>${esc(c.name)}</b><span class="small muted">${esc({class:'Poder de classe',transcend:'Transcender'}[c.type]||c.type||'')}${c.element?' · '+esc(c.element):''}</span></div><span class="chip ok">Aprovado</span></li>`).join('');
  const pend=(d.requests||[]).map(r=>`<li class="item power"><span class="el ${el(r.element)}">${ic('hourglass')}</span><div class="grow"><b>${esc(r.name||r.type)}</b><span class="small muted">Aguardando o mestre</span></div><span class="chip gold">Pedido</span></li>`).join('');
  const pp=(window.RV_ORDEM_PACK?.poderesParanormais||[]);
  return `<p class="small muted" style="margin:0">Espaços de poder: <b class="num">${d.used??0}</b> de <b class="num">${d.slots??0}</b>.</p><ul class="list">${chosen}${pend}${chosen||pend?'':'<li class="muted small">Nenhum poder escolhido ainda.</li>'}</ul>
   ${(d.requests||[]).length?'<p class="small faint" style="margin:0">Você tem um pedido aguardando. Espere o mestre responder para pedir outro.</p>':`<div class="field"><label class="label" for="pw-trans">Transcender (poder paranormal)</label><div class="row" style="flex-wrap:nowrap"><select class="input" id="pw-trans" style="flex:1;min-width:0">${pp.map(x=>`<option value="${esc(x.nome)}">${esc(x.nome)} · ${esc(x.elemento)}</option>`).join('')}</select><button class="btn sm primary" type="button" data-act="power-req" data-type="transcend">Pedir</button></div></div>
   <div class="field"><label class="label" for="pw-class">Poder de classe</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="pw-class" placeholder="Nome do poder, como no livro" style="flex:1;min-width:0"><button class="btn sm" type="button" data-act="power-req" data-type="class">Pedir</button></div></div>
   <p class="small faint" style="margin:0">O servidor confere pré-requisitos e espaços. O poder só vale depois da aprovação do mestre.</p>`}`}
}
RV.Table=Table;
})();
