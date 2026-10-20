/* Mastermind v0.56 — poderes na ficha PRINCIPAL do APK, não apenas na sessão LAN.
 * O personagem da tela Fichas é a fonte de dados (MastermindCharacters / OP13).
 */
(()=>{'use strict';
 const q=(s,r=document)=>r.querySelector(s);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const sheet=q('#screen-sheet'),op=q('#rpg05-sheet-op'),characters=window.MastermindCharacters,engine=window.OP13;
 if(!sheet||!op||!characters||!engine)return;
 const catalog=engine.pack?.poderesParanormais||[];
 const stages=[15,30,45,60,75,90];
 const byClass={Combatente:['Golpe Pesado','Combater com Duas Armas','Saque Rápido','Armamento Pesado','Proteção Pesada'],
  Especialista:['Mochila de Utilidades','Conhecimento Aplicado','Ninja Urbano','Perito em Explosivos'],
  Ocultista:['Ritual Potente','Camuflar Ocultismo','Identificação Paranormal']};
 let type='transcend',element='all',selected='',status='';
 const root=document.createElement('section');
 root.id='v56-powers';
 root.className='v56-powers';
 root.setAttribute('aria-label','Poderes de classe, paranormais e Transcender');
 op.parentNode.insertBefore(root,op);
 const current=()=>characters.selected()?.character||engine.state;
 const currentId=()=>characters.selectedId();
 const choices=c=>Array.isArray(c.powerChoices)?c.powerChoices:[];
 function counts(c){let n=0;for(const p of choices(c))if(p.type==='transcend'&&p.element==='Morte')n++;return {Morte:n}}
 function allowed(c,p){
  if(p.nome==='Surto Temporal'&&counts(c).Morte<2)return 'Requer dois poderes de Morte anteriores';
  return '';
 }
 function options(c){
  const names=new Set((c.powers||[]).map(p=>typeof p==='string'?p:p.name));
  const all=type==='transcend'?catalog.filter(p=>element==='all'||p.elemento===element):
    (byClass[c.class]||[]).map(nome=>({nome,elemento:'Classe',paginaLivro:null}));
  return all.map(p=>{
    const locked=allowed(c,p),known=names.has(p.nome),active=selected===p.nome;
    return '<button type="button" class="v56-power-option'+(active?' selected':'')+
      '" data-v56-power="'+esc(p.nome)+'" '+(known||locked?'disabled':'')+'>'+
      '<strong>'+esc(p.nome)+'</strong><small>'+esc(p.elemento||'Classe')+
      (p.paginaLivro?' · Livro p. '+Number(p.paginaLivro):'')+'</small>'+
      (locked?'<em>'+esc(locked)+'</em>':known?'<em>Aprendido</em>':'')+'</button>';
  }).join('')||'<p>Nenhum poder disponível neste filtro.</p>';
 }
 function render(){
  const c=current(),nex=Number(c.nex)||5,used=choices(c).filter(p=>p.type==='class'||p.type==='transcend').length,
   total=stages.filter(x=>nex>=x).length,known=c.powers||[];
  if(!['Combatente','Especialista','Ocultista'].includes(c.class)){root.hidden=true;return}
  root.hidden=false;
  root.innerHTML='<header><div><small>ORDEM PARANORMAL · FICHA ATIVA</small>'+
    '<h2>✧ Poderes e Transcender</h2><p>Escolhas do personagem '+esc(c.name||'')+' · NEX '+nex+'%</p></div>'+
    '<span class="v56-count">'+Math.max(0,total-used)+' / '+total+' escolhas</span></header>'+
    '<p class="v56-help">Agora esta seção fica diretamente na ficha principal do Mastermind. O Transcender encaminha para os poderes paranormais. Escolhas são salvas exclusivamente neste personagem.</p>'+
    '<nav class="v56-tabs" aria-label="Tipo de poder"><button data-v56-type="class" aria-pressed="'+(type==='class')+'">Poderes de classe</button>'+
     '<button data-v56-type="transcend" aria-pressed="'+(type==='transcend')+'">✦ Transcender → Paranormais</button></nav>'+
    (type==='transcend'?'<label>Elemento <select id="v56-element"><option value="all">Todos os elementos</option>'+
     ['Sangue','Morte','Energia','Conhecimento','Medo'].map(x=>'<option value="'+x+'"'+(element===x?' selected':'')+'>'+x+'</option>').join('')+'</select></label>':'')+
    '<div class="v56-list">'+options(c)+'</div>'+
    '<div class="v56-bottom"><p>'+(selected?'Selecionado: <strong>'+esc(selected)+'</strong>':
     'Escolha um poder disponível para aprender.')+'</p>'+
     '<button type="button" id="v56-learn" '+(!selected||used>=total?'disabled':'')+'>Aprender '+(type==='transcend'?'poder paranormal (Transcender)':'poder de classe')+'</button></div>'+
    '<div class="v56-known"><strong>Já aprendidos ('+known.length+')</strong>'+
     (known.length?'<p>'+known.map(esc).join(' · ')+'</p>':'<p>Nenhum poder adquirido nesta ficha.</p>')+
     '<small>NEX de escolha: '+(choices(c).length?choices(c).map(p=>esc(p.name)+' — '+p.nex+'%').join(' · '):'sem registros anteriores')+'</small></div>'+
    '<p class="v56-status" role="status">'+esc(status)+'</p>';
 }
 function learn(){
  const c=current(),nex=Number(c.nex)||5,valid=type==='transcend'?catalog.find(p=>p.nome===selected):
    (byClass[c.class]||[]).includes(selected)?{nome:selected,elemento:'Classe'}:null;
  if(!valid)return status='Selecione um poder do catálogo.',render();
  const used=choices(c),next=stages[used.length];
  if(next===undefined||nex<next)return status='Sem escolha disponível neste NEX.',render();
  if((c.powers||[]).some(p=>(typeof p==='string'?p:p?.name)===selected))
   return status='Este poder já foi aprendido.',render();
  if(type==='transcend'&&allowed(c,valid))return status=allowed(c,valid),render();
  // Offline sheet choice is local. GM approval in online sessions uses the authenticated server.
  const powerChoices=[...used,{type,name:selected,nex:next,
    element:type==='transcend'?valid.elemento:'Classe',needsSanReview:type==='transcend'}];
  const powers=[...(c.powers||[]),selected];
  if(!characters.update(currentId(),{powerChoices,powers})){
   status='Falha ao salvar a escolha. Seus dados anteriores foram mantidos.';return render();
  }
  status=type==='transcend'?'Poder aprendido na ficha. Confira com o mestre a SAN que não é recebida ao Transcender.':
    'Poder de classe registrado na ficha.';
  selected='';render();
 }
 root.addEventListener('click',e=>{
  const tab=e.target.closest('[data-v56-type]');
  if(tab){type=tab.dataset.v56Type;selected='';status='';render();return}
  const pick=e.target.closest('[data-v56-power]');
  if(pick){selected=pick.dataset.v56Power;status='';render();return}
  if(e.target.closest('#v56-learn'))learn();
 });
 root.addEventListener('change',e=>{
  if(e.target.id==='v56-element'){element=e.target.value;selected='';render()}
 });
 document.addEventListener('rpg:character-selected',()=>{selected='';status='';render()});
 q('#rpg05-char-select')?.addEventListener('change',()=>setTimeout(render,0));
 q('#op-view-ficha')?.addEventListener('change',()=>setTimeout(render,0));
 // Public so the native sheet router can focus the true real panel.
 window.MastermindVisiblePowers={render,open:()=>{
  window.RPG_DEMO?.navigate?.('sheet');render();root.scrollIntoView({behavior:'auto',block:'start'});
 },get element(){return root}};
 render();
})();
