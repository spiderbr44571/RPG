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
    const olhos=[[150,238,160,230,177,227,186,235,189,248,186,260,173,266,158,263,151,253],[244,258,248,247,257,238,273,233,290,239,298,249,290,261,273,267,257,267,248,264]];
    const dentro=(pts,X,Y)=>{let s=false;for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){const xi=pts[i],yi=pts[i+1],xj=pts[j],yj=pts[j+1];
      if((yi>Y)!==(yj>Y)&&X<(xj-xi)*(Y-yi)/(yj-yi)+xi)s=!s;}return s;};
    let buraco=0,mancha=0,claro=0,total=0;
    for(const pts of olhos)for(let Y=222;Y<275;Y++)for(let X=145;X<305;X++){if(!dentro(pts,X+.5,Y+.5))continue;
      const x=X-c.x,y=Y-c.y,i=(y*I.w+x)*4;total++;if(I.d[i+3]<255){buraco++;continue;}
      const R=I.d[i],G=I.d[i+1],B=I.d[i+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B),lum=.299*R+.587*G+.114*B;
      if(lum>180)claro++;if(mx>0&&(mx-mn)/mx>.25&&lum>90)mancha++;}
    r.olhosJovem={total,buraco,mancha,claro};
    if(buraco)falha('rosto-jovem: '+buraco+' pixels abertos nos olhos');
    if(mancha>12)falha('rosto-jovem: '+mancha+' manchas cor de pele dentro dos olhos');
    if(claro<total*.35)falha('rosto-jovem: esclera escura ('+claro+'/'+total+')');}
  /* 3) Redondo: nada pintado abaixo do queixo (gola cinza e hachuras cobriam a roupa) */
  {const c=L['rosto-redondo'],I=await px(c.src);let n=0;
    for(let y=Math.max(0,395-c.y);y<I.h;y++)for(let x=0;x<I.w;x++)if(I.d[(y*I.w+x)*4+3])n++;
    r.redondoAbaixoDoQueixo=n;if(n)falha('rosto-redondo: '+n+' pixels sobre a gola/pescoço');}
  /* 4) Barba cheia: longe dos olhos, boca aberta no lugar da boca, cobre o queixo e as costeletas chegam ao contorno do rosto */
  {const c=L['barba-cheia'],I=await px(c.src);
    const a=(X,Y)=>{const x=X-c.x,y=Y-c.y;return x>=0&&y>=0&&x<I.w&&y<I.h?I.d[(y*I.w+x)*4+3]:0;};
    const conta=(x0,y0,x1,y1)=>{let n=0;for(let Y=y0;Y<y1;Y++)for(let X=x0;X<x1;X++)if(a(X,Y)>40)n++;return n;};
    const olhoE=conta(145,226,200,268),olhoD=conta(235,230,300,272),boca=a(237,334),queixo=Math.min(a(258,392),a(250,385));
    let costE=1e9,costD=-1;for(let X=0;X<W;X++){if(a(X,280)>128){costE=Math.min(costE,X);costD=Math.max(costD,X);}}
    r.barba={olhoE,olhoD,boca,queixo,costE,costD};
    if(olhoE||olhoD)falha('barba-cheia: cobre os olhos ('+olhoE+'/'+olhoD+' pixels)');
    if(boca)falha('barba-cheia: tampa a boca');
    if(queixo<200)falha('barba-cheia: não cobre o queixo');
    if(costE>150)falha('barba-cheia: costeleta esquerda longe do contorno do rosto (x='+costE+')');
    if(costD<325)falha('barba-cheia: costeleta direita longe da orelha (x='+costD+')');}
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
