'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'../../');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const main=read('desktop/main.cjs');
const preload=read('desktop/preload.cjs');
const css=read('desktop/desktop.css');
const ui=read('desktop/desktop-ui.js');
const html=read('app/src/main/assets/demo-offline.html');
const pkg=JSON.parse(read('desktop/package.json'));
const {BookCatalog,normalize,terms}=require('../book-catalog.cjs');

test('same RPG core: sheets, rules, Godot, canvas, table, bestiary, themes and library',()=>{
  for(const id of ['screen-home','screen-library','screen-sheet','screen-atelier85',
    'screen-ai','screen-canvas','screen-master','screen-bestiary','screen-settings']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(fs.existsSync(path.join(root,'app/src/main/assets/rpg31_master_table.js')));
  assert.ok(fs.existsSync(path.join(root,'app/src/main/assets/rpg29_scene_editor.js')));
  assert.ok(fs.existsSync(path.join(root,'app/src/main/assets/rpg16_gurps_traits.js')));
  assert.ok(fs.existsSync(path.join(root,'app/src/main/assets/mastermind66_grimoire_engine.js')));
  assert.match(html,/p90-native-stage/);
  assert.match(html,/MastermindCharacters/);
});
test('native sandbox and separate Godot renderer with strict website handling',()=>{
  assert.match(main,/nodeIntegration:false,contextIsolation:true,sandbox:true/);
  assert.match(main,/partition:'persist:mastermind-lyime'/);
  assert.match(main,/webviewTag:false/);
  assert.match(main,/new WebContentsView/);
  assert.match(main,/new View\(\)/);
  assert.match(main,/getContentBounds/);
  assert.match(main,/removeChildView\(gameClip\)/);
  assert.match(main,/LYIME_REGEX/);
  assert.match(main,/mastermind:stage-bounds/);
  assert.match(main,/capturePage\(\)/);
  assert.match(read('desktop/book-catalog.cjs'),/disableFontFace/);
});
test('desktop layout covers ALL primary screens and 1366/1920 resolutions',()=>{
  for(const id of ['#screen-sheet','#screen-ai','#screen-canvas','#screen-master',
    '#screen-bestiary','#screen-settings','#screen-atelier85']){
    assert.ok(css.includes(id),id);
  }
  assert.match(css,/@media\(min-width:1750px\)/);
  assert.match(css,/@media\(max-width:1370px\)/);
  assert.match(css,/@media\(max-width:1090px\)/);
  assert.match(css,/r31-live \.body/);
  assert.match(css,/mm39-home/);
  assert.match(css,/books-grid/);
  assert.match(css,/p90-native-stage/);
  assert.match(ui,/stagePosition\(\{visible,full,clip/);
  assert.match(ui,/Ctrl\+1/);
  assert.match(preload,/document\.documentElement\.classList\.add\('mm-linux'\)/);
  assert.match(preload,/mastermind_linux\.css/);
  assert.match(preload,/mastermind_linux\.js/);
});
test('desktop bridges preserve exports and local book APIs',()=>{
  for(const api of ['RpgBookBridge','RpgSheetPdfBridge','RpgPixelPortraitBridge']){
    assert.ok(preload.includes("'"+api+"'"));
  }
  assert.match(preload,/savePdf\(/);
  assert.match(preload,/savePng\(/);
  assert.match(preload,/pickPdfForSystem/);
  assert.match(preload,/renderPersonalBookPage/);
  assert.match(main,/dialog\.showSaveDialog/);
  assert.match(main,/dialog\.showOpenDialog/);
  assert.match(main,/PDF-'/);
  assert.match(main,/89504e470d0a1a0a/);
  assert.match(preload,/mastermind:books-sync/);
});
test('pdf text ranking finds exact page and accent-insensitive query',async()=>{
  assert.equal(normalize('Iniciativa e MÚSCULOS'),'iniciativa e musculos');
  assert.ok(terms('Como funciona o descanso na Ordem?').includes('descanso'));
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'mastermind-pdf-test-'));
  try{
    const catalog=new BookCatalog(directory);
    const id='a'.repeat(24);
    catalog.books=[{id,name:'Manual pessoal',systemId:'ordem-paranormal',state:'ready',
      pages:3,progress:3,readable:3}];
    catalog.persist();
    await fsp.writeFile(catalog.pagesFor(id),JSON.stringify([
      'O ritual de descanso recupera pontos de esforço em uma cena de pausa.',
      'A iniciativa é utilizada antes de iniciar o combate em uma campanha.',
      'A perícia ocultismo é uma forma de conhecimento arcano.'
    ]));
    const answer=catalog.search(id,'Como funciona o descanso?',10,0);
    assert.equal(answer.state,'ready');
    assert.equal(answer.total,1);
    assert.equal(answer.hits[0].page,1);
    assert.match(answer.hits[0].excerpt,/ritual de descanso/);
    assert.equal(catalog.search(id,'ocultísmo',5).hits[0].page,3);
    const second=new BookCatalog(directory);
    assert.equal(second.list().length,1);
    assert.equal(second.status(id).state,'ready');
  }finally{await fsp.rm(directory,{recursive:true,force:true})}
});
test('desktop builder publishes AppImage + tar.gz from all Android web assets',()=>{
  assert.equal(pkg.name,'mastermind-linux');
  assert.equal(pkg.build.appId,'dev.mastermind.rpg');
  assert.ok(pkg.build.extraResources.find(r=>r.to==='web'&&r.from.includes('app/src/main/assets')));
  assert.ok(pkg.build.extraResources.find(r=>r.to==='web/mastermind_linux.css'));
  assert.ok(pkg.build.linux.target.some(t=>t.target==='AppImage'));
  assert.ok(pkg.build.linux.target.some(t=>t.target==='tar.gz'));
  assert.match(pkg.scripts['dist:linux'],/electron-builder/);
});
