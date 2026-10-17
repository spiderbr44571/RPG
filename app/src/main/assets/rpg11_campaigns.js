(()=>{
'use strict';
const app=window.RPG_DEMO,op=window.OP13,master=document.querySelector('#screen-master');if(!app||!op||!master)return;
const q=(s,r=document)=>r.querySelector(s),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let base='',secret='',campaignId='',latest=null,editing=null;
const toolbar=document.createElement('section');toolbar.id='r13-editor';toolbar.hidden=true;
toolbar.innerHTML='<div class="r13-head"><div><small>EDIÇÃO REMOTA · MESTRAGEM</small><h3 id="r13-title">Ficha do jogador</h3><p>Edite os campos normais da ficha. Salve para sincronizar com o jogador.</p></div><button data-r13="save" class="btn-primary">Salvar na campanha</button><button data-r13="cancel">Voltar</button></div><div class="r13-limits">'+['PV','PE','SAN'].map(k=>'<label>Máximo de '+k+'<input type="number" id="r13-max-'+k+'" min="0" max="999999"></label>').join('')+'</div><p id="r13-feedback" role="status"></p>';
const sheetScreen=document.querySelector('#screen-sheet');sheetScreen?.insertBefore(toolbar,sheetScreen.firstChild);
const editorCss=document.createElement('style');editorCss.textContent='#r13-editor{border:2px solid var(--accent);border-radius:14px;background:var(--panel);padding:15px;margin:14px 0 24px;box-shadow:0 0 28px var(--accent-soft)}#r13-editor .r13-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}#r13-editor .r13-head>div{flex:1;min-width:155px}#r13-editor .r13-head h3{font:500 25px Georgia,serif;margin:4px 0}#r13-editor small,#r13-editor p{font-size:11px;color:var(--muted)}#r13-editor .r13-limits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0}#r13-editor label{font-size:10px;color:var(--muted)}#r13-editor input{width:100%;margin-top:4px;color:var(--fg);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:9px}';document.head.append(editorCss);

const block=document.createElement('section');block.id='r11-campaigns';block.innerHTML='<div class="r11-head"><div><small>MESTRAGEM · CAMPANHAS</small><h2>Campanhas na rede</h2><p>Crie sua campanha, convide jogadores por link e controle fichas, rodadas, cenas, efeitos e o canvas. Sem PC: hospede neste celular ou conecte-se a outro anfitrião.</p></div><b id="r11-campaign-status">Desconectado</b></div><div class="r11-fields"><label>Endereço do servidor<input id="r11-server" value="http://192.168.1.10:8765/"></label><label>Chave do mestre<input id="r11-secret" type="password" autocomplete="off" placeholder="Chave do celular anfitrião"></label><button class="btn-primary" data-r11="connect">Conectar</button></div><div id="r11-admin" hidden><div class="r11-fields"><label>Nome da campanha<input id="r11-name" maxlength="90" placeholder="Ex.: Arquivos Perdidos"></label><button data-r11="new" class="btn-primary">Criar campanha</button></div><div id="r11-list"></div><div id="r11-detail"></div></div><p id="r11-feedback" role="status"></p>';master.insertBefore(block,master.querySelector('.page-row')?.nextSibling||master.firstChild);

const localTools=document.createElement('div');localTools.id='r12-host-controls';
localTools.innerHTML='<div class="r12-host-head"><div><strong>Servidor neste celular</strong><small>Seu telefone pode hospedar uma campanha sem computador.</small></div><b id="r12-host-state">Verificando…</b></div><div class="r11-tools"><button data-r12="start" class="btn-primary">Iniciar servidor</button><button data-r12="stop">Desligar</button><button data-r12="connect">Conectar como mestre</button><button data-r12="panel">Painel completo</button></div><div id="r12-host-info"></div><small>O anfitrião deve permanecer conectado ao Wi-Fi ou hotspot. Não encaminhe a porta na internet. Se um jogador hospedar, ele terá acesso físico aos dados e à chave local.</small>';
block.insertBefore(localTools,block.querySelector('.r11-fields'));
function hostState(){
 const api=window.RpgLocalHost;
 if(!api){q('#r12-host-state').textContent='Somente APK Android';localTools.querySelector('[data-r12="start"]').disabled=true;return}
 let s;try{s=JSON.parse(api.status())}catch{return}
 q('#r12-host-state').textContent=s.running?'● Ativo':s.starting?'Inicializando…':s.error?'Falha':'Desligado';
 localTools.querySelector('[data-r12="start"]').disabled=!!(s.running||s.starting);
 localTools.querySelector('[data-r12="stop"]').disabled=!s.running;
 localTools.querySelector('[data-r12="connect"]').disabled=!s.running;
 localTools.querySelector('[data-r12="panel"]').disabled=!s.running;
 const box=q('#r12-host-info');
 if(s.running){
  box.textContent=(s.ip==='127.0.0.1'?'Conecte o celular ao Wi-Fi para disponibilizar o convite. ':'')+'http://'+s.ip+':'+s.port+' · '+(s.campaigns?.length||0)+' campanha(s) guardada(s) neste aparelho.';
 }else{box.textContent=s.error||'Inicie para criar e compartilhar campanhas sem PC.'}
}
localTools.addEventListener('click',async event=>{
 const b=event.target.closest('[data-r12]');if(!b||!window.RpgLocalHost)return;
 const a=b.dataset.r12;
 try{
 if(a==='start'){window.RpgLocalHost.start();feedback('Iniciando servidor no Android…');setTimeout(hostState,900);setTimeout(hostState,2200)}
 if(a==='stop'){if(!confirm('Desligar servidor? Jogadores perderão a conexão até você ligá-lo novamente.'))return;window.RpgLocalHost.stop();feedback('Desligando servidor…');setTimeout(hostState,800)}
 if(a==='panel')window.RpgLocalHost.openLocalMaster();
 if(a==='connect'){
  const state=JSON.parse(window.RpgLocalHost.status());if(!state.running)throw Error('Inicie o servidor primeiro');
  q('#r11-server').value='http://'+state.ip+':'+state.port+'/';
  q('#r11-secret').value=window.RpgLocalHost.masterKey();
  const connect=block.querySelector('[data-r11="connect"]');if(connect)connect.click();
 }
 }catch(err){feedback('Servidor: '+err.message)}
});
hostState();
setInterval(()=>{if(document.visibilityState==='visible')hostState()},4000);

const style=document.createElement('style');style.textContent='#r11-campaigns{border:1px solid var(--v10-border,var(--line));background:var(--panel);border-radius:16px;padding:18px;margin:18px 0}.r11-head{display:flex;justify-content:space-between;gap:15px;align-items:start}.r11-head h2{font:600 28px Georgia,serif;color:var(--fg);margin:5px 0}.r11-head small{color:var(--accent);letter-spacing:.1em}.r11-head p,.r11-unit small{font-size:11px;color:var(--muted)}#r11-campaign-status{white-space:nowrap;font-size:10px;color:var(--accent)}.r11-fields,.r11-tools,.r11-row{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin:12px 0}.r11-fields label{flex:1 1 170px;color:var(--muted);font-size:11px}.r11-fields input,#r11-campaigns select,#r11-campaigns textarea,.r11-link{width:100%;display:block;color:var(--fg);background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:10px;margin-top:5px}#r11-campaigns textarea{height:150px;font:11px monospace}.r11-tools button,.r11-row button,.r11-tabs button{background:var(--panel2);color:var(--fg);padding:9px;border:1px solid var(--line);border-radius:9px;cursor:pointer}.r11-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.r11-tabs button.active{border-color:var(--accent);background:var(--accent-soft)}.r11-card{border:1px solid var(--line);border-radius:10px;padding:12px;margin:9px 0}.r11-card strong{display:block}.r11-card small{display:block;color:var(--muted)}.r11-card select{max-width:260px}.r11-heading{font:500 22px Georgia,serif;margin:18px 0 6px}.r11-row input{flex:1 1 200px;width:100%}.r11-feedback{font-size:12px;color:var(--accent)}@media(max-width:650px){.r11-head{flex-direction:column}#r11-campaigns{padding:12px}}';style.textContent+='#r12-host-controls{border:1px solid var(--v10-border,var(--line));background:var(--panel2);border-radius:12px;padding:16px;margin:18px 0}#r12-host-controls .r12-host-head{display:flex;align-items:start;justify-content:space-between;gap:14px}#r12-host-controls strong{display:block;font-size:14px}#r12-host-controls small{display:block;color:var(--muted);font-size:11px;margin-top:5px}#r12-host-state{font-size:11px;color:var(--accent)}#r12-host-info{font-size:11px;color:var(--muted);overflow-wrap:anywhere;padding:7px 0}#r12-host-controls button:disabled{opacity:.4;cursor:not-allowed}';document.head.append(style);
const feedback=s=>q('#r11-feedback').textContent=s;
function addr(v){const u=new URL(v),a=u.hostname.split('.').map(Number);if(u.protocol!=='http:'||a.length!==4||a.some(x=>!Number.isInteger(x)||x<0||x>255)||!(a[0]===10||a[0]===172&&a[1]>=16&&a[1]<=31||a[0]===192&&a[1]===168)||Number(u.port)<1024)throw Error('Use IP e porta da rede local.');return u.origin}
async function api(path,method='GET',body){
if(!path.startsWith('/api/admin/campaigns'))throw Error('Rota inválida');
if(window.RpgCampaignBridge?.request){
const r=JSON.parse(window.RpgCampaignBridge.request(base,secret,method,path,body===undefined?'':JSON.stringify(body)));
if(!r.status)throw Error(r.error||'Sem conexão');const data=JSON.parse(r.body||'{}');if(r.status>=400)throw Error(data.error||'Acesso negado');return data}
if(location.origin===base){const r=await fetch(path,{method,headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error);return data}
throw Error('No navegador externo, abra o endereço do painel do mestre. A conexão direta dentro do app funciona no APK Android.');
}
const path=(suffix='')=>'/api/admin/campaigns/'+campaignId+suffix;
async function list(){
const data=await api('/api/admin/campaigns');q('#r11-list').className='r11-tabs';q('#r11-list').innerHTML=data.campaigns.map(c=>'<button data-choose="'+esc(c.id)+'" class="'+(campaignId===c.id?'active':'')+'">'+esc(c.name)+'</button>').join('');if(campaignId)await show();}
async function show(){
if(!campaignId)return;const data=await api(path());latest=data.campaign;const c=latest;
q('#r11-detail').innerHTML='<h3 class="r11-heading">'+esc(c.name)+'</h3><div class="r11-row"><input class="r11-link" id="r11-invite" readonly value="'+esc(c.invite)+'"><button data-r11="copy">Copiar convite</button><button data-r11="share">Compartilhar</button></div><p>'+esc(c.sceneName)+' · rodada '+c.turn+'</p><div class="r11-tools"><button data-r11="turn">Próxima rodada</button><button data-r11="scene">Nova cena</button><button data-r11="import">Adicionar ficha do app</button><button data-r11="savecanvas">Salvar canvas</button><button data-r11="loadcanvas">Carregar canvas</button><button data-r11="refresh">Atualizar</button></div><h3 class="r11-heading">Jogadores</h3>'+c.players.map(p=>'<div class="r11-card"><strong>'+esc(p.nickname)+'</strong><small>'+esc(p.status)+(p.hasProposal?' · Ficha enviada para aprovação':'')+'</small><div class="r11-row"><select id="r11-player-'+esc(p.id)+'"><option value="">Aguardando ficha</option>'+c.characters.map(ch=>'<option value="'+esc(ch.id)+'"'+(p.characterId===ch.id?' selected':'')+'>'+esc(ch.sheet.name)+'</option>').join('')+'</select><button data-r11="assign" data-player="'+esc(p.id)+'">Atribuir</button>'+(p.characterId?'<button data-r11="edit" data-char="'+esc(p.characterId)+'">Editar ficha</button>':'')+(p.hasProposal?'<button data-r11="review" data-player="'+esc(p.id)+'">Conferir ficha</button><button data-r11="approve" data-player="'+esc(p.id)+'">Aprovar ficha</button>':'')+'</div></div>').join('')+'<h3 class="r11-heading">Fichas e efeitos</h3>'+c.characters.map(ch=>'<div class="r11-card"><strong>'+esc(ch.sheet.name)+'</strong><div class="r11-tools"><button data-r11="edit" data-char="'+esc(ch.id)+'">Editar ficha</button><button data-r11="effect" data-char="'+esc(ch.id)+'">Aplicar efeito</button></div></div>').join('')+'<div id="r11-editor"></div>';
}

function openRemoteSheet(char){
 if(!char?.sheet)return feedback('Ficha não encontrada');
 if(editing)finishRemoteSheet(false);
 const old=JSON.parse(JSON.stringify(op.state)),oldStorage=localStorage.getItem('rpg-ordem-v13-character');
 const remote=JSON.parse(JSON.stringify(char.sheet));const mapped={...remote,resources:{...remote.resources}};
 for(const k of ['PV','PE','SAN']){const x=mapped.resources[k];mapped.resources[k]=typeof x==='object'?Number(x.current)||0:Number(x)||0}
 window.__rpgRemoteSheetEditing=true;
 if(!op.changeCharacter(mapped)){window.__rpgRemoteSheetEditing=false;return feedback('Classe ou sistema de ficha não suportado.')}
 editing={id:char.id,original:remote,old,oldStorage};
 toolbar.hidden=false;q('#r13-title').textContent=remote.name+' · ficha online';
 for(const k of ['PV','PE','SAN']){const v=remote.resources?.[k];q('#r13-max-'+k).value=typeof v==='object'?Number(v.max)||0:Number(v)||0}
 for(const sel of ['#rpg05-char-select','#rpg05-new-char','#rpg05-del-char']){const el=q(sel);if(el)el.disabled=true}
 app.navigate('sheet');toolbar.scrollIntoView({block:'start'});
}
function finishRemoteSheet(back=true){
 if(!editing)return;
 const old=editing;editing=null;window.__rpgRemoteSheetEditing=false;
 op.changeCharacter(old.old);
 if(old.oldStorage===null)localStorage.removeItem('rpg-ordem-v13-character');
 else localStorage.setItem('rpg-ordem-v13-character',old.oldStorage);
 for(const sel of ['#rpg05-char-select','#rpg05-new-char','#rpg05-del-char']){const el=q(sel);if(el)el.disabled=false}
 toolbar.hidden=true;if(back)app.navigate('master');
}
toolbar.addEventListener('click',async e=>{
 const b=e.target.closest('[data-r13]');if(!b||!editing)return;
 if(b.dataset.r13==='cancel'){finishRemoteSheet();return}
 if(b.dataset.r13!=='save')return;b.disabled=true;
 try{
  const modified=op.state,serverOriginal=editing.original;
  const result={...serverOriginal,...modified,resources:{...(serverOriginal.resources||{})}};
  for(const k of ['PV','PE','SAN']){
   const max=Number(q('#r13-max-'+k).value),current=Number(modified.resources?.[k]);
   if(!Number.isFinite(max)||max<0||max>999999||!Number.isFinite(current)||current<0)throw Error('Valor de '+k+' inválido');
   result.resources[k]={max,current:Math.min(current,max)};
  }
  await api(path('/characters/'+editing.id),'POST',{sheet:result});
  finishRemoteSheet();await show();feedback('Ficha salva no servidor e sincronizada com o jogador.');
 }catch(err){q('#r13-feedback').textContent='Erro: '+err.message}finally{b.disabled=false}
});

function selectedSheet(){let sheet=JSON.parse(JSON.stringify(op.state)),computed=op.calc();sheet.resources=sheet.resources||{};for(const k of ['PV','PE','SAN']){let max=Number(computed[k]);if(!Number.isFinite(max))continue;const v=sheet.resources[k];const cur=typeof v==='object'?Number(v.current):Number(v??max);sheet.resources[k]={current:Math.max(0,Math.min(max,Number.isFinite(cur)?cur:max)),max}}return sheet}
async function act(action,button){
try{
if(action==='connect'){base=addr(q('#r11-server').value);secret=q('#r11-secret').value.trim();await api('/api/admin/campaigns');q('#r11-admin').hidden=false;q('#r11-campaign-status').textContent='Conectado';await list();feedback('Servidor conectado.')}
else if(action==='new'){const data=await api('/api/admin/campaigns','POST',{name:q('#r11-name').value});campaignId=data.id;q('#r11-name').value='';await list();feedback('Campanha criada. Envie o convite aos jogadores.')}
else if(action==='copy'){const el=q('#r11-invite');el.select();try{await navigator.clipboard.writeText(el.value);feedback('Convite copiado')}catch{feedback('Link selecionado para copiar')}}
else if(action==='share'){const link=q('#r11-invite')?.value;if(!link)throw Error('Crie uma campanha primeiro');if(window.RpgLocalHost?.shareInvite){window.RpgLocalHost.shareInvite(link);feedback('Escolha o aplicativo para enviar o convite.')}else{q('#r11-invite').select();feedback('Link selecionado para compartilhar.')}}
else if(action==='refresh'){await show()}
else if(action==='turn'||action==='scene'){await api(path('/advance'),'POST',{kind:action});await show();feedback('Campanha atualizada.')}
else if(action==='import'){await api(path('/characters'),'POST',{sheet:selectedSheet()});await show();feedback('Ficha atual adicionada.')}
else if(action==='assign'){const id=button.dataset.player;await api(path('/assign'),'POST',{playerId:id,characterId:q('#r11-player-'+id)?.value||null});await show();feedback('Atribuição salva.')}
else if(action==='review'){const p=latest.players.find(x=>x.id===button.dataset.player);q('#r11-editor').innerHTML='<h3>Ficha enviada por '+esc(p.nickname)+'</h3><textarea id="r11-review" readonly></textarea>';q('#r11-review').value=JSON.stringify(p.proposedSheet,null,2)}
else if(action==='approve'){const p=latest.players.find(x=>x.id===button.dataset.player);if(!p?.proposedSheet||!confirm('Você conferiu a ficha que '+p.nickname+' enviou?'))return;await api(path('/approve'),'POST',{playerId:button.dataset.player});await show();feedback('Ficha aprovada.')}
else if(action==='edit'){const char=latest.characters.find(c=>c.id===button.dataset.char);openRemoteSheet(char)}
else if(action==='save'){feedback('Utilize Salvar na campanha na ficha visual.')}
else if(action==='effect'){q('#r11-editor').innerHTML='<h3>Aplicar efeito</h3><div class="r11-fields"><label>Nome<input id="r11-effname" value="Efeito temporário"></label><label>Tipo<select id="r11-effunit"><option value="turn">Rodadas</option><option value="scene">Até final da cena</option><option value="permanent">Permanente</option></select></label><label>Rodadas<input id="r11-effcount" type="number" min="1" max="999" value="2"></label><button data-r11="apply" data-char="'+esc(button.dataset.char)+'">Aplicar</button></div>'}
else if(action==='apply'){const unit=q('#r11-effunit').value;await api(path('/effects'),'POST',{characterId:button.dataset.char,name:q('#r11-effname').value,unit,remaining:unit==='turn'?Number(q('#r11-effcount').value):null});await show();feedback('Efeito enviado ao jogador.')}
else if(action==='savecanvas'){const nodes=JSON.parse(JSON.stringify(app.S.nodes||[])).map(data=>({kind:'node',data}));const creatures=JSON.parse(JSON.stringify(window.RPGv3?.monsters||[])).map(data=>({kind:'creature',data}));await api(path('/canvas'),'POST',{nodes:nodes.concat(creatures)});feedback('Canvas da campanha salvo no servidor.')}
else if(action==='loadcanvas'){if(!confirm('Substituir cartões locais pelo snapshot da campanha?'))return;app.S.nodes=(latest.canvas||[]).filter(c=>c.kind==='node').map(x=>x.data);app.renderCanvas();app.navigate('canvas');feedback('Cartões carregados; criaturas ficam salvas no snapshot.')}
}catch(e){feedback('Erro: '+e.message)}
}
block.addEventListener('click',async e=>{const b=e.target.closest('[data-r11]');if(b)await act(b.dataset.r11,b);const choose=e.target.closest('[data-choose]');if(choose){campaignId=choose.dataset.choose;await list()}});
window.RPG11Campaigns={get campaign(){return latest},refresh:show};
})();
