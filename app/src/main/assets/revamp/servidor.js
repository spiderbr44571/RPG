/* Mastermind · revamp — conexão com o servidor da mesa na rede local (o mesmo LocalCampaignServer da interface clássica).
   Mestre: pelo app (Android: RpgCampaignBridge/RpgLocalHost; computador: MastermindDesktop) com a chave do mestre.
   Jogador: pelo app (rotas de entrar e jogar, com a sessão do jogador) ou pelo navegador, na página /v2/ servida pela mesa.
   Regras (dados, deslocamento, iniciativa, o que o jogador enxerga) continuam no servidor. Sem servidor, tudo roda na
   campanha de treino, só neste aparelho. */
(function(){
'use strict';
const {$,$$,esc,ic,on,emit,toast,store,copyText}=RV;
const A=window.RVAdapt;
const parse=(t,d)=>{try{return JSON.parse(t)}catch(_){return d}};

/* ================= Transporte ================= */
const Net=RV.Net={
 served:/^\/v2\//.test(location.pathname)&&/^https?:$/.test(location.protocol),
 canHost(){return!!(window.RpgLocalHost&&(window.RpgCampaignBridge?.request||window.MastermindDesktop?.action))},
 canJoinByApp(){return!!(window.RpgCampaignBridge?.playerRequest||window.MastermindDesktop?.action)},
 host(){if(!window.RpgLocalHost)return null;try{const s=window.RpgLocalHost.status();return typeof s==='string'?parse(s,{}):s||{}}catch(_){return{running:false,error:'Sem status'}}},
 base(){const s=this.host();return s&&s.running&&s.ip?'http://'+s.ip+':'+s.port:null},
 key(){try{return window.RpgLocalHost?.masterKey()||''}catch(_){return''}},
 async start(){await window.RpgLocalHost.start()},
 async stop(){await window.RpgLocalHost.stop()},
 /* rotas do mestre (sempre /api/admin/campaigns...) */
 async master(method,route,body){const base=this.base(),secret=this.key();if(!base)throw Error('Ligue o servidor da mesa primeiro.');
  if(base.includes('//127.')&&!window.MastermindDesktop)throw Error('Conecte o aparelho ao Wi-Fi para abrir a mesa na rede local.');
  let reply;
  if(window.MastermindDesktop?.action)reply=await window.MastermindDesktop.action('campaign-request',{base,secret,method,route,body});
  else reply=parse(window.RpgCampaignBridge.request(base,secret,method,route,body===undefined?'':JSON.stringify(body)),{status:0,error:'Resposta inválida'});
  return unwrap(reply)},
 /* rotas do jogador (/api/join..., /api/play...) */
 async player(conn,method,route,body){
  if(this.served){const r=await fetch(route,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const data=parse(await r.text(),{});if(!r.ok)throw Error(data.error||'Falha na mesa ('+r.status+')');return data}
  let reply;const args={base:conn.base,guest:conn.guest||'',method,route,body:body===undefined?'':JSON.stringify(body)};
  if(window.MastermindDesktop?.action)reply=await window.MastermindDesktop.action('campaign-player-request',args);
  else if(window.RpgCampaignBridge?.playerRequest)reply=parse(window.RpgCampaignBridge.playerRequest(args.base,args.guest,method,route,args.body),{status:0});
  else throw Error('Abra o convite no navegador ou no app Mastermind.');
  if(reply?.guest&&conn.guest!==reply.guest){conn.guest=reply.guest;Live.saveConn()}
  return unwrap(reply)}};
function unwrap(reply){if(!reply||!reply.status)throw Error(reply?.error||'Servidor da mesa inacessível');const data=parse(reply.body||'{}',{});
 if(reply.status>=400)throw Error(data.error||'A mesa recusou o pedido ('+reply.status+')');return data}

/* ================= Estado ao vivo ================= */
const Live=RV.Live={
 role:null,cid:store.get('mm-rv-campaign')||'',table:null,detail:null,campaigns:[],sig:'',busy:0,q:Promise.resolve(),
 pendingInit:[],privRolls:[],deleted:new Set(),err:'',
 conn:parse(store.get('mm-rv-player-conn'),null),pdata:null,psig:'',
 active(role){if(RV.Tut?.flow)return false;return role==='player'?!!(this.role==='player'&&this.pdata):!!(this.role==='master'&&this.table)},
 saveConn(){if(!Net.served)store.set('mm-rv-player-conn',JSON.stringify(this.conn))},
 queue(fn){const p=this.q.then(fn);this.q=p.catch(()=>{});return p},
 fail(e){toast(e.message||String(e))},
 /* ---------- mestre ---------- */
 async listCampaigns(){const d=await Net.master('GET','/api/admin/campaigns');this.campaigns=d.campaigns||[];return this.campaigns},
 async createCampaign(name){const d=await Net.master('POST','/api/admin/campaigns',{name});await this.listCampaigns();return this.choose(d.id||d.campaign?.id||this.campaigns.at(-1)?.id)},
 async choose(cid){this.cid=cid||'';store.set('mm-rv-campaign',this.cid);this.table=null;this.detail=null;this.sig='';this.pendingInit=[];this.privRolls=[];this.deleted.clear();
  if(!cid){this.role=null;RV.state=RV.freshState();emit('state');Mest.render();return}
  this.role='master';await this.pull();Mest.render()},
 path(s=''){return'/api/admin/campaigns/'+this.cid+s},
 async pull(){if(this.role!=='master'||!this.cid)return;
  const[table,det]=await Promise.all([Net.master('GET',this.path('/table')),Net.master('GET',this.path())]);this.detail=det.campaign;this.err='';this.apply(table)},
 apply(table){this.table=table;const st=RV.state,v=RV.views||{};if(v.master?.drag||v.master?.fogPaint)return;
  const map=(table.scenarios||[]).find(m=>m.id===table.activeScenarioId)||null;this.map=map;
  const sig=map?JSON.stringify(Object.assign({},map,{tokens:0}))+'|'+(map.backgroundAssetId||''):'none';
  if(sig!==this.sig){this.sig=sig;
   if(map){st.scene=A.serverToScene(map,Cena,{master:true,assets:table.assets})}else{st.scene=Cena.blank('Nenhum cenário publicado',24,16);Cena.paintRect(st.scene,0,0,24,16,'pedra');st.scene.grid.overTerrainOnly=false}
   st.fog=new Set(st.scene.fog);st.sceneVer=(st.sceneVer||0)+1}
  const chars=table.characters||[];
  st.tokens=(map?.tokens||[]).map(t=>{const tk=A.tokenFromServer(t,{master:true,limits:table.movementLimits,spent:table.movementSpent,creatures:RV.CREATURES});decorate(tk,chars.find(c=>c.id===tk.characterId));return tk});
  this.pendingInit=this.pendingInit.filter(id=>st.tokens.some(t=>t.id===id)&&!(table.initiative?.entries||[]).some(e=>e.tokenId===id));
  st.init=A.initFromServer(table.initiative,this.pendingInit);st.mode=table.sessionMode==='interlude'?'interlude':'combat';
  st.log=(table.rolls||[]).map(A.rollToLog).concat(this.privRolls).sort((a,b)=>(b.at||0)-(a.at||0));st.strokes=st.strokes||[];
  RV.PLAYERS=(table.players||[]).map((p,i)=>{const ch=chars.find(c=>c.id===p.characterId);return{id:p.id,name:p.nickname,ini:A.initials(p.nickname),color:['#c7a87b','#86bd9c','#9c90dd','#6db7e0','#e0707c','#e3a85a'][i%6],online:null,char:ch?.sheet?.name||null,via:null,status:p.status}});
  emit('state');if(location.hash==='#mestragem')Mest.render()},
 sceneSave(opts={}){if(this.role!=='master')return Promise.resolve();return this.queue(()=>this._save(opts)).then(()=>this.pull()).catch(e=>{this.fail(e);return this.pull().catch(()=>{})})},
 async _save({scene,activate}){const st=RV.state;const latest=await Net.master('GET',this.path('/scenarios'));
  scene=scene||st.scene;if(scene===st.scene)scene.fog=[...st.fog];
  const prev=(latest.scenarios||[]).find(m=>m.id===scene.id)||null,isActive=prev&&prev.id===latest.activeScenarioId&&scene===st.scene;
  let tokens=prev?.tokens||[];
  if(isActive){const srv=new Map(tokens.map(t=>[t.id,t]));tokens=[];
   st.tokens.forEach(t=>{const s=srv.get(t.id);if(s){tokens.push(Object.assign({},s,s.size?{}:{size:t.size},s.side?{}:{side:t.kind}));srv.delete(t.id)}else if(!t.srv)tokens.push(A.tokenToServer(t,RV.CREATURES[t.creature]))});
   srv.forEach((s,id)=>{if(!this.deleted.has(id))tokens.push(s)})}
  const{map,asset,warnings}=A.sceneToServer(scene,{prev,tokens});warnings.forEach(w=>toast(w));
  let scenarios=(latest.scenarios||[]).filter(m=>m.id!==map.id);if(scenarios.length>=16)throw Error('A campanha já tem 16 cenários, o máximo. Apague um antes.');
  scenarios=prev?(latest.scenarios||[]).map(m=>m.id===map.id?map:m):scenarios.concat([map]);
  let assets=(latest.assets||[]).filter(a=>!(prev&&a.id===prev.backgroundAssetId&&a.kind==='map'&&!scenarios.some(m=>m.id!==map.id&&m.backgroundAssetId===a.id)));
  if(asset)assets=assets.filter(a=>a.id!==asset.id).concat([asset]);
  await Net.master('POST',this.path('/scenarios'),{scenarios,assets,activeScenarioId:activate?map.id:(latest.activeScenarioId||'')});this.deleted.clear()},
 async deleteScenario(id){await this.queue(async()=>{const latest=await Net.master('GET',this.path('/scenarios'));const gone=(latest.scenarios||[]).find(m=>m.id===id);
  const scenarios=(latest.scenarios||[]).filter(m=>m.id!==id);const assets=(latest.assets||[]).filter(a=>!(gone&&a.id===gone.backgroundAssetId&&!scenarios.some(m=>m.backgroundAssetId===a.id)));
  await Net.master('POST',this.path('/scenarios'),{scenarios,assets,activeScenarioId:latest.activeScenarioId===id?'':latest.activeScenarioId||''})});await this.pull()},
 async activate(id){await this.queue(async()=>{const latest=await Net.master('GET',this.path('/scenarios'));await Net.master('POST',this.path('/scenarios'),{scenarios:latest.scenarios||[],assets:latest.assets||[],activeScenarioId:id})});await this.pull()},
 cmd(route,body,msg){return this.queue(()=>Net.master('POST',this.path(route),body)).then(r=>{if(msg)toast(msg);return this.pull().then(()=>r)}).catch(e=>{this.fail(e);this.pull().catch(()=>{});throw e})},
 /* ---------- jogador ---------- */
 ppath(s=''){return'/api/play/'+this.conn.cid+s},
 async join({link,nickname,sheet}){const m=/^(https?:\/\/[^/]+)\/(?:v2\/)?join\/([a-z0-9]{32})\/([A-Za-z0-9_-]{20,90})\/?$/.exec(String(link||'').trim());
  if(!m)throw Error('Cole o convite completo, como http://192.168.0.12:8765/join/…');
  const conn={base:m[1],cid:m[2],guest:'',name:nickname};const info=await Net.player(conn,'GET','/api/join/info/'+conn.cid);
  await Net.player(conn,'POST','/api/join/'+conn.cid+'/'+m[3],{nickname,sheet:sheet||undefined});conn.campaign=info.name;
  if(!Net.served&&!conn.guest)throw Error('A mesa não devolveu a sessão do jogador. Tente de novo.');this.conn=conn;this.saveConn();return conn},
 async info(link){const m=/^(https?:\/\/[^/]+)\/(?:v2\/)?join\/([a-z0-9]{32})\//.exec(String(link||'').trim());if(!m)throw Error('Cole o convite completo, como http://192.168.0.12:8765/join/…');
  return Net.player({base:m[1],guest:''},'GET','/api/join/info/'+m[2])},
 async ppull(){if(!this.conn)return;const d=await Net.player(this.conn,'GET',this.ppath('/scenario'));this.role='player';this.papply(d)},
 papply(d){this.pdata=d;const v=RV.views||{};if(v.player?.drag)return;const ps=RV.pstate||(RV.pstate={strokes:[],light:false,sceneVer:0});
  const sc=d.scene;const sig=sc?JSON.stringify(Object.assign({},sc,{tokens:0})):'none';
  if(sig!==this.psig){this.psig=sig;
   if(sc){ps.scene=A.serverToScene(sc,Cena,{master:false,hiddenCells:sc.hiddenCells,assets:d.assets})}else{ps.scene=Cena.blank('Aguardando o mestre publicar um cenário',24,16)}
   ps.fog=new Set(ps.scene.fog);ps.sceneVer++}
  const mv=new Map((d.movement?.tokens||[]).map(m=>[m.tokenId,m]));
  ps.tokens=(sc?.tokens||[]).map(t=>{const tk=A.tokenFromServer(t,{me:d.playerId});const m=mv.get(t.id);if(m){tk.speed=m.unlimited?99:m.limit;tk.used=m.unlimited?0:m.used}if(t.movable){tk.owner=d.playerId;decorate(tk,{sheet:d.character?.sheet||d.character})}return tk});
  ps.init=A.initFromServer(d.initiative,[]);ps.mode=d.sessionMode==='interlude'?'interlude':'combat';ps.log=(d.rolls||[]).map(A.rollToLog).sort((a,b)=>(b.at||0)-(a.at||0));
  const mine=ps.tokens.find(t=>t.owner===d.playerId);RV.me={player:d.playerId,token:mine?.id||null,name:this.conn?.name||'Você',sheet:d.character?.sheet||d.character||null};
  emit('state')},
 pcmd(route,body){return Net.player(this.conn,'POST',this.ppath(route),body).then(r=>{this.ppull().catch(()=>{});return r}).catch(e=>{this.fail(e);this.ppull().catch(()=>{});throw e})},
 leave(){this.conn=null;this.pdata=null;this.psig='';RV.pstate=null;RV.me=Object.assign({},RV.ME_DEMO);store.del('mm-rv-player-conn');if(this.role==='player')this.role=null},
 /* ---------- ações vindas da mesa (mesa.js) ---------- */
 move(view,t,x,y){if(view.role==='master')return this.cmd('/token',{tokenId:t.id,action:'move',x,y}).catch(()=>{});
  return this.pcmd('/scenario/move',{tokenId:t.id,x,y}).then(()=>emit('token:moved',t.id)).catch(()=>{})},
 roll(view,text,label,target){const f=A.serverFormula(text,view.rmode);if(!f){toast('Notação inválida. Use 1d20+3, 2d6, 3O+5 (dados de 4, 6, 8, 10, 12, 20 ou 100 lados).');return}
  const M=view.role==='master',body={formula:f.formula,mode:f.mode,label:String(label||'Rolagem').slice(0,70)};if(M)body.visibility=(view.rvis||'public')==='self'?'master':'public';
  const p=M?this.queue(()=>Net.master('POST',this.path('/table-roll'),body)):Net.player(this.conn,'POST',this.ppath('/table-roll'),body);
  p.then(r=>{const lg=A.rollToLog(r);if(M&&r.visibility==='master'){lg.vis='self';this.privRolls.unshift(lg);this.privRolls=this.privRolls.slice(0,30)}
   const html=`<div class="result"><div><div>${lg.faces.map(v=>`<span class="die-face roll ${lg.kept===v?'kept':''}">${v}</span>`).join('')}</div><div class="small muted" style="margin-top:4px">${esc(lg.text)}${lg.vis==='self'?' · só você vê':' · todos veem'} · servidor</div></div><span class="total num">${r.total}</span></div>`;
   if(target)target.innerHTML=html;else toast(`${lg.who}: ${lg.text} = ${r.total}`);emit('dice:rolled');return M?this.pull():this.ppull()}).catch(e=>this.fail(e))},
 act(view,a,b,t){if(!this.active(view.role))return false;const M=view.role==='master',st=view.S();
  switch(a){
   case 'mode-combat':case 'mode-interlude':this.cmd('/session-mode',{mode:a==='mode-combat'?'combat':'interlude'},a==='mode-combat'?'Combate: movimento pela iniciativa.':'Interlúdio: movimento livre, iniciativa pausada.').then(()=>{if(a==='mode-interlude')emit('mode:interlude')}).catch(()=>{});view.closePops();return true;
   case 'roll':this.roll(view,$(`#dice-f-${view.role}`,view.root).value,'Rolagem',$('.dice-result',view.root));return true;
   case 'atk':case 'dmg':{const c=RV.CREATURES[t?.creature];if(c)this.roll(view,a==='atk'?c.attack:c.damage,t.name+(a==='atk'?': ataque':': dano'),null);return true}
   case 'hp':if(!t)return true;if(t.kind!=='pc'&&t.kind!=='ally'||t.hp){this.cmd('/token',{tokenId:t.id,action:'health',delta:+b.dataset.v}).catch(()=>{})}else if(t.characterId)this.sheetDelta(t,+b.dataset.v);else toast('Este token não tem ficha na campanha.');return true;
   case 'rotate':if(t)this.cmd('/token',{tokenId:t.id,action:'rotate',rotation:((t.rot||0)+45)%360}).catch(()=>{});view.closePops();return true;
   case 'hide':if(t)this.cmd('/token',{tokenId:t.id,action:'hide',hidden:!t.hidden},t.hidden?t.name+' agora está visível.':t.name+' agora está oculto dos jogadores.').catch(()=>{});view.closePops();return true;
   case 'remove':if(t){this.deleted.add(t.id);st.tokens=st.tokens.filter(x=>x!==t);view.sel=null;view.closePops();emit('state');
     this.queue(()=>Net.master('POST',this.path('/initiative'),{action:'remove',tokenId:t.id})).catch(()=>{});this.sceneSave()}return true;
   case 'init-add':if(t&&!st.init.entries.some(e=>e.id===t.id)){this.pendingInit.push(t.id);st.init.entries.push({id:t.id,score:null});view.panelTab='init'}view.closePops();emit('state');return true;
   case 'init-next':if(st.mode==='interlude'){toast('A iniciativa fica pausada no Interlúdio.');return true}this.cmd('/initiative',{action:'next'}).then(()=>emit('initiative:next')).catch(()=>{});return true;
   case 'init-clear':this.pendingInit=[];this.cmd('/initiative',{action:'reset'},'Iniciativa limpa.').catch(()=>{});return true;
   case 'init-set':{const v=parseInt($('.init-set-v',view.root)?.value,10);if(!t||isNaN(v)){toast('Digite um número para a iniciativa.');return true}
     this.pendingInit=this.pendingInit.filter(id=>id!==t.id);this.cmd('/initiative',{action:'set',tokenId:t.id,score:v}).catch(()=>{});return true}
   case 'init-roll':{const todo=st.init.entries.filter(e=>e.score==null);if(!todo.length){toast('Todos já têm iniciativa.');return true}
     todo.forEach(e=>{const tk=st.tokens.find(x=>x.id===e.id),c=RV.CREATURES[tk?.creature];const f=A.serverFormula(c?.initiative||'1d20','highest')||{formula:'1d20',mode:'sum'};
      this.queue(()=>Net.master('POST',this.path('/initiative'),{action:'roll',tokenId:e.id,formula:f.formula,mode:f.mode}))});
     this.pendingInit=[];this.q.then(()=>this.pull()).then(()=>toast('Iniciativa rolada pelo servidor para quem estava sem valor.'));return true}
   case 'res':{if(M)return false;const me=st.tokens.find(x=>x.id===RV.me?.token);if(!me)return true;const[k,d]=b.dataset.v.split('|');const meta=me.resMeta?.[k];const r=me.res?.[k];if(!meta||!r)return true;
     if(meta.readOnly){toast('Este valor muda pela ficha completa.');return true}const next=Math.max(0,Math.min(r[1],r[0]+(+d)));r[0]=next;emit('state');this.pcmd('/resource',{resource:meta.key,current:next}).catch(()=>{});return true}
   case 'power-req':{const type=b.dataset.type||'transcend',name=(b.dataset.name||b.parentElement?.querySelector('select,input')?.value||'').trim();if(!name){toast('Escolha o poder.');return true}
     b.disabled=true;this.pcmd('/power-requests',{type,name}).then(()=>{toast('Pedido enviado ao mestre. O poder só vale depois da aprovação.');view.powers=null;view.renderSheet()}).catch(()=>{b.disabled=false});return true}
  }
  return false},
 async sheetDelta(t,delta){const ch=(this.table?.characters||[]).find(c=>c.id===t.characterId);if(!ch?.sheet)return;const sh=JSON.parse(JSON.stringify(ch.sheet)),sys=sh.systemId||'ordem-paranormal';
  if(sys==='gurps'){const mx=Math.max(1,(+sh.attrs?.ST||10)+(+sh.mod?.hp||0));sh.currentHP=Math.max(-mx*5,Math.min(mx,(sh.currentHP??mx)+delta))}
  else if(sys==='d-d'){sh.hitPointsCurrent=Math.max(0,Math.min(+sh.hitPointsMax||0,(sh.hitPointsCurrent??sh.hitPointsMax)+delta))}
  else{const k=sys==='chamado-de-ctchulhu'?'HP':'PV';const r=sh.resources?.[k];if(!r||typeof r!=='object'){toast('A ficha não tem PV registrado.');return}r.current=Math.max(0,Math.min(r.max,r.current+delta))}
  this.queue(()=>Net.master('PUT',this.path('/characters/'+ch.id),{sheet:sh})).then(()=>this.pull()).catch(e=>this.fail(e))},
 invites(){const inv=this.detail?.invite||'';return inv?{app:inv,web:inv.replace('/join/','/v2/join/')}:null}};

/* recursos e descrição de um token de personagem, a partir da ficha da campanha */
function decorate(tk,ch){const sheet=ch?.sheet||null;if(!sheet)return;const rs=RV.Sheets.resources(sheet);if(!rs.length)return;
 tk.res={};tk.resMeta={};rs.forEach(r=>{tk.res[r.label]=[+r.cur||0,+r.max||0];tk.resMeta[r.label]={key:r.key,color:r.color,readOnly:!!r.readOnly}});tk.cls=RV.Sheets.detailOf(Object.assign({systemId:'ordem-paranormal'},sheet));tk.sheet=sheet;
 if(Array.isArray(sheet.effects))tk.effects=sheet.effects.map(e=>typeof e==='string'?e:[e.name,e.unit==='turn'&&e.remaining?e.remaining+' turnos':''].filter(Boolean).join(' · ')).filter(Boolean)}

/* puxa o estado periodicamente enquanto a tela da mesa está aberta */
setInterval(()=>{if(document.visibilityState!=='visible'||RV.Tut?.flow)return;const h=location.hash;
 if(Live.role==='master'&&/^#(mesa|mestragem)$/.test(h))Live.pull().catch(e=>{Live.err=e.message;if(h==='#mestragem')Mest.render()});
 if(Live.conn&&/^#(jogador)$/.test(h))Live.ppull().catch(e=>{Live.err=e.message})},2000);
on(e=>{if(Live.role!=='master')return;
 if(e==='fog:painted'||e==='door:toggled'||e==='token:added')Live.sceneSave();});

/* ================= Mestragem ================= */
const TEMPLATES=()=>Cena.TEMPLATES;
const Mest=RV.Mest={
 render(){const host=$('#mest-grid');if(!host)return;const L=Live,hs=Net.host(),canHost=Net.canHost();
  const hero=$('#h-mestragem'),sub=$('#mest-sub');
  if(!canHost){hero.innerHTML='Campanha de <em>treino.</em>';sub.textContent='O servidor da mesa roda no app Mastermind (Android ou computador). Aqui você treina com uma campanha de exemplo, só neste aparelho.';host.innerHTML=this.training();this.sync();this.thumbs();this.bindOnce();return}
  const c=L.detail;hero.innerHTML=c?esc(c.name).replace(/(\S+)$/,'<em>$1.</em>'):'Sua <em>mestragem.</em>';
  sub.textContent=c?`${(c.players||[]).length} jogador${(c.players||[]).length===1?'':'es'} · ${(c.characters||[]).length} ficha${(c.characters||[]).length===1?'':'s'} · ${c.sessionMode==='interlude'?'Interlúdio':'Combate'}`:'Ligue o servidor, crie ou escolha uma campanha e publique um cenário.';
  const on=hs?.running,state=on?`<span class="dot on"></span><span>Servidor ativo · <b class="num">${esc(hs.ip)}:${esc(hs.port)}</b></span>`:hs?.starting?'<span class="dot"></span><span>Iniciando…</span>':`<span class="dot bad-dot"></span><span>${esc(hs?.error||'Servidor desligado')}</span>`;
  let h=`<article class="card c12"><div class="card-h"><h2>Servidor da mesa</h2><div class="row small">${state}</div></div>
   <div class="row">${on?`<button class="btn sm ghost" type="button" data-m="stop">${ic('power')}Desligar</button>`:`<button class="btn sm primary" type="button" data-m="start">${ic('power')}Ligar servidor</button>`}
   ${on?`<div class="chips">${L.campaigns.map(x=>`<button type="button" class="fchip" data-m="choose" data-v="${esc(x.id)}" aria-pressed="${x.id===L.cid}">${esc(x.name)}</button>`).join('')}</div>
   <form class="row" data-m-form="create" style="flex:1 1 260px"><input class="input" name="name" maxlength="80" placeholder="Nome da nova campanha" aria-label="Nome da nova campanha" style="flex:1"><button class="btn sm" type="submit">${ic('plus')}Criar</button></form>`:''}</div>
   ${L.err?`<p class="small warn-t" style="margin:0">${esc(L.err)}</p>`:''}<p class="small faint" style="margin:0">Só na rede local. Os jogadores entram pelo convite, no app ou no navegador.</p></article>`;
  if(!on||!c||!L.table){host.innerHTML=h+(on&&!c?'<article class="card c12"><p class="muted" style="margin:0">Escolha uma campanha acima ou crie uma nova.</p></article>':'');this.bindOnce();return}
  const t=L.table,inv=L.invites(),scen=t.scenarios||[],active=scen.find(m=>m.id===t.activeScenarioId);
  h+=`<article class="card feature c8"><canvas class="mini-map" id="mini-map" width="600" height="400" aria-hidden="true"></canvas><div class="feature-body"><p class="kicker">Mesa ao vivo</p><h2>${active?'A mesa está pronta para abrir.':'Publique um cenário para abrir a mesa.'}</h2>
    <div class="row small"><span class="chip">Publicado: <b style="margin-left:4px">${esc(active?.name||'nenhum')}</b></span></div>
    <div class="invite-rows"><div class="item"><span data-i="device-mobile" class="faint"></span><span class="grow"><span class="small muted">Pelo app Mastermind (recomendado): cole este convite em Entrar numa mesa</span><span class="small num" style="display:block;overflow:hidden;text-overflow:ellipsis">${esc(inv.app)}</span></span><button class="btn sm" type="button" data-copy="${esc(inv.app)}">${ic('copy')}Copiar</button></div>
     <div class="item"><span data-i="world" class="faint"></span><span class="grow"><span class="small muted">Pelo navegador</span><span class="small num" style="display:block;overflow:hidden;text-overflow:ellipsis">${esc(inv.web)}</span></span><button class="btn sm" type="button" data-copy="${esc(inv.web)}">${ic('copy')}Copiar</button>${window.RpgLocalHost?.shareInvite?`<button class="btn sm ghost" type="button" data-m="share">${ic('share')}Enviar</button>`:''}</div></div>
    <div class="row"><a class="btn primary" href="#mesa"><span data-i="map"></span>Abrir mesa ao vivo</a><a class="btn" href="#estudio"><span data-i="brush"></span>Editar cenário</a></div></div></article>
   <article class="card c4"><div class="card-h"><h2>Ritmo</h2><span class="chip gold num" id="round-chip"></span></div>
    <div class="seg" role="group" aria-label="Modo da sessão" id="mode-seg"><button type="button" data-mode="combat"><span data-i="swords"></span>Combate</button><button type="button" data-mode="interlude"><span data-i="coffee"></span>Interlúdio</button></div>
    <p class="small muted" id="mode-text" style="margin:0"></p><button class="btn sm ghost" type="button" data-m="new-scene">${ic('flag')}Nova cena (zera a iniciativa)</button></article>`;
  const chars=c.characters||[];
  h+=`<article class="card c7"><div class="card-h"><h2>Jogadores</h2><span class="chip ${c.players?.length?'ok':''}">${(c.players||[]).length} na campanha</span></div><ul class="list">${(c.players||[]).map(p=>{const ch=chars.find(x=>x.id===p.characterId);
    return `<li class="item"><span class="avatar" style="background:#c7a87b">${esc(A.initials(p.nickname))}</span><div class="grow"><b>${esc(p.nickname)}</b><span class="small muted">${ch?esc(ch.sheet?.name||'Ficha')+' · '+esc(RV.Sheets.SYSTEM_LABEL[ch.sheet?.systemId]||'Ordem Paranormal'):p.hasProposal?'Enviou "'+esc(p.proposedSheet?.name||'ficha')+'" · '+esc(RV.Sheets.SYSTEM_LABEL[p.proposedSheet?.systemId]||'Ordem Paranormal'):'Sem ficha'}</span></div>
     ${p.hasProposal&&!ch?`<button class="btn sm primary" type="button" data-m="approve" data-v="${esc(p.id)}">Aprovar ficha</button>`:''}
     <select class="input" data-m-assign="${esc(p.id)}" style="width:auto;min-height:34px;padding:5px 10px" aria-label="Atribuir ficha para ${esc(p.nickname)}"><option value="">${ch?'Tirar a ficha':'Atribuir ficha'}</option>${chars.map(x=>`<option value="${esc(x.id)}" ${x.id===p.characterId?'selected':''}>${esc(x.sheet?.name||'Ficha')}</option>`).join('')}</select></li>`}).join('')||'<li class="muted small">Ninguém entrou ainda. Envie o convite.</li>'}</ul></article>`;
  const reqs=t.playerRequests||[];
  h+=`<article class="card c5"><div class="card-h"><h2>Pedidos</h2><span class="chip ${reqs.length?'gold':''}">${reqs.length} aguardando</span></div><ul class="list">${reqs.map(r=>`<li class="item"><div class="grow"><b>${esc(r.name||r.type)}</b><span class="small muted">${esc(r.playerName)} · ${esc({class:'Poder de classe',transcend:'Transcender',pass:'Passar',delay:'Adiar',surto:'Surto'}[r.type]||r.type)}${r.element?' · '+esc(r.element):''}</span></div>
     <button class="btn sm icon" type="button" aria-label="Recusar" data-m="req" data-a="reject" data-v="${esc(r.id)}">${ic('x')}</button><button class="btn sm icon primary" type="button" aria-label="Aprovar" data-m="req" data-a="approve" data-v="${esc(r.id)}">${ic('check')}</button></li>`).join('')||'<li class="muted small">Nenhum pedido.</li>'}</ul><p class="small faint" style="margin:0">Poderes só valem na mesa depois da sua aprovação.</p></article>`;
  h+=`<article class="card c8"><div class="card-h"><h2>Cenários</h2><span class="small muted">${scen.length} de 16</span></div><div class="scene-thumbs">${scen.map((m,i)=>`<div class="thumb" ${m.id===t.activeScenarioId?'aria-current="true"':''}><canvas data-sthumb="${i}" width="300" height="200"></canvas><div><b>${esc(m.name)}</b>${m.id===t.activeScenarioId?'<span class="chip gold" style="align-self:flex-start">Publicado</span>':`<button class="btn sm" type="button" data-m="activate" data-v="${esc(m.id)}">Publicar</button>`}
     <span class="row" style="gap:4px"><button class="btn sm ghost" type="button" data-m="edit" data-v="${esc(m.id)}">${ic('brush')}Editar</button><button class="btn sm ghost icon" type="button" aria-label="Apagar ${esc(m.name)}" data-m="del-scene" data-v="${esc(m.id)}">${ic('trash')}</button></span></div></div>`).join('')}
    <div class="thumb new-scene"><div><b>Novo cenário</b><select class="input" data-m-new aria-label="Modelo do novo cenário">${TEMPLATES().map(([id,n])=>`<option value="${id}">${esc(n)}</option>`).join('')}</select><button class="btn sm primary" type="button" data-m="create-scene">${ic('plus')}Criar no Estúdio</button></div></div></div></article>
   <article class="card c4"><div class="card-h"><h2>Fichas</h2><span class="small muted">${chars.length}</span></div>
    ${chars.map(x=>{const rs=RV.Sheets.resources(x.sheet||{});const r=rs[0];return `<div class="res-row"><span>${esc(x.sheet?.name||'Ficha')}</span>${r?`<div class="bar"><i style="width:${r.max?Math.round(r.cur/r.max*100):0}%;--c:${r.color}"></i></div><span class="num">${r.cur}/${r.max}</span>`:'<span class="small muted">'+esc(RV.Sheets.SYSTEM_LABEL[x.sheet?.systemId]||'')+'</span>'}</div>`}).join('')||'<p class="small muted" style="margin:0">Nenhuma ficha na campanha.</p>'}
    <div class="row"><select class="input" data-m-local aria-label="Ficha deste aparelho" style="flex:1;min-width:0">${RV.Sheets.list().map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(RV.Sheets.SYSTEM_LABEL[s.system])}</option>`).join('')||'<option value="">Nenhuma ficha neste aparelho</option>'}</select><button class="btn sm" type="button" data-m="add-sheet">${ic('plus')}Adicionar</button></div></article>`;
  host.innerHTML=h;RV.hydrateIcons(host);this.sync();this.thumbs();this.bindOnce()},
 training(){const st=RV.state;return `<article class="card feature c8"><canvas class="mini-map" id="mini-map" width="600" height="400" aria-hidden="true"></canvas><div class="feature-body"><p class="kicker">Campanha de treino</p><h2>Teste a mesa à vontade.</h2>
   <div class="row small"><span class="dot"></span><span>Sem servidor: nada sai deste aparelho</span><span class="chip">Cenário: <b style="margin-left:4px">${esc(st.scene.name)}</b></span></div>
   <p class="small muted" style="margin:0">Para receber jogadores, abra esta interface no app Mastermind e ligue o servidor da mesa aqui na Mestragem.</p>
   <div class="row"><a class="btn primary" href="#mesa">${ic('map')}Abrir mesa de treino</a><a class="btn" href="#estudio">${ic('brush')}Montar cenário</a></div></div></article>
  <article class="card c4"><div class="card-h"><h2>Ritmo</h2><span class="chip gold num" id="round-chip"></span></div>
   <div class="seg" role="group" aria-label="Modo da sessão" id="mode-seg"><button type="button" data-mode="combat">${ic('swords')}Combate</button><button type="button" data-mode="interlude">${ic('coffee')}Interlúdio</button></div><p class="small muted" id="mode-text" style="margin:0"></p></article>
  <article class="card c12"><div class="card-h"><h2>Cenários de exemplo</h2><span class="small muted">Toque para editar</span></div><div class="scene-thumbs">
   ${[['',st.scene.name,'Em uso'],['caverna','Caverna','Modelo'],['rua','Rua à noite','Modelo']].map(([id,n,tag],i)=>`<a class="thumb" href="#estudio" ${i?`data-m-tpl="${id}"`:'aria-current="true"'}><canvas data-thumb="${i}" width="300" height="200"></canvas><div><b>${esc(n)}</b><span class="${i?'small muted':'chip gold'}" style="align-self:flex-start">${tag}</span></div></a>`).join('')}</div></article>`},
 sync(){const st=RV.state;$$('#mode-seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===st.mode)));const t=$('#mode-text');if(t)t.textContent=st.mode==='combat'?'Movimento pela iniciativa. Testes sempre livres.':'Movimento livre e iniciativa pausada. Testes sempre livres.';
  const r=$('#round-chip');if(r)r.textContent=st.mode==='combat'?`Rodada ${st.init.round}`:'Interlúdio'},
 thumbs(){RV.hydrateIcons($('#mest-grid'));const draw=(cv,sc)=>{const t=document.createElement('canvas');Cena.render(t,sc,{dpr:.3,gridAlpha:.06});const g=cv.getContext('2d');g.fillStyle='#0b0d12';g.fillRect(0,0,cv.width,cv.height);g.drawImage(t,0,0,cv.width,cv.height)};
  const mm=$('#mini-map');if(mm){const c=document.createElement('canvas');Cena.render(c,RV.state.scene,{dpr:.6,gridAlpha:.1});mm.getContext('2d').drawImage(c,0,0,mm.width,mm.height)}
  $$('#mest-grid [data-thumb]').forEach(cv=>{const i=+cv.dataset.thumb;draw(cv,i===0?RV.state.scene:Cena.template(['','caverna','rua'][i],24,16))});
  const scen=Live.table?.scenarios||[];$$('#mest-grid [data-sthumb]').forEach(cv=>{const m=scen[+cv.dataset.sthumb];if(m)draw(cv,A.serverToScene(m,Cena,{master:true,assets:Live.table.assets}))})},
 bindOnce(){if(this.bound)return;this.bound=true;const host=$('#mest-grid');
  host.addEventListener('click',async e=>{const b=e.target.closest('[data-m]');if(!b)return;const m=b.dataset.m,v=b.dataset.v;
   try{
    if(m==='start'){await Net.start();toast('Servidor da mesa iniciando…');setTimeout(()=>this.refresh(),900);setTimeout(()=>this.refresh(),2500);return}
    if(m==='stop'){if(!confirm('Desligar o servidor? Os jogadores perdem a conexão até você ligar de novo.'))return;await Net.stop();Live.role=null;Live.table=null;setTimeout(()=>this.refresh(),600);return}
    if(m==='choose'){await Live.choose(v);return}
    if(m==='share'){window.RpgLocalHost.shareInvite(Live.invites().web);return}
    if(m==='approve'){await Live.cmd('/approve',{playerId:v},'Ficha aprovada. O token do jogador entra no mapa publicado.');return}
    if(m==='req'){await Live.cmd('/power-request',{id:v,action:b.dataset.a},b.dataset.a==='approve'?'Pedido aprovado.':'Pedido recusado.');return}
    if(m==='activate'){await Live.activate(v);toast('Cenário publicado. Os jogadores já veem este mapa.');return}
    if(m==='del-scene'){const sc=Live.table?.scenarios?.find(x=>x.id===v);if(!confirm(`Apagar o cenário "${sc?.name||''}"? Isso não pode ser desfeito.`))return;await Live.deleteScenario(v);toast('Cenário apagado.');return}
    if(m==='edit'){const sc=Live.table?.scenarios?.find(x=>x.id===v);if(!sc)return;RV.studioScene=A.serverToScene(sc,Cena,{master:true,assets:Live.table.assets});location.hash='#estudio';return}
    if(m==='create-scene'){const id=$('[data-m-new]',host).value;const sc=Cena.template(id,24,16);sc.id='cena-'+Math.random().toString(36).slice(2,8);RV.studioScene=sc;location.hash='#estudio';return}
    if(m==='new-scene'){if(!confirm('Começar uma nova cena? A iniciativa e o deslocamento gasto voltam do zero.'))return;await Live.cmd('/advance',{kind:'scene'},'Nova cena iniciada.');return}
    if(m==='add-sheet'){const id=$('[data-m-local]',host).value;const s=RV.Sheets.list().find(x=>x.id===id);if(!s){toast('Nenhuma ficha escolhida.');return}await Live.cmd('/characters',{sheet:s.sheet},`${s.name} foi adicionada à campanha (uma cópia; a original continua no aparelho).`);return}
   }catch(err){toast(err.message)}});
  host.addEventListener('submit',async e=>{const f=e.target.closest('[data-m-form]');if(!f)return;e.preventDefault();const name=f.name.value.trim();if(!name){toast('Dê um nome para a campanha.');return}
   try{await Live.createCampaign(name);toast('Campanha criada.')}catch(err){toast(err.message)}});
  host.addEventListener('change',async e=>{const s=e.target.closest('[data-m-assign]');if(!s)return;try{await Live.cmd('/assign',{playerId:s.dataset.mAssign,characterId:s.value||null},s.value?'Ficha atribuída. O token do jogador entra no mapa publicado.':'Ficha retirada do jogador.')}catch(err){this.render()}});
  host.addEventListener('click',e=>{const a=e.target.closest('[data-m-tpl]');if(a){const sc=Cena.template(a.dataset.mTpl,24,16);RV.studioScene=sc}})},
 async refresh(){Live.err='';if(Net.canHost()&&Net.host()?.running){try{await Live.listCampaigns();if(Live.cid&&Live.campaigns.some(c=>c.id===Live.cid)){if(!Live.table)await Live.choose(Live.cid);else await Live.pull()}else if(Live.cid){Live.cid='';store.del('mm-rv-campaign')}}catch(e){Live.err=e.message}}this.render()}};
on(e=>{if(e==='state')Mest.sync();if(e==='route:mestragem')Mest.refresh();if(e==='prefs:changed'&&location.hash==='#mestragem')Mest.thumbs()});
document.addEventListener('click',e=>{const b=e.target.closest('#mode-seg [data-mode]');if(!b)return;const mode=b.dataset.mode;
 if(Live.role==='master'&&Live.table)Live.cmd('/session-mode',{mode},mode==='combat'?'Combate: movimento pela iniciativa.':'Interlúdio: movimento livre, iniciativa pausada.').catch(()=>{});else{RV.state.mode=mode;emit('state')}});

/* ================= Entrar numa mesa ================= */
const J=RV.Join={mode:Net.served?'web':Net.canJoinByApp()?'app':'web',sheet:null,link:'',
 demoSheets(){return RV.Tut?.flow==='player'||(!Net.served&&!Net.canJoinByApp())},
 render(){const app=$('#join-app'),web=$('#join-web');if(!app)return;$$('#join-mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.jm===this.mode)));app.hidden=this.mode!=='app';web.hidden=this.mode!=='web';
  $('#join-mode').hidden=Net.served;const list=RV.Sheets.list();if(this.demoSheets()&&!list.some(s=>s.id==='aurora'))list.unshift({id:'aurora',system:'ordem-paranormal',name:'Aurora',detail:'Combatente · NEX 35% · exemplo',sheet:null});
  $('#join-sheets').innerHTML=list.map(s=>`<label class="sheet-pick"><input type="radio" name="join-local" value="${esc(s.id)}" ${this.sheet===s.id?'checked':''}><span class="sheet-av" style="background:${{'ordem-paranormal':'#c7a87b','d-d':'#6db7e0',gurps:'#e3a85a','chamado-de-ctchulhu':'#86bd9c'}[s.system]||'#9c90dd'}">${esc(s.name[0]||'?')}</span><span class="grow"><b>${esc(s.name)}</b><small class="muted">${esc(RV.Sheets.SYSTEM_LABEL[s.system]||'')}${s.detail?' · '+esc(s.detail):''}</small></span></label>`).join('')+
   `<label class="sheet-pick"><input type="radio" name="join-local" value="" ${this.sheet===''?'checked':''}><span class="sheet-av empty">${ic('user')}</span><span class="grow"><b>Entrar sem ficha</b><small class="muted">O mestre atribui uma ficha da campanha</small></span></label>`+(list.length?'':'<p class="small muted" style="margin:0">Nenhuma ficha salva neste aparelho. Crie uma em Fichas ou entre sem ficha.</p>');
  $('#join-btn').innerHTML=(this.sheet?'Entrar e enviar a ficha':'Entrar na mesa')+ic('arrow-right');
  const resume=$('#join-resume');if(resume){resume.hidden=!Live.conn||Net.served;const rn=resume.querySelector('.resume-name');if(rn)rn.textContent=(Live.conn?.campaign||'Mesa')+(Live.conn?.name?' · como '+Live.conn.name:'')}
  if(Net.served&&RV.webInvite)$('#web-campaign').textContent=RV.webInvite.name||'Mesa na rede local'},
 status(el,txt,cls){$(el).innerHTML=`<span class="dot ${cls||''}"></span><span>${txt}</span>`},
 async submit(mode){const st=mode==='app'?'#join-status':'#web-status',btn=$(mode==='app'?'#join-btn':'#web-btn');const nick=$(mode==='app'?'#join-nick':'#web-nick').value.trim();
  if(!nick){this.status(st,'Digite seu nome na mesa.','bad-dot');return}
  if(mode==='app'&&this.sheet===null){this.status(st,'Escolha uma ficha ou "Entrar sem ficha".','bad-dot');return}
  const link=mode==='app'?$('#join-addr').value.trim():RV.webInvite?.link;const sheet=mode==='app'?(this.sheet?RV.Sheets.list().find(s=>s.id===this.sheet)?.sheet||null:null):(document.querySelector('input[name="web-sheet"]:checked')?.value==='file'?this.fileSheet||null:null);
  if(mode==='web'&&document.querySelector('input[name="web-sheet"]:checked')?.value==='file'&&!this.fileSheet){this.status(st,'Escolha o arquivo da ficha (JSON exportado do app).','bad-dot');return}
  btn.disabled=true;this.status(st,'Conectando à mesa…');emit('join:done');
  try{if(RV.Tut?.flow==='player'||(!Net.served&&!Net.canJoinByApp())){btn.disabled=false;return this.demo(st,btn,!!sheet||this.sheet==='aurora')}
   await Live.join({link,nickname:nick,sheet});this.status(st,sheet?'Ficha enviada ao mestre. Abrindo a mesa…':'Conectado. Abrindo a mesa…','on');
   setTimeout(()=>{btn.disabled=false;if(Net.served)location.href='/v2/play/'+Live.conn.cid+'#jogador';else location.hash='#jogador'},500)}
  catch(e){btn.disabled=false;this.status(st,esc(e.message),'bad-dot')}},
 /* sem app e sem servidor (navegador aberto direto do arquivo): só a campanha de treino */
 demo(st,btn,withSheet){const steps=withSheet?[['Conectando à mesa de treino…',''],['Ficha enviada ao mestre. Aguardando aprovação…',''],['Ficha aprovada. Abrindo a mesa…','on']]:[['Conectando à mesa de treino…',''],['Conectado. Abrindo a mesa…','on']];btn.disabled=true;
  steps.forEach(([t,c],i)=>setTimeout(()=>{this.status(st,t,c);if(i===steps.length-1)setTimeout(()=>{btn.disabled=false;location.hash='#jogador'},500)},i*600))},
 bind(){$('#join-mode').onclick=e=>{const b=e.target.closest('[data-jm]');if(b){this.mode=b.dataset.jm;this.render()}};
  $('#join-sheets').onchange=e=>{this.sheet=e.target.value;this.render();emit('join:sheet')};
  $('#join-test').onclick=async()=>{const v=$('#join-addr').value.trim();this.status('#join-status','Procurando a mesa…');
   if(!Net.canJoinByApp()){this.status('#join-status','Esta janela não acessa a rede. Use o app Mastermind ou abra o convite no navegador.','bad-dot');return}
   try{const i=await Live.info(v);this.status('#join-status',`<b>${esc(i.name)}</b> · mesa encontrada na rede local`,'on')}catch(e){this.status('#join-status',esc(e.message),'bad-dot')}};
  $('#join-app').addEventListener('submit',e=>{e.preventDefault();this.submit('app')});
  $('#join-web').addEventListener('submit',e=>{e.preventDefault();this.submit('web')});
  $('#join-back').onclick=()=>{emit('join:done');location.hash='#jogador'};
  $('#join-web').addEventListener('change',e=>{if(e.target.name==='web-sheet'&&e.target.value==='file')$('#web-file').click()});
  $('#web-file').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>240000){this.status('#web-status','Arquivo grande demais para uma ficha.','bad-dot');return}
   const rd=new FileReader();rd.onload=()=>{const d=parse(rd.result,null);const sh=d&&typeof d==='object'?(d.sheet&&typeof d.sheet==='object'?d.sheet:d):null;
    if(!sh||!String(sh.name||'').trim()){this.fileSheet=null;this.status('#web-status','Este arquivo não parece uma ficha do app (falta o nome).','bad-dot');return}
    this.fileSheet=sh;this.status('#web-status',`Ficha <b>${esc(sh.name)}</b> pronta para enviar ao mestre.`,'on')};rd.readAsText(f)};
  $('#join-leave')?.addEventListener('click',()=>{Live.leave();toast('Você saiu da mesa neste aparelho.');this.render()})}};
on(e=>{if(e==='route:entrar')J.render();if(e==='route:jogador'&&Live.conn)Live.ppull().catch(err=>toast(err.message))});

/* ================= Páginas servidas pela mesa (/v2/join e /v2/play) ================= */
RV.bootServed=async()=>{if(!Net.served)return;document.body.classList.add('served');
 let m=/^\/v2\/join\/([a-z0-9]{32})\/([A-Za-z0-9_-]{20,90})$/.exec(location.pathname);
 if(m){RV.webInvite={link:location.origin+'/join/'+m[1]+'/'+m[2],cid:m[1]};try{const i=await Net.player(null,'GET','/api/join/info/'+m[1]);RV.webInvite.name=i.name}catch(_){}
  if(location.hash!=='#entrar')location.hash='#entrar';else J.render();return}
 m=/^\/v2\/play\/([a-z0-9]{32})$/.exec(location.pathname);
 if(m){Live.conn={base:location.origin,cid:m[1],guest:'',name:''};try{const me=await Net.player(Live.conn,'GET','/api/play/'+m[1]);Live.conn.name=me.nickname;Live.conn.campaign=me.campaign}catch(e){toast('Sessão de jogador não encontrada. Abra o convite de novo.')}
  if(location.hash!=='#jogador')location.hash='#jogador';else Live.ppull().catch(e=>toast(e.message))}};
})();
