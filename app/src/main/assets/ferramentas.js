/* Mastermind — página de ferramentas da nova interface: ficha completa (quatro sistemas) e Ateliê.
   Usa os mesmos scripts de regras e as mesmas fichas salvas de antes. Não há navegação própria: qualquer outro
   destino volta para a nova interface (revamp/index.html). */
(function(){
'use strict';
const TOOLS={sheet:'Fichas',op:'Ficha de Ordem Paranormal',atelier85:'Ateliê'};
const NEW={home:'#inicio',library:'#biblioteca',ai:'#buscar',canvas:'#canvas',master:'#mestragem',bestiary:'#bestiario',settings:'#ajustes'};
const app=window.RPG_DEMO;
let back='#ficha';
try{const b=sessionStorage.getItem('mm-rv-return');if(b&&/^#[a-z]{2,20}$/.test(b))back=b}catch(_){}
const link=document.getElementById('mmt-back');
if(link){link.href='revamp/index.html'+back;link.addEventListener('click',()=>{try{sessionStorage.removeItem('mm-rv-return')}catch(_){}})}
function title(id){const t=document.getElementById('current-page');if(t)t.textContent=TOOLS[id]||'Fichas';document.title='Mastermind — '+(TOOLS[id]||'Fichas')}
if(app&&typeof app.navigate==='function'){
 const go=app.navigate.bind(app);
 app.navigate=function(id){
  /* a ficha antiga de Ordem vive dentro da ficha completa: abre a ficha completa já em Ordem Paranormal */
  if(id==='op'){go('sheet');title('sheet');try{window.MastermindSheetStudio?.switchSystem('ordem')}catch(_){}if(location.hash!=='#sheet')history.replaceState(null,'','#sheet');return}
  if(TOOLS[id]){go(id);title(id);return}
  location.href='revamp/index.html'+(NEW[id]||back)};
 const first=(location.hash||'').slice(1);
 app.navigate(TOOLS[first]?first:'sheet');
 window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(TOOLS[h])app.navigate(h)});
}
/* botões antigos de navegação que ainda existam dentro das telas mantidas */
document.addEventListener('click',e=>{const b=e.target.closest('[data-screen]');if(!b||TOOLS[b.dataset.screen])return;
 e.preventDefault();e.stopImmediatePropagation();location.href='revamp/index.html'+(NEW[b.dataset.screen]||back)},true);
document.documentElement.classList.add('mmt');
/* Tema claro com o dourado padrão: o mesmo dourado escuro da nova interface (legível no fundo claro). */
function lightGold(){const h=document.documentElement;let acc='gold',el='"base"';try{acc=localStorage.getItem('rpg-accent')||'gold';el=localStorage.getItem('v10-global-element')||'"base"'}catch(_){}
 if(h.classList.contains('light')&&acc==='gold'&&el==='"base"'){h.style.setProperty('--accent','#917149','important');h.style.setProperty('--accent-soft','#b5966430','important')}
 else if(h.style.getPropertyPriority('--accent')==='important'){h.style.removeProperty('--accent');h.style.removeProperty('--accent-soft')}}
lightGold();new MutationObserver(lightGold).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
