'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.join(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const studio=require('../app/src/main/assets/mastermind76_atelier.js');
const html=read('demo-offline.html'),js=read('mastermind76_atelier.js'),css=read('mastermind76_atelier.css');
const expected=['portrait','frame','background','token','finish'];
assert.deepEqual([...html.matchAll(/data-m76-category="([^"]+)"/g)].map(x=>x[1]),expected,
 'Only five portrait-first tabs may be shown');
assert.doesNotMatch(html,/data-m76-category="(?:hair|eyes|brows|mouth|outfit|cape|accessory|voice)"/);
for(const forbidden of ['m76-mode','m76-gender','m76-show-cape','m76-show-accessory','Montagem experimental por peças'])
 assert.equal(html.includes(forbidden),false,'Legacy broken composer still visible: '+forbidden);
assert.equal(studio.portraits.length,6);
for(const portrait of studio.portraits){
 assert.ok(['f','m','o','u'].includes(portrait.pack));
 assert.ok(portrait.rect.every(x=>Number.isInteger(x)&&x>=0));
 const [x,y,w,h]=portrait.rect;
 assert.ok(w>120&&h>180&&x+w<=studio.sourceWidth&&y+h<=studio.sourceHeight,
  'Portrait crop must be contained in original art: '+portrait.id);
}
assert.equal(studio.defaults.mode,'portrait');
assert.match(js,/state\.appearance\.mode='portrait'/);
assert.doesNotMatch(js,/if\(config\.mode==='portrait'\)/);
assert.doesNotMatch(js,/crop\(ctx,item\('eyes',config\.eyes\)/);
assert.doesNotMatch(js,/crop\(ctx,item\('brows',config\.brows\)/);
assert.match(js,/const dw=Math\.min\(maxW,maxH\*intrinsic\)/);
assert.match(js,/const sx=\(portrait\.width-side\)\/2/);
for(const control of ['m76-save','m76-export-token','m76-export-portrait','m76-background','m76-accent','m762-random'])
 assert.ok(html.includes('id="'+control+'"'),'Missing final workflow control: '+control);
assert.match(js,/photo,portrait:photo,tokenImage/);
assert.match(js,/mastermind:portrait-updated/);
assert.match(html,/data-screen="atelier"/);
assert.match(css,/\.m762-workspace\{display:grid/);
assert.match(css,/@media\(max-width:490px\)/);
assert.match(html,/>v0\.76\.2<\/small>/);
assert.match(fs.readFileSync(path.join(__dirname,'../app/build.gradle'),'utf8'),/versionCode 78/);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../app/asset_sources/atelier_manifest.json'),'utf8'));
assert.deepEqual(manifest.active_categories,expected);
assert.equal(manifest.atlases.length,4);
console.log('PASS v0.76.2: complete portrait crops, 5 mobile steps, correct token preview, persisted sheet and no broken modular UI');
