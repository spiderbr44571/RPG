'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),asset=path.join(root,'app/src/main/assets');
const html=fs.readFileSync(path.join(asset,'demo-offline.html'),'utf8');
test('Floating Mastermind menu uses chocolate-style 3x3 grid, not house or dice',()=>{
 const m=html.match(/const svgMenu=`([^`]+)`;/);
 assert.ok(m,'A grade deve ser usada no botao de menu principal');
 const svg=m[1],tiles=[...svg.matchAll(/<rect class="r09-chocolate-tile" x="(\d+)" y="(\d+)" width="15" height="15" rx="1.5"\/>/g)];
 assert.equal(tiles.length,9,'Exatamente nove quadrados');
 assert.deepEqual([...new Set(tiles.map(x=>x[1]))],['20','43','66']);
 assert.deepEqual([...new Set(tiles.map(x=>x[2]))],['20','43','66']);
 assert.match(html,/\$\{svgMenu\}<\/button>/);
 assert.doesNotMatch(html,/const svgHome=/);
 assert.match(html,/id="r09-dice" aria-label="Abrir menu principal do Mastermind"/);
});
test('Chocolate menu follows app customization and remains accessible',()=>{
 assert.match(html,/html body #r09-dice \.r09-chocolate-tile\{fill:var\(--fg/);
 assert.match(html,/html body #r09-dice:hover \.r09-chocolate-tile/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/aria-expanded="false">\$\{svgMenu\}/);
 const power=fs.readFileSync(path.join(asset,'mastermind39_ui.js'),'utf8');
 assert.match(power,/versionBadge/);
});
test('Core features and menu event handler remain mounted',()=>{
 for(const id of ['screen-library','screen-sheet','screen-canvas','screen-master','screen-bestiary'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/addEventListener\('click',/);
 assert.match(html,/const dice=\$\('#r09-dice'\)/);
 assert.match(html,/mastermind_system_editor\.js/);
});
