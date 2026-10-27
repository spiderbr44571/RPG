'use strict';
/* Mastermind Linux — desktop shell over the same RPG HTML/JS used by Android.
 * No remote page ever receives an Electron preload or access to local fichas.
 */
const {app,BrowserWindow,WebContentsView,View,dialog,ipcMain,shell,Menu,screen,nativeImage}=
  require('electron');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const {BookCatalog}=require('./book-catalog.cjs');
const {createAssetServer,PORT}=require('./local-server.cjs');

app.commandLine.appendSwitch('ozone-platform-hint','auto');
app.setName('Mastermind');
const isSmoke=process.argv.includes('--smoke-test');
const WEB_ORIGIN='http://127.0.0.1:'+PORT;
const LYIME_OFFICIAL='https://lyime.itch.io/pixel-portrait-creator';
const LYIME_FALLBACK='https://html.itch.zone/html/18379448/index.html?v=1785079497';
const LYIME_REGEX=/https:\/\/html\.itch\.zone\/html\/[0-9]{4,16}\/index\.html(?:\?v=[0-9]{1,16})?/;
const ALLOWED_EXTENSIONS=new Set(['.html','.js','.mjs','.css','.json','.png','.jpg','.jpeg','.svg','.webp','.woff','.woff2','.pdf','.txt','.gif']);
let mainWindow=null,gameView=null,gameClip=null,gameLoaded=false,gameZoom=1,gameGeometry=null;
let userBooks=null,webDir=null,gameUrl=LYIME_FALLBACK,pendingCapture='',assetServer=null;
let pdfWindows=[];
function appWebRoot(){return app.isPackaged?path.join(process.resourcesPath,'web'):
  path.resolve(__dirname,'../app/src/main/assets');}
function safeInside(root,rel){
  const candidate=path.resolve(root,'.'+rel);
  if(candidate===root||candidate.startsWith(root+path.sep))return candidate;
  return null;
}
function mime(ext){
  return ({
    '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
    '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
    '.jpeg':'image/jpeg','.webp':'image/webp','.woff':'font/woff',
    '.woff2':'font/woff2','.svg':'image/svg+xml','.gif':'image/gif',
    '.pdf':'application/pdf','.txt':'text/plain'
  })[ext]||'application/octet-stream';
}
function validRenderer(event){
  return mainWindow&&!mainWindow.isDestroyed()&&event.sender===mainWindow.webContents
    &&event.senderFrame?.url?.startsWith(WEB_ORIGIN+'/');
}
function isTrustedGameHost(raw){
  try{
    const u=new URL(raw),host=u.hostname.toLowerCase();
    return u.protocol==='https:'&&
      (host==='html.itch.zone'||host.endsWith('.itch.zone')||
        host==='lyime.itch.io'||host==='itch.io'||host.endsWith('.itch.io'));
  }catch(_){return false}
}
function safeExternal(url){
  try{
    const u=new URL(url);
    if(!['https:','http:'].includes(u.protocol))return false;
    if(u.username||u.password||url.length>1800)return false;
    return true;
  }catch(_){return false}
}
function mainNotify(topic,payload){
  if(mainWindow&&!mainWindow.isDestroyed())
    mainWindow.webContents.send('mastermind:book-notify',{topic,payload});
}
async function discoverOriginalGodot(){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    try{
      const result=await fetch(LYIME_OFFICIAL,{signal:controller.signal,
        headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) Chrome/125 Safari/537.36'}});
      if(result.ok){
        const text=(await result.text()).slice(0,262144).replace(/&amp;/g,'&');
        const found=text.match(LYIME_REGEX);
        if(found)gameUrl=found[0];
      }
    }finally{clearTimeout(timeout)}
  }catch(_){/* use previously inspected official HTML5 URL */}
  return gameUrl;
}
function attachGodot(){
  if(!mainWindow||mainWindow.isDestroyed()||gameClip)return;
  gameClip=new View();
  gameView=new WebContentsView({
    webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,
      javascript:true,partition:'persist:mastermind-lyime'
    }
  });
  gameView.setBackgroundColor('#252435');
  gameClip.addChildView(gameView);
  mainWindow.contentView.addChildView(gameClip);
  gameView.webContents.on('will-navigate',(event,url)=>{
    if(!isTrustedGameHost(url)){event.preventDefault();if(safeExternal(url))shell.openExternal(url);}
  });
  gameView.webContents.setWindowOpenHandler(({url})=>{
    if(safeExternal(url))shell.openExternal(url);
    return {action:'deny'};
  });
  gameView.webContents.on('did-fail-load',(_event,code,description,isMainFrame)=>{
    if(isMainFrame&&code!==-3&&mainWindow)
      mainWindow.webContents.send('mastermind:atelier-status',{message:'O Godot não carregou: '+description});
  });
  gameView.webContents.on('did-finish-load',()=>fitGodotToStage());
  // Requests for all private user data are denied to this separate partition.
  const gameSession=gameView.webContents.session;
  gameSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  gameSession.setPermissionCheckHandler(()=>false);
}
function fitGodotToStage(){
  if(!gameView||!gameGeometry)return;
  const w=Math.max(1,gameGeometry.full.width),h=Math.max(1,gameGeometry.full.height);
  const fit=Math.max(.75,Math.min(2.5,Math.min((w-10)/600,(h-10)/720)));
  gameZoom=fit;
  gameView.webContents.setZoomFactor(fit);
  mainWindow?.webContents.send('mastermind:atelier-status',{message:'Criador original carregado · '+Math.round(fit*100)+'%'});
}
async function ensureGodot(){
  attachGodot();
  if(gameLoaded)return;
  gameLoaded=true;
  const url=await discoverOriginalGodot();
  if(!gameView||!mainWindow||mainWindow.isDestroyed())return;
  try{await gameView.webContents.loadURL(url);}
  catch(e){mainWindow.webContents.send('mastermind:atelier-status',{message:'Falha ao abrir HTML5 do lyime. Verifique a internet.'});}
}
function removeGameOverlay(){
  if(gameClip&&mainWindow&&!mainWindow.isDestroyed()){
    try{mainWindow.contentView.removeChildView(gameClip);}catch(_){}
  }
  if(gameView){try{gameView.webContents.close();}catch(_){}}
  gameView=null;gameClip=null;gameLoaded=false;gameGeometry=null;
}
function validRect(rect){
  return rect&&typeof rect==='object'&&
    ['x','y','width','height'].every(k=>Number.isFinite(rect[k])&&Math.abs(rect[k])<20000)
    &&rect.width>100&&rect.height>100&&rect.width<8500&&rect.height<8500;
}
function positionGodot(payload){
  if(!mainWindow||mainWindow.isDestroyed())return;
  if(!payload?.visible||!validRect(payload.full)||!validRect(payload.clip)){
    if(gameClip)gameClip.setVisible(false);
    return;
  }
  const bounds=mainWindow.getContentBounds();
  const intersection={
    x:Math.max(0,Math.round(payload.clip.x)),
    y:Math.max(0,Math.round(payload.clip.y)),
    width:Math.max(0,Math.min(bounds.width,Math.round(payload.clip.x+payload.clip.width))-Math.max(0,Math.round(payload.clip.x))),
    height:Math.max(0,Math.min(bounds.height,Math.round(payload.clip.y+payload.clip.height))-Math.max(0,Math.round(payload.clip.y)))
  };
  if(intersection.width<70||intersection.height<65){
    if(gameClip)gameClip.setVisible(false);return;
  }
  ensureGodot().catch(()=>{});
  if(!gameClip||!gameView)return;
  const previous=gameGeometry?.full;
  gameGeometry={full:payload.full,clip:payload.clip};
  gameClip.setBounds(intersection);
  gameClip.setVisible(true);
  gameView.setBounds({
    x:Math.round(payload.full.x-intersection.x),
    y:Math.round(payload.full.y-intersection.y),
    width:Math.max(100,Math.round(payload.full.width)),
    height:Math.max(100,Math.round(payload.full.height))
  });
  if(!previous||Math.abs(previous.width-payload.full.width)>25||
      Math.abs(previous.height-payload.full.height)>25)fitGodotToStage();
}
function setGodotZoom(action){
  if(!gameView)return;
  if(action==='fit'){fitGodotToStage();return;}
  if(action==='reload'){gameView.webContents.reloadIgnoringCache();return;}
  if(action==='browser'){shell.openExternal(LYIME_OFFICIAL);return;}
  if(action==='+'||action==='-'){
    const ratio=action==='+'?1.17:1/1.17;
    gameZoom=Math.max(.65,Math.min(3.5,gameZoom*ratio));
    gameView.webContents.setZoomFactor(gameZoom);
    mainWindow?.webContents.send('mastermind:atelier-status',{message:'Ampliação '+Math.round(gameZoom*100)+'%'});
  }
}
async function captureGodot(){
  if(!gameView||!gameGeometry)throw new Error('Abra o Ateliê primeiro');
  const native=await gameView.webContents.capturePage();
  const resized=native.getSize().width>1700?native.resize({width:1700}):native;
  const bytes=resized.toPNG();
  if(bytes.length<70||bytes.length>6500000)throw new Error('Imagem do editor muito grande');
  pendingCapture='data:image/png;base64,'+bytes.toString('base64');
  mainWindow?.webContents.send('mastermind:atelier-captured');
  return {ok:true,bytes:bytes.length};
}
function ensurePDFInput(raw,name,kind){
  if(typeof name!=='string'||!/^[a-zA-Z0-9._-]{1,100}\.(?:pdf|png)$/.test(name))
    throw new Error('Nome inválido');
  if(!['pdf','png'].includes(kind)||!name.toLowerCase().endsWith('.'+kind))
    throw new Error('Extensão inválida');
  if(typeof raw!=='string'||raw.length>(kind==='pdf'?38_000_000:15_000_000)||raw.length<50)
    throw new Error('Arquivo fora do limite permitido');
  const bytes=Buffer.from(raw,'base64');
  if(kind==='pdf'&&!bytes.subarray(0,5).toString('ascii').startsWith('%PDF-'))
    throw new Error('PDF inválido');
  if(kind==='png'&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    throw new Error('Imagem PNG inválida');
  return bytes;
}
async function saveDocument(payload){
  const {name,base64,kind}=payload||{};
  const bytes=ensurePDFInput(base64,name,kind);
  const result=await dialog.showSaveDialog(mainWindow,{
    title:kind==='pdf'?'Salvar ficha do Mastermind':'Salvar token ou retrato',
    defaultPath:path.join(app.getPath('downloads'),name),
    filters:[{name:kind==='pdf'?'Documentos PDF':'Imagens PNG',extensions:[kind]}]
  });
  if(result.canceled||!result.filePath)return {saved:false};
  await fsp.writeFile(result.filePath,bytes);
  return {saved:true};
}
function viewerWindow(id,page=1){
  if(!userBooks.lookup(id))return;
  const view=new BrowserWindow({
    width:1020,height:880,minWidth:650,minHeight:500,title:'Livro · Mastermind',
    parent:mainWindow,backgroundColor:'#13131e',
    webPreferences:{sandbox:true,nodeIntegration:false,contextIsolation:true,plugins:true}
  });
  pdfWindows.push(view);
  view.once('closed',()=>{pdfWindows=pdfWindows.filter(x=>x!==view)});
  view.loadURL(WEB_ORIGIN+'/privatepdf/'+id+'.pdf#page='+Math.max(1,Math.min(1800,page|0)));
}
function bookSync(req){
  try{
    const {method,args=[]}=req||{};
    if(!Array.isArray(args)||args.length>4)return '{}';
    const get=id=>userBooks.lookup(String(id))?userBooks.status(String(id)):{state:'missing'};
    switch(method){
      case 'listPersonalBooks':return JSON.stringify(userBooks.list());
      case 'getSavedPdf':return JSON.stringify(userBooks.getSavedPdf());
      case 'pdfIndexStatus':return JSON.stringify(userBooks.status(userBooks.firstOrder()?.id));
      case 'personalBookStatus':return JSON.stringify(get(args[0]));
      case 'searchPdf':return JSON.stringify(userBooks.search(userBooks.firstOrder()?.id,args[0],args[1],args[2]));
      case 'searchPersonalBook':return JSON.stringify(userBooks.search(String(args[0]),args[1],args[2],args[3]));
      default:return '{}';
    }
  }catch(_){return '{"state":"error","hits":[]}'}
}
async function handleBookAction(method,args){
  if(method==='pickPdf'||method==='pickPdfForSystem'){
    const sys=method==='pickPdf'?'ordem-paranormal':String(args[0]);
    const file=await dialog.showOpenDialog(mainWindow,{
      title:'Adicionar livros pessoais ao Mastermind',
      properties:['openFile','multiSelections'],filters:[{name:'Documentos PDF',extensions:['pdf']}]
    });
    if(file.canceled)return {canceled:true};
    return userBooks.importFiles(file.filePaths,sys);
  }
  if(method==='indexSavedPdf'){
    const id=userBooks.firstOrder()?.id;
    if(id)userBooks.index(id).catch(()=>{});
    return {ok:true};
  }
  if(method==='indexPersonalBook'){
    const id=String(args[0]);if(userBooks.lookup(id))userBooks.index(id).catch(()=>{});
    return {ok:true};
  }
  if(['openPersonalBook','renderPersonalBookPage','renderIndexPage','renderPage'].includes(method)){
    const id=method.includes('PersonalBook')?String(args[0]):userBooks.firstOrder()?.id;
    const page=method==='renderPersonalBookPage'?Number(args[1]):Number(args[0])||1;
    if(id) viewerWindow(id,method==='openPersonalBook'?1:page);
    return {ok:true};
  }
  return {ok:false};
}
function configureMenu(){
  const navigate=(to)=>mainWindow?.webContents.send('mastermind:desktop-navigate',to);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Mastermind',submenu:[
      {label:'Início',accelerator:'CmdOrCtrl+1',click:()=>navigate('home')},
      {label:'Biblioteca',accelerator:'CmdOrCtrl+2',click:()=>navigate('library')},
      {label:'Personagens',accelerator:'CmdOrCtrl+3',click:()=>navigate('sheet')},
      {label:'Ateliê',accelerator:'CmdOrCtrl+4',click:()=>navigate('atelier85')},
      {label:'Pesquisar regras',accelerator:'CmdOrCtrl+5',click:()=>navigate('ai')},
      {label:'Canvas',accelerator:'CmdOrCtrl+6',click:()=>navigate('canvas')},
      {label:'Mesa',accelerator:'CmdOrCtrl+7',click:()=>navigate('master')},
      {label:'Bestiário',accelerator:'CmdOrCtrl+8',click:()=>navigate('bestiary')},
      {label:'Configurações',accelerator:'CmdOrCtrl+9',click:()=>navigate('settings')},
      {type:'separator'},
      {label:'Salvar backup',accelerator:'CmdOrCtrl+Shift+B',click:()=>mainWindow?.webContents.send('mastermind:desktop-backup')},
      {label:'Restaurar backup...',click:()=>mainWindow?.webContents.send('mastermind:desktop-restore')},
      {type:'separator'},{role:'quit',label:'Sair'}
    ]},
    {label:'Editar',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},
      {role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'Visualizar',submenu:[
      {role:'reload',label:'Recarregar janela'},
      {role:'togglefullscreen',accelerator:'F11',label:'Tela cheia'},
      {role:'resetZoom',label:'Escala normal'},
      {role:'zoomIn',label:'Ampliar interface'},
      {role:'zoomOut',label:'Reduzir interface'}
    ]},
    {label:'Ajuda',submenu:[
      {label:'Site do Pixel Portrait Creator',click:()=>shell.openExternal(LYIME_OFFICIAL)},
      {label:'Código do Mastermind',click:()=>shell.openExternal('https://github.com/spiderbr44571/RPG')}
    ]}
  ]));
}
function createWindow(){
  const displays=screen.getPrimaryDisplay().workAreaSize;
  const width=Math.min(1580,Math.max(1100,Math.round(displays.width*.87)));
  const height=Math.min(1000,Math.max(720,Math.round(displays.height*.88)));
  mainWindow=new BrowserWindow({
    title:'Mastermind — RPG',
    width,height,minWidth:950,minHeight:620,
    show:false,backgroundColor:'#101019',autoHideMenuBar:false,
    icon:path.join(webDir,'mastermind_logo.png'),
    webPreferences:{
      preload:path.join(__dirname,'preload.cjs'),
      sandbox:true,contextIsolation:true,nodeIntegration:false,
      partition:'persist:mastermind',webSecurity:true,webviewTag:false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(safeExternal(url))shell.openExternal(url);
    return {action:'deny'};
  });
  mainWindow.webContents.on('will-navigate',(event,url)=>{
    if(!url.startsWith(WEB_ORIGIN+'/')){event.preventDefault();
      if(safeExternal(url))shell.openExternal(url);}
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
  mainWindow.webContents.session.setPermissionCheckHandler(()=>false);
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.on('resize',()=>{if(gameClip)gameClip.setVisible(false)});
  mainWindow.on('closed',()=>{
    if(gameClip)removeGameOverlay();
    mainWindow=null;
  });
  mainWindow.loadURL(WEB_ORIGIN+'/demo-offline.html').catch(e=>console.error(e));
  if(isSmoke){
    let timer=setTimeout(()=>{console.error('SMOKE TIMEOUT');app.exit(2)},15000);
    mainWindow.webContents.on('did-finish-load',async()=>{
      clearTimeout(timer);
      try{
        const state=await mainWindow.webContents.executeJavaScript(
          "({title:document.title,sidebar:!!document.querySelector('.sidebar'),"+
          "screens:document.querySelectorAll('.screen').length,desktop:document.documentElement.classList.contains('mm-linux')})");
        console.log('LINUX SMOKE',JSON.stringify(state));
        app.exit(state.desktop&&state.sidebar&&state.screens>6?0:3);
      }catch(e){console.error(e);app.exit(4)}
    });
  }
}
function registerIPC(){
  ipcMain.on('mastermind:books-sync',(event,req)=>{
    event.returnValue=validRenderer(event)?bookSync(req):'{}';
  });
  ipcMain.handle('mastermind:book-action',(event,request)=>{
    if(!validRenderer(event))throw new Error('Página não autorizada');
    return handleBookAction(String(request?.method||''),request?.args||[]);
  });
  ipcMain.handle('mastermind:save-file',(event,data)=>{
    if(!validRenderer(event))throw new Error('Página não autorizada');
    return saveDocument(data);
  });
  ipcMain.handle('mastermind:open-url',async(event,url)=>{
    if(!validRenderer(event)||!safeExternal(url))throw new Error('URL não permitida');
    await shell.openExternal(url);return {ok:true};
  });
  ipcMain.on('mastermind:stage-bounds',(event,payload)=>{
    if(validRenderer(event))positionGodot(payload);
  });
  ipcMain.handle('mastermind:stage-action',async(event,action)=>{
    if(!validRenderer(event))throw new Error('Página não autorizada');
    if(action==='capture')return captureGodot();
    if(!['fit','reload','browser','+','-'].includes(action))return {ok:false};
    setGodotZoom(action);return {ok:true};
  });
  ipcMain.on('mastermind:capture-consume',event=>{
    event.returnValue=validRenderer(event)?pendingCapture:'';
    pendingCapture='';
  });
  ipcMain.handle('mastermind:save-backup',async(event,serialized)=>{
    if(!validRenderer(event))throw new Error('Página não autorizada');
    if(typeof serialized!=='string'||serialized.length>34000000)throw new Error('Backup muito grande');
    const verify=JSON.parse(serialized);
    if(verify?.format!=='mastermind-linux-backup-v1'||typeof verify.entries!=='object')
      throw new Error('Formato de backup inválido');
    const save=await dialog.showSaveDialog(mainWindow,{
      title:'Salvar backup local do Mastermind',
      defaultPath:path.join(app.getPath('documents'),'Mastermind-backup.json'),
      filters:[{name:'Backup Mastermind',extensions:['json']}]
    });
    if(save.canceled||!save.filePath)return {saved:false};
    await fsp.writeFile(save.filePath,serialized,{mode:0o600});
    return {saved:true};
  });
  ipcMain.handle('mastermind:load-backup',async event=>{
    if(!validRenderer(event))throw new Error('Página não autorizada');
    const result=await dialog.showOpenDialog(mainWindow,{
      title:'Restaurar backup local do Mastermind',
      properties:['openFile'],filters:[{name:'Backup Mastermind',extensions:['json']}]
    });
    if(result.canceled||!result.filePaths.length)return null;
    const stat=await fsp.stat(result.filePaths[0]);
    if(stat.size>34000000)throw new Error('Backup ultrapassa o limite');
    return fsp.readFile(result.filePaths[0],'utf8');
  });
}
const hasLock=app.requestSingleInstanceLock();
if(!hasLock)app.quit();
app.on('second-instance',()=>{if(mainWindow&&!mainWindow.isDestroyed()){mainWindow.show();mainWindow.focus();}});
if(hasLock)app.whenReady().then(async()=>{
  webDir=appWebRoot();
  userBooks=new BookCatalog(app.getPath('userData'),(topic,payload)=>mainNotify(topic,payload));
  assetServer=await createAssetServer(webDir,userBooks);
  registerIPC();
  configureMenu();
  createWindow();
}).catch(e=>{console.error('FATAL',e);app.exit(1)});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
app.on('window-all-closed',()=>{app.quit()});
app.on('before-quit',()=>{try{removeGameOverlay()}catch(_){} try{assetServer?.close()}catch(_){}});
