'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../app/src/main/assets');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const V=require('../app/src/main/assets/mastermind72_volume.js');
assert.equal(V.exposureAt(1,1,[],[]),0,'unlit rooms remain fully covered');
assert.ok(V.exposureAt(1.1,1,[{x:1,y:1}],[])>.8,'open doorway softly illuminates nearby fog');
assert.ok(V.exposureAt(5,5,[{x:1,y:1}],[])<.01,'open doorway does not reveal the whole room');
const lamp=[{x:2.5,y:5.5,rotation:0,radius:8}];
assert.ok(V.exposureAt(5.5,5.5,[],lamp)>.6,'east-facing flashlight illuminates forward V');
assert.equal(V.exposureAt(.5,5.5,[],lamp),0,'flashlight does not illuminate behind the token');
assert.ok(V.exposureAt(5.5,5.5,[],[{...lamp[0],rotation:180}])<.01,'rotation changes beam direction');
const area={x:2,y:2,w:8,h:8,shape:'rect',fogStyle:'dark',intensity:100,hidden:true};
assert.ok(V.regionContains(area,3,3));
assert.equal(V.regionContains({...area,shape:'circle'},2.05,2.05),false);
const scene={width:12,height:12,rooms:[area],tokens:[],layers:{walls:[{kind:'door',open:false,x:2,y:5,side:'w'}]}};
assert.deepEqual(V.doorsFor(scene,area),[],'closed doors keep the fog solid');
scene.layers.walls[0].open=true;
assert.equal(V.doorsFor(scene,area).length,1,'open boundary door has an entrance');
let frame;
const canvas={
 width:0,height:0,
 getContext(){return {
  createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
  putImageData(a){frame=a;}
 }}
};
V.drawFrame(canvas,scene,{quality:'economy'},0);
function alpha(x,y){const p=(Math.floor(y*10)*canvas.width+Math.floor(x*10))*4;return frame.data[p+3];}
assert.equal(alpha(8,8),255,'unlit center is opaque, not a transparent flat overlay');
assert.ok(alpha(2.4,5.5)<alpha(8,8),'open-door entrance creates a soft fade into room');
assert.equal(alpha(.5,.5),0,'outside the drawn area stays untouched');
const before=frame.data.slice();
V.drawFrame(canvas,scene,{quality:'economy'},4000);
assert.notDeepEqual(frame.data,before,'volume clouds animate over time');
const lit={...scene,tokens:[{x:3,y:5,flashlight:true,rotation:0,flashlightRadius:8}]};
V.drawFrame(canvas,lit,{quality:'economy'},120);
assert.ok(alpha(6,5.5)<alpha(5.5,8.5),'V beam illuminates its direction');
for(const name of ['rpg29_scene_editor.js','rpg31_master_table.js','rpg31_player_table.js','mastermind72_volume.js'])
 assert.doesNotThrow(()=>new Function(read(name)),'Invalid JavaScript '+name);
const editor=read('rpg29_scene_editor.js'),player=read('rpg31_player_table.js'),master=read('rpg31_master_table.js');
assert.match(editor,/s\.tool==='rotate'/);
assert.match(editor,/m72-editor-torch/);assert.match(editor,/m72-editor-angle/);
assert.match(editor,/Mastermind72Volume\?\.attach/);
assert.match(player,/sceneUrl\+'\/flashlight'/);assert.match(player,/m72-player-angle/);
assert.match(player,/Mastermind72Volume\?\.attach/);
assert.match(master,/action:'rotate'/);assert.match(master,/action:'flashlight'/);
assert.match(master,/Mastermind72Volume\?\.attach/);
assert.match(read('lan_scene.html'),/m72-player-controls/);
assert.match(read('lan_scene.html'),/\/volume\.js/);
assert.match(read('lan_master.html'),/\/volume\.js/);
assert.match(read('demo-offline.html'),/mastermind72_volume\.js/);
const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
for(const needle of ['illuminatedCells(original,fog)','areaEntrances(scene,room)','canSeeThrough(blockers,tx,ty,x,y)',
 'playerFlashlight(String cid,JSONObject player,JSONObject input)','action.equals("rotate")','action.equals("flashlight")',
 'maskedBackground(original,a,fogOfWarActive?currentVision:null,lightCells)','if(!isVisibleInFog(original,mx,my,lightCells))continue;',
 '/volume.js'])assert.ok(java.includes(needle),'Missing secure server integration: '+needle);
assert.match(java,/gridNumber\(token,"rotation",0,359\)/);
assert.match(read('demo-offline.html'),/>v0\.(?:72|73)<\/small>/);
assert.match(fs.readFileSync(path.join(__dirname,'../app/build.gradle'),'utf8'),/versionCode (?:72|73)/);
console.log('PASS v0.72: opaque animated fog, only open-door falloff, directional V, rotation, player/master controls and server visibility');
