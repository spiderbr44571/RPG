/* Desktop-only enhancements, loaded only by Electron's trusted preload. */
(function(){
'use strict';
if(!window.MastermindLinux||!document.documentElement.classList.contains('mm-linux'))return;
const native=window.MastermindLinux;
const $=(q,root=document)=>root.querySelector(q);
const toast=document.createElement('div');
toast.className='mm-linux-toast';toast.setAttribute('role','status');toast.hidden=true;
document.body.appendChild(toast);
let timeout;
function feedback(message){
  toast.textContent=String(message||'').slice(0,200);
  toast.hidden=false;clearTimeout(timeout);
  timeout=setTimeout(()=>toast.hidden=true,4800);
}
function navigate(id){
  try{
    if(typeof window.RPG_DEMO?.navigate==='function'){window.RPG_DEMO.navigate(id);return}
  }catch(_){}
  const item=document.querySelector('.sidebar [data-screen="'+id+'"]');
  item?.click();
}
window.addEventListener('mastermind:desktop-navigate',event=>{
  if(/^(home|library|sheet|atelier85|ai|canvas|master|bestiary|settings)$/.test(event.detail||''))
    navigate(event.detail);
});
function exportBackup(){
  if(!confirm('Criar backup JSON das fichas, cenas e configurações? Ele pode conter informações pessoais. PDFs serão mantidos na biblioteca local e devem ser copiados separadamente.'))return;
  try{
    const entries={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key!==null)entries[key]=localStorage.getItem(key)||'';
    }
    const backup=JSON.stringify({format:'mastermind-linux-backup-v1',
      createdAt:new Date().toISOString(),origin:'Mastermind Desktop',
      entries});
    if(backup.length>33500000)throw new Error('Backup excede 33 MB; exporte as fichas separadamente.');
    native.saveBackup(backup).then(r=>feedback(r?.saved?'Backup salvo no Linux':'Backup cancelado'))
      .catch(e=>feedback('Backup: '+e.message));
  }catch(e){feedback('Backup: '+e.message)}
}
async function importBackup(){
  let raw;
  try{raw=await native.loadBackup()}catch(e){feedback('Erro ao ler backup: '+e.message);return}
  if(!raw)return;
  try{
    const restored=JSON.parse(raw);
    if(restored.format!=='mastermind-linux-backup-v1'||
       !restored.entries||typeof restored.entries!=='object'||Array.isArray(restored.entries))
      throw new Error('Arquivo não é backup compatível com Mastermind Linux');
    const entries=Object.entries(restored.entries);
    if(entries.length>1500)throw new Error('Backup com entradas demais');
    for(const [key,value] of entries){
      if(typeof key!=='string'||key.length>200||typeof value!=='string'||value.length>10_000_000)
        throw new Error('Conteúdo inválido');
    }
    if(!confirm('Restaurar '+entries.length+' registros? Isso substituirá dados locais com as mesmas chaves. Recomendamos salvar um backup atual antes.'))return;
    for(const [key,value] of entries)localStorage.setItem(key,value);
    feedback('Backup importado. Recarregando...');
    location.reload();
  }catch(e){feedback('Não foi possível restaurar: '+e.message)}
}
window.addEventListener('mastermind:desktop-backup',exportBackup);
window.addEventListener('mastermind:desktop-restore',importBackup);
function addTopButtons(){
  const top=$('.topbar .top-actions');
  if(!top||$('#mm-linux-top'))return;
  const row=document.createElement('div');
  row.id='mm-linux-top';row.className='mm-linux-top-buttons';
  const a=document.createElement('button');
  a.type='button';a.textContent='Backup';a.title='Salvar fichas, mapas e preferências (Ctrl+Shift+B)';
  a.addEventListener('click',exportBackup);
  const b=document.createElement('button');
  b.type='button';b.textContent='Restaurar';b.title='Importar backup JSON';
  b.addEventListener('click',importBackup);
  row.append(a,b);
  top.prepend(row);
}
function stageButtons(){
  const host=$('#screen-atelier85 .p90-stage-caption');
  if(!host||$('#mm-linux-atelier-actions'))return;
  const wrapper=document.createElement('div');
  wrapper.id='mm-linux-atelier-actions';
  wrapper.className='mm-linux-atelier-controls';
  const options=[['−','-'],['+','+'],['Ajustar','fit'],
    ['Recarregar','reload'],['Capturar retrato','capture']];
  for(const [label,action] of options){
    const b=document.createElement('button');
    b.type='button';b.textContent=label;b.dataset.mmLinuxStage=action;
    if(action==='capture')b.classList.add('mm-linux-capture');
    b.addEventListener('click',async()=>{
      try{
        const result=await native.stageAction(action);
        if(action==='capture'&&result?.ok){
          $('#p90-token-panel')?.scrollIntoView({block:'start',behavior:'smooth'});
          feedback('Captura enviada para o painel de retrato e token.');
        }
      }catch(e){feedback('Ateliê: '+e.message)}
    });
    wrapper.appendChild(b);
  }
  const status=document.createElement('small');status.id='mm-linux-atelier-status';
  status.textContent='O Godot original abre automaticamente aqui.';
  wrapper.appendChild(status);
  host.parentElement.insertBefore(wrapper,host);
  window.addEventListener('mastermind:desktop-atelier-status',e=>{
    if(status)status.textContent=String(e.detail?.message||'').slice(0,130);
  });
}
// Native WebContentsView is stacked over the original 2D canvas placeholder.
// We never load lyime assets into the privileged renderer or a shared iframe.
let lastGeometry='';
let lastSignal=0;
function updateStage(){
  const now=Date.now();
  if(now-lastSignal<140)return;
  lastSignal=now;
  const region=$('#p90-native-stage');
  const screen=$('#screen-atelier85');
  const scroller=$('#content');
  let visible=false,full={x:0,y:0,width:0,height:0},clip={x:0,y:0,width:0,height:0};
  if(region&&scroller&&screen?.classList.contains('active')&&!document.hidden){
    const a=region.getBoundingClientRect(),b=scroller.getBoundingClientRect();
    const x=Math.max(0,Math.max(a.left,b.left));
    const y=Math.max(0,Math.max(a.top,b.top));
    const right=Math.min(window.innerWidth,a.right,b.right);
    const bottom=Math.min(window.innerHeight,a.bottom,b.bottom);
    full={x:a.left,y:a.top,width:a.width,height:a.height};
    clip={x,y,width:Math.max(0,right-x),height:Math.max(0,bottom-y)};
    visible=clip.width>=80&&clip.height>=80;
  }
  const geometry=JSON.stringify([visible,Math.round(full.x),Math.round(full.y),
    Math.round(full.width),Math.round(full.height),Math.round(clip.x),Math.round(clip.y),
    Math.round(clip.width),Math.round(clip.height),window.innerWidth]);
  if(geometry!==lastGeometry){
    lastGeometry=geometry;
    native.stagePosition({visible,full,clip,viewportWidth:window.innerWidth,
      viewportHeight:window.innerHeight});
  }
}
setInterval(updateStage,180);
window.addEventListener('resize',updateStage);
document.addEventListener('visibilitychange',updateStage);
$('#content')?.addEventListener('scroll',updateStage,{passive:true});
document.addEventListener('click',()=>setTimeout(updateStage,60));
window.addEventListener('hashchange',updateStage);
window.addEventListener('mastermind:desktop-error',e=>feedback(e.detail));
window.addEventListener('mastermind:book-progress',e=>{
  const detail=e.detail;
  if(detail?.done)feedback('PDF indexado: '+(detail.state==='ready'?'pesquisável':'veja a biblioteca'));
});
window.addEventListener('rpg-page-error',e=>feedback(e.detail||'Erro ao abrir PDF'));
// Android's old in-page raster page viewer is replaced by a full desktop PDF
// window, so the temporary placeholder overlay should not obscure the app.
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-r51-page]'))return;
  setTimeout(()=>{
    const v=$('#r51-book-viewer');
    if(v)v.hidden=true;
  },220);
},true);
// Linux uses Python-independent persistent PDF indexing, own screenshot-to-token
// and Chromium's native file picker. No need to install Java or Android tools.
addTopButtons();
stageButtons();
updateStage();
feedback('Mastermind Linux pronto. Ctrl+1…9 para alternar telas; F11 para tela cheia.');
})();
