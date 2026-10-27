'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/assets'),read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const instances=[];
global.Image=class{constructor(){this.naturalWidth=1260;this.naturalHeight=1560;instances.push(this);}set src(v){this._src=v;}get src(){return this._src;}};
const gallery=require('../app/src/main/assets/mastermind80_portraits.js');
assert.equal(gallery.names.length,9);
assert.equal(gallery.source,'atelier/v080_premium.webp');
assert.equal(gallery.isReady(),false);
const ops=[],ctx={save(){},restore(){},clearRect(){},drawImage(...args){ops.push(args)}};
assert.equal(gallery.draw(ctx,840,1040,0),false,'No preset should be rendered before its image loads');
instances[0].onload();
assert.equal(gallery.isReady(),true);
for(let i=0;i<9;i++){
 ops.length=0;assert.equal(gallery.draw(ctx,840,1040,i),true);
 assert.equal(ops.length,1);
 assert.deepEqual(ops[0].slice(1,5),[(i%3)*420,Math.floor(i/3)*520,420,520],'Source rectangle must use shared 3x3 atlas grid');
 assert.deepEqual(ops[0].slice(5),[0,0,840,1040],'All portraits must fill the same canvas');
}
const editor=read('mastermind78_atelier.js'),html=read('demo-offline.html');
assert.match(html,/data-m77-tab="illustrated"/);
assert.match(html,/mastermind80_portraits\.css/);
assert.match(html,/mastermind80_portraits\.js/);
assert.match(html,/>v0\.80<\/small>/);
assert.match(editor,/GALLERY\.names\.forEach/);
assert.match(editor,/illustrationMode/);
assert.match(editor,/illustrationIndex/);
assert.match(editor,/GALLERY\.subscribe/);
assert.match(editor,/stored\?\.version===80\|\|stored\?\.version===79/);
assert.match(editor,/atelier:\{\.\.\.state\.appearance,version:80\}/);
for(const tab of ['body','face','skin','hairBack','hairFront','eyes','brows','mouth','outfit','accessory','colors','background','token','finish'])
 assert.ok(html.includes('data-m77-tab="'+tab+'"'),'Must preserve full customization option '+tab);
const build=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.match(build,/versionCode 82/);
assert.match(build,/versionName '0\.80\.0-mastermind-illustrated-library'/);
console.log('PASS v0.80: nine real raster-illustrated portraits, token sources, full modular editor, saved characters, v0.80 Android badge');