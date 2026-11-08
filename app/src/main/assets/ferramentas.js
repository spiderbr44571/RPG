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
 try{app.navigate(TOOLS[first]?first:'sheet')}catch(err){console.error('Ferramentas:',err)}
 window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(TOOLS[h])app.navigate(h)});
}
/* botões antigos de navegação que ainda existam dentro das telas mantidas */
document.addEventListener('click',e=>{const b=e.target.closest('[data-screen]');if(!b||TOOLS[b.dataset.screen])return;
 e.preventDefault();e.stopImmediatePropagation();location.href='revamp/index.html'+(NEW[b.dataset.screen]||back)},true);
document.documentElement.classList.add('mmt');
/* o menu antigo (botão e central da interface clássica) sai da página */
for(const el of document.querySelectorAll('.r09-dock,.r09-overlay'))try{el.remove()}catch(_){}
/* Central da nova interface: o mesmo botão e a mesma lista; os destinos abrem a nova interface */
const ic=n=>window.RevampIcons?RevampIcons.render(n):'';
const CENTRAL=[['#inicio','home','Painel inicial','Resumo da campanha'],['#mestragem','crown','Mestragem','Campanha, mesa ao vivo e cenários'],['#ficha','users','Fichas','Personagens, poderes e retratos'],
 ['#biblioteca','books','Biblioteca','Livros e regras dos sistemas'],['#buscar','file-search','Buscar nos livros','Termo, resumo e página'],['#bestiario','skull','Bestiário','Grimório e monstros'],['tool:atelier85','palette','Ateliê','Retrato e token em camadas'],
 ['#canvas','layout-grid','Canvas infinito','Notas, mapas e criaturas'],['#ajustes','adjustments','Personalização','Temas, efeitos, cores e fontes'],['#entrar','device-mobile','Entrar numa mesa','Como jogador, pelo app ou navegador']];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function closeCentral(){const m=document.getElementById('mmt-central');if(m){m.remove();document.getElementById('mmt-fab')?.focus();return true}return false}
function openCentral(){if(document.getElementById('mmt-central'))return;const m=document.createElement('div');m.id='mmt-central';m.className='mmt-central-back';
 m.innerHTML='<section class="mmt-central" role="dialog" aria-modal="true" aria-labelledby="mmt-central-h"><div class="mmt-central-h"><div><span class="kicker">Central da mesa</span><h2 id="mmt-central-h">Escolha seu próximo <em>caminho.</em></h2></div><button class="mmt-central-x" type="button" data-cx aria-label="Fechar">'+ic('x')+'</button></div>'+
  '<div class="mmt-central-grid">'+CENTRAL.map(([h,i,t,d])=>'<a class="mmt-central-card" href="'+(h.startsWith('tool:')?'#'+h.slice(5):'revamp/index.html'+h)+'"'+(h.startsWith('tool:')?' data-tool="'+h.slice(5)+'"':'')+'>'+ic(i)+'<b>'+esc(t)+'</b><span>'+esc(d)+'</span></a>').join('')+'</div></section>';
 document.body.appendChild(m);m.querySelector('[data-cx]').focus();
 m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-cx]')){closeCentral();return}const a=e.target.closest('.mmt-central-card');if(!a)return;
  if(a.dataset.tool){e.preventDefault();closeCentral();if(app)app.navigate(a.dataset.tool);return}try{sessionStorage.removeItem('mm-rv-return')}catch(_){}})}
const fab=document.createElement('button');fab.id='mmt-fab';fab.type='button';fab.setAttribute('aria-label','Abrir a Central da mesa');fab.innerHTML=ic('layout-grid');fab.addEventListener('click',openCentral);document.body.appendChild(fab);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCentral()});
/* pronto: a ferramenta aparece já no visual novo */
requestAnimationFrame(()=>document.documentElement.classList.add('mmt-ready'));
/* Tema claro com o dourado padrão: o mesmo dourado escuro da nova interface (legível no fundo claro). */
function lightGold(){const h=document.documentElement;let acc='gold',el='"base"';try{acc=localStorage.getItem('rpg-accent')||'gold';el=localStorage.getItem('v10-global-element')||'"base"'}catch(_){}
 if(h.classList.contains('light')&&acc==='gold'&&el==='"base"'){h.style.setProperty('--accent','#917149','important');h.style.setProperty('--accent-soft','#b5966430','important')}
 else if(h.style.getPropertyPriority('--accent')==='important'){h.style.removeProperty('--accent');h.style.removeProperty('--accent-soft')}}
lightGold();new MutationObserver(lightGold).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
