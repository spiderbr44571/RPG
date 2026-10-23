'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'../app/src/main/assets');
const read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const files=['mastermind63_order_summaries.js','mastermind63_gurps_summaries.js','mastermind63_gurps_skill_pt.js','mastermind63_srd_summaries.js','mastermind62_descriptions.js'];
const ctx={window:{},console};vm.createContext(ctx);
for(const n of files){const s=read(n);assert.doesNotThrow(()=>new Function(s),'Invalid JS '+n);vm.runInContext(s,ctx,{filename:n})}
const api=ctx.window.Mastermind62Descriptions;
assert.ok(api,'Description module must be initialized');
const all=api.allEntries();
const byId=id=>all.filter(x=>x.systemId===id);
const op=byId('ordem-paranormal'),gurps=byId('gurps'),dnd=byId('d-d');
assert.ok(op.length>=200, 'OP catalog should contain concrete descriptions');
assert.ok(gurps.length>=1000, 'GURPS must include traits and skills');
assert.ok(dnd.length>=700, 'D&D must include SRD spells, features and skills');
for(const [name,system] of [['Cinerária','ordem-paranormal'],['Velocidade Mortal','ordem-paranormal'],['Reflexos em Combate','gurps'],['Combat Reflexes','gurps'],['Acrobacia','d-d'],['Fireball','d-d'],['Rage','d-d']]){
 const entry=api.find(name,system);assert.ok(entry,'Not found '+name);assert.ok(entry.description?.length>50,'Missing description '+name);
}
const opRituals=ctx.window.Mastermind63Order.filter(x=>x.kind==='Ritual');
assert.equal(opRituals.length,85,'Every listed OP ritual must receive an effect');
for(const x of opRituals){assert.ok(x.description.length>75,'OP ritual without meaningful summary: '+x.name);const m=/Círculo (\d); custo básico de (\d+) PE/.exec(x.description);assert.ok(m,'Circle/cost missing '+x.name);assert.equal(Number(m[2]),({1:1,2:3,3:6,4:10})[m[1]],'OP circle PE mismatch: '+x.name);}
assert.ok(ctx.window.Mastermind63GURPS.filter(x=>x.sourceDetail==='mechanics').length>=200);
assert.ok(ctx.window.Mastermind63SRD.filter(x=>x.kind.includes('Magia')).length>=300);
assert.ok(ctx.window.Mastermind63SRD.filter(x=>x.kind.includes('Habilidade')).length>=400);
assert.match(read('demo-offline.html'),/mastermind63_srd_summaries.js/);
assert.ok(read('demo-offline.html').indexOf('mastermind63_srd_summaries.js')<read('demo-offline.html').indexOf('mastermind62_descriptions.js'),'Must load data before module');
assert.match(read('demo-offline.html'),/>v0\.(?:63|64)<\/small>/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8'),/versionCode (?:63|64)/);
assert.match(read('mastermind62_descriptions.js'),/if\(!o\[key\]&&val\[key\]\)o\[key\]=val\[key\]/,'Empty details from clicked UI must not overwrite description');
assert.match(read('mastermind62_descriptions.js'),/async function lookupPrivate/);
assert.match(read('mastermind62_descriptions.js'),/getOverrides/);
const pack=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../systems/ordem-paranormal-v1.3.pack.json'),'utf8'));
for(const x of pack.rituais)assert.equal(x.custoBasePE,({1:1,2:3,3:6,4:10})[x.circulo]);
(async()=>{
 const p=await api.lookupPrivate({name:'Acrobacia',systemId:'d-d'});assert.equal(p.length,0);
 console.log('PASS Mastermind v0.63: '+all.length+' entries, 85 OP ritual effects, verified GURPS mechanics, SRD 5e and personal excerpts integration');
})().catch(e=>{console.error(e);process.exitCode=1});
