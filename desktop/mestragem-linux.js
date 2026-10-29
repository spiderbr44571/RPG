/* Mastermind Linux v1.0.3 — campanha local, fichas existentes e modo paisagem.
 * Exclusivo do Electron; o APK Android continua usando os controles originais.
 */
(()=>{
'use strict';
if(!window.MastermindDesktop||!window.RpgLocalHost)return;
const desktop=window.MastermindDesktop;
const $=s=>document.querySelector(s);
const LOCAL_PREFIX='local:';
const LAYOUT_KEY='mastermind-linux-landscape-v1';
const MAP_KEY='mastermind-linux-campaign-sheets-v1:';
let connecting=false;
const notice=message=>{const e=$('#r11-feedback');if(e)e.textContent=message;};
const jsonClone=x=>JSON.parse(JSON.stringify(x));
const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}};
function updateLandscape(on){
 document.documentElement.classList.toggle('mastermind-landscape',on);
 document.body.classList.toggle('mastermind-landscape',on);
 localStorage.setItem(LAYOUT_KEY,on?'true':'false');
 const toggle=$('#mastermind-linux-landscape');
 if(toggle){toggle.classList.toggle('on',on);toggle.setAttribute('aria-pressed',String(on));}
 window.dispatchEvent(new Event('resize'));
}
function mountLandscapeSetting(){
 const card=$('#screen-settings .setting-card');
 if(!card||$('#mastermind-linux-landscape'))return;
 const row=document.createElement('div');
 row.className='setting-row desktop-landscape-setting';
 const label=document.createElement('div');
 const strong=document.createElement('strong');strong.textContent='Modo paisagem em todas as telas';
 const hint=document.createElement('small');hint.textContent='Usa toda a tela do computador na horizontal, incluindo fichas, Ateliê e mestragem. Preserva os temas.';
 label.append(strong,hint);
 const toggle=document.createElement('button');
 toggle.type='button';toggle.id='mastermind-linux-landscape';toggle.className='switch';
 toggle.setAttribute('aria-label','Alternar modo paisagem no desktop');
 toggle.addEventListener('click',()=>updateLandscape(toggle.getAttribute('aria-pressed')!=='true'));
 row.append(label,toggle);card.append(row);
 updateLandscape(localStorage.getItem(LAYOUT_KEY)==='true');
}
function records(){
 const result=[],seen=new Set();
 const add=(source,id,name,sheet)=>{
  if(!id||!sheet||typeof sheet!=='object')return;
  const key=source+':'+id;
  if(seen.has(key))return;
  seen.add(key);
  result.push({key,source,name:String(name||sheet.name||'Sem nome'),sheet});
 };
 try{window.MastermindCharacters?.persist?.();
  for(const ch of window.MastermindCharacters?.list?.()||[]){
   if(!ch?.character)continue;
   add('ordem',ch.id,ch.name,{...ch.character,name:ch.character.name||ch.name,systemId:'ordem-paranormal'});
  }
 }catch(e){console.warn('Fichas Ordem locais:',e);}
 try{for(const ch of window.RPG16_GURPS?.all||[])add('gurps',ch.id,ch.name,ch);}catch(e){console.warn('Fichas GURPS locais:',e);}
 try{for(const ch of window.RPG18_DND?.all||[])add('dnd',ch.id,ch.name,ch);}catch(e){console.warn('Fichas D&D locais:',e);}
 return result;
}
function selectedCampaign(){return $('#r11-list [data-choose].active')?.dataset.choose||'';}
async function request(id,suffix,method='GET',body){
 const status=JSON.parse(window.RpgLocalHost.status()||'{}');
 if(!status.running)throw Error('Servidor local indisponível');
 const response=await desktop.action('campaign-request',{
  base:'http://'+status.ip+':'+status.port,secret:window.RpgLocalHost.masterKey(),
  method,route:'/api/admin/campaigns/'+id+suffix,body
 });
 if(!response||!response.status)throw Error(response?.error||'Sem resposta do servidor');
 let data;try{data=JSON.parse(response.body||'{}')}catch{throw Error('Resposta inválida do servidor')}
 if(response.status<200||response.status>=300)throw Error(data.error||'Falha na campanha ('+response.status+')');
 return data;
}
async function compactLargeImages(sheet){
 const fields=['photo','portrait','avatar','tokenImage'];
 if(JSON.stringify(sheet).length<228000)return sheet;
 for(const field of fields){
  const value=sheet[field];
  if(typeof value!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(value))continue;
  try{
   const img=new Image();img.src=value;await img.decode();
   const canvas=document.createElement('canvas');
   const ratio=Math.min(1,220/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   sheet[field]=canvas.toDataURL('image/jpeg',.7);
  }catch{delete sheet[field];}
 }
 if(JSON.stringify(sheet).length>239000)throw Error('Ficha excede o limite do servidor; exporte imagens muito grandes separadamente.');
 return sheet;
}
async function assignLocal(select,localKey,playerId){
 const id=selectedCampaign();
 if(!id)throw Error('Selecione uma campanha antes de atribuir a ficha');
 const ch=records().find(x=>x.key===localKey);
 if(!ch)throw Error('Ficha local não encontrada. Abra Personagens para verificar.');
 select.disabled=true;
 try{
  const detail=await request(id,'');
  const campaign=detail.campaign||{};
  const mapping=readJson(MAP_KEY+id,{});
  let remote=(campaign.characters||[]).find(x=>x.sheet?.mastermindLocalRef===localKey);
  if(!remote&&mapping[localKey])remote=(campaign.characters||[]).find(x=>x.id===mapping[localKey]);
  let remoteId=remote?.id;
  if(!remoteId){
   const sheet=await compactLargeImages(jsonClone(ch.sheet));
   sheet.mastermindLocalRef=localKey;
   const created=await request(id,'/characters','POST',{sheet});
   remoteId=created.id;
   if(!remoteId)throw Error('O servidor não retornou a ficha importada');
  }
  mapping[localKey]=remoteId;
  localStorage.setItem(MAP_KEY+id,JSON.stringify(mapping));
  await request(id,'/assign','POST',{playerId,characterId:remoteId});
  notice('Ficha "'+ch.name+'" vinculada ao jogador. Os dados locais foram preservados.');
  $('#r11-detail [data-r11="refresh"]')?.click();
 }finally{select.disabled=false;}
}
function decorateSelects(){
 const items=records();
 for(const select of document.querySelectorAll('#r11-detail select[id^="r11-player-"], .r31-live select[data-r34-assign]')){
  const present=new Set([...select.options].map(option=>option.value));
  if(!items.length)continue;
  const section=document.createElement('optgroup');section.label='Fichas criadas neste aplicativo';
  for(const item of items){
   const value=LOCAL_PREFIX+item.key;
   if(present.has(value))continue;
   const option=document.createElement('option');
   option.value=value;option.textContent=item.name+' · '+({ordem:'Ordem',gurps:'GURPS',dnd:'D&D'}[item.source]||item.source);
   section.append(option);
  }
  if(section.children.length)select.append(section);
 }
 const panel=$('#mastermind-linux-local-sheets'),container=$('#r11-admin');
 if(container&&!panel){
  const section=document.createElement('section');
  section.id='mastermind-linux-local-sheets';section.className='desktop-sheets-panel';
  const title=document.createElement('strong');title.textContent='Fichas salvas neste aplicativo';
  const message=document.createElement('p');
  message.textContent='Escolha uma ficha local no seletor do jogador. Ela será importada para a campanha e atribuída automaticamente, sem excluir o original.';
  const summary=document.createElement('small');summary.className='desktop-sheets-count';
  section.append(title,message,summary);
  container.insertBefore(section,$('#r11-detail'));
 }
 const count=$('#mastermind-linux-local-sheets .desktop-sheets-count');
 if(count)count.textContent=items.length+' ficha(s) disponível(is) · Ordem / GURPS / D&D';
}
function hidePhoneControls(){
 const controls=$('#r12-host-controls');
 if(controls)controls.hidden=true;
 const head=$('#r11-campaigns .r11-head p');
 if(head)head.textContent='Gerencie fichas, jogadores, cenários, grid e convites diretamente no Linux. O serviço da campanha inicia automaticamente.';
 const pass=$('#r11-secret');if(pass)pass.placeholder='Chave da campanha';
}
async function connectLocal(){
 if(connecting||!$('#screen-master')?.classList.contains('active'))return;
 connecting=true;
 try{
  notice('Preparando mestragem local…');
  let status=JSON.parse(window.RpgLocalHost.status()||'{}');
  if(!status.running)status=await window.RpgLocalHost.start();
  if(!status.running)throw Error(status.error||'Servidor não iniciou');
  const endpoint=$('#r11-server'),key=$('#r11-secret');
  if(!endpoint||!key)throw Error('Tela de mestragem incompleta');
  endpoint.value='http://'+status.ip+':'+status.port+'/';
  key.value=window.RpgLocalHost.masterKey();
  $('#r11-campaigns [data-r11="connect"]')?.click();
 }catch(error){notice('Não foi possível abrir a mestragem: '+error.message+' · Verifique Java 17 e os arquivos do servidor.');}
 finally{connecting=false;}
}
function onAssignClick(e){
 const button=e.target.closest('#r11-detail [data-r11="assign"]');
 if(!button)return;
 const select=$('#r11-player-'+button.dataset.player),value=select?.value||'';
 if(!value.startsWith(LOCAL_PREFIX))return;
 e.preventDefault();e.stopImmediatePropagation();
 assignLocal(select,value.slice(LOCAL_PREFIX.length),button.dataset.player).catch(error=>notice('Atribuição: '+error.message));
}
function onLiveChange(e){
 const select=e.target.closest('.r31-live select[data-r34-assign]');
 if(!select||!select.value.startsWith(LOCAL_PREFIX))return;
 e.preventDefault();e.stopImmediatePropagation();
 assignLocal(select,select.value.slice(LOCAL_PREFIX.length),select.dataset.r34Assign).catch(error=>notice('Atribuição: '+error.message));
}
function boot(){
 mountLandscapeSetting();hidePhoneControls();
 const screen=$('#screen-master');
 if(screen){
  new MutationObserver(()=>{if(screen.classList.contains('active')){connectLocal();decorateSelects();}})
   .observe(screen,{attributes:true,attributeFilter:['class']});
  if(screen.classList.contains('active'))connectLocal();
 }
 const detail=$('#r11-detail');
 if(detail)new MutationObserver(decorateSelects).observe(detail,{childList:true});
 document.addEventListener('click',onAssignClick,true);
 document.addEventListener('change',onLiveChange,true);
 document.addEventListener('rpg:character-selected',decorateSelects);
 document.addEventListener('click',e=>{if(e.target.closest('[data-screen="master"]'))setTimeout(decorateSelects,0);});
 setInterval(()=>{if($('.r31-live')||$('#screen-master')?.classList.contains('active'))decorateSelects();},1800);
 decorateSelects();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
