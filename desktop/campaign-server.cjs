'use strict';
/**
 * Mastermind desktop — private LAN campaign host.
 * Implements the published Android LAN routes used by the original Mastermind
 * GM, scenario editor and live tabletop. No external libraries or cloud.
 */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');

const uid=()=>crypto.randomBytes(12).toString('hex');
const token=()=>crypto.randomBytes(32).toString('base64url');
const clone=v=>JSON.parse(JSON.stringify(v));
const safe=(s,max=90)=>String(s||'').trim().slice(0,max);
const finite=(v,otherwise=0)=>Number.isFinite(Number(v))?Number(v):otherwise;
function fail(code,message){const e=new Error(message);e.statusCode=code;throw e;}
function find(array,id,label='Registro'){const value=(array||[]).find(x=>x.id===id);if(!value)fail(404,label+' não encontrado');return value;}
function imageValid(s){return !s||typeof s==='string'&&s.length<1200000&&/^data:image\/(png|webp|jpeg);base64,/i.test(s);}
function validSheet(sheet){
 if(!sheet||typeof sheet!=='object'||Array.isArray(sheet)||JSON.stringify(sheet).length>240000)fail(400,'Ficha inválida ou muito grande');
 if(!safe(sheet.name))fail(400,'Informe o nome do personagem');
 const value=clone(sheet);value.name=safe(sheet.name,90);
 if(!imageValid(value.photo)||!imageValid(value.tokenImage))fail(400,'Imagem inválida');
 if(value.systemId!=='gurps'&&value.resources&&typeof value.resources==='object'){
  for(const k of ['PV','PE','SAN']){
   const r=value.resources[k];if(r==null)continue;
   if(typeof r==='number'){if(r<0||r>1000000)fail(400,'Recurso inválido');value.resources[k]={current:r,max:r};}
   else if(typeof r==='object'){const max=finite(r.max,-1),cur=finite(r.current,-1);if(max<0||max>1000000||cur<0||cur>max)fail(400,'Recurso fora dos limites');}
  }
 }
 return value;
}
function privateIP(){
 const nets=os.networkInterfaces();
 for(const list of Object.values(nets))for(const n of list||[]){
  if(n.family!=='IPv4'||n.internal)continue;
  if(/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(n.address))return n.address;
 }
 return '127.0.0.1';
}
const STATIC=Object.freeze({
 '/map-layers.js':'mastermind68_map_layers.js',
 '/atmosphere.js':'mastermind69_atmosphere.js',
 '/volume.js':'mastermind72_volume.js',
 '/icons74.js':'mastermind74_icons.js',
 '/scene-editor.js':'rpg29_scene_editor.js',
 '/scene-editor.css':'rpg30_studio.css',
 '/scene-bestiary.js':'rpg19_order_creatures.js',
 '/table-camera.js':'rpg33_camera.js',
 '/table-master.js':'rpg31_master_table.js',
 '/table-master.css':'rpg31_live.css',
 '/table-player.js':'rpg31_player_table.js',
 '/player-immersion.js':'mastermind52_player_experience.js',
 '/player-range.js':'mastermind52_range.js',
 '/player-immersion.css':'mastermind52_player_experience.css',
 '/player-shell.js':'mastermind54_player_shell.js',
 '/player-shell.css':'mastermind54_player_shell.css',
 '/powers-ui.js':'mastermind55_player_powers.js',
 '/powers-ui.css':'mastermind55_player_powers.css',
 '/powers-catalog.json':'mastermind55_powers.json'
});
function newScene(){return {id:'scene-'+uid().slice(0,12),name:'Primeiro mapa',width:28,height:18,theme:'stone',backgroundAssetId:'',rooms:[],tokens:[],layers:{terrain:[],props:[],walls:[]}};}
function defaultInitiative(){return {round:1,activeId:'',entries:[]};}
function rollDice(formula,body={}){
 const v=String(formula||'').replace(/\s+/g,'').toLowerCase();
 const m=/^([1-9]|[12][0-9]|30)d(4|6|8|10|12|20|100)([+-]\d{1,3})?$/.exec(v);
 if(!m)fail(400,'Use dados como 1d20+5, 3d20 ou 2d6+2.');
 const count=Number(m[1]),die=Number(m[2]),bonus=Number(m[3]||0);
 if(Math.abs(bonus)>100)fail(400,'Modificador fora do limite');
 const faces=Array.from({length:count},()=>crypto.randomInt(1,die+1));
 let mode=body.mode||((count>1&&die===20)?'highest':'sum');
 if(mode==='auto')mode=die===20&&count>1?'highest':'sum';
 if(!['highest','lowest','sum'].includes(mode)||die!==20&&mode!=='sum')fail(400,'Modo de rolagem inválido');
 const pick=mode==='highest'?Math.max(...faces):mode==='lowest'?Math.min(...faces):faces.reduce((a,b)=>a+b,0);
 return {id:uid(),by:'Mestre',label:safe(body.label||'Rolagem',70),formula:v,faces,bonus,total:pick+bonus,
  mode,diceSum:faces.reduce((a,b)=>a+b,0)+bonus,visibility:body.visibility==='master'?'master':'public',at:Date.now()};
}
function createHost({assetsDir,dataDir,port=8765,host='0.0.0.0'}={}){
 if(!assetsDir||!dataDir)throw Error('assetsDir e dataDir obrigatórios');
 const database=path.join(dataDir,'campaigns-linux.json');
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 let state;
 try{state=JSON.parse(fs.readFileSync(database,'utf8'));}catch{state={version:3,secret:token(),campaigns:[],revision:0};}
 if(!state.secret||!Array.isArray(state.campaigns))throw Error('Banco de campanhas inválido; restaure o backup.');
 const serverIP=privateIP();
 let actualPort=port;let server;
 const save=()=>{
  state.revision=(state.revision||0)+1;
  const raw=JSON.stringify(state);
  if(Buffer.byteLength(raw)>15000000)fail(413,'Armazenamento de campanhas excedido');
  const tmp=database+'.tmp';
  fs.writeFileSync(tmp,raw,{mode:0o600});
  fs.renameSync(tmp,database);
 };
 const link=id=>'http://'+serverIP+':'+actualPort+'/join/'+id+'/'+find(state.campaigns,id).invite;
 const getCampaign=id=>find(state.campaigns,id,'Campanha');
 const master=req=>{
  const auth=req.headers.authorization||'';
  const got=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!got||got.length!==state.secret.length)return false;
  return crypto.timingSafeEqual(Buffer.from(got),Buffer.from(state.secret));
 };
 const cookieValue=req=>{
  const match=/(?:^|;\s*)rpg_guest=([^;]+)/.exec(req.headers.cookie||'');
  return match?match[1]:'';
 };
 const player=(campaign,req)=>{
  const ck=cookieValue(req);
  return (campaign.players||[]).find(p=>ck&&p.secret===ck)||null;
 };
 const playerSheet=(campaign,person)=>campaign.characters.find(c=>c.id===person.characterId)?.sheet||null;
 const detail=campaign=>{
  const c=clone(campaign);
  c.invite=link(campaign.id);
  c.sessionMode=c.sessionMode||'combat';
  c.players=c.players.map(p=>{
   const {secret,...safePlayer}=p;
   return {...safePlayer,hasProposal:!!p.proposedSheet,permalink:'http://'+serverIP+':'+actualPort+'/resume/'+c.id+'/'+p.linkSlug+'-'+p.shortId+'/'+p.secret};
  });
  return c;
 };
 const scenarios=c=>({scenarios:clone(c.scenarios||[]),assets:clone(c.sceneAssets||[]),activeScenarioId:c.activeScenarioId||''});
 const active=c=>(c.scenarios||[]).find(x=>x.id===c.activeScenarioId)||null;
 const table=c=>{
  const data=scenarios(c),scene=active(c),limits={};
  for(const t of scene?.tokens||[])limits[t.id]=finite(t.movementSquares,c.movementRules?.[t.systemId]??9);
  return {...data,movementLimits:limits,sessionMode:c.sessionMode||'combat',
   playerRequests:clone(c.playerRequests||[]),bonusActions:c.bonusActions||{},
   turn:c.turn||1,sceneName:c.sceneName||'Cena 1',campaignName:c.name,revision:state.revision,
   rolls:(c.tableRolls||[]).slice(-50),initiative:c.initiative||defaultInitiative(),
   movementRules:c.movementRules||{},movementSpent:c.movementSpent||{},
   players:c.players.map(p=>{const {secret,proposedSheet,...pub}=p;return pub;}),
   characters:clone(c.characters)};
 };
 const json=(res,status,value,headers={})=>{
  const buffer=Buffer.from(JSON.stringify(value));
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'no-referrer',...headers,'Content-Length':buffer.length});res.end(buffer);
 };
 const page=(res,filename)=>{
  let source=fs.readFileSync(path.join(assetsDir,filename),'utf8');
  if(filename==='lan_master.html'){
    // Desktop-only direct visual map editor shortcut; Android assets untouched.
    source=source.replace('<button data-act="live">Mesa ao vivo</button>',
      '<button data-act="maps">Editar mapas e canvas</button><button data-act="live">Mesa ao vivo</button>');
    source=source.replace("if(a==='live'){",
      "if(a==='maps'){scenarioEditing=true;$('#scenario-editor').hidden=false;"+
      "window.RPG29_EDITOR.open($('#scenario-editor'),{request:api,route:prefix,"+
      "onClose:()=>{scenarioEditing=false;detail().catch(()=>{})}});}\nif(a==='live'){");
  }
  const src=Buffer.from(source,'utf8');
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':src.length,
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
   'Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(src);
 };
 const staticFile=(res,key)=>{
  const file=STATIC[key];if(!file)return false;
  const type=file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/javascript';
  const bytes=fs.readFileSync(path.join(assetsDir,file));
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Content-Length':bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'});res.end(bytes);return true;
 };
 const redirect=(res,c,p)=>{
  res.writeHead(302,{'Location':'/scene/'+c.id,'Set-Cookie':'rpg_guest='+p.secret+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000',
   'Referrer-Policy':'no-referrer','Cache-Control':'no-store'});res.end();
 };
 const validateScenes=(body)=>{
  if(!Array.isArray(body.scenarios)||!Array.isArray(body.assets)||body.scenarios.length>16||body.assets.length>110||
      JSON.stringify(body).length>5200000)fail(400,'Biblioteca de cenários fora do limite');
  const sceneIDs=new Set(),assetIDs=new Set();
  for(const a of body.assets){
   if(!a||typeof a.id!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(a.id)||assetIDs.has(a.id)||!safe(a.name,70))fail(400,'Asset inválido');
   assetIDs.add(a.id);
   if(!['map','character','creature','item','object'].includes(a.kind))fail(400,'Tipo inválido');
   if(a.image&&!imageValid(a.image))fail(400,'Imagem inválida');
  }
  for(const m of body.scenarios){
   if(!m||typeof m.id!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(m.id)||sceneIDs.has(m.id)||!safe(m.name,80))fail(400,'Cenário inválido');
   sceneIDs.add(m.id);
   for(const key of ['width','height'])if(!Number.isInteger(m[key])||m[key]<6||m[key]>60)fail(400,'Grade inválida');
   if(!Array.isArray(m.tokens)||m.tokens.length>160||!Array.isArray(m.rooms)||m.rooms.length>75)fail(400,'Tokens ou salas fora do limite');
   for(const t of m.tokens){if(!t||typeof t.id!=='string'||!Number.isInteger(t.x)||!Number.isInteger(t.y)||t.x<0||t.y<0||t.x>=m.width||t.y>=m.height)fail(400,'Posição de token inválida');}
  }
  if(body.activeScenarioId&&!sceneIDs.has(body.activeScenarioId))fail(400,'Cenário ativo inexistente');
 };
 const readBody=async req=>{
  const chunks=[];let size=0;
  for await(const chunk of req){
   size+=chunk.length;if(size>6000000)fail(413,'Payload acima do limite');
   chunks.push(chunk);
  }
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
  catch{fail(400,'JSON inválido');}
 };
 const handle=async(req,res)=>{
  const method=req.method||'GET';
  const url=new URL(req.url,'http://127.0.0.1:'+actualPort);
  const pathname=url.pathname;const parts=pathname.split('/').filter(Boolean);
  // Only browser same-origin JSON mutations; player auth is cookie-bound.
  if(!['GET','HEAD'].includes(method)){
   const origin=req.headers.origin||'';
   const hostHeader=req.headers.host||'';
   if(origin!==''&&origin!=='http://'+hostHeader)fail(403,'Origem não autorizada');
   if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Envie JSON');
  }
  if(method==='GET'){
   if(pathname==='/'||pathname==='/master')return page(res,'lan_master.html');
   if(staticFile(res,pathname))return;
   if(parts.length===2&&parts[0]==='scene'){
    const c=getCampaign(parts[1]);if(!player(c,req))fail(403,'Sessão não autorizada');
    return page(res,'lan_scene.html');
   }
   if(parts.length===4&&parts[0]==='resume'){
    const c=getCampaign(parts[1]),p=c.players.find(x=>x.secret===parts[3]&&parts[2]===x.linkSlug+'-'+x.shortId);
    if(!p)fail(403,'Link pessoal inválido');return redirect(res,c,p);
   }
   if(parts.length===3&&parts[0]==='join'){
    const c=getCampaign(parts[1]);
    if(parts[2]!==c.invite)fail(403,'Convite inválido');
    if(player(c,req))return redirect(res,c,player(c,req));
    return page(res,'lan_join.html');
   }
   if(parts.length===2&&parts[0]==='play'){
    const c=getCampaign(parts[1]),p=player(c,req);
    if(!p)fail(403,'Sessão não autorizada');
    const sheet=playerSheet(c,p);
    return page(res,sheet?.systemId==='gurps'?'lan_gurps.html':'lan_player.html');
   }
   if(pathname==='/api/admin/campaigns'){
    if(!master(req))fail(403,'Acesso do mestre necessário');
    return json(res,200,{campaigns:state.campaigns.map(c=>({id:c.id,name:c.name,scene:c.scene,turn:c.turn,players:c.players.length,invite:link(c.id)}))});
   }
   if(parts[0]==='api'&&parts[1]==='admin'&&parts[2]==='campaigns'&&parts[3]){
    if(!master(req))fail(403,'Acesso do mestre necessário');
    const c=getCampaign(parts[3]),what=parts[4]||'';
    if(!what)return json(res,200,{campaign:detail(c)});
    if(what==='scenarios')return json(res,200,scenarios(c));
    if(what==='table')return json(res,200,table(c));
   }
   if(parts[0]==='api'&&parts[1]==='join'&&parts[2]==='info'&&parts[3]){
    return json(res,200,{name:getCampaign(parts[3]).name});
   }
   if(parts[0]==='api'&&parts[1]==='play'&&parts[2]){
    const c=getCampaign(parts[2]),p=player(c,req);if(!p)fail(403,'Sessão de jogador inválida');
    const sheet=playerSheet(c,p),what=parts[3]||'';
    if(!what)return json(res,200,{id:p.id,nickname:p.nickname,status:p.status,
      scene:c.scene,sceneName:c.sceneName,turn:c.turn,character:sheet,playerId:p.id,revision:state.revision});
    if(what==='canvas')return json(res,200,{nodes:p.personalCanvas||[]});
    if(what==='journal')return json(res,200,{journal:p.journal||{}});
    if(what==='power-requests')return json(res,200,{requests:(c.playerRequests||[]).filter(x=>x.playerId===p.id)});
    if(what==='scenario'){
      const scene=active(c),copy=scene?clone(scene):null;
      if(copy){
       copy.tokens=(copy.tokens||[]).filter(t=>!t.hidden&&!t.private);
       copy.rooms=(copy.rooms||[]).filter(x=>x.hidden); // opaque until revealed
      }
      return json(res,200,{revision:state.revision,scene:copy,playerId:p.id,character:sheet,
       sessionMode:c.sessionMode,playerRequests:[],bonusActions:0,turn:c.turn,sceneName:c.sceneName,
       rolls:(c.tableRolls||[]).filter(r=>r.visibility!=='master').slice(-20),initiative:c.initiative||defaultInitiative(),
       movement:{tokens:[],spent:c.movementSpent||{}}});
    }
   }
   fail(404,'Página não encontrada');
  }
  const body=await readBody(req);
  if(parts[0]==='api'&&parts[1]==='join'&&parts.length===4&&method==='POST'){
   const c=getCampaign(parts[2]);if(parts[3]!==c.invite)fail(403,'Convite inválido');
   if(c.players.length>=40)fail(400,'Campanha cheia');
   const nickname=safe(body.nickname,40);if(!nickname)fail(400,'Nickname inválido');
   const p={id:uid(),secret:token(),nickname,status:'aguardando',
    characterId:null,proposedSheet:body.sheet?validSheet(body.sheet):null,
    linkSlug:nickname.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,24),
    shortId:uid().slice(0,5).toUpperCase(),personalCanvas:[]};
   c.players.push(p);save();
   return json(res,201,{ok:true,campaignId:c.id,status:p.status,shortId:p.shortId,
    permalink:'http://'+serverIP+':'+actualPort+'/resume/'+c.id+'/'+p.linkSlug+'-'+p.shortId+'/'+p.secret},
    {'Set-Cookie':'rpg_guest='+p.secret+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000'});
  }
  if(parts[0]==='api'&&parts[1]==='admin'&&parts[2]==='campaigns'){
   if(!master(req))fail(403,'Chave do mestre inválida');
   if(parts.length===3&&method==='POST'){
    if(state.campaigns.length>=50)fail(400,'Limite de campanhas');
    const name=safe(body.name,90);if(!name)fail(400,'Nome da campanha necessário');
    const scene=newScene();
    const c={id:uid(),name,invite:token(),scene:1,sceneName:'Cena 1',turn:1,sessionMode:'combat',
     players:[],characters:[],canvas:[],scenarios:[scene],sceneAssets:[],activeScenarioId:scene.id,
     initiative:defaultInitiative(),movementRules:{},movementSpent:{},tableRolls:[],playerRequests:[]};
    state.campaigns.push(c);save();
    return json(res,201,{id:c.id,name,invite:link(c.id)});
   }
   const c=getCampaign(parts[3]),command=parts[4]||'';
   if(command==='scenarios'&&method==='POST'){
    validateScenes(body);
    c.scenarios=clone(body.scenarios);c.sceneAssets=clone(body.assets);
    c.activeScenarioId=body.activeScenarioId||'';c.initiative=defaultInitiative();
    c.movementSpent={};save();return json(res,200,{ok:true});
   }
   if(command==='canvas'&&['POST','PUT'].includes(method)){
    if(!Array.isArray(body.nodes)||body.nodes.length>500||JSON.stringify(body.nodes).length>240000)fail(400,'Canvas excedeu o limite');
    c.canvas=clone(body.nodes);save();return json(res,200,{ok:true});
   }
   if(command==='characters'&&parts.length===5&&method==='POST'){
    if(c.characters.length>=200)fail(400,'Limite de fichas');
    const id=uid();c.characters.push({id,sheet:validSheet(body.sheet)});save();return json(res,201,{id});
   }
   if(command==='characters'&&parts.length===6&&['PUT','POST'].includes(method)){
    find(c.characters,parts[5],'Ficha').sheet=validSheet(body.sheet);save();return json(res,200,{ok:true});
   }
   if(command==='assign'&&method==='POST'){
    const p=find(c.players,body.playerId,'Jogador');
    if(body.characterId){
     find(c.characters,body.characterId,'Ficha');
     if(c.players.some(x=>x!==p&&x.characterId===body.characterId))fail(400,'Ficha já atribuída');
     p.characterId=body.characterId;p.status='ativo';p.proposedSheet=null;
    }else{p.characterId=null;p.status='aguardando';}
    save();return json(res,200,{ok:true});
   }
   if(command==='approve'&&method==='POST'){
    const p=find(c.players,body.playerId,'Jogador');
    if(!p.proposedSheet)fail(400,'Sem ficha aguardando aprovação');
    const id=uid();c.characters.push({id,sheet:validSheet(p.proposedSheet)});
    p.characterId=id;p.proposedSheet=null;p.status='ativo';save();return json(res,200,{id});
   }
   if(command==='session-mode'&&method==='POST'){
    if(!['combat','interlude'].includes(body.mode))fail(400,'Modo inválido');
    c.sessionMode=body.mode;c.movementSpent={};save();return json(res,200,{mode:body.mode,movementUnlimited:body.mode==='interlude',initiativePreserved:true});
   }
   if(command==='advance'&&method==='POST'){
    if(body.kind==='turn'){if(c.sessionMode==='interlude')fail(400,'Rodadas pausadas no interlúdio');c.turn++;}
    else if(body.kind==='scene'){c.scene++;c.sceneName='Cena '+c.scene;c.turn=1;c.initiative=defaultInitiative();}
    else fail(400,'Evento inválido');
    c.movementSpent={};save();return json(res,200,{ok:true});
   }
   if(command==='effects'&&method==='POST'){
    const obj=find(c.characters,body.characterId,'Ficha');
    const effect={id:uid(),name:safe(body.name,70),unit:body.unit||'turn',remaining:finite(body.remaining,0)};
    obj.sheet.effects=(obj.sheet.effects||[]).concat([effect]).slice(-80);save();return json(res,200,{ok:true});
   }
   if(command==='initiative'&&method==='POST'){
    const ini=c.initiative||defaultInitiative(),action=body.action;
    if(action==='reset'||action==='clear'){c.initiative=defaultInitiative();}
    else if(action==='next'){
     if(c.sessionMode==='interlude')fail(400,'Iniciativa pausada no interlúdio');
     if(!ini.entries.length)fail(400,'Iniciativa vazia');
     const ix=ini.entries.findIndex(e=>e.tokenId===ini.activeId);
     const next=(ix+1)%ini.entries.length;
     if(next===0&&ix>=0)ini.round++;
     ini.activeId=ini.entries[next].tokenId;c.turn++;c.movementSpent={};
    }else if(action==='remove'){
     ini.entries=ini.entries.filter(e=>e.tokenId!==body.tokenId);
     if(ini.activeId===body.tokenId)ini.activeId='';
    }else if(action==='set'||action==='roll'){
     const scene=active(c),t=find(scene?.tokens,body.tokenId,'Token');
     const score=action==='set'?finite(body.score):rollDice(body.formula,{mode:body.mode}).total;
     const prev=ini.entries.filter(e=>e.tokenId!==body.tokenId);
     prev.push({tokenId:body.tokenId,name:t.name,score,total:score,initiative:score});
     ini.entries=prev.sort((a,b)=>b.score-a.score);
    }else fail(400,'Ação de iniciativa não suportada');
    save();return json(res,200,c.initiative);
   }
   if(command==='table-roll'&&method==='POST'){
    const roll=rollDice(body.formula,body);
    if(roll.visibility==='public')c.tableRolls=(c.tableRolls||[]).concat([roll]).slice(-50);
    save();return json(res,200,roll);
   }
   if(command==='movement'&&method==='POST'){
    if(!/^[-a-z0-9]{1,60}$/.test(body.systemId)||!Number.isInteger(body.squares)||body.squares<0||body.squares>60)fail(400,'Deslocamento inválido');
    c.movementRules[body.systemId]=body.squares;save();return json(res,200,{ok:true});
   }
   if(command==='token'&&method==='POST'){
    const scene=active(c);if(!scene)fail(400,'Nenhum mapa publicado');
    const t=find(scene.tokens,body.tokenId,'Token');
    if(body.action==='health'){
     if(t.kind!=='creature')fail(400,'PV somente para criatura');
     t.hp=Math.max(0,Math.min(finite(t.maxHp,10),finite(t.hp,t.maxHp)+finite(body.delta)));
    }else if(body.action==='move'){
     if(!Number.isInteger(body.x)||!Number.isInteger(body.y)||body.x<0||body.y<0||body.x>=scene.width||body.y>=scene.height)fail(400,'Coordenadas inválidas');
     t.x=body.x;t.y=body.y;
    }else if(body.action==='rotate'){
     if(!Number.isInteger(body.rotation)||body.rotation<0||body.rotation>359)fail(400,'Rotação inválida');t.rotation=body.rotation;
    }else if(body.action==='flashlight')t.flashlight=!!body.enabled;
    else if(body.action==='hide')t.hidden=!!body.hidden;
    else if(body.action==='speed')t.movementSquares=finite(body.squares,9);
    else if(body.action==='bind'){
     if(body.playerId){const p=find(c.players,body.playerId);if(!p.characterId)fail(400,'Jogador sem ficha');t.ownerPlayerId=p.id;t.characterId=p.characterId;}
     else{t.ownerPlayerId='';t.characterId='';}
    }else fail(400,'Ação de token inválida');
    save();return json(res,200,{ok:true});
   }
   if(command==='power-request'||command==='effects-group'){
    // Preserve original request routing; unsupported group operations are explicit.
    fail(501,'Ação coletiva ainda não implementada nesta versão Linux');
   }
   fail(404,'Rota administrativa não encontrada');
  }
  if(parts[0]==='api'&&parts[1]==='play'&&parts[2]){
   const c=getCampaign(parts[2]),p=player(c,req);if(!p)fail(403,'Acesso de jogador negado');
   const action=parts[3];
   if(action==='resource'&&['PATCH','POST'].includes(method)){
    const sh=playerSheet(c,p);if(!sh)fail(403,'Jogador sem ficha');
    const key=body.resource;
    if(sh.systemId==='gurps'){
     if(!['HP','FP'].includes(key))fail(403,'Recurso não permitido');
     const max=finite(sh.attrs?.[key==='HP'?'ST':'HT'],10);
     const current=finite(body.current,NaN);if(!Number.isFinite(current)||current>max||current< -max*5)fail(400,'Valor fora do limite');
     sh[key==='HP'?'currentHP':'currentFP']=current;
    }else if(sh.systemId==='d-d'){
     if(key!=='PV')fail(403,'Recurso não permitido');
     const current=finite(body.current,NaN),max=finite(sh.hitPointsMax);
     if(!Number.isFinite(current)||current<0||current>max)fail(400,'PV fora do limite');
     sh.hitPointsCurrent=current;
    }else{
     if(!['PV','PE','SAN'].includes(key))fail(403,'Recurso não permitido');
     const r=sh.resources?.[key];if(!r||!Number.isFinite(Number(body.current))||body.current<0||body.current>r.max)fail(400,'Valor fora do limite');
     r.current=Number(body.current);
    }
    save();return json(res,200,{ok:true,current:body.current});
   }
   if(action==='canvas'&&method==='POST'){
    if(!Array.isArray(body.nodes)||body.nodes.length>300)fail(400,'Canvas grande demais');
    p.personalCanvas=clone(body.nodes);save();return json(res,200,{ok:true});
   }
   if(action==='journal'&&method==='POST'){p.journal=body;save();return json(res,200,{ok:true});}
   if(action==='profile'&&method==='POST'){
    p.profile=Object.assign({},p.profile||{},body);save();return json(res,200,{ok:true});
   }
   if(action==='roll'||action==='table-roll'){
    const r=action==='table-roll'?rollDice(body.formula,body):{id:uid(),by:p.nickname,label:safe(body.name||'Rolagem'),at:Date.now(),...body,visibility:'public'};
    r.by=p.nickname;r.visibility='public';c.tableRolls=(c.tableRolls||[]).concat([r]).slice(-50);save();return json(res,200,r);
   }
   if(action==='scenario'&&parts[4]==='move'){
    const sc=active(c),t=find(sc?.tokens,body.tokenId,'Token');
    if(t.ownerPlayerId!==p.id)fail(403,'Token não pertence ao jogador');
    if(!Number.isInteger(body.x)||!Number.isInteger(body.y)||body.x<0||body.y<0||body.x>=sc.width||body.y>=sc.height)fail(400,'Coordenadas inválidas');
    t.x=body.x;t.y=body.y;save();return json(res,200,{ok:true});
   }
   fail(404,'Rota do jogador não disponível');
  }
  fail(404,'Rota não encontrada');
 };
 server=http.createServer((req,res)=>{
  handle(req,res).catch(e=>{
   if(!res.headersSent)json(res,e.statusCode||500,{error:e.statusCode?e.message:'Erro interno do servidor'});
   else res.end();
  });
 });
 return {
  get key(){return state.secret;},
  get url(){return 'http://127.0.0.1:'+actualPort+'/master';},
  get lanUrl(){return 'http://'+serverIP+':'+actualPort+'/master';},
  get port(){return actualPort;},
  get ip(){return serverIP;},
  get active(){return server.listening;},
  get state(){return state;},
  async start(){
   await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(port,host,()=>{server.off('error',reject);actualPort=server.address().port;resolve();});
   });
   return {url:this.url,lanUrl:this.lanUrl,ip:serverIP,port:actualPort,key:state.secret};
  },
  async close(){
   if(server.listening)await new Promise(resolve=>server.close(resolve));
  }
 };
}
module.exports={createHost,rollDice,defaultInitiative,validateSheet:validSheet};
