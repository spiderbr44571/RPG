(()=>{'use strict';
const $=s=>document.querySelector(s),op=window.OP13,root=$('#op-view-ficha');
if(!op||!root||root.dataset.r14Ready)return;
const first=root.querySelector('.op-3col'),second=root.querySelector('.op-2col');
if(!first||!second||first.children.length<3||second.children.length<2)return;
const [identity,attributes,resources]=[...first.children],[skills,powers]=[...second.children];
const types=[['attributes','Atributos'],['skills','Perícias'],['inventory','Inventário'],['powers','Habilidades / Rituais'],['story','História']];
const nav=document.createElement('nav');nav.className='r14-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Abas da ficha');
const content=document.createElement('div');content.id='r14-content';
for(const [id,name] of types){
 const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.r14Tab=id;b.setAttribute('aria-selected',String(id==='attributes'));nav.append(b);
 const p=document.createElement('div');p.className='r14-panel';p.dataset.r14Panel=id;p.hidden=id!=='attributes';content.append(p);
}
const target=id=>content.querySelector('[data-r14-panel="'+id+'"]');
target('attributes').append(identity,attributes,resources);target('skills').append(skills);target('powers').append(powers);
const inv=$('#rpg05-inventory');if(inv)target('inventory').append(inv);
const picker=$('#rpg06-spell-picker');const ritual=picker?.closest('.rpg05-band');if(ritual)target('powers').append(ritual);
const bio=document.createElement('section');bio.className='surface-flat op-panel';bio.id='r14-bio';
bio.innerHTML='<h3>História e descrição</h3><p class="op-note">O mestre poderá ler a história e a descrição na campanha.</p><label class="op-label">Descrição<textarea id="r14-description" class="op-input" maxlength="12000" rows="6" placeholder="Aparência, personalidade e características..."></textarea></label><label class="op-label">História<textarea id="r14-history" class="op-input" maxlength="12000" rows="9" placeholder="Origem, acontecimentos, objetivos..."></textarea></label>';
target('story').append(bio);
root.prepend(content);root.prepend(nav);first.remove();second.remove();
const style=document.createElement('style');style.id='r14-style';style.textContent="\n.r14-tabs{display:flex;gap:8px;overflow-x:auto;padding:7px 0 13px;margin:12px 0;scrollbar-width:thin}\n.r14-tabs button{flex:none;padding:12px;border-radius:11px;border:1px solid var(--line);color:var(--muted);background:var(--panel2);font:600 11px system-ui}\n.r14-tabs button[aria-selected=\"true\"]{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}\n.r14-panel[hidden]{display:none!important}.r14-panel{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:12px;align-items:start;min-height:120px}\n.r14-panel[data-r14-panel=\"skills\"],.r14-panel[data-r14-panel=\"inventory\"],.r14-panel[data-r14-panel=\"powers\"],.r14-panel[data-r14-panel=\"story\"]{grid-template-columns:1fr}\n.r14-panel .op-panel{margin:0;max-width:100%;min-width:0}.r14-panel .rpg05-band{margin:0}\n#r14-bio .op-input{display:block;width:100%;min-height:130px;resize:vertical;line-height:1.5}\n#r14-bio .op-label{display:block;margin:15px 0}\n@media(max-width:710px){.r14-panel{grid-template-columns:1fr}}\n";document.head.append(style);
let active='attributes';
function readBio(){const s=op.state;for(const [id,key] of [['r14-description','description'],['r14-history','history']]){const el=$('#'+id);if(el&&document.activeElement!==el)el.value=s[key]||''}}
function show(id){active=id;for(const [name] of types)target(name).hidden=name!==id;nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.r14Tab===id)));if(id==='story')readBio()}
nav.onclick=e=>{const b=e.target.closest('[data-r14-tab]');if(b)show(b.dataset.r14Tab)};
function saveBio(){const next={...op.state,description:$('#r14-description').value.slice(0,12000),history:$('#r14-history').value.slice(0,12000)};op.changeCharacter(next);root.dispatchEvent(new Event('change',{bubbles:true}))}
$('#r14-description').addEventListener('change',saveBio);$('#r14-history').addEventListener('change',saveBio);
$('#rpg05-char-select')?.addEventListener('change',()=>setTimeout(readBio,60));
$('#rpg05-new-char')?.addEventListener('click',()=>setTimeout(readBio,80));
root.dataset.r14Ready='true';window.RPG14={show,readBio};
})();