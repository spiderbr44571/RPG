'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.resolve(__dirname,'../app/src/main/assets',p),'utf8');
const V=require('../app/src/main/assets/mastermind72_volume.js');
const torch={x:2.5,y:3.5,kind:'torch',radius:3,rotation:0};
assert.ok(V.exposureAt(2.6,3.6,[],[torch])>.9);
assert.ok(V.exposureAt(4.5,3.5,[],[torch])>0,'torch works behind the holder');
assert.equal(V.exposureAt(5.5,3.5,[],[torch]),0,'torch never passes 3 squares');
assert.ok(V.exposureAt(.5,3.5,[],[torch])>0,'torch emits in all directions');
assert.equal(V.exposureAt(4.5,3.5,[],[{...torch,rotation:180}]),V.exposureAt(4.5,3.5,[],[torch]),'torch does not rotate its beam');
const beam={x:2.5,y:3.5,kind:'lantern',radius:8,rotation:0};
assert.ok(V.exposureAt(5.5,3.5,[],[beam])>0,'lantern keeps directional beam');
assert.equal(V.exposureAt(.5,3.5,[],[beam]),0,'lantern cannot shine backwards');
for(const js of ['rpg31_player_table.js','mastermind72_volume.js'])assert.doesNotThrow(()=>new Function(src(js)));
const player=src('rpg31_player_table.js'),html=src('lan_scene.html');
assert.doesNotMatch(player,/m72-player-controls|m72-player-angle|m72-player-lamp/);
assert.doesNotMatch(html,/m72-player-controls|m72-player-angle|m72-player-lamp/);
assert.match(html,/id="m73-light-toggle"/);
assert.match(html,/#m73-light-toggle\[hidden\]\{display:none!important\}/);
assert.match(player,/m73-rotate-arrow/);
assert.match(player,/\[-15,15\]/);
assert.match(player,/showRotation=true;mountRotationButtons\(\)/);
assert.match(player,/kind=own\?\.lightKind\|\|''/);
assert.match(player,/torch\.hidden=!kind/);
assert.match(player,/setLight\(\{rotation\}\)/);
const java=fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
for(const code of ['private static String lightEquipment(', 'private static String lightFromCollection(', 'return "lantern";', 'return "torch";',
 'if(input.getBoolean("flashlight")&&lightEquipment(sheetForLight(c,t)).isEmpty())',
 'String light=validTokenLight(campaign,original);', 'safe.put("lightKind",light).put("flashlightRadius","lantern".equals(light)?8:3)',
 'if("torch".equals(type)||"magic".equals(type))','result=Math.max(result,(1-fade(dist/3.0))*.99)',
 'if(own)visible.put("lightKind",validTokenLight(c,t))','if(token.has("flashlightRadius"))gridNumber(token,"flashlightRadius",1,15)'])
 assert.ok(java.includes(code),'Missing server authority: '+code);
assert.match(src('demo-offline.html'),/>v0\.(?:73|74)<\/small>/);
assert.match(fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8'),/versionCode (?:73|74)/);
console.log('PASS v0.73: on-token 15 degree arrows, no bottom HUD slider, inventory-gated torch/lantern/magic and 3-square radial torch');
