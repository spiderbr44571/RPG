/* Mastermind 0.85 • New third-party sprite renderer. Original CC0 art: nonemo.
 * No prior Atelier art, vector approximations, or AI-generated sprites are used.
 * The files' exact RGBA values are embedded losslessly by prepare_nonemo85.py.
 */
(function(root){'use strict';
const db=root.Nonemo85Assets;
if(!db||db.count!==180)throw new Error('Biblioteca original de 180 assets nonemo ausente');
const SPR=db.sprites;
const cache=new Map(),listeners=new Set();
let pending=false;
function changed(){if(pending)return;pending=true;setTimeout(()=>{pending=false;for(const fn of listeners){try{fn()}catch(e){console.warn(e)}}},25);}
function onReady(fn){listeners.add(fn);return()=>listeners.delete(fn)}
function file(k){if(!k||!Object.prototype.hasOwnProperty.call(SPR,k))return null;
 let ent=cache.get(k);if(ent)return ent.ready?ent.img:null;
 const img=new Image();ent={img,ready:false,failed:false};cache.set(k,ent);
 img.onload=()=>{ent.ready=true;changed()};
 img.onerror=()=>{ent.failed=true;changed();console.error('Falha em sprite original:',k)};
 img.src=SPR[k];return ent.ready?img:null;}
const hairColors=['black','brown','blond','red','orange','white','violet','blue','green'];
const outfitColors=['green','orange','blue','white','black','violet','red'];
const sleeveColors=['green','orange','blue','white','black','purple','red'];
const headStyles=['head.cheeks','head'];
const expressions=['smile','cute','laughs','angry','evil','gloating','willing','sad','melancholic','fright','crying','sleepy','tempered','dead','love'];
const eyeStyles=['ordinary','cute','closed','sad','Default','love','dead','crying','fright','evil'];
const mouthStyles=['smile','teeth_smile','saliva','teeth','sad','open_mouth'];
const hairFrontStyles=['regular','curly','chupchik','elegant','straight'];
const hairBackStyles=['short','long','curly'];
const beardStyles=['none','short','middle','long'];
const shirtStyles=['dress','trousers'];
const sleeves=['short','long'];
const trousers=['pants','shorts','naked'];
const glasses=['none','round.black','round.white','square.black','square.white'];
const backgrounds=[
 {id:'violet',name:'Ametista',a:'#342940',b:'#151b2a'},
 {id:'teal',name:'Esmeralda',a:'#20535a',b:'#10252c'},
 {id:'sand',name:'Pergaminho',a:'#a47c62',b:'#443440'},
 {id:'wine',name:'Sangue',a:'#693b50',b:'#241e30'},
 {id:'navy',name:'Noite',a:'#31456b',b:'#111a2c'},
 {id:'plain',name:'Transparente',a:'transparent',b:'transparent'}
];
const defaults={version:85,skin:'tint_1',head:'head.cheeks',expression:'smile',eye:'ordinary',mouth:'smile',hairFront:'regular',hairBack:'long',hairColor:'brown',beard:'none',beardColor:'brown',shirt:'dress',shirtColor:'green',sleeve:'short',sleeveColor:'green',pants:'pants',glasses:'none',background:'violet',frame:'gold'};
const categories=[
 {id:'skin',label:'Pele',title:'Tons de pele',options:['tint_1','tint_2','tint_3']},
 {id:'head',label:'Cabeça',title:'Formato e acabamento',options:headStyles},
 {id:'expression',label:'Expressões',title:'Expressões completas',options:['custom',...expressions]},
 {id:'eye',label:'Olhos',title:'Olhos individuais',options:eyeStyles},
 {id:'mouth',label:'Boca',title:'Bocas individuais',options:mouthStyles},
 {id:'hairFront',label:'Cabelo',title:'Cabelo frontal',options:hairFrontStyles},
 {id:'hairBack',label:'Cabelo atrás',title:'Cabelo traseiro',options:['none',...hairBackStyles]},
 {id:'hairColor',label:'Cor do cabelo',title:'Paleta original dos cabelos',options:hairColors},
 {id:'beard',label:'Barba',title:'Barbas e bigodes',options:beardStyles},
 {id:'beardColor',label:'Cor da barba',title:'Paleta original das barbas',options:hairColors},
 {id:'shirt',label:'Roupa',title:'Modelos de roupa',options:shirtStyles},
 {id:'shirtColor',label:'Cor da roupa',title:'Paleta das roupas',options:outfitColors},
 {id:'sleeve',label:'Mangas',title:'Comprimento das mangas',options:sleeves},
 {id:'sleeveColor',label:'Cor das mangas',title:'Paleta das mangas',options:sleeveColors},
 {id:'pants',label:'Calça',title:'Calças e shorts',options:trousers},
 {id:'glasses',label:'Óculos',title:'Armações de óculos',options:glasses},
 {id:'background',label:'Fundo',title:'Fundo do token',options:backgrounds.map(x=>x.id)},
];
const swatches={black:'#27202a',brown:'#87503a',blond:'#ffe397',red:'#ff3550',orange:'#ff783c',white:'#fff8e5',violet:'#ad42ef',blue:'#4fcde7',green:'#43d990',purple:'#9635de'};
const labels={none:'Nenhum',custom:'Olhos + boca',tint_1:'Clara',tint_2:'Média',tint_3:'Escura','head.cheeks':'Com bochechas',head:'Sem bochechas',ordinary:'Comuns',cute:'Fofo',closed:'Fechados',sad:'Tristes',Default:'Clássicos',love:'Amor',dead:'Sem vida',crying:'Chorando',fright:'Surpresa',evil:'Malicioso',smile:'Sorriso',laughs:'Rindo',angry:'Bravo',gloating:'Satisfeito',willing:'Determinado',melancholic:'Melancólico',sleepy:'Sonolento',tempered:'Sério',teeth_smile:'Sorriso aberto',saliva:'Língua',teeth:'Dentes',open_mouth:'Aberta',chupchik:'Topete',regular:'Natural',curly:'Cacheado',elegant:'Elegante',straight:'Reto',short:'Curto',long:'Longo',middle:'Médio',dress:'Vestido',trousers:'Camiseta',green:'Verde',orange:'Laranja',blue:'Azul',white:'Branco',black:'Preto',violet:'Violeta',red:'Vermelho',purple:'Roxo',brown:'Castanho',blond:'Loiro',pants:'Comprida',shorts:'Shorts',naked:'Sem calça','round.black':'Redondo escuro','round.white':'Redondo claro','square.black':'Quadrado escuro','square.white':'Quadrado claro'};
function normal(v){const c={...defaults,...(v&&typeof v==='object'?v:{})};for(const cat of categories)if(!cat.options.includes(c[cat.id]))c[cat.id]=defaults[cat.id];return {...c,version:85}}
function keySkin(c,part){return `skin/${c.skin}/${part}.png`}
function colorKey(type,c){return `${type}.${c.hairColor}.png`}
function sprite(ctx,key,x,y,scale=1){const im=file(key);if(!im)return false;ctx.drawImage(im,x,y,im.width*scale,im.height*scale);return true;}
function rectBg(ctx,width,height,c,transparent){const bg=backgrounds.find(x=>x.id===c.background)||backgrounds[0];if(transparent||bg.id==='plain'){ctx.clearRect(0,0,width,height);return;}
 const grad=ctx.createLinearGradient(0,0,width,height);grad.addColorStop(0,bg.a);grad.addColorStop(1,bg.b);ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
 const rg=ctx.createRadialGradient(width*.5,height*.32,5,width*.5,height*.5,width*.76);rg.addColorStop(0,'#ffffff18');rg.addColorStop(1,'#ffffff00');ctx.fillStyle=rg;ctx.fillRect(0,0,width,height);
}
function draw(ctx,w,h,configuration={},transparent=false){const c=normal(configuration),logicalW=290,logicalH=320;
 ctx.save();ctx.clearRect(0,0,w,h);rectBg(ctx,w,h,c,transparent);const sc=Math.min(w/logicalW,h/logicalH);ctx.translate((w-logicalW*sc)/2,(h-logicalH*sc)/2);ctx.scale(sc,sc);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // Head layers are authored on a common 290x286 canvas. Body/limb parts use
 // their own smaller dimensions and carefully measured fixed coordinates.
 if(c.hairBack!=='none')sprite(ctx,`hairs/back/${c.hairBack}.${c.hairColor}.png`,0,0);
 for(const x of [123,153]){sprite(ctx,keySkin(c,'leg'),x,255);if(c.pants!=='naked')sprite(ctx,`pants/${c.pants}.png`,x,255);}
 for(const x of [95,171]){sprite(ctx,keySkin(c,'arm'),x,215);sprite(ctx,`sleeves/${c.sleeveColor}.${c.sleeve}.png`,x,215);}
 sprite(ctx,keySkin(c,'body'),110,214);
 const shirt=`shirts/${c.shirt}.${c.shirtColor}.png`;const garment=file(shirt);if(garment)ctx.drawImage(garment,Math.round(145-garment.width/2),214);
 sprite(ctx,keySkin(c,c.head),0,0);
 if(c.expression!=='custom')sprite(ctx,`faces/${c.expression}.png`,0,0);
 else{sprite(ctx,`faces/parts/eyes/${c.eye}.png`,0,0);sprite(ctx,`faces/parts/mouth/${c.mouth}.png`,0,0)}
 if(c.beard!=='none')sprite(ctx,`beards/${c.beard}.${c.beardColor}.png`,0,0);
 sprite(ctx,`hairs/front/${c.hairFront}.${c.hairColor}.png`,0,0);
 if(c.glasses!=='none')sprite(ctx,`glasses/${c.glasses}.png`,0,0);
 ctx.restore();return c;}
function token(ctx,w,portrait){ctx.save();ctx.clearRect(0,0,w,w);const x=w/2,y=w/2,r=w*.45;
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();ctx.drawImage(portrait,0,-w*.06,w,w*1.10);ctx.restore();ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.strokeStyle='#d5af7c';ctx.lineWidth=Math.max(2,w*.014);ctx.stroke();ctx.restore();}
function requiredKeys(raw){const c=normal(raw),keys=[];
 if(c.hairBack!=='none')keys.push(`hairs/back/${c.hairBack}.${c.hairColor}.png`);
 for(const part of ['leg','arm','body',c.head])keys.push(keySkin(c,part));
 if(c.pants!=='naked')keys.push(`pants/${c.pants}.png`);
 keys.push(`sleeves/${c.sleeveColor}.${c.sleeve}.png`,`shirts/${c.shirt}.${c.shirtColor}.png`);
 if(c.expression!=='custom')keys.push(`faces/${c.expression}.png`);
 else keys.push(`faces/parts/eyes/${c.eye}.png`,`faces/parts/mouth/${c.mouth}.png`);
 if(c.beard!=='none')keys.push(`beards/${c.beard}.${c.beardColor}.png`);
 keys.push(`hairs/front/${c.hairFront}.${c.hairColor}.png`);
 if(c.glasses!=='none')keys.push(`glasses/${c.glasses}.png`);
 return keys;
}
function readyFor(raw){return requiredKeys(raw).every(key=>!!file(key))}
function random(){const c={...defaults};for(const cat of categories){const opts=cat.options;if(cat.id==='expression'&&Math.random()<.35)c[cat.id]='custom';else c[cat.id]=opts[Math.floor(Math.random()*opts.length)];}return normal(c)}
root.Nonemo85={VERSION:85,defaults,categories,normal,draw,token,random,onReady,labels,swatches,backgrounds,getSprite:file,requiredKeys,readyFor,db};
if(typeof module!=='undefined'&&module.exports)module.exports=root.Nonemo85;
})(typeof window!=='undefined'?window:globalThis);