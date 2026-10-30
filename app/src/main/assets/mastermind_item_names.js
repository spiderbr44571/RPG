/* Consistent item labels across editable sheets, local inventory and PDF exports. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.MastermindItemNames=api;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const name=x=>String(typeof x==='string'?x:x?.nome??x?.name??'Item').trim();
 const mods=x=>Array.isArray(x?.modificacoes)?x.modificacoes.map(v=>typeof v==='string'?v:v?.nome||v?.name||'').filter(Boolean):[];
 const curses=x=>Array.isArray(x?.maldicoes)?x.maldicoes.map(v=>typeof v==='string'?v:v?.nome||v?.name||'').filter(Boolean):[];
 function format(item){const n=name(item),parts=[...curses(item),...mods(item)].map(v=>String(v).trim()).filter(Boolean);return parts.length?n+' ('+[...new Set(parts)].join(', ')+')':n;}
 return {format,mods,curses};
});