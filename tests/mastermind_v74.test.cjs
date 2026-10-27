'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const Icons=require('../app/src/main/assets/mastermind74_icons.js');
const all=Icons.names();
assert.ok(all.length>=35,'Bundled icon pack needs the whole grid and tabletop catalog');
for(const name of ['clock','arrows-maximize','list-numbers','door-exit','map-2','coffee',
'layout-sidebar-right','plus','minus','dice-5','message-circle','users','walk','target',
'chevron-down','shield','hand-move','brush','wall','door','eraser','user-circle','square',
'circle','trash','settings','layout-grid','device-floppy','upload','x','rotate-clockwise',
'zoom-in','zoom-out','ruler','map-pin','notes','sparkles','search','file-text'])
 assert.ok(all.includes(name),'Missing usable SVG icon: '+name);
for(const key of ['hourglass','initiative','maximize','turn','zoom-in','zoom-out','door','clock']){
 const svg=Icons.render(key);
 assert.match(svg,/<svg class="r74-icon" viewBox="0 0 24 24"/);
 assert.match(svg,/<path|<circle|<rect|<line|<polyline/);
 assert.doesNotMatch(svg,/<image|<foreignObject|<script|<use/);
}
assert.notEqual(Icons.render('clock'),Icons.render('maximize'));
const master=read('rpg31_master_table.js');
const editor=read('rpg29_scene_editor.js');
const shell=read('mastermind54_player_shell.js');
assert.match(master,/Mastermind74Icons\?\.render\(id==='hourglass'\?'clock':id,'r64-icon'\)/);
assert.match(master,/r64Action\('fit','maximize','Enquadrar'\)/);
assert.match(master,/r64Group\('initiative','initiative','Iniciativa \/ sessão'/);
assert.match(editor,/Mastermind74Icons\?\.render\(r74Map\[name\]\|\|name,'r71-icon'\)/);
assert.match(editor,/zoomout:'zoom-out',fit:'arrows-maximize'/);
assert.match(shell,/r74ToolIcons=/);
assert.match(shell,/Mastermind74Icons\?\.render/);
assert.match(read('demo-offline.html'),/src="mastermind74_icons\.js"/);
assert.match(read('lan_master.html'),/src="\/icons74\.js"/);
assert.match(read('lan_scene.html'),/src="\/icons74\.js"/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8'),/if\(path\.equals\("\/icons74\.js"\)\)return publishedScript\("mastermind74_icons\.js"\)/);
assert.match(read('rpg31_live.css'),/\.r31-live \.r64-icon\{display:inline-block!important;width:20px!important/);
assert.match(read('rpg30_studio.css'),/\.r30-studio \.r71-icon\{display:block!important;width:21px!important/);
const license=read('LICENSE-TABLER-ICONS.txt');
assert.match(license,/MIT License/);assert.match(license,/Permission is hereby granted/);
for(const name of ['mastermind74_icons.js','rpg29_scene_editor.js','rpg31_master_table.js','mastermind54_player_shell.js'])
 assert.doesNotThrow(()=>new Function(read(name)),'Invalid JavaScript '+name);
assert.match(read('demo-offline.html'),/>v0\.(?:74|75|76|76\.1|76\.2|77|78|79|80|81|82|82\.1|83|84|85|85\.1|86|87|88|89|90)<\/small>/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8'),/versionCode (?:74|75|76|77|78|79|80|81|82|83|84|85|86|87|88|89|90|91|92|93|94)/);
console.log('PASS v0.74: 39+ MIT Tabler SVGs, grid/GM/player consistency, optical scaling and offline loading');
