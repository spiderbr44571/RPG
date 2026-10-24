/* Mastermind 0.68 — map tile/prop/wall layer engine.
 * Original SVG vector assets; no external downloads or third-party art.
 * All layer records are ordinary JSON and survive scene synchronization.
 */
(function(root,factory){
 const api=factory();if(root)root.Mastermind68Map=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null,function(){'use strict';
const palette=[
 ['stone','Pedra antiga','Masmorra','terrain','#625767','#3f3849'],
 ['cobble','Calçamento','Masmorra','terrain','#8b8190','#524a58'],
 ['marble','Mármore','Masmorra','terrain','#c7b9b5','#8d777c'],
 ['wood','Assoalho','Interior','terrain','#8a5c43','#4b322e'],
 ['carpet','Tapete rubi','Interior','terrain','#934359','#4a2233'],
 ['parquet','Madeira nobre','Interior','terrain','#997449','#55402f'],
 ['grass','Grama','Natureza','terrain','#3b774d','#213f33'],
 ['soil','Terra','Natureza','terrain','#765543','#4a3634'],
 ['moss','Musgo','Natureza','terrain','#517a52','#304b40'],
 ['sand','Areia','Exterior','terrain','#ba9e67','#867347'],
 ['snow','Neve','Exterior','terrain','#c6d5d9','#859ca6'],
 ['water','Água','Exterior','terrain','#397c9c','#25445f'],
 ['lava','Lava','Elemental','terrain','#b84d34','#672e31'],
 ['arcane','Runas','Elemental','terrain','#635ab1','#33285c'],
 ['void','Abismo','Elemental','terrain','#29283c','#141421'],
 ['ash','Cinzas','Elemental','terrain','#66646c','#37343e'],
 ['tree','Árvore','Natureza','props','#376548','#1f382e'],
 ['bush','Arbusto','Natureza','props','#519357','#254836'],
 ['rock','Rocha','Natureza','props','#8b8d95','#494a59'],
 ['flowers','Flores','Natureza','props','#a5b77e','#4d724c'],
 ['table','Mesa','Interior','props','#a37955','#5a3c35'],
 ['chair','Cadeira','Interior','props','#8d6b4b','#49352b'],
 ['bed','Cama','Interior','props','#b7a3bb','#5b445e'],
 ['books','Livros','Interior','props','#d09c6e','#53405e'],
 ['barrel','Barril','Objetos','props','#a37848','#65412e'],
 ['chest','Baú','Objetos','props','#c99c5c','#5e3b2c'],
 ['crate','Caixote','Objetos','props','#a58962','#504033'],
 ['statue','Estátua','Objetos','props','#adb0a8','#656574'],
 ['pillar','Coluna','Construção','props','#c5b8b5','#696274'],
 ['torch','Tocha','Construção','props','#e59d55','#703d32'],
 ['stairs','Escada','Construção','props','#a69a9d','#635866'],
 ['trap','Armadilha','Construção','props','#dc9572','#765051'],
 ['altar','Altar','Arcano','props','#846ca9','#423456'],
 ['portal','Portal','Arcano','props','#63bfd2','#3f4a9b'],
 ['crystal','Cristal','Arcano','props','#9d93e7','#423d8b'],
 ['campfire','Fogueira','Natureza','props','#ffac55','#8c4736']
].map(([id,name,pack,layer,primary,secondary])=>({id,name,pack,layer,primary,secondary}));
const BY_ID=new Map(palette.map(x=>[x.id,x]));
const PACKS=['Todos','Masmorra','Interior','Natureza','Exterior','Elemental','Construção','Objetos','Arcano'];
const toInt=(v,min,max)=>Math.max(min,Math.min(max,Math.floor(Number(v)||0)));
const safe=(v)=>String(v||'').replace(/[^a-z0-9-]/gi,'').slice(0,40);
function ensure(scene){
 if(!scene.layers||typeof scene.layers!=='object')scene.layers={};
 for(const id of ['terrain','props','walls'])if(!Array.isArray(scene.layers[id]))scene.layers[id]=[];
 return scene.layers;
}
function saveSnapshot(scene){return JSON.stringify(ensure(scene))}
function restore(scene,snapshot){if(typeof snapshot!=='string'||snapshot.length>450000)return false;
 try{const v=JSON.parse(snapshot);if(!v||!Array.isArray(v.terrain)||!Array.isArray(v.props)||!Array.isArray(v.walls))return false;scene.layers=v;return true}catch{return false}}
function get(id){return BY_ID.get(id)||null}
function paint(scene,layer,id,x,y,size=1){
 const spec=get(id);
 if(!spec||spec.layer!==layer||!['terrain','props'].includes(layer))return false;
 const l=ensure(scene),w=toInt(scene.width,6,60),h=toInt(scene.height,6,60),brush=toInt(size,1,5),before=Math.floor((brush-1)/2),after=brush-1-before;
 x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=w||y>=h)return false;
 let changed=false;const existing=new Map(l[layer].map(a=>[a.y*w+a.x,a]));
 for(let cy=Math.max(0,y-before);cy<=Math.min(h-1,y+after);cy++)
 for(let cx=Math.max(0,x-before);cx<=Math.min(w-1,x+after);cx++){
  const key=cy*w+cx,prev=existing.get(key);
  if(prev?.id===id)continue;
  existing.set(key,{x:cx,y:cy,id});changed=true;
 }
 if(changed)l[layer]=[...existing.values()].slice(-3600);
 return changed;
}
function erase(scene,layer,x,y,size=1){
 if(!['terrain','props','walls'].includes(layer))return false;
 const l=ensure(scene),brush=toInt(size,1,5),before=Math.floor((brush-1)/2),after=brush-1-before;
 x=Math.floor(x);y=Math.floor(y);const old=l[layer].length;
 if(layer==='walls')l.walls=l.walls.filter(a=>a.x<x-before||a.x>x+after||a.y<y-before||a.y>y+after);
 else l[layer]=l[layer].filter(a=>a.x<x-before||a.x>x+after||a.y<y-before||a.y>y+after);
 return l[layer].length!==old;
}
function edgeFromPoint(px,py){
 const x=Math.floor(px/48),y=Math.floor(py/48),dx=px/48-x,dy=py/48-y;
 const sides=[['n',dy],['e',1-dx],['s',1-dy],['w',dx]].sort((a,b)=>a[1]-b[1]);
 return {x,y,side:sides[0][0]};
}
function wall(scene,kind,x,y,side){
 const l=ensure(scene),w=toInt(scene.width,6,60),h=toInt(scene.height,6,60);
 x=Math.floor(x);y=Math.floor(y);
 if(x<0||y<0||x>=w||y>=h||!['n','e','s','w'].includes(side)||!['wall','door'].includes(kind))return false;
 if(l.walls.length>720)return false;
 const key=x+':'+y+':'+side,idx=l.walls.findIndex(a=>a.x+':'+a.y+':'+a.side===key);
 if(idx>=0&&l.walls[idx].kind===kind)return false;
 const next={x,y,side,kind,open:false};
 if(idx>=0)l.walls[idx]=next;else l.walls.push(next);
 return true;
}
function toggleDoor(scene,x,y,side){
 const v=ensure(scene).walls.find(a=>a.x===x&&a.y===y&&a.side===side&&a.kind==='door');
 if(!v)return false;v.open=!v.open;return true;
}
function localArt(id,a,b){
 const rect=(x,y,w,h,c,rx=0)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+c+'"/>';
 const path=(d,c,stroke=2)=>'<path d="'+d+'" stroke="'+c+'" stroke-width="'+stroke+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
 let body=rect(0,0,48,48,a);
 const line=(x1,y1,x2,y2)=>path('M'+x1+' '+y1+'L'+x2+' '+y2,b,1.8);
 if(['stone','cobble','marble','snow','soil','ash','sand','moss','grass','carpet','parquet','wood','water','lava','arcane','void'].includes(id)){
  if(id==='wood'||id==='parquet')body+=line(0,16,48,16)+line(0,32,48,32)+line(15,0,15,16)+line(30,16,30,32)+line(18,32,18,48);
  else if(id==='water')body+=path('M-3 15Q9 5 21 15T51 15M-3 34Q9 24 21 34T51 34',b,2.4);
  else if(id==='lava')body+=path('M-5 6L18 17L12 31L45 42M12-3L28 11L47 7M31 24L48 16', '#ffc16a',2.6);
  else if(id==='arcane')body+=path('M24 4L44 24L24 44L4 24Z M24 11L37 24L24 37L11 24Z M24 17V31M17 24H31','#c0aaff',1.5);
  else if(id==='carpet')body+=rect(5,5,38,38,'none',1)+path('M6 6H42V42H6Z M11 11H37V37H11Z','#d9a89d',1.5);
  else if(id==='grass'||id==='moss')body+=path('M7 35l4-8 3 8m16-17 4-10 5 9M17 19l2-6 3 7','#92a879',1.5);
  else if(id==='snow')body+=path('M7 14l10-5 10 5M26 36l6-5 9 4', '#eff6f4',1.8);
  else if(id==='sand'||id==='soil'||id==='ash')body+=rect(8,10,3,2,b)+rect(30,28,3,2,b)+rect(17,35,2,2,b)+rect(39,10,2,2,b);
  else if(id==='void')body+=path('M9 12L24 3L39 12L44 29L27 44L7 30Z',b,1.4);
  else body+=path('M0 18H48M0 34H48M13 0V18M37 18V34M20 34V48',b,2.1);
 }else{
  body='';const circle=(cx,cy,r,color)=>'<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+color+'"/>';
  if(id==='tree'||id==='bush'){body=circle(24,26,id==='tree'?19:16,b)+circle(19,18,13,a)+circle(32,25,12,a)+circle(16,29,9,a)+circle(26,12,9,a);}
  else if(id==='table'||id==='crate'||id==='chest'||id==='altar'||id==='bed')body=rect(7,9,34,30,b,5)+rect(11,13,26,22,a,3)+path('M11 13L37 35M37 13L11 35','#d0b7a0',1.5);
  else if(id==='torch'||id==='campfire')body=circle(24,26,12,b)+path('M24 4Q34 15 28 23Q41 15 34 32Q26 45 16 32Q9 23 24 4Z','#ffbf5d',1.4);
  else if(id==='water')body=circle(24,24,17,a);
  else if(id==='portal')body=circle(24,24,21,b)+circle(24,24,15,a)+path('M13 24Q24 10 35 24T13 24','#def7ff',2);
  else if(id==='crystal')body=path('M24 4L40 20L31 43L14 41L8 20Z','#d0b9ff',2)+path('M24 4L24 40M8 20H40','#fff',1.3);
  else if(id==='statue'||id==='pillar')body=circle(24,24,19,b)+circle(24,24,14,a)+circle(24,24,6,'#e0dfd5');
  else if(id==='stairs')body=rect(6,5,36,38,b,3)+Array.from({length:6},(_,i)=>rect(9,8+i*6,30,3,a)).join('');
  else if(id==='barrel')body=circle(24,24,20,b)+circle(24,24,14,a)+circle(24,24,5,b);
  else if(id==='books')body=rect(7,9,35,30,b,3)+rect(11,12,7,24,a)+rect(20,12,7,24,'#d8a875')+rect(29,12,7,24,'#7793a4');
  else if(id==='chair')body=rect(9,9,30,8,b,3)+rect(15,18,18,18,a,3);
  else if(id==='rock')body=path('M6 25L15 8L33 7L44 28L32 43L14 40Z',b,2)+path('M15 8L26 25L44 28','#d4d4d2',1.4);
  else if(id==='flowers')body=circle(24,24,9,'#ffbfd1')+circle(13,13,5,'#efadcf')+circle(34,33,5,'#ecc6e6');
  else if(id==='trap')body=rect(8,8,32,32,b,3)+path('M9 9L39 39M39 9L9 39','#ffe1c4',3);
 }
 return '<svg class="m68-asset-svg" viewBox="0 0 48 48" aria-hidden="true">'+body+'</svg>';
}
function glyph(id){
 const a=get(id);return a?localArt(id,a.primary,a.secondary):'';
}
function renderLayer(scene,layer,cell=48,opts={}){
 const l=scene?.layers;if(!l||!Array.isArray(l[layer]))return '';
 const scale=Math.max(8,Math.min(90,Number(cell)||48)),items=l[layer],out=[];
 for(const item of items){
  if(!Number.isInteger(item.x)||!Number.isInteger(item.y)||item.x<0||item.y<0||item.x>=scene.width||item.y>=scene.height)continue;
  if(layer==='walls'){
   if(!['wall','door'].includes(item.kind)||!['n','e','s','w'].includes(item.side))continue;
   const c=item.kind==='door'?(item.open?'#98d6b4':'#e9c180'):'#b6abb4',side=item.side;
   const horizontal=side==='n'||side==='s',top=(item.y+(side==='s'?1:0))*scale,left=(item.x+(side==='e'?1:0))*scale;
   const inset=horizontal?'width:'+scale+'px;height:6px':'height:'+scale+'px;width:6px';
   out.push('<span class="m68-wall m68-'+item.kind+(item.open?' is-open':'')+'" style="left:'+left+'px;top:'+top+'px;'+inset+';--m68-wall:'+c+'" title="'+(item.kind==='door'?'Porta':'Parede')+'"></span>');
  }else{
   const a=get(item.id);if(!a||a.layer!==layer)continue;
   out.push('<span class="m68-tile m68-'+layer+'" style="left:'+(item.x*scale)+'px;top:'+(item.y*scale)+'px;width:'+scale+'px;height:'+scale+'px" title="'+a.name+'">'+glyph(item.id)+'</span>');
  }
 }
 return '<div class="m68-layer m68-'+layer+'-layer" aria-hidden="true">'+out.join('')+'</div>';
}
if(typeof document!=='undefined'&&document.head&&!document.getElementById('mastermind68-map-style')){
 const style=document.createElement('style');style.id='mastermind68-map-style';
 style.textContent='.m68-layer{position:absolute;inset:0;pointer-events:none;z-index:1}.m68-tile{position:absolute;display:block;overflow:hidden;pointer-events:none;opacity:.97}.m68-asset-svg{display:block;width:100%;height:100%;object-fit:contain}.m68-props-layer{z-index:5}.m68-walls-layer{z-index:7}.m68-wall{position:absolute;display:block;background:var(--m68-wall,#b6abb4);border:1px solid #251f29;border-radius:3px;box-shadow:0 1px 6px #000a;transform:translate(-3px,-3px);pointer-events:none}.m68-wall.m68-door{background:repeating-linear-gradient(45deg,var(--m68-wall) 0 6px,#7c5640 6px 9px)}.m68-wall.is-open{opacity:.38;box-shadow:none}';
 document.head.appendChild(style);
}
return {palette,PACKS,get,ensure,saveSnapshot,restore,paint,erase,edgeFromPoint,wall,toggleDoor,renderLayer,glyph};
});
