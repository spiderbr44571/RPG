'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=path.resolve(__dirname,'../app/src/main/assets'),html=fs.readFileSync(path.join(src,'demo-offline.html'),'utf8');
const rules=fs.readFileSync(path.join(src,'rpg37_rules.js'),'utf8');
const sandbox={window:{},globalThis:{}};vm.runInNewContext(rules,sandbox);
const {skillBudget,inventoryBudget}=sandbox.window.RPG37_RULES;
const classes={Combatente:{periciasLivres:'1 + Intelecto',periciasObrigatorias:['Luta ou Pontaria','Fortitude ou Reflexos']},
 Especialista:{periciasLivres:'7 + Intelecto',periciasObrigatorias:[]},
 Ocultista:{periciasLivres:'3 + Intelecto',periciasObrigatorias:['Ocultismo','Vontade']}};
const pack={classes,origens:[{nome:'Acadêmico',pericias:['Ciências','Investigação']}]};
const char={class:'Combatente',origin:'Acadêmico',rank:'Recruta',attrs:{Intelecto:2,Força:1},skills:{Luta:1,Fortitude:1,Percepção:1,Investigação:1}};
let budget=skillBudget(char,pack);
assert.equal(budget.total,3);
assert.equal(budget.used,1);
assert.equal(budget.remaining,2);
assert.equal(budget.missing.length,0);
budget=skillBudget({...char,class:'Especialista'},pack);assert.equal(budget.total,9);
budget=skillBudget({...char,class:'Ocultista'},pack);assert.equal(budget.total,5);assert.equal(budget.missing.length,2);
assert.equal(skillBudget({...char,class:'Other'},pack).known,false);
assert.equal(inventoryBudget({rank:'Recruta',attrs:{Força:0}},[]).capacity,2);
assert.equal(inventoryBudget({rank:'Recruta',attrs:{Força:3}},[]).capacity,15);
let inv=inventoryBudget(char,[{nome:'Item A',categoriaBase:1,espacos:1},{nome:'Item B',categoriaBase:2,espacos:5}]);
assert.equal(inv.used,6);assert.equal(inv.capacity,5);assert.equal(inv.overLimits.length,1);
assert.equal(inv.overLimits[0].category,2);
assert.equal(inv.overloaded,true);
inv=inventoryBudget({...char,rank:'Agente de Elite',attrs:{Força:3}},[{nome:'Item',categoriaBase:4,espacos:1,quantity:3}]);
assert.equal(inv.overLimits[0].max,2);assert.equal(inv.used,3);
const expectedLimits=[[2,0,0,0],[3,1,0,0],[3,2,1,0],[3,3,2,1],[3,3,3,2]];
assert.deepEqual(JSON.parse(JSON.stringify(Object.values(sandbox.window.RPG37_RULES.categoryLimits))),expectedLimits);
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(x=>!x[1].includes('application/json'));
for(let i=0;i<scripts.length;i++)assert.doesNotThrow(()=>new Function(scripts[i][2]),'inline JS '+i);
assert.match(html,/<script src="rpg37_rules\.js"><\/script>/);
for(const removed of ['id="op-effect-add"','id="op-nextturn"','id="op-nextscene"','id="op-undo"','id="op-effects"']){
 assert.ok(!html.includes(removed),'old control still present: '+removed);
}
assert.match(html,/Habilidades do personagem/);
assert.match(html,/id="r37-skills-budget"/);
assert.match(html,/function renderItems\(\)/);
assert.match(html,/RPG37_RULES\?\.inventoryBudget/);
assert.match(html,/data-train/);
assert.match(html,/const destination=e\.target\.value/);
const selection=s=>s.slice(s.indexOf("$('#rpg05-char-select').addEventListener('change'"),s.indexOf("$('#rpg05-new-char').onclick"));
assert.match(selection(html),/persistCurrent\(\);activateCharacter\(destination\)/);
const persist=s=>s.slice(s.indexOf('function persistCurrent()'),s.indexOf('let selectionRendering'));
assert.doesNotMatch(persist(html),/renderCharSelect\(/);
assert.match(html,/r37-inventory-warning/);
console.log('PASS v0.37: multi-character selector, skills budget, rank caps, carrying space, UI cleanup');
