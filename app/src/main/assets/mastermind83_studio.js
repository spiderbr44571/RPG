/* Mastermind 0.83 — entirely new pixel-art builder. No old Atelier code is invoked. */
(function(root){'use strict';
const D=root.document,R=root.MM83;
if(!R)throw Error('Pixel Studio renderer missing');
const $=sel=>D.querySelector(sel),STORAGE='mastermind-pixel-studio-v083:';
const EXTRA={skin:'Pele',background:'Cenário',frame:'Moldura',palette:'Paletas'};
const COLORS=[['skin','Pele'],['hair','Cabelo'],['eye','Íris'],['main','Roupa principal'],['secondary','Roupa secundária'],['metal','Metais'],['leather','Couro'],['blush','Detalhes do rosto']];
const state={ready:false,characterId:null,tab:'frontHair',cfg:R.merge(R.DEFAULTS),dirty:false};
function sheet(){return root.MastermindCharacters?.selected?.()||null;}
function status(message){const el=$('#mm83-status');if(el)el.textContent=message;}
function draft(id){try{return JSON.parse(root.localStorage.getItem(STORAGE+id)||'null')}catch{return null}}
function keep(){try{root.localStorage.setItem(STORAGE+state.characterId,JSON.stringify(state.cfg))}catch{}}
function paint(){const portrait=$('#mm83-portrait'),token=$('#mm83-token');if(!portrait||!token)return;
 R.render(portrait.getContext('2d'),portrait.width,portrait.height,state.cfg);
 R.token(token.getContext('2d'),token.width,portrait,state.cfg);
 const stamp=$('#mm83-render-state');if(stamp)stamp.textContent=R.isReady()?'PIXEL ART · 192×224':'ATELIÊ NÃO CARREGADO';}
function title(k){return (R.MENU.find(x=>x[0]===k)||[null,EXTRA[k]])[1]||k;}
function list(){const area=$('#mm83-choices');if(!area)return;
 area.replaceChildren();const cat=state.tab;
 $('#mm83-current-category').textContent=title(cat);
 if(cat==='palette'){showPalette(area);return;}
 if(cat==='skin'){showSkin(area);return;}
 const opts=R.OPTIONS[cat]||(cat==='background'?['Obsidiana','Marinho','Bosque','Carmesim','Luar','Pergaminho','Inverno']:cat==='frame'?['Bronze','Prata','Arcano','Rubi','Quadrado','Sem moldura']:[]);
 area.className='mm83-choices';for(let i=0;i<opts.length;i++){
  const btn=D.createElement('button');btn.type='button';btn.className='mm83-choice';btn.dataset.mm83Option=String(i);btn.dataset.mm83Key=cat;
  btn.setAttribute('aria-label',opts[i]);const checked=state.cfg[cat]===i;btn.setAttribute('aria-pressed',String(checked));btn.classList.toggle('is-selected',checked);
  const preview=D.createElement('canvas');preview.width=150;preview.height=166;preview.className='mm83-choice-art';preview.style.imageRendering='pixelated';
  if(R.isReady())R.thumb(preview.getContext('2d'),150,166,{...state.cfg,[cat]:i},cat);
  btn.append(preview);const label=D.createElement('span');label.textContent=opts[i];btn.append(label);area.append(btn);
 }
}
function showSkin(area){area.className='mm83-palette-grid';for(let i=0;i<R.COLORS.skin.length;i++){
  const b=D.createElement('button');b.type='button';b.className='mm83-color-chip';b.dataset.mm83Option=String(i);b.dataset.mm83Key='skin';b.classList.toggle('is-selected',state.cfg.skin===i&&!state.cfg.custom.skin);
  b.style.setProperty('--swatch',R.COLORS.skin[i]);const title=D.createElement('span');title.textContent='Tom '+(i+1);b.append(title);area.append(b);
 }}
function showPalette(area){area.className='mm83-palette-groups';for(const [key,label] of COLORS){
  const row=D.createElement('section');row.className='mm83-palette-row';const head=D.createElement('div');head.className='mm83-palette-head';const strong=D.createElement('strong');strong.textContent=label;head.append(strong);
  const pick=D.createElement('input');pick.type='color';pick.setAttribute('aria-label','Cor personalizada: '+label);pick.dataset.mm83Picker=key;pick.value=R.palette(state.cfg)[key];head.append(pick);row.append(head);
  const swatches=D.createElement('div');swatches.className='mm83-swatches';R.COLORS[key].forEach((c,i)=>{const b=D.createElement('button');b.type='button';b.dataset.mm83Swatch=key;b.dataset.mm83Index=String(i);b.style.background=c;b.setAttribute('aria-label',label+' '+(i+1));b.classList.toggle('is-selected',!state.cfg.custom[key]&&(key==='skin'?state.cfg.skin:state.cfg.colors[key])===i);swatches.append(b);});row.append(swatches);area.append(row);
 }}
function activate(tab){const exists=R.MENU.some(([key])=>key===tab);state.tab=exists?tab:'frontHair';D.querySelectorAll('[data-mm83-tab]').forEach(el=>{const active=el.dataset.mm83Tab===state.tab;el.classList.toggle('is-selected',active);el.setAttribute('aria-selected',String(active));});list();}
function mutated(rebuild=true){state.dirty=true;keep();paint();if(rebuild)list();else D.querySelectorAll('[data-mm83-option]').forEach(el=>{const checked=state.cfg[el.dataset.mm83Key]===Number(el.dataset.mm83Option);el.classList.toggle('is-selected',checked);el.setAttribute('aria-pressed',String(checked));});status('Alteração aplicada. Salve na ficha para atualizar o token.');}
function reload(){const selected=sheet(),id=selected?.id||'rascunho';if(state.characterId===id)return;
 state.characterId=id;const stored=selected?.character?.atelier;
 // A new pixel art rig must never reuse the old vector configuration; only v0.83 records migrate.
 state.cfg=R.merge(draft(id)||(stored?.version===83?stored:null)||R.DEFAULTS);state.dirty=false;
 const name=$('#mm83-name');if(name)name.textContent=selected?.character?.name||selected?.name||'Novo personagem';
 paint();list();status(R.isReady()?'Monte seu personagem usando peças pixel art novas.':R.status()==='error'?'Falha ao carregar o atlas: '+R.error():'Inicializando o ateliê pixel art...');}
function exportImage(canvas,filename){if(!R.isReady()){status('As sprites ainda não estão disponíveis.');return;}
 canvas.toBlob(blob=>{if(!blob){status('Não foi possível exportar o PNG.');return;}
 const url=URL.createObjectURL(blob),a=D.createElement('a');a.href=url;a.download=filename+'.png';D.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 },'image/png');}
function compact(canvas,w,h,quality){const c=D.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(canvas,0,0,w,h);const d=c.toDataURL('image/webp',quality);return d.startsWith('data:image/webp')?d:c.toDataURL('image/png');}
function pack(canvas,variants,limit){for(const [w,h,q] of variants){const result=compact(canvas,w,h,q);if(result.length<=limit)return result;}return null;}
function save(){if(!R.isReady()){status('Ainda não é possível salvar: '+(R.error()||'sprites indisponíveis'));return;}
 const ch=sheet(),api=root.MastermindCharacters;if(!ch||!api?.update){status('Crie ou selecione uma ficha antes de salvar.');return;}
 const image=pack($('#mm83-portrait'),[[576,672,.89],[480,560,.84],[384,448,.8],[288,336,.72]],185000);
 const token=pack($('#mm83-token'),[[384,384,.90],[256,256,.84],[192,192,.75]],145000);
 if(!image||!token){status('Retrato muito grande para salvar.');return;}
 const cfg=R.merge(state.cfg);if(!api.update(ch.id,{atelier:cfg,photo:image,portrait:image,tokenImage:token})){status('Falha ao salvar na ficha.');return;}
 keep();state.dirty=false;status('Pixel art e token salvos na ficha.');D.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:ch.id,photo:image,tokenImage:token}}));}
function randomize(){const c=R.merge(state.cfg);for(const [key,n] of Object.entries(R.COUNT))c[key]=Math.floor(Math.random()*n);c.skin=Math.floor(Math.random()*R.COLORS.skin.length);c.eyes=Math.floor(Math.random()*R.COUNT.eyes);
 for(const [key,arr]of Object.entries(R.COLORS)){if(key!=='skin')c.colors[key]=Math.floor(Math.random()*arr.length);}c.custom={};return R.merge(c);}
function init(){const panel=$('#screen-atelier');if(!panel||state.ready)return;state.ready=true;
 const nav=$('#mm83-category-list');if(nav){for(const [key,label] of R.MENU){const button=D.createElement('button');button.type='button';button.dataset.mm83Tab=key;button.textContent=label;button.setAttribute('role','tab');button.className='mm83-category';nav.append(button);}}
 panel.addEventListener('click',e=>{
  const tab=e.target.closest('[data-mm83-tab]');if(tab){activate(tab.dataset.mm83Tab);return;}
  const item=e.target.closest('[data-mm83-option]');if(item){state.cfg[item.dataset.mm83Key]=Number(item.dataset.mm83Option);if(item.dataset.mm83Key==='skin')delete state.cfg.custom.skin;mutated();return;}
  const sw=e.target.closest('[data-mm83-swatch]');if(sw){const k=sw.dataset.mm83Swatch;delete state.cfg.custom[k];if(k==='skin')state.cfg.skin=Number(sw.dataset.mm83Index);else state.cfg.colors[k]=Number(sw.dataset.mm83Index);mutated();return;}
  if(e.target.closest('#mm83-random')){state.cfg=randomize();mutated();return;}
  if(e.target.closest('#mm83-reset')){state.cfg=R.merge(R.DEFAULTS);mutated();return;}
  if(e.target.closest('#mm83-save')){save();return;}
  if(e.target.closest('#mm83-export-portrait')){exportImage($('#mm83-portrait'),'mastermind-pixel-art');return;}
  if(e.target.closest('#mm83-export-token')){exportImage($('#mm83-token'),'mastermind-token');return;}
  if(e.target.closest('#mm83-sheet')){root.RPG_DEMO?.navigate?.('sheet');return;}
 });
 panel.addEventListener('input',e=>{if(e.target.dataset.mm83Picker){state.cfg.custom[e.target.dataset.mm83Picker]=e.target.value;mutated(false);}});
 D.addEventListener('rpg:character-selected',()=>{state.characterId=null;reload();});
 D.addEventListener('click',e=>{if(e.target.closest('[data-screen="atelier"],[data-r09-tool="atelier"],#rpg05-open-atelier')){state.characterId=null;reload();}});
 R.subscribe((kind,msg)=>{paint();list();status(kind==='ready'?'107 sprites pixel art carregados. Escolha suas peças e personalize.':'Falha ao inicializar o novo ateliê: '+msg);});
 reload();activate('frontHair');}
root.MastermindAtelier={init,reload,draw:paint,save,state,engine:R,category:activate};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);