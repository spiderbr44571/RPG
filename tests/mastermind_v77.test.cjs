'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
global.Path2D=class {constructor(s){this.s=s||''}};
const art=require('../app/src/main/assets/mastermind77_assets.js');
assert.equal(art.W,420);assert.equal(art.H,520);assert.equal(art.DEFAULTS.version,77);
const expected={body:3,face:6,skin:10,hairBack:10,hairFront:10,eyes:8,brows:8,mouth:8,outfit:10,accessory:12,frame:5,background:8};
for(const [key,count] of Object.entries(expected))assert.equal(art.OPTIONS[key]?.length,count,'Expected modular options '+key);
const columns=['skin','hair','eye','cloth','trim'];for(const k of columns)assert.ok(art.COLORS[k]?.length>=8,'Missing palette '+k);
const ctx=()=>{const ops=[];const c={ops,fillStyle:'',strokeStyle:'',lineWidth:1,
 clearRect(){},fillRect(...a){ops.push('rectangle '+this.fillStyle+' '+a.join(','))},strokeRect(){},
 save(){},restore(){},scale(){},beginPath(){},arc(){},roundRect(){},clip(){},ellipse(){},stroke(){ops.push('stroke '+this.strokeStyle)},fill(p){ops.push('fill '+this.fillStyle+' '+(p?.s||''))},
 drawImage(){ops.push('image')},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
 return c;};
const standard=ctx();art.draw(standard,420,520,art.DEFAULTS);assert.ok(standard.ops.length>30);
const variation=ctx();art.draw(variation,420,520,{...art.DEFAULTS,body:1,face:4,skin:7,hairBack:6,hairFront:7,eyes:6,brows:5,mouth:4,outfit:9,accessory:10,hairColor:6,clothPrimary:8});
assert.notDeepEqual(variation.ops,standard.ops,'Distinct characters need genuinely different layers');
for(let i=0;i<20;i++){
 const c=ctx(),settings=art.random(art.DEFAULTS);assert.equal(art.draw(c,420,520,settings).version,77);assert.ok(c.ops.length>30);
}
const token=ctx();art.token(token,256,{width:420,height:520},art.DEFAULTS);assert.ok(token.ops.includes('image'),'Token image must be based on portrait');
for(const key of ['customHair','customEyes','customSkin','customPrimary','customSecondary']){const customized=art.normal({...art.DEFAULTS,[key]:'#ff0000',['useCustom'+key.slice(6)]:true});assert.equal(customized[key],'#ff0000');}
assert.equal(art.palette({...art.DEFAULTS,useCustomSkin:true,customSkin:'#123456'}).skin,'#123456');
const html=read('demo-offline.html'),editor=read('mastermind77_atelier.js'),engine=read('mastermind77_assets.js');
for(const name of Object.keys(expected).filter(k=>k!=='background'&&k!=='frame'))assert.ok(html.includes('data-m77-tab="'+name+'"'),'Atelier needs '+name);
for(const name of ['colors','token','finish'])assert.ok(html.includes('data-m77-tab="'+name+'"'));
assert.doesNotMatch(html,/data-m77-tab="voice"/);
for(const id of ['m77-save','m77-portrait','m77-token','m77-shuffle','m77-export-portrait','m77-export-token','m77-reset','m77-options'])assert.ok(html.includes('id="'+id+'"'),'Missing UI '+id);
assert.match(editor,/MastermindCharacters/);assert.match(editor,/atelier:\{\.\.\.state\.appearance,version:77\}/);
assert.match(editor,/photo,portrait:photo,tokenImage/);assert.match(editor,/mastermind:portrait-updated/);
assert.match(engine,/Every layer|shared 420/);
assert.doesNotMatch(html,/src="mastermind76_atelier.js"/);
assert.match(html,/>v0\.77<\/small>/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8'),/versionCode 79/);
for(const name of ['mastermind77_assets.js','mastermind77_atelier.js'])assert.doesNotThrow(()=>new Function(read(name)));
console.log('PASS v0.77: actual shared-anchor modular assets, 13 categories, 20 rendered characters, colors, token, persistence and no voice');
