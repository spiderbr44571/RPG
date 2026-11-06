/* Mastermind v0.99: Ateliê em camadas.
 * Cada peça é uma camada pintada sobre o mesmo manequim e recolorida aqui,
 * mantendo sombreado e nanquim. Substitui o acompanhante do lyime.
 * Tudo roda offline: as camadas vêm de mastermind99_atelier_layers.js.
 */
(function(root){'use strict';
const DOC=root.document;
const CAMADAS=root.MastermindAtelierLayers;
const host=DOC&&DOC.getElementById('ma99-atelier');
if(!host||!CAMADAS)return;
const $=id=>DOC.getElementById('ma99-'+id);
const TAU=Math.PI*2,PI=Math.PI;
/* TOP: peça mais alta (pode passar do topo do manequim, y<0); a escala encolhe para tudo caber no quadro */
const TOP=Math.min(0,...Object.values(CAMADAS).filter(v=>v&&typeof v==='object').flatMap(v=>[v.y,v.dy].filter(n=>typeof n==='number')));
const W=440,H=860,FH=800,FS=FH/(CAMADAS.H-TOP),FW=CAMADAS.W*FS,FX=(W-FW)/2,FY=12,FY0=FY-TOP*FS;

const EL={
  sangue:{nome:'Sangue',cor:'#c8202f',escuro:'#2c070c',brilho:'#ff4d5e'},
  morte:{nome:'Morte',cor:'#6d6672',escuro:'#0b090c',brilho:'#d2cbd6'},
  conhecimento:{nome:'Conhecimento',cor:'#d6a42a',escuro:'#2a1f07',brilho:'#ffd76a'},
  energia:{nome:'Energia',cor:'#8a4dff',escuro:'#170b33',brilho:'#c7a6ff'},
  medo:{nome:'Medo',cor:'#dcd8e4',escuro:'#1f1d24',brilho:'#ffffff'}
};
const PELES=['original','#f2d3b8','#e0b08a','#b9805a','#8a5a3c','#5e3b27','#bdb8b4'];
const CABELO_CORES=['original','#1d1719','#3a2a22','#6b4528','#b07a3a','#dcc28c','#a9a4a1','#7a1820','#2c3d6b'];
const ROUPA_CORES=['original','#1f1c21','#3a3a3d','#e6e2dc','#5a1d24','#3b4030','#2b3a55','#6b5440','#7a6a9a'];

/* z: ordem de empilhamento (maior fica por cima). cobre: peças que a armadura esconde.
 * tras: região do cabelo que fica atrás do corpo; some sob roupas com cobreTras. */
const PECAS={
  cabelo:[{id:'topete',nome:'Penteado para trás',camada:'cabelo'},{id:'baguncado',nome:'Bagunçado',camada:'cabelo-baguncado'},{id:'longo',nome:'Longo liso',camada:'cabelo-longo',tras:[[380,250],[560,250],[560,1360],[380,1360]]},{id:'rabo',nome:'Rabo de cavalo',camada:'cabelo-rabo'},
    {id:'cacheado',nome:'Cacheado',camada:'cabelo-cacheado'},{id:'raspado',nome:'Raspado',camada:'cabelo-raspado'},{id:'coque',nome:'Coque',camada:'cabelo-coque'},{id:'moicano',nome:'Moicano',camada:'cabelo-moicano'},
    {id:'loiro',nome:'Curto ondulado',camada:'cabelo-loiro'},{id:'chanel',nome:'Chanel com franja',camada:'cabelo-chanel'},{id:'dreads',nome:'Dreads',camada:'cabelo-dreads'}],
  barba:[{id:'cheia',nome:'Barba cheia',camada:'barba-cheia'},{id:'cavanhaque',nome:'Cavanhaque',camada:'barba-cavanhaque'}],
  cabeca:[{id:'chapeu',nome:'Chapéu fedora',camada:'acc-chapeu'},{id:'elmo',nome:'Elmo de cavaleiro',camada:'acc-elmo'},{id:'mascaragas',nome:'Máscara de gás',camada:'acc-mascaragas'}],
  roupa:[{id:'camisa',nome:'Camisa social',camada:'camisa',z:15},{id:'camiseta',nome:'Camiseta',camada:'roupa-camiseta',z:15},{id:'terno',nome:'Terno e gravata',camada:'roupa-terno'},
    {id:'jaleco',nome:'Jaleco',camada:'roupa-jaleco'},{id:'capa',nome:'Capa',camada:'roupa-capa',cobreTras:true},{id:'sobretudo',nome:'Sobretudo',camada:'roupa-sobretudo'},
    {id:'moletom',nome:'Moletom',camada:'roupa-moletom',cobreTras:true},{id:'jaqueta',nome:'Jaqueta de couro',camada:'roupa-jaqueta'},{id:'colete',nome:'Colete tático',camada:'roupa-colete'},
    {id:'kimono',nome:'Gi de luta',camada:'roupa-kimono'},{id:'batina',nome:'Manto de culto',camada:'roupa-batina'},
    {id:'placas',nome:'Armadura de placas',camada:'armadura-placas',cobre:['calca']},{id:'couro',nome:'Armadura de couro',camada:'armadura-couro',cobre:['calca','calcado']}],
  calca:[{id:'cargo',nome:'Calça cargo',camada:'calca'},{id:'social',nome:'Calça social',camada:'calca-social'},{id:'jeans',nome:'Jeans',camada:'calca-jeans'},{id:'saia',nome:'Saia e meia-calça',camada:'calca-saia'}],
  calcado:[{id:'bota',nome:'Bota de couro',camada:'bota'},{id:'sapato',nome:'Sapato social',camada:'calcado-sapato'},{id:'tenis',nome:'Tênis',camada:'calcado-tenis'},{id:'coturno',nome:'Coturno',camada:'calcado-coturno'}],
  acessorios:[{id:'oculos',nome:'Óculos',camada:'acc-oculos'},{id:'tapaolho',nome:'Tapa-olho',camada:'acc-tapaolho'},{id:'cicatriz',nome:'Cicatriz',camada:'acc-cicatriz'},
    {id:'cachecol',nome:'Cachecol',camada:'acc-cachecol'},{id:'colar',nome:'Colar ocultista',camada:'acc-colar'},{id:'fone',nome:'Fone no pescoço',camada:'acc-fone'},
    {id:'luvas',nome:'Luvas',camada:'acc-luvas'},{id:'coldre',nome:'Coldre',camada:'acc-coldre'},{id:'katana',nome:'Katana nas costas',camada:'acc-katana'}]
};
const CAT_Z={calcado:10,calca:20,roupa:30,barba:35,cabelo:40,acessorios:45,cabeca:50};
const MULTI=new Set(['acessorios']);
for(const cat in PECAS)for(const p of PECAS[cat])if(p.camada&&!CAMADAS[p.camada])p.camada=null;

const OPC={
  elemento:Object.keys(EL).map(k=>[k,EL[k].nome]),
  moldura:[['neutro','Neutro'],['aliado','Aliado'],['inimigo','Inimigo'],['chefe','Chefe']],
  base:[['recorte','Só sombra'],['anel','Anel no chão']],
  acabamento:[['cor','Colorido'],['dessaturado','Desbotado'],['noir','Noir']],
  condicao:[['normal','Normal'],['machucado','Machucado'],['morrendo','Morrendo'],['enlouquecendo','Enlouquecendo']],
  efeito:[['nenhum','Nenhum'],['aura','Aura'],['respingos','Respingos'],['rachaduras','Rachaduras'],['nevoa','Névoa nos pés'],['vhs','Fita VHS'],['glitch','Distorção']]
};
const TABS=[
  ['Cabeça',[['cabelo','Cabelo','slot'],['cabeloCor','Cor do cabelo','swatch',CABELO_CORES],['barba','Barba','slot'],['barbaCor','Cor da barba','swatch',CABELO_CORES],['cabeca','Chapéu, elmo e máscara','slot'],['cabecaCor','Cor','swatch',ROUPA_CORES]]],
  ['Roupa',[['roupa','Roupa e armadura','slot'],['roupaCor','Cor da roupa','swatch',ROUPA_CORES],['calca','Calça','slot'],['calcaCor','Cor da calça','swatch',ROUPA_CORES],['calcado','Calçado','slot'],['calcadoCor','Cor do calçado','swatch',ROUPA_CORES]]],
  ['Acessórios',[['acessorios','Acessórios (vários ao mesmo tempo)','slot']]],
  ['Corpo',[['pele','Tom de pele','swatch',PELES]]],
  ['Elemento',[['elemento','Afinidade','elements'],['moldura','Lealdade'],['base','Base no chão'],['acabamento','Acabamento']]],
  ['Cena e efeitos',[['condicao','Condição na cena'],['efeito','Efeito no token']]]
];
function P(o){return Object.assign({barba:'',barbaCor:'original',cabeca:'',cabecaCor:'original',acessorios:[],cabelo:'topete',cabeloCor:'original',roupa:'camisa',roupaCor:'original',calca:'cargo',calcaCor:'original',calcado:'bota',calcadoCor:'original',pele:'original',elemento:'sangue',moldura:'aliado',base:'recorte',acabamento:'cor',condicao:'normal',efeito:'nenhum',semente:7},o);}
const PRESETS=[
  {titulo:'Negociador',sub:'aliado · Sangue',st:P({calcaCor:'#1f1c21',calcadoCor:'#1f1c21'})},
  {titulo:'Ocultista',sub:'aliado · Morte',st:P({elemento:'morte',cabelo:'baguncado',pele:'#e0b08a',roupa:'capa',calcaCor:'#3a3a3d',calcadoCor:'#1f1c21',acabamento:'dessaturado',semente:31})},
  {titulo:'Especialista',sub:'aliado · Conhecimento',st:P({elemento:'conhecimento',cabelo:'rabo',pele:'#f2d3b8',roupa:'jaleco',calca:'social',calcadoCor:'#1f1c21',semente:41})},
  {titulo:'Cavaleiro',sub:'chefe · Sangue',st:P({elemento:'sangue',moldura:'chefe',base:'anel',cabelo:'moicano',pele:'#b9805a',roupa:'placas',semente:51})},
  {titulo:'Cultista',sub:'inimigo · Energia',st:P({elemento:'energia',moldura:'inimigo',base:'anel',cabelo:'raspado',pele:'#bdb8b4',roupa:'batina',roupaCor:'#2b3a55',efeito:'nevoa',semente:61})},
  {titulo:'Motoqueira',sub:'aliado · Medo',st:P({elemento:'medo',cabelo:'dreads',pele:'#5e3b27',roupa:'jaqueta',calca:'jeans',semente:71})},
  {titulo:'Investigadora',sub:'aliado · Energia',st:P({elemento:'energia',cabelo:'longo',pele:'#f2d3b8',cabeloCor:'#7a1820',roupa:'moletom',roupaCor:'#2b3a55',calcaCor:'#6b5440',calcadoCor:'#1f1c21',semente:22})},
  {titulo:'Possuído',sub:'inimigo · Morte',st:P({elemento:'morte',moldura:'inimigo',base:'anel',pele:'#bdb8b4',cabelo:'',roupaCor:'#e6e2dc',calcaCor:'#1f1c21',calcadoCor:'#1f1c21',efeito:'rachaduras',acabamento:'noir',semente:55})},
  {titulo:'Manequim',sub:'sem peças',st:P({cabelo:'',roupa:'',calca:'',calcado:'',moldura:'neutro'})}
];
const clone=o=>JSON.parse(JSON.stringify(o));
let st=clone(PRESETS[0].st);

/* ---------- utilidades ---------- */
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hx(h){const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255];}
function mix(a,b,t){const A=hx(a),B=hx(b);return'#'+[0,1,2].map(i=>Math.round(A[i]+(B[i]-A[i])*t).toString(16).padStart(2,'0')).join('');}
function shade(h,amt){return amt<0?mix(h,'#000000',-amt):mix(h,'#ffffff',amt);}
function rgba(h,a){const c=hx(h);return`rgba(${c[0]},${c[1]},${c[2]},${a})`;}
const INK='#141014';
function ink(ctx,w){ctx.lineWidth=w||4;ctx.strokeStyle=INK;ctx.lineJoin='round';ctx.lineCap='round';}
function mk(w,h){const c=DOC.createElement('canvas');c.width=w;c.height=h;return c;}
function tint(src,color){const t=mk(src.width,src.height),x=t.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,t.width,t.height);return t;}
function sigil(ctx,elem,x,y,r,color,lw){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(elem==='sangue'){ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.95,-r*.05,r*.7,r,0,r);ctx.bezierCurveTo(-r*.7,r,-r*.95,-r*.05,0,-r);ctx.moveTo(-r,r*.2);ctx.lineTo(r,r*.2);}
  else if(elem==='morte'){ctx.moveTo(-r*.75,-r);ctx.lineTo(r*.75,-r);ctx.lineTo(-r*.75,r);ctx.lineTo(r*.75,r);ctx.closePath();ctx.moveTo(-r,0);ctx.lineTo(-r*.35,0);ctx.moveTo(r*.35,0);ctx.lineTo(r,0);}
  else if(elem==='conhecimento'){ctx.moveTo(0,-r);ctx.lineTo(r*.92,r*.72);ctx.lineTo(-r*.92,r*.72);ctx.closePath();ctx.moveTo(r*.26,r*.18);ctx.arc(0,r*.18,r*.26,0,TAU);}
  else if(elem==='energia'){for(let i=0;i<6;i++){const a=PI/3*i-PI/2;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.moveTo(-r*.3,-r*.55);ctx.lineTo(r*.18,-r*.05);ctx.lineTo(-r*.18,r*.05);ctx.lineTo(r*.3,r*.55);}
  else{ctx.arc(0,0,r,.35,PI*1.75);ctx.moveTo(r*.55*Math.cos(2.2),r*.55*Math.sin(2.2));ctx.arc(0,0,r*.55,2.2,2.2+PI*1.45);}
  ctx.stroke();ctx.restore();
}

/* ---------- camadas ---------- */
const IMG={},MASK={},PMASK={},DEL={};
function loadOne(src,store,k){return new Promise(res=>{const i=new Image();i.onload=()=>{store[k]=i;res();};i.onerror=res;i.src=src;});}
function loadAll(){const ks=Object.keys(CAMADAS).filter(k=>CAMADAS[k]&&CAMADAS[k].src);
  return Promise.all([...ks.map(k=>loadOne(CAMADAS[k].src,IMG,k)),...ks.filter(k=>CAMADAS[k].m).map(k=>loadOne(CAMADAS[k].m,MASK,k)),...ks.filter(k=>CAMADAS[k].pm).map(k=>loadOne(CAMADAS[k].pm,PMASK,k)),...ks.filter(k=>CAMADAS[k].del).map(k=>loadOne(CAMADAS[k].del,DEL,k))]);}
const cache=new Map();
function maskData(img,w,h){const c=mk(w,h),x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,w,h).data;}
/* sombra: cor × luminância relativa; brilho clareia na proporção da própria cor */
function tintPx(p,i,R,G,B,ref,t){const s=(.299*p[i]+.587*p[i+1]+.114*p[i+2])/ref,Lt=.299*R+.587*G+.114*B,k=Math.min(s,1.2),
  lift=(.12+.3*Lt/255)*Math.min(1,Math.max(0,s-1.2)),f=c=>{const b=c*k;return Math.min(255,b+(255-b)*lift);};
  p[i]+=(f(R)-p[i])*t;p[i+1]+=(f(G)-p[i+1])*t;p[i+2]+=(f(B)-p[i+2])*t;}
/* a máscara m diz o que é tecido; pm diz o que é pele nova da peça */
function recolor(key,color,pele){
  pele=pele||'original';const usaPele=PMASK[key]&&pele!=='original';
  const id=key+'|'+color+'|'+(usaPele?pele:'');if(cache.has(id))return cache.get(id);
  const img=IMG[key],c=mk(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  if(color!=='original'||usaPele){
    const d=x.getImageData(0,0,c.width,c.height),p=d.data;
    const w=MASK[key]?maskData(MASK[key],c.width,c.height):null,pw=usaPele?maskData(PMASK[key],c.width,c.height):null;
    const [R,G,B]=color!=='original'?hx(color):[0,0,0],ref=CAMADAS[key].ref||128;
    const [SR,SG,SB]=usaPele?hx(pele):[0,0,0],sref=CAMADAS.pele.ref||170;
    for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;
      if(pw&&pw[i]>0){tintPx(p,i,SR,SG,SB,sref,pw[i]/255);continue;}
      if(color!=='original'){const t=w?w[i]/255:1;if(t>0)tintPx(p,i,R,G,B,ref,t);}}
    x.putImageData(d,0,0);
  }
  cache.set(id,c);return c;
}
function peca(cat,id){return PECAS[cat].find(p=>p.id===id&&p.camada);}
function drawLayer(ctx,key,color,pele){const L=CAMADAS[key];if(!IMG[key])return;ctx.drawImage(color?recolor(key,color,pele):IMG[key],L.x,L.y);}
/* cabelo de trás (mechas atrás do ombro) some por baixo de moletom e capa; a frente fica normal */
const trasCache=new Map();
function cabeloSemTras(key,color,pele,info){
  const id=[key,color,pele,info.roupa].join('|');if(trasCache.has(id))return trasCache.get(id);
  const W2=CAMADAS.W,H2=CAMADAS.H-TOP,L=CAMADAS[key],RL=CAMADAS[info.roupa];
  const h=mk(W2,H2),x=h.getContext('2d');x.translate(0,-TOP);x.drawImage(recolor(key,color||'original',pele),L.x,L.y);
  const m=mk(W2,H2),y=m.getContext('2d');y.translate(0,-TOP);
  y.beginPath();info.pts.forEach(([a,b],i)=>y[i?'lineTo':'moveTo'](a,b));y.closePath();y.fillStyle='#000';y.fill();
  y.globalCompositeOperation='destination-in';y.drawImage(IMG[info.roupa],RL.x,RL.y);
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-out';x.drawImage(m,0,0);
  trasCache.set(id,h);return h;
}
function drawFigure(ctx,s){
  drawLayer(ctx,'corpo');
  if(s.pele!=='original')drawLayer(ctx,'pele',s.pele);
  const pilha=[],coberto=new Set();
  for(const cat in PECAS)if(!MULTI.has(cat)){const p=peca(cat,s[cat]);if(p&&p.cobre)p.cobre.forEach(c=>coberto.add(c));}
  const rp=coberto.has('roupa')?null:peca('roupa',s.roupa);
  for(const cat in PECAS){if(coberto.has(cat))continue;
    const ids=MULTI.has(cat)?(s[cat]||[]):[s[cat]];
    for(const id of ids){const p=peca(cat,id);if(p)pilha.push({z:p.z||CAT_Z[cat],camada:p.camada,cor:MULTI.has(cat)?'original':(s[cat+'Cor']||'original'),
      tras:p.tras&&rp&&rp.cobreTras?{roupa:rp.camada,pts:p.tras}:null});}
  }
  pilha.sort((a,b)=>a.z-b.z);
  for(const p of pilha){const D=DEL[p.camada];if(D){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(D,CAMADAS[p.camada].dx,CAMADAS[p.camada].dy);ctx.restore();}}
  pilha.forEach(p=>p.tras&&IMG[p.camada]&&IMG[p.tras.roupa]?ctx.drawImage(cabeloSemTras(p.camada,p.cor,s.pele,p.tras),0,TOP):drawLayer(ctx,p.camada,p.cor,s.pele));
}

/* ---------- composição do token ---------- */
function figureEffects(fc,s,el,k){
  const ctx=fc.getContext('2d'),rnd=rng((s.semente||1)*13+5);
  ctx.save();ctx.globalCompositeOperation='source-atop';ctx.setTransform(k*FW/400,0,0,k,FX*k,FY*k);
  if(s.efeito==='respingos'){ctx.fillStyle=rgba(el.cor,.92);for(let i=0;i<34;i++){const x=40+rnd()*320,y=260+rnd()*460,sz=2+rnd()*8;ctx.beginPath();ctx.arc(x,y,sz,0,TAU);ctx.fill();if(rnd()<.4){ctx.beginPath();ctx.moveTo(x-sz*.4,y);ctx.lineTo(x,y+sz*3+rnd()*14);ctx.lineTo(x+sz*.4,y);ctx.fill();}}}
  if(s.efeito==='rachaduras'){ctx.shadowColor=el.brilho;ctx.shadowBlur=10;ctx.strokeStyle=el.brilho;ctx.lineWidth=2.6;ctx.lineCap='round';
    for(const[ox,oy]of[[170,150],[250,400],[120,480],[230,640]]){for(let b=0;b<4;b++){let x=ox,y=oy,a=rnd()*TAU;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<6;j++){a+=(rnd()-.5)*1.1;x+=Math.cos(a)*16;y+=Math.sin(a)*16;ctx.lineTo(x,y);}ctx.stroke();}}ctx.shadowBlur=0;}
  if(s.efeito==='vhs'){ctx.fillStyle='rgba(0,0,0,.18)';for(let y=0;y<800;y+=5)ctx.fillRect(0,y,400,2);ctx.fillStyle='rgba(255,255,255,.12)';for(let i=0;i<700;i++)ctx.fillRect(rnd()*400,rnd()*800,1.6,1.6);}
  if(s.condicao==='machucado'||s.condicao==='morrendo'){ctx.fillStyle='rgba(140,10,22,.85)';for(const[x,y,r]of[[250,380,26],[140,470,18],[250,600,14],[230,180,10]]){ctx.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,rr=r*(.7+rnd()*.5);ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();}}
  if(s.condicao==='enlouquecendo'){ctx.fillStyle='rgba(122,60,255,.22)';ctx.fillRect(0,0,400,800);}
  ctx.restore();
  if(s.efeito==='glitch'||s.condicao==='enlouquecendo'){const w=fc.width;ctx.save();ctx.setTransform(1,0,0,1,0,0);for(let i=0;i<10;i++){const y=Math.floor(rnd()*fc.height*.9),h=Math.floor((4+rnd()*20)*k),off=Math.round((rnd()-.5)*36*k);ctx.drawImage(fc,0,y,w,h,off,y,w,h);}ctx.restore();}
  const sat=s.condicao==='morrendo'?1:s.acabamento==='noir'?.92:s.acabamento==='dessaturado'?.6:0;
  if(sat){const t=mk(fc.width,fc.height),x=t.getContext('2d');x.drawImage(fc,0,0);x.globalCompositeOperation='saturation';x.globalAlpha=sat;x.fillStyle='#808080';x.fillRect(0,0,t.width,t.height);x.globalAlpha=1;
    if(s.acabamento==='noir'){x.globalCompositeOperation='multiply';x.fillStyle='#d9d4cf';x.fillRect(0,0,t.width,t.height);}
    x.globalCompositeOperation='destination-in';x.drawImage(fc,0,0);ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,fc.width,fc.height);ctx.drawImage(t,0,0);}
}
function drawGround(ctx,s,el){
  if(s.base!=='anel')return;
  const cx=W/2,cy=FY+FH-22,rx=138,ry=46;
  ctx.save();
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,TAU);ctx.fillStyle=rgba(el.cor,.2);ctx.fill();
  if(s.moldura==='chefe'){for(let i=0;i<20;i++){const a=i/20*TAU,w=.1;ctx.beginPath();ctx.moveTo(cx+Math.cos(a-w)*rx,cy+Math.sin(a-w)*ry);ctx.lineTo(cx+Math.cos(a)*(rx+18),cy+Math.sin(a)*(ry+9));ctx.lineTo(cx+Math.cos(a+w)*rx,cy+Math.sin(a+w)*ry);ctx.closePath();ctx.fillStyle=i%2?shade(el.cor,-.3):'#e0b23c';ctx.fill();ink(ctx,2.4);ctx.stroke();}}
  ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,TAU);ctx.lineWidth=11;ctx.strokeStyle=INK;ctx.stroke();ctx.lineWidth=6;ctx.strokeStyle=el.cor;ctx.stroke();
  if(s.moldura==='aliado'){ctx.beginPath();ctx.ellipse(cx,cy,rx+12,ry+8,0,0,TAU);ctx.lineWidth=4;ctx.strokeStyle='#4fc3a1';ctx.stroke();}
  if(s.moldura==='inimigo'){ctx.fillStyle=INK;for(let i=0;i<30;i++){const a=i/30*TAU,w=.07;ctx.beginPath();ctx.moveTo(cx+Math.cos(a-w)*(rx-4),cy+Math.sin(a-w)*(ry-3));ctx.lineTo(cx+Math.cos(a)*(rx-20),cy+Math.sin(a)*(ry-10));ctx.lineTo(cx+Math.cos(a+w)*(rx-4),cy+Math.sin(a+w)*(ry-3));ctx.fill();}}
  ctx.beginPath();ctx.arc(cx,cy+ry,18,0,TAU);ctx.fillStyle=el.escuro;ctx.fill();ink(ctx,4);ctx.stroke();
  ctx.shadowColor=el.brilho;ctx.shadowBlur=8;sigil(ctx,s.elemento,cx,cy+ry,9,el.brilho,2.6);
  ctx.restore();
}
function render(cv,s){
  const k=cv.width/W,el=EL[s.elemento]||EL.sangue;
  const fc=mk(cv.width,cv.height),f=fc.getContext('2d');
  f.imageSmoothingQuality='high';f.setTransform(k*FS,0,0,k*FS,FX*k,FY0*k);drawFigure(f,s);
  figureEffects(fc,s,el,k);
  const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(k,0,0,k,0,0);drawGround(ctx,s,el);ctx.setTransform(1,0,0,1,0,0);
  if(s.efeito==='aura'){const t=tint(fc,el.brilho);ctx.save();ctx.filter='blur('+(10*k)+'px)';ctx.drawImage(t,0,0);ctx.drawImage(t,0,0);ctx.restore();}
  const sh=tint(fc,'rgba(30,24,30,.42)');ctx.save();ctx.filter='blur('+(2.5*k)+'px)';ctx.drawImage(sh,-16*k,9*k);ctx.restore();
  const wt=tint(fc,'#ffffff');for(let i=0;i<12;i++){const a=i/12*TAU;ctx.drawImage(wt,Math.cos(a)*2.5*k,Math.sin(a)*2.5*k);}
  ctx.drawImage(fc,0,0);
  if(s.efeito==='nevoa'){const rnd=rng(s.semente*9);for(let i=0;i<9;i++){const x=(70+rnd()*300)*k,y=(FY+FH-120+rnd()*110)*k,r=(50+rnd()*60)*k;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(el.brilho,.32));g.addColorStop(1,rgba(el.brilho,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}}
  if(s.condicao==='morrendo'){ctx.save();ctx.globalCompositeOperation='destination-over';ctx.setTransform(k,0,0,k,0,0);ctx.beginPath();ctx.ellipse(W/2+10,FY+FH-14,110,28,0,0,TAU);ctx.fillStyle='rgba(120,8,18,.85)';ctx.fill();ctx.restore();}
}
/* retrato quadrado (cabeça e ombros) e token redondo para o grid */
const BUST={x:70,y:0,s:300},BUST_FOLGA=52;
/* enquadramento do retrato: cabeça e ombros; se o cabelo sobe demais (moicano), afasta só o necessário para caber no círculo */
function bustBox(full,k){
  const d=full.getContext('2d').getImageData(0,0,full.width,Math.round(BUST.s*k)).data,w=full.width;let ty=BUST.s;
  for(let y=0;y<BUST.s*k&&ty===BUST.s;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>40){ty=y/k;break;}
  if(ty>=BUST_FOLGA)return BUST;
  const y=ty-BUST_FOLGA,s=BUST.s-y;return {x:W/2-s/2,y,s};
}
function portraitCanvas(s,size){
  const full=mk(880,1720);render(full,Object.assign({},s,{base:'recorte',efeito:s.efeito==='nevoa'?'nenhum':s.efeito}));
  const c=mk(size,size),x=c.getContext('2d'),k=2;
  x.fillStyle=(EL[s.elemento]||EL.sangue).escuro;x.fillRect(0,0,size,size);
  const g=x.createRadialGradient(size/2,size*.35,size*.05,size/2,size/2,size*.75);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,size,size);
  const B=bustBox(full,k),sc=size/(B.s*k);x.drawImage(full,-B.x*k*sc,-B.y*k*sc,full.width*sc,full.height*sc);return c;
}
const FRAME={aliado:'#4fc3a1',inimigo:'#e2363f',chefe:'#e0b23c',neutro:'#a3979a'};
function tokenCanvas(s,size){
  const p=portraitCanvas(s,size),c=mk(size,size),x=c.getContext('2d'),r=size/2,el=EL[s.elemento]||EL.sangue;
  x.save();x.beginPath();x.arc(r,r,r-8,0,TAU);x.clip();x.drawImage(p,0,0);x.restore();
  x.beginPath();x.arc(r,r,r-8,0,TAU);x.lineWidth=10;x.strokeStyle=INK;x.stroke();
  x.lineWidth=6;x.strokeStyle=FRAME[s.moldura]||el.cor;x.stroke();
  x.beginPath();x.arc(r,r,r-15,0,TAU);x.lineWidth=2;x.strokeStyle=el.cor;x.stroke();
  return c;
}

/* ---------- integração com as fichas ---------- */
function api(){return root.MastermindCharacters;}
function selectedId(){return api()?.selectedId?.()||null;}
function selectedRecord(){return api()?.selected?.()||null;}
function message(text,error){const s=$('status');if(!s)return;s.textContent=text;s.classList.toggle('ma99-error',!!error);}
function safeName(){return(selectedRecord()?.character?.name||selectedRecord()?.name||'personagem').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_-]/g,'-').slice(0,50);}
function validRecipe(r){
  if(!r||typeof r!=='object')return null;const out=P({});
  for(const k of Object.keys(out)){if(!(k in r))continue;
    if(k==='acessorios'){out[k]=Array.isArray(r[k])?r[k].filter(id=>PECAS.acessorios.some(p=>p.id===id)):[];continue;}
    if(k==='semente'){out[k]=Number(r[k])>0?Math.floor(Number(r[k])):7;continue;}
    if(PECAS[k]){out[k]=r[k]===''||PECAS[k].some(p=>p.id===r[k])?r[k]:out[k];continue;}
    if(OPC[k]){out[k]=OPC[k].some(o=>o[0]===r[k])?r[k]:out[k];continue;}
    out[k]=r[k]==='original'||/^#[0-9a-f]{6}$/i.test(r[k])?r[k]:out[k];}
  return out;
}
function save(){
  const id=selectedId();
  if(!id||!api()?.update){message('Crie ou selecione uma ficha no Mastermind primeiro.',true);return;}
  const photo=portraitCanvas(st,512).toDataURL('image/png'),tokenImage=tokenCanvas(st,256).toDataURL('image/png');
  if(photo.length>1800000||tokenImage.length>1200000){message('A imagem ultrapassa o tamanho permitido na ficha.',true);return;}
  const patch={photo,tokenImage,portraitEditor:{source:'mastermind-atelie-camadas',version:99,recipe:clone(st)}};
  if(!api().update(id,patch)){message('Falha ao atualizar esta ficha. Confira o espaço de armazenamento.',true);return;}
  DOC.dispatchEvent(new CustomEvent('mastermind:portrait-updated',{detail:{characterId:id}}));
  message('Retrato e token salvos na ficha selecionada.');
}
function exportPng(which){
  const cv=which==='token'?tokenCanvas(st,512):which==='retrato'?portraitCanvas(st,512):(()=>{const c=mk(880,1720);render(c,st);return c;})();
  const raw=cv.toDataURL('image/png'),name='mastermind-'+which+'-'+safeName()+'.png';
  if(root.RpgSheetPdfBridge?.savePng){root.RpgSheetPdfBridge.savePng(name,raw.split(',')[1]);message('Escolha onde salvar '+name+'.');return;}
  const a=DOC.createElement('a');a.href=raw;a.download=name;DOC.body.appendChild(a);a.click();a.remove();
  message('Exportação iniciada: '+name);
}
let characterId;
function syncCharacter(){
  const id=selectedId();if(id===characterId)return;characterId=id;
  const r=selectedRecord(),name=$('character');
  if(name)name.textContent=r?.character?.name||r?.name||'Selecione uma ficha';
  // Só restaura a receita salva por este Ateliê; nunca troca imagens de outros editores.
  const ed=r?.character?.portraitEditor;
  if(ed?.source==='mastermind-atelie-camadas'){const rec=validRecipe(ed.recipe);if(rec){st=rec;if(ready){update();buildPanel();}}}
}

/* ---------- interface ---------- */
let tab=0,ready=false;
function label(key,val){if(MULTI.has(key)){const n=(val||[]).length;return n?n+' em uso':'nenhum';}if(PECAS[key]){const p=PECAS[key].find(x=>x.id===val);return p?p.nome:'Nenhum';}const o=OPC[key];if(!o)return'';const f=o.find(x=>x[0]===val);return f?f[1]:val;}
function chips(){
  const box=$('chips');if(!box)return;const el=EL[st.elemento];box.textContent='';
  const add=(t,c)=>{const s=DOC.createElement('span');s.className='ma99-chip '+c;s.textContent=t;box.appendChild(s);};
  add(el.nome,'ma99-el');add(label('moldura',st.moldura),'ma99-st-'+st.moldura);
  if(st.condicao!=='normal')add(label('condicao',st.condicao),'ma99-st-inimigo');
  const glow=el.brilho;host.style.setProperty('--ma99-el',el.cor==='#dcd8e4'?'#8f8a99':el.cor);host.style.setProperty('--ma99-glow',glow);
}
function update(){render($('token'),st);chips();}
function thumb(key,color){const img=recolor(key,color||'original'),c=mk(144,144),x=c.getContext('2d');
  const s=Math.min(128/img.width,128/img.height);x.drawImage(img,(144-img.width*s)/2,(144-img.height*s)/2,img.width*s,img.height*s);return c;}
function buildStagebar(){
  const bar=$('stagebar');
  for(const[v,l]of[['claro','Papel'],['escuro','Escuro'],['mapa','Mapa']]){const b=DOC.createElement('button');b.type='button';b.id='ma99-fundo-'+v;b.textContent=l;b.setAttribute('aria-pressed',v==='claro');
    b.onclick=()=>{$('stage').className='ma99-stage ma99-'+v;bar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));};bar.appendChild(b);}
}
function buildTabs(){
  const t=$('tabs');t.textContent='';
  TABS.forEach(([name],i)=>{const b=DOC.createElement('button');b.type='button';b.className='ma99-tab';b.id='ma99-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-selected',i===tab);b.textContent=name;b.onclick=()=>{tab=i;buildTabs();buildPanel();};t.appendChild(b);});
}
function buildPanel(){
  const p=$('panel');p.textContent='';
  const vazio=k=>PECAS[k]&&!PECAS[k].some(pc=>pc.camada);
  for(const[key,title,kind,list]of TABS[tab][1]){
    if(vazio(key)||(kind==='swatch'&&vazio(key.replace(/Cor$/,''))))continue; // grupo sem peças pintadas ainda
    const g=DOC.createElement('div');g.className='ma99-group';
    const gl=DOC.createElement('div');gl.className='ma99-gl';const gt=DOC.createElement('span'),gv=DOC.createElement('em');gt.textContent=title;gl.append(gt,gv);g.appendChild(gl);
    if(kind==='slot'){
      const w=DOC.createElement('div');w.className='ma99-slots';
      const multi=MULTI.has(key),on=id=>multi?(st[key]||[]).includes(id):st[key]===id;
      const none=DOC.createElement('button');none.type='button';none.className='ma99-slot';none.id='ma99-'+key+'-nenhum';none.setAttribute('aria-pressed',multi?!(st[key]||[]).length:!st[key]);
      none.innerHTML='<span class="ma99-none" aria-hidden="true">∅</span>';none.appendChild(DOC.createTextNode(multi?'Tirar todos':'Nenhum'));
      none.onclick=()=>{st[key]=multi?[]:'';update();buildPanel();};w.appendChild(none);
      for(const pc of PECAS[key]){if(!pc.camada)continue;const b=DOC.createElement('button');b.type='button';b.className='ma99-slot';b.id='ma99-'+key+'-'+pc.id;
        b.setAttribute('aria-pressed',on(pc.id));b.appendChild(thumb(pc.camada,multi?'original':st[key+'Cor']));b.appendChild(DOC.createTextNode(pc.nome));
        b.onclick=()=>{if(multi){const s=new Set(st[key]||[]);s.has(pc.id)?s.delete(pc.id):s.add(pc.id);st[key]=[...s];}else st[key]=pc.id;update();buildPanel();};
        w.appendChild(b);}
      g.appendChild(w);gv.textContent=label(key,st[key]);
    }else if(kind==='swatch'){
      const w=DOC.createElement('div');w.className='ma99-swatches';
      list.forEach((c,i)=>{const b=DOC.createElement('button');b.type='button';b.className='ma99-sw'+(c==='original'?' ma99-orig':'');b.id='ma99-'+key+'-'+i;if(c!=='original')b.style.background=c;
        b.setAttribute('aria-label',c==='original'?title+': cor original':title+' '+i);b.title=c==='original'?'Cor original da pintura':c;b.setAttribute('aria-pressed',st[key]===c);b.onclick=()=>{st[key]=c;update();buildPanel();};w.appendChild(b);});
      g.appendChild(w);gv.textContent=st[key]==='original'?'original':'';
    }else{
      const w=DOC.createElement('div');w.className='ma99-seg';
      for(const[v,l]of OPC[key]){const b=DOC.createElement('button');b.type='button';b.id='ma99-'+key+'-'+v;b.setAttribute('aria-pressed',st[key]===v);
        if(kind==='elements'){const i=DOC.createElement('i');i.style.background=EL[v].cor;b.appendChild(i);}
        b.appendChild(DOC.createTextNode(l));b.onclick=()=>{st[key]=v;update();buildPanel();};w.appendChild(b);}
      g.appendChild(w);gv.textContent=label(key,st[key]);
    }
    p.appendChild(g);
  }
  const hints={'Cabeça':'Toque numa peça para vestir e em Nenhum para tirar. O círculo colorido volta à cor em que a peça foi pintada.','Roupa':'Camisa e camiseta ficam por dentro da calça; casacos, mantos e armaduras ficam por cima. Moletom e capa escondem o cabelo de trás.','Acessórios':'Acessórios somam: toque para pôr ou tirar cada um.','Elemento':'A cor do elemento passa para a base no chão, para a borda do token e para os efeitos.'};
  const h=hints[TABS[tab][0]];if(h){const e=DOC.createElement('p');e.className='ma99-hint';e.textContent=h;p.appendChild(e);}
}
function buildPresets(){
  const box=$('presets');box.textContent='';
  PRESETS.forEach((pr,i)=>{const b=DOC.createElement('button');b.type='button';b.className='ma99-preset';b.id='ma99-preset-'+i;const cv=mk(220,430);
    const t=DOC.createElement('b');t.textContent=pr.titulo;const sub=DOC.createElement('small');sub.textContent=pr.sub;
    b.append(cv,t,sub);b.onclick=()=>{st=clone(pr.st);update();buildPanel();host.scrollIntoView?.({block:'start',behavior:'smooth'});};
    box.appendChild(b);render(cv,pr.st);});
}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
host.addEventListener('click',e=>{
  const action=e.target.closest('[data-ma99-action]')?.dataset.ma99Action;if(!action)return;
  if(action==='save')save();
  else if(action==='random'){st.pele=pick(PELES);st.cabeloCor=pick(CABELO_CORES);st.roupaCor=pick(ROUPA_CORES);st.calcaCor=pick(ROUPA_CORES);st.calcadoCor=pick(ROUPA_CORES);st.elemento=pick(Object.keys(EL));st.semente=1+Math.floor(Math.random()*9999);update();buildPanel();}
  else if(action==='sheet'){api()?.open?.(selectedId())||root.RPG_DEMO?.navigate?.('sheet');}
  else if(action.startsWith('export-'))exportPng(action.slice(7));
});
DOC.addEventListener('rpg:character-selected',syncCharacter);
DOC.getElementById('rpg05-char-select')?.addEventListener('change',()=>root.setTimeout(syncCharacter,0));
DOC.addEventListener('visibilitychange',()=>{if(!DOC.hidden)syncCharacter();});
buildStagebar();buildTabs();syncCharacter();
const started=loadAll().then(()=>{ready=true;buildPanel();update();buildPresets();host.classList.add('ma99-ready');});
root.MastermindAtelier99={render,drawFigure,tokenCanvas,portraitCanvas,save,syncCharacter,validRecipe,PECAS,state:()=>st,set:s=>{st=validRecipe(s)||st;if(ready){update();buildPanel();}},ready:()=>started};
})(typeof window!=='undefined'?window:globalThis);
