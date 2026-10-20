'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('demo-offline.html'),ui=read('rpg26_offline_search_ui.js'),data=read('rpg15_catalog_data.js');
assert.doesNotThrow(()=>new Function(ui));
const indexes=['rpg15_catalog_data.js','rpg16_gurps_engine.js','rpg18_dnd_engine.js','rpg19_order_creatures.js','rpg26_offline_search_ui.js','rpg15_catalog.js'];
for(const file of indexes)assert.equal(html.split('<script src="'+file+'"></script>').length-1,1,file+' must load exactly once');
for(const file of indexes.slice(0,4)){
 assert.ok(html.indexOf('<script src="'+file+'"></script>')<html.indexOf('<script src="rpg26_offline_search_ui.js"></script>'),
 file+' must load before search is initialized');
}
const sandbox={window:{}};
vm.runInNewContext(data,sandbox);
const systems=sandbox.window.RPG15_SYSTEMS.systems;
assert.equal(systems.length,39);
assert.equal(systems.reduce((n,s)=>n+s.books.length,0),209);
const dnd=systems.find(s=>s.id==='d-d');
assert.ok(dnd);
assert.equal(dnd.title,'D&D');
assert.equal(dnd.books.length,9);
assert.ok(dnd.books.some(b=>/LDJ 5E/.test(b.title)));
assert.ok(dnd.books.some(b=>/2024/.test(b.title)));
for(const system of systems)for(const b of system.books){
 assert.ok(/^[A-Za-z0-9_-]{10,160}$/.test(b.id));
 assert.ok(b.url.includes(b.id),'each linked resource must refer to its exact Drive file ID');
}
vm.runInNewContext(read('rpg18_dnd_engine.js'),sandbox);
vm.runInNewContext(read('rpg16_gurps_engine.js'),sandbox);
vm.runInNewContext(read('rpg20_search_core.js'),sandbox);
const core=sandbox.window.RPG20_SEARCH;
const rules=core.makeRulesDocs(sandbox.window.RPG18_DND_ENGINE,sandbox.window.GURPS4_ENGINE);
assert.ok(rules.some(x=>x.systemId==='d-d'),'D&D rule documents are loaded');
assert.ok(rules.some(x=>x.systemId==='gurps'),'GURPS rule documents are loaded');
const options=systems.map(s=>'<option value="'+s.id+'">'+s.title+'</option>').join('');
assert.match(options,/<option value="d-d">D&D<\/option>/);
assert.match(ui,/const ss=systems\(\),options=ss\.map/);
assert.match(ui,/id="r50-drive-catalog"/);
assert.match(ui,/function getDriveBooks\(\)/);
assert.match(ui,/function renderDriveBooks\(\)/);
assert.match(ui,/getDriveBooks\(\)\.some\(b=>b\.id===id\)/);
assert.match(ui,/window\.RpgDriveBridge\?\.openDocument/);
assert.match(ui,/if\(activeSystem!=='all'&&activeSystem!=='ordem-paranormal'\)return/,'do not leak Ordem PDF matches into D&D');
assert.match(ui,/renderDriveBooks\(\);load\(\);showIndexStatus\(true\)/);
assert.match(html,/mastermind50_drive_library\.css/);
const build=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(build,/versionCode 50/);
console.log('PASS Mastermind v0.50: 39 systems + D&D, 209 linked Drive books, D&D/GURPS rules initialized before search');
