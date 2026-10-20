'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const load=(file)=>fs.readFileSync(path.join(assets,file),'utf8');
const server=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
const gm=load('rpg31_master_table.js'),player=load('rpg31_player_table.js');
const cameraSource=load('rpg33_camera.js'),scene=load('lan_scene.html'),master=load('lan_master.html'),demo=load('demo-offline.html');
new Function(cameraSource);new Function(gm);new Function(player);
assert.ok(!server.includes('s.parseBody(files)'), 'Never decode posted JSON via NanoHTTPD postData');
assert.match(server,/s\.getInputStream\(\)/);
assert.match(server,/StandardCharsets\.UTF_8\.newDecoder\(\)/);
assert.match(server,/onMalformedInput\(java\.nio\.charset\.CodingErrorAction\.REPORT\)/);
assert.match(server,/restoreKnownLegacyText/);
assert.match(server,/repairLegacyLabels\(savedCampaigns\.getJSONObject\(i\)\)/);
assert.match(server,/publishedScript\("rpg33_camera\.js"\)/);
assert.match(demo,/<script src="rpg33_camera\.js"><\/script><script src="rpg31_master_table\.js"><\/script>/);
assert.match(master,/<script src="\/table-camera\.js"><\/script><script src="\/table-master\.js"><\/script>/);
assert.match(scene,/<script src="\/table-camera\.js"><\/script><script src="\/player-range\.js"><\/script><script src="\/table-player\.js"><\/script>/);
assert.match(gm,/camera\?\.attach\(/);
assert.match(gm,/camera\?\.cellAt\(/);
assert.match(gm,/data-action="fit"/);
assert.match(gm,/readable\(t\.name\)\.slice\(0,2\)/);
assert.match(player,/camera\?\.attach\(/);
assert.match(player,/camera\?\.cellAt\(/);
assert.match(player,/camera\?\.fit\(\)/);
assert.match(player,/'#scroll'/);
assert.ok(!gm.includes('s.scrollLeft=first'));
assert.ok(!player.includes('const rect=$(\'#board\').getBoundingClientRect()'));
// Simulates a landscape PC/tablet: validates fit, pan, pinch, zoom and stable cell coordinates.
const sandbox={window:{},requestAnimationFrame:fn=>fn(),Date,Math,Number,Map};sandbox.globalThis=sandbox.window;
vm.runInNewContext(cameraSource,sandbox);
const camera=sandbox.window.RPG33_CAMERA.create();
const handlers=new Map();
const view={
 clientWidth:1000,clientHeight:550,style:{},setPointerCapture(){},
 getBoundingClientRect(){return {left:10,top:20,width:1000,height:550}},
 addEventListener(name,cb){handlers.set(name,cb)},
 removeEventListener(name,cb){if(handlers.get(name)===cb)handlers.delete(name)}
};
const board={offsetWidth:1440,offsetHeight:960,style:{}};
camera.attach(view,board,1440,960,true);
assert.ok(camera.scale>0&&camera.scale<1,'map must fit view initially');
const scale=camera.scale;
const centerCell=camera.cellAt({clientX:510,clientY:295},48,30,20);
assert.equal(centerCell.x,15);
assert.ok(Math.abs(centerCell.y-10)<=1,'pixel rounding near middle of the grid');
const startX=camera.x,startY=camera.y;
const pointer=(type,x,y,id=1)=>handlers.get(type)({clientX:x,clientY:y,pointerId:id,button:0,target:{closest:()=>null},preventDefault(){}});
pointer('pointerdown',350,220);
pointer('pointermove',460,310);
pointer('pointerup',460,310);
assert.equal(camera.x,startX+110);
assert.equal(camera.y,startY+90);
camera.zoom(1.5,500,250);
assert.ok(camera.scale>scale);
assert.ok(camera.cellAt({clientX:510,clientY:295},48,30,20));
camera.fit();assert.ok(Math.abs(camera.scale-scale)<1e-9);
const newBoard={offsetWidth:1440,offsetHeight:960,style:{}};
camera.attach(view,newBoard,1440,960,false);
assert.ok(Math.abs(camera.scale-scale)<1e-9,'camera survives scene refresh');
camera.destroy();
console.log('PASS v0.33: UTF-8 raw body, legacy text repair, drag/pinch/zoom/fit, stable camera, scenes and player controls');
