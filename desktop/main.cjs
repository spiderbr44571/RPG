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
const {createHost}=require('./campaign-server.cjs');
const assets=path.join(__dirname,'..','app','src','main','assets');
const creator='https://lyime.itch.io/pixel-portrait-creator';
const gameFallback='https://html.itch.zone/html/18379448/index.html?v=1785079497';
let win,gameView,gameStarted=false,gameLoading=false,gameBounds=null,editorZoom=1,editorPan={x:0,y:0},capture=null;
let gmHost=null,gmWindow=null,godotWindow=null,godotTimer=null,gameLastError='';
function reportGodot(status,message){
 if(win&&!win.isDestroyed())win.webContents.send('mastermind:godot-status',{status,message:message||''});
}
function sanitizeError(error){return String(error?.message||error||'Erro desconhecido').slice(0,200);}
async function startGmServer(){
 if(gmHost?.active)return gmInfo();
 const host=createHost({assetsDir:assets,dataDir:path.join(app.getPath('userData'),'mastermind-gm'),port:8765,host:'0.0.0.0'});
 try{await host.start();gmHost=host;}
 catch(e){throw Error('Não foi possível abrir a porta 8765: '+sanitizeError(e));}
 return gmInfo();
}
function gmInfo(){
 return gmHost?.active?{active:true,url:gmHost.url,lanUrl:gmHost.lanUrl,ip:gmHost.ip,port:gmHost.port,key:gmHost.key}:
  {active:false,url:'',lanUrl:'',ip:'',port:0,key:''};
}
async function openGmConsole(){
 const status=await startGmServer();
 if(gmWindow&&!gmWindow.isDestroyed()){gmWindow.show();gmWindow.focus();return status;}
 gmWindow=new BrowserWindow({
   title:'Mastermind · Mestragem e mapas',width:1350,height:900,minWidth:850,minHeight:620,
   backgroundColor:'#17121d',autoHideMenuBar:true,icon:path.join(assets,'mastermind_logo.png'),
   webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
 });
 gmWindow.webContents.setWindowOpenHandler(({url})=>{
   if(/^http:\/\/\d{1,3}(?:\.\d{1,3}){3}:8765\//.test(url))shell.openExternal(url).catch(()=>{});
   return {action:'deny'};
 });
 await gmWindow.loadURL(status.url);
 // Master login remains on the loopback-only, trusted page. Key is never
 // exposed via the HTTP API or to players, and remains in userData locally.
 gmWindow.webContents.executeJavaScript(
  "(function(){const key=document.getElementById('key'),login=document.getElementById('sign');"+
  "if(key&&login){key.value="+JSON.stringify(status.key)+";login.click();}})()",true).catch(()=>{});
 gmWindow.on('closed',()=>{gmWindow=null;});
 return status;
}
async function stopGmServer(){
 if(gmWindow&&!gmWindow.isDestroyed()){gmWindow.close();gmWindow=null;}
 if(gmHost){await gmHost.close();gmHost=null;}
 return gmInfo();
}

const allowedExt=new Set(['.png','.pdf','.json']);
const stored=()=>path.join(app.getPath('userData'),'mastermind-books');
function safeName(value,ext){
 const name=String(value||'').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
 if(!name||!name.toLowerCase().endsWith(ext))throw Error('Nome inválido');
 return name;
}
function ensureLocal(event){
 if(!win||event.sender!==win.webContents)throw Error('Requisição externa bloqueada');
 // Mastermind uses history.replaceState('#screen') for navigation. The fragment
 // must not invalidate the IPC origin check for the SAME local HTML document.
 const current=new URL(event.sender.getURL());
 const trusted=require('node:url').pathToFileURL(path.join(assets,'demo-offline.html'));
 if(current.protocol!=='file:'||current.hostname!==trusted.hostname||current.pathname!==trusted.pathname)
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
 gameView.webContents.on('did-start-loading',()=>reportGodot('loading','Carregando Godot HTML5 original...'));
 gameView.webContents.on('did-fail-load',(_event,code,description,isMainFrame)=>{
  if(isMainFrame&&code!==-3){gameLastError=description;reportGodot('error',description);}
 });
 gameView.webContents.on('render-process-gone',(_e,details)=>{
  gameLastError='O processo gráfico do Godot encerrou: '+details.reason;
  reportGodot('error',gameLastError);
 });
 gameView.webContents.on('did-finish-load',()=>{
  reportGodot('ready','Página HTML5 carregada; inicializando Godot/WebAssembly...');
  if(godotTimer)clearTimeout(godotTimer);
  // Game runtime starts after the HTML; do not remove the fallback on timeout.
  godotTimer=setTimeout(async()=>{
   if(!gameView||gameView.webContents.isDestroyed()||!gameView.getVisible())return;
   try{
    const status=await gameView.webContents.executeJavaScript(
     "(function(){const c=document.getElementById('canvas');"+
     "return {canvas:!!c,width:c?.width||0,height:c?.height||0,"+
     "error:(document.querySelector('#status')?.textContent||'').slice(0,140)}})()",true);
    if(status?.canvas&&status.width>0&&status.height>0){
     reportGodot('ready','Canvas do Godot disponível — personalize seu personagem.');
     fitGame();
    }else{
     reportGodot('warning','O jogo ainda não iniciou. Tente Recarregar ou Abrir em janela.');
    }
   }catch(error){reportGodot('error','Falha no motor Godot: '+sanitizeError(error));}
  },28000);
  setTimeout(()=>{fitGame();},1500);
 });
}
function gameRect(data){
 if(!win||!data||!data.visible){gameView?.setVisible(false);return;}
 if(!gameView)createGame();
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
  gameStarted=true;gameLoading=true;gameLastError='';
  reportGodot('loading','Conectando ao editor original do lyime...');
  resolveGameUrl().then(url=>{
   if(!gameView||gameView.webContents.isDestroyed())return;
   reportGodot('loading','Baixando o Godot HTML5 (aproximadamente 40 MB)...');
   return gameView.webContents.loadURL(url);
  }).catch(error=>{
   gameLastError=sanitizeError(error);
   reportGodot('error',gameLastError+' — use Recarregar ou Abrir em janela.');
  }).finally(()=>{gameLoading=false;});
 }
}
function fitGame(){
 if(!gameView||!gameBounds||gameView.webContents.isDestroyed())return;
 // Electron's browser zoom preserves click coordinates; scaling document.body
 // with CSS transformed the Godot canvas and could make selection inaccurate.
 gameView.webContents.executeJavaScript(
  "(function(){const c=document.getElementById('canvas');"+
  "if(!c)return null;const r=c.getBoundingClientRect();"+
  "return {w:r.width,h:r.height,vw:innerWidth,vh:innerHeight};})()",true
 ).then(v=>{
  if(!gameView||!v||v.w<10||v.h<10)return;
  const ratio=Math.min((v.vw-18)/v.w,(v.vh-18)/v.h);
  editorZoom=Math.max(.7,Math.min(1.8,ratio));
  gameView.webContents.setZoomFactor(editorZoom);
 }).catch(error=>console.warn('Godot fit unavailable:',sanitizeError(error)));
}
async function openGodotWindow(){
 if(godotWindow&&!godotWindow.isDestroyed()){godotWindow.show();godotWindow.focus();return true;}
 godotWindow=new BrowserWindow({
  title:'Mastermind · Pixel Portrait Creator',
  width:1080,height:900,minWidth:700,minHeight:550,
  icon:path.join(assets,'mastermind_logo.png'),
  backgroundColor:'#1a1722',
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
 });
 godotWindow.webContents.setWindowOpenHandler(({url})=>{
  if(trustedGame(url))shell.openExternal(url).catch(()=>{});
  return {action:'deny'};
 });
 godotWindow.webContents.on('will-navigate',(event,url)=>{
  if(!trustedGame(url))event.preventDefault();
 });
 godotWindow.webContents.on('did-fail-load',(_e,code,description,isMainFrame)=>{
  if(isMainFrame&&code!==-3)reportGodot('error','Janela do Godot: '+description);
 });
 godotWindow.on('closed',()=>{godotWindow=null;});
 try{await godotWindow.loadURL(await resolveGameUrl());return true;}
 catch(error){reportGodot('error','Falha também na janela: '+sanitizeError(error));return false;}
}
function gameAction(action){
 if(!gameView&&action!=='browser'&&action!=='window')createGame();
 if(action==='browser'){shell.openExternal(creator).catch(()=>{});return;}
 if(action==='window'){openGodotWindow().catch(console.error);return;}
 if(!gameView)return;
 switch(action){
  case 'fit':fitGame();break;
  case 'reload':
   if(gameView.webContents.getURL())gameView.webContents.reloadIgnoringCache();
   else{gameStarted=false;gameRect({visible:true,...gameBounds});}
   reportGodot('loading','Recarregando o Godot...');
   break;
  case 'zoom-in':editorZoom=Math.min(2.5,editorZoom*1.15);gameView.webContents.setZoomFactor(editorZoom);break;
  case 'zoom-out':editorZoom=Math.max(.55,editorZoom/1.15);gameView.webContents.setZoomFactor(editorZoom);break;
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
 session.defaultSession.setPermissionRequestHandler((_web,permission,callback)=>callback(false));
 ipcMain.on('mastermind:sync',(event,{method,args=[]})=>{
  try{ensureLocal(event);if(method==='book-info')event.returnValue=JSON.stringify(savedPdf?{name:savedPdf.name,available:true,storage:'desktop'}:{available:false});
  else if(method==='capture') {event.returnValue=capture||'';capture=null;}
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
   case 'gm-start':return startGmServer();
   case 'gm-status':return gmInfo();
   case 'gm-open':return openGmConsole();
   case 'gm-stop':return stopGmServer();
   case 'external':if(args[0]===creator)return shell.openExternal(creator);return false;
   case 'godot-bounds':createGame();gameRect(args[0]);return true;
   case 'godot-action':gameAction(args[0]);return true;
   case 'godot-capture':return captureGame();
   case 'window-action':if(args[0]==='fullscreen')win.setFullScreen(!win.isFullScreen());return true;
   default:return false;
  }
 });
 makeWindow();
});
app.on('before-quit',()=>{
 if(gmHost?.active){gmHost.close().catch(console.error);gmHost=null;}
 if(godotTimer)clearTimeout(godotTimer);
});
app.on('window-all-closed',()=>{app.quit();});
