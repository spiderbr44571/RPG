'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
global.Path2D=class{constructor(s){this.s=s||''}};
const A=require('../app/src/main/assets/mastermind81_rig.js');
assert.equal(A.version,81);assert.equal(A.W,420);assert.equal(A.H,520);
const expected={body:4,face:6,ears:4,skin:12,eyes:8,brows:8,nose:6,mouth:8,hairBack:12,hairFront:12,beard:7,outfit:16,cloak:6,armor:6,accessory:12,background:6,frame:5};
for(const [k,n] of Object.entries(expected))assert.equal(A.OPTIONS[k].length,n,'Option category '+k);
assert.equal(A.norm({version:80,face:999,ears:-1}).version,81);
assert.equal(A.norm({face:999,ears:-1}).face,5);assert.equal(A.norm({face:1,ears:-1}).ears,0);
assert.equal(A.pal(A.norm({...A.DEFAULTS,useCustomSkin:true,customSkin:'#abc123'})).skin,'#abc123');
const ctx=()=>{const ops=[];let depth=0;return {ops,
 fillStyle:'',strokeStyle:'',lineWidth:1,lineJoin:'',lineCap:'',
 save(){depth++;},restore(){depth--;assert.ok(depth>=0);},clearRect(){},scale(){},
 fillRect(){ops.push('rect')},strokeRect(){ops.push('border')},
 beginPath(){},arc(){},ellipse(){},roundRect(){},clip(p){ops.push('clip '+(p?.s||''))},
 fill(p){ops.push('fill '+(p?.s||''))},stroke(p){ops.push('stroke '+(p?.s||''))},
 drawImage(){ops.push('image')},
 createLinearGradient(){return {addColorStop(){}}},
 createRadialGradient(){return {addColorStop(){}}}}};
for(let face=0;face<6;face++){const c=ctx();const cfg={...A.DEFAULTS,face,ears:face%4,outfit:face+3,hairFront:face,hairBack:face,armor:face%6,cloak:face%6};let result=A.portrait(c,840,1040,cfg);assert.equal(result.version,81);assert.ok(c.ops.length>80,'Layered artwork has depth');}
for(let i=0;i<20;i++){const c=ctx();A.portrait(c,420,520,A.random(A.DEFAULTS));assert.ok(c.ops.length>80);}
const token=ctx();A.token(token,512,{width:840,height:1040},A.DEFAULTS);assert.ok(token.ops.includes('image'));
const html=fs.readFileSync(path.join(assets,'demo-offline.html'),'utf8'),editor=fs.readFileSync(path.join(assets,'mastermind81_atelier.js'),'utf8'),gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
for(const tab of Object.keys(expected).filter(x=>x!=='skin'||true)){if(tab==='skin'||tab!=='skin')assert.ok(html.includes('data-m81-tab="'+tab+'"'),'Missing tab '+tab);}
for(const id of ['m81-portrait','m81-token','m81-save','m81-options','m81-shuffle','m81-reset','m81-export-portrait','m81-export-token'])assert.ok(html.includes('id="'+id+'"'),'Missing UI '+id);
assert.ok(html.includes('mastermind81_rig.js')&&html.includes('mastermind81_atelier.js'));
assert.ok(!html.includes('src="mastermind78_atelier.js"'),'Old atelier cannot run');
assert.match(html,/>v0\.81<\/small>/);
assert.match(editor,/MastermindCharacters/);assert.match(editor,/mastermind:portrait-updated/);
assert.match(editor,/atelier:record/);assert.match(gradle,/versionCode 83/);
console.log('PASS v0.81 modular atelier: independent layers, 17 categories, rig and ears, 20 random characters, token, save integration');
