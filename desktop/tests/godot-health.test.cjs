'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {frameHasDetail}=require('../godot-health.cjs');
function picture(pattern){
 const width=320,height=200,pixels=Buffer.alloc(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const value=pattern(x,y);
  pixels[i]=value[0];pixels[i+1]=value[1];pixels[i+2]=value[2];pixels[i+3]=255;
 }
 return {isEmpty:()=>false,getSize:()=>({width,height}),toBitmap:()=>pixels};
}
test('Godot black or flat splash screen is not a successful load',()=>{
 assert.equal(frameHasDetail(picture(()=>[0,0,0])),false);
 assert.equal(frameHasDetail(picture(()=>[23,24,28])),false);
});
test('Godot illustrated/editor frame with real visual detail is accepted',()=>{
 assert.equal(frameHasDetail(picture((x,y)=>[(x+y)%256,(x*3+y)%256,(y*5+x)%256])),true);
});
test('Missing, empty, small or invalid frame is never ready',()=>{
 assert.equal(frameHasDetail(null),false);
 assert.equal(frameHasDetail({isEmpty:()=>true}),false);
 assert.equal(frameHasDetail({isEmpty:()=>false,getSize:()=>({width:1,height:1}),toBitmap:()=>Buffer.alloc(4)}),false);
});
