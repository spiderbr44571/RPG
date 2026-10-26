/* Mastermind v0.76 — Ateliê de Personagens. Original AI-generated fantasy assets.
   Offline, editable, per-character JSON. No voice menu. No image generation API. */
(function(root){
'use strict';
const DOC=root.document;
const $=(selector,rootEl=DOC)=>rootEl.querySelector(selector);
const escapeHtml=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sourceWidth=1448,sourceHeight=1086,atlasWidth=900,atlasHeight=675;
const atlases={f:'atelier/feminino.webp',m:'atelier/masculino.webp',o:'atelier/roupas.webp',u:'atelier/interface.webp'};
// v0.76.2: complete, already illustrated portrait regions. Never assemble
// facial parts cut from unrelated characters. No external images or AI calls.
const portraits=[
 {id:'f1',name:'Exploradora ornamentada',family:'Aventureira',pack:'f',rect:[774,90,294,535]},
 {id:'m1',name:'Viajante místico',family:'Arcano',pack:'m',rect:[752,80,310,525]},
 {id:'f2',name:'Viajante cerimonial',family:'Cerimonial',pack:'o',rect:[650,816,200,268]},
 {id:'f3',name:'Investigadora sombria',family:'Investigadora',pack:'o',rect:[902,816,163,268]},
 {id:'f4',name:'Medalhão de aventureira',family:'Nobre',pack:'u',rect:[762,777,288,277]},
 {id:'f5',name:'Retrato heráldico',family:'Heráldico',pack:'u',rect:[1086,782,304,274]}
];
const hairs={f:[
 [4,65,174,214],[185,67,176,218],[364,68,185,224],[3,275,182,245],[195,281,181,250]
],m:[[0,65,165,215],[177,69,170,217],[359,63,179,227],[0,269,180,266],[185,270,178,265],[365,270,180,268]]};
const eyeRects=[[1100,63,145,69],[1250,63,163,69],[1100,145,145,72],[1250,145,163,72]];
const browRects=[[1114,273,71,49],[1194,273,72,49],[1270,273,72,49],[1351,273,79,49]];
const mouthRects=[[1104,387,81,94],[1188,387,78,94],[1274,387,77,94],[1354,387,86,94]];
const outfits=[
 [0,61,174,265],[180,61,179,265],[363,61,178,265],[544,61,180,265],
 [729,61,178,265],[917,61,177,265],[1095,61,180,265],[1267,61,181,265]
];
const capes=[[0,380,215,226],[219,380,226,225],[449,380,225,225],[678,380,220,225],[900,380,222,225],[1120,380,280,225]];
const accessories=[[6,626,95,160],[101,626,115,155],[215,626,122,156],[340,626,126,158],[482,622,122,161],[617,618,110,163],[738,618,118,162],[860,618,125,162]];
const tokenFrames=[{id:'round',name:'Circular',shape:'circle',color:'#d5ad5f'},
 {id:'square',name:'Quadrado',shape:'square',color:'#d5ad5f'},
 {id:'emerald',name:'Esmeralda',shape:'circle',color:'#54c6b0'},
 {id:'gold',name:'Dourado',shape:'circle',color:'#f0c16c'},
 {id:'simple',name:'Simples',shape:'circle',color:'#aab3c5'}];
const categoryLabels={portrait:'Retratos',frame:'Molduras',background:'Fundos',token:'Token',finish:'Finalizar'};
const categoryIcons={portrait:'user-round',hair:'scissors',eyes:'eye',brows:'scan-eye',mouth:'smile',outfit:'shirt',cape:'layers',accessory:'gem',frame:'circle-dot'};
const region=(pack,rect,id,name)=>({pack,rect,id,name});
function itemsFor(category,g){
 const genders=Object.keys(hairs),hairPack=g==='m'?'m':'f';
 const choices={
 portrait:portraits,
 hair:hairs[hairPack].map((r,i)=>region(hairPack,r,'hair-'+hairPack+i,'Cabelo '+(i+1))),
 eyes:eyeRects.map((r,i)=>region('f',r,'eyes-'+i,'Olhar '+(i+1))),
 brows:browRects.map((r,i)=>region('f',r,'brows-'+i,'Sobrancelha '+(i+1))),
 mouth:mouthRects.map((r,i)=>region('f',r,'mouth-'+i,'Expressão '+(i+1))),
 outfit:outfits.map((r,i)=>region('o',r,'outfit-'+i,'Roupa '+(i+1))),
 cape:capes.map((r,i)=>region('o',r,'cape-'+i,'Capa '+(i+1))),
 accessory:accessories.map((r,i)=>region('o',r,'accessory-'+i,'Acessório '+(i+1))),
 frame:tokenFrames.map(x=>({...x,pack:'u',rect:[10,790,240,265]}))
 };
 return choices[category]||[];
}
const presets=['#174d53','#ca9d66','#b4c1a3','#533246','#744b7c','#e2b56f'];
const defaults={gender:'f',mode:'portrait',portrait:'f1',hair:'hair-f0',eyes:'eyes-0',brows:'brows-0',mouth:'mouth-0',outfit:'outfit-0',cape:'cape-0',accessory:'accessory-0',frame:'round',accent:'#167a7b',background:'#15151e',showCape:false,showAccessory:false};
const state={selected:'portrait',appearance:{...defaults},characterId:'',edited:false,initialized:false};
const imageCache=new Map();
function image(pack){if(imageCache.has(pack))return imageCache.get(pack);
 const im=new Image();im.src=atlases[pack];imageCache.set(pack,im);return im;}
function item(category,id){return itemsFor(category,state.appearance.gender).find(x=>x.id===id)||itemsFor(category,state.appearance.gender)[0];}
function crop(ctx,part,x,y,w,h,alpha=1){if(!part||!part.rect)return;
 const im=image(part.pack);if(!im.complete||!im.naturalWidth)return;
 const [left,top,width,height]=part.rect,scaleX=im.naturalWidth/sourceWidth,scaleY=im.naturalHeight/sourceHeight;
 ctx.save();ctx.globalAlpha=alpha;
 ctx.drawImage(im,left*scaleX,top*scaleY,width*scaleX,height*scaleY,x,y,w,h);ctx.restore();}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?.(x,y,w,h,r);if(!ctx.roundRect){ctx.rect(x,y,w,h)}ctx.closePath();}
function renderPortrait(ctx,width,height,config){
 ctx.clearRect(0,0,width,height);
 const bg=/^#[0-9a-f]{6}$/i.test(config.background)?config.background:'#15151e';
 const gradient=ctx.createLinearGradient(0,0,width,height);
 gradient.addColorStop(0,bg);gradient.addColorStop(1,'#0c1320');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 const glow=ctx.createRadialGradient(width*.53,height*.42,width*.02,width*.53,height*.42,width*.70);
 glow.addColorStop(0,(config.accent||'#167a7b')+'55');glow.addColorStop(1,'#00000000');
 ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 const chosen=portraits.find(x=>x.id===config.portrait)||portraits[0];
 const rect=chosen.rect;
 const intrinsic=rect[2]/rect[3];
 // Contain: preserve portrait's original aspect ratio; never stretch, stack or cut facial pieces.
 const maxW=width*.96,maxH=height*.94;
 const dw=Math.min(maxW,maxH*intrinsic),dh=dw/intrinsic;
 crop(ctx,chosen,(width-dw)/2,(height-dh)/2,dw,dh);
 ctx.strokeStyle=(config.accent||'#167a7b')+'a5';ctx.lineWidth=3;
 ctx.strokeRect(9,9,width-18,height-18);
 ctx.fillStyle=config.accent||'#167a7b';
 ctx.fillRect(10,height-14,width-20,4);
}
function renderToken(ctx,portrait,config,size=256){
 ctx.clearRect(0,0,size,size);
 const frame=tokenFrames.find(x=>x.id===config.frame)||tokenFrames[0];
 const round=frame.shape==='circle';
 ctx.save();
 ctx.beginPath();
 if(round)ctx.arc(size/2,size/2,size/2-11,0,Math.PI*2);
 else roundRect(ctx,11,11,size-22,size-22,15);
 ctx.clip();
 // Center-cropped and scaled; no deformation or reuse of disjoint atlas pieces.
 const side=Math.min(portrait.width,portrait.height*.86);
 const sx=(portrait.width-side)/2,sy=(portrait.height-side)/2;
 ctx.drawImage(portrait,sx,sy,side,side,10,10,size-20,size-20);
 ctx.restore();
 for(const [color,weight] of [['#0b0a13',12],[frame.color,5]]){
  ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();
  if(round)ctx.arc(size/2,size/2,size/2-11,0,Math.PI*2);
  else roundRect(ctx,11,11,size-22,size-22,15);
  ctx.stroke();
 }
}
function renderCanvases(){const portrait=$('#m76-portrait-canvas'),token=$('#m76-token-canvas');if(!portrait||!token)return;
 renderPortrait(portrait.getContext('2d'),portrait.width,portrait.height,state.appearance);
 renderToken(token.getContext('2d'),portrait,state.appearance,token.width);
}
const backgroundPresets=[
 {id:'night',name:'Noite',color:'#15151e'},
 {id:'teal',name:'Oceano',color:'#163d47'},
 {id:'forest',name:'Floresta',color:'#253b30'},
 {id:'royal',name:'Realeza',color:'#3b2a4b'},
 {id:'ember',name:'Brasa',color:'#59362d'},
 {id:'golden',name:'Deserto',color:'#73583b'},
 {id:'neutral',name:'Grafite',color:'#34363e'},
 {id:'parchment',name:'Pergaminho',color:'#795c4d'}
];
function tile(entry,selected){
 return '<button type="button" class="m76-tile'+(selected?' active':'')+
  '" data-m76-choice="'+escapeHtml(entry.id)+'" aria-pressed="'+(selected?'true':'false')+'">'+
  '<canvas class="m76-tile-image" data-m76-thumbnail="'+escapeHtml(entry.id)+'" width="116" height="108" aria-hidden="true"></canvas>'+
  '<small>'+escapeHtml(entry.name)+'</small>'+
  (entry.family?'<span class="m762-family">'+escapeHtml(entry.family)+'</span>':'')+'</button>';
}
function renderThumbnails(){
 const group=$('#m76-pieces');if(!group)return;
 const options=state.selected==='portrait'?portraits:state.selected==='frame'||state.selected==='token'?tokenFrames:backgroundPresets;
 for(const cv of group.querySelectorAll('[data-m76-thumbnail]')){
  const entry=options.find(x=>x.id===cv.dataset.m76Thumbnail);
  if(!entry)continue;
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
  if(state.selected==='portrait'){
   const r=entry.rect,ratio=r[2]/r[3],maxW=106,maxH=100;
   const width=Math.min(maxW,maxH*ratio),height=width/ratio;
   crop(ctx,entry,(cv.width-width)/2,(cv.height-height)/2,width,height);
  }else if(state.selected==='frame'||state.selected==='token'){
   const source=$('#m76-portrait-canvas');if(source)renderToken(ctx,source,{...state.appearance,frame:entry.id},Math.min(cv.width,cv.height));
  }else{
   const gradient=ctx.createLinearGradient(0,0,116,108);
   gradient.addColorStop(0,entry.color);gradient.addColorStop(1,'#0e1521');
   ctx.fillStyle=gradient;ctx.fillRect(2,2,112,104);
   ctx.strokeStyle=state.appearance.accent;ctx.strokeRect(6,6,104,96);
  }
 }
}
function chooseCategory(category){
 if(!Object.prototype.hasOwnProperty.call(categoryLabels,category))category='portrait';
 state.selected=category;
 const group=$('#m76-pieces');
 if(!group)return;
 const labels=$('#m76-piece-heading');if(labels)labels.textContent=categoryLabels[category];
 DOC.querySelectorAll('[data-m76-category]').forEach(b=>{
  b.classList.toggle('active',b.dataset.m76Category===category);
  b.setAttribute('aria-selected',String(b.dataset.m76Category===category));
 });
 const options=category==='portrait'?portraits:category==='frame'||category==='token'?tokenFrames:
  category==='background'?backgroundPresets:[];
 if(category==='finish'){
  group.innerHTML='<div class="m762-finish-copy"><h3>Personagem pronto</h3><p>Revise o retrato e o token. Ao salvar, a aparência ficará vinculada à ficha selecionada.</p><p>Você também pode exportar os dois arquivos PNG.</p></div>';
 }else{
  group.innerHTML=options.map(entry=>tile(entry,category==='portrait'?entry.id===state.appearance.portrait:
   category==='frame'||category==='token'?entry.id===state.appearance.frame:entry.color===state.appearance.background)).join('');
 }
 renderThumbnails();
}
function saveStorage(){const id=state.characterId||'draft';try{localStorage.setItem('mastermind-v076-atelier:'+id,JSON.stringify(state.appearance))}catch{}}
function fetchCharacter(){const api=root.MastermindCharacters;
 return api?.selected?.()||null;
}
function loadCurrent(){
 const sel=fetchCharacter(),id=sel?.id||'draft';
 if(state.characterId===id)return;
 state.characterId=id;
 let config=null;
 try{const raw=localStorage.getItem('mastermind-v076-atelier:'+id);config=raw?JSON.parse(raw):null}catch{}
 const embedded=sel?.character?.atelier;
 state.appearance={...defaults,...(config||embedded||{}),mode:'portrait'};
 if(!portraits.some(p=>p.id===state.appearance.portrait))state.appearance.portrait=portraits[0].id;
 if(!tokenFrames.some(p=>p.id===state.appearance.frame))state.appearance.frame='round';
 if(!/^#[0-9a-f]{6}$/i.test(state.appearance.background))state.appearance.background='#15151e';
 state.edited=false;
 const name=$('#m76-char-name');if(name)name.textContent=sel?.character?.name||sel?.name||'Personagem sem nome';
 const accent=$('#m76-accent');if(accent)accent.value=state.appearance.accent;
 const background=$('#m76-background');if(background)background.value=state.appearance.background;
 chooseCategory(state.selected);renderCanvases();
}
function renderStatus(message){const target=$('#m76-status');if(target)target.textContent=message}
function compressPortrait(){const original=$('#m76-portrait-canvas');const cv=DOC.createElement('canvas');cv.width=280;cv.height=360;cv.getContext('2d').drawImage(original,0,0,280,360);
 let url=cv.toDataURL('image/webp',.72);if(!url.startsWith('data:image/webp'))url=cv.toDataURL('image/png');
 return url;
}
function compressToken(){const original=$('#m76-token-canvas');const cv=DOC.createElement('canvas');cv.width=160;cv.height=160;cv.getContext('2d').drawImage(original,0,0,160,160);
 let url=cv.toDataURL('image/webp',.70);if(!url.startsWith('data:image/webp'))url=cv.toDataURL('image/png');
 return url;
}
function persistAppearance(){const api=root.MastermindCharacters;const char=fetchCharacter();if(!api||!char){renderStatus('Crie uma ficha em Personagens para vincular a aparência.');return}
 const photo=compressPortrait(),tokenImage=compressToken();
 if(photo.length>190000||tokenImage.length>150000){renderStatus('Imagem muito grande para a ficha. Tente outra combinação.');return}
 const ok=api.update(char.id,{atelier:{...state.appearance},photo,portrait:photo,tokenImage});
 if(!ok){renderStatus('Não foi possível atualizar a ficha.');return}
 saveStorage();state.edited=false;renderStatus('Retrato e token salvos na ficha '+(char.character?.name||char.name)+'.');
 DOC.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:char.id,photo,tokenImage}}));
}
function downloadCanvas(cv,name){cv.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=DOC.createElement('a');a.href=url;a.download=name+'.png';DOC.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)},'image/png')}
function draw(){renderCanvases();saveStorage();renderStatus('Prévia atualizada. Salve na ficha quando estiver satisfeito.');}
function init(){
 if(state.initialized)return;
 const screen=$('#screen-atelier');if(!screen)return;
 state.initialized=true;
 for(const src of Object.keys(atlases)){
  const im=image(src);
  im.onload=()=>{if(state.initialized){renderCanvases();renderThumbnails()}};
 }
 screen.addEventListener('click',event=>{
  const tab=event.target.closest('[data-m76-category]');
  if(tab){chooseCategory(tab.dataset.m76Category);return}
  const option=event.target.closest('[data-m76-choice]');
  if(option){
   if(state.selected==='portrait')state.appearance.portrait=option.dataset.m76Choice;
   else if(state.selected==='frame'||state.selected==='token')state.appearance.frame=option.dataset.m76Choice;
   else if(state.selected==='background'){
    const color=backgroundPresets.find(x=>x.id===option.dataset.m76Choice)?.color;
    if(color)state.appearance.background=color;
    const el=$('#m76-background');if(el)el.value=state.appearance.background;
   }
   state.appearance.mode='portrait';state.edited=true;
   renderCanvases();chooseCategory(state.selected);saveStorage();renderStatus('Prévia atualizada.');
   return;
  }
  const palette=event.target.closest('[data-m76-palette]');
  if(palette){state.appearance.accent=palette.dataset.m76Palette;
   const field=$('#m76-accent');if(field)field.value=state.appearance.accent;
   draw();return}
  if(event.target.closest('#m762-random')){
   const choices=portraits.filter(x=>x.id!==state.appearance.portrait);
   const next=choices[Math.floor(Math.random()*choices.length)];
   if(next){state.appearance.portrait=next.id;state.appearance.mode='portrait';
    state.edited=true;chooseCategory('portrait');draw();}
   return;
  }
  if(event.target.closest('#m76-save')){persistAppearance();return}
  if(event.target.closest('#m76-export-portrait')){downloadCanvas($('#m76-portrait-canvas'),'mastermind-retrato');return}
  if(event.target.closest('#m76-export-token')){downloadCanvas($('#m76-token-canvas'),'mastermind-token');return}
  if(event.target.closest('#m76-open-sheet')){root.RPG_DEMO?.navigate('sheet');return}
 });
 screen.addEventListener('change',event=>{
  if(event.target.id==='m76-accent')state.appearance.accent=event.target.value;
  if(event.target.id==='m76-background')state.appearance.background=event.target.value;
  state.appearance.mode='portrait';state.edited=true;draw();chooseCategory(state.selected);
 });
 DOC.addEventListener('rpg:character-selected',()=>{state.characterId='';loadCurrent()});
 DOC.addEventListener('click',event=>{
  if(event.target.closest('[data-screen="atelier"],[data-r09-tool="atelier"],#rpg05-open-atelier')){
   state.characterId='';loadCurrent();
  }
 });
 chooseCategory('portrait');loadCurrent();
}
root.MastermindAtelier={init,renderCanvases,persistAppearance,sourceWidth,sourceHeight,itemsFor,defaults,portraits,tokenFrames,atlases,backgroundPresets,chooseCategory};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MastermindAtelier;
if(DOC){if(DOC.readyState==='loading')DOC.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0)}
})(typeof window!=='undefined'?window:globalThis);