'use strict';
/**
 * Mastermind Desktop 1.0 — native Linux shell.
 * RPG code and all original UI assets are shared with the Android build.
 * Third-party Godot content lives in an isolated WebContentsView, never in the
 * privileged local application renderer.
 */
const {app,BrowserWindow,WebContentsView,ipcMain,dialog,shell,nativeImage,session,Menu}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),https=require('node:https');
const {URL}=require('node:url');
const {CampaignHost}=require('./campaign-host.cjs');
const {frameHasDetail}=require('./godot-health.cjs');
// The release's server/assets is an unpacked, verified copy of the shared UI.
// In electron-builder builds the app.asar files filter may exclude app assets;
// resolving the packaged view here prevents ERR_FILE_NOT_FOUND / blank windows.
const sourceAssets=path.join(__dirname,'..','app','src','main','assets');
const packagedAssets=path.join(process.resourcesPath,'server','assets');
const assets=app.isPackaged ? packagedAssets : sourceAssets;
if(!fs.existsSync(path.join(assets,'demo-offline.html'))){
 throw Error('Mastermind: interface offline não encontrada: '+assets);
}
const creator='https://lyime.itch.io/pixel-portrait-creator';
const gameFallback='https://html.itch.zone/html/18379448/index.html?v=1785079497';
let win,gameView,gameStarted=false,gameLoading=false,gameBounds=null,editorZoom=1,editorPan={x:0,y:0},capture=null;
let hostManager=null;
let gameErrorTimer=null;
const allowedExt=new Set(['.png','.pdf','.json']);
const stored=()=>path.join(app.getPath('userData'),'mastermind-books');
// Compatibility WebGL is opt-in: Chromium can reject GPU contexts on some drivers.
const godotCompatFlag=path.join(app.getPath('userData'),'godot-software-renderer.flag');
let godotSoftwareRenderer=false;
try{godotSoftwareRenderer=fs.existsSync(godotCompatFlag);}catch{}
if(godotSoftwareRenderer){
 app.commandLine.appendSwitch('use-angle','swiftshader');
 app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}
let gameFailed=false,gameLoadSerial=0,gameCurrentUrl='',gameLastError='',gameProbeTimer=null;
function gameStatus(status,message){
 if(win&&!win.webContents.isDestroyed())win.webContents.send('mastermind:godot-status',{
  status,message:message||'',software:godotSoftwareRenderer
 });
}
function stopGameProbes(){
 clearTimeout(gameErrorTimer);gameErrorTimer=null;
 clearTimeout(gameProbeTimer);gameProbeTimer=null;
}
function failGame(message){
 if(gameFailed)return;
 gameFailed=true;gameLoading=false;stopGameProbes();
 console.warn('Atelie Godot:',message,'url:',gameCurrentUrl,'console:',gameLastError);
 if(gameView)gameView.setVisible(false); // reveal the actionable error instead of a black native view
 gameStatus('error',message+(gameLastError?' ('+gameLastError.slice(0,140)+')':''));
}
async function probeGodot(serial){
 if(!gameView||gameView.webContents.isDestroyed()||!gameLoading||gameFailed||serial!==gameLoadSerial)return;
 try{
  const state=await gameView.webContents.executeJavaScript(
   "(function(){const c=document.querySelector('#canvas,canvas');if(!c)return {canvas:false};"+
   "const r=c.getBoundingClientRect();const css=getComputedStyle(c);"+
   "return {canvas:true,width:r.width,height:r.height,hidden:css.display==='none'||css.visibility==='hidden'};})()",true);
  if(serial!==gameLoadSerial||gameFailed)return;
  if(state&&state.canvas&&state.width>80&&state.height>80&&!state.hidden){
   const frame=await gameView.webContents.capturePage();
   if(frameHasDetail(frame)){
    gameLoading=false;stopGameProbes();
    gameStatus('ready','Editor de retratos carregado e renderizando.');
    setTimeout(fitGame,200);return;
   }
  }
 }catch(error){gameLastError=String(error.message||error).slice(0,180);}
 if(serial===gameLoadSerial&&gameLoading&&!gameFailed)
  gameProbeTimer=setTimeout(()=>probeGodot(serial),2400);
}
async function loadGodot(){
 if(!gameView||gameView.webContents.isDestroyed())return;
 stopGameProbes();
 const serial=++gameLoadSerial;
 gameStarted=true;gameLoading=true;gameFailed=false;gameLastError='';
 gameView.setVisible(true);
 gameStatus('loading','Abrindo o criador e verificando o desenho na tela...');
 const fixture=process.env.MASTERMIND_E2E==='1'&&process.env.MASTERMIND_GODOT_FIXTURE==='black';
 gameErrorTimer=setTimeout(()=>{
  if(serial===gameLoadSerial&&gameLoading)failGame('O editor abriu mas não exibiu uma imagem. Experimente o modo compatibilidade ou abra no navegador.');
 },fixture?6500:55000);
 try{
  const url=fixture?'data:text/html;charset=utf-8,<html><body style="margin:0;background:black"><canvas id="canvas" width="600" height="400" style="width:600px;height:400px;background:black"></canvas></body></html>':await resolveGameUrl();
  if(serial!==gameLoadSerial)return;
  if(!fixture&&!trustedGame(url))throw Error('Endereço externo do editor não autorizado.');
  gameCurrentUrl=url;
  await gameView.webContents.loadURL(url);
 }catch(error){
  if(serial===gameLoadSerial)failGame('Falha ao carregar o editor online: '+String(error.message||error));
 }
}
function restartGodotRenderer(){
 try{
  fs.mkdirSync(path.dirname(godotCompatFlag),{recursive:true});
  if(godotSoftwareRenderer)fs.unlinkSync(godotCompatFlag);
  else fs.writeFileSync(godotCompatFlag,'1');
  app.relaunch({args:process.argv.slice(1)});
  app.exit(0);
 }catch(error){gameStatus('error','Não foi possível alternar o modo gráfico: '+String(error.message||error));}
}

function safeName(value,ext){
 const name=String(value||'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
 if(!name||!name.toLowerCase().endsWith(ext))throw Error('Nome inválido');
 return name;
}
function ensureLocal(event){
 // The SPA navigates with #master/#atelier85/#canvas. Fragments are part of the
 // same trusted local document, but an exact URL string comparison rejected them.
 // Compare only the canonical local file path, and reject subframes.
 if(!win||event.sender!==win.webContents)throw Error('Requisição externa bloqueada');
 if(event.senderFrame&&event.senderFrame!==win.webContents.mainFrame)
  throw Error('Acesso a bridge negado para subframe');
 let actual,expected;
 try{
  actual=new URL(event.sender.getURL());
  expected=require('node:url').pathToFileURL(path.join(assets,'demo-offline.html'));
 }catch{throw Error('Endereço inválido');}
 if(actual.protocol!=='file:'||actual.host!==expected.host||actual.pathname!==expected.pathname)
  throw Error('Requisição externa bloqueada');
}
function boundedBase64(input,limit=15*1024*1024){
 if(typeof input!=='string'||input.length>limit*1.4||!/^[A-Za-z0-9+/=\s]+$/.test(input))throw Error('Dados inválidos');
 const buf=Buffer.from(input,'base64');
 if(buf.length<20||buf.length>limit)throw Error('Arquivo excede limite');
 return buf;
}
async function saveFile(name,base64,extension){
 const filename=safeName(name,extension),buffer=boundedBase64(base64);
 const chosen=await dialog.showSaveDialog(win,{defaultPath:path.join(app.getPath('downloads'),filename),filters:[{name:extension.slice(1).toUpperCase(),extensions:[extension.slice(1)]}]});
 if(chosen.canceled||!chosen.filePath)return false;
 await fs.promises.writeFile(chosen.filePath,buffer,{flag:'w'});
 return true;
}
async function resolveGameUrl(){
 try{
  const text=await new Promise((resolve,reject)=>{
   const req=https.get(creator,{timeout:7000,headers:{'User-Agent':'Mozilla/5.0'}},res=>{
    if(res.statusCode!==200){res.resume();return reject(Error('status'));}
    let data='';res.setEncoding('utf8');
    res.on('data',chunk=>{data+=chunk;if(data.length>400000)req.destroy();});
    res.on('end',()=>resolve(data));
   });
   req.on('timeout',()=>req.destroy(Error('timeout')));
   req.on('error',reject);
  });
  const match=text.match(/https:\/\/html\.itch\.zone\/html\/\d{4,16}\/index\.html(?:\?v=\d{1,16})?/);
  return match?match[0]:gameFallback;
 }catch{return gameFallback;}
}
function trustedGame(url){
 try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='html.itch.zone'||u.hostname==='lyime.itch.io'||u.hostname.endsWith('.itch.zone')||u.hostname.endsWith('.itch.io'));}catch{return false;}
}
function createGame(){
 if(gameView)return;
 gameView=new WebContentsView({webPreferences:{
  nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
  javascript:true,webviewTag:false,partition:'persist:mastermind-lyime'
 }});
 gameView.setBackgroundColor('#201c2b');
 win.contentView.addChildView(gameView);
 gameView.setVisible(false);
 gameView.webContents.setWindowOpenHandler(({url})=>{
  if(trustedGame(url))shell.openExternal(url).catch(()=>{});
  return {action:'deny'};
 });
 gameView.webContents.on('will-navigate',(event,url)=>{
  if(!trustedGame(url))event.preventDefault();
 });
 gameView.webContents.on('console-message',(_event,level,message)=>{
  if(level>=2&&/webgl|gpu|godot|wasm|sharedarraybuffer|cross.origin|error/i.test(String(message))){
   gameLastError=String(message).slice(0,180);
  }
 });
 gameView.webContents.on('did-fail-load',(_event,code,description,isMainFrame)=>{
  if(isMainFrame&&code!==-3)failGame('Falha de rede do Godot: '+description+' ('+code+')');
 });
 gameView.webContents.on('render-process-gone',(_event,details)=>{
  failGame('O processo do editor terminou: '+details.reason+'.');
 });
 gameView.webContents.on('did-finish-load',()=>{
  if(gameLoading&&!gameFailed){
   const serial=gameLoadSerial;
   gameProbeTimer=setTimeout(()=>probeGodot(serial),1800);
  }
 });
}
function gameRect(data){
 if(!win||!gameView||!data||!data.visible||gameFailed){gameView?.setVisible(false);return;}
 const {x,y,width,height}=data;
 if(![x,y,width,height].every(Number.isFinite)||width<100||height<120){gameView.setVisible(false);return;}
 const [cw,ch]=win.getContentSize();
 const left=Math.max(0,Math.round(x)),top=Math.max(0,Math.round(y));
 const right=Math.min(cw,Math.round(x+width)),bottom=Math.min(ch,Math.round(y+height));
 if(right-left<100||bottom-top<80){gameView.setVisible(false);return;}
 const bounds={x:left,y:top,width:right-left,height:bottom-top};
 if(!gameBounds||Object.keys(bounds).some(k=>bounds[k]!==gameBounds[k])){
  gameView.setBounds(bounds);gameBounds=bounds;
 }
 gameView.setVisible(true);
 if(!gameStarted)loadGodot();
}
function fitGame(){
 if(!gameView||!gameBounds||gameView.webContents.isDestroyed())return;
 editorZoom=1;editorPan={x:0,y:0};
 gameView.webContents.setZoomFactor(1);
}
function gameAction(action){
 if(!gameView)return;
 switch(action){
  case 'fit':fitGame();break;
  case 'reload':loadGodot();break;
  case 'compatibility':restartGodotRenderer();break;
  case 'zoom-in':editorZoom=Math.min(2.5,editorZoom*1.15);gameView.webContents.setZoomFactor(editorZoom);break;
  case 'zoom-out':editorZoom=Math.max(.55,editorZoom/1.15);gameView.webContents.setZoomFactor(editorZoom);break;
  case 'browser':shell.openExternal(creator).catch(error=>gameStatus('error',String(error)));break;
  default:break;
 }
}
async function captureGame(){
 if(!gameView||!gameBounds||!gameStarted||gameFailed||gameLoading)return false;
 const img=await gameView.webContents.capturePage();
 if(img.isEmpty())return false;
 const png=img.toPNG();
 if(png.length>10*1024*1024)return false;
 capture='data:image/png;base64,'+png.toString('base64');
 win.webContents.send('mastermind:lyime-capture-ready');
 return true;
}
function makeWindow(){
 win=new BrowserWindow({title:'Mastermind — RPG',width:1440,height:900,minWidth:1024,minHeight:650,
  backgroundColor:'#101017',show:false,autoHideMenuBar:true,
  icon:path.join(assets,'mastermind_logo.png'),
  webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,
   webSecurity:true,webviewTag:false,backgroundThrottling:false}
 });
 win.loadFile(path.join(assets,'demo-offline.html'));
 win.webContents.on('did-finish-load',async()=>{
  if(!win||win.webContents.isDestroyed())return;
  try{
   const css=fs.readFileSync(path.join(__dirname,'desktop.css'),'utf8');
   const js=fs.readFileSync(path.join(__dirname,'renderer.js'),'utf8');
   const mestragem=fs.readFileSync(path.join(__dirname,'mestragem-linux.js'),'utf8');
   await win.webContents.insertCSS(css);
   await win.webContents.executeJavaScript(js,true);
   await win.webContents.executeJavaScript(mestragem,true);
  }catch(error){console.error('Desktop integration:',error);}
 });
 win.once('ready-to-show',()=>{win.show();if(process.platform==='linux'&&process.env.MASTERMIND_MAXIMIZED==='1')win.maximize();});
 win.on('closed',()=>{win=null;gameView=null;gameStarted=false;});
 win.webContents.setWindowOpenHandler(({url})=>{
  if(/^https:\/\//.test(url))shell.openExternal(url).catch(()=>{});
  return {action:'deny'};
 });
 win.webContents.on('will-navigate',(event,url)=>{
  if(url!==require('node:url').pathToFileURL(path.join(assets,'demo-offline.html')).href)event.preventDefault();
 });
 const menu=Menu.buildFromTemplate([
  {label:'Arquivo',submenu:[
   {label:'Importar PDF...',click:()=>choosePdf()},
   {label:'Abrir pasta de dados',click:()=>shell.openPath(app.getPath('userData'))},
   {type:'separator'},{role:'quit',label:'Sair'}
  ]},
  {label:'Visualizar',submenu:[{role:'reload',label:'Recarregar interface'},{role:'resetZoom',label:'Zoom padrão'},{role:'zoomIn',label:'Aumentar zoom'},{role:'zoomOut',label:'Diminuir zoom'},{role:'togglefullscreen',label:'Tela cheia'}]},
  {label:'Ateliê',submenu:[{label:'Reenquadrar Godot',click:()=>gameAction('fit')},{label:'Capturar retrato',click:()=>captureGame()}]},
  {label:'Ajuda',submenu:[{label:'Sobre o Mastermind',click:()=>dialog.showMessageBox(win,{message:'Mastermind 1.0 — Linux',detail:'Mesma interface e recursos de RPG do Android. O editor lyime permanece online e isolado.'})}]}
 ]);
 Menu.setApplicationMenu(menu);
}
let savedPdf=null;
const bookIndex=require('./book-index.cjs'),bookProgress=new Map();
const catalogSystemIds=new Set(['custom','ordem-paranormal','d-d','gurps','chamado-de-ctchulhu']);
const validBookId=x=>typeof x==='string'&&/^book-[a-z0-9]+$/.test(x);
const bookFile=id=>path.join(stored(),id+'.pdf');
const bookMetaFile=()=>path.join(stored(),'index.json');
function informBook(id,status){bookProgress.set(id,status);if(win&&!win.isDestroyed())win.webContents.send('mastermind:book-index',{id,...status});}
async function listBooks(){
 try{
  const arr=JSON.parse(await fs.promises.readFile(bookMetaFile(),'utf8'));
  return Array.isArray(arr)?arr.filter(x=>validBookId(x.id)&&typeof x.name==='string').map(x=>({
   id:x.id,name:x.name,systemId:catalogSystemIds.has(x.systemId)?x.systemId:'custom',
   available:true,storage:'desktop',size:x.size||0,addedAt:x.addedAt||0
  })):[];
 }catch{return [];}
}
async function saveBooks(list){await fs.promises.mkdir(stored(),{recursive:true});const temp=bookMetaFile()+'.tmp';await fs.promises.writeFile(temp,JSON.stringify(list,null,2));await fs.promises.rename(temp,bookMetaFile());}
async function getBook(id){if(!validBookId(id))return null;return (await listBooks()).find(b=>b.id===id)||null;}
async function indexBook(id){
 const book=await getBook(id);if(!book)throw Error('Livro não encontrado');
 informBook(id,{state:'indexing',done:0,total:0});
 try{
  const index=await bookIndex.getIndex(stored(),id,bookFile(id),progress=>informBook(id,progress));
  if(index.pages.every(p=>!p.text))informBook(id,{state:'no_text',done:index.pages.length,total:index.totalPages});
  return {state:index.pages.some(p=>p.text)?'ready':'no_text',pages:index.totalPages};
 }catch(error){informBook(id,{state:'error',message:String(error.message||error).slice(0,210)});throw error;}
}
async function choosePdf(systemId='custom'){
 const result=await dialog.showOpenDialog(win,{title:'Adicionar livro PDF à biblioteca',properties:['openFile','multiSelections'],filters:[{name:'Livros PDF',extensions:['pdf']}]});
 if(result.canceled||!result.filePaths.length)return [];
 await fs.promises.mkdir(stored(),{recursive:true});
 const list=await listBooks(),added=[];
 for(const p of result.filePaths.slice(0,30)){
  const stat=await fs.promises.stat(p);
  if(stat.size<20||stat.size>250*1024*1024)throw Error('PDF excede 250 MB ou está vazio: '+path.basename(p));
  const fd=await fs.promises.open(p,'r');const head=Buffer.alloc(5);try{await fd.read(head,0,5,0);}finally{await fd.close();}
  if(head.toString('latin1')!=='%PDF-')throw Error('Arquivo não tem assinatura PDF: '+path.basename(p));
  const id='book-'+require('node:crypto').randomBytes(9).toString('hex');
  const dest=bookFile(id);
  await fs.promises.copyFile(p,dest);
  const meta={id,name:path.basename(p),available:true,storage:'desktop',systemId:catalogSystemIds.has(systemId)?systemId:'custom',size:stat.size,addedAt:Date.now()};
  list.push(meta);added.push(meta);savedPdf=meta;
 }
 await saveBooks(list);
 for(const meta of added){
  win.webContents.send('mastermind:pdf-selected',meta);
  // Background within the local desktop process; never uploads documents.
  setImmediate(()=>{indexBook(meta.id).catch(err=>console.warn('PDF index:',err.message));});
 }
 return added;
}
async function openPdf(id){
 const book=await getBook(id);if(!book)return false;
 const error=await shell.openPath(bookFile(id));if(error)throw Error(error);
 return true;
}
async function removeBook(id){
 const book=await getBook(id);if(!book)return false;
 const list=(await listBooks()).filter(b=>b.id!==id);await saveBooks(list);
 await bookIndex.deleteIndex(stored(),id);
 await fs.promises.rm(bookFile(id),{force:true});
 bookProgress.delete(id);if(savedPdf?.id===id)savedPdf=null;return true;
}
async function bookStatus(id){const book=await getBook(id);if(!book)return {state:'missing'};return bookProgress.get(id)||bookIndex.info(stored(),id,bookFile(id));}
async function searchPdf(id,query,limit=12,offset=0){
 const book=await getBook(id);if(!book)return {results:[],total:0,error:'Livro não encontrado'};
 if(!String(query||'').trim())return {results:[],total:0};
 try{
  const index=await bookIndex.getIndex(stored(),id,bookFile(id),p=>informBook(id,p));
  const result=bookIndex.searchIndex(index,query,limit,offset);
  return {...result,results:result.results.map(h=>({...h,title:book.name,bookId:id,systemId:book.systemId})),
   error:result.hasText?null:'Este PDF não possui texto selecionável; documento digitalizado requer OCR.'};
 }catch(e){return {results:[],total:0,error:'Falha ao ler o PDF: '+String(e.message||e)};}
}
async function searchBooks(query,systemId='all',limit=30){
 const books=(await listBooks()).filter(b=>systemId==='all'||b.systemId===systemId);
 const matches=[],errors=[];
 for(const book of books){
  const result=await searchPdf(book.id,query,30,0);
  if(result.error){errors.push(book.name+': '+result.error);continue;}
  matches.push(...result.results);
 }
 matches.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)||a.page-b.page);
 return {results:matches.slice(0,Math.max(1,Math.min(100,Number(limit)||30))),total:matches.length,books:books.length,errors:errors.slice(0,6)};
}
app.whenReady().then(()=>{
 app.setAppUserModelId('dev.rpgmesa.mastermind');
 const serverJar=app.isPackaged?path.join(process.resourcesPath,'server','mastermind-campaign-server.jar'):
   path.join(__dirname,'server','dist','mastermind-campaign-server.jar');
 const serverAssets=app.isPackaged?path.join(process.resourcesPath,'server','assets'):assets;
 hostManager=new CampaignHost({userData:app.getPath('userData'),assets:serverAssets,jar:serverJar});
 hostManager.on('change',status=>{
  if(win&&!win.webContents.isDestroyed())win.webContents.send('mastermind:campaign-status',status);
 });
 session.defaultSession.setPermissionRequestHandler((_web,permission,callback)=>callback(false));
 ipcMain.on('mastermind:sync',(event,{method,args=[]})=>{
  try{ensureLocal(event);if(method==='book-info')event.returnValue=JSON.stringify(savedPdf?{name:savedPdf.name,available:true,storage:'desktop'}:{available:false});
  else if(method==='capture') {event.returnValue=capture||'';capture=null;}
  else if(method==='campaign-status')event.returnValue=JSON.stringify(hostManager?.status()||{running:false,error:'Servidor indisponível'});
  else if(method==='campaign-key')event.returnValue=hostManager?.masterKey()||'';
  else event.returnValue='';
  }catch{event.returnValue='';}
 });
 ipcMain.handle('mastermind:action',async(event,{method,args=[]})=>{
  ensureLocal(event);
  switch(method){
   case 'save-png':return saveFile(args[0],args[1],'.png');
   case 'save-pdf':return saveFile(args[0],args[1],'.pdf');
   case 'pick-pdf':return choosePdf(args[0]);
    case 'index-book':return indexBook(args[0]);
    case 'book-status':return bookStatus(args[0]);
    case 'remove-book':return removeBook(args[0]);
    case 'search-library':return searchBooks(args[0],args[1],args[2]);
   case 'list-books':return listBooks();
   case 'search-book':return searchPdf(args[0],args[1],args[2],args[3]);
   case 'open-book':return openPdf(args[0]);
   case 'external':if(args[0]===creator)return shell.openExternal(creator);return false;
   case 'godot-bounds':createGame();gameRect(args[0]);return true;
   case 'godot-action':gameAction(args[0]);return true;
   case 'godot-capture':return captureGame();
   case 'campaign-start':return hostManager.start();
   case 'campaign-stop':return hostManager.stop();
   case 'campaign-status':return hostManager.status();
   case 'campaign-panel':
    if(!hostManager.status().running)throw Error('Inicie o servidor antes de abrir o painel.');
    return shell.openExternal(hostManager.status().masterUrl);
   case 'campaign-request':return hostManager.request(args[0]);
   case 'window-action':if(args[0]==='fullscreen')win.setFullScreen(!win.isFullScreen());return true;
   default:return false;
  }
 });
 makeWindow();
});
app.on('before-quit',()=>{stopGameProbes();hostManager?.stop();});
app.on('window-all-closed',()=>{app.quit();});
