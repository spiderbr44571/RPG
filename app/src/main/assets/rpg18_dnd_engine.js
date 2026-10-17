/* D&D 5e (2014) — rules derived from SRD 5.1 CC BY 4.0.
 * Only source-neutral mechanics and user-authored sheet content are stored.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RPG18_DND_ENGINE=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ATTRS=['STR','DEX','CON','INT','WIS','CHA'];
 const SKILLS={Acrobacia:'DEX',Arcanismo:'INT',Atletismo:'STR',Atuacao:'CHA',Enganacao:'CHA',Furtividade:'DEX',Historia:'INT',Intimidacao:'CHA',Intuicao:'WIS',Investigacao:'INT',LidarComAnimais:'WIS',Medicina:'WIS',Natureza:'INT',Percepcao:'WIS',Persuasao:'CHA',Prestidigitacao:'DEX',Religiao:'INT',Sobrevivencia:'WIS'};
 const LABELS={STR:'Força',DEX:'Destreza',CON:'Constituição',INT:'Inteligência',WIS:'Sabedoria',CHA:'Carisma',Acrobacia:'Acrobacia',Arcanismo:'Arcanismo',Atletismo:'Atletismo',Atuacao:'Atuação',Enganacao:'Enganação',Furtividade:'Furtividade',Historia:'História',Intimidacao:'Intimidação',Intuicao:'Intuição',Investigacao:'Investigação',LidarComAnimais:'Lidar com Animais',Medicina:'Medicina',Natureza:'Natureza',Percepcao:'Percepção',Persuasao:'Persuasão',Prestidigitacao:'Prestidigitação',Religiao:'Religião',Sobrevivencia:'Sobrevivência'};
 const CLASSES={Barbaro:{hitDie:12},Bardo:{hitDie:8},Bruxo:{hitDie:8},Clerigo:{hitDie:8},Druida:{hitDie:8},Feiticeiro:{hitDie:6},Guerreiro:{hitDie:10},Ladino:{hitDie:8},Mago:{hitDie:6},Monge:{hitDie:8},Paladino:{hitDie:10},Patrulheiro:{hitDie:10}};
 const CLASSES_PT={Barbaro:'Bárbaro',Bardo:'Bardo',Bruxo:'Bruxo',Clerigo:'Clérigo',Druida:'Druida',Feiticeiro:'Feiticeiro',Guerreiro:'Guerreiro',Ladino:'Ladino',Mago:'Mago',Monge:'Monge',Paladino:'Paladino',Patrulheiro:'Patrulheiro'};
 const clamp=(v,min,max,def=min)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):def;
 const modifier=value=>Math.floor((clamp(value,1,30,10)-10)/2);
 const proficiencyBonus=level=>Math.min(6,2+Math.floor((clamp(level,1,20,1)-1)/4));
 const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'dnd-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
 function create(name='Novo aventureiro'){
  return {systemId:'d-d',edition:'5e-2014',id:uid(),name,level:1,klass:'Guerreiro',ancestry:'',background:'',alignment:'',experience:0,attrs:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},saveProficiencies:[],skillProficiencies:[],expertise:[],inspiration:false,armorClass:null,initiativeBonus:0,speed:9,hitPointsMax:10,hitPointsCurrent:10,hitPointsTemp:0,hitDiceUsed:0,spellcastingAbility:'',spellSlots:{},spells:[],inventory:[],attacks:[],features:[],conditions:[],languages:[],portrait:'',description:'',history:'',notes:''};
 }
 function derive(s){
  const attrs=s.attrs||{},mods=Object.fromEntries(ATTRS.map(k=>[k,modifier(attrs[k])])),pb=proficiencyBonus(s.level);
  const skills=Object.fromEntries(Object.entries(SKILLS).map(([k,v])=>[k,mods[v]+(s.expertise?.includes(k)?2*pb:s.skillProficiencies?.includes(k)?pb:0)]));
  const saves=Object.fromEntries(ATTRS.map(k=>[k,mods[k]+(s.saveProficiencies?.includes(k)?pb:0)]));
  const spellMod=mods[s.spellcastingAbility]??null;
  return {mods,pb,skills,saves,initiative:mods.DEX+clamp(s.initiativeBonus,-30,30,0),armorClass:s.armorClass==null?10+mods.DEX:clamp(s.armorClass,0,50,10),passivePerception:10+skills.Percepcao,spellDC:spellMod==null?null:8+pb+spellMod,spellAttack:spellMod==null?null:pb+spellMod,hitDie:CLASSES[s.klass]?.hitDie||8};
 }
 function normalize(data){
  if(!data||data.systemId!=='d-d'||data.edition!=='5e-2014'||!data.attrs||Array.isArray(data.attrs))throw Error('Ficha incompatível: apenas D&D 5e (2014).');
  const base=create(String(data.name||'Novo aventureiro').slice(0,100));
  const out={...base,...JSON.parse(JSON.stringify(data)),id:uid(),systemId:base.systemId,edition:base.edition};
  out.name=String(out.name).slice(0,100);out.level=clamp(out.level,1,20,1);out.klass=CLASSES[out.klass]?out.klass:'Guerreiro';
  out.attrs=Object.fromEntries(ATTRS.map(k=>[k,clamp(data.attrs[k],1,30,10)]));
  for(const key of ['saveProficiencies','skillProficiencies','expertise','spells','inventory','attacks','features','conditions','languages']){
   out[key]=Array.isArray(out[key])?out[key].slice(0,150):[];
  }
  out.saveProficiencies=out.saveProficiencies.filter(k=>ATTRS.includes(k));
  out.skillProficiencies=out.skillProficiencies.filter(k=>Object.prototype.hasOwnProperty.call(SKILLS,k));
  out.expertise=out.expertise.filter(k=>Object.prototype.hasOwnProperty.call(SKILLS,k)&&out.skillProficiencies.includes(k));
  out.hitPointsMax=clamp(out.hitPointsMax,1,100000,10);
  out.hitPointsCurrent=clamp(out.hitPointsCurrent,0,out.hitPointsMax,out.hitPointsMax);
  out.hitPointsTemp=clamp(out.hitPointsTemp,0,100000,0);
  out.armorClass=out.armorClass===null||out.armorClass===''?null:clamp(out.armorClass,0,50,10);
  out.spellcastingAbility=ATTRS.includes(out.spellcastingAbility)?out.spellcastingAbility:'';
  out.spellSlots=out.spellSlots&&typeof out.spellSlots==='object'&&!Array.isArray(out.spellSlots)?out.spellSlots:{};
  out.description=String(out.description||'').slice(0,12000);out.history=String(out.history||'').slice(0,12000);
  out.notes=String(out.notes||'').slice(0,12000);
  out.portrait=typeof out.portrait==='string'&&/^data:image\/(?:jpeg|png|webp);base64,/.test(out.portrait)&&out.portrait.length<950000?out.portrait:'';
  return out;
 }
 function roll(sides=20){const n=clamp(sides,2,100,20);if(typeof crypto!=='undefined'&&crypto.getRandomValues){const v=new Uint32Array(1);crypto.getRandomValues(v);return 1+v[0]%n;}return 1+Math.floor(Math.random()*n)}
 function rollD20(bonus=0,mode='normal'){const a=roll(20),b=mode==='normal'?null:roll(20),chosen=b==null?a:mode==='advantage'?Math.max(a,b):Math.min(a,b);return {faces:b===null?[a]:[a,b],chosen,bonus:Number(bonus)||0,total:chosen+(Number(bonus)||0),critical:chosen===20,fumble:chosen===1};}
 function rollDice(notation){
  const m=/^(\d{1,2})d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/i.exec(String(notation||'').trim());
  if(!m||+m[1]<1||+m[1]>30)throw Error('Use até 30 dados: 2d6+3, 1d8 ou 1d20.');
  const faces=Array.from({length:+m[1]},()=>roll(+m[2])),bonus=Number(m[3]||0);
  return {faces,sides:Number(m[2]),bonus,total:faces.reduce((a,b)=>a+b,bonus)};
 }
 return {ATTRS,SKILLS,LABELS,CLASSES,CLASSES_PT,create,derive,normalize,modifier,proficiencyBonus,rollD20,rollDice};
});