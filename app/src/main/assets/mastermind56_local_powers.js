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
const classPowers={
 Combatente:['Golpe Pesado','Combater com Duas Armas','Saque Rápido','Armamento Pesado','Proteção Pesada'],
 Especialista:['Mochila de Utilidades','Conhecimento Aplicado','Ninja Urbano','Perito em Explosivos'],
 Ocultista:['Ritual Potente','Camuflar Ocultismo','Identificação Paranormal']
};
const powers=(op.pack.poderesParanormais||[]).map(x=>({name:x.nome,element:x.elemento,page:x.paginaLivro}));
let mode='transcend',chosen='',note='',lastChar='';
const current=()=>op.state;
const records=s=>Array.isArray(s.powerChoices)?s.powerChoices.filter(x=>x&&['class','transcend'].includes(x.type)):[];
const slots=nex=>milestones.filter(n=>n<=Number(nex||0)).length;
const selected=()=>pc.selectedId();
const learned=s=>new Set(Array.isArray(s.powers)?s.powers.map(x=>typeof x==='string'?x:x?.name).filter(Boolean):[]);
function counts(s){
 const used=records(s);
 return used.reduce((out,r)=>(r.type==='transcend'&&(out[r.element]=(out[r.element]||0)+1),out),{});
}
function setMessage(msg){note=msg;const tag=$('#v56-feedback');if(tag)tag.textContent=note;}
function options(s){
 if(mode==='class')return (classPowers[s.class]||[]).map(name=>({name,element:s.class,page:0}));
 return powers;
}
function card(p,s){
 const existing=learned(s).has(p.name);
 const active=chosen===p.name;
 const prior=p.name==='Surto Temporal'&&mode==='transcend';
 const death=counts(s).Morte||0,allowed=!prior||death>=2;
 const info=prior&&!allowed?'Requer dois poderes de Morte anteriores':p.page?'Livro · página '+p.page:'Validar requisitos com o mestre';
 return '<button type="button" data-v56-select="'+esc(p.name)+'" class="v56-power-card'+
 (active?' chosen':'')+'" '+(!allowed||existing?'disabled':'')+'>'+
 '<strong>'+esc(p.name)+'</strong><span>'+esc(p.element)+'</span><small>'+
 (existing?'Já adquirido':info)+'</small></button>';
}
function show(){
 const s=current(),r=records(s),remaining=Math.max(0,slots(s.nex)-r.length);
 const choices=options(s);
 panel.innerHTML='<section id="v56-powers" class="surface-flat op-panel">'+
 '<div class="v56-heading"><div><small>MÓDULO ORDEM PARANORMAL · FICHA REAL</small><h3>✦ Poderes & Transcender</h3>'+
 '<p>Escolha seus poderes por NEX. Transcender utiliza uma escolha de poder de classe; os poderes aprendidos passam a integrar esta ficha e a campanha quando o mestre importar a ficha.</p></div>'+
 '<div class="v56-budget"><strong>'+remaining+' disponíveis</strong><span>'+r.length+' de '+slots(s.nex)+' escolhas · NEX '+Number(s.nex||0)+'%</span></div></div>'+
 '<div class="v56-switch"><button data-v56-mode="transcend" class="'+(mode==='transcend'?'active':'')+'">✧ Transcender</button>'+
 '<button data-v56-mode="class" class="'+(mode==='class'?'active':'')+'">Poder de classe</button></div>'+
 '<p class="v56-hint">'+(mode==='transcend'?
 'Você deixará de ganhar SAN nesta evolução. Os pré-requisitos individuais devem ser confirmados com o livro e o mestre.':
 'Sugestões iniciais da classe. Escolhas específicas exigem conferência com o mestre.')+'</p>'+
 '<div class="v56-powers-list">'+choices.map(p=>card(p,s)).join('')+'</div>'+
 (mode==='class'?'<label class="v56-custom">Poder de classe não listado<input id="v56-custom" maxlength="90" placeholder="Nome do livro de regras"></label>':'')+
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
 const s=current(),prev=records(s),max=slots(s.nex);
 if(prev.length>=max)return setMessage('Não há escolhas disponíveis neste NEX.');
 if(!name||name.length>90)return setMessage('Selecione o nome de um poder válido.');
 if(learned(s).has(name)||prev.some(x=>x.name===name))return setMessage('Esse poder já está na sua ficha.');
 if(mode==='transcend'&&!powers.some(p=>p.name===name))return setMessage('Escolha um poder paranormal do catálogo.');
 if(mode==='class'&&name.toLowerCase()==='transcender')return setMessage('Para Transcender, use a opção paranormal.');
 if(mode==='transcend'&&name==='Surto Temporal'&&(counts(s).Morte||0)<2)
  return setMessage('Surto Temporal exige dois poderes paranormais de Morte anteriores.');
 const nex=milestones[prev.length];
 const element=mode==='transcend'?powers.find(p=>p.name===name)?.element||'':'';
 const choice={type:mode,name,nex,...(element?{element}:{}),source:'mastermind-v056'};
 const updated=[...(Array.isArray(s.powerChoices)?s.powerChoices:[]),choice];
 const old=Array.isArray(s.powers)?s.powers:[];
 if(!window.confirm('Registrar '+name+' como escolha de NEX '+nex+'% na ficha '+(s.name||'')+'? Confirme os pré-requisitos com o mestre.'))return;
 const ok=pc.update(selected(),{powers:[...old,name],powerChoices:updated});
 if(!ok)return setMessage('Não foi possível salvar a ficha. Nenhum poder foi aprendido.');
 chosen='';note='✓ '+name+' registrado na ficha selecionada (NEX '+nex+'%).';
 app?.notify?.(note);
 show();
}
panel.addEventListener('click',e=>{
 const which=e.target.closest('[data-v56-mode]');
 if(which){mode=which.dataset.v56Mode;chosen='';note='';show();return;}
 const select=e.target.closest('[data-v56-select]');
 if(select){chosen=select.dataset.v56Select;show();return;}
 if(e.target.closest('#v56-learn')){
  const x=mode==='class'?$('#v56-custom',panel)?.value.trim():null;
  learn(x||chosen);
 }
});
const jump=document.createElement('button');
jump.type='button';jump.id='v56-quick-powers';jump.className='rpg05-btn primary';
jump.textContent='✦ Poderes / Transcender';jump.setAttribute('aria-label','Abrir os poderes da ficha');
const char=$('#rpg05-char-select');
const header=char?.closest('.rpg05-heading');
if(header)header.append(jump);
function open(){
 app?.navigate?.('sheet');window.RPG14?.show?.('advancement');
 panel.scrollIntoView?.({block:'start',behavior:'auto'});
 show();
}
jump.addEventListener('click',open);
const mini=$('#op-poderes');
if(mini)mini.insertAdjacentHTML('afterbegin',
 '<button type="button" class="rpg05-btn primary" id="v56-go-powers">✦ Aprender poderes / Transcender →</button>');
mini?.addEventListener('click',e=>{if(e.target.closest('#v56-go-powers'))open()});
char?.addEventListener('change',()=>setTimeout(()=>{chosen='';show()},45));
document.addEventListener('rpg:character-selected',()=>setTimeout(()=>{chosen='';show()},0));
$('#rpg05-new-char')?.addEventListener('click',()=>{chosen='';note='';show()});
$('#rpg05-del-char')?.addEventListener('click',()=>{chosen='';note='';show()});
$('#op-nex')?.addEventListener('change',()=>setTimeout(show,0));
window.Mastermind56Powers={show,open,learn,get count(){return powers.length},get panel(){return panel}};
show();
})();