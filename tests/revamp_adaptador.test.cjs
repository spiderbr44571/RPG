/* Nova interface (v0.109 / v1.3.0): conversão entre o cenário do Estúdio e o formato do servidor da mesa,
   recursos das fichas e dados gerados. Roda sem navegador. */
'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),rv=path.join(root,'app/src/main/assets/revamp');
global.window=global;require(path.join(rv,'cena.js'));const A=require(path.join(rv,'adaptador.js'));
const sorted=o=>JSON.stringify(Object.keys(o).sort().map(k=>[k,o[k]]));

test('cenário vai e volta do servidor sem perder terreno, paredes, portas, objetos e névoa',()=>{
 for(const id of ['masmorra','taverna','floresta','caverna','rua']){
  const s=Cena.template(id,24,16);const wall=Object.keys(s.walls)[0];if(wall)s.doors[wall]={type:'secreta',open:false};if(s.objects[1])s.objects[1].hidden=true;
  const {map,warnings}=A.sceneToServer(s,{});assert.deepEqual(warnings,[],id);
  const back=A.serverToScene(JSON.parse(JSON.stringify(map)),Cena,{master:true});
  assert.equal(sorted(back.terrain),sorted(s.terrain),id+' terreno');assert.equal(sorted(back.walls),sorted(s.walls),id+' paredes');
  assert.equal(sorted(back.doors),sorted(s.doors),id+' portas');assert.equal(back.objects.length,s.objects.length,id+' objetos');
  assert.deepEqual(new Set(back.fog),new Set(s.fog),id+' névoa');
 }
});
test('o jogador não recebe notas, objetos ocultos nem a porta secreta fechada',()=>{
 const s=Cena.defaultScene();const k=Object.keys(s.walls)[0];s.doors[k]={type:'secreta',open:false};s.objects[0].hidden=true;
 const {map}=A.sceneToServer(s,{});const props=JSON.stringify(map.layers.props),walls=map.layers.walls;
 assert.ok(!props.includes('"hidden":true'),'objeto oculto nas camadas visíveis');
 assert.ok(!JSON.stringify(walls).includes('secreta'),'porta secreta fechada aparece nas paredes');
 assert.ok(map.v2.notes.length>0&&map.v2.hiddenObjects.length===1&&map.v2.secret.length===1,'dados do mestre guardados em v2');
 const p=A.serverToScene({...map,layers:map.layers,rooms:[],v2:undefined},Cena,{master:false,hiddenCells:[0]});
 assert.equal(p.notes.length,0);assert.deepEqual(p.fog,['0,0']);
});
test('névoa vira até 75 salas ocultas, cobrindo exatamente as casas',()=>{
 const cells=[];for(let y=0;y<10;y++)for(let x=0;x<10;x++)if((x+y)%3)cells.push(x+','+y);
 const rects=A.fogRects(cells,10,10);const cover=new Set();
 rects.forEach(r=>{for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){const k=x+','+y;assert.ok(!cover.has(k),'sobreposição');cover.add(k)}});
 assert.deepEqual(new Set(cells),cover);
});
test('limites do servidor: tamanho mínimo 6, ids válidos e criatura completa',()=>{
 const s=Cena.blank('x',4,4);s.id='cena com espaço';const {map}=A.sceneToServer(s,{});assert.equal(map.width,6);assert.match(map.id,/^[A-Za-z0-9_-]{1,48}$/);
 const t=A.tokenToServer({id:'c1',name:'Zumbi',kind:'foe',x:2,y:3,size:2,speed:7,hp:[10,45],creature:'Zumbi',rot:405},{hp:45,defense:15,attack:'2O+10',damage:'1d8',sys:'ordem',source:'Livro'});
 assert.equal(t.kind,'creature');assert.equal(t.hp,10);assert.equal(t.maxHp,45);assert.equal(t.rotation,45);assert.equal(t.size,2);assert.equal(t.side,'foe');assert.equal(t.movementSquares,7);
 assert.equal(A.tokenToServer({id:'a',name:'Vera',kind:'ally',x:0,y:0,size:1,characterId:'abc123'}).characterId,'abc123');
});
test('dados: notação da nova interface vira a do servidor; o que o servidor não aceita é recusado',()=>{
 assert.deepEqual(A.serverFormula('3O+5'),{formula:'3d20+5',mode:'highest'});
 assert.deepEqual(A.serverFormula('2d6+1','highest'),{formula:'2d6+1',mode:'sum'});
 assert.deepEqual(A.serverFormula('2d20','lowest'),{formula:'2d20',mode:'lowest'});
 assert.equal(A.serverFormula('1d7'),null);assert.equal(A.serverFormula('40d6'),null);
 const log=A.rollToLog({by:'Bia',label:'Teste',formula:'3d20',faces:[4,17,9],total:17,mode:'highest',visibility:'public',at:1});
 assert.equal(log.kept,17);assert.equal(log.vis,'public');
});
test('fichas: recursos do HUD pelos quatro sistemas',()=>{
 global.localStorage={getItem:()=>null,setItem(){}};global.RV={esc:s=>String(s),ic:()=>'',on(){}};global.document={getElementById:()=>null,addEventListener(){}};
 require(path.join(rv,'fichas.js'));const R=RV.Sheets.resources;
 assert.deepEqual(R({systemId:'gurps',attrs:{ST:12,HT:11},mod:{hp:2},currentHP:9}).map(r=>[r.key,r.cur,r.max]),[['HP',9,14],['FP',11,11]]);
 assert.deepEqual(R({systemId:'d-d',hitPointsCurrent:7,hitPointsMax:12}).map(r=>[r.key,r.cur,r.max]),[['PV',7,12]]);
 assert.deepEqual(R({systemId:'chamado-de-ctchulhu',resources:{HP:{current:10,max:12},SAN:{current:50,max:99}}}).map(r=>[r.key,r.readOnly]),[['HP',true],['SAN',false]]);
 assert.deepEqual(R({systemId:'ordem-paranormal',resources:{PV:{current:14,max:16},PE:3}}).map(r=>[r.label,r.cur,r.max]),[['Vida',14,16],['Esforço',3,3]]);
});
test('dados gerados da nova interface estão em dia com as fontes do app',()=>{
 execFileSync(process.execPath,[path.join(root,'scripts/revamp_dados.cjs'),'--check'],{stdio:'pipe'});
});
test('servidor: as duas cópias do LocalCampaignServer são iguais e servem a nova interface',()=>{
 const a=fs.readFileSync(path.join(root,'app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
 const b=fs.readFileSync(path.join(root,'desktop/server/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
 assert.equal(a,b);for(const s of ['revamp(path)','"hiddenCells"','"look"','Lado do token inválido'])assert.ok(a.includes(s),s);
});
