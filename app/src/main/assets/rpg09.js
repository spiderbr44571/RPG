(()=>{'use strict';
const app=window.RPG_DEMO, sys=window.OP13;
if(!app||!sys)return;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const svgDie=`<svg class="r09-poly" viewBox="0 0 100 106" aria-hidden="true"><path class="die-shell" d="M50 3 88 20 99 56 78 92 50 104 22 92 1 56 12 20Z"/><path class="die-wire" d="M50 3 28 44 50 74 72 44Z M12 20 28 44 1 56 22 92 50 74 78 92 99 56 72 44 88 20 M28 44 72 44 M50 74 50 104"/><text x="50" y="62" class="r09-die-num" text-anchor="middle">20</text></svg>`;
const tools=[
 ['library','Biblioteca','book-open','Livros, sistemas e regras'],
 ['sheet','Fichas','users','Personagens, poderes e retratos'],
 ['canvas','Canvas infinito','map','Notas, mapas e criaturas'],
 ['bestiary','Bestiário','book','Grimório e monstros'],
 ['master','Mestragem','crown','Turnos, cenas e efeitos'],
 ['ai','Consulta IA','brain','Pesquisar dentro dos livros'],
 ['online','Mesa em rede','wifi','Links individuais por jogador'],
 ['settings','Personalização','palette','Cores, temas e fontes'],
 ['home','Painel inicial','house','Resumo da campanha']
];
const icons={
 'book-open':'<path d="M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1Z M12 6v15"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2 M16 6a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',
 map:'<path d="M3 5 9 3l6 2 6-2v16l-6 2-6-2-6 2Z M9 3v16M15 5v16"/>',
 book:'<path d="M4 3h15v18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 14h15M7 8h8"/>',
 crown:'<path d="m3 7 5 5 4-8 4 8 5-5-2 12H5Z"/>',
 brain:'<path d="M10 3a5 5 0 0 0-6 7 4 4 0 0 0 0 8 5 5 0 0 0 6 3V3zm4 0a5 5 0 0 1 6 7 4 4 0 0 1 0 8 5 5 0 0 1-6 3V3Z"/>',
 wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M9 17a5 5 0 0 1 6 0"/><circle cx="12" cy="21" r="1"/>',
 palette:'<path d="M12 3a9 9 0 0 0 0 18h1a2 2 0 0 0 1-4 2 2 0 0 1 1-3h2a4 4 0 0 0 4-4C21 6 17 3 12 3Z"/><circle cx="7" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="16" cy="8" r="1"/>',
 house:'<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
// The single d20 is the sole permanent navigator, on desktop and mobile.
const visual=document.createElement('style');visual.id='rpg09-style';visual.textContent=`
.rpg08-mobile-bar,.rpg08-sheet,.rpg08-scrim,#rpg07-settings-quick{display:none!important}
.sidebar{display:none!important}
.app{display:block!important}.main{margin:0!important;width:100%!important;max-width:none!important;height:100dvh!important;overflow:hidden!important}
.main .content{max-width:1450px!important;margin:0 auto!important;padding-bottom:136px!important}
.r09-dock{position:fixed;z-index:1600;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:90px;height:90px;display:grid;place-items:center;pointer-events:none}
.r09-dock:before{content:'';position:absolute;inset:13px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 24%,#090c13),#08080f);filter:blur(13px);opacity:.95}
.r09-die{pointer-events:auto;border:0;padding:0;width:75px;height:79px;background:transparent;cursor:pointer;filter:drop-shadow(0 9px 13px #000b);position:relative;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.r09-poly{width:100%;height:100%;overflow:visible;transform:translateZ(0);transform-origin:50% 50%}
.r09-poly .die-shell{fill:var(--accent,#bc9770);stroke:#f9ddaa;stroke-width:1.6}
.r09-poly .die-wire{fill:none;stroke:#2c1f24;stroke-width:2;stroke-linejoin:round;opacity:.78}
.r09-die-num{font:bold 28px 'Space Grotesk',sans-serif;fill:#211a1c;pointer-events:none}
.r09-die[aria-expanded="true"] .die-shell{filter:brightness(1.22)}
.r09-die.roll .r09-poly{animation:r09-jump-spin 1050ms cubic-bezier(.18,.7,.26,1) both}
@keyframes r09-jump-spin{0%{transform:translateY(0) rotate(0) scale(1)}20%{transform:translateY(-48px) rotate(175deg) scale(1.16)}50%{transform:translateY(-75px) rotate(435deg) scale(1.12)}75%{transform:translateY(0px) rotate(655deg) scale(.85)}87%{transform:translateY(-18px) rotate(710deg) scale(1.05)}100%{transform:translateY(0) rotate(720deg) scale(1)}}
.r09-dock-label{display:none!important;pointer-events:none;position:absolute;bottom:90px;white-space:nowrap;background:#11131bbf;border:1px solid var(--line);border-radius:30px;padding:6px 11px;color:var(--fg);font:600 10px 'DM Sans',sans-serif;letter-spacing:.12em;text-transform:uppercase}
.r09-overlay{position:fixed;z-index:1500;inset:0;background:#060810c7;backdrop-filter:blur(12px);display:none;align-items:flex-start;justify-content:center;padding:28px 12px 100px;overflow:auto}
.r09-overlay.open{display:flex;animation:r09-in .26s ease-out}@keyframes r09-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.r09-hub{width:min(920px,100%);margin:auto;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 11%,var(--panel)) 0%,var(--panel) 60%);border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));border-radius:22px;box-shadow:0 26px 100px #000b;padding:24px;max-height:calc(100dvh - 155px);overflow:auto}
.r09-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.r09-kicker{font:600 11px 'Space Grotesk',sans-serif;letter-spacing:.18em;color:var(--accent);text-transform:uppercase}
.r09-title{font:500 clamp(29px,5vw,44px) 'Cormorant Garamond',Georgia,serif;color:var(--fg);margin:8px 0 4px}.r09-sub{color:var(--muted);font-size:12px;margin:0 0 19px}
.r09-close{border:1px solid var(--line);background:var(--card);border-radius:50%;width:37px;height:37px;cursor:pointer;color:var(--fg);font-size:23px}
.r09-roll-readout{display:flex;align-items:center;gap:13px;margin:3px 0 17px;border:1px solid var(--line);border-radius:14px;padding:13px;background:#080b1338}
.r09-result{font:700 37px 'Space Grotesk',sans-serif;color:var(--accent)}.r09-result-info{font-size:12px;color:var(--muted);line-height:1.5}
.r09-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.r09-tool{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:17px 13px;min-height:123px;display:flex;flex-direction:column;align-items:flex-start;gap:9px;color:var(--fg);text-align:left;cursor:pointer;transition:transform .15s,border-color .15s}
.r09-tool svg{width:25px;height:25px;color:var(--accent)}.r09-tool strong{font:600 14px 'DM Sans',sans-serif}.r09-tool small{font-size:11px;color:var(--muted);line-height:1.4}.r09-tool:active{transform:scale(.98)}.r09-tool:hover{border-color:var(--accent)}
.r09-online-pane{margin-top:22px;border:1px solid var(--line);padding:22px;border-radius:16px;background:var(--card)}.r09-online-pane h3{font:500 27px 'Cormorant Garamond',serif;margin:0 0 10px;color:var(--fg)}
.r09-online-pane p{font-size:12px;color:var(--muted);line-height:1.6}.r09-online-pane .r09-actions{display:flex;gap:9px;flex-wrap:wrap;margin:13px 0}.r09-action{background:var(--accent);border:0;border-radius:8px;color:#21160f;padding:12px;font-weight:650;cursor:pointer}.r09-action.secondary{background:var(--panel);border:1px solid var(--line);color:var(--fg)}
.r09-online-pane textarea{min-height:95px;width:100%;resize:vertical;background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:9px;padding:10px;font:11px monospace}
.r09-profile{display:grid;grid-template-columns:120px minmax(0,1fr);gap:16px;margin:13px 0 20px;padding:16px;border-radius:16px;border:1px solid var(--line);background:var(--card);position:relative;overflow:hidden}
.r09-profile.theme-sigilo{background:radial-gradient(circle at 88% 0,#a1333030,transparent 56%),#211419;border-color:#914a45;color:#ecd7ce}
.r09-profile.theme-cris{background:linear-gradient(140deg,#101d26,#14212b 64%,#29161c);border-color:#4e7793;color:#d9edf7}
.r09-profile.theme-dossie{background:linear-gradient(110deg,#29261f,#1c1b1a);border-color:#796b51;color:#eadfc8}
#screen-sheet[data-r09-theme="theme-cris"] .rpg05-sheet-op .op-panel,#screen-sheet[data-r09-theme="theme-cris"] .rpg05-sheet-op .surface-flat{background:linear-gradient(138deg,#12202a,#0e1824)!important;border-color:#396175!important}
#screen-sheet[data-r09-theme="theme-cris"] .rpg05-sheet-op h3{color:#94ced7!important}
#screen-sheet[data-r09-theme="theme-cris"] .rpg05-sheet-op .op-input{border-color:#3b768a!important}
#screen-sheet[data-r09-theme="theme-sigilo"] .rpg05-sheet-op .op-panel,#screen-sheet[data-r09-theme="theme-sigilo"] .rpg05-sheet-op .surface-flat{background:linear-gradient(160deg,#24151b,#1b141d)!important;border-color:#744343!important}
#screen-sheet[data-r09-theme="theme-dossie"] .rpg05-sheet-op .op-panel,#screen-sheet[data-r09-theme="theme-dossie"] .rpg05-sheet-op .surface-flat{background:linear-gradient(155deg,#2c281f,#201f1e)!important;border-color:#897658!important}

.r09-portrait{height:120px;width:120px;display:grid;place-items:center;overflow:hidden;border-radius:13px;background:#100f17;border:2px solid var(--accent);color:var(--accent);font-size:43px}.r09-portrait img{width:100%;height:100%;object-fit:cover}
.r09-profile h3{font:500 28px 'Cormorant Garamond',Georgia,serif;margin:2px 0}.r09-profile label{display:block;font-size:11px;color:var(--muted);margin:5px 0}.r09-profile select{width:100%;max-width:260px;color:var(--fg);background:var(--panel);border:1px solid var(--line);padding:8px;border-radius:7px}
.r09-photo-button{display:inline-block;cursor:pointer;margin:8px 0;border:1px solid var(--line);padding:8px 10px;border-radius:8px;font-size:11px}.r09-profile-hint{font-size:10px;color:var(--muted)}
.r09-book-cover{position:relative;overflow:hidden;background:#15131a;border-radius:6px;aspect-ratio:3/4;display:grid;place-items:center;color:#decaa0;box-shadow:0 5px 18px #0006}
.r09-book-cover img{height:100%;width:100%;object-fit:cover;display:block}
.r09-cover-pending{font-size:11px;max-width:150px;text-align:center;padding:10px}
@media(max-width:690px){.main .content{width:100%!important;max-width:100vw!important;overflow-x:hidden!important}.screen{width:100%!important;min-width:0!important;padding-left:14px!important;padding-right:14px!important}.rpg05-heading,.rpg05-controls{flex-wrap:wrap!important}.rpg05-band,.rpg05-sheet-op{min-width:0!important;max-width:100%!important}.rpg05-heading select{max-width:100%!important}.top-actions{display:none!important}.r09-overlay{padding:12px 8px 115px}.r09-hub{padding:18px 13px;border-radius:18px;max-height:calc(100dvh - 143px)}.r09-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.r09-tool{min-height:113px;padding:13px 11px}.r09-profile{grid-template-columns:85px minmax(0,1fr);padding:11px;gap:10px}.r09-portrait{width:85px;height:98px}.r09-dock{bottom:calc(10px + env(safe-area-inset-bottom))}.main{padding-bottom:0!important}.main .content{padding-bottom:128px!important}}
@media(prefers-reduced-motion:reduce){.r09-die.roll .r09-poly{animation:r09-soft 400ms ease-out}@keyframes r09-soft{0%{opacity:.6;transform:translateY(-8px)}100%{opacity:1;transform:translateY(0)}}.r09-overlay.open{animation:none}}
`;
document.head.append(visual);
// Hide the old floating desktop/mobile navigation, but keep every existing view routable.
$$('.rpg08-mobile-bar,.rpg08-sheet,.rpg08-scrim').forEach(el=>el.remove());
const dock=document.createElement('div');dock.className='r09-dock';dock.innerHTML=`<div class="r09-dock-label">Abrir ferramentas</div><button type="button" class="r09-die" id="r09-dice" aria-label="Rolar d20 e abrir ferramentas" aria-expanded="false">${svgDie}</button>`;
const overlay=document.createElement('div');overlay.className='r09-overlay';overlay.id='r09-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Central de ferramentas');
overlay.innerHTML=`<section class="r09-hub"><div class="r09-head"><div><div class="r09-kicker">CENTRAL DA MESA</div><h2 class="r09-title">Escolha seu próximo <i>caminho.</i></h2><p class="r09-sub">Um d20, todas as ferramentas. Toque no dado para uma nova rolagem.</p></div><button class="r09-close" type="button" aria-label="Fechar ferramentas">×</button></div><div class="r09-roll-readout"><div class="r09-result" id="r09-out">20</div><div class="r09-result-info"><strong>Rolagem de d20</strong><div id="r09-roll-caption">Resultado ao abrir o menu</div></div></div><div class="r09-grid">${tools.map(([id,title,ico,sub])=>`<button class="r09-tool" type="button" data-r09-tool="${id}">${icon(ico)}<strong>${title}</strong><small>${sub}</small></button>`).join('')}</div></section>`;
document.body.append(overlay,dock);
const dice=$('#r09-dice');let rolling=false;
function rand20(){const arr=new Uint32Array(1),limit=Math.floor(4294967296/20)*20;do{crypto.getRandomValues(arr)}while(arr[0]>=limit);return(arr[0]%20)+1}
function roll(){const n=rand20();dice.classList.remove('roll');void dice.offsetWidth;dice.classList.add('roll');rolling=true;
 setTimeout(()=>{rolling=false;dice.classList.remove('roll')},1055);
 setTimeout(()=>{$('.r09-die-num',dice).textContent=String(n);$('#r09-out').textContent=String(n);$('#r09-roll-caption').textContent='Resultado aleatório gerado no dispositivo';},720);
 return n;
}
function openHub(){overlay.classList.add('open');dice.setAttribute('aria-expanded','true');document.body.style.overflow='hidden'}
function closeHub(){overlay.classList.remove('open');dice.setAttribute('aria-expanded','false');document.body.style.overflow=''}
dice.addEventListener('click',()=>{roll();openHub()});
$('.r09-close',overlay).addEventListener('click',closeHub);overlay.addEventListener('click',e=>{if(e.target===overlay)closeHub()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))closeHub()});
overlay.addEventListener('click',e=>{const b=e.target.closest('[data-r09-tool]');if(!b)return;closeHub();const to=b.dataset.r09Tool;if(to==='online'){app.navigate('online');return}app.navigate(to)});
// Personal profile. Metadata is stored in the existing per-character JSON, not in a second global template.
const sheet=$('#screen-sheet'),charSelect=$('#rpg05-char-select');
if(sheet&&charSelect){const profile=document.createElement('div');profile.id='r09-profile';profile.className='r09-profile';
 const heading=$('#rpg05-sheet-op');heading?.parentNode?.insertBefore(profile,heading);
 function renderProfile(){const c=sys.state,photo=typeof c.photo==='string'&&c.photo.startsWith('data:image/')?c.photo:null;
  const theme=['theme-sigilo','theme-cris','theme-dossie'].includes(c.sheetTheme)?c.sheetTheme:'theme-sigilo';
  profile.className='r09-profile '+theme;sheet.setAttribute('data-r09-theme',theme);
  profile.innerHTML=`<div><div class="r09-portrait">${photo?`<img src="${photo}" alt="Retrato personalizado do agente">`:'✧'}</div><label class="r09-photo-button" for="r09-upload-photo">+ Escolher retrato</label><input id="r09-upload-photo" type="file" accept="image/png,image/jpeg,image/webp" hidden></div><div><small style="letter-spacing:.12em">ARQUIVO DO AGENTE</small><h3>${esc(c.name||'Novo agente')}</h3><label>Tema da ficha</label><select id="r09-sheet-theme"><option value="theme-sigilo" ${theme==='theme-sigilo'?'selected':''}>Sigilo Rubro</option><option value="theme-cris" ${theme==='theme-cris'?'selected':''}>Painel Tecnológico (inspirado em CRIS)</option><option value="theme-dossie" ${theme==='theme-dossie'?'selected':''}>Dossiê Clássico</option></select><p class="r09-profile-hint">Retrato e tema ficam salvos nesta ficha e podem ser exportados em JSON.</p></div>`;
 }
 function updateChar(patch){const changed=sys.changeCharacter({...sys.state,...patch});if(changed){$('#op-view-ficha')?.dispatchEvent(new Event('change',{bubbles:true}));renderProfile()}else app.notify('Falha ao salvar ficha')}
 profile.addEventListener('change',e=>{if(e.target.id==='r09-sheet-theme'){updateChar({sheetTheme:e.target.value});return}
  if(e.target.id!=='r09-upload-photo')return;const file=e.target.files?.[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){app.notify('Use imagem PNG/JPG/WebP de até 10 MB.');return}
  const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const cvs=document.createElement('canvas');const size=420;cvs.width=size;cvs.height=size;const ctx=cvs.getContext('2d');ctx.fillStyle='#15101b';ctx.fillRect(0,0,size,size);const sc=Math.max(size/img.width,size/img.height),w=img.width*sc,h=img.height*sc;ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);updateChar({photo:cvs.toDataURL('image/jpeg',.78)})};img.onerror=()=>app.notify('Imagem inválida');img.src=fr.result};fr.readAsDataURL(file);
 });
 charSelect.addEventListener('change',()=>setTimeout(renderProfile,0));
 const mo=new MutationObserver(()=>{const c=sys.state;if(profile.dataset.currentName!==(c.name||'')){profile.dataset.currentName=c.name||'';renderProfile()}});mo.observe($('#op-view-ficha'),{attributes:true,subtree:true,childList:true});
 renderProfile();
}
// The first page of a PDF is rendered by the native Android PdfRenderer, not via online services.
const coverKey='rpg-v09-cover';function applyCover(raw){if(!raw||!/^data:image\/(jpeg|png|webp);base64,/.test(raw))return;
  const target=$('.rpg05-cover');if(!target)return;target.innerHTML=`<img alt="Capa extraída da primeira página do PDF importado" src="${raw}">`;target.classList.add('r09-book-cover');
}
let cachedCover=get(coverKey,'');if(cachedCover)applyCover(cachedCover);
function consumeNativeCover(x){if(!x?.available)return;if(x.cover&&typeof x.cover==='string'){cachedCover=x.cover;set(coverKey,x.cover);applyCover(x.cover)}}
try{if(window.RpgBookBridge){consumeNativeCover(JSON.parse(window.RpgBookBridge.getSavedPdf()))}}catch{}
window.addEventListener('rpg-book-selected',e=>{consumeNativeCover(e.detail||{})});
// Network tool is intentionally separate from offline data. Links are only issued by the running LAN server.
const online=document.createElement('section');online.className='screen';online.id='screen-online';
online.innerHTML=`<div class="page-row"><div><div class="eyebrow">MESA MULTIJOGADOR • REDE LOCAL</div><h1 class="page-h">Sua mesa <i>conectada.</i></h1><p class="page-sub">O mestre gerencia todas as fichas; cada jogador recebe um link individual em uma porta exclusiva. A geração dos links acontece no servidor local, nunca offline.</p></div></div><div class="r09-online-pane"><h3>Servidor de mestragem</h3><p>Execute <code>python server/mesa_lan.py</code> no PC da rede. O terminal mostra o endereço do mestre e uma chave administrativa. No app Android, toque em <b>Conectar ao mestre</b>; no painel do servidor, importe as fichas locais para gerar os links reais dos jogadores.</p><div class="r09-actions"><button class="r09-action" id="r09-open-lan">Conectar ao mestre</button><button class="r09-action secondary" id="r09-json-copy">Copiar fichas locais</button><button class="r09-action secondary" id="r09-json-refresh">Exibir JSON</button></div><label for="r09-json" style="font-size:12px;color:var(--muted)">Dados para importar no servidor (ficam no seu dispositivo até serem enviados por você)</label><textarea id="r09-json" spellcheck="false" readonly aria-label="JSON das fichas locais"></textarea><p>O painel de mestre permite importar e editar todas as fichas; o jogador consegue ajustar apenas recursos atuais autorizados, sem alterar os máximos. Não exponha as portas do servidor à internet.</p></div>`;
$('#content')?.append(online);
function localCharacterJson(){return JSON.stringify(get('rpg-v05-characters',[]),null,2)}
$('#r09-json-refresh').onclick=()=>{$('#r09-json').value=localCharacterJson();app.notify('JSON gerado localmente')};
$('#r09-json-copy').onclick=()=>{const data=localCharacterJson();if(navigator.clipboard?.writeText){navigator.clipboard.writeText(data).then(()=>app.notify('Fichas copiadas')).catch(()=>{$('#r09-json').value=data;app.notify('Copie o texto do campo')})}else{$('#r09-json').value=data;$('#r09-json').select();document.execCommand('copy');app.notify('Fichas prontas para copiar')}};
$('#r09-open-lan').onclick=()=>{try{if(window.RpgLanBridge?.launchLanMaster){window.RpgLanBridge.launchLanMaster();return}}catch{}const addr=prompt('Endereço da mesa no seu computador (ex.: http://192.168.1.20:8765/)');if(!addr)return;try{const u=new URL(addr);const p=u.hostname.split('.').map(Number);if(u.protocol!=='http:'||p.length!==4||p.some(x=>!Number.isInteger(x)||x<0||x>255)||!(p[0]===10||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168))throw Error();window.location.href=u.href}catch{app.notify('Use um endereço IPv4 privado válido da sua rede.')}};
window.RPG09={rand20,roll,openHub,closeHub,applyCover,localCharacterJson};
})();
