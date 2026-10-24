/* Mastermind 0.72 — volumetric 2.5D fog/darkness with animated light penetration.
   No whole-map mask. Rendering stays inside hand-drawn rooms/circles. */
(function(root){
'use strict';
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const DEG=Math.PI/180;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function deltaAngle(a,b){let d=(a-b+Math.PI)%(2*Math.PI);if(d<0)d+=Math.PI*2;return d-Math.PI;}
function regionContains(r,x,y){
 if(x<r.x||y<r.y||x>r.x+r.w||y>r.y+r.h)return false;
 if(r.shape==='cells'){
  if(!r._closedCellSet)r._closedCellSet=new Set(r.cells||[]);
  return r._closedCellSet.has(Math.floor(y)*r.gridWidth+Math.floor(x));
 }
 if(r.shape==='circle'){
  let dx=(x-r.x-r.w/2)/(r.w/2),dy=(y-r.y-r.h/2)/(r.h/2);
  return dx*dx+dy*dy<=1;
 }
 return true;
}
function doorPos(d){const x=Number(d.x)||0,y=Number(d.y)||0;
 return d.side==='n'?{x:x+.5,y}:d.side==='s'?{x:x+.5,y:y+1}:
 d.side==='w'?{x,y:y+.5}:{x:x+1,y:y+.5};}
function doorsFor(scene,r){
 if(Array.isArray(r.entrances))return r.entrances;
 const out=[];
 for(const mark of scene?.layers?.walls||[]){
  if(mark.kind!=='door'||mark.open!==true)continue;
  const p=doorPos(mark),w=r.w,h=r.h;
  const edge=(Math.abs(p.x-r.x)<.6&&p.y>=r.y-.5&&p.y<=r.y+h+.5)||
   (Math.abs(p.x-r.x-w)<.6&&p.y>=r.y-.5&&p.y<=r.y+h+.5)||
   (Math.abs(p.y-r.y)<.6&&p.x>=r.x-.5&&p.x<=r.x+w+.5)||
   (Math.abs(p.y-r.y-h)<.6&&p.x>=r.x-.5&&p.x<=r.x+w+.5);
  const cx=clamp((p.x-r.x)/(w||1)),cy=clamp((p.y-r.y)/(h||1));
  if(edge&&(!r.shape||r.shape!=='circle'||Math.abs((cx-.5)**2+ (cy-.5)**2-.25)<.35))out.push(p);
 }
 return out.slice(0,20);
}
// v0.75: local master preview uses the same sealed-room topology as the server.
function automaticRooms(scene){
 if(!scene?.atmosphere?.doorShadows||!Array.isArray(scene?.layers?.walls))return [];
 const w=Number(scene.width)||0,h=Number(scene.height)||0;
 if(w<1||h<1||w*h>10000)return [];
 const blocked=new Set();
 for(const m of scene.layers.walls){
  if(!m||m.kind==='door'&&m.open===true)continue;
  if(!['wall','door'].includes(m.kind))continue;
  const x=m.x|0,y=m.y|0;
  if(x<0||y<0||x>=w||y>=h)continue;
  if(m.side==='n')blocked.add('H:'+x+':'+y);
  if(m.side==='s')blocked.add('H:'+x+':'+(y+1));
  if(m.side==='w')blocked.add('V:'+x+':'+y);
  if(m.side==='e')blocked.add('V:'+(x+1)+':'+y);
 }
 if(!blocked.size)return [];
 const edge=(x,y,nx,ny)=>nx!==x?'V:'+Math.max(x,nx)+':'+y:'H:'+x+':'+Math.max(y,ny);
 const count=w*h,open=new Uint8Array(count),queue=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const escape=x===0&&!blocked.has('V:0:'+y)||x===w-1&&!blocked.has('V:'+w+':'+y)||
   y===0&&!blocked.has('H:'+x+':0')||y===h-1&&!blocked.has('H:'+x+':'+h);
  if(escape){open[y*w+x]=1;queue.push(y*w+x)}
 }
 for(let pos=0;pos<queue.length;pos++){
  const id=queue[pos],x=id%w,y=Math.floor(id/w);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const nx=x+dx,ny=y+dy;
   if(nx<0||ny<0||nx>=w||ny>=h||open[ny*w+nx]||blocked.has(edge(x,y,nx,ny)))continue;
   open[ny*w+nx]=1;queue.push(ny*w+nx);
  }
 }
 const pending=new Set();
 for(let id=0;id<count;id++)if(!open[id])pending.add(id);
 if(pending.size>count*.65)return [];
 const result=[];
 while(pending.size){
  const head=pending.values().next().value,group=[head];pending.delete(head);
  let minX=w,minY=h,maxX=0,maxY=0;
  for(let pos=0;pos<group.length;pos++){
   const id=group[pos],x=id%w,y=Math.floor(id/w);
   minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
    const nx=x+dx,ny=y+dy,ni=ny*w+nx;
    if(nx<0||ny<0||nx>=w||ny>=h||!pending.has(ni)||blocked.has(edge(x,y,nx,ny)))continue;
    pending.delete(ni);group.push(ni);
   }
  }
  result.push({shape:'cells',gridWidth:w,x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,
   cells:group,hidden:true,intensity:100,fogStyle:'dark',automatic:true});
 }
 return result;
}
function effectiveRooms(scene){
 const drawn=(scene?.fog||scene?.rooms||[]).filter(r=>r.hidden!==false&&r.intensity!==0);
 // The player receives server-curated automatic rooms in fog; never recompute based on filtered walls.
 return Array.isArray(scene?.fog)?drawn:drawn.concat(automaticRooms(scene));
}
function lightSources(scene){
 return (scene?.tokens||[]).filter(t=>t.flashlight===true&&t.hidden!==true).map(t=>({
  x:Number(t.x)+.5,y:Number(t.y)+.5,rotation:clamp(t.rotation,0,359),
  kind:t.lightKind||'lantern',radius:t.lightKind==='torch'||t.lightKind==='magic'?3:Math.max(1,Math.min(15,Number(t.flashlightRadius)||8))
 }));
}
function exposureAt(x,y,doors,lights){
 let value=0;
 for(const p of doors){
  const distance=Math.hypot(x-p.x,y-p.y);
  // An open doorway is a diffused pool that reaches ~4 grid squares inward.
  value=Math.max(value,.92*(1-smooth(distance/3.9)));
 }
 for(const t of lights){
  const dx=x-t.x,dy=y-t.y,d=Math.hypot(dx,dy),radius=t.radius||8;
  if(d>=radius)continue;
  if(t.kind==='torch'||t.kind==='magic'){
   // Torch: a soft omnidirectional 3-square circle, unaffected by rotation.
   value=Math.max(value,(1-smooth(d/3))*.99);
  }else{
   const angle=Math.atan2(dy,dx),diff=Math.abs(deltaAngle(angle,(t.rotation||0)*DEG));
   const angular=1-smooth((diff-.38)/.18);
   const falloff=1-smooth(d/radius);
   const beam=Math.pow(falloff,.68)*angular*.99;
   const closeHalo=(1-smooth(d/.90))*.65;
   value=Math.max(value,beam,closeHalo);
  }
 }
 return clamp(value);
}
function exposedFromCells(r,x,y){
 if(!Array.isArray(r.lightCells))return null;
 if(!r._v72Lookup){
  const table=new Map();for(const c of r.lightCells)table.set((c.x|0)+':'+(c.y|0),clamp(c.power/100));
  r._v72Lookup=table;
 }
 const lookup=(px,py)=>r._v72Lookup.get(px+':'+py)||0;
 // A soft bilinear field creates a smoothly feathered cone from secure, server-authorized cells.
 const fx=x-.5,fy=y-.5,x0=Math.floor(fx),y0=Math.floor(fy),dx=smooth(fx-x0),dy=smooth(fy-y0);
 const u=lookup(x0,y0)*(1-dx)+lookup(x0+1,y0)*dx;
 const v=lookup(x0,y0+1)*(1-dx)+lookup(x0+1,y0+1)*dx;
 return u*(1-dy)+v*dy;
}
function drawFrame(canvas,scene,{master=false,cell=48,quality='balanced',animate=true}={},time=0){
 if(!canvas||!scene)return;
 const rooms=effectiveRooms(scene);
 if(!rooms.length)return;
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
 const res=quality==='economy'?10:quality==='high'?23:16;
 const w=Math.max(1,Math.ceil(scene.width*res)),h=Math.max(1,Math.ceil(scene.height*res));
 if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
 const image=ctx.createImageData(w,h),pixels=image.data;
 const lights=lightSources(scene);
 const t=animate?time/1000:0;
 for(const r of rooms){
  const opacity=clamp(r.intensity==null?1:r.intensity/100),mist=r.fogStyle==='mist',doors=doorsFor(scene,r);
  const x0=Math.max(0,Math.floor(r.x*res)),y0=Math.max(0,Math.floor(r.y*res));
  const x1=Math.min(w,Math.ceil((r.x+r.w)*res)),y1=Math.min(h,Math.ceil((r.y+r.h)*res));
  for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
   const x=(px+.5)/res,y=(py+.5)/res;
   if(!regionContains(r,x,y))continue;
   const light=exposedFromCells(r,x,y)??exposureAt(x,y,doors,lights);
   // Smooth breathing swirls in color, not in unlit opacity; dense fog stays fully sealed.
   const wave=Math.sin(x*1.45+y*.65+t*.48)*Math.sin(y*1.15-x*.75-t*.32);
   const plumes=Math.sin(x*.6-y*.83+t*.21);
   const density=opacity*(master?.36:1)*(1-light*(mist?.81:.985));
   const o=(py*w+px)*4,old=pixels[o+3]/255,a=clamp(density);
   const mix=Math.max(old,a);
   const noise=wave*9+plumes*7;
   let cr,cg,cb;
   if(mist){cr=91+noise+light*29;cg=110+noise+light*35;cb=129+noise+light*35;}
   else{cr=9+noise*.35+light*10;cg=11+noise*.35+light*12;cb=21+noise*.45+light*18;}
   // Composite regions by highest opacity; animated fluctuations do not leak map detail.
   if(a>=old){pixels[o]=Math.max(0,Math.min(255,cr));pixels[o+1]=Math.max(0,Math.min(255,cg));
    pixels[o+2]=Math.max(0,Math.min(255,cb));pixels[o+3]=Math.round(mix*255);}
  }
 }
 ctx.putImageData(image,0,0);
}
const active=new WeakMap();
function detach(board){
 const instance=active.get(board);if(!instance)return;
 instance.stopped=true;if(instance.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(instance.raf);
 instance.canvas.remove?.();board.classList?.remove('m72-active');active.delete(board);
}
function attach(board,scene,options={}){
 if(!board||typeof document==='undefined')return;
 detach(board);
 const rooms=effectiveRooms(scene);
 if(!rooms.length)return;
 const canvas=document.createElement('canvas');
 canvas.className='m72-volume';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;z-index:14;pointer-events:none;image-rendering:auto;';
 board.appendChild(canvas);board.classList?.add('m72-active');
 const instance={canvas,stopped:false,raf:0},master=options.master===true;
 active.set(board,instance);
 const quality=options.quality||'balanced';
 let prev=-Infinity;
 const frame=time=>{
  if(instance.stopped)return;
  if(time-prev>84){
   drawFrame(canvas,scene,{master,cell:options.cell||48,quality},time);
   prev=time;
  }
  if(typeof requestAnimationFrame==='function')instance.raf=requestAnimationFrame(frame);
 };
 frame(0);
 return instance;
}
const api={attach,detach,drawFrame,regionContains,doorPos,doorsFor,lightSources,exposureAt,deltaAngle,automaticRooms,effectiveRooms};
root.Mastermind72Volume=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
