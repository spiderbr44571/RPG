/* Mastermind v0.54 — mesa limpa, ferramentas radiais e tema persistente.
   O livro/mapa continuam pertencendo ao mestre. Somente a interface pessoal muda. */
(function(root){
 'use strict';
 const $=(q,base=document)=>base.querySelector(q);
 const cid=location.pathname.split('/')[2]||'';
 const preferenceKey='rpg-player-look:'+cid; // Mesma chave utilizada por /play/:id.
 const hudKey='mastermind54-hud:'+cid;
 const themes={base:'#c6a2d6',sangue:'#ea5b72',conhecimento:'#e4ba66',
   energia:'#a77aef',morte:'#abb8aa',medo:'#e3d7f2'};
 const allowed=Object.keys(themes);
 const colors={dark:{bg:'#0b0d16',surface:'#191824',surface2:'#24202e',fg:'#f7edf8',muted:'#c2b4ca',line:'#715d78'},
   light:{bg:'#f8f4f9',surface:'#fffaff',surface2:'#eee5f0',fg:'#30243a',muted:'#65566c',line:'#bda7c3'}};
 let open=false,source='sheet',prefs=null,compact=true;
 const safeColor=value=>/^#[a-f0-9]{6}$/i.test(String(value||''))?String(value).toLowerCase():themes.base;
 const safeSize=value=>{const n=Number(value);return Number.isFinite(n)?Math.min(1.3,Math.max(.9,n)):1};
 function readPrefs(){
  try{
   const x=JSON.parse(localStorage.getItem(preferenceKey)||'{}');
   return {theme:allowed.includes(x.theme)?x.theme:'base',color:safeColor(x.color),
    mode:x.mode==='light'?'light':'dark',size:safeSize(x.size)};
  }catch{return {theme:'base',color:themes.base,mode:'dark',size:1}}
 }
 function savePrefs(p){
  prefs={theme:allowed.includes(p.theme)?p.theme:'base',color:safeColor(p.color),
   mode:p.mode==='light'?'light':'dark',size:safeSize(p.size)};
  try{localStorage.setItem(preferenceKey,JSON.stringify(prefs))}catch{}
  applyTheme();
  root.dispatchEvent(new CustomEvent('mastermind:appearance-updated',{detail:prefs}));
 }
 function applyTheme(){
  const current=readPrefs();
  prefs=current;
  const scheme=colors[current.mode],accent=current.theme==='base'?current.color:themes[current.theme];
  const rootStyle=document.documentElement.style;
  // Keep the same palette across the map chrome, all overlays, the sheet and dialogs.
  rootStyle.setProperty('--accent',accent);
  rootStyle.setProperty('--r54-accent',accent);
  for(const [k,v] of Object.entries(scheme))rootStyle.setProperty('--r54-'+k,v);
  rootStyle.setProperty('--r54-font-scale',String(current.size));
  rootStyle.setProperty('--ink',scheme.fg);
  rootStyle.setProperty('--muted',scheme.muted);
  document.body.dataset.theme=current.theme;
  document.body.dataset.r54Scheme=current.mode;
  document.body.classList.toggle('r52-light-mode',current.mode==='light');
  document.documentElement.style.colorScheme=current.mode;
  const tag=$('meta[name="theme-color"]');
  if(tag)tag.setAttribute('content',scheme.bg);
  document.body.style.fontSize='calc(13px * var(--r54-font-scale))';
  updateSettings();
 }
 function readCompact(){try{return localStorage.getItem(hudKey)!=='expanded'}catch{return true}}
 function setCompact(value){
  compact=!!value;
  try{localStorage.setItem(hudKey,compact?'compact':'expanded')}catch{}
  document.body.classList.toggle('r54-compact-hud',compact);
  const check=$('#r54-hud-compact');if(check)check.checked=compact;
  const toggle=$('#r54-compact-toggle');
  if(toggle){toggle.textContent=compact?'Mostrar HUD completo':'Minimizar HUD';toggle.setAttribute('aria-pressed',String(!compact))}
 }
 function updateSettings(){
  if(!prefs)return;
  for(const [id,v] of [['#r54-theme',prefs.theme],['#r54-color',prefs.color],['#r54-mode',prefs.mode],['#r54-size',String(prefs.size)]]){
   const field=$(id);
   if(field&&field.value!==v)field.value=v;
  }
  const color=$('#r54-custom-color');if(color)color.hidden=prefs.theme!=='base';
 }
 function openSheet(pane='sheet'){
  const modal=$('#sheet-modal');
  if(!modal)return;
  closeWheel();
  modal.classList.add('open');
  showSheetPane(pane);
 }
 function showSheetPane(next){
  source=next==='appearance'?'appearance':'sheet';
  const modal=$('#sheet-modal');if(!modal)return;
  modal.classList.toggle('r54-appearance-active',source==='appearance');
  for(const btn of modal.querySelectorAll('[data-r54-pane]')){
   const on=btn.dataset.r54Pane===source;
   btn.classList.toggle('active',on);btn.setAttribute('aria-selected',String(on));
  }
  if(source==='appearance')updateSettings();
 }
 function closeWheel(){
  open=false;
  const menu=$('#r54-wheel');
  if(!menu)return;
  menu.classList.remove('open');
  menu.querySelector('#r54-toggle')?.setAttribute('aria-expanded','false');
  menu.querySelector('#r54-wheel-items')?.setAttribute('aria-hidden','true');
  for(const btn of menu.querySelectorAll('[data-r54-action]'))btn.tabIndex=-1;
 }
 function toggleWheel(){
  open=!open;
  const menu=$('#r54-wheel');
  if(!menu)return;
  menu.classList.toggle('open',open);
  menu.querySelector('#r54-toggle')?.setAttribute('aria-expanded',String(open));
  menu.querySelector('#r54-wheel-items')?.setAttribute('aria-hidden',String(!open));
  for(const btn of menu.querySelectorAll('[data-r54-action]'))btn.tabIndex=open?0:-1;
 }
 function mode(next){
  const el=$('#r52-live-tools [data-r52-mode="'+next+'"]');
  if(el)el.click();
  document.body.dataset.r54Tool=next;
  const lab=$('#r54-tool-active');
  if(lab){
   lab.hidden=next==='move';
   lab.textContent={measure:'◈ Medindo alcance',pin:'✦ Toque no mapa para registrar pista',
    inspect:'⌕ Inspecionando mapa'}[next]||'';
  }
 }
 function modal(selector){const btn=$(selector);if(btn)btn.click()}
 function action(name){
  closeWheel();
  if(name==='sheet'){openSheet('sheet');return}
  if(name==='appearance'){openSheet('appearance');return}
  if(name==='dice'){modal('#open-dice');return}
  if(name==='journal'){modal('#r52-open-journal');return}
  if(name==='initiative'){modal('#open-initiative');return}
  if(name==='measure'||name==='pin'||name==='inspect'){mode(name);return}
  if(name==='move'){mode('move');return}
  if(name==='zoom'){modal('#zoom-fit');return}
 }
 function wheel(){
  const stage=$('.stage');if(!stage)return;
  const div=document.createElement('div');
  div.id='r54-wheel';div.className='r54-wheel';
  div.innerHTML='<div id="r54-wheel-items" aria-hidden="true" role="group" aria-label="Ferramentas de mesa">'+
   '<button data-r54-action="sheet" class="r54-petal" style="--ix:0" aria-label="Abrir ficha completa"><span aria-hidden="true">▣</span><small>Ficha</small></button>'+
   '<button data-r54-action="dice" class="r54-petal" style="--ix:1" aria-label="Abrir rolagem de dados"><span aria-hidden="true">⚄</span><small>Dados</small></button>'+
   '<button data-r54-action="journal" class="r54-petal" style="--ix:2" aria-label="Abrir caderno de notas"><span aria-hidden="true">✎</span><small>Notas</small></button>'+
   '<button data-r54-action="measure" class="r54-petal" style="--ix:3" aria-label="Medir alcance no mapa"><span aria-hidden="true">⌁</span><small>Medir</small></button>'+
   '<button data-r54-action="pin" class="r54-petal" style="--ix:4" aria-label="Marcar pista pessoal no mapa"><span aria-hidden="true">✦</span><small>Marcar</small></button>'+
   '<button data-r54-action="inspect" class="r54-petal" style="--ix:5" aria-label="Inspecionar criatura ou token"><span aria-hidden="true">⌕</span><small>Inspec.</small></button>'+
   '<button data-r54-action="initiative" class="r54-petal" style="--ix:6" aria-label="Consultar iniciativa"><span aria-hidden="true">☷</span><small>Turnos</small></button>'+
   '<button data-r54-action="move" class="r54-petal" style="--ix:7" aria-label="Voltar a movimentar"><span aria-hidden="true">➤</span><small>Mover</small></button>'+
   '</div><button type="button" id="r54-toggle" class="r54-toggle" aria-label="Abrir ferramentas" aria-controls="r54-wheel-items" aria-expanded="false"><span aria-hidden="true">✦</span><small>Ferramentas</small></button>';
  stage.append(div);
  div.querySelector('#r54-toggle').onclick=toggleWheel;
  div.querySelector('#r54-wheel-items').addEventListener('click',e=>{
   const btn=e.target.closest('[data-r54-action]');if(btn&&open)action(btn.dataset.r54Action);
  });
  document.addEventListener('pointerdown',e=>{if(open&&!e.target.closest('#r54-wheel'))closeWheel()});
  const badge=document.createElement('span');
  badge.id='r54-tool-active';badge.className='r54-tool-active';badge.hidden=true;
  stage.append(badge);
 }
 function settings(){
  const sheet=$('#sheet-modal'),drawer=sheet?.querySelector('.drawer');
  if(!drawer)return;
  const head=drawer.querySelector('header');
  const headerButton=document.createElement('button');
  headerButton.id='r54-appearance-shortcut';headerButton.type='button';
  headerButton.textContent='⚙ Aparência';headerButton.title='Tema, cores, texto e HUD';
  head?.querySelector('button')?.before(headerButton);
  headerButton.onclick=()=>showSheetPane('appearance');
  const switcher=document.createElement('nav');
  switcher.className='r54-sheet-switch';switcher.setAttribute('role','tablist');
  switcher.setAttribute('aria-label','Ficha e preferências');
  switcher.innerHTML='<button type="button" data-r54-pane="sheet" class="active" aria-selected="true">▣ Ficha completa</button>'+
   '<button type="button" data-r54-pane="appearance" aria-selected="false">⚙ Aparência</button>';
  const tabs=$('#sheet-tabs');tabs?.before(switcher);
  switcher.onclick=e=>{const btn=e.target.closest('[data-r54-pane]');if(btn)showSheetPane(btn.dataset.r54Pane)};
  const panel=document.createElement('section');
  panel.id='r54-appearance-panel';panel.innerHTML=
   '<h3>Personalização do jogador</h3><p>O mesmo tema acompanha sua ficha e a mesa ao vivo. As opções ficam salvas neste dispositivo para esta campanha.</p>'+
   '<label>Tema do personagem<select id="r54-theme">'+
   allowed.map(x=>'<option value="'+x+'">'+({base:'Base personalizado',sangue:'Sangue',conhecimento:'Conhecimento',energia:'Energia',morte:'Morte',medo:'Medo'}[x])+'</option>').join('')+'</select></label>'+
   '<label id="r54-custom-color">Cor personalizada <input type="color" id="r54-color"></label>'+
   '<label>Visual<select id="r54-mode"><option value="dark">Escuro</option><option value="light">Claro</option></select></label>'+
   '<label>Tamanho do texto<select id="r54-size"><option value="0.9">Compacto</option><option value="1">Normal</option><option value="1.15">Ampliado</option><option value="1.3">Grande</option></select></label>'+
   '<label class="r54-toggle-row"><input type="checkbox" id="r54-hud-compact" checked> Mapa limpo (HUD compacto)</label>'+
   '<p class="r54-note">A cor do cenário, as criaturas e a névoa continuam definidos pelo mestre. Sua escolha muda a interface, inclusive os menus que você abre sobre o grid.</p>'+
   '<button type="button" id="r54-open-original">Editar ficha detalhada ↗</button>';
  drawer.querySelector('#legacy-sheet')?.closest('p')?.before(panel);
  // Existing advanced original sheet remains available; it also owns full editing
  // features, and stores preferences in the same key.
  panel.querySelector('#r54-open-original').onclick=()=>{const a=$('#legacy-sheet');if(a)root.location.href=a.href};
  for(const id of ['r54-theme','r54-color','r54-mode','r54-size']){
   const input=$('#'+id);input.addEventListener(id==='r54-color'?'input':'change',()=>{
    savePrefs({theme:$('#r54-theme').value,color:$('#r54-color').value,
      mode:$('#r54-mode').value,size:$('#r54-size').value});
   });
  }
  $('#r54-hud-compact').onchange=e=>setCompact(e.target.checked);
  const legacy=$('#legacy-sheet');
  if(legacy)legacy.textContent='Abrir editor completo da ficha ↗';
  const top=$('.top');if(top){
   const btn=document.createElement('button');btn.id='r54-open-settings';
   btn.setAttribute('type','button');btn.setAttribute('aria-label','Ficha completa e configurações');
   btn.title='Ficha completa e personalização';btn.textContent='⚙';
   top.append(btn);btn.onclick=()=>openSheet('appearance');
  }
 }
 function collapsibleHud(){
  const hud=$('.hud');if(!hud)return;
  const button=document.createElement('button');button.type='button';
  button.id='r54-compact-toggle';button.title='Expandir ou recolher o resumo';
  button.setAttribute('aria-pressed','false');
  button.onclick=()=>setCompact(!compact);
  hud.append(button);
  // Quick access to the complete sheet from character portrait/name.
  const hero=$('.hud .hero');
  if(hero){hero.setAttribute('role','button');hero.tabIndex=0;hero.setAttribute('aria-label','Abrir ficha completa');
   hero.addEventListener('click',e=>{if(!e.target.closest('button'))openSheet('sheet')});
   hero.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSheet('sheet')}});
  }
 }
 function init(){
  if(!$('#sheet-modal')||!$('.stage'))return;
  document.body.classList.add('r54-clean','r54-compact-hud');
  settings();wheel();collapsibleHud();
  setCompact(readCompact());applyTheme();
  document.addEventListener('keydown',e=>{
   if(e.key==='Escape')closeWheel();
   if(e.key.toLowerCase()==='f'&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&
     !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))action('sheet');
  });
  root.addEventListener('pageshow',applyTheme);
  root.addEventListener('focus',applyTheme);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyTheme()});
  root.addEventListener('storage',e=>{if(e.key===preferenceKey)applyTheme()});
  root.addEventListener('mastermind:player-live-render',()=>{
   if(document.body.dataset.r54Tool===undefined)document.body.dataset.r54Tool='move';
   // Do not redraw the wheel or reset scroll/zoom when the GM updates the scene.
   const name=$('#hero-name')?.textContent||'';
   const modal=$('#sheet-modal');
   if(modal&&!modal.classList.contains('open'))showSheetPane('sheet');
  });
 }
 root.MastermindPlayerShell={init,openSheet,applyTheme,savePrefs,closeWheel,action,
  get preferences(){return readPrefs()},get wheelOpen(){return open}};
})(window);
