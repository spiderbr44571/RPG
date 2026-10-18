'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'../app/src/main/assets');
const studio=fs.readFileSync(path.join(base,'rpg29_scene_editor.js'),'utf8');
const css=fs.readFileSync(path.join(base,'rpg30_studio.css'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
const manifest=fs.readFileSync(path.join(__dirname,'../app/src/main/AndroidManifest.xml'),'utf8');
const html=fs.readFileSync(path.join(base,'demo-offline.html'),'utf8');
const player=fs.readFileSync(path.join(base,'lan_scene.html'),'utf8');
new Function(studio); // JS sintaticamente valido.
for(const code of ['className=\'r30-studio\'','setLandscape(true)','setLandscape(false)','s.tool===\'rect\'','s.tool===\'circle\'','data-r30-asset','id="r30-file"','image/jpeg','image/webp','r30-preview','backgroundAssetId','getBoundingClientRect','setPointerCapture','data-r30="exit"'])
 assert.ok(studio.includes(code),'feature missing '+code);
assert.ok(/position:fixed!important;inset:0!important/.test(css),'fullscreen layout');
assert.ok(/grid-template-columns:52px minmax\(0,1fr\) 195px/.test(css),'editor must prioritize the map');
assert.ok(/border-radius:50%/.test(css),'circle fog');
assert.ok(/dice:'<rect/.test(html),'missing roll icon must be fixed');
assert.ok(/id="r09-dice"/.test(html),'global die should still be present');
assert.ok(/if\(!"circle"\.equals\(r\.optString\("shape","rect"\)\)\)/.test(server),'circle backend coverage');
assert.ok(/maskedBackground\(original,a\)/.test(server),'background masking must be applied');
assert.ok(/visible\.put\("image",maskedBackground/.test(server),'no raw map leaks');
assert.ok(/sceneEditorStyle\(\)/.test(server),'stylesheet served in master mode');
assert.ok(/t\.optString\("ownerPlayerId"\)\.equals\(player\.optString\("id"\)\)/.test(server),'player-scoped ownership');
assert.ok(/r\.optBoolean\("hidden",false\)&&regionContains/.test(server),'fog blocks movement');
assert.ok(/f\.shape==='circle'/.test(player),'player circle overlay');
assert.ok(/class SceneDisplayBridge/.test(native),'Android orientation');
assert.ok(/RpgSceneDisplay/.test(native),'native bridge');
assert.ok(/configChanges="orientation\|screenSize\|keyboardHidden"/.test(manifest),'rotation must not recreate activity');
console.log('PASS v0.30: fullscreen editor, rectangle/circle fog, image masking, dice icon, orientation and ownership');
