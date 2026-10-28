'use strict';
/**
 * Determine whether the remote Godot editor actually produced a non-flat frame.
 * did-finish-load alone does NOT mean its WebAssembly/WebGL application started.
 * Probe only a small palette sample to avoid copying user portraits or tokens.
 */
function frameHasDetail(image){
 try{
  if(!image||image.isEmpty())return false;
  const {width,height}=image.getSize();
  if(width<120||height<100)return false;
  const pixels=image.toBitmap();
  const stride=Math.floor(pixels.length/height);
  if(stride<width*4)return false;
  let min=255,max=0;
  const colors=new Set();
  // Ignore edges, where the iframe's background may differ from the game.
  for(let y=Math.floor(height*.15);y<height*.85;y+=Math.max(3,Math.floor(height/15))){
   for(let x=Math.floor(width*.15);x<width*.85;x+=Math.max(3,Math.floor(width/18))){
    const i=y*stride+x*4;
    const b=pixels[i],g=pixels[i+1],r=pixels[i+2];
    if(r===undefined)continue;
    const intensity=(r+g+b)/3;
    min=Math.min(min,intensity);max=Math.max(max,intensity);
    colors.add([r>>4,g>>4,b>>4].join(':'));
   }
  }
  return colors.size>=6&&max-min>=28;
 }catch{return false;}
}
module.exports={frameHasDetail};
