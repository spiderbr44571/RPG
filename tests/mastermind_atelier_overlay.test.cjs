'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('app/src/main/assets/demo-offline.html');
const java=read('app/src/main/java/dev/rpgmesa/demo/MainActivity.java');
const renderer=read('desktop/renderer.js');
const css=read('desktop/desktop.css');
test('Main tool hub explicitly hides the native Atelier before showing HTML modal',()=>{
 const start=html.indexOf('function openHub(){'),end=html.indexOf('function closeHub(){',start);
 assert.ok(start>=0&&end>start);
 const open=html.slice(start,end);
 assert.ok(open.indexOf('setOverlayVisible?.(true)')<open.indexOf("overlay.classList.add('open')"));
 assert.match(html,/setOverlayVisible\?\.\(false\)/);
 assert.match(html,/mastermind:overlay-visibility/);
});
test('Android native stage is hidden while menus and dialogs occlude the Godot editor',{skip:!java.includes('nativeOverlayBlocked')},()=>{
 assert.match(java,/volatile boolean nativeOverlayBlocked=false/);
 assert.match(java,/setOverlayVisible\(boolean visible\)/);
 assert.match(java,/if\(visible\)hideInlinePortrait\(\)/);
 assert.match(java,/r09-overlay\.open/);
 assert.match(java,/modal-backdrop\.open/);
 assert.match(java,/if\(nativeOverlayBlocked\)\{hideInlinePortrait\(\)/);
 assert.match(java,/allowedHost!=null\|\|nativeOverlayBlocked/);
});
test('Desktop compositor hides the separate WebContentsView for a modal and restores it after close',()=>{
 assert.match(renderer,/r09-overlay\.open/);
 assert.match(renderer,/modal-backdrop\.open/);
 assert.match(renderer,/mastermind:overlay-visibility/);
 assert.match(renderer,/observer\.observe\(document\.body/);
 assert.match(renderer,/if\(next!==last\)/);
});
test('Horizontal desktop layout explicitly overrides the mobile shell cap and 136px dead space',()=>{
 assert.match(css,/Full-width desktop landscape/);
 assert.match(css,/\.main \.content\s*\{/);
 assert.match(css,/max-width:none!important/);
 assert.match(css,/padding-bottom:0!important/);
 assert.match(css,/height:calc\(100dvh - var\(--desktop-bar-height\)\)!important/);
 assert.match(css,/\.main \.content > \.screen/);
 assert.match(css,/\.r09-dock/);
});
