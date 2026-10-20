'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'../app/src/main/assets');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const core=read('rpg20_search_core.js'),ui=read('rpg26_offline_search_ui.js'),html=read('demo-offline.html');
assert.doesNotThrow(()=>new Function(core));
assert.doesNotThrow(()=>new Function(ui));
const sandbox={window:{}};
vm.runInNewContext(core,sandbox);
vm.runInNewContext(read('rpg19_order_creatures.js'),sandbox);
const creatures=sandbox.window.RPG19_ORDER_CREATURES;
const docs=sandbox.window.RPG20_SEARCH.makeCreatureDocs(creatures);
assert.ok(creatures.length>=40,'all known creatures searchable');
assert.equal(docs.length,creatures.length);
const arc=docs.find(d=>sandbox.window.RPG20_SEARCH.norm(d.title)==='aracnasita');
assert.ok(arc,'Aracnasita from real bestiary is discoverable');
assert.equal(arc.systemId,'ordem-paranormal');
assert.ok(arc.page>=1,'page reference included');
const matches=sandbox.window.RPG20_SEARCH.search('aracnasita',{docs,systemId:'all',systems:[]});
assert.ok(matches.length>0,'literal bestiary search returns a hit');
assert.match(ui,/core\.makeCreatureDocs\(window\.RPG19_ORDER_CREATURES\)/);
assert.match(ui,/const native=\(\)=>window\.RpgBookBridge/);
assert.match(ui,/pdfIndexStatus\(\)/);
assert.match(ui,/indexSavedPdf\(\)/);
assert.match(ui,/searchPdf\(query,20,offset\)/);
assert.match(ui,/function renderPdfResults\(query,offset=0,append=false\)/);
assert.match(ui,/id='r45-pdf-hits'/);
assert.match(ui,/data-r45-page/);
assert.match(ui,/function openPdfHit\(page\)/);
assert.match(ui,/renderIndexPage\(page\)/);
assert.match(ui,/rpg-page-rendered/);
assert.match(ui,/setInterval\(\(\)=>showIndexStatus\(false\),1500\)/);
assert.match(html,/mastermind45_pdf_search\.css/);
const native=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/PdfTextSearch.java'),'utf8');
const activity=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
for(const term of ['SQLiteOpenHelper','CREATE VIRTUAL TABLE page_fts USING fts4','PDFTextStripper',
 'setStartPage(i)','setEndPage(i)','PDFBoxResourceLoader.init','openInputStream','page_fts MATCH ?',
 'Normalizer.normalize','progress=i','result.put("total",candidates.size())']){
 assert.ok(native.includes(term),term);
}
for(const field of ['pdfIndexStatus','indexSavedPdf','searchPdf','renderIndexPage','ensureIndex(uri.toString(),name,true)']){
 assert.ok(activity.includes(field),field);
}
assert.ok(!native.includes('HttpURLConnection'),'index stays on device');
assert.ok(native.includes('No uploading, OCR, AI or asset bundling'),'clearly marks no OCR support'); 
const gradle=fs.readFileSync(path.join(__dirname,'../app/build.gradle'),'utf8');
assert.match(gradle,/com\.tom-roush:pdfbox-android:2\.0\.27\.0/);
assert.ok(Number(gradle.match(/versionCode ([0-9]+)/)?.[1])>=45,'PDF search available in v45+');
console.log('PASS v0.45: Aracnasita in catalog, PDF native FTS, indexed pages, renderer and no network access');
