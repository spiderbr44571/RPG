'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const main=path.resolve(__dirname,'../app/src/main'),assets=path.join(main,'assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const server=fs.readFileSync(path.join(main,'java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
const player=read('rpg31_player_table.js'),gm=read('rpg31_master_table.js'),hud=read('mastermind52_player_experience.js');
const campaigns=read('rpg11_campaigns.js'),master=read('lan_master.html'),css=read('rpg31_live.css'),view=read('lan_scene.html');
for(const [label,source] of [['Player',player],['Mestre',gm],['Overlay jogador',hud],['Campanha',campaigns]]){
 assert.doesNotThrow(()=>new Function(source),label+' syntax');
}
// The only mode changes must require an authenticated GM via /api/admin.
assert.match(server,/public JSONObject setSessionMode\(String cid,JSONObject input\)/);
assert.match(server,/input\.length\(\)!=1/);
assert.match(server,/!"interlude"\.equals\(mode\)&&!"combat"\.equals\(mode\)/);
assert.match(server,/c\.put\("sessionMode",mode\)/);
assert.match(server,/c\.put\("movementSpent",new JSONObject\(\)\)/);
assert.match(server,/return new JSONObject\(\)\.put\("mode",sessionMode\(c\)\)/);
assert.match(server,/\.put\("initiativePreserved",true\)/);
assert.match(server,/if\(p\.length==6&&p\[5\]\.equals\("session-mode"\)&&method\.equals\("POST"\)\)/);
const route=server.indexOf('if(p.length==6&&p[5].equals("session-mode")');
const adminBranch=server.indexOf('if(p.length>=5&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns"))');
const gmGate=server.indexOf('if(!master(s))',adminBranch);
assert.ok(adminBranch>0&&gmGate>adminBranch&&route>gmGate&&route-gmGate<3200,
 'mode route must be inside the authenticated GM-only admin branch');
assert.doesNotMatch(server,/p\[4\]\.equals\("session-mode"\).*setSessionMode/);
// Non-GM players still authenticate and can only move owned tokens through fog-filtered scene.
assert.match(server,/boolean interlude="interlude"\.equals\(sessionMode\(c\)\)/);
assert.match(server,/if\(!interlude&&order!=null&&order\.length\(\)>0/);
assert.match(server,/if\(!interlude&&already\+steps>limit\)/);
assert.match(server,/if\(!interlude\)spent\.put\(id,already\+steps\)/);
assert.match(server,/\.put\("movementRemaining",interlude\?JSONObject\.NULL:limit-already-steps\)/);
assert.match(server,/\.put\("movementUnlimited",interlude\)/);
assert.match(server,/if\(covered\(map,sx,sy\)\)throw new IllegalArgumentException/);
assert.match(server,/if\(charId\.isEmpty\(\)\|\|!t\.optString\("ownerPlayerId"\)\.equals\(player\.optString\("id"\)\)/);
assert.match(server,/\.put\("unlimited",interlude\)/);
assert.match(server,/\.put\("remaining",interlude\?JSONObject\.NULL:/);
assert.match(server,/\.put\("sessionMode",sessionMode\(c\)\)/);
assert.match(server,/mode\.equals\(sessionMode\(c\)\)/); // two-state transition prevents unnecessary changes
assert.match(server,/A iniciativa fica pausada durante o interlúdio/);
assert.match(server,/A rodada fica pausada durante o interlúdio/);
// Unlimited repeated skill/dice tests are independent of initiative.
const roller=server.slice(server.indexOf('public JSONObject tableRoll('),server.indexOf('public JSONObject masterTable('));
assert.doesNotMatch(roller,/1200|aguarde|activeId|initiativeData\(/);
assert.match(roller,/if\(!gm\)actor\.put\("lastTableRoll",now\)/);
assert.match(roller,/random\.nextInt\(faces\)\+1/);
assert.match(roller,/logs\.put\(result\);while\(logs\.length\(\)>50\)logs\.remove\(0\)/);
// Live player explicitly sees interlude and ignores initiative/movement limit only then.
assert.match(player,/state\?\.sessionMode!=='interlude'&&\(state\?\.initiative\?\.entries\?\.length\|\|0\)>0/);
assert.match(player,/state\?\.sessionMode!=='interlude'&&moving&&moving\.remaining<=0/);
assert.match(player,/if\(moving\?\.unlimited\)/);
assert.match(player,/sessionMode==='interlude'\?'✦ INTERLÚDIO'/);
assert.match(hud,/interlude\?'✦ INTERLÚDIO/);
assert.match(hud,/Testes podem ser rolados a qualquer momento/);
assert.match(gm,/data-action="session-mode"/);
assert.match(gm,/s\.data\?\.sessionMode==='interlude'\?'combat':'interlude'/);
assert.match(gm,/req\('\/session-mode','POST',\{mode:next\}\)/);
assert.match(gm,/Iniciativa preservada|Iniciativa mantida|iniciativa pausada/i);
assert.match(campaigns,/data-r11="session-mode"/);
assert.match(campaigns,/api\(path\('\/session-mode'\),'POST'/);
assert.match(master,/data-act="session-mode"/);
assert.match(css,/\.r53-mode-button/);
assert.match(view,/src="\/player-immersion\.js"/);
const build=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.ok(Number(build.match(/versionCode ([0-9]+)/)?.[1])>=53,'v0.53 retained in subsequent releases');
console.log('PASS v0.53: repeated dice out of turn; GM-only interlude; unlimited player movement; scene fog and token ownership protected');
