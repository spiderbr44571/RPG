/* Mastermind 0.98 — use the real, already-installed system catalogs.
 * No creatures are duplicated here: creature editing remains in Bestiary.
 * No proprietary books are bundled; these adapters read existing public/indexed metadata.
 */
(function(root,factory){
 const api=factory(root||{});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MastermindSystemCatalog=api;
})(typeof window!=='undefined'?window:null,function(root){
 'use strict';
 const names={
  'ordem-paranormal':{powers:'Poderes de classe',paranormal:'Poderes paranormais',abilities:'Habilidades de classe, trilha e origem',rituals:'Rituais',progression:'Evolução por NEX',skills:'Perícias',equipment:'Equipamentos, modificações e maldições'},
  'd-d':{powers:'Classes e opções de classe',paranormal:'Talentos e poderes personalizados',abilities:'Características e habilidades de classe',rituals:'Magias e rituais (SRD)',progression:'Progressão por nível',skills:'Perícias',equipment:'Equipamentos'},
  gurps:{powers:'Vantagens',paranormal:'Desvantagens',abilities:'Qualidades menores e peculiaridades',rituals:'Magias e técnicas',progression:'Atributos e pontos de personagem',skills:'Perícias',equipment:'Equipamentos e armas'},
  'chamado-de-ctchulhu':{powers:'Ocupações',paranormal:'Poderes personalizados',abilities:'Características do investigador',rituals:'Rituais e conhecimentos',progression:'Evolução das perícias',skills:'Perícias',equipment:'Equipamentos do investigador'}
 };
 const text=v=>String(v??'').trim();
 const id=(...v)=>v.map(text).filter(Boolean).join('::').slice(0,155);
 const arr=v=>Array.isArray(v)?v:[];
 const asName=x=>typeof x==='string'?x:text(x?.name||x?.nome||x?.title||'');
 const copy=x=>JSON.parse(JSON.stringify(x));
 function entry(name,fields={}){
  if(!text(name))return null;
  return {name:text(name),id:text(fields.id||name),...fields};
 }
 function collect(values){
  const seen=new Set(),result=[];
  for(const value of values||[]){if(!value?.name||!value?.id||seen.has(value.id))continue;seen.add(value.id);result.push(value);}
  return result;
 }
 function order(type){
  const p=root.OP13?.pack||{},cl=root.MastermindClassCatalog?.classPowers||{},list=[];
  if(type==='powers'){
   for(const [klass,powers] of Object.entries(cl))for(const name of arr(powers))
    list.push(entry(name,{id:id(klass,name),className:klass,category:'Poder de classe',page:root.MastermindClassCatalog?.classPowerPage?.[klass]||''}));
  }
  if(type==='paranormal')for(const x of arr(p.poderesParanormais))
   list.push(entry(x.nome,{id:x.nome,element:x.elemento,category:'Poder paranormal',page:x.paginaLivro,description:x.resumo||''}));
  if(type==='abilities'){
   for(const o of arr(p.origens))if(o.poder)list.push(entry(o.poder,{id:id('origem',o.nome),category:'Poder de origem',className:o.nome,description:'Origem: '+o.nome,source:'Índice do sistema'}));
   for(const [klass,x] of Object.entries(p.classes||{})){
    const baselines={Combatente:['Ataque Especial'],Especialista:['Perito','Eclético'],Ocultista:['Escolhido pelo Outro Lado']};
    for(const n of baselines[klass]||[])list.push(entry(n,{id:id('classe',klass,n),className:klass,category:'Habilidade base',description:'Concedida pela classe '+klass}));
    for(const trilha of arr(x.trilhas))list.push(entry(trilha,{id:id('trilha',klass,trilha),className:klass,category:'Trilha',description:'Trilha de '+klass}));
   }
  }
  if(type==='rituals')for(const x of arr(p.rituais))list.push(entry(x.nome||x.id,{id:x.id||x.nome,category:'Ritual',element:x.elemento,level:x.circulo,points:x.custoBasePE,page:x.paginaLivro,description:x.resumo||''}));
  if(type==='progression')for(const x of arr(p.progressao))list.push(entry('NEX '+x.nex+'%',{id:String(x.nex),level:x.nex,points:x.limitePE,category:'Evolução por NEX',description:([x.marco,'Limite de PE por turno: '+x.limitePE].filter(Boolean).join(' · '))}));
  if(type==='skills')for(const x of arr(p.pericias))list.push(entry(x.nome,{id:x.nome,element:x.atributo,category:x.soTreinado?'Somente treinada':'Perícia',description:x.descricao||''}));
  if(type==='equipment')for(const [section,category] of [['armas','Arma'],['gerais','Equipamento'],['modificacoes','Modificação'],['maldicoes','Maldição']]){
   for(const x of arr(p.equipamentos?.[section]))list.push(entry(x.nome,{id:id(section,x.nome),category:category,element:x.elemento||'',points:x.categoriaBase??x.categoriaExtra??'',slots:x.espacos??'',damage:x.dano||'',page:x.paginaLivro,description:x.efeito?typeof x.efeito==='string'?x.efeito:JSON.stringify(x.efeito):'',original:copy(x),source:'Catálogo instalado'}));
  }
  return collect(list);
 }
 function dnd(type){
  const engine=root.RPG18_DND_ENGINE||{},srd=arr(root.Mastermind63SRD),spells=arr(root.Mastermind66SpellCatalog),out=[];
  if(type==='powers'){
   for(const [key,value] of Object.entries(engine.CLASSES||{}))
    out.push(entry(engine.CLASSES_PT?.[key]||key,{id:key,category:'Classe',points:value.hitDie,description:'Classe SRD. Dado de vida: d'+value.hitDie+'.'}));
  }
  if(type==='abilities'){
   for(const x of srd.filter(x=>x.kind==='Habilidade de classe SRD 5.1'))
    out.push(entry(x.name,{id:id(x.className,x.name,x.level),className:x.className,level:x.level,category:'Habilidade de classe',description:x.description,source:x.origin}));
  }
  if(type==='rituals'){
   const desc=new Map(srd.filter(x=>x.kind==='Magia SRD 5.1').map(x=>[x.name,x]));
   for(const x of spells)out.push(entry(x.name,{id:x.id||x.name,category:'Magia',level:x.level,element:x.school,classes:arr(x.classes),cost:x.castingTime,description:desc.get(x.name)?.description||'',source:'SRD 5.1'}));
  }
  if(type==='progression')for(let level=1;level<=20;level++)
   out.push(entry('Nível '+level,{id:String(level),level,points:engine.proficiencyBonus?.(level)??'',category:'Progressão',description:'Bônus de proficiência: +'+(engine.proficiencyBonus?.(level)??'?')}));
  if(type==='skills')for(const [name,attr] of Object.entries(engine.SKILLS||{}))
   out.push(entry(engine.LABELS?.[name]||name,{id:name,element:engine.LABELS?.[attr]||attr,category:'Perícia',description:'Atributo-base: '+(engine.LABELS?.[attr]||attr)}));
  if(type==='equipment'){const s=root.RPG18_DND?.current||{};for(const field of ['inventory','attacks']){
   for(const x of arr(s[field])){const name=asName(x);if(name)out.push(entry(name,{id:id(field,name),category:field==='attacks'?'Ataque registrado':'Item da ficha',description:text(x?.description||''),source:'Personagem selecionado'}));}
  }}
  return collect(out);
 }
 function gurps(type){
  const traits=arr(root.GURPS4_BASIC_TRAITS),skills=arr(root.GURPS4_LITE_SKILLS),s=root.RPG16_GURPS?.current||{},out=[];
  if(type==='powers'||type==='paranormal'||type==='abilities'){
   const categories=type==='powers'?['advantages']:type==='paranormal'?['disadvantages']:['quirks','perks'];
   for(const x of traits.filter(x=>categories.includes(x.category))){
    const n=x.namePt||x.name;
    out.push(entry(n,{id:id(x.category,x.name),category:x.category,points:x.points??'',page:x.pagePt||x.reference,description:x.points===null?'Pontos variáveis, consulte o livro.':'Custo nominal: '+x.points+' ponto(s).',source:'Índice GURPS 4e'}));
   }
  }
  if(type==='rituals'){
   for(const k of ['spells','techniques'])for(const x of arr(s[k])){const name=asName(x);if(name)out.push(entry(name,{id:id(k,name),category:k==='spells'?'Magia da ficha':'Técnica da ficha',points:x.points??'',description:text(x.notes||''),source:'Personagem selecionado'}));}
  }
  if(type==='progression'){
   for(const [attr,points] of Object.entries(root.GURPS4_ENGINE?.costs||{}))
    out.push(entry(attr,{id:attr,points,category:'Custo por atributo',description:'Custo nominal por ponto de atributo: '+points+' pontos de personagem.'}));
  }
  if(type==='skills')for(const x of skills)out.push(entry(x.name,{id:x.name,element:x.attr,category:'Perícia',description:'Dificuldade: '+x.diff,source:'Índice GURPS Lite'}));
  if(type==='equipment')for(const field of ['items','weapons'])for(const x of arr(s[field])){
   const name=asName(x);if(name)out.push(entry(name,{id:id(field,name),category:field==='weapons'?'Arma da ficha':'Equipamento da ficha',points:x.weight??'',damage:x.damage||'',description:text(x.notes||''),source:'Personagem selecionado'}));
  }
  return collect(out);
 }
 function coc(type){
  const e=root.COC7_ENGINE||{},c=root.MastermindCoc7?.current||{},out=[];
  if(type==='powers')for(const [occupation,skills] of Object.entries(e.professions||{}))
   out.push(entry(occupation,{id:occupation,category:'Ocupação',description:'Perícias: '+arr(skills).join(', ')}));
  if(type==='abilities')for(const name of arr(e.ATTRS))out.push(entry(name,{id:name,category:'Característica',description:'Característica percentual do investigador.'}));
  if(type==='rituals')for(const field of ['spells','inventory'])if(field==='spells')for(const x of arr(c[field])){
   const name=asName(x);if(name)out.push(entry(name,{id:name,category:'Conhecimento da ficha',source:'Investigador selecionado'}));
  }
  if(type==='progression')out.push(entry('Revisão de perícias marcadas',{id:'skill-checks',category:'Evolução por uso',description:'Após o cenário, verifica as perícias marcadas. O motor de Chamado de Cthulhu processa os testes de evolução.'}));
  if(type==='skills')for(const [name,value] of Object.entries(e.BASE_SKILLS||{}))
   out.push(entry(name,{id:name,points:value,category:'Perícia percentual',description:'Valor inicial: '+value+'%'}));
  if(type==='equipment')for(const x of arr(c.inventory)){
   const name=asName(x);if(name)out.push(entry(name,{id:name,category:'Equipamento da ficha',source:'Investigador selecionado'}));
  }
  return collect(out);
 }
 function defaults(systemId,type){
  if(!names[systemId])return [];
  if(systemId==='ordem-paranormal')return order(type);
  if(systemId==='d-d')return dnd(type);
  if(systemId==='gurps')return gurps(type);
  return coc(type);
 }
 function labels(systemId){return names[systemId]||{};}
 return {defaults,labels,systems:Object.keys(names)};
});
