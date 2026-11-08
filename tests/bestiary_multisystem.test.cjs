'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=__dirname+'/../app/src/main/assets/';
global.window={};require(base+'rpg19_order_creatures.js');
const rows=window.RPG19_ORDER_CREATURES;
assert.equal(rows.length,48,'48 Ordem creatures indexed');
assert.equal(new Set(rows.map(x=>x.id)).size,48,'unique identifiers');
for(const b of rows){
 assert.equal(b.systemId,'ordem-paranormal');
 assert.equal(b.edition,'1.3');assert.ok(b.page>=180&&b.page<=290);
 assert.ok(b.hp>=1&&b.defense>0);
 assert.ok(b.name&&b.sourceBookId);
 assert.ok(['essenciais_extraidos','requer_conferencia'].includes(b.status));
 if(b.verified)assert.ok(b.attributes);
}
assert.ok(rows.some(x=>x.attacks&&x.attacks.length>1),'multi-action profiles');
// O bestiário e o Canvas da nova interface usam estes mesmos dados (gerados por scripts/revamp_dados.cjs).
const dados=fs.readFileSync(base+'revamp/dados.js','utf8'),canvas=fs.readFileSync(base+'revamp/canvas.js','utf8');
assert.ok(dados.includes('rpg19_order_creatures.js')&&dados.includes('rpg18_bestiary.js'),'bestiary generated from both sources');
assert.ok(canvas.includes('RV.CREATURES'),'canvas spawns from the bestiary');
assert.ok(canvas.includes('RV.doRoll'),'canvas rolls through the shared dice');
const ui=fs.readFileSync(base+'rpg18_bestiary.js','utf8');
for(const expected of ['rpg-v07-bestiary-custom','rpg-v07-bestiary-edit','rpg-v06-monster-images','rpg18-bestiary-by-system-v1','data-canvas','rpg19-image-search-result','rpg19-image-saved','rpg07-pdf-lightbox','RPGv3?.spawnCatalog'])assert.ok(ui.includes(expected),expected);
assert.ok(ui.includes('r19-grid'),'all systems use cards');
console.log('PASS: 48 Order creatures, separate catalog, legacy migration, canvas profile and artwork lookup.');
