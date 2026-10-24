'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const V=require('../app/src/main/assets/mastermind72_volume.js');
const Atmo=require('../app/src/main/assets/mastermind69_atmosphere.js');
const walls=[];
for(let y=2;y<=4;y++){walls.push({x:2,y,side:'w',kind:y===3?'door':'wall',open:false});walls.push({x:4,y,side:'e',kind:'wall'});}
for(let x=2;x<=4;x++){walls.push({x,y:2,side:'n',kind:'wall'});walls.push({x,y:4,side:'s',kind:'wall'});}
const map={width:10,height:10,rooms:[],tokens:[],atmosphere:{doorShadows:true,mode:'day'},layers:{walls}};
const shaded=V.automaticRooms(map);
assert.equal(shaded.length,1,'only one closed space should be shadowed');
assert.equal(shaded[0].cells.length,9,'shadow should be limited to nine enclosed grid tiles');
assert.equal(V.regionContains(shaded[0],3.5,3.5),true,'interior is automatically shadowed');
assert.equal(V.regionContains(shaded[0],6.5,3.5),false,'corridor/open area stays lit');
map.layers.walls.find(w=>w.kind==='door').open=true;
assert.equal(V.automaticRooms(map).length,0,'opening the door admits outdoor ambient light');
map.layers.walls.find(w=>w.kind==='door').open=false;
map.atmosphere.doorShadows=false;
assert.equal(V.automaticRooms(map).length,0,'master can disable automatic door shadows');
map.atmosphere.doorShadows=true;
const oneWall={...map,layers:{walls:[{kind:'wall',x:5,y:5,side:'w'}]}};
assert.equal(V.automaticRooms(oneWall).length,0,'a lone wall never blacks out one side of the map');
const ctx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},putImageData(data){this.frame=data}};
const canvas={width:0,height:0,getContext(){return ctx}};
V.drawFrame(canvas,map,{quality:'economy'},0);
const alpha=(x,y)=>ctx.frame.data[(Math.floor(y*10)*canvas.width+Math.floor(x*10))*4+3];
assert.equal(alpha(3.5,3.5),255,'enclosed unlit area is opaque');
assert.equal(alpha(6.5,3.5),0,'open map remains transparent');
map.tokens=[{x:3,y:3,flashlight:true,lightKind:'torch',flashlightRadius:3}];
V.drawFrame(canvas,map,{quality:'economy'},500);
assert.ok(alpha(3.5,3.5)<80,'torch illuminates the previously sealed room');
assert.equal(alpha(6.5,3.5),0,'the light does not create a global blackout');
assert.equal(Atmo.attach({},map,{player:true}),null,'the daytime legacy renderer cannot produce an all-map mask');
const java=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
for(const fragment of ['closedUnlitRooms(JSONObject map)','java.util.HashSet<String> closed=opaqueBoundaries(map)',
 'if(result.size()>count*.65)result.clear()', 'boolean fogOfWarActive=false;',
 'automaticShadows?closedUnlitRooms(original)', 'addAutomaticShadows(scene,automatic',
 'maskedBackground(original,a,fogOfWarActive?currentVision:null,lightCells,automatic)',
 'isVisibleInFog(original,mx,my,lightCells,automatic)','for(int cell:automatic)']){
 assert.ok(java.includes(fragment),'Missing selective automatic darkness: '+fragment);
}
const player=read('rpg31_player_table.js'),html=read('lan_scene.html'),editor=read('rpg29_scene_editor.js');
for(const fragment of ["pointerDegrees=(e,el)","addEventListener('pointerdown'","addEventListener('pointermove'",
 "addEventListener('pointerup'","grip.setPointerCapture?.(e.pointerId)","drag.original+pointerDegrees(e,drag.el)",
 "setLight({rotation:drag.current})","m75-rotary-dial","m75-rotate-grip"]){
 assert.ok(player.includes(fragment),'Missing touch-drag dial: '+fragment);
}
assert.match(html,/\.m75-rotary-dial/);assert.match(html,/touch-action:none!important/);
assert.match(editor,/Escurecer somente salas fechadas sem iluminação/);
assert.match(read('demo-offline.html'),/>v0\.75<\/small>/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8'),/versionCode 75/);
for(const asset of ['rpg31_player_table.js','mastermind69_atmosphere.js','mastermind72_volume.js','rpg29_scene_editor.js'])
 assert.doesNotThrow(()=>new Function(read(asset)),asset);
console.log('PASS v0.75: isolated unlit rooms, open-door daylight, torch illumination and analog rotation');
