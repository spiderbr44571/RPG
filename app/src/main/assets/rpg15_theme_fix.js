(()=>{'use strict';
const root=document.documentElement;
let last='';
function getAccent(){
 const raw=getComputedStyle(root).getPropertyValue('--accent').trim();
 return /^#[0-9a-f]{6}$/i.test(raw)?raw:'#c7a87b';
}
function contrast(hex){
 const v=parseInt(hex.slice(1),16),r=(v>>16)&255,g=(v>>8)&255,b=v&255;
 return (.2126*r+.7152*g+.0722*b)>150?'#17131c':'#fffafc';
}
function set(node,key,value){if(node)node.style.setProperty(key,value,'important')}
function reset(node,key){if(node)node.style.removeProperty(key)}
function refresh(){
 const base=root.dataset.paranormal==='base';
 const accent=getAccent();
 const stamp=(base?'base':'other')+accent;
 if(stamp===last)return;
 last=stamp;
 const die=document.querySelector('#r09-dice');
 const face=die?.querySelector('.die-shell'),wire=die?.querySelector('.die-wire'),num=die?.querySelector('.r09-die-num');
 if(base){
  const ink=contrast(accent);
  set(face,'fill',accent);set(face,'stroke',ink);
  set(wire,'stroke',ink);set(wire,'opacity','1');
  set(num,'fill',ink);set(num,'stroke','none');
  set(die,'background','color-mix(in srgb,'+accent+' 25%,#18141e)');
  set(die,'border-color',accent);
  set(die,'filter','drop-shadow(0 0 13px '+accent+')');
  die?.setAttribute('data-picker-accent',accent);
 }else{
  for(const n of [face,wire,num])for(const k of ['fill','stroke','opacity'])reset(n,k);
  for(const k of ['background','border-color','filter'])reset(die,k);
  die?.removeAttribute('data-picker-accent');
 }
}
const css=document.createElement('style');css.id='rpg15-theme-dice-css';
css.textContent='html[data-paranormal="base"] #r09-dice .r09-poly .die-shell{fill:var(--accent)!important;stroke:var(--accent-foreground,#ffffff)!important;stroke-width:3!important}html[data-paranormal="base"] #r09-dice .r09-poly .die-wire{stroke:var(--accent-foreground,#ffffff)!important;opacity:1!important;stroke-width:2.5!important}html[data-paranormal="base"] #r09-dice .r09-poly .r09-die-num{fill:var(--accent-foreground,#ffffff)!important}html[data-paranormal="base"] .v101-die svg path:first-child{fill:var(--accent)!important;stroke:var(--accent-foreground,#ffffff)!important}html[data-paranormal="base"] .v101-die .v101-die-face{color:var(--accent-foreground,#ffffff)!important;text-shadow:0 1px 6px #0006!important}';
document.head.appendChild(css);
const schedule=()=>requestAnimationFrame(refresh);
new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['style','data-paranormal']});
for(const event of ['input','change','click','pointerup'])document.addEventListener(event,e=>{if(e.target.closest('#screen-settings')||e.target.closest('[data-v10-theme]'))schedule()},true);
window.addEventListener('pageshow',schedule);
setInterval(refresh,1800);
refresh();
})();