/* Mastermind v0.40 - cartões de imagens locais para o canvas infinito. */
(()=>{
'use strict';
const app=window.RPG_DEMO, game=window.RPGv2, viewport=document.getElementById('canvas-viewport');
if(!app||!game||!viewport)return;
const KEY='rpg_canvas_v2', MAX_IMAGE=10*1024*1024, MAX_DATA_LENGTH=510000;
const MIME=new Set(['image/jpeg','image/png','image/webp']);
const toast=message=>app.notify&&app.notify(message);
const safeImage=data=>typeof data==='string'&&data.length<=MAX_DATA_LENGTH&&/^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/=]+$/i.test(data);
function snapshot(){
 return JSON.stringify({nodes:app.S.nodes,panX:app.S.panX,panY:app.S.panY,zoom:app.S.zoom});
}
function persist(){
 try{localStorage.setItem(KEY,snapshot());return true}
 catch(error){toast('Canvas sem espaço no armazenamento. Remova imagens ou exporte sua campanha.');return false}
}
game.saveCanvas=persist;
const originalRender=app.renderCanvas.bind(app);
function putImages(){
 const layer=document.getElementById('node-layer');
 if(!layer)return;
 for(const element of layer.querySelectorAll('[data-node]')){
  const node=app.S.nodes.find(n=>String(n.id)===element.dataset.node);
  if(!node||node.type!=='IMAGEM'||!safeImage(node.imageData))continue;
  element.classList.add('mm40-image-node');
  const w=Math.min(850,Math.max(200,Number(node.width)||320));
  element.style.width=w+'px';
  const figure=document.createElement('figure');figure.className='mm40-image-wrap';
  const image=document.createElement('img');image.src=node.imageData;image.alt=node.title||'Imagem de campanha';image.draggable=false;image.loading='lazy';
  figure.append(image);
  const footer=element.querySelector('.node-footer');
  if(footer){footer.textContent='Imagem da campanha · arraste para mover';footer.before(figure)}
  else element.append(figure);
  const text=element.querySelector('p');
  if(text&&!text.textContent.trim())text.remove();
  const resize=document.createElement('button');
  resize.className='mm40-image-resize';resize.type='button';resize.title='Arrastar para redimensionar';
  resize.setAttribute('aria-label','Redimensionar imagem');resize.textContent='↘';
  let initial=null;
  resize.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;
   event.stopPropagation();event.preventDefault();
   initial={pointer:event.pointerId,x:event.clientX,w:element.getBoundingClientRect().width/app.S.zoom};
   resize.setPointerCapture(event.pointerId);
  });
  resize.addEventListener('pointermove',event=>{
   if(!initial||initial.pointer!==event.pointerId)return;
   event.stopPropagation();event.preventDefault();
   node.width=Math.round(Math.max(200,Math.min(850,initial.w+(event.clientX-initial.x)/app.S.zoom)));
   element.style.width=node.width+'px';
  });
  const done=event=>{
   if(!initial||initial.pointer!==event.pointerId)return;
   event.stopPropagation();initial=null;persist();
  };
  resize.addEventListener('pointerup',done);
  resize.addEventListener('pointercancel',done);
  element.append(resize);
 }
}
app.renderCanvas=function(){originalRender();putImages()};
putImages();
function readImage(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('Falha ao ler arquivo'));
  reader.onload=()=>{
   const img=new Image();
   img.onerror=()=>reject(new Error('Imagem inválida'));
   img.onload=()=>resolve(img);
   img.src=reader.result;
  };
  reader.readAsDataURL(file);
 });
}
function compress(image){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Processamento de imagem indisponível');
 for(const side of [1200,1000,800,650,500]){
  const ratio=Math.min(1,side/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.86,.73,.6]){
   const data=canvas.toDataURL('image/webp',quality);
   if(safeImage(data))return data;
  }
 }
 throw new Error('Imagem grande demais para o Canvas. Tente uma foto menor.');
}
let busy=false;
async function addFiles(files){
 if(busy)return;
 busy=true;
 try{
  for(const file of files){
   if(app.S.nodes.length>=500){toast('Limite de 500 cartões atingido.');break}
   if(!MIME.has(file.type)||file.size>MAX_IMAGE||!file.size){
    toast('Use PNG, JPG ou WebP de até 10 MB.');continue;
   }
   try{
    const data=compress(await readImage(file));
    const rect=viewport.getBoundingClientRect(),offset=app.S.nodes.length%8*20;
    const node={
     id:Date.now()+Math.random(),title:(file.name.replace(/\.[^.]+$/,'')||'Imagem').slice(0,110),
     type:'IMAGEM',text:'',imageData:data,width:320,
     left:(rect.width*.45-app.S.panX)/app.S.zoom+offset,
     top:(rect.height*.35-app.S.panY)/app.S.zoom+offset,theme:''
    };
    app.S.nodes.push(node);
    if(!persist()){app.S.nodes.pop();break}
    app.renderCanvas();
    toast('Imagem adicionada ao Canvas.');
   }catch(error){toast(error.message||'Não foi possível adicionar a imagem.')}
  }
 }finally{busy=false}
}
const addNode=document.getElementById('add-node');
const addImage=document.createElement('button');
addImage.id='mm40-add-image';addImage.type='button';addImage.className='btn-dark btn-small';
addImage.textContent='▣ Adicionar imagem';
const picker=document.createElement('input');
picker.id='mm40-image-picker';picker.type='file';picker.hidden=true;picker.accept='image/jpeg,image/png,image/webp';picker.multiple=true;
if(addNode){addNode.insertAdjacentElement('afterend',addImage);addNode.insertAdjacentElement('afterend',picker)}
else document.getElementById('screen-canvas')?.append(addImage,picker);
addImage.addEventListener('click',()=>picker.click());
picker.addEventListener('change',()=>{const files=[...picker.files];picker.value='';addFiles(files)});
viewport.addEventListener('dragover',event=>{
 if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy'}
});
viewport.addEventListener('drop',event=>{
 if(!event.dataTransfer?.files?.length)return;
 event.preventDefault();event.stopPropagation();addFiles([...event.dataTransfer.files]);
});
window.MastermindCanvasImages={version:'0.40.0',addFiles,persist,safeImage};
})();