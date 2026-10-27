'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'../app/src/main/assets');
const html=fs.readFileSync(path.join(base,'demo-offline.html'),'utf8');
const studio=fs.readFileSync(path.join(base,'pixelportrait86_companion.js'),'utf8');
const css=fs.readFileSync(path.join(base,'pixelportrait86_companion.css'),'utf8');
const java=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
const gradle=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
for(const x of ['screen-atelier85','p86-import','p86-portrait','p86-token','p86-zoom','p86-frame','p86-character','p86-status'])assert.ok(html.includes('id="'+x+'"'),x);
for(const x of ['online','download','save','exportPortrait','exportToken','resetCrop','clear'])assert.ok(html.includes('data-p86-action="'+x+'"'),x);
assert.ok(html.includes('pixelportrait86_companion.js')&&html.includes('pixelportrait86_companion.css'));
assert.doesNotMatch(html,/src="nonemo85_|src="mastermind82_|src="mastermind83_/);
assert.match(html,/>v0\.88<\/small>/);
assert.match(html,/data-screen="atelier85"/);
assert.match(html,/\['atelier85','Ateliê','shirt'/);
assert.ok(css.includes('#screen-atelier85'));
assert.match(gradle,/versionCode 92; versionName '0\.88\.0-mastermind-lyime-direct-godot'/);
assert.match(java,/class PixelPortraitBridge/);
assert.match(java,/new Intent\(Intent.ACTION_VIEW,page\)/);
assert.match(java,/https:\/\/lyime\.itch\.io\/pixel-portrait-creator/);
assert.match(java,/addJavascriptInterface\(pixelPortrait,"RpgPixelPortraitBridge"\)/);
assert.doesNotMatch(studio,/nonemo85_assets|\.pck|lyime_sprite|GodotResource/);
let photoPatch=null,linkOpened=null;
const elements={};
function fakeElement(id){
 const listeners={};
 return elements[id]={id,style:{},value:id==='p86-frame'?'gold':id==='p86-zoom'?'1':'',textContent:'',classList:{toggle(){}},files:[],
   width:256,height:256,
   addEventListener(name,fn){(listeners[name]??=[]).push(fn)},
   send(name){for(const fn of listeners[name]||[])fn({target:this})},
   getContext(){return{clearRect(){},fillRect(){},strokeRect(){},fillText(){},drawImage(){},
     beginPath(){},arc(){},clip(){},stroke(){},save(){},restore(){}}},
   getBoundingClientRect(){return{width:256,height:256}},
   setPointerCapture(){},
   toDataURL(){return 'data:image/png;base64,aVZCT1J3MEtHZ289'},
 };
}
for(const id of ['p86-portrait','p86-token','p86-import','p86-status','p86-zoom','p86-zoom-label','p86-frame','p86-character'])fakeElement(id);
class FakeImage{constructor(){this.naturalWidth=64;this.naturalHeight=64}
set src(v){this._src=v;this.onload?.()}get src(){return this._src}}
const docListeners={};
const api={
 selectedId(){return 'a-1'},
 selected(){return {name:'Guerreiro',character:{name:'Guerreiro',photo:'previous photo'}}},
 update(id,patch){assert.equal(id,'a-1');photoPatch=patch;return true},
 open(){return true}
};
const fakeDoc={
 getElementById(id){return elements[id]||null},
 addEventListener(name,fn){(docListeners[name]??=[]).push(fn)},
 dispatchEvent(){},
 createElement(){return{click(){},remove(){}}},
 body:{appendChild(){}},
 hidden:false
};
const win={
 document:fakeDoc,MastermindCharacters:api,RpgPixelPortraitBridge:{
  openOnline(){linkOpened='online'},openDownload(){linkOpened='download'}},
 setTimeout(fn){fn()},PixelPortrait86:null
};
const urls={createObjectURL(){return 'blob:local:image'},revokeObjectURL(){}};
vm.runInNewContext(studio,{window:win,document:fakeDoc,Image:FakeImage,URL:urls,
  CustomEvent:class{constructor(name,arg){this.type=name;this.detail=arg?.detail}},
  console,Math,Number,String}, {timeout:3000});
assert.ok(win.PixelPortrait86,'Studio did not load');
assert.equal(photoPatch,null,'Must not modify character before explicit save');
const input=elements['p86-import'];input.files=[{type:'image/png',name:'portrait.png',size:1400}];input.send('change');
assert.ok(win.PixelPortrait86.state.image,'User PNG should be loaded from Android file picker');
assert.equal(elements['p86-character'].textContent,'Guerreiro');
win.PixelPortrait86.save();
assert.ok(photoPatch&&photoPatch.photo.startsWith('data:image/png;base64,'));
assert.ok(photoPatch.tokenImage.startsWith('data:image/png;base64,'));
assert.equal(photoPatch.portraitEditor.source,'lyime-pixel-portrait-creator');
win.PixelPortrait86.launch('online');
assert.equal(linkOpened,'online');
win.PixelPortrait86.launch('download');
assert.equal(linkOpened,'download');
console.log('PASS v0.87: original editor launcher, Android picker, local crop/token, explicit character save, non-redistribution');
