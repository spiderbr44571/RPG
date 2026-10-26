/* Mastermind v0.76 — Ateliê de Personagens. Original AI-generated fantasy assets.
   Offline, editable, per-character JSON. No voice menu. No image generation API. */
(function(root){
'use strict';
const DOC=root.document;
const $=(selector,rootEl=DOC)=>rootEl.querySelector(selector);
const escapeHtml=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sourceWidth=1448,sourceHeight=1086,atlasWidth=900,atlasHeight=675;
const atlases={f:'atelier/feminino.webp',m:'atelier/masculino.webp',o:'atelier/roupas.webp',u:'atelier/interface.webp'};
const portraits=[
 {id:'f1',name:'Exploradora ornamentada',pack:'f',rect:[617,57,510,598]},
 {id:'m1',name:'Viajante místico',pack:'m',rect:[591,54,540,615]},
 {id:'f2',name:'Aventureira de tecido',pack:'o',rect:[581,804,285,282]},
 {id:'f3',name:'Ocultista do bosque',pack:'o',rect:[850,802,285,284]},
 {id:'f4',name:'Retrato de medalhão',pack:'u',rect:[763,781,280,280]},
 {id:'f5',name:'Retrato de moldura',pack:'u',rect:[1085,782,295,272]}
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
const categoryLabels={portrait:'Retrato',hair:'Cabelos',eyes:'Olhos',brows:'Sobrancelhas',mouth:'Expressões',outfit:'Roupas',cape:'Capas',accessory:'Acessórios',frame:'Molduras'};
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
 const bg=config.background||'#16111f';ctx.clearRect(0,0,width,height);
 const gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,bg);gradient.addColorStop(1,'#0e1423');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 const inner=ctx.createRadialGradient(width*.5,height*.4,10,width*.5,height*.4,width*.72);
 inner.addColorStop(0,config.accent+'63');inner.addColorStop(1,'#00000000');ctx.fillStyle=inner;ctx.fillRect(0,0,width,height);
 ctx.strokeStyle=config.accent+'8c';ctx.lineWidth=4;ctx.strokeRect(9,9,width-18,height-18);
 if(config.mode==='portrait'){
  const candidate=portraits.find(x=>x.id===config.portrait)||portraits[0];
  // Full production illustration is preserved rather than reassembling unaligned head art.
  crop(ctx,candidate,width*.025,height*.015,width*.95,height*.94);
 }else{
  const outfit=item('outfit',config.outfit);
  const hair=item('hair',config.hair);
  crop(ctx,outfit,width*.09,height*.45,width*.82,height*.53);
  crop(ctx,hair,width*.27,height*.055,width*.47,height*.58);
  crop(ctx,item('eyes',config.eyes),width*.355,height*.305,width*.30,height*.09,.92);
  crop(ctx,item('brows',config.brows),width*.39,height*.29,width*.22,height*.045,.90);
  crop(ctx,item('mouth',config.mouth),width*.43,height*.39,width*.14,height*.055,.83);
  if(config.showCape)crop(ctx,item('cape',config.cape),width*.10,height*.44,width*.80,height*.35,.84);
  if(config.showAccessory)crop(ctx,item('accessory',config.accessory),width*.53,height*.56,width*.23,height*.20,.94);
 }
 ctx.fillStyle=config.accent;ctx.fillRect(9,height-14,width-18,5);
}
function renderToken(ctx,portrait,config,size=256){
 ctx.clearRect(0,0,size,size);const frame=tokenFrames.find(f=>f.id===config.frame)||tokenFrames[0];
 const radius=frame.shape==='circle'?size/2-12:20;
 ctx.save();ctx.beginPath();if(frame.shape==='circle')ctx.arc(size/2,size/2,size/2-10,0,Math.PI*2);else roundRect(ctx,10,10,size-20,size-20,15);ctx.clip();
 ctx.drawImage(portrait,0,portrait.height*.07,portrait.width,portrait.height*.77,10,10,size-20,size-20);ctx.restore();
 ctx.strokeStyle='#0b0a13';ctx.lineWidth=12;ctx.beginPath();if(frame.shape==='circle')ctx.arc(size/2,size/2,size/2-10,0,Math.PI*2);else roundRect(ctx,10,10,size-20,size-20,15);ctx.stroke();
 ctx.strokeStyle=frame.color;ctx.lineWidth=6;ctx.beginPath();if(frame.shape==='circle')ctx.arc(size/2,size/2,size/2-10,0,Math.PI*2);else roundRect(ctx,10,10,size-20,size-20,15);ctx.stroke();
}
function renderCanvases(){const portrait=$('#m76-portrait-canvas'),token=$('#m76-token-canvas');if(!portrait||!token)return;
 renderPortrait(portrait.getContext('2d'),portrait.width,portrait.height,state.appearance);
 renderToken(token.getContext('2d'),portrait,state.appearance,token.width);
}
function tile(entry,selected){
 return '<button type="button" class="m76-tile'+(selected?' active':'')+'" data-m76-choice="'+escapeHtml(entry.id)+'" title="'+escapeHtml(entry.name)+'" aria-pressed="'+(selected?'true':'false')+'">'+
 '<canvas class="m76-tile-image" data-m76-thumbnail="'+escapeHtml(entry.id)+'" width="116" height="108" aria-hidden="true"></canvas>'+
 '<small>'+escapeHtml(entry.name)+'</small></button>';
}
function renderThumbnails(){
 const group=$('#m76-pieces');if(!group)return;
 const collection=itemsFor(state.selected,state.appearance.gender);
 for(const canvas of group.querySelectorAll('[data-m76-thumbnail]')){
  const entry=collection.find(x=>x.id===canvas.dataset.m76Thumbnail);
  if(!entry)continue;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(state.selected==='frame'){
    const source=$('#m76-portrait-canvas');
    if(source)renderToken(ctx,source,{...state.appearance,frame:entry.id},Math.min(canvas.width,canvas.height));
    continue;
  }
  const [, ,width,height]=entry.rect||[0,0,120,120];
  const scale=Math.min(108/Math.max(1,width),105/Math.max(1,height));
  const w=width*scale,h=height*scale;
  crop(ctx,entry,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 }
}
function chooseCategory(category){state.selected=category;const group=$('#m76-pieces');if(!group)return;
 const sel=state.appearance[category];group.innerHTML=itemsFor(category,state.appearance.gender).map(i=>tile(i,i.id===sel)).join('');
 renderThumbnails();
 DOC.querySelectorAll('[data-m76-category]').forEach(b=>b.classList.toggle('active',b.dataset.m76Category===category));
 $('#m76-piece-heading').textContent=categoryLabels[category];
}
function saveStorage(){const id=state.characterId||'draft';try{localStorage.setItem('mastermind-v076-atelier:'+id,JSON.stringify(state.appearance))}catch{}}
function fetchCharacter(){const api=root.MastermindCharacters;
 return api?.selected?.()||null;
}
function loadCurrent(){const sel=fetchCharacter();const id=sel?.id||'draft';
 if(state.characterId===id)return;state.characterId=id;
 let config=null;try{const raw=localStorage.getItem('mastermind-v076-atelier:'+id);config=raw?JSON.parse(raw):null}catch{}
 const embedded=sel?.character?.atelier;
 state.appearance={...defaults,...(config||embedded||{})};state.edited=false;
 $('#m76-char-name').textContent=sel?.character?.name||sel?.name||'Personagem sem nome';
 $('#m76-mode').value=state.appearance.mode;
 $('#m76-gender').value=state.appearance.gender;
 $('#m76-accent').value=state.appearance.accent;
 $('#m76-background').value=state.appearance.background;
 $('#m76-show-cape').checked=!!state.appearance.showCape;
 $('#m76-show-accessory').checked=!!state.appearance.showAccessory;
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
function init(){if(state.initialized)return;const screen=$('#screen-atelier');if(!screen)return;state.initialized=true;
 for(const src of Object.keys(atlases)){const im=image(src);im.onload=()=>{if(state.initialized){renderCanvases();renderThumbnails()}};}
 screen.addEventListener('click',event=>{
  const tab=event.target.closest('[data-m76-category]');if(tab){chooseCategory(tab.dataset.m76Category);return}
  const chosen=event.target.closest('[data-m76-choice]');if(chosen){state.appearance[state.selected]=chosen.dataset.m76Choice;state.edited=true;chooseCategory(state.selected);draw();return}
  const preset=event.target.closest('[data-m76-palette]');if(preset){state.appearance.accent=preset.dataset.m76Palette;$('#m76-accent').value=state.appearance.accent;draw();return}
  if(event.target.closest('#m76-save')){persistAppearance();return}
  if(event.target.closest('#m76-export-portrait')){downloadCanvas($('#m76-portrait-canvas'),'mastermind-retrato');return}
  if(event.target.closest('#m76-export-token')){downloadCanvas($('#m76-token-canvas'),'mastermind-token');return}
  if(event.target.closest('#m76-open-sheet')){root.RPG_DEMO?.navigate('sheet');return}
 });
 screen.addEventListener('change',event=>{const id=event.target.id;
  if(id==='m76-mode')state.appearance.mode=event.target.value;
  if(id==='m76-gender'){state.appearance.gender=event.target.value;state.appearance.hair='hair-'+state.appearance.gender+'0';chooseCategory(state.selected)}
  if(id==='m76-accent')state.appearance.accent=event.target.value;
  if(id==='m76-background')state.appearance.background=event.target.value;
  if(id==='m76-show-cape')state.appearance.showCape=event.target.checked;
  if(id==='m76-show-accessory')state.appearance.showAccessory=event.target.checked;
  state.edited=true;draw();
 });
 DOC.addEventListener('rpg:character-selected',()=>{state.characterId='';loadCurrent()});
 DOC.addEventListener('click',event=>{if(event.target.closest('[data-screen="atelier"],[data-r09-tool="atelier"],#rpg05-open-atelier')){state.characterId='';loadCurrent()}});
 chooseCategory('portrait');loadCurrent();
}
root.MastermindAtelier={init,renderCanvases,persistAppearance,sourceWidth,sourceHeight,itemsFor,defaults,portraits,tokenFrames,atlases};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MastermindAtelier;
if(DOC){if(DOC.readyState==='loading')DOC.addEventListener('DOMContentLoaded',init,{once:true});else setTimeout(init,0)}
})(typeof window!=='undefined'?window:globalThis);