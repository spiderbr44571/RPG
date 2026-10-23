/* Mastermind 0.66 — SRD 5.1 (2014) intelligent D&D spellbook.
 * Open SRD index: CC BY 4.0. House rules are always identified as custom.
 * Pure module: no Android/DOM coupling; older sheet arrays remain valid.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.Mastermind66Grimoire=api})(typeof window!=='undefined'?window:null,function(){
'use strict';
const KEYS={Mago:'wizard',Feiticeiro:'sorcerer',Bruxo:'warlock',Clerigo:'cleric',Druida:'druid',Bardo:'bard',Paladino:'paladin',Patrulheiro:'ranger'};
const ABILITY={Mago:'INT',Feiticeiro:'CHA',Bruxo:'CHA',Clerigo:'WIS',Druida:'WIS',Bardo:'CHA',Paladino:'CHA',Patrulheiro:'WIS'};
const PREPARED=new Set(['Mago','Clerigo','Druida','Paladino']),KNOWN=new Set(['Feiticeiro','Bruxo','Bardo','Patrulheiro']);
const KNOWN_COUNT={
 Bardo:[4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
 Feiticeiro:[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
 Bruxo:[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
 Patrulheiro:[0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11]
};
const SLOTS_FULL=[
[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2],
[4,3,3,3,2,1],[4,3,3,3,2,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]
];
const SLOTS_HALF=[
[],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2],
[4,3,3],[4,3,3],[4,3,3,1],[4,3,3,1],[4,3,3,2],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,1],[4,3,3,3,2],[4,3,3,3,2]
];
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const int=(v,a=0,b=99)=>Math.max(a,Math.min(b,Math.floor(Number(v)||0)));
function spellClass(klass){return KEYS[klass]||null}
function index(catalog){return new Map((catalog||[]).map(x=>[x.id,x]))}
function cantripLimit(klass,level){
 if(!KEYS[klass])return 0;
 if(['Paladino','Patrulheiro'].includes(klass))return 0;
 const l=int(level,1,20);
 if(klass==='Mago')return l>=10?5:l>=4?4:3;
 if(klass==='Feiticeiro')return l>=10?6:l>=4?5:4;
 if(klass==='Bardo'||klass==='Bruxo'||klass==='Druida')return l>=10?4:l>=4?3:2;
 return l>=10?5:l>=4?4:3;
}
function maxSpellLevel(klass,level){
 const l=int(level,1,20);
 if(!KEYS[klass])return 0;
 if(['Paladino','Patrulheiro'].includes(klass))return l<2?0:Math.min(5,Math.floor((l-1)/4)+1);
 if(klass==='Bruxo')return Math.min(5,Math.ceil(l/2));
 return Math.min(9,Math.ceil(l/2));
}
function slotSuggestion(klass,level){
 const l=int(level,1,20);
 if(!KEYS[klass])return {type:'none',slots:{}};
 if(klass==='Bruxo'){
  const rank=maxSpellLevel(klass,l),count=l>=17?4:l>=11?3:l>=2?2:1;
  return {type:'pact',slots:{[rank]:count},shortRest:true};
 }
 const arr=(['Paladino','Patrulheiro'].includes(klass)?SLOTS_HALF:SLOTS_FULL)[l-1];
 return {type:'spellcasting',slots:Object.fromEntries(arr.map((x,i)=>[i+1,x]).filter(([,x])=>x>0)),shortRest:false};
}
function policy(sheet){
 const klass=sheet?.klass||'',level=int(sheet?.level,1,20),caster=!!KEYS[klass],mode=PREPARED.has(klass)?(klass==='Mago'?'spellbook':'prepared'):KNOWN.has(klass)?'known':'none';
 const mod=Math.floor(((sheet?.attrs||{})[ABILITY[klass]]??10)-10)/2;
 const limit=klass==='Mago'||klass==='Clerigo'||klass==='Druida'?Math.max(1,level+mod):
 klass==='Paladino'&&level>=2?Math.max(1,Math.floor(level/2)+mod):0;
 return {klass,level,ability:ABILITY[klass]||'',caster,mode,maxSpellLevel:maxSpellLevel(klass,level),
 cantripLimit:cantripLimit(klass,level),knownLimit:KNOWN_COUNT[klass]?.[level-1]??null,
 preparedLimit:PREPARED.has(klass)?limit:null,spellbookBaseline:klass==='Mago'?6+2*(level-1):null,
 slotRecommendation:slotSuggestion(klass,level)};
}
function counts(sheet){
 const spells=Array.isArray(sheet?.spells)?sheet.spells:[],p=policy(sheet);
 return {cantrips:spells.filter(x=>Number(x.level)===0).length,
 leveled:spells.filter(x=>Number(x.level)>0).length,
 prepared:spells.filter(x=>Number(x.level)>0&&(x.prepared||x.alwaysPrepared)).length,
 countedPrepared:spells.filter(x=>Number(x.level)>0&&x.prepared&&!x.alwaysPrepared).length,
 policy:p};
}
function canLearn(spell,sheet,opts={}){
 const p=policy(sheet),own=Array.isArray(sheet.spells)?sheet.spells:[];
 if(!p.caster)return {ok:false,reason:'Esta classe não possui conjuração básica no SRD 5.1.'};
 if(!spell||!spell.name)return {ok:false,reason:'Magia inválida.'};
 if(!Number.isInteger(Number(spell.level))||Number(spell.level)<0||Number(spell.level)>9)return {ok:false,reason:'Nível de magia inválido.'};
 const level=Number(spell.level);
 if(level>p.maxSpellLevel)return {ok:false,reason:'Círculo acima do permitido para o nível desta classe.'};
 if(spell.classes&&!spell.classes.includes(spellClass(p.klass))&&!opts.exception)return {ok:false,reason:'Esta magia não pertence à lista da classe. Exige uma exceção de classe autorizada na campanha.'};
 if(spell.classes&&spell.classes.length===0&&!opts.exception)return {ok:false,reason:'A magia não possui classe habilitada.'};
 const spellId=spell.id||spell.sourceId||norm(spell.name);
 if(own.some(x=>(x.sourceId||x.id||norm(x.name))===spellId||norm(x.name)===norm(spell.name)))return {ok:false,reason:'Essa magia já consta na ficha.'};
 const totals=counts(sheet);
 if(level===0&&totals.cantrips>=p.cantripLimit&&!opts.exception)return {ok:false,reason:'Limite de truques conhecidos atingido.'};
 if(level>0&&p.knownLimit!=null&&totals.leveled>=p.knownLimit&&!opts.exception)return {ok:false,reason:'Limite de magias conhecidas atingido.'};
 if(level>0&&p.mode==='prepared'&&totals.countedPrepared>=p.preparedLimit&&!opts.exception)return {ok:false,reason:'Limite de magias preparadas atingido.'};
 return {ok:true,reason:''};
}
function addSpell(sheet,spell,options={}){
 const valid=canLearn(spell,sheet,options);
 if(!valid.ok)throw Error(valid.reason);
 sheet.spells??=[];
 const p=policy(sheet),isCantrip=Number(spell.level)===0;
 const item={name:spell.name,level:Number(spell.level),source:options.homebrew?'homebrew':'srd',sourceId:spell.id||spell.sourceId||norm(spell.name),
  prepared:isCantrip||p.mode==='known'||p.mode==='prepared',alwaysPrepared:false,notes:'',exception:!!options.exception};
 sheet.spells.push(item);return item;
}
function togglePrepared(sheet,index,enabled){
 const record=sheet.spells?.[index],p=policy(sheet);
 if(!record)throw Error('Magia não encontrada.');
 if(p.mode==='known')throw Error('Magias conhecidas não usam uma lista de preparação separada.');
 if(Number(record.level)===0)throw Error('Truques não precisam ser preparados.');
 if(record.alwaysPrepared)throw Error('Esta magia é sempre preparada por uma característica específica.');
 if(!PREPARED.has(p.klass))throw Error('Esta classe não pode preparar magias.');
 if(enabled&&counts(sheet).countedPrepared>=p.preparedLimit)throw Error('Limite de magias preparadas atingido.');
 record.prepared=!!enabled;return record;
}
function makeCustomSpell(raw){
 const name=String(raw?.name||'').trim().slice(0,100),level=Number(raw?.level);
 if(name.length<2||!Number.isInteger(level)||level<0||level>9)throw Error('Informe nome e círculo de 0 a 9.');
 const classes=[...new Set((raw.classes||[]).filter(c=>Object.values(KEYS).includes(c)))];
 if(!classes.length)throw Error('Selecione ao menos uma classe que pode usar a magia.');
 const description=String(raw.description||'').trim().slice(0,8000);
 if(description.length<12)throw Error('Descreva o efeito da magia criada (mínimo de 12 caracteres).');
 const id=String(raw.id||'').startsWith('custom-')?raw.id:
 'custom-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36));
 return {id,name,level,school:String(raw.school||'Personalizada').slice(0,64),classes,
  ritual:!!raw.ritual,concentration:!!raw.concentration,castingTime:String(raw.castingTime||'1 ação').slice(0,100),
  range:String(raw.range||'').slice(0,100),duration:String(raw.duration||'').slice(0,100),
  components:String(raw.components||'').slice(0,100),description,homebrew:true};
}
function catalogFor(catalog,custom,klass,opts={}){
 const k=spellClass(klass);
 if(!k)return [];
 const all=[...(catalog||[]),...(custom||[])];
 return all.filter(x=>x.classes?.includes(k)||opts.includeOtherClasses)
 .sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name,'pt-BR'));
}
function suggestedSlotSync(sheet){
 const s=slotSuggestion(sheet.klass,sheet.level);sheet.spellSlots??={};
 for(const [level,max] of Object.entries(s.slots)){
  const old=sheet.spellSlots[level]||{max:0,current:0};
  const spent=Math.max(0,Number(old.max||0)-Number(old.current||0));
  sheet.spellSlots[level]={max,current:Math.max(0,max-spent)};
 }
 for(const level of Object.keys(sheet.spellSlots))if(!s.slots[level])sheet.spellSlots[level]={max:0,current:0};
 return s;
}
return {KEYS,ABILITY,PREPARED,KNOWN,KNOWN_COUNT,policy,counts,index,canLearn,addSpell,togglePrepared,makeCustomSpell,catalogFor,slotSuggestion,suggestedSlotSync,maxSpellLevel};
});
