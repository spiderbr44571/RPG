#!/usr/bin/env node
/* Gera os dados da nova interface (app/src/main/assets/revamp/) a partir das fontes do app:
 *  - dados.js        bestiário: rpg19_order_creatures.js (Ordem 1.3) + rpg18_bestiary.js (SRD 5.1)
 *  - dados-ordem.js  pacote de regras: systems/ordem-paranormal-v1.3.pack.json (o mesmo embutido em demo-offline.html)
 * Uso: node scripts/revamp_dados.cjs [--check]   (--check falha se os arquivos estiverem desatualizados) */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),assets=path.join(root,'app/src/main/assets'),out=path.join(assets,'revamp');
function bestiary(){
 const w={};new Function('window','globalThis','self',fs.readFileSync(path.join(assets,'rpg19_order_creatures.js'),'utf8'))(w,w,w);
 const ordem=w.RPG19_ORDER_CREATURES.map(c=>({name:c.name,element:c.element,hp:c.hp,defense:c.defense,attack:c.attack,damage:c.damage,speed:c.speed,size:c.size,initiative:c.initiative,page:c.page,vd:c.challenge}));
 const src=fs.readFileSync(path.join(assets,'rpg18_bestiary.js'),'utf8');
 const dnd=['Goblin','Lobo','Esqueleto'].map(n=>{const s=src.match(new RegExp("name:'"+n+"'[^}]*"))[0];const g=k=>{const r=s.match(new RegExp(k+":'?([^,']*)'?"));return r?r[1]:null};
  return{name:n,hp:+g('hp'),defense:+g('defense'),attack:g('attack'),damage:g('damage'),vd:g('challenge'),type:g('type'),source:g('source')}});
 return '/* Dados do bestiário da nova interface — gerado de app/src/main/assets/rpg19_order_creatures.js (Ordem Paranormal 1.3)\n   e rpg18_bestiary.js (SRD 5.1, CC BY 4.0). Não editar à mão. */\nwindow.RV_DADOS={ordem:'+JSON.stringify(ordem)+',dnd:'+JSON.stringify(dnd)+'};\n';
}
function ordemPack(){
 const pack=JSON.parse(fs.readFileSync(path.join(root,'systems/ordem-paranormal-v1.3.pack.json'),'utf8'));
 return '/* Pacote de regras de Ordem Paranormal 1.3 — gerado de systems/ordem-paranormal-v1.3.pack.json\n   (idêntico ao bloco op-pack-json de demo-offline.html). Não editar à mão: node scripts/revamp_dados.cjs */\nwindow.RV_ORDEM_PACK='+JSON.stringify(pack)+';\n';
}
const files={'dados.js':bestiary(),'dados-ordem.js':ordemPack()};
const check=process.argv.includes('--check');let stale=[];
for(const [name,content] of Object.entries(files)){const file=path.join(out,name);
 if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)stale.push(name)}else{fs.writeFileSync(file,content);console.log('gerado',path.relative(root,file),content.length,'bytes')}}
if(check){if(stale.length){console.error('Desatualizados: '+stale.join(', ')+'. Rode: node scripts/revamp_dados.cjs');process.exit(1)}console.log('dados da nova interface em dia')}
