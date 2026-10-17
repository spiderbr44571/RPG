/* GURPS 4ª Edição — ficha local; o conteúdo dos livros permanece no acervo privado. */
(()=>{'use strict';
const E=window.GURPS4_ENGINE;if(!E)return;
const KEY='rpg-gurps4-characters-v1',SEL='rpg-gurps4-selected-v1';
const ids=['identidade','pericias','vantagens','combate','equipamento','magia','historia'];
const labels=['Atributos','Perícias','Vantagens e Desvantagens','Combate','Equipamento','Magia / Poderes','História'];
const $=s=>document.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let list=[],selected='',tab='identidade',host=null,rollTimeout=0,active=false,remote=null;
const number=(x,defaultValue=0)=>Number.isFinite(Number(x))?Number(x):defaultValue;
const attrNames={ST:'Força · ST',DX:'Destreza · DX',IQ:'Inteligência · IQ',HT:'Vitalidade · HT'};
const source='GURPS 4ª edição · GURPS Lite (p. 2, 4–6, 12–29) e Módulo Básico. Consulte os livros para opções avançadas.';
function load(){try{list=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(list))list=[]}catch{list=[]}
 list=list.filter(x=>x&&x.systemId==='gurps'&&x.edition==='4e').slice(0,60);
 if(!list.length){list=[E.create()];write()}
 selected=localStorage.getItem(SEL)||list[0].id;if(!list.some(x=>x.id===selected))selected=list[0].id;}
function write(){if(remote)return;try{localStorage.setItem(KEY,JSON.stringify(list));localStorage.setItem(SEL,selected)}catch(e){throw Error('Armazenamento cheio. Exporte a ficha antes de adicionar imagens.')}}
function current(){return list.find(x=>x.id===selected)||list[0]}
function selects(value,options){return options.map(([v,l])=>'<option value="'+esc(v)+'"'+(String(v)===String(value)?' selected':'')+'>'+esc(l)+'</option>').join('')}
function choice(value,arr){return selects(value,arr.map(s=>[s,s]))}
function field(name,value,type='text',min='',max='',step='1'){return '<label><span>'+esc(name)+'</span><input data-field="'+esc(name)+'" type="'+type+'" value="'+esc(value??'')+'" '+(min!==''?'min="'+min+'"':'')+' '+(max!==''?'max="'+max+'"':'')+' step="'+step+'"></label>'}
function metric(title,value,action='',description=''){return '<div class="g-metric"><span>'+esc(title)+'</span><b>'+esc(value)+'</b>'+(description?'<small>'+esc(description)+'</small>':'')+(action?'<button data-roll="'+action+'">🎲 3d6</button>':'')+'</div>'}
function optsAttrs(current){return selects(current,[['ST','ST'],['DX','DX'],['IQ','IQ'],['HT','HT'],['Per','Percepção'],['Will','Vontade']])}
function attrFor(s,k){const d=E.derived(s);return k==='Per'?d.per:k==='Will'?d.will:(Number(s.attrs[k])||10)}
function renderAttrs(s){
 const d=E.derived(s),p=E.spent(s);const meter=(label,max,value,k)=>'<div><div class="g-heading"><strong>'+label+'</strong><span>'+esc(value)+' / '+max+'</span></div><div class="g-bar"><i style="width:'+Math.max(0,Math.min(100,max?value/max*100:0))+'%"></i></div><div class="g-inline" style="margin-top:7px"><button data-resource="'+k+'" data-step="-1">− 1</button><button data-resource="'+k+'" data-step="1">+ 1</button><input style="max-width:95px" data-current="'+k+'" type="number" value="'+esc(value)+'" min="-'+max*5+'" max="'+max+'"></div></div>';
 return '<div class="g-split"><section class="g-panel"><h3>Quatro atributos básicos</h3><p class="g-muted">Humanos começam em 10. ST/HT: ±10 pontos por nível; DX/IQ: ±20.</p><div class="g-col">'+Object.keys(attrNames).map(k=>'<label><span>'+attrNames[k]+' ['+(s.attrs[k]-10)*E.costs[k]+' pts]</span><div class="g-inline"><input data-attr="'+k+'" type="number" min="1" max="100" value="'+esc(s.attrs[k])+'" style="flex:1"><button data-roll="attr:'+k+'">🎲</button></div></label>').join('')+'</div><hr class="g-hr"><h3>Características secundárias</h3><div class="g-col">'+[
  ['HP','Pontos de Vida',d.HP,'hp','2 pts/nível'],['FP','Pontos de Fadiga',d.FP,'fp','3 pts/nível'],
  ['Vont','Vontade',d.will,'will','5 pts/nível'],['Per','Percepção',d.per,'per','5 pts/nível'],
  ['Speed','Velocidade Básica',d.speed,'speed','5 pts/0,25'],['Move','Deslocamento Básico',d.move,'move','5 pts/nível']
 ].map(([key,name,val,mod,tip])=>'<label><span>'+name+' · '+tip+'</span><div class="g-inline"><strong style="min-width:40px">'+esc(val)+'</strong><input type="number" data-mod="'+mod+'" value="'+esc(s.mod[mod]||0)+'" step="'+(mod==='speed'?.25:1)+'" min="-20" max="30" style="flex:1"><button data-roll="derived:'+key+'">🎲</button></div></label>').join('')+'</div></section>'+
 '<div><section class="g-panel"><h3>Recursos atuais</h3><div class="g-stacked">'+meter('PV / HP',d.HP,s.currentHP,'HP')+meter('PF / FP',d.FP,s.currentFP,'FP')+'</div><p class="g-muted">Os recursos atuais podem cair abaixo de zero; os limites e consequências dependem das regras de ferimentos/fadiga.</p></section>'+
 '<section class="g-panel"><h3>Movimento e defesas</h3><div class="g-metrics">'+metric('Esquiva',d.dodge,'defense:dodge')+metric('Base de Carga',d.basicLift.toFixed(2)+' kg')+metric('Carga',d.mass.toFixed(2)+' kg')+metric('Nível de carga',d.enc===5?'Acima do máximo':d.enc)+metric('Deslocamento c/ carga',d.moveLoaded)+metric('Proteção RD / DR',d.DR)+'</div><p class="g-muted">A Esquiva considera carga e bônus do escudo. Aparar e Bloqueio são configurados por perícia na aba Combate.</p><div class="g-col"><label><span>Bônus de Defesa do escudo (DB)</span><input type="number" data-setting="shieldDB" min="0" max="9" value="'+(s.settings.shieldDB||0)+'"></label><label><span>RD adicional manual</span><input type="number" data-setting="manualDR" min="0" max="999" value="'+(s.settings.manualDR||0)+'"></label></div></section></div></div>'+
 (p.remaining<0?'<p class="g-warning">Atenção: personagem excede o orçamento em '+Math.abs(p.remaining)+' pontos. Não há bloqueio para ajustes do mestre.</p>':'');
}
function renderSkills(s){
 const d=E.derived(s),p=E.spent(s);
 const rows=(s.skills||[]).map((x,i)=>{
 const level=E.skillLevel(x,{...s.attrs,Per:d.per,Will:d.will});
 return '<tr><td><strong>'+esc(x.name)+'</strong><small>'+esc(x.specialty||'')+'</small></td><td>'+esc(x.attr)+' / '+esc(x.diff)+'</td><td>'+esc(x.points)+' pt</td><td><b>'+(level??'—')+'</b></td><td class="g-actions"><button data-roll="skill:'+i+'">🎲</button> <button data-remove="skills:'+i+'" aria-label="Excluir perícia">×</button></td></tr>'}).join('');
 return '<section class="g-panel"><div class="g-heading"><div><h3>Perícias, especializações e técnicas</h3><p class="g-muted">Perícias não têm uma lista fixa comum a todos os mundos. Cadastre a perícia e sua dificuldade conforme a edição do livro.</p></div><strong class="g-chip">'+p.skills+' pontos investidos</strong></div><div class="g-scroller"><table class="g-table"><thead><tr><th>Perícia</th><th>Base</th><th>Pontos</th><th>NH</th><th>Ações</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(s.skills?.length?'':'<p class="g-empty">Nenhuma perícia cadastrada.</p>')+'</section>'+
 '<section class="g-panel"><h3>Adicionar perícia</h3><div class="g-col"><label><span>Selecionar uma perícia do GURPS Lite (opcional)</span><select id="g-skill-suggest"><option value="">Perícia personalizada ou escolher da lista</option>'+(window.GURPS4_LITE_SKILLS||[]).map((k,i)=>'<option value="'+i+'">'+esc(k.name)+' · '+k.attr+'/'+k.diff+'</option>').join('')+'</select></label><label><span>Nome</span><input id="g-skill-name" placeholder="Ex.: Furtividade" maxlength="100"></label><label><span>Especialização (se exigida)</span><input id="g-skill-spec" maxlength="90" placeholder="Ex.: Pistola / NT 8"></label><label><span>Atributo</span><select id="g-skill-attr">'+optsAttrs('DX')+'</select></label><label><span>Dificuldade</span><select id="g-skill-diff">'+selects('A',[['E','Fácil (F)'],['A','Média (M)'],['H','Difícil (D)'],['VH','Muito Difícil (MD)']])+'</select></label><label><span>Pontos investidos</span><select id="g-skill-pts">'+choice('1',[1,2,4,8,12,16,20,24,28,32,40])+'</select></label><label><span>Bônus/penalidade de NH</span><input id="g-skill-bonus" type="number" value="0" min="-30" max="30"></label></div><button class="g-primary" data-add="skill">+ Adicionar perícia</button><p class="g-muted">1, 2, 4 e 8 pontos determinam os primeiros níveis; cada +4 pontos adiciona +1 NH após 8. Dificuldade Muito Difícil segue o Módulo Básico.</p></section>'+
 listEditor('Técnicas / Especializações','techniques','Técnica',false,true);
}
function listEditor(title,key,hint,negative=false,extras=false){
 const arr=current()[key]||[];
 return '<section class="g-panel"><div class="g-heading"><h3>'+esc(title)+'</h3><span class="g-chip">'+arr.length+' registro(s)</span></div><div class="g-stacked">'+arr.map((x,i)=>'<div class="g-item"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.details||'')+(x.points!==undefined?' · '+x.points+' pts':'')+'</small></div><button data-remove="'+key+':'+i+'">Remover</button></div>').join('')+'</div><div class="g-col"><label><span>Nome</span><input id="g-add-name-'+key+'" placeholder="'+esc(hint)+'" maxlength="120"></label><label><span>Custo em pontos</span><input id="g-add-points-'+key+'" type="number" min="-500" max="500" value="'+(negative?-5:1)+'"></label><label><span>Notas e limitações</span><input id="g-add-details-'+key+'" maxlength="320" placeholder="Nível, pré-requisitos, efeito..."></label></div><button class="g-primary" data-add="'+key+'">+ Adicionar</button></section>';
}
function traits(s){
 const p=E.spent(s);
 return '<section class="g-panel"><h3>Distribuição de pontos</h3><div class="g-metrics">'+
 [['Atributos',p.attribute],['Secundárias',p.secondary],['Vantagens',p.advantages],['Desvantagens',p.disadvantages],['Peculiaridades',p.quirks],['Perícias',p.skills],['Técnicas',p.techniques],['Idiomas',p.languages],['Culturas',p.cultures],['Magias',p.spells],['Outros',p.misc],['Restantes',p.remaining]].map(([k,v])=>metric(k,v)).join('')+'</div><div class="g-col"><label><span>Pontos fornecidos pelo mestre</span><input data-root="pointBudget" type="number" value="'+s.pointBudget+'" min="0" max="100000"></label><label><span>Bônus de pontos adicionais</span><input data-root="unspentBonus" type="number" value="'+s.unspentBonus+'" min="-10000" max="10000"></label><label><span>Custos adicionais conforme suplementos</span><input data-root="traitsCost" type="number" value="'+(s.traitsCost||0)+'"></label></div></section>'+
 listEditor('Vantagens e qualidades','advantages','Ex.: Reflexos em Combate')+
 listEditor('Desvantagens','disadvantages','Ex.: Desvantagem (conferir custo)',true)+
 listEditor('Peculiaridades','quirks','Ex.: Peculiaridade',true)+
 listEditor('Idiomas e escrita','languages','Idioma / nível')+
 listEditor('Familiaridades culturais','cultures','Cultura / cenário');
}
function renderCombat(s){
 const d=E.derived(s);
 return '<section class="g-panel"><h3>Testes e defesas</h3><p class="g-muted">O GURPS usa 3d6 por baixo do nível efetivo. Ataques e defesas ativas são testes separados. O mestre escolhe modificadores de combate.</p><div class="g-metrics">'+metric('Esquiva com carga',d.dodge,'defense:dodge')+metric('Velocidade Básica',d.speed)+metric('Movimento',d.moveLoaded)+metric('RD total',d.DR)+metric('GdP / Thrust',d.thrust||'tabela')+metric('GeB / Swing',d.swing||'tabela')+'</div><div class="g-col"><label><span>NH de Aparar (de habilidade adequada)</span><input id="g-parry" type="number" min="0" max="40" value="'+(s.parrySkill||0)+'"></label><label><span>NH de Bloqueio (escudo)</span><input id="g-block" type="number" min="0" max="40" value="'+(s.blockSkill||0)+'"></label><label><span>Modificador de teste (situacional)</span><input id="g-sit-mod" type="number" min="-30" max="30" value="0"></label></div><div class="g-controls"><button data-roll="defense:parry">🎲 Aparar</button><button data-roll="defense:block">🎲 Bloqueio</button><button data-roll="reaction">🎲 Reação 3d6</button></div><p class="g-muted">Fórmula inicial de Aparar/Bloqueio: ⌊NH/2⌋ + 3; a ficha não aplica automaticamente todas as modificações especiais.</p></section>'+
 '<section class="g-panel"><h3>Armas e ataques</h3><p class="g-muted">As fórmulas de dano aceitam 1d+1, 2d-2, thr+1 e sw+2. Tipos de dano, multiplicadores de lesão, locais de acerto e divisores de armadura continuam sob validação do mestre.</p><div class="g-stacked">'+(s.weapons||[]).map((w,i)=>'<div class="g-item"><div><strong>'+esc(w.name)+'</strong><small>'+esc(w.damage||'sem fórmula')+' · '+esc(w.damageType||'')+' · '+esc(w.weight||0)+' kg · '+esc(w.notes||'')+'</small></div><div class="g-controls"><button data-roll="attack:'+i+'">🎲 Ataque</button><button data-roll="damage:'+i+'">🎲 Dano</button><button data-remove="weapons:'+i+'">×</button></div></div>').join('')+'</div><div class="g-col"><label><span>Nome da arma</span><input id="g-weapon-name" placeholder="Arma" maxlength="100"></label><label><span>Perícia associada</span><select id="g-weapon-skill"><option value="">Teste de DX</option>'+s.skills.map((k,i)=>'<option value="'+i+'">'+esc(k.name)+'</option>').join('')+'</select></label><label><span>Dano (dados ou ST)</span><input id="g-weapon-damage" placeholder="sw+1" maxlength="32"></label><label><span>Tipo de dano (informativo)</span><input id="g-weapon-type" placeholder="cut / imp / cr / pi" maxlength="30"></label><label><span>Peso kg</span><input type="number" id="g-weapon-weight" min="0" step=".1" value="1"></label><label><span>Notas</span><input id="g-weapon-notes" maxlength="250"></label></div><button class="g-primary" data-add="weapon">+ Adicionar arma</button></section>'+
 '<section class="g-panel"><h3>Rolagem livre de dados</h3><div class="g-inline"><input id="g-free-dice" placeholder="Ex.: 3d, 2d+2 ou 1d-1" value="3d" style="max-width:230px"><button data-roll="free" class="g-primary">🎲 Rolar</button></div></section>';
}
function equipment(s){
 const d=E.derived(s);let items=s.items||[];
 return '<section class="g-panel"><div class="g-heading"><h3>Inventário, armaduras e carga</h3><span class="g-chip">'+d.mass.toFixed(2)+' / '+d.basicLift.toFixed(2)+' kg (sem carga)</span></div><div class="g-metrics">'+metric('Carga atual',d.mass.toFixed(2)+' kg')+metric('Base de Carga',d.basicLift.toFixed(2)+' kg')+metric('Penalidade esquiva',d.enc>4?'Excedida':-d.enc)+metric('RD equipada',d.DR)+'</div><div class="g-stacked">'+items.map((x,i)=>'<div class="g-item"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.category||'Item')+' · '+(x.weight||0)+' kg cada · qtd '+(x.qty||1)+' · RD '+(x.dr||0)+' · $ '+(x.cost||0)+(x.equipped?' · Equipado':'')+'</small><small>'+esc(x.notes||'')+'</small></div><div class="g-controls"><button data-toggle="equipped:'+i+'">'+(x.equipped?'Desequipar':'Equipar')+'</button><button data-remove="items:'+i+'">×</button></div></div>').join('')+'</div></section><section class="g-panel"><h3>Adicionar item ou armadura</h3><div class="g-col"><label><span>Nome</span><input id="g-item-name" maxlength="110" placeholder="Objeto / armadura"></label><label><span>Tipo</span><select id="g-item-category">'+choice('Equipamento',['Equipamento','Armadura','Escudo','Ferramenta','Artefato'])+'</select></label><label><span>Peso por unidade (kg)</span><input id="g-item-weight" type="number" min="0" step=".01" value="0"></label><label><span>Quantidade</span><input id="g-item-qty" type="number" min="1" max="999" value="1"></label><label><span>Custo ($)</span><input id="g-item-cost" type="number" min="0" value="0"></label><label><span>RD / DR (se equipado)</span><input id="g-item-dr" type="number" min="0" max="1000" value="0"></label><label><span>Notas</span><input id="g-item-notes" maxlength="320"></label></div><button class="g-primary" data-add="item">+ Adicionar ao inventário</button><p class="g-warning">A RD exibida é um total simples para consulta. Armaduras por localização e ataques com divisores requerem o módulo avançado.</p></section>';
}
function magic(s){
 return '<section class="g-panel"><h3>Magia, poderes e suplementos</h3><p class="g-muted">GURPS permite campanhas sem magia, com sistemas mágicos diferentes ou poderes personalizados. Os suplementos Magia, Powers e Poderes Psíquicos estão no acervo, mas não foram automatizados integralmente.</p><div class="g-col"><label><span>Pré-requisitos e regras da campanha</span><textarea data-root-text="magicNotes" placeholder="Qual suplemento está ativo? Há Magery? Quais pré-requisitos?">'+esc(s.magicNotes||'')+'</textarea></label></div></section>'+
 listEditor('Magias e técnicas especiais','spells','Nome da magia / técnica')+
 '<p class="g-warning">Registrar uma magia aqui não habilita conjuração automática, vantagens mágicas nem custos desconhecidos. A mecânica detalhada depende do suplemento verificado.</p>';
}
function history(s){
 return '<section class="g-panel"><h3>Identidade, antecedentes e ambientação</h3><div class="g-col">'+
 [['player','Jogador'],['concept','Conceito'],['campaign','Campanha'],['age','Idade'],['height','Altura'],['weight','Peso / porte'],['appearance','Aparência'],['techLevel','Nível Tecnológico (NT)']].map(([k,v])=>'<label><span>'+v+'</span><input data-root="'+k+'" value="'+esc(s[k]??'')+'" maxlength="140"></label>').join('')+
 '</div><label><span>Histórico e motivações</span><textarea data-root-text="background">'+esc(s.background||'')+'</textarea></label><label><span>Outras anotações</span><textarea data-root-text="notes">'+esc(s.notes||'')+'</textarea></label></section>'+
 '<section class="g-panel"><h3>Retrato e dados salvos</h3><div class="g-col"><label><span>Selecionar retrato local</span><input id="g-portrait" type="file" accept="image/png,image/jpeg,image/webp"></label><label><span>Importar ficha GURPS 4e exportada pelo app</span><input id="g-import" type="file" accept=".json,application/json"></label></div><div class="g-controls"><button data-action="export">Exportar ficha JSON</button><button data-action="duplicate">Duplicar personagem</button><button data-action="delete">Excluir personagem</button></div><p class="g-muted">As fichas ficam neste aparelho. Faça uma cópia JSON antes de desinstalar o APK.</p></section>';
}
function header(){
 const s=current(),p=E.spent(s);
 const remoteBar=remote?'<section class="g-panel" style="border:2px solid #d1ad72"><div class="g-eyebrow">MODO MESTRE · EDIÇÃO ONLINE</div><h3>Personagem da campanha</h3><p>As alterações só aparecem para o jogador depois de salvar no servidor.</p><div class="g-controls"><button data-action="save-remote" class="g-primary">Salvar na campanha</button><button data-action="cancel-remote">Voltar à Mestragem</button></div></section>':'';
 return '<div class="g-hero"><div class="g-inline">'+(s.portrait?'<img class="g-portrait" src="'+esc(s.portrait)+'" alt="Retrato de '+esc(s.name)+'">':'<div class="g-portrait" style="display:grid;place-items:center;font:500 38px Georgia,serif;color:#d8bd94">3d6</div>')+'<div><div class="g-eyebrow">GURPS • QUARTA EDIÇÃO</div><h2>'+esc(s.name)+'</h2><div class="g-inline"><span class="g-chip">Pontos: '+p.total+' / '+s.pointBudget+'</span><span class="g-chip">Saldo: '+p.remaining+'</span><span class="g-chip">NT '+esc(s.techLevel)+'</span></div></div></div><div class="g-controls"><select id="g-switch" class="g-sheet-select" aria-label="Selecionar personagem">'+list.map(ch=>'<option value="'+esc(ch.id)+'"'+(ch.id===s.id?' selected':'')+'>'+esc(ch.name)+'</option>').join('')+'</select><button data-action="new" class="g-primary"'+(remote?' disabled':'')+'>+ Ficha</button></div></div>'+
 remoteBar+'<div class="g-eyebrow" style="padding:9px 4px">Módulo de regras GURPS 4ª edição • Ficha local • '+esc(source)+'</div>'+
 '<div class="g-tabs" role="tablist" aria-label="Seções GURPS">'+ids.map((id,i)=>'<button data-tab="'+id+'" role="tab" aria-selected="'+String(id===tab)+'">'+labels[i]+'</button>').join('')+'</div>';
}
function render(full=true){
 if(!host)return;
 let s=current();if(!s)return;
 const sections={identidade:renderAttrs,pericias:renderSkills,vantagens:traits,combate:renderCombat,equipamento:equipment,magia:magic,historia:history};
 host.innerHTML=header()+'<div id="g-body">'+sections[tab](s)+'</div><div id="g-result" class="g-roll-box" role="status" aria-live="polite"></div><p id="g-message" aria-live="polite"></p>';
}
function notify(msg,error=false){const e=host?.querySelector('#g-message');if(e){e.textContent=msg;e.className=error?'g-error':'g-muted'}}
function persist(){write()}
function rerender(){persist();render()}
function ensure(max,x){return Math.max(-max,Math.min(max,Number(x)||0))}
function showResult(label,dice,result,sub){
 const popup=host.querySelector('#g-result');if(!popup)return;
 popup.innerHTML='<div class="g-eyebrow">'+esc(label)+'</div><div class="g-faces">'+dice.map((n,i)=>'<div class="g-face" style="animation-delay:'+i*100+'ms">'+n+'</div>').join('')+'</div><b>'+esc(result)+'</b><span>'+esc(sub||'')+'</span>';
 popup.classList.add('open');clearTimeout(rollTimeout);rollTimeout=setTimeout(()=>popup.classList.remove('open'),3800);
}
function rollTarget(label,target,modifier=0){
 const result=E.roll(target,modifier);
 showResult(label,result.faces,result.total+' / alvo '+result.target,result.grade+' · margem '+result.margin);
 const s=current();s.log.unshift({at:new Date().toISOString(),label,faces:result.faces,total:result.total,target:result.target,grade:result.grade});s.log=s.log.slice(0,60);persist();
}
function rollDamage(label,formula){
 const s=current(),v=E.rollDamage(formula,s);
 showResult(label,v.faces,'Dano básico '+v.total,'Dano ainda depende de RD, tipo e local de acerto');
 s.log.unshift({at:new Date().toISOString(),label,faces:v.faces,total:v.total,formula});s.log=s.log.slice(0,60);persist();
}
function get(id){return host.querySelector('#'+id)?.value?.trim()||''}
function add(type){
 const s=current();
 if(type==='skill'){
  const name=get('g-skill-name');if(!name)throw Error('Informe o nome da perícia.');
  s.skills.push({name,specialty:get('g-skill-spec'),attr:get('g-skill-attr'),diff:get('g-skill-diff'),points:Number(get('g-skill-pts')),bonus:Number(get('g-skill-bonus'))||0});
 }else if(type==='weapon'){
  const name=get('g-weapon-name'),damage=get('g-weapon-damage');
  if(!name)throw Error('Informe uma arma.');
  if(damage&&!E.parseDamage(damage,s))throw Error('Dano inválido. Use thr, sw, 2d+1 etc. ST superior a 20 exige tabela específica.');
  s.weapons.push({name,skillIndex:get('g-weapon-skill'),damage,damageType:get('g-weapon-type'),weight:ensure(10000,get('g-weapon-weight')),qty:1,notes:get('g-weapon-notes')});
 }else if(type==='item'){
  const name=get('g-item-name');if(!name)throw Error('Informe o nome do item.');
  s.items.push({name,category:get('g-item-category'),weight:Math.max(0,ensure(10000,get('g-item-weight'))),qty:Math.max(1,Math.min(999,Number(get('g-item-qty'))||1)),cost:Math.max(0,ensure(1e8,get('g-item-cost'))),dr:Math.max(0,ensure(999,get('g-item-dr'))),notes:get('g-item-notes'),equipped:false});
 }else{
  const name=get('g-add-name-'+type);if(!name)throw Error('Informe o nome.');
  const points=Number(get('g-add-points-'+type));if(!Number.isFinite(points)||points>500||points< -500)throw Error('Custo inválido.');
  (s[type]||[]).push({name,points,details:get('g-add-details-'+type)});
 }
 rerender();
}
function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function actions(action){
 let s=current();
 if(action==='save-remote'){
  if(!remote)return;
  const session=remote,copy=JSON.parse(JSON.stringify(s));
  Promise.resolve().then(()=>session.onSave(copy)).then(()=>finishRemote()).catch(e=>notify('Falha ao salvar na campanha: '+e.message,true));return;
 }
 if(action==='cancel-remote'){finishRemote();return}
 if(remote&&['new','duplicate','delete'].includes(action))throw Error('Nesta edição use Salvar na campanha ou Voltar.');
 if(action==='new'){const name=prompt('Nome do novo personagem GURPS','Novo personagem GURPS');if(name===null)return;const ch=E.create(name.slice(0,100));list.push(ch);selected=ch.id;tab='identidade';rerender()}
 if(action==='export'){downloadJSON(s,'gurps4-'+s.name.toLowerCase().replace(/[^a-z0-9]+/gi,'-')+'.json')}
 if(action==='duplicate'){let c=JSON.parse(JSON.stringify(s));c.id=E.create().id;c.name=(c.name+' — cópia').slice(0,100);list.push(c);selected=c.id;rerender()}
 if(action==='delete'){if(list.length===1)throw Error('Mantenha pelo menos uma ficha. Crie outra antes de excluir.');if(!confirm('Excluir esta ficha GURPS deste aparelho?'))return;list=list.filter(x=>x.id!==s.id);selected=list[0].id;tab='identidade';rerender()}
}
function test(which){
 const s=current(),d=E.derived(s),part=which.split(':'),modifier=Number(get('g-sit-mod')||0);
 if(part[0]==='attr')rollTarget(part[1],s.attrs[part[1]]);
 else if(part[0]==='derived'){
  const values={HP:d.HP,FP:d.FP,Vont:d.will,Per:d.per,Speed:d.speed,Move:d.move};
  if(part[1]==='Speed'||part[1]==='Move'){notify('Velocidade e deslocamento não têm teste próprio obrigatório. Consulte o mestre.',true);return}
  rollTarget(part[1],values[part[1]]);
 }else if(part[0]==='skill'){const skill=s.skills[Number(part[1])];if(!skill)throw Error('Perícia inexistente');const nh=E.skillLevel(skill,{...s.attrs,Per:d.per,Will:d.will});if(nh==null)throw Error('Atribua pontos à perícia.');rollTarget(skill.name,nh);}
 else if(part[0]==='defense'){
  const kind=part[1],value=kind==='dodge'?d.dodge:kind==='parry'?Math.floor((Number(s.parrySkill)||0)/2)+3:Math.floor((Number(s.blockSkill)||0)/2)+3;
  if(kind!=='dodge'&&!(kind==='parry'?s.parrySkill:s.blockSkill))throw Error('Defina a perícia de Aparar/Bloqueio antes do teste.');
  rollTarget(({dodge:'Esquiva',parry:'Aparar',block:'Bloqueio'})[kind],value,modifier);
 }else if(part[0]==='attack'){const w=s.weapons[Number(part[1])];if(!w)throw Error('Arma não encontrada');const skill=s.skills[Number(w.skillIndex)];const level=skill?E.skillLevel(skill,{...s.attrs,Per:d.per,Will:d.will}):d.DX;rollTarget('Ataque · '+w.name,level,modifier)}
 else if(part[0]==='damage'){const w=s.weapons[Number(part[1])];if(!w?.damage)throw Error('Esta arma ainda não tem uma fórmula de dano.');rollDamage('Dano · '+w.name,w.damage)}
 else if(part[0]==='reaction'){const faces=Array.from({length:3},()=>E.rollDamage('1d',s).faces[0]);showResult('Reação de NPC · 3d6',faces,faces.reduce((a,b)=>a+b,0),'Quanto maior, melhor; aplique os modificadores de reação conforme o livro')}
 else if(part[0]==='free'){rollDamage('Dados livres',get('g-free-dice'))}
}
function onClick(ev){
 const b=ev.target.closest('button');if(!b||!host?.contains(b))return;
 try{
 if(b.dataset.tab){tab=b.dataset.tab;render();return}
 if(b.dataset.add){add(b.dataset.add);return}
 if(b.dataset.action){actions(b.dataset.action);return}
 if(b.dataset.roll){test(b.dataset.roll);return}
 if(b.dataset.remove){const [key,index]=b.dataset.remove.split(':');if(current()[key]?.[Number(index)]){current()[key].splice(Number(index),1);rerender()};return}
 if(b.dataset.resource){
  const s=current(),d=E.derived(s),key=b.dataset.resource,prop=key==='HP'?'currentHP':'currentFP',max=key==='HP'?d.HP:d.FP;
  s[prop]=Math.max(-max*5,Math.min(max,Number(s[prop])+Number(b.dataset.step)));rerender();return;
 }
 if(b.dataset.toggle){
  const [name,index]=b.dataset.toggle.split(':');if(name==='equipped'){const item=current().items[Number(index)];if(item)item.equipped=!item.equipped;rerender()};return
 }
 }catch(e){notify(e.message,true)}
}
function onChange(ev){
 const t=ev.target,s=current();try{
 if(t.id==='g-switch'){selected=t.value;tab='identidade';rerender();return}
 if(t.id==='g-skill-suggest'){
  const selectedSample=(window.GURPS4_LITE_SKILLS||[])[Number(t.value)];
  if(t.value!==''&&selectedSample){
   host.querySelector('#g-skill-name').value=selectedSample.name;
   host.querySelector('#g-skill-attr').value=selectedSample.attr;
   host.querySelector('#g-skill-diff').value=selectedSample.diff;
  }
  return;
 }
 if(t.dataset.attr){s.attrs[t.dataset.attr]=Math.round(Math.max(1,Math.min(100,number(t.value,10))));rerender();return}
 if(t.dataset.mod){const k=t.dataset.mod;let n=number(t.value);if(k==='speed')n=Math.round(n*4)/4;s.mod[k]=Math.max(-20,Math.min(30,n));rerender();return}
 if(t.dataset.setting){s.settings[t.dataset.setting]=number(t.value);rerender();return}
 if(t.dataset.root){const k=t.dataset.root;s[k]=['pointBudget','unspentBonus','traitsCost','techLevel'].includes(k)?number(t.value):t.value;rerender();return}
 if(t.dataset.rootText){s[t.dataset.rootText]=t.value.slice(0,16000);persist();return}
 if(t.dataset.current){const d=E.derived(s),isHP=t.dataset.current==='HP',max=isHP?d.HP:d.FP;s[isHP?'currentHP':'currentFP']=Math.max(-max*5,Math.min(max,number(t.value)));rerender();return}
 if(t.id==='g-parry'){s.parrySkill=number(t.value);persist();return}
 if(t.id==='g-block'){s.blockSkill=number(t.value);persist();return}
 if(t.id==='g-import'){const file=t.files?.[0];if(file)importSheet(file);return}
 if(t.id==='g-portrait'){const file=t.files?.[0];if(file)portrait(file);return}
 }catch(e){notify(e.message,true)}
}
async function importSheet(file){
 try{if(file.size>1200000)throw Error('JSON maior que o limite.');
 const data=JSON.parse(await file.text());
 if(data.systemId!=='gurps'||data.edition!=='4e'||!data.attrs||!data.mod)throw Error('Este arquivo não é uma ficha GURPS 4e exportada.');
 const sample=E.create(),s={...sample,...data,id:sample.id};
 for(const k of Object.keys(E.costs))s.attrs[k]=Math.max(1,Math.min(100,number(s.attrs[k],10)));
 for(const key of ['skills','advantages','disadvantages','quirks','techniques','languages','cultures','spells','weapons','items','log'])if(!Array.isArray(s[key]))s[key]=[];
 list.push(s);selected=s.id;tab='identidade';rerender();
 }catch(e){notify('Importação rejeitada: '+e.message,true)}
}
async function portrait(file){
 try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4500000)throw Error('Use imagem PNG, JPEG ou WebP de até 4 MB.');
 const img=await createImageBitmap(file),w=Math.min(350,img.width),h=Math.max(1,Math.round(w*img.height/img.width));
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
 img.close?.();current().portrait=canvas.toDataURL('image/jpeg',.7);rerender();
 }catch(e){notify(e.message,true)}
}
function finishRemote(returnToMaster=true){
 if(!remote)return;
 const prev=remote;remote=null;list=prev.backup;selected=prev.selected;tab=prev.tab;
 if(host)render();
 if(returnToMaster)window.RPG_DEMO?.navigate?.('master');
}
function editRemote(sheet,onSave){
 if(!sheet || sheet.systemId!=='gurps'||sheet.edition!=='4e')throw Error('Ficha GURPS incompatível.');
 if(!list.length)load();
 if(remote)finishRemote(false);
 remote={backup:list,selected,tab,onSave};
 list=[JSON.parse(JSON.stringify(sheet))];selected=list[0].id;tab='identidade';
 window.RPG_DEMO?.navigate?.('library');window.RPG15?.openSystem?.('gurps');
}
function mount(container){
 if(!container)return;
 if(!list.length)load();
 const box=document.createElement('section');box.id='r16-gurps';container.appendChild(box);
 host=box;host.addEventListener('click',onClick);host.addEventListener('change',onChange);
 active=true;render();return box;
}
window.RPG16_GURPS={mount,editRemote,open:()=>window.RPG15?.openSystem('gurps'),engine:E,get current(){if(!list.length)load();return current()},get all(){if(!list.length)load();return list.slice()},exportAll:()=>downloadJSON(list,'gurps4-personagens.json')};
})();
