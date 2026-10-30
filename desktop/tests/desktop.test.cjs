'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..','..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
const main=read('desktop/main.cjs'),preload=read('desktop/preload.cjs'),renderer=read('desktop/renderer.js'),css=read('desktop/desktop.css'),html=read('app/src/main/assets/demo-offline.html');
test('Linux AppImage and tar.gz packages preserve all original Android assets',()=>{
 assert.equal(pkg.main,'desktop/main.cjs');
 assert.equal(pkg.version,'1.1.7');
 assert.equal(pkg.build.linux.target[0].target,'AppImage');
 assert.equal(pkg.build.linux.target[1].target,'tar.gz');
 assert.ok(!pkg.build.files.some(x=>x.includes('app/src/main/assets')), 'No duplicate offline UI inside app.asar');
 assert.ok(pkg.build.extraResources.some(x=>x.from==='app/src/main/assets'&&x.to==='server/assets'), 'Full trusted assets remain present outside app.asar');
 assert.equal(pkg.build.compression,'maximum');
 assert.match(html,/id="screen-atelier85"/);
 assert.match(html,/id="p90-native-stage"/);
 assert.match(html,/id="p86-token"/);
 assert.match(html,/id="screen-library"/);
});
test('Linux native shell has sandboxed local RPG renderer and separate remote Godot',()=>{
 assert.match(main,/contextIsolation:true,sandbox:true/);
 assert.ok(main.includes("const packagedAssets=path.join(process.resourcesPath,'server','assets')"));
 assert.ok(main.includes('const assets=app.isPackaged ? packagedAssets : sourceAssets'));
 assert.match(main,/nodeIntegration:false/);
 assert.match(main,/webSecurity:true/);
 assert.match(main,/new WebContentsView/);
 assert.match(main,/partition:'persist:mastermind-lyime'/);
 assert.match(main,/win\.contentView\.addChildView\(gameView\)/);
 assert.match(main,/function gameRect\(/);
 assert.match(main,/gameView\.setBounds\(bounds\)/);
 assert.match(main,/gameView\.setVisible\(false\)/);
 assert.match(main,/resolveGameUrl\(\)/);
 assert.match(main,/gameView\.webContents\.capturePage\(\)/);
 assert.match(main,/mastermind:lyime-capture-ready/);
 assert.match(main,/setPermissionRequestHandler/);
 assert.match(main,/function ensureLocal\(/);
 assert.doesNotMatch(main,/addJavascriptInterface/);
 assert.match(preload,/contextBridge\.exposeInMainWorld\('MastermindDesktop'/);
 assert.doesNotMatch(preload,/exposeInMainWorld\('require'/);
});
test('Desktop mouse/keyboard, 1080p+ CSS, Godot and PDF controls',()=>{
 assert.match(main,/width:1440,height:900,minWidth:1024,minHeight:650/);
 assert.match(main,/desktop\.css/);
 assert.match(main,/renderer\.js/);
 assert.match(renderer,/desktop\.action\('godot-bounds',r\)/);
 assert.match(renderer,/desktop\.action\('godot-capture'\)/);
 assert.match(renderer,/mastermind:lyime-capture-ready/);
 assert.match(renderer,/document\.documentElement\.classList\.add\('mastermind-desktop'\)/);
 assert.match(renderer,/event\.key==='F11'/);
 assert.match(renderer,/event\.key\.toLowerCase\(\)==='k'/);
 assert.match(renderer,/desktop\.action\('pick-pdf',/);
 assert.match(renderer,/desktop\.action\('search-book'/);
 assert.match(css,/@media\(min-width:1500px\)/);
 assert.match(css,/@media\(min-width:2100px\)/);
 assert.match(css,/grid-template-columns:260px minmax\(0,1fr\)/);
 assert.match(css,/\.desktop-godot-tools/);
});
test('PDF, PNG and character persistence stay local',()=>{
 assert.match(main,/app\.getPath\('userData'\)/);
 assert.match(main,/path\.join\(stored\(\),'index\.json'\)/);
 assert.match(main,/showSaveDialog/);
 assert.match(main,/showOpenDialog/);
 assert.match(main,/book-index\.cjs/);
 assert.match(main,/case 'save-png'/);
 assert.match(main,/case 'save-pdf'/);
 assert.match(main,/case 'open-book'/);
 assert.match(preload,/RpgSheetPdfBridge/);
 assert.match(preload,/RpgPixelPortraitBridge/);
 assert.match(preload,/consumeCapture:\(\)=>sync\('capture'\)/);
});

test('Linux mestragem, fichas locais, grid e layout paisagem sem alterar o APK',()=>{
 const bridge=read('desktop/mestragem-linux.js');
 assert.match(main,/mestragem-linux\.js/);
 assert.match(bridge,/window\.MastermindCharacters/);
 assert.match(bridge,/window\.RPG16_GURPS/);
 assert.match(bridge,/window\.RPG18_DND/);
 assert.match(bridge,/mastermindLocalRef/);
 assert.match(bridge,/request\(id,'\/assign','POST'/);
 assert.match(bridge,/window\.RpgLocalHost\.start\(\)/);
 assert.match(bridge,/mastermind-linux-landscape-v1/);
 assert.match(bridge,/mastermind-linux-landscape/);
 assert.match(css,/#r12-host-controls\{display:none!important\}/);
 assert.match(css,/\.r30-world>\.r30-grid/);
 assert.match(css,/z-index:17!important/);
 assert.match(css,/background-size:48px 48px!important/);
 assert.match(css,/\.mastermind-landscape/);
 assert.match(read('app/src/main/assets/rpg11_campaigns.js'),/Servidor neste celular/);
});

test('Windows desktop installer and portable include offline assets and Java 17 runtime',()=>{
 assert.equal(pkg.build.win.target[0].target,'nsis');
 assert.equal(pkg.build.win.target[1].target,'portable');
 assert.match(pkg.build.nsis.artifactName,/Setup/);
 assert.match(pkg.build.portable.artifactName,/Portable/);
 assert.ok(pkg.build.extraResources.some(x=>x.to==='runtime/windows'));
 assert.ok(pkg.build.extraResources.some(x=>x.to==='server/assets'));
 assert.ok(pkg.build.extraResources.some(x=>x.to==='server/mastermind-campaign-server.jar'));
 assert.ok(main.includes("'runtime','windows','bin','java.exe'"));
 assert.ok(preload.includes('platform:process.platform'));
 assert.ok(renderer.includes("desktop.platform==='win32'"));
 assert.ok(main.includes('const assets=app.isPackaged ? packagedAssets : sourceAssets'));
 assert.ok(main.includes('mastermind-campaign-server.jar'));
});

test('Atelie checks rendered pixels and exposes recovery instead of masking a black screen',()=>{
 assert.match(main,/frameHasDetail\(frame\)/);
 assert.match(main,/failGame\(/);
 assert.match(main,/gameView\.setVisible\(false\)/);
 assert.match(main,/godot-software-renderer\.flag/);
 assert.match(main,/gameLoadSerial/);
 assert.match(main,/case 'compatibility'/);
 assert.match(renderer,/Compatibilidade/);
 assert.match(renderer,/Navegador/);
 assert.match(renderer,/desktop\.onGodotStatus/);
 assert.ok(!main.includes("gameLoading=false;});"),'Godot nao deve ser marcado pronto logo apos loadURL');
});

test('Lean Electron package preserves all app entrypoints and native services',()=>{
 for(const item of ['desktop/*.cjs','desktop/*.js','desktop/*.css','package.json'])assert.ok(pkg.build.files.includes(item));
 const resources=pkg.build.extraResources;
 assert.ok(resources.some(x=>x.from==='desktop/server/dist/mastermind-campaign-server.jar'));
 assert.ok(resources.some(x=>x.from==='app/src/main/assets'&&x.filter.includes('**/*')));
 assert.match(main,/const assets=app.isPackaged \? packagedAssets : sourceAssets/);
 assert.match(main,/new WebContentsView/);
 assert.match(main,/function gameRect\(/);
 assert.match(main,/function captureGame\(/);
 assert.match(main,/function makeWindow\(/);
});

test('PDF progress event is exposed by preload before the desktop library subscribes',()=>{
 assert.match(preload,/onBookIndex:callback=>ipcRenderer\.on\('mastermind:book-index'/);
 assert.match(renderer,/desktop\.onBookIndex\(/);
 assert.match(main,/function informBook\(/);
 assert.match(main,/mastermind:book-index/);
});
