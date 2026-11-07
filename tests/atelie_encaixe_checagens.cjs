'use strict';
/* Checagens de encaixe das peças do Ateliê, medidas em pixels reais dentro do navegador
 * (Chromium do Playwright ou Electron empacotado). Usado por:
 *   tests/mastermind_atelie_encaixe.e2e.cjs   (Chromium, roda em qualquer CI)
 *   desktop/tests/e2e-atelier-camadas.cjs    (Electron empacotado Linux/Windows)
 * A função `checarEncaixe` é serializada e roda na página: não use nada de fora dela.
 */
async function checarEncaixe(){
  const L=window.MastermindAtelierLayers,A=window.MastermindAtelier99;
  if(!L||!A)throw new Error('Ateliê não carregado');
  await A.ready();
  const px=async uri=>{const i=new Image();await new Promise((ok,er)=>{i.onload=ok;i.onerror=()=>er(new Error('imagem inválida'));i.src=uri;});
    const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);
    return{w:i.width,h:i.height,d:x.getImageData(0,0,i.width,i.height).data};};
  const W=L.W,H=L.H,corpo=await px(L.corpo.src),pele=await px(L.pele.src);
  const peleM=j=>corpo.d[j*4+3]>200&&pele.d[j*4+3]>0; // pele do manequim (índice em pixels do manequim)
  const r={rostos:{},erros:[]};
  const falha=t=>r.erros.push(t);
  /* 1) rostos: nada semitransparente e nenhuma fresta sobre a pele do manequim (era por onde o rosto padrão aparecia) */
  for(const k of Object.keys(L).filter(k=>/^rosto-/.test(k))){
    const c=L[k],I=await px(c.src);let semi=0,fresta=0;
    const a=(x,y)=>x>=0&&y>=0&&x<I.w&&y<I.h?I.d[(y*I.w+x)*4+3]:0;
    const op=(x,y)=>a(x,y)>=250;
    const perto=(x,y,dx,dy)=>{for(let t=1;t<=3;t++)if(op(x+dx*t,y+dy*t))return true;return false;};
    for(let y=0;y<I.h;y++)for(let x=0;x<I.w;x++){const X=x+c.x,Y=y+c.y;if(X<0||Y<0||X>=W||Y>=H||!peleM(Y*W+X))continue;
      const al=a(x,y);if(al>0&&al<255)semi++;
      if(al===0){if(perto(x,y,1,0)&&perto(x,y,-1,0))fresta++;if(perto(x,y,0,1)&&perto(x,y,0,-1))fresta++;}}
    r.rostos[k]={semi,fresta};
    if(semi)falha(k+': '+semi+' pixels semitransparentes sobre a pele (rosto padrão aparece por baixo)');
    if(fresta)falha(k+': '+fresta+' frestas transparentes dentro do rosto');
  }
  /* 2) Jovem: a abertura dos olhos é opaca e a esclera é clara (sem o olho do manequim nem manchas de pele) */
  {const c=L['rosto-jovem'],I=await px(c.src);
    const olhos=[[ // mesmos polígonos de ESCLERA em scripts/atelie_corrigir_rostos.py (esclera inteira até a pálpebra de baixo)
      151.5,247,152,242,153,239,154,238,155,237,156,236,157,235,158,234,161,233,164,232.5,170,236,182,236,188.5,246,190.5,251,191.5,255.5,190.5,259.5,187.5,263.2,
      184,264.6,180,265.6,176,266.4,172,266.4,168,265.6,164,264.4,161,263.2,159,263,157,262.2,155,260.2,153,257.8,152,252],[
      245.5,256.5,246,250,247.5,246,249.5,243.5,252,241.5,255,240,258.5,239,268,240,280,240,286,244.5,289,246,292,248.5,294,251,295,254,294.5,256.5,292.5,260.5,
      290.5,262.6,288.5,263.8,286.5,265.6,284,267.6,280,269.6,276,271,270,271.6,264,271.6,260,270.8,258,269.8,255,268.2,253,266.4,250.5,262.4,248,260.2]];
    const iris=[[177,245.5,13.2],[272,249,13.2]]; // IRIS no script
    const naIris=(X,Y,folga)=>iris.some(([cx,cy,r])=>(X+.5-cx)**2+(Y+.5-cy)**2<=(r+folga)**2);
    const dentro=(pts,X,Y)=>{let s=false;for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){const xi=pts[i],yi=pts[i+1],xj=pts[j],yj=pts[j+1];
      if((yi>Y)!==(yj>Y)&&X<(xj-xi)*(Y-yi)/(yj-yi)+xi)s=!s;}return s;};
    let buraco=0,mancha=0,claro=0,total=0;
    for(const pts of olhos)for(let Y=222;Y<275;Y++)for(let X=145;X<305;X++){if(!dentro(pts,X+.5,Y+.5))continue;
      const x=X-c.x,y=Y-c.y,i=(y*I.w+x)*4;total++;if(I.d[i+3]<255){buraco++;continue;}
      const R=I.d[i],G=I.d[i+1],B=I.d[i+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B),lum=.299*R+.587*G+.114*B;
      if(lum>180)claro++;if(mx>0&&(mx-mn)/mx>.25&&lum>90)mancha++;}
    // em volta da abertura (até 6 px fora): nenhum brilho branco (ficava branco até em pele escura)
    const perto=(X,Y)=>{for(const pts of olhos)for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++)if(dentro(pts,X+dx+.5,Y+dy+.5))return true;return false;};
    let brancoFora=0;
    for(let Y=218;Y<278;Y++)for(let X=138;X<310;X++){
      let naBorda=false;for(let dy=-1;dy<=1&&!naBorda;dy++)for(let dx=-1;dx<=1;dx++)if(olhos.some(pts=>dentro(pts,X+dx+.5,Y+dy+.5))){naBorda=true;break;} // 1 px de folga (arredondamento do polígono)
      if(naBorda||!perto(X,Y))continue;
      const x=X-c.x,y=Y-c.y,i=(y*I.w+x)*4;if(I.d[i+3]<200)continue;const R=I.d[i],G=I.d[i+1],B=I.d[i+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B);
      if(.299*R+.587*G+.114*B>160&&(mx-mn)/mx<.2)brancoFora++;}
    if(brancoFora>5)falha('rosto-jovem: '+brancoFora+' pixels brancos em volta dos olhos (deveria ser traço ou pele)');
    // na esclera, fora da íris: nenhum traço cinza solto (o traço ao lado da íris ficava) — o cinza da sombra fica junto do traço escuro
    const lumEm=(X,Y)=>{const x=X-c.x,y=Y-c.y,i=(y*I.w+x)*4;return .299*I.d[i]+.587*I.d[i+1]+.114*I.d[i+2];};
    let cinza=0;
    for(const pts of olhos)for(let Y=228;Y<274;Y++)for(let X=148;X<298;X++){if(!dentro(pts,X+.5,Y+.5)||naIris(X,Y,1.5))continue;
      const l=lumEm(X,Y);if(l<95||l>150)continue;let pertoTinta=false;
      for(let dy=-2;dy<=2&&!pertoTinta;dy++)for(let dx=-2;dx<=2;dx++)if(lumEm(X+dx,Y+dy)<95){pertoTinta=true;break;}
      if(!pertoTinta)cinza++;}
    if(cinza>4)falha('rosto-jovem: '+cinza+' pixels de traço cinza solto na esclera');
    // sob a íris, até a pálpebra de baixo, é esclera clara (era uma faixa rabiscada de nanquim)
    let faixa=[];for(const[X,Y]of[[170,261],[176,263],[181,262],[264,268],[272,269],[279,267]])if(lumEm(X,Y)<185)faixa.push(X+','+Y);
    if(faixa.length)falha('rosto-jovem: faixa escura sob a íris em '+faixa.join(' '));
    // a pálpebra de baixo é uma linha contínua de nanquim logo abaixo da esclera
    let semLinha=[];for(const pts of olhos){const xs=[];for(let i=0;i<pts.length;i+=2)xs.push(pts[i]);const a=Math.ceil(Math.min(...xs))+4,b=Math.floor(Math.max(...xs))-4;
      for(let X=a;X<=b;X+=2){let fundo=-1;for(let Y=275;Y>225;Y--)if(dentro(pts,X+.5,Y+.5)){fundo=Y;break;}if(fundo<0||naIris(X,fundo,0))continue;
        let ok=false;for(let Y=fundo+1;Y<=fundo+3;Y++)if(lumEm(X,Y)<90)ok=true;if(!ok)semLinha.push(X);}}
    if(semLinha.length>2)falha('rosto-jovem: pálpebra de baixo sem traço em x='+semLinha.join(','));
    r.olhosJovem={total,buraco,mancha,claro,brancoFora,cinza,faixa:faixa.length,semLinha:semLinha.length};
    if(buraco)falha('rosto-jovem: '+buraco+' pixels abertos nos olhos');
    if(mancha>12)falha('rosto-jovem: '+mancha+' manchas cor de pele dentro dos olhos');
    if(claro<total*.25)falha('rosto-jovem: esclera escura ('+claro+'/'+total+')');}
  /* 2b) esclera branca neutra em todos os rostos e no manequim (era bege-rosada) */
  r.esclera={};
  for(const k of ['corpo',...Object.keys(L).filter(k=>/^rosto-/.test(k))]){
    const c=L[k],I=await px(c.src),ox=c.x||0,oy=c.y||0;let n=0,sat=0,rb=0;
    const PM=c.pm?await px(c.pm):null; // brilho de pálpebra é pele (pm) e não entra na conta
    const ehPele=(x,y,X,Y)=>PM?PM.d[(y*PM.w+x)*4]>=100:(k==='corpo'&&pele.d[(Y*W+X)*4+3]>0);
    for(let Y=215;Y<290;Y++)for(let X=140;X<320;X++){const x=X-ox,y=Y-oy;if(x<0||y<0||x>=I.w||y>=I.h)continue;const i=(y*I.w+x)*4;if(I.d[i+3]<200)continue;
      const R=I.d[i],G=I.d[i+1],B=I.d[i+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B),lum=.299*R+.587*G+.114*B,s=mx?(mx-mn)/mx:0;
      if(lum>170&&s<.22&&!ehPele(x,y,X,Y)){n++;sat+=s;rb+=R-B;}}
    r.esclera[k]={n,sat:+(sat/Math.max(n,1)).toFixed(3),rb:+(rb/Math.max(n,1)).toFixed(1)};
    if(n<150)falha(k+': esclera não encontrada ('+n+' px)');
    else if(sat/n>.06||rb/n>10)falha(k+': esclera avermelhada (saturação '+(sat/n).toFixed(3)+', R-B '+(rb/n).toFixed(1)+')');
  }
  /* 2c) jaleco: vão entre o corpo e o braço aberto, tecido inteiro atrás da mão (sem buraco) com a mão por cima,
         e perna sem tecido fora da borda */
  {const c=L['roupa-jaleco'],I=await px(c.src);
    const a=(X,Y)=>{const x=X-c.x,y=Y-c.y;return x>=0&&y>=0&&x<I.w&&y<I.h?I.d[(y*I.w+x)*4+3]:0;};
    const conta=(pts)=>pts.filter(([X,Y])=>a(X,Y)>0).length;
    const vao=conta([[430,700],[432,740],[435,780],[438,820],[440,850]]),perna=conta([[302,950],[304,970],[306,990]]);
    let buraco=0,sobreMao=0;
    // mão do manequim = pele ou traço; o branco opaco pintado entre os dedos (e a franja clara do traço) não é mão
    // pele ou traço puro: não leva tecido por cima; branco opaco: leva tecido (vão entre os dedos);
    // o antisserrilhado cinza do traço (meio tinta, meio branco) pode ter ou não
    const tipo=ci=>{const R=corpo.d[ci],G=corpo.d[ci+1],B=corpo.d[ci+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B),l=.299*R+.587*G+.114*B,s=(mx-mn)/Math.max(mx,1);
      return s>=.15||l<40?'mao':l>200&&s<.15?'branco':'meio';};
    let dedos=0;
    for(let Y=900;Y<1000;Y++)for(let X=413;X<458;X++){const ci=(Y*W+X)*4,t=corpo.d[ci+3]>128&&X>=418?tipo(ci):'fundo';
      if(t==='mao'){if(a(X,Y)>0)sobreMao++;}else if(t==='fundo'&&a(X,Y)<200)buraco++;else if(t==='branco'&&a(X,Y)<255)dedos++;}
    r.jaleco={vao,buraco,sobreMao,perna,dedos};
    if(dedos)falha('roupa-jaleco: '+dedos+' pixels brancos do manequim perto da mão (vão entre os dedos: deveria aparecer o jaleco)');
    if(vao)falha('roupa-jaleco: tecido pintado no vão entre o corpo e o braço ('+vao+')');
    if(buraco)falha('roupa-jaleco: buraco no tecido perto da mão ('+buraco+' px)');
    if(sobreMao)falha('roupa-jaleco: tecido por cima da mão ('+sobreMao+' px)');
    if(perna)falha('roupa-jaleco: tecido fora da borda, sobre a calça ('+perna+')');}
  /* 2d) Redondo: a bochecha esquerda tem traço de nanquim (o recorte da gola não pode apagar o contorno) */
  {const c=L['rosto-redondo'],I=await px(c.src);let faltando=[];
    for(const Y of [275,290,305,320,335]){let ok=false;for(let X=122;X<180;X++){const x=X-c.x,y=Y-c.y,i=(y*I.w+x)*4;
      if(x>=0&&y>=0&&x<I.w&&y<I.h&&I.d[i+3]>200&&.299*I.d[i]+.587*I.d[i+1]+.114*I.d[i+2]<90){ok=true;break;}}if(!ok)faltando.push(Y);}
    r.redondoContorno=faltando;if(faltando.length)falha('rosto-redondo: sem traço na bochecha esquerda em y='+faltando.join(','));}
  /* 3) Redondo: nada pintado abaixo do queixo (gola cinza e hachuras cobriam a roupa) */
  {const c=L['rosto-redondo'],I=await px(c.src);let n=0;
    for(let y=Math.max(0,395-c.y);y<I.h;y++)for(let x=0;x<I.w;x++)if(I.d[(y*I.w+x)*4+3])n++;
    r.redondoAbaixoDoQueixo=n;if(n)falha('rosto-redondo: '+n+' pixels sobre a gola/pescoço');}
  /* 4) Barba cheia: longe dos olhos, boca aberta no lugar da boca, cobre o queixo e as costeletas chegam ao contorno do rosto */
  {const c=L['barba-cheia'],I=await px(c.src);
    const a=(X,Y)=>{const x=X-c.x,y=Y-c.y;return x>=0&&y>=0&&x<I.w&&y<I.h?I.d[(y*I.w+x)*4+3]:0;};
    const conta=(x0,y0,x1,y1)=>{let n=0;for(let Y=y0;Y<y1;Y++)for(let X=x0;X<x1;X++)if(a(X,Y)>40)n++;return n;};
    const olhoE=conta(145,226,200,268),olhoD=conta(235,230,300,272),boca=a(232,342),queixo=Math.min(a(258,392),a(250,385));
    let costE=1e9,costD=-1;for(let X=0;X<W;X++){if(a(X,280)>128){costE=Math.min(costE,X);costD=Math.max(costD,X);}}
    r.barba={olhoE,olhoD,boca,queixo,costE,costD};
    if(olhoE||olhoD)falha('barba-cheia: cobre os olhos ('+olhoE+'/'+olhoD+' pixels)');
    if(boca)falha('barba-cheia: tampa a boca');
    if(queixo<200)falha('barba-cheia: não cobre o queixo');
    if(costE>150)falha('barba-cheia: costeleta esquerda longe do contorno do rosto (x='+costE+')');
    if(costD<325)falha('barba-cheia: costeleta direita longe da orelha (x='+costD+')');}
  /* 4b) vão entre o braço e o corpo: no desenho final aparece o fundo (a sombra e o contorno branco não entram nele),
         e o contorno branco continua por fora da silhueta */
  {const TOP=Math.min(0,...Object.values(L).filter(v=>v&&typeof v==='object').flatMap(v=>[v.y,v.dy].filter(n=>typeof n==='number')));
    const FS=800/(H-TOP),FX=(440-W*FS)/2,FY0=12-TOP*FS,cv=document.createElement('canvas');cv.width=880;cv.height=1720;
    r.vaoBraco={};
    for(const[roupa,pts]of[['jaleco',[[431,700],[433,740],[436,790],[439,830]]],['camisa',[[425,700],[429,755],[432,810]]]]){
      A.render(cv,Object.assign({},A.state(),{roupa,roupaCor:'original',rosto:'',barba:'',acessorios:[],cabeca:'',base:'recorte',efeito:'nenhum',condicao:'normal'}));
      const g=cv.getContext('2d'),d=g.getImageData(0,0,cv.width,cv.height).data;
      const al=(X,Y)=>{const x=Math.round((FX+(X+.5)*FS)*2),y=Math.round((FY0+(Y+.5)*FS)*2);return d[(y*cv.width+x)*4+3];};
      const cheios=pts.filter(([X,Y])=>al(X,Y)>10);
      let halo=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200&&d[i]>245&&d[i+1]>245&&d[i+2]>245)halo++;
      r.vaoBraco[roupa]={cheios:cheios.length,halo};
      if(cheios.length)falha(roupa+': vão entre o braço e o corpo preenchido (sombra/contorno) em '+cheios.map(p=>p.join(',')).join(' '));
      if(halo<3000)falha(roupa+': contorno branco da silhueta sumiu ('+halo+' px)');}}
  /* 5) todos os rostos com e sem barba, em três tons de pele, desenham sem erro */
  const base=A.state(),cv=document.createElement('canvas');cv.width=440;cv.height=860;let desenhos=0;
  for(const rosto of['',...A.PECAS.rosto.filter(p=>p.camada).map(p=>p.id)])for(const barba of['','cheia'])for(const pele of['original','#f2d3b8','#5e3b27']){
    A.render(cv,Object.assign({},base,{rosto,barba,pele,barbaCor:barba?'#3a2a22':'original'}));
    const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;
    if(n/(cv.width*cv.height)<.15)falha('desenho vazio: rosto '+(rosto||'padrão')+' barba '+(barba||'nenhuma')+' pele '+pele);desenhos++;}
  r.desenhos=desenhos;
  return r;
}
module.exports={checarEncaixe};
