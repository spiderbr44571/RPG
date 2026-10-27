/* MASTER MIND PIXEL STUDIO v0.83 — NEW engine. The former vector/pixel rigs are not used. */
(function(root){'use strict';
const ASSET=root.MM83_ASSETS;
const W=192,H=224;
const COLORS={
 skin:['#f7dac6','#edd0b1','#e4b695','#d5a084','#c38a71','#b88066','#a36b56','#8d5947','#78483a','#603a33','#c98e72','#e5b79e'],
 hair:['#221e2d','#39293b','#63434c','#8d5762','#b57961','#d7aa7b','#f0d9ab','#e5e1db','#7651a5','#9b52c0','#3c7c86','#377079','#bd4d61','#ab6b4c'],
 eye:['#513793','#425bb2','#2e7b99','#4d966e','#c49a4b','#a96366','#9e74a4','#413a3f'],
 main:['#46365c','#623d75','#2d6169','#265858','#8a3f52','#9b7149','#5c647d','#343a50','#7d405f','#526948'],
 secondary:['#463850','#655279','#557887','#a36b76','#8b765f','#9a879e','#ddd0aa','#434c5e'],
 metal:['#dfc397','#b3c9ce','#b7a5d6','#d89f7a','#869aaf'],
 leather:['#654836','#795443','#987057','#4b4249','#353949'],
 blush:['#b76569','#d17f7a','#9c555d','#d79a88']};
const MENU=[['frontHair','Cabelo frontal'],['backHair','Cabelo traseiro'],['face','Rosto'],['ears','Orelhas'],['eyes','Olhos'],['brows','Sobrancelhas'],['nose','Nariz'],['mouth','Boca'],['body','Corpo'],['outfit','Roupas'],['armor','Armaduras'],['backCloak','Capas'],['frontCloak','Detalhes de capa'],['beard','Barbas'],['headwear','Chapéus'],['accessory','Acessórios'],['skin','Pele'],['palette','Cores'],['background','Fundo'],['frame','Moldura']];
const DEFAULTS={version:83,frontHair:0,backHair:2,face:0,ears:0,eyes:0,brows:0,nose:0,mouth:0,body:0,outfit:0,armor:0,backCloak:0,frontCloak:0,beard:0,headwear:0,accessory:0,skin:3,background:0,frame:0,custom:{},colors:{hair:9,eye:0,main:2,secondary:1,metal:0,leather:0,blush:0}};
let status='loading',reason='',source=null,sourceCtx=null;const tiles=new Map();
const FALLBACK={labels:{},count:{},order:[],offset:{},width:W,height:H,columns:8};
const M=ASSET?.manifest||FALLBACK;
function clamp(n,max){const k=Number(n);return Number.isFinite(k)?Math.max(0,Math.min(max-1,Math.floor(k))):0}
function merge(raw){const c={...DEFAULTS,...(raw&&typeof raw==='object'?raw:{})};c.colors={...DEFAULTS.colors,...(c.colors||{})};c.custom={...DEFAULTS.custom,...(c.custom||{})};for(const [k,n] of Object.entries(M.count||{}))c[k]=clamp(c[k],n);c.skin=clamp(c.skin,COLORS.skin.length);c.background=clamp(c.background,7);c.frame=clamp(c.frame,6);for(const [k,all] of Object.entries(COLORS)){if(k==='skin')continue;c.colors[k]=clamp(c.colors[k],all.length)}c.version=83;return c}
function palette(c){const rgba={};for(const [group,choices] of Object.entries(COLORS)){
 const override=(c.custom&&c.custom[group]);rgba[group]=/^#[a-f\d]{6}$/i.test(override||'')?override:choices[group==='skin'?c.skin:c.colors[group]];
}return rgba;}
function colorTuple(hex){const s=hex.slice(1);return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)];}
function recolor(cat,id,pal){if(!sourceCtx)return null;
 const number=clamp(id,M.count[cat]);const hash=Object.values(pal).join('');const cacheKey=cat+'/'+number+'/'+hash;
 if(tiles.has(cacheKey)){const hit=tiles.get(cacheKey);tiles.delete(cacheKey);tiles.set(cacheKey,hit);return hit;}
 const off=M.offset[cat]+number,sx=(off%M.columns)*W,sy=Math.floor(off/M.columns)*H;
 const tile=document.createElement('canvas');tile.width=W;tile.height=H;
 const ctx=tile.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,sx,sy,W,H,0,0,W,H);
 const pix=ctx.getImageData(0,0,W,H),data=pix.data;
 const colors=['skin','hair','eye','main','secondary','metal','leather','blush'].map(k=>colorTuple(pal[k]));
 const shades=[-.70,-.48,-.24,0,.21,.40,.60];const lut=colors.map(base=>shades.map(x=>{const target=x<0?[35,26,52]:[255,244,218];const t=Math.abs(x);return base.map((a,j)=>Math.round(a*(1-t)+target[j]*t));}));
 for(let i=0;i<data.length;i+=4){if(!data[i+3]||data[i+2]!==64)continue;
 const group=(data[i]-32)/24,shade=(data[i+1]-32)/28;
 if(!Number.isInteger(group)||!Number.isInteger(shade)||!lut[group]||!lut[group][shade])continue;
 const rgb=lut[group][shade];data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];}
 ctx.putImageData(pix,0,0);tiles.set(cacheKey,tile);
 if(tiles.size>110)tiles.delete(tiles.keys().next().value);
 return tile;}
const BG=[['#2a2036','#4c3151','#9a69a0'],['#243442','#34566a','#7caabb'],['#27362c','#40614f','#91ae89'],['#492733','#773d50','#d38a89'],['#39334b','#64618c','#b5a2d1'],['#584134','#96704d','#dfc49e'],['#1b2435','#33455c','#798999']];
function paintBackground(ctx,c,p){const b=BG[c.background]||BG[0];ctx.fillStyle=b[0];ctx.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=7){let t=y/H;ctx.fillStyle=t<.48?b[0]:t<.83?b[1]:b[0];ctx.fillRect(0,y,W,7);}
 const mid=b[2];ctx.fillStyle=mid;
 for(let yy=22;yy<196;yy+=4){const dy=yy-101,wide=Math.floor(Math.sqrt(Math.max(0,74*74-dy*dy)));if(wide)ctx.fillRect(96-wide,yy,wide*2,1);}
 ctx.fillStyle=b[1];for(let yy=30;yy<191;yy+=8){const dy=yy-101,wide=Math.floor(Math.sqrt(Math.max(0,66*66-dy*dy)));if(wide)ctx.fillRect(96-wide,yy,wide*2,4);}
 ctx.fillStyle=b[2];ctx.fillRect(5,5,2,H-10);ctx.fillRect(W-7,5,2,H-10);ctx.fillRect(5,5,W-10,2);ctx.fillRect(5,H-7,W-10,2);
}
function baseCanvas(c){const low=document.createElement('canvas');low.width=W;low.height=H;const x=low.getContext('2d');x.imageSmoothingEnabled=false;paintBackground(x,c,palette(c));return low;}
function compose(raw){const c=merge(raw),low=baseCanvas(c),x=low.getContext('2d');if(status==='ready'){
 const p=palette(c);for(const key of M.order){const t=recolor(key,c[key],p);if(t)x.drawImage(t,0,0);}
 }return low;}
function render(ctx,w,h,raw){if(!ctx)return;const c=merge(raw),low=compose(c);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(low,0,0,w,h);return c;}
function thumb(ctx,w,h,raw,category){if(!ctx)return;const c=merge(raw),low=compose(c);ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
 const torso=['outfit','armor','backCloak','frontCloak','body'].includes(category);
 const src=torso?[5,76,181,145]:[31,14,132,157];ctx.drawImage(low,...src,0,0,w,h);}
function token(ctx,size,portrait,raw){const c=merge(raw),off=document.createElement('canvas');off.width=176;off.height=176;const x=off.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;
 x.drawImage(portrait,0,10*portrait.height/H,portrait.width,176*portrait.height/H,0,0,176,176);
 const data=x.getImageData(0,0,176,176),rgba=data.data,metal=colorTuple(COLORS.metal[c.colors.metal]||'#e5c38b');
 for(let y=0;y<176;y++)for(let xx=0;xx<176;xx++){
 const i=(y*176+xx)*4,dx=xx-87.5,dy=y-87.5,r=Math.hypot(dx,dy);
 const box=Math.abs(dx)<=84&&Math.abs(dy)<=84;
 const inside=c.frame===5?true:c.frame===4?box:r<=83;
 if(!inside){rgba[i+3]=0;continue;}
 const border=c.frame!==5&&(c.frame===4?(xx<5||xx>170||y<5||y>170):(r>79));
 if(border){rgba[i]=metal[0];rgba[i+1]=metal[1];rgba[i+2]=metal[2];rgba[i+3]=255;}
 }
 x.putImageData(data,0,0);ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,size,size);
}
function subscribe(fn){if(typeof fn!=='function')return ()=>{};const ready=()=>fn(status,reason);document.addEventListener('mm83:ready',ready);document.addEventListener('mm83:error',ready);if(status!=='loading')fn(status,reason);return ()=>{document.removeEventListener('mm83:ready',ready);document.removeEventListener('mm83:error',ready);}}
function init(){if(!ASSET||!ASSET.uri||M.width!==W||M.height!==H){status='error';reason='Pacote pixel art incompleto';document.dispatchEvent(new CustomEvent('mm83:error'));return;}
 const img=new Image();img.onload=()=>{if(img.naturalWidth!==M.columns*W||img.naturalHeight!==Math.ceil(M.total/M.columns)*H){status='error';reason='Dimensões incorretas do atlas';document.dispatchEvent(new CustomEvent('mm83:error'));return;}
 source=img;sourceCtx=true;status='ready';document.dispatchEvent(new CustomEvent('mm83:ready'));};
 img.onerror=()=>{status='error';reason='Imagem do ateliê não pôde ser decodificada';document.dispatchEvent(new CustomEvent('mm83:error'));};img.src=ASSET.uri;}
root.MM83={W,H,OPTIONS:M.labels,COUNT:M.count,MENU,DEFAULTS,COLORS,merge,palette,render,thumb,token,subscribe,compose,isReady:()=>status==='ready',status:()=>status,error:()=>reason,spriteCount:M.total};
init();
})(typeof window!=='undefined'?window:globalThis);