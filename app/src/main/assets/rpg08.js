(function installNav(){
'use strict';
const app=window.RPG_DEMO;if(!app)return;
document.getElementById('rpg07-settings-quick')?.remove();
const css=String.raw`
#rpg07-settings-quick{display:none!important}
.rpg08-mobile-bar,.rpg08-scrim,.rpg08-sheet{display:none}
@media(max-width:690px){
.sidebar{display:none!important}
.app{height:100dvh;min-height:0}
.main{height:100%;padding-bottom:calc(86px + env(safe-area-inset-bottom))!important}
.toast{bottom:calc(96px + env(safe-area-inset-bottom))}
.rpg08-mobile-bar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;z-index:1000;padding:8px 10px calc(9px + env(safe-area-inset-bottom));gap:4px;background:color-mix(in srgb,var(--sidebar) 95%,transparent);border-top:1px solid var(--line);box-shadow:0 -12px 40px #0005;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
.rpg08-tab{appearance:none;min-width:0;min-height:55px;padding:7px 0 5px;border:1px solid transparent;border-radius:13px;background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;font:500 10px/1 'DM Sans',system-ui,sans-serif;cursor:pointer;position:relative;-webkit-tap-highlight-color:transparent;transition:background .18s,color .18s,border-color .18s}
.rpg08-tab svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;transition:transform .2s}
.rpg08-tab[aria-current="page"],.rpg08-tab.is-active{color:var(--accent);background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 23%,transparent)}
.rpg08-tab[aria-current="page"]:before,.rpg08-tab.is-active:before{content:'';position:absolute;width:19px;height:2px;border-radius:4px;background:var(--accent);top:-9px;left:calc(50% - 9.5px)}
.rpg08-tab:active svg{transform:scale(.88)}
.rpg08-scrim{position:fixed;inset:0;z-index:1001;background:#050609b8;opacity:0;display:block;visibility:hidden;transition:opacity .26s,visibility .26s;backdrop-filter:blur(3px)}
.rpg08-sheet{display:block;position:fixed;z-index:1002;left:0;right:0;bottom:0;max-height:min(76dvh,570px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-bottom:0;border-radius:23px 23px 0 0;box-shadow:0 -24px 85px #000a;transform:translateY(110%);visibility:hidden;transition:transform .33s cubic-bezier(.2,.82,.24,1),visibility .33s;padding:14px 20px calc(28px + env(safe-area-inset-bottom))}
body.rpg08-menu-open .rpg08-scrim{visibility:visible;opacity:1}
body.rpg08-menu-open .rpg08-sheet{visibility:visible;transform:translateY(0)}
.rpg08-grip{margin:0 auto 19px;width:41px;height:4px;border-radius:8px;background:var(--line)}
.rpg08-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.rpg08-sheet-heading{font:500 25px 'Cormorant Garamond',Georgia,serif;color:var(--fg);margin:0}
.rpg08-close{height:35px;width:35px;border:1px solid var(--line);border-radius:50%;background:var(--card);color:var(--fg);font-size:20px;cursor:pointer}
.rpg08-sheet-desc{font:400 12px/1.5 'DM Sans',system-ui,sans-serif;color:var(--muted);margin:-7px 0 17px}
.rpg08-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rpg08-action{padding:15px 13px;min-height:105px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:8px;border:1px solid var(--line);border-radius:15px;color:var(--fg);background:var(--card);cursor:pointer;transition:background .2s,border-color .2s}
.rpg08-action svg{height:23px;width:23px;fill:none;stroke:var(--accent);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.rpg08-action strong{font:600 13px 'DM Sans',system-ui,sans-serif}
.rpg08-action small{font:400 10px/1.35 'DM Sans',system-ui,sans-serif;color:var(--muted)}
.rpg08-action:active{transform:scale(.98);border-color:var(--accent)}
.rpg08-preferences{display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);margin-top:17px;padding:19px 2px 2px}
.rpg08-color-dot{width:25px;height:25px;border:2px solid var(--panel);border-radius:50%;background:conic-gradient(#ed5564,#e7ba60,#74b86c,#4caed1,#8c65c7,#ed5564);box-shadow:0 0 0 1px var(--line)}
.rpg08-preferences span{color:var(--muted);font-size:11px;line-height:1.45}
#rpg07-home-settings{display:none!important}
}
@media(min-width:691px){.rpg08-mobile-bar,.rpg08-sheet,.rpg08-scrim{display:none!important}}
@media(prefers-reduced-motion:reduce){.rpg08-tab,.rpg08-tab svg,.rpg08-scrim,.rpg08-sheet,.rpg08-action{transition:none!important}}
`;
const style=document.createElement('style');style.id='rpg08-nav-style';style.textContent=css;document.head.append(style);
const ico={home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',library:'<path d="M4 4h7v16H4zm9-1h7v17h-7zM6 8h3m6 0h3m-12 4h3"/>',sheet:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',canvas:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',master:'<path d="M12 3 3 7.5V13c0 5 3 7 9 9 6-2 9-4 9-9V7.5zM9 12l2 2 4-4"/>',bestiary:'<path d="M3 5.5C6 4 9 4.5 12 6c3-1.5 6-2 9-.5V20c-3-1.5-6-1-9 .5-3-1.5-6-2-9-.5zm9 .5v14.5"/>',ai:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7z"/>',settings:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.2 2.2m9.8 9.8 2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>'};
const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ico[name]}</svg>`;
const main=[['home','Início','home'],['library','Livros','library'],['sheet','Fichas','sheet'],['canvas','Canvas','canvas']];
const secondary=[['bestiary','Bestiário','bestiary','Criaturas e grimório'],['master','Mestragem','master','Turnos e cenas'],['ai','Consulta IA','ai','Busca nas regras'],['settings','Configurações','settings','Cores e aparência']];
const bar=document.createElement('nav');bar.className='rpg08-mobile-bar';bar.setAttribute('aria-label','Navegação principal do aplicativo');
bar.innerHTML=main.map(([s,l,ic])=>`<button type="button" class="rpg08-tab" data-rpg08-to="${s}" aria-label="${l}">${icon(ic)}<span>${l}</span></button>`).join('')+`<button type="button" class="rpg08-tab" data-rpg08-more aria-label="Abrir mais opções" aria-haspopup="dialog" aria-expanded="false">${icon('more')}<span>Mais</span></button>`;
const backdrop=document.createElement('div');backdrop.className='rpg08-scrim';backdrop.setAttribute('aria-hidden','true');
const menu=document.createElement('section');menu.className='rpg08-sheet';menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label','Mais ferramentas');menu.innerHTML=`<div class="rpg08-grip"></div><div class="rpg08-sheet-head"><h2 class="rpg08-sheet-heading">Mais ferramentas</h2><button type="button" class="rpg08-close" aria-label="Fechar menu">×</button></div><p class="rpg08-sheet-desc">Acesse suas ferramentas sem lotar a barra de navegação.</p><div class="rpg08-grid">${secondary.map(([s,l,ic,sub])=>`<button type="button" class="rpg08-action" data-rpg08-to="${s}">${icon(ic)}<strong>${l}</strong><small>${sub}</small></button>`).join('')}</div><div class="rpg08-preferences"><div class="rpg08-color-dot" aria-hidden="true"></div><span>Personalize a cor de destaque, a tipografia e o tema em Configurações.</span></div>`;
document.body.append(backdrop,bar,menu);
const more=bar.querySelector('[data-rpg08-more]');let menuOpened=false;
function setMenu(on){menuOpened=!!on;document.body.classList.toggle('rpg08-menu-open',menuOpened);more.setAttribute('aria-expanded',String(menuOpened));if(menuOpened){menu.querySelector('.rpg08-close').focus({preventScroll:true})}else more.focus({preventScroll:true})}
function currentScreen(){return document.querySelector('.screen.active')?.id?.replace(/^screen-/,'')||'home'}
function update(){const now=currentScreen();bar.querySelectorAll('[data-rpg08-to]').forEach(b=>{if(b.dataset.rpg08To===now){b.setAttribute('aria-current','page')}else b.removeAttribute('aria-current')});more.classList.toggle('is-active',secondary.some(x=>x[0]===now)||menuOpened)}
bar.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b===more){setMenu(!menuOpened);update();return}setMenu(false);app.navigate(b.dataset.rpg08To);update()});
menu.addEventListener('click',e=>{if(e.target.closest('.rpg08-close')){setMenu(false);update();return}const b=e.target.closest('[data-rpg08-to]');if(!b)return;setMenu(false);app.navigate(b.dataset.rpg08To);update()});
backdrop.addEventListener('click',()=>{setMenu(false);update()});
document.addEventListener('keydown',e=>{if(menuOpened&&e.key==='Escape'){setMenu(false);update()}});
const area=document.querySelector('.main');if(area)new MutationObserver(update).observe(area,{subtree:true,attributes:true,attributeFilter:['class']});
update();
})();