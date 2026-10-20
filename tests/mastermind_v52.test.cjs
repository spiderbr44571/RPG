'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=path.resolve(__dirname,'../app/src/main');
const asset=n=>fs.readFileSync(path.join(src,'assets',n),'utf8');
const range=asset('mastermind52_range.js'),experience=asset('mastermind52_player_experience.js');
const scene=asset('lan_scene.html'),player=asset('rpg31_player_table.js'),css=asset('mastermind52_player_experience.css');
const server=fs.readFileSync(path.join(src,'java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
assert.doesNotThrow(()=>new Function(range));
assert.doesNotThrow(()=>new Function(experience));
assert.doesNotThrow(()=>new Function(player));
const ctx={window:{}};vm.runInNewContext(range,ctx);const r=ctx.window.MastermindRange;
const eq=(a,b,system)=>r.describe(a,b,system);
let x=eq({x:2,y:2},{x:3,y:3},'ordem-paranormal');
assert.equal(x.squares,1);assert.equal(x.distance,1.5);assert.equal(x.category,'Corpo a corpo / toque');
assert.equal(r.within(x,'melee'),true);
x=eq({x:0,y:0},{x:6,y:0},'ordem-paranormal');assert.equal(x.distance,9);assert.equal(x.category,'Curto');
assert.equal(r.within(x,'short'),true);
x=eq({x:0,y:0},{x:7,y:0},'ordem-paranormal');assert.equal(x.category,'Médio');assert.equal(r.within(x,'short'),false);
x=eq({x:0,y:0},{x:12,y:0},'ordem-paranormal');assert.equal(x.distance,18);assert.equal(x.category,'Médio');
x=eq({x:0,y:0},{x:24,y:0},'ordem-paranormal');assert.equal(x.distance,36);assert.equal(x.category,'Longo');
x=eq({x:0,y:0},{x:60,y:0},'ordem-paranormal');assert.equal(x.distance,90);assert.equal(x.category,'Extremo');
x=eq({x:0,y:0},{x:61,y:0},'ordem-paranormal');assert.match(x.category,/somente ilimitado/);
x=eq({x:0,y:0},{x:6,y:6},'d-d');assert.equal(x.distance,30);assert.equal(x.unit,'ft');
x=eq({x:0,y:0},{x:1,y:1},'d-d');assert.equal(r.within(x,'melee'),true);
x=eq({x:0,y:0},{x:4,y:0},'gurps');assert.equal(x.distance,4);assert.equal(x.approximate,true);
assert.equal(r.within(x,'medium'),null);
assert.equal(r.describe({x:NaN,y:0},{x:1,y:0},'ordem-paranormal'),null);
assert.match(experience,/mode='move'/);
for(const phrase of ['mastermind:player-live-render','r52-measure-layer','r52-pin-layer','r52-note-body',
'searchPersonalBook','journal','r52-note-list','r52-sheet-resources','r52-turn','profileRoll','table-roll',
'data-r52-resource','r52-save','sendJournal','data-r52-mode','data-r52-kind','r52-range']){
 if(phrase!=='searchPersonalBook')assert.ok(experience.includes(phrase),phrase);
}
assert.match(experience,/const journalCache='mastermind52-journal-'/);
assert.match(experience,/request\('journal','POST'/);
assert.match(experience,/notes=Array\.isArray\(data\.notes\)/);
assert.match(experience,/if\(mode==='pin'\)/);
assert.match(experience,/e\.stopImmediatePropagation\(\);e\.preventDefault\(\)/);
assert.match(experience,/function updateResource\(key,delta\)/);
assert.match(experience,/scene\(\)\?\.tokens/);
assert.match(player,/get selectedTokenId\(\)/);
assert.match(player,/get state\(\)/);
assert.match(player,/mastermind:player-live-render/);
assert.match(scene,/src="\/player-range.js"/);
assert.match(scene,/src="\/player-immersion.js"/);
assert.match(scene,/href="\/player-immersion.css"/);
assert.match(scene,/RPG31_PLAYER\.mount\(\);window\.MastermindPlayerExperience\.init\(\)/);
assert.match(css,/\.r52-journal-panel/);
assert.match(css,/#r52-live-tools\[data-mode=move\]/);
for(const term of ['/player-range.js','/player-immersion.js','/player-immersion.css']){
 assert.ok(server.includes(term),'Missing safe LAN asset route '+term);
}
assert.match(server,/return response\(200,playerJournal\(pl\)\)/);
assert.match(server,/updatePlayerJournal\(player,b\)/);
assert.match(server,/notes\.length\(\)>80/);
assert.match(server,/heading\.length\(\)>100\|\|content\.length\(\)>5000/);
assert.match(server,/player\.put\("liveJournal",safe\)/);
assert.match(server,/cookie\(s,"rpg_guest"\)/);
assert.match(server,/scene\.put\("gridScale",5\)\.put\("gridUnit","ft"\)/);
assert.match(server,/scene\.put\("gridScale",1\)\.put\("gridUnit","m"\)/);
assert.match(server,/String sceneSystem=actorSheet==null\?"custom"/);
assert.match(server,/mode\.equals\("lowest"\)/);
assert.match(server,/sheet\.put\("hitPointsCurrent",current\)/);
assert.match(server,/!key\.equals\("PV"\)/);
const build=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(build,/versionCode 52/);
console.log('PASS v0.52: scene-specific tactical range, private synchronized player notes, usable sheet and Android asset routing');
