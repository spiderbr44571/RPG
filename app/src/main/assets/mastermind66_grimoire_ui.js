/* Mastermind 0.66 - interface do grimorio D&D 5e SRD 5.1 */
(function(root){'use strict';
const E=root.Mastermind66Grimoire;if(!E)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const STORE='mastermind66-homebrew-spells-v1';
const state={view:'catalog',level:'all',query:'',editing:'',onlyEligible:false};
const official=()=>{
 const base=root.Mastermind66SpellCatalog||[],editor=root.MastermindSystemEditor;
 if(!editor)return base;
 const custom=editor.all('d-d','rituals',base);
 const keys=E.KEYS||{};
 return custom.map(x=>{
  const classes=Array.isArray(x.classes)&&x.classes.length?x.classes:
   String(x.className||'').split(/[,;]+/).map(v=>keys[v.trim()]||v.trim().toLowerCase()).filter(v=>Object.values(keys).includes(v));
  return {...x,classes,level:Math.max(0,Math.min(9,Number(x.level)||0)),homebrew:!base.some(b=>b.id===x.id)};
 });
};
function customs(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v.filter(x=>x?.homebrew).slice(0,250):[]}catch{return []}}
const all=()=>[...official(),...customs()];
const byId=id=>all().find(x=>x.id===id);
const savedSpell=item=>byId(item.sourceId||item.id)||all().find(x=>norm(x.name)===norm(item.name));
const info=x=>(x.level===0?'Truque':x.level+'º círculo')+' · '+esc(x.school||'')+(x.ritual?' · Ritual':'')+(x.concentration?' · Concentração':'');
function stats(sheet){
 const p=E.policy(sheet),v=E.counts(sheet);
 if(!p.caster)return '<p class="d66-alert">Esta classe não possui conjuração básica no SRD 5.1. Regras de subclasses e talentos devem ser configuradas separadamente.</p>';
 const tiles=[['Classe',sheet.klass,p.ability],['Círculo máximo',p.maxSpellLevel,p.slotRecommendation.type==='pact'?'Magia de Pacto':'Conjuração'],['Truques',v.cantrips+' / '+p.cantripLimit,'']];
 if(p.knownLimit!==null)tiles.push(['Magias conhecidas',v.leveled+' / '+p.knownLimit,'']);
 if(p.mode==='prepared')tiles.push(['Preparadas',v.countedPrepared+' / '+p.preparedLimit,'']);
 if(p.mode==='spellbook'){tiles.push(['Grimório',v.leveled+' / '+p.spellbookBaseline+'*','']);tiles.push(['Preparadas',v.countedPrepared+' / '+p.preparedLimit,'']);}
 return '<div class="d66-stats">'+tiles.map(x=>'<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>').join('')+'</div>'+
 (p.mode==='spellbook'?'<p class="d66-note">*Base inicial de seis magias, mais duas por nível. Magos podem copiar outras magias sem limite absoluto de grimório.</p>':'');
}
function slots(sheet){
 const p=E.policy(sheet);if(!p.caster)return '';
 const active=Object.keys(p.slotRecommendation.slots);
 return '<section class="d66-pane"><div class="d66-pane-header"><h4>Espaços de magia</h4><button type="button" data-d66-action="sync-slots">Sincronizar</button></div>'+
 '<p class="d66-note">'+(p.slotRecommendation.type==='pact'?'Pacto: espaços recuperados no descanso curto ou longo; Arcanum Místico requer controle separado.':'Valores sugeridos para uma única classe. Sincronizar preserva os espaços já gastos.')+'</p>'+
 '<label class="d66-ability">Atributo de conjuração <select data-root="spellcastingAbility">'+[['','Não definido'],...['STR','DEX','CON','INT','WIS','CHA'].map(x=>[x,x])].map(x=>'<option value="'+x[0]+'"'+(sheet.spellcastingAbility===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>'+
 '<div class="d66-slots">'+Array.from({length:9},(_,i)=>{const k=String(i+1),v=sheet.spellSlots?.[k]||{max:0,current:0};return '<label class="'+(active.includes(k)?'':'d66-inactive')+'">Nível '+k+'<input type="number" data-slot-max="'+k+'" min="0" max="30" value="'+(Number(v.max)||0)+'" aria-label="Espaços máximos '+k+'"><input type="number" data-slot-current="'+k+'" min="0" max="30" value="'+(Number(v.current)||0)+'" aria-label="Espaços restantes '+k+'"></label>'}).join('')+'</div><small>Valores: máximo / restante. Ajustes manuais continuam disponíveis.</small></section>';
}
function catalog(sheet){
 const p=E.policy(sheet),known=new Set((sheet.spells||[]).map(x=>x.sourceId||x.id||norm(x.name)));
 const entries=E.catalogFor(official(),customs(),sheet.klass).filter(x=>state.level==='all'||String(x.level)===state.level).filter(x=>!state.onlyEligible||x.level<=p.maxSpellLevel);
 return '<section class="d66-pane"><div class="d66-pane-header"><h4>Catálogo de '+esc(sheet.klass)+'</h4><span>'+entries.length+' magias</span></div>'+
 '<p class="d66-note">Filtrado pela lista original da classe no SRD 5.1. Magias não presentes no SRD e exceções de subclasses são separadas.</p>'+
 '<div class="d66-filters"><label>Buscar<input id="d66-search" type="search" placeholder="Nome ou escola" value="'+esc(state.query)+'"></label>'+
 '<label>Círculo<select id="d66-level">'+[['all','Todos'],...Array.from({length:10},(_,i)=>[String(i),i===0?'Truques':i+'º círculo'])].map(x=>'<option value="'+x[0]+'"'+(x[0]===state.level?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>'+
 '<label class="d66-check"><input id="d66-eligible" type="checkbox" '+(state.onlyEligible?'checked':'')+'> Só liberadas</label></div>'+
 '<div class="d66-catalog">'+entries.slice(0,250).map(x=>{
 const already=known.has(x.id)||(sheet.spells||[]).some(y=>norm(y.name)===norm(x.name)),locked=x.level>p.maxSpellLevel;
 return '<div class="d66-card" data-d66-name="'+esc(norm(x.name+' '+x.school))+'" '+(state.query&&!norm(x.name+' '+x.school).includes(norm(state.query))?'hidden':'')+'><div><strong>'+esc(x.name)+'</strong>'+(x.homebrew?'<em>Homebrew</em>':'')+'<small>'+info(x)+'</small></div>'+
 '<div class="d66-card-actions"><button type="button" data-d66-action="detail" data-d66-id="'+esc(x.id)+'">📖</button>'+
 '<button type="button" data-d66-action="learn" data-d66-id="'+esc(x.id)+'" '+(already||locked?'disabled':'')+'>'+(already?'✓':locked?'🔒':p.mode==='prepared'?'Preparar':'Aprender')+'</button></div></div>';
 }).join('')+'</div>'+(!entries.length?'<p class="d66-note">Nenhuma magia encontrada.</p>':'')+'</section>';
}
function learned(sheet){
 const p=E.policy(sheet),items=sheet.spells||[];
 return '<section class="d66-pane"><div class="d66-pane-header"><h4>Magias do personagem</h4><span>'+items.length+' registros</span></div>'+
 '<p class="d66-note">As magias cadastradas anteriormente foram preservadas. Mudanças de classe não apagam registros incompatíveis.</p>'+
 (items.length?'<div class="d66-learned">'+items.map((x,i)=>{
 const meta=savedSpell(x),off=!!meta&&(!meta.classes?.includes(E.KEYS[sheet.klass])||meta.level>p.maxSpellLevel);
 return '<div class="d66-card"><div><strong>'+esc(x.name)+'</strong><small>'+(Number(x.level)===0?'Truque':(Number(x.level)||0)+'º círculo')+(x.source==='homebrew'?' · Homebrew':'')+'</small>'+
 (!meta||off?'<span class="d66-alert-note">'+(!meta?'Registro anterior sem correspondência no catálogo.':'Revisar: fora da lista ou do círculo permitido.')+'</span>':'')+'</div>'+
 '<div class="d66-card-actions"><button data-d66-action="detail-own" data-d66-index="'+i+'">📖</button>'+
 (p.mode==='spellbook'&&Number(x.level)>0?'<button data-d66-action="prepare" data-d66-index="'+i+'">'+(x.prepared?'Despreparar':'Preparar')+'</button>':'')+
 (p.mode==='prepared'&&Number(x.level)>0?'<button data-d66-action="unprepare" data-d66-index="'+i+'">Despreparar</button>':'')+
 '<button data-d66-action="remove" data-d66-index="'+i+'" aria-label="Remover">×</button></div></div>';
 }).join('')+'</div>':'<p class="d66-note">Nenhuma magia cadastrada ainda.</p>')+'</section>';
}
function form(){
 const x=customs().find(y=>y.id===state.editing)||{};
 const field=(title,key,value)=>'<label>'+title+'<input id="d66-new-'+key+'" value="'+esc(value||'')+'" maxlength="100"></label>';
 return '<section class="d66-pane"><h4>'+(x.id?'Editar magia Homebrew':'Criar magia Homebrew')+'</h4><p class="d66-note">As criações são salvas neste dispositivo e não alteram o conteúdo oficial.</p>'+
 '<div class="d66-builder">'+field('Nome','name',x.name)+
 '<label>Círculo<select id="d66-new-level">'+Array.from({length:10},(_,i)=>'<option value="'+i+'"'+(Number(x.level||0)===i?' selected':'')+'>'+(i?i+'º círculo':'Truque')+'</option>').join('')+'</select></label>'+
 field('Escola','school',x.school||'Personalizada')+field('Tempo de conjuração','castingTime',x.castingTime||'1 ação')+
 field('Alcance','range',x.range)+field('Duração','duration',x.duration)+field('Componentes','components',x.components)+'</div>'+
 '<div class="d66-classes"><strong>Classes permitidas</strong>'+Object.entries(E.KEYS).map(k=>'<label><input type="checkbox" data-d66-class="'+k[1]+'" '+(x.classes?.includes(k[1])?'checked':'')+'> '+esc(k[0])+'</label>').join('')+'</div>'+
 '<div class="d66-toggles"><label><input id="d66-new-ritual" type="checkbox" '+(x.ritual?'checked':'')+'> Ritual</label><label><input id="d66-new-concentration" type="checkbox" '+(x.concentration?'checked':'')+'> Concentração</label></div>'+
 '<label class="d66-description">Descrição e efeitos<textarea id="d66-new-description" rows="5" maxlength="8000" placeholder="Descreva custos, efeitos e condições...">'+esc(x.description||'')+'</textarea></label>'+
 '<div class="d66-actions"><button data-d66-action="save-custom" class="d66-primary">'+(x.id?'Salvar alterações':'Criar magia')+'</button>'+
 (x.id?'<button data-d66-action="cancel-edit">Cancelar</button>':'')+'</div>'+
 (customs().length?'<h4>Biblioteca personalizada</h4><div class="d66-homebrews">'+customs().map(y=>
 '<div><strong>'+esc(y.name)+'</strong><small>'+info(y)+'</small><button data-d66-action="edit-custom" data-d66-id="'+esc(y.id)+'">Editar</button><button data-d66-action="delete-custom" data-d66-id="'+esc(y.id)+'">Excluir</button></div>').join('')+'</div>':'')+'</section>';
}
function render(sheet,derived){
 return '<h3>Grimório inteligente</h3><p class="d66-note">D&D 5e (2014), SRD 5.1 · Magias por classe, preparo, progressão e criações próprias.</p>'+
 stats(sheet)+'<div class="d66-tabs">'+[['catalog','Catálogo'],['mine','Minhas magias'],['create','Criar magia']].map(k=>
 '<button data-d66-view="'+k[0]+'" aria-selected="'+(state.view===k[0])+'">'+k[1]+'</button>').join('')+'</div>'+
 (state.view==='catalog'?catalog(sheet):state.view==='mine'?learned(sheet):form())+
 slots(sheet)+'<div class="d18-metrics"><div>CD de magia <strong>'+(derived.spellDC??'—')+'</strong></div><div>Ataque mágico <strong>'+(derived.spellAttack==null?'—':(derived.spellAttack>=0?'+':'')+derived.spellAttack)+'</strong></div></div>'+
 '<p class="d66-note">Multiclasse, magias adicionais de subclasses, talentos e Arcanum Místico exigem ajustes manuais do mestre nesta etapa.</p>';
}
function details(x,notes){
 const summary=(root.Mastermind63SRD||[]).find(y=>y.kind==='Magia SRD 5.1'&&norm(y.name)===norm(x.name));
 root.Mastermind62Descriptions?.open?.({systemId:'d-d',kind:x.homebrew?'Magia Homebrew':'Magia SRD 5.1',name:x.name,
 description:x.homebrew?x.description:summary?.description||'',
 summary:info(x)+' · '+[x.castingTime,x.range,x.duration,x.components].filter(Boolean).join(' · '),
 notes:notes||'',origin:x.homebrew?'Criação da campanha':'D&D 5e SRD 5.1'});
}
function action(b,s,save,refresh){
 if(b.dataset.d66View){state.view=b.dataset.d66View;state.editing='';refresh();return true}
 const cmd=b.dataset.d66Action;if(!cmd)return false;
 try{
 if(cmd==='learn'){const x=byId(b.dataset.d66Id);if(!x)throw Error('Magia indisponível.');E.addSpell(s,x,{homebrew:!!x.homebrew});save();refresh();}
 else if(cmd==='remove'){const i=Number(b.dataset.d66Index);if(!s.spells?.[i]||!confirm('Remover esta magia da ficha?'))return true;s.spells.splice(i,1);save();refresh();}
 else if(cmd==='prepare'||cmd==='unprepare'){const i=Number(b.dataset.d66Index),x=s.spells?.[i];if(!x)throw Error('Magia inexistente.');
 if(cmd==='unprepare'&&E.policy(s).mode==='prepared')s.spells.splice(i,1);else E.togglePrepared(s,i,!x.prepared);save();refresh();}
 else if(cmd==='detail'){const x=byId(b.dataset.d66Id);if(x)details(x);}
 else if(cmd==='detail-own'){const x=s.spells?.[Number(b.dataset.d66Index)];if(x)details(savedSpell(x)||x,x.notes||'');}
 else if(cmd==='sync-slots'){E.suggestedSlotSync(s);s.spellcastingAbility||=E.ABILITY[s.klass]||'';save();refresh();}
 else if(cmd==='edit-custom'){state.editing=b.dataset.d66Id;state.view='create';refresh();}
 else if(cmd==='cancel-edit'){state.editing='';refresh();}
 else if(cmd==='delete-custom'){if(!confirm('Excluir a magia da biblioteca? Registros nas fichas serão preservados.'))return true;localStorage.setItem(STORE,JSON.stringify(customs().filter(x=>x.id!==b.dataset.d66Id)));state.editing='';refresh();}
 else if(cmd==='save-custom'){
   const host=b.closest('#r18-dnd'),get=k=>host.querySelector('#d66-new-'+k)?.value||'';
   const classes=[...host.querySelectorAll('[data-d66-class]:checked')].map(x=>x.dataset.d66Class);
   const x=E.makeCustomSpell({id:state.editing||undefined,name:get('name'),level:get('level'),school:get('school'),castingTime:get('castingTime'),
   range:get('range'),duration:get('duration'),components:get('components'),description:get('description'),classes,
   ritual:!!host.querySelector('#d66-new-ritual')?.checked,concentration:!!host.querySelector('#d66-new-concentration')?.checked});
   const custom=customs(),i=custom.findIndex(y=>y.id===x.id);
   if(i<0&&custom.length>=250)throw Error('Máximo de 250 magias personalizadas.');
   if(i<0&&custom.some(y=>norm(y.name)===norm(x.name)))throw Error('Já existe magia própria com esse nome.');
   if(i>=0)custom[i]=x;else custom.push(x);
   localStorage.setItem(STORE,JSON.stringify(custom));
   for(const y of s.spells||[])if(y.sourceId===x.id){y.name=x.name;y.level=x.level}
   save();state.editing='';state.view='catalog';refresh();
 }
 }catch(e){alert(e.message||String(e))}
 return true;
}
function change(t,render){
 if(t.id==='d66-level'){state.level=t.value;render();return true}
 if(t.id==='d66-eligible'){state.onlyEligible=t.checked;render();return true}
 return false;
}
function input(t,host){
 if(t.id!=='d66-search')return false;
 state.query=t.value;const query=norm(state.query);
 for(const el of host.querySelectorAll('[data-d66-name]'))el.hidden=!!query&&!norm(el.dataset.d66Name).includes(query);
 return true;
}
root.Mastermind66GrimoireUI={render,action,change,input,customs,state};
})(window);
