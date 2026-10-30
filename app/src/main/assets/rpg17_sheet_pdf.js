/* RPG 0.17: PDF legivel + anexo JSON estruturado. Sem bibliotecas remotas. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)root.RPG17_PDF=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCHEMA='rpg-sheet-pdf-v1',TAG_START='RPG-SHEET-DATA-V1\n',TAG_END='\nRPG-SHEET-DATA-END';
 const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
 const copy=x=>JSON.parse(JSON.stringify(x));
 const plain=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
 const limit=(s,n)=>plain(s).slice(0,n);
 function cleanName(x){return limit(x||'personagem',65).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'personagem'}
 function check(data){
  if(!data||data.kind!==SCHEMA||!['gurps','sistema-op-v13','d-d'].includes(data.systemId)||!data.sheet||typeof data.sheet!=='object'||Array.isArray(data.sheet))throw Error('PDF sem uma ficha compativel do aplicativo.');
  if(data.systemId==='gurps' && (data.sheet.systemId!=='gurps'||data.sheet.edition!=='4e'||!data.sheet.attrs||!data.sheet.mod))throw Error('Dados GURPS incompatíveis.');
  if(data.systemId==='sistema-op-v13' && (typeof data.sheet.class!=='string'||!data.sheet.attrs||!data.sheet.resources))throw Error('Dados de Ordem Paranormal incompatíveis.');
  if(data.systemId==='d-d' && (data.sheet.systemId!=='d-d'||data.sheet.edition!=='5e-2014'||!data.sheet.attrs||!data.sheet.klass))throw Error('Dados de D&D 5e (2014) incompatíveis.');
  if(data.items!==undefined && !Array.isArray(data.items))throw Error('Inventario invalido.');
  if(te.encode(JSON.stringify(data)).length>1_900_000)throw Error('Ficha excede 1,9 MB. Reduza o tamanho dos retratos.');
  return data;
 }
 function summarize(data){
  const s=data.sheet,prefix=data.systemId==='gurps'?'GURPS 4a EDICAO':data.systemId==='d-d'?'D&D 5E 2014':'ORDEM PARANORMAL 1.3';
  const lines=[
   'RPG MESA  |  FICHA PORTATIL',prefix,'Personagem: '+limit(s.name||'Sem nome',85),
   'Formato: '+SCHEMA,'Esta ficha inclui dados completos no anexo JSON do PDF.','','ATRIBUTOS'
  ];
  const keys=data.systemId==='gurps'?['ST','DX','IQ','HT']:data.systemId==='d-d'?['STR','DEX','CON','INT','WIS','CHA']:['Força','Agilidade','Vigor','Intelecto','Presença'];
  for(const k of keys)lines.push(limit(k,26)+': '+limit(s.attrs?.[k]??'-',40));
  lines.push('','RECURSOS E PROGRESSAO');
  if(data.systemId==='gurps'){
   lines.push('HP atual: '+limit(s.currentHP,24),'FP atual: '+limit(s.currentFP,24),'Pontos: '+limit(s.pointBudget,24),'Edicao: 4e');
  }else if(data.systemId==='d-d'){
   lines.push('Classe: '+limit(s.klass,60),'Nivel: '+limit(s.level,20),'Antecedente: '+limit(s.background,60),'PV: '+limit(s.hitPointsCurrent,16)+' / '+limit(s.hitPointsMax,16));
  }else{
   lines.push('Classe: '+limit(s.class,60),'Origem: '+limit(s.origin,60),'Trilha: '+limit(s.trail,60),'NEX: '+limit(s.nex,20));
   for(const [k,v] of Object.entries(s.resources||{}).slice(0,18))lines.push(limit(k,30)+': '+limit(v,50));
  }
  const add=(title,values,fn)=>{if(!Array.isArray(values)||!values.length)return;lines.push('',title);for(const v of values.slice(0,70))lines.push(limit(fn(v),108));if(values.length>70)lines.push('[Lista completa disponivel no anexo JSON]')};
  if(data.systemId==='gurps'){
   add('PERICIAS',s.skills,v=>v.name+' | '+v.attr+'/'+v.diff+' | '+v.points+' pts');
   add('VANTAGENS',s.advantages,v=>v.name+' | '+v.points+' pts');
   add('DESVANTAGENS',s.disadvantages,v=>v.name+' | '+v.points+' pts');
   add('EQUIPAMENTO',s.items,v=>v.name+' | qtd '+(v.qty||1));
   add('ARMAS',s.weapons,v=>v.name+' | '+(v.damage||''));
   add('MAGIAS',s.spells,v=>v.name);
  }else if(data.systemId==='d-d'){
   add('PERICIAS TREINADAS',s.skillProficiencies,v=>v);
   add('ESPECIALIZACOES',s.expertise,v=>v);
   add('MAGIAS',s.spells,v=>v.name||v);
   add('INVENTARIO',s.inventory,v=>v.name||v);
   add('HABILIDADES',s.features,v=>v.name||v);
  }else{
   const skills=s.skills||{};lines.push('', 'PERICIAS');
   const origin=typeof window!=='undefined'?window.OP13?.pack?.origens?.find(o=>o.nome===s.origin):null;
   const grades={...Object.fromEntries((origin?.pericias||[]).map(k=>[k,1])),...skills};
   for(const [key,value] of Object.entries(grades).slice(0,65)){const rank=typeof value==='number'?value:typeof value==='string'?({treinado:1,veterano:2,expert:3}[value.toLowerCase()]??(Number(value)||0)):Number(value?.grade??value?.level??0);lines.push(limit(key,42)+': +'+([5,10,15].includes(rank)?rank:Math.max(0,Math.min(3,rank))*5));}
   add('INVENTARIO',data.items||[],v=>typeof window!=='undefined'&&window.MastermindItemNames?.format?.(v)||v.nome||v.name||'Item');
   add('PODERES',s.powers,v=>typeof v==='string'?v:v.nome||v.name||'Poder');
   add('RITUAIS',s.rituaisConhecidos,v=>typeof v==='string'?v:v.nome||v.name||'Ritual');
  }
  lines.push('','IMPORTANTE: use Importar PDF no app para restaurar campos e regras.');
  return lines;
 }
 function pdfText(s){return limit(s,115).replace(/[\\()]/g,'\\$&')}
 function makePdf(data){
  data=check(copy(data));
  const json=JSON.stringify(data);
  const body=TAG_START+json+TAG_END;
  const lines=summarize(data);
  const pages=[];
  for(let i=0;i<lines.length;i+=47)pages.push(lines.slice(i,i+47));
  if(pages.length>20)throw Error('Ficha muito longa para exportar.');
  const count=pages.length,fsId=4+2*count,embeddedId=fsId+1;
  const objects=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles << /Names [(ficha-rpg.json) '+fsId+' 0 R] >> >> >>';
  objects[2]='<< /Type /Pages /Count '+count+' /Kids ['+pages.map((_,i)=>(4+i*2)+' 0 R').join(' ')+'] >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  pages.forEach((ls,i)=>{
   const pageId=4+i*2,contentId=pageId+1;
   objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>';
   let commands=['0.12 0.12 0.16 rg','BT','/F1 11 Tf','15 TL','45 791 Td'];
   for(let j=0;j<ls.length;j++){if(j===0)commands.push('/F1 17 Tf');if(j===1)commands.push('/F1 11 Tf');commands.push('('+pdfText(ls[j])+') Tj');if(j!==ls.length-1)commands.push('T*');}
   commands.push('ET');const stream=commands.join('\n')+'\n';
   objects[contentId]='<< /Length '+te.encode(stream).length+' >>\nstream\n'+stream+'endstream';
  });
  objects[fsId]='<< /Type /Filespec /F (ficha-rpg.json) /UF (ficha-rpg.json) /EF << /F '+embeddedId+' 0 R >> >>';
  objects[embeddedId]='<< /Type /EmbeddedFile /Subtype /application#2Fjson /Length '+te.encode(body).length+' >>\nstream\n'+body+'\nendstream';
  let pdf='%PDF-1.4\n%RPG-SHEET-PDF\n',offsets=[0];
  for(let i=1;i<objects.length;i++){
   offsets[i]=te.encode(pdf).length;
   pdf+=i+' 0 obj\n'+objects[i]+'\nendobj\n';
  }
  const xref=te.encode(pdf).length;
  pdf+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';
  return te.encode(pdf);
 }
 function readPdf(bytes){
  if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
  if(bytes.length<200||bytes.length>2_600_000)throw Error('PDF fora do limite aceito (2,6 MB).');
  const pdf=td.decode(bytes);
  if(!pdf.startsWith('%PDF-'))throw Error('O arquivo nao e um PDF valido.');
  const pos=pdf.indexOf(TAG_START),end=pdf.indexOf(TAG_END,pos+TAG_START.length);
  if(pos<0||end<0||end-pos>2_000_000)throw Error('Este PDF nao inclui o anexo de dados RPG. Importe uma ficha exportada por este aplicativo.');
  if(pdf.slice(Math.max(0,pos-100),pos).indexOf('stream')<0)throw Error('Anexo de dados ausente.');
  let obj;try{obj=JSON.parse(pdf.slice(pos+TAG_START.length,end));}catch{throw Error('Os dados da ficha estao corrompidos.');}
  return check(obj);
 }
 function exported(systemId,sheet,items){
  return check({kind:SCHEMA,systemId,edition:systemId==='gurps'?'4e':systemId==='d-d'?'5e-2014':'1.3',exportedAt:new Date().toISOString(),sheet:copy(sheet),...(items?{items:copy(items)}:{})});
 }
 function saveBytes(bytes,filename){
  if(typeof window==='undefined')return;
  const name=cleanName(filename.replace(/\.pdf$/i,''))+'.pdf';
  if(window.RpgSheetPdfBridge?.savePdf){
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   window.RpgSheetPdfBridge.savePdf(name,btoa(binary));return;
  }
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 function storeOP(data){
  if(window.__rpgRemoteSheetEditing)throw Error('Encerre a edicao online antes da importacao.');
  const op=window.OP13;if(!op||!op.pack?.classes?.[data.sheet.class])throw Error('Classe nao cadastrada neste modulo de Ordem.');
  const create=document.querySelector('#rpg05-new-char'),sel=document.querySelector('#rpg05-char-select');
  if(!create||!sel)throw Error('Criador de fichas de Ordem indisponivel.');
  create.click();const id=sel.value;
  if(!id||!op.changeCharacter(data.sheet))throw Error('Nao foi possivel importar os dados.');
  const raw=JSON.parse(localStorage.getItem('rpg-v05-characters')||'[]');
  const record=raw.find(x=>x.id===id);if(!record)throw Error('Nova ficha nao encontrada.');
  record.character=op.state;record.name=op.state.name||'Novo agente';
  localStorage.setItem('rpg-v05-characters',JSON.stringify(raw));
  if(Array.isArray(data.items))window.RPG05_inventory?.setItems?.(data.items.slice(0,120));
  document.querySelector('#op-view-ficha')?.dispatchEvent(new Event('change',{bubbles:true}));
  window.RPG05_inventory?.render?.();
  sel.dispatchEvent(new Event('change',{bubbles:true}));
  window.RPG_DEMO?.navigate?.('sheet');
 }
 function importData(data){
  check(data);
  if(data.systemId==='gurps'){
   const mod=window.RPG16_GURPS;
   if(!mod?.importObject)throw Error('Modulo GURPS nao carregado.');
   mod.importObject(data.sheet);mod.open();return;
  }
  if(data.systemId==='d-d'){
   const mod=window.RPG18_DND;if(!mod?.importObject)throw Error('Modulo D&D 5e nao carregado.');
   mod.importObject(data.sheet);mod.open();return;
  }
  storeOP(data);
 }
 function attachOP(){
  const screen=document.querySelector('#screen-sheet');
  if(!screen||screen.querySelector('#r17-op-panel'))return;
  const el=document.createElement('section');el.id='r17-op-panel';el.className='r17-export-panel';
  el.innerHTML='<h3>Ficha portatil em PDF</h3><p>Exporte em PDF legivel com JSON anexado. Ao importar, cria um novo personagem sem substituir sua ficha atual.</p><div class="r17-actions"><button type="button" data-r17="op-export">Exportar ficha em PDF</button><label>Importar ficha PDF<input type="file" accept=".pdf,application/pdf" data-r17="op-import" hidden></label></div><small class="r17-msg" aria-live="polite"></small>';
  screen.querySelector('.page-row')?.insertAdjacentElement('afterend',el);
  el.addEventListener('click',e=>{
   if(e.target.closest('[data-r17="op-export"]')){
    try{
     if(window.__rpgRemoteSheetEditing)throw Error('Nao exporte enquanto edita a ficha remota.');
     const sheet=window.OP13.state,id=document.querySelector('#rpg05-char-select')?.value;
     let inv={};try{inv=JSON.parse(localStorage.getItem('rpg-v05-items')||'{}')}catch{}
     const d=exported('sistema-op-v13',sheet,Array.isArray(inv[id])?inv[id]:[]);
     saveBytes(makePdf(d),'ordem-'+(sheet.name||'personagem')+'.pdf');message(el,'PDF preparado.');
    }catch(err){message(el,err.message,true)}
   }
  });
  el.querySelector('input').addEventListener('change',e=>readFile(e,el));
 }
 function attachGurps(box){
  if(!box||box.querySelector('.r17-export-panel'))return;
  const el=document.createElement('section');el.className='r17-export-panel';
  el.innerHTML='<h3>Ficha GURPS em PDF</h3><p>PDF com atributos, pericias e JSON anexado. A importacao cria outra ficha sem sobrescrever a original.</p><div class="r17-actions"><button type="button" data-r17="gurps-export">Exportar ficha em PDF</button><label>Importar ficha PDF<input type="file" accept=".pdf,application/pdf" data-r17="gurps-import" hidden></label></div><small class="r17-msg" aria-live="polite"></small>';
  box.appendChild(el);
  el.addEventListener('click',e=>{if(!e.target.closest('[data-r17="gurps-export"]'))return;
   try{const s=window.RPG16_GURPS?.current;if(!s)throw Error('Abra uma ficha GURPS primeiro.');
    saveBytes(makePdf(exported('gurps',s)),'gurps-'+(s.name||'personagem')+'.pdf');message(el,'PDF preparado.');
   }catch(err){message(el,err.message,true)}});
  el.querySelector('input').addEventListener('change',e=>readFile(e,el));
 }
 function attachDnd(box){
  if(!box||box.querySelector('.r17-export-panel'))return;
  const el=document.createElement('section');el.className='r17-export-panel';
  el.innerHTML='<h3>Ficha D&D 5e em PDF</h3><p>PDF legivel com dados completos anexados em JSON. Importar cria um novo personagem.</p><div class="r17-actions"><button type="button" data-r17="dnd-export">Exportar ficha em PDF</button><label>Importar ficha PDF<input type="file" accept=".pdf,application/pdf" data-r17="dnd-import" hidden></label></div><small class="r17-msg" aria-live="polite"></small>';
  box.appendChild(el);
  el.addEventListener('click',e=>{if(!e.target.closest('[data-r17="dnd-export"]'))return;
   try{const s=window.RPG18_DND?.current;if(!s)throw Error('Crie uma ficha D&D primeiro.');
    saveBytes(makePdf(exported('d-d',s)),'dnd5e-'+(s.name||'personagem')+'.pdf');message(el,'PDF preparado.');
   }catch(err){message(el,err.message,true)}});
  el.querySelector('input').addEventListener('change',e=>readFile(e,el));
 }
 async function readFile(e,box){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
   if(file.size>2_600_000)throw Error('PDF excede o limite de 2,6 MB.');
   const data=readPdf(new Uint8Array(await file.arrayBuffer()));
   const n=data.sheet?.name||'Personagem';
   if(typeof confirm==='function'&&!confirm('Importar como novo personagem: '+String(n).slice(0,95)+'?'))return;
   importData(data);message(box,'Ficha importada como novo personagem.');
  }catch(err){message(box,'Nao foi possivel importar: '+err.message,true)}
 }
 function message(el,msg,error=false){const box=el.querySelector('.r17-msg');if(box){box.textContent=msg;box.style.color=error?'#ff938d':'var(--accent)';}}
 if(typeof document!=='undefined'){
  const style=document.createElement('style');style.textContent='.r17-export-panel{background:var(--panel);border:1px solid var(--line);border-radius:13px;margin:13px 0;padding:16px}.r17-export-panel h3{font:600 23px Cormorant Garamond,Georgia,serif;margin:0 0 5px}.r17-export-panel p{font-size:11px;color:var(--muted);line-height:1.6}.r17-actions{display:flex;gap:10px;flex-wrap:wrap}.r17-actions button,.r17-actions label{display:inline-flex;align-items:center;justify-content:center;padding:11px 13px;border:1px solid var(--accent);color:var(--fg);background:var(--panel2);border-radius:9px;cursor:pointer;font:600 12px system-ui}.r17-actions button{background:var(--accent);color:#15121b}.r17-msg{display:block;margin-top:8px}';document.head.appendChild(style);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attachOP,{once:true});else attachOP();
 }
 return {SCHEMA,makePdf,readPdf,exported,check,attachOP,attachGurps,attachDnd,summarize};
});
