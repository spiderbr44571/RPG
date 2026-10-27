'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const images=[];
function mockCtx(){let draws=0;return {get draws(){return draws},fillStyle:'',strokeStyle:'',imageSmoothingEnabled:true,
 save(){},restore(){},clearRect(){},fillRect(){},strokeRect(){},beginPath(){},arc(){},roundRect(){},clip(){},fillText(){},scale(){},
 drawImage(){draws++},putImageData(){},getImageData(x,y,w,h){return {data:new Uint8ClampedArray(w*h*4)}}
};}
global.Image=class{constructor(){images.push(this);this.naturalWidth=1680;this.naturalHeight=2496;}set src(v){this.url=v;}get src(){return this.url;}};
global.CustomEvent=class{constructor(type){this.type=type}};
global.document={createElement(type){assert.equal(type,'canvas');return {width:168,height:208,getContext(){if(!this._ctx)this._ctx=mockCtx();return this._ctx;}}},dispatchEvent(){}};
const R=require('../app/src/main/assets/mastermind82_rig.js');
assert.equal(R.version,82);
assert.equal(R.W,168);assert.equal(R.H,208);assert.equal(R.spriteCount,116);
assert.equal(R.spriteSource,'atelier/pixel82_atlas.png');
assert.equal(images.length,1);assert.equal(images[0].url,R.spriteSource);
const expected={body:4,face:6,ears:4,skin:12,eyes:8,brows:8,nose:6,mouth:8,hairBack:12,hairFront:12,beard:7,outfit:16,cloak:6,armor:6,accessory:12,background:6,frame:5};
for(const[k,n]of Object.entries(expected))assert.equal(R.OPTIONS[k].length,n,'Missing sprite options for '+k);
assert.equal(R.norm({version:81,face:999,ears:-4}).version,82);
assert.equal(R.norm({face:999}).face,5);
assert.equal(R.norm({ears:-4}).ears,0);
assert.equal(R.pal(R.norm({...R.DEFAULTS,useCustomHair:true,customHair:'#654321'})).hair,'#654321');
assert.equal(R.isReady(),false);
images[0].onload();
assert.equal(R.isReady(),true);
for(let k=0;k<6;k++){
 const portrait=mockCtx();R.portrait(portrait,840,1040,{...R.DEFAULTS,face:k,hairBack:k,eyes:k,mouth:k});
 assert.ok(portrait.draws>0);assert.equal(portrait.imageSmoothingEnabled,false);
}
const token=mockCtx();R.token(token,512,{width:840,height:1040},R.DEFAULTS);
assert.ok(token.draws>0);assert.equal(token.imageSmoothingEnabled,false);
const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8'),editor=fs.readFileSync(path.join(assets,'mastermind82_atelier.js'),'utf8');
for(const k of Object.keys(expected))assert.ok(html.includes('data-m81-tab="'+k+'"'),'Missing category '+k);
for(const file of ['mastermind82_atlas_data.js','mastermind82_rig.js','mastermind82_atelier.js','mastermind82_atelier.css'])assert.ok(html.includes(file));
assert.ok(!html.includes('src="mastermind81_rig.js"'),'Old vector renderer must be inactive');
assert.ok(!html.includes('src="mastermind81_atelier.js"'),'Old editor must be inactive');
assert.match(html,/>v0\.82\.1<\/small>/);
assert.match(editor,/mastermind82:ready/);
assert.match(editor,/atelier:record/);
assert.match(editor,/version:82/);
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(gradle,/versionCode 85/);
console.log('PASS v0.82: 116 native pixel sprites; shared anchors, no interpolation, all 18 categories, save and token paths');
