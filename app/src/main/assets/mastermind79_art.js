/* Mastermind v0.79 - original illustrated fantasy portrait layers.
   All marks are authored for the established 420x520 rig. No atlas recuts,
   external images, opaque overlays, or image-load races. */
(function(root){'use strict';
const A=root.Mastermind78Assets||root.Mastermind77Assets;
if(!A)throw Error('Atelier base art missing');
const W=420,H=520, P=s=>new Path2D(s), INK='#151d25';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function rgb(hex){const h=String(hex).replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0);}
function mix(a,b,t){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('');}
function grad(ctx,x1,y1,x2,y2,colors){const g=ctx.createLinearGradient(x1,y1,x2,y2);colors.forEach(([t,c])=>g.addColorStop(t,c));return g;}
function path(ctx,d,fill,stroke=INK,line=3){const q=P(d);if(fill){ctx.fillStyle=fill;ctx.fill(q);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(q);}return q;}
function line(ctx,d,color=INK,w=2){path(ctx,d,null,color,w);}
function ell(ctx,x,y,rx,ry,fill,stroke=null,w=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=w;ctx.strokeStyle=stroke;ctx.stroke();}}
function dots(ctx,x,y,count,col){for(let i=0;i<count;i++)ell(ctx,x+(i*13)%53,y+Math.floor(i/5)*9,1.15+(i%3)*.2,1.05,col);}
function clipped(ctx,d,paint){ctx.save();ctx.clip(P(d));paint();ctx.restore();}
function bg(ctx,c,p){const b=A.BACKGROUNDS[c.background]||'#171820';ctx.fillStyle=grad(ctx,0,0,420,520,[[0,mix(b,'#7d5d56',.16)],[.52,mix(b,'#1c2426',.25)],[1,'#10131c']]);ctx.fillRect(0,0,W,H);
 let glow=ctx.createRadialGradient(214,220,24,209,222,285);glow.addColorStop(0,p.trim+'29');glow.addColorStop(.61,p.primary+'18');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.strokeStyle=p.trim+'3c';ctx.lineWidth=1.6;
 for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(210,262,132+i*47,Math.PI*.96,Math.PI*2.04);ctx.stroke();}
 for(let i=0;i<18;i++){const x=39+(i*89)%347,y=35+(i*71)%419;ell(ctx,x,y,(i%3+1)*.65,(i%3+1)*.65,p.trim+'4b');}
 ctx.restore();}
const BACK_HAIR=[
'M140 170 C127 101 166 76 210 77 C266 75 295 113 286 192 L306 440 C265 463 150 464 107 435 Z',
'M132 179 C114 103 161 75 212 74 C272 76 299 111 289 199 C302 287 332 384 342 518 L80 518 C97 425 120 310 132 179Z',
'M131 173 C108 111 147 78 199 75 C261 64 298 104 292 182 C306 224 304 266 329 305 L286 359 L252 302 L168 295 L127 367 L91 328 C112 262 113 217 131 173Z',
'M138 183 C113 109 162 76 207 73 C277 79 297 118 282 190 L290 260 C321 300 305 376 278 417 L241 325 L164 310 L134 418 L99 372 C104 301 128 250 138 183Z',
'M127 174 C117 100 153 77 210 73 C280 76 294 116 290 190 L289 293 L256 331 L240 280 L178 279 L154 326 L127 288Z',
'M138 170 C121 108 157 76 211 74 C278 73 295 118 285 180 C294 227 306 256 336 294 C338 325 293 344 270 314 L247 278 L166 275 L147 324 L114 313 C105 269 134 217 138 170Z'
];
const FRONT_HAIR=[
'M145 165 C131 109 163 84 212 87 C272 86 293 120 274 177 C251 166 239 144 233 128 C223 156 199 168 166 177Z',
'M140 166 C129 105 164 77 211 82 C270 79 290 123 283 168 L264 194 C259 170 247 156 241 147 L216 194 L195 159 L167 198 L147 182Z',
'M143 177 C124 118 153 85 211 83 C265 80 291 112 284 167 L270 182 L257 136 C236 150 222 139 211 132 C188 170 166 155 148 184Z',
'M142 182 C116 124 156 75 212 79 C271 79 296 114 285 172 C263 145 255 129 245 128 C220 161 200 167 172 158 L151 197Z',
'M144 164 C126 110 150 85 196 87 C176 62 207 47 239 69 C270 74 291 115 281 172 L253 175 C253 145 235 108 217 96 L194 162 L157 193Z',
'M140 175 C125 110 162 78 213 81 C266 81 297 119 282 182 L260 203 C247 166 240 145 221 134 C207 163 185 157 164 210 L144 205Z',
'M143 166 C112 114 155 75 211 82 C265 82 300 121 282 187 C265 160 248 141 238 137 C220 166 203 148 186 185 L149 201Z',
'M148 173 C130 115 152 85 207 78 C267 76 294 119 279 170 C249 148 233 122 218 126 C192 127 172 142 148 173Z',
'M133 184 C111 121 164 83 206 80 C276 79 292 118 284 192 L264 217 L245 143 L218 181 L194 141 L170 214 L146 223Z',
'M142 163 C136 109 155 80 207 77 C263 75 286 112 281 162 C255 129 242 134 213 125 C177 121 162 147 142 163Z'
];
function backHair(ctx,c,p){let d=BACK_HAIR[c.hairBack%6];if(c.hairBack===7)return;
 const fill=grad(ctx,106,100,294,385,[[0,mix(p.hair,'#edf5dc',.19)],[.26,p.hair],[.74,mix(p.hair,'#040912',.38)],[1,mix(p.hair,'#000000',.66)]]);
 path(ctx,d,fill,INK,4);
 clipped(ctx,d,()=>{for(let i=0;i<32;i++){let x=118+i*6.2;
 const y=111+(i%5)*4;line(ctx,'M'+x+' '+y+' C'+(x-21)+' 211 '+(x+(i%4)*3-29)+' 303 '+(x-18)+' 456',i%4===0?mix(p.hair,'#f3d8ad',.47)+'99':mix(p.hair,'#070b14',.68)+'bb',i%3===0?2.2:1.1);}
 });}
function figure(ctx,c,p){const wide=c.body===1?22:c.body===2?-10:0,skin=p.skin;
 // tapered shoulders, exposed forearms behind outfit
 path(ctx,'M160 332 C123 343 82 354 65 399 C48 442 39 480 34 521 L387 521 C376 451 354 375 299 351 L247 323Z',grad(ctx,50,340,337,510,[[0,mix(skin,'#ecc7b0',.13)],[.5,skin],[1,mix(skin,'#342328',.43)]]),INK,5);
 path(ctx,'M177 271 L240 267 L250 347 C234 366 196 370 168 344Z',grad(ctx,174,270,246,352,[[0,mix(skin,'#fff0cd',.16)],[.45,skin],[1,mix(skin,'#301e25',.36)]]),INK,3.5);
 line(ctx,'M177 315 Q205 334 238 305',mix(skin,'#43252b',.53),2);
 // stylized shoulder engraving/tattoo, aligned with silhouette
 if(c.outfit%6===2||c.outfit%6===4){for(let i=0;i<10;i++){let x=85+(i%5)*13,y=382+Math.floor(i/5)*24;
 line(ctx,'M'+x+' '+y+' q16 -16 21 -1 q-13 8 -8 24',mix(skin,INK,.59),1.8);}}
 return wide;}
function cloth(ctx,c,p){const n=c.outfit%6,skin=p.skin,first=p.primary,second=p.secondary,gold=p.trim;
 const BASE='M79 376 C108 341 160 328 174 333 L207 367 L244 330 C291 328 340 349 354 392 L391 524 L28 524Z';
 const deep=grad(ctx,72,330,343,520,[[0,mix(first,'#ead1a6',.23)],[.3,first],[.68,mix(first,'#141823',.35)],[1,mix(first,'#0a101b',.65)]]);
 path(ctx,BASE,deep,INK,5);
 clipped(ctx,BASE,()=>{
 // watercolor shadows are clipped to garment silhouette, never rectangular
 const g=ctx.createRadialGradient(175,386,12,205,475,237);g.addColorStop(0,second+'54');g.addColorStop(.62,first+'0b');g.addColorStop(1,'#00000000');
 ctx.fillStyle=g;ctx.fillRect(32,330,360,200);
 for(let i=0;i<22;i++){let x=96+i*12;
 line(ctx,'M'+x+' 368 C'+(x-18)+' 417 '+(x+9)+' 477 '+(x-7)+' 535',i%5===0?mix(second,'#efdbbd',.43)+'91':mix(first,'#0a0d15',.68)+'67',i%3===0?2.6:1);}
 });
 // Different silhouette families, all with hand authored linework
 if(n===0){
 path(ctx,'M121 346 L170 342 L207 376 L185 453 L138 525 L72 525 L107 405Z',grad(ctx,88,345,200,512,[[0,mix(second,'#f5dba9',.21)],[1,mix(second,INK,.54)]]),INK,4);
 path(ctx,'M243 343 L296 343 L320 419 L349 526 L254 524 L223 393Z',grad(ctx,239,344,323,520,[[0,second],[1,mix(second,INK,.63)]]),INK,4);
 path(ctx,'M170 348 L210 375 L246 347 L237 412 L213 444 L178 409Z',mix(second,'#e8c596',.14),gold,2.5);
 for(let i=0;i<6;i++)line(ctx,'M'+(119+i*13)+' '+(411+i*11)+' l13 4 l-6 13',gold+'90',1.6);
 }else if(n===1){
 path(ctx,'M123 355 L176 345 L205 404 L175 523 L83 524 L114 398Z',mix(second,INK,.24),gold,3);
 path(ctx,'M246 347 L290 356 L313 413 L342 525 L249 525 L214 404Z',mix(second,INK,.26),gold,3);
 path(ctx,'M173 347 Q210 414 247 346 L250 379 L211 465 L169 384Z',mix(first,'#060d16',.42),gold,3);
 for(let i=0;i<8;i++){const x=144+i*19;line(ctx,'M'+x+' 459 l8 -8 l8 8 l-8 8Z',gold+'b5',1.6);}
 }else if(n===2){
 path(ctx,'M94 382 L151 347 L186 378 L175 444 L137 461 L66 430Z',grad(ctx,89,350,164,460,[[0,mix(second,'#ffecce',.53)],[.47,second],[1,mix(second,INK,.54)]]),INK,4.2);
 path(ctx,'M328 381 L271 346 L238 379 L251 447 L293 462 L357 429Z',grad(ctx,258,350,331,463,[[0,mix(second,'#f5dfbd',.51)],[.45,second],[1,mix(second,INK,.5)]]),INK,4.2);
 path(ctx,'M169 364 L209 396 L249 363 L266 462 L212 494 L151 463Z',grad(ctx,155,370,272,484,[[0,mix(second,'#fff3db',.34)],[.52,second],[1,mix(second,'#17242b',.5)]]),INK,4);
 line(ctx,'M171 410 L211 433 L249 410 M190 451 L211 461 L234 452',gold,2);
 for(let i=0;i<4;i++){ell(ctx,184+i*18,472+(i%2)*4,3,4,gold,INK,1);}
 }else if(n===3){
 path(ctx,'M124 341 Q162 338 208 383 Q244 338 285 342 L317 438 L267 524 L143 524 L91 435Z',grad(ctx,121,351,299,521,[[0,mix(second,'#f7cc9b',.23)],[.55,second],[1,mix(second,INK,.6)]]),gold,3.5);
 path(ctx,'M153 359 L207 413 L264 359 L255 414 L210 455 L164 416Z',mix(first,INK,.36),gold,3);
 line(ctx,'M121 434 Q209 470 304 429 M145 461 Q211 492 277 461',gold+'bd',2);
 }else if(n===4){
 path(ctx,'M128 352 L174 342 L208 397 L177 521 L82 526 L114 396Z',mix(second,INK,.22),INK,4);
 path(ctx,'M246 346 L294 351 L309 407 L341 525 L243 524 L217 398Z',mix(second,INK,.28),INK,4);
 path(ctx,'M181 366 L208 400 L237 366 L225 519 L197 519Z',mix(first,'#10151f',.65),gold,2);
 for(let i=0;i<7;i++){line(ctx,'M'+(131+i*23)+' 444 l14 3 l-7 14',gold+'9d',2);}
 }else{
 path(ctx,'M131 351 L174 341 L207 376 L181 520 L87 523 L109 396Z',mix(first,INK,.31),gold,3);
 path(ctx,'M245 342 L288 352 L310 396 L332 524 L241 524 L216 377Z',mix(first,INK,.41),gold,3);
 path(ctx,'M163 348 L208 399 L259 348 L255 390 L213 442 L173 390Z',mix(second,'#f1dfbb',.22),gold,3);
 for(let i=0;i<7;i++){ell(ctx,208,405+i*16,2.4,3.3,gold);}}
 // raised collars and embossed seams over main outfit
 path(ctx,'M165 331 Q192 355 211 368 Q235 352 255 331 L270 351 Q241 390 211 405 Q174 385 147 349Z',grad(ctx,152,336,252,396,[[0,mix(second,'#fff7df',.26)],[1,mix(second,INK,.31)]]),INK,3.5);
 line(ctx,'M165 352 Q189 378 211 387 Q239 376 256 352',gold,2.2);
 // ornamental fibula, belts, embroideries (variation dependent)
 ell(ctx,211,393,11,12,mix(gold,INK,.25),INK,2);
 path(ctx,'M211 384 l6 9 l-6 10 l-6 -10Z',mix(gold,'#fff4cc',.23),INK,1.5);
 for(let i=0;i<7;i++){let x=134+i*25, y=491+(i%3)*6;line(ctx,'M'+x+' '+y+' l8 -5 l8 5 l-8 5Z',gold+'90',1.55);}
 // every item has its own sigil, even when sharing one of six painted base families
 const x=172+(c.outfit%8)*9,y=455+Math.floor(c.outfit/8)*11;
 path(ctx,'M'+x+' '+(y-10)+' l8 10 l-8 11 l-8 -11Z',mix(second,first,.5),gold,1.8);
 line(ctx,'M'+(x-5)+' '+y+' l10 0 M'+x+' '+(y-7)+' l0 14',gold,1.25);
 // natural fabric highlights in curved paths instead of rectangular overlays
 line(ctx,'M102 408 Q119 440 113 497 M308 403 Q291 445 307 510',mix(first,'#f1dfc2',.6)+'9b',1.8);
}
function face(ctx,c,p){const wide=c.face===4?11:c.face===1?-7:c.face===2?5:0,skin=p.skin;
 const L=149-wide,R=271+wide;
 path(ctx,'M'+(L+7)+' 208 Q'+(L-20)+' 194 '+(L-15)+' 228 Q'+(L-7)+' 249 '+(L+8)+' 239Z',skin,INK,2.5);
 path(ctx,'M'+(R-7)+' 208 Q'+(R+20)+' 195 '+(R+16)+' 228 Q'+(R+8)+' 250 '+(R-9)+' 240Z',skin,INK,2.5);
 const fd='M'+L+' 178 C'+(L-12)+' 130 171 107 211 103 C250 102 '+(R+9)+' 127 '+R+' 183 L'+(R-1)+' 239 Q270 294 235 311 Q209 324 185 308 Q147 282 '+L+' 242Z';
 path(ctx,fd,grad(ctx,L,130,R,298,[[0,mix(skin,'#25131d',.2)],[.22,mix(skin,'#fff4dc',.19)],[.57,skin],[1,mix(skin,'#3b2632',.37)]]),INK,3.6);
 clipped(ctx,fd,()=>{
 const shadow=ctx.createLinearGradient(L,130,R,254);shadow.addColorStop(0,'#150b1990');shadow.addColorStop(.38,'#00000000');shadow.addColorStop(.83,'#ffc68d11');shadow.addColorStop(1,'#130c1f55');ctx.fillStyle=shadow;ctx.fillRect(L-20,115,R-L+40,200);
 ell(ctx,176,248,26,15,mix(skin,'#e6745c',.45)+'69');ell(ctx,247,248,26,15,mix(skin,'#df795f',.4)+'6a');
 dots(ctx,159,245,8,mix(skin,'#6f3d37',.5)+'60');
 });
 line(ctx,'M211 207 C202 227 202 242 207 252 Q213 258 224 249',mix(skin,INK,.56),2.5);
 line(ctx,'M204 254 Q211 259 220 254',mix(skin,'#fff4dd',.62),1.6);
 for(const x of [181,242]){
 const slant=c.eyes===2?5:c.eyes===5?-3:0,large=c.eyes===1||c.eyes===6?3:0;
 path(ctx,'M'+(x-23)+' '+(210+slant)+' Q'+x+' '+(189-large)+' '+(x+22)+' '+(208-slant)+' Q'+x+' '+(226+large)+' '+(x-23)+' '+(210+slant)+'Z','#f5eadd',INK,3.5);
 ell(ctx,x,211,11+large*.25,13+large*.25,mix(p.eye,'#e9b65c',.13),INK,1.8);
 ell(ctx,x+1,212,4.8,9,mix(p.eye,'#030d1a',.81));
 ell(ctx,x-4,207,4,4,'#fff4e6');
 ell(ctx,x+6,215,1.8,2,'#fdf2dc');
 line(ctx,'M'+(x-22)+' 208 Q'+x+' '+(188-large)+' '+(x+22)+' 208',INK,3.7);
 for(let i=0;i<3;i++){let lx=x-22+i*5;line(ctx,'M'+lx+' 204 l-3 -'+(i+3),INK,1.5);}
 let bend=c.brows===1?-6:c.brows===5?5:c.brows===6?-9:0;
 line(ctx,'M'+(x-21)+' '+(188+bend)+' Q'+x+' '+(178+bend)+' '+(x+19)+' '+(188+bend),mix(p.hair,INK,.4),c.brows===3?5.2:3.7);
 }
 const mouth=['M193 272 Q211 277 231 270','M194 269 Q210 287 230 268','M195 274 L228 272','M194 275 Q212 280 231 270','M199 270 Q209 266 220 273','M197 272 Q211 282 226 272','M199 274 Q210 276 225 275','M194 274 Q212 269 230 273'][c.mouth]||'M195 273 Q211 278 229 273';
 line(ctx,mouth,mix(skin,'#673539',.74),3);
 line(ctx,'M197 280 Q211 285 226 280',mix(skin,'#f5c8a5',.4),1.2);
}
function frontHair(ctx,c,p){const d=FRONT_HAIR[c.hairFront%10];
 path(ctx,d,grad(ctx,132,90,276,198,[[0,mix(p.hair,'#ffebcc',.24)],[.25,p.hair],[.7,mix(p.hair,'#0b111a',.32)],[1,mix(p.hair,'#050812',.62)]]),INK,4);
 clipped(ctx,d,()=>{for(let i=0;i<39;i++){const x=130+i*4.5;
 line(ctx,'M'+x+' '+(90+i%4*3)+' Q'+(x-24+i%5)+' '+(133+i%5*3)+' '+(x-17+i%3*6)+' '+(212+i%3*5),i%5===0?mix(p.hair,'#ffe6b9',.58)+'d0':mix(p.hair,INK,.51)+'b6',i%4===0?2.6:1.2);}});
 // separately inked curls/framing wisps, only at designed root positions
 if(c.hairFront%4===1||c.hairFront%4===3){line(ctx,'M147 161 Q127 189 148 215 Q139 205 141 196 M272 163 Q292 192 272 218',mix(p.hair,INK,.46),4);}
 if(c.hairBack===2||c.hairBack===6){for(let i=0;i<8;i++){const x=122+i*6;line(ctx,'M'+x+' 188 q-18 18 -4 38 q-11 19 -2 30',i%2?mix(p.hair,'#f9cba0',.24):mix(p.hair,INK,.5),2.2);}}}
function accessories(ctx,c,p){const a=c.accessory,metal=p.trim;
 if([1,3,8].includes(a)){for(const x of [147,275]){ell(ctx,x,238,5,6,metal,INK,1.6);line(ctx,'M'+x+' 243 q-6 12 1 21',metal,2.6);ell(ctx,x,267,3.5,4.5,metal,INK,1);}}
 if(a===2){ell(ctx,276,241,4.7,4.7,metal,INK,1.5);}
 if(a===3||a===8){line(ctx,'M167 326 Q210 368 252 327',metal,3);path(ctx,'M203 357 l9 -17 l8 17 l-9 14Z',metal,INK,2);}
 if(a===4){for(const x of [178,242])path(ctx,'M'+(x-23)+' 201 q22 -10 43 0 l-4 23 q-24 10 -38 -2Z','#21364250',metal,3);line(ctx,'M198 204 L221 203',metal,3);}
 if(a===5){line(ctx,'M151 139 Q208 113 270 141',metal,5);path(ctx,'M200 127 l11 -9 l11 9 l-11 8Z',metal,INK,1.6);}
 if(a===6){line(ctx,'M245 235 l18 19 M246 245 l15 17',mix(p.skin,INK,.76),2);}
 if(a===7){path(ctx,'M165 242 l18 -8 l-8 34Z',metal+'77',null);}
 if(a===9){path(ctx,'M96 356 C65 380 54 470 40 525 L139 525 L151 369Z',mix(p.secondary,INK,.4),metal,3);path(ctx,'M323 357 C355 395 372 482 386 525 L279 525 L262 369Z',mix(p.secondary,INK,.45),metal,3);}
 if(a===10){path(ctx,'M90 379 Q128 348 158 370 l-1 57 l-70 -8Z',mix(p.secondary,'#f1d2a4',.18),metal,3);path(ctx,'M329 379 Q286 348 258 370 l3 57 l70 -8Z',mix(p.secondary,'#f1d2a4',.18),metal,3);}
 if(a===11)for(let i=0;i<10;i++){const x=164+(i*17)%91,y=226+(i*23)%49;ell(ctx,x,y,2.5,3,metal);}
}
function draw(ctx,w,h,raw){const c=A.normal(raw),p=A.palette(c);
 ctx.save();ctx.clearRect(0,0,w,h);ctx.scale(w/W,h/H);bg(ctx,c,p);
 backHair(ctx,c,p);figure(ctx,c,p);cloth(ctx,c,p);face(ctx,c,p);frontHair(ctx,c,p);accessories(ctx,c,p);
 // slim border, with no solid overlay crossing the character
 ctx.strokeStyle=p.trim+'91';ctx.lineWidth=2.6;ctx.strokeRect(9,9,402,502);
 ctx.restore();return {...c,version:79};}
const oldNormal=A.normal;
A.normal=function(raw){return {...oldNormal(raw),version:79};};
A.DEFAULTS.version=79;
A.draw=draw;
A.ILLUSTRATED_VERSION=79;
A.ILLUSTRATED_FAMILIES=['Aventureiro ornamentado','Mago de tecidos bordados','Guardião de armadura','Nobre de capa','Caçador arcano','Ocultista cerimonial'];
root.Mastermind79Art={draw,drawFamilyCount:6};
if(typeof module!=='undefined'&&module.exports)module.exports=root.Mastermind79Art;
})(typeof window!=='undefined'?window:globalThis);