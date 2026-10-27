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
const assets=path.join(__dirname,'..','app','src','main','assets');
const creator='https://lyime.itch.io/pixel-portrait-creator';
const gameFallback='https://html.itch.zone/html/18379448/index.html?v=1785079497';
let win,gameView,gameStarted=false,gameLoading=false,gameBounds=null,editorZoom=1,editorPan={x:0,y:0},capture=null;
let hostManager=null;
const allowedExt=new Set(['.png','.pdf','.json']);
const stored=()=>path.join(app.getPath('userData'),'mastermind-books');
function safeName(value,ext){
 const name=String(value||'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
 if(!name||!name.toLowerCase().endsWith(ext))throw Error('Nome inválido');
 return name;
}
function ensureLocal(event){if(!win||event.sender!==win.webContents||event.sender.getURL()!==require('node:url').pathToFileURL(path.join(assets,'demo-offline.html')).href)throw Error('Requisição externa bloqueada');}
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
 gameView.webContents.on('did-fail-load',(_event,code,description,isMainFrame)=>{
  if(isMainFrame&&win)win.webContents.send('mastermind:godot-status',{status:'error',message:description,code});
 });
 gameView.webContents.on('did-finish-load',()=>{
  if(win)win.webContents.send('mastermind:godot-status',{status:'ready'});
  fitGame();
 });
}
function gameRect(data){
 if(!win||!gameView||!data||!data.visible){gameView?.setVisible(false);return;}
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
 if(!gameStarted){
  gameStarted=true;gameLoading=true;
  resolveGameUrl().then(url=>{
   if(!gameView||gameView.webContents.isDestroyed())return;
   return gameView.webContents.loadURL(url);
  }).catch(error=>{
   win?.webContents.send('mastermind:godot-status',{status:'error',message:String(error.message||error)});
  }).finally(()=>{gameLoading=false;});
 }
}
function fitGame(){
 if(!gameView||!gameBounds||gameView.webContents.isDestroyed())return;
 editorZoom=1;editorPan={x:0,y:0};
 gameView.webContents.setZoomFactor(1);
 gameView.webContents.executeJavaScript(
  "(function(){const c=document.getElementById('canvas');if(!c)return;"+
  "const r=c.getBoundingClientRect();const w=innerWidth,h=innerHeight;"+
  "const scale=Math.min((w-12)/Math.max(1,r.width),(h-12)/Math.max(1,r.height));"+
  "if(scale<0.4||scale>3.0)return;"+
  "document.documentElement.style.overflow='hidden';"+
  "const dx=(w-r.width*scale)/2-r.left*scale;"+
  "const dy=(h-r.height*scale)/2-r.top*scale;"+
  "document.body.style.transformOrigin='0 0';"+
  "document.body.style.transform='translate('+dx+'px,'+dy+'px) scale('+scale+')';"+
  "})()",true
 ).catch(()=>{});
}
function gameAction(action){
 if(!gameView)return;
 switch(action){
  case 'fit':fitGame();break;
  case 'reload':gameView.webContents.reloadIgnoringCache();break;
  case 'zoom-in':editorZoom=Math.min(2.5,editorZoom*1.15);gameView.webContents.setZoomFactor(editorZoom);break;
  case 'zoom-out':editorZoom=Math.max(.55,editorZoom/1.15);gameView.webContents.setZoomFactor(editorZoom);break;
  case 'browser':shell.openExternal(creator);break;
  default:break;
 }
}
async function captureGame(){
 if(!gameView||!gameBounds||!gameStarted)return false;
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
   await win.webContents.insertCSS(css);
   await win.webContents.executeJavaScript(js,true);
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
async function choosePdf(){
 const result=await dialog.showOpenDialog(win,{title:'Adicionar livro PDF',properties:['openFile'],filters:[{name:'PDF',extensions:['pdf']}]});
 if(result.canceled||!result.filePaths[0])return;
 const p=result.filePaths[0],stat=await fs.promises.stat(p);
 if(stat.size>250*1024*1024)throw Error('PDF acima de 250 MB');
 await fs.promises.mkdir(stored(),{recursive:true});
 const id='book-'+Date.now().toString(36);
 const dest=path.join(stored(),id+'.pdf');
 await fs.promises.copyFile(p,dest);
 const meta={id,name:path.basename(p),available:true,storage:'desktop',path:dest,systemId:'custom'};
 const records=await listBooks();
 records.push(meta);
 await fs.promises.writeFile(path.join(stored(),'index.json'),JSON.stringify(records,null,2));
 savedPdf=meta;
 win.webContents.send('mastermind:pdf-selected',meta);
 return meta;
}
async function listBooks(){
 try{
  const arr=JSON.parse(await fs.promises.readFile(path.join(stored(),'index.json'),'utf8'));
  return Array.isArray(arr)?arr.filter(x=>typeof x.id==='string'&&/^book-[a-z0-9]+$/.test(x.id)): [];
 }catch{return [];}
}
function loadBookFile(meta){return path.join(stored(),safeName(meta.id,'.pdf'));}
async function openPdf(id){
 const records=await listBooks();
 const book=records.find(x=>x.id===id)||savedPdf;
 if(!book)return false;
 const file=path.join(stored(),book.id+'.pdf');
 await shell.openPath(file);
 return true;
}
async function searchPdf(id,query,limit=10,offset=0){
 const records=await listBooks(),book=records.find(x=>x.id===id)||savedPdf;
 if(!book)return {results:[],total:0,error:'Nenhum livro importado'};
 const file=path.join(stored(),book.id+'.pdf');
 // Desktop v1: text index via poppler pdftotext when installed.
 const {execFile}=require('node:child_process');
 const txt=await new Promise((resolve,reject)=>execFile('pdftotext',['-layout',file,'-'],{timeout:20000,maxBuffer:20*1024*1024},(err,stdout)=>err?reject(err):resolve(stdout))).catch(()=>null);
 if(txt===null)return {results:[],total:0,error:'Instale poppler (pacman -S poppler) para pesquisar PDFs locais'};
 const words=String(query||'').toLocaleLowerCase('pt-BR').trim().split(/\s+/).filter(x=>x.length>2).slice(0,10);
 if(!words.length)return {results:[],total:0};
 const pages=txt.split('\f');
 const matches=[];
 pages.forEach((page,index)=>{
  const text=page.replace(/\s+/g,' ').trim();
  if(!text)return;
  const lower=text.toLocaleLowerCase('pt-BR');
  const score=words.filter(w=>lower.includes(w)).length;
  if(score===0)return;
  const first=Math.max(0,lower.indexOf(words.find(w=>lower.includes(w))));
  matches.push({page:index+1,pageNumber:index+1,printedPage:index+1,score,excerpt:text.slice(Math.max(0,first-130),first+370),text:text.slice(Math.max(0,first-130),first+370),title:book.name});
 });
 matches.sort((a,b)=>b.score-a.score);
 return {results:matches.slice(offset,offset+limit),total:matches.length};
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
   case 'pick-pdf':return choosePdf();
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
app.on('before-quit',()=>{hostManager?.stop();});
app.on('window-all-closed',()=>{app.quit();});
