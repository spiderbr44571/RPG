/* Mastermind Sheet Studio — one responsive presentation over the existing rule engines.
 * Source of truth remains OP13 / RPG18_DND / RPG16_GURPS / MastermindCoc7.
 * No character migrations, destructive writes or changes to the calculation engines.
 */
(()=>{'use strict';
const SYS={ordem:{label:'Ordem Paranormal',sub:'Agente · NEX e SAN',key:'ordem-paranormal'},dnd:{label:'D&D 5e',sub:'Aventureiro · Classes e magias',key:'d-d'},gurps:{label:'GURPS 4e',sub:'Personagem · 3d6',key:'gurps'},coc:{label:'Chamado de Cthulhu 7e',sub:'Investigador · d100',key:'chamado-de-ctchulhu'}};
const $=(q,root=document)=>root.querySelector(q),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fromId=id=>Object.keys(SYS).find(k=>SYS[k].key===id)||'ordem';
const sheet=$('#screen-sheet');if(!sheet||sheet.dataset.mssReady)return;
const old=$('#rpg05-sheet-op'),legacy=$('.rpg05-band',sheet);
if(!old||!window.MastermindCharacters||!window.OP13)return;
const state={system:fromId(localStorage.getItem('mastermind-sheet-studio-system')||''),tab:'stats',right:'skills',filter:'',mounted:null,changing:false};
const formats={
 ordem:s=>({name:s.name||'Agente',portrait:s.photo||s.portrait||'',subtitle:[s.class,s.trail,'NEX '+(s.nex??'?')].filter(Boolean).join(' · '),attrs:s.attrs||{},resources:Object.entries(s.resources||{}).map(([k,v])=>[k,typeof v==='object'?(v.current??v[0]??0):v,typeof v==='object'?(v.max??v[1]??v.current):v]),skills:s.skills||{},history:s.history||''}),
 dnd:s=>({name:s.name||'Aventureiro',portrait:s.portrait||'',subtitle:[s.klass,s.ancestry,'Nível '+(s.level??1)].filter(Boolean).join(' · '),attrs:s.attrs||{},resources:[['PV',s.hitPointsCurrent,s.hitPointsMax],['PV temporário',s.hitPointsTemp,Math.max(1,s.hitPointsTemp||0)],['CA',window.RPG18_DND_ENGINE?.derive(s).armorClass||10,null]],skills:window.RPG18_DND_ENGINE?.derive(s).skills||{},history:s.history||''}),
 gurps:s=>({name:s.name||'Personagem',portrait:s.portrait||'',subtitle:[s.concept,'NT '+(s.techLevel??8)].filter(Boolean).join(' · '),attrs:s.attrs||{},resources:[['PV',s.currentHP,window.GURPS4_ENGINE?.derived(s).HP||s.attrs?.ST||10],['PF',s.currentFP,window.GURPS4_ENGINE?.derived(s).FP||s.attrs?.HT||10]],skills:Object.fromEntries((s.skills||[]).map(x=>[x.name||x.id||'Perícia',x.level??x.points??0])),history:s.background||''}),
 coc:s=>({name:s.name||'Investigador',portrait:s.portrait||'',subtitle:[s.occupation,s.era].filter(Boolean).join(' · '),attrs:s.attributes||{},resources:Object.entries(s.resources||{}).map(([k,v])=>[k,v.current,v.max]),skills:s.skills||{},history:s.history||''})
};
const catalog=()=>({ordem:{list:window.MastermindCharacters?.list()?.map(x=>({id:x.id,name:x.name}))||[],active:window.MastermindCharacters?.selectedId(),current:window.OP13?.state},dnd:{list:window.RPG18_DND?.all||[],active:window.RPG18_DND?.current?.id,current:window.RPG18_DND?.current},gurps:{list:window.RPG16_GURPS?.all||[],active:window.RPG16_GURPS?.current?.id,current:window.RPG16_GURPS?.current},coc:{list:window.MastermindCoc7?.characters||[],active:window.MastermindCoc7?.current?.id,current:window.MastermindCoc7?.current}})[state.system];
const shell=document.createElement('section');shell.id='mastermind-sheet-studio';shell.className='mss';
shell.innerHTML='<header class="mss-bar"><div><div class="mss-eyebrow">MASTER MIND · PERSONAGENS</div><h2>Estúdio de fichas</h2><p>Uma interface para quatro sistemas, usando os editores e regras originais.</p></div><div class="mss-controls"><label>Sistema<select id="mss-system" aria-label="Sistema de RPG">'+Object.entries(SYS).map(([k,v])=>'<option value="'+k+'">'+esc(v.label)+'</option>').join('')+'</select></label><label>Personagem<select id="mss-character" aria-label="Selecionar personagem"></select></label><button type="button" id="mss-new" title="Criar personagem neste sistema">＋ Nova ficha</button><button type="button" id="mss-export" title="Exportar pelo editor original">Exportar</button></div></header><div class="mss-layout"><aside class="mss-profile"><div class="mss-portrait"><img id="mss-portrait" alt="Retrato do personagem" hidden><div class="mss-initials" id="mss-initials">✦</div><div class="mss-portrait-caption"><h3 id="mss-name">Personagem</h3><p id="mss-subtitle"></p></div></div><button type="button" id="mss-atelier">✧ Personalizar retrato no Ateliê</button><button type="button" id="mss-upload-portrait">Escolher imagem do personagem</button><input type="file" accept="image/png,image/jpeg,image/webp" id="mss-photo-file" hidden><div id="mss-resources" class="mss-resources"></div><div class="mss-label">SISTEMA ATUAL</div><div class="mss-system-pill" id="mss-system-name"></div><button type="button" class="mss-full" id="mss-native">Editor completo e opções avançadas</button></aside><main class="mss-primary"><nav class="mss-tabs" role="tablist" aria-label="Seções da ficha"><button type="button" data-mss-tab="stats" aria-selected="true">Estatísticas</button><button type="button" data-mss-tab="history" aria-selected="false">História</button><button type="button" data-mss-tab="equipment" aria-selected="false">Inventário</button><button type="button" data-mss-tab="powers" aria-selected="false">Habilidades</button><button type="button" data-mss-tab="rituals" aria-selected="false" hidden>Habilidades e rituais</button></nav><div class="mss-body" id="mss-body"><div id="mss-stat-strip" class="mss-stat-strip"></div><div id="mss-summary" class="mss-summary"></div><div class="mss-native-title"><h3>Editor detalhado</h3><small>Os cálculos e campos específicos permanecem nos módulos originais</small></div><div id="mss-native-stage" class="mss-native-stage"></div></div></main><aside class="mss-assistant"><div class="mss-side-tabs"><button data-mss-side="skills" aria-selected="true">Perícias</button><button data-mss-side="abilities" aria-selected="false">Itens e poderes</button></div><label class="mss-search"><span aria-hidden="true">⌕</span><input id="mss-filter" type="search" placeholder="Filtrar perícias e habilidades..." aria-label="Filtrar painel lateral"></label><div class="mss-side-results" id="mss-side-results"></div><div class="mss-roll" id="mss-roll" role="status" aria-live="polite"><span class="mss-label">ÚLTIMA ROLAGEM</span><strong id="mss-roll-label">Aguardando dados</strong><div id="mss-roll-score">◇</div><small id="mss-roll-formula">Use os testes do editor da ficha.</small></div></aside></div>';
sheet.prepend(shell);
shell.querySelector('#mss-native-stage').append(old);
if(legacy)legacy.classList.add('mss-legacy-controls');
const oldHeading=sheet.querySelector(':scope > .page-row');if(oldHeading)oldHeading.classList.add('mss-legacy-heading');
sheet.classList.add('mss-has-studio');sheet.dataset.mssReady='1';
function native(){return $('#mss-native-stage',shell);}
function info(){const c=catalog();return c?.current?formats[state.system](c.current):{name:'Personagem',portrait:'',subtitle:'',attrs:{},resources:[],skills:{}};}
function safeImage(url){return /^(data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+|https:\/\/[^"'<> ]+)$/i.test(String(url||''))?url:'';}
function cards(){const s=info(),v=Object.entries(s.attrs||{});$('#mss-stat-strip').innerHTML=v.slice(0,state.system==='coc'?8:6).map(([key,val])=>'<div class="mss-stat"><small>'+esc(key)+'</small><strong>'+esc(val)+'</strong></div>').join('')||'<p>Use o editor abaixo para definir atributos.</p>';}
function currentAbilityNames(){
 const s=catalog()?.current||{},a=state.system==='ordem'?s.powers||[]:state.system==='dnd'?[...(s.features||[]),...(s.spells||[])]:state.system==='gurps'?[...(s.advantages||[]),...(s.spells||[])]:[...(s.spells||[]),...(s.inventory||[])];
 const system=SYS[state.system]?.key,overrides=['powers','abilities','rituals'].flatMap(kind=>window.MastermindSystemEditor?.list?.(system,kind)||[]);
 const custom=overrides.map(x=>x?.name||'').filter(Boolean);
 return [...new Set([...a.map(x=>typeof x==='string'?x:x?.name||x?.title||'').filter(Boolean),...custom])];
}
function side(){
 const data=info(),names=state.right==='skills'?Object.entries(data.skills||{}).map(([key,val])=>[key,typeof val==='object'?(val.level??val.value??val.points??'—'):val]):currentAbilityNames().map(x=>[x,'']);
 const f=state.filter.trim().toLocaleLowerCase('pt-BR');
 const filtered=names.filter(([name])=>name.toLocaleLowerCase('pt-BR').includes(f)).slice(0,75);
 $('#mss-side-results').innerHTML=filtered.length?filtered.map(([name,val])=>'<button type="button" class="mss-skill" data-mss-find="'+esc(name)+'"><span>'+esc(name)+'</span><b>'+esc(val)+'</b></button>').join(''):'<p class="mss-empty">Nenhum item encontrado. Use o editor completo para adicionar ou modificar.</p>';
 shell.querySelectorAll('[data-mss-side]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mssSide===state.right)));
}
function updateSummary(){
 const c=catalog()||{list:[],active:''},s=info();
 $('#mss-system').value=state.system;
 const sel=$('#mss-character'),oldValue=sel.value;
 sel.innerHTML=c.list.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name||'Personagem')+'</option>').join('');
 sel.value=c.active||oldValue;
 $('#mss-name').textContent=s.name;$('#mss-subtitle').textContent=s.subtitle||SYS[state.system].sub;
 $('#mss-system-name').textContent=SYS[state.system].label;
 const img=$('#mss-portrait'),url=safeImage(s.portrait);img.hidden=!url;$('#mss-initials').hidden=!!url;if(url)img.src=url;else img.removeAttribute('src');
 $('#mss-initials').textContent=s.name.trim().slice(0,1).toUpperCase()||'✦';
 $('#mss-resources').innerHTML=(s.resources||[]).slice(0,6).map(([name,current,max])=>{
  const n=Number(current),m=Number(max),pct=Number.isFinite(n)&&Number.isFinite(m)&&m>0?Math.min(100,Math.max(0,100*n/m)):0;
  return '<div class="mss-resource"><div><b>'+esc(name)+'</b><span>'+esc(current)+(max==null?'':' / '+esc(max))+'</span></div>'+(max==null?'':'<div class="mss-track"><i style="width:'+pct+'%"></i></div>')+'</div>';
 }).join('')||'<p class="mss-empty">Recursos registrados no editor.</p>';
 cards();side();
}
function navigateTab(id){
 state.tab=id;
 shell.querySelectorAll('[data-mss-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mssTab===id)));
 const map={
  ordem:{stats:'attributes',history:'story',equipment:'inventory',powers:'advancement',rituals:'powers'},
  dnd:{stats:'stats',history:'story',equipment:'items',powers:'features'},
  gurps:{stats:'identidade',history:'historia',equipment:'equipamento',powers:'vantagens'},
  coc:{stats:'attributes',history:'history',equipment:'inventory',powers:'inventory'}
 };
 const target=map[state.system][id];
 if(state.system==='ordem'){window.RPG14?.show?.(target);}
 else{
  const selector=state.system==='dnd'?'#r18-dnd [data-tab="'+target+'"]':state.system==='gurps'?'#r16-gurps [data-tab="'+target+'"]':'#mss-native-stage .coc-shell [data-coc-tab="'+target+'"]';
  const button=$(selector,native());if(button)button.click();
 }
 $('#mss-body').dataset.mssActiveTab=id;
}
function present(system){
 if(!SYS[system])return;
 if(state.changing){state.pendingSystem=system;return;}
 state.changing=true;
 const stage=native(),prev=state.system;
 state.system=system;localStorage.setItem('mastermind-sheet-studio-system',system);
 $('#mss-body').classList.remove('mss-appearing');
 shell.querySelector('[data-mss-tab="rituals"]').hidden=system!=='ordem';
 shell.querySelector('[data-mss-tab="powers"]').textContent=system==='ordem'?'Poderes e Transcender':'Habilidades';
 $('#mss-upload-portrait').hidden=system!=='ordem';
 if(system==='ordem'){old.hidden=false;for(const node of [...stage.children])if(node!==old)node.remove();}
 else{
  old.hidden=true;for(const node of [...stage.children])if(node!==old)node.remove();
  const container=document.createElement('div');container.className='mss-system-editor';stage.append(container);
  try{
   const mod={dnd:window.RPG18_DND,gurps:window.RPG16_GURPS,coc:window.MastermindCoc7}[system];
   if(!mod?.mount)throw Error('Módulo indisponível nesta versão');
   mod.mount(container);
  }catch(e){container.textContent='Não foi possível abrir este editor: '+e.message;console.error('[Sheet Studio]',e);}
 }
 state.tab='stats';state.filter='';$('#mss-filter').value='';
 const nativeLabel=system==='ordem'?'Ordem Paranormal':SYS[system].label;
 $('#mss-native').title='Acesso a todos os campos nativos do sistema '+nativeLabel;
 requestAnimationFrame(()=>{updateSummary();navigateTab('stats');$('#mss-body').classList.add('mss-appearing');state.changing=false;
  const pending=state.pendingSystem;state.pendingSystem=null;if(pending&&pending!==state.system)present(pending);
 });
 document.dispatchEvent(new CustomEvent('mastermind:sheet-system-changed',{detail:{systemId:SYS[system].key,from:SYS[prev].key}}));
}
function selectCharacter(id){
 const system=state.system;
 if(system==='ordem'){
  const sel=$('#rpg05-char-select');if(!sel)return;
  sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));
 }else{
  const sel=native().querySelector(system==='dnd'?'#d18-character':system==='gurps'?'#g-switch':'#coc-select');if(!sel)return;
  sel.value=id;sel.dispatchEvent(new Event('change',{bubbles:true}));
 }
 requestAnimationFrame(()=>{updateSummary();$('#mss-body').classList.remove('mss-appearing');requestAnimationFrame(()=>$('#mss-body').classList.add('mss-appearing'));});
}
function clickNative(action){
 const selectors={ordem:{new:'#rpg05-new-char',export:'#op-export'},dnd:{new:'[data-action="new"]',export:'[data-action="json-export"]'},gurps:{new:'[data-action="new"]',export:'[data-action="export"]'},coc:{new:'[data-coc-new]',export:'[data-coc-export]'}};
 const selector=selectors[state.system][action],button=state.system==='ordem'?document.querySelector(selector):native().querySelector(selector);
 if(button)button.click();else window.RPG_DEMO?.notify?.('Ação indisponível para esta ficha.');
 setTimeout(updateSummary,80);
}
$('#mss-system').addEventListener('change',e=>present(e.target.value));
$('#mss-character').addEventListener('change',e=>selectCharacter(e.target.value));
$('#mss-new').addEventListener('click',()=>clickNative('new'));
$('#mss-export').addEventListener('click',()=>clickNative('export'));
$('#mss-atelier').addEventListener('click',()=>window.RPG_DEMO?.navigate?.('atelier85'));
$('#mss-upload-portrait').addEventListener('click',()=>$('#mss-photo-file').click());
$('#mss-photo-file').addEventListener('change',e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){window.RPG_DEMO?.notify?.('Selecione PNG, JPG ou WebP de até 10 MB.');return;}
 const id=window.MastermindCharacters?.selectedId();if(state.system!=='ordem'||!id)return;
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=420;canvas.height=420;const ctx=canvas.getContext('2d');ctx.fillStyle='#15101b';ctx.fillRect(0,0,420,420);const scale=Math.max(420/img.width,420/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(420-w)/2,(420-h)/2,w,h);const ok=window.MastermindCharacters?.update?.(id,{photo:canvas.toDataURL('image/jpeg',.78)});if(ok)updateSummary();else window.RPG_DEMO?.notify?.('Não foi possível salvar o retrato.');};img.onerror=()=>window.RPG_DEMO?.notify?.('Imagem inválida.');img.src=reader.result;};reader.readAsDataURL(file);
});
$('#mss-native').addEventListener('click',()=>{native().scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});});
shell.addEventListener('click',e=>{
 const tab=e.target.closest('[data-mss-tab]');if(tab){navigateTab(tab.dataset.mssTab);return;}
 const sideButton=e.target.closest('[data-mss-side]');if(sideButton){state.right=sideButton.dataset.mssSide;side();return;}
 const find=e.target.closest('[data-mss-find]');if(find){navigateTab(state.right==='skills'?'stats':'powers');native().scrollIntoView({behavior:'smooth',block:'nearest'});return;}
});
$('#mss-filter').addEventListener('input',e=>{state.filter=e.target.value;side();});
native().addEventListener('change',()=>setTimeout(updateSummary,0));
native().addEventListener('click',()=>setTimeout(updateSummary,100));
document.addEventListener('rpg:character-selected',()=>setTimeout(updateSummary,0));
window.addEventListener('rpg:roll',e=>{
 const d=e.detail||{},num=Number(d.total);
 if(!Number.isFinite(num))return;
 $('#mss-roll-label').textContent=String(d.label||'Rolagem');
 $('#mss-roll-score').textContent=String(num);
 $('#mss-roll-formula').textContent=(Array.isArray(d.faces)?'['+d.faces.join(', ')+']':'')+(d.bonus!=null?' + '+d.bonus:'')+' = '+num;
 $('#mss-roll').classList.remove('mss-roll-new');void $('#mss-roll').offsetWidth;$('#mss-roll').classList.add('mss-roll-new');
});
let wasActive=sheet.classList.contains('active');
const observer=new MutationObserver(()=>{
 const active=sheet.classList.contains('active');
 if(active&&!wasActive){present(state.system);}
 else if(active)setTimeout(updateSummary,40);
 wasActive=active;
});
observer.observe(sheet,{attributes:true,attributeFilter:['class']});
present(state.system);
window.MastermindSheetStudio={get currentSystem(){return SYS[state.system].key},open(system,id){
 window.RPG_DEMO?.navigate?.('sheet');const choice=fromId(system||SYS[state.system].key);
 present(choice);if(id)setTimeout(()=>selectCharacter(id),100);return true;
},refresh:updateSummary,switchSystem:present,selectCharacter};
})();
