/* Mastermind v0.69 — light, atmosphere and fog-of-war visualization.
 * UI visualization is cosmetic; LAN server independently authorizes map disclosure.
 * 2.5D gradients are intentionally lighter than WebGL volumetric ray marching.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.Mastermind69Light=api})(typeof window!=='undefined'?window:null,function(root){'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:a));
const clampInt=(n,a,b)=>Math.floor(clamp(n,a,b));
const settings=scene=>{const l=scene?.lighting||{};return {enabled:!!l.enabled,ambient:clamp(l.ambient??.42,0,1),fogEnabled:!!l.fogEnabled,density:clamp(l.density??.6,0,1),visionRadius:clampInt(l.visionRadius??8,1,20),quality:['low','medium','high'].includes(l.quality)?l.quality:'medium',lights:Array.isArray(l.lights)?l.lights:[],explored:l.explored||{}}};
const lightKinds=['torch','lantern','fire','crystal','spell','custom'];
function newLight(scene,position,kind='torch'){const l=settings(scene);const x=clampInt(position.x,0,(scene.width||28)-1),y=clampInt(position.y,0,(scene.height||18)-1);
 const id='l'+(root?.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
 return {id,x,y,kind:lightKinds.includes(kind)?kind:'torch',radius:6,intensity:.8,color:'#ffcc83',flicker:kind==='torch'||kind==='fire',enabled:true,attachedTokenId:''}}
function ensure(scene){if(!scene.lighting||typeof scene.lighting!=='object')scene.lighting={};
 const l=scene.lighting;if(!Array.isArray(l.lights))l.lights=[];
 if(typeof l.enabled!=='boolean')l.enabled=false;if(typeof l.fogEnabled!=='boolean')l.fogEnabled=false;
 if(l.ambient==null)l.ambient=.42;if(l.density==null)l.density=.6;if(l.visionRadius==null)l.visionRadius=8;if(!l.quality)l.quality='medium';
 return l}
function inRange(scene,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<scene.width&&y<scene.height}
function wallMap(scene){const m=new Set();const ws=scene?.layers?.walls||[];
 for(const w of ws){if(w.kind==='door'&&w.open)continue;if(!['wall','door'].includes(w.kind))continue;
  const x=+w.x,y=+w.y;if(!inRange(scene,x,y))continue;
  const a=w.side==='n'?[x,y-1,x,y]:w.side==='s'?[x,y,x,y+1]:w.side==='e'?[x,y,x+1,y]:[x-1,y,x,y];
  m.add([a[0],a[1],a[2],a[3]].join(':'));m.add([a[2],a[3],a[0],a[1]].join(':'));
 }return m}
function hasLOS(scene,sx,sy,tx,ty,walls=wallMap(scene)){
 sx=clampInt(sx,0,scene.width-1);sy=clampInt(sy,0,scene.height-1);tx=clampInt(tx,0,scene.width-1);ty=clampInt(ty,0,scene.height-1);
 let x=sx,y=sy;const dx=tx-sx,dy=ty-sy,steps=Math.max(Math.abs(dx),Math.abs(dy))*4;
 if(steps===0)return true;
 for(let i=1;i<=steps;i++){
  const xx=Math.floor(sx+.5+dx*i/steps),yy=Math.floor(sy+.5+dy*i/steps);
  if(xx===x&&yy===y)continue;
  if(xx!==x&&walls.has([x,y,xx,y].join(':')))return false;
  if(yy!==y&&walls.has([xx,y,xx,yy].join(':')))return false;
  x=xx;y=yy;
 }return true;
}
function visibleCells(scene,origins,radius){const r=clampInt(radius,1,20),walls=wallMap(scene),out=new Set();
 for(const source of origins||[]){const sx=Math.floor(source.x),sy=Math.floor(source.y);if(!inRange(scene,sx,sy))continue;
 for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
  const x=sx+dx,y=sy+dy;if(!inRange(scene,x,y)||dx*dx+dy*dy>r*r)continue;
  if(hasLOS(scene,sx,sy,x,y,walls))out.add(y*scene.width+x);
 }}return out}
function normalizeVisible(vision){if(!vision)return null;return new Set(Array.isArray(vision.visible)?vision.visible:[])}
function normalizeExplored(vision){if(!vision)return null;return new Set(Array.isArray(vision.explored)?vision.explored:[])}
function render(scene,cell=48,{master=false,showMist=true}={}){
 const l=settings(scene),w=scene?.width||0,h=scene?.height||0,c=clamp(cell,14,100);
 if(!l.enabled||!w||!h)return '';
 const visible=normalizeVisible(scene.vision),explored=normalizeExplored(scene.vision);
 const rows=[];let rays=master?null:visible;
 // Run-length compression: each contiguous darkness band uses just one rect.
 for(let y=0;y<h;y++){let previous='',start=0;
  for(let x=0;x<=w;x++){
   const i=y*w+x;
   const type=x===w?'END':master?'master':rays?(rays.has(i)?'lit':explored?.has(i)?'memory':'fog'):'master';
   if(x===0){previous=type;start=0;continue}
   if(type!==previous){
    const alpha=previous==='fog'?.94:previous==='memory'?.65:previous==='lit'?Math.max(0,.58-l.ambient*.5):Math.max(0,.64-l.ambient*.52);
    if(alpha>0)rows.push('<rect x="'+start*c+'" y="'+y*c+'" width="'+(x-start)*c+'" height="'+c+'" fill="#070812" fill-opacity="'+alpha.toFixed(2)+'"/>');
    previous=type;start=x;
   }
  }}
 const mist=l.density>0&&showMist?'<div class="mm69-mist mm69-'+l.quality+'" style="opacity:'+((l.density*(master?.45:.7)).toFixed(2))+'"></div>':'';
 const lights=l.lights.filter(o=>o.enabled!==false).slice(0,48).map(o=>{
  const x=clamp(o.x,0,w-1),y=clamp(o.y,0,h-1),r=clamp(o.radius||5,1,20),intensity=clamp(o.intensity??.8,0,1);
  if(!master&&rays&&!rays.has(Math.floor(y)*w+Math.floor(x)))return '';
  const safeColor=/^#[0-9a-f]{6}$/i.test(o.color)?o.color:'#ffcc83';
  const diameter=r*c*2;return '<span class="mm69-light '+(o.flicker?'mm69-flicker':'')+'" style="left:'+((x+.5)*c-diameter/2)+'px;top:'+((y+.5)*c-diameter/2)+'px;width:'+diameter+'px;height:'+diameter+'px;--mm69-glow:'+safeColor+';opacity:'+intensity+'"></span>';
 }).join('');
 return '<div class="mm69-atmosphere" aria-hidden="true">'+lights+mist+'<svg class="mm69-darkness" width="'+w*c+'" height="'+h*c+'" viewBox="0 0 '+w*c+' '+h*c+'" preserveAspectRatio="none">'+rows.join('')+'</svg></div>';
}
if(typeof document!=='undefined'&&document.head&&!document.getElementById('mm69-fog-css')){
 const el=document.createElement('style');el.id='mm69-fog-css';
 el.textContent='.mm69-atmosphere{position:absolute;inset:0;pointer-events:none;z-index:11;overflow:hidden}.mm69-darkness{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.mm69-light{position:absolute;border-radius:50%;pointer-events:none;background:radial-gradient(circle,var(--mm69-glow) 0%,color-mix(in srgb,var(--mm69-glow) 45%,transparent) 23%,transparent 70%);mix-blend-mode:screen;z-index:1}.mm69-flicker{animation:mm69-pulse 2.6s ease-in-out infinite alternate}.mm69-mist{position:absolute;inset:-20%;pointer-events:none;z-index:3;background:radial-gradient(ellipse 34% 12% at 22% 35%,#c5c5da88,transparent),radial-gradient(ellipse 38% 23% at 64% 63%,#aca5c183,transparent),radial-gradient(ellipse 25% 17% at 80% 25%,#e6e0db71,transparent);background-size:110% 100%;animation:mm69-drift 27s ease-in-out infinite alternate;mix-blend-mode:screen}.mm69-low{animation:none}.mm69-medium{filter:blur(12px)}.mm69-high{filter:blur(22px)}@keyframes mm69-pulse{from{opacity:.57;transform:scale(.97)}to{opacity:.92;transform:scale(1.04)}}@keyframes mm69-drift{from{transform:translateX(-7%) translateY(1%)}to{transform:translateX(6%) translateY(-5%)}}@media(prefers-reduced-motion:reduce){.mm69-flicker,.mm69-mist{animation:none}}';
 document.head.appendChild(el);
}
return {settings,ensure,newLight,lightKinds,wallMap,hasLOS,visibleCells,render};
});
