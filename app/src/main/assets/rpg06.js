(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sys=window.OP13,app=window.RPG_DEMO,canvas=window.RPGv3;if(!sys||!app||!canvas)return;
const pack=sys.pack;const storage={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};
// Catálogo corrigido vem do pacote 1.3 e não é substituído por placeholders.
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
function flip(delta){if(!isOpen){opened(true);return}$('#rpg06-stage').classList.add('turn');clearTimeout(turnHandle);turnHandle=setTimeout(()=>{current=(current+delta+beasts.length)%beasts.length;show();setTimeout(()=>$('#rpg06-stage').classList.remove('turn'),280)},240)}
$('#rpg06-open').onclick=()=>opened(!isOpen);$('#rpg06-cover').onclick=()=>opened(true);$('#rpg06-prev').onclick=()=>flip(-1);$('#rpg06-next').onclick=()=>flip(1);bsel.onchange=()=>{current=Number(bsel.value);show();opened(true)};
$('#rpg06-put').onclick=()=>{addBeast(beasts[current]);app.navigate('canvas')};$('#rpg06-reference').onclick=()=>{app.navigate('library');const p=$('#op-book-page');if(p)p.value=beasts[current].paginaLivro};
$('#rpg06-upload').onchange=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>6*1024*1024){app.notify('Imagem acima de 6 MB.');return}const name=beasts[current].name,reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),ratio=Math.min(1,320/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);images[name]=c.toDataURL('image/webp',.63);if(!storage.set(tokensKey,images))app.notify('Sem espaço para armazenar a imagem neste aparelho.');show();paintTokens()};img.src=reader.result};reader.readAsDataURL(file);e.target.value=''};
function paintTokens(){$$('#encounter-layer .encounter-token').forEach(el=>{const monster=canvas.monsters.find(x=>x.id===el.dataset.id),src=monster&&images[monster.name];if(!src)return;let img=el.querySelector('.rpg06-token');if(!img){img=document.createElement('img');img.className='rpg06-token';img.alt='Token do encontro';el.querySelector('.token-body')?.prepend(img)}if(img.src!==src)img.src=src})}
new MutationObserver(paintTokens).observe($('#encounter-layer'),{childList:true});show();paintTokens();
const css=`.rpg06-alert{padding:10px 14px;border:1px solid #9e734c88;background:#926e3315;border-radius:10px;margin:8px 0;font-size:12px}.rpg06-alert p{margin:7px 0}.rpg06-ok{color:#a4baa4;font-size:12px}.rpg06-known{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #9c764d55;padding:10px 0}.rpg06-known strong,.rpg06-known small{display:block}.rpg06-known small{color:#b5a68f;font-size:11px}.rpg06-controls{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:18px 0}.rpg06-controls select{background:#201d24;border:1px solid #846844;color:#eee4d5;padding:10px;max-width:100%;border-radius:8px}.rpg06-stage{min-height:530px;perspective:1800px;display:flex;justify-content:center;align-items:center}.rpg06-book{width:min(930px,96vw);height:485px;position:relative;transform-style:preserve-3d;transform:translateX(-25%);transition:transform .85s}.rpg06-stage.open .rpg06-book{transform:translateX(0)}.rpg06-page{position:absolute;top:0;width:50%;height:100%;box-sizing:border-box;overflow:auto;padding:24px;background:#d4bd94;color:#32261a;border:2px solid #82613b;box-shadow:inset 0 0 50px #92714655;opacity:0;transition:opacity .3s .26s}.rpg06-stage.open .rpg06-page{opacity:1}.rpg06-left{left:0;border-radius:17px 3px 3px 17px}.rpg06-right{left:50%;border-left:9px double #a18463;border-radius:3px 17px 17px 3px}.rpg06-page small{font-size:10px;letter-spacing:.13em;color:#70533b}.rpg06-right h2{font:normal clamp(17px,3vw,36px) Georgia,serif;margin:25px 0 5px}.rpg06-stats{display:flex;gap:7px;flex-wrap:wrap;margin:20px 0}.rpg06-stats div{border:1px solid #84623e;border-radius:7px;flex:1;padding:10px;min-width:35px}.rpg06-stats small,.rpg06-stats strong{display:block}.rpg06-stats strong{font:normal 24px Georgia,serif}.rpg06-picture{height:62%;min-height:180px;background:#9e84566a;margin:20px 0 7px;border:2px double #775a3b;display:flex;align-items:center;justify-content:center;overflow:hidden}.rpg06-picture img{width:100%;height:100%;object-fit:contain}.rpg06-sigil{font-size:70px;text-align:center;color:#715437}.rpg06-sigil small{display:block}.rpg06-upload{display:block;font-size:12px;text-align:center;border:1px dashed #91694c;padding:9px;cursor:pointer}.rpg06-hint{font-size:11px!important;color:#755738}.rpg06-cover{cursor:pointer;position:absolute;top:0;left:50%;height:100%;width:50%;box-sizing:border-box;z-index:3;transform-origin:left center;transform:rotateY(0);transition:transform .97s cubic-bezier(.2,.7,.17,1);background:radial-gradient(ellipse at 50% 28%,#523326 0,#190e16 74%);border:2px solid #9c7448;border-radius:6px 18px 18px 6px;box-shadow:inset 0 0 0 11px #3b251e,inset 0 0 0 14px #b3905a88,0 18px 35px #0008;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center;color:#e3c58e;backface-visibility:hidden}.rpg06-cover strong{font:normal clamp(15px,3vw,29px) Georgia,serif;letter-spacing:.12em}.rpg06-cover small{font-size:9px;color:#c1a57d}.rpg06-symbol{font-size:78px;border:3px double #b4915c;border-radius:50%;width:134px;height:134px;display:grid;place-items:center}.rpg06-stage.open .rpg06-cover{transform:rotateY(-178deg)}.rpg06-stage.turn .rpg06-page{opacity:.35;filter:brightness(.7);transition:all .24s}.rpg06-token{float:left;width:50px;height:50px;object-fit:contain;margin-right:8px}@media(max-width:650px){.rpg06-stage{min-height:430px}.rpg06-book{height:390px}.rpg06-page{padding:12px 10px}.rpg06-right h2{font-size:18px;margin:12px 0 4px}.rpg06-picture{height:47%;min-height:155px}.rpg06-symbol{width:75px;height:75px;font-size:50px}.rpg06-cover strong{font-size:15px}.rpg06-cover small{font-size:7px}.rpg06-stats{gap:3px}.rpg06-stats div{padding:6px}.rpg06-stats strong{font-size:17px}}@media(prefers-reduced-motion:reduce){.rpg06-stage *{transition:none!important}}`;
const style=document.createElement('style');style.id='rpg06-style';style.textContent=css;document.head.append(style);

// 0.7: revisão das fichas e editor de ameaças. O livro original continua no dispositivo do leitor.
const vdOriginal={"Aberração de Carne":40,"Aniquilação":380,"Carente":300,"Dama de Sangue":60,"Enpap-X":180,"Kerberos":340,"Minotauro":280,"Mulher Afogada":140,"Titã de Sangue":220,"Zumbi de Sangue":20,"Zumbi de Sangue Bestial":100,"O Diabo":400,"Aracnasita":80,"Carniçal Preto da Morte":200,"Ceifador Espiral":380,"Enraizado":120,"Escutado":160,"Esqueleto de Lodo":20,"Marionete":280,"Múmia Xipófaga":240,"Nidere":320,"Sempiternal":360,"Succ":40,"Deus da Morte":400,"Anjo":380,"Bicho-Papão":300,"Espreitador":220,"Estrangeiro":340,"Existido":20,"Lembrado":100,"Ocioso":260,"Parasita de Culpa":60,"Rastejador Sombrio":180,"Silhueta":360,"Vulto":40,"Máscara do Desespero":400,"Anárquico":20,"Anárquico Descontrolado":120,"Anomiático":240,"Ciborgue":80,"Infecticídio":280,"Perturbado":40,"Sukkalgir":160,"Telopsia":340,"Tempestuoso":360,"Viajante":200,"Anfitrião":413,"Degolificada":320};
const descriptions={
'Aberração de Carne':'Criatura de Sangue originada de um experimento de união corporal. Seus membros numerosos permitem ataques seguidos e agarrões.',
'Aniquilação':'Ameaça colossal de Sangue associada a rastros de destruição em civilizações antigas. Apresenta múltiplos tentáculos.',
'Zumbi de Sangue':'Corpo animado pela manifestação do elemento Sangue.',
'Esqueleto de Lodo':'Ameaça composta por restos animados pelo lodo da Morte.',
'Deus da Morte':'Relíquia de Morte; suas regras especiais estão na ficha de referência.',
'Anjo':'Manifestação de Conhecimento descrita como uma experiência reveladora e aterrorizante.',
'Máscara do Desespero':'Relíquia de Conhecimento com capacidades de modificar a Realidade.',
'Anfitrião':'Relíquia de Energia; sua ficha inclui um Enigma de Medo.',
'Degolificada':'Ameaça ligada a um Enigma de Medo, capaz de agarrar e produzir ataques mentais.'
};
const storeOverrides='rpg-v07-bestiary-edit',storeCustom='rpg-v07-bestiary-custom';
let custom=storage.get(storeCustom,[]);if(!Array.isArray(custom))custom=[];
const mods=storage.get(storeOverrides,{});
beasts.forEach((b,i)=>{b.id='official-'+i;b.oficial=true;b.vd=vdOriginal[b.name]??null;b.descricao=descriptions[b.name]||'Ameaça do elemento '+b.elemento+'. Para a descrição completa e poderes específicos, consulte a página '+b.paginaLivro+' do livro pessoal.';b.efeitos='Habilidades, resistências e condições: consulte a ficha original antes da execução.';b.deslocamento='Consultar o livro';if(b.name==='Ciborgue')b.dano='2d8+10';if(mods[b.id])Object.assign(b,mods[b.id])});
for(const customBeast of custom){if(customBeast&&customBeast.name)beasts.push({...customBeast,oficial:false})}
function refreshBeastSelection(){const selected=beasts[current]?.id;bsel.innerHTML=beasts.map((b,i)=>'<option value="'+i+'">'+esc(b.name)+(b.oficial?'':' ★')+' · '+esc(b.elemento)+'</option>').join('');const ix=beasts.findIndex(b=>b.id===selected);current=ix<0?0:ix;bsel.value=String(current);select.innerHTML=beasts.map((b,i)=>'<option value="'+i+'">'+esc(b.name)+'</option>').join('')}
function displayDetails(){const b=beasts[current];if(!b)return;const old=$('#rpg07-detail');old?.remove();const entry=document.createElement('div');entry.id='rpg07-detail';entry.className='rpg07-detail';entry.innerHTML='<p><strong>Descrição:</strong> '+esc(b.descricao||'')+'</p><p><strong>VD:</strong> '+esc(b.vd??'A conferir')+' | <strong>Teste:</strong> '+esc(b.teste||'A conferir')+' | <strong>Dano:</strong> '+esc(b.dano||'A conferir')+'</p><p><strong>Ações e efeitos:</strong> '+esc(b.efeitos||'A conferir')+'</p><p><strong>Atributos:</strong> '+esc(b.atributos||'Consultar livro')+'</p><p><strong>Perícias:</strong> '+esc(b.pericias||'Consultar livro')+'</p><p><strong>Resistências:</strong> '+esc(b.resistencias||'Consultar livro')+'</p><p><strong>Imunidades:</strong> '+esc(b.imunidades||'Consultar livro')+'</p><p><strong>Sentidos:</strong> '+esc(b.sentidos||'Consultar livro')+'</p><p><strong>Presença perturbadora:</strong> '+esc(b.presencaPerturbadora||'Consultar livro')+'</p><p><strong>Enigma de Medo:</strong> '+esc(b.enigmaDeMedo||'Consultar livro')+'</p><small>Livro v1.3, p.'+esc(b.paginaLivro||'—')+' · Personalizações salvas localmente.</small>';$('#rpg06-stats')?.after(entry);$('#rpg06-reference').textContent='Ver referência · p.'+(b.paginaLivro||'?')}
const previousShow=show;show=function(){previousShow();displayDetails()};
const newButtons=document.createElement('div');newButtons.className='rpg06-controls rpg07-control';newButtons.innerHTML='<button class="btn-dark" id="rpg07-create">+ Criar criatura</button><button class="btn-dark" id="rpg07-edit">Editar ficha</button><button class="btn-dark" id="rpg07-copy">Duplicar</button><button class="btn-dark" id="rpg07-restore">Restaurar / Excluir</button>';
$('#rpg06-stage').before(newButtons);
const editor=document.createElement('div');editor.className='rpg05-band rpg07-editor';editor.id='rpg07-editor';editor.hidden=true;$('#rpg06-stage').after(editor);
function saveRecord(b){if(b.oficial){const all=storage.get(storeOverrides,{});all[b.id]={...b};storage.set(storeOverrides,all)}else{storage.set(storeCustom,beasts.filter(x=>!x.oficial).map(x=>({...x})))}
 refreshBeastSelection();show();}
function editRecord(b,newRecord=false){
 editor.hidden=false;
 const fields=[['name','Nome'],['elemento','Elemento'],['pv','PV'],['defesa','Defesa'],['vd','Valor de Desafio (VD)'],['paginaLivro','Página do livro'],['teste','Teste de ataque'],['dano','Dados de dano'],['deslocamento','Deslocamento'],['tamanho','Tamanho'],['atributos','Atributos (AGI/FOR/INT/PRE/VIG)'],['pericias','Perícias'],['resistencias','Resistências e vulnerabilidades'],['imunidades','Imunidades'],['sentidos','Sentidos'],['presencaPerturbadora','Presença perturbadora'],['enigmaDeMedo','Enigma de Medo'],['descricao','Resumo da criatura'],['efeitos','Ações, poderes e efeitos']];
 editor.innerHTML='<h3>'+(newRecord?'Criar criatura':'Editar '+esc(b.name))+'</h3><p class="rpg05-note">Fichas oficiais podem receber personalizações locais. Reproduza as descrições completas consultando seu próprio PDF; elas não são distribuídas no app.</p><form id="rpg07-edit-form" class="rpg07-form">'+fields.map(([k,label])=>'<label>'+label+(k==='descricao'||k==='efeitos'?'<textarea name="'+k+'" rows="3">'+esc(b[k]??'')+'</textarea>':'<input name="'+k+'" value="'+esc(b[k]??'')+'">')+'</label>').join('')+'<div class="rpg06-controls"><button type="submit" class="btn-primary">Salvar</button><button type="button" class="btn-dark" id="rpg07-cancel">Cancelar</button></div></form>';
 $('#rpg07-cancel').onclick=()=>editor.hidden=true;
 $('#rpg07-edit-form').onsubmit=event=>{
  event.preventDefault();const fd=new FormData(event.currentTarget),o={...b};
  for(const [k,v] of fd.entries())o[k]=['pv','defesa','vd','paginaLivro'].includes(k)?(v.trim()===''?null:Number(v)):v.trim();
  if(!o.name||!Number.isFinite(o.pv)||o.pv<0||o.pv>100000||!Number.isFinite(o.defesa)||o.defesa<0||o.defesa>1000){app.notify('Informe nome, PV e Defesa válidos');return}
  if(newRecord){o.id='custom-'+Date.now();o.oficial=false;beasts.push(o);current=beasts.length-1}else{Object.assign(b,o)}
  saveRecord(o);editor.hidden=true;opened(true);app.notify('Criatura salva localmente.');show();
 };
 editor.scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('#rpg07-create').onclick=()=>editRecord({id:'',oficial:false,name:'',elemento:'Personalizado',pv:20,defesa:10,vd:null,paginaLivro:null,teste:'',dano:'',deslocamento:'',descricao:'',efeitos:''},true);
$('#rpg07-edit').onclick=()=>editRecord(beasts[current],false);
$('#rpg07-copy').onclick=()=>{const o={...beasts[current],id:'custom-'+Date.now(),name:beasts[current].name+' (cópia)',oficial:false};beasts.push(o);current=beasts.length-1;saveRecord(o);opened(true);app.notify('Cópia independente criada.')};
$('#rpg07-restore').onclick=()=>{const b=beasts[current];if(b.oficial){if(!confirm('Restaurar dados do livro?'))return;const all=storage.get(storeOverrides,{});delete all[b.id];storage.set(storeOverrides,all);const i=current;const original=entries.split('\n')[i]?.split('|');if(original){b.name=original[0];b.elemento=original[1];b.paginaLivro=+original[2];b.pv=+original[3];b.defesa=+original[4];b.teste=original[5];b.dano=original[6];b.vd=vdOriginal[b.name]??null;b.descricao=descriptions[b.name]||'Consultar livro, p.'+b.paginaLivro;b.efeitos='Consulte habilidades e resistências na ficha do livro.'}}else{if(!confirm('Excluir criatura personalizada?'))return;beasts.splice(current,1);current=Math.max(0,current-1);storage.set(storeCustom,beasts.filter(x=>!x.oficial))}refreshBeastSelection();show()};
refreshBeastSelection();displayDetails();
const originButton=document.createElement('button');originButton.className='btn-dark';originButton.id='rpg07-original-page';originButton.textContent='📖 Ver página original';$('#rpg07-copy').after(originButton);
const backdrop=document.createElement('div');backdrop.id='rpg07-pdf-lightbox';backdrop.hidden=true;backdrop.innerHTML='<div class="rpg07-reader"><div class="rpg06-controls"><strong id="rpg07-book-caption">Página original</strong><button class="btn-dark" id="rpg07-book-minus">−</button><button class="btn-dark" id="rpg07-book-plus">+</button><button class="btn-dark" id="rpg07-book-close">Fechar</button></div><p id="rpg07-book-loading">Preparando página...</p><img id="rpg07-page-preview" alt="Página original do PDF selecionado pelo usuário"></div>';document.body.append(backdrop);
originButton.onclick=()=>{
 const b=beasts[current];
 if(!b?.paginaLivro){app.notify('Esta criatura é personalizada e não possui página de referência.');return}
 if(window.RpgBookBridge?.renderPage){
  backdrop.hidden=false;$('#rpg07-book-caption').textContent='Ordem Paranormal RPG 1.3 · Livro p.'+b.paginaLivro;
  $('#rpg07-book-loading').textContent='Carregando página do PDF pessoal...';$('#rpg07-page-preview').removeAttribute('src');
  window.RpgBookBridge.renderPage(Math.round(Number(b.paginaLivro)));return;
 }
 app.notify('Abra o PDF importado na Biblioteca para consultar a descrição original.');
 app.navigate('library');
};
window.addEventListener('rpg-page-rendered',e=>{if(backdrop.hidden)return;$('#rpg07-book-loading').textContent='';$('#rpg07-page-preview').src=e.detail.src});
window.addEventListener('rpg-page-error',e=>{if(!backdrop.hidden)$('#rpg07-book-loading').textContent=String(e.detail||'Falha ao ler o PDF.')});
let zoomPage=100;$('#rpg07-book-plus').onclick=()=>{zoomPage=Math.min(320,zoomPage+25);$('#rpg07-page-preview').style.width=zoomPage+'%'};$('#rpg07-book-minus').onclick=()=>{zoomPage=Math.max(100,zoomPage-25);$('#rpg07-page-preview').style.width=zoomPage+'%'};
$('#rpg07-book-close').onclick=()=>{backdrop.hidden=true;$('#rpg07-page-preview').removeAttribute('src')};
backdrop.addEventListener('click',e=>{if(e.target===backdrop)$('#rpg07-book-close').click()});
const flipSheet=document.createElement('div');flipSheet.className='rpg07-flip-sheet';flipSheet.setAttribute('aria-hidden','true');$('#rpg06-stage .rpg06-book').append(flipSheet);
const flipStyle=document.createElement('style');flipStyle.textContent='.rpg07-flip-sheet{display:none;pointer-events:none;position:absolute;left:50%;top:0;width:50%;height:100%;z-index:4;transform-origin:left center;background:linear-gradient(95deg,#bda77d,#e2d2ae 12%,#d1b88b 90%,#8a7151);border:1px solid #936e47;box-shadow:0 0 24px #0005}.rpg06-stage.turn .rpg07-flip-sheet{display:block;animation:rpg07flip .52s ease-in-out forwards}@keyframes rpg07flip{0%{transform:rotateY(0deg)}49%{transform:rotateY(-86deg)}100%{transform:rotateY(-180deg)}}@media(prefers-reduced-motion:reduce){.rpg06-stage.turn .rpg07-flip-sheet{animation:none}}';document.head.append(flipStyle);
const paperStyle=document.createElement('style');paperStyle.textContent='#rpg07-pdf-lightbox[hidden]{display:none}#rpg07-pdf-lightbox{position:fixed;inset:0;z-index:10000;background:#000c;display:grid;place-items:center;padding:12px}#rpg07-pdf-lightbox .rpg07-reader{max-width:900px;width:100%;max-height:97vh;overflow:auto;padding:12px;background:#1c1b21;border:1px solid #ba9169;border-radius:14px}#rpg07-pdf-lightbox img{display:block;width:100%;height:auto;max-width:none;border-radius:6px}#rpg07-book-loading{color:#e3cba7}';document.head.append(paperStyle);

const extraStyles=document.createElement('style');extraStyles.textContent='.rpg07-detail{font:12px/1.45 Georgia,serif;color:#3f2a20;white-space:normal}.rpg07-detail p{margin:8px 0}.rpg07-detail small{color:#684b36}.rpg07-editor[hidden]{display:none}.rpg07-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.rpg07-form label{font-size:12px;display:flex;flex-direction:column;gap:5px}.rpg07-form label:has(textarea),.rpg07-form .rpg06-controls{grid-column:span 3}.rpg07-form input,.rpg07-form textarea{width:100%;box-sizing:border-box;border:1px solid #94774d;background:#171722;color:#f6e7cd;border-radius:8px;padding:10px}@media(max-width:680px){.rpg07-form{grid-template-columns:1fr 1fr}.rpg07-form label:has(textarea),.rpg07-form .rpg06-controls{grid-column:span 2}.rpg07-detail{font-size:10px}.rpg07-detail p{margin:5px 0}}';document.head.append(extraStyles);
// Ficha de abertura informativa. A roda RGB e configurações existentes permanecem intactas.
const home=$('#screen-home');home.innerHTML='<div class="page-row"><div><div class="eyebrow">ORDEM PARANORMAL · CENTRAL OFFLINE</div><h1 class="page-h">Seu universo, <i>organizado.</i></h1><p class="page-sub">Regras da biblioteca, personagens, encontros e grimório em um só lugar.</p></div><button class="btn-dark" id="rpg07-home-settings">⚙ Personalizar</button></div><article class="hero rpg07-home-hero"><div class="hero-glow"></div><svg class="hero-orbit" viewBox="0 0 460 460" aria-hidden="true"><circle class="big" cx="230" cy="230" r="194"/><circle class="fine" cx="230" cy="230" r="165"/><circle class="big" cx="230" cy="230" r="139"/><circle class="fine" cx="230" cy="230" r="115"/><path class="big" d="m230 36 168 290H62ZM230 424 62 134h336zM36 230h388M230 36v388"/></svg><div class="hero-copy"><span class="hero-label">BIBLIOTECA DE RPG</span><h2>Sua mesa <i>evoluiu.</i></h2><p>Sistema instalado: Ordem Paranormal RPG 1.3. Importe seu PDF na biblioteca e personalize sua campanha.</p><button class="btn-primary" id="rpg07-go-sheet">Abrir personagens →</button></div></article><div class="rpg07-counts"><div class="surface-flat"><small>Livros importados</small><strong id="rpg07-books">0</strong></div><div class="surface-flat"><small>Sistemas instalados</small><strong>1</strong></div><div class="surface-flat"><small>Personagens</small><strong id="rpg07-chars">0</strong></div><div class="surface-flat"><small>Criaturas</small><strong id="rpg07-beasts">0</strong></div></div><div class="rpg06-controls"><button class="btn-dark" id="rpg07-go-library">Biblioteca</button><button class="btn-dark" id="rpg07-go-canvas">Canvas infinito</button><button class="btn-dark" id="rpg07-go-best">Grimório</button></div>';
$('#rpg07-home-settings').onclick=()=>app.navigate('settings');$('#rpg07-go-sheet').onclick=()=>app.navigate('sheet');$('#rpg07-go-library').onclick=()=>app.navigate('library');$('#rpg07-go-canvas').onclick=()=>app.navigate('canvas');$('#rpg07-go-best').onclick=()=>app.navigate('bestiary');
function updateCounts(){const chars=storage.get('rpg-v05-characters',[]),book=storage.get('rpg-v05-book-meta',{});let imported=!!book.available;try{if(window.RpgBookBridge?.getSavedPdf)imported=imported||JSON.parse(window.RpgBookBridge.getSavedPdf()).available}catch{}$('#rpg07-books').textContent=imported?'1':'0';$('#rpg07-chars').textContent=Array.isArray(chars)&&chars.length?chars.length:($('#rpg05-char-select')?.options.length||0);$('#rpg07-beasts').textContent=beasts.length}
$('.nav-btn[data-screen="home"]')?.addEventListener('click',()=>setTimeout(updateCounts,0));window.addEventListener('rpg-book-selected',updateCounts);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateCounts()});updateCounts();
const quick=document.createElement('button');quick.id='rpg07-settings-quick';quick.textContent='⚙';quick.title='Configurações';quick.setAttribute('aria-label','Abrir personalização');quick.onclick=()=>app.navigate('settings');document.body.append(quick);
const visual=document.createElement('style');visual.textContent='.rpg07-home-hero{margin:16px 0;min-height:270px}.rpg07-home-hero .hero-orbit{animation:rpg07rotate 48s linear infinite;transform-origin:center}@keyframes rpg07rotate{to{transform:rotate(360deg)}}.rpg07-counts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:15px 0}.rpg07-counts>div{padding:17px;border-radius:12px}.rpg07-counts small,.rpg07-counts strong{display:block}.rpg07-counts small{font-size:12px;color:var(--muted)}.rpg07-counts strong{font-size:30px;color:var(--text)}#rpg07-settings-quick{position:fixed;right:14px;bottom:17px;width:45px;height:45px;border:1px solid #a78a61;border-radius:50%;background:#27222b;color:#e4c58e;font-size:21px;z-index:1100;box-shadow:0 8px 20px #0008;cursor:pointer}@media(max-width:640px){.rpg07-counts{grid-template-columns:1fr 1fr}.rpg07-home-hero .hero-copy{padding:17px}}@media(prefers-reduced-motion:reduce){.rpg07-home-hero .hero-orbit{animation:none}}';document.head.append(visual);

window.RPG06={beasts,known:getKnown,warnings,renderKnown,openBook:opened};
})();
