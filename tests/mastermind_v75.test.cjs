'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const java=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
for(const fragment of ['closedUnlitRooms(JSONObject map)','java.util.HashSet<String> closed=opaqueBoundaries(map)',
 'if(result.size()>count*.65)result.clear()', 'boolean fogOfWarActive=false;',
 'automaticShadows?closedUnlitRooms(original)', 'addAutomaticShadows(scene,automatic',
 'maskedBackground(original,a,fogOfWarActive?currentVision:null,lightCells,automatic)',
 'isVisibleInFog(original,mx,my,lightCells,automatic)','for(int cell:automatic)']){
 assert.ok(java.includes(fragment),'Missing selective automatic darkness: '+fragment);
}
// O editor antigo foi retirado: a opção fica no Estúdio da nova interface e chega ao servidor por atmosphere.doorShadows.
const estudio=read('revamp/estudio.js'),adaptador=read('revamp/adaptador.js');
assert.match(estudio,/Escurecer salas fechadas sem luz/);
assert.match(estudio,/k==='door-shadows'\)s\.ambient\.doorShadows=!s\.ambient\.doorShadows/);
assert.match(adaptador,/map\.atmosphere=Object\.assign\(\{\},prev\?\.atmosphere\|\|\{\},\{doorShadows:!!scene\.ambient\?\.doorShadows\}\)/);
assert.match(adaptador,/if\(map\.atmosphere\?\.doorShadows===true\)s\.ambient\.doorShadows=true/);
assert.match(read('ferramentas.html'),/>v0\.(?:75|76|76\.1|76\.2|77|78|79|80|81|82|82\.1|83|84|85|85\.1|86|87|88|89|90|91|93|94|95|96|97|98)<\/small>/);
assert.ok(Number(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8').match(/versionCode (\d+)/)[1])>=75);
for(const asset of ['revamp/estudio.js','revamp/adaptador.js'])
 assert.doesNotThrow(()=>new Function(read(asset)),asset);
console.log('PASS v0.75: server-side shadows for closed unlit rooms, toggled from the new Studio');
