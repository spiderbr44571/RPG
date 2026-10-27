'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'app/src/main/java/dev/rpgmesa/demo/PixelPortraitActivity.java'),'utf8');
const manifest=fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/demo-offline.html'),'utf8');
const gradle=fs.readFileSync(path.join(root,'app/build.gradle'),'utf8');
for(const term of ['compactButton("−")','compactButton("+")','compactButton("Ajustar")',
 'compactButton("Mover")','compactButton("Paisagem")','changeMagnification(1f/1.2f)',
 'changeMagnification(1.2f)','fitGame();','probeGameCanvas(true);'])
 assert.ok(src.includes(term), 'Zoom toolbar button missing: '+term);
assert.match(src,/setClipChildren\(true\)/,'Native viewport must crop scaled WebView');
assert.match(src,/new FrameLayout\.LayoutParams\(-1,-1\)/,'Editor must occupy full frame before scaling');
assert.match(src,/creator\.setPivotX\(0f\)/,'WebView scaling must be anchored to stable origin');
assert.match(src,/creator\.setPivotY\(0f\)/);
assert.match(src,/creator\.setScaleX\(magnification\)/,'Actual game must be enlarged');
assert.match(src,/creator\.setScaleY\(magnification\)/);
assert.match(src,/creator\.setTranslationX\(panX\)/,'Allow native horizontal pan');
assert.match(src,/creator\.setTranslationY\(panY\)/,'Allow native vertical pan');
assert.match(src,/if\(!moveMode\)return false/,'Game editing must receive touches unless Mover is active');
assert.match(src,/panX\+=x-lastTouchX;panY\+=y-lastTouchY/,'Drag move tool must pan');
assert.match(src,/creator\.evaluateJavascript\(/,'Read CSS canvas dimensions to compute fit');
assert.match(src,/getElementById\('canvas'\)/,'Measure Godot canvas not whole itch.io page');
assert.match(src,/getBoundingClientRect\(\)/);
assert.match(src,/new JSONArray\("\["\+response\+"\]"\)\.getString\(0\)/,
 'Parse actual WebView JSON callback');
assert.match(src,/getDouble\("vw"\)/,'Normalize CSS measurements against display pixels');
assert.match(src,/availableWidth\/canvasWidth,availableHeight\/canvasHeight/,
 'Fit game to BOTH screen width and height');
assert.match(src,/gameViewport\.getWidth\(\)-canvasWidth\*magnification/,
 'Horizontally center the Godot game');
assert.match(src,/gameViewport\.getHeight\(\)-canvasHeight\*magnification/,
 'Vertically center the Godot game');
assert.match(src,/Math\.round\(magnification\*100\)\+"%"/,'Show zoom percent');
assert.match(src,/SCREEN_ORIENTATION_SENSOR_LANDSCAPE/,'Allow optional landscape control');
assert.match(src,/onConfigurationChanged\(Configuration configuration\)/,
 'Keep Godot state on rotation');
assert.match(src,/getGlobalVisibleRect\(gameRect\)/,
 'PNG capture must clip viewport instead of including off-screen zoomed content');
assert.match(src,/!area\.intersect\(gameRect\)/);
assert.match(src,/setAllowFileAccess\(false\)/);
assert.doesNotMatch(src,/\.addJavascriptInterface\s*\(/,'External engine may not receive RPG bridges');
assert.match(manifest,/<activity android:name="\.PixelPortraitActivity" android:exported="false"/);
assert.match(html,/>v0\.89<\/small>/);
assert.match(gradle,/versionCode 93; versionName '0\.89\.0-mastermind-atelier-zoom'/);
// Screenshot supplied by the user: original game ~480x594 rendered on 864x1400 viewport.
const calcFit=(vw,vh,cw,ch)=>Math.max(.75,Math.min(3.5,Math.min((vw-15)/cw,(vh-15)/ch)));
const f=calcFit(864,1400,480,594);
assert.ok(f>1.6&&f<2.0,'Screenshot geometry should enlarge original game: got '+f);
assert.ok(480*f>770,'Game should use most of portrait screen width');
assert.ok(594*f<1400,'Game should still fit available height');
assert.ok(calcFit(1400,600,480,594)<1.1,
 'Landscape should constrain canvas to vertical space');
console.log('PASS v0.89: native Godot canvas fit, zoom +/- and %, single-finger pan mode, rotation and visible capture region.');
