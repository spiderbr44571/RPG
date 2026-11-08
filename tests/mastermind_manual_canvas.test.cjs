'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=path.join(root,'app/src/main/assets');
const canvas=fs.readFileSync(path.join(assets,'revamp/canvas.js'),'utf8');
const index=fs.readFileSync(path.join(assets,'revamp/index.html'),'utf8');

test('O Canvas infinito fica na nova interface e o Canvas antigo foi retirado',()=>{
 assert.ok(!fs.existsSync(path.join(assets,'mastermind42_workspace.js')));
 assert.ok(!fs.existsSync(path.join(assets,'demo-offline.html')));
 assert.match(index,/<script src="canvas\.js"><\/script>/);
 assert.match(index,/data-view="canvas"/);
 assert.match(canvas,/RV\.Canvas=/);
});
test('Usa os mesmos dados salvos de antes, sem migração destrutiva',()=>{
 assert.match(canvas,/KEY='mastermind42-canvas-index',PREFIX='mastermind42-board-',DBNAME='mastermind42-media'/);
 assert.match(canvas,/read\('rpg_canvas_v2'\)/,'Canvas mais antigo ainda é importado no primeiro uso');
 assert.match(canvas,/read\('rpg_encounter_v3'\)/,'Criaturas antigas ainda são importadas no primeiro uso');
 assert.match(canvas,/links:Array\.isArray\(b\.links\)\?b\.links\.filter\(l=>l&&l\.a&&l\.b\)/);
});
test('Ligações só existem quando o mestre escolhe dois itens; nunca automáticas',()=>{
 assert.match(canvas,/function pick\(ref\)\{if\(!C\.linkStart\)\{C\.linkStart=ref/);
 assert.match(canvas,/C\.links\.push\(\{id:uuid\(\),a,b:ref,color:C\.color\}\)/);
 assert.match(canvas,/if\(C\.linkStart===ref\)\{toast\('Escolha um item diferente\.'\)/);
 assert.match(canvas,/svg\.innerHTML=C\.links\.map\(/,'As linhas desenhadas vêm só das ligações salvas');
 assert.doesNotMatch(canvas,/C\.nodes\.map\([^)]*=>[^)]*<path/,'Nada liga cartões sozinho');
});
test('Ligações e itens podem ser removidos sem deixar ligações órfãs',()=>{
 assert.match(canvas,/function unlink\(id\)\{C\.links=C\.links\.filter\(l=>l\.id!==id\)/);
 assert.match(canvas,/C\.links=C\.links\.filter\(l=>l\.a!==ref&&l\.b!==ref\)/);
});
