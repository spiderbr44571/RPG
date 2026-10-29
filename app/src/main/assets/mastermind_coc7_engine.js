/* Mastermind – Chamado de Cthulhu 7ª edição – motor original de ficha.
 * Fonte mecânica: https://cthulhuwiki.chaosium.com/ (Chaosium, acesso público).
 * Não inclui livros, tabelas de suplementos, conteúdo narrativo ou textos licenciados.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.COC7_ENGINE=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const SYSTEM='chamado-de-ctchulhu',EDITION='7e',KEY='mastermind-coc7-investigadores-v1';
const ATTRS=['STR','CON','SIZ','DEX','APP','EDU','INT','POW'];
const BASE_SKILLS=Object.freeze({
 'Antropologia':1,'Arqueologia':1,'Arte / Ofício':5,'Avaliação':5,'Charme':15,'Ciência':1,
 'Contabilidade':5,'Direito':5,'Disfarce':5,'Escalar':20,'Escutar':20,'Esquivar':0,
 'Furtividade':20,'História':5,'Intimidação':15,'Lábia':5,'Língua estrangeira':1,
 'Língua materna':0,'Medicina':1,'Mundo Natural':10,'Natação':20,'Ocultismo':5,
 'Persuasão':10,'Prestidigitação':10,'Primeiros Socorros':30,'Psicanálise':1,
 'Psicologia':10,'Rastrear':10,'Reparo Mecânico':10,'Reparo Elétrico':10,
 'Saltar':20,'Sobrevivência':10,'Usar Bibliotecas':20,'Encontrar':25,'Crédito':0,
 'Mitos de Cthulhu':0
});
const professions={
 'Jornalista':['Arte / Ofício','História','Usar Bibliotecas','Língua materna','Persuasão','Psicologia','Encontrar','Crédito'],
 'Professor':['Usar Bibliotecas','Língua materna','Psicologia','História','Língua estrangeira','Ciência','Antropologia','Crédito'],
 'Médico':['Primeiros Socorros','Medicina','Psicologia','Ciência','Língua estrangeira','Psicanálise','Usar Bibliotecas','Crédito'],
 'Arqueólogo':['Arqueologia','História','Usar Bibliotecas','Antropologia','Língua estrangeira','Encontrar','Sobrevivência','Crédito'],
 'Investigador':['Direito','Usar Bibliotecas','Psicologia','Encontrar','Disfarce','Furtividade','Persuasão','Crédito']
};
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Math.floor(Number(n)):min));
const thresholds=score=>{const value=clamp(score);return {regular:value,hard:Math.floor(value/2),extreme:Math.floor(value/5)};};
const derived=c=>{
 const a=c.attributes||{};
 const con=clamp(a.CON,0,200),siz=clamp(a.SIZ,0,200),pow=clamp(a.POW,0,200),dex=clamp(a.DEX,0,200),str=clamp(a.STR,0,200);
 const rawAge=clamp(c.age||30,15,110);
 let mov=str<siz&&dex<siz?7:str>=siz&&dex>=siz?9:8;
 mov-=Math.max(0,Math.floor((rawAge-40)/10)+1);
 const sum=str+siz,bonus=sum<65?'-2':sum<85?'-1':sum<125?'0':sum<165?'+1D4':sum<205?'+1D6':'A confirmar pelo Guardião';
 const build=sum<65?-2:sum<85?-1:sum<125?0:sum<165?1:sum<205?2:null;
 return {HP:Math.floor((con+siz)/10),MP:Math.floor(pow/5),SAN:pow,MAX_SAN:Math.max(0,99-clamp(c.skills?.['Mitos de Cthulhu']||0)),LUCK:clamp(c.luck||50),MOV:Math.max(1,mov),damageBonus:bonus,build,initiative:dex};
};
const randomInt=(max,rng)=>{
 if(typeof rng==='function')return Math.max(0,Math.min(max-1,Math.floor(rng()*max)));
 if(typeof crypto!=='undefined'&&crypto.getRandomValues){
  const a=new Uint32Array(1),cap=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(a)}while(a[0]>=cap);return a[0]%max;
 }
 return Math.floor(Math.random()*max);
};
const d100=rng=>randomInt(100,rng)+1;
function roll(skill,rng,bonus=0){
 const value=clamp(skill),count=Math.min(2,Math.abs(Math.trunc(bonus)||0)),unit=randomInt(10,rng);
 const tens=Array.from({length:count+1},()=>randomInt(10,rng));
 const results=tens.map(t=>t*10+unit||100);
 const rolled=bonus>0?Math.min(...results):bonus<0?Math.max(...results):results[0];
 const req=thresholds(value);
 const fumble=(value<50&&rolled>=96)||rolled===100;
 const outcome=rolled===1?'critical':fumble?'fumble':rolled<=req.extreme?'extreme':rolled<=req.hard?'hard':rolled<=req.regular?'regular':'fail';
 return {rolled,rolls:results,bonus:Math.trunc(bonus)||0,skill:value,...req,outcome,success:['critical','extreme','hard','regular'].includes(outcome)};
}
function newCharacter(name='Novo investigador'){
 const attributes={STR:60,CON:50,SIZ:60,DEX:60,APP:50,EDU:70,INT:80,POW:50};
 const skills={...BASE_SKILLS,'Esquivar':Math.floor(attributes.DEX/2),'Língua materna':attributes.EDU};
 const c={id:'coc-'+Date.now().toString(36)+'-'+randomInt(100000).toString(36),systemId:SYSTEM,edition:EDITION,
  name,age:30,occupation:'Investigador',era:'Anos 1920',birthplace:'',residence:'',
  attributes,skills,skillChecks:[],luck:50,resources:{},inventory:[],spells:[],history:'',notes:'',portrait:'',createdAt:Date.now(),updatedAt:Date.now()};
 const base=derived(c);c.resources={HP:{max:base.HP,current:base.HP},MP:{max:base.MP,current:base.MP},SAN:{max:base.MAX_SAN,current:base.SAN},LUCK:{max:100,current:base.LUCK}};return c;
}
function validate(c){
 if(!c||typeof c!=='object'||c.systemId!==SYSTEM)throw Error('Esta não é uma ficha de Chamado de Cthulhu');
 const safe=newCharacter(String(c.name||'Investigador').slice(0,100));
 safe.id=/^coc-[a-z0-9-]{1,90}$/.test(c.id||'')?c.id:safe.id;
 for(const k of ['occupation','era','birthplace','residence','history','notes','portrait'])safe[k]=String(c[k]||'').slice(0,k==='history'||k==='notes'?25000:k==='portrait'?4000000:150);
 safe.age=clamp(c.age||30,15,110);
 for(const k of ATTRS)safe.attributes[k]=clamp(c.attributes?.[k]??safe.attributes[k],1,200);
 for(const [k,v] of Object.entries(c.skills||{}))if(k.length<=100)safe.skills[k]=clamp(v);
 safe.luck=clamp(c.luck??50);
 safe.skillChecks=Array.isArray(c.skillChecks)?c.skillChecks.filter(x=>safe.skills[x]!==undefined).slice(0,60):[];
 safe.inventory=Array.isArray(c.inventory)?c.inventory.filter(x=>typeof x==='string').map(x=>x.slice(0,220)).slice(0,80):[];
 safe.spells=Array.isArray(c.spells)?c.spells.filter(x=>typeof x==='string').map(x=>x.slice(0,180)).slice(0,70):[];
 const d=derived(safe);for(const k of ['HP','MP','SAN','LUCK']){
  const max=k==='SAN'?d.MAX_SAN:k==='LUCK'?100:d[k];
  safe.resources[k]={max,current:clamp(c.resources?.[k]?.current??safe.resources[k]?.current,0,max)};
 }
 safe.createdAt=Number(c.createdAt)||safe.createdAt;safe.updatedAt=Date.now();return safe;
}
function refresh(c){const n=validate(c),d=derived(n);for(const k of ['HP','MP','SAN','LUCK']){const max=k==='SAN'?d.MAX_SAN:k==='LUCK'?100:d[k];n.resources[k].max=max;n.resources[k].current=clamp(n.resources[k].current,0,max);}return n;}
function advancement(c,rng){
 const copy=validate(c),changes=[];
 for(const name of copy.skillChecks){const score=copy.skills[name];if(score===undefined||name==='Mitos de Cthulhu')continue;const rollValue=d100(rng);if(rollValue>score){const improvement=randomInt(10,rng)+1;copy.skills[name]=Math.min(99,score+improvement);changes.push({name,before:score,after:copy.skills[name],roll:rollValue});}}
 copy.skillChecks=[];return {character:refresh(copy),changes};
}
return {SYSTEM,EDITION,KEY,ATTRS,BASE_SKILLS,professions,thresholds,derived,roll,d100,newCharacter,validate,refresh,advancement};
});
