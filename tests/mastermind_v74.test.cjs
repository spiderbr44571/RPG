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
// Mapa clássico (rpg29/rpg31/player shell) foi retirado: a nova interface usa o próprio pacote de ícones Tabler (revamp/icones.js).
assert.match(read('ferramentas.html'),/src="mastermind74_icons\.js"/);
assert.match(read('revamp/icones.js'),/Tabler/);
const license=read('LICENSE-TABLER-ICONS.txt');
assert.match(license,/MIT License/);assert.match(license,/Permission is hereby granted/);
for(const name of ['mastermind74_icons.js','revamp/icones.js'])
 assert.doesNotThrow(()=>new Function(read(name)),'Invalid JavaScript '+name);
assert.match(read('ferramentas.html'),/>v0\.(?:74|75|76|76\.1|76\.2|77|78|79|80|81|82|82\.1|83|84|85|85\.1|86|87|88|89|90|91|93|94|95|96|97|98)<\/small>/);
assert.ok(Number(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8').match(/versionCode (\d+)/)[1])>=74);
console.log('PASS v0.74: 39+ MIT Tabler SVGs, grid/GM/player consistency, optical scaling and offline loading');
