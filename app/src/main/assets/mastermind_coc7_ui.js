/* Ficha original de investigador de Chamado de Cthulhu 7e, sem textos dos livros.
 * Funciona offline, compartilhando o tema e o sistema de campanhas do Mastermind. */
(()=>{'use strict';
const E=window.COC7_ENGINE;if(!E)return;
const KEY=E.KEY,SELECT='mastermind-coc7-selected-v1',esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let characters=[],selected='',tab='attributes',host=null,lastRoll='',remote=null,remoteSave=null;
function load(){
 try{characters=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{characters=[]}
 if(!Array.isArray(characters))characters=[];
 characters=characters.filter(c=>c?.systemId===E.SYSTEM).slice(0,60).map(c=>{try{return E.validate(c)}catch{return null}}).filter(Boolean);
 if(!characters.length)characters=[E.newCharacter()];
 selected=localStorage.getItem(SELECT)||characters[0].id;
 if(!characters.find(c=>c.id===selected))selected=characters[0].id;
}
function current(){return remote||characters.find(c=>c.id===selected)||characters[0];}
function save(){if(remote)return;localStorage.setItem(KEY,JSON.stringify(characters));localStorage.setItem(SELECT,selected);}
function escapeAttr(s){return esc(s);}
const options=(a,v)=>a.map(([id,name])=>'<option value="'+esc(id)+'"'+(id===v?' selected':'')+'>'+esc(name)+'</option>').join('');
const input=(label,value,kind,attrs='')=>'<label>'+esc(label)+'<input '+attrs+' data-coc-field="'+esc(kind)+'" value="'+esc(value??'')+'"></label>';
function ensure(){if(!characters.length)load();}
function apply(fn){
 const old=current();const copy=E.validate(old);fn(copy);
 const next=E.refresh(copy);if(remote)remote=next;else{const i=characters.findIndex(x=>x.id===selected);characters[i]=next;save();}
 render();
}
function metric(label,v){return '<div class="coc-metric"><small>'+esc(label)+'</small><strong>'+esc(v)+'</strong></div>';}
function attributes(c){
 const d=E.derived(c);
 return '<div class="coc-grid">'+[
 input('Nome do investigador',c.name,'name','maxlength="100"'),
 '<label>Ocupação<select data-coc-field="occupation">'+options([[c.occupation,c.occupation],...Object.keys(E.professions).filter(k=>k!==c.occupation).map(k=>[k,k])],c.occupation)+'</select></label>',
 input('Idade',c.age,'age','type="number" min="15" max="110"'),
 input('Época',c.era,'era','maxlength="90"'),
 input('Local de nascimento',c.birthplace,'birthplace','maxlength="140"'),
 input('Residência',c.residence,'residence','maxlength="140"')
 ].join('')+'</div>'+
 '<h4>Características (percentis)</h4><div class="coc-stat-grid">'+E.ATTRS.map(k=>{
 const levels=E.thresholds(c.attributes[k]);return '<label class="coc-stat"><span>'+esc(k)+'</span><input type="number" min="1" max="200" data-coc-attr="'+k+'" value="'+c.attributes[k]+'"><small>'+levels.hard+' difícil · '+levels.extreme+' extremo</small><button type="button" data-coc-roll-attr="'+k+'">Rolar d100</button></label>';
 }).join('')+'</div><h4>Recursos do investigador</h4>'+
 '<div class="coc-stat-grid">'+['HP','MP','SAN','LUCK'].map(k=>{
 const names={HP:'Pontos de vida',MP:'Pontos de magia',SAN:'Sanidade',LUCK:'Sorte'};
 return '<label class="coc-stat"><span>'+names[k]+'</span><strong>'+c.resources[k].current+' / '+c.resources[k].max+'</strong><input type="number" min="0" max="'+c.resources[k].max+'" data-coc-resource="'+k+'" value="'+c.resources[k].current+'"></label>';
 }).join('')+'</div><div class="coc-metrics">'+metric('MOV sugerido',d.MOV)+metric('Constituição',c.attributes.CON)+metric('Pontos de magia máximos',d.MP)+metric('SAN máxima',d.MAX_SAN)+metric('Bônus de dano',d.damageBonus)+metric('Constituição física',d.build??'Consulte o Guardião')+'</div>';
}
function skills(c){
 let entries=Object.entries(c.skills||{}).sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
 return '<p>Testes percentuais: normal, difícil (metade) e extremo (um quinto). Marque perícias usadas com sucesso para revisão ao final do cenário.</p>'+
 '<label>Perícia de ocupação<select data-coc-prof-skill>'+options(Object.entries(E.professions).map(([p])=>[p,p]),c.occupation)+'</select></label>'+
 '<div class="coc-skills">'+entries.map(([name,v])=>{
 const d=E.thresholds(v),checked=c.skillChecks?.includes(name);
 return '<div class="coc-skill"><label>'+esc(name)+'<input aria-label="Valor de '+esc(name)+'" type="number" min="0" max="100" data-coc-skill="'+esc(name)+'" value="'+v+'"></label><small>Difícil '+d.hard+' · Extremo '+d.extreme+'</small><button type="button" data-coc-roll-skill="'+esc(name)+'">d100</button><label class="coc-mark"><input type="checkbox" data-coc-check="'+esc(name)+'" '+(checked?'checked':'')+'> Evoluir</label></div>';
 }).join('')+'</div><button type="button" data-coc-add-skill>+ Perícia personalizada</button> '+
 '<button type="button" data-coc-advance>Revisar evolução das perícias marcadas</button>';
}
function multiline(c,key,title,placeholder){
 const entries=c[key]||[];
 return '<h4>'+esc(title)+'</h4><p>Registre nomes e anotações próprios, sem copiar automaticamente textos de livros.</p>'+
 '<div class="coc-entries">'+entries.map((x,i)=>'<div class="coc-entry">'+esc(x)+' <button type="button" data-coc-remove-entry="'+key+'" data-index="'+i+'">Remover</button></div>').join('')+'</div>'+
 '<input placeholder="'+esc(placeholder)+'" data-coc-new-entry="'+key+'" maxlength="220"> <button type="button" data-coc-add-entry="'+key+'">Adicionar</button>';
}
function body(c){
 if(tab==='attributes')return attributes(c);
 if(tab==='skills')return skills(c);
 if(tab==='inventory')return multiline(c,'inventory','Itens e equipamentos','Nome do item')+'<hr>'+multiline(c,'spells','Rituais e conhecimentos','Nome ou referência');
 return '<label>História<textarea data-coc-text="history" rows="6" maxlength="25000">'+esc(c.history)+'</textarea></label>'+
 '<label>Anotações do jogador<textarea data-coc-text="notes" rows="6" maxlength="25000">'+esc(c.notes)+'</textarea></label>';
}
function render(){
 if(!host)return;ensure();const c=current();if(!c)return;
 const selection=remote?'<strong>Ficha do servidor — edite e salve na campanha</strong>':'<label>Investigador<select id="coc-select">'+options(characters.map(x=>[x.id,x.name||'Investigador']),selected)+'</select></label>';
 host.innerHTML='<section class="coc-shell"><div class="coc-head"><div><span class="eyebrow">INVESTIGADORES · 7ª EDIÇÃO</span><h2>Chamado de Cthulhu</h2><p>Ficha local, investigação, perícias percentuais e dados. Regras-base públicas da Chaosium; consulte seus PDFs para detalhes e suplementos.</p></div>'+
 '<div class="coc-actions">'+selection+
 (remote?'<button data-coc-save-remote>Salvar na campanha</button><button data-coc-cancel-remote>Fechar edição</button>':'<button data-coc-new>+ Novo investigador</button><button data-coc-delete>Excluir</button><button data-coc-export>Exportar JSON</button><label class="coc-file">Importar JSON<input type="file" id="coc-file" accept="application/json,.json" hidden></label>')+'</div></div>'+
 '<div class="coc-tabs">'+[['attributes','Atributos e recursos'],['skills','Perícias e rolagens'],['inventory','Inventário e rituais'],['history','História e notas']].map(([id,name])=>'<button data-coc-tab="'+id+'"'+(tab===id?' class="active"':'')+'>'+name+'</button>').join('')+'</div>'+
 '<div class="coc-body">'+body(c)+'</div><div class="coc-rollbox" aria-live="polite">'+esc(lastRoll||'Escolha uma característica ou perícia para rolar 1d100.')+
 '<label>Bônus / penalidade<select id="coc-bonus">'+options([['0','Normal'],['1','1 dado de bônus'],['2','2 dados de bônus'],['-1','1 dado de penalidade'],['-2','2 dados de penalidade']],'0')+'</select></label></div>'+
 '<p class="coc-footnote">Sistema independente e não oficial. Não contém livros, material narrativo ou tabelas pagas da Chaosium. Seus dados permanecem locais.</p></section>';
}
function rollValue(name,value){
 const bonus=Number(host?.querySelector('#coc-bonus')?.value)||0;
 const out=E.roll(value,undefined,bonus);
 const outcome={critical:'Crítico',extreme:'Sucesso extremo',hard:'Sucesso difícil',regular:'Sucesso normal',fail:'Falha',fumble:'Falha crítica'};
 lastRoll=name+': '+out.rolled+' em d100 · '+outcome[out.outcome]+' (alvo '+out.skill+' / '+out.hard+' / '+out.extreme+')';
 const area=host.querySelector('.coc-rollbox');if(area)area.firstChild.textContent=lastRoll;
}
function addEntry(key,value){if(!value)return;apply(c=>{c[key]=c[key]||[];c[key].push(value.slice(0,220));});}
function download(c){const data=JSON.stringify(E.validate(c),null,2),file=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=(c.name||'investigador').replace(/[^a-zA-Z0-9_-]/g,'_')+'-coc7.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function importJson(file){
 if(!file||file.size>5*1024*1024)throw Error('Arquivo JSON ausente ou grande demais');
 const data=E.validate(JSON.parse(await file.text()));if(characters.some(x=>x.id===data.id))data.id=E.newCharacter().id;
 if(characters.length>=60)throw Error('Limite de 60 investigadores por biblioteca');
 characters.push(data);selected=data.id;save();render();
}
async function handleClick(e){
 const b=e.target.closest('button');if(!b||!host?.contains(b))return;
 if(b.dataset.cocTab){tab=b.dataset.cocTab;render();return;}
 if(b.dataset.cocRollAttr){const c=current();rollValue(b.dataset.cocRollAttr,c.attributes[b.dataset.cocRollAttr]);return;}
 if(b.dataset.cocRollSkill){const c=current();rollValue(b.dataset.cocRollSkill,c.skills[b.dataset.cocRollSkill]);return;}
 if(b.hasAttribute('data-coc-new')){if(characters.length>=60)return alert('Limite de 60 investigadores');const c=E.newCharacter();characters.push(c);selected=c.id;save();render();return;}
 if(b.hasAttribute('data-coc-delete')){if(!confirm('Excluir apenas a ficha selecionada? Faça backup antes se necessário.'))return;characters=characters.filter(c=>c.id!==selected);if(!characters.length)characters=[E.newCharacter()];selected=characters[0].id;save();render();return;}
 if(b.hasAttribute('data-coc-export')){download(current());return;}
 if(b.hasAttribute('data-coc-save-remote')){if(remoteSave){const copy=toCampaignSheet(remote);await remoteSave(copy);remote=null;remoteSave=null;render();}return;}
 if(b.hasAttribute('data-coc-cancel-remote')){remote=null;remoteSave=null;render();return;}
 if(b.hasAttribute('data-coc-add-skill')){const name=prompt('Nome da perícia personalizada:')?.trim();if(!name||name.length>100)return;apply(c=>{if(c.skills[name]===undefined)c.skills[name]=0;});return;}
 if(b.hasAttribute('data-coc-advance')){const c=current();const updated=E.advancement(c);lastRoll=updated.changes.length?updated.changes.map(x=>x.name+' '+x.before+'→'+x.after).join(' · '):'Nenhuma perícia evoluiu nesta revisão.';if(remote)remote=updated.character;else{characters[characters.findIndex(x=>x.id===selected)]=updated.character;save();}render();return;}
 if(b.dataset.cocAddEntry){const field=host.querySelector('[data-coc-new-entry="'+b.dataset.cocAddEntry+'"]');addEntry(b.dataset.cocAddEntry,field?.value.trim());return;}
 if(b.dataset.cocRemoveEntry){const key=b.dataset.cocRemoveEntry,i=Number(b.dataset.index);apply(c=>{c[key].splice(i,1);});return;}
}
function handleChange(e){
 const t=e.target;
 if(t.id==='coc-select'){selected=t.value;localStorage.setItem(SELECT,selected);render();return;}
 if(t.id==='coc-file'){importJson(t.files?.[0]).catch(x=>alert('Importação inválida: '+x.message));return;}
 const key=t.dataset.cocField;if(key){apply(c=>{c[key]=key==='age'?Number(t.value):t.value;});return;}
 const attr=t.dataset.cocAttr;if(attr){apply(c=>{c.attributes[attr]=Number(t.value);});return;}
 const skill=t.dataset.cocSkill;if(skill){apply(c=>{c.skills[skill]=Number(t.value);});return;}
 const check=t.dataset.cocCheck;if(check){apply(c=>{c.skillChecks=t.checked?[...new Set([...(c.skillChecks||[]),check])]:c.skillChecks.filter(k=>k!==check);});return;}
 const res=t.dataset.cocResource;if(res){apply(c=>{c.resources[res].current=Number(t.value);if(res==='LUCK')c.luck=Number(t.value);});return;}
 const text=t.dataset.cocText;if(text){apply(c=>{c[text]=t.value;});return;}
}
function mount(node){if(!node)return;host=node;ensure();render();if(!node.dataset.cocReady){node.addEventListener('click',handleClick);node.addEventListener('change',handleChange);node.dataset.cocReady='1';}}
function toCampaignSheet(c){const v=E.validate(c);return {...v,systemId:E.SYSTEM,resources:{...v.resources,PV:{...v.resources.HP},PE:{...v.resources.MP}}};}
function editRemote(sheet,saveCallback){
 remote=E.validate(sheet);remoteSave=saveCallback;tab='attributes';
 const lib=document.querySelector('#screen-library');window.RPG_DEMO?.navigate('library');
 window.RPG15?.openSystem?.(E.SYSTEM);const slot=document.querySelector('#r15-ordem-book');mount(slot);slot?.scrollIntoView({block:'start',behavior:'smooth'});
}
load();
window.MastermindCoc7={mount,editRemote,toCampaignSheet,get current(){return current()},get characters(){return [...characters]}};
})();