/* Mastermind 0.85 – character studio built around the original Nonemo CC0 pack.
   All exported content is assembled from licensed user-provided assets. */
(function(root){'use strict';
const A=root.Nonemo85, D=root.document;
if(!A||!D)return;
const $=s=>D.querySelector(s);
const portrait=$('#n85-canvas'),token=$('#n85-token'),grid=$('#n85-grid'),cats=$('#n85-cats');
if(!portrait||!token||!grid||!cats)return;
const state={config:A.normal(A.defaults),category:'hairFront',characterId:null,previewDirty:true};
const DEFAULT_CATEGORY='hairFront';
const uiStatus=$('#n85-status');
function message(msg){if(uiStatus)uiStatus.textContent=msg;}
function current(){return root.MastermindCharacters?.selected?.()||null;}
function selectedId(){return root.MastermindCharacters?.selectedId?.()||null;}
function storageKey(id){return 'mastermind-nonemo85-draft-'+id;}
function initForCharacter(){const id=selectedId();if(id===state.characterId)return;
 state.characterId=id;
 const selected=current();let cfg=selected?.character?.atelier;
 if(!(cfg&&cfg.version===85&&cfg.source==='nonemo')){
   try{cfg=JSON.parse(localStorage.getItem(storageKey(id))||'null')}catch{cfg=null;}}
 state.config=A.normal(cfg&&cfg.version===85?cfg:A.defaults);
 updatePortrait();drawOptions();updateName();}
function updateName(){const selected=current();$('#n85-character-name').textContent=selected?.character?.name||selected?.name||'Novo personagem';}
let drawing=false;
function updatePortrait(){if(drawing)return;drawing=true;
 try{const cx=portrait.getContext('2d',{alpha:true}),tk=token.getContext('2d',{alpha:true});
 A.draw(cx,portrait.width,portrait.height,state.config,false);
 A.token(tk,token.width,portrait);
 }catch(err){message('Falha ao desenhar personagem: '+err.message);console.error(err)}finally{drawing=false;}}
let redrawQueued=false;
A.onReady(()=>{if(redrawQueued)return;redrawQueued=true;setTimeout(()=>{redrawQueued=false;updatePortrait();paintOptionCanvases();},40)});
function configChanged(){updatePortrait();paintOptionCanvases();try{if(state.characterId)localStorage.setItem(storageKey(state.characterId),JSON.stringify(state.config));}catch{}
 message('Aparência atualizada. Salve na ficha para aplicar o retrato e o token.');}
function activeCategory(){return A.categories.find(c=>c.id===state.category)||A.categories[0]}
function drawCats(){cats.replaceChildren();for(const cat of A.categories){const b=D.createElement('button');b.type='button';b.className='n85-cat'+(state.category===cat.id?' selected':'');b.dataset.n85Category=cat.id;b.textContent=cat.label;b.setAttribute('aria-pressed',String(state.category===cat.id));cats.appendChild(b);}}
function drawOptions(){drawCats();const cat=activeCategory();$('#n85-options-title').textContent=cat.title;$('#n85-options-count').textContent=cat.options.length+' opções originais';grid.replaceChildren();
 for(const name of cat.options){const card=D.createElement('button');card.type='button';card.className='n85-choice';card.dataset.n85Choice=name;card.setAttribute('aria-pressed',String(state.config[cat.id]===name));
 if((cat.id==='hairColor'||cat.id==='beardColor'||cat.id==='shirtColor'||cat.id==='sleeveColor')&&A.swatches[name]){const swatch=D.createElement('span');swatch.className='n85-swatch';swatch.style.background=A.swatches[name];card.appendChild(swatch);}else{const img=D.createElement('canvas');img.width=174;img.height=192;img.dataset.n85Preview=name;card.appendChild(img)}
 const label=D.createElement('span');label.textContent=A.labels[name]||A.backgrounds.find(c=>c.id===name)?.name||name;card.appendChild(label);grid.appendChild(card);}
 const custom=state.config.expression==='custom';let hint='Peças originais em PNG 2×. Não misturamos pacotes nem deslocamos o rosto.';
 if(cat.id==='eye'||cat.id==='mouth')hint='Escolher olhos ou boca ativa a opção Expressões → Olhos + boca para combinar peças independentes.';
 if(cat.id==='expression'&&custom)hint='Olhos + boca permite combinar partes independentes; expressões completas usam o sprite de rosto do autor.';
 $('#n85-hint').textContent=hint;paintOptionCanvases();}
function paintOptionCanvases(){const cat=activeCategory();for(const canvas of grid.querySelectorAll('canvas[data-n85-preview]')){
 const cfg=A.normal({...state.config,[cat.id]:canvas.dataset.n85Preview});if(cat.id==='eye'||cat.id==='mouth')cfg.expression='custom';
 A.draw(canvas.getContext('2d'),canvas.width,canvas.height,cfg,false);
 }}
function applyChoice(name){const cat=activeCategory();if(!cat.options.includes(name))return;state.config=A.normal({...state.config,[cat.id]:name});
 if(cat.id==='eye'||cat.id==='mouth')state.config.expression='custom';drawOptions();configChanged();}
function save(){const id=selectedId(),api=root.MastermindCharacters;if(!id||!api?.update){message('Crie e selecione uma ficha antes de salvar.');return;}
 // Ensure sprite decoding completed before persisting the preview; repeated capture
 // of an unfinished canvas would otherwise save a permanently blank portrait.
 if(!A.readyFor(state.config)){message('As imagens originais ainda estão carregando.');return;}
 updatePortrait();
 const photo=portrait.toDataURL('image/png');const savedToken=token.toDataURL('image/png');
 const patch={photo,tokenImage:savedToken,atelier:{...state.config,version:85,source:'nonemo'}};
 if(!api.update(id,patch)){message('Não foi possível salvar na ficha selecionada.');return;}
 message('Retrato e token salvos na ficha atual.');
 D.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:id}}));
 }
function exportPng(which){const canvas=which==='token'?token:portrait;
 const name='mastermind-'+(which==='token'?'token':'retrato')+'-'+(state.characterId||'personagem').replace(/[^A-Za-z0-9_-]/g,'').slice(0,46)+'.png';
 if(!A.readyFor(state.config)){message('A arte ainda está carregando; tente novamente após a prévia aparecer.');return;}
 const data=canvas.toDataURL('image/png');
 if(root.RpgSheetPdfBridge?.savePng){root.RpgSheetPdfBridge.savePng(name,data.split(',')[1]);message('Escolha onde salvar '+name+' no Android.');return;}
 const link=D.createElement('a');link.href=data;link.download=name;link.style.display='none';D.body.append(link);link.click();link.remove();message('Exportação PNG iniciada.');}
function random(){state.config=A.random();drawOptions();configChanged();}
function reset(){state.config=A.normal(A.defaults);drawOptions();configChanged();}
function openSheet(){root.MastermindCharacters?.open?.(selectedId())||root.RPG_DEMO?.navigate('sheet')}
D.addEventListener('click',e=>{const b=e.target.closest('[data-n85-category],[data-n85-choice],[data-n85-action]');if(!b)return;
 if(b.dataset.n85Category){state.category=b.dataset.n85Category;drawOptions();return}
 if(b.dataset.n85Choice){applyChoice(b.dataset.n85Choice);return}
 switch(b.dataset.n85Action){case 'save':save();break;case 'reset':reset();break;case 'random':random();break;case 'exportPortrait':exportPng('portrait');break;case 'exportToken':exportPng('token');break;case 'sheet':openSheet();break;}
});
const select=$('#rpg05-char-select');select?.addEventListener('change',()=>setTimeout(initForCharacter,0));
D.addEventListener('mastermind:character-change',()=>initForCharacter());
D.addEventListener('visibilitychange',()=>{if(!D.hidden)initForCharacter()});
if(root.MutationObserver&&select){new MutationObserver(()=>initForCharacter()).observe(select,{attributes:true,attributeFilter:['value']});}
window.Nonemo85Studio={state,initForCharacter,drawOptions,updatePortrait,save};
initForCharacter();drawOptions();updatePortrait();
message('180 assets originais CC0 de nemo carregadas offline. Selecione as peças e salve na ficha.');
})(typeof window!=='undefined'?window:globalThis);