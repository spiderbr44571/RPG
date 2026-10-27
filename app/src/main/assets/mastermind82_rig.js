/* MASTERMIND v0.82 — Original raster pixel-art sprite engine.
 * 116 hand-composed transparent sprite assets, fixed 168x208 coordinate rig.
 * Index-based palette swaps preserve individually authored lighting/shadows.
 * Display pixels use nearest-neighbor, never procedural vector figures. */
(function(root){'use strict';
const D=root.document,W=168,H=208;
const COLORS={
 skin:['#f2d2b4','#e7b895','#dba07c','#c78965','#b57b57','#986142','#7d4a34','#683e32','#b87760','#e1aa88','#d1a28b','#f4dfc9'],
 hair:['#14191c','#332320','#593b2f','#85553c','#b27e50','#d9ba82','#e1d2bb','#aab1aa','#38555e','#74475c','#7b392f','#d9c9a2'],
 eyes:['#b77b32','#417d87','#72a178','#c7a958','#7770ad','#ab575b','#6c5549','#b1bec3'],
 cloth:['#12606a','#343d54','#653947','#5d493e','#697256','#8c724b','#b7a288','#2c303a','#9a5c39','#5b4d73','#1b5251','#873d3a'],
 trim:['#dec38f','#e0d7c5','#b98853','#9aafb2','#b2b3cc','#d4a189']};
const OPTIONS={
 body:['Esbelto','Atlético','Robusto','Quadris largos'],face:['Oval','Angular','Redondo','Quadrado','Coração','Alongado'],ears:['Humanas','Discretas','Élficas','Pontudas'],
 skin:COLORS.skin.map((_,i)=>'Pele '+(i+1)),eyes:['Amendoados','Grandes','Estreitos','Caídos','Alertas','Brilhantes','Serenos','Felinos'],
 brows:['Naturais','Retas','Arqueadas','Grossas','Finas','Franzidas','Assimétricas','Levantadas'],nose:['Reto','Curto','Arrebitado','Largo','Aquilino','Marcado'],
 mouth:['Neutra','Sorriso','Firme','Sorriso aberto','Séria','Lábios finos','Maliciosa','Concentrada'],
 hairBack:['Curto','Longo liso','Longo ondulado','Trançado','Coque','Rabo de cavalo','Cachos','Raspado','Dreads','Preso baixo','Solto médio','Dupla trança'],
 hairFront:['Lateral','Dividido','Franja curta','Cachos','Lateral longa','Topete','Tranças','Ondulado','Franja irregular','Raspado','Mechas longas','Cortina'],
 beard:['Nenhuma','Por fazer','Barba curta','Barba cheia','Bigode','Cavanhaque','Costeletas'],
 outfit:['Viajante','Explorador','Caçador','Nobre','Ocultista','Mago','Bardo','Alquimista','Investigador','Guerreiro','Armadura leve','Armadura pesada','Paladino','Samurai','Ritualista','Mercenário'],
 cloak:['Sem capa','Manto curto','Capa longa','Capuz caído','Cachecol','Pele de inverno'],
 armor:['Nenhuma','Ombreiras de couro','Peitoral metálico','Armadura rúnica','Cota de malha','Gola de placas'],
 accessory:['Nenhum','Brincos','Óculos','Cicatriz','Tiara','Colar','Tapa-olho','Pintura ritual','Argolas','Máscara baixa','Pingente arcano','Presilhas'],
 background:['Obsidiana','Bosque','Bruma','Rubi','Mar profundo','Pergaminho'],frame:['Anel de bronze','Anel prateado','Anel arcano','Quadrado clássico','Sem moldura']};
const BACK=['#2f2840','#2c453b','#414557','#58323c','#234452','#725945'];
const DEFAULTS={version:82,body:0,face:0,ears:0,skin:3,eyes:1,brows:0,nose:0,mouth:1,hairBack:2,hairFront:0,beard:0,outfit:0,cloak:0,armor:0,accessory:0,background:0,frame:0,
 hairColor:9,eyeColor:4,clothPrimary:0,clothSecondary:1,trimColor:0,
 customSkin:'',customHair:'',customEyes:'',customPrimary:'',customSecondary:'',customTrim:'',
 useCustomSkin:false,useCustomHair:false,useCustomEyes:false,useCustomPrimary:false,useCustomSecondary:false,useCustomTrim:false};
const RIG={base:{head:[84,80],neck:[84,141],chest:[84,177],shoulders:[[34,153],[134,153]],eyes:[[65,79],[94,79]],mouth:[84,116],hair:[84,39]},faceWidth:[0,-3,4,5,-2,-1],earY:80};
function idx(n,len){const x=Number(n);return Number.isFinite(x)?Math.max(0,Math.min(len-1,Math.floor(x))):0;}
function norm(raw){const c={...DEFAULTS,...(raw&&typeof raw==='object'?raw:{})};for(const [k,v]of Object.entries(OPTIONS))c[k]=idx(c[k],v.length);for(const[k,v]of [['hairColor',COLORS.hair],['eyeColor',COLORS.eyes],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])c[k]=idx(c[k],v.length);c.version=82;return c;}
function pal(c){return {skin:c.useCustomSkin&&/^#[a-f\d]{6}$/i.test(c.customSkin)?c.customSkin:COLORS.skin[c.skin],hair:c.useCustomHair&&/^#[a-f\d]{6}$/i.test(c.customHair)?c.customHair:COLORS.hair[c.hairColor],eye:c.useCustomEyes&&/^#[a-f\d]{6}$/i.test(c.customEyes)?c.customEyes:COLORS.eyes[c.eyeColor],primary:c.useCustomPrimary&&/^#[a-f\d]{6}$/i.test(c.customPrimary)?c.customPrimary:COLORS.cloth[c.clothPrimary],secondary:c.useCustomSecondary&&/^#[a-f\d]{6}$/i.test(c.customSecondary)?c.customSecondary:COLORS.cloth[c.clothSecondary],trim:c.useCustomTrim&&/^#[a-f\d]{6}$/i.test(c.customTrim)?c.customTrim:COLORS.trim[c.trimColor]};}
function toRgb(h){const x=h.replace('#','');return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16));}
function blend(a,b,t){return a.map((n,i)=>Math.round(n*(1-t)+b[i]*t));}
const DARK=[29,21,36],LIGHT=[255,240,216],SHADES=[-.72,-.48,-.27,0,.22,.42,.65];
const COUNTS={body:4,hairBack:12,cloak:6,neck:1,outfit:16,armor:6,ears:4,face:6,eyes:8,brows:8,nose:6,mouth:8,beard:7,hairFront:12,accessory:12};
const ORDER=['hairBack','cloak','body','neck','outfit','armor','ears','face','eyes','brows','nose','mouth','beard','hairFront','accessory'];
const OFFSETS={};let offset=0;for(const[k,n]of Object.entries(COUNTS)){OFFSETS[k]=offset;offset+=n;}
// The atlas is embedded as a data URI to avoid Android WebView file-origin restrictions.
// A normal asset URL remains as a backup, but is never needed for the signed offline APK.
let ready=false,failed=false,atlas=null,atlasCtx=null,errorReason='';const cache=new Map(),MAX=180;
let fallbackUsed=false;
const source=new Image(), fileURL='atelier/pixel82_atlas.png';
const embedded=root.Mastermind82AtlasEmbedded;
function notify(kind,reason){
 if(kind==='failed'){failed=true;ready=false;errorReason=reason||'Não foi possível abrir o atlas pixel art';}
 D?.dispatchEvent?.(new CustomEvent('mastermind82:'+kind,{detail:{reason:errorReason}}));
}
source.onload=()=>{
 try{
  if(source.naturalWidth!==1680||source.naturalHeight!==2496)throw Error('Atlas inválido: '+source.naturalWidth+'×'+source.naturalHeight+'; esperado 1680×2496');
  atlas=D.createElement('canvas');atlas.width=1680;atlas.height=2496;
  atlasCtx=atlas.getContext('2d',{willReadFrequently:true});if(!atlasCtx)throw Error('Canvas 2D indisponível');
  atlasCtx.drawImage(source,0,0);atlasCtx.getImageData(0,0,1,1);
  ready=true;failed=false;errorReason='';notify('ready','');
 }catch(err){notify('failed',String(err?.message||err));}
};
source.onerror=()=>{
 if(!fallbackUsed&&embedded){fallbackUsed=true;source.src=fileURL;return;}
 notify('failed','Falha ao ler o atlas de sprites. Reinstale a versão atualizada.');
};
source.src=(typeof embedded==='string'&&embedded.startsWith('data:image/png;base64,'))?embedded:fileURL;
if(typeof root.setTimeout==='function')root.setTimeout(()=>{
 if(!ready&&!failed)notify('failed','O atlas não respondeu. Verifique a instalação do aplicativo.');
},8000);
function getSprite(key,index,p){if(!ready)return null;
 const actual=key==='neck'?0:idx(index,COUNTS[key]);
 const signature=[p.skin,p.hair,p.eye,p.primary,p.secondary,p.trim].join('_');const cacheKey=key+':'+actual+':'+signature;
 if(cache.has(cacheKey)){const obj=cache.get(cacheKey);cache.delete(cacheKey);cache.set(cacheKey,obj);return obj;}
 const serial=OFFSETS[key]+actual,x=(serial%10)*W,y=Math.floor(serial/10)*H;
 const src=atlasCtx.getImageData(x,y,W,H),a=src.data;
 const palette=[p.skin,p.hair,p.primary,p.secondary,p.trim,p.eye,p.secondary,p.skin].map(toRgb);
 const maps=palette.map((rgb,g)=>SHADES.map(s=>{const base=g===7?blend(rgb,[199,100,112],.41):rgb;return blend(base,s<0?DARK:LIGHT,Math.abs(s));}));
 for(let i=0;i<a.length;i+=4){if(a[i+3]===0||a[i+2]!==64)continue;const group=(a[i]-32)/24,shade=(a[i+1]-32)/28;if(!Number.isInteger(group)||!Number.isInteger(shade)||!maps[group]||!maps[group][shade])continue;
 const px=maps[group][shade];a[i]=px[0];a[i+1]=px[1];a[i+2]=px[2];}
 const out=D.createElement('canvas');out.width=W;out.height=H;out.getContext('2d').putImageData(src,0,0);
 cache.set(cacheKey,out);if(cache.size>MAX)cache.delete(cache.keys().next().value);return out;
}
function paintBG(ctx,c,p){ctx.fillStyle=BACK[c.background];ctx.fillRect(0,0,W,H);
 const accent=toRgb(p.trim);
 for(let y=0;y<H;y+=4){for(let x=0;x<W;x+=4){const dx=(x-84)/1.25,dy=(y-97),r=Math.sqrt(dx*dx+dy*dy);if(r>43&&r<68&&((x+y*11)%23)<11){ctx.fillStyle='rgba('+accent.join(',')+',.10)';ctx.fillRect(x,y,4,4);} }}
 // two-pixel hand-sprited frame, no smoothing
 ctx.fillStyle='#3a2839';ctx.fillRect(4,4,W-8,3);ctx.fillRect(4,H-7,W-8,3);ctx.fillRect(4,4,3,H-8);ctx.fillRect(W-7,4,3,H-8);
 ctx.fillStyle=p.trim;ctx.fillRect(8,8,W-16,2);ctx.fillRect(8,H-10,W-16,2);ctx.fillRect(8,8,2,H-16);ctx.fillRect(W-10,8,2,H-16);
}
function portrait(ctx,w,h,raw){const c=norm(raw),p=pal(c);if(!ctx)return c;
 if(!portrait.buffer){portrait.buffer=D.createElement('canvas');portrait.buffer.width=W;portrait.buffer.height=H;}
 const low=portrait.buffer,paint=low.getContext('2d');paint.clearRect(0,0,W,H);paintBG(paint,c,p);
 if(ready){for(const key of ORDER){const sprite=getSprite(key,c[key],p);if(!sprite)continue;
  if(key==='ears'){
   // Left and right ear sprites follow each face shape's independent cheek anchors.
   const delta=RIG.faceWidth[c.face];
   paint.drawImage(sprite,0,0,84,H,-delta,0,84,H);
   paint.drawImage(sprite,84,0,84,H,84+delta,0,84,H);
  }else paint.drawImage(sprite,0,0);
 }}
 else{paint.fillStyle='#b78b6e';paint.font='11px monospace';paint.fillText(failed?'Falha ao carregar sprites':'Carregando pixel art',16,100);}
 ctx.save();ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;ctx.drawImage(low,0,0,w,h);ctx.restore();return c;}
function token(ctx,size,canvas,raw){const c=norm(raw),p=pal(c),n=128;
 const low=D.createElement('canvas');low.width=n;low.height=n;const q=low.getContext('2d');
 q.fillStyle=BACK[c.background];q.fillRect(0,0,n,n);
 q.imageSmoothingEnabled=false;
 // crop a 168x168 square from the portrait, maintaining exact pixel geometry
 q.drawImage(canvas,0,10*canvas.height/H,canvas.width,168*canvas.height/H,0,0,n,n);
 const color=p.trim;
 for(let y=0;y<n;y+=2){for(let x=0;x<n;x+=2){const dx=x+1-n/2,dy=y+1-n/2,r=Math.sqrt(dx*dx+dy*dy);if(c.frame===4)continue;
 let draw=false;
 if(c.frame<3)draw=r>=60&&r<=63;
 else draw=(x<5||x>n-7||y<5||y>n-7)&&(x>=2&&x<n-2&&y>=2&&y<n-2);
 if(draw){q.fillStyle=color;q.fillRect(x,y,2,2);}
 }}
 ctx.save();ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;ctx.drawImage(low,0,0,size,size);ctx.restore();}
function random(previous){const c=norm(previous);for(const[k,v]of Object.entries(OPTIONS))c[k]=Math.floor(Math.random()*v.length);for(const[k,v]of [['hairColor',COLORS.hair],['eyeColor',COLORS.eyes],['clothPrimary',COLORS.cloth],['clothSecondary',COLORS.cloth],['trimColor',COLORS.trim]])c[k]=Math.floor(Math.random()*v.length);for(const k of ['Skin','Hair','Eyes','Primary','Secondary','Trim'])c['useCustom'+k]=false;return c;}
const api={W,H,COLORS,OPTIONS,BACK,DEFAULTS,RIG,norm,pal,portrait,token,random,version:82,isReady:()=>ready,hasError:()=>failed,errorReason:()=>errorReason,spriteCount:offset,spriteSource:embedded?'embedded:pixel82_atlas.png':'atelier/pixel82_atlas.png'};
root.Mastermind82Rig=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);