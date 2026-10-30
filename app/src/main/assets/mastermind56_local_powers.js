/* v0.56 — REAL Android home screen: Ordem sheet powers and Transcender.
 * The previous release shipped the features only in separate LAN pages.
 * This mounts into #screen-sheet > #r14-content, i.e. the actual APK page. */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const op=window.OP13,pc=window.MastermindCharacters,app=window.RPG_DEMO;
const panel=$('[data-r14-panel="advancement"]'),sheet=$('#screen-sheet'),tabs=$('.r14-tabs');
if(!op||!pc||!panel||!sheet||!tabs)return;
const milestones=[15,30,45,60,75,90];
// v0.59: generated from the same curated base-book catalog used by the LAN player.
const classPowerCatalog=window.MastermindClassCatalog||{classPowers:{},classPowerRules:{},classPowerPage:{}};
const classPowers=classPowerCatalog.classPowers||{};
const classPowerRules=classPowerCatalog.classPowerRules||{};
function trained(s,name){
 const rank=s.skills?.[name];
 if(typeof rank==='number'&&rank>0)return true;
 if(typeof rank==='string'&&['treinado','veterano','expert'].includes(rank.toLowerCase()))return true;
 if(rank&&typeof rank==='object'&&(Number(rank.level??rank.bonus??rank.value??0)>0||['treinado','veterano','expert'].includes(String(rank.rank??rank.training??'').toLowerCase())))return true;
 const origin=op.pack?.origens?.find(x=>x.nome===(s.origin||s.origem));
 return !!origin?.pericias?.includes(name);
}
function missingClassRequirements(name,s){
 const rule=classPowerRules[name]||{},missing=[];
 if(rule.minNex&&Number(s.nex||0)<rule.minNex)missing.push('NEX '+rule.minNex+'%');
 for(const [attr,minimum] of Object.entries(rule.attrs||{}))
  if(Number(s.attrs?.[attr]||0)<minimum)missing.push(attr+' '+minimum);
 for(const skill of rule.skillsAll||[])if(!trained(s,skill))missing.push('Treinado em '+skill);
 if(rule.skillsAny?.length&&!rule.skillsAny.some(skill=>trained(s,skill)))
  missing.push('Treinado em '+rule.skillsAny.join(' ou '));
 if(rule.power&&!new Set(Array.isArray(s.powers)?s.powers.map(x=>typeof x==='string'?x:x?.name):[]).has(rule.power))
  missing.push('Poder '+rule.power);
 return missing;
}
const powers=(op.pack.poderesParanormais||[]).map(x=>({name:x.nome,element:x.elemento,page:x.paginaLivro,repeatable:['Aprender Ritual','Resistir a Elemento'].includes(x.nome)}));
let mode='class',chosen='',note='',lastChar='';
const current=()=>op.state;
const records=s=>Array.isArray(s.powerChoices)?s.powerChoices.filter(x=>x&&['class','transcend'].includes(x.type)):[];
const slots=nex=>milestones.filter(n=>n<=Number(nex||0)).length;
const selected=()=>pc.selectedId();
const learned=s=>new Set(Array.isArray(s.powers)?s.powers.map(x=>typeof x==='string'?x:x?.name).filter(Boolean):[]);
function counts(s){
 const used=records(s);
 return used.reduce((out,r)=>{if(r.type==='transcend'){const element=r.element||powers.find(p=>p.name===r.name)?.element;if(element)out[element]=(out[element]||0)+1;}return out;},{});
}
function setMessage(msg){note=msg;const tag=$('#v56-feedback');if(tag)tag.textContent=note;}
function options(s){
 if(mode==='class')return (classPowers[s.class]||[]).map(name=>({name,element:s.class,page:classPowerCatalog.classPowerPage?.[s.class]||0}));
 return powers;
}
function isRepeatable(kind,name){return kind==='class'?!!classPowerRules[name]?.repeatable:!!powers.find(p=>p.name===name)?.repeatable;}
function evaluate(name,s=current(),kind=mode){
 const missing=[],prev=records(s),limit=slots(s.nex),next=milestones[prev.length];
 if(!name||name.length>90)missing.push('Escolha um poder válido');
 if(prev.length>=limit)missing.push('Nenhuma escolha disponível no NEX atual');
 if(!isRepeatable(kind,name)&&(learned(s).has(name)||prev.some(x=>x.name===name)))missing.push('Já adquirido');
 if(kind==='class'){
  if(!(classPowers[s.class]||[]).includes(name))missing.push('Poder incompatível com a classe');
  else missing.push(...missingClassRequirements(name,s));
 }else if(kind==='transcend'){
  if(!powers.some(p=>p.name===name))missing.push('Poder paranormal fora do catálogo');
  if(name==='Surto Temporal'&&(counts(s).Morte||0)<2)missing.push('Dois poderes de Morte anteriores');
 }else missing.push('Tipo de poder inválido');
 return {allowed:missing.length===0,missing,nex:next};
}
function card(p,s){
 const status=evaluate(p.name,s),existing=status.missing.includes('Já adquirido');
 const info=existing?'Já adquirido':!status.allowed?'Requer '+status.missing.join(' · '):p.page?'Livro básico · p. '+p.page:'Consultar regras do livro';
 return '<button type="button" data-v56-select="'+esc(p.name)+'" class="v56-power-card'+
 (chosen===p.name?' chosen':'')+'" '+(!status.allowed?'disabled':'')+' aria-label="'+esc(p.name+(status.allowed?' disponível':' indisponível: '+status.missing.join(', ')))+'">'+
 '<strong>'+esc(p.name)+'</strong><span>'+esc(p.element)+'</span><small>'+esc(info)+'</small></button>';
}
function show(){
 const s=current(),r=records(s),remaining=Math.max(0,slots(s.nex)-r.length);
 const choices=options(s);
 panel.innerHTML='<section id="v56-powers" class="surface-flat op-panel">'+
 '<div class="v56-heading"><div><small>MÓDULO ORDEM PARANORMAL · FICHA REAL</small><h3>✦ Poderes de classe e paranormais</h3>'+
 '<p>Escolha seus poderes por NEX. Transcender utiliza uma escolha de poder de classe; os poderes aprendidos passam a integrar esta ficha e a campanha quando o mestre importar a ficha.</p></div>'+
 '<div class="v56-budget"><strong>'+remaining+' disponíveis</strong><span>'+r.length+' de '+slots(s.nex)+' escolhas · NEX '+Number(s.nex||0)+'%</span></div></div>'+
 '<div class="v56-switch"><button data-v56-mode="transcend" class="'+(mode==='transcend'?'active':'')+'">✧ Poderes paranormais (Transcender)</button>'+
 '<button data-v56-mode="class" class="'+(mode==='class'?'active':'')+'">Poderes de classe</button></div>'+
 '<p class="v56-hint">'+(mode==='transcend'?
 'Você deixará de ganhar SAN nesta evolução. Os pré-requisitos individuais devem ser confirmados com o livro e o mestre.':
 'Poderes do livro básico 1.3 da sua classe, incluindo Treinamento em Perícia. Requisitos são conferidos antes de registrar.')+'</p>'+
 '<div class="v56-powers-list">'+choices.map(p=>card(p,s)).join('')+'</div>'+
 ''+
 '<button type="button" class="v56-detail" id="v62-power-description" '+(chosen?'':'disabled')+'>📖 Ver descrição do poder selecionado</button>'+ 
 '<button type="button" class="v56-confirm" id="v56-learn" '+(remaining===0?'disabled':'')+'>Adicionar poder à ficha</button>'+
 '<p id="v56-feedback" role="status">'+esc(note)+'</p>'+
 '<div class="v56-acquired"><h4>Poderes já adquiridos</h4>'+
 (r.length?r.map(x=>'<div class="v56-power-learned"><strong>'+esc(x.name)+'</strong>'+
 '<small>NEX '+Number(x.nex)+'% · '+(x.type==='transcend'?'Transcender · '+esc(x.element||''):'Classe')+'</small></div>').join(''):
 '<p>Nenhum poder de progressão registrado.</p>')+
 (Array.isArray(s.powers)&&s.powers.length?'<p class="v56-legacy">Poderes e habilidades presentes na ficha: '+
 [...learned(s)].map(esc).join(' · ')+'</p>':'')+'</div>'+
 '<p class="v56-warning">Esta tela registra suas escolhas no personagem local. Na campanha online, decisões e efeitos de combate continuam sujeitos à aprovação do mestre.</p>'+
 '</section>';
}
function learn(name){
 name=String(name||'').trim();
 const s=current(),check=evaluate(name,s);
 if(!check.allowed){setMessage('Não foi possível aprender: '+check.missing.join(', ')+'.');return false;}
 const prev=records(s),element=mode==='transcend'?powers.find(p=>p.name===name)?.element||'':'';
 const choice={type:mode,name,nex:check.nex,...(element?{element}:{}),source:'mastermind-v094'};
 const updated=[...(Array.isArray(s.powerChoices)?s.powerChoices:[]),choice];
 const old=Array.isArray(s.powers)?s.powers:[];
 if(!window.confirm('Registrar '+name+' como escolha de NEX '+check.nex+'% na ficha '+(s.name||'')+'? Confirme os efeitos específicos com o mestre.'))return false;
 const alreadyKnown=old.some(x=>(typeof x==='string'?x:x?.name)===name);
 const id=selected(),ok=id&&pc.update(id,{powers:alreadyKnown?old:[...old,name],powerChoices:updated});
 if(!ok){setMessage('Não foi possível salvar a ficha. Nenhum poder foi aprendido.');return false;}
 chosen='';note='✓ '+name+' registrado na ficha selecionada (NEX '+check.nex+'%).';
 app?.notify?.(note);show();return true;
}
panel.addEventListener('click',e=>{
 if(e.target.closest('#v62-power-description')){if(chosen)window.Mastermind62Descriptions?.open?.({systemId:'ordem-paranormal',kind:mode==='class'?'Poder de classe':'Poder paranormal',name:chosen,page:options(current()).find(x=>x.name===chosen)?.page||'',origin:'Ordem Paranormal — Livro de Regras 1.3'});return;}
 const which=e.target.closest('[data-v56-mode]');
 if(which){mode=which.dataset.v56Mode;chosen='';note='';show();return;}
 const select=e.target.closest('[data-v56-select]');
 if(select){chosen=select.dataset.v56Select;show();return;}
 if(e.target.closest('#v56-learn'))learn(chosen);
});
// A única entrada de navegação é a aba r14; nenhum CTA duplicado no cabeçalho.
const char=$('#rpg05-char-select');
function open(){
 app?.navigate?.('sheet');window.RPG14?.show?.('advancement');
 panel.scrollIntoView?.({block:'start',behavior:'auto'});
 show();
}
char?.addEventListener('change',()=>setTimeout(()=>{chosen='';show()},45));
document.addEventListener('rpg:character-selected',()=>setTimeout(()=>{chosen='';show()},0));
$('#rpg05-new-char')?.addEventListener('click',()=>{chosen='';note='';show()});
$('#rpg05-del-char')?.addEventListener('click',()=>{chosen='';note='';show()});
$('#op-nex')?.addEventListener('change',()=>setTimeout(show,0));
$('#op-classe')?.addEventListener('change',()=>setTimeout(()=>{chosen='';show()},0));
tabs.addEventListener('click',e=>{if(e.target.closest('[data-r14-tab="advancement"]'))setTimeout(show,0)});
window.Mastermind56Powers={show,open,learn,evaluate,setMode(value){if(['class','transcend'].includes(value)){mode=value;chosen='';show();}},get mode(){return mode},get count(){return powers.length},get panel(){return panel}};
show();
})();