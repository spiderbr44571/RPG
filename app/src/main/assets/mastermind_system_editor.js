/* Mastermind v0.97 — editable per-system local overlays, independent of bundled rulebooks.
   Never writes to book packs. Undo/restore is possible without destroying characters. */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MastermindSystemEditor=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const STORAGE='mastermind-system-editor-v097';
 const TYPES={powers:'Poderes de classe',paranormal:'Poderes paranormais',abilities:'Habilidades',rituals:'Rituais e magias',progression:'Evolução',skills:'Perícias',equipment:'Equipamentos'};
 const MAX_ITEMS=450;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const key=x=>String(x||'').slice(0,160);
 function load(){
  try{const data=JSON.parse(root.localStorage?.getItem(STORAGE)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return{}}
 }
 let state=load();
 function system(id){return clone(state[id]||{metadata:{},overrides:{},deleted:{}});}
 function put(id,value){
  if(!id||!value||typeof value!=='object')return false;
  const safe=clone(value);
  if(JSON.stringify(safe).length>450000)throw Error('Personalização muito grande (limite 450 KB por sistema).');
  const old=state[id];state[id]=safe;
  try{root.localStorage?.setItem(STORAGE,JSON.stringify(state));}
  catch(e){if(old===undefined)delete state[id];else state[id]=old;throw Error('Não foi possível salvar: espaço local insuficiente.');}
  root.document?.dispatchEvent(new CustomEvent('mastermind:system-edited',{detail:{systemId:id}}));return true;
 }
 function setMetadata(id,patch){
  const data=system(id);data.metadata={...data.metadata,...Object.fromEntries(Object.entries(patch||{}).filter(([k])=>['name','description','photo','edition'].includes(k)).map(([k,v])=>[k,String(v||'').slice(0,k==='photo'?480000:6000)]))};return put(id,data);
 }
 function all(id,type,base=[]){
  const s=system(id),custom=s.overrides?.[type]||{},deleted=s.deleted?.[type]||[];
  const seen=new Set(),results=[];
  for(const item of base){
   const n=typeof item==='string'?item:item?.name||item?.nome||'',identifier=key(item?.id||n);
   if(!n||deleted.includes(identifier)||seen.has(identifier))continue;
   results.push({...((typeof item==='string')?{}:clone(item)),name:n,id:identifier,...(custom[identifier]||{})});
   seen.add(identifier);
  }
  for(const [identifier,item] of Object.entries(custom)){
   if(!seen.has(identifier)&&!deleted.includes(identifier)&&item?.name){results.push({...clone(item),id:identifier});seen.add(identifier);}
  }
  return results;
 }
 function saveItem(id,type,item,previousId){
  if(!TYPES[type])throw Error('Tipo de conteúdo inválido.');
  const s=system(id),current=s.overrides?.[type]||{},blocked=s.deleted?.[type]||[];
  const name=String(item?.name||'').trim().slice(0,100);
  if(!name)throw Error('Informe o nome.');
  const idNew=key(previousId||item.id||name);
  if(!idNew)throw Error('Identificador inválido.');
  const count=Object.keys(current).length;
  if(count>=MAX_ITEMS&&!Object.prototype.hasOwnProperty.call(current,idNew))throw Error('Limite de '+MAX_ITEMS+' itens personalizados.');
  const clean={name,description:String(item.description||'').slice(0,12000),className:String(item.className||'').slice(0,100),element:String(item.element||'').slice(0,100),minNex:Math.max(0,Math.min(100,Number(item.minNex)||0)),cost:String(item.cost||'').slice(0,100),requirements:String(item.requirements||'').slice(0,3000)};
  s.overrides={...s.overrides,[type]:{...current,[idNew]:clean}};
  s.deleted={...s.deleted,[type]:blocked.filter(x=>x!==idNew)};
  return put(id,s);
 }
 function removeItem(id,type,itemId){
  if(!TYPES[type])throw Error('Tipo inválido');
  const s=system(id),k=key(itemId),current={...(s.overrides?.[type]||{})};
  delete current[k];s.overrides={...s.overrides,[type]:current};
  s.deleted={...s.deleted,[type]:[...new Set([...(s.deleted?.[type]||[]),k])]};
  return put(id,s);
 }
 function restoreItem(id,type,itemId){
  const s=system(id);s.deleted={...s.deleted,[type]:(s.deleted?.[type]||[]).filter(x=>x!==key(itemId))};
  s.overrides={...s.overrides,[type]:Object.fromEntries(Object.entries(s.overrides?.[type]||{}).filter(([k])=>k!==key(itemId)))};
  return put(id,s);
 }
 function reset(id){delete state[id];root.localStorage?.setItem(STORAGE,JSON.stringify(state));root.document?.dispatchEvent(new CustomEvent('mastermind:system-edited',{detail:{systemId:id}}));}
 function defaults(id,type){
  const p=root.OP13?.pack||{},cl=root.MastermindClassCatalog?.classPowers||{};
  if(id!=='ordem-paranormal')return [];
  if(type==='powers')return Object.entries(cl).flatMap(([className,names])=>names.map(name=>({id:name,name,className})));
  if(type==='paranormal')return (p.poderesParanormais||[]).map(x=>({id:x.nome,name:x.nome,element:x.elemento,description:x.resumo||''}));
  if(type==='rituals')return (p.rituais||[]).map(x=>({id:x.id||x.nome,name:x.nome||x.id,element:x.elemento||'',description:x.resumo||''}));
  if(type==='skills')return (p.pericias||[]).map(x=>({id:x.nome,name:x.nome,element:x.atributo||''}));
  if(type==='progression')return (p.progressao||[]).map(x=>({id:String(x.nex),name:'NEX '+x.nex+'%',minNex:x.nex,description:'Limite PE: '+(x.limitePE||'')}));
  return [];
 }
 function powerOptions(kind,className,base){
  const type=kind==='class'?'powers':'paranormal',items=all('ordem-paranormal',type,base);
  return items.filter(x=>kind!=='class'||!x.className||x.className===className);
 }
 function curseNames(v){
  const source=v?.maldicoes??v?.maldições??v?.curses??[];
  if(!Array.isArray(source))return [];
  return [...new Set(source.map(x=>typeof x==='string'?x:x?.nome||x?.name||'').filter(Boolean).map(x=>String(x).trim()))];
 }
 function displayItem(it){
  const name=typeof it==='string'?it:String(it?.nome||it?.name||'Item'),curses=typeof it==='string'?[]:curseNames(it);
  return name+(curses.length?' ('+curses.join(', ')+')':'');
 }
 const doc=root.document;
 let currentId='',currentType='powers',editId='',mounted=false;
 function canMount(){return !!doc?.querySelector('.r15-detail');}
 function detailTitle(id){const original=root.RPG15_SYSTEMS?.systems?.find(s=>s.id===id);return system(id).metadata?.name||original?.title||id;}
 function uiItems(){return all(currentId,currentType,defaults(currentId,currentType));}
 function show(){
  const holder=doc?.getElementById('mse-panel');if(!holder)return;
  const s=system(currentId),items=uiItems();
  holder.innerHTML='<div class="mse-head"><h3>Editar sistema · '+esc(detailTitle(currentId))+'</h3><p>Personalização local e reversível. Dados oficiais de origem não são sobrescritos. Regras automáticas exigem compatibilidade com o motor do sistema.</p></div>'+
   '<div class="mse-grid"><label>Nome<input id="mse-name" maxlength="100" value="'+esc(s.metadata?.name||detailTitle(currentId))+'"></label><label>Edição<input id="mse-edition" maxlength="80" value="'+esc(s.metadata?.edition||'')+'"></label>'+
   '<label class="mse-wide">Descrição<textarea id="mse-description" rows="2" maxlength="6000">'+esc(s.metadata?.description||'')+'</textarea></label>'+
   '<label class="mse-wide">Imagem do sistema <input type="file" id="mse-photo" accept="image/png,image/jpeg,image/webp"></label></div>'+
   '<div class="mse-actions"><button data-mse-save-meta>Salvar informações</button><button data-mse-reset>Restaurar sistema original</button></div>'+
   '<div class="mse-rule"><label>Editar conteúdo<select id="mse-type">'+Object.entries(TYPES).map(([k,n])=>'<option value="'+k+'" '+(currentType===k?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>'+
   '<button data-mse-new>+ Criar entrada</button></div>'+
   '<div class="mse-list">'+(items.length?items.slice(0,150).map(v=>'<div><b>'+esc(v.name)+'</b><small>'+esc([v.className,v.element,v.description].filter(Boolean).join(' · ').slice(0,140))+'</small><span><button data-mse-edit="'+esc(v.id)+'">Editar</button><button data-mse-delete="'+esc(v.id)+'">Excluir</button></span></div>').join(''):'<p>Nenhum conteúdo nesta categoria.</p>')+'</div>'+
   '<p class="mse-warning">Itens excluídos só são ocultados neste sistema. Personagens existentes não são excluídos.</p><div id="mse-item-editor" hidden></div><small id="mse-message" role="status"></small>';
 }
 function itemForm(item){
  const host=doc.getElementById('mse-item-editor');if(!host)return;
  const t=item||{};
  host.hidden=false;host.innerHTML='<h4>'+(editId?'Editar entrada':'Nova entrada')+'</h4><label>Nome<input id="mse-item-name" maxlength="100" value="'+esc(t.name||'')+'"></label>'+
   '<label>Classe (quando aplicável)<input id="mse-item-class" maxlength="100" value="'+esc(t.className||'')+'"></label>'+
   '<label>Elemento ou atributo<input id="mse-item-element" maxlength="100" value="'+esc(t.element||'')+'"></label>'+
   '<label>NEX mínimo<input id="mse-item-nex" type="number" min="0" max="100" value="'+esc(t.minNex||0)+'"></label>'+
   '<label>Custo<input id="mse-item-cost" maxlength="100" value="'+esc(t.cost||'')+'"></label>'+
   '<label class="mse-wide">Requisitos<textarea id="mse-item-req" rows="2">'+esc(t.requirements||'')+'</textarea></label>'+
   '<label class="mse-wide">Descrição<textarea id="mse-item-desc" rows="3">'+esc(t.description||'')+'</textarea></label>'+
   '<div class="mse-actions"><button data-mse-save-item>Salvar conteúdo</button><button data-mse-cancel>Cancelar</button></div>';
  host.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 function css(){
  if(doc.getElementById('mse-style'))return;
  const style=doc.createElement('style');style.id='mse-style';style.textContent='.mse-open{display:inline-flex;margin:10px 0;padding:11px 16px;border:1px solid var(--accent);border-radius:10px;background:var(--panel2);color:var(--fg);font-weight:700}.mse{margin:18px 0;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--fg)}.mse[hidden],#mse-item-editor[hidden]{display:none!important}.mse h3{margin:2px 0 7px;font:600 23px Georgia,serif}.mse p{font-size:12px;color:var(--muted)}.mse-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mse label{display:grid;gap:5px;font-size:12px}.mse input,.mse select,.mse textarea{width:100%;min-width:0;padding:10px;border-radius:8px;border:1px solid var(--line);background:var(--panel2);color:var(--fg);font:inherit}.mse-wide{grid-column:1/-1}.mse-actions,.mse-rule{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin:12px 0}.mse button{border:1px solid var(--accent);background:var(--panel2);color:var(--fg);border-radius:8px;padding:9px 11px;cursor:pointer}.mse button:hover{background:var(--accent);color:var(--bg)}.mse-list{max-height:420px;overflow:auto;display:grid;gap:5px}.mse-list>div{border:1px solid var(--line);padding:10px;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}.mse-list b{min-width:150px}.mse-list small{color:var(--muted);flex:1;min-width:100px}.mse-list span{display:flex;gap:5px}#mse-item-editor{margin-top:14px;display:grid;gap:9px;padding:13px;border:1px solid var(--accent);border-radius:10px}@media(max-width:650px){.mse-grid{grid-template-columns:1fr}.mse-list>div{display:grid}}';
  doc.head.append(style);
 }
 function attach(){
  if(!canMount())return false;
  const detail=doc.querySelector('.r15-detail');
  if(!detail.querySelector('.mse-open')){
   const button=doc.createElement('button');button.className='mse-open';button.type='button';button.textContent='Editar sistema';
   const hero=detail.querySelector('.r15-detail-hero');hero?.insertAdjacentElement('afterend',button);
   const panel=doc.createElement('section');panel.id='mse-panel';panel.className='mse';panel.hidden=true;button.insertAdjacentElement('afterend',panel);
  }
  const button=detail.querySelector('.mse-open'),panel=detail.querySelector('#mse-panel');
  if(!panel||panel.dataset.bound)return !!panel;
  panel.dataset.bound='1';
  button.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)show();});
  panel.addEventListener('change',async e=>{
   if(e.target.id==='mse-type'){currentType=e.target.value;show();return;}
   if(e.target.id!=='mse-photo')return;
   const f=e.target.files?.[0];if(!f)return;
   if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>2*1024*1024){root.alert?.('Escolha uma imagem PNG/JPG/WebP até 2 MB.');return;}
   const reader=new FileReader();
   reader.onload=()=>{try{setMetadata(currentId,{photo:reader.result});show();}catch(ex){root.alert?.(ex.message)}};
   reader.readAsDataURL(f);
  });
  panel.addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn)return;
   try{
    if(btn.hasAttribute('data-mse-save-meta')){
     setMetadata(currentId,{name:panel.querySelector('#mse-name')?.value||'',edition:panel.querySelector('#mse-edition')?.value||'',description:panel.querySelector('#mse-description')?.value||''});show();
    }else if(btn.hasAttribute('data-mse-reset')){
     if(root.confirm?.('Restaurar apenas personalizações deste sistema? Personagens serão preservados.')){reset(currentId);show();}
    }else if(btn.hasAttribute('data-mse-new')){editId='';itemForm();}
    else if(btn.dataset.mseEdit){editId=btn.dataset.mseEdit;itemForm(uiItems().find(x=>x.id===editId));}
    else if(btn.dataset.mseDelete){if(root.confirm?.('Excluir esta entrada do sistema personalizado?')){removeItem(currentId,currentType,btn.dataset.mseDelete);show();}}
    else if(btn.hasAttribute('data-mse-cancel')){editId='';show();}
    else if(btn.hasAttribute('data-mse-save-item')){
     const val=s=>panel.querySelector('#mse-item-'+s)?.value||'';
     saveItem(currentId,currentType,{name:val('name'),className:val('class'),element:val('element'),minNex:val('nex'),cost:val('cost'),requirements:val('req'),description:val('desc')},editId);
     editId='';show();
    }
   }catch(ex){root.alert?.(ex.message);const msg=panel.querySelector('#mse-message');if(msg)msg.textContent=ex.message;}
  });
  return true;
 }
 if(doc){
  css();
  doc.addEventListener('mastermind:system-open',e=>{currentId=e.detail?.systemId||'';editId='';const detail=doc.querySelector('.r15-detail');
   // The library recreates the entire detail element on every system change.
   const button=detail?.querySelector('.mse-open');if(button)button.remove();
   const panel=detail?.querySelector('#mse-panel');if(panel)panel.remove();
   attach();
  });
 }
 return {TYPES,load,system,setMetadata,all,saveItem,removeItem,restoreItem,reset,defaults,powerOptions,curseNames,displayItem};
});
