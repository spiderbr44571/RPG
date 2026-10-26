/* Mastermind v0.77 — aligned vector assets, authored for a shared 420x520 grid. */
(function(root){'use strict';
const W=420,H=520;
const COLORS={skin:['#f6d2ad','#e6b78e','#c88b64','#a86f4f','#80523d','#613a32','#efd0b5','#b77e6b','#755d53','#d3a877'],hair:['#151822','#33221e','#684330','#986a43','#c29b64','#e5d7bd','#dee5e7','#396f77','#71465e','#3e355e','#a25436','#111827','#cd8346','#a3b2b7','#5e843c','#dfb264'],eye:['#85512e','#2b7682','#6b9f6c','#d3a249','#6d5aa8','#99c4d3','#a34b4b','#3e433f','#c785a9','#d8dbdb'],cloth:['#204e53','#623b52','#53467d','#7a4a34','#55714e','#242c40','#b0a37f','#6d716d','#9a662b','#244c79','#894444','#273d35'],trim:['#e6bd7b','#d7dfe1','#c08257','#a7bfae','#9fc5d6','#df8aa5','#a4a1d3','#c5a981']};
const OPTIONS={body:['Feminino','Masculino','Andrógino'],face:['Oval','Anguloso','Redondo','Coração','Quadrado','Alongado'],skin:COLORS.skin.map((_,i)=>'Tom '+(i+1)),hairBack:['Curto','Solto longo','Ondulado','Tranças','Coque','Rabo de cavalo','Cachos','Raspado','Dreads','Liso longo'],hairFront:['Lateral','Franja curta','Dividido','Ondas','Topete','Assimétrico','Tranças frontais','Repartido','Cachos altos','Sem franja'],eyes:['Amendoado','Arredondado','Afiado','Sereno','Expressivo','Caído','Místico','Focado'],brows:['Suaves','Arqueadas','Retas','Espessas','Finas','Franzidas','Elevadas','Assimétricas'],mouth:['Neutra','Sorriso','Séria','Confiante','Surpresa','Sorriso discreto','Lábio inferior','Concentrada'],outfit:['Aventureiro','Ocultista','Combatente','Nobre','Investigador','Andarilho','Cerimonial','Sombrio','Armadura leve','Tecnológico'],accessory:['Nenhum','Brincos','Piercing','Colar','Óculos','Tiara','Cicatriz','Pintura facial','Amuleto','Capa','Ombreira','Marcas arcanas'],frame:['Círculo clássico','Círculo dourado','Círculo arcano','Quadrado','Quadrado ornado'],background:['Noite','Floresta','Neblina','Rubi','Azul profundo','Pergaminho','Sombra','Oceano']};
const BACKGROUNDS=['#171820','#243d36','#374451','#4e2b38','#172b43','#675344','#1d1729','#164853'];
const DEFAULTS={version:77,body:0,face:0,skin:2,hairBack:1,hairFront:0,eyes:0,brows:0,mouth:0,outfit:0,accessory:0,frame:0,background:0,hairColor:1,eyeColor:0,clothPrimary:0,clothSecondary:6,trimColor:0,accent:'#d5aa75',customHair:'#33221e',customEyes:'#85512e',customPrimary:'#204e53',customSecondary:'#b0a37f',customSkin:'#c88b64',useCustomHair:false,useCustomEyes:false,useCustomPrimary:false,useCustomSecondary:false,useCustomSkin:false};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
function normal(raw){const c={...DEFAULTS,...raw};for(const [key,list] of Object.entries(OPTIONS))if(typeof c[key]==='number')c[key]=Math.round(clamp(c[key],0,list.length-1));for(const [key,list]of [['hairColor',COLORS.hair],['eyeColor',COLORS.eye],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])c[key]=Math.round(clamp(c[key],0,list.length-1));return c;}
function palette(raw){const c=normal(raw);return {skin:c.useCustomSkin?c.customSkin:COLORS.skin[c.skin],hair:c.useCustomHair?c.customHair:COLORS.hair[c.hairColor],eye:c.useCustomEyes?c.customEyes:COLORS.eye[c.eyeColor],primary:c.useCustomPrimary?c.customPrimary:COLORS.cloth[c.clothPrimary],secondary:c.useCustomSecondary?c.customSecondary:COLORS.cloth[c.clothSecondary],trim:COLORS.trim[c.trimColor],ink:'#171723'};}
function tint(s,n){let h=String(s||'#555555').slice(1);if(!/^[a-f0-9]{6}$/i.test(h))h='555555';let v='#';for(let i=0;i<6;i+=2)v+=Math.round(clamp(parseInt(h.slice(i,i+2),16)+n,0,255)).toString(16).padStart(2,'0');return v;}
function path(ctx,str,fill,stroke='#171723',w=3){const p=new Path2D(str);if(fill){ctx.fillStyle=fill;ctx.fill(p);}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke(p);}return p;}
function ellipse(ctx,x,y,rx,ry,fill,stroke=null,width=2){ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
function line(ctx,str,color='#161c24',width=2){path(ctx,str,null,color,width)}
const BACK=[
'M142 179 Q127 80 209 72 Q291 77 280 181 L283 275 Q245 320 234 252 L175 254 Q148 322 135 282Z',
'M138 168 Q130 66 210 69 Q291 71 283 165 Q289 290 312 372 Q267 376 247 310 Q230 289 225 255 L175 255 Q157 318 121 370 L91 363 Q132 250 138 168Z',
'M138 175 Q128 77 211 74 Q291 75 286 183 Q310 260 293 347 Q256 370 243 317 Q218 277 178 317 Q149 370 116 351 Q101 308 135 216Z',
'M142 172 Q135 80 215 77 Q282 84 274 166 L279 301 Q294 340 282 370 L269 371 L256 281 L173 275 L151 376 L134 378 L140 260Z',
'M135 177 Q122 85 193 100 Q176 57 217 45 Q264 45 258 105 Q291 117 277 177 L266 222 L153 225Z',
'M133 169 Q120 70 209 77 Q276 79 282 174 L266 237 Q291 265 329 287 Q335 310 303 318 Q265 320 250 254 L147 248Z',
'M130 175 Q122 68 211 70 Q295 76 291 182 Q306 250 291 319 Q271 346 255 321 Q231 277 211 294 Q189 342 163 322 Q144 287 119 317 Q99 337 107 284Z',
'M152 185 Q140 119 181 110 Q226 83 264 123 Q282 163 265 198 L244 223 L164 219Z',
'M144 173 Q123 85 208 73 Q282 77 277 164 L280 367 L258 370 L250 260 L168 261 L159 374 L134 371Z',
'M147 169 Q132 64 209 73 Q289 69 279 171 L277 380 L257 383 L258 201 L158 202 L163 377 L138 374Z'];
const FRONT=[
'M141 186 Q118 86 182 88 Q209 67 244 87 Q285 96 280 184 Q264 161 247 136 Q230 157 210 146 Q182 177 148 166Z',
'M139 188 Q126 95 201 90 Q278 70 284 183 L256 199 L236 161 L212 209 L189 165 L160 203Z',
'M136 183 Q135 87 206 88 Q281 86 285 181 L256 184 Q252 139 217 129 L203 178 L178 130 Q158 145 159 188Z',
'M138 197 Q119 95 196 88 Q272 80 284 188 L270 218 L249 174 Q222 202 205 183 Q178 207 143 208Z',
'M139 181 Q143 110 179 110 Q176 72 224 77 Q265 68 279 146 L275 188 Q243 157 227 108 Q195 131 177 160 L143 197Z',
'M135 197 Q128 109 197 87 Q261 78 284 151 L269 214 L243 172 L223 132 L205 168 L153 226Z',
'M134 194 Q113 102 191 90 Q262 76 281 187 L266 225 L239 160 L216 182 L191 145 L167 221Z',
'M137 184 Q128 87 203 82 Q282 88 285 190 L254 181 L235 138 L209 124 L183 138 L165 184Z',
'M132 203 Q117 93 206 84 Q282 81 284 197 L266 215 L244 157 L225 183 L199 152 L179 194 L153 219Z',
'M145 164 Q133 83 206 80 Q283 83 273 166 Q238 119 208 123 Q164 113 145 164Z'];
function background(ctx,c,pal){const bg=BACKGROUNDS[c.background]||BACKGROUNDS[0];const g=ctx.createLinearGradient(0,0,420,520);g.addColorStop(0,tint(bg,28));g.addColorStop(1,tint(bg,-15));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const glow=ctx.createRadialGradient(206,165,10,207,250,330);glow.addColorStop(0,pal.trim+'66');glow.addColorStop(.5,pal.primary+'22');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);ctx.strokeStyle=pal.trim+'50';ctx.lineWidth=2;for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(210,260,134+k*35,0,Math.PI*2);ctx.stroke();}}
function draw(ctx,w,h,raw){const c=normal(raw),pal=palette(c);ctx.save();ctx.clearRect(0,0,w,h);ctx.scale(w/W,h/H);background(ctx,c,pal);
if(c.hairBack!==7){path(ctx,BACK[c.hairBack],tint(pal.hair,-25),pal.ink,3.7);if([1,2,3,6,8,9].includes(c.hairBack))for(let i=0;i<11;i++){let x=128+i*15;line(ctx,'M'+x+' 180 Q'+(x-13)+' 250 '+(x+i%3*5)+' '+(301+i%4*10),i%3===0?tint(pal.hair,28):pal.hair,2.4);}}
const sw=c.body===1?162:c.body===2?136:148,left=210-sw,right=210+sw;
path(ctx,'M'+left+' 367 Q'+(left-51)+' 396 '+(left-51)+' 535 L'+(right+51)+' 535 Q'+(right+51)+' 395 '+right+' 367 L258 329 L161 329Z',tint(pal.primary,-22),pal.ink,5);
path(ctx,'M184 273 L237 273 L245 349 Q212 373 176 349Z',tint(pal.skin,-19),pal.ink,3);
path(ctx,'M187 306 Q211 329 233 306 L231 345 Q209 362 181 345Z',pal.skin,null);
const n=c.outfit,p1=pal.primary,p2=pal.secondary,metal=pal.trim;
path(ctx,n%2?'M149 349 L185 310 Q210 344 235 310 L271 348 Q210 389 149 349Z':'M150 346 L186 308 Q208 345 237 308 L270 348 L226 398 L197 398Z',p2,pal.ink,4);
path(ctx,'M152 346 Q176 372 209 390 Q244 367 266 345 L281 535 L138 535Z',p1,pal.ink,4);
path(ctx,'M186 345 Q194 362 209 381 Q226 362 236 344 L219 424 L209 438 L199 425Z',tint(p2,-10),null);
line(ctx,'M210 387 L209 518',metal+'bb',n===3||n===6?4:2);
if([0,5,6].includes(n)){path(ctx,'M98 371 Q139 334 165 347 L209 404 L137 477Z',p2,pal.ink,3);line(ctx,'M111 384 Q167 401 171 442',metal,3);}
if([1,7].includes(n)){path(ctx,'M144 365 L172 355 L210 419 L249 353 L281 366 L244 497 L177 497Z',tint(p1,-32),metal,3);for(let i=0;i<5;i++)ellipse(ctx,209,413+i*16,3,3,metal);}
if([2,8,9].includes(n)){path(ctx,'M80 389 Q106 349 143 362 L177 421 L150 464 L84 445Z',tint(p2,-10),pal.ink,4);path(ctx,'M339 390 Q307 344 277 357 L245 418 L269 467 L338 445Z',tint(p2,-11),pal.ink,4);line(ctx,'M92 401 L148 434 M329 401 L273 434',metal,3);}
if([3,6].includes(n)){path(ctx,'M146 344 Q210 389 274 343 L299 414 L259 443 Q212 416 159 443 L120 411Z',tint(p1,20),metal,4);for(let j=0;j<5;j++)ellipse(ctx,158+j*25,410+j%2*4,4,4,metal);}
if(n===4){path(ctx,'M163 365 L200 397 L221 517 L151 517Z',tint(p1,-20),null);path(ctx,'M257 365 L224 397 L203 517 L270 517Z',p2,null);}
if([0,2,5,8].includes(n))path(ctx,'M130 449 Q211 474 292 448 L290 471 Q209 493 134 470Z',tint(p2,-16),pal.ink,2.5);
const wide=c.face===2?5:c.face===1?-8:c.face===4?10:0,extra=c.face===5?10:0;
path(ctx,'M'+(147-wide)+' 169 Q'+(144-wide)+' 106 204 105 Q'+(273+wide)+' 102 '+(276+wide)+' 174 L'+(271+wide)+' '+(231+extra)+' Q266 280 229 303 Q210 315 190 305 Q151 283 '+(149-wide)+' '+(227+extra)+'Z',pal.skin,pal.ink,4);
ellipse(ctx,168,232,22,9,tint(pal.skin,9)+'80');ellipse(ctx,250,232,22,9,tint(pal.skin,9)+'80');
line(ctx,'M210 205 Q203 238 207 251 Q212 256 220 251',tint(pal.skin,-38),2.3);
path(ctx,'M154 207 Q139 200 143 219 Q145 239 159 241Z',pal.skin,pal.ink,2.5);
path(ctx,'M267 208 Q283 197 283 219 Q280 239 266 238Z',pal.skin,pal.ink,2.5);
const open=c.eyes===5?7:c.eyes===1?15:c.eyes===6?17:12,slant=c.eyes===2?5:c.eyes===3?-2:0;
for(const x of [177,242]){path(ctx,'M'+(x-18)+' '+(210+slant)+' Q'+x+' '+(198-open*.3)+' '+(x+18)+' '+(209-slant)+' Q'+x+' '+(217+open*.55)+' '+(x-18)+' '+(210+slant)+'Z','#f2e9e2',pal.ink,2.5);ellipse(ctx,x,210,open*.57,open*.83,pal.eye,pal.ink,1.2);ellipse(ctx,x+1,211,open*.22,open*.61,tint(pal.eye,-65));ellipse(ctx,x-3,207,3,3,'#ffffffdd');line(ctx,'M'+(x-19)+' '+(210+slant)+' Q'+x+' '+(198-open*.3)+' '+(x+19)+' '+(209-slant),pal.ink,3.4);
const lift=[0,-6,1,3,0,8,-10,-2][c.brows]||0,lineWidth=c.brows===4?1.9:c.brows===3?5.5:3.3;line(ctx,'M'+(x-17)+' '+(190+lift)+' Q'+x+' '+(182+lift+(c.brows===1?-7:0))+' '+(x+18)+' '+(191+lift+(c.brows===5?7:0)),tint(pal.hair,-14),lineWidth);}
const lips=['M195 273 Q211 277 226 273','M192 269 Q209 285 229 268','M195 273 L227 273','M191 277 Q207 283 228 268','M205 272 Q209 261 215 274 Q212 286 207 281','M197 270 Q211 279 225 272','M195 273 Q211 270 225 273','M196 276 Q210 269 226 274'];line(ctx,lips[c.mouth],tint(pal.skin,-70),c.mouth===4?4:2.5);
path(ctx,FRONT[c.hairFront],tint(pal.hair,-20),pal.ink,4.2);
for(let j=0;j<10;j++){const x=148+j*13,y=116+j%4*9;line(ctx,'M'+x+' '+y+' Q'+(x-6)+' '+(y+17)+' '+(x-(j%3)*4)+' '+(y+34),j%3===0?tint(pal.hair,30):pal.hair,j%3===0?3:1.8);}
const ac=c.accessory;
if([1,3,8].includes(ac))for(const x of [150,271]){ellipse(ctx,x,236,5,7,metal,pal.ink,2);line(ctx,'M'+x+' 241 l0 16',metal,3);ellipse(ctx,x,261,6,8,metal,pal.ink,1.5);}
if(ac===2)ellipse(ctx,273,234,4,5,metal,pal.ink,1);
if(ac===3||ac===8){line(ctx,'M167 325 Q208 362 251 325',metal,3);path(ctx,'M203 354 L211 342 L219 354 L211 369Z',metal,pal.ink,2);}
if(ac===4){path(ctx,'M158 209 Q177 200 194 207 L190 226 Q173 230 155 220Z','#24283755',metal,3);path(ctx,'M225 208 Q245 201 263 209 L260 220 Q240 232 227 226Z','#24283755',metal,3);line(ctx,'M193 208 Q210 203 225 208',metal,3);}
if(ac===5){path(ctx,'M145 132 Q207 116 273 130 L274 139 Q205 129 145 141Z',metal,pal.ink,2);ellipse(ctx,210,128,8,6,pal.eye,metal,2);}
if(ac===6){line(ctx,'M240 231 L264 251 M239 243 L259 260',tint(pal.skin,-87),2);}
if(ac===7){path(ctx,'M161 248 L180 240 L168 269Z',metal+'88',null);}
if(ac===9){path(ctx,'M87 365 Q130 346 158 364 L175 520 L69 520Z',tint(p2,-13),metal,3);path(ctx,'M332 359 Q288 343 263 362 L248 520 L350 520Z',tint(p2,-13),metal,3);}
if(ac===10){path(ctx,'M100 362 Q145 344 160 381 L158 433 L98 416Z',tint(p2,5),metal,3);path(ctx,'M322 364 Q279 341 264 383 L261 432 L328 416Z',tint(p2,5),metal,3);}
if(ac===11)for(let j=0;j<7;j++)ellipse(ctx,167+j*17%87,222+j*14,2.7,2.7,metal+'ad');
ctx.lineWidth=3;ctx.strokeStyle=pal.trim+'b7';ctx.strokeRect(9,9,402,502);ctx.restore();return c;}
function token(ctx,size,portrait,raw){const c=normal(raw),pal=palette(c),round=c.frame<3;ctx.clearRect(0,0,size,size);const box=size*.94,offset=size*.03;ctx.save();ctx.beginPath();if(round)ctx.arc(size/2,size/2,box/2,0,Math.PI*2);else ctx.roundRect(offset,offset,box,box,size*.06);ctx.clip();ctx.drawImage(portrait,54,72,310,310,offset,offset,box,box);ctx.restore();for(const [width,col,ind]of [[size*.041,'#0d121d',0],[size*.018,c.frame===1||c.frame===4?'#e5b86e':c.frame===2?'#8fb7dc':pal.trim,size*.027]]){ctx.lineWidth=width;ctx.strokeStyle=col;ctx.beginPath();if(round)ctx.arc(size/2,size/2,box/2-ind,0,Math.PI*2);else ctx.roundRect(offset+ind,offset+ind,box-2*ind,box-2*ind,size*.06);ctx.stroke();}}
function random(previous={}){const next=normal(previous);for(const [key,list]of Object.entries(OPTIONS))next[key]=Math.floor(Math.random()*list.length);for(const [key,list]of [['hairColor',COLORS.hair],['eyeColor',COLORS.eye],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])next[key]=Math.floor(Math.random()*list.length);for(const prop of ['Hair','Eyes','Primary','Secondary','Skin'])next['useCustom'+prop]=false;return next;}
const api={W,H,COLORS,OPTIONS,DEFAULTS,BACKGROUNDS,normal,palette,draw,token,random};root.Mastermind77Assets=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);