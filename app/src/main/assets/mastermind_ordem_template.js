/* Mastermind v0.96: map personal Ordem Paranormal two-page AcroForm models by page/field geometry.
 * This is mapping metadata only; the copyrighted template artwork stays in the user's PDF.
 */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)root.MastermindOrdemPdfTemplate=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const SKILLS=['Acrobacia','Adestramento','Artes','Atletismo','Atualidades','Ciências','Crime','Diplomacia','Enganação','Fortitude','Furtividade','Iniciativa','Intimidação','Intuição','Investigação','Luta','Medicina','Ocultismo','Percepção','Pilotagem','Pontaria','Profissão','Reflexos','Religião','Sobrevivência','Tática','Tecnologia','Vontade'];
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const plain=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
 function supports(pdf){
  if(!pdf||pdf.getPageCount()!==2)return false;
  const names=new Set(pdf.getForm().getFields().map(f=>f.getName()));
  return ['Personagem','Origem','Classe','PV','PE','DEF','NEX','Texto17','Texto5','aaac'].every(n=>names.has(n));
 }
 function get(sheet,key,defaultValue=''){
  const keys=Object.keys(sheet||{}),n=keys.find(k=>norm(k)===norm(key));
  return n?sheet[n]:defaultValue;
 }
 function grade(v){
  if(typeof v==='number')return Math.max(0,Math.min(3,Math.floor(v)));
  if(typeof v==='object'&&v!==null)return grade(v.grade??v.rank??v.level??v.training??v.value??0);
  if(typeof v==='string'){
   const n=norm(v);if(n==='treinado')return 1;if(n==='veterano')return 2;if(n==='expert')return 3;
   const number=Number(v);return Number.isFinite(number)?grade(number):0;
  }
  return 0;
 }
 function list(v){return Array.isArray(v)?v:[]}
 function asName(v){return typeof v==='string'?v:String(v?.name??v?.nome??v?.id??'')}
 function wrapText(value,font,size,maxWidth,limit){
  const words=plain(value).split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){
   const trial=line?line+' '+word:word;
   if(font.widthOfTextAtSize(trial,size)>maxWidth&&line){lines.push(line);line=word;}else line=trial;
   if(lines.length>=limit)break;
  }
  if(line&&lines.length<limit)lines.push(line);
  return lines;
 }
 function drawBox(pdf,page,index,rect,value,font,opts={}){
  if(value===undefined||value===null||value==='')return false;
  const [left,top,width,height]=rect,pH=page.getHeight(),base=Number(opts.size||10),align=opts.align||'left';
  const clean=plain(value),max=width-3;
  let size=base,text=clean;
  while(font.widthOfTextAtSize(text,size)>max&&size>Math.min(5.4,base))size-=.5;
  if(font.widthOfTextAtSize(text,size)>max){
   while(text.length>2&&font.widthOfTextAtSize(text+'...',size)>max)text=text.slice(0,-1);
   text+='...';
  }
  const textWidth=font.widthOfTextAtSize(text,size),x=left+(align==='center'?(width-textWidth)/2:align==='right'?width-textWidth-2:2);
  const y=pH-top-height+(height-size)/2+1.2;
  page.drawText(text,{x,y,font,size,color:pdf.rgb(.08,.08,.10)});
  return true;
 }
 function drawLines(pdf,page,rect,value,font,{size=9,lineHeight=12,maxLines=6}={}){
  if(!value)return 0;
  const [x,top,w,h]=rect,pH=page.getHeight(),lines=wrapText(value,font,size,w-4,Math.min(maxLines,Math.floor(h/lineHeight)));
  lines.forEach((s,i)=>page.drawText(s,{x:x+2,y:pH-top-11-i*lineHeight,font,size,color:pdf.rgb(.09,.09,.12)}));
  return lines.length;
 }
 function packSkill(pack,name){
  return list(pack?.pericias).find(x=>norm(x.nome)===norm(name));
 }
 function getInventory(root,s){
  const data=Array.isArray(s.items)?s.items:Array.isArray(s.inventory)?s.inventory:null;
  if(data)return data;
  try{const id=root.MastermindCharacters?.selectedId?.(),all=JSON.parse(root.localStorage?.getItem('rpg-v05-items')||'{}');return list(all[id]);}catch{return[];}
 }
 function renderExtra(pdf,lib,overflow,font,bold){
  if(!overflow.length)return 0;
  const c=lib.rgb(.12,.13,.17),muted=lib.rgb(.35,.36,.40),line=lib.rgb(.8,.8,.83);let page=null,y=0,count=0;
  function open(){
   page=pdf.addPage([595,842]);count++;y=786;
   page.drawText('MASTERMIND - COMPLEMENTO DA FICHA',{x:42,y,font:bold,size:16,color:c});y-=24;
   page.drawLine({start:{x:42,y},end:{x:553,y},thickness:.8,color:line});y-=24;
  }
  open();
  for(const section of overflow){
   if(y<110)open();
   page.drawText(plain(section.name).slice(0,70),{x:42,y,font:bold,size:11,color:c});y-=18;
   for(const text of section.rows){
    const lines=wrapText(text,font,9,501,20);
    if(y-12*lines.length<64)open();
    lines.forEach(t=>{page.drawText(t,{x:45,y,font,size:9,color:muted});y-=13;});
    y-=3;
   }
   y-=13;
  }
  return count;
 }
 async function fill(pdf,s,lib=root.PDFLib,context={}){
  if(!supports(pdf))throw Error('Modelo de Ordem Paranormal não reconhecido.');
  if(!lib?.StandardFonts)throw Error('Motor PDF indisponível.');
  const form=pdf.getForm(),formFieldCount=form.getFields().length;
  // Clear all old values first; otherwise previous characters remain in unused slots.
  for(const field of form.getFields()){
   try{if(typeof field.setText==='function')field.setText('');
   else if(typeof field.clear==='function')field.clear();}catch{/* Immutable fields are left untouched. */}
  }
  try{form.flatten();}catch(e){throw Error('Não foi possível preparar os campos desta ficha: '+String(e.message||e));}
  const pages=pdf.getPages(),font=await pdf.embedFont(lib.StandardFonts.Helvetica),bold=await pdf.embedFont(lib.StandardFonts.HelveticaBold);
  let filled=0;const w=(i,r,v,opt)=>{if(drawBox(lib,pages[i],i,r,v,font,opt))filled++;};
  const w0=(r,v,o)=>w(0,r,v,o),w1=(r,v,o)=>w(1,r,v,o);
  const attrs=s.attrs||{},resources=s.resources||{},calc=context.calc||{};
  const max=k=>Number(calc[k]??resources[k]?.max??resources[k]??0);
  const current=k=>typeof resources[k]==='object'?Number(resources[k]?.current??resources[k]?.value??0):Number(resources[k]??max(k));
  const cap=k=>Number.isFinite(current(k))?Math.max(0,Math.min(current(k),max(k)||current(k))):'';
  const rank=s.rank||s.patente||'',nex=Number(s.nex)||0;
  w0([61,49,171,21],s.name||'Novo agente',{size:12});
  w0([244,49,81,21],s.player||s.jogador||'',{size:10});
  w0([125,376,193,24],s.origin||s.origem||'',{size:10});
  w0([118,410,201,24],s.class||'',{size:10});
  for(const [field,key] of [['AGI','Agilidade'],['INT','Intelecto'],['VIG','Vigor'],['PRE','Presença'],['FOR','Força']]){
   const rect={AGI:[176,123,41,31],INT:[259,179,41,31],VIG:[235,281,41,31],PRE:[117,281,41,31],FOR:[93,179,41,31]}[field];
   w0(rect,get(attrs,key,''),{size:17,align:'center'});
  }
  // The form distinguishes maximum and current values using different boxes.
  for(const [rect,value] of [
   [[72,444,44,35],max('PV')],[[123,474,53,25],cap('PV')],
   [[72,510,43,33],max('PE')],[[118,539,70,24],cap('PE')],
   [[226,510,42,33],max('SAN')],[[269,538,49,26],cap('SAN')],
   [[71,576,44,33],calc.defesa??s.defense??s.defesa??10+Number(get(attrs,'Agilidade',0))],
   [[267,574,54,29],s.movement??s.deslocamento??''],
   [[210,445,42,33],s.determination??''],[[264,474,54,25],s.determinationCurrent??'']
  ])w0(rect,value,{size:12,align:'center'});
  w0([109,637,218,14],s.protection||s.protecao||'',{size:8});
  w0([123,654,203,14],s.resistances||s.resistencias||'',{size:8});
  // Acrobat field IDs for all 28 skill rows are cryptic or duplicated.
  // Map by coordinate, never by the duplicated "AGI"/"INT" names.
  const skillData=s.skills||{},origin=context.pack?.origens?.find(o=>o.nome===s.origin);
  for(let i=0;i<SKILLS.length;i++){
   const name=SKILLS[i],k=Object.keys(skillData).find(x=>norm(x)===norm(name)),entry=packSkill(context.pack,name);
   let g=k?grade(skillData[k]):list(origin?.pericias).some(v=>norm(v)===norm(name))?1:0;
   const attrKey=entry?.atributo||'';
   const attribute=attrKey?get(attrs,attrKey,''):'';
   const top=177+17.18*i;
   if(attribute!=='')w0([486,top,18,16],attribute,{size:9,align:'center'});
   if(g)w0([513,top,18,16],g*5,{size:9,align:'center'});
   const extra=s.skillBonuses?.[name]??s.skillModifiers?.[name];
   if(extra!==undefined&&extra!==null&&extra!=='')w0([541,top,18,16],extra,{size:9,align:'center'});
  }
  const attacks=list(s.attacks).length?s.attacks:list(s.weapons);
  for(let i=0;i<Math.min(5,attacks.length);i++){
   const a=attacks[i],t=typeof a==='string'?{name:a}:a,top=706+16.6*i;
   w0([58,top,174,14],asName(t),{size:8});w0([238,top,65,14],t.test||t.bonus||'',{size:8});
   w0([310,top,65,14],t.damage||t.dano||'',{size:8});
   w0([383,top,180,14],t.critical||t.critico||t.range||t.alcance||'',{size:8});
  }
  w1([81,76,27,30],nex+'%',{size:11,align:'center'});
  w1([122,111,43,28],s.level||s.nivel||'',{size:11,align:'center'});
  w1([179,111,27,28],nex?nex+'%':'',{size:9,align:'center'});
  w1([109,146,189,29],rank,{size:10});
  w1([245,92,52,23],calc.peTurn??s.limitePE??'',{size:9,align:'center'});
  const notes=Array.isArray(s.notes)?s.notes.map(asName).join('\n'):s.notes||s.anotacoes||s.note||'';
  filled+=drawLines(lib,pages[1],[319,69,213,98],notes,font,{size:9,lineHeight:12,maxLines:7});
  const known=context.pack?.rituais||[];
  const powers=list(s.powerChoices).length?s.powerChoices.map(v=>({name:v.name,type:v.type,nex:v.nex})):list(s.powers).map(v=>({name:asName(v),type:'class'}));
  const rituals=list(s.rituaisConhecidos).map(v=>{
   const id=asName(v),data=known.find(q=>q.id===id||q.nome===id);return {name:data?.nome||id,type:'ritual',cost:data?.custo??'',page:data?.paginaLivro??'',description:data?.resumo??''};
  });
  const abilities=[...powers,...rituals],visible=abilities.slice(0,22),overflow=[];
  for(let i=0;i<visible.length;i++){
   const p=visible[i],top=200+16.05*i;
   w1([37,top,161,14],asName(p),{size:8});
   w1([206,top,34,14],p.cost||'',{size:8,align:'center'});
   w1([246,top,38,14],p.page||'',{size:8,align:'center'});
   w1([291,top,245,14],p.description|| (p.type==='transcend'?'Poder paranormal':p.type==='ritual'?'Ritual':'Poder de classe'),{size:7.5});
  }
  if(abilities.length>visible.length)overflow.push({name:'PODERES E RITUAIS ADICIONAIS',rows:abilities.slice(visible.length).map(v=>asName(v))});
  const items=getInventory(root,s),visibleItems=items.slice(0,22);
  for(let i=0;i<visibleItems.length;i++){
   const v=visibleItems[i],obj=typeof v==='string'?{name:v}:v,side=i<11?0:1,slot=side?i-11:i;
   const top=614+16.07*slot,base=side?295:38;
   w1([base,top,side?164:165,15],asName(obj),{size:8});
   w1([side?467:212,top,30,15],obj.category??obj.categoria??'',{size:8,align:'center'});
   w1([side?505:250,top,30,15],obj.slots??obj.espacos??obj.weight??'',{size:8,align:'center'});
  }
  if(items.length>visibleItems.length)overflow.push({name:'INVENTÁRIO ADICIONAL',rows:items.slice(visibleItems.length).map(asName)});
  w1([256,539,39,22],s.prestige??s.prestigio??'',{size:9,align:'center'});
  w1([338,537,188,24],rank,{size:9});
  w1([287,570,146,22],s.creditLimit??s.limiteCredito??'',{size:9});
  w1([470,567,31,23],s.currentLoad??s.cargaAtual??'',{size:9,align:'center'});
  w1([506,567,31,23],s.maxLoad??s.cargaMax??'',{size:9,align:'center'});
  const extraPages=renderExtra(pdf,lib,overflow,font,bold);
  pdf.setTitle('Ficha de Ordem Paranormal - '+(s.name||'Agente'));
  pdf.setSubject('Modelo fornecido pelo usuário, preenchido pelo Mastermind; páginas extras quando necessário.');
  return {bytes:new Uint8Array(await pdf.save()),filled,fields:formFieldCount,extraPages,recognized:true};
 }
 return {supports,fill,SKILLS,grade,packSkill};
});
