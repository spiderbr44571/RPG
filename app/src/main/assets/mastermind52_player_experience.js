/* Mastermind v0.52 — experiência de jogador: mapa, medição e caderno sincronizado. */
(function(root){
'use strict';
const $=x=>document.querySelector(x);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=location.pathname.split('/')[2],url='/api/play/'+id;
const mm=root.MastermindRange;
const player=root.RPG31_PLAYER;
if(!mm||!player)return;
const state=()=>player.state;
let mode='move',origin='',destination=null,focus='',notes=[],journalLoaded=false,journalSaving=false,journalPending=false,saveTimer=null,preview=null,search='',selectedNote='',lastScene='';
const journalCache='mastermind52-journal-'+id;
const limit=(n,a,b)=>Math.max(a,Math.min(b,n));
const feedback=t=>{const e=$('#r52-message');if(e){e.textContent=t;e.hidden=false}};
function cache(){try{localStorage.setItem(journalCache,JSON.stringify(notes))}catch{}}
function recover(){try{let s=JSON.parse(localStorage.getItem(journalCache)||'[]');return Array.isArray(s)?s.filter(x=>x&&x.id).slice(0,80):[]}catch{return []}}
async function request(endpoint,method='GET',body){
 const r=await fetch(url+'/'+endpoint,{method,credentials:'same-origin',
  headers:{'Content-Type':'application/json'},cache:'no-store',body:body?JSON.stringify(body):undefined});
 const j=await r.json();if(!r.ok)throw Error(j.error||'Falha de sincronização');return j;
}
function scene(){return state()?.scene}
function ownToken(){return (scene()?.tokens||[]).find(t=>t.id===origin&&t.movable)||
 (scene()?.tokens||[]).find(t=>t.movable)||null}
function token(id){return (scene()?.tokens||[]).find(t=>t.id===id)||null}
function settings(){const s=scene()||{},c=state()?.character||{};
 return mm.rule(s.systemId||c.systemId||'ordem-paranormal',s.gridScale,s.gridUnit)}
function measure(a,b){
 const s=settings();return mm.describe(a,b,s.systemId,s.size,s.unit);
}
function currentRange(){return $('#r52-range')?.value||'none'}
function labelRange(info){
 if(!info)return 'Toque em um alvo visível ou quadrado do mapa.';
 const hit=mm.within(info,currentRange());
 const evalText=hit===null?'':hit?' · Dentro do alcance selecionado':' · Fora do alcance selecionado';
 const approx=info.approximate?' · escala aproximada':'';
 return info.squares+' quadrado(s) · '+info.distance+' '+info.unit+' · '+info.category+evalText+approx;
}
function draw(){
 const map=$('#board'),s=scene();if(!map||!s)return;
 const old=$('#r52-measure-layer');if(old)old.remove();
 const own=ownToken();
 if(!own||!destination||!['measure','inspect'].includes(mode))return;
 const from={x:own.x,y:own.y},to=destination;
 const n=measure(from,to);if(!n)return;
 const dim=48,ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.id='r52-measure-layer';svg.setAttribute('viewBox','0 0 '+(s.width*dim)+' '+(s.height*dim));
 svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:9;pointer-events:none';
 const line=document.createElementNS(ns,'line');
 line.setAttribute('x1',(from.x+.5)*dim);line.setAttribute('y1',(from.y+.5)*dim);
 line.setAttribute('x2',(to.x+.5)*dim);line.setAttribute('y2',(to.y+.5)*dim);
 line.setAttribute('stroke','#7fe0c6');line.setAttribute('stroke-width','3');
 line.setAttribute('stroke-dasharray','9 5');
 const ring=document.createElementNS(ns,'circle');
 ring.setAttribute('cx',(to.x+.5)*dim);ring.setAttribute('cy',(to.y+.5)*dim);
 ring.setAttribute('r','18');ring.setAttribute('fill','#7fe0c633');ring.setAttribute('stroke','#bdfbea');
 svg.append(line,ring);map.append(svg);
 const status=$('#r52-distance');
 if(status)status.textContent=labelRange(n);
}
function clearMeasure(){destination=null;draw();const e=$('#r52-distance');if(e)e.textContent='Toque em um alvo visível ou quadrado do mapa.'}
function ownTurn(){
 const s=state(),active=s?.initiative?.activeId,assigned=(s?.scene?.tokens||[]).find(t=>t.movable);
 const ours=active&&assigned&&active===assigned.id;
 const label=$('#r52-turn');
 if(label)label.textContent=(s?.initiative?.entries?.length||0)===0?'Exploração livre':
  ours?'★ Seu turno · você pode se mover':'Aguarde sua vez na iniciativa';
 label?.classList.toggle('active',!!ours);
}
function setMode(next){
 mode=next;document.querySelectorAll('[data-r52-mode]').forEach(b=>{
  const on=b.dataset.r52Mode===next;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))
 });
 const info=$('#r52-instruction');
 if(info)info.textContent={
  move:'Mover: toque em seu personagem e depois no destino permitido.',
  measure:'Medir: toque num alvo visível ou num quadrado. Não move seu personagem.',
  pin:'Marcar: toque no mapa para registrar uma pista pessoal.',
  inspect:'Inspecionar: toque nos tokens visíveis para consultar nome e distância.'
 }[next]||'';
 if(next==='move'||next==='pin')clearMeasure();
}
async function loadJournal(){
 if(journalLoaded)return;
 try{
  const data=await request('journal');
  if(journalPending){journalLoaded=true;return}
  notes=Array.isArray(data.notes)?data.notes:[];journalLoaded=true;cache();
  renderNotes();renderPins();
 }catch(e){notes=recover();journalLoaded=true;feedback('Caderno local carregado. Sincronização pendente.');renderNotes()}
}
async function sendJournal(){
 if(journalSaving){journalPending=true;return}
 journalSaving=true;journalPending=false;
 const snapshot=JSON.stringify(notes);
 const badge=$('#r52-save');
 if(badge)badge.textContent='Salvando...';
 try{
  await request('journal','POST',{notes:JSON.parse(snapshot)});
  if(badge)badge.textContent='✓ Salvo na campanha';
 }catch(e){
  if(badge)badge.textContent='Não sincronizado · tentar novamente';
  feedback('Suas notas estão neste dispositivo. '+e.message);
 }finally{
  journalSaving=false;
  if(journalPending||JSON.stringify(notes)!==snapshot)scheduleSave();
 }
}
function scheduleSave(){
 cache();journalPending=true;const label=$('#r52-save');if(label)label.textContent='Alterações pendentes';
 clearTimeout(saveTimer);saveTimer=setTimeout(sendJournal,850);
}
function makeNote(opts={}){
 if(notes.length>=80)return feedback('Limite de 80 notas pessoais. Exporte ou remova algumas.');
 const n={id:'n'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
  title:'Nova anotação',body:'',updated:Date.now(),
  sceneId:opts.sceneId||scene()?.id||''};
 if(Number.isInteger(opts.x)&&Number.isInteger(opts.y)){n.x=opts.x;n.y=opts.y}
 notes.unshift(n);selectedNote=n.id;scheduleSave();renderNotes();renderPins();
 $('#r52-journal').classList.add('open');
 const input=$('#r52-note-title');input?.focus();input?.select();
}
function renderPins(){
 const board=$('#board'),s=scene();if(!board||!s)return;
 board.querySelector('#r52-pin-layer')?.remove();
 const layer=document.createElement('div');layer.id='r52-pin-layer';
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:8';
 for(const n of notes.filter(x=>x.sceneId===s.id&&Number.isInteger(x.x)&&Number.isInteger(x.y))){
  if((s.fog||[]).some(f=>n.x>=f.x&&n.x<f.x+f.w&&n.y>=f.y&&n.y<f.y+f.h))continue;
  const pin=document.createElement('button');pin.type='button';pin.className='r52-pin';
  pin.dataset.r52Pin=n.id;pin.title=n.title;pin.textContent='✦';
  pin.style.left=(n.x*48+30)+'px';pin.style.top=(n.y*48+2)+'px';
  pin.style.pointerEvents='auto';layer.append(pin);
 }
 board.append(layer);
}
function noteMatches(n){return (!search||[n.title,n.body].join(' ').toLowerCase().includes(search.toLowerCase()))}
function renderNotes(){
 const list=$('#r52-note-list');if(!list)return;
 list.innerHTML=notes.filter(noteMatches).map(n=>
  '<button type="button" data-r52-note="'+esc(n.id)+'" class="'+(selectedNote===n.id?'active':'')+'">'+
  '<strong>'+esc(n.title||'Nova anotação')+'</strong><small>'+esc(n.sceneId===scene()?.id?'Nesta cena':n.sceneId?'Outra cena':'Geral')+
  (Number.isInteger(n.x)?' · 📍'+n.x+','+n.y:'')+'</small></button>').join('')||
  '<p>Nenhuma anotação. Crie uma pista, NPC, objetivo ou diário de sessão.</p>';
 const edit=$('#r52-note-editor'),n=notes.find(n=>n.id===selectedNote);
 edit.hidden=!n;
 if(n){
  $('#r52-note-title').value=n.title||'';
  $('#r52-note-body').value=n.body||'';
  $('#r52-note-position').textContent=Number.isInteger(n.x)?
   'Marcada no mapa · posição '+n.x+','+n.y:'Nota vinculada à cena, sem posição.';
 }
}
function renderSystemRange(){
 const s=settings(),sel=$('#r52-range');if(!sel)return;
 const prev=sel.value;
 const choices=s.systemId==='ordem-paranormal'?
  [['none','Somente medir'],['melee','Corpo a corpo'],['short','Curto (9m)'],['medium','Médio (18m)'],
   ['long','Longo (36m)'],['extreme','Extremo (90m)'],['infinite','Ilimitado*']]:
   s.systemId==='d-d'?[['none','Distância em pés'],['melee','Adjacente (5 pés)']]:
   [['none','Distância estimada']];
 sel.innerHTML=choices.map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('');
 if(choices.some(o=>o[0]===prev))sel.value=prev;
 const k=$('#r52-system');if(k)k.textContent=s.system+' · '+s.size+' '+s.unit+'/quadrado';
 const caution=$('#r52-caution');if(caution)caution.textContent=s.systemId==='ordem-paranormal'?
  '*Alcance ilimitado só vale para efeitos que explicitamente o permitem. Distância não verifica cobertura, linha de visão ou condições.':
  'Estimativa baseada no grid do mestre. Confira os limites de cada ação e obstáculos com o mestre.';
}
function liveRefresh(){
 const s=scene();
 if(s?.id!==lastScene){destination=null;lastScene=s?.id||'';renderSystemRange();renderNotes()}
 ownTurn();
 if(s&&s.tokens?.length){
  const own=s.tokens.find(t=>t.movable);if(own)origin=own.id;
 }
 draw();renderPins();
 if($('#r52-notes-count'))$('#r52-notes-count').textContent=notes.length+' nota(s)';
 if($('#r52-sheet').classList.contains('open'))sheetEnhance();
}
function flattened(v){
 if(Array.isArray(v))return v.map((x,i)=>({key:x?.name||x?.nome||String(i+1),
  value:typeof x==='object'?JSON.stringify(x):String(x)}));
 return Object.entries(v||{}).map(([key,val])=>({key,value:typeof val==='object'?JSON.stringify(val):String(val)}));
}
const skillsOrder={'Acrobacia':'Agilidade','Adestramento':'Presença','Artes':'Presença','Atletismo':'Força',
'Atualidades':'Intelecto','Ciências':'Intelecto','Crime':'Agilidade','Diplomacia':'Presença',
'Enganação':'Presença','Fortitude':'Vigor','Furtividade':'Agilidade','Iniciativa':'Agilidade',
'Intimidação':'Presença','Intuição':'Presença','Investigação':'Intelecto','Luta':'Força',
'Medicina':'Intelecto','Ocultismo':'Intelecto','Percepção':'Presença','Pilotagem':'Agilidade',
'Pontaria':'Agilidade','Profissão':'Intelecto','Reflexos':'Agilidade','Religião':'Presença',
'Sobrevivência':'Intelecto','Tática':'Intelecto','Tecnologia':'Intelecto','Vontade':'Presença'};
function bonus(n){return n>=0?'+'+n:String(n)}
function profileRoll(sheet,key,kind){
 const system=sheet.systemId||'ordem-paranormal',attrs=sheet.attrs||{};
 if(system==='d-d'){
  if(kind==='attr'){
   const score=Number(attrs[key]);if(!Number.isFinite(score))return null;
   return {formula:'1d20'+bonus(Math.floor((score-10)/2)),mode:'sum',caption:'Modificador de '+key};
  }
  const raw=sheet.skills?.[key],val=Number(typeof raw==='object'?raw?.bonus:raw);
  if(!Number.isFinite(val))return null;
  return {formula:'1d20'+bonus(val),mode:'sum',caption:key};
 }
 if(system==='gurps'){
  const target=Number(attrs[key]);
  return kind==='attr'&&Number.isFinite(target)?{formula:'3d6',mode:'sum',caption:'Teste GURPS: resultado ≤ '+target}:null;
 }
 if(system==='ordem-paranormal'){
  const attr=kind==='skill'?skillsOrder[key]:key;
  if(!attr)return null;
  const rank=Math.floor(Number(attrs[attr]??1));
  const count=rank===0?2:limit(rank,1,12);
  const grade=kind==='skill'?Number(sheet.skills?.[key]||0):0;
  const trained=[0,5,10,15].includes(grade)?grade:grade*5;
  return {formula:count+'d20'+(trained?bonus(trained):''),mode:rank===0?'lowest':'highest',
   caption:rank===0?'Atributo 0 · pegue o menor d20':count+'d20 · pegue o maior'};
 }
 return null;
}
async function rollSheet(key,kind){
 const s=state()?.character;if(!s)return;
 const info=profileRoll(s,key,kind);
 if(!info){feedback('Este teste depende de uma fórmula cadastrada para o sistema. Use a rolagem livre.');return}
 try{
  const response=await request('table-roll','POST',{formula:info.formula,mode:info.mode,label:(kind==='attr'?'Atributo: ':'Perícia: ')+key});
  const result=$('#r52-roll-output');
  if(result)result.textContent=key+' · '+response.total+' ('+info.caption+') · ['+(response.faces||[]).join(', ')+']';
  feedback('Resultado compartilhado com a mesa: '+key+' = '+response.total);
 }catch(e){feedback(e.message)}
}
function sheetEnhance(){
 const s=state()?.character;if(!s)return;
 const active=$('#sheet-tabs .active')?.dataset.tab||'Atributos',data=$('#sheet-data');
 if(!data)return;
 const system=s.systemId||'ordem-paranormal';
 const origin=active==='Atributos'?s.attrs:active==='Perícias'?s.skills:null;
 if(origin){
  const rows=flattened(origin);
  data.innerHTML='<div class="r52-sheet-section"><p>Toque em um teste para rolar na mesa. A alteração de atributos depende do mestre.</p>'+
   (rows.map(({key,value})=>{
    const can=!!profileRoll(s,key,active==='Atributos'?'attr':'skill');
    return '<div class="r52-sheet-row"><div><strong>'+esc(key)+'</strong><small>'+esc(value)+'</small></div>'+
     (can?'<button data-r52-roll="'+esc(key)+'" data-r52-kind="'+(active==='Atributos'?'attr':'skill')+'">🎲 Rolar</button>':'')+
     '</div>';
   }).join('')||'<p>Não há dados de personagem cadastrados.</p>')+'</div>';
 }else if(active==='Inventário'||active==='Rituais e habilidades'||active==='Efeitos'||active==='Vantagens'||active==='Testes'||active==='História'){
  const groups={Inventário:[s.inventory,s.items,s.weapons], 'Rituais e habilidades':[s.powers,s.rituaisConhecidos,s.abilities,s.spells,s.techniques],
   Efeitos:[s.effects],Vantagens:[s.advantages,s.disadvantages],Testes:[s.customRolls],
   História:[s.history,s.description,s.notes]};
  const pool=(groups[active]||[]).flatMap(x=>Array.isArray(x)?x:(x?Object.values(x):[]));
  data.innerHTML='<div class="r52-sheet-section">'+(pool.length?pool.slice(0,150).map((item,i)=>{
   const isObject=item&&typeof item==='object';
   const heading=isObject?(item.name||item.nome||item.label||item.title||('Registro '+(i+1))):('Registro '+(i+1));
   const detail=isObject?Object.entries(item).filter(([k])=>!['name','nome','label','title'].includes(k)).map(([k,v])=>k+': '+(typeof v==='object'?JSON.stringify(v):v)).join(' · '):item;
   return '<div class="r52-detail"><strong>'+esc(heading)+'</strong><p>'+esc(detail)+'</p></div>';
  }).join(''):'<p>Nenhum registro nesta seção da ficha.</p>')+'</div>';
 }
 const res=$('#r52-sheet-resources');
 if(res){
  const value=(state()?.character&&root.RPG31_PLAYER.state?.character)||{};
  const records=[];
  if(system==='d-d')records.push({key:'PV',current:Number(value.hitPointsCurrent??0),max:Number(value.hitPointsMax??0)});
  else if(system==='gurps'){
   records.push({key:'HP',current:Number(value.currentHP??0),max:Number(value.attrs?.ST||0)+Number(value.mod?.hp||0)});
   records.push({key:'FP',current:Number(value.currentFP??0),max:Number(value.attrs?.HT||0)+Number(value.mod?.fp||0)});
  }else for(const key of ['PV','PE','SAN']){
   const x=value.resources?.[key];if(x&&typeof x==='object')records.push({key,current:Number(x.current||0),max:Number(x.max||0)});
  }
  res.innerHTML=records.map(r=>'<div class="r52-resource"><span>'+esc(r.key)+' · '+r.current+'/'+r.max+'</span><div>'+
   '<button data-r52-resource="'+esc(r.key)+'" data-r52-delta="-1" aria-label="Reduzir '+esc(r.key)+'">−</button>'+
   '<button data-r52-resource="'+esc(r.key)+'" data-r52-delta="1" aria-label="Aumentar '+esc(r.key)+'">+</button></div></div>').join('');
 }
}
async function updateResource(key,delta){
 const c=state()?.character;if(!c)return;
 const sys=c.systemId||'ordem-paranormal';
 const max=sys==='d-d'?Number(c.hitPointsMax||0):sys==='gurps'?
  Number(key==='HP'?c.attrs?.ST:c.attrs?.HT)+Number(key==='HP'?c.mod?.hp:c.mod?.fp):
  Number(c.resources?.[key]?.max||0);
 const current=sys==='d-d'?Number(c.hitPointsCurrent??0):sys==='gurps'?
  Number(key==='HP'?c.currentHP:c.currentFP):Number(c.resources?.[key]?.current||0);
 if(!Number.isFinite(max)||!Number.isFinite(current)||max<=0)return feedback('Recurso sem valor máximo válido.');
 const next=limit(current+delta,0,max);
 if(next===current)return;
 try{
  await request('resource','POST',{resource:key,current:next});
  if(sys==='d-d')c.hitPointsCurrent=next;
  else if(sys==='gurps')c[key==='HP'?'currentHP':'currentFP']=next;
  else c.resources[key].current=next;
  sheetEnhance();
  feedback(key+' atualizado para '+next);
  // The server increments revision and the map HUD will receive the next poll.
 }catch(e){feedback(e.message)}
}
function init(){
 const stage=$('.stage'),sheet=$('#sheet-modal');
 if(!stage||!sheet)return;
 const tools=document.createElement('section');tools.id='r52-live-tools';
 tools.innerHTML='<div class="r52-mode-group" role="group" aria-label="Ferramentas de cena">'+
  '<button data-r52-mode="move" class="active" aria-pressed="true">Mover</button>'+
  '<button data-r52-mode="measure" aria-pressed="false">Medir</button>'+
  '<button data-r52-mode="pin" aria-pressed="false">Marcar</button>'+
  '<button data-r52-mode="inspect" aria-pressed="false">Inspecionar</button>'+
  '<button id="r52-open-journal">Caderno <small id="r52-notes-count"></small></button></div>'+
  '<small id="r52-turn">Aguardando campanha</small><small id="r52-instruction">Mover: toque no personagem e depois no destino.</small>'+
  '<div class="r52-range-options"><span id="r52-system">Sistema</span>'+
   '<select id="r52-range" aria-label="Alcance selecionado"><option value="none">Medir</option></select></div>'+
  '<div id="r52-distance" aria-live="polite">Toque em um alvo visível ou quadrado do mapa.</div>'+
  '<small id="r52-caution"></small><div id="r52-message" role="status" hidden></div>';
 stage.append(tools);
 const journal=document.createElement('div');journal.id='r52-journal';journal.className='r52-journal';
 journal.innerHTML='<div class="r52-journal-panel"><header><div><small>CADERNO DE CAMPANHA</small><h2>Minhas pistas</h2></div>'+
  '<button id="r52-close-journal">Fechar</button></header>'+
  '<div class="r52-journal-controls"><button id="r52-new-note">+ Nova anotação</button>'+
  '<button id="r52-export">Copiar anotações</button><small id="r52-save">Aguardando sincronização</small></div>'+
  '<input id="r52-find" placeholder="Buscar pistas, nomes, objetivos..." aria-label="Pesquisar anotações">'+
  '<div class="r52-note-grid"><nav id="r52-note-list" aria-label="Suas anotações"></nav>'+
  '<div id="r52-note-editor" hidden><label>Título<input id="r52-note-title" maxlength="100"></label>'+
  '<label>Conteúdo<textarea id="r52-note-body" maxlength="5000" rows="9" placeholder="O que descobrimos? Quem precisamos encontrar?"></textarea></label>'+
  '<small id="r52-note-position"></small><button id="r52-unpin">Desvincular do mapa</button>'+
  '<button id="r52-remove-note">Excluir nota</button></div></div></div>';
 stage.append(journal);
 const bar=document.createElement('section');bar.id='r52-sheet-resources';
 sheet.querySelector('#sheet-tabs')?.before(bar);
 const rollOutput=document.createElement('p');rollOutput.id='r52-roll-output';rollOutput.setAttribute('role','status');
 sheet.querySelector('#sheet-data')?.after(rollOutput);
 tools.addEventListener('click',e=>{
  const m=e.target.closest('[data-r52-mode]');if(m){setMode(m.dataset.r52Mode);return}
  if(e.target.closest('#r52-open-journal')){journal.classList.add('open');renderNotes();return}
 });
 $('#r52-range').addEventListener('change',draw);
 $('#r52-close-journal').onclick=()=>journal.classList.remove('open');
 $('#r52-new-note').onclick=()=>makeNote();
 $('#r52-find').oninput=e=>{search=e.target.value.slice(0,120);renderNotes()};
 $('#r52-export').onclick=async()=>{
  const output=notes.map(n=>'# '+n.title+'\n'+(n.sceneId?'Cena '+n.sceneId+'\n':'')+n.body).join('\n\n---\n\n');
  try{await navigator.clipboard.writeText(output);feedback('Anotações copiadas.')}
  catch{feedback('Cópia indisponível neste navegador. Consulte suas anotações na tela.')}
 };
 $('#r52-note-list').onclick=e=>{
  const b=e.target.closest('[data-r52-note]');if(!b)return;
  selectedNote=b.dataset.r52Note;renderNotes();
 };
 for(const [selector,key,max] of [['#r52-note-title','title',100],['#r52-note-body','body',5000]]){
  $(selector).addEventListener('input',e=>{
   const n=notes.find(x=>x.id===selectedNote);if(!n)return;
   n[key]=e.target.value.slice(0,max);n.updated=Date.now();
   scheduleSave();
   if(key==='title')$('#r52-note-list [data-r52-note="'+n.id+'"] strong').textContent=n.title||'Nota';
  });
 }
 $('#r52-unpin').onclick=()=>{
  const n=notes.find(x=>x.id===selectedNote);if(!n)return;
  delete n.x;delete n.y;renderNotes();renderPins();scheduleSave();
 };
 $('#r52-remove-note').onclick=()=>{
  if(!selectedNote||!confirm('Excluir esta anotação pessoal?'))return;
  notes=notes.filter(n=>n.id!==selectedNote);selectedNote='';renderNotes();renderPins();scheduleSave();
 };
 sheet.addEventListener('click',e=>{
  const btn=e.target.closest('[data-r52-roll],[data-r52-resource]');
  if(!btn)return;
  if(btn.dataset.r52Roll)rollSheet(btn.dataset.r52Roll,btn.dataset.r52Kind);
  if(btn.dataset.r52Resource)updateResource(btn.dataset.r52Resource,Number(btn.dataset.r52Delta));
 });
 $('#sheet-tabs')?.addEventListener('click',()=>setTimeout(sheetEnhance,0));
 for(const b of ['#hud-sheet','#open-sheet'])$(b)?.addEventListener('click',()=>setTimeout(sheetEnhance,0));
 $('#scroll').addEventListener('click',e=>{
  if(!['measure','pin','inspect'].includes(mode))return;
  if(e.target.closest('[data-r52-pin]')){
   const n=notes.find(x=>x.id===e.target.closest('[data-r52-pin]').dataset.r52Pin);
   if(n){selectedNote=n.id;journal.classList.add('open');renderNotes();}
   e.stopImmediatePropagation();e.preventDefault();return;
  }
  const s=scene();if(!s)return;
  const hit=e.target.closest('[data-id]');
  const camera=root.RPG33_CAMERA;
  // Uses board bounds including the current CSS scale and pan.
  const rect=$('#board').getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return;
  const bx=Math.floor((e.clientX-rect.left)*s.width/rect.width);
  const by=Math.floor((e.clientY-rect.top)*s.height/rect.height);
  if(bx<0||by<0||bx>=s.width||by>=s.height)return;
  e.stopImmediatePropagation();e.preventDefault();
  if(mode==='pin'){makeNote({x:bx,y:by,sceneId:s.id});return}
  const tok=hit?token(hit.dataset.id):null;
  const visible=tok||{x:bx,y:by,name:'Quadrado '+bx+','+by};
  destination={x:visible.x,y:visible.y};
  draw();
  if(mode==='inspect')feedback(tok?'Token visível: '+tok.name+'. '+labelRange(measure(ownToken(),destination)):'Quadrado selecionado: '+bx+','+by);
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){journal.classList.remove('open');if(mode!=='move')setMode('move')}
  if(e.key==='n'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName||'')){
   journal.classList.add('open');makeNote();
  }
 });
 root.addEventListener('mastermind:player-live-render',liveRefresh);
 root.addEventListener('focus',()=>{if(!journalLoaded)loadJournal()});
 loadJournal();setMode('move');liveRefresh();
}
root.MastermindPlayerExperience={init,measure,profileRoll,get notes(){return notes},get mode(){return mode}};
})(window);
