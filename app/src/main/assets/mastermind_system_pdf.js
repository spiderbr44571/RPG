/* Mastermind: system-specific printable PDF sheets, or fill user-owned PDF AcroForms.
 * Does not distribute proprietary RPG character-sheet artwork.
 */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)root.MastermindSystemPdf=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const SYSTEMS={
  ordem:{name:'ORDEM PARANORMAL',version:'AGENTE · 1.3',rgb:[.69,.25,.32]},
  dnd:{name:'DUNGEONS & DRAGONS',version:'PERSONAGEM · 5E',rgb:[.61,.23,.21]},
  gurps:{name:'GURPS',version:'PERSONAGEM · 4E',rgb:[.19,.32,.45]},
  coc:{name:'CHAMADO DE CTHULHU',version:'INVESTIGADOR · 7E',rgb:[.22,.37,.30]}
 };
 const text=v=>v==null?'—':typeof v==='object'?JSON.stringify(v):String(v);
 const latin=v=>text(v).replace(/[–—]/g,'-').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g,'?');
 const item=v=>root.MastermindItemNames?.format?.(v)|| (typeof v==='string'?v:text(v?.name??v?.nome??v?.title??v?.id??'Item'));
 const dict=v=>Object.entries(v||{}).map(([k,x])=>[k,text(x)]);
 const listing=v=>(Array.isArray(v)?v:[]).map((x,i)=>[String(i+1),item(x)]);
 const resource=v=>typeof v==='object'&&v!==null?text(v.current??v.value??v.max??0)+' / '+text(v.max??v.current??v.value??0):text(v);
 function activeSystem(){
  const id=root.MastermindSheetStudio?.currentSystem;
  return id==='d-d'?'dnd':id==='gurps'?'gurps':id==='chamado-de-ctchulhu'?'coc':'ordem';
 }
 function current(system=activeSystem()){
  const s=system==='ordem'?root.OP13?.state:system==='dnd'?root.RPG18_DND?.current:system==='gurps'?root.RPG16_GURPS?.current:root.MastermindCoc7?.current;
  if(!s||typeof s!=='object')throw Error('Selecione um personagem antes de exportar.');
  return {system,sheet:JSON.parse(JSON.stringify(s)),name:s.name||'Personagem'};
 }
 function inventory(){
  try{const id=root.MastermindCharacters?.selectedId?.(),db=JSON.parse(root.localStorage?.getItem('rpg-v05-items')||'{}');return listing(db[id]);}catch{return[]}
 }
 function model(system,s){
  if(!SYSTEMS[system])throw Error('Sistema desconhecido.');
  const sections=[],add=(name,rows)=>{if(rows.length)sections.push({name,rows:rows.map(([a,b])=>[text(a),text(b)])});};
  if(system==='ordem'){
   add('IDENTIDADE',[['Classe',s.class],['Origem',s.origin||s.origem],['Trilha',s.trail||s.trilha],['NEX',(s.nex??5)+'%'],['Patente',s.rank]]);
   add('ATRIBUTOS',dict(s.attrs));add('RECURSOS',Object.entries(s.resources||{}).map(([k,v])=>[k,resource(v)]));
   const origin=root.OP13?.pack?.origens?.find(o=>o.nome===(s.origin||s.origem));
   const grades={...Object.fromEntries((origin?.pericias||[]).map(k=>[k,1])),...(s.skills||{})};
   add('PERÍCIAS',Object.entries(grades).map(([name,rank])=>[name,'+'+(Math.max(0,Math.min(3,Number(rank)||0))*5)]));
   add('PODERES',listing(s.powerChoices?.length?s.powerChoices.map(v=>(v.name||'')+' · '+(v.type==='transcend'?'Paranormal':'Classe')+' · NEX '+v.nex):s.powers));
   add('RITUAIS',listing(s.rituaisConhecidos));add('INVENTÁRIO',inventory());add('HISTÓRIA',[['Descrição',s.description],['História',s.history]]);
  }else if(system==='dnd'){
   add('IDENTIDADE',[['Classe',s.klass],['Nível',s.level],['Ancestralidade',s.ancestry||s.race],['Antecedente',s.background]]);
   add('ATRIBUTOS',dict(s.attrs));add('RECURSOS',[['PV',text(s.hitPointsCurrent)+' / '+text(s.hitPointsMax)],['PV temporários',s.hitPointsTemp],['CA',s.armorClass]]);
   add('PERÍCIAS',listing(s.skillProficiencies));add('ESPECIALIZAÇÕES',listing(s.expertise));
   add('HABILIDADES',listing(s.features));add('MAGIAS',listing(s.spells));add('INVENTÁRIO',listing(s.inventory));add('HISTÓRIA',[['Notas',s.history]]);
  }else if(system==='gurps'){
   add('IDENTIDADE',[['Conceito',s.concept],['Nível tecnológico',s.techLevel],['Pontos',s.pointBudget],['HP atual',s.currentHP],['FP atual',s.currentFP]]);
   add('ATRIBUTOS',dict(s.attrs));add('PERÍCIAS',(s.skills||[]).map(v=>[v.name||'Perícia','Nv '+text(v.level)+' · '+text(v.points)+' pts']));
   add('VANTAGENS',(s.advantages||[]).map(v=>[item(v),text(v.points)+' pts']));
   add('DESVANTAGENS',(s.disadvantages||[]).map(v=>[item(v),text(v.points)+' pts']));
   add('EQUIPAMENTO',listing(s.items));add('ARMAS',(s.weapons||[]).map(v=>[item(v),v.damage||'—']));
   add('MAGIAS',listing(s.spells));add('HISTÓRIA',[['Antecedentes',s.background]]);
  }else{
   add('INVESTIGADOR',[['Ocupação',s.occupation],['Era',s.era],['Idade',s.age],['Residência',s.residence]]);
   add('CARACTERÍSTICAS',dict(s.attributes));add('RECURSOS',Object.entries(s.resources||{}).map(([k,v])=>[k,resource(v)]));
   add('PERÍCIAS',dict(s.skills));add('HISTÓRIA',[['História',s.history],['Descrição',s.description]]);
   add('EQUIPAMENTO',listing(s.inventory));
  }
  return {system,name:s.name||'Personagem',sections};
 }
 async function renderOwn(input,lib=root.PDFLib){
  if(!lib?.PDFDocument)throw Error('Biblioteca PDF não disponível.');
  const pdf=await lib.PDFDocument.create(),font=await pdf.embedFont(lib.StandardFonts.Helvetica),bold=await pdf.embedFont(lib.StandardFonts.HelveticaBold);
  const accent=lib.rgb(...SYSTEMS[input.system].rgb),ink=lib.rgb(.10,.12,.17),muted=lib.rgb(.4,.41,.44),white=lib.rgb(1,1,1),line=lib.rgb(.83,.84,.85);
  const W=595,H=842,L=40,R=555;let page,y,num=0;
  function header(){
   page=pdf.addPage([W,H]);num++;y=735;
   page.drawRectangle({x:0,y:768,width:W,height:74,color:accent});
   page.drawText(latin(SYSTEMS[input.system].name),{x:L,y:805,font:bold,size:20,color:white});
   page.drawText(latin(SYSTEMS[input.system].version),{x:L,y:786,font,size:10,color:white});
   page.drawText('MASTERMIND · FICHA PARA IMPRESSÃO',{x:L,y:24,font,size:8,color:muted});
   page.drawText('PÁGINA '+num,{x:493,y:24,font,size:8,color:muted});
  }
  function split(v,maxw,size){
   const words=latin(v).split(/\s+/).filter(Boolean),rows=[];let value='';
   for(const word of words){
    const attempt=value?value+' '+word:word;
    if(font.widthOfTextAtSize(attempt,size)>maxw&&value){rows.push(value);value=word;}else value=attempt;
    if(rows.length>=24)break;
   }
   if(value&&rows.length<25)rows.push(value);
   return rows.length?rows:['—'];
  }
  function section(label){
   if(y<93)header();
   y-=12;page.drawRectangle({x:L,y:y-9,width:R-L,height:23,color:lib.rgb(.94,.94,.95)});
   page.drawRectangle({x:L,y:y-9,width:4,height:23,color:accent});
   page.drawText(latin(label),{x:L+13,y:y,font:bold,size:10,color:ink});y-=24;
  }
  function row(key,value){
   const rows=split(value,314,9),h=Math.max(22,rows.length*12+7);
   if(y-h<56)header();
   page.drawLine({start:{x:L,y:y-h+2},end:{x:R,y:y-h+2},thickness:.5,color:line});
   const keys=split(key,168,8);
   keys.slice(0,2).forEach((t,i)=>page.drawText(t,{x:L+7,y:y-12-10*i,font:bold,size:8,color:muted}));
   rows.forEach((t,i)=>page.drawText(t,{x:L+193,y:y-12-12*i,font,size:9,color:ink}));y-=h;
  }
  header();
  page.drawText(latin(input.name).slice(0,75),{x:L,y:y+3,font:bold,size:18,color:ink});y-=28;
  for(const area of input.sections){section(area.name);for(const [key,value] of area.rows.slice(0,160))row(key,value);}
  pdf.setTitle('Mastermind - '+SYSTEMS[input.system].name+' - '+input.name);
  pdf.setSubject('Modelo original para impressão. O backup com JSON é exportado pela opção portátil.');
  return new Uint8Array(await pdf.save());
 }
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 function fields(system,s){
  const m=model(system,s),map=new Map(),put=(k,v)=>{const id=norm(k);if(id&&!map.has(id))map.set(id,latin(v))};
  put('Nome',s.name);put('Personagem',s.name);put('CharacterName',s.name);put('InvestigatorName',s.name);
  for(const area of m.sections)for(const [k,v] of area.rows){put(k,v);put(area.name+' '+k,v);}
  for(const [k,v] of Object.entries(s.attrs||s.attributes||{}))put(k,v);
  for(const [k,v] of Object.entries(s.skills||{}))put(k,typeof v==='object'?(v.level??v.value??v.points??''):v);
  if(system==='ordem'){put('PV',resource(s.resources?.PV));put('PE',resource(s.resources?.PE));put('SAN',resource(s.resources?.SAN));put('NEX',text(s.nex)+'%');}
  if(system==='dnd'){put('ClassLevel',text(s.klass)+' '+text(s.level));put('Race',s.ancestry||s.race);put('HP',s.hitPointsCurrent);put('HPMax',s.hitPointsMax);}
  return map;
 }
 function match(name,map){
  const n=norm(name);if(map.has(n))return map.get(n);
  const parts=String(name).split(/[./:_-]/).map(norm).filter(Boolean);
  for(let i=parts.length-1;i>=0;i--)if(map.has(parts[i]))return map.get(parts[i]);
  return null;
 }
 async function fillUploaded(bytes,system,s,lib=root.PDFLib){
  if(!lib?.PDFDocument)throw Error('Biblioteca PDF indisponível.');
  if(bytes.length>12*1024*1024)throw Error('Modelo PDF maior que 12 MB.');
  const pdf=await lib.PDFDocument.load(bytes),all=pdf.getForm().getFields();
  if(!all.length)throw Error('Este modelo não possui campos editáveis (AcroForm). Use um PDF preenchível ou o modelo do Mastermind.');
  if(system==='ordem'&&root.MastermindOrdemPdfTemplate?.supports(pdf)){
   return root.MastermindOrdemPdfTemplate.fill(pdf,s,lib,{pack:root.OP13?.pack,calc:root.OP13?.calc?.()});
  }
  const data=fields(system,s);let filled=0;
  for(const field of all){const value=match(field.getName(),data);if(value===null)continue;
   try{if(typeof field.setText==='function'){field.setText(value.slice(0,240));filled++;}else if(typeof field.select==='function'){field.select(value);filled++;}}catch{/* Locked or incompatible PDF fields are skipped. */}
  }
  if(!filled)throw Error('Nenhum campo deste modelo correspondeu à ficha. É necessário um PDF com nomes de campos compatíveis.');
  pdf.setTitle('Ficha preenchida - '+(s.name||'Personagem'));
  return {bytes:new Uint8Array(await pdf.save()),filled,fields:all.length};
 }
 function safeName(v){return String(v||'personagem').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').slice(0,70);}
 function save(bytes,name){
  if(root.RpgSheetPdfBridge?.savePdf){
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   root.RpgSheetPdfBridge.savePdf(name,root.btoa(binary));return;
  }
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
 function mount(){
  const panel=document.querySelector('#r17-op-panel');
  if(!panel||panel.querySelector('#mm95-export'))return !!panel;
  const box=document.createElement('div');box.id='mm95-export';
  box.innerHTML='<h4>Exportar no modelo do sistema</h4><p>Usa os dados da ficha selecionada acima. A exportação portátil com JSON continua disponível abaixo.</p>'+
   '<div class="mm95-line"><label>Modelo<select id="mm95-mode"><option value="original">Modelo visual do sistema</option><option value="user">Meu PDF preenchível</option></select></label>'+
   '<label id="mm95-own-label" hidden>Meu PDF de ficha<input type="file" id="mm95-own" accept=".pdf,application/pdf"></label>'+
   '<button id="mm95-go" type="button">Exportar ficha preenchida</button></div>'+
   '<p id="mm95-description">Layout original do Mastermind, específico do sistema, sem distribuir arte oficial.</p><small id="mm95-status" role="status" aria-live="polite"></small>';
  const actions=panel.querySelector('.r17-actions');if(actions)actions.insertAdjacentElement('beforebegin',box);else panel.append(box);
  const mode=box.querySelector('#mm95-mode'),own=box.querySelector('#mm95-own'),label=box.querySelector('#mm95-own-label'),status=box.querySelector('#mm95-status'),go=box.querySelector('#mm95-go'),description=box.querySelector('#mm95-description');
  mode.addEventListener('change',()=>{label.hidden=mode.value!=='user';description.textContent=mode.value==='user'?'É necessário um modelo PDF com campos editáveis (AcroForm); não é necessário enviar o arquivo para nenhum servidor.':'Layout original do Mastermind, específico do sistema, sem distribuir arte oficial.';});
  go.addEventListener('click',async()=>{
   if(root.__rpgRemoteSheetEditing){status.textContent='Encerre a edição online antes de exportar.';return;}
   go.disabled=true;status.textContent='Gerando PDF...';
   try{const c=current();let bytes,extra='';
    if(mode.value==='user'){
     if(!own.files?.[0])throw Error('Selecione seu PDF preenchível.');
     const x=await fillUploaded(new Uint8Array(await own.files[0].arrayBuffer()),c.system,c.sheet);
     bytes=x.bytes;extra=' · '+x.filled+' campos preenchidos';
    }else bytes=await renderOwn(model(c.system,c.sheet));
    save(bytes,safeName(c.system+'-'+c.name)+'-modelo.pdf');
    status.textContent='Ficha exportada para '+SYSTEMS[c.system].name+extra+'. Use PDF portátil para reimportar os dados completos.';
   }catch(e){status.textContent='Falha: '+(e.message||e);}
   finally{go.disabled=false;}
  });
  const style=document.createElement('style');style.textContent='#mm95-export{border-bottom:1px solid var(--line);padding-bottom:15px;margin-bottom:15px}#mm95-export h4{font:600 19px Georgia,serif;margin:0}#mm95-export p{font-size:12px;color:var(--muted);line-height:1.55;margin:6px 0 12px}.mm95-line{display:flex;flex-wrap:wrap;gap:10px;align-items:end}.mm95-line label{display:grid;gap:6px;color:var(--fg);font-size:11px}.mm95-line label[hidden]{display:none!important}.mm95-line select,.mm95-line input{background:var(--panel2);color:var(--fg);border:1px solid var(--line);min-height:43px;padding:8px;border-radius:8px;max-width:100%}.mm95-line button{min-height:43px;padding:10px 15px;border-radius:9px;background:var(--accent);border:1px solid var(--accent);color:var(--bg);font:700 12px system-ui}#mm95-status{display:block;margin:8px 0;color:var(--accent);font-size:12px}@media(max-width:690px){.mm95-line>*{width:100%}.mm95-line select{width:100%}}';
  document.head.append(style);return true;
 }
 if(root.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
 return {SYSTEMS,activeSystem,current,model,fields,match,renderOwn,fillUploaded,mount};
});
