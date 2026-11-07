/* Mastermind · revamp — modelo de cena, terrenos, biblioteca de objetos e desenho do mapa.
   Compartilhado pela Mesa (mestre e jogador) e pelo Estúdio de cenários: o que o Estúdio publica
   é exatamente o que a Mesa desenha. Tudo é desenhado em Canvas, sem imagens externas. */
(function(root){
'use strict';
const CELL=48;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const cellSeed=(x,y,s=0)=>(x*73856093)^(y*19349663)^(s*83492791);
function shade(hex,amt){const n=parseInt(hex.slice(1),16);const r=clamp((n>>16)+amt,0,255),g=clamp((n>>8&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return`rgb(${r},${g},${b})`}
function rr(g,x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function circ(g,x,y,r){g.beginPath();g.arc(x,y,r,0,Math.PI*2)}
function fs(g,fill,stroke,lw){if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw||2;g.stroke()}}
function shadowOn(g,b=7,o=3){g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=b;g.shadowOffsetX=o*.4;g.shadowOffsetY=o}
function shadowOff(g){g.shadowColor='transparent';g.shadowBlur=0;g.shadowOffsetX=0;g.shadowOffsetY=0}

/* ---------------- Terrenos ---------------- */
const TERRAINS=[
 ['pedra','Lajota de pedra','#3b3731','tile'],['pedra-fria','Pedra fria','#30343a','tile'],['paralelepipedo','Paralelepípedo','#4a463f','cobble'],
 ['marmore','Mármore','#8d8983','marble'],['madeira','Assoalho','#6a4a2c','planks'],['tabuas-velhas','Tábuas velhas','#4e3b29','planks'],
 ['carpete','Carpete','#5b2433','carpet'],['terra','Terra batida','#4c3b29','dirt'],['cascalho','Cascalho','#5f5a51','gravel'],
 ['grama','Grama','#3e5a2c','grass'],['mato','Mato alto','#33502a','grass'],['areia','Areia','#b39a6a','sand'],
 ['neve','Neve','#d6dbe2','snow'],['gelo','Gelo','#9fc0d1','ice'],['agua','Água rasa','#2f6283','water'],
 ['agua-funda','Água funda','#1a3a58','water'],['pantano','Pântano','#3c4a2d','swamp'],['lava','Lava','#8f2d14','lava'],
 ['asfalto','Asfalto','#2d2f33','asphalt'],['calcada','Calçada','#76726b','pavers'],['piso-frio','Piso de azulejo','#b7bbc0','tiles'],
 ['concreto','Concreto','#6a6c6d','concrete']
].map(([id,name,color,style])=>({id,name,color,style}));
const TERRAIN=Object.fromEntries(TERRAINS.map(t=>[t.id,t]));
const DIFFICULT=new Set(['agua','pantano','mato','neve','areia','cascalho']);   // terreno difícil (aviso no Estúdio)
const IMPASSABLE=new Set(['agua-funda','lava']);

function drawTerrainCell(g,t,x,y,S){
 const R=rng(cellSeed(x,y,7)),px=x*S,py=y*S,base=t.color,j=Math.round((R()-.5)*12);
 g.fillStyle=shade(base,j);g.fillRect(px,py,S,S);
 const line=(c,w,x1,y1,x2,y2)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke()};
 switch(t.style){
  case 'tile':g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1.5;g.strokeRect(px+1.5,py+1.5,S-3,S-3);line('rgba(255,255,255,.04)',1,px+3,py+S-3,px+3,py+3);line('rgba(255,255,255,.04)',1,px+3,py+3,px+S-3,py+3);
   if(R()<.16){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();let cx=px+R()*S,cy=py+R()*S;g.moveTo(cx,cy);for(let i=0;i<3;i++){cx+=(R()-.5)*18;cy+=(R()-.5)*18;g.lineTo(cx,cy)}g.stroke()}break;
  case 'cobble':for(let i=0;i<2;i++)for(let k=0;k<2;k++){const o=(i%2)*6;rr(g,px+3+k*S/2-o/2,py+3+i*S/2,S/2-5,S/2-6,6);fs(g,shade(base,Math.round((R()-.5)*26)),'rgba(0,0,0,.35)',1.5)}break;
  case 'marble':for(let i=0;i<2;i++){g.strokeStyle='rgba(60,55,50,.35)';g.lineWidth=1;g.beginPath();g.moveTo(px+R()*S,py);g.bezierCurveTo(px+R()*S,py+S*.3,px+R()*S,py+S*.7,px+R()*S,py+S);g.stroke()}g.strokeStyle='rgba(0,0,0,.15)';g.strokeRect(px+.5,py+.5,S-1,S-1);break;
  case 'planks':{const n=3,ph=S/n;for(let i=0;i<n;i++){g.fillStyle=shade(base,Math.round((R()-.5)*20));g.fillRect(px,py+i*ph,S,ph-1);line('rgba(0,0,0,.4)',1,px,py+i*ph+ph-.5,px+S,py+i*ph+ph-.5);
   if(R()<.5){const jx=px+R()*S;line('rgba(0,0,0,.35)',1,jx,py+i*ph,jx,py+i*ph+ph-1)}line('rgba(255,255,255,.05)',1,px+R()*8,py+i*ph+ph*.45,px+S-R()*8,py+i*ph+ph*.5)}}break;
  case 'carpet':for(let i=0;i<30;i++){g.fillStyle=`rgba(255,255,255,${R()*.05})`;g.fillRect(px+R()*S,py+R()*S,1.5,1.5)}break;
  case 'dirt':for(let i=0;i<14;i++){g.fillStyle=R()<.5?'rgba(0,0,0,.18)':'rgba(255,230,190,.06)';circ(g,px+R()*S,py+R()*S,R()*2.5+.5);g.fill()}break;
  case 'gravel':for(let i=0;i<22;i++){g.fillStyle=shade(base,Math.round((R()-.3)*50));circ(g,px+R()*S,py+R()*S,R()*2.8+1);g.fill()}break;
  case 'grass':for(let i=0;i<26;i++){const gx=px+R()*S,gy=py+R()*S;line(R()<.5?'rgba(120,170,80,.35)':'rgba(20,40,10,.35)',1.2,gx,gy,gx+(R()-.5)*4,gy-3-R()*5)}break;
  case 'sand':for(let i=0;i<16;i++){g.fillStyle=R()<.5?'rgba(120,90,40,.2)':'rgba(255,240,210,.25)';g.fillRect(px+R()*S,py+R()*S,1.5,1.5)}g.strokeStyle='rgba(150,120,70,.25)';g.beginPath();g.arc(px+S/2,py+S*1.6,S*1.1,Math.PI*1.3,Math.PI*1.7);g.stroke();break;
  case 'snow':for(let i=0;i<10;i++){g.fillStyle='rgba(150,180,210,.25)';circ(g,px+R()*S,py+R()*S,R()*2+.5);g.fill()}break;
  case 'ice':line('rgba(255,255,255,.45)',1,px+R()*S,py,px+R()*S,py+S);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(px+4,py+4,S*.4,3);break;
  case 'water':g.strokeStyle='rgba(180,220,255,.22)';g.lineWidth=1.5;for(let i=0;i<2;i++){const wy=py+S*(.3+i*.4)+(R()-.5)*6;g.beginPath();g.moveTo(px+4,wy);g.quadraticCurveTo(px+S*.3,wy-4,px+S*.5,wy);g.quadraticCurveTo(px+S*.7,wy+4,px+S-4,wy);g.stroke()}break;
  case 'swamp':for(let i=0;i<3;i++){g.fillStyle='rgba(20,30,15,.45)';g.beginPath();g.ellipse(px+R()*S,py+R()*S,4+R()*8,3+R()*5,R()*3,0,7);g.fill()}break;
  case 'lava':g.save();g.shadowColor='#ff9a3c';g.shadowBlur=8;g.strokeStyle='rgba(255,170,60,.85)';g.lineWidth=2;g.beginPath();let lx=px,ly=py+R()*S;g.moveTo(lx,ly);for(let i=0;i<4;i++){lx+=S/4;ly=py+R()*S;g.lineTo(lx,ly)}g.stroke();g.restore();break;
  case 'asphalt':for(let i=0;i<18;i++){g.fillStyle=`rgba(255,255,255,${R()*.06})`;g.fillRect(px+R()*S,py+R()*S,1.2,1.2)}break;
  case 'pavers':g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1;g.strokeRect(px+.5,py+.5,S/2,S/2);g.strokeRect(px+S/2+.5,py+.5,S/2-1,S/2);g.strokeRect(px+.5,py+S/2+.5,S-1,S/2-1);break;
  case 'tiles':g.strokeStyle='rgba(90,95,100,.45)';g.lineWidth=1.5;g.strokeRect(px+.75,py+.75,S/2-.5,S/2-.5);g.strokeRect(px+S/2+.25,py+.75,S/2-1,S/2-.5);g.strokeRect(px+.75,py+S/2+.25,S/2-.5,S/2-1);g.strokeRect(px+S/2+.25,py+S/2+.25,S/2-1,S/2-1);break;
  case 'concrete':for(let i=0;i<8;i++){g.fillStyle=`rgba(0,0,0,${R()*.12})`;circ(g,px+R()*S,py+R()*S,R()*4);g.fill()}break;
 }
}

/* ---------------- Biblioteca de objetos ---------------- */
const CATS=[['mobilia','Mobília'],['arquitetura','Arquitetura'],['natureza','Natureza'],['paranormal','Paranormal'],['moderno','Moderno'],['luzes','Luzes'],['efeitos','Efeitos']];
const ASSETS=[];
function add(cat,id,name,w,h,draw,o={}){ASSETS.push(Object.assign({cat,id,name,w,h,draw,layer:'objetos',blocks:false},o))}
const WOOD='#6b4a2b',WOOD_D='#3a2716',STONE='#6d675e',STONE_D='#2d2a26';
const woodTop=(g,x,y,w,h,r=4,c=WOOD)=>{rr(g,x,y,w,h,r);fs(g,c,WOOD_D,2);g.save();g.clip();g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1;for(let i=1;i<4;i++){g.beginPath();g.moveTo(x,y+h*i/4);g.lineTo(x+w,y+h*i/4);g.stroke()}g.restore()};
// Mobília
add('mobilia','mesa','Mesa',2,1,(g,w,h)=>{shadowOn(g);woodTop(g,4,6,w-8,h-12);shadowOff(g)},{blocks:true});
add('mobilia','mesa-redonda','Mesa redonda',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,w*.4);fs(g,WOOD,WOOD_D,2);shadowOff(g);circ(g,w/2,h/2,w*.25);fs(g,null,'rgba(0,0,0,.2)',1)},{blocks:true});
add('mobilia','cadeira','Cadeira',1,1,(g,w,h)=>{shadowOn(g,4,2);rr(g,w*.25,w*.3,w*.5,h*.45,4);fs(g,WOOD,WOOD_D,2);rr(g,w*.22,h*.18,w*.56,h*.12,3);fs(g,shade(WOOD,-15),WOOD_D,2);shadowOff(g)});
add('mobilia','banco','Banco',2,1,(g,w,h)=>{shadowOn(g,4,2);woodTop(g,4,h*.32,w-8,h*.36,3);shadowOff(g)});
add('mobilia','cama','Cama',1,2,(g,w,h)=>{shadowOn(g);rr(g,3,3,w-6,h-6,5);fs(g,WOOD,WOOD_D,2);shadowOff(g);rr(g,7,7,w-14,h-14,4);fs(g,'#cdc6b8');rr(g,10,10,w-20,h*.16,4);fs(g,'#ece8df');rr(g,7,h*.38,w-14,h*.58,4);fs(g,'#6d2b3a','#4a1c27',1)},{blocks:true});
add('mobilia','estante','Estante de livros',2,1,(g,w,h)=>{shadowOn(g);rr(g,3,4,w-6,h*.55,3);fs(g,'#4a3220',WOOD_D,2);shadowOff(g);const c=['#7a2030','#2f4b6e','#6b5a2a','#355a3a','#5a3b6e'];for(let i=0;i<11;i++){g.fillStyle=c[i%5];g.fillRect(8+i*(w-16)/11,8,(w-16)/11-1.5,h*.42)}},{blocks:true});
add('mobilia','bau','Baú',1,1,(g,w,h)=>{shadowOn(g);rr(g,6,10,w-12,h-20,4);fs(g,'#7a5530',WOOD_D,2);shadowOff(g);g.fillStyle='#b8a27a';g.fillRect(6,h*.42,w-12,4);g.fillRect(w*.3,10,3,h-20);g.fillRect(w*.67,10,3,h-20);rr(g,w/2-4,h*.38,8,9,2);fs(g,'#d8c08a','#5a4520',1)});
add('mobilia','barril','Barril',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,w*.38);fs(g,'#7a5530',WOOD_D,2);shadowOff(g);[.3,.2].forEach(r=>{circ(g,w/2,h/2,w*r);fs(g,null,'rgba(30,20,10,.6)',2)});circ(g,w/2,h/2,w*.08);fs(g,'#3a2716')},{blocks:true});
add('mobilia','caixote','Caixote',1,1,(g,w,h)=>{shadowOn(g);rr(g,7,7,w-14,h-14,2);fs(g,'#6b4a2b',WOOD_D,2);shadowOff(g);g.strokeStyle=WOOD_D;g.lineWidth=2;g.beginPath();g.moveTo(7,7);g.lineTo(w-7,h-7);g.moveTo(w-7,7);g.lineTo(7,h-7);g.stroke()},{blocks:true});
add('mobilia','armario','Armário',1,1,(g,w,h)=>{shadowOn(g);rr(g,5,6,w-10,h*.6,3);fs(g,'#4f3622',WOOD_D,2);shadowOff(g);g.strokeStyle=WOOD_D;g.beginPath();g.moveTo(w/2,8);g.lineTo(w/2,h*.6+4);g.stroke();circ(g,w/2-4,h*.35,2);fs(g,'#c7a87b');circ(g,w/2+4,h*.35,2);fs(g,'#c7a87b')},{blocks:true});
add('mobilia','trono','Trono',1,1,(g,w,h)=>{shadowOn(g);rr(g,6,4,w-12,h-10,6);fs(g,'#8a6d3b','#4a3a1a',2);shadowOff(g);rr(g,11,h*.38,w-22,h*.45,4);fs(g,'#7a2030');rr(g,9,7,w-18,h*.22,4);fs(g,'#a8864b')},{blocks:true});
add('mobilia','tapete','Tapete',2,3,(g,w,h)=>{rr(g,4,4,w-8,h-8,3);fs(g,'#4e2230');g.strokeStyle='#9b7a4a';g.lineWidth=3;g.strokeRect(10,10,w-20,h-20);g.strokeStyle='rgba(155,122,74,.5)';g.lineWidth=1;g.strokeRect(17,17,w-34,h-34);g.beginPath();g.moveTo(w/2,22);g.lineTo(w-22,h/2);g.lineTo(w/2,h-22);g.lineTo(22,h/2);g.closePath();g.stroke()},{layer:'chao'});
add('mobilia','lareira','Lareira',2,1,(g,w,h)=>{shadowOn(g);rr(g,3,3,w-6,h*.7,4);fs(g,STONE,STONE_D,2);shadowOff(g);rr(g,w*.2,8,w*.6,h*.42,3);fs(g,'#1b120c');const gr=g.createRadialGradient(w/2,h*.3,2,w/2,h*.3,w*.25);gr.addColorStop(0,'#ffd27a');gr.addColorStop(1,'rgba(255,90,20,0)');g.fillStyle=gr;g.fillRect(w*.2,8,w*.6,h*.42)},{blocks:true,light:{r:4,color:'#ffb35c'}});
add('mobilia','balcao','Balcão',3,1,(g,w,h)=>{shadowOn(g);woodTop(g,3,h*.18,w-6,h*.5,4,'#5a3d22');shadowOff(g);g.fillStyle='rgba(255,255,255,.08)';g.fillRect(6,h*.2,w-12,3)},{blocks:true});
// Arquitetura
add('arquitetura','escada','Escada',1,2,(g,w,h)=>{const n=8;for(let i=0;i<n;i++){g.fillStyle=shade('#6d675e',-i*7);g.fillRect(3,3+i*(h-6)/n,w-6,(h-6)/n-1)}g.strokeStyle=STONE_D;g.lineWidth=2;g.strokeRect(3,3,w-6,h-6)});
add('arquitetura','alcapao','Alçapão',1,1,(g,w,h)=>{woodTop(g,6,6,w-12,h-12,2,'#5a3d22');circ(g,w/2,h/2+4,5);fs(g,null,'#b8a27a',2)});
add('arquitetura','pilar','Pilar',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,17);fs(g,'#24211d','#5c544a',3);shadowOff(g);circ(g,w/2-5,h/2-5,6);fs(g,'rgba(255,255,255,.08)')},{blocks:true});
add('arquitetura','coluna-quebrada','Coluna quebrada',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,15);fs(g,'#3b3731','#5c544a',3);shadowOff(g);g.strokeStyle='#1d1b18';g.lineWidth=2;g.beginPath();g.moveTo(w/2-8,h/2-10);g.lineTo(w/2+2,h/2);g.lineTo(w/2-3,h/2+9);g.stroke();[[8,38],[38,10],[40,40]].forEach(([x,y])=>{circ(g,x,y,3);fs(g,'#5c544a')})},{blocks:true});
add('arquitetura','estatua','Estátua',1,1,(g,w,h)=>{shadowOn(g);rr(g,6,6,w-12,h-12,3);fs(g,'#5d5a55','#2d2a26',2);shadowOff(g);circ(g,w/2,h*.36,6);fs(g,'#9a958c');rr(g,w/2-9,h*.46,18,h*.32,6);fs(g,'#8a857c')},{blocks:true});
add('arquitetura','fonte','Fonte',2,2,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,w*.45);fs(g,STONE,STONE_D,3);shadowOff(g);circ(g,w/2,h/2,w*.37);fs(g,'#2f6283');circ(g,w/2,h/2,w*.1);fs(g,STONE,STONE_D,2);g.strokeStyle='rgba(180,220,255,.35)';[.18,.26].forEach(r=>{circ(g,w/2,h/2,w*r);g.stroke()})},{blocks:true});
add('arquitetura','poco','Poço',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,w*.42);fs(g,STONE,STONE_D,3);shadowOff(g);circ(g,w/2,h/2,w*.28);fs(g,'#0d1418')},{blocks:true});
add('arquitetura','escombros','Escombros',1,1,(g,w,h)=>{const R=rng(5);for(let i=0;i<7;i++){g.beginPath();const cx=6+R()*(w-12),cy=6+R()*(h-12),s=4+R()*7;g.moveTo(cx-s,cy);g.lineTo(cx,cy-s);g.lineTo(cx+s*.8,cy+s*.3);g.lineTo(cx-s*.2,cy+s);g.closePath();fs(g,shade('#6d675e',Math.round((R()-.5)*40)),STONE_D,1)}});
add('arquitetura','grade','Grade de ferro',3,1,(g,w,h)=>{g.strokeStyle='#6d6a64';g.lineWidth=3;g.beginPath();g.moveTo(4,h/2);g.lineTo(w-4,h/2);g.stroke();for(let x=6;x<w;x+=12){circ(g,x,h/2,3);fs(g,'#8d8a84','#2d2a26',1)}});
// Natureza
const leaf=(g,cx,cy,r,c1,c2)=>{const gr=g.createRadialGradient(cx-r*.3,cy-r*.3,1,cx,cy,r);gr.addColorStop(0,c1);gr.addColorStop(1,c2);circ(g,cx,cy,r);g.fillStyle=gr;g.fill()};
add('natureza','arvore','Árvore',2,2,(g,w,h)=>{const R=rng(11);shadowOn(g,12,6);leaf(g,w/2,h/2,w*.42,'#5f8a3c','#23401a');shadowOff(g);for(let i=0;i<7;i++){const a=R()*7,d=w*.22;leaf(g,w/2+Math.cos(a)*d,h/2+Math.sin(a)*d,w*.16,'#6d9a45','#2c4d20')}},{blocks:true});
add('natureza','pinheiro','Pinheiro',2,2,(g,w,h)=>{shadowOn(g,10,5);for(let k=0;k<3;k++){const r=w*(.46-k*.12);g.beginPath();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,rr2=i%2?r*.72:r;g.lineTo(w/2+Math.cos(a)*rr2,h/2+Math.sin(a)*rr2)}g.closePath();fs(g,shade('#244a2e',k*14),'#132a18',1.5);if(!k)shadowOff(g)}},{blocks:true});
add('natureza','arbusto','Arbusto',1,1,(g,w,h)=>{shadowOn(g,6,3);[[.5,.5,.3],[.35,.4,.2],[.65,.42,.2],[.5,.66,.2]].forEach(([x,y,r],i)=>{leaf(g,w*x,h*y,w*r,'#6d9a45','#2c4d20');if(!i)shadowOff(g)})});
add('natureza','pedra','Pedra',1,1,(g,w,h)=>{shadowOn(g);g.beginPath();g.moveTo(10,h*.6);g.lineTo(w*.3,10);g.lineTo(w*.75,12);g.lineTo(w-8,h*.55);g.lineTo(w*.6,h-9);g.lineTo(w*.25,h-10);g.closePath();fs(g,'#77736b','#3a3731',2);shadowOff(g);g.beginPath();g.moveTo(w*.32,14);g.lineTo(w*.7,16);g.lineTo(w*.5,h*.45);g.closePath();fs(g,'rgba(255,255,255,.12)')},{blocks:true});
add('natureza','rocha-grande','Rocha grande',2,2,(g,w,h)=>{shadowOn(g,12,5);g.beginPath();g.moveTo(10,h*.55);g.lineTo(w*.22,12);g.lineTo(w*.7,8);g.lineTo(w-8,h*.45);g.lineTo(w*.72,h-8);g.lineTo(w*.2,h-12);g.closePath();fs(g,'#6d6960','#33302b',2.5);shadowOff(g);g.beginPath();g.moveTo(w*.25,16);g.lineTo(w*.66,14);g.lineTo(w*.5,h*.5);g.closePath();fs(g,'rgba(255,255,255,.1)')},{blocks:true});
add('natureza','tronco','Tronco caído',2,1,(g,w,h)=>{shadowOn(g,6,3);rr(g,4,h*.28,w-8,h*.44,10);fs(g,'#5a3d22','#2c1d10',2);shadowOff(g);circ(g,w-12,h/2,h*.2);fs(g,'#a07a4a','#2c1d10',1.5);circ(g,w-12,h/2,h*.1);fs(g,null,'#6b4a2b',1)},{blocks:true});
add('natureza','flores','Flores',1,1,(g,w,h)=>{const R=rng(3);for(let i=0;i<9;i++){const x=8+R()*(w-16),y=8+R()*(h-16);circ(g,x,y,3.5);fs(g,['#e3a0c0','#f1d36b','#e8e7e7','#b39af0'][i%4])}});
add('natureza','cogumelos','Cogumelos',1,1,(g,w,h)=>{[[.35,.4,7],[.62,.55,9],[.42,.7,5]].forEach(([x,y,r])=>{circ(g,w*x,h*y,r);fs(g,'#4fd1c5','#1c5f5a',1.5);circ(g,w*x-2,h*y-2,r*.3);fs(g,'rgba(255,255,255,.6)')})},{light:{r:1.5,color:'#4fd1c5'}});
add('natureza','fogueira','Fogueira',1,1,(g,w,h)=>{for(let i=0;i<8;i++){const a=i/8*7;circ(g,w/2+Math.cos(a)*15,h/2+Math.sin(a)*15,4.5);fs(g,'#6d675e','#2d2a26',1)}g.strokeStyle='#4a3020';g.lineWidth=4;g.beginPath();g.moveTo(w/2-9,h/2-9);g.lineTo(w/2+9,h/2+9);g.moveTo(w/2+9,h/2-9);g.lineTo(w/2-9,h/2+9);g.stroke();const gr=g.createRadialGradient(w/2,h/2,1,w/2,h/2,11);gr.addColorStop(0,'#fff1b0');gr.addColorStop(.5,'#ff9a3c');gr.addColorStop(1,'rgba(255,60,20,0)');circ(g,w/2,h/2,11);g.fillStyle=gr;g.fill()},{light:{r:5,color:'#ffb35c'}});
add('natureza','toco','Toco',1,1,(g,w,h)=>{shadowOn(g,5,2);circ(g,w/2,h/2,w*.3);fs(g,'#8a6a42','#3a2716',2);shadowOff(g);[.2,.1].forEach(r=>{circ(g,w/2,h/2,w*r);fs(g,null,'rgba(58,39,22,.6)',1)})},{blocks:true});
add('natureza','teia','Teia',1,1,(g,w,h)=>{g.strokeStyle='rgba(235,235,235,.55)';g.lineWidth=1;for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.beginPath();g.moveTo(w/2,h/2);g.lineTo(w/2+Math.cos(a)*w*.48,h/2+Math.sin(a)*h*.48);g.stroke()}[.12,.24,.36].forEach(r=>{circ(g,w/2,h/2,w*r);g.stroke()})},{layer:'efeitos'});
// Paranormal
add('paranormal','circulo-ritual','Círculo ritual',3,3,(g,w,h)=>{const cx=w/2,cy=h/2;g.strokeStyle='rgba(224,112,124,.6)';g.lineWidth=2.5;circ(g,cx,cy,w*.44);g.stroke();circ(g,cx,cy,w*.34);g.stroke();g.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*4*Math.PI/5;g[i?'lineTo':'moveTo'](cx+Math.cos(a)*w*.34,cy+Math.sin(a)*w*.34)}g.stroke();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(cx+Math.cos(a)*w*.36,cy+Math.sin(a)*w*.36);g.lineTo(cx+Math.cos(a)*w*.42,cy+Math.sin(a)*w*.42);g.stroke()}},{layer:'chao'});
add('paranormal','altar','Altar',2,1,(g,w,h)=>{shadowOn(g);rr(g,4,6,w-8,h-12,3);fs(g,'#4d4a45','#23211e',2);shadowOff(g);g.fillStyle='#6d1f2c';g.fillRect(w*.25,6,w*.5,h-12);[[.15,.5],[.85,.5]].forEach(([x,y])=>{circ(g,w*x,h*y,3.5);fs(g,'#e8dcc0');circ(g,w*x,h*y-3,2);fs(g,'#ffcf6b')})},{blocks:true,light:{r:2,color:'#ffcf6b'}});
add('paranormal','sarcofago','Sarcófago',1,2,(g,w,h)=>{shadowOn(g);g.beginPath();g.moveTo(w*.3,5);g.lineTo(w*.7,5);g.lineTo(w-5,h*.3);g.lineTo(w*.78,h-5);g.lineTo(w*.22,h-5);g.lineTo(5,h*.3);g.closePath();fs(g,'#5d5a55','#23211e',2);shadowOff(g);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;g.beginPath();g.moveTo(w/2,12);g.lineTo(w/2,h-12);g.moveTo(w*.3,h*.3);g.lineTo(w*.7,h*.3);g.stroke()},{blocks:true});
add('paranormal','ossos','Ossos',1,1,(g,w,h)=>{g.strokeStyle='#e5e0d3';g.lineWidth=3;g.lineCap='round';[[10,30,30,14],[16,38,38,34],[28,10,40,22]].forEach(([a,b,c,d])=>{g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke()});circ(g,w*.32,h*.62,6);fs(g,'#e5e0d3');circ(g,w*.29,h*.6,1.4);fs(g,'#222');circ(g,w*.36,h*.6,1.4);fs(g,'#222')},{layer:'chao'});
add('paranormal','caldeirao','Caldeirão',1,1,(g,w,h)=>{shadowOn(g);circ(g,w/2,h/2,w*.38);fs(g,'#1b1c1f','#000',2);shadowOff(g);circ(g,w/2,h/2,w*.29);fs(g,'#58c46a');[[.42,.45,3],[.58,.55,2],[.5,.38,2]].forEach(([x,y,r])=>{circ(g,w*x,h*y,r);fs(g,'rgba(220,255,220,.7)')})},{blocks:true,light:{r:2,color:'#7cff8a'}});
add('paranormal','velas','Velas',1,1,(g,w,h)=>{[[.35,.4],[.62,.38],[.5,.66]].forEach(([x,y])=>{circ(g,w*x,h*y,4.5);fs(g,'#e8dcc0','#8a7f6a',1);circ(g,w*x,h*y-1,2);fs(g,'#ffcf6b')})},{light:{r:3,color:'#ffbe6e'}});
add('paranormal','sigilo','Sigilo',2,2,(g,w,h)=>{const cx=w/2,cy=h/2;g.strokeStyle='rgba(156,144,221,.65)';g.lineWidth=2;circ(g,cx,cy,w*.4);g.stroke();g.beginPath();g.moveTo(cx,cy-w*.4);g.lineTo(cx+w*.35,cy+w*.2);g.lineTo(cx-w*.35,cy+w*.2);g.closePath();g.stroke();g.beginPath();g.moveTo(cx-w*.4,cy);g.lineTo(cx+w*.4,cy);g.stroke();circ(g,cx,cy,w*.08);g.stroke()},{layer:'chao'});
add('paranormal','poca-sangue','Poça de sangue',1,1,(g,w,h)=>{g.fillStyle='rgba(110,18,28,.8)';[[.5,.5,14],[.3,.62,7],[.68,.35,6],[.62,.72,4]].forEach(([x,y,r])=>{g.beginPath();g.ellipse(w*x,h*y,r,r*.75,.6,0,7);g.fill()})},{layer:'chao'});
add('paranormal','espelho','Espelho',1,1,(g,w,h)=>{shadowOn(g);g.beginPath();g.ellipse(w/2,h/2,w*.28,h*.38,0,0,7);fs(g,'#a8b4bf','#8a6d3b',4);shadowOff(g);g.beginPath();g.ellipse(w/2-4,h/2-6,w*.08,h*.14,-.5,0,7);fs(g,'rgba(255,255,255,.4)')},{blocks:true});
add('paranormal','livro-ritual','Livro ritual',1,1,(g,w,h)=>{shadowOn(g,4,2);g.beginPath();g.moveTo(8,14);g.lineTo(w/2,18);g.lineTo(w-8,14);g.lineTo(w-8,h-12);g.lineTo(w/2,h-8);g.lineTo(8,h-12);g.closePath();fs(g,'#e5dcc5','#5a4520',1.5);shadowOff(g);g.strokeStyle='rgba(122,32,48,.8)';g.lineWidth=1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(12,22+i*5);g.lineTo(w/2-4,24+i*5);g.moveTo(w/2+4,24+i*5);g.lineTo(w-12,22+i*5);g.stroke()}});
// Moderno
add('moderno','carro','Carro',2,4,(g,w,h)=>{shadowOn(g,12,5);rr(g,6,6,w-12,h-12,14);fs(g,'#2d4a6b','#14202e',2);shadowOff(g);rr(g,12,h*.22,w-24,h*.14,6);fs(g,'#16212c');rr(g,12,h*.62,w-24,h*.12,6);fs(g,'#16212c');rr(g,14,h*.38,w-28,h*.22,5);fs(g,'#3c5e85');[[4,h*.18],[w-10,h*.18],[4,h*.72],[w-10,h*.72]].forEach(([x,y])=>{g.fillStyle='#0b0d12';g.fillRect(x,y,6,h*.12)});g.fillStyle='#f6e7a6';g.fillRect(12,8,8,4);g.fillRect(w-20,8,8,4)},{blocks:true});
add('moderno','sofa','Sofá',2,1,(g,w,h)=>{shadowOn(g);rr(g,3,6,w-6,h-12,8);fs(g,'#4a5568','#232a35',2);shadowOff(g);rr(g,10,6,w-20,h*.25,4);fs(g,'#5a667a');g.strokeStyle='rgba(0,0,0,.25)';g.beginPath();g.moveTo(w/2,h*.35);g.lineTo(w/2,h-10);g.stroke()},{blocks:true});
add('moderno','mesa-escritorio','Mesa de escritório',2,1,(g,w,h)=>{shadowOn(g);rr(g,3,5,w-6,h-10,3);fs(g,'#5d6168','#2c2f34',2);shadowOff(g);rr(g,w*.35,8,w*.3,7,2);fs(g,'#14161a');rr(g,w*.32,h*.55,w*.36,6,2);fs(g,'#2c2f34');rr(g,w*.15,h*.5,8,10,2);fs(g,'#e8e7e7')},{blocks:true});
add('moderno','arquivo','Arquivo de aço',1,1,(g,w,h)=>{shadowOn(g);rr(g,8,6,w-16,h-12,2);fs(g,'#7d838c','#3a3e44',2);shadowOff(g);g.strokeStyle='#3a3e44';for(let i=1;i<3;i++){g.beginPath();g.moveTo(8,6+i*(h-12)/3);g.lineTo(w-8,6+i*(h-12)/3);g.stroke()}},{blocks:true});
add('moderno','geladeira','Geladeira',1,1,(g,w,h)=>{shadowOn(g);rr(g,7,5,w-14,h-10,4);fs(g,'#d9dcdf','#8a8e93',2);shadowOff(g);g.strokeStyle='#8a8e93';g.beginPath();g.moveTo(7,h*.4);g.lineTo(w-7,h*.4);g.stroke();g.fillStyle='#8a8e93';g.fillRect(w-14,12,3,8)},{blocks:true});
add('moderno','maca','Maca hospitalar',1,2,(g,w,h)=>{shadowOn(g);rr(g,6,4,w-12,h-8,4);fs(g,'#9aa2ab','#4a5058',2);shadowOff(g);rr(g,9,8,w-18,h-16,3);fs(g,'#eef1f4');rr(g,12,10,w-24,h*.12,3);fs(g,'#ffffff','#cfd5db',1)},{blocks:true});
add('moderno','poste','Poste de luz',1,1,(g,w,h)=>{circ(g,w/2,h/2,5);fs(g,'#2c2f34','#14161a',1.5);circ(g,w/2,h/2,9);fs(g,null,'rgba(220,235,255,.5)',2)},{blocks:true,light:{r:5,color:'#cfe3ff'}});
add('moderno','cerca','Cerca',3,1,(g,w,h)=>{g.strokeStyle='#8a7f6a';g.lineWidth=3;g.beginPath();g.moveTo(3,h/2-3);g.lineTo(w-3,h/2-3);g.moveTo(3,h/2+3);g.lineTo(w-3,h/2+3);g.stroke();for(let x=6;x<w;x+=20){rr(g,x-3,h/2-6,6,12,1);fs(g,'#6b5e48','#3a3222',1)}});
add('moderno','lixeira','Lixeira',1,1,(g,w,h)=>{shadowOn(g,5,2);circ(g,w/2,h/2,w*.26);fs(g,'#2f5a3a','#163020',2);shadowOff(g);circ(g,w/2,h/2,w*.14);fs(g,null,'rgba(0,0,0,.35)',2)},{blocks:true});
add('moderno','vaso-planta','Vaso com planta',1,1,(g,w,h)=>{circ(g,w/2,h/2,w*.24);fs(g,'#8a5a3a','#4a2d1a',2);for(let i=0;i<6;i++){const a=i/6*7;g.beginPath();g.ellipse(w/2+Math.cos(a)*9,h/2+Math.sin(a)*9,8,4,a,0,7);fs(g,'#4f8a46','#244a20',1)}});
add('moderno','cadeira-escritorio','Cadeira de escritório',1,1,(g,w,h)=>{g.strokeStyle='#14161a';g.lineWidth=2.5;for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;g.beginPath();g.moveTo(w/2,h/2);g.lineTo(w/2+Math.cos(a)*15,h/2+Math.sin(a)*15);g.stroke()}shadowOn(g,4,2);circ(g,w/2,h/2,10);fs(g,'#2c2f34','#0b0d12',1.5);shadowOff(g);rr(g,w/2-10,h/2-15,20,6,3);fs(g,'#3a3e44')});
add('moderno','mesa-reuniao','Mesa de reunião',3,2,(g,w,h)=>{shadowOn(g,10,4);rr(g,8,10,w-16,h-20,14);fs(g,'#4a3322','#22160d',2);shadowOff(g);g.fillStyle='rgba(255,255,255,.06)';rr(g,14,15,w-28,8,4);g.fill()},{blocks:true});
// Luzes
add('luzes','tocha','Tocha',1,1,(g,w,h)=>{g.strokeStyle='#4a3020';g.lineWidth=4;g.beginPath();g.moveTo(w/2,h*.75);g.lineTo(w/2,h*.4);g.stroke();const gr=g.createRadialGradient(w/2,h*.33,1,w/2,h*.33,10);gr.addColorStop(0,'#fff1b0');gr.addColorStop(.5,'#ff9a3c');gr.addColorStop(1,'rgba(255,60,20,0)');circ(g,w/2,h*.33,10);g.fillStyle=gr;g.fill()},{layer:'luzes',light:{r:4,color:'#ffb35c'}});
add('luzes','lampiao','Lampião',1,1,(g,w,h)=>{rr(g,w/2-7,h/2-9,14,18,3);fs(g,'rgba(255,207,107,.85)','#3a2716',2);g.fillStyle='#3a2716';g.fillRect(w/2-8,h/2-11,16,3)},{layer:'luzes',light:{r:3,color:'#ffcf6b'}});
add('luzes','vela','Vela',1,1,(g,w,h)=>{circ(g,w/2,h/2,4);fs(g,'#e8dcc0','#8a7f6a',1);circ(g,w/2,h/2-1,2);fs(g,'#ffcf6b')},{layer:'luzes',light:{r:2,color:'#ffbe6e'}});
add('luzes','lampada','Lâmpada fria',1,1,(g,w,h)=>{circ(g,w/2,h/2,7);fs(g,'#eef6ff','#9fb6cc',2)},{layer:'luzes',light:{r:4,color:'#cfe3ff'}});
add('luzes','luz-ritual','Luz ritual',1,1,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,1,w/2,h/2,10);gr.addColorStop(0,'#ffd0d6');gr.addColorStop(1,'rgba(224,112,124,0)');circ(g,w/2,h/2,10);g.fillStyle=gr;g.fill()},{layer:'luzes',light:{r:3,color:'#e0707c'}});
// Efeitos (os dois primeiros já existem no editor atual como névoa e escuridão volumétricas)
const blobs=(g,w,h,color,n,seed)=>{const R=rng(seed);for(let i=0;i<n;i++){const x=w*.15+R()*w*.7,y=h*.15+R()*h*.7,r=w*(.18+R()*.18),gr=g.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;circ(g,x,y,r);g.fill()}};
add('efeitos','nevoa','Névoa volumétrica',3,3,(g,w,h)=>blobs(g,w,h,'rgba(220,226,235,.32)',9,21),{layer:'efeitos'});
add('efeitos','escuridao','Escuridão volumétrica',3,3,(g,w,h)=>blobs(g,w,h,'rgba(3,4,8,.62)',9,22),{layer:'efeitos'});
add('efeitos','fumaca','Fumaça',2,2,(g,w,h)=>blobs(g,w,h,'rgba(120,120,125,.4)',7,23),{layer:'efeitos'});
add('efeitos','fogo','Fogo',2,2,(g,w,h)=>{blobs(g,w,h,'rgba(255,120,40,.55)',6,24);blobs(g,w,h,'rgba(255,220,120,.5)',4,25)},{layer:'efeitos',light:{r:4,color:'#ff9a3c'}});
add('efeitos','respingo','Respingo de sangue',1,1,(g,w,h)=>{const R=rng(9);g.fillStyle='rgba(110,18,28,.8)';for(let i=0;i<12;i++){circ(g,w/2+(R()-.5)*w*.8,h/2+(R()-.5)*h*.8,R()*3+1);g.fill()}},{layer:'chao'});
const ASSET=Object.fromEntries(ASSETS.map(a=>[a.id,a]));
const LAYERS=[['fundo','Fundo e terreno'],['chao','Decoração do chão'],['paredes','Paredes e portas'],['objetos','Objetos'],['luzes','Luzes'],['efeitos','Efeitos'],['tokens','Tokens'],['nevoa','Névoa'],['notas','Notas do mestre']];
const WALL_MATERIALS=[['pedra','Pedra','#5b564e'],['madeira','Madeira','#6b4a2b'],['tijolo','Tijolo','#7a4a3a'],['metal','Metal','#7d838c'],['rocha','Rocha natural','#3f3b34']];
const DOOR_TYPES=[['porta','Porta'],['dupla','Porta dupla'],['secreta','Porta secreta'],['janela','Janela'],['grade','Grade']];
const BACKGROUNDS=[['rocha','Rocha escura'],['vazio','Vazio'],['grama','Campo'],['agua','Mar'],['areia','Deserto'],['neve','Neve']];

/* ---------------- Modelo ---------------- */
const ek={h:(x,y)=>'h:'+x+','+y,v:(x,y)=>'v:'+x+','+y};
function blank(name='Novo cenário',cols=24,rows=16){return{id:'cena-'+Math.random().toString(36).slice(2,8),name,cols,rows,meters:1.5,system:'ordem-paranormal',
 grid:{show:true,color:'#ffffff',alpha:.12,width:1,overTerrainOnly:true},bg:'rocha',image:null,imageOpacity:1,
 terrain:{},walls:{},doors:{},objects:[],fog:[],notes:[],ambient:{time:'dia',mist:0,weather:'nenhum'},layers:Object.fromEntries(LAYERS.map(([id])=>[id,{visible:true,locked:false}]))}}
let oid=0;const obj=(asset,x,y,o={})=>{const a=ASSET[asset];return Object.assign({id:'o'+(++oid)+Math.random().toString(36).slice(2,5),asset,x,y,w:a.w,h:a.h,rot:0,opacity:1,tint:null,layer:a.layer,hidden:false,locked:false,blocks:a.blocks,blocksSight:a.blocks&&['estante','armario','arvore','pinheiro','rocha-grande','carro','geladeira'].includes(asset),light:a.light?Object.assign({},a.light,{on:true}):null,label:''},o)};
function paintRect(s,x,y,w,h,t){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(i>=0&&j>=0&&i<s.cols&&j<s.rows)s.terrain[i+','+j]=t}
function autoWalls(s,material='pedra',onlyAround=null){
 const has=(x,y)=>!!s.terrain[x+','+y];const keys=onlyAround?onlyAround:Object.keys(s.terrain);
 keys.forEach(k=>{const[x,y]=k.split(',').map(Number);if(!has(x,y))return;
  if(!has(x,y-1))s.walls[ek.h(x,y)]=material;if(!has(x,y+1))s.walls[ek.h(x,y+1)]=material;
  if(!has(x-1,y))s.walls[ek.v(x,y)]=material;if(!has(x+1,y))s.walls[ek.v(x+1,y)]=material})}
function roomWalls(s,x,y,w,h,material){ // contorno da sala com paredes; paredes internas removidas
 for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){if(j>y)delete s.walls[ek.h(i,j)];if(i>x)delete s.walls[ek.v(i,j)]}
 for(let i=x;i<x+w;i++){s.walls[ek.h(i,y)]=material;s.walls[ek.h(i,y+h)]=material}
 for(let j=y;j<y+h;j++){s.walls[ek.v(x,j)]=material;s.walls[ek.v(x+w,j)]=material}}

/* Cena padrão: o mesmo Corredor do Forte da primeira versão, agora montado com as peças do Estúdio. */
function defaultScene(){
 const s=blank('Corredor do Forte',24,16);
 paintRect(s,1,4,7,8,'pedra');paintRect(s,8,6,8,4,'pedra');paintRect(s,16,2,7,12,'tabuas-velhas');paintRect(s,9,1,6,4,'pedra-fria');paintRect(s,9,11,6,4,'pedra');
 s.terrain['11,5']='pedra';s.terrain['12,10']='pedra';autoWalls(s,'pedra');
 s.doors[ek.h(11,5)]={type:'porta',open:false};s.doors[ek.h(12,11)]={type:'grade',open:false};
 s.objects.push(obj('tapete',18,5),obj('pilar',17,3),obj('pilar',21,3),obj('pilar',17,12),obj('pilar',21,12),obj('circulo-ritual',10,1),obj('poca-sangue',13,7),obj('respingo',13,8),obj('respingo',12,8),
  obj('mesa',2,5),obj('caixote',6,10),obj('caixote',6,11),obj('caixote',5,11),obj('grade',9,12,{w:6,h:1}),obj('velas',2,4),obj('vela',7,8),obj('vela',16,7),obj('vela',22,7),obj('vela',11,6),obj('altar',11,1,{w:2,h:1}),obj('estante',19,2));
 s.fog=[];['9,1,6,4','9,11,6,4'].forEach(r=>{const[x,y,w,h]=r.split(',').map(Number);for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)s.fog.push(i+','+j)});s.fog.push('11,5','12,10');
 s.notes.push({id:'n1',x:12,y:2,text:'Aberração acorda se alguém pisar no círculo.'});
 return s}

/* Modelos prontos do Estúdio */
const TEMPLATES=[['vazio','Em branco'],['masmorra','Masmorra'],['taverna','Taverna'],['floresta','Clareira na floresta'],['caverna','Caverna'],['rua','Rua à noite (moderno)']];
function template(id,cols=24,rows=16){
 if(id==='masmorra'){const s=defaultScene();s.name='Masmorra';s.notes=[];return s}
 const s=blank(TEMPLATES.find(t=>t[0]===id)?.[1]||'Novo cenário',cols,rows);const R=rng(cols*31+rows*7+id.length);
 if(id==='vazio')return s;
 if(id==='taverna'){paintRect(s,2,2,cols-4,rows-4,'madeira');autoWalls(s,'madeira');s.doors[ek.h(Math.floor(cols/2),rows-2)]={type:'dupla',open:true};
  s.objects.push(obj('balcao',4,3),obj('barril',3,3),obj('barril',3,4),obj('estante',8,2),obj('lareira',cols-6,2),obj('tapete',cols-8,4,{w:3,h:2}));
  for(let i=0;i<4;i++){const x=5+i*4,y=8+(i%2)*3;s.objects.push(obj('mesa-redonda',x,y),obj('cadeira',x-1,y),obj('cadeira',x+1,y,{rot:180}),obj('vela',x,y,{layer:'luzes'}))}
  s.objects.push(obj('lampiao',2,6),obj('lampiao',cols-3,10));s.ambient.time='noite';return s}
 if(id==='floresta'){paintRect(s,0,0,cols,rows,'grama');s.bg='grama';s.grid.overTerrainOnly=false;
  for(let k=0;k<cols*rows*.12;k++)s.terrain[Math.floor(R()*cols)+','+Math.floor(R()*rows)]='mato';
  let py=Math.floor(rows/2);for(let x=0;x<cols;x++){py=clamp(py+(R()<.3?(R()<.5?-1:1):0),2,rows-3);s.terrain[x+','+py]='terra';s.terrain[x+','+(py+1)]='terra'}
  const cx=Math.floor(cols/2),cy=Math.floor(rows/2);paintRect(s,cx-2,cy-2,5,5,'terra');s.objects.push(obj('fogueira',cx,cy),obj('tronco',cx-2,cy-2),obj('tronco',cx,cy+2));
  for(let k=0;k<cols*rows*.05;k++){const x=Math.floor(R()*(cols-1)),y=Math.floor(R()*(rows-1));if(s.terrain[x+','+y]==='terra'||Math.abs(x-cx)<4&&Math.abs(y-cy)<4)continue;s.objects.push(obj(R()<.5?'arvore':'pinheiro',x,y))}
  for(let k=0;k<cols*rows*.03;k++){const x=Math.floor(R()*cols),y=Math.floor(R()*rows);if(s.terrain[x+','+y]==='terra')continue;s.objects.push(obj(['arbusto','pedra','flores','cogumelos','toco'][Math.floor(R()*5)],x,y))}
  s.ambient.time='entardecer';return s}
 if(id==='caverna'){let m=[];for(let y=0;y<rows;y++){m[y]=[];for(let x=0;x<cols;x++)m[y][x]=x>0&&y>0&&x<cols-1&&y<rows-1&&R()<.58}
  for(let it=0;it<4;it++){m=m.map((row,y)=>row.map((v,x)=>{let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if((i||j)&&m[y+j]?.[x+i])n++;return x>0&&y>0&&x<cols-1&&y<rows-1&&(n>=5||(v&&n>=4))}))}
  m.forEach((row,y)=>row.forEach((v,x)=>{if(v)s.terrain[x+','+y]=R()<.25?'terra':'cascalho'}));
  const cells=Object.keys(s.terrain);for(let k=0;k<Math.min(10,cells.length*.02);k++){const c=cells[Math.floor(R()*cells.length)];s.terrain[c]='agua'}
  autoWalls(s,'rocha');for(let k=0;k<cells.length*.04;k++){const[x,y]=cells[Math.floor(R()*cells.length)].split(',').map(Number);s.objects.push(obj(['pedra','cogumelos','ossos','teia','escombros'][Math.floor(R()*5)],x,y))}
  s.ambient.time='noite';return s}
 if(id==='rua'){paintRect(s,0,0,cols,rows,'concreto');s.grid.overTerrainOnly=false;const ry=Math.floor(rows/2)-1;paintRect(s,0,ry-1,cols,1,'calcada');paintRect(s,0,ry,cols,4,'asfalto');paintRect(s,0,ry+4,cols,1,'calcada');
  paintRect(s,2,1,9,ry-3,'piso-frio');roomWalls(s,2,1,9,ry-3,'tijolo');s.doors[ek.h(6,ry-2)]={type:'porta',open:false};s.doors[ek.h(3,1)]={type:'janela',open:false};s.doors[ek.h(8,1)]={type:'janela',open:false};
  s.objects.push(obj('mesa-escritorio',3,2),obj('cadeira-escritorio',4,3),obj('arquivo',9,2),obj('arquivo',9,3),obj('vaso-planta',3,ry-4),obj('lampada',6,3));
  for(let x=1;x<cols;x+=6)s.objects.push(obj('poste',x,ry-1));s.objects.push(obj('carro',cols-8,ry,{rot:90,w:2,h:4}),obj('lixeira',13,ry-1),obj('cerca',14,ry+5),obj('cerca',17,ry+5));
  s.ambient.time='noite';return s}
 return s}

/* ---------------- Regras de passagem (usadas pela Mesa) ---------------- */
function blockedCells(s){const b=new Set();s.objects.forEach(o=>{if(!o.blocks)return;for(let j=o.y;j<o.y+o.h;j++)for(let i=o.x;i<o.x+o.w;i++)b.add(i+','+j)});return b}
function edgeBlocked(s,key,forPlayer){const d=s.doors[key];if(d){if(d.type==='janela'||d.type==='grade')return!d.open;if(d.type==='secreta')return!d.open;return!d.open}return!!s.walls[key]}
function stepOk(s,x,y,dx,dy,forPlayer){const pass=(i,j)=>s.terrain[i+','+j]&&!IMPASSABLE.has(s.terrain[i+','+j]);
 const orth=(ax,ay,bx,by)=>{if(!pass(bx,by))return false;const key=bx!==ax?ek.v(Math.max(ax,bx),ay):ek.h(ax,Math.max(ay,by));return!edgeBlocked(s,key,forPlayer)};
 if(!dx||!dy)return orth(x,y,x+dx,y+dy);
 return orth(x,y,x+dx,y)&&orth(x+dx,y,x+dx,y+dy)&&orth(x,y,x,y+dy)&&orth(x,y+dy,x+dx,y+dy)}

/* ---------------- Desenho ---------------- */
const patCache={};
function drawBackground(g,s,W,H){const R=rng(42);
 const bgc={rocha:'#101216',vazio:'#0b0d12',grama:'#2f4723',agua:'#1a3a58',areia:'#a18a5f',neve:'#cfd5dc'}[s.bg]||'#101216';g.fillStyle=bgc;g.fillRect(0,0,W,H);
 if(s.bg==='rocha'){for(let i=0;i<W*H/440;i++){g.fillStyle=`rgba(255,255,255,${R()*.035})`;g.fillRect(R()*W,R()*H,1+R()*3,1+R()*3)}for(let i=0;i<W*H/14000;i++){g.fillStyle=`rgba(0,0,0,${.15+R()*.2})`;circ(g,R()*W,R()*H,10+R()*40);g.fill()}}
 else if(s.bg!=='vazio'){const t=TERRAIN[s.bg==='agua'?'agua-funda':s.bg];if(t)for(let y=0;y<s.rows;y++)for(let x=0;x<s.cols;x++)drawTerrainCell(g,t,x,y,CELL)}}
function drawWalls(g,s,forPlayer){g.lineCap='round';
 Object.entries(s.walls).forEach(([k,m])=>{if(s.doors[k])return;const[t,xy]=k.split(':'),[x,y]=xy.split(',').map(Number);const x2=t==='h'?x+1:x,y2=t==='h'?y:y+1;
  const mat=WALL_MATERIALS.find(w=>w[0]===m)||WALL_MATERIALS[0];g.strokeStyle='#08090b';g.lineWidth=m==='rocha'?14:11;g.beginPath();g.moveTo(x*CELL,y*CELL);g.lineTo(x2*CELL,y2*CELL);g.stroke();
  g.strokeStyle=mat[2];g.lineWidth=m==='rocha'?7:5;g.beginPath();g.moveTo(x*CELL,y*CELL);g.lineTo(x2*CELL,y2*CELL);g.stroke()});
 Object.entries(s.doors).forEach(([k,d])=>{const[t,xy]=k.split(':'),[x,y]=xy.split(',').map(Number);g.save();g.translate(x*CELL,y*CELL);if(t==='v'){g.rotate(Math.PI/2)}
  if(d.type==='secreta'){g.strokeStyle='#08090b';g.lineWidth=11;g.beginPath();g.moveTo(0,0);g.lineTo(CELL,0);g.stroke();g.strokeStyle='#5b564e';g.lineWidth=5;g.stroke();if(!forPlayer){g.setLineDash([4,4]);g.strokeStyle='#9c90dd';g.lineWidth=2;g.stroke();g.setLineDash([])}g.restore();return}
  if(d.type==='janela'){g.fillStyle='#08090b';g.fillRect(0,-5,CELL,10);g.fillStyle=d.open?'rgba(160,200,230,.25)':'rgba(160,200,230,.8)';g.fillRect(6,-2.5,CELL-12,5);g.restore();return}
  if(d.type==='grade'){g.strokeStyle='#08090b';g.lineWidth=8;g.beginPath();g.moveTo(0,0);g.lineTo(CELL,0);g.stroke();if(!d.open)for(let i=6;i<CELL;i+=8){circ(g,i,0,2.5);fs(g,'#8d8a84')}g.restore();return}
  const leaf=(x0,len,dir)=>{if(d.open){g.save();g.translate(x0,0);g.rotate(dir*-Math.PI/2.3);g.fillStyle='#7a5530';g.fillRect(0,-3,len,6);g.strokeStyle='#2c1d10';g.lineWidth=1.5;g.strokeRect(0,-3,len,6);g.restore()}else{g.fillStyle='#7a5530';g.fillRect(x0+(dir<0?-len:0),-6,len,12);g.strokeStyle='#2c1d10';g.lineWidth=2;g.strokeRect(x0+(dir<0?-len:0),-6,len,12)}};
  g.fillStyle='#08090b';g.fillRect(-2,-6,6,12);g.fillRect(CELL-4,-6,6,12);
  if(d.type==='dupla'){leaf(4,CELL/2-4,1);leaf(CELL-4,CELL/2-4,-1)}else{leaf(4,CELL-8,1);if(!d.open){g.fillStyle='#c7a87b';g.fillRect(CELL-14,-2,4,4)}}
  g.restore()})}
const imageCache={};
function loadImage(src,cb){if(imageCache[src]){cb&&cb(imageCache[src]);return imageCache[src]}const im=new Image();im.onload=()=>cb&&cb(im);im.src=src;imageCache[src]=im;return im}
function drawObject(g,o){const a=ASSET[o.asset]||(o.src?{draw:(g2,w,h)=>{const im=imageCache[o.src];if(im&&im.complete&&im.naturalWidth)g2.drawImage(im,0,0,w,h)}}:null);if(!a)return;g.save();g.globalAlpha=o.opacity??1;const W=o.w*CELL,H=o.h*CELL;g.translate(o.x*CELL+W/2,o.y*CELL+H/2);g.rotate((o.rot||0)*Math.PI/180);
 const rw=(o.rot%180)?H:W,rh=(o.rot%180)?W:H;g.translate(-rw/2,-rh/2);a.draw(g,rw,rh);if(o.tint){g.globalCompositeOperation='source-atop';g.fillStyle=o.tint;g.globalAlpha=.35;g.fillRect(0,0,rw,rh)}g.restore()}
function drawGlows(g,s){s.objects.forEach(o=>{if(!o.light||!o.light.on||o.hidden&&false)return;const x=(o.x+o.w/2)*CELL,y=(o.y+o.h/2)*CELL,r=Math.min(o.light.r,3)*CELL*.55,gr=g.createRadialGradient(x,y,0,x,y,r);
 gr.addColorStop(0,hexA(o.light.color,.28));gr.addColorStop(1,hexA(o.light.color,0));g.fillStyle=gr;circ(g,x,y,r);g.fill()})}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`}
/* render: desenha a cena inteira (sem tokens, névoa e escuridão, que dependem de quem vê). */
function render(cv,s,o={}){
 const dpr=o.dpr||1,W=s.cols*CELL,H=s.rows*CELL;if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}cv.style.width=W+'px';cv.style.height=H+'px';
 const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);const L=s.layers||{},vis=id=>!L[id]||L[id].visible!==false;
 const forPlayer=!!o.forPlayer;
 if(vis('fundo')){drawBackground(g,s,W,H);if(s.image){const im=imageCache[s.image];if(im&&im.complete&&im.naturalWidth){g.globalAlpha=s.imageOpacity??1;g.drawImage(im,0,0,W,H);g.globalAlpha=1}}
  Object.entries(s.terrain).forEach(([k,t])=>{const[x,y]=k.split(',').map(Number);if(x<s.cols&&y<s.rows&&TERRAIN[t])drawTerrainCell(g,TERRAIN[t],x,y,CELL)})}
 const objs=layer=>s.objects.filter(ob=>ob.layer===layer&&ob.x<s.cols&&ob.y<s.rows&&!(forPlayer&&ob.hidden));
 if(vis('chao'))objs('chao').forEach(ob=>drawObject(g,ob));
 if(s.grid.show){const a=o.gridAlpha??s.grid.alpha;if(a>0){g.strokeStyle=hexA(s.grid.color||'#ffffff',a);g.lineWidth=s.grid.width||1;g.beginPath();
  if(s.grid.overTerrainOnly&&s.bg!=='grama'&&s.bg!=='agua'&&s.bg!=='areia'&&s.bg!=='neve'){Object.keys(s.terrain).forEach(k=>{const[x,y]=k.split(',').map(Number);if(x<s.cols&&y<s.rows)g.rect(x*CELL+.5,y*CELL+.5,CELL,CELL)})}
  else{for(let x=0;x<=s.cols;x++){g.moveTo(x*CELL+.5,0);g.lineTo(x*CELL+.5,H)}for(let y=0;y<=s.rows;y++){g.moveTo(0,y*CELL+.5);g.lineTo(W,y*CELL+.5)}}g.stroke()}}
 if(vis('paredes'))drawWalls(g,s,forPlayer);
 if(vis('objetos'))objs('objetos').forEach(ob=>drawObject(g,ob));
 if(vis('luzes')){drawGlows(g,s);objs('luzes').forEach(ob=>drawObject(g,ob))}
 if(vis('efeitos'))objs('efeitos').forEach(ob=>drawObject(g,ob));
 if(o.showNotes&&vis('notas'))s.notes.forEach(n=>{const x=n.x*CELL+CELL/2,y=n.y*CELL+CELL/2;g.fillStyle='#9c90dd';g.beginPath();g.moveTo(x,y+12);g.lineTo(x-9,y-2);g.arc(x,y-4,9,Math.PI*.85,Math.PI*.15);g.closePath();g.fill();circ(g,x,y-4,3.5);fs(g,'#17131c')});
}
/* Escuridão do ambiente e da lanterna, com recortes nas fontes de luz. */
function renderDark(cv,s,o={}){const dpr=o.dpr||1,W=s.cols*CELL,H=s.rows*CELL;if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}cv.style.width=W+'px';cv.style.height=H+'px';
 const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 let a={dia:0,entardecer:.38,noite:.74}[s.ambient.time]||0;if(o.flashlight)a=Math.max(a,.88);if(!a)return;if(o.master)a*=.55;
 g.fillStyle=`rgba(3,4,10,${a})`;g.fillRect(0,0,W,H);g.globalCompositeOperation='destination-out';
 const hole=(x,y,r)=>{const gr=g.createRadialGradient(x,y,r*.25,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;circ(g,x,y,r);g.fill()};
 s.objects.forEach(ob=>{if(ob.light&&ob.light.on&&!(o.forPlayer&&ob.hidden))hole((ob.x+ob.w/2)*CELL,(ob.y+ob.h/2)*CELL,ob.light.r*CELL)});
 (o.lights||[]).forEach(([x,y,r])=>hole(x,y,r));g.globalCompositeOperation='source-over';
 if(s.ambient.time!=='dia'||o.flashlight){g.globalCompositeOperation='lighter';s.objects.forEach(ob=>{if(!ob.light||!ob.light.on)return;const x=(ob.x+ob.w/2)*CELL,y=(ob.y+ob.h/2)*CELL,r=ob.light.r*CELL,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,hexA(ob.light.color,.16));gr.addColorStop(1,hexA(ob.light.color,0));g.fillStyle=gr;circ(g,x,y,r);g.fill()});g.globalCompositeOperation='source-over'}}
function thumb(cv,assetId){const a=ASSET[assetId];const g=cv.getContext('2d');const s=Math.min(cv.width/(a.w*CELL),cv.height/(a.h*CELL))*.92;g.clearRect(0,0,cv.width,cv.height);g.save();g.translate((cv.width-a.w*CELL*s)/2,(cv.height-a.h*CELL*s)/2);g.scale(s,s);a.draw(g,a.w*CELL,a.h*CELL);g.restore()}
function terrainSwatchFixed(cv,id){const g=cv.getContext('2d'),t=TERRAIN[id];const s=cv.width/(CELL*2);g.setTransform(s,0,0,s,0,0);g.translate(-3*CELL,-5*CELL);for(let y=0;y<2;y++)for(let x=0;x<2;x++)drawTerrainCell(g,t,x+3,y+5,CELL);g.setTransform(1,0,0,1,0,0)}

root.Cena={CELL,TERRAINS,TERRAIN,DIFFICULT,IMPASSABLE,ASSETS,ASSET,CATS,LAYERS,WALL_MATERIALS,DOOR_TYPES,BACKGROUNDS,TEMPLATES,ek,
 blank,defaultScene,imageCache,loadImage,template,obj,paintRect,autoWalls,roomWalls,blockedCells,edgeBlocked,stepOk,render,renderDark,drawObject,thumb,terrainSwatch:terrainSwatchFixed,hexA,
 clone:s=>JSON.parse(JSON.stringify(s))};
})(typeof window!=='undefined'?window:globalThis);
