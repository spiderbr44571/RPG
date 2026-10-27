'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main/assets');
const get=f=>fs.readFileSync(path.join(root,f),'utf8');
const g={};
g.Image=class{
 constructor(){this.width=290;this.height=286;this.onload=null;}
 set src(t){assert.match(t,/^data:image\/png;base64,/);this._src=t;this.onload?.();}
};
const sandbox={window:g,globalThis:g,Image:g.Image,console,setTimeout,clearTimeout};
vm.runInNewContext(get('nonemo85_assets.js'),sandbox,{timeout:5000});
vm.runInNewContext(get('nonemo85_renderer.js'),sandbox,{timeout:5000});
const engine=g.Nonemo85;
assert.equal(engine.db.count,180);
assert.equal(Object.keys(engine.db.sprites).length,180);
assert.equal(engine.categories.length,17);
const needed=engine.requiredKeys(engine.defaults);
assert.ok(needed.length>=7&&needed.every(k=>engine.db.sprites[k]),JSON.stringify(needed));
for(const cat of engine.categories){for(const option of cat.options){
 const cfg=engine.normal({...engine.defaults,[cat.id]:option});
 assert.equal(cfg[cat.id],option,'Invalid option '+cat.id+':'+option);
 for(const key of engine.requiredKeys(cfg))assert.ok(engine.db.sprites[key],'Missing sprite '+key);
}}
let calls=[],ctx={
 save(){},restore(){},clearRect(){},fillRect(){},translate(){},scale(){},beginPath(){},arc(){},clip(){},stroke(){},
 drawImage(img,x,y,w,h){calls.push([x,y,w||null,h||null]);},
 createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}},
};
engine.draw(ctx,580,640,engine.defaults);
assert.ok(calls.length>=8,'Character should draw multiple independent sprites');
assert.ok(calls.some(([x,y])=>x===0&&y===0),'Facial and hair sprite positions must be anchored');
assert.ok(calls.some(([x,y])=>x===110&&y===214),'Body anchor absent');
assert.ok(engine.readyFor(engine.defaults),'Expected all original data images to be decoded');
engine.token(ctx,256,{width:580,height:640});
for(let i=0;i<25;i++){const cfg=engine.random();for(const key of engine.requiredKeys(cfg))assert.ok(engine.db.sprites[key]);}
assert.equal(engine.normal({skin:'other'}).skin,'tint_1');
console.log('PASS nonemo85: 180 original sprites, all modular combinations, anatomy anchors, render and token');