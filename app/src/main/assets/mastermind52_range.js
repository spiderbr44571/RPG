/* Mastermind 0.52: geometria do mapa + categorias de alcance (informativas).
   A validação de ataques, coberturas, obstáculos, linha de visão e efeitos é do mestre.
   Uma diagonal = 1 quadrado, consistente com o movimento atual no servidor. */
(function(root){
'use strict';
const SCALE={
 'ordem-paranormal':{system:'Ordem Paranormal',unit:'m',size:1.5},
 'd-d':{system:'D&D 5e',unit:'ft',size:5},
 'gurps':{system:'GURPS 4e',unit:'m',size:1}
};
function rule(systemId,gridScale,gridUnit){
 const from=SCALE[systemId];
 const scale=Number(gridScale),custom=Number.isFinite(scale)&&scale>0&&scale<=100;
 return {systemId,system:from?.system||'Sistema personalizado',
   size:custom?scale:(from?.size||0),unit:custom?(gridUnit||from?.unit||'u'):(from?.unit||'u'),
   approximate:systemId==='gurps'||!from};
}
function measure(a,b,config){
 if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
 const dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y);
 const squares=Math.max(dx,dy); // The engine charges one square for each diagonal.
 const d=squares*(config.size||0);
 const rounded=Number(d.toFixed(2));
 return {squares,distance:rounded,unit:config.unit,
  category:category(config.systemId,squares,rounded),
  warning:'Estimativa de grid. Obstáculos, cobertura, tamanho do alvo e linha de visão dependem do mestre.'};
}
function category(systemId,squares,amount){
 if(squares<=0)return 'Mesmo quadrado';
 if(systemId==='ordem-paranormal'){
  if(squares<=1)return 'Corpo a corpo / toque';
  if(amount<=9)return 'Curto';
  if(amount<=18)return 'Médio';
  if(amount<=36)return 'Longo';
  if(amount<=90)return 'Extremo';
  return 'Acima do extremo — somente ilimitado, se a habilidade permitir';
 }
 if(systemId==='d-d')return squares<=1?'Adjacente (alcance de 5 pés)':'Distância em pés — confira o alcance da ação';
 if(systemId==='gurps')return squares<=1?'Adjacente (estimativa)':'Distância estimada — use a regra da campanha';
 return 'Sem categorias automáticas para este sistema';
}
function within(info,mode){
 if(!info)return false;
 const s=info.squares;
 if(mode==='none')return null;
 if(info.unit==='m'&&info.systemId==='ordem-paranormal'){
  if(mode==='melee'||mode==='touch')return s<=1;
  const limit={short:9,medium:18,long:36,extreme:90,infinite:Infinity}[mode];
  return limit===undefined?null:info.distance<=limit;
 }
 if(info.systemId==='d-d'&&mode==='melee')return s<=1;
 return null;
}
function describe(a,b,systemId,gridScale,gridUnit){
 const settings=rule(systemId,gridScale,gridUnit);
 const value=measure(a,b,settings);
 return value?{...settings,...value}:null;
}
const exports={rule,measure,category,within,describe};
if(typeof module!=='undefined'&&module.exports)module.exports=exports;
root.MastermindRange=exports;
})(typeof window!=='undefined'?window:globalThis);
