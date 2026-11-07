/* Mastermind · revamp — telas, Central, entrada do jogador, Bestiário, tutorial e rotas. */
(function(){
'use strict';
const {$,$$,esc,ic,clamp,on,emit,toast,store,copyText}=RV;
const views={};let prevHash='#inicio';

/* ============ Central da mesa (mesmo padrão do app atual) ============ */
const CENTRAL=[['#inicio','home','Painel inicial','Resumo da campanha'],['#mestragem','crown','Mestragem','Campanha, mesa ao vivo e cenários'],['#ficha','users','Fichas','Personagens, poderes e retratos'],
 ['#biblioteca','books','Biblioteca','Livros, busca nos PDFs e regras'],['#bestiario','skull','Bestiário','Grimório e monstros'],['soon:Ateliê','palette','Ateliê','Retrato e token em camadas'],
 ['soon:Canvas infinito','layout-grid','Canvas infinito','Notas, mapas e criaturas'],['#ajustes','adjustments','Personalização','Temas, efeitos, cores e fontes'],['#entrar','device-mobile','Entrar numa mesa','Como jogador, pelo app ou navegador']];
RV.openCentral=()=>{if($('#central'))return;const LIST=CENTRAL.concat(RV.inApp?[['app:back','arrow-back-up','Interface atual','Voltar ao app como era antes']]:[]);const m=document.createElement('div');m.id='central';m.className='modal-back central-back';
 m.innerHTML=`<section class="central" role="dialog" aria-modal="true" aria-labelledby="central-h"><div class="fh" style="padding:0"><div><span class="kicker">Central da mesa</span><h2 id="central-h">Escolha seu próximo <em>caminho.</em></h2><p class="muted small" style="margin:4px 0 0">Todas as ferramentas em um só lugar. Abrir esta central não realiza rolagens.</p></div><button class="x-btn" type="button" data-cx aria-label="Fechar a Central">${ic('x')}</button></div>
  <div class="central-grid">${LIST.map(([h,i,t,d,tag])=>`<a class="central-card" href="${h.startsWith('#')?h:h==='app:back'?'../demo-offline.html':'#'}" ${h.startsWith('soon:')?`data-soon="${h.slice(5)}"`:''}>${ic(i)}<b>${t}${tag?` <span class="chip gold">${tag}</span>`:''}</b><span>${d}</span></a>`).join('')}</div></section>`;
 document.body.appendChild(m);m.querySelector('[data-cx]').focus();
 m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-cx]')){m.remove();return}const a=e.target.closest('.central-card');if(!a)return;if(a.dataset.soon){e.preventDefault();toast(a.dataset.soon+' não está neste protótipo.',$('#app'));return}m.remove()})};
function closeCentral(){const c=$('#central');if(c){c.remove();return true}return false}

/* ============ Mestragem ============ */
function syncMode(){const st=RV.state;$$('#mode-seg button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===st.mode)));const t=$('#mode-text');if(t)t.textContent=st.mode==='combat'?'Movimento pela iniciativa. Testes sempre livres.':'Movimento livre e iniciativa pausada. Testes sempre livres.';const r=$('#round-chip');if(r)r.textContent=st.mode==='combat'?`Rodada ${st.init.round}`:'Interlúdio';const sn=$('#mest-scene');if(sn)sn.textContent=st.scene.name}
on(e=>{if(e==='state')syncMode()});

/* ============ Bestiário (dados reais do catálogo) ============ */
const B={sys:'ordem',el:'all',q:'',open:null};
function freeCell(sc,size){const occ=Cena.blockedCells(sc);RV.state.tokens.forEach(t=>{for(let j=t.y;j<t.y+t.size;j++)for(let i=t.x;i<t.x+t.size;i++)occ.add(i+','+j)});
 const cand=Object.keys(sc.terrain).map(k=>k.split(',').map(Number)).sort((a,b)=>Math.hypot(a[0]-19,a[1]-8)-Math.hypot(b[0]-19,b[1]-8));
 for(const[x,y]of cand){let ok=true;for(let j=y;j<y+size&&ok;j++)for(let i=x;i<x+size&&ok;i++)if(!sc.terrain[i+','+j]||occ.has(i+','+j))ok=false;if(ok)return[x,y]}return[1,1]}
function renderBestiary(){const list=Object.values(RV.CREATURES).filter(c=>c.sys===B.sys&&(B.el==='all'||c.element===B.el)&&(!B.q||c.name.toLowerCase().includes(B.q.toLowerCase())));
 $$('#best-sys button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sys===B.sys)));$('#best-els').hidden=B.sys!=='ordem';$$('#best-els button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.el===B.el)));
 $('#best-count').textContent=`${list.length} criatura${list.length===1?'':'s'}`;
 $('#best-grid').innerHTML=list.map(c=>{const col=RV.ELEMENT[c.element]||'#c7a87b';return `<button type="button" class="beast" data-beast="${esc(c.name)}" style="--el:${col}" aria-pressed="${B.open===c.name}"><span class="beast-disc">${esc(RV.initials(c.name))}</span><span class="beast-body"><b>${esc(c.name)}</b><span class="row" style="gap:5px">${c.element?`<span class="chip" style="color:${col};border-color:${col}55">${c.element}</span>`:`<span class="chip">${esc(c.type||'')}</span>`}<span class="chip">${RV.SIZE_LABEL[c.size]||'Médio'}</span>${c.vd?`<span class="chip">VD ${esc(c.vd)}</span>`:''}</span><span class="beast-stats num"><span>PV <b>${c.hp}</b></span><span>Def <b>${c.defense}</b></span><span>Atq <b>${esc(c.attack)}</b></span></span></span></button>`}).join('')||'<p class="muted">Nenhuma criatura encontrada.</p>';
 const d=$('#best-detail'),c=RV.CREATURES[B.open];d.hidden=!c;$('[data-view="bestiario"]').classList.toggle('with-detail',!!c);if(!c)return;const col=RV.ELEMENT[c.element]||'#c7a87b';
 d.innerHTML=`${RV.fh(c.system,c.name,'beast')}<div class="beast-hero" style="--el:${col}"><span class="beast-disc lg">${esc(RV.initials(c.name))}</span><div class="row" style="gap:6px">${c.element?`<span class="chip" style="color:${col};border-color:${col}55">${c.element}</span>`:''}<span class="chip">${RV.SIZE_LABEL[c.size]||'Médio'} · ${RV.sizeCells(c.size)}×${RV.sizeCells(c.size)} casas</span>${c.vd?`<span class="chip">VD ${esc(c.vd)}</span>`:''}</div></div>
  <div class="kv"><span>Pontos de vida</span><b class="num">${c.hp}</b><span>Defesa</span><b class="num">${c.defense}</b><span>Ataque</span><b>${esc(c.attack)}</b><span>Dano</span><b>${esc(c.damage)}</b>${c.speed?`<span>Deslocamento</span><b>${esc(String(c.speed).replace('M',' m'))}</b>`:''}${c.initiative?`<span>Iniciativa</span><b>${esc(c.initiative)}</b>`:''}</div>
  <p class="small muted" style="margin:0">${esc(c.source)}. ${c.sys==='ordem'?esc(RV.NOTE):'Confira ações e características especiais no SRD.'}</p>
  <div class="row"><button class="btn primary" type="button" id="best-add">${ic('plus')}Adicionar à mesa</button><a class="btn" href="#mesa">${ic('map')}Abrir a mesa</a></div><p class="small faint" style="margin:0">Entra na mesa oculta dos jogadores. Revele pelo menu do token.</p>`;
 $('#best-add').onclick=()=>{const sc=RV.state.scene,t=RV.mkCreature(c.name,0,0);const[x,y]=freeCell(sc,t.size);t.x=x;t.y=y;t.hidden=true;RV.state.tokens.push(t);RV.state.log.unshift({who:'Mestre',text:`${c.name} entrou no mapa (oculta)`});emit('state');toast(`${c.name} está na mesa, oculta dos jogadores.`,$('#app'))}}
function bindBestiary(){$('#best-sys').onclick=e=>{const b=e.target.closest('[data-sys]');if(b){B.sys=b.dataset.sys;B.el='all';B.open=null;renderBestiary()}};$('#best-els').onclick=e=>{const b=e.target.closest('[data-el]');if(b){B.el=b.dataset.el;renderBestiary()}};
 $('#best-q').oninput=e=>{B.q=e.target.value;renderBestiary()};$('#best-grid').onclick=e=>{const b=e.target.closest('[data-beast]');if(b){B.open=b.dataset.beast;renderBestiary()}};
 $('#best-detail').addEventListener('click',e=>{if(e.target.closest('[data-close="beast"]')){B.open=null;renderBestiary()}})}

/* ============ Entrar: pelo app (fichas do aparelho) ou pelo navegador ============ */
const LOCAL=[{id:'aurora',name:'Aurora',sys:'Ordem Paranormal',detail:'Combatente · NEX 35%',ok:true,c:'#c7a87b'},{id:'kael',name:'Kael',sys:'D&D 5e',detail:'Guerreiro · nível 3',ok:false,c:'#6db7e0'},{id:'helio',name:'Dr. Hélio Prado',sys:'Chamado de Cthulhu 7e',detail:'Médico',ok:false,c:'#86bd9c'}];
const J={mode:'app',sheet:null};
function renderJoin(){$$('#join-mode button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.jm===J.mode)));$('#join-app').hidden=J.mode!=='app';$('#join-web').hidden=J.mode!=='web';
 $('#join-sheets').innerHTML=LOCAL.map(s=>`<label class="sheet-pick ${s.ok?'':'off'}"><input type="radio" name="join-local" value="${s.id}" ${J.sheet===s.id?'checked':''} ${s.ok?'':'disabled'}><span class="sheet-av" style="background:${s.c}">${esc(s.name[0])}</span><span class="grow"><b>${esc(s.name)}</b><small class="muted">${esc(s.sys)} · ${esc(s.detail)}</small>${s.ok?'':'<small class="warn-t">Outro sistema: esta campanha usa Ordem Paranormal</small>'}</span></label>`).join('')+
  `<label class="sheet-pick"><input type="radio" name="join-local" value="" ${J.sheet===''?'checked':''}><span class="sheet-av empty">${ic('user')}</span><span class="grow"><b>Entrar sem ficha</b><small class="muted">O mestre atribui uma ficha da campanha</small></span></label>`;
 $('#join-btn').innerHTML=(J.sheet?'Entrar e enviar a ficha':'Entrar na mesa')+ic('arrow-right')}
function joinFlow(btn,statusEl){const st=$(statusEl);emit('join:done');btn.disabled=true;
 const steps=J.mode==='app'&&J.sheet?[['Conectando à mesa…',''],['Ficha enviada ao mestre. Aguardando aprovação…',''],['Ficha aprovada. Abrindo a mesa…','on']]:[['Conectando à mesa…',''],['Conectado. Abrindo a mesa…','on']];
 steps.forEach(([t,c],i)=>setTimeout(()=>{st.innerHTML=`<span class="dot ${c}"></span><span>${t}</span>`;if(i===steps.length-1)setTimeout(()=>{btn.disabled=false;location.hash='#jogador'},500)},i*600))}
function bindJoin(){$('#join-mode').onclick=e=>{const b=e.target.closest('[data-jm]');if(b){J.mode=b.dataset.jm;renderJoin()}};
 $('#join-sheets').onchange=e=>{J.sheet=e.target.value;renderJoin();emit('join:sheet')};
 $('#join-test').onclick=()=>{const st=$('#join-status'),v=$('#join-addr').value.trim();if(!/^[\w.-]+(:\d{2,5})?$/.test(v)){st.innerHTML='<span class="dot bad-dot"></span><span>Endereço inválido. Use o formato 192.168.0.12:8765.</span>';return}st.innerHTML='<span class="dot"></span><span>Procurando a mesa…</span>';setTimeout(()=>{st.innerHTML='<span class="dot on"></span><span><b>Crônicas do Vale Cinzento</b> · Ordem Paranormal · mestre online (simulado)</span>'},700)};
 $('#join-app').addEventListener('submit',e=>{e.preventDefault();if(!$('#join-nick').value.trim()){$('#join-status').innerHTML='<span class="dot bad-dot"></span><span>Digite seu nome na mesa.</span>';$('#join-nick').focus();return}if(J.sheet===null){$('#join-status').innerHTML='<span class="dot bad-dot"></span><span>Escolha uma ficha ou "Entrar sem ficha".</span>';return}joinFlow($('#join-btn'),'#join-status')});
 $('#join-web').addEventListener('submit',e=>{e.preventDefault();if(!$('#web-nick').value.trim()){$('#web-status').innerHTML='<span class="dot bad-dot"></span><span>Digite seu nome na mesa.</span>';return}joinFlow($('#web-btn'),'#web-status')});
 $('#join-resume').onclick=()=>{emit('join:done');location.hash='#jogador'}}

/* ============ Tutorial guiado ============ */
const TUT={
 master:[
  {view:'mesa',target:'.tools',mobileTarget:'[data-tool="measure"]',title:'Ferramentas do mapa',body:'Cada ferramenta muda o que o clique ou o toque faz no mapa. Passe o cursor num ícone para ver o nome e o atalho.',try:'Escolha a ferramenta Medir, ou aperte M.',done:'tool:measure'},
  {view:'mesa',target:'[data-tool="add"]',title:'Adicionar ao mapa',body:'Abre as fichas da campanha e as 51 criaturas do bestiário. Feche no ✕ ou em Concluir.',try:'Abra Adicionar e arraste uma criatura para o mapa.',done:'token:added'},
  {view:'mesa',target:'.tok[data-id="aurora"]',title:'Mover tokens',body:'As casas douradas mostram até onde o token vai nesta rodada, contando paredes e portas.',try:'Arraste a Aurora para uma casa dourada.',done:'token:moved',prep:t=>{t.close('drawer');t.pickTool('move');t.select('aurora')}},
  {view:'mesa',target:'[data-tool="measure"]',title:'Medir distância',body:'Mostra a distância em casas e em metros, na escala da cena.',try:'Escolha Medir e arraste de um ponto a outro.',done:'measure:done'},
  {view:'mesa',target:'[data-tool="fog"]',title:'Névoa',body:'Esconde áreas dos jogadores. Você continua vendo o que há embaixo, em hachura lilás.',try:'Escolha Névoa e pinte algumas casas.',done:'fog:painted'},
  {view:'mesa',target:'[data-tool="doors"]',title:'Portas',body:'Portas, janelas e grades vêm do Estúdio. Aqui você abre e fecha durante a sessão.',try:'Escolha Portas e toque na porta da capela, no alto do corredor.',done:'door:toggled'},
  {view:'mesa',target:'.dice',title:'Dados',body:'As rolagens são calculadas pelo servidor. Você escolhe se todos veem ou só você.',try:'Abra os Dados e role um d20.',done:'dice:rolled'},
  {view:'mesa',target:'.panel',title:'Iniciativa',body:'A ordem da rodada. No Combate, só o token da vez anda.',try:'Toque em Próximo para passar a vez.',done:'initiative:next',prep:t=>{t.closePops();t.panelTab='init';$('.panel',t.root).hidden=false;t.renderPanel()}},
  {view:'mesa',target:'.invite-btn',title:'Convite',body:'Pelo app, o jogador digita o endereço e escolhe uma ficha salva no celular. Pelo navegador, usa o link.',try:'Abra Convidar e copie um dos endereços.',done:'invite:copied'},
  {view:'mesa',target:'.room-btn',title:'Modo da sessão',body:'No Interlúdio o movimento fica livre e a iniciativa pausa. Os testes continuam liberados.',try:'Abra o menu da sala e escolha Interlúdio.',done:'mode:interlude'},
  {view:'mesa',target:'.room-back',title:'Voltar à Mestragem',body:'Mesa ao vivo e Cenários ficam dentro da Mestragem. Este botão leva de volta a ela.',try:'Toque em voltar.',done:'route:mestragem'}],
 player:[
  {view:'entrar',target:'#join-sheets',title:'Suas fichas',body:'Pelo app, aparecem as fichas salvas neste celular. A do mesmo sistema da campanha pode ir para o mestre aprovar.',try:'Escolha a Aurora.',done:'join:sheet',prep:()=>{J.mode='app';renderJoin()}},
  {view:'entrar',target:'#join-btn',title:'Entrar na mesa',body:'O mestre recebe uma cópia. A ficha original continua no seu celular.',try:'Toque em Entrar e enviar a ficha.',done:'join:done'},
  {view:'jogador',target:'.stage',title:'Esta é a mesa',body:'Você vê só o que o mestre revelou. As áreas escuras estão ocultas e não dá para entrar nelas.',try:null,pad:-60},
  {view:'jogador',target:'.tok[data-id="aurora"]',title:'Seu token',body:'Na sua vez, arraste a Aurora. As casas douradas mostram quanto você ainda pode andar.',try:'Arraste a Aurora para uma casa dourada.',done:'token:moved',prep:t=>{t.pickTool('move');const st=RV.state;if(st.init.entries[st.init.idx]?.id!=='aurora'){st.init.idx=Math.max(0,st.init.entries.findIndex(e=>e.id==='aurora'));st.mode='combat';emit('state')}}},
  {view:'jogador',target:'.hud-dice',title:'Dados',body:'Sua rolagem aparece para toda a mesa, com cada dado.',try:'Abra os Dados e role.',done:'dice:rolled'},
  {view:'jogador',target:'.hud-sheet',title:'Sua ficha',body:'A ficha abre por cima do mapa, sem sair da cena. O ✕ fecha.',try:'Abra a ficha.',done:'sheet:opened',prep:t=>t.closePops()},
  {view:'jogador',target:'[data-sheet-tab="powers"]',title:'Poderes e Transcender',body:'Você escolhe o poder e pede ao mestre. Ele só vale na mesa depois da aprovação.',try:'Abra a aba Poderes e Transcender.',done:'powers:opened'}],
 studio:[
  {view:'estudio',target:'.st-lib',title:'Biblioteca de peças',body:'66 objetos em 7 categorias, 22 terrenos, 6 modelos prontos e suas próprias imagens.',try:'Abra a aba Terrenos.',done:'studio:library',prep:s=>{$('.st-lib',s.root).hidden=false;s.renderLib()}},
  {view:'estudio',target:'[data-stool="terrain"]',title:'Pintar terreno',body:'Escolha o piso e pinte. Água, pântano, mato e areia contam como terreno difícil na mesa.',try:'Escolha um piso e pinte algumas casas.',done:'studio:terrain'},
  {view:'estudio',target:'[data-stool="room"]',title:'Sala',body:'Desenha o piso e as paredes de uma vez. Piso e material ficam em Propriedades.',try:'Com Sala, arraste um retângulo no mapa.',done:'studio:room'},
  {view:'estudio',target:'[data-stool="door"]',title:'Portas e janelas',body:'Porta, porta dupla, secreta, janela ou grade. Na mesa, você abre e fecha.',try:'Com Porta, toque na parede de uma sala.',done:'studio:door'},
  {view:'estudio',target:'.st-lib',title:'Objetos',body:'Mobília, natureza, peças paranormais, moderno, luzes e efeitos.',try:'Arraste um objeto para o mapa, ou escolha e toque no mapa.',done:'studio:stamp',prep:s=>{s.libTab='objetos';$('.st-lib',s.root).hidden=false;s.renderLib()}},
  {view:'estudio',target:'.st-panel',title:'Propriedades',body:'Posição, tamanho, rotação, opacidade, tom, camada, luz e se os jogadores veem a peça.',try:'Mude algo da peça: gire, troque o tom ou ligue a luz.',done:'studio:prop',prep:s=>{$('.st-panel',s.root).hidden=false;s.panelTab='props';s.renderPanel()}},
  {view:'estudio',target:'.st-publish',title:'Publicar na mesa',body:'Até publicar, nada muda para os jogadores. Salvar rascunho guarda sem publicar.',try:'Toque em Publicar na mesa.',done:'studio:publish'}]};
const Tut=RV.Tut={flow:null,i:0,el:null,spot:null,
 start(flow){this.stop();this.flow=flow;this.i=0;if(flow!=='studio'){RV.state=RV.freshState();emit('state')}
  this.spot=document.createElement('div');this.spot.className='tut-spot';this.el=document.createElement('section');this.el.className='tut-card';this.el.setAttribute('role','dialog');this.el.setAttribute('aria-live','polite');this.el.setAttribute('aria-label','Tutorial');document.body.append(this.spot,this.el);this.show()},
 step(){return this.flow?TUT[this.flow][this.i]:null},
 ctx(view){return view==='mesa'?views.master:view==='jogador'?views.player:view==='estudio'?views.studio:null},
 show(){const s=this.step();if(!s){this.finish();return}if(location.hash.slice(1)!==s.view){location.hash='#'+s.view;return}
  const t=this.ctx(s.view);if(s.prep)s.prep(t);const n=TUT[this.flow].length;
  this.el.innerHTML=`<div class="tut-steps" aria-hidden="true">${TUT[this.flow].map((_,k)=>`<i class="${k<=this.i?'on':''}"></i>`).join('')}</div>
   <div class="row between"><span class="kicker">Tutorial · ${this.i+1} de ${n}</span><button class="btn sm ghost" type="button" data-t="skip-all">Pular tutorial</button></div>
   <span class="chip gold" style="align-self:flex-start">${ic('shield')}Campanha de treino · não altera suas campanhas</span>
   <h3>${esc(s.title)}</h3><p class="muted">${esc(s.body)}</p>
   ${s.try?`<div class="tut-try" id="tut-try">${ic('hand-move')}<span><b>Experimente:</b> ${esc(s.try)}</span></div>`:''}
   <div class="row between"><button class="btn sm ghost" type="button" data-t="back" ${this.i?'':'disabled'}>Voltar</button>${s.try?'<button class="btn sm" type="button" data-t="next">Pular etapa</button>':'<button class="btn sm primary" type="button" data-t="next">Entendi</button>'}</div>`;
  this.el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const a=b.dataset.t;if(a==='skip-all')this.finish(true);else if(a==='back'){this.i=Math.max(0,this.i-1);this.show()}else{this.i++;this.show()}});
  requestAnimationFrame(()=>this.place())},
 place(){const s=this.step();if(!s||!this.el)return;const sel=(innerWidth<640&&s.mobileTarget)||s.target;const tg=document.querySelector(`[data-view="${s.view}"] ${sel}`);
  if(!tg||!tg.getClientRects().length){this.spot.style.opacity=0;this.el.style.left='50%';this.el.style.top='50%';this.el.style.transform='translate(-50%,-50%)';return}
  const r=tg.getBoundingClientRect(),pad=s.pad??6,vw=innerWidth,vh=innerHeight;this.spot.style.opacity=1;const sr={l:Math.max(4,r.left-pad),t:Math.max(4,r.top-pad),w:Math.min(vw-8,r.width+pad*2),h:Math.min(vh-8,r.height+pad*2)};
  Object.assign(this.spot.style,{left:sr.l+'px',top:sr.t+'px',width:sr.w+'px',height:sr.h+'px'});const cw=this.el.offsetWidth,ch=this.el.offsetHeight;let x,y;this.el.style.transform='none';
  if(vw<640){x=(vw-cw)/2;y=r.top+r.height/2>vh/2?Math.max(8,sr.t-ch-12):Math.min(vh-ch-8,sr.t+sr.h+12)}
  else if(sr.l+sr.w+cw+16<vw){x=sr.l+sr.w+14;y=clamp(r.top+r.height/2-ch/2,52,vh-ch-12)}else if(sr.l-cw-16>0){x=sr.l-cw-14;y=clamp(r.top+r.height/2-ch/2,52,vh-ch-12)}
  else{x=clamp(r.left+r.width/2-cw/2,12,vw-cw-12);y=sr.t+sr.h+ch+14<vh?sr.t+sr.h+12:Math.max(52,sr.t-ch-12)}if(s.pad<0){x=clamp(vw/2-cw/2,12,vw-cw-12);y=clamp(vh/2-ch/2,60,vh-ch-12)}
  this.el.style.left=x+'px';this.el.style.top=y+'px'},
 event(e){const s=this.step();if(!s||s.done!==e)return;const tr=$('#tut-try');if(tr){tr.classList.add('done');tr.innerHTML=ic('check')+'<span><b>Feito!</b> Indo para a próxima etapa…</span>'}const at=this.i;setTimeout(()=>{if(this.i===at&&this.flow){this.i++;this.show()}},900)},
 onRoute(v){if(!this.flow){maybeWelcome(v);return}const s=this.step();if(s&&s.view===v)setTimeout(()=>this.show(),80)},
 finish(skipped){const f=this.flow;if(f)store.set('mm-rv-tut-'+f,skipped?'skipped':'done');this.stop();if(f&&!skipped)toast('Tutorial concluído. Você pode refazer em Personalização.')},
 stop(){[this.spot,this.el].forEach(x=>x?.remove());this.flow=null;this.spot=this.el=null}};
on(e=>{Tut.event(e);if(e==='state'&&Tut.flow)requestAnimationFrame(()=>Tut.place())});
window.addEventListener('resize',()=>Tut.place());
function maybeWelcome(v){const flow={mesa:'master',entrar:'player',estudio:'studio'}[v];if(!flow||store.get('mm-rv-tut-'+flow)||$('.modal-back'))return;
 const copy={master:['Primeira vez na mesa','São 11 etapas curtas. Cada uma mostra um botão e pede para você testar.'],player:['Primeira vez como jogador','São 7 etapas: escolher a ficha, entrar, andar, rolar e abrir a ficha.'],studio:['Primeira vez no Estúdio','São 7 etapas: biblioteca, terreno, sala, porta, objeto, propriedades e publicar.']}[flow];
 const b=document.createElement('div');b.className='modal-back';b.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="wl-h"><div class="fh" style="padding:0"><span class="kicker">${copy[0]}</span><button class="x-btn" type="button" data-w="skip" aria-label="Fechar">${ic('x')}</button></div><h2 id="wl-h">Quer um tour <em>rápido?</em></h2><p class="muted" style="margin:0">${copy[1]} Tudo acontece numa campanha de treino. Você pode pular a qualquer momento.</p><div class="row" style="justify-content:flex-end"><button class="btn ghost" type="button" data-w="skip">Pular</button><button class="btn primary" type="button" data-w="go">Fazer o tutorial</button></div></div>`;
 document.body.appendChild(b);b.querySelector('[data-w="go"]').focus();b.addEventListener('click',e=>{const w=e.target.closest('[data-w]')?.dataset.w;if(!w)return;b.remove();if(w==='go')Tut.start(flow);else store.set('mm-rv-tut-'+flow,'skipped')})}

/* ============ Rotas ============ */
const VIEWS=['inicio','mestragem','mesa','estudio','entrar','jogador','biblioteca','bestiario','ficha','ajustes'],PAGES=['inicio','mestragem','biblioteca','bestiario','ficha','ajustes'];
const TITLES={inicio:'Visão geral',mestragem:'Mestragem',biblioteca:'Biblioteca',bestiario:'Bestiário',ficha:'Personagens',ajustes:'Personalização'};
function route(ev){const h=location.hash.slice(1),v=VIEWS.includes(h)?h:'inicio';if(ev?.oldURL){const o=new URL(ev.oldURL).hash;if(o&&o!=='#'+v)prevHash=o}
 closeCentral();$('#pages').hidden=!PAGES.includes(v);$$('[data-view]').forEach(s=>s.hidden=s.dataset.view!==v);
 $$('#proto a').forEach(a=>{if(a.getAttribute('href')==='#'+v)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 if(TITLES[v])$('#crumb-title').textContent=TITLES[v];
 if(v==='mesa'){views.master=views.master||new RV.Table($('#vtt-master'),'master');requestAnimationFrame(()=>{views.master.fit(false);views.master.render()})}
 if(v==='jogador'){views.player=views.player||new RV.Table($('#vtt-player'),'player');requestAnimationFrame(()=>{views.player.fit(false);views.player.render()})}
 if(v==='estudio'){views.studio=views.studio||new RV.Studio($('#studio'));views.studio.open(prevHash)}
 if(v==='entrar'&&!route.join){route.join=1;const sc=Cena.template('taverna',24,16);Cena.render($('#join-map'),sc,{dpr:1,gridAlpha:.08})}
 if(v==='mestragem'&&!route.mini){route.mini=1;const c=document.createElement('canvas');Cena.render(c,RV.state.scene,{dpr:.6,gridAlpha:.1});const mm=$('#mini-map');mm.getContext('2d').drawImage(c,0,0,mm.width,mm.height);
  $$('[data-thumb]').forEach(cv=>{const sc=+cv.dataset.thumb===0?RV.state.scene:Cena.template(['','caverna','rua'][+cv.dataset.thumb],24,16),t=document.createElement('canvas');Cena.render(t,sc,{dpr:.3,gridAlpha:.06});cv.getContext('2d').drawImage(t,0,0,cv.width,cv.height)})}
 if(v==='bestiario')renderBestiary();if(v==='entrar')renderJoin();syncMode();$('#page-wrap').scrollTop=0;emit('route:'+v);Tut.onRoute(v)}
window.addEventListener('hashchange',route);

/* ============ Preferências e tema ============ */
const currentTheme=()=>RV.Prefs.state.theme;const setTheme=t=>RV.Prefs.set('theme',t);

/* ============ Ligações ============ */
document.addEventListener('click',e=>{const s=e.target.closest('[data-soon]');if(s&&!s.closest('#central')){e.preventDefault();toast((s.dataset.soon||'Esta parte')+' não está neste protótipo.',$('#app'))}
 if(e.target.closest('.central-open,#central-fab')){emit('central:opened');RV.openCentral()}
 const ci=e.target.closest('[data-copy]');if(ci)copyText(ci.dataset.copy).then(ok=>toast(ok?'Copiado.':'Selecione e copie: '+ci.dataset.copy,$('#app')));
 if(e.target.closest('.theme-toggle,#proto-theme'))setTheme(currentTheme()==='light'?'dark':'light')});
$('#mode-seg').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;RV.state.mode=b.dataset.mode;emit('state')});
$('#grid-alpha').addEventListener('input',e=>{RV.prefs.gridAlpha=e.target.value/100;emit('state')});
$('#names-seg').addEventListener('click',e=>{const b=e.target.closest('[data-n]');if(!b)return;RV.prefs.showNames=b.dataset.n==='1';$$('#names-seg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));emit('state')});
$('#redo-master').onclick=()=>{store.del('mm-rv-tut-master');Tut.start('master')};$('#redo-player').onclick=()=>{store.del('mm-rv-tut-player');Tut.start('player')};$('#redo-studio').onclick=()=>{store.del('mm-rv-tut-studio');Tut.start('studio')};
$('#proto-tut').onclick=()=>{const v=location.hash.slice(1);Tut.start(v==='jogador'||v==='entrar'?'player':v==='estudio'?'studio':'master')};
bindBestiary();bindJoin();
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(closeCentral())return;const mb=$('.modal-back');if(mb){mb.remove();return}const v=location.hash.slice(1),t=v==='mesa'?views.master:v==='jogador'?views.player:v==='estudio'?views.studio:null;if(t&&t.escape())return;if(v==='bestiario'&&B.open){B.open=null;renderBestiary();return}if(Tut.flow)Tut.finish(true);return}
 if(e.target.closest('input,textarea,select')||$('.modal-back'))return;if(e.code==='Space'&&e.target.closest('button,a'))return;
 const v=location.hash.slice(1);if(e.key.toLowerCase()==='c'&&!e.ctrlKey&&!e.metaKey&&v!=='estudio'){emit('central:opened');RV.openCentral();return}
 if(v==='estudio'&&views.studio){if(e.code==='Space'){views.studio.space=true;views.studio.stage.classList.add('panning');e.preventDefault();return}views.studio.key(e);return}
 const t=v==='mesa'?views.master:v==='jogador'?views.player:null;if(!t)return;
 if(e.code==='Space'){t.space=true;t.stage.classList.add('panning');e.preventDefault();return}
 const k=e.key.toLowerCase(),map={v:'move',m:'measure',d:'draw',f:'fog',o:'doors',p:'pin',l:'light',i:'inspect',a:'add'};
 if(map[k]&&$(`[data-tool="${map[k]}"]`,t.root)){t.pickTool(map[k]);return}
 if(k==='0')t.fit();if(k==='+'||k==='=')t.zoomAt(1.2,innerWidth/2,innerHeight/2);if(k==='-')t.zoomAt(1/1.2,innerWidth/2,innerHeight/2);
 if(k==='r')t.rollAndShow('1d20',t.role==='master'?'Mestre':'Ana',null);if(k==='n'&&t.role==='master')t.act('init-next');
 if((k==='delete'||k==='backspace')&&t.role==='master'&&t.sel)t.act('remove');if(k==='z'&&(e.ctrlKey||e.metaKey)&&t.role==='master')t.pickTool('undo')});
document.addEventListener('keyup',e=>{if(e.code==='Space')Object.values(views).forEach(t=>{t.space=false;t.stage?.classList.remove('panning')})});

/* ============ Início ============ */
RV.inApp=!!(window.RpgBookBridge||window.MastermindDesktop||window.RpgCampaignBridge);
if(RV.inApp){$('#proto').hidden=true;$$('.in-app-only').forEach(e=>e.hidden=false)}
RV.Prefs.apply();RV.Prefs.ambient();RV.Prefs.bind();RV.Books.bind();
on(e=>{if(e==='prefs:changed')$$('.theme-toggle').forEach(b=>{b.innerHTML=ic(currentTheme()==='light'?'moon':'sun')})});$$('.theme-toggle').forEach(b=>{b.innerHTML=ic(currentTheme()==='light'?'moon':'sun')});
RV.hydrateIcons();route();
window.__revamp={S:()=>RV.state,views,Tut,store};
})();
