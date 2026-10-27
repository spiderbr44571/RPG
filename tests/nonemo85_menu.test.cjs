'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main/assets');
const html=fs.readFileSync(path.join(root,'demo-offline.html'),'utf8');
const home=fs.readFileSync(path.join(root,'mastermind39_ui.js'),'utf8');
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
const central=html.match(/const tools=\[\s*\n \['library'[\s\S]*?\n\];\nconst icons=/);
assert.ok(central,'Main floating house menu must be present');
const atelierEntry=central[0].match(/\['atelier85','Ateliê','shirt','[^']+'\]/g)||[];
assert.equal(atelierEntry.length,1,'Central house menu must contain exactly one Atelier card');
assert.match(html,/shirt:'<path d="M8 4 12 7 16 4/,'Clothes icon needs working path');
assert.match(html,/const to=b\.dataset\.r09Tool;[\s\S]*?app\.navigate\(to\)/,'Central menu must route to target screen');
assert.match(html,/<section id="screen-atelier85" class="screen"/,'New Nonemo atelier must exist');
assert.match(html,/atelier85:'Ateliê 2D'/,'Router must name the screen');
assert.match(home,/\['atelier85','Ateliê 2D','user','Criar e editar retratos e tokens','07'\]/,'Home quick action must be present');
assert.match(home,/data-mm39="/,'Home quick action must be routable');
assert.match(home,/\['atelier85','Ateliê 2D','user'\]/,'Responsive quick drawer must include Atelier');
assert.match(html,/\['atelier85','Ateliê','atelier','Criador de personagens 2D'\]/,'Fallback navigation must expose Atelier');
assert.match(html,/>v0\.85\.1<\/small>/,'Installed version must identify menu update');
assert.match(gradle,/versionCode 89; versionName '0\.85\.1-mastermind-atelier-menu'/);
for(const filename of ['nonemo85_renderer.js','nonemo85_studio.js','nonemo85_studio.css']){
 assert.ok(fs.existsSync(path.join(root,filename)),filename+' must be preserved');
}
console.log('PASS v0.85.1: Atelier visible in house menu, home quick access, responsive drawer, routed to real Nonemo editor');
