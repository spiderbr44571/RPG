/* RPG Mesa — GURPS 4e: motor de ficha separado das regras de Ordem Paranormal.
   Referências consultadas: GURPS Lite 4e (PT), pp. 2, 4-6, 12-17, 18-29.
   Apenas dados próprios e cálculos — nenhum trecho dos PDFs é incorporado.
*/
(function(root){'use strict';
const costs={ST:10,DX:20,IQ:20,HT:10};
const damageTable={
1:['1d-6','1d-5'],2:['1d-6','1d-5'],3:['1d-5','1d-4'],4:['1d-5','1d-4'],
5:['1d-4','1d-3'],6:['1d-4','1d-3'],7:['1d-3','1d-2'],8:['1d-3','1d-2'],
9:['1d-2','1d-1'],10:['1d-2','1d'],11:['1d-1','1d+1'],12:['1d-1','1d+2'],
13:['1d','2d-1'],14:['1d','2d'],15:['1d+1','2d+1'],16:['1d+1','2d+2'],
17:['1d+2','3d-1'],18:['1d+2','3d'],19:['2d-1','3d+1'],20:['2d-1','3d+2']
};
const skillBase={E:0,A:-1,H:-2,VH:-3};
function clamp(n,min,max){const x=Number(n);return Number.isFinite(x)?Math.min(max,Math.max(min,x)):min;}
function uid(){if(root.crypto?.randomUUID)return root.crypto.randomUUID();const a=new Uint32Array(4);root.crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(8,'0')).join('')}
function create(name='Novo personagem GURPS'){return {
 id:uid(),systemId:'gurps',edition:'4e',name,player:'',concept:'',campaign:'',portrait:'',
 pointBudget:150,unspentBonus:0,techLevel:8,age:'',height:'',weight:'',appearance:'',
 attrs:{ST:10,DX:10,IQ:10,HT:10},
 mod:{hp:0,fp:0,will:0,per:0,speed:0,move:0},
 currentHP:10,currentFP:10,
 advantages:[],disadvantages:[],quirks:[],skills:[],techniques:[],languages:[],cultures:[],spells:[],
 items:[],weapons:[],notes:'',background:'',traitsCost:0,settings:{manualDR:0,shieldDB:0},
 log:[],version:1
};}
function derived(s){
 const a=s.attrs||{};const ST=clamp(a.ST,1,100),DX=clamp(a.DX,1,100),IQ=clamp(a.IQ,1,100),HT=clamp(a.HT,1,100),m=s.mod||{};
 const HP=Math.max(1,ST+clamp(m.hp,-90,90)),FP=Math.max(1,HT+clamp(m.fp,-90,90)),will=Math.max(1,IQ+clamp(m.will,-90,90)),per=Math.max(1,IQ+clamp(m.per,-90,90));
 const speed=Math.max(.25,(DX+HT)/4+clamp(m.speed,-10,10)),move=Math.max(0,Math.floor(speed)+clamp(m.move,-20,20)),basicLift=ST*ST/10;
 const mass=(s.items||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.weight)||0)*Math.max(0,Number(x.qty)||0),0)+
 (s.weapons||[]).reduce((sum,x)=>sum+Math.max(0,Number(x.weight)||0)*Math.max(0,Number(x.qty)||0),0);
 const enc=mass<=basicLift?0:mass<=basicLift*2?1:mass<=basicLift*3?2:mass<=basicLift*6?3:mass<=basicLift*10?4:5;
 const e=enc===5?4:enc, factors=[1,.8,.6,.4,.2];
 const dmg=damageTable[Math.floor(ST)]||null;
 const DR=(s.items||[]).reduce((sum,x)=>sum+(x.equipped?clamp(x.dr,0,999):0),0)+clamp(s.settings?.manualDR||0,0,999);
 return {ST,DX,IQ,HT,HP,FP,will,per,speed,move,basicLift,mass,enc,moveLoaded:enc===5?0:Math.floor(move*factors[e]),dodge:Math.max(0,Math.floor(speed)+3-e+clamp(s.settings?.shieldDB||0,0,9)),DR,thrust:dmg?.[0]||null,swing:dmg?.[1]||null};
}
function spent(s){
 const a=s.attrs||{},m=s.mod||{};
 const attribute=Object.keys(costs).reduce((n,k)=>n+(clamp(a[k],1,100)-10)*costs[k],0);
 const secondary=clamp(m.hp,-90,90)*2+clamp(m.fp,-90,90)*3+clamp(m.will,-90,90)*5+
 clamp(m.per,-90,90)*5+Math.round(clamp(m.speed,-10,10)*20)+clamp(m.move,-20,20)*5;
 const advantages=(s.advantages||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const disadvantages=(s.disadvantages||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const quirks=(s.quirks||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const skills=(s.skills||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const techniques=(s.techniques||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const languages=(s.languages||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const cultures=(s.cultures||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const spells=(s.spells||[]).reduce((n,x)=>n+(Number(x.points)||0),0);
 const misc=Number(s.traitsCost)||0;
 const total=attribute+secondary+advantages+disadvantages+quirks+skills+techniques+languages+cultures+spells+misc;
 return {attribute,secondary,advantages,disadvantages,quirks,skills,techniques,languages,cultures,spells,misc,total,remaining:(Number(s.pointBudget)||0)+(Number(s.unspentBonus)||0)-total};
}
function skillLevel(skill,attrs){
 const p=Number(skill.points)||0;if(p<1)return null;
 const difficulty=skill.diff||'A';let offset=skillBase[difficulty];if(offset==null)return null;
 if(p>=8)offset+=3+Math.floor((p-8)/4);
 else if(p>=4)offset+=2;
 else if(p>=2)offset+=1;
 const basis=Number(attrs?.[skill.attr]||10);
 const bonus=Number(skill.bonus)||0;
 return basis+offset+bonus;
}
function die(size=6){
 if(!root.crypto?.getRandomValues)throw Error('Geração aleatória criptográfica indisponível.');
 const out=new Uint32Array(1),limit=Math.floor(4294967296/size)*size;
 do{root.crypto.getRandomValues(out)}while(out[0]>=limit);
 return out[0]%size+1;
}
function roll(target,modifier=0,fn=die){
 const t=Number(target)+Number(modifier),faces=[fn(6),fn(6),fn(6)],total=faces.reduce((a,b)=>a+b,0),margin=t-total;
 const criticalSuccess=total<=4||(total===5&&t>=15)||(total===6&&t>=16);
 const criticalFailure=total===18||(total===17&&t<=15)||total>=t+10;
 const grade=criticalSuccess?'Sucesso decisivo':criticalFailure?'Falha crítica':total<=t?'Sucesso':'Falha';
 return {faces,total,target:t,margin,grade,success:criticalSuccess||(!criticalFailure&&total<=t),criticalSuccess,criticalFailure};
}
function parseDamage(text,s){
 const d=derived(s),raw=String(text||'').toLowerCase().trim().replace(/\s+/g,'');
 let base='',extra=0;
 let term=/^(thr|thrust|gdp|sw|swing|geb)([+-]\d+)?$/.exec(raw);
 if(term){base=['thr','thrust','gdp'].includes(term[1])?d.thrust:d.swing;extra=Number(term[2]||0);}
 else base=raw;
 if(!base)return null;
 const m=/^([1-9]\d?)d6?([+-]\d+)?$/.exec(base);
 if(!m)return null;
 return {dice:Number(m[1]),bonus:Number(m[2]||0)+extra,formula:text};
}
function rollDamage(formula,s,fn=die){
 const exp=parseDamage(formula,s);if(!exp||exp.dice>30)throw Error('Expressão de dano não suportada; consulte a tabela do livro.');
 const faces=Array.from({length:exp.dice},()=>fn(6));
 return {faces,total:Math.max(0,faces.reduce((a,b)=>a+b,0)+exp.bonus),modifier:exp.bonus};
}
const api={create,derived,spent,skillLevel,roll,rollDamage,parseDamage,damageTable,skillBase,costs};
root.GURPS4_ENGINE=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);