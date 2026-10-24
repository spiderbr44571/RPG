/* RPG Mesa 0.31: interface do jogador. A API aplica visibilidade e posse do token. */
(function(root){
'use strict';
const $=x=>document.querySelector(x);
const readable=x=>String(x??'').replace(/cen\uFFFD+rio/gi,'cenário')
  .replace(/Her\uFFFD+i/gi,'Herói').replace(/\uFFFD+/g,'').trim();
const esc=x=>readable(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cid=location.pathname.split('/')[2],url='/api/play/'+cid,sceneUrl=url+'/scenario';
let state=null,revision=-1,cell=48,selected='',busy=false,tab='',noticeTimeout,camera=window.RPG33_CAMERA?.create(),cameraScene='';
const msg=t=>{const n=$('#notice');n.hidden=false;n.textContent=t;clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>n.hidden=true,3900)};
async function api(path,method='GET',payload){
 const r=await fetch(path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',body:payload===undefined?undefined:JSON.stringify(payload)});
 const j=await r.json();if(!r.ok)throw Error(j.error||'Falha de conexão');return j;
}
function resourceList(s){
 if(!s)return [];
 if(s.systemId==='d-d'){
   const resources=[{k:'PV',cur:Number(s.hitPointsCurrent??0),max:Number(s.hitPointsMax??1)}];
   for(const [level,slots] of Object.entries(s.spellSlots||{})){
     if(slots&&typeof slots==='object'){
       const mx=Number(slots.max??slots.total??0),cur=Number(slots.current??slots.available??0);
       if(mx>0)resources.push({k:'Magia '+level,cur,max:mx});
     }
   }
   return resources;
 }
 if(s.systemId==='gurps')return [
  {k:'HP',cur:Number(s.currentHP??s.attrs?.ST??0),max:Math.max(1,Number(s.attrs?.ST||1)+Number(s.mod?.hp||0))},
  {k:'FP',cur:Number(s.currentFP??s.attrs?.HT??0),max:Math.max(1,Number(s.attrs?.HT||1)+Number(s.mod?.fp||0))}
 ];
 return Object.entries(s.resources||{}).filter(([,v])=>v&&typeof v==='object'&&Number.isFinite(Number(v.max))).
 map(([k,v])=>({k,cur:Number(v.current)||0,max:Number(v.max)||0}));
}
function portrait(s){return [s?.photo,s?.portrait].find(v=>typeof v==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(v)&&v.length<210000)||''}
function resources(s){
 $('#hero-name').textContent=readable(s?.name)||'Aguardando ficha';
 $('#hero-subtitle').textContent=s?[s.systemId||'Sistema',s.class||s.trilha||''].filter(Boolean).join(' · '):'Aguardando o mestre';
 const image=portrait(s);$('#avatar').innerHTML=image?'<img src="'+image+'" alt="Personagem">':esc((s?.name||'PC').slice(0,2).toUpperCase());
 $('#resources').innerHTML=resourceList(s).slice(0,7).map((r,i)=>{
  const c=({PV:'#dc6c87',PE:'#76a4e5',SAN:'#b696e6',HP:'#dc6c87',FP:'#7bc9b0'}[r.k]||['#dc6c87','#76a4e5','#b696e6'][i%3]);
  const pct=r.max>0?Math.max(0,Math.min(100,(r.cur/r.max)*100)):0;
  return '<div class="meter"><span>'+esc(r.k)+'</span><div class="track"><i style="width:'+pct+'%;--fill:'+c+'"></i></div><strong>'+r.cur+'/'+r.max+'</strong></div>';
 }).join('')||'<small>Recursos não cadastrados</small>';
 const moving=state?.movement?.tokens?.[0];
 if(moving?.unlimited){
   const e=document.createElement('div');e.className='meter r53-unlimited';
   e.innerHTML='<span>MOVE</span><div class="track"><i style="width:100%;--fill:#81d2b0"></i></div><strong>∞</strong>';
   $('#resources').appendChild(e);
 }else if(moving){
   const element=document.createElement('div');
   element.className='meter';
   element.innerHTML='<span>MOVE</span><div class="track"><i style="width:'+
      (moving.limit>0?Math.max(0,Math.min(100,moving.remaining/moving.limit*100)):0)+
      '%;--fill:#81d2b0"></i></div><strong>'+moving.remaining+'/'+moving.limit+'q</strong>';
   $('#resources').appendChild(element);
 }
}
const sections=s=>{
 s=s||{};const groups={};
 if(s.attrs)groups['Atributos']=s.attrs;
 if(s.skills)groups['Perícias']=s.skills;
 if(s.systemId==='ordem-paranormal'||(!s.systemId&&s.class&&s.attrs?.Agilidade!==undefined))groups['Poderes e Transcender']=s.powerChoices||[];
 const abilities=[s.powers,s.rituaisConhecidos,s.abilities,s.spells,s.techniques].filter(x=>x!=null);
 if(abilities.length)groups['Rituais e habilidades']=abilities;
 const items=[s.inventory,s.items,s.weapons].filter(x=>x!=null);
 if(items.length)groups['Inventário']=items;
 if(s.effects)groups['Efeitos']=s.effects;
 if(s.advantages||s.disadvantages)groups['Vantagens']={vantagens:s.advantages,desvantagens:s.disadvantages};
 if(s.notes||s.history||s.description)groups['História']={notes:s.notes,history:s.history,description:s.description};
 if(s.customRolls)groups['Testes']=s.customRolls;
 if(!Object.keys(groups).length)groups['Ficha']=s;
 return groups;
};
function content(v){
 if(v===undefined||v===null)return 'Sem dados cadastrados';
 if(Array.isArray(v))return v.length?v.map((item,i)=>'<div class="entry"><strong>'+esc(item?.name||item?.title||'#'+(i+1))+'</strong><small>'+esc(typeof item==='object'?JSON.stringify(item,null,2):item)+'</small></div>').join(''):'Nenhum';
 if(typeof v==='object')return Object.entries(v).map(([key,value])=>'<div class="entry"><strong>'+esc(key)+'</strong><small>'+esc(typeof value==='object'?JSON.stringify(value,null,2):value)+'</small></div>').join('');
 return esc(v);
}
function sheet(){
 const s=state?.character||{},groups=sections(s),keys=Object.keys(groups);
 if(!keys.includes(tab))tab=keys[0];
 $('#sheet-title').textContent=readable(s.name)||'Ficha pendente';
 $('#sheet-tabs').innerHTML=keys.map(k=>'<button data-tab="'+esc(k)+'" class="'+(k===tab?'active':'')+'">'+esc(k)+'</button>').join('');
 if(tab==='Poderes e Transcender'){root.MastermindPowerUI?.mountLive($('#sheet-data'),s);return;}
 root.MastermindPowerUI?.unmountLive();
 $('#sheet-data').innerHTML=content(groups[tab]);
}
function initiative(){
 const order=state?.initiative?.entries||[];
 if(state?.sessionMode==='interlude'){
   $('#initiative-entries').innerHTML='<p class="r53-interlude-message">Interlúdio ativo: a iniciativa está pausada. Todos podem se mover livremente e realizar testes. A ordem anterior será mantida para quando o mestre voltar ao combate.</p>';
   return;
 }
 $('#initiative-entries').innerHTML=order.length?order.map((part,i)=>
 '<div class="entry '+(part.tokenId===state.initiative.activeId?'initiative-current':'')+'">'+
 '<strong>'+(i+1)+'. '+esc(part.name)+' : '+part.score+'</strong>'+
 (part.faces?.length?'<span class="dicefaces">'+esc(part.formula)+' ['+esc(part.faces.join(', '))+']</span>':'')+
 (part.tokenId===state.initiative.activeId?'<small>Turno atual</small>':'')+'</div>').join(''):
 '<p>Ainda não há iniciativa definida pelo mestre.</p>';
}
function render(){
 const s=state?.scene;resources(state?.character);sheet();initiative();
 const active=state?.initiative?.entries?.find(p=>p.tokenId===state?.initiative?.activeId);
 $('#scene-turn').textContent=state?.sessionMode==='interlude'?'✦ INTERLÚDIO':active?'Vez: '+active.name+' · Rodada '+(state.initiative.round||1):'Sem iniciativa';
 document.body.dataset.sessionMode=state?.sessionMode||'combat';
 if(!s){$('#empty').hidden=false;$('#board').innerHTML='';
   root.dispatchEvent(new CustomEvent('mastermind:player-live-render',{detail:{sceneId:''}}));return}
 $('#empty').hidden=true;$('#scene-title').textContent=readable(s.name)||'Cenário';
 const board=$('#board'),assets=new Map((state.assets||[]).map(a=>[a.id,a]));
 const bg=assets.get(s.backgroundAssetId)?.image;
 board.style.setProperty('--cell',cell+'px');board.style.width=(s.width*cell)+'px';board.style.height=(s.height*cell)+'px';
 board.dataset.theme=s.theme;board.style.backgroundImage=bg?'linear-gradient(#ffffff34 1px,transparent 1px),linear-gradient(90deg,#ffffff34 1px,transparent 1px),url('+bg+')':'';
 board.style.backgroundSize=bg?cell+'px '+cell+'px,'+cell+'px '+cell+'px,100% 100%':'';
 let h=(root.Mastermind68Map?.renderLayer(s,'terrain',cell)||'')+
  (root.Mastermind68Map?.renderLayer(s,'props',cell)||'')+
  (root.Mastermind68Map?.renderLayer(s,'walls',cell)||'')+s.tokens.map(t=>{const a=assets.get(t.assetId);
  return '<div data-id="'+esc(t.id)+'" data-movable="'+Boolean(t.movable)+'" class="token '+(t.movable?'own':'')+
    (t.id===state.initiative?.activeId?' r35-turn-token':'')+'" style="left:'+(t.x*cell+1)+'px;top:'+(t.y*cell+1)+'px;width:'+(cell-2)+'px;height:'+(cell-2)+'px">'+
   (a?.image?'<img src="'+a.image+'" alt="">':'<span>'+esc((t.name||'TK').slice(0,2).toUpperCase())+'</span>')+
   '<small>'+esc(t.name)+(t.kind==='creature'&&t.maxHp?' · '+t.hp+'/'+t.maxHp+' PV':'')+'</small></div>';
 }).join('');
 h+=(s.fog||[]).map(f=>'<div class="fog r35-fog-'+esc(f.fogStyle||'shadow')+'" style="left:'+(f.x*cell)+'px;top:'+(f.y*cell)+'px;width:'+(f.w*cell)+'px;height:'+(f.h*cell)+'px;border-radius:'+(f.shape==='circle'?'50%':'0')+'"></div>').join('');
 board.innerHTML=h;
 root.Mastermind69Atmosphere?.attach(board,s,{cell,player:true});
 const sceneChanged=cameraScene!==s.id;cameraScene=s.id;
 camera?.attach($('#scroll'),board,s.width*cell,s.height*cell,sceneChanged);
 if(!s.tokens.some(t=>t.id===selected&&t.movable))selected=s.tokens.find(t=>t.movable)?.id||'';
 $('#feed').innerHTML=(state.rolls||[]).slice(-3).reverse().map(r=>
  '<div class="roll"><strong>'+esc(r.by)+'</strong> - '+esc(r.label)+'<div><b>'+r.total+'</b><small class="dicefaces">'+
 esc(r.formula)+' : ['+esc((r.faces||[]).join(', '))+']'+(r.mode==='highest'?' (maior d20)':'')+'</small></div></div>').join('');
 root.dispatchEvent(new CustomEvent('mastermind:player-live-render',{detail:{sceneId:s.id}}));
}
async function refresh(){
 if(busy||document.hidden)return;busy=true;
 try{
  const next=await api(sceneUrl);
  if(next.revision!==revision){state=next;revision=next.revision;render()}
 }catch(e){msg(e.message)}finally{busy=false}
}
function center(){camera?.fit()}
async function dice(){
 try{const formula=$('#formula').value.trim();
  const mode=$('#dice-mode').value;
  const result=await api(url+'/table-roll','POST',{formula,label:'Rolagem de '+(state?.character?.name||'jogador'),...(mode==='sum'?{mode:'sum'}:{})});
  $('#roll-answer').textContent='Dados: ['+result.faces.join(', ')+'] - '+(result.mode==='highest'?'maior dado':'soma')+' = '+result.total;
  revision=-1;await refresh();
 }catch(e){$('#roll-answer').textContent=e.message}
}
function mount(){
 $('#legacy-sheet').href='/play/'+cid;
 $('#scroll').addEventListener('click',async e=>{
  const target=e.target.closest('[data-id]');
  if(target){if(target.dataset.movable==='true'){selected=target.dataset.id;msg('Seu token selecionado. Toque no destino.')}return}
  const s=state?.scene;if(!s||!selected)return;
  const activeId=state?.initiative?.activeId;
  if(state?.sessionMode!=='interlude'&&(state?.initiative?.entries?.length||0)>0&&selected!==activeId){
    msg('Aguarde seu turno para movimentar o personagem.');return;
  }
  const moving=state?.movement?.tokens?.find(item=>item.tokenId===selected);
  if(state?.sessionMode!=='interlude'&&moving&&moving.remaining<=0){msg('Você já utilizou todo o movimento deste turno.');return;}
  const point=camera?.cellAt(e,cell,s.width,s.height);
  if(!point)return;const {x,y}=point;
  try{await api(sceneUrl+'/move','POST',{tokenId:selected,x,y});revision=-1;await refresh()}catch(err){msg(err.message)}
 });
 $('#zoom-in').onclick=()=>camera?.zoom(1.2);
 $('#zoom-out').onclick=()=>camera?.zoom(1/1.2);
 $('#zoom-fit').onclick=center;
 for(const [button,modal] of [['#hud-sheet','#sheet-modal'],['#open-sheet','#sheet-modal'],['#hud-dice','#dice-modal'],['#open-dice','#dice-modal']]){
  $(button).onclick=()=>{$(modal).classList.add('open');if(modal==='#sheet-modal')sheet()};
 }
 $('#close-sheet').onclick=()=>$('#sheet-modal').classList.remove('open');
 $('#close-dice').onclick=()=>$('#dice-modal').classList.remove('open');
 $('#open-initiative').onclick=()=>{$('#initiative-modal').classList.add('open');initiative()};
 $('#close-initiative').onclick=()=>$('#initiative-modal').classList.remove('open');
 $('#sheet-tabs').onclick=e=>{const el=e.target.closest('[data-tab]');if(el){tab=el.dataset.tab;sheet()}};
 document.querySelectorAll('[data-quick]').forEach(el=>el.onclick=()=>$('#formula').value=el.dataset.quick);
 $('#do-roll').onclick=dice;
 $('#landscape').onclick=async()=>{try{await screen.orientation.lock('landscape');msg('Paisagem ativada')}catch{msg('Ative rotação automática para usar a mesa em paisagem')}};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal').forEach(m=>m.classList.remove('open'))});
 setInterval(refresh,1800);refresh();
}
root.RPG31_PLAYER={mount,refresh,get state(){return state},get selectedTokenId(){return selected},
 get sceneId(){return state?.scene?.id||''},notify:msg};

})(window);