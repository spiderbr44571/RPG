/* Mastermind v0.55: escolha de poderes, Transcender e pedidos de turno.
   A ficha não concede habilidades por conta própria: GM confirma no servidor. */
(function(root){
 'use strict';
 const $=(q,base=document)=>base.querySelector(q);
 const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cid=location.pathname.split('/')[2];
 const base='/api/play/'+cid;
 const choicesNex=[15,30,45,60,75,90];
 let catalog=null,requests=[],serverChoices=[],slots=0,used=0,loadAt=0,busy=false,original=null,live=null;
 let lastCharacter=null,selectedCategory='transcend',chosen='',feedback='',syncing=false,polling=false;
 const rendered=new WeakMap();
 function startPolling(){if(polling)return;polling=true;setInterval(()=>{if(!document.hidden)sync().then(renderTurns)},2000);}
 const get=()=>root.RPG31_PLAYER?.state?.character||lastCharacter||null;
 const notify=s=>{feedback=s;const el=$('#v55-status')||$('#sheet-status');if(el)el.textContent=s;else root.RPG31_PLAYER?.notify?.(s)};
 async function api(path,method='GET',payload){
  const r=await fetch(base+'/'+path,{method,credentials:'same-origin',
   headers:{'Content-Type':'application/json'},cache:'no-store',body:payload?JSON.stringify(payload):undefined});
  const result=await r.json();
  if(!r.ok)throw Error(result.error||'Falha ao comunicar com o mestre');
  return result;
 }
 async function ensureCatalog(){
  if(catalog)return catalog;
  const r=await fetch('/powers-catalog.json',{credentials:'same-origin',cache:'force-cache'});
  if(!r.ok)throw Error('Catálogo de poderes indisponível');
  catalog=await r.json();return catalog;
 }
 async function sync(){
  if(syncing)return;syncing=true;
  try{
   await ensureCatalog();
   const state=await api('power-requests');
   requests=state.requests||[];serverChoices=state.choices||[];slots=state.slots||0;used=state.used||0;
   for(const host of [original,live])if(host?.isConnected&&host.dataset.v55Container)render(host,get(),host===live);
  }catch(e){notify(e.message)}finally{syncing=false}
 }
 const present=sheet=>Array.isArray(sheet?.powers)?sheet.powers.map(x=>typeof x==='string'?x:x?.name||x?.nome).filter(Boolean):[];
 const elementCounts=()=>serverChoices.filter(x=>x.type==='transcend').reduce((acc,x)=>{
  acc[x.element]=(acc[x.element]||0)+1;return acc;
 },{});
 function catalogItems(sheet){
  const source=selectedCategory==='class'
   ?(catalog?.classPowers?.[sheet?.class]||[]).filter(n=>n!=='Transcender')
    .map(name=>({name,element:'Classe',page:0,needsMasterReview:true}))
   :(catalog?.powers||[]);
  return source;
 }
 function cards(list,powers){
  return list.map(p=>{
   const known=powers.includes(p.name),picked=chosen===p.name;
   const prior=p.prerequisite;
   const count=prior?(elementCounts()[prior.element]||0):0;
   const allowed=!prior||count>=prior.count;
   return '<button type="button" data-v55-select="'+escapeHtml(p.name)+'" class="v55-card'+(known?' known':'')+
     (picked?' selected':'')+'" '+(known||!allowed?'disabled':'')+'>'+
     '<strong>'+escapeHtml(p.name)+'</strong><span>'+escapeHtml(p.element)+
     (p.page?' · Livro p. '+p.page:'')+'</span>'+
     '<small>'+(known?'Aprendido':!allowed?'Requer '+escapeHtml(prior.element)+' '+prior.count+' · você tem '+count:
        'Sujeito a aprovação do mestre')+'</small></button>';
  }).join('');
 }
 function render(rootEl,sheet,liveMode){
  if(!rootEl||!catalog)return;
  const signature=JSON.stringify([sheet,serverChoices,requests,slots,used,chosen,selectedCategory,feedback]);
  if(rendered.get(rootEl)===signature&&rootEl.querySelector('.v55-power-section'))return;
  rendered.set(rootEl,signature);
  const custom=rootEl.querySelector('#v55-custom')?.value||'';
  const n=Number(sheet?.nex)||5,known=present(sheet);
  const all=catalogItems(sheet);
  if(!all.some(x=>x.name===chosen))chosen='';
  const powerRecords=serverChoices.filter(x=>x.type==='class'||x.type==='transcend');
  rootEl.innerHTML='<section class="v55-power-section"><h3>✧ Poderes & Transcender</h3>'+
   '<p>Escolha poderes quando atingir NEX 15%, 30%, 45%, 60%, 75% e 90%. Cada Transcender substitui uma escolha de classe e renuncia ao ganho de SAN daquele avanço. Todas as escolhas são confirmadas pelo mestre.</p>'+
   '<div class="v55-budget"><strong>'+Math.max(0,slots-used)+' escolhas disponíveis</strong><small>NEX '+n+'% · '+used+'/'+slots+' utilizadas'+
     (used>slots?' · verifique escolhas antigas com o mestre':'')+'</small></div>'+
   '<div class="v55-pills"><button data-v55-kind="transcend" class="'+(selectedCategory==='transcend'?'active':'')+'">✦ Transcender</button>'+
    '<button data-v55-kind="class" class="'+(selectedCategory==='class'?'active':'')+'">Poderes de classe</button></div>'+
   '<p class="v55-hint">'+(selectedCategory==='transcend'?
    'Poderes paranormais por elemento. Pré-requisitos, afinidade e fontes adicionais devem ser conferidos com o mestre.':
    'Escolha entre sugestões de poderes de classe; outras opções do livro podem ser solicitadas pelo campo personalizado.')+'</p>'+
   '<div class="v55-power-grid">'+cards(all,known)+'</div>'+
   (selectedCategory==='class'?'<label>Outro poder de classe do seu livro <input id="v55-custom" maxlength="90" placeholder="Nome exato do poder"></label>':'')+
   '<button type="button" id="v55-request-power" '+(slots-used<=0||requests.length||busy?'disabled':'')+'>Enviar escolha para aprovação</button>'+
   '<div class="v55-known"><h4>Poderes aprendidos</h4>'+(known.length?known.map(x=>'<span>'+escapeHtml(x)+'</span>').join(''):'<small>Nenhum poder cadastrado ainda.</small>')+'</div>'+
   '<div class="v55-progress"><h4>Histórico de evolução</h4>'+(powerRecords.length?powerRecords.map(x=>'<div>NEX '+x.nex+'% · '+escapeHtml(x.name)+
      (x.type==='transcend'?' · Transcender / '+escapeHtml(x.element||''):' · Classe')+'</div>').join(''):
    '<small>As escolhas aprovadas aparecem aqui.</small>')+'</div>'+
   (requests.length?'<div class="v55-pending"><h4>Aguardando mestre</h4>'+requests.map(r=>'<p>'+escapeHtml(r.name||
     ({pass:'Passar a vez',delay:'Atrasar iniciativa',surto:'Surto Temporal'}[r.type]||r.type))+'</p>').join('')+'</div>':'')+
   '<p id="v55-status" role="status">'+escapeHtml(feedback)+'</p></section>';
  const field=rootEl.querySelector('#v55-custom');if(field)field.value=custom;
 }
 async function request(type,name,targetId){
  if(busy)return;
  busy=true;
  try{
   await api('power-requests','POST',{type,...(name?{name}:{}),...(targetId?{targetId}:{})});
   notify('Solicitação enviada ao mestre para aprovação.');
   busy=false;await sync();
  }catch(e){notify(e.message)}
  finally{busy=false}
 }
 document.addEventListener('click',e=>{
  const picked=e.target.closest('[data-v55-select]');
  if(picked){chosen=picked.dataset.v55Select;const host=picked.closest('[data-v55-container]');if(host)render(host,get(),host===live);return}
  const kind=e.target.closest('[data-v55-kind]');
  if(kind){selectedCategory=kind.dataset.v55Kind;chosen='';
    const host=kind.closest('[data-v55-container]');if(host)render(host,get(),host===live);return}
  const send=e.target.closest('#v55-request-power');
  if(send){
   const host=send.closest('[data-v55-container]');
   const name=selectedCategory==='class'?($('#v55-custom',host)?.value.trim()||chosen):chosen;
   if(!name)return notify('Selecione um poder antes de enviar.');
   request(selectedCategory,name);return;
  }
  const action=e.target.closest('[data-v55-turn]');
  if(action){
   const type=action.dataset.v55Turn;
   if(type==='consume'){
    api('consume-bonus','POST',{}).then(()=>{notify('Ação adicional marcada como utilizada.');root.RPG31_PLAYER?.refresh?.();sync()}).catch(err=>notify(err.message));
    return;
   }
   if(type==='delay'){
    const select=$('#v55-delay-target');
    if(!select?.value)return notify('Selecione quem deverá agir antes de você.');
    request('delay',null,select.value);return;
   }
   request(type);return;
  }
  const launch=e.target.closest('[data-v55-open-actions]');
  if(launch){const pane=$('#v55-turn-panel');if(pane){pane.hidden=!pane.hidden;if(!pane.hidden)renderTurns()}return}
 });
 function mountOriginal(rootEl,sheet){
  if(!rootEl)return;
  startPolling();lastCharacter=sheet;original=rootEl;rootEl.dataset.v55Container='original';
  if(catalog)render(rootEl,sheet,false);else ensureCatalog().then(()=>sync()).catch(e=>notify(e.message));
 }
 function mountLive(rootEl,sheet){
  if(!rootEl)return;
  lastCharacter=sheet;live=rootEl;rootEl.dataset.v55Container='live';
  if(catalog)render(rootEl,sheet,true);else ensureCatalog().then(()=>sync()).catch(e=>notify(e.message));
 }
 function renderTurns(){
  const s=root.RPG31_PLAYER?.state,container=$('#v55-turn-panel');
  if(!container||container.hidden)return;
  const own=(s?.scene?.tokens||[]).find(t=>t.movable),active=s?.initiative?.activeId;
  const can=!!own&&active===own.id&&s?.sessionMode!=='interlude';
  const targets=(s?.initiative?.entries||[]).filter(t=>t.tokenId!==own?.id);
  const hasSurto=present(s?.character).includes('Surto Temporal');
  const pending=requests.length>0;
  const bonus=Number(s?.bonusActions)||0;
  container.innerHTML='<header><h3>Turno & Poderes</h3><button data-v55-open-actions type="button">Fechar</button></header>'+
    '<p>'+(s?.sessionMode==='interlude'?'Interlúdio: movimento livre e sem ordem de iniciativa.':
     can?'Seu turno: solicite ao mestre ajustes de iniciativa.':'Aguarde seu turno para passar, atrasar ou usar Surto Temporal. Testes continuam liberados.')+'</p>'+
    (bonus?'<p class="v55-bonus">✦ '+bonus+' ação(ões) padrão extra disponíveis</p>'+
      '<button data-v55-turn="consume">Marcar ação extra como utilizada</button>':'')+
    '<div class="v55-turn-controls"><button data-v55-turn="pass" '+(!can||pending?'disabled':'')+'>Passar a vez</button>'+
      '<label>Atrasar para depois de quem?<select id="v55-delay-target">'+
      '<option value="">Escolher participante</option>'+
      targets.map(x=>'<option value="'+escapeHtml(x.tokenId)+'">'+escapeHtml(x.name)+'</option>').join('')+
      '</select></label><button data-v55-turn="delay" '+(!can||pending||!targets.length?'disabled':'')+'>Pedir atraso</button>'+
      (hasSurto?'<button data-v55-turn="surto" '+(!can||pending?'disabled':'')+'>✦ Solicitar Surto Temporal (3 PE)</button>':
      '<small>Surto Temporal aparece quando for aprendido e aprovado pelo mestre.</small>')+'</div>'+
     (pending?'<p>Aguardando aprovação do mestre: '+requests.map(x=>escapeHtml(x.name||x.type)).join(', ')+'</p>':'')+
     '<small>Surto Temporal normalmente concede uma ação padrão extra; o mestre pode autorizar um turno completo pela regra da mesa. Seus testes de dados não dependem da ordem de iniciativa.</small>';
 }
 function unmountLive(){if(live){delete live.dataset.v55Container;rendered.delete(live);}live=null;}
 function initLive(){
  if($('#v55-action-launch'))return;startPolling();
  const stage=$('.stage');if(!stage)return;
  const button=document.createElement('button');
  button.type='button';button.id='v55-action-launch';button.dataset.v55OpenActions='1';
  button.textContent='⚔ Ações';button.setAttribute('aria-label','Solicitar poderes e mudança de turno');
  stage.append(button);
  const panel=document.createElement('section');panel.id='v55-turn-panel';panel.hidden=true;
  stage.append(panel);
  root.addEventListener('mastermind:player-live-render',()=>{
   if(!panel.hidden)renderTurns();
   // Render a power listing only while its sheet tab is open.
   const data=$('#sheet-data');
   if(data&&root.RPG31_PLAYER?.state?.character&&data.dataset.v55Container){
     mountLive(data,root.RPG31_PLAYER.state.character);
   }
  });

  sync();
 }
 root.MastermindPowerUI={initLive,mountLive,mountOriginal,unmountLive,sync,renderTurns,get catalog(){return catalog}};
})(window);
