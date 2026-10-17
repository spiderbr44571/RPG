/* v0.18 - Bestiário separado por sistema, sem tocar no grimório original de Ordem. */
(()=>{'use strict';
 const best=document.querySelector('#screen-bestiary'),cat=window.RPG15_SYSTEMS;
 if(!best||!cat?.systems?.length)return;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KEY='rpg18-bestiary-by-system-v1',SEL='rpg18-bestiary-selected-system';
 const systems=cat.systems,valid=new Set(systems.map(x=>x.id));
 let data={};try{data=JSON.parse(localStorage.getItem(KEY)||'{}');if(!data||typeof data!=='object'||Array.isArray(data))data={}}catch{data={}}
 let system=localStorage.getItem(SEL)||'ordem-paranormal';if(!valid.has(system))system='ordem-paranormal';
 let edit=null;
 // Records are short original SRD 5.1 stat summaries, not protected descriptive passages.
 const dnd=[
  {id:'srd51-goblin',name:'Goblin',hp:7,defense:15,challenge:'1/4',bonus:4,roll:'1d6+2',type:'Humanoide',source:'SRD 5.1 · D&D 5e (2014)',notes:'Ações e traços especiais devem ser consultados no SRD.',verified:true},
  {id:'srd51-wolf',name:'Lobo',hp:11,defense:13,challenge:'1/4',bonus:4,roll:'2d4+2',type:'Animal',source:'SRD 5.1 · D&D 5e (2014)',notes:'Ações e traços especiais devem ser consultados no SRD.',verified:true},
  {id:'srd51-skeleton',name:'Esqueleto',hp:13,defense:13,challenge:'1/4',bonus:4,roll:'1d6+2',type:'Morto-vivo',source:'SRD 5.1 · D&D 5e (2014)',notes:'Consulte resistências e outras regras no SRD.',verified:true}
 ];
 const original=document.createElement('div');original.id='r18-original-bestiary';original.hidden=true;
 while(best.firstChild)original.append(best.firstChild);
 const header=document.createElement('section');header.className='r18-best-head';
 header.innerHTML='<div class="eyebrow">BESTIÁRIO MULTISSISTEMA</div><h1 class="page-h">Criaturas <i>por sistema.</i></h1><p>Os registros não misturam regras nem versões. O grimório de Ordem Paranormal permanece preservado.</p>'+
  '<div class="r18-best-filter"><label for="r18-best-system">Sistema RPG</label><select id="r18-best-system"></select><span id="r18-best-count"></span></div>';
 const panel=document.createElement('section');panel.id='r18-best-panel';
 best.append(header,original,panel);
 header.querySelector('select').innerHTML=systems.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.title)+'</option>').join('');
 function items(){const built=system==='d-d'?dnd:[],custom=Array.isArray(data[system])?data[system]:[];return built.concat(custom)}
 function persist(){localStorage.setItem(KEY,JSON.stringify(data))}
 function systemTitle(){return systems.find(s=>s.id===system)?.title||'Sistema'}
 function uid(){return 'personal-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)}
 function itemMarkup(m){
  return '<article class="r18-beast-card"><div class="r18-beast-meta"><small>'+esc(m.verified?'Referência SRD 5.1':'Criatura personalizada')+'</small><span>'+esc(m.challenge||'Sem nível')+'</span></div>'+
   '<h3>'+esc(m.name)+'</h3><p>'+esc(m.type||'Criatura')+'</p>'+
   '<div class="r18-beast-stats"><div><small>'+(system==='d-d'?'PV':'Vida')+'</small><strong>'+esc(m.hp)+'</strong></div><div><small>'+(system==='d-d'?'CA':'Defesa')+'</small><strong>'+esc(m.defense)+'</strong></div><div><small>'+(system==='d-d'?'ND':'Nível')+'</small><strong>'+esc(m.challenge||'—')+'</strong></div></div>'+
   '<p class="r18-beast-note">'+esc(m.notes||'Descrição e regras específicas dependem do livro cadastrado.')+'</p>'+
   '<small class="r18-beast-source">'+esc(m.source||'Cadastro local')+'</small>'+
   '<div class="r18-beast-actions">'+(m.verified?'<button data-r18-duplicate="'+esc(m.id)+'">Personalizar cópia</button>':
    '<button data-r18-edit="'+esc(m.id)+'">Editar</button><button data-r18-delete="'+esc(m.id)+'">Excluir</button>')+'</div></article>';
 }
 function draw(){
  header.querySelector('#r18-best-system').value=system;
  original.hidden=system!=='ordem-paranormal';panel.hidden=system==='ordem-paranormal';
  header.querySelector('#r18-best-count').textContent=system==='ordem-paranormal'?'Grimório original e criaturas personalizadas':items().length+' criatura(s) cadastrada(s)';
  if(system==='ordem-paranormal')return;
  const ms=items();
  panel.innerHTML='<div class="r18-best-toolbar"><div><h2>'+esc(systemTitle())+'</h2><p>'+(system==='d-d'?'Referências resumidas do SRD 5.1 (2014). Edição 2024 ainda não implementada.':'Cadastre as criaturas do seu livro. As regras deste sistema ainda precisam de validação.')+'</p></div><button id="r18-new-beast">+ Nova criatura</button></div>'+
   '<div class="r18-beast-grid">'+(ms.length?ms.map(itemMarkup).join(''):'<p>Nenhuma criatura cadastrada neste sistema.</p>')+'</div>'+
   '<div class="r18-best-editor" id="r18-best-editor" hidden></div>'+
   '<p class="r18-srd-note">Fontes SRD 5.1: Wizards of the Coast LLC — CC BY 4.0. Atribuição e licença: https://dnd.wizards.com/resources/systems-reference-document e https://creativecommons.org/licenses/by/4.0/ . As entradas SRD são somente resumos mecânicos; as ações completas ficam no documento de referência.</p>';
 }
 function showEditor(rec){
  const box=panel.querySelector('#r18-best-editor');if(!box)return;
  edit=rec?.id||null;
  box.hidden=false;
  box.innerHTML='<h3>'+(edit?'Editar criatura':'Criar criatura')+' · '+esc(systemTitle())+'</h3>'+
   '<form id="r18-best-form"><div class="r18-beast-fields">'+
   [['name','Nome','text'],['type','Tipo','text'],['hp','PV','number'],['defense','Defesa / CA','number'],['challenge','Nível ou desafio','text'],['bonus','Bônus de teste','number'],['roll','Fórmula de dados','text'],['source','Livro e página','text']].map(([id,label,type])=>'<label>'+label+'<input name="'+id+'" type="'+type+'" '+(id==='name'?'required maxlength="100"':'maxlength="160"')+' value="'+esc(rec?.[id]??'')+'"></label>').join('')+
   '<label class="r18-editor-wide">Anotações<textarea name="notes" rows="4" maxlength="1400">'+esc(rec?.notes||'')+'</textarea></label></div>'+
   '<div class="r18-beast-actions"><button type="submit">Salvar criatura</button><button type="button" id="r18-cancel">Cancelar</button></div></form>';
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 function validateRecord(form){
  const s=name=>String(form.elements.namedItem(name)?.value||'').trim();
  const num=(key,max)=>Math.max(0,Math.min(max,Number(s(key))||0));
  const name=s('name').slice(0,100);if(!name)throw Error('Informe o nome.');
  return {id:edit||uid(),name,type:s('type').slice(0,120),hp:num('hp',100000),defense:num('defense',999),challenge:s('challenge').slice(0,20),bonus:Math.max(-100,Math.min(100,Number(s('bonus'))||0)),roll:s('roll').slice(0,50),source:s('source').slice(0,140),notes:s('notes').slice(0,1400),systemId:system,verified:false};
 }
 header.querySelector('select').addEventListener('change',e=>{system=e.target.value;edit=null;localStorage.setItem(SEL,system);draw()});
 panel.addEventListener('click',e=>{
  const recId=id=>items().find(x=>x.id===id);
  if(e.target.closest('#r18-new-beast')){showEditor(null);return}
  if(e.target.closest('#r18-cancel')){panel.querySelector('#r18-best-editor').hidden=true;edit=null;return}
  const editBtn=e.target.closest('[data-r18-edit]');if(editBtn){const x=recId(editBtn.dataset.r18Edit);if(x)showEditor(x);return}
  const dup=e.target.closest('[data-r18-duplicate]');if(dup){const x=recId(dup.dataset.r18Duplicate);if(x)showEditor({...x,id:null,verified:false,source:x.source+' · adaptação local'});return}
  const del=e.target.closest('[data-r18-delete]');if(del){
   if(!confirm('Excluir esta criatura apenas do sistema '+systemTitle()+'?'))return;
   data[system]=(data[system]||[]).filter(x=>x.id!==del.dataset.r18Delete);persist();draw();
  }
 });
 panel.addEventListener('submit',e=>{
  if(e.target.id!=='r18-best-form')return;e.preventDefault();
  try{const record=validateRecord(e.target),arr=data[system]||[];
   if(arr.length>=150&&!arr.some(x=>x.id===record.id))throw Error('Limite de 150 criaturas por sistema.');
   const idx=arr.findIndex(x=>x.id===record.id);if(idx>=0)arr[idx]=record;else arr.push(record);data[system]=arr;persist();edit=null;draw();
  }catch(err){alert(err.message)}
 });
 const css=document.createElement('style');css.textContent='.r18-best-head{margin-bottom:20px}.r18-best-head>p{color:var(--muted);font-size:12px}.r18-best-filter{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:15px}.r18-best-filter label{font-size:12px}.r18-best-filter select{flex:1;min-width:145px;max-width:350px;padding:11px;color:var(--fg);background:var(--panel2);border:1px solid var(--line);border-radius:11px}.r18-best-filter span{color:var(--muted);font-size:10px}.r18-best-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;margin-bottom:12px}.r18-best-toolbar h2{font:600 30px Cormorant Garamond,Georgia,serif;margin:0}.r18-best-toolbar p{color:var(--muted);font-size:12px;max-width:550px}.r18-best-toolbar button,.r18-beast-actions button{padding:10px 13px;border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);border-radius:9px;cursor:pointer}.r18-beast-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.r18-beast-card{padding:17px;background:var(--panel);border:1px solid var(--line);border-radius:15px;min-width:0}.r18-beast-card h3{font:600 26px Cormorant Garamond,Georgia,serif;margin:8px 0 5px}.r18-beast-card p{font-size:11px;color:var(--muted)}.r18-beast-meta,.r18-beast-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}.r18-beast-meta small,.r18-beast-meta span{color:var(--accent);font-size:10px}.r18-beast-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:13px 0}.r18-beast-stats div{padding:10px;background:var(--panel2);border-radius:9px}.r18-beast-stats strong,.r18-beast-stats small{display:block;font-size:11px}.r18-beast-stats strong{font-size:19px}.r18-beast-source{display:block;color:var(--muted);font-size:10px;margin:12px 0}.r18-beast-note{min-height:38px}.r18-best-editor{padding:17px;border:1px solid var(--accent);border-radius:15px;margin:20px 0;background:var(--panel)}.r18-best-editor h3{font:600 24px Cormorant Garamond,Georgia,serif}.r18-beast-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.r18-beast-fields label{display:flex;flex-direction:column;gap:5px;font-size:11px}.r18-beast-fields input,.r18-beast-fields textarea{background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0}.r18-editor-wide{grid-column:1/-1}.r18-srd-note{color:var(--muted);font-size:10px;margin-top:25px}.r18-best-editor[hidden],#r18-original-bestiary[hidden],#r18-best-panel[hidden]{display:none!important}@media(max-width:580px){.r18-beast-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.r18-beast-card{padding:11px}.r18-beast-card h3{font-size:20px}.r18-beast-stats div{padding:6px}.r18-beast-stats strong{font-size:16px}.r18-beast-fields{grid-template-columns:1fr}}';
 document.head.append(css);draw();
 window.RPG18_BESTIARY={changeSystem:id=>{if(valid.has(id)){system=id;localStorage.setItem(SEL,id);draw()}},get currentSystem(){return system},listFor:id=>(id==='d-d'?dnd:[]).concat(Array.isArray(data[id])?data[id]:[])};
})();
