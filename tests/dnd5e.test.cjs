'use strict';
const assert=require('node:assert/strict'),E=require('../app/src/main/assets/rpg18_dnd_engine.js');
const P=require('../app/src/main/assets/rpg17_sheet_pdf.js');
const d=E.create('Aventureira');
assert.equal(d.systemId,'d-d');assert.equal(d.edition,'5e-2014');
assert.equal(E.modifier(8),-1);assert.equal(E.modifier(10),0);assert.equal(E.modifier(15),2);assert.equal(E.modifier(20),5);
assert.equal(E.proficiencyBonus(1),2);assert.equal(E.proficiencyBonus(4),2);assert.equal(E.proficiencyBonus(5),3);assert.equal(E.proficiencyBonus(9),4);assert.equal(E.proficiencyBonus(17),6);
d.level=5;d.attrs.DEX=16;d.attrs.WIS=14;d.skillProficiencies=['Furtividade','Percepcao'];d.expertise=['Furtividade'];d.saveProficiencies=['DEX'];d.spellcastingAbility='WIS';
let v=E.derive(d);
assert.equal(v.skills.Furtividade,9); // dex +3 plus doubled proficiency +6
assert.equal(v.skills.Percepcao,5);
assert.equal(v.passivePerception,15);
assert.equal(v.saves.DEX,6);
assert.equal(v.spellDC,13);
assert.equal(v.spellAttack,5);
assert.equal(v.initiative,3);
assert.equal(v.armorClass,13);
for(const mode of ['normal','advantage','disadvantage']){
 const roll=E.rollD20(3,mode);
 assert.ok(roll.faces.every(x=>x>=1&&x<=20));
 assert.equal(roll.total,roll.chosen+3);
 if(mode==='normal')assert.equal(roll.faces.length,1);
 else assert.equal(roll.faces.length,2);
 if(mode==='advantage')assert.equal(roll.chosen,Math.max(...roll.faces));
 if(mode==='disadvantage')assert.equal(roll.chosen,Math.min(...roll.faces));
}
for(const notation of ['1d20','2d6+2','4d8-1']){
 const r=E.rollDice(notation);assert.equal(r.total,r.faces.reduce((a,b)=>a+b,r.bonus));
}
assert.throws(()=>E.rollDice('500d6'),/Use ate|Use até/);
assert.throws(()=>E.normalize({...d,edition:'5e-2024'}),/incompatível/);
const restored=E.normalize(d);
assert.equal(restored.systemId,'d-d');assert.equal(restored.edition,'5e-2014');
assert.notEqual(restored.id,d.id);
const file=P.exported('d-d',d),buf=P.makePdf(file),found=P.readPdf(buf);
assert.deepEqual(found,file);
assert.equal(found.sheet.edition,'5e-2014');
assert.equal(found.sheet.skillProficiencies[0],'Furtividade');
console.log('PASS D&D 5e: proficiências, habilidades, d20, 3 modes, edição isolada e PDF reversível.');
