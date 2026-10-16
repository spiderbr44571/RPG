(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sys=window.OP13,app=window.RPG_DEMO,canvas=window.RPGv3;if(!sys||!app||!canvas)return;
const pack=sys.pack;const storage={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};
const equip=[
['Binóculos','equipamento',65,1],['Cicatrizante','equipamento',65,1],['Corda (10 m)','equipamento',65,1],['Arpéu','equipamento',65,1],['Lanterna Tática','equipamento',65,1],['Equipamento de Sobrevivência','equipamento',65,1],['Máscara de gás','equipamento',66,1],['Mochila Militar','equipamento',66,0],['Óculos de Visão Térmica','equipamento',66,1],['Traje Hazmat','equipamento',66,2],['Bloqueador de Sinal','equipamento',65,1],['Proteção leve','protecao',62,2],['Proteção pesada','protecao',62,5],['Escudo','protecao',62,1],['Componentes ritualísticos (Conhecimento)','item_paranormal',67,1],['Componentes ritualísticos (Energia)','item_paranormal',67,1],['Componentes ritualísticos (Morte)','item_paranormal',67,1],['Componentes ritualísticos (Sangue)','item_paranormal',67,1],['Amarras de (elemento)','item_paranormal',66,1],['Emissor de Pulsos Paranormais','item_paranormal',67,1],['Escuta de Ruídos Paranormais','item_paranormal',67,1],['Medidor de Estabilidade da Membrana','item_paranormal',67,1],['Scanner de Manifestação Paranormal (elemento)','item_paranormal',67,1]];
for(const [nome,categoriaItem,paginaLivro,espacos] of equip)if(!pack.equipamentos.gerais.some(e=>e.nome===nome))pack.equipamentos.gerais.push({nome,categoriaItem,paginaLivro,espacos,categoriaBase:0,valorCategoriaPendente:true});
const itemSel=$('#rpg05-item-catalog');if(itemSel){const all=[...pack.equipamentos.armas,...pack.equipamentos.gerais];itemSel.innerHTML=all.map((o,i)=>`<option value="${i}">${esc(o.nome)} · ${esc(o.categoriaItem)}${o.valorCategoriaPendente?' · conferir categoria':''}</option>`).join('')}
// Valores resumidos das fichas do cap. 7. Efeitos especiais continuam consultivos.
const entries=`Aberração de Carne|Sangue|182|70|19|3O+10|2d6+6
Aniquilação|Sangue|186|1200|58|5O+40|4d10+30
Carente|Sangue|188|700|40|4O+35|2d8+20
Dama de Sangue|Sangue|190|105|20|3O+10|2d6+5
Enpap-X|Sangue|193|360|36|4O+20|2d10+10
Kerberos|Sangue|194|1150|46|5O+40|4d12+30
Minotauro|Sangue|197|750|44|5O+30|6d12+20
Mulher Afogada|Sangue|199|240|28|3O+15|4d8+8
Titã de Sangue|Sangue|201|550|35|5O+25|4d12+10
Zumbi de Sangue|Sangue|202|45|17|2O+5|1d6+5
Zumbi de Sangue Bestial|Sangue|203|200|23|3O+15|2d10+5
O Diabo|Sangue|206|1666|66||
Aracnasita|Morte|209|140|23|2O+15|2d10+10
Carniçal Preto da Morte|Morte|211|400|38|4O+25|4d10+20
Ceifador Espiral|Morte|213|999|58|5O+40|5d10+20
Enraizado|Morte|214|140|28|3O+15|2d8+8
Escutado|Morte|216|290|29|3O+20|3d6+10
Esqueleto de Lodo|Morte|217|40|14|2O+5|2d6+2
Marionete|Morte|219|700|40|5O+30|10d8+10
Múmia Xipófaga|Morte|221|400|35|4O+30|4d8+30
Nidere|Morte|224|800|50|5O+35|4d10+40
Sempiternal|Morte|226|990|53|5O+40|
Succ|Morte|227|65|20|4O+10|2d8+2
Deus da Morte|Morte|230|2000|60||
Anjo|Conhecimento|234|1111|57|5O+40|4d10+40
Bicho-Papão|Conhecimento|237|750|41|5O+35|4d10+10
Espreitador|Conhecimento|238|500|34|2O+10|1d6+2
Estrangeiro|Conhecimento|241|750|50|5O+35|4d8+10
Existido|Conhecimento|242|36|13|O+5|1d4+1
Lembrado|Conhecimento|243|180|22|2O+5|2d4+7
Ocioso|Conhecimento|244|390|37||
Parasita de Culpa|Conhecimento|246|90|15|O|1d4
Rastejador Sombrio|Conhecimento|248|330|41|4O+20|4d8+5
Silhueta|Conhecimento|250|500|55||
Vulto|Conhecimento|251|60|19|4O+10|2d6
Máscara do Desespero|Conhecimento|254|1200|55||
Anárquico|Energia|257|30|21|2O+5|2d12
Anárquico Descontrolado|Energia|259|120|28|4O+15|4d12
Anomiático|Energia|263|600|41|5O+30|4d12+20
Ciborgue|Energia|265|160|25|3O+10|1d12+10
Infecticídio|Energia|267|600|25|5O+30|4d12+20
Perturbado|Energia|268|60|19|4O+10|2d12
Sukkalgir|Energia|269|220|34|3O+15|2d12
Telopsia|Energia|271|560|48|4O+35|6d12+30
Tempestuoso|Energia|273|950|56|5O+40|4d20+20
Viajante|Energia|274|360|34|4O+15|2d12+10
Anfitrião|Energia|278|1413|59||
Degolificada|Medo|282|850|45|5O+35|8d8+20`;
const beasts=entries.split('\n').map(row=>{const [name,elemento,p,pv,defesa,teste,dano]=row.split('|');return{name,elemento,paginaLivro:+p,pv:+pv,defesa:+defesa,teste,dano}});pack.criaturas=beasts;
// Os rituais pertencem ao personagem selecionado, com histórico e permissões do mestre.
const knownKey='rpg-v06-spells',character=()=>$('#rpg05-char-select')?.value||'default';
const getKnown=()=>{const saved=sys.state.rituaisConhecidos;if(Array.isArray(saved))return saved;const o=storage.get(knownKey,{});return Array.isArray(o[character()])?o[character()]:[]};
const saveKnown=ids=>{const o=storage.get(knownKey,{});o[character()]=ids;storage.set(knownKey,o);const next={...sys.state,rituaisConhecidos:ids};sys.changeCharacter(next);$('#op-view-ficha').dispatchEvent(new Event('change',{bubbles:true}));renderKnown()};
const milestones=[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99],unlock={1:5,2:25,3:55,4:85};
function warnings(list){const state=sys.state,nex=Number(state.nex)||5,oc=state.class==='Ocultista',max=oc?3+Math.max(0,milestones.filter(n=>n<=nex).length-1):Number(state.attrs?.Intelecto)||0;
const result=[];
if(oc&&list.length<max)result.push(`Há ${max-list.length} aprendizado(s) ainda não registrado(s) pela progressão padrão (${max} até NEX ${nex}%).`);
if(list.length>max)result.push(`São ${list.length} rituais registrados; progressão básica prevê ${max}. Verificar poderes, trilhas ou regras da casa.`);
if(!oc)result.push('Outras classes precisam obter rituais por poderes ou outras fontes. Este editor não bloqueia escolhas.');
for(const id of list){const r=pack.rituais.find(q=>q.id===id);if(r&&nex<unlock[r.circulo])result.push(`${r.nome} · ${r.elemento}: círculo ${r.circulo} geralmente só é liberado no NEX ${unlock[r.circulo]}% de Ocultista.`)}
if(oc&&[25,55,85].includes(nex))result.push('O círculo novo não concede três aprendizados adicionais na regra padrão do livro. É possível usar essa escolha como regra da casa.');
return [...new Set(result)];}
const area=document.createElement('div');area.className='rpg05-band';area.id='rpg06-spells';area.innerHTML=`<h3>✧ Grimório pessoal · Rituais conhecidos</h3><p class="rpg05-note">Livro v1.3, pp. 32 e 119: 3 rituais iniciais no NEX 5% e mais 1 a cada avanço de NEX. Círculos novos liberam opções; +3 por círculo é uma regra da casa. Nenhuma escolha é proibida pelo aplicativo.</p><div class="rpg05-controls"><select class="rpg05-input" id="rpg06-spell-picker" aria-label="Ritual para aprender"></select><button class="rpg05-btn primary" id="rpg06-spell-add">+ Aprender ritual</button></div><div id="rpg06-spell-list" aria-live="polite"></div>`;
$('#rpg05-inventory').before(area);
$('#rpg06-spell-picker').innerHTML=pack.rituais.map(s=>`<option value="${esc(s.id)}">${esc(s.nome)} · ${esc(s.elemento)} · ${s.circulo}º</option>`).join('');
function renderKnown(){const list=getKnown(),warn=warnings(list);const target=$('#rpg06-spell-list');target.innerHTML=`<p class="rpg05-note">${list.length} ritual(is) registrado(s) nesta ficha · ${esc(sys.state.class)} NEX ${sys.state.nex}%</p>`+(warn.length?`<div class="rpg06-alert">${warn.map(s=>`<p>⚠ ${esc(s)}</p>`).join('')}</div>`:'<p class="rpg06-ok">✓ Sem divergências detectadas.</p>')+(list.length?list.map(id=>{const r=pack.rituais.find(x=>x.id===id);return r?`<div class="rpg06-known"><div><strong>${esc(r.nome)}</strong><small>${esc(r.elemento)} · ${r.circulo}º círculo · Livro p.${r.paginaLivro}</small></div><button class="rpg05-btn" data-remove-ritual="${esc(id)}">Remover</button></div>`:''}).join(''):'<p class="rpg05-note">Seu personagem ainda não aprendeu rituais.</p>')}
$('#rpg06-spell-add').onclick=()=>{const id=$('#rpg06-spell-picker').value;if(getKnown().includes(id)){app.notify('Esse ritual já está na ficha.');return}saveKnown([...getKnown(),id]);app.notify('Ritual registrado no personagem.')};
$('#rpg06-spell-list').onclick=e=>{const b=e.target.closest('[data-remove-ritual]');if(b)saveKnown(getKnown().filter(id=>id!==b.dataset.removeRitual))};
$('#rpg05-char-select')?.addEventListener('change',()=>setTimeout(renderKnown,0));$('#op-view-ficha').addEventListener('change',()=>setTimeout(renderKnown,50));renderKnown();
// Troca os modelos únicos por catálogo de criaturas: dados no canvas são locais.
const select=$('#canvas-creature-select');select.innerHTML=beasts.map((b,i)=>`<option value="${i}">${esc(b.name)} · ${esc(b.elemento)}</option>`).join('');
function addBeast(b){const vp=$('#canvas-viewport').getBoundingClientRect();const x=(vp.width/2-app.S.panX)/app.S.zoom,y=(vp.height/2-app.S.panY)/app.S.zoom;
canvas.localCommand('encounter_add',{creature_id:'custom',name:b.name,hp:b.pv,defense:b.defesa,attack_bonus:0,damage:'1d6',x,y});app.notify(`${b.name} adicionada. Confira ataques e habilidades especiais no livro; valores de ataque não configurados não são automáticos.`)}
$('#canvas-add-creature').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();addBeast(beasts[Number(select.value)])},true);

// Somente a primeira rolagem verificada da ficha do livro é automática.
// Nenhum alvo recebe dano sem decisão do mestre.
$('#encounter-layer').addEventListener('click',event=>{
 const btn=event.target.closest('button[data-action="encounter_roll"]');if(!btn)return;
 const token=event.target.closest('.encounter-token');
 const mob=canvas.monsters.find(x=>x.id===token?.dataset.id);
 const rule=beasts.find(x=>x.name===mob?.name);
 if(!rule)return;
 const kind=btn.dataset.ability;
 if(kind==='attack'&&rule.name==='Aberração de Carne')return;
 const formula=kind==='attack'?rule.teste:rule.dano;
 if(!formula){event.stopImmediatePropagation();app.notify('Rolagem ainda não conferida para esta criatura. Consulte o livro na página '+rule.paginaLivro+'.');return;}
 let faces=[],total=0,bonus=0;
 if(kind==='attack'){
  const m=/^(\d*)O([+-]\d+)?$/.exec(formula);
  if(!m)return;
  const count=Number(m[1]||1);bonus=Number(m[2]||0);
  const bytes=new Uint32Array(count);crypto.getRandomValues(bytes);faces=[...bytes].map(x=>1+x%20);total=Math.max(...faces)+bonus;
 }else{
  const m=/^(\d+)d(\d+)([+-]\d+)?$/i.exec(formula);
  if(!m)return;
  const count=Number(m[1]),sides=Number(m[2]);bonus=Number(m[3]||0);
  if(count>50||sides>100)return;
  const bytes=new Uint32Array(count);crypto.getRandomValues(bytes);faces=[...bytes].map(x=>1+x%sides);total=faces.reduce((a,b)=>a+b,bonus);
 }
 event.preventDefault();event.stopImmediatePropagation();
 const out=$('#canvas-roll-feedback');if(out)out.textContent=rule.name+' • '+(kind==='attack'?'Ataque':'Dano')+' '+formula+' → ['+faces.join(', ')+'] '+(bonus>=0?'+':'')+bonus+' = '+total+' (Livro p.'+rule.paginaLivro+')';
},true);

const tokensKey='rpg-v06-monster-images';let images=storage.get(tokensKey,{}),current=0,isOpen=false,turnHandle=null;
const best=$('#screen-bestiary');best.innerHTML=`<div class="page-row"><div><div class="eyebrow">BESTIÁRIO · ORDEM PARANORMAL 1.3</div><h1 class="page-h">Grimório <i>do mestre.</i></h1><p class="page-sub">Abra a capa para a esquerda, folheie e feche de volta à direita. Personalize as ilustrações com tokens próprios.</p></div></div><div class="rpg06-controls"><button class="btn-primary" id="rpg06-open">✧ Abrir grimório</button><select id="rpg06-beast-pick" aria-label="Criatura"></select><button class="btn-dark" id="rpg06-prev">← Anterior</button><button class="btn-dark" id="rpg06-next">Próxima →</button></div><div class="rpg06-stage" id="rpg06-stage"><div class="rpg06-book"><section class="rpg06-page rpg06-left"><small>REGISTRO • FOLIO <span id="rpg06-page"></span></small><div class="rpg06-picture" id="rpg06-picture"><div class="rpg06-sigil">✧</div></div><label class="rpg06-upload">Adicionar imagem/token<input type="file" id="rpg06-upload" accept="image/png,image/jpeg,image/webp" hidden></label><p class="rpg06-hint">Tokens importados permanecem no dispositivo. A distribuição do aplicativo não inclui artes comerciais.</p></section><section class="rpg06-page rpg06-right"><small>AMEAÇA DOCUMENTADA</small><h2 id="rpg06-name"></h2><p id="rpg06-element"></p><div class="rpg06-stats" id="rpg06-stats"></div><p class="rpg06-hint">Poderes únicos, resistências, enigmas e ataques adicionais precisam de conferência no livro.</p><div class="rpg06-controls"><button class="btn-book" id="rpg06-put">✦ Adicionar ao canvas</button><button class="btn-book" id="rpg06-reference">Livro: página</button></div></section><div class="rpg06-cover" id="rpg06-cover"><div class="rpg06-symbol">✧</div><strong>GRIMÓRIO<br>DAS CRIATURAS</strong><small>ORDEM PARANORMAL · VOLUME 1</small></div></div></div><p class="rpg05-note">${beasts.length} criaturas com atributos essenciais indexados e referências de páginas. Esta não é uma reprodução das fichas completas do livro.</p>`;
const bsel=$('#rpg06-beast-pick');bsel.innerHTML=beasts.map((b,i)=>`<option value="${i}">${esc(b.name)} · ${esc(b.elemento)}</option>`).join('');
function show(){const b=beasts[current];bsel.value=current;$('#rpg06-page').textContent=b.paginaLivro;$('#rpg06-name').textContent=b.name;$('#rpg06-element').textContent=b.elemento.toUpperCase();$('#rpg06-stats').innerHTML=`<div><small>PV</small><strong>${b.pv}</strong></div><div><small>DEF</small><strong>${b.defesa}</strong></div><div><small>Livro</small><strong>p.${b.paginaLivro}</strong></div>`;$('#rpg06-picture').innerHTML=images[b.name]?`<img alt="Token importado de ${esc(b.name)}" src="${images[b.name]}">`:'<div class="rpg06-sigil">✧<small>SEM TOKEN</small></div>'}
function opened(v){isOpen=v;$('#rpg06-stage').classList.toggle('open',v);$('#rpg06-open').textContent=v?'✧ Fechar grimório':'✧ Abrir grimório'}
function flip(delta){if(!isOpen){opened(true);return}$('#rpg06-stage').classList.add('turn');clearTimeout(turnHandle);turnHandle=setTimeout(()=>{current=(current+delta+beasts.length)%beasts.length;show();$('#rpg06-stage').classList.remove('turn')},240)}
$('#rpg06-open').onclick=()=>opened(!isOpen);$('#rpg06-cover').onclick=()=>opened(true);$('#rpg06-prev').onclick=()=>flip(-1);$('#rpg06-next').onclick=()=>flip(1);bsel.onchange=()=>{current=Number(bsel.value);show();opened(true)};
$('#rpg06-put').onclick=()=>{addBeast(beasts[current]);app.navigate('canvas')};$('#rpg06-reference').onclick=()=>{app.navigate('library');const p=$('#op-book-page');if(p)p.value=beasts[current].paginaLivro};
$('#rpg06-upload').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>6*1024*1024){app.notify('Imagem acima de 6 MB.');return}const name=beasts[current].name,reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),ratio=Math.min(1,320/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);images[name]=c.toDataURL('image/webp',.63);if(!storage.set(tokensKey,images))app.notify('Sem espaço para armazenar a imagem neste aparelho.');show();paintTokens()};img.src=reader.result};reader.readAsDataURL(file);e.target.value=''};
function paintTokens(){$$('#encounter-layer .encounter-token').forEach(el=>{const monster=canvas.monsters.find(x=>x.id===el.dataset.id),src=monster&&images[monster.name];if(!src)return;let img=el.querySelector('.rpg06-token');if(!img){img=document.createElement('img');img.className='rpg06-token';img.alt='Token do encontro';el.querySelector('.token-body')?.prepend(img)}if(img.src!==src)img.src=src})}
new MutationObserver(paintTokens).observe($('#encounter-layer'),{childList:true});show();paintTokens();
const css=`.rpg06-alert{padding:10px 14px;border:1px solid #9e734c88;background:#926e3315;border-radius:10px;margin:8px 0;font-size:12px}.rpg06-alert p{margin:7px 0}.rpg06-ok{color:#a4baa4;font-size:12px}.rpg06-known{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #9c764d55;padding:10px 0}.rpg06-known strong,.rpg06-known small{display:block}.rpg06-known small{color:#b5a68f;font-size:11px}.rpg06-controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:18px 0}.rpg06-controls select{background:#201d24;border:1px solid #846844;color:#eee4d5;padding:10px;max-width:100%;border-radius:8px}.rpg06-stage{min-height:530px;perspective:1800px;display:flex;justify-content:center;align-items:center}.rpg06-book{width:min(930px,96vw);height:485px;position:relative;transform-style:preserve-3d;transform:translateX(-25%);transition:transform .85s}.rpg06-stage.open .rpg06-book{transform:translateX(0)}.rpg06-page{position:absolute;top:0;width:50%;height:100%;box-sizing:border-box;overflow:auto;padding:24px;background:#d4bd94;color:#32261a;border:2px solid #82613b;box-shadow:inset 0 0 50px #92714655;opacity:0;transition:opacity .3s .26s}.rpg06-stage.open .rpg06-page{opacity:1}.rpg06-left{left:0;border-radius:17px 3px 3px 17px}.rpg06-right{left:50%;border-left:9px double #a18463;border-radius:3px 17px 17px 3px}.rpg06-page small{font-size:10px;letter-spacing:.13em;color:#70533b}.rpg06-right h2{font:normal clamp(17px,3vw,36px) Georgia,serif;margin:25px 0 5px}.rpg06-stats{display:flex;gap:7px;flex-wrap:wrap;margin:20px 0}.rpg06-stats div{border:1px solid #84623e;border-radius:7px;flex:1;padding:10px;min-width:35px}.rpg06-stats small,.rpg06-stats strong{display:block}.rpg06-stats strong{font:normal 24px Georgia,serif}.rpg06-picture{height:62%;min-height:180px;background:#9e84566a;margin:20px 0 7px;border:2px double #775a3b;display:flex;align-items:center;justify-content:center;overflow:hidden}.rpg06-picture img{width:100%;height:100%;object-fit:contain}.rpg06-sigil{font-size:70px;text-align:center;color:#715437}.rpg06-sigil small{display:block}.rpg06-upload{display:block;font-size:12px;text-align:center;border:1px dashed #91694c;padding:9px;cursor:pointer}.rpg06-hint{font-size:11px!important;color:#755738}.rpg06-cover{cursor:pointer;position:absolute;top:0;left:50%;height:100%;width:50%;box-sizing:border-box;z-index:3;transform-origin:left center;transform:rotateY(0);transition:transform .97s cubic-bezier(.2,.7,.17,1);background:radial-gradient(ellipse at 50% 28%,#523326 0,#190e16 74%);border:2px solid #9c7448;border-radius:6px 18px 18px 6px;box-shadow:inset 0 0 0 11px #3b251e,inset 0 0 0 14px #b3905a88,0 18px 35px #0008;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;color:#e3c58e;backface-visibility:hidden}.rpg06-cover strong{font:normal clamp(15px,3vw,29px) Georgia,serif;letter-spacing:.12em}.rpg06-cover small{font-size:9px;color:#c1a57d}.rpg06-symbol{font-size:78px;border:3px double #b4915c;border-radius:50%;width:134px;height:134px;display:grid;place-items:center}.rpg06-stage.open .rpg06-cover{transform:rotateY(-178deg)}.rpg06-stage.turn .rpg06-page{opacity:.35;filter:brightness(.7);transition:all .24s}.rpg06-token{float:left;width:50px;height:50px;object-fit:contain;margin-right:8px}@media(max-width:650px){.rpg06-stage{min-height:430px}.rpg06-book{height:390px}.rpg06-page{padding:12px 10px}.rpg06-right h2{font-size:18px;margin:12px 0 4px}.rpg06-picture{height:47%;min-height:155px}.rpg06-symbol{width:75px;height:75px;font-size:50px}.rpg06-cover strong{font-size:15px}.rpg06-cover small{font-size:7px}.rpg06-stats{gap:3px}.rpg06-stats div{padding:6px}.rpg06-stats strong{font-size:17px}}@media(prefers-reduced-motion:reduce){.rpg06-stage *{transition:none!important}}`;
const style=document.createElement('style');style.id='rpg06-style';style.textContent=css;document.head.append(style);
window.RPG06={beasts,known:getKnown,warnings,renderKnown,openBook:opened};
})();
