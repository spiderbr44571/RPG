/* MASTERMIND v0.82 — full pixel-art character editor with color-indexed native sprites. */
(function(root){'use strict';
const D=root.document,A=root.Mastermind82Rig;
if(!A)throw Error('Mastermind82Rig required');
const $=s=>D.querySelector(s), storage='mastermind-v082-pixel:';
const TABS=[['body','Corpo'],['face','Rosto'],['ears','Orelhas'],['skin','Pele'],['eyes','Olhos'],['brows','Sobrancelhas'],['nose','Nariz'],['mouth','Boca'],['hairBack','Cabelo de trás'],['hairFront','Cabelo frontal'],['beard','Barba'],['outfit','Roupas'],['cloak','Capas e mantos'],['armor','Armaduras'],['accessory','Acessórios'],['colors','Cores'],['background','Cenário'],['frame','Moldura']];
const COLOR_GROUPS=[['skin','Pele','customSkin','useCustomSkin','skin'],['hair','Cabelo','customHair','useCustomHair','hairColor'],['eyes','Olhos','customEyes','useCustomEyes','eyeColor'],['cloth','Tecido principal','customPrimary','useCustomPrimary','clothPrimary'],['cloth','Tecido secundário','customSecondary','useCustomSecondary','clothSecondary'],['trim','Metais e detalhes','customTrim','useCustomTrim','trimColor']];
const state={ready:false,category:'hairFront',characterId:null,appearance:A.norm(A.DEFAULTS),dirty:false,paintSeq:0};
const sel=()=>root.MastermindCharacters?.selected?.()||null;
function status(msg){const el=$('#m81-status');if(el)el.textContent=msg;}
function canvas(which){return which==='portrait'?$('#m81-portrait'):$('#m81-token')}
function draw(){const portrait=canvas('portrait'),token=canvas('token');if(!portrait||!token)return;
 A.portrait(portrait.getContext('2d'),portrait.width,portrait.height,state.appearance);
 A.token(token.getContext('2d'),token.width,portrait,state.appearance);}
function getDraft(id){try{return JSON.parse(root.localStorage.getItem(storage+id)||'null')}catch{return null}}
function persist(){try{root.localStorage.setItem(storage+state.characterId,JSON.stringify(state.appearance))}catch{}}
function reload(){
 const selected=sel(),id=selected?.id||'draft';if(state.characterId===id)return;
 state.characterId=id;const stored=selected?.character?.atelier,oldDraft=(()=>{try{return JSON.parse(root.localStorage.getItem('mastermind-v077-atelier:'+id)||'null')}catch{return null}})();
 const draft=getDraft(id),old81=(()=>{try{return JSON.parse(root.localStorage.getItem('mastermind-v081-rig:'+id)||'null')}catch{return null}})();
 // Older, fully customizable features migrate by key. Finished preset illustrations
 // intentionally aren't reused (the requested old editor and gallery were removed).
 const source=draft||stored||old81||oldDraft||A.DEFAULTS;
 state.appearance=A.norm(source);
 state.dirty=false;
 const name=$('#m81-name');if(name)name.textContent=selected?.character?.name||selected?.name||'Personagem sem nome';
 draw();options();status(!A.isReady()?'Carregando 116 sprites pixel art...':selected?'Editor pixel art pronto. Edite as peças e salve na ficha.':'Monte um personagem em pixel art e crie uma ficha para salvar.');
}
function changed(){state.dirty=true;persist();draw();options(false);status('Visual atualizado. Salve na ficha para atualizar retrato e token.');}
function chooseTab(cat){if(cat==='finish')cat='outfit';if(!TABS.some(x=>x[0]===cat))cat='outfit';
 state.category=cat;D.querySelectorAll('[data-m81-tab]').forEach(n=>{const active=n.dataset.m81Tab===cat;n.classList.toggle('selected',active);n.setAttribute('aria-selected',String(active));});
 options();}
function drawThumb(key,i){const c=D.createElement('canvas');c.width=168;c.height=208;c.className='m81-thumb';c.style.imageRendering='pixelated';A.portrait(c.getContext('2d'),168,208,{...state.appearance,[key]:i});return c;}
function options(rebuild=true){
 const area=$('#m81-options');if(!area)return;
 const key=state.category,title=$('#m81-section-name');if(title)title.textContent=TABS.find(([id])=>id===key)?.[1]||'Personalização';
 if(!rebuild){area.querySelectorAll('[data-m81-option]').forEach(btn=>{btn.classList.toggle('selected',Number(btn.dataset.m81Option)===state.appearance[key]);btn.setAttribute('aria-pressed',String(Number(btn.dataset.m81Option)===state.appearance[key]));});return;}
 area.replaceChildren();
 if(key==='colors'){colors(area);return;}
 area.className='m81-options';
 const arr=A.OPTIONS[key]||[];for(let i=0;i<arr.length;i++){
 const b=D.createElement('button');b.type='button';b.className='m81-option';b.dataset.m81Option=String(i);b.dataset.m81Key=key;
 b.setAttribute('aria-pressed',String(i===state.appearance[key]));
 if(i===state.appearance[key])b.classList.add('selected');
 if(key==='skin'){const sw=D.createElement('span');sw.className='m81-skin-swatch';sw.style.background=A.COLORS.skin[i];b.append(sw);}
 else b.append(drawThumb(key,i));
 const label=D.createElement('small');label.textContent=arr[i];b.append(label);area.append(b);
 }
}
function colors(area){area.className='m81-colors';const p=A.pal(state.appearance);
 for(const [family,label,custom,flag,key] of COLOR_GROUPS){
  const row=D.createElement('section');row.className='m81-color-item';
  const heading=D.createElement('strong');heading.textContent=label;row.append(heading);
  const picker=D.createElement('input');picker.type='color';picker.dataset.m81Color=custom;picker.setAttribute('aria-label','Alterar '+label);
  const selectedColor=family==='cloth'?(key==='clothPrimary'?p.primary:p.secondary):p[family==='eyes'?'eye':family==='skin'?'skin':family==='hair'?'hair':'trim'];
  picker.value=selectedColor;row.append(picker);
  const bar=D.createElement('div');bar.className='m81-swatches';
  A.COLORS[family].forEach((color,i)=>{const b=D.createElement('button');b.type='button';b.dataset.m81Swatch=key;b.dataset.m81Index=String(i);b.setAttribute('aria-label',label+' '+(i+1));b.style.background=color;
   if(!state.appearance[flag]&&state.appearance[key]===i)b.classList.add('selected');bar.append(b);});
  row.append(bar);area.append(row);
 }
}
function compress(source,w,h,q){const out=D.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(source,0,0,w,h);let data=out.toDataURL('image/webp',q);return data.startsWith('data:image/webp')?data:out.toDataURL('image/png')}
function pack(source,variants,max){
 for(const [w,h,q] of variants){let data=compress(source,w,h,q);if(data.length<=max)return data;}return null;
}
function save(){
 const ch=sel(),api=root.MastermindCharacters;if(!ch||!api?.update){status('Crie e selecione uma ficha antes de salvar.');return;}
 if(!A.isReady()){status('Sprites ainda não carregados. Confira os arquivos pixel art.');return;}
 const photo=pack(canvas('portrait'),[[420,520,.85],[360,446,.78],[300,371,.72],[260,322,.62]],185000);
 const tokenImage=pack(canvas('token'),[[256,256,.88],[192,192,.75],[160,160,.68]],145000);
 if(!photo||!tokenImage){status('A imagem excedeu o limite de sincronização. Tente outra aparência.');return;}
 const record={...state.appearance,version:82};
 if(!api.update(ch.id,{atelier:record,photo,portrait:photo,tokenImage})){status('Não foi possível salvar na ficha.');return;}
 state.dirty=false;persist();status('Aparência e token salvos na ficha.');
 D.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:ch.id,photo,tokenImage}}));
}
function download(source,name){source.toBlob(blob=>{if(!blob){status('Falha ao exportar PNG.');return;}let url=URL.createObjectURL(blob),a=D.createElement('a');a.href=url;a.download=name+'.png';D.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)},'image/png');}
function init(){const screen=$('#screen-atelier');if(!screen||state.ready)return;state.ready=true;
 screen.addEventListener('click',e=>{
 const tab=e.target.closest('[data-m81-tab]');if(tab){chooseTab(tab.dataset.m81Tab);return;}
 const btn=e.target.closest('[data-m81-option]');if(btn){state.appearance[btn.dataset.m81Key]=Number(btn.dataset.m81Option);changed();return;}
 const sw=e.target.closest('[data-m81-swatch]');if(sw){
  const key=sw.dataset.m81Swatch,flag={hairColor:'useCustomHair',eyeColor:'useCustomEyes',clothPrimary:'useCustomPrimary',clothSecondary:'useCustomSecondary',trimColor:'useCustomTrim',skin:'useCustomSkin'}[key];
  if(flag)state.appearance[flag]=false;state.appearance[key]=Number(sw.dataset.m81Index);changed();options();return;}
 if(e.target.closest('#m81-shuffle')){state.appearance=A.random(state.appearance);changed();options();return;}
 if(e.target.closest('#m81-reset')){state.appearance=A.norm(A.DEFAULTS);changed();options();return;}
 if(e.target.closest('#m81-save')){save();return;}
 if(e.target.closest('#m81-export-token')){download(canvas('token'),'mastermind-token');return;}
 if(e.target.closest('#m81-export-portrait')){download(canvas('portrait'),'mastermind-retrato');return;}
 if(e.target.closest('#m81-sheet')){root.RPG_DEMO?.navigate('sheet');return;}
 });
 screen.addEventListener('input',e=>{const input=e.target.closest('[data-m81-color]');if(!input)return;
 const group=COLOR_GROUPS.find(v=>v[2]===input.dataset.m81Color);if(!group)return;
 state.appearance[group[3]]=true;state.appearance[group[2]]=input.value;state.dirty=true;persist();draw();status('Cor personalizada aplicada. Salve na ficha quando concluir.');});
 D.addEventListener('rpg:character-selected',()=>{state.characterId=null;reload()});
 D.addEventListener('click',e=>{if(e.target.closest('[data-screen="atelier"],[data-r09-tool="atelier"],#rpg05-open-atelier')){state.characterId=null;reload()}});
 D.addEventListener('mastermind82:ready',()=>{draw();options();status('116 sprites pixel art carregados. Todas as categorias estão prontas.');});
 D.addEventListener('mastermind82:failed',()=>status('Erro ao carregar atlas pixel art. Verifique a instalação do APK.'));
 reload();chooseTab('hairFront');
}
root.MastermindAtelier={init,reload,draw,save,state,engine:A,category:chooseTab};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);