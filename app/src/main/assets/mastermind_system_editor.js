/* Mastermind: editable per-system metadata and rule catalog overlays.
 * Data is local per device; original curated sources remain untouched for safe reset.
 */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document)root.MastermindSystemEditor=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const KEY='mastermind-system-overrides-v1',IDS=['ordem-paranormal','d-d','gurps','chamado-de-ctchulhu'];
 const KINDS=['powers','abilities','rituals','progression'];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const clone=s=>JSON.parse(JSON.stringify(s));
 const norm=s=>String(s??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const clean=s=>String(s??'').trim().slice(0,1000);
 let store={};
 function load(){try{const raw=JSON.parse(root.localStorage?.getItem(KEY)||'{}');return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}}catch{return{}}}
 store=load();
 const validId=id=>IDS.includes(id);
 function get(id){return validId(id)?store[id]||{}:{}}
 function publish(){try{root.localStorage?.setItem(KEY,JSON.stringify(store))}catch{throw Error('Sem espaço local para salvar edição. Reduza a imagem.');}}
 function backup(id){return clone(get(id))}
 function ensure(id){if(!validId(id))throw Error('Sistema desconhecido');if(!store[id])store[id]={title:'',description:'',cover:'',catalogs:{}};return store[id]}
 function system(id){return root.RPG15_SYSTEMS?.systems?.find(s=>s.id===id)}
 function baseCatalog(id,kind){
  if(!validId(id)||!KINDS.includes(kind))return [];
  const op=root.OP13?.pack,cl=root.MastermindClassCatalog;
  if(id==='ordem-paranormal'){
   if(kind==='powers'){
    return [...Object.entries(cl?.classPowers||{}).flatMap(([klass,names])=>names.map(name=>({name,klass,kind:'class',minNex:cl.classPowerRules?.[name]?.minNex||0,description:'',requirements:clone(cl.classPowerRules?.[name]||{})}))),
     ...(op?.poderesParanormais||[]).map(p=>({name:p.nome,klass:'',kind:'paranormal',element:p.elemento||'',minNex:0,description:p.descricao||'',page:p.paginaLivro||0}))];
   }
   if(kind==='rituals')return (op?.rituais||[]).map(r=>({name:r.nome,kind:'ritual',id:r.id,element:r.elemento||'',level:r.circulo||1,cost:r.custoBasePE||0,page:r.paginaLivro||0,description:r.resumo||''}));
   if(kind==='progression')return (op?.progressao||[]).map(p=>({name:p.marco||('NEX '+p.nex),nex:p.nex,peLimit:p.limitePE||0,description:''}));
   if(kind==='abilities')return Object.entries(op?.classes||{}).flatMap(([klass,c])=>(c.trilhas||[]).map(name=>({name,klass,kind:'trail',description:''})));
  }
  return [];
 }
 // Snapshot curated defaults once; re-applying edits must not accumulate duplicates.
 const defaults={};
 function list(id,kind){const d=get(id);return Array.isArray(d.catalogs?.[kind])?clone(d.catalogs[kind]):baseCatalog(id,kind)}
 function apply(id){
  if(!validId(id))return false;
  const override=get(id),sys=system(id);
  if(sys){
   if(override.title)sys.title=override.title;
   if(override.description)sys.customDescription=override.description;
  }
  if(id==='ordem-paranormal'){
   const op=root.OP13?.pack,cls=root.MastermindClassCatalog;
   if(!op||!cls)return false;
   if(!defaults.ordem){
    defaults.ordem={powers:clone(cls.classPowers),rules:clone(cls.classPowerRules),paranormal:clone(op.poderesParanormais),rituals:clone(op.rituais),progression:clone(op.progressao)};
   }
   const d=defaults.ordem;
   // Mutate the original objects and arrays in place because the feature modules hold their references.
   for(const k of Object.keys(cls.classPowers))delete cls.classPowers[k];
   Object.assign(cls.classPowers,clone(d.powers));
   for(const k of Object.keys(cls.classPowerRules))delete cls.classPowerRules[k];
   Object.assign(cls.classPowerRules,clone(d.rules));
   op.poderesParanormais.splice(0,op.poderesParanormais.length,...clone(d.paranormal));
   op.rituais.splice(0,op.rituais.length,...clone(d.rituals));
   op.progressao.splice(0,op.progressao.length,...clone(d.progression));
   if(Array.isArray(override.catalogs?.powers)){
    for(const [klass] of Object.entries(cls.classPowers))cls.classPowers[klass]=[];
    for(const item of override.catalogs.powers){
     if(item.kind==='class'&&cls.classPowers[item.klass]){
      if(!cls.classPowers[item.klass].includes(item.name))cls.classPowers[item.klass].push(item.name);
      cls.classPowerRules[item.name]={...(item.requirements||{}),...(item.minNex?{minNex:Number(item.minNex)}:{})};
     }else if(item.kind==='paranormal')op.poderesParanormais.push({nome:item.name,categoria:'poder_paranormal',elemento:item.element||'',descricao:item.description||'',paginaLivro:item.page||0});
    }
   }
   if(Array.isArray(override.catalogs?.rituals))op.rituais.splice(0,op.rituais.length,...override.catalogs.rituals.map(x=>({id:x.id||norm(x.name).replace(/\s+/g,'-'),nome:x.name,categoria:'ritual',elemento:x.element||'',circulo:Number(x.level)||1,custoBasePE:Number(x.cost)||0,paginaLivro:Number(x.page)||0,resumo:x.description||''})));
   if(Array.isArray(override.catalogs?.progression))op.progressao.splice(0,op.progressao.length,...override.catalogs.progression.map(x=>({nex:Number(x.nex),limitePE:Number(x.peLimit)||0,marco:x.name})).sort((a,b)=>a.nex-b.nex));
  }
  return true;
 }
 function setMeta(id,meta){
  const d=ensure(id);
  if(meta.title!==undefined)d.title=clean(meta.title).slice(0,90);
  if(meta.description!==undefined)d.description=clean(meta.description).slice(0,1500);
  if(meta.cover!==undefined){if(meta.cover!==''&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(meta.cover))throw Error('Imagem inválida');if(meta.cover.length>900000)throw Error('Imagem muito grande');d.cover=meta.cover;}
  publish();apply(id);root.RPG15?.refresh?.();return backup(id);
 }
 function setCatalog(id,kind,items){
  if(!validId(id)||!KINDS.includes(kind))throw Error('Categoria inválida');
  if(!Array.isArray(items)||items.length>600)throw Error('Máximo de 600 entradas por categoria');
  const normalized=items.map(x=>{const o={...x,name:clean(x.name).slice(0,100),description:clean(x.description).slice(0,2200)};if(!o.name)throw Error('Cada entrada precisa de nome');return o;});
  const d=ensure(id);d.catalogs=d.catalogs||{};d.catalogs[kind]=normalized;
  publish();apply(id);return clone(normalized);
 }
 function reset(id){
  if(!validId(id))throw Error('Sistema inválido');delete store[id];publish();apply(id);root.RPG15?.refresh?.();
 }
 function show(id){
  const detail=root.document?.querySelector('.r15-detail'),target=detail?.querySelector('#mastermind-system-editor');
  if(!target)return;
  const sys=system(id),metadata=get(id),selected=target.dataset.kind||'powers',entries=list(id,selected);
  target.dataset.kind=selected;
  target.innerHTML='<div class="mse-head"><h3>Personalizar sistema</h3><p>Edite seu catálogo local. Os livros originais continuam intactos. Alterações nas regras de Ordem afetam o motor local; outros sistemas exibem registros personalizados sem substituir seus cálculos automaticamente.</p></div>'+
   '<div class="mse-meta"><label>Nome do sistema<input data-mse-meta="title" value="'+esc(metadata.title||sys?.title||id)+'" maxlength="90"></label>'+
   '<label>Descrição<textarea data-mse-meta="description" maxlength="1500" rows="3">'+esc(metadata.description||sys?.customDescription||'')+'</textarea></label>'+
   '<label>Foto/capa do sistema<input id="mse-cover" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
   (metadata.cover?'<img class="mse-preview" src="'+metadata.cover+'" alt="Foto personalizada">':'')+
   '<button data-mse-save-meta>Salvar nome, capa e descrição</button></div>'+
   '<div class="mse-row"><label>Editar categoria<select id="mse-kind">'+KINDS.map(k=>'<option value="'+k+'" '+(selected===k?'selected':'')+'>'+({powers:'Poderes',abilities:'Habilidades',rituals:'Rituais',progression:'Evolução'}[k])+'</option>').join('')+'</select></label><button data-mse-new>+ Adicionar registro</button></div>'+
   '<div class="mse-items">'+(entries.length?entries.map((item,i)=>'<div class="mse-item"><span><strong>'+esc(item.name)+'</strong><small>'+esc(item.klass||item.element||item.kind||'')+'</small></span><button data-mse-edit="'+i+'">Editar</button><button data-mse-remove="'+i+'">Excluir</button></div>').join(''):'<p>Não há registros nesta categoria. Você pode adicionar.</p>')+'</div>'+
   '<div id="mse-entry" hidden></div><div class="mse-actions"><button data-mse-export>Exportar configuração JSON</button><label>Importar configuração JSON<input type="file" id="mse-json" accept=".json,application/json" hidden></label><button data-mse-reset>Restaurar padrão deste sistema</button></div><small id="mse-status" aria-live="polite"></small>';
 }
 function form(id,kind,index){
  const t=root.document.querySelector('#mastermind-system-editor'),entries=list(id,kind),entry=Number.isInteger(index)?entries[index]:null;
  const values=entry||{name:'',description:'',klass:'',kind:kind==='powers'?'class':kind==='rituals'?'ritual':'',element:'',nex:'',minNex:'',peLimit:'',level:'',cost:''};
  t.querySelector('#mse-entry').hidden=false;
  t.querySelector('#mse-entry').innerHTML='<h4>'+(entry?'Editar':'Adicionar')+' '+({powers:'poder',rituals:'ritual',abilities:'habilidade',progression:'marco'}[kind])+'</h4>'+
   '<label>Nome<input data-entry="name" maxlength="100" value="'+esc(values.name)+'"></label>'+
   '<label>Descrição/efeito<textarea data-entry="description" rows="4" maxlength="2200">'+esc(values.description||'')+'</textarea></label>'+
   '<label>Classe (quando aplicável)<select data-entry="klass"><option value="">Todas/geral</option>'+['Combatente','Especialista','Ocultista'].map(v=>'<option '+(values.klass===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
   '<label>Tipo<select data-entry="kind">'+['class','paranormal','trail','ritual','ability'].map(v=>'<option '+(values.kind===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
   '<label>Elemento<input data-entry="element" maxlength="50" value="'+esc(values.element||'')+'"></label>'+
   '<label>NEX/mínimo<input data-entry="nex" type="number" min="0" max="100" value="'+esc(values.nex??values.minNex??'')+'"></label>'+
   '<label>Limite de PE<input data-entry="peLimit" type="number" min="0" max="99" value="'+esc(values.peLimit??'')+'"></label>'+
   '<label>Círculo<input data-entry="level" type="number" min="0" max="9" value="'+esc(values.level??'')+'"></label>'+
   '<label>Custo PE<input data-entry="cost" type="number" min="0" max="99" value="'+esc(values.cost??'')+'"></label>'+
   '<div class="mse-actions"><button data-mse-commit="'+(entry?index:'new')+'">Salvar registro</button><button data-mse-cancel>Cancelar</button></div>';
  t.dataset.editIndex=entry?String(index):'new';
 }
 function mount(){
  const detail=root.document?.querySelector('.r15-detail');if(!detail||detail.dataset.mseReady)return;
  detail.dataset.mseReady='1';
  const style=root.document.createElement('style');
  style.textContent='#mastermind-system-editor{margin:16px 0;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:15px;color:var(--fg)}#mastermind-system-editor .mse-head p{font-size:12px;color:var(--muted);line-height:1.6}#mastermind-system-editor label{display:grid;gap:6px;min-width:0;font-size:12px}#mastermind-system-editor input,#mastermind-system-editor select,#mastermind-system-editor textarea{font:inherit;background:var(--panel2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0;max-width:100%}#mastermind-system-editor button{background:var(--panel2);color:var(--fg);border:1px solid var(--accent);border-radius:9px;padding:9px 12px;cursor:pointer}#mastermind-system-editor .mse-meta,#mastermind-system-editor #mse-entry{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:12px 0}#mastermind-system-editor #mse-entry[hidden]{display:none}#mastermind-system-editor #mse-entry h4{grid-column:1/-1;margin:4px}#mastermind-system-editor .mse-row,#mastermind-system-editor .mse-actions{display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin:12px 0}#mastermind-system-editor .mse-item{display:flex;align-items:center;gap:10px;padding:9px;border-bottom:1px solid var(--line)}#mastermind-system-editor .mse-item span{flex:1;min-width:0}#mastermind-system-editor .mse-item small{display:block;color:var(--muted)}#mastermind-system-editor .mse-preview{max-width:100px;max-height:110px;object-fit:cover;border-radius:10px}';
  root.document.head.append(style);
  root.document.addEventListener('mastermind:system-open',e=>{
   const id=e.detail?.systemId,place=detail.querySelector('#r51-book-library');
   if(!validId(id)||!place)return;
   const btn=root.document.createElement('button');btn.id='mse-toggle';btn.type='button';btn.textContent='⚙ Editar sistema';btn.className='r15-main-btn';
   const box=root.document.createElement('section');box.id='mastermind-system-editor';box.hidden=true;box.dataset.systemId=id;
   place.insertAdjacentElement('beforebegin',box);box.insertAdjacentElement('beforebegin',btn);
   btn.addEventListener('click',()=>{box.hidden=!box.hidden;if(!box.hidden)show(id);});
  });
  detail.addEventListener('click',e=>{
   const box=detail.querySelector('#mastermind-system-editor');if(!box||box.hidden)return;
   const id=box.dataset.systemId,kind=box.dataset.kind||'powers',target=e.target;
   if(target.closest('[data-mse-save-meta]')){try{const meta={title:box.querySelector('[data-mse-meta="title"]').value,description:box.querySelector('[data-mse-meta="description"]').value};setMeta(id,meta);root.RPG15?.openSystem?.(id)}catch(err){root.alert?.(err.message)}return;}
   if(target.closest('[data-mse-new]')){form(id,kind,null);return;}
   const edit=target.closest('[data-mse-edit]');if(edit){form(id,kind,Number(edit.dataset.mseEdit));return;}
   const remove=target.closest('[data-mse-remove]');if(remove){const idx=Number(remove.dataset.mseRemove),v=list(id,kind);if(!root.confirm?.('Excluir '+(v[idx]?.name||'registro')+' do catálogo personalizado?'))return;v.splice(idx,1);try{setCatalog(id,kind,v);show(id)}catch(err){root.alert?.(err.message)}return;}
   if(target.closest('[data-mse-cancel]')){box.querySelector('#mse-entry').hidden=true;return;}
   const commit=target.closest('[data-mse-commit]');if(commit){
    const read=k=>box.querySelector('[data-entry="'+k+'"]')?.value??'',listValues=list(id,kind),o=commit.dataset.mseCommit,ix=o==='new'?-1:Number(o);
    const prev=ix<0?{}:listValues[ix];const entry={...prev,name:read('name').trim(),description:read('description'),klass:read('klass'),kind:read('kind'),element:read('element')};
    for(const k of ['nex','peLimit','level','cost']){const v=read(k);if(v!=='')entry[k]=Number(v);}
    if(kind==='powers')entry.minNex=Number(read('nex'))||0;
    if(!entry.name){root.alert?.('Informe o nome.');return;}
    if(ix<0)listValues.push(entry);else listValues[ix]=entry;
    try{setCatalog(id,kind,listValues);show(id)}catch(err){root.alert?.(err.message)}
    return;
   }
   if(target.closest('[data-mse-reset]')){if(root.confirm?.('Restaurar o catálogo e nome padrão?')){reset(id);root.RPG15?.openSystem?.(id)}return;}
   if(target.closest('[data-mse-export]')){
    const body=JSON.stringify({kind:'mastermind-system-custom-v1',systemId:id,config:get(id)},null,2),a=root.document.createElement('a'),url=URL.createObjectURL(new Blob([body],{type:'application/json'}));
    a.href=url;a.download='mastermind-'+id+'-customizacao.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);return;
   }
  });
  detail.addEventListener('change',async e=>{
   const box=detail.querySelector('#mastermind-system-editor');if(!box||box.hidden)return;
   const id=box.dataset.systemId,t=e.target;
   if(t.id==='mse-kind'){box.dataset.kind=t.value;show(id);return;}
   if(t.id==='mse-cover'&&t.files?.[0]){
    const f=t.files[0];if(f.size>650000||!['image/png','image/jpeg','image/webp'].includes(f.type)){root.alert?.('Capa: PNG/JPG/WebP com até 650 KB');return;}
    const reader=new FileReader();reader.onload=()=>{try{setMeta(id,{cover:reader.result});show(id)}catch(err){root.alert?.(err.message)}};reader.readAsDataURL(f);
   }
   if(t.id==='mse-json'&&t.files?.[0]){
    try{const obj=JSON.parse(await t.files[0].text());if(obj.kind!=='mastermind-system-custom-v1'||obj.systemId!==id)throw Error('Arquivo não pertence a este sistema');const copy=clone(obj.config||{});if(copy.catalogs){for(const [k,v] of Object.entries(copy.catalogs)){if(!KINDS.includes(k)||!Array.isArray(v)||v.length>600)throw Error('Catálogo inválido');}}
     store[id]=copy;publish();apply(id);root.RPG15?.openSystem?.(id);
    }catch(err){root.alert?.('Importação inválida: '+err.message)}
   }
  });
 }
 for(const id of IDS)apply(id);
 if(root.document){if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
 return {KEY,IDS,KINDS,get,list,backup,setMeta,setCatalog,reset,apply,baseCatalog};
});
