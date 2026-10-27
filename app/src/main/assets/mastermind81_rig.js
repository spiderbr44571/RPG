/* MASTERMIND / ATELIER 0.81 — brand-new, independently layered 2D character rig.
   All pieces share a 420x520 portrait atlas. Artwork is built from individually
   authored vector silhouettes and rich ink/fabric marks, never cropped portraits.
   Physical traits and outfit parts are composited in an explicit depth order. */
(function(root){'use strict';
const W=420,H=520,INK='#191b22';
const COLORS={
 skin:['#f2d2b4','#e7b895','#dba07c','#c78965','#b57b57','#986142','#7d4a34','#683e32','#b87760','#e1aa88','#d1a28b','#f4dfc9'],
 hair:['#14191c','#332320','#593b2f','#85553c','#b27e50','#d9ba82','#e1d2bb','#aab1aa','#38555e','#74475c','#7b392f','#d9c9a2'],
 eyes:['#b77b32','#417d87','#72a178','#c7a958','#7770ad','#ab575b','#6c5549','#b1bec3'],
 cloth:['#12606a','#343d54','#653947','#5d493e','#697256','#8c724b','#b7a288','#2c303a','#9a5c39','#5b4d73','#1b5251','#873d3a'],
 trim:['#dec38f','#e0d7c5','#b98853','#9aafb2','#b2b3cc','#d4a189']};
const OPTIONS={
 body:['Esbelto','Atlético','Robusto','Quadris largos'],
 face:['Oval','Angular','Redondo','Quadrado','Coração','Alongado'],
 ears:['Humanas','Discretas','Élficas','Pontudas'],
 skin:COLORS.skin.map((_,i)=>'Pele '+(i+1)),
 eyes:['Amendoados','Grandes','Estreitos','Caídos','Alertas','Brilhantes','Serenos','Felinos'],
 brows:['Naturais','Retas','Arqueadas','Grossas','Finas','Franzidas','Assimétricas','Levantadas'],
 nose:['Reto','Curto','Arrebitado','Largo','Aquilino','Marcado'],
 mouth:['Neutra','Sorriso','Firme','Sorriso aberto','Séria','Lábios finos','Maliciosa','Concentrada'],
 hairBack:['Curto','Longo liso','Longo ondulado','Trançado','Coque','Rabo de cavalo','Cachos','Raspado','Dreads','Preso baixo','Solto médio','Dupla trança'],
 hairFront:['Lateral','Dividido','Franja curta','Cachos','Lateral longa','Topete','Tranças','Ondulado','Franja irregular','Raspado','Mechas longas','Cortina'],
 beard:['Nenhuma','Por fazer','Barba curta','Barba cheia','Bigode','Cavanhaque','Costeletas'],
 outfit:['Viajante','Explorador','Caçador','Nobre','Ocultista','Mago','Bardo','Alquimista','Investigador','Guerreiro','Armadura leve','Armadura pesada','Paladino','Samurai','Ritualista','Mercenário'],
 cloak:['Sem capa','Manto curto','Capa longa','Capuz caído','Cachecol','Pele de inverno'],
 armor:['Nenhuma','Ombreiras de couro','Peitoral metálico','Armadura rúnica','Cota de malha','Gola de placas'],
 accessory:['Nenhum','Brincos','Óculos','Cicatriz','Tiara','Colar','Tapa-olho','Pintura ritual','Argolas','Máscara baixa','Pingente arcano','Presilhas'],
 background:['Obsidiana','Bosque','Bruma','Rubi','Mar profundo','Pergaminho'],
 frame:['Anel de bronze','Anel prateado','Anel arcano','Quadrado clássico','Sem moldura']};
const BACK=['#191e26','#273b32','#313746','#442c35','#183745','#61503f'];
const DEFAULTS={version:81,body:0,face:0,ears:0,skin:3,eyes:0,brows:0,nose:0,mouth:0,hairBack:2,hairFront:0,beard:0,outfit:0,cloak:0,armor:0,accessory:0,background:0,frame:0,
 hairColor:1,eyeColor:0,clothPrimary:0,clothSecondary:1,trimColor:0,
 customSkin:'',customHair:'',customEyes:'',customPrimary:'',customSecondary:'',customTrim:'',
 useCustomSkin:false,useCustomHair:false,useCustomEyes:false,useCustomPrimary:false,useCustomSecondary:false,useCustomTrim:false};
const RIG={base:{head:[210,207],neck:[210,324],chest:[210,399],shoulders:[[98,374],[322,374]],eyes:[[180,215],[242,215]],mouth:[210,274],hair:[210,104]},
 faceWidth:[0,-9,10,12,1,-5],earY:217};
function index(n,len){return Math.max(0,Math.min(len-1,Number.isFinite(+n)?Math.floor(+n):0));}
function norm(raw){const c={...DEFAULTS,...(raw&&typeof raw==='object'?raw:{})};for(const [k,a] of Object.entries(OPTIONS))c[k]=index(c[k],a.length);
 for(const [k,a] of [['hairColor',COLORS.hair],['eyeColor',COLORS.eyes],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])c[k]=index(c[k],a.length);
 c.version=81;return c;}
const rgb=h=>{let a=String(h||'#000000').replace('#','');return [0,2,4].map(i=>parseInt(a.slice(i,i+2),16)||0)};
function blend(a,b,t){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v*(1-t)+y[i]*t).toString(16).padStart(2,'0')).join('');}
function pal(c){return {skin:c.useCustomSkin&&/^#[\da-f]{6}$/i.test(c.customSkin)?c.customSkin:COLORS.skin[c.skin],hair:c.useCustomHair&&/^#[\da-f]{6}$/i.test(c.customHair)?c.customHair:COLORS.hair[c.hairColor],eye:c.useCustomEyes&&/^#[\da-f]{6}$/i.test(c.customEyes)?c.customEyes:COLORS.eyes[c.eyeColor],
 primary:c.useCustomPrimary&&/^#[\da-f]{6}$/i.test(c.customPrimary)?c.customPrimary:COLORS.cloth[c.clothPrimary],secondary:c.useCustomSecondary&&/^#[\da-f]{6}$/i.test(c.customSecondary)?c.customSecondary:COLORS.cloth[c.clothSecondary],trim:c.useCustomTrim&&/^#[\da-f]{6}$/i.test(c.customTrim)?c.customTrim:COLORS.trim[c.trimColor]};}
const P=x=>new Path2D(x);
function path(ctx,d,fill,stroke=INK,width=3){const p=P(d);if(fill){ctx.fillStyle=fill;ctx.fill(p)}if(stroke){ctx.strokeStyle=stroke;ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=width;ctx.stroke(p)}return p;}
function line(ctx,d,color=INK,width=2){return path(ctx,d,null,color,width);}
function ellipse(ctx,x,y,rx,ry,fill,stroke=null,width=1){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function grad(ctx,x1,y1,x2,y2,stops){const g=ctx.createLinearGradient(x1,y1,x2,y2);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;}
function clip(ctx,d,fn){ctx.save();ctx.clip(P(d));fn();ctx.restore();}
function seeded(i){let v=(i+1)*15485917;return ()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296}}
function fibers(ctx,x0,y0,x1,y1,seed,color,count=35){let rand=seeded(seed);for(let i=0;i<count;i++){let x=x0+rand()*(x1-x0),y=y0+rand()*(y1-y0),j=rand()*12;line(ctx,'M'+x.toFixed(1)+' '+y.toFixed(1)+' q'+j.toFixed(1)+' 8 '+(j*.2).toFixed(1)+' 17',color,rand()>.8?1.8:.8)}}
function background(ctx,c,p){ctx.fillStyle=grad(ctx,0,0,420,520,[[0,blend(BACK[c.background],'#856f54',.2)],[.47,BACK[c.background]],[1,blend(BACK[c.background],'#070b0f',.61)]]);ctx.fillRect(0,0,W,H);
 const halo=ctx.createRadialGradient(210,220,8,210,220,245);halo.addColorStop(0,p.trim+'31');halo.addColorStop(.54,p.primary+'20');halo.addColorStop(1,'#00000000');ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle=p.trim+'2d';ctx.lineWidth=1.5;for(const r of [139,189,241]){ctx.beginPath();ctx.arc(210,246,r,Math.PI*.92,Math.PI*2.08);ctx.stroke();}
 let random=seeded(7+c.background);for(let i=0;i<52;i++){let x=random()*420,y=random()*520;ellipse(ctx,x,y,random()*1.1+.4,random()*1.1+.4,p.trim+'46')}}
function capeBack(ctx,c,p){if(!c.cloak||c.cloak===4)return;const d='M159 328 Q118 325 87 357 Q51 411 23 520 L398 520 Q365 405 325 355 L261 325 Q226 374 160 328Z';
 path(ctx,d,grad(ctx,62,344,364,510,[[0,blend(p.secondary,'#e3b98c',.22)],[.3,p.secondary],[1,blend(p.secondary,'#080e15',.66)]]),INK,4);
 clip(ctx,d,()=>{fibers(ctx,40,350,382,500,12,p.trim+'57',56)});
 if(c.cloak===2||c.cloak===3)line(ctx,'M83 357 Q67 447 48 520 M323 352 Q349 439 364 520',blend(p.secondary,p.trim,.55),4)}
function rearHair(ctx,c,p){if(c.hairBack===7)return;const n=c.hairBack;
 const length=n===0?286:n===4?290:n===9?350:n===10?402:480;
 const d='M140 171 Q128 110 166 88 Q206 63 250 91 Q301 105 285 184 Q'+(302+(n%3)*9)+' 265 314 '+length+' Q280 '+(length+21)+' 250 '+length+' L163 '+length+' Q108 '+(length+18)+' 108 '+length+' Q119 250 140 171Z';
 const base=grad(ctx,120,106,304,length,[[0,blend(p.hair,'#ffddb5',.27)],[.35,p.hair],[1,blend(p.hair,'#070910',.78)]]);
 path(ctx,d,base,INK,4);
 clip(ctx,d,()=>{fibers(ctx,115,107,310,length,4+n,blend(p.hair,'#ffe0b5',.44)+'b4',50);
 for(let i=0;i<25;i++){let x=135+i*6.2;line(ctx,'M'+x+' 128 Q'+(x-31)+' 227 '+(x+((i%4)-2)*13)+' '+length,i%4===0?blend(p.hair,'#fbdcb0',.57)+'ab':blend(p.hair,INK,.74)+'bb',i%3===0?2.8:1.4)}});
 if(n===3||n===8||n===11){for(const x of [130,295]){path(ctx,'M'+x+' 175 Q'+(x-21)+' 247 '+(x-17)+' 359 Q'+(x-25)+' 416 '+x+' '+length,'',blend(p.hair,'#ffdf9f',.42),9);
 for(let y=224;y<length-9;y+=22)line(ctx,'M'+(x-20)+' '+y+' l29 18 M'+(x+9)+' '+y+' l-28 18',blend(p.hair,'#efc27e',.53),2.2);}}
 if(n===4||n===5){ellipse(ctx,267,130,49,43,blend(p.hair,'#0c0d11',.25),INK,3);fibers(ctx,225,100,284,143,43,p.trim+'62',16);}
}
function anatomy(ctx,c,p){
 const ratio=[0,3,13,7][c.body],d='M162 333 Q126 335 '+(90-ratio)+' 349 Q'+(44-ratio)+' 380 30 521 L392 521 Q'+(374+ratio)+' 382 '+(322+ratio)+' 349 Q278 337 250 331 L238 299 L180 299Z';
 path(ctx,d,grad(ctx,78,320,315,520,[[0,blend(p.skin,'#fff1d8',.23)],[.5,p.skin],[1,blend(p.skin,'#1a1219',.56)]]),INK,4);
 path(ctx,'M179 283 L242 281 L253 344 Q229 364 212 363 Q192 363 167 345Z',grad(ctx,180,283,242,359,[[0,blend(p.skin,'#e6d1b4',.14)],[.53,p.skin],[1,blend(p.skin,'#24151d',.37)]]),INK,3);
 line(ctx,'M172 337 Q210 361 248 333',blend(p.skin,INK,.55),2);
}
function costume(ctx,c,p){const n=c.outfit,group=n%8,ratio=[0,4,12,7][c.body];
 const d='M163 331 Q121 336 '+(82-ratio)+' 361 Q'+(49-ratio)+' 401 30 524 L391 524 Q'+(371+ratio)+' 403 '+(334+ratio)+' 360 Q293 336 251 332 L214 379Z';
 path(ctx,d,grad(ctx,90,332,335,520,[[0,blend(p.primary,'#e9be86',.24)],[.38,p.primary],[1,blend(p.primary,'#090d14',.71)]]),INK,4.4);
 clip(ctx,d,()=>{fibers(ctx,83,353,333,508,n,blend(p.primary,'#fff3c1',.57)+'77',52)});
 const tailor=n<4?'coat':n<8?'robe':n<12?'leather':'metal';
 // Each garment has an independently authored collar/cut and prominent material zones.
 if(tailor==='coat'){
 path(ctx,'M159 339 Q181 349 211 389 L177 481 L104 526 L74 525 L103 395Z',grad(ctx,102,341,194,514,[[0,blend(p.secondary,'#dfc19d',.27)],[1,blend(p.secondary,INK,.47)]]),INK,3.5);
 path(ctx,'M262 339 Q241 348 210 391 L245 479 L317 526 L346 525 L316 395Z',grad(ctx,249,342,321,522,[[0,p.secondary],[1,blend(p.secondary,INK,.59)]]),INK,3.5);
 path(ctx,'M160 342 L198 404 L184 447 L147 384Z',blend(p.secondary,'#cfb58d',.16),p.trim,2.1);
 path(ctx,'M261 342 L221 404 L236 446 L273 386Z',blend(p.secondary,'#cfb58d',.16),p.trim,2.1);
 }else if(tailor==='robe'){
 path(ctx,'M154 336 Q180 374 211 409 Q243 366 268 335 L295 382 L263 530 L157 530 L122 389Z',grad(ctx,127,340,269,524,[[0,blend(p.secondary,'#f1d9ad',.19)],[.58,p.secondary],[1,blend(p.secondary,INK,.59)]]),INK,3.5);
 path(ctx,'M184 367 Q211 395 237 367 L225 462 L211 489 L197 464Z',blend(p.primary,INK,.52),p.trim,2.2);
 for(let j=0;j<7;j++){let y=416+j*15;line(ctx,'M167 '+y+' l12 8 l-12 8 M255 '+y+' l-12 8 l12 8',p.trim+'a6',1.4)}
 }else if(tailor==='leather'){
 path(ctx,'M102 364 Q148 336 173 357 L180 422 L144 455 L61 432Z',grad(ctx,99,350,175,441,[[0,blend(p.secondary,'#ffe3bc',.37)],[.4,p.secondary],[1,blend(p.secondary,INK,.64)]]),INK,4);
 path(ctx,'M317 365 Q272 336 248 357 L242 425 L280 455 L358 430Z',grad(ctx,260,344,336,439,[[0,blend(p.secondary,'#ffe3bc',.34)],[.38,p.secondary],[1,blend(p.secondary,INK,.65)]]),INK,4);
 path(ctx,'M165 352 L209 388 L258 352 L274 480 L210 510 L145 479Z',blend(p.secondary,INK,.25),INK,4);
 line(ctx,'M170 402 L208 435 L255 400 M174 467 L210 485 L247 467',p.trim,2.2);
 }else{
 path(ctx,'M98 362 Q129 341 166 352 L181 405 L150 446 L60 431Z',grad(ctx,95,346,165,450,[[0,blend(p.trim,'#ffffff',.5)],[.28,blend(p.trim,p.secondary,.42)],[.72,p.secondary],[1,blend(p.secondary,INK,.7)]]),INK,4.1);
 path(ctx,'M323 362 Q283 339 255 350 L243 403 L266 447 L357 430Z',grad(ctx,268,349,338,451,[[0,blend(p.trim,'#ffffff',.5)],[.3,blend(p.trim,p.secondary,.43)],[1,blend(p.secondary,INK,.65)]]),INK,4.1);
 path(ctx,'M170 351 L211 394 L251 350 L270 462 L211 499 L146 462Z',grad(ctx,160,360,260,489,[[0,blend(p.trim,'#e9dfca',.32)],[.53,p.secondary],[1,blend(p.secondary,'#0d1721',.61)]]),INK,4.2);
 line(ctx,'M166 405 Q213 440 257 402 M176 463 Q211 484 245 463',p.trim,2.1);
 }
 const collar=['M170 331 L210 367 L252 332 L269 348 Q249 387 210 407 Q176 386 151 347Z','M166 333 Q209 374 254 331 L274 351 Q242 393 211 399 Q179 388 145 352Z','M160 333 L209 385 L261 333 L265 369 L212 420 L155 366Z','M174 330 Q210 357 243 330 L261 343 Q230 387 210 386 Q184 388 156 342Z'][group%4];
 path(ctx,collar,grad(ctx,163,336,263,400,[[0,blend(p.secondary,'#fff2d2',.26)],[1,blend(p.secondary,INK,.41)]]),INK,3.4);
 line(ctx,'M160 354 Q208 405 260 354',p.trim,2.1);
 // Textured embroidered motifs, individualized by costume index.
 let rand=seeded(300+n);for(let i=0;i<18;i++){const x=147+rand()*132,y=427+rand()*84,size=2+rand()*3;
 line(ctx,'M'+x.toFixed(1)+' '+y.toFixed(1)+' l'+size.toFixed(1)+' '+(size*1.5).toFixed(1)+' l'+(-size).toFixed(1)+' '+size.toFixed(1),p.trim+'8d',1.3);}
 const e=172+(n%8)*9,f=447+Math.floor(n/8)*19;
 path(ctx,'M'+e+' '+(f-11)+' l8 10 l-8 12 l-8 -12Z',blend(p.trim,p.primary,.49),p.trim,1.8);
 line(ctx,'M'+(e-5)+' '+f+' h10',p.trim,1.5);
 // Buckles and studded leather: individual polished marks.
 for(let i=0;i<6;i++)ellipse(ctx,161+i*19,484+(i%2)*3,2.3,3.1,p.trim,INK,1);
}
function overArmor(ctx,c,p){const n=c.armor;if(!n)return;
 if(n===1||n>=2)for(const side of [-1,1]){const x=210+side*112;
 const d='M'+(x-39)+' 367 Q'+x+' 343 '+(x+38)+' 369 L'+(x+44)+' 413 Q'+x+' 436 '+(x-44)+' 411Z';
 path(ctx,d,grad(ctx,x-35,353,x+44,429,[[0,blend(p.trim,'#ffffff',.33)],[.5,p.secondary],[1,blend(p.secondary,INK,.62)]]),INK,3.7);
 line(ctx,'M'+(x-26)+' 382 Q'+x+' 397 '+(x+27)+' 381',p.trim,2.4);
 if(n>=3)for(let j=0;j<3;j++)line(ctx,'M'+(x-22+j*15)+' 401 l6 -11 l6 11',p.trim,1.6);}
 if(n>=2){path(ctx,'M171 387 L211 413 L250 388 L256 458 L210 488 L164 456Z',blend(p.trim,p.secondary,.58),INK,3);
 line(ctx,'M179 422 L211 444 L240 420',p.trim,2.3);}
 if(n>=4){for(let i=0;i<6;i++)line(ctx,'M'+(176+i*13)+' 472 l6 8 l6 -8',p.trim,1.7);}
}
function hoodFront(ctx,c,p){if(c.cloak!==3&&c.cloak!==4&&c.cloak!==5)return;
 if(c.cloak===3){path(ctx,'M135 161 Q110 102 148 78 Q198 44 264 80 Q320 109 283 187 L270 155 Q262 97 210 91 Q155 99 146 159Z',blend(p.secondary,INK,.39),p.trim,3.6);}
 if(c.cloak===4||c.cloak===5){path(ctx,'M129 354 Q161 336 211 367 Q259 335 294 354 L289 384 Q220 420 150 397Z',blend(p.secondary,'#e6c08c',.12),p.trim,3.4);}}
function ears(ctx,c,p,wide){const y=RIG.earY,L=147-wide,R=273+wide;const length=c.ears>=2?37:24;
 for(const s of [-1,1]){const x=s===-1?L:R,outer=x+s*(c.ears>=2?23:16);
 const d='M'+x+' '+(y-19)+' Q'+outer+' '+(y-length-3)+' '+outer+' '+(y+9)+' Q'+(x+s*8)+' '+(y+length)+' '+x+' '+(y+16)+'Z';
 path(ctx,d,grad(ctx,x-18,y-16,x+18,y+23,[[0,blend(p.skin,'#ffe8bd',.2)],[1,blend(p.skin,INK,.33)]]),INK,2.8);
 line(ctx,'M'+(x+s*2)+' '+(y-6)+' Q'+(outer-s*4)+' '+(y+4)+' '+(x+s*4)+' '+(y+15),blend(p.skin,INK,.6),1.8);
 }}
function head(ctx,c,p){const w=RIG.faceWidth[c.face],L=150-w,R=270+w;
 const length=c.face===5?19:c.face===2?-9:0;
 const d='M'+L+' 174 C'+(L-5)+' 131 174 99 208 100 C249 97 '+(R+11)+' 132 '+R+' 177 L'+R+' 239 C'+(R-3)+' '+(291+length)+' 232 '+(315+length)+' 210 '+(313+length)+' Q185 '+(313+length)+' '+(L+2)+' 271 '+L+' 237Z';
 path(ctx,d,grad(ctx,L,130,R,313+length,[[0,blend(p.skin,'#ffebd0',.26)],[.36,p.skin],[.73,blend(p.skin,'#af765b',.12)],[1,blend(p.skin,INK,.36)]]),INK,3.5);
 clip(ctx,d,()=>{
 const glow=ctx.createLinearGradient(L,160,R,233);glow.addColorStop(0,'#0e111a77');glow.addColorStop(.4,'#ffffff08');glow.addColorStop(.71,'#ffe3b922');glow.addColorStop(1,'#1110196e');ctx.fillStyle=glow;ctx.fillRect(L-14,97,R-L+30,226+length);
 ellipse(ctx,173,254,23,10,p.skin+'00');ellipse(ctx,171,250,17,8,blend(p.skin,'#c76c62',.4)+'74');
 ellipse(ctx,251,250,17,8,blend(p.skin,'#c76c62',.4)+'74');
 let rand=seeded(c.face+c.skin);for(let i=0;i<20;i++){let x=157+rand()*43,y=234+rand()*19;ellipse(ctx,x,y,.55,.55,blend(p.skin,INK,.43)+'80')}
 });
 // Nose shadows change shape with selected bridge and nose choice.
 const x=210,curl=[2,-2,6,-6,1,7][c.nose];
 line(ctx,'M'+(x+curl)+' 207 Q'+(x-10+curl)+' 243 '+(x+curl)+' 254 Q'+(x+8+curl)+' 259 '+(x+13+curl)+' 249',blend(p.skin,INK,.49),2.5);
 line(ctx,'M205 260 Q210 264 219 260',blend(p.skin,'#f5dcc0',.51),1.7);
 const eyesY=214;
 for(const e of [-1,1]){const ex=e===-1?180:242,style=c.eyes;
 const lower=style===1?23:style===2?11:style===3?17:16,upper=style===1?26:style===2?15:style===7?12:19;
 const ed='M'+(ex-22)+' '+eyesY+' Q'+ex+' '+(eyesY-upper)+' '+(ex+22)+' '+eyesY+' Q'+ex+' '+(eyesY+lower)+' '+(ex-22)+' '+eyesY+'Z';
 path(ctx,ed,'#f1e8d9',INK,2.9);
 ellipse(ctx,ex+(style===3?2:0),eyesY+1,10,12,grad(ctx,ex,eyesY-10,ex,eyesY+13,[[0,blend(p.eye,'#e7cf9d',.3)],[.65,p.eye],[1,blend(p.eye,INK,.66)]]),INK,1);
 ellipse(ctx,ex,eyesY+2,4.6,8,INK);
 ellipse(ctx,ex-4,eyesY-5,3.9,4.4,'#fff5d8');
 ellipse(ctx,ex+5,eyesY+6,1.7,2,'#fff0dc');
 line(ctx,'M'+(ex-23)+' '+(eyesY-2)+' Q'+(ex-3)+' '+(eyesY-upper-2)+' '+(ex+22)+' '+(eyesY-1),INK,style===4?4.9:3.8);
 for(let k=0;k<3;k++){let lash=ex-22+k*5;line(ctx,'M'+lash+' '+(eyesY-7)+' l-3 -'+(k+3),INK,1.35);}
 const by=188+(c.brows===5?6:c.brows===7?-5:0),thick=c.brows===3?6:c.brows===4?2.4:3.7;
 line(ctx,'M'+(ex-22)+' '+by+' Q'+(ex-2)+' '+(by-(c.brows===1?13:7))+' '+(ex+20)+' '+(by+(c.brows===2?-5:0)),blend(p.hair,INK,.48),thick);
 }
 const dM=['M191 277 Q210 282 230 275','M193 273 Q211 294 230 271','M192 275 L230 275','M192 271 Q211 295 229 271','M196 277 Q211 274 225 275','M198 274 L223 274','M192 279 Q211 287 231 270','M199 276 Q209 279 224 275'][c.mouth];
 line(ctx,dM,blend(p.skin,'#66362c',.62),2.8);line(ctx,'M199 285 Q210 291 224 284',blend(p.skin,'#fff1d9',.5),1);
}
function beard(ctx,c,p){if(c.beard===0)return;
 if(c.beard===4||c.beard===5){path(ctx,'M184 270 Q211 261 236 269 L226 282 Q209 277 190 282Z',blend(p.hair,INK,.38),null);}
 if(c.beard===1||c.beard===2||c.beard===3||c.beard===5){const d='M159 268 Q174 311 207 318 Q241 316 265 269 Q248 '+(c.beard===3?344:329)+' 208 '+(c.beard===3?356:334)+' Q167 '+(c.beard===3?334:330)+' 159 268Z';
 path(ctx,d,grad(ctx,163,274,265,357,[[0,blend(p.hair,'#c39e81',.12)],[1,blend(p.hair,INK,.73)]]),INK,2.5);
 clip(ctx,d,()=>fibers(ctx,175,295,248,346,30+c.beard,blend(p.hair,'#d2b592',.35)+'93',42));}
 if(c.beard===6){for(const x of [155,263])path(ctx,'M'+x+' 241 q-14 26 5 56',null,blend(p.hair,INK,.45),10);}
}
function frontHair(ctx,c,p){if(c.hairFront===9)return;
 const parts=[
 'M143 175 Q130 115 167 91 Q213 73 255 95 Q290 117 277 181 L258 186 Q238 161 235 131 Q215 168 185 177 L158 201Z',
 'M141 181 Q127 104 171 86 Q227 64 267 102 Q288 129 281 186 L257 198 L237 147 L213 194 L191 147 L165 208Z',
 'M147 172 Q132 120 173 95 Q216 76 254 100 Q279 118 276 177 Q252 148 238 141 Q211 155 189 144 L159 190Z',
 'M140 174 Q113 132 161 94 Q213 66 259 92 Q295 122 273 197 L247 187 L226 138 L207 175 L179 160 L155 214Z',
 'M147 185 Q122 115 176 83 Q214 77 263 103 Q287 134 279 182 Q254 145 243 134 Q213 175 190 164 L154 222Z',
 'M145 166 Q129 103 185 85 Q226 75 259 91 Q290 117 276 176 Q249 162 225 124 Q204 151 178 151 L150 196Z',
 'M144 179 Q124 104 178 80 Q236 65 270 107 Q299 139 269 199 L245 175 Q225 165 210 133 Q185 182 154 215Z',
 'M140 184 Q129 115 178 87 Q226 70 264 101 Q289 129 280 186 Q248 140 226 155 Q209 177 187 153 L157 213Z',
 'M137 179 Q112 127 172 91 Q218 67 271 101 Q290 136 279 185 L266 209 L245 150 L225 201 L201 155 L173 214 L149 220Z',
 'M151 167 Q143 122 174 100 Q216 83 253 101 Q269 116 277 164 L257 151 Q215 128 151 167Z',
 'M141 181 Q130 109 167 91 Q220 68 261 92 Q291 120 282 180 L264 211 Q239 171 226 139 Q214 190 184 169 L152 216Z',
 'M147 183 Q123 120 174 92 Q223 70 261 98 Q296 137 280 183 L256 193 Q241 142 210 142 Q185 179 153 217Z'];
 const d=parts[c.hairFront];
 path(ctx,d,grad(ctx,132,83,282,220,[[0,blend(p.hair,'#ffe6c1',.26)],[.31,p.hair],[.8,blend(p.hair,INK,.45)],[1,blend(p.hair,INK,.74)]]),INK,4);
 clip(ctx,d,()=>{fibers(ctx,135,86,282,204,40+c.hairFront,blend(p.hair,'#ffdfba',.55)+'af',44);
 for(let i=0;i<34;i++){let x=134+i*4.6;line(ctx,'M'+x+' 101 Q'+(x-22+i%5*3)+' 139 '+(x-15-i%3*5)+' '+(209-i%3*8),i%4===0?blend(p.hair,'#ffe1bc',.58)+'bd':blend(p.hair,INK,.64)+'b0',i%3===0?2.6:1.1)}});
 if([3,6,8,11].includes(c.hairFront))for(const x of [135,283])line(ctx,'M'+x+' 164 q-21 32 2 59 q-16 19 1 34',blend(p.hair,INK,.46),5);
}
function accessory(ctx,c,p,wide){const n=c.accessory,L=147-wide,R=273+wide;
 if([1,8].includes(n))for(const x of [L-5,R+5]){ellipse(ctx,x,249,5.5,6.2,p.trim,INK,1.6);ellipse(ctx,x,266,n===8?7:3,n===8?11:4,p.trim,INK,1.5);}
 if(n===2){for(const x of [180,242]){path(ctx,'M'+(x-26)+' 200 Q'+x+' 192 '+(x+24)+' 199 L'+(x+21)+' 227 Q'+x+' 233 '+(x-24)+' 225Z','#31424b68',p.trim,2.7)}line(ctx,'M204 202 L220 201',p.trim,2);}
 if(n===3)line(ctx,'M252 230 l-18 26 m9 -18 l-15 20',blend(p.skin,INK,.76),2);
 if(n===4){line(ctx,'M154 135 Q210 114 272 135',p.trim,4);path(ctx,'M204 124 l7 -11 l8 11 l-8 10Z',p.trim,INK,1.6);}
 if([5,10].includes(n)){line(ctx,'M170 329 Q211 380 249 329',p.trim,3);path(ctx,'M206 362 l6 -15 l7 15 l-7 10Z',p.trim,INK,2);}
 if(n===6)path(ctx,'M151 208 L204 210 L194 240 L151 242Z',blend(p.secondary,INK,.66),p.trim,2.7);
 if(n===7||n===11){for(let i=0;i<9;i++){let x=163+i*11;ellipse(ctx,x,244+(i%3)*4,1.5,2.3,p.trim)}}
 if(n===9)path(ctx,'M150 269 Q210 297 275 268 L265 299 Q210 319 157 299Z',blend(p.secondary,INK,.69),p.trim,3);
 if(n===11){for(const x of [162,261])ellipse(ctx,x,139,4,8,p.trim,INK,1.3);}
}
function portrait(ctx,w,h,raw){const c=norm(raw),p=pal(c),wide=RIG.faceWidth[c.face];ctx.save();ctx.clearRect(0,0,w,h);ctx.scale(w/W,h/H);
 background(ctx,c,p);capeBack(ctx,c,p);rearHair(ctx,c,p);anatomy(ctx,c,p);costume(ctx,c,p);overArmor(ctx,c,p);
 ears(ctx,c,p,wide);head(ctx,c,p);beard(ctx,c,p);frontHair(ctx,c,p);hoodFront(ctx,c,p);accessory(ctx,c,p,wide);
 ctx.strokeStyle=p.trim+'a4';ctx.lineWidth=2.5;ctx.strokeRect(10,10,400,500);
 ctx.restore();return c;}
function token(ctx,size,canvas,raw){const c=norm(raw),p=pal(c);ctx.clearRect(0,0,size,size);ctx.save();const round=c.frame<3;
 ctx.beginPath();if(round)ctx.arc(size/2,size/2,size*.487,0,Math.PI*2);else ctx.roundRect(size*.018,size*.018,size*.964,size*.964,Math.max(3,size*.035));ctx.clip();
 ctx.fillStyle=BACK[c.background];ctx.fillRect(0,0,size,size);
 const crop=round?[70,70,280,280]:[55,60,310,310];
 ctx.drawImage(canvas,crop[0]*canvas.width/W,crop[1]*canvas.height/H,crop[2]*canvas.width/W,crop[3]*canvas.height/H,0,0,size,size);
 ctx.restore();if(c.frame===4)return;
 const colors=[p.trim,'#d5dce3',p.trim,p.trim];for(let i=0;i<2;i++){ctx.beginPath();if(round)ctx.arc(size/2,size/2,size*.48-i*size*.018,0,Math.PI*2);else ctx.roundRect(size*(.02+i*.014),size*(.02+i*.014),size*(.96-i*.028),size*(.96-i*.028),size*.027);
 ctx.lineWidth=size*(i===0?.022:.007);ctx.strokeStyle=colors[c.frame];ctx.stroke();}}
function random(previous){const c=norm(previous);for(const [k,v] of Object.entries(OPTIONS))c[k]=Math.floor(Math.random()*v.length);for(const [k,v] of [['hairColor',COLORS.hair],['eyeColor',COLORS.eyes],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])c[k]=Math.floor(Math.random()*v.length);for(const k of ['Skin','Hair','Eyes','Primary','Secondary','Trim'])c['useCustom'+k]=false;return c;}
const api={W,H,COLORS,OPTIONS,BACK,DEFAULTS,RIG,norm,pal,portrait,token,random,version:81};root.Mastermind81Rig=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
