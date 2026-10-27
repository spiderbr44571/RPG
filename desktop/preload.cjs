'use strict';
/* Trusted preload runs only at mastermind://app, NEVER on itch.io WebContentsView.
   Exposes narrow, validated desktop actions and drop-in Android bridge names.
 */
const {contextBridge,ipcRenderer}=require('electron');
const ALLOWED_SCREENS=new Set(['home','library','sheet','atelier85','ai','canvas','master','bestiary','settings']);
const ALLOWED_ACTIONS=new Set(['fit','+','-','reload','browser','capture']);
const PDF_OPERATIONS=new Set(['pickPdf','pickPdfForSystem','indexSavedPdf','indexPersonalBook',
  'openPersonalBook','renderPersonalBookPage','renderIndexPage','renderPage']);
function bookSync(method,...args){
  try{return ipcRenderer.sendSync('mastermind:books-sync',{method,args})}
  catch(_){return '{}'}
}
function bookAction(method,...args){
  if(!PDF_OPERATIONS.has(method))return;
  ipcRenderer.invoke('mastermind:book-action',{method,args}).catch(e=>{
    window.dispatchEvent(new CustomEvent('rpg-page-error',{detail:String(e.message||e)}));
  });
}
contextBridge.exposeInMainWorld('RpgBookBridge',Object.freeze({
  listPersonalBooks:()=>bookSync('listPersonalBooks'),
  getSavedPdf:()=>bookSync('getSavedPdf'),
  pdfIndexStatus:()=>bookSync('pdfIndexStatus'),
  personalBookStatus:id=>bookSync('personalBookStatus',id),
  searchPdf:(query,limit,offset)=>bookSync('searchPdf',query,limit,offset),
  searchPersonalBook:(id,query,limit,offset)=>bookSync('searchPersonalBook',id,query,limit,offset),
  pickPdf:()=>bookAction('pickPdf'),
  pickPdfForSystem:id=>bookAction('pickPdfForSystem',id),
  indexSavedPdf:()=>bookAction('indexSavedPdf'),
  indexPersonalBook:id=>bookAction('indexPersonalBook',id),
  openPersonalBook:id=>bookAction('openPersonalBook',id),
  renderPersonalBookPage:(id,page)=>bookAction('renderPersonalBookPage',id,page),
  renderIndexPage:page=>bookAction('renderIndexPage',page),
  renderPage:page=>bookAction('renderPage',page)
}));
contextBridge.exposeInMainWorld('RpgSheetPdfBridge',Object.freeze({
  savePdf(name,base64){
    ipcRenderer.invoke('mastermind:save-file',{kind:'pdf',name:String(name),base64:String(base64)})
      .catch(e=>window.dispatchEvent(new CustomEvent('mastermind:desktop-error',{detail:String(e.message)})));
  },
  savePng(name,base64){
    ipcRenderer.invoke('mastermind:save-file',{kind:'png',name:String(name),base64:String(base64)})
      .catch(e=>window.dispatchEvent(new CustomEvent('mastermind:desktop-error',{detail:String(e.message)})));
  }
}));
contextBridge.exposeInMainWorld('RpgPixelPortraitBridge',Object.freeze({
  // Godot auto-loads when the Atelier becomes visible. This is a compatibility
  // bridge only; the actual remote game is sandboxed in a separate WebContentsView.
  openOnline:()=>{},
  openBrowser:()=>ipcRenderer.invoke('mastermind:open-url','https://lyime.itch.io/pixel-portrait-creator'),
  openDownload:()=>ipcRenderer.invoke('mastermind:open-url','https://lyime.itch.io/pixel-portrait-creator'),
  consumeCapture:()=>{
    try{return ipcRenderer.sendSync('mastermind:capture-consume')}
    catch(_){return ''}
  }
}));
contextBridge.exposeInMainWorld('RpgSceneDisplay',Object.freeze({
  setLandscape:()=>{}, // Desktop grid always supports window resizing.
  setFullscreen:()=>{}
}));
contextBridge.exposeInMainWorld('RpgDriveBridge',Object.freeze({
  openDocument(type,id){
    if(!/^[a-zA-Z0-9_-]{10,160}$/.test(String(id)))return;
    const url=type==='folder'
      ?'https://drive.google.com/drive/folders/'+id
      :'https://drive.google.com/file/d/'+id+'/view';
    ipcRenderer.invoke('mastermind:open-url',url).catch(()=>{});
  }
}));
contextBridge.exposeInMainWorld('MastermindLinux',Object.freeze({
  platform:'linux',
  stagePosition(position){
    ipcRenderer.send('mastermind:stage-bounds',position);
  },
  stageAction(action){
    if(!ALLOWED_ACTIONS.has(action))return Promise.resolve({ok:false});
    return ipcRenderer.invoke('mastermind:stage-action',action);
  },
  openLink(url){return ipcRenderer.invoke('mastermind:open-url',url)},
  saveBackup(serialized){return ipcRenderer.invoke('mastermind:save-backup',serialized)},
  loadBackup(){return ipcRenderer.invoke('mastermind:load-backup')},
  navigate(screen){
    if(ALLOWED_SCREENS.has(screen))
      window.dispatchEvent(new CustomEvent('mastermind:desktop-navigate',{detail:screen}));
  }
}));

window.addEventListener('DOMContentLoaded',()=>{
  document.documentElement.classList.add('mm-linux');
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='mastermind_linux.css';
  document.head.appendChild(style);
  const runtime=document.createElement('script');
  runtime.src='mastermind_linux.js';
  runtime.defer=true;
  document.body.appendChild(runtime);
});
ipcRenderer.on('mastermind:desktop-navigate',(_event,name)=>{
  if(ALLOWED_SCREENS.has(name)){
    window.dispatchEvent(new CustomEvent('mastermind:desktop-navigate',{detail:name}));
  }
});
ipcRenderer.on('mastermind:desktop-backup',()=>{
  window.dispatchEvent(new Event('mastermind:desktop-backup'));
});
ipcRenderer.on('mastermind:desktop-restore',()=>{
  window.dispatchEvent(new Event('mastermind:desktop-restore'));
});
ipcRenderer.on('mastermind:atelier-captured',()=>{
  document.dispatchEvent(new Event('mastermind:lyime-capture-ready'));
});
ipcRenderer.on('mastermind:atelier-status',(_event,payload)=>{
  window.dispatchEvent(new CustomEvent('mastermind:desktop-atelier-status',{detail:payload||{}}));
});
ipcRenderer.on('mastermind:book-notify',(_event,{topic,payload})=>{
  if(topic==='book-added'){
    window.dispatchEvent(new CustomEvent('rpg-private-book-added',{detail:payload}));
    window.dispatchEvent(new CustomEvent('rpg-book-selected',{detail:payload}));
  }
  if(topic==='book-progress')window.dispatchEvent(new CustomEvent('mastermind:book-progress',{detail:payload}));
  if(topic==='book-error')window.dispatchEvent(new CustomEvent('rpg-page-error',{detail:payload?.message||'PDF'}));
});
