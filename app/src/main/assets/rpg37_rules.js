/* RPG Mesa 0.37 - regras de ficha independentes da interface e dos temas. */
(function(root){'use strict';
const categoryLimits={
 'Recruta':[2,0,0,0],
 'Operador':[3,1,0,0],
 'Agente Especial':[3,2,1,0],
 'Oficial de Operações':[3,3,2,1],
 'Agente de Elite':[3,3,3,2]
};
function skillBudget(character,pack){
 const cls=pack?.classes?.[character?.class]||null;
 if(!cls)return {known:false,remaining:null,warning:'Regras de pericias nao cadastradas para este sistema.'};
 const intelligence=Math.max(0,Math.floor(Number(character.attrs?.Intelecto)||0));
 const base=Number.parseInt(cls.periciasLivres,10);
 if(!Number.isFinite(base))return {known:false,remaining:null,warning:'Calculo de pericias nao cadastrado para esta classe.'};
 const origin=pack.origens?.find(o=>o.nome===character.origin);
 const originSkills=new Set(origin?.pericias||[]);
 const chosen=new Set(Object.keys(character.skills||{}).filter(k=>Number(character.skills[k])>0));
 const mandatory=cls.periciasObrigatorias||[];
 const missing=[],mandatoryChosen=new Set();
 for(const group of mandatory){
  const options=String(group).split(/\s+ou\s+/i).map(x=>x.trim());
  const found=options.find(n=>chosen.has(n)||originSkills.has(n));
  if(found)mandatoryChosen.add(found);else missing.push(options.join(' ou '));
 }
 const chosenFree=[...chosen].filter(n=>!originSkills.has(n)&&!mandatoryChosen.has(n));
 const total=base+intelligence;
 // Treinamentos extras da classe sao independentes de aumentos de grau.
 // Grau 2 so e permitido no NEX 35%, grau 3 no NEX 70%.
 const nex=Math.max(5,Number(character.nex)||5);
 const gradeCap=nex>=70?3:nex>=35?2:1;
 const upgradeStages=[35,70].filter(n=>nex>=n);
 const upgradesTotal=upgradeStages.length*(2+intelligence);
 let upgradesUsed=0;
 const invalidGrades=[];
 const skillNames=new Set([...Object.keys(character.skills||{}),...originSkills]);
 for(const name of skillNames){
  const given=originSkills.has(name)?1:0;
  const grade=Math.max(given,Math.floor(Number(character.skills?.[name])||0));
  if(grade>gradeCap)invalidGrades.push(name);
  upgradesUsed+=Math.max(0,grade-1);
 }
 return {known:true,total,used:chosenFree.length,
  remaining:Math.max(0,total-chosenFree.length),
  excess:Math.max(0,chosenFree.length-total),
  selections:{total,used:chosenFree.length,remaining:Math.max(0,total-chosenFree.length),excess:Math.max(0,chosenFree.length-total)},
  upgrades:{total:upgradesTotal,used:upgradesUsed,remaining:Math.max(0,upgradesTotal-upgradesUsed),
   excess:Math.max(0,upgradesUsed-upgradesTotal),gradeCap,stages:upgradeStages},
  invalidGrades,missing,origin:[...originSkills],mandatory:[...mandatoryChosen],
  warning:missing.length?'Obrigatorias pendentes: '+missing.join('; '):''};
}
function inventoryBudget(character,items){
 const force=Math.max(0,Number(character.attrs?.Força)||0);
 const bonus=Number.isFinite(Number(character.extraCarrySpaces))?Math.max(0,Number(character.extraCarrySpaces)):0;
 const capacity=(force===0?2:force*5)+bonus;
 const list=Array.isArray(items)?items:[];
 const used=list.reduce((n,item)=>n+Math.max(0,Number(item.espacos)||0)*Math.max(1,Math.floor(Number(item.quantity)||1)),0);
 const ranks=['Recruta','Operador','Agente Especial','Oficial de Operações','Agente de Elite'];
 const rank=ranks.find(x=>x.toLowerCase()===(character.rank||'Recruta').toLowerCase())||'Recruta';
 const caps=categoryLimits[rank],counts=[0,0,0,0,0],overCategory=[];
 for(const item of list){
  const curses=Array.isArray(item.maldicoes)?item.maldicoes.length:0;
  const modifications=Array.isArray(item.modificacoes)?item.modificacoes.length:0;
  const category=Math.max(0,(Number(item.categoriaBase)||0)+modifications+(curses?1+curses:0));
  const quantity=Math.max(1,Math.floor(Number(item.quantity)||1));
  if(category>4)overCategory.push({name:item.nome||'Item',category,reason:'Categoria acima de IV'});
  else counts[category]+=quantity;
 }
 const overLimits=counts.slice(1).map((used,i)=>({category:i+1,used,max:caps[i]})).filter(x=>x.used>x.max);
 return {rank,used,capacity,overloaded:used>capacity,immobile:used>capacity*2,
  counts,caps,overLimits,overCategory,canCarry:used<=capacity,known:true};
}
root.RPG37_RULES={skillBudget,inventoryBudget,categoryLimits};
})(typeof window!=='undefined'?window:globalThis);
