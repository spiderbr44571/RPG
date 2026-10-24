/* Mastermind 0.69 — 2.5D atmosphere, light and geometric visibility.
 * The Canvas2D atmosphere is visual; player visibility is enforced on the server.
 * No remote textures, WebGL dependency, or exposure of unrevealed map data.
 */
(function(root,factory){const api=factory();if(root)root.Mastermind69Atmosphere=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const num=(x,lo,hi,def)=>Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Number(x))):def;
const THEMES={day:{ambient:.08,fog:0,color:'#a9c2ba'},dusk:{ambient:.38,fog:.2,color:'#aaa0b9'},night:{ambient:.72,fog:.28,color:'#7486a8'},dark:{ambient:.94,fog:.14,color:'#50536d'},mist:{ambient:.48,fog:.72,color:'#a1b6b9'},paranormal:{ambient:.76,fog:.65,color:'#9b6ab0'}};
const DEFAULT={mode:'day',enabled:false,ambient:.08,fogDensity:0,fogColor:'#a9c2ba',fogSpeed:1,quality:'balanced',fogOfWar:false,visionRadius:7};
function settings(scene){
 const cfg=scene?.atmosphere||{},theme=THEMES[cfg.mode]||THEMES.day;
 return {mode:Object.prototype.hasOwnProperty.call(THEMES,cfg.mode)?cfg.mode:'day',enabled:cfg.enabled===true,
  ambient:num(cfg.ambient,0,1,theme.ambient),fogDensity:num(cfg.fogDensity,0,1,theme.fog),
  fogColor:/^#[a-f0-9]{6}$/i.test(cfg.fogColor||'')?cfg.fogColor:theme.color,
  fogSpeed:num(cfg.fogSpeed,0,3,1),quality:['economy','balanced','high'].includes(cfg.quality)?cfg.quality:'balanced',
  fogOfWar:cfg.fogOfWar===true,visionRadius:num(cfg.visionRadius,1,20,7)};
}
function normalize(scene){
 const s=scene||{},cfg=settings(s);
 if(!s.atmosphere)s.atmosphere={...cfg};
 if(!Array.isArray(s.lights))s.lights=[];
 return s;
}
function walls(scene){
 const marks=scene?.layers?.walls||[],out=[],width=Number(scene?.width||0),height=Number(scene?.height||0);
 for(const v of marks){
  if(!v||v.kind==='door'&&v.open===true||!['wall','door'].includes(v.kind))continue;
  const x=Number(v.x),y=Number(v.y);if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=width||y>=height)continue;
  const side=v.side;
  if(side==='n')out.push([x,y,x+1,y]);
  if(side==='s')out.push([x,y+1,x+1,y+1]);
  if(side==='w')out.push([x,y,x,y+1]);
  if(side==='e')out.push([x+1,y,x+1,y+1]);
 }
 return out;
}
function intersection(ax,ay,bx,by,cx,cy,dx,dy){
 const sx=bx-ax,sy=by-ay,tx=dx-cx,ty=dy-cy,den=sx*ty-sy*tx;
 if(Math.abs(den)<1e-9)return null;
 const ux=cx-ax,uy=cy-ay,t=(ux*ty-uy*tx)/den,u=(ux*sy-uy*sx)/den;
 return t>=0&&t<=1&&u>=0&&u<=1?t:null;
}
function lineOfSight(scene,x1,y1,x2,y2,segs){
 const src=segs||walls(scene);
 for(const w of src){const v=intersection(x1,y1,x2,y2,...w);if(v!==null&&v>0.0001&&v<.9999)return false}
 return true;
}
function visibilityPolygon(scene,light,count=96,segs){
 const x=num(light.x,0,60,0),y=num(light.y,0,60,0),r=num(light.radius,1,30,7),
  lines=segs||walls(scene),rays=[];
 const samples=Math.max(20,Math.min(256,Math.floor(count)));
 for(let i=0;i<samples;i++)rays.push(2*Math.PI*i/samples);
 for(const [x1,y1,x2,y2] of lines){
  for(const [xx,yy] of [[x1,y1],[x2,y2]]){
   if(Math.hypot(xx-x,yy-y)>r+1)continue;
   const t=Math.atan2(yy-y,xx-x);rays.push(t-.0001,t,t+.0001);
  }
 }
 rays.sort((a,b)=>a-b);
 const points=[];
 for(const angle of rays){
  const dx=Math.cos(angle),dy=Math.sin(angle),px=x+r*dx,py=y+r*dy;
  let best=1;
  for(const [x1,y1,x2,y2] of lines){const t=intersection(x,y,px,py,x1,y1,x2,y2);if(t!==null&&t<best)best=t}
  points.push([x+dx*r*best,y+dy*r*best]);
 }
 return points;
}
function lightList(scene,opts={}){
 const lights=(Array.isArray(scene?.lights)?scene.lights:[]).filter(v=>v&&v.enabled!==false).slice(0,20)
  .map(v=>({...v,x:num(v.x,0,60,0)+.5,y:num(v.y,0,60,0)+.5,radius:num(v.radius,1,20,5),intensity:num(v.intensity,0,1,.85)}));
 if(opts.player===true)return lights;
 return lights;
}
function ensureLight(scene,x,y,options={}){
 normalize(scene);
 if(scene.lights.length>=20)throw Error('Limite de 20 fontes de luz por mapa.');
 const id='light-'+Math.random().toString(36).slice(2,12);
 const l={id,x:Math.floor(x),y:Math.floor(y),radius:num(options.radius,1,20,6),
  intensity:num(options.intensity,0,1,.85),color:/^#[0-9a-f]{6}$/i.test(options.color||'')?options.color:'#ffc982',
  type:['torch','lantern','magic','cold'].includes(options.type)?options.type:'torch',enabled:true,flicker:options.flicker!==false};
 scene.lights.push(l);return l;
}
const instances=new WeakMap();
function destroy(board){
 const instance=instances.get(board);if(!instance)return;
 if(instance.frame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(instance.frame);
 if(instance.canvas?.parentNode)instance.canvas.parentNode.removeChild(instance.canvas);
 instances.delete(board);
}
function attach(board,scene,options={}){
 if(!board||typeof document==='undefined'||!scene)return null;
 destroy(board);
 const cfg=settings(scene);
 if(!cfg.enabled&&!cfg.fogOfWar)return null;
 const canvas=document.createElement('canvas');canvas.className='m69-atmosphere-canvas';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:24;width:100%;height:100%;';
 board.appendChild(canvas);
 if(typeof getComputedStyle==='function'&&getComputedStyle(board).position==='static')board.style.position='relative';
 const quality=options.quality||cfg.quality,
   scale=quality==='economy'?.35:quality==='high'?.72:.52;
 const width=Math.max(1,Math.round(Number(scene.width||1)*Number(options.cell||48))),
   height=Math.max(1,Math.round(Number(scene.height||1)*Number(options.cell||48)));
 const factor=Math.min(scale,1200/Math.max(width,height));
 canvas.width=Math.max(1,Math.round(width*factor));canvas.height=Math.max(1,Math.round(height*factor));
 const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
 const cell=Number(options.cell)||48, sx=canvas.width/Math.max(width,1),sy=canvas.height/Math.max(height,1);
 const segs=walls(scene), lights=lightList(scene,options).map(l=>({...l,polygon:visibilityPolygon(scene,l,quality==='economy'?28:quality==='high'?100:55,segs)}));
 const fow=cfg.fogOfWar&&options.player===true,seen=new Set(scene.seenCells||[]),visible=new Set(scene.visibleCells||[]);
 const fps=quality==='economy'?8:quality==='high'?22:14,clock=1000/fps;
 let last=0,frame=0,stopped=false;
 function draw(timestamp=0){
  if(stopped||!canvas.isConnected)return;
  if(timestamp-last>=clock||last===0){
   last=timestamp;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
   ctx.setTransform(sx,0,0,sy,0,0);
   if(cfg.enabled){
    const alpha=cfg.ambient;
    if(alpha>0){
     ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(4,6,16,'+alpha+')';ctx.fillRect(0,0,width,height);
     ctx.globalCompositeOperation='destination-out';
     for(const l of lights){
      const x=l.x*cell,y=l.y*cell,r=l.radius*cell;
      const pulse=l.flicker?1+.035*Math.sin(timestamp*.005+(l.x*7+l.y)):1;
      ctx.save();ctx.beginPath();
      l.polygon.forEach(([px,py],i)=>i?ctx.lineTo(px*cell,py*cell):ctx.moveTo(px*cell,py*cell));
      ctx.closePath();ctx.clip();
      const grad=ctx.createRadialGradient(x,y,0,x,y,r);
      grad.addColorStop(0,'rgba(0,0,0,'+Math.min(1,l.intensity*pulse)+')');
      grad.addColorStop(.65,'rgba(0,0,0,'+(l.intensity*.7)+')');grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;ctx.fillRect(Math.max(0,x-r),Math.max(0,y-r),2*r,2*r);ctx.restore();
     }
     ctx.globalCompositeOperation='source-over';
    }
    if(cfg.fogDensity>.005){
     const hue=cfg.fogColor,clouds=quality==='economy'?8:quality==='high'?34:18;
     ctx.globalCompositeOperation='source-over';
     for(let i=0;i<clouds;i++){
      const seed=i*29.37+7,move=timestamp*.000014*cfg.fogSpeed;
      const x=((Math.sin(seed)*.5+.5+move) %1)*(width+300)-150,
        y=((Math.sin(seed*2.19)*.5+.5)+(Math.sin(timestamp*.0001+seed)*.018))*height,
        r=Math.max(65,Math.min(width,height)*(.11+(i%5)*.034));
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      const density=cfg.fogDensity*(quality==='high'?.1:.08);
      g.addColorStop(0,hexRgba(hue,density));g.addColorStop(1,hexRgba(hue,0));
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*.36,0,0,Math.PI*2);ctx.fill();
     }
    }
   }
   if(fow){
    ctx.globalCompositeOperation='source-over';
    const w=Math.floor(Number(scene.width)||0),h=Math.floor(Number(scene.height)||0);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const key=y*w+x;
     if(visible.has(key))continue;
     ctx.fillStyle=seen.has(key)?'rgba(4,6,15,.73)':'rgba(1,2,8,1)';
     ctx.fillRect(x*cell,y*cell,cell+.5,cell+.5);
    }
   }
   ctx.globalCompositeOperation='source-over';
  }
  if(typeof requestAnimationFrame==='function')instance.frame=requestAnimationFrame(draw);
 }
 const instance={canvas,draw,destroy:()=>{stopped=true;destroy(board)},frame:0};
 instances.set(board,instance);draw(0);return instance;
}
function hexRgba(hex,alpha){
 const s=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#9cb0bc';
 return 'rgba('+parseInt(s.slice(1,3),16)+','+parseInt(s.slice(3,5),16)+','+parseInt(s.slice(5,7),16)+','+Math.max(0,Math.min(1,alpha))+')';
}
return {DEFAULT,THEMES,settings,normalize,walls,lineOfSight,visibilityPolygon,lightList,ensureLight,attach,destroy};
});
