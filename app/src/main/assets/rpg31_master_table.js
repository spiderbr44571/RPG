/* RPG Mesa 0.31 - Master tabletop. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(q,el=document)=>el.querySelector(q);
const link=document.createElement('link');link.rel='stylesheet';link.href=location.protocol==='file:'?'rpg31_live.css':'/table-master.css';document.head.append(link);
let active=null;
function close(){
 const s=active;if(!s)return;active=null;clearInterval(s.timer);s.el.remove();
 document.body.style.overflow=s.oldOverflow;
 try{root.RpgSceneDisplay?.setLandscape(false)}catch(_){}
}
function open(host,options){
 if(active)close();
 const s={el:document.createElement('div'),oldOverflow:document.body.style.overflow,
   options,revision:-1,data:null,scene:null,selected:'',cell:48,timer:0,busy:false,folded:false,privateResult:null};
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
  }
  html+='<small>Toque no mapa para reposicionar o token selecionado.</small>';
  el.innerHTML=html;
 }
 function render(){
  const d=s.data;if(!d)return;const map=(d.scenarios||[]).find(c=>c.id===d.activeScenarioId);
  s.scene=map;
  s.el.innerHTML='<header><strong>✧ MESTRE</strong><h2>'+esc(map?.name||'Sem cenário publicado')+'</h2>'+
    '<small>Rodada '+(d.turn||1)+'</small><button data-action="panel">☷</button>'+
    '<button data-action="edit">✎ Editar</button><button data-action="turn">+ Rodada</button><button data-action="close">✕</button></header>'+
    '<div class="body"><div id="r31-scroll" class="scroll"><div id="r31-board" class="board"></div></div>'+
    '<aside id="r31-aside" class="'+(s.folded?'folded':'')+'"><section><h3>⚄ Rolagens</h3>'+
      '<input id="r31-formula" value="1d20" placeholder="1d20+5" aria-label="Notação do dado">'+
      '<div class="actions"><button data-action="roll-public" class="primary">Todos veem</button><button data-action="roll-private">Só mestre</button></div>'+
      (s.privateResult?'<div class="info">Privada: '+esc(s.privateResult.formula)+' = '+s.privateResult.total+'</div>':'')+
      (d.rolls||[]).slice(-4).reverse().map(r=>'<div class="info">'+esc(r.by)+' · '+esc(r.label)+' <b>'+r.total+'</b></div>').join('')+
    '</section><section><h3>👤 Jogadores e efeitos</h3>'+
      (d.players||[]).map(p=>{
        const c=(d.characters||[]).find(c=>c.id===p.characterId);
        return '<label class="info check"><input type="checkbox" data-player="'+esc(p.characterId||'')+'" '+(c?'':'disabled')+'><span>'+esc(c?.sheet?.name||p.nickname)+bars(c)+'</span></label>';
      }).join('')+
      '<input id="r31-effect" placeholder="Nome do efeito" maxlength="80">'+
      '<select id="r31-duration"><option value="scene">Cena</option><option value="turn">Turnos</option><option value="permanent">Permanente</option></select>'+
      '<input id="r31-rem" type="number" min="1" max="999" value="3">'+
      '<button data-action="effect" class="primary">Aplicar nos selecionados</button></section>'+
    '<section id="r31-details"><h3>Alvo</h3></section></aside></div>'+
    '<footer id="r31-status">Mestre: visualiza todos os tokens e ambientes.</footer>';
  if(!map)return;
  const board=$('#r31-board',s.el),assets=new Map((d.assets||[]).map(a=>[a.id,a])),bg=assets.get(map.backgroundAssetId)?.image;
  board.style.setProperty('--tile',s.cell+'px');board.style.backgroundSize=bg?s.cell+'px '+s.cell+'px,'+s.cell+'px '+s.cell+'px,100% 100%':s.cell+'px '+s.cell+'px';
  board.style.width=(map.width*s.cell)+'px';board.style.height=(map.height*s.cell)+'px';
  board.style.backgroundImage=bg?'linear-gradient(#ffffff38 1px,transparent 1px),linear-gradient(90deg,#ffffff38 1px,transparent 1px),url('+bg+')':'';
  board.innerHTML=(map.rooms||[]).map(r=>'<div class="room '+(r.hidden?'hidden':'')+'" style="left:'+(r.x*s.cell)+'px;top:'+(r.y*s.cell)+'px;width:'+(r.w*s.cell)+'px;height:'+(r.h*s.cell)+'px;border-radius:'+(r.shape==='circle'?'50%':'0')+'"></div>').join('')+
   (map.tokens||[]).map(t=>{const a=assets.get(t.assetId);
    return '<div data-token="'+esc(t.id)+'" class="token '+(s.selected===t.id?'active':'')+'" style="left:'+(t.x*s.cell)+'px;top:'+(t.y*s.cell)+'px;width:'+s.cell+'px;height:'+s.cell+'px">'+
    (a?.image?'<img alt="" src="'+a.image+'">':'<span>'+esc(a?.emoji||'✧')+'</span>')+'<small>'+esc(t.name)+'</small></div>';
   }).join('');
  selection();
 }
 async function refresh(){
  if(active!==s||s.busy||document.hidden)return;s.busy=true;
  try{
   const d=await req('/table');
   if(d.revision!==s.revision){
     const first=s.revision<0,scroll=$('#r31-scroll',s.el);
     const x=first?0:scroll?.scrollLeft||0,y=first?0:scroll?.scrollTop||0;
     s.revision=d.revision;s.data=d;render();
     const sc=$('#r31-scroll',s.el);
     if(sc){sc.scrollLeft=first?Math.max(0,(sc.scrollWidth-sc.clientWidth)/2):x;sc.scrollTop=first?Math.max(0,(sc.scrollHeight-sc.clientHeight)/2):y}
   }
  }catch(e){feedback(e.message)}finally{s.busy=false}
 }
 s.el.addEventListener('click',async e=>{
  const token=e.target.closest('[data-token]');if(token){s.selected=token.dataset.token;selection();s.el.querySelectorAll('[data-token]').forEach(t=>t.classList.toggle('active',t===token));return}
  const hp=e.target.closest('[data-hp]'),att=e.target.closest('[data-attack]'),button=e.target.closest('[data-action]');
  try{
   if(hp){await req('/token','POST',{tokenId:s.selected,action:'health',delta:Number(hp.dataset.hp)});s.revision=-1;await refresh();return}
   if(att){
    const t=s.scene?.tokens.find(t=>t.id===s.selected),a=t?.attacks?.[Number(att.dataset.attack)];
    if(!a)return;
    if(!/^\d{1,2}d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i.test(a.test||'')){feedback('A notação original deste teste requer rolagem manual: '+(a.test||''));return}
    const result=await req('/table-roll','POST',{formula:a.test,label:t.name+': '+a.name,visibility:'public'});
    feedback('Rolagem de '+a.name+': '+result.total);s.revision=-1;await refresh();return;
   }
   if(button){
    const action=button.dataset.action;
    if(action==='close'){close();return}
    if(action==='panel'){s.folded=!s.folded;$('#r31-aside',s.el).classList.toggle('folded',s.folded);return}
    if(action==='edit'){close();options.openEditor?.();return}
    if(action==='turn'){await req('/advance','POST',{kind:'turn'});s.revision=-1;await refresh();return}
    if(action==='roll-public'||action==='roll-private'){
      const formula=$('#r31-formula',s.el).value;
      const result=await req('/table-roll','POST',{formula,label:'Mestre',visibility:action==='roll-private'?'master':'public'});
      if(action==='roll-private'){s.privateResult=result;feedback('Privada: '+result.total+' (somente o mestre recebeu)')}
      else{feedback('Pública: '+result.total);s.revision=-1;await refresh()}return;
    }
    if(action==='effect'){
      const ids=[...s.el.querySelectorAll('[data-player]:checked')].map(x=>x.dataset.player).filter(Boolean);
      const name=$('#r31-effect',s.el).value.trim(),unit=$('#r31-duration',s.el).value,remaining=Number($('#r31-rem',s.el).value);
      if(!ids.length||!name){feedback('Selecione personagens e um efeito');return}
      await req('/effects-group','POST',{characterIds:ids,name,unit,remaining});feedback('Efeito aplicado');s.revision=-1;await refresh();return;
    }
   }
   const clicked=e.target.closest('#r31-board');
   if(clicked&&s.selected&&s.scene){
    const b=clicked.getBoundingClientRect(),x=Math.floor((e.clientX-b.left)/s.cell),y=Math.floor((e.clientY-b.top)/s.cell);
    if(x<0||y<0||x>=s.scene.width||y>=s.scene.height)return;
    await req('/token','POST',{tokenId:s.selected,action:'move',x,y});s.revision=-1;await refresh();
   }
  }catch(error){feedback(error.message)}
 });
 s.timer=setInterval(refresh,1900);refresh();
}
root.RPG31_MASTER={open,close};
})(window);