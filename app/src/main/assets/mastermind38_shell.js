/* Mastermind v0.38: entrada única, módulos existentes intactos e personalização preservada. */
(function(){
'use strict';
const qs=(selector,root=document)=>root.querySelector(selector);
const all=(selector,root=document)=>[...root.querySelectorAll(selector)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=id=>'<svg class="icon" aria-hidden="true"><use href="#i-'+id+'"></use></svg>';
const navLinks=[
 ['library','Biblioteca','book','Sistemas, livros e regras indexadas'],
 ['sheet','Personagens','user','Fichas e habilidades do sistema'],
 ['master','Mesa e campanhas','map','Cenários, sessões e ferramentas do mestre'],
 ['ai','Pesquisar regras','search','Respostas e fontes disponíveis offline'],
 ['canvas','Canvas infinito','map','Pistas, mapas e conexões'],
 ['bestiary','Bestiário','scroll','Criaturas e encontros']
];
function getStored(){
 let characters=[],bookMeta={},sel='';
 try{const v=JSON.parse(localStorage.getItem('rpg-v05-characters')||'[]');if(Array.isArray(v))characters=v}catch(_){}
 try{bookMeta=JSON.parse(localStorage.getItem('rpg-v05-book-meta')||'{}')||{}}catch(_){}
 try{sel=localStorage.getItem('rpg-v05-selected-char')||''}catch(_){}
 return {characters,selected:characters.find(c=>c.id===sel)||characters[0]||null,bookMeta};
}
function bindNavigation(){
 const shell=window.RPG_DEMO;
 if(!shell||typeof shell.navigate!=='function')return;
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-mm-nav]');
  if(!button)return;
  const id=button.dataset.mmNav;
  if(!['home','library','sheet','master','ai','canvas','bestiary','settings'].includes(id))return;
  event.preventDefault();shell.navigate(id);
  if(id==='home')refreshDashboard();
 });
}
function renderHome(){
 const home=qs('#screen-home');
 if(!home)return;
 home.replaceChildren();
 const wrap=document.createElement('div');wrap.className='mm-workspace';
 const state=getStored();
 const character=state.selected,hasCharacter=Boolean(character);
 const name=hasCharacter?esc(character.name||character.character?.name||'Personagem'):'Nenhum personagem selecionado';
 const letter=hasCharacter?esc((character.name||character.character?.name||'P').trim().slice(0,1).toUpperCase()):'–';
 const system=hasCharacter?'Ordem Paranormal · ficha local':'Crie sua primeira ficha';
 const bookReady=Boolean(state.bookMeta?.available);
 wrap.innerHTML=
 '<div class="mm-intro">'+
 '<section class="mm-feature"><div><span class="mm-kicker">WORKSPACE / MASTERMIND</span>'+
 '<h1>Suas histórias.<br><i>Uma única mesa.</i></h1>'+
 '<p class="mm-muted">Organize campanhas, consulte regras e controle personagens em um só lugar. Tudo o que você já criou continua disponível.</p></div>'+
 '<div class="mm-buttons"><button class="mm-link primary" data-mm-nav="master">'+icon('map')+'Abrir Mestragem</button>'+
 '<button class="mm-link" data-mm-nav="sheet">'+icon('user')+'Minhas fichas</button></div></section>'+
 '<aside class="mm-status"><div><span class="mm-kicker">CONTINUAR DE ONDE PAROU</span>'+
 '<h2 style="margin-top:11px">Personagem atual</h2></div>'+
 '<div style="display:flex;gap:12px;align-items:center"><div class="mm-avatar" aria-hidden="true">'+letter+'</div>'+
 '<div style="min-width:0"><strong style="display:block;overflow-wrap:anywhere">'+name+'</strong>'+
 '<p class="mm-caption">'+esc(system)+'</p></div></div>'+
 '<div class="mm-buttons"><button class="mm-link" data-mm-nav="sheet">Abrir ficha '+icon('arrow')+'</button></div></aside></div>'+
 '<div class="mm-title-row"><div><span class="mm-kicker">FERRAMENTAS DA MESA</span><h2>Seu espaço de criação</h2></div></div>'+
 '<div class="mm-tools">'+navLinks.map(([id,label,symbol,summary])=>
  '<button type="button" class="mm-tool" data-mm-nav="'+id+'">'+
  '<span class="mm-tool-icon">'+icon(symbol)+'</span><div><strong>'+esc(label)+'</strong><p>'+esc(summary)+'</p></div></button>').join('')+
 '</div><div class="mm-detail" role="status">'+
 (state.characters.length?state.characters.length+' ficha(s) local(is) disponíveis':'Nenhuma ficha cadastrada')+
 ' · '+(bookReady?'PDF pessoal associado à biblioteca':'Biblioteca pronta para receber seus livros')+
 ' · Pesquisa contextual offline disponível. Nenhuma sessão é iniciada sem sua ação.</div>';
 home.appendChild(wrap);
}
function refreshDashboard(){if(qs('#screen-home')?.classList.contains('active'))renderHome()}
function tidyInterface(){
 document.title='Mastermind — seu RPG, suas regras';
 const settings=window.RPG_DEMO?.S;
 const custom=settings?.appName||'';
 const oldDefault=['PROJETO RPG','RPG Mesa','Projeto RPG',''];
 const display=oldDefault.includes(custom)?'Mastermind':custom;
 if(settings&&oldDefault.includes(custom))settings.appName='Mastermind';
 const appNameInput=qs('#app-name-input');
 if(appNameInput&&oldDefault.includes(custom))appNameInput.value='Mastermind';
 const brand=qs('.brand .app-name');if(brand)brand.textContent=display;
 const subtitle=qs('.brand small');if(subtitle)subtitle.textContent='WORKSPACE / MASTERMIND';
 const top=qs('.topbar .preview-pill');top?.remove();
 const breadcrumb=qs('.breadcrumb small');if(breadcrumb)breadcrumb.textContent='Mastermind';
 const status=qs('.sidebar-bottom .connected strong');if(status)status.textContent='Biblioteca e fichas locais';
 const statusDetail=qs('.sidebar-bottom .connected small');if(statusDetail)statusDetail.textContent='Online apenas quando solicitado';
 const themeBanner=qs('#v10-lab');
 const settings=qs('#screen-settings');
 if(themeBanner&&settings){
  const host=document.createElement('div');
  host.className='mm-theme-host';
  host.setAttribute('aria-label','Temas paranormais e customizações existentes');
  const layout=qs('.settings-layout',settings);
  if(layout)settings.insertBefore(host,layout);else settings.appendChild(host);
  host.appendChild(themeBanner);
 }
 const settingName=qs('#screen-settings label[for="app-name-input"]');
 if(settingName)settingName.textContent='Nome exibido no workspace';
 // A ficha antiga de exemplo não é uma ficha real; mantê-la somente como estrutura
 // interna para o motor legado até a migração total, sem ficar acessível na interface.
 const sample=qs('#screen-sheet .sheet-layout');
 if(sample){sample.classList.add('mm-legacy-sample');sample.setAttribute('aria-hidden','true')}
 // O modo de consulta por IA fictícia não pode voltar a substituir a pesquisa real.
 const demoSource=qs('#screen-ai .source-panel');
 if(demoSource)demoSource.classList.add('mm-legacy-sample');
}
function navLabels(){
 for(const button of all('.sidebar .nav-btn')){
  const raw=[...button.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());
  for(const node of raw){
   const span=document.createElement('span');span.className='mm-nav-label';
   span.textContent=node.textContent.trim();node.replaceWith(span);
  }
  button.title=button.textContent.trim();
 }
 const top=qs('.topbar');
 if(top&&!qs('#mm-collapse')){
  const button=document.createElement('button');button.id='mm-collapse';button.type='button';
  button.className='mm-menu';button.title='Recolher ou expandir navegação';
  button.setAttribute('aria-label','Recolher ou expandir o menu');button.setAttribute('aria-expanded','true');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  top.prepend(button);
  button.addEventListener('click',()=>{
   const collapsed=document.documentElement.classList.toggle('mm-collapsed');
   button.setAttribute('aria-expanded',String(!collapsed));
   try{localStorage.setItem('mastermind-nav-collapsed',collapsed?'1':'0')}catch(_){}
  });
  let wasCollapsed=false;
  try{wasCollapsed=localStorage.getItem('mastermind-nav-collapsed')==='1'}catch(_){}
  if(wasCollapsed){document.documentElement.classList.add('mm-collapsed');button.setAttribute('aria-expanded','false')}
 }
}
function mount(){
 tidyInterface();
 navLabels();
 renderHome();
 bindNavigation();
 document.addEventListener('rpg:character-selected',refreshDashboard);
 document.addEventListener('click',event=>{
  if(event.target.closest('.nav-btn[data-screen="home"]'))queueMicrotask(refreshDashboard);
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDashboard()});
 window.addEventListener('pageshow',refreshDashboard);
 window.MastermindShell={refreshDashboard,mountVersion:'0.38.0',getStored};
}
try{mount()}catch(error){console.error('Mastermind shell',error)}
finally{document.documentElement.classList.add('mm-ready')}
})();