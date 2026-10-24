/* RPG Mesa 0.31 - Master tabletop. */
(function(root){
'use strict';
const readable=x=>String(x??'')
  .replace(/cen\uFFFD+rio/gi,'cenário').replace(/Her\uFFFD+i/gi,'Herói')
  .replace(/\uFFFD+/g,'').trim();
const esc=x=>readable(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(q,el=document)=>el.querySelector(q);
const link=document.createElement('link');link.rel='stylesheet';link.href=location.protocol==='file:'?'rpg31_live.css':'/table-master.css';document.head.append(link);
let active=null;
function close(){
 const s=active;if(!s)return;active=null;clearInterval(s.timer);s.camera?.destroy();s.el.remove();
 document.body.style.overflow=s.oldOverflow;
 try{root.RpgSceneDisplay?.setLandscape(false)}catch(_){}
 s.options.onClose?.();
}
function open(host,options){
 if(active)close();
 const s={el:document.createElement('div'),oldOverflow:document.body.style.overflow,
   options,revision:-1,data:null,scene:null,selected:'',cell:48,timer:0,busy:false,folded:false,groups:{rolls:true,initiative:true,requests:false,pace:false,players:false,movement:false,target:true},lastRequestCount:0,privateResult:null,editing:false,camera:root.RPG33_CAMERA?.create(),cameraScene:''};
 active=s;s.el.className='r31-live';document.body.appendChild(s.el);document.body.style.overflow='hidden';
 try{root.RpgSceneDisplay?.setLandscape(true)}catch(_){}
 const req=(path='',method='GET',payload)=>options.request(options.route+path,method,payload);
 const feedback=text=>{const e=$('#r31-status',s.el);if(e)e.textContent=text};
 function bars(c){
  const sh=c?.sheet;if(!sh)return '';
  let values=Object.entries(sh.resources||{}).filter(([,v])=>v&&typeof v==='object').map(([k,v])=>[k,Number(v.current)||0,Number(v.max)||0]);
  if(sh.systemId==='d-d'){
    values=[['PV',Number(sh.hitPointsCurrent??0),Number(sh.hitPointsMax||1)]];
    for(const [level,slots] of Object.entries(sh.spellSlots||{})){
      if(slots&&typeof slots==='object'&&Number(slots.max)>0)values.push(['Magia '+level,Number(slots.current||0),Number(slots.max)]);
    }
  }
  if(sh.systemId==='gurps')values=[['HP',Number(sh.currentHP??sh.attrs?.ST??0),Number(sh.attrs?.ST||1)],['FP',Number(sh.currentFP??sh.attrs?.HT??0),Number(sh.attrs?.HT||1)]];
  return values.slice(0,5).map(([k,cur,max])=>'<small>'+esc(k)+' '+cur+'/'+max+'</small><div class="track"><i class="bar" style="width:'+Math.max(0,Math.min(100,max>0?100*cur/max:0))+'%"></i></div>').join('');
 }
 const diceList=roll=>roll&&Array.isArray(roll.faces)?'['+roll.faces.join(', ')+']'+(roll.bonus?' '+(roll.bonus>0?'+':'')+roll.bonus:''):'';
 function selection(){
  const t=s.scene?.tokens?.find(t=>t.id===s.selected),el=$('#r31-details',s.el);
  if(!el)return;
  if(!t){el.innerHTML='<p>Toque em um token para selecionar um personagem ou criatura.</p>';return}
  let html='<h3>'+esc(t.name)+'</h3><small>'+esc(t.kind)+' · '+esc(t.systemId||'')+'</small>';
  if(t.kind==='creature'){
   html+='<p>PV '+t.hp+'/'+t.maxHp+' · Defesa '+t.defense+'</p>'+
    '<div class="actions">'+[-10,-5,-1,1,5].map(n=>'<button data-hp="'+n+'">'+(n>0?'+':'')+n+' PV</button>').join('')+'</div>'+
    '<p>'+esc(t.notes||'')+'</p><p>'+esc(t.powers||'')+'</p>'+
    (t.attacks||[]).map((a,i)=>'<div class="info">'+esc(a.name)+' <small>'+esc(a.test||'')+' · '+esc(a.damage||'')+'</small><button data-attack="'+i+'">Rolar teste</button></div>').join('');
  }else{
   const c=(s.data.characters||[]).find(c=>c.id===t.characterId);html+=bars(c);
   html+='<p>'+esc(c?.sheet?.name||'Token sem ficha vinculada')+'</p>';
   if(t.kind==='character')html+='<label>Jogador que controla este token<select data-r34-token-bind="'+esc(t.id)+'">'+
    '<option value="">Somente mestre</option>'+
    (s.data.players||[]).filter(p=>p.characterId).map(p=>
      '<option value="'+esc(p.id)+'" '+(p.id===t.ownerPlayerId?'selected':'')+'>'+
      esc(p.nickname||'Jogador')+' - '+esc((s.data.characters||[]).find(c=>c.id===p.characterId)?.sheet?.name||'Ficha')+'</option>').join('')+
    '</select></label>';
  }
  if(t.kind==='character'||t.kind==='creature'){
    const ch=(s.data.characters||[]).find(ch=>ch.id===t.characterId);
    const sys=ch?.sheet?.systemId||t.systemId||'ordem-paranormal';
    const defaults={'ordem-paranormal':9,'d-d':6,'gurps':5};
    const limit=s.data.movementLimits?.[t.id]??t.movementSquares??(s.data.movementRules?.[sys]??defaults[sys]??9);
    const spent=s.data.movementSpent?.[t.id]||0;
    html+='<p>Movimento: <strong>'+(s.data.sessionMode==='interlude'?'∞ ilimitado (interlúdio)':Math.max(0,limit-spent)+'/'+limit+' quadrados restantes')+'</strong></p>'+
      '<label>Deslocamento individual<input type="number" min="0" max="60" id="r35-token-speed" value="'+limit+'"></label>'+
      '<button data-action="token-speed">Definir deslocamento</button>';
  }
  html+='<small>Toque no mapa para reposicionar o token selecionado.</small>';
  el.innerHTML=html;
 }

 const r64Shapes={
  door:'<path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M10 12h11m-4-4 4 4-4 4"/>',
  turn:'<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><path d="M13 17h8m-4-4v8"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/>',
  coffee:'<path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h2a3 3 0 0 1 0 6h-2M7 2v3m5-3v3m-9 16h17"/>',
  maximize:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  sidebar:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  initiative:'<path d="M8 16 16 8"/><path d="M10 8h6v6"/><path d="M6 19h12"/><path d="M9 5H5a2 2 0 0 0-2 2v4"/>',
  requests:'<path d="M21 11.5a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 0 1 5-13h5a8 8 0 0 1 8 8z"/><path d="M8 10h8m-8 4h5"/>',
  hourglass:'<path d="M5 3h14M5 21h14M7 3c0 6 5 6 5 9s-5 3-5 9m10-18c0 6-5 6-5 9s5 3 5 9"/>',
  people:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1"/><path d="M14 19a4.5 4.5 0 0 1 7 0v1"/>',
  walk:'<circle cx="12" cy="4" r="2.2"/><path d="m10 21 1.5-5-2-3 2-3 3 2"/><path d="m8 11 3 2 3-1 2 3"/><path d="m8 21 2-4-3-2-2 2"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  shield:'<path d="m12 3 9 4v5c0 6-4 8-9 10-5-2-9-4-9-10V7z"/>'
 };
 const r64Icon=id=>'<svg class="r64-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(r64Shapes[id]||r64Shapes.target)+'</svg>';
 const r64Action=(action,iconName,label,extra='')=>'<button type="button" data-action="'+action+'" class="r64-action '+extra+'" title="'+label+'" aria-label="'+label+'">'+r64Icon(iconName)+'<span class="r64-action-label">'+label+'</span></button>';
 const r64Group=(id,iconName,label,badge='')=>'<details class="r64-card r64-'+id+'" data-r64-group="'+id+'" '+(s.groups[id]?'open':'')+'><summary>'+r64Icon(iconName)+'<span>'+label+'</span>'+(badge?'<em>'+badge+'</em>':'')+r64Icon('chevron')+'</summary><div class="r64-card-body">';
 function render(){
  const d=s.data;if(!d)return;const map=(d.scenarios||[]).find(c=>c.id===d.activeScenarioId);
  const activeId=d.initiative?.activeId||'';
  const activeToken=map?.tokens?.find(t=>t.id===activeId);
  const activeName=activeToken?.name||(d.initiative?.entries||[]).find(t=>t.tokenId===activeId)?.name||'Iniciativa não iniciada';
  const interlude=d.sessionMode==='interlude';
  s.scene=map;
  if((d.playerRequests||[]).length&&!s.lastRequestCount)s.groups.requests=true;
  s.lastRequestCount=(d.playerRequests||[]).length;
  s.el.innerHTML='<header class="r64-head"><div class="r64-brand"><strong>✧ MESTRE</strong><small>'+esc(map?.name||'Sem cenário publicado')+'</small></div>'+
    '<nav class="r64-commands" aria-label="Ferramentas da mesa">'+
    r64Action('close','door','Sair','r64-exit')+
    r64Action('turn','turn','+ Turno',interlude?'r64-disabled':'')+
    r64Action('edit','map','Editar mapa')+
    r64Action('session-mode','coffee',interlude?'Voltar ao combate':'Iniciar interlúdio','r64-interlude '+(interlude?'active':''))+
    r64Action('fit','maximize','Enquadrar')+'</nav>'+
    '<div class="r64-top-right"><span class="r35-active-turn" aria-live="polite">'+(interlude?'☕ Interlúdio':'Vez: <b>'+esc(activeName)+'</b>')+'<small>Rodada '+(d.initiative?.round||1)+'</small></span>'+
    '<div class="r64-viewport-actions">'+r64Action('panel','sidebar',s.folded?'Mostrar painel':'Ocultar painel','r64-icon-only')+
    r64Action('zoom-out','minus','Afastar mapa','r64-icon-only')+
    r64Action('zoom-in','plus','Aproximar mapa','r64-icon-only')+'</div></div></header>'+
    '<div class="body '+(s.folded?'r64-panel-folded':'')+'"><div id="r31-scroll" class="scroll"><div class="r35-turn-overlay '+(interlude?'r53-interlude-indicator':'')+'">'+
    (interlude?'✦ INTERLÚDIO <strong>Exploração livre</strong><small>Todos os jogadores podem se mover e rolar dados. Iniciativa preservada.</small>':
    'Vez atual: <strong>'+esc(activeName)+'</strong><small>Rodada '+(d.initiative?.round||1)+'</small>')+'</div><div id="r31-board" class="board"></div></div>'+
    '<aside id="r31-aside" class="r64-dock '+(s.folded?'folded':'')+'">'+r64Group('rolls','dice','Rolagens')+
      '<div class="r64-dice-entry"><input id="r31-formula" value="1d20" placeholder="1d20+5" aria-label="Notação do dado">'+r64Icon('dice')+'</div>'+
      '<div class="actions r64-roll-visibility"><button data-action="roll-public" class="primary">'+r64Icon('people')+'Todos</button><button data-action="roll-private">'+r64Icon('shield')+'Mestre</button></div>'+
      (s.privateResult?'<div class="info"><b>Rolagem privada</b> '+esc(s.privateResult.formula)+' : <b>'+s.privateResult.total+'</b> <small>Dados: '+esc(diceList(s.privateResult))+'</small></div>':'')+
      (d.rolls||[]).slice(-5).reverse().map(r=>'<div class="info">'+esc(r.by)+' - '+esc(r.label)+' <b>'+r.total+'</b><small>'+esc(r.formula)+' : '+esc(diceList(r))+'</small></div>').join('')+
    '</div></details>'+r64Group('requests','requests','Solicitações',(d.playerRequests||[]).length?String(d.playerRequests.length):'')+
      '<p class="r64-helper">Pedidos para poderes, transcendência e iniciativa.</p>'+
      ((d.playerRequests||[]).length?(d.playerRequests||[]).map(r=>
       '<article class="r55-request"><strong>'+esc(r.playerName)+' · '+esc(
          ({class:'Poder de classe',transcend:'Transcender',pass:'Passar a vez',delay:'Atrasar iniciativa',surto:'Surto Temporal'}[r.type]||r.type))+'</strong>'+
         (r.name?'<p>'+esc(r.name)+(r.element?' · '+esc(r.element):'')+'</p>':'')+
         (r.targetId?'<p>Depois de: '+esc(d.initiative?.entries?.find(x=>x.tokenId===r.targetId)?.name||'Participante')+'</p>':'')+
         (r.nex?'<small>NEX '+Number(r.nex)+'%</small>':'')+
         '<div class="actions"><button data-r55-decision="approve" data-r55-id="'+esc(r.id)+'">Aprovar</button>'+
         (r.type==='surto'?'<button data-r55-decision="full" data-r55-id="'+esc(r.id)+'">Turno inteiro (regra da mesa)</button>':'')+
         '<button data-r55-decision="reject" data-r55-id="'+esc(r.id)+'">Recusar</button></div></article>'
       ).join(''):'<p class="r64-empty">Sem pedidos pendentes.</p>')+
    '</div></details>'+r64Group('pace','coffee','Ritmo da sessão')+'<div class="r53-mode-panel">'+
    '<strong>'+(interlude?'✦ Interlúdio ativo':'⚔ Combate / exploração controlada')+'</strong>'+
    '<p>'+(interlude?'Movimento ilimitado para cada jogador. Ordem de iniciativa pausada, sem perder os participantes nem a rodada.':'Movimento segue a iniciativa e o limite da ficha. Testes são livres, mesmo fora do turno.')+'</p>'+
    '<button data-action="session-mode" class="r53-mode-button">'+(interlude?'Voltar ao combate':'Ativar interlúdio')+'</button></div></div></details>'+
    r64Group('initiative','initiative','Iniciativa / sessão','R'+(d.initiative?.round||1))+
    (interlude?'<p class="r53-interlude-hint">Pausada no interlúdio. Ao voltar ao combate, continua da ordem atual.</p>':'')+
   '<div class="r64-initiative-summary"><span>'+r64Icon('hourglass')+'<b>'+esc(activeName)+'</b></span><small>Rodada '+(d.initiative?.round||1)+' · '+(d.initiative?.entries||[]).length+' na ordem</small></div>'+
   '<input id="r32-initiative-formula" value="1d20" placeholder="1d20+5">'+
   '<div class="actions"><button data-action="initiative-roll" class="primary">Rolar iniciativa</button><button data-action="initiative-set">Definir valor</button></div>'+
   '<div class="actions"><button data-action="initiative-next" '+(interlude?'disabled':'')+'>Próximo turno</button><button data-action="initiative-clear">Reiniciar</button></div>'+
   '<button data-action="scene">Encerrar cena</button>'+
   '<div class="r35-current-turn"><strong>AGORA: '+esc(activeName)+'</strong>'+
    '<small>Rodada '+(d.initiative?.round||1)+'</small></div>'+
   (d.initiative?.entries||[]).map((item,index)=>
    '<div class="info r35-initiative-entry '+(item.tokenId===d.initiative.activeId?'r35-current selected':'')+'">'+
     '<b>'+(index+1)+'. '+esc(item.name)+' - '+item.score+'</b>'+
     (item.faces?.length?'<small>'+esc(item.formula)+' : ['+esc(item.faces.join(', '))+']</small>':'')+
     '<button data-init-remove="'+esc(item.tokenId)+'" title="Remover da iniciativa">Remover</button></div>').join('')+
 '</div></details>'+r64Group('players','people','Jogadores e Efeitos',String((d.players||[]).length))+
      (d.players||[]).map(p=>{
        const c=(d.characters||[]).find(c=>c.id===p.characterId);
        const own=map?.tokens?.find(t=>t.ownerPlayerId===p.id&&t.characterId===p.characterId&&!t.hidden);
        const linkStatus=(!c?'Sem ficha':!own?'Token não associado/visível':'Token vinculado') ;
        return '<div class="info"><label class="check"><input type="checkbox" data-player="'+esc(p.characterId||'')+'" '+(c?'':'disabled')+'>'+
          '<span>'+esc(p.nickname)+' - '+esc(c?.sheet?.name||'Sem ficha')+bars(c)+'</span></label>'+
          '<small>'+linkStatus+'</small><select data-r34-assign="'+esc(p.id)+'" aria-label="Ficha de '+esc(p.nickname)+'">'+
          '<option value="">Escolher ficha do jogador...</option>'+
          (d.characters||[]).map(ch=>'<option value="'+esc(ch.id)+'" '+(ch.id===p.characterId?'selected':'')+'>'+
            esc(ch.sheet?.name||'Personagem')+'</option>').join('')+'</select></div>';
      }).join('')+
      '<input id="r31-effect" placeholder="Nome do efeito" maxlength="80">'+
      '<label>Modificador (opcional)<select id="r36-effect-stat"><option value="">Condição sem modificador</option><option value="defesa">Defesa</option><option value="ataque">Ataque</option><option value="pericias">Perícias</option></select></label>'+
      '<label>Valor do modificador<input id="r36-effect-amount" type="number" min="-20" max="20" value="0"></label>'+
      '<select id="r31-duration"><option value="scene">Cena</option><option value="turn">Turnos</option><option value="permanent">Permanente</option></select>'+
      '<input id="r31-rem" type="number" min="1" max="999" value="3">'+
      '<button data-action="effect" class="primary">Aplicar nos selecionados</button></div></details>'+
    r64Group('movement','walk','Movimento por sistema')+
    '<label>Sistema<select id="r35-movement-system">'+
      [['ordem-paranormal','Ordem Paranormal'],['d-d','D&D 5e'],['gurps','GURPS']].map(([id,label])=>
       '<option value="'+id+'">'+label+'</option>').join('')+'</select></label>'+
    '<label>Limite padrão (quadrados por turno)<input id="r35-system-speed" type="number" min="0" max="60" value="'+
      (d.movementRules?.['ordem-paranormal']??9)+'"></label>'+
    '<button data-action="movement-system">Salvar limite</button>'+
    '<small>Em diagonal, cada célula conta como um quadrado. Ajustes individuais têm prioridade.</small></div></details>'+
    '<details class="r64-card r64-target" data-r64-group="target" '+(s.groups.target?'open':'')+'><summary>'+r64Icon('target')+'<span>Alvo selecionado</span>'+r64Icon('chevron')+'</summary><section id="r31-details" class="r64-card-body"><h3>Alvo</h3></section></details></aside></div>'+
    '<footer id="r31-status">Mestre: visualiza todos os tokens e ambientes.</footer>';
  if(!map)return;
  const board=$('#r31-board',s.el),assets=new Map((d.assets||[]).map(a=>[a.id,a])),bg=assets.get(map.backgroundAssetId)?.image;
  board.style.setProperty('--tile',s.cell+'px');board.style.backgroundSize=bg?s.cell+'px '+s.cell+'px,'+s.cell+'px '+s.cell+'px,100% 100%':s.cell+'px '+s.cell+'px';
  board.style.width=(map.width*s.cell)+'px';board.style.height=(map.height*s.cell)+'px';
  board.style.backgroundImage=bg?'linear-gradient(#ffffff38 1px,transparent 1px),linear-gradient(90deg,#ffffff38 1px,transparent 1px),url('+bg+')':'';
  board.innerHTML=(root.Mastermind68Map?.renderLayer(map,'terrain',s.cell)||'')+
    (root.Mastermind68Map?.renderLayer(map,'props',s.cell)||'')+
    (root.Mastermind68Map?.renderLayer(map,'walls',s.cell)||'')+(map.rooms||[]).map(r=>'<div class="room '+(r.hidden?'hidden':'')+' r35-fog-'+esc(r.fogStyle||'shadow')+'" style="left:'+(r.x*s.cell)+'px;top:'+(r.y*s.cell)+'px;width:'+(r.w*s.cell)+'px;height:'+(r.h*s.cell)+'px;border-radius:'+(r.shape==='circle'?'50%':'0')+'"></div>').join('')+
   (map.tokens||[]).map(t=>{const a=assets.get(t.assetId);
    return '<div data-token="'+esc(t.id)+'" class="token '+(s.selected===t.id?'active':'')+(t.id===activeId?' r35-turn-token':'')+'" style="left:'+(t.x*s.cell)+'px;top:'+(t.y*s.cell)+'px;width:'+s.cell+'px;height:'+s.cell+'px">'+
    (a?.image?'<img alt="" src="'+a.image+'">':'<span>'+esc(readable(t.name).slice(0,2).toUpperCase()||'TK')+'</span>')+'<small>'+esc(t.name||'Token')+'</small></div>';
   }).join('');
  root.Mastermind69Atmosphere?.attach(board,map,{cell:s.cell,player:false});
  const sceneChanged=s.cameraScene!==map.id;
  s.cameraScene=map.id;
  s.camera?.attach($('#r31-scroll',s.el),board,map.width*s.cell,map.height*s.cell,sceneChanged);
  selection();
 }
 async function refresh(){
  if(active!==s||s.busy||document.hidden)return;s.busy=true;
  try{
   const d=await req('/table');
   if(d.revision!==s.revision){
     const first=s.revision<0,scroll=$('#r31-scroll',s.el);
     // Preserva a digitacao do mestre durante as atualizacoes da sessao.
     const form=$('#r31-formula',s.el)?.value||'1d20',initForm=$('#r32-initiative-formula',s.el)?.value||'1d20';
     const selectedIds=[...s.el.querySelectorAll('[data-player]:checked')].map(el=>el.dataset.player);
     const effectName=$('#r31-effect',s.el)?.value||'';
     const effectStat=$('#r36-effect-stat',s.el)?.value||'',effectAmount=$('#r36-effect-amount',s.el)?.value||'0';
     const effectUnit=$('#r31-duration',s.el)?.value||'scene',effectRemaining=$('#r31-rem',s.el)?.value||'3';
     const movementSystem=$('#r35-movement-system',s.el)?.value||'ordem-paranormal';
     const sideScroll=$('#r31-aside',s.el)?.scrollTop||0;

     const x=0,y=0;
      s.revision=d.revision;s.data=d;render();
     const rollInput=$('#r31-formula',s.el),initInput=$('#r32-initiative-formula',s.el),effectInput=$('#r31-effect',s.el);
     if($('#r31-aside',s.el))$('#r31-aside',s.el).scrollTop=sideScroll;
     if(rollInput)rollInput.value=form;if(initInput)initInput.value=initForm;if(effectInput)effectInput.value=effectName;
     if($('#r36-effect-stat',s.el))$('#r36-effect-stat',s.el).value=effectStat;
     if($('#r36-effect-amount',s.el))$('#r36-effect-amount',s.el).value=effectAmount;
     if($('#r31-duration',s.el))$('#r31-duration',s.el).value=effectUnit;
     if($('#r31-rem',s.el))$('#r31-rem',s.el).value=effectRemaining;
     for(const item of s.el.querySelectorAll('[data-player]'))item.checked=selectedIds.includes(item.dataset.player);
     const selector=$('#r35-movement-system',s.el);
     if(selector){selector.value=movementSystem;const defaults={'ordem-paranormal':9,'d-d':6,'gurps':5};
       $('#r35-system-speed',s.el).value=d.movementRules?.[movementSystem]??defaults[movementSystem]??9;}
     // Pan/zoom sao mantidos no objeto da camera entre sincronizacoes.
   }
  }catch(e){feedback(e.message)}finally{s.busy=false}
 }
 s.el.addEventListener('change',async e=>{
  if(e.target.id==='r35-movement-system'){
    const system=e.target.value,defaults={'ordem-paranormal':9,'d-d':6,'gurps':5};
    const input=$('#r35-system-speed',s.el);
    if(input)input.value=s.data?.movementRules?.[system]??defaults[system]??9;
    return;
  }
  const binder=e.target.closest('[data-r34-token-bind]');
  if(binder){
   binder.disabled=true;
   try{
    await req('/token','POST',{action:'bind',tokenId:binder.dataset.r34TokenBind,playerId:binder.value});
    feedback('Controle do token atualizado; vinculado à ficha do jogador.');
    s.revision=-1;await refresh();
   }catch(error){feedback(error.message);binder.disabled=false}
   return;
  }
  const field=e.target.closest('[data-r34-assign]');
  if(!field)return;
  const playerId=field.dataset.r34Assign,characterId=field.value||null;
  field.disabled=true;
  try{
   await req('/assign','POST',{playerId,characterId});
   feedback(characterId?'Ficha vinculada; token criado ou associado automaticamente.':'Ficha desvinculada.');
   s.revision=-1;await refresh();
  }catch(error){feedback(error.message);field.disabled=false}
 });
 s.el.addEventListener('toggle',e=>{const details=e.target.closest?.('[data-r64-group]');if(details&&s.el.contains(details))s.groups[details.dataset.r64Group]=details.open;},true);
 s.el.addEventListener('click',async e=>{
  const token=e.target.closest('[data-token]');if(token){s.selected=token.dataset.token;selection();s.el.querySelectorAll('[data-token]').forEach(t=>t.classList.toggle('active',t===token));return}
  const hp=e.target.closest('[data-hp]'),att=e.target.closest('[data-attack]'),removeInit=e.target.closest('[data-init-remove]'),button=e.target.closest('[data-action]');
  const decision=e.target.closest('[data-r55-decision]');
  try{
   if(decision){
     const fullTurn=decision.dataset.r55Decision==='full';
     await req('/power-request','POST',{id:decision.dataset.r55Id,
       action:decision.dataset.r55Decision==='reject'?'reject':'approve',fullTurn});
     feedback(fullTurn?'Turno extra autorizado como regra da mesa.':'Solicitação respondida.');
     s.revision=-1;await refresh();return;
   }
   if(removeInit){await req('/initiative','POST',{action:'remove',tokenId:removeInit.dataset.initRemove});s.revision=-1;await refresh();return}
   if(hp){await req('/token','POST',{tokenId:s.selected,action:'health',delta:Number(hp.dataset.hp)});s.revision=-1;await refresh();return}
   if(att){
    const t=s.scene?.tokens.find(t=>t.id===s.selected),a=t?.attacks?.[Number(att.dataset.attack)];
    if(!a)return;
    if(!/^\d{1,2}d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i.test(a.test||'')){feedback('A notação original deste teste requer rolagem manual: '+(a.test||''));return}
    const result=await req('/table-roll','POST',{formula:a.test,label:t.name+': '+a.name,visibility:'public'});
    feedback('Rolagem de '+a.name+': '+result.total+' '+diceList(result));s.revision=-1;await refresh();return;
   }
   if(button){
    const action=button.dataset.action;
    if(action==='close'){close();return}
    if(action==='session-mode'){
      const next=s.data?.sessionMode==='interlude'?'combat':'interlude';
      await req('/session-mode','POST',{mode:next});
      feedback(next==='interlude'?'Interlúdio iniciado. Movimento livre; iniciativa pausada.':'Combate retomado. Iniciativa mantida; deslocamento reiniciado.');
      s.revision=-1;await refresh();return;
    }
    if(action==='movement-system'){
      const systemId=$('#r35-movement-system',s.el).value;
      const squares=Number($('#r35-system-speed',s.el).value);
      if(!Number.isInteger(squares)||squares<0||squares>60){feedback('Use de 0 a 60 quadrados');return}
      await req('/movement','POST',{systemId,squares});
      feedback('Limite de '+squares+' quadrados para '+systemId+' salvo.');
      s.revision=-1;await refresh();return;
    }
    if(action==='token-speed'){
      if(!s.selected){feedback('Selecione um token');return}
      const squares=Number($('#r35-token-speed',s.el)?.value);
      if(!Number.isInteger(squares)||squares<0||squares>60){feedback('Use de 0 a 60 quadrados');return}
      await req('/token','POST',{action:'speed',tokenId:s.selected,squares});
      feedback('Deslocamento do token definido: '+squares+' quadrados.');
      s.revision=-1;await refresh();return;
    }
    if(action==='zoom-in'){s.camera?.zoom(1.2);return}
    if(action==='zoom-out'){s.camera?.zoom(1/1.2);return}
    if(action==='fit'){s.camera?.fit();return}
    if(action==='panel'){s.folded=!s.folded;$('#r31-aside',s.el)?.classList.toggle('folded',s.folded);$('.body',s.el)?.classList.toggle('r64-panel-folded',s.folded);const label=s.folded?'Mostrar painel':'Ocultar painel';button.setAttribute('title',label);button.setAttribute('aria-label',label);return}
    if(action==='edit'){
      if(!root.RPG29_EDITOR){feedback('Editor indisponível');return}
      s.editing=true;s.el.classList.add('editing');
      const onReturn=()=>{s.editing=false;s.el.classList.remove('editing');try{root.RpgSceneDisplay?.setLandscape(true)}catch(_){}s.revision=-1;refresh()};
      s.el.addEventListener('rpg29:closed',onReturn,{once:true});
      try{await root.RPG29_EDITOR.open(s.el,{request:options.request,route:options.route,
        players:s.data?.players||[],characters:s.data?.characters||[]})}
      catch(error){s.el.removeEventListener('rpg29:closed',onReturn);onReturn();throw error}
      return;
    }
    if(action==='turn'){if(s.data?.sessionMode==='interlude'){feedback('Iniciativa pausada no interlúdio.');return}await req('/advance','POST',{kind:'turn'});s.revision=-1;await refresh();return}
    if(action==='scene'){
      if(!confirm('Encerrar a cena? A iniciativa e os efeitos de cena serão encerrados.'))return;
      await req('/advance','POST',{kind:'scene'});
      s.selected='';feedback('Cena encerrada. Iniciativa reiniciada.');s.revision=-1;await refresh();return;
    }
    if(action.startsWith('initiative-')){
      if(action==='initiative-clear'&&!confirm('Limpar toda a ordem de iniciativa?'))return;
      const body={action:action==='initiative-roll'?'roll':action==='initiative-set'?'set':action==='initiative-next'?'next':'reset'};
      if(body.action==='roll'||body.action==='set'){
        if(!s.selected){feedback('Selecione um token no mapa');return}
        body.tokenId=s.selected;
        if(body.action==='roll')body.formula=$('#r32-initiative-formula',s.el).value;
        else{
          const score=prompt('Iniciativa do token selecionado (número inteiro)', '10');
          if(score===null)return;
          body.score=Number(score);
          if(!Number.isInteger(body.score)){feedback('Valor inválido');return}
        }
      }
      const result=await req('/initiative','POST',body);
      feedback('Iniciativa atualizada - rodada '+result.round);
      s.revision=-1;await refresh();return;
    }
    if(action==='roll-public'||action==='roll-private'){
      const formula=$('#r31-formula',s.el).value;
      const result=await req('/table-roll','POST',{formula,label:'Mestre',visibility:action==='roll-private'?'master':'public'});
      if(action==='roll-private'){s.privateResult=result;feedback('Privada: '+result.total+' '+diceList(result)+' (somente o mestre recebeu)');render()}
      else{feedback('Pública: '+result.total+' '+diceList(result));s.revision=-1;await refresh()}return;
    }
    if(action==='effect'){
      const ids=[...s.el.querySelectorAll('[data-player]:checked')].map(x=>x.dataset.player).filter(Boolean);
      const name=$('#r31-effect',s.el).value.trim(),unit=$('#r31-duration',s.el).value,remaining=Number($('#r31-rem',s.el).value);
      const stat=$('#r36-effect-stat',s.el).value,amount=Number($('#r36-effect-amount',s.el).value);
      if(!ids.length||!name){feedback('Selecione personagens e um efeito');return}
      if(stat&&(!Number.isInteger(amount)||amount< -20||amount>20)){feedback('O modificador deve estar entre -20 e 20');return}
      await req('/effects-group','POST',{characterIds:ids,name,unit,remaining,stat,amount:stat?amount:0});
      feedback('Efeito aplicado. O modificador foi registrado na ficha para consulta durante os testes.');
      s.revision=-1;await refresh();return;
    }
   }
   const clicked=e.target.closest('#r31-scroll');
   if(clicked&&s.selected&&s.scene){
    const coords=s.camera?.cellAt(e,s.cell,s.scene.width,s.scene.height);
    if(!coords)return;
    const {x,y}=coords;
    await req('/token','POST',{tokenId:s.selected,action:'move',x,y});s.revision=-1;await refresh();
   }
  }catch(error){feedback(error.message)}
 });
 s.timer=setInterval(refresh,1900);refresh();
}
root.RPG31_MASTER={open,close};
})(window);