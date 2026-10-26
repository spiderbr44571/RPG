/* Mastermind v0.79 Ateliê: independent illustrated layers, compatible with v0.77/78 saves. */
(function(root){'use strict';const DOC=root.document,ART=root.Mastermind77Assets;if(!ART)throw Error('Missing modular art renderer');
const $=s=>DOC.querySelector(s);
const TABS=[['body','Corpo / gênero'],['face','Rosto'],['skin','Pele'],['hairBack','Cabelo atrás'],['hairFront','Cabelo frontal'],['eyes','Olhos'],['brows','Sobrancelhas'],['mouth','Boca'],['outfit','Roupa'],['accessory','Acessórios'],['colors','Cores'],['background','Fundo'],['token','Token'],['finish','Finalizar']];
const GROUPS=[['customSkin','Pele','useCustomSkin'],['customHair','Cabelo','useCustomHair'],['customEyes','Olhos','useCustomEyes'],['customPrimary','Cor principal da roupa','useCustomPrimary'],['customSecondary','Cor secundária da roupa','useCustomSecondary']];
const OUTFIT_FILTERS=[['Todos',0,30],['Originais',0,10],['Viajantes',10,14],['Armaduras',14,18],['Místicos',18,22],['Modernos',22,26],['Lendários',26,30]];
const state={ready:false,selected:'body',characterId:null,appearance:{...ART.DEFAULTS},dirty:false,outfitFilter:0};
const current=()=>root.MastermindCharacters?.selected?.()||null;
const persistDraft=()=>{try{root.localStorage.setItem('mastermind-v077-atelier:'+state.characterId,JSON.stringify(state.appearance))}catch{}};
function message(v){const el=$('#m77-status');if(el)el.textContent=v;}
function draw(){const portrait=$('#m77-portrait'),token=$('#m77-token');if(!portrait||!token)return;ART.draw(portrait.getContext('2d'),portrait.width,portrait.height,state.appearance);ART.token(token.getContext('2d'),token.width,portrait,state.appearance);}
function reload(){const selected=current(),id=selected?.id||'draft';if(state.characterId===id)return;state.characterId=id;
 let draft=null;try{draft=JSON.parse(root.localStorage.getItem('mastermind-v077-atelier:'+id)||'null')}catch{};
 const stored=selected?.character?.atelier;
 state.appearance=ART.normal(draft||(stored?.version===79||stored?.version===78||stored?.version===77?stored:null)||ART.DEFAULTS);
 state.dirty=false;$('#m77-name').textContent=selected?.character?.name||selected?.name||'Personagem sem nome';
 draw();category(state.selected);message(selected?'Personalize os detalhes e salve na ficha.':'Crie uma ficha em Personagens para salvar.');
}
function changed(){state.dirty=true;draw();persistDraft();message('Aparência alterada. Salve na ficha para atualizar o token na mesa.');}
function thumb(key,index){const cfg={...state.appearance,[key]:index},el=DOC.createElement('canvas');el.width=216;el.height=266;el.className='m77-thumb';ART.draw(el.getContext('2d'),216,266,cfg);return el;}
function category(tab){if(!TABS.some(x=>x[0]===tab))tab='body';state.selected=tab;DOC.querySelectorAll('[data-m77-tab]').forEach(el=>{let active=el.dataset.m77Tab===tab;el.classList.toggle('selected',active);el.setAttribute('aria-selected',String(active));});
 const grid=$('#m77-options');if(!grid)return;grid.replaceChildren();$('#m77-section-name').textContent=TABS.find(x=>x[0]===tab)[1];
 if(tab==='finish'){grid.className='m77-finish';grid.innerHTML='<h3>Personagem pronto</h3><p>Revise o retrato e o token. Ao salvar, todas as peças e cores continuarão editáveis na ficha.</p>';return;}
 if(tab==='colors'){grid.className='m77-color-grid';colors(grid);return;}
 const key=tab==='token'?'frame':tab;grid.className=tab==='skin'?'m77-options m77-options-skin':'m77-options';let options=ART.OPTIONS[key]||[];
 if(key==='outfit'){const row=DOC.createElement('div');row.className='m78-outfit-filter';const title=DOC.createElement('span');title.textContent='Arte ilustrada · '+options.length+' variações de roupas';const select=DOC.createElement('select');select.id='m78-outfit-filter';select.setAttribute('aria-label','Filtrar modelos de roupas');OUTFIT_FILTERS.forEach(([name],i)=>{const opt=DOC.createElement('option');opt.value=String(i);opt.textContent=name;select.append(opt);});select.value=String(state.outfitFilter);row.append(title,select);grid.append(row);}
 for(let i=0;i<options.length;i++){if(key==='outfit'&&(i<OUTFIT_FILTERS[state.outfitFilter][1]||i>=OUTFIT_FILTERS[state.outfitFilter][2]))continue;const item=DOC.createElement('button');item.type='button';item.className='m77-option';item.dataset.m77Choice=String(i);item.dataset.m77Key=key;let selected=state.appearance[key]===i;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));
 if(key==='skin'){let spot=DOC.createElement('span');spot.className='m77-skin-swatch';spot.style.background=ART.COLORS.skin[i];item.append(spot);}
 else if(key==='frame'){let tile=DOC.createElement('canvas');tile.width=108;tile.height=108;tile.className='m77-thumb';ART.token(tile.getContext('2d'),108,$('#m77-portrait'),{...state.appearance,frame:i});item.append(tile);}
 else item.append(thumb(key,i));const label=DOC.createElement('small');label.textContent=options[i];item.append(label);grid.append(item);}
}
function colors(grid){const p=ART.palette(state.appearance),vals={customSkin:p.skin,customHair:p.hair,customEyes:p.eye,customPrimary:p.primary,customSecondary:p.secondary};
 for(const [key,label,flag]of GROUPS){const row=DOC.createElement('label');row.className='m77-color-row';row.innerHTML='<span>'+label+'</span><span class="m77-color-control"><input type="color" data-m77-color="'+key+'" aria-label="'+label+'"><button type="button" data-m77-reset-color="'+key+'">Padrão</button></span>';row.querySelector('input').value=state.appearance[flag]?state.appearance[key]:vals[key];grid.append(row);}
 const presets=[['hairColor','Cabelo',ART.COLORS.hair,'useCustomHair'],['eyeColor','Olhos',ART.COLORS.eye,'useCustomEyes'],['clothPrimary','Roupa principal',ART.COLORS.cloth,'useCustomPrimary'],['clothSecondary','Roupa secundária',ART.COLORS.cloth,'useCustomSecondary'],['trimColor','Acabamentos',ART.COLORS.trim,'useCustomTrim']];
 for(const [key,label,items,flag]of presets){const box=DOC.createElement('div');box.className='m77-palette';const title=DOC.createElement('strong');title.textContent=label;box.append(title);const bar=DOC.createElement('div');bar.className='m77-swatches';
 items.forEach((color,i)=>{const b=DOC.createElement('button');b.type='button';b.dataset.m77Palette=key;b.dataset.m77Index=String(i);b.style.background=color;b.setAttribute('aria-label',label+' '+(i+1));if(state.appearance[key]===i&&!state.appearance[flag])b.classList.add('selected');bar.append(b);});box.append(bar);grid.append(box);}
}
function compressed(canvas,width,height,quality){const out=DOC.createElement('canvas');out.width=width;out.height=height;out.getContext('2d').drawImage(canvas,0,0,width,height);let str=out.toDataURL('image/webp',quality);return str.startsWith('data:image/webp')?str:out.toDataURL('image/png');}
function save(){const ch=current(),api=root.MastermindCharacters;if(!ch||!api?.update){message('Crie e selecione uma ficha antes de salvar.');return;}
 let photo=compressed($('#m77-portrait'),360,446,.85),tokenImage=compressed($('#m77-token'),256,256,.82);
 // Keep existing character/server size limits while using the best feasible output.
 if(photo.length>185000)photo=compressed($('#m77-portrait'),320,396,.77);
 if(photo.length>185000)photo=compressed($('#m77-portrait'),280,346,.68);
 if(tokenImage.length>145000)tokenImage=compressed($('#m77-token'),192,192,.75);
 if(tokenImage.length>145000)tokenImage=compressed($('#m77-token'),160,160,.65);
 if(photo.length>185000||tokenImage.length>145000){message('Imagem grande demais para sincronizar.');return;}
 if(!api.update(ch.id,{atelier:{...state.appearance,version:79},photo,portrait:photo,tokenImage})){message('Não foi possível salvar na ficha.');return;}
 state.dirty=false;persistDraft();message('Retrato e token salvos na ficha '+(ch.character?.name||ch.name||'')+'.');DOC.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:ch.id,photo,tokenImage}}));
}
function download(canvas,name){canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=DOC.createElement('a');a.href=url;a.download=name+'.png';DOC.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');}
function init(){if(state.ready||!$('#screen-atelier'))return;state.ready=true;const screen=$('#screen-atelier');
 screen.addEventListener('click',e=>{const tab=e.target.closest('[data-m77-tab]');if(tab){category(tab.dataset.m77Tab);return;}
 const pick=e.target.closest('[data-m77-choice]');if(pick){const key=pick.dataset.m77Key;state.appearance[key]=Number(pick.dataset.m77Choice);changed();category(state.selected);return;}
 const swatch=e.target.closest('[data-m77-palette]');if(swatch){const key=swatch.dataset.m77Palette,flags={hairColor:'useCustomHair',eyeColor:'useCustomEyes',clothPrimary:'useCustomPrimary',clothSecondary:'useCustomSecondary'};if(flags[key])state.appearance[flags[key]]=false;state.appearance[key]=Number(swatch.dataset.m77Index);changed();category('colors');return;}
 const reset=e.target.closest('[data-m77-reset-color]');if(reset){const flag=GROUPS.find(x=>x[0]===reset.dataset.m77ResetColor)?.[2];if(flag){state.appearance[flag]=false;changed();category('colors');}return;}
 if(e.target.closest('#m77-shuffle')){state.appearance=ART.random(state.appearance);changed();category(state.selected);message('Personagem aleatório gerado. Todas as peças podem ser alteradas.');return;}
 if(e.target.closest('#m77-reset')){state.appearance={...ART.DEFAULTS};changed();category(state.selected);return;}
 if(e.target.closest('#m77-save')){save();return;}
 if(e.target.closest('#m77-export-token')){download($('#m77-token'),'mastermind-token');return;}
 if(e.target.closest('#m77-export-portrait')){download($('#m77-portrait'),'mastermind-retrato');return;}
 if(e.target.closest('#m77-sheet')){root.RPG_DEMO?.navigate('sheet');return;}
 });
 screen.addEventListener('change',e=>{if(e.target.id==='m78-outfit-filter'){state.outfitFilter=Number(e.target.value)||0;category('outfit');}});
 screen.addEventListener('input',e=>{const input=e.target.closest('[data-m77-color]');if(!input)return;const row=GROUPS.find(x=>x[0]===input.dataset.m77Color);if(!row)return;state.appearance[row[2]]=true;state.appearance[row[0]]=input.value;changed();});
 DOC.addEventListener('rpg:character-selected',()=>{state.characterId=null;reload();});
 DOC.addEventListener('click',e=>{if(e.target.closest('[data-screen="atelier"],[data-r09-tool="atelier"],#rpg05-open-atelier')){state.characterId=null;reload();}});
 state.characterId=null;reload();category('body');
}
root.MastermindAtelier={init,save,draw,category,state,engine:ART};if(DOC.readyState==='loading')DOC.addEventListener('DOMContentLoaded',init);else init();
})(typeof window!=='undefined'?window:globalThis);