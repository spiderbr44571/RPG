/* Mastermind v0.80: original raster illustration gallery packed offline in APK.
   Gallery entries are complete painted portraits. Fully modular character editing
   remains available in the original rig; do not treat these as independent layers. */
(function(root){'use strict';
const names=['Místico de Turquesa','Caçadora Arcana','Guardião do Eclipse','Mercenário','Bardo Prateado','Ocultista Rubro','Aristocrata','Andarilho','Druida Lunar'];
const W=420,H=520;
const image=new Image();
let available=false,failed=false;
const observers=new Set();
image.onload=()=>{available=image.naturalWidth===1260&&image.naturalHeight===1560;if(!available)failed=true;for(const fn of observers)fn();};
image.onerror=()=>{failed=true;for(const fn of observers)fn();};
image.src='atelier/v080_premium.webp';
function draw(ctx,width,height,index=0){
 if(!available)return false;
 const i=Math.max(0,Math.min(names.length-1,Math.trunc(Number(index)||0)));
 ctx.save();ctx.clearRect(0,0,width,height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(image,(i%3)*W,Math.floor(i/3)*H,W,H,0,0,width,height);
 ctx.restore();return true;
}
function subscribe(fn){if(typeof fn==='function'){observers.add(fn);if(available||failed)fn();return ()=>observers.delete(fn);}return ()=>{};}
root.Mastermind80Portraits={names,draw,subscribe,isReady:()=>available,hasError:()=>failed,source:'atelier/v080_premium.webp'};
if(typeof module!=='undefined'&&module.exports)module.exports=root.Mastermind80Portraits;
})(typeof window!=='undefined'?window:globalThis);