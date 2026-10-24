/* D&D 5e (2014) playable offline character sheets. Data isolated from other systems. */
(()=>{'use strict';
 const E=window.RPG18_DND_ENGINE;if(!E)return;
 const KEY='rpg-dnd5e-characters-v1',SEL='rpg-dnd5e-current-v1',MAX=60;
 const $=(s,c=document)=>c.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const signed=n=>n>=0?'+'+n:String(n),attrs=E.ATTRS,skills=E.SKILLS;
 let list=[],selected='',tab='stats',host=null,loaded=false;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const get=()=>list.find(x=>x.id===selected)||list[0];
 const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
 function load(){if(loaded)return;loaded=true;try{list=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(list))list=[]}catch{list=[]}
  list=list.filter(x=>x&&x.systemId==='d-d'&&x.edition==='5e-2014').slice(0,MAX);
  if(!list.length)list=[E.create()];
  selected=localStorage.getItem(SEL)||list[0].id;if(!list.some(x=>x.id===selected))selected=list[0].id;
  save();
 }
 function save(){localStorage.setItem(KEY,JSON.stringify(list));localStorage.setItem(SEL,selected)}
 const opts=(entries,value)=>entries.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(t)+'</option>').join('');
 const input=(label,key,v,type='text',additional='')=>'<label><span>'+esc(label)+'</span><input data-root="'+esc(key)+'" type="'+type+'" value="'+esc(v??'')+'" '+additional+'></label>';
 function fmtResult(label,result){
  const out=$('#d18-result',host);if(out){out.textContent=label+' → ['+result.faces.join(', ')+'] '+signed(result.bonus)+' = '+result.total+(result.faces.length===2?' (d20 escolhido: '+result.chosen+')':'');out.hidden=false}
  window.dispatchEvent(new CustomEvent('rpg:roll',{detail:{faces:result.faces,sides:20,bonus:result.bonus,total:result.total,label}}));
 }
 function section(){const s=get(),d=E.derive(s),head='<div class="d18-tip">Edição fixa: 5e (2014). Regras SRD 5.1. D&D 2024 permanece somente na biblioteca, sem misturar mecânicas.</div>';
  const stat=(key)=>'<div class="d18-attr"><label>'+E.LABELS[key]+' <small>'+key+'</small></label><input type="number" min="1" max="30" data-attr="'+key+'" value="'+s.attrs[key]+'"><button data-roll="attr:'+key+'">'+signed(d.mods[key])+' 🎲</button></div>';
  if(tab==='stats')return head+'<h3>Atributos e progressão</h3><div class="d18-attrs">'+attrs.map(stat).join('')+'</div><div class="d18-fields">'+
   input('Nome', 'name',s.name)+input('Ancestralidade / espécie','ancestry',s.ancestry)+input('Antecedente','background',s.background)+
   '<label><span>Classe</span><select data-root="klass">'+opts(Object.entries(E.CLASSES_PT),s.klass)+'</select></label>'+
   input('Nível','level',s.level,'number','min="1" max="20"')+input('Experiência','experience',s.experience,'number','min="0" max="100000000"')+
   input('Alinhamento (opcional)','alignment',s.alignment)+'</div><div class="d18-metrics"><div>Proficiência <strong>'+signed(d.pb)+'</strong></div><div>Iniciativa <strong>'+signed(d.initiative)+'</strong></div><div>Percepção passiva <strong>'+d.passivePerception+'</strong></div><div>Dado de vida <strong>d'+d.hitDie+'</strong></div></div>';
  if(tab==='skills')return head+'<h3>Perícias e testes de resistência</h3><p>Marque proficiências e, se aplicável, especialização. Os bônus são calculados automaticamente.</p><div class="d18-table"><div class="d18-table-title">Perícias</div>'+Object.entries(skills).map(([key,attr])=>'<div class="d18-skill"><span>'+esc(E.LABELS[key])+' <small>'+attr+'</small></span><label><input type="checkbox" data-prof="'+key+'" '+(s.skillProficiencies.includes(key)?'checked':'')+'>Treinado</label><label><input type="checkbox" data-exp="'+key+'" '+(s.expertise.includes(key)?'checked':'')+'>Especialista</label><button data-roll="skill:'+key+'">'+signed(d.skills[key])+' 🎲</button><button type="button" data-d62-skill="'+esc(E.LABELS[key])+'">📖</button></div>').join('')+
   '<div class="d18-table-title">Testes de resistência</div>'+attrs.map(key=>'<div class="d18-skill"><span>'+E.LABELS[key]+'</span><label><input data-save="'+key+'" type="checkbox" '+(s.saveProficiencies.includes(key)?'checked':'')+'>Proficiência</label><button data-roll="save:'+key+'">'+signed(d.saves[key])+' 🎲</button></div>').join('')+'</div>';
  if(tab==='combat')return head+'<h3>Combate e condições</h3><div class="d18-metrics">'+
   [['Classe de armadura',d.armorClass],['Iniciativa',signed(d.initiative)],['PV atual',s.hitPointsCurrent],['PV máximo',s.hitPointsMax],['PV temporário',s.hitPointsTemp],['Deslocamento',s.speed+' m']].map(([k,v])=>'<div>'+k+'<strong>'+v+'</strong></div>').join('')+'</div>'+
   '<div class="d18-fields">'+input('PV máximo','hitPointsMax',s.hitPointsMax,'number','min="1"')+input('PV atual','hitPointsCurrent',s.hitPointsCurrent,'number','min="0"')+input('PV temporários','hitPointsTemp',s.hitPointsTemp,'number','min="0"')+
   input('CA manual (vazio = 10 + DES)','armorClass',s.armorClass,'number','min="0" max="50"')+input('Iniciativa adicional','initiativeBonus',s.initiativeBonus,'number')+input('Deslocamento em metros','speed',s.speed,'number','min="0"')+'</div>'+
   '<div class="d18-actions"><button data-roll="initiative">🎲 Iniciativa</button><button data-roll="d20">🎲 d20 livre</button></div><div class="d18-actions"><label>Fórmula de dados <input id="d18-damage" value="1d8+2" placeholder="Ex.: 2d6+3"></label><button data-roll="dice">🎲 Rolar fórmula</button></div>'+
   listEditor('Ações e ataques','attacks',['Nome','Bônus','Dados / detalhes'])+
   listEditor('Condições','conditions',['Nome','Detalhes']);
  if(tab==='spells')return head+(window.Mastermind66GrimoireUI?.render(s,d)||'<p>Grimório indisponível.</p>');
  if(tab==='items')return head+'<h3>Inventário e itens</h3>'+listEditor('Inventário do personagem','inventory',['Nome','Quantidade','Notas']);
  if(tab==='features')return head+'<h3>Características do personagem</h3>'+listEditor('Habilidades, talentos e características','features',['Nome','Origem','Efeito / notas'])+listEditor('Idiomas','languages',['Nome','Notas']);
  return head+'<h3>História e personagem</h3><div class="d18-fields">'+['description','history','notes'].map(k=>'<label class="d18-textarea"><span>'+({description:'Descrição',history:'História',notes:'Anotações'}[k])+'</span><textarea data-root="'+k+'" rows="5" maxlength="12000">'+esc(s[k]||'')+'</textarea></label>').join('')+'</div>';
 }
 const fields=[
  ['stats','Atributos'],['skills','Perícias'],['combat','Combate'],['spells','Magias'],['items','Inventário'],['features','Habilidades'],['story','História']
 ];
 function listEditor(title,key,columns){
  const s=get(),arr=s[key]||[];
  return '<section class="d18-list"><h4>'+esc(title)+' <span>'+arr.length+'</span></h4><div class="d18-items">'+arr.map((v,i)=>'<div class="d18-item"><div><strong>'+esc(v.name||v)+'</strong><small>'+esc(v.details||v.notes||(v.bonus!==undefined?'Bônus '+v.bonus+' · '+(v.dice||''):''))+'</small></div><button type="button" data-d62-item="'+key+':'+i+'">📖</button><button data-remove="'+key+':'+i+'" aria-label="Excluir">×</button></div>').join('')+'</div><div class="d18-fields">'+
   columns.map((col,i)=>input(col,'new-'+key+'-'+i,'')).join('')+'</div><button data-add="'+key+'">+ Adicionar</button></section>';
 }
 function render(){
  if(!host)return;
  const s=get(),d=E.derive(s);
  host.innerHTML='<div class="d18-head"><div><small>SISTEMA INDEPENDENTE · SRD 5.1</small><h2>Ficha de D&D 5e</h2><p>Personagens, rolagens e inventário gravados somente neste dispositivo.</p></div><div class="d18-actions"><button data-action="new">+ Novo personagem</button><button data-action="duplicate">Duplicar</button><button data-action="delete">Excluir</button></div></div>'+
   '<div class="d18-picker"><select id="d18-character" aria-label="Personagem">'+opts(list.map(x=>[x.id,x.name+' · Nv '+x.level]),selected)+'</select><button data-action="json-export">Exportar JSON</button><label>Importar JSON<input type="file" id="d18-json-import" accept=".json,application/json" hidden></label></div>'+
   '<div class="d18-tabs" role="tablist">'+fields.map(([id,label])=>'<button type="button" data-tab="'+id+'" aria-selected="'+(id===tab)+'">'+label+'</button>').join('')+'</div>'+
   '<div class="d18-body" role="tabpanel">'+section()+'</div>'+
   '<div class="d18-roll-actions"><label>Modo de d20 <select id="d18-roll-mode"><option value="normal">Normal</option><option value="advantage">Vantagem</option><option value="disadvantage">Desvantagem</option></select></label><div id="d18-result" class="d18-result" hidden></div></div>'+
   '<p class="d18-license">Esta implementação inclui material derivado do System Reference Document 5.1 (SRD 5.1) da Wizards of the Coast LLC, disponível em https://dnd.wizards.com/resources/systems-reference-document sob CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Adaptação não oficial; classes, habilidades e versões futuras podem exigir revisão.</p>';
  window.RPG17_PDF?.attachDnd?.(host);
 }
 function importObject(input){load();if(list.length>=MAX)throw Error('Limite de 60 personagens no aparelho.');const obj=E.normalize(input);list.push(obj);selected=obj.id;tab='stats';save();render();return obj;}
 function change(e){
  const t=e.target,s=get();if(!s)return;
  if(t.id==='d18-character'){selected=t.value;save();render();return}
  if(t.id==='d18-json-import'){const f=t.files?.[0];if(!f)return;if(f.size>1500000)return alert('Arquivo muito grande.');
   f.text().then(v=>{importObject(JSON.parse(v));alert('Ficha importada como novo personagem.')}).catch(err=>alert(err.message));return}
  if(t.dataset.attr){s.attrs[t.dataset.attr]=Math.min(30,Math.max(1,n(t.value,10)));save();render();return}
  if(window.Mastermind66GrimoireUI?.change(t,render))return;
  if(t.dataset.root){
   const k=t.dataset.root;
   const previousClass=k==='klass'?s.klass:null;if(k.startsWith('new-'))return; // Draft fields are applied only by the Add button.
   if(['level','experience','hitPointsMax','hitPointsCurrent','hitPointsTemp','initiativeBonus','armorClass','speed'].includes(k)){s[k]=k==='armorClass'&&t.value.trim()===''?null:n(t.value,0)}else{s[k]=String(t.value).slice(0,12000)}
   if(k==='klass'&&(!s.spellcastingAbility||s.spellcastingAbility===window.Mastermind66Grimoire?.ABILITY[previousClass]))s.spellcastingAbility=window.Mastermind66Grimoire?.ABILITY[s.klass]||'';
   if(k==='level')s.level=Math.min(20,Math.max(1,s.level));if(k==='hitPointsMax')s.hitPointsMax=Math.max(1,s.hitPointsMax);
   if(['hitPointsCurrent','hitPointsMax'].includes(k))s.hitPointsCurrent=Math.min(Math.max(0,s.hitPointsCurrent),s.hitPointsMax);
   if(k==='hitPointsTemp')s.hitPointsTemp=Math.max(0,s.hitPointsTemp);
   save();render();return
  }
  const pair=[['prof','skillProficiencies'],['exp','expertise'],['save','saveProficiencies']].find(([k])=>t.hasAttribute('data-'+k));
  if(pair){const name=t.getAttribute('data-'+pair[0]),key=pair[1],set=new Set(s[key]);
   if(t.checked)set.add(name);else set.delete(name);
   s[key]=[...set];
   if(key==='expertise'&&t.checked&&!s.skillProficiencies.includes(name))s.skillProficiencies.push(name);
   if(key==='skillProficiencies'&&!t.checked)s.expertise=s.expertise.filter(x=>x!==name);
   save();render();return;
  }
  if(t.dataset.slotMax||t.dataset.slotCurrent){
   const level=t.dataset.slotMax||t.dataset.slotCurrent,k=t.dataset.slotMax?'max':'current';s.spellSlots[level]??={max:0,current:0};s.spellSlots[level][k]=Math.max(0,Math.min(30,n(t.value)));
   if(k==='max')s.spellSlots[level].current=Math.min(s.spellSlots[level].current,s.spellSlots[level].max);
   else s.spellSlots[level].current=Math.min(s.spellSlots[level].current,s.spellSlots[level].max);
   save();render();
  }
 }
 function action(e){
  const b=e.target.closest('button');if(!b)return;const s=get();
  if(window.Mastermind66GrimoireUI?.action(b,s,save,render))return;
  if(b.dataset.tab){tab=b.dataset.tab;render();return}
  if(b.dataset.action){
   const a=b.dataset.action;
   if(a==='new'){if(list.length>=MAX)return alert('Limite de personagens atingido.');const name=prompt('Nome do personagem:','Novo aventureiro');if(name===null)return;const c=E.create(name.slice(0,100));list.push(c);selected=c.id;tab='stats';save();render()}
   if(a==='duplicate'){if(list.length>=MAX)return alert('Limite atingido.');importObject(s)}
   if(a==='delete'&&list.length>1&&confirm('Excluir somente esta ficha de D&D?')){list=list.filter(x=>x.id!==selected);selected=list[0].id;save();render()}
   if(a==='json-export'){const blob=new Blob([JSON.stringify(s,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='dnd5e-'+(s.name||'ficha').toLowerCase().replace(/[^a-z0-9-]+/gi,'-')+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
   return
  }
  if(b.dataset.add){const key=b.dataset.add,arr=s[key]??=[];if(arr.length>=150)return alert('Limite de registros atingido.');
   const values=Array.from({length:3},(_,i)=>$('[data-root="new-'+key+'-'+i+'"]',host)?.value.trim()||'');
   if(!values[0])return alert('Preencha o nome.');
   arr.push(key==='inventory'?{name:values[0],qty:Math.max(1,Math.min(999,n(values[1],1))),notes:values[2]}:key==='attacks'?{name:values[0],bonus:n(values[1],0),dice:values[2]}:key==='spells'?{name:values[0],level:n(values[1],0),notes:values[2]}:{name:values[0],details:[values[1],values[2]].filter(Boolean).join(' · ')});
   s[key]=arr;save();render();return
  }
  if(b.dataset.d62Skill){window.Mastermind62Descriptions?.open?.({systemId:'d-d',kind:'Perícia',name:b.dataset.d62Skill,origin:'D&D 5e SRD 5.1'});return;}
  if(b.dataset.d62Item){const [key,index]=b.dataset.d62Item.split(':'),item=s[key]?.[Number(index)];if(item)window.Mastermind62Descriptions?.open?.({systemId:'d-d',kind:key,name:item.name||String(item),description:item.description||'',notes:item.details||item.notes||'',origin:'Ficha D&D 5e'});return;}
  if(b.dataset.remove){const [key,id]=b.dataset.remove.split(':');if(!Array.isArray(s[key]))return;s[key].splice(+id,1);save();render();return}
  if(b.dataset.roll){const code=b.dataset.roll,mode=$('#d18-roll-mode',host)?.value||'normal',d=E.derive(s);
   let val=0,label=code;
   if(code.startsWith('attr:')){val=d.mods[code.slice(5)];label='Teste de '+E.LABELS[code.slice(5)]}
   else if(code.startsWith('skill:')){val=d.skills[code.slice(6)];label='Perícia '+E.LABELS[code.slice(6)]}
   else if(code.startsWith('save:')){val=d.saves[code.slice(5)];label='Resistência '+E.LABELS[code.slice(5)]}
   else if(code==='initiative'){val=d.initiative;label='Iniciativa'}
   else if(code==='dice'){
    try{const r=E.rollDice($('#d18-damage',host).value);const output=$('#d18-result',host);output.hidden=false;output.textContent='Dados '+r.faces.join(' + ')+' '+(r.bonus>=0?'+':'')+r.bonus+' = '+r.total;
     window.dispatchEvent(new CustomEvent('rpg:roll',{detail:{faces:r.faces,sides:r.sides,bonus:r.bonus,total:r.total,label:'Dados livres'}}));
    }catch(err){alert(err.message)}
    return;
   }
   fmtResult(label,E.rollD20(val,mode));
  }
 }
 function mount(container){
  if(!container)return;load();const box=document.createElement('section');box.id='r18-dnd';container.append(box);host=box;host.addEventListener('click',action);host.addEventListener('change',change);host.addEventListener('input',e=>window.Mastermind66GrimoireUI?.input(e.target,host));render();return box;
 }
 const sheet=document.querySelector('#screen-sheet'),anchor=sheet?.querySelector('.page-row');
 if(anchor){
  const switcher=document.createElement('div');switcher.className='d18-system-switch';
  switcher.innerHTML='<strong>Fichas por sistema</strong><button type="button" data-open-system-sheet="d-d">D&D 5e (2014)</button><button type="button" data-open-system-sheet="gurps">GURPS 4ª edição</button><span>Ordem Paranormal: editor abaixo.</span>';
  anchor.insertAdjacentElement('afterend',switcher);
  switcher.addEventListener('click',event=>{const b=event.target.closest('[data-open-system-sheet]');if(!b)return;window.RPG_DEMO?.navigate?.('library');window.RPG15?.openSystem?.(b.dataset.openSystemSheet);});
 }
 window.RPG18_DND={mount,importObject,open:()=>window.RPG15?.openSystem('d-d'),get current(){load();return get()},get all(){load();return list.slice()}};
})();