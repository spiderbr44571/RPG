/* RPG Mesa v0.33 — pan/zoom compartilhado no navegador e no Android WebView. */
(function(root){
'use strict';
function create(){
 let view=null,board=null,width=0,height=0,scale=1,x=0,y=0,fitted=false;
 let pointers=new Map(),gesture=null,pinch=null,suppressUntil=0;
 let cleanup=()=>{};
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function redraw(){if(board)board.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')'}
 function dimensions(){return {w:width||board?.offsetWidth||1,h:height||board?.offsetHeight||1}}
 function fit(){
  if(!view||!board)return;
  const d=dimensions(),w=view.clientWidth,h=view.clientHeight;
  if(w<10||h<10)return;
  scale=clamp(Math.min((w-24)/d.w,(h-24)/d.h),0.12,2);
  x=(w-d.w*scale)/2;y=(h-d.h*scale)/2;fitted=true;redraw();
 }
 function zoom(mult,cx,cy){
  if(!view||!board)return;
  cx=Number.isFinite(cx)?cx:view.clientWidth/2;cy=Number.isFinite(cy)?cy:view.clientHeight/2;
  const next=clamp(scale*mult,.1,4),ratio=next/scale;
  x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;redraw();
 }
 function screenToWorld(clientX,clientY){
  if(!view)return {x:0,y:0};
  const r=view.getBoundingClientRect();
  return {x:(clientX-r.left-x)/scale,y:(clientY-r.top-y)/scale};
 }
 function cellAt(e,cell,cols,rows){
  const p=screenToWorld(e.clientX,e.clientY);
  const cx=Math.floor(p.x/cell),cy=Math.floor(p.y/cell);
  return cx>=0&&cy>=0&&cx<cols&&cy<rows?{x:cx,y:cy}:null;
 }
 function attach(nextView,nextBoard,worldWidth,worldHeight,reset=false){
  cleanup();view=nextView;board=nextBoard;width=worldWidth;height=worldHeight;
  pointers.clear();gesture=null;pinch=null;
  if(!view||!board)return;
  view.style.touchAction='none';
  view.style.overflow='hidden';
  board.style.position='absolute';
  board.style.left='0';
  board.style.top='0';
  board.style.transformOrigin='0 0';
  board.style.willChange='transform';
  const onDown=e=>{
    // Deixa controles de interface externos funcionarem normalmente.
    if(e.button!==undefined&&e.button!==0)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    view.setPointerCapture?.(e.pointerId);
    if(pointers.size===1){gesture={sx:e.clientX,sy:e.clientY,startX:x,startY:y,moved:false}}
    else if(pointers.size===2){
      const pts=[...pointers.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      pinch={distance:d};gesture=null;
    }
  };
  const onMove=e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){
      const pts=[...pointers.values()],d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const rect=view.getBoundingClientRect();
      const midX=(pts[0].x+pts[1].x)/2-rect.left,midY=(pts[0].y+pts[1].y)/2-rect.top;
      if(pinch&&pinch.distance>0)zoom(d/pinch.distance,midX,midY);
      pinch={distance:d};suppressUntil=Date.now()+350;return;
    }
    if(gesture){
      const dx=e.clientX-gesture.sx,dy=e.clientY-gesture.sy;
      if(Math.hypot(dx,dy)>7)gesture.moved=true;
      if(gesture.moved){x=gesture.startX+dx;y=gesture.startY+dy;redraw();suppressUntil=Date.now()+350}
    }
  };
  const onUp=e=>{
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    if(gesture?.moved||pinch)suppressUntil=Date.now()+350;
    if(pointers.size<2)pinch=null;
    if(pointers.size===0)gesture=null;
  };
  const onClickCapture=e=>{
    if(Date.now()<suppressUntil){
      e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    }
  };
  const onWheel=e=>{
    e.preventDefault();
    const rect=view.getBoundingClientRect();
    zoom(e.deltaY<0?1.13:1/1.13,e.clientX-rect.left,e.clientY-rect.top);
  };
  view.addEventListener('pointerdown',onDown);
  view.addEventListener('pointermove',onMove);
  view.addEventListener('pointerup',onUp);
  view.addEventListener('pointercancel',onUp);
  view.addEventListener('click',onClickCapture,true);
  view.addEventListener('wheel',onWheel,{passive:false});
  cleanup=()=>{
    if(!view)return;
    view.removeEventListener('pointerdown',onDown);
    view.removeEventListener('pointermove',onMove);
    view.removeEventListener('pointerup',onUp);
    view.removeEventListener('pointercancel',onUp);
    view.removeEventListener('click',onClickCapture,true);
    view.removeEventListener('wheel',onWheel);
  };
  if(reset||!fitted){
    requestAnimationFrame(()=>{if(nextView===view)fit()});
  }else redraw();
 }
 function destroy(){cleanup();view=null;board=null;fitted=false}
 return {attach,fit,zoom,cellAt,screenToWorld,destroy,get scale(){return scale},get x(){return x},get y(){return y}};
}
root.RPG33_CAMERA={create};
})(typeof window!=='undefined'?window:globalThis);
