'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../app/src/main'),assets=path.join(root,'assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const act=fs.readFileSync(path.join(root,'java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
const native=fs.readFileSync(path.join(root,'java/dev/rpgmesa/demo/PdfTextSearch.java'),'utf8');
const html=read('demo-offline.html'),catalog=read('rpg15_catalog.js'),ui=read('mastermind51_private_books.js');
const testJS=()=>assert.doesNotThrow(()=>new Function(ui));
testJS();
const s={window:{}};vm.runInNewContext(read('rpg15_catalog_data.js'),s);
const systems=s.window.RPG15_SYSTEMS.systems;
assert.equal(systems.length,39,'39 system slots available');
assert.ok(systems.some(x=>x.id==='d-d'&&x.books.length>=9));
assert.match(native,/PdfTextSearch\(Context ctx,String bookId\)/);
assert.match(native,/mastermind_pdf_text_v51_/);
assert.match(native,/bookId!=null&&!bookId\.matches/,'DB filename sanitized');
for(const str of ['PERSONAL_PDF_LIBRARY','rememberPersonalBook','listPersonalBooks','personalBookStatus',
 'pickPdfForSystem','searchPersonalBook','renderPersonalBookPage','openPersonalBook','indexPersonalBook',
 'findPersonalBook','personalBookListing','legacy-ordem','currentOrderSearcher',
 'Intent.ACTION_OPEN_DOCUMENT','takePersistableUriPermission','rpg-private-book-added',
 'searcherFor(bookId).ensureIndex','ConcurrentHashMap']){
 assert.ok(act.includes(str),'missing '+str);
}
assert.match(act,/private String pendingBookSystemId="ordem-paranormal"/);
assert.match(act,/String systemId=pendingBookSystemId/);
assert.match(act,/entry\.put\("systemId",systemId\)/);
assert.match(act,/current\.length\(\)>=100/);
assert.match(act,/rpg-private-page-rendered/);
assert.match(act,/if\("ordem-paranormal"\.equals\(systemId\)\)/);
assert.doesNotMatch(act,/pdfTextSearch\.ensureIndex\(uri\.toString\(\),name,false\)/,'must not index OP twice');
assert.match(catalog,/id="r51-book-library"/);
assert.match(catalog,/mastermind:system-open/);
for(const k of ['RpgBookBridge','pickPdfForSystem','listPersonalBooks','personalBookStatus',
 'searchPersonalBook','renderPersonalBookPage','openPersonalBook',
 'rpg-private-page-rendered','rpg-private-book-added','booksFor','manualForm','localStorage']){
 assert.ok(ui.includes(k),'missing UI '+k);
}
assert.match(ui,/scope\(\)/);
assert.match(ui,/booksFor\(scope\(\)\)/);
assert.match(ui,/unsupported=id=>validSys\(id\)/);
assert.match(ui,/Não há correspondências|Ainda não há correspondências/);
assert.match(ui,/data-r51-status/);
assert.match(ui,/mastermind51-custom-sheets/);
assert.match(ui,/As regras específicas ainda precisam ser cadastradas e verificadas/);
assert.match(html,/src="mastermind51_private_books\.js"/);
assert.match(html,/href="mastermind51_private_books\.css"/);
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(gradle,/versionCode 51/);
assert.match(gradle,/applicationId 'dev\.rpgmesa\.demo'/);
console.log('PASS v0.51: D&D PDF import, multibook indexes per system, legacy OP migration, manual sheets and no bundled PDFs');
