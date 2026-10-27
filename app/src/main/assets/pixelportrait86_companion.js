/* Mastermind v0.86: companion to the original lyime Pixel Portrait Creator.
 * The editor itself runs on lyime's own website or in the Windows download.
 * No lyime executables, resources or sprites are bundled or redistributed.
 */
(function(root){'use strict';
const DOC=root.document;
const get=id=>DOC.getElementById(id);
const portrait=get('p86-portrait'),token=get('p86-token'),fileInput=get('p86-import');
if(!portrait||!token||!fileInput)return;
const pc=portrait.getContext('2d'),tc=token.getContext('2d');
const status=get('p86-status'),zoomInput=get('p86-zoom'),zText=get('p86-zoom-label');
const border=get('p86-frame'),characterName=get('p86-character');
const CREATOR_PAGE='https://lyime.itch.io/pixel-portrait-creator';
const MAX_BYTES=10*1024*1024;
const state={image:null,imageUrl:null,zoom:1,offsetX:0,offsetY:0,characterId:null,drag:null,sequence:0};
const DIM=256;
function message(value,error=false){status.textContent=value;status.classList.toggle('p86-error',error);}
function api(){return root.MastermindCharacters;}
function selectedId(){return api()?.selectedId?.()||null;}
function selectedRecord(){return api()?.selected?.()||null;}
function filename(which){
 const name=(selectedRecord()?.character?.name||selectedRecord()?.name||'personagem')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]/g,'-').slice(0,50);
 return 'mastermind-lyime-'+which+'-'+name+'.png';
}
function resetLayout(){state.zoom=1;state.offsetX=state.offsetY=0;zoomInput.value='1';zText.textContent='100%';}
function placeholder(){
 pc.clearRect(0,0,DIM,DIM);
 pc.fillStyle='#24202e';pc.fillRect(0,0,DIM,DIM);
 pc.strokeStyle='#a78c66';pc.lineWidth=2;pc.strokeRect(11,11,DIM-22,DIM-22);
 pc.fillStyle='#d5c09a';pc.font='bold 16px system-ui';pc.textAlign='center';
 pc.fillText('Imagem não importada',DIM/2,119);
 pc.font='12px system-ui';pc.fillText('Escolha um PNG ou captura',DIM/2,141);
}
function portraitBounds(){
 if(!state.image)return null;
 const im=state.image,scale=Math.max(DIM/im.naturalWidth,DIM/im.naturalHeight)*state.zoom;
 return {x:(DIM-im.naturalWidth*scale)/2+state.offsetX,y:(DIM-im.naturalHeight*scale)/2+state.offsetY,w:im.naturalWidth*scale,h:im.naturalHeight*scale};
}
function drawPortrait(){
 if(!state.image){placeholder();return;}
 pc.clearRect(0,0,DIM,DIM);
 pc.imageSmoothingEnabled=false;
 const r=portraitBounds();
 pc.drawImage(state.image,r.x,r.y,r.w,r.h);
}
function drawToken(){
 tc.clearRect(0,0,DIM,DIM);
 tc.save();
 tc.beginPath();tc.arc(DIM/2,DIM/2,117,0,Math.PI*2);tc.clip();
 if(state.image)tc.drawImage(portrait,10,10,236,236);
 else{tc.fillStyle='#24202e';tc.fillRect(0,0,DIM,DIM);}
 tc.restore();
 tc.strokeStyle=border.value==='silver'?'#c4cad0':border.value==='dark'?'#4b4556':'#d4ac6b';
 tc.lineWidth=9;tc.beginPath();tc.arc(DIM/2,DIM/2,119,0,Math.PI*2);tc.stroke();
 tc.strokeStyle='#171820';tc.lineWidth=3;tc.beginPath();tc.arc(DIM/2,DIM/2,113,0,Math.PI*2);tc.stroke();
}
function draw(){drawPortrait();drawToken();}
function clearImage(){
 if(state.imageUrl){URL.revokeObjectURL(state.imageUrl);state.imageUrl=null;}
 state.image=null;state.sequence++;fileInput.value='';resetLayout();draw();
 message('Importe o retrato exportado pelo lyime ou uma captura da versão online.');
}
function applyImage(src,onDone){
 const id=++state.sequence;
 const im=new Image();
 im.onload=()=>{
  if(id!==state.sequence)return;
  const w=im.naturalWidth,h=im.naturalHeight;
  if(!w||!h||w>8192||h>8192||w*h>24000000){message('Imagem muito grande. Use uma foto menor que 24 megapixels.',true);return;}
  state.image=im;resetLayout();draw();
  message('Imagem carregada ('+w+' × '+h+'). Ajuste a área arrastando e use o zoom; depois salve na ficha.');
  if(onDone)onDone();
 };
 im.onerror=()=>{if(id===state.sequence)message('Não foi possível abrir a imagem. Use PNG, JPG ou WebP.',true);};
 im.src=src;
}
fileInput.addEventListener('change',()=>{
 const f=fileInput.files?.[0];if(!f)return;
 if(f.size>MAX_BYTES){message('Arquivo muito grande. Limite: 10 MB.',true);return;}
 if(!/^image\/(?:png|jpe?g|webp)$/i.test(f.type||'')&&!/\.(png|jpe?g|webp)$/i.test(f.name||'')){
  message('Formato não suportado. Escolha PNG, JPG ou WebP.',true);return;
 }
 if(state.imageUrl){URL.revokeObjectURL(state.imageUrl);state.imageUrl=null;}
 const url=URL.createObjectURL(f);state.imageUrl=url;applyImage(url);
});
zoomInput.addEventListener('input',()=>{
 state.zoom=Math.max(1,Math.min(16,Number(zoomInput.value)||1));zText.textContent=Math.round(state.zoom*100)+'%';draw();
});
border.addEventListener('change',draw);
portrait.style.touchAction='none';
portrait.addEventListener('pointerdown',e=>{
 if(!state.image)return;
 e.preventDefault();portrait.setPointerCapture?.(e.pointerId);
 state.drag={id:e.pointerId,x:e.clientX,y:e.clientY};
});
portrait.addEventListener('pointermove',e=>{
 if(!state.drag||state.drag.id!==e.pointerId||!state.image)return;
 e.preventDefault();
 const box=portrait.getBoundingClientRect();
 if(!box.width||!box.height)return;
 state.offsetX+=(e.clientX-state.drag.x)*(DIM/box.width);
 state.offsetY+=(e.clientY-state.drag.y)*(DIM/box.height);
 state.drag.x=e.clientX;state.drag.y=e.clientY;draw();
});
for(const name of ['pointerup','pointercancel','lostpointercapture']){
 portrait.addEventListener(name,e=>{if(state.drag?.id===e.pointerId)state.drag=null;});
}
function launch(mode){
 // Native Android bridge opens an allowlisted URL outside the app. No remote JS is
 // loaded in Mastermind's trusted WebView (which exposes offline data bridges).
 const native=root.RpgPixelPortraitBridge;
 if(mode==='online'&&native?.openOnline){native.openOnline();message('Abrindo o Pixel Portrait Creator dentro do Mastermind...');return;}
 if(mode==='browser'&&native?.openBrowser){native.openBrowser();return;}
 if(mode==='download'&&native?.openDownload){native.openDownload();return;}
 const url=mode==='download'?CREATOR_PAGE+'#download':CREATOR_PAGE;
 const tab=root.open(url,'_blank','noopener,noreferrer');
 if(!tab)message('Abra no navegador: '+CREATOR_PAGE);
}
function save(){
 const id=selectedId();
 if(!state.image){message('Importe uma imagem antes de salvar.',true);return;}
 if(!id||!api()?.update){message('Crie ou selecione uma ficha no Mastermind primeiro.',true);return;}
 draw();
 const photo=portrait.toDataURL('image/png'),tokenImage=token.toDataURL('image/png');
 if(photo.length>1800000||tokenImage.length>1200000){message('A imagem ultrapassa o tamanho permitido na ficha.',true);return;}
 const patch={photo,tokenImage,portraitEditor:{source:'lyime-pixel-portrait-creator',version:86,mode:'external-import'}};
 if(!api().update(id,patch)){message('Falha ao atualizar esta ficha. Confira o espaço de armazenamento.',true);return;}
 DOC.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:id}}));
 message('Retrato e token salvos na ficha selecionada.');
}
function exportPng(which){
 if(!state.image){message('Importe a imagem antes de exportar.',true);return;}
 draw();
 const canvas=which==='token'?token:portrait;
 const raw=canvas.toDataURL('image/png');
 const name=filename(which);
 if(root.RpgSheetPdfBridge?.savePng){
  root.RpgSheetPdfBridge.savePng(name,raw.split(',')[1]);
  message('Escolha onde salvar '+name+' no Android.');
  return;
 }
 const a=DOC.createElement('a');a.href=raw;a.download=name;DOC.body.appendChild(a);a.click();a.remove();
 message('Exportação iniciada: '+name);
}
function openSheet(){api()?.open?.(selectedId())||root.RPG_DEMO?.navigate('sheet');}
function syncCharacter(){
 const id=selectedId();
 if(id===state.characterId)return;
 state.characterId=id;
 const r=selectedRecord();
 characterName.textContent=r?.character?.name||r?.name||'Selecione uma ficha';
 // Only restore a previously imported lyime portrait; never change images
 // from other editors or transfer between characters.
 if(r?.character?.portraitEditor?.source==='lyime-pixel-portrait-creator'&&
    /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(r.character.photo||'')){
  applyImage(r.character.photo);
 }else clearImage();
}
DOC.addEventListener('click',e=>{
 const action=e.target.closest('[data-p86-action]')?.dataset.p86Action;
 if(!action)return;
 switch(action){
 case 'online':launch('online');break;
 case 'browser':launch('browser');break;
 case 'download':launch('download');break;
 case 'save':save();break;
 case 'exportPortrait':exportPng('portrait');break;
 case 'exportToken':exportPng('token');break;
 case 'resetCrop':resetLayout();draw();break;
 case 'clear':clearImage();break;
 case 'sheet':openSheet();break;
 }
});
DOC.addEventListener('rpg:character-selected',syncCharacter);
DOC.getElementById('rpg05-char-select')?.addEventListener('change',()=>root.setTimeout(syncCharacter,0));
function consumeNativeCapture(){
 const native=root.RpgPixelPortraitBridge;
 if(!native?.consumeCapture)return;
 try{
  const value=native.consumeCapture();
  if(typeof value==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]{100,}$/.test(value)){
   applyImage(value);
   message('Captura do editor incorporado recebida. Arraste o recorte para focar somente no personagem.');
  }
 }catch(error){message('A captura ainda não está disponível. Use Importar PNG.',true);}
}
DOC.addEventListener('mastermind:lyime-capture-ready',consumeNativeCapture);
DOC.addEventListener('visibilitychange',()=>{if(!DOC.hidden){syncCharacter();consumeNativeCapture();}});
root.PixelPortrait86={save,draw,syncCharacter,state,launch,consumeNativeCapture};
syncCharacter();draw();
})(typeof window!=='undefined'?window:globalThis);
