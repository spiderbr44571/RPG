'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../app/src/main/assets');
global.Path2D=class {constructor(d){this.d=d||''}};
const art=require('../app/src/main/assets/mastermind78_assets.js');
const ilustr=require('../app/src/main/assets/mastermind79_art.js');
assert.equal(art.DEFAULTS.version,79);
assert.equal(art.ILLUSTRATED_VERSION,79);
assert.equal(ilustr.drawFamilyCount,6);
assert.equal(art.W,420);assert.equal(art.H,520);
assert.equal(art.OPTIONS.outfit.length,30);
const mock=()=>{const ops=[];let depth=0;
 const ctx={ops,fillStyle:'',strokeStyle:'',lineWidth:1,
 save(){ops.push(['save',depth]);depth++;},restore(){depth--;ops.push(['restore',depth]);},
 clearRect(){},fillRect(...v){ops.push(['fillRect',depth,...v]);},strokeRect(){},
 beginPath(){},arc(){},ellipse(){},rect(){},roundRect(){},scale(){},
 clip(p){ops.push(['clip',depth,p?.d||'']);},
 fill(p){ops.push(['fill',depth,this.fillStyle,p?.d||'']);},
 stroke(p){ops.push(['stroke',depth,this.strokeStyle,p?.d||'']);},
 drawImage(){ops.push(['image']);},
 createLinearGradient(){return {addColorStop(){}};},
 createRadialGradient(){return {addColorStop(){}};}
 };return ctx;};
const sigs=new Set();
for(let i=0;i<30;i++){
 const ctx=mock();let cfg={...art.DEFAULTS,outfit:i,face:i%6,hairFront:i%10,hairBack:i%10};
 let value=art.draw(ctx,840,1040,cfg);
 assert.equal(value.version,79,'Updated renderer must migrate appearance');
 assert.ok(ctx.ops.length>100,'Painted illustration should include organic ink detail');
 assert.ok(ctx.ops.some(o=>o[0]==='clip'&&o[2].startsWith('M79 376')),'Cloth must clip shading to its silhouette');
 assert.ok(ctx.ops.some(o=>o[0]==='clip'&&o[2].startsWith('M')),'Hair and face must be clipped');
 sigs.add(ctx.ops.filter(o=>o[0]==='fill'||o[0]==='stroke').map(o=>o[3]).join('|'));
}
assert.equal(sigs.size,30,'30 outfits and variants should remain distinguishable');
const opaque=fs.readFileSync(path.join(base,'mastermind79_art.js'),'utf8');
assert.doesNotMatch(opaque,/ctx\.clip\(\);ctx\.fillRect\(52,333,320,188\)/,'No old rectangular overlay');
for(const face of [0,1,2,3,4,5]){
 const c=mock();assert.doesNotThrow(()=>art.draw(c,420,520,{...art.DEFAULTS,face,accessory:1,skin:face}));
}
let token=mock();art.token(token,512,{width:840,height:1040},art.DEFAULTS);assert.ok(token.ops.some(o=>o[0]==='image'));
for(const ver of [77,78,79])assert.equal(art.normal({...art.DEFAULTS,version:ver}).version,79);
const html=fs.readFileSync(path.join(base,'demo-offline.html'),'utf8');
const editor=fs.readFileSync(path.join(base,'mastermind78_atelier.js'),'utf8');
assert.match(html,/mastermind79_art\.js/);
assert.match(html,/>v0\.79<\/small>/);
assert.match(html,/id="m77-portrait" width="840" height="1040"/);
assert.match(editor,/stored\?\.version===79/);
assert.match(editor,/atelier:\{\.\.\.state\.appearance,version:79\}/);
assert.match(fs.readFileSync(path.join(__dirname,'../app/build.gradle'),'utf8'),/versionCode 81/);
console.log('PASS v0.79: premium illustrated portrait, 30 outfits, 6 base families, clipped fabrics, 2x output, character migration');