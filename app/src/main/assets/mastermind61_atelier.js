/* Mastermind v0.61 — Ateliê do personagem.
 * Monta o agente peça por peça (rosto, cabelo, barba, roupa, calça, calçado e pele)
 * com as camadas pintadas de mastermind61_atelier_layers.js, e devolve:
 *   photo  — retrato 420×420 em JPEG (mesmo formato do "Escolher retrato")
 *   atelie — a receita das peças, para reabrir e editar depois.
 * Funciona no app Android (ficha de Ordem e de GURPS) e no navegador dos jogadores da mesa LAN.
 * As camadas só são carregadas quando o ateliê é aberto pela primeira vez. */
(function(){
'use strict';
if(window.MastermindAtelier)return;

const PALETAS={
  pele:['original','#f2d3b8','#e0b08a','#b9805a','#8a5a3c','#5e3b27','#bdb8b4'],
  cabelo:['original','#1d1719','#3a2a22','#6b4528','#b07a3a','#dcc28c','#a9a4a1','#7a1820','#2c3d6b'],
  roupa:['original','#1f1c21','#3a3a3d','#e6e2dc','#5a1d24','#3b4030','#2b3a55','#6b5440','#7a6a9a']
};
/* Catálogo: só aparecem as peças cuja camada existe no arquivo de camadas. */
const CATALOGO={
  rosto:[{id:'',nome:'Padrão'},{id:'redondo',nome:'Redondo',camada:'rosto-redondo',z:32},{id:'quadrado',nome:'Mandíbula forte',camada:'rosto-quadrado'},
    {id:'fino',nome:'Fino',camada:'rosto-fino'},{id:'delicado',nome:'Delicado',camada:'rosto-delicado'},{id:'marcante',nome:'Feminino marcante',camada:'rosto-marcante'},
    {id:'idoso',nome:'Envelhecido',camada:'rosto-idoso'},{id:'jovem',nome:'Jovem',camada:'rosto-jovem'},{id:'elfo',nome:'Élfico',camada:'rosto-elfo'}],
  cabelo:[{id:'topete',nome:'Penteado para trás',camada:'cabelo'},{id:'baguncado',nome:'Bagunçado',camada:'cabelo-baguncado'},
    {id:'longo',nome:'Longo liso',camada:'cabelo-longo',tras:[[380,250],[560,250],[560,1360],[380,1360]]},{id:'rabo',nome:'Rabo de cavalo',camada:'cabelo-rabo'},
    {id:'cacheado',nome:'Cacheado',camada:'cabelo-cacheado'},{id:'raspado',nome:'Raspado',camada:'cabelo-raspado'},{id:'coque',nome:'Coque',camada:'cabelo-coque'},
    {id:'moicano',nome:'Moicano',camada:'cabelo-moicano'},{id:'loiro',nome:'Curto ondulado',camada:'cabelo-loiro'},{id:'chanel',nome:'Chanel com franja',camada:'cabelo-chanel'},
    {id:'dreads',nome:'Dreads',camada:'cabelo-dreads'},{id:'ondulado',nome:'Longo ondulado',camada:'cabelo-ondulado'},{id:'trancas',nome:'Tranças',camada:'cabelo-trancas'},
    {id:'rabo-alto',nome:'Rabo alto com franja',camada:'cabelo-rabo-alto'},{id:'pixie',nome:'Pixie',camada:'cabelo-pixie'},{id:'coque-alto',nome:'Coque de bailarina',camada:'cabelo-coque-alto'},
    {id:'chiquinha',nome:'Maria-chiquinha',camada:'cabelo-chiquinha'},{id:'afro',nome:'Black power',camada:'cabelo-afro'},{id:'cachos-longos',nome:'Cachos longos',camada:'cabelo-cachos-longos'},
    {id:'lateral',nome:'Raspado de lado',camada:'cabelo-lateral'}],
  barba:[{id:'cheia',nome:'Barba cheia',camada:'barba-cheia'}],
  roupa:[{id:'camisa',nome:'Camisa social',camada:'camisa',z:15},{id:'camiseta',nome:'Camiseta',camada:'roupa-camiseta',z:15},{id:'terno',nome:'Terno e gravata',camada:'roupa-terno'},
    {id:'jaleco',nome:'Jaleco',camada:'roupa-jaleco'},{id:'capa',nome:'Capa',camada:'roupa-capa',cobreTras:true},{id:'sobretudo',nome:'Sobretudo',camada:'roupa-sobretudo'},
    {id:'moletom',nome:'Moletom',camada:'roupa-moletom',cobreTras:true},{id:'jaqueta',nome:'Jaqueta de couro',camada:'roupa-jaqueta'},{id:'colete',nome:'Colete tático',camada:'roupa-colete'},
    {id:'kimono',nome:'Gi de luta',camada:'roupa-kimono'},{id:'batina',nome:'Manto de culto',camada:'roupa-batina'},
    {id:'placas',nome:'Armadura de placas',camada:'armadura-placas',cobre:['calca']},{id:'couro',nome:'Armadura de couro',camada:'armadura-couro',cobre:['calca','calcado']}],
  calca:[{id:'cargo',nome:'Calça cargo',camada:'calca'},{id:'social',nome:'Calça social',camada:'calca-social'},{id:'jeans',nome:'Jeans',camada:'calca-jeans'}],
  calcado:[{id:'bota',nome:'Bota de couro',camada:'bota'}]
};
const CAT_Z={rosto:5,calcado:10,calca:20,roupa:30,barba:35,cabelo:40};
const ORDEM=['rosto','calcado','calca','roupa','barba','cabelo'];
const PADRAO={v:1,rosto:'',cabelo:'topete',cabeloCor:'original',barba:'',barbaCor:'original',roupa:'camisa',roupaCor:'original',calca:'cargo',calcaCor:'original',calcado:'bota',calcadoCor:'original',pele:'original'};
const HEX=/^#[0-9a-f]{6}$/i;

/* Receita sempre limpa: só ids conhecidos e cores das paletas. */
function receita(input){
  const r={...PADRAO};const src=input&&typeof input==='object'?input:{};
  for(const cat of ORDEM){if(typeof src[cat]==='string'&&(src[cat]===''||CATALOGO[cat].some(p=>p.id===src[cat])))r[cat]=src[cat];}
  const cor=(k,pal)=>{if(typeof src[k]==='string'&&(src[k]==='original'||(HEX.test(src[k])&&pal.includes(src[k].toLowerCase()))))r[k]=src[k].toLowerCase();};
  cor('cabeloCor',PALETAS.cabelo);cor('barbaCor',PALETAS.cabelo);cor('roupaCor',PALETAS.roupa);cor('calcaCor',PALETAS.roupa);cor('calcadoCor',PALETAS.roupa);cor('pele',PALETAS.pele);
  return r;
}

/* ---------- motor de camadas ---------- */
let C=null,TOP=0,carregando=null;const IMG={},MASK={},PMASK={},DEL={};
const cache=new Map(),pontaCache=new Map();
function scriptBase(){
  const s=document.querySelector('script[src*="mastermind61_atelier.js"],script[src$="/atelier.js"]');
  if(!s)return {layers:'mastermind61_atelier_layers.js'};
  return {layers:/\/atelier\.js(\?|$)/.test(s.getAttribute('src'))?'/atelier-layers.js':s.src.replace(/mastermind61_atelier\.js.*$/,'mastermind61_atelier_layers.js')};
}
function carregarScript(url){return new Promise((ok,erro)=>{const s=document.createElement('script');s.src=url;s.onload=ok;s.onerror=()=>erro(Error('Não foi possível carregar as peças do Ateliê.'));document.head.appendChild(s);});}
function carregarImg(src,store,k){return new Promise(res=>{const i=new Image();i.onload=()=>{store[k]=i;res();};i.onerror=res;i.src=src;});}
function carregar(){
  if(carregando)return carregando;
  carregando=(window.MM61_CAMADAS?Promise.resolve():carregarScript(scriptBase().layers)).then(()=>{
    C=window.MM61_CAMADAS;if(!C||!C.W)throw Error('Camadas do Ateliê ausentes.');
    TOP=Math.min(0,...Object.values(C).filter(v=>v&&typeof v==='object').flatMap(v=>[v.y,v.dy].filter(n=>typeof n==='number')));
    for(const cat in CATALOGO)CATALOGO[cat]=CATALOGO[cat].filter(p=>!p.camada||C[p.camada]);
    const ks=Object.keys(C).filter(k=>C[k]&&C[k].src);
    return Promise.all([...ks.map(k=>carregarImg(C[k].src,IMG,k)),...ks.filter(k=>C[k].m).map(k=>carregarImg(C[k].m,MASK,k)),
      ...ks.filter(k=>C[k].pm).map(k=>carregarImg(C[k].pm,PMASK,k)),...ks.filter(k=>C[k].del).map(k=>carregarImg(C[k].del,DEL,k))]);
  });
  carregando.catch(()=>{carregando=null;});
  return carregando;
}
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function hx(h){const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255];}
function maskData(img,w,h){const c=mk(w,h),x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,w,h).data;}
/* sombra: cor × luminância relativa; brilho: clareia na proporção da própria cor */
function tintPx(p,i,R,G,B,ref,t){const s=(.299*p[i]+.587*p[i+1]+.114*p[i+2])/ref,Lt=.299*R+.587*G+.114*B,k=Math.min(s,1.2),
  lift=(.12+.3*Lt/255)*Math.min(1,Math.max(0,s-1.2)),f=c=>{const b=c*k;return Math.min(255,b+(255-b)*lift);};
  p[i]+=(f(R)-p[i])*t;p[i+1]+=(f(G)-p[i+1])*t;p[i+2]+=(f(B)-p[i+2])*t;}
/* a máscara m diz o que é tecido/cabelo; pm diz o que é pele pintada junto com a peça */
function recolor(key,color,pele){
  pele=pele||'original';const usaPele=PMASK[key]&&pele!=='original';
  const id=key+'|'+color+'|'+(usaPele?pele:'');if(cache.has(id))return cache.get(id);
  const img=IMG[key],c=mk(img.width,img.height),x=c.getContext('2d');x.drawImage(img,0,0);
  if(color!=='original'||usaPele){
    const d=x.getImageData(0,0,c.width,c.height),p=d.data;
    const w=MASK[key]?maskData(MASK[key],c.width,c.height):null,pw=usaPele?maskData(PMASK[key],c.width,c.height):null;
    const [R,G,B]=color!=='original'?hx(color):[0,0,0],ref=C[key].ref||128;
    const [SR,SG,SB]=usaPele?hx(pele):[0,0,0],sref=C.pele.ref||170;
    for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;
      if(pw&&pw[i]>0){tintPx(p,i,SR,SG,SB,sref,pw[i]/255);continue;}
      if(color!=='original'){const t=w?w[i]/255:1;if(t>0)tintPx(p,i,R,G,B,ref,t);}}
    x.putImageData(d,0,0);
  }
  cache.set(id,c);return c;
}
function peca(cat,id){return CATALOGO[cat].find(p=>p.id===id&&p.camada);}
function drawLayer(ctx,key,color,pele){const L=C[key];if(!IMG[key])return;ctx.drawImage(color?recolor(key,color,pele):IMG[key],L.x,L.y);}
/* mechas de trás do cabelo longo somem por baixo de moletom e capa */
function cortaPonta(key,color,pele,pt){
  const id=[key,color,pele,pt.roupa].join('|');if(pontaCache.has(id))return pontaCache.get(id);
  const W2=C.W,H2=C.H-TOP,L=C[key],RL=C[pt.roupa];
  const h=mk(W2,H2),x=h.getContext('2d');x.translate(0,-TOP);x.drawImage(recolor(key,color||'original',pele),L.x,L.y);
  const m=mk(W2,H2),y=m.getContext('2d');y.translate(0,-TOP);
  y.beginPath();pt.pts.forEach(([a,b],i)=>y[i?'lineTo':'moveTo'](a,b));y.closePath();y.fillStyle='#000';y.fill();
  y.globalCompositeOperation='destination-in';y.drawImage(IMG[pt.roupa],RL.x,RL.y);
  x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-out';x.drawImage(m,0,0);
  pontaCache.set(id,h);return h;
}
function drawFigure(ctx,s){ // em pixels da camada (C.W × C.H)
  drawLayer(ctx,'corpo');
  if(s.pele!=='original')drawLayer(ctx,'pele',s.pele);
  const pilha=[],coberto=new Set();
  for(const cat of ORDEM){const p=peca(cat,s[cat]);if(p&&p.cobre)p.cobre.forEach(c=>coberto.add(c));}
  const rp=peca('roupa',s.roupa);
  for(const cat of ORDEM){if(coberto.has(cat))continue;const p=peca(cat,s[cat]);if(!p)continue;
    pilha.push({z:p.z||CAT_Z[cat],camada:p.camada,cor:s[cat+'Cor']||'original',ponta:p.tras&&rp&&rp.cobreTras?{roupa:rp.camada,pts:p.tras}:null});}
  pilha.sort((a,b)=>a.z-b.z);
  for(const p of pilha){const D=DEL[p.camada];if(D){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(D,C[p.camada].dx,C[p.camada].dy);ctx.restore();}}
  pilha.forEach(p=>p.ponta&&IMG[p.camada]&&IMG[p.ponta.roupa]?ctx.drawImage(cortaPonta(p.camada,p.cor,s.pele,p.ponta),0,TOP):drawLayer(ctx,p.camada,p.cor,s.pele));
}
/* figura inteira, sem fundo, na escala k (1 = tamanho das camadas) */
function figura(s,k){const fc=mk(Math.round(C.W*k),Math.round((C.H-TOP)*k)),f=fc.getContext('2d');f.imageSmoothingQuality='high';f.setTransform(k,0,0,k,0,-TOP*k);drawFigure(f,s);return fc;}
function silhueta(src,cor){const t=mk(src.width,src.height),x=t.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-in';x.fillStyle=cor;x.fillRect(0,0,t.width,t.height);return t;}
/* prévia de corpo inteiro com contorno branco de figurinha */
function previa(cv,s){
  const k=Math.min(cv.width/C.W,cv.height/(C.H-TOP))*.94,fc=figura(s,k),ctx=cv.getContext('2d');
  const ox=(cv.width-fc.width)/2,oy=(cv.height-fc.height)/2;ctx.clearRect(0,0,cv.width,cv.height);
  const sh=silhueta(fc,'rgba(0,0,0,.35)');ctx.save();ctx.filter='blur(3px)';ctx.drawImage(sh,ox-8,oy+6);ctx.restore();
  const wt=silhueta(fc,'#ffffff');for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ctx.drawImage(wt,ox+Math.cos(a)*2.4,oy+Math.sin(a)*2.4);}
  ctx.drawImage(fc,ox,oy);
}
/* retrato quadrado: cabeça e ombros sobre o mesmo fundo usado pelo retrato importado */
const RECORTE={x:40,y:-60,lado:480};
function retrato(s,lado=420){
  const k=lado/RECORTE.lado,cv=mk(lado,lado),x=cv.getContext('2d');
  x.fillStyle='#15101b';x.fillRect(0,0,lado,lado);
  const g=x.createRadialGradient(lado/2,lado*.42,lado*.05,lado/2,lado*.42,lado*.7);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,lado,lado);
  const fc=mk(lado,lado),f=fc.getContext('2d');f.imageSmoothingQuality='high';f.setTransform(k,0,0,k,-RECORTE.x*k,-RECORTE.y*k);drawFigure(f,s);
  x.drawImage(fc,0,0);return cv;
}
function miniatura(key){ // peça isolada, cor original
  const img=IMG[key];if(!img)return mk(1,1);const c=mk(144,144),x=c.getContext('2d');
  const s=Math.min(128/img.width,128/img.height);x.drawImage(img,(144-img.width*s)/2,(144-img.height*s)/2,img.width*s,img.height*s);return c;
}

/* ---------- interface ---------- */
const ABAS=[
  ['Cabeça',[['cabelo','Cabelo','peca'],['cabeloCor','Cor do cabelo','cor','cabelo'],['barba','Barba','peca'],['barbaCor','Cor da barba','cor','cabelo']]],
  ['Roupa',[['roupa','Roupa e armadura','peca'],['roupaCor','Cor da roupa','cor','roupa'],['calca','Calça','peca'],['calcaCor','Cor da calça','cor','roupa'],['calcado','Calçado','peca'],['calcadoCor','Cor do calçado','cor','roupa']]],
  ['Corpo',[['rosto','Formato do rosto','peca'],['pele','Tom de pele','cor','pele']]]
];
const SEM_NENHUM=new Set(['rosto']);
function esc(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
let aberto=null;
function open(opts){
  opts=opts||{};if(aberto)fechar(false);
  let st=receita(opts.recipe),aba=0;const anterior=document.activeElement;
  const root=document.createElement('div');root.className='mm61-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','mm61-title');
  root.innerHTML='<div class="mm61-box"><header class="mm61-head"><div><small>ATELIÊ DO PERSONAGEM</small><h2 id="mm61-title">'+esc(opts.title||'Monte o visual')+'</h2></div><button type="button" class="mm61-x" data-mm61="cancel" aria-label="Fechar o Ateliê sem salvar">×</button></header>'+
   '<div class="mm61-body"><div class="mm61-stage"><canvas class="mm61-full" width="440" height="860" aria-label="Prévia do personagem de corpo inteiro"></canvas><div class="mm61-thumb"><canvas class="mm61-portrait" width="168" height="168" aria-label="Prévia do retrato"></canvas><span>Retrato da ficha</span></div></div>'+
   '<div class="mm61-bench"><div class="mm61-tabs" role="tablist"></div><div class="mm61-panel" role="tabpanel"><p class="mm61-loading">Carregando peças…</p></div></div></div>'+
   '<footer class="mm61-foot"><button type="button" class="mm61-btn" data-mm61="cancel">Cancelar</button><button type="button" class="mm61-btn mm61-primary" data-mm61="save" disabled>Salvar retrato na ficha</button></footer></div>';
  document.body.appendChild(root);document.documentElement.classList.add('mm61-lock');
  const $=sel=>root.querySelector(sel),full=$('.mm61-full'),mini=$('.mm61-portrait');
  function desenhar(){previa(full,st);const p=retrato(st,mini.width);mini.getContext('2d').drawImage(p,0,0);}
  function abas(){const t=$('.mm61-tabs');t.innerHTML='';ABAS.forEach(([nome],i)=>{const b=document.createElement('button');b.type='button';b.className='mm61-tab';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===aba));b.textContent=nome;b.onclick=()=>{aba=i;abas();painel();const n=root.querySelectorAll('.mm61-tab')[i];n&&n.focus();};t.appendChild(b);});}
  function painel(){
    const p=$('.mm61-panel');p.innerHTML='';
    for(const [key,titulo,tipo,pal] of ABAS[aba][1]){
      const g=document.createElement('div');g.className='mm61-group';
      const h=document.createElement('div');h.className='mm61-gl';h.textContent=titulo;g.appendChild(h);
      if(tipo==='peca'){
        const w=document.createElement('div');w.className='mm61-slots';
        const lista=CATALOGO[key];
        if(!SEM_NENHUM.has(key)){const n=document.createElement('button');n.type='button';n.className='mm61-slot';n.dataset.key=key;n.dataset.val='';n.setAttribute('aria-pressed',String(st[key]===''));n.innerHTML='<span class="mm61-none" aria-hidden="true">∅</span>Nenhum';w.appendChild(n);}
        for(const pc of lista){const b=document.createElement('button');b.type='button';b.className='mm61-slot';b.dataset.key=key;b.dataset.val=pc.id;b.setAttribute('aria-pressed',String(st[key]===pc.id));
          if(pc.camada)b.appendChild(miniatura(pc.camada));else{const s=document.createElement('span');s.className='mm61-none';s.setAttribute('aria-hidden','true');s.textContent='☺';b.appendChild(s);}
          b.appendChild(document.createTextNode(pc.nome));w.appendChild(b);}
        g.appendChild(w);
      }else{
        const w=document.createElement('div');w.className='mm61-swatches';
        PALETAS[pal].forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='mm61-sw'+(c==='original'?' mm61-orig':'');b.dataset.key=key;b.dataset.val=c;if(c!=='original')b.style.background=c;
          b.setAttribute('aria-label',c==='original'?titulo+': cor original da pintura':titulo+' '+(i));b.title=c==='original'?'Cor original da pintura':c;b.setAttribute('aria-pressed',String(st[key]===c));w.appendChild(b);});
        g.appendChild(w);
      }
      p.appendChild(g);
    }
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||!root.contains(b))return;
    if(b.dataset.mm61==='cancel'){fechar(false);return;}
    if(b.dataset.mm61==='save'){fechar(true);return;}
    if(b.dataset.key){st={...st,[b.dataset.key]:b.dataset.val};painel();desenhar();}
  });
  const esc61=e=>{if(e.key==='Escape'&&aberto&&aberto.root===root){e.preventDefault();fechar(false);}};document.addEventListener('keydown',esc61);
  aberto={root,salvar(){
    const photo=retrato(st,420).toDataURL('image/jpeg',.82);
    return {photo,recipe:{...st}};
  },fechou(ok){document.removeEventListener('keydown',esc61);document.documentElement.classList.remove('mm61-lock');root.remove();aberto=null;try{anterior&&anterior.focus&&anterior.focus();}catch{}
    if(ok&&typeof opts.onSave==='function')opts.onSave(this.result);else if(!ok&&typeof opts.onCancel==='function')opts.onCancel();}};
  $('.mm61-x').focus();
  return carregar().then(()=>{if(!aberto||aberto.root!==root)return;st=receita(st);abas();painel();desenhar();$('[data-mm61="save"]').disabled=false;})
    .catch(err=>{if(aberto&&aberto.root===root)$('.mm61-panel').innerHTML='<p class="mm61-loading">'+esc(err.message||'Falha ao abrir o Ateliê.')+'</p>';});
}
function fechar(ok){if(!aberto)return;const a=aberto;if(ok){try{a.result=a.salvar();}catch(e){ok=false;}}a.fechou(ok);}

/* ---------- integrações ---------- */
function avisar(msg){try{(window.RPG_DEMO&&window.RPG_DEMO.notify||window.app&&window.app.notify||(()=>{}))(msg);}catch{}}
/* Ficha de Ordem do app Android: botão ao lado de "Escolher retrato". */
function ligarFichaOrdem(){
  const profile=document.getElementById('r09-profile');if(!profile)return false;
  const injeta=()=>{if(profile.querySelector('.mm61-open'))return;const label=profile.querySelector('.r09-photo-button');if(!label)return;
    const b=document.createElement('button');b.type='button';b.className='r09-photo-button mm61-open';b.textContent='✦ Criar no Ateliê';label.insertAdjacentElement('afterend',b);};
  injeta();new MutationObserver(injeta).observe(profile,{childList:true});
  profile.addEventListener('click',e=>{
    if(!e.target.closest('.mm61-open'))return;
    const api=window.MastermindCharacters,sel=api&&api.selected&&api.selected();
    const alvo=sel&&sel.id,ficha=sel&&sel.character||window.OP13&&window.OP13.state||{};
    open({title:ficha.name||'Agente',recipe:ficha.atelie,onSave(r){
      const patch={photo:r.photo,atelie:r.recipe};
      const ok=alvo&&api.update?api.update(alvo,patch):window.OP13&&window.OP13.changeCharacter({...window.OP13.state,...patch});
      avisar(ok?'Retrato do Ateliê salvo nesta ficha.':'Não foi possível salvar o retrato.');
    }});
  });
  return true;
}
/* Ficha GURPS do app Android: botão no painel "Retrato e dados salvos". */
function ligarFichaGurps(){
  document.addEventListener('click',e=>{
    if(!e.target.closest('.mm61-open-gurps'))return;
    const g=window.RPG16_GURPS,c=g&&g.current;if(!c||!g.setPortrait)return;
    open({title:c.name||'Personagem',recipe:c.atelie,onSave(r){g.setPortrait(r.photo,r.recipe);avisar('Retrato do Ateliê salvo na ficha GURPS.');}});
  });
}
function iniciar(){if(!ligarFichaOrdem()){let n=0;const t=setInterval(()=>{if(ligarFichaOrdem()||++n>40)clearInterval(t);},250);}ligarFichaGurps();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();

window.MastermindAtelier={open,close:()=>fechar(false),receita,load:carregar,
  /* usados pelos testes e pela ficha LAN */
  renderPortrait:(r,lado)=>carregar().then(()=>retrato(receita(r),lado||420).toDataURL('image/jpeg',.82)),
  catalogo:()=>JSON.parse(JSON.stringify(CATALOGO)),paletas:()=>JSON.parse(JSON.stringify(PALETAS))};
})();
