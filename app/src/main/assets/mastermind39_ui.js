/* Mastermind v0.39 — interface principal conectada às fichas reais. */
(()=>{'use strict';
const $=(q,r=document)=>r.querySelector(q),$$=(q,r=document)=>[...r.querySelectorAll(q)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const glyph=(name)=>'<svg class="icon" aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
const tools=[
 ['master','Mesa ao Vivo','map','Cenários, encontros e iniciativa','01'],
 ['sheet','Personagens','user','Fichas, rituais e inventário','02'],
 ['atelier85','Ateliê · lyime','user','Pixel Portrait Creator e tokens','07'],
 ['library','Biblioteca','book','Livros e sistemas cadastrados','03'],
 ['ai','Pesquisa offline','search','Encontre regras pelo contexto','04'],
 ['canvas','Canvas infinito','map','Ligações, pistas e notas','05'],
 ['bestiary','Bestiário','scroll','Criaturas e habilidades','06']
];
const controller=()=>window.MastermindCharacters;
const fallback=()=>{
 let chars=[],id='';
 try{const result=JSON.parse(localStorage.getItem('rpg-v05-characters')||'[]');if(Array.isArray(result))chars=result}catch(_){}
 try{id=localStorage.getItem('rpg-v05-selected-char')||''}catch(_){}
 return {list:()=>chars,selectedId:()=>id,selected:()=>chars.find(x=>x.id===id)||null,open:()=>false};
};
function current(){
 const api=controller()||fallback(),characters=api.list(),id=api.selectedId();
 return {api,characters,selected:api.selected()||characters.find(x=>x.id===id)||null};
}
function vals(sheet){
 const res=sheet?.resources||{};
 const max=sheet?.resourcesMax||{};
 const defs=window.OP13?.calc?.()||{};
 const resource=(key,aliases=[])=>{
  const keys=[key,...aliases];
  const v=keys.map(k=>res[k]).find(x=>x!==undefined);
  const val=Number(v?.current??v?.value??v);
  const cap=keys.map(k=>max[k]??defs[k]??res[k+'Max']).find(x=>x!==undefined);
  const mx=Number(v?.max??cap);
  return {value:Number.isFinite(val)?val:null,max:Number.isFinite(mx)?mx:null};
 };
 return [['PV','Vida',resource('PV',['Vida'])],['PE','Esforço',resource('PE',['Energia'])],['SAN','Sanidade',resource('SAN',['Sanidade'])]];
}
function portrait(record){
 const url=record?.character?.photo;
 if(typeof url==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url)&&url.length<1800000)
   return '<img class="mm39-portrait-image" src="'+url+'" alt="Retrato do personagem">';
 return '<span>'+esc((record?.name||record?.character?.name||'?').trim().slice(0,1).toUpperCase())+'</span>';
}
function meter(key,label,data){
 if(data.value===null)return '';
 const width=data.max>0?Math.min(100,Math.max(0,data.value/data.max*100)):0;
 return '<div class="mm39-meter"><div><span>'+label+'</span><strong>'+data.value+(data.max!==null?' / '+data.max:'')+'</strong></div>'+
 '<div class="mm39-meter-track"><i class="mm39-'+key+'" style="width:'+width+'%"></i></div></div>';
}
function sheetCard(record){
 if(!record)return '<div class="mm39-empty">'+glyph('user')+'<h3>Seu próximo personagem começa aqui</h3>'+
 '<p>Crie uma ficha ou selecione um sistema na biblioteca.</p>'+
 '<button class="mm39-button primary" data-mm39="sheet">Criar personagem '+glyph('arrow')+'</button></div>';
 const c=record.character||{},stats=vals(c),level=Number(c.nex);
 return '<div class="mm39-current"><div class="mm39-character-hero"><div class="mm39-portrait">'+portrait(record)+'</div>'+
 '<div><span class="mm39-eyebrow">PERSONAGEM SELECIONADO</span><h3>'+esc(c.name||record.name||'Personagem')+'</h3>'+
 '<div class="mm39-tags"><span>'+esc(c.class||'Personagem')+'</span>'+
 (c.trail?'<span>'+esc(c.trail)+'</span>':'')+
 (Number.isFinite(level)?'<span>NEX '+level+'%</span>':'')+'</div>'+
 '</div></div><div class="mm39-meters">'+stats.map(([key,label,data])=>meter(key,label,data)).join('')+'</div>'+
 '<div class="mm39-actions"><button class="mm39-button primary" data-mm39-character="'+esc(record.id)+'">'+
 glyph('user')+'Abrir esta ficha</button><button class="mm39-button" data-mm39="master">'+glyph('map')+'Mesa</button></div></div>';
}
function characterList(list,selected){
 return list.filter(x=>x&&x.id).map(c=>
 '<button type="button" class="mm39-character-item '+(selected?.id===c.id?'is-selected':'')+'" data-mm39-character="'+esc(c.id)+'">'+
 '<span class="mm39-mini-avatar">'+portrait(c)+'</span><span><strong>'+esc(c.character?.name||c.name||'Personagem')+
 '</strong><small>'+esc(c.character?.class||'Ficha local')+'</small></span>'+
 '<span class="mm39-item-arrow">'+glyph('arrow')+'</span></button>').join('');
}
function renderHome(){
 const home=$('#screen-home');if(!home)return;
 const state=current(),char=state.selected,list=state.characters;
 const content=document.createElement('div');content.className='mm39-home';
 content.innerHTML='<div class="mm39-heading"><div><span class="mm39-eyebrow">MASTERMIND / ÁREA DE TRABALHO</span>'+
 '<h1>Seu universo, <em>sob controle.</em></h1>'+
 '<p>Personagens, mundos e sessões no mesmo espaço. Seus dados e sua personalização continuam aqui.</p></div>'+
 '<button class="mm39-button mm39-settings" data-mm39="settings">'+glyph('settings')+' Personalizar</button></div>'+
 '<div class="mm39-overview"><div class="mm39-welcome"><div class="mm39-orb" aria-hidden="true"><div></div></div>'+
 '<div class="mm39-welcome-content"><span class="mm39-eyebrow">PRÓXIMA SESSÃO</span>'+
 '<h2>O mundo está esperando pelo mestre.</h2>'+
 '<p>Prepare sua cena, consulte as regras ou continue com os personagens da campanha.</p>'+
 '<div class="mm39-actions"><button class="mm39-button primary" data-mm39="master">'+glyph('map')+'Abrir Mestragem</button>'+
 '<button class="mm39-button" data-mm39="ai">'+glyph('search')+'Consultar regras</button></div></div></div>'+
 '<aside class="mm39-sheet-preview"><div class="mm39-panel-heading"><span class="mm39-eyebrow">CONTINUAR DE ONDE PAROU</span>'+
 '<span class="mm39-small-counter">'+list.length+' ficha(s)</span></div>'+sheetCard(char)+'</aside></div>'+
 '<div class="mm39-sections"><section class="mm39-library-tools"><div class="mm39-section-heading"><div><span class="mm39-eyebrow">ACESSO RÁPIDO</span>'+
 '<h2>Ferramentas</h2></div></div><div class="mm39-tool-grid">'+tools.map(([id,name,icon,caption,num])=>
 '<button class="mm39-tool" data-mm39="'+id+'"><span class="mm39-tool-top"><span class="mm39-tool-icon">'+glyph(icon)+'</span>'+
 '<small>'+num+'</small></span><strong>'+name+'</strong><span>'+caption+'</span><i>'+glyph('arrow')+'</i></button>').join('')+'</div></section>'+
 '<section class="mm39-roster"><div class="mm39-section-heading"><div><span class="mm39-eyebrow">SUAS FICHAS</span><h2>Personagens</h2></div>'+
 '<button class="mm39-inline-button" data-mm39="sheet">Gerenciar '+glyph('arrow')+'</button></div>'+
 '<div class="mm39-character-list">'+(list.length?characterList(list,char):
 '<p class="mm39-roster-empty">Nenhuma ficha salva ainda.</p>')+'</div></section></div>'+
 '<div class="mm39-footer"><span class="mm39-live-dot"></span> Pesquisa offline disponível <span>•</span> Dados armazenados no seu dispositivo <span>•</span> Sessões online quando você iniciar</div>';
 home.replaceChildren(content);
}
function openCharacter(id){
 const api=controller();
 if(!api||!api.open(id)){window.RPG_DEMO?.notify?.('Ficha não localizada. Abra Personagens para conferir.');return}
 renderHome();
}
function openScreen(id){
 if(['home','sheet','library','master','ai','canvas','bestiary','settings'].includes(id)){
  window.RPG_DEMO?.navigate?.(id);
  if(id==='home')renderHome();
  closeMore();
 }
}
function closeMore(){document.documentElement.classList.remove('mm39-more-open');$('#mm39-more')?.setAttribute('aria-expanded','false')}
function setupNavigation(){
 const sidebar=$('.sidebar');if(!sidebar)return;
 const nav=sidebar.querySelector('nav[aria-label="Menu principal"]');
 const settings=sidebar.querySelector('nav[aria-label="Configurações"]');
 for(const el of [...sidebar.querySelectorAll('.nav-btn')]){
  let label=el.querySelector('.mm-nav-label')||el.querySelector('.mm39-nav-text');
  if(!label){const text=[...el.childNodes].find(node=>node.nodeType===3&&node.textContent.trim());
    if(text){label=document.createElement('span');label.className='mm-nav-label';text.replaceWith(label)}}
  if(label)label.textContent=({home:'Início',library:'Biblioteca',sheet:'Personagens',ai:'Pesquisar regras',canvas:'Canvas',master:'Mesa ao Vivo',bestiary:'Bestiário',settings:'Configurações'})[el.dataset.screen]||el.textContent.trim();
 }
 sidebar.querySelector('.brand small')?.replaceChildren(document.createTextNode('SUA MESA · SEU MUNDO'));
 const groups=sidebar.querySelectorAll('.nav-label');
 if(groups[0])groups[0].textContent='ESPAÇO DE TRABALHO';
 if(groups[1])groups[1].textContent='PERSONALIZAÇÃO';
 const primary=['home','sheet','master','library','canvas','ai','bestiary'];
 if(nav)for(const id of primary){const el=nav.querySelector('[data-screen="'+id+'"]');if(el)nav.appendChild(el)}
 const oldNav=$('.sidebar .nav-btn[data-screen="op"]');if(oldNav){oldNav.hidden=true;oldNav.tabIndex=-1}
 // Navegação inferior mostra cinco abas sem cortar os rótulos; o resto fica em "Mais".
 if(nav&&!$('#mm39-more')){
  const more=document.createElement('button');more.type='button';more.id='mm39-more';more.className='nav-btn mm39-more-button';
  more.innerHTML=glyph('plus')+'<span class="mm-nav-label">Mais</span>';more.setAttribute('aria-label','Abrir mais ferramentas');more.setAttribute('aria-expanded','false');
  more.addEventListener('click',()=>{const on=document.documentElement.classList.toggle('mm39-more-open');more.setAttribute('aria-expanded',String(on))});
  nav.appendChild(more);
  const drawer=document.createElement('div');drawer.id='mm39-more-drawer';
  drawer.innerHTML='<header><strong>Ferramentas</strong><button type="button" data-mm39-close>Fechar ×</button></header>'+
  [['atelier85','Ateliê 2D','user'],['ai','Pesquisa offline','search'],['bestiary','Bestiário','scroll'],['settings','Configurações','settings']].map(([id,label,icon])=>
   '<button type="button" data-mm39="'+id+'">'+glyph(icon)+' '+label+glyph('arrow')+'</button>').join('');
  document.body.append(drawer);
 }
 // Os listeners existentes continuam associados aos botões reais da navegação.
 if(settings&&settings.parentElement===sidebar)settings.setAttribute('aria-label','Preferências');
}
function refineModules(){
 const titles={atelier85:['Ateliê 2D','Crie retratos e tokens com as peças originais Nonemo.'],sheet:['Personagens','Sua coleção de fichas e histórias.'],library:['Biblioteca','Livros, sistemas e referências sempre à mão.'],
 master:['Mesa ao Vivo','Prepare a campanha e controle os encontros.'],ai:['Consulta offline','Encontre regras pelo contexto e pelas fontes.'],
 bestiary:['Bestiário','Criaturas, monstros e encontros do sistema.'],canvas:['Canvas','Pistas, ideias e conexões em um espaço infinito.']};
 for(const [id,[title,caption]] of Object.entries(titles)){
  const screen=$('#screen-'+id);if(!screen)continue;
  screen.classList.add('mm39-module');
  const row=screen.querySelector(':scope > .page-row');
  if(!row)continue;
  row.classList.add('mm39-old-title');
  let header=screen.querySelector(':scope > .mm39-module-heading');
  if(!header){
    header=document.createElement('div');header.className='mm39-module-heading';
    header.innerHTML='<div><span class="mm39-eyebrow">MASTERMIND / '+esc(title.toUpperCase())+'</span>'+
    '<h1>'+esc(title)+'</h1><p>'+esc(caption)+'</p></div>';
    screen.insertBefore(header,row);
    // Botões funcionais das telas antigas não podem sumir com o cabeçalho duplicado.
    for(const button of [...row.children].filter(node=>node.tagName==='BUTTON'))header.appendChild(button);
  }
 }
 const top=$('.topbar');if(top){
  top.classList.add('mm39-topbar');
  const actions=top.querySelector('.top-actions');
  if(actions&&!$('#mm39-quick')){
    const b=document.createElement('button');b.className='mm39-top-search';b.id='mm39-quick';b.type='button';
    b.innerHTML=glyph('search')+'<span>Consultar regras</span>';
    b.addEventListener('click',()=>openScreen('ai'));actions.prepend(b);
  }
 }
 const brands=$$('.brand .app-name');for(const b of brands){if(b.textContent.trim()==='PROJETO RPG')b.textContent='Mastermind'}
}
function boot(){
 // A personalização original possui listeners já conectados; apenas mover o nó DOM.
 const banner=$('#v10-lab'),settingsScreen=$('#screen-settings');
 if(banner&&settingsScreen){
  const host=document.createElement('section');host.className='mm-theme-host';
  host.setAttribute('aria-label','Temas paranormais existentes');
  const layout=settingsScreen.querySelector('.settings-layout');
  if(layout)settingsScreen.insertBefore(host,layout);else settingsScreen.appendChild(host);
  host.appendChild(banner);
 }
 setupNavigation();refineModules();renderHome();
 document.addEventListener('click',event=>{
  const char=event.target.closest('[data-mm39-character]');
  if(char){event.preventDefault();openCharacter(char.dataset.mm39Character);return}
  const nav=event.target.closest('[data-mm39]');
  if(nav){event.preventDefault();openScreen(nav.dataset.mm39);return}
  if(event.target.closest('[data-mm39-close]'))closeMore();
  if(event.target.closest('.nav-btn[data-screen="home"]'))queueMicrotask(renderHome);
 });
 document.addEventListener('rpg:character-selected',renderHome);
 window.addEventListener('pageshow',renderHome);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('#screen-home')?.classList.contains('active'))renderHome()});
 const legacyDefault=window.RPG_DEMO?.S?.appName;
 if(['PROJETO RPG','Projeto RPG','RPG Mesa',''].includes(legacyDefault))window.RPG_DEMO.S.appName='Mastermind';
 window.MastermindUI={version:'0.39.0',renderHome,openCharacter,current};
}
try{boot()}catch(e){console.error('Mastermind v0.39',e)}
finally{document.documentElement.classList.add('mm-ready')}
})();