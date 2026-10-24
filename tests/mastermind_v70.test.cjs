'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const assets = path.join(__dirname, '../app/src/main/assets');
const read = name => fs.readFileSync(path.join(assets,name),'utf8');
const atmosphereSource = read('mastermind69_atmosphere.js');
const A = require('../app/src/main/assets/mastermind69_atmosphere.js');

assert.equal(A.settings({}).enabled,false,'Maps before v0.69 remain untouched');
assert.equal(A.fogCoverAlpha(0),0,'Zero fog must remain clear');
assert.ok(A.fogCoverAlpha(.8) < A.fogCoverAlpha(.95),'Fog cover must be adjustable');
assert.equal(A.fogCoverAlpha(1),1,'Full fog MUST be completely opaque');
assert.equal(A.settings({atmosphere:{enabled:true,ambient:1,fogDensity:1}}).fogDensity,1);

// A minimal Canvas2D mock checks the actual painter, not only a configuration value.
const canvases=[];
global.document={
 createElement(tag){
  assert.equal(tag,'canvas');
  const calls=[];
  const ctx={
   globalCompositeOperation:'source-over',fillStyle:'',
   setTransform(){},clearRect(){},beginPath(){},closePath(){},clip(){},
   moveTo(){},lineTo(){},save(){},restore(){},ellipse(){},fill(){},
   createRadialGradient(){return {addColorStop(){}};},
   fillRect(){calls.push({fillStyle:this.fillStyle,operation:this.globalCompositeOperation});}
  };
  const canvas={style:{},isConnected:true,calls,setAttribute(){},getContext(){return ctx;}};
  canvases.push(canvas);return canvas;
 }
};
global.getComputedStyle=()=>({position:'relative'});
const board=()=>({style:{},appendChild(c){c.parentNode=this;},removeChild(c){c.parentNode=null;c.isConnected=false;}});
const dark={width:3,height:3,layers:{walls:[]},lights:[{x:1,y:1,radius:2,intensity:1,enabled:true}],
 atmosphere:{enabled:true,mode:'dark',ambient:1,fogDensity:0}};
A.attach(board(),dark,{cell:48,player:true});
assert.ok(canvases.at(-1).calls.some(v=>v.fillStyle==='rgba(4,6,16,1)'),'Total darkness must paint solid black');
assert.equal(canvases.at(-1).calls.some(v=>v.operation==='destination-out'),false,'Lights must not punch holes through total darkness');
A.attach(board(),dark,{cell:48,master:true});
assert.ok(canvases.at(-1).calls.some(v=>v.fillStyle==='rgba(4,6,16,0.36)'),'Master must retain an editable preview');
const mist={width:3,height:3,lights:[],layers:{walls:[]},atmosphere:{enabled:true,ambient:0,fogDensity:1,fogColor:'#a9c2ba'}};
A.attach(board(),mist,{cell:48,player:true});
assert.ok(canvases.at(-1).calls.some(v=>v.fillStyle==='rgba(169,194,186,1)'),'Maximum fog must cover every pixel opaquely');

const studio=read('rpg29_scene_editor.js');
const master=read('rpg31_master_table.js');
const player=read('rpg31_player_table.js');
const scene=read('lan_scene.html');
assert.match(studio,/quality:atmosphereEngine.settings\(m\).quality,master:true/);
assert.match(master,/player:false,master:true/);
assert.match(player,/cell,player:true/);
assert.match(scene,/m69-room-drift/,'Blocked rooms must have their own moving fog/dark texture');
assert.match(scene,/\.fog\.r35-fog-mist\{background:radial-gradient\(ellipse at 20% 40%,#a4afbf 0%/,'Room fog base must be opaque');

const java=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
assert.match(java,/boolean atmosphereBlackout=/);
assert.match(java,/atmo\.optDouble\("fogDensity",0\)>=\.999/);
assert.match(java,/atmo\.optDouble\("ambient",0\)>=\.999/);
assert.match(java,/fogOfWarActive=.*\|\|atmosphereBlackout/);
assert.match(java,/!atmosphereBlackout&&oi<ownTokens\.length\(\)/,'No live cells during blackout');
assert.match(java,/past!=null&&!atmosphereBlackout/,'Previously explored terrain cannot leak through blackout');
assert.match(java,/fogOfWarActive&&!currentVision.contains/,'Server must remove invisible tokens');
assert.match(java,/visible\.put\("image",""\)/,'Server must hide the raw map image');

assert.match(read('demo-offline.html'),/>v0\.70<\/small>/);
assert.match(fs.readFileSync(path.join(__dirname,'../app/build.gradle'),'utf8'),/versionCode 70/);
console.log('PASS v0.70: total opaque fog/darkness, master preview, animated rooms, server data isolation');
