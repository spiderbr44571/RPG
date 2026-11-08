/* Nova interface (v0.109 / v1.3.0) ligada ao servidor real da mesa, num Chromium de verdade:
   mestre pela ponte do app (simulada como no desktop: MastermindDesktop.action('campaign-request')),
   jogador pelo navegador na página /v2/ servida pela própria mesa.
   Uso: node tests/revamp_live.e2e.cjs desktop/server/dist/mastermind-campaign-server.jar */
'use strict';
let chromium;try{({chromium}=require('playwright'))}catch(_){({chromium}=require('@playwright/test'))}
const http=require('http'),fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
const ROOT=path.join(__dirname,'..'),ASSETS=path.join(ROOT,'app/src/main/assets'),INDEX='file://'+path.join(ASSETS,'revamp/index.html');
const JAR=path.resolve(process.argv[2]||'desktop/server/dist/mastermind-campaign-server.jar');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'mm-revamp-e2e-')),PORT=8799;let HOST='127.0.0.1',BASE='http://127.0.0.1:'+PORT;
const S=process.env.MM_SHOTS||null;let KEY='',server;
function req(method,route,body,headers={}){return new Promise((res,rej)=>{const payload=body==null?'':(typeof body==='string'?body:JSON.stringify(body));
 const r=http.request(BASE+route,{method,headers:Object.assign({'Content-Type':'application/json'},payload?{'Content-Length':Buffer.byteLength(payload)}:{},headers)},x=>{let d='';x.setEncoding('utf8');x.on('data',c=>d+=c);x.on('end',()=>res({status:x.statusCode,body:d}))});r.on('error',rej);if(payload)r.write(payload);r.end()})}
const M=(m,r,b)=>req(m,r,b,{Authorization:'Bearer '+KEY}).then(x=>JSON.parse(x.body||'{}'));
const fail=m=>{console.error('FALHOU:',m);process.exitCode=1};
(async()=>{
 server=spawn('java',['-jar',JAR,DATA,ASSETS,String(PORT)],{stdio:['ignore','pipe','inherit'],env:{...process.env,JAVA_TOOL_OPTIONS:''}});
 await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('servidor não iniciou')),30000);server.stdout.on('data',d=>{const m=String(d).match(/MASTERMIND_SERVER_READY (\S+) (\d+)/);if(m){HOST=m[1];BASE='http://'+HOST+':'+m[2];clearTimeout(t);ok()}})});
 KEY=JSON.parse(fs.readFileSync(path.join(DATA,'campanhas-android.json'),'utf8')).secret;
 const cid=(await M('POST','/api/admin/campaigns',{name:'Teste '+Date.now().toString(36)})).id;
 const browser=await chromium.launch();const errors=[];
 const mctx=await browser.newContext({viewport:{width:1280,height:820}});const mp=await mctx.newPage();
 mp.on('pageerror',e=>errors.push('mestre: '+e.stack.split('\n').slice(0,3).join(' | ')));
 await mp.exposeFunction('__hostReq',async a=>{const r=await req(a.method,a.route,a.body,{Authorization:'Bearer '+a.secret});return{status:r.status,body:r.body}});
 await mp.addInitScript(k=>{window.RpgLocalHost={status:()=>JSON.stringify({running:true,ip:k.host,port:k.port}),masterKey:()=>k.key,start:async()=>{},stop:async()=>{}};
  window.MastermindDesktop={action:async(m,a)=>{if(m==='campaign-request')return window.__hostReq(a);throw Error('x')}};localStorage.setItem('mm-rv-tut-master','skipped');localStorage.setItem('mm-rv-tut-studio','skipped')},{key:KEY,host:HOST,port:PORT});
 await mp.goto(INDEX+'#mestragem');
 await mp.waitForSelector('[data-m="choose"]',{timeout:8000});await mp.click(`[data-m="choose"][data-v="${cid}"]`);
 await mp.waitForSelector('[data-m="create-scene"]',{timeout:8000});
 await mp.selectOption('[data-m-new]','caverna');await mp.click('[data-m="create-scene"]');
 await mp.waitForSelector('.st-publish');await mp.click('.st-publish');await mp.waitForTimeout(1500);
 let table=await M('GET',`/api/admin/campaigns/${cid}/table`);const act=table.scenarios.find(s=>s.id===table.activeScenarioId);
 if(!act)fail('cenário não publicado');else console.log('publicado:',act.name,'paredes',act.layers.walls.length,'salas ocultas',act.rooms.length);
 if(S)await mp.screenshot({path:path.join(S,'live_studio.png')});
 // jogador pelo navegador
 const det=(await M('GET',`/api/admin/campaigns/${cid}`)).campaign;const inv=det.invite.replace(/^http:\/\/[^/]+/,BASE).replace('/join/','/v2/join/');
 const pctx=await browser.newContext({viewport:{width:900,height:700}});const pp=await pctx.newPage();pp.on('pageerror',e=>errors.push('jogador: '+e.stack));
 pp.on('console',m=>{if(m.type()==='error')errors.push('jogador console: '+m.text())});
 // jogador de primeira vez (sem tour marcado): o convite da mesa não pode cair na campanha de treino
 await pp.goto(inv);await pp.waitForSelector('#web-nick');await pp.waitForTimeout(600);
 if(await pp.locator('.modal-back').count())fail('o convite abriu o tour da campanha de treino');
 await pp.fill('#web-nick','Bia');await pp.click('#web-btn');
 await pp.waitForURL(/\/v2\/play\//,{timeout:8000});await pp.waitForTimeout(2500);
 const seen=await pp.evaluate(()=>RV.views?.player?.S()?.scene?.name);console.log('jogador vê o cenário:',seen,'(publicado:',act&&act.name+')');
 if(!act||seen!==act.name)fail('o jogador não está no cenário publicado da campanha');
 // mestre adiciona uma ficha e atribui
 det.players=(await M('GET',`/api/admin/campaigns/${cid}`)).campaign.players;const pl=det.players.find(p=>p.nickname==='Bia');
 const sh=await M('POST',`/api/admin/campaigns/${cid}/characters`,{sheet:{name:'Vera',systemId:'ordem-paranormal',class:'Especialista',nex:10,attrs:{Agilidade:2,Força:1,Intelecto:3,Presença:1,Vigor:1},resources:{PV:{current:14,max:16},PE:{current:3,max:4},SAN:{current:15,max:16}}}});
 await M('POST',`/api/admin/campaigns/${cid}/assign`,{playerId:pl.id,characterId:sh.id});
 await M('POST',`/api/admin/campaigns/${cid}/session-mode`,{mode:'interlude'});
 await pp.waitForTimeout(3000);
 const me=await pp.evaluate(()=>({me:RV.me,tok:RV.pstate?.tokens?.find(t=>t.id===RV.me?.token),fog:RV.pstate?.fog?.size,mode:RV.pstate?.mode}));
 console.log('jogador:',JSON.stringify({me:me.me,tok:me.tok&&{x:me.tok.x,y:me.tok.y,res:me.tok.res},fog:me.fog,mode:me.mode}));
 if(!me.tok)fail('jogador sem token');
 // mover e rolar pelo servidor
 if(me.tok){const nx=me.tok.x+1;await pp.evaluate(nx=>{const v=RV.views.player,t=v.me();RV.Live.move(v,t,nx,t.y)},nx);await pp.waitForTimeout(1200);
  table=await M('GET',`/api/admin/campaigns/${cid}/table`);const t=table.scenarios.find(s=>s.id===table.activeScenarioId).tokens.find(t=>t.id===me.tok.id);console.log('após mover: x',t.x,'(esperado',nx+')');if(t.x!==nx)fail('movimento não chegou ao servidor')}
 await pp.evaluate(()=>RV.Live.roll(RV.views.player,'2d6+1','Teste',null));await pp.waitForTimeout(1200);
 console.log('res act:',await pp.evaluate(()=>{const b=document.createElement('button');b.dataset.v='Vida|-2';return RV.Live.act(RV.views.player,'res',b,null)}));await pp.waitForTimeout(1200);
 table=await M('GET',`/api/admin/campaigns/${cid}/table`);const last=table.rolls.at(-1);console.log('rolagem:',last?.by,last?.formula,last?.total);if(!last||last.by!=='Bia')fail('rolagem não registrada');
 const ch=table.characters.find(c=>c.id===sh.id);console.log('PV no servidor:',ch.sheet.resources.PV.current);if(ch.sheet.resources.PV.current!==12)fail('recurso não atualizado');
 if(S)await pp.screenshot({path:path.join(S,'live_player.png')});
 // mestre vê o token do jogador e adiciona uma criatura
 await mp.goto(INDEX+'#mesa');await mp.waitForTimeout(3000);
 const mtoks=await mp.evaluate(()=>RV.state.tokens.map(t=>t.name+':'+t.kind));console.log('mestre vê:',mtoks.join(', '));
 await mp.evaluate(()=>{const v=RV.views.master;v.pending={name:'Zumbi de Sangue',kind:'creature'};const sc=RV.state.scene;const k=Object.keys(sc.terrain).find(k=>!RV.state.fog.has(k)&&!RV.state.tokens.some(t=>t.x+','+t.y===k));const[x,y]=k.split(',').map(Number);v.placePending(x,y)});
 await mp.waitForTimeout(2500);table=await M('GET',`/api/admin/campaigns/${cid}/table`);const toks=table.scenarios.find(s=>s.id===table.activeScenarioId).tokens;
 const z=toks.find(t=>t.name==='Zumbi de Sangue');console.log('criatura no servidor:',z&&JSON.stringify({kind:z.kind,hp:z.hp,maxHp:z.maxHp,size:z.size,side:z.side}));if(!z)fail('criatura não salva');
 if(!toks.some(t=>t.ownerPlayerId===pl.id))fail('token do jogador sumiu após salvar');
 // iniciativa e dado do mestre
 await M('POST',`/api/admin/campaigns/${cid}/session-mode`,{mode:'combat'});
 await mp.evaluate(id=>{const v=RV.views.master;v.sel=id;RV.Live.act(v,'init-add',null,v.tok(id));RV.Live.act(v,'init-roll',null,null)},z.id);await mp.waitForTimeout(2500);
 table=await M('GET',`/api/admin/campaigns/${cid}/table`);console.log('iniciativa:',JSON.stringify(table.initiative.entries.map(e=>e.name+'='+e.score)));if(!table.initiative.entries.length)fail('iniciativa vazia');
 if(S)await mp.screenshot({path:path.join(S,'live_master.png')});
 await mp.goto(INDEX+'#mestragem');await mp.waitForTimeout(2500);if(S)await mp.screenshot({path:path.join(S,'live_mestragem.png'),fullPage:true});
 console.log('erros de página:',errors.length?errors:'nenhum');if(errors.length)process.exitCode=1;
 await browser.close();console.log(process.exitCode?'FALHOU':'PASS nova interface ao vivo: publicar, entrar, mover, rolar, recursos, criatura e iniciativa pelo servidor')})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{if(server)server.kill();fs.rmSync(DATA,{recursive:true,force:true})});
