'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const action=(method,...args)=>ipcRenderer.invoke('mastermind:action',{method,args});
const sync=(method,...args)=>ipcRenderer.sendSync('mastermind:sync',{method,args});
contextBridge.exposeInMainWorld('MastermindDesktop',Object.freeze({
 platform:'linux',version:'1.0.7',
 action,
 onGodotStatus:callback=>ipcRenderer.on('mastermind:godot-status',(_e,value)=>callback(value)),
 onCapture:callback=>ipcRenderer.on('mastermind:lyime-capture-ready',()=>callback()),
 onPdf:callback=>ipcRenderer.on('mastermind:pdf-selected',(_e,value)=>callback(value))
}));
contextBridge.exposeInMainWorld('RpgSheetPdfBridge',Object.freeze({
 savePdf:(name,base64)=>{action('save-pdf',name,base64).catch(console.error);},
 savePng:(name,base64)=>{action('save-png',name,base64).catch(console.error);}
}));
contextBridge.exposeInMainWorld('RpgPixelPortraitBridge',Object.freeze({
 openOnline:()=>action('godot-action','fit'),
 openBrowser:()=>action('external','https://lyime.itch.io/pixel-portrait-creator'),
 openDownload:()=>action('external','https://lyime.itch.io/pixel-portrait-creator'),
 consumeCapture:()=>sync('capture')
}));

contextBridge.exposeInMainWorld('RpgLocalHost',Object.freeze({
 status:()=>sync('campaign-status'),
 masterKey:()=>sync('campaign-key'),
 start:()=>action('campaign-start'),
 stop:()=>action('campaign-stop'),
 openLocalMaster:()=>action('campaign-panel')
}));
