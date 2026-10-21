const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
exports.start=async function(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mastermind-test-'));
 const c={id:'test',name:'Mesa de integração',invite:'invite-test',scene:1,sceneName:'Cena 1',turn:1,sessionMode:'combat',canvas:[],players:[{id:'p1',secret:'guest-test',nickname:'Jogador',status:'aprovado',characterId:'c1'}],characters:[{id:'c1',sheet:{systemId:'ordem-paranormal',name:'Agente Teste',class:'Combatente',nex:45,attrs:{Agilidade:2,Força:2,Intelecto:1,Presença:1,Vigor:1},skills:{},powers:[],powerChoices:[],resources:{PV:{current:40,max:40},PE:{current:12,max:12},SAN:{current:36,max:36}},history:'História preservada',inventory:[{name:'Item preservado'}]}}],scenarios:[{id:'map1',name:'Mapa teste',width:12,height:10,theme:'stone',backgroundAssetId:'',rooms:[],tokens:[{id:'t1',name:'Agente Teste',kind:'character',x:2,y:2,ownerPlayerId:'p1',characterId:'c1'},{id:'t2',name:'Aliado',kind:'character',x:3,y:2}],walls:[],lights:[]}],assets:[],activeScenarioId:'map1',initiative:{entries:[{tokenId:'t1',name:'Agente Teste',total:20},{tokenId:'t2',name:'Aliado',total:10}],activeId:'t1',round:1}};
 fs.writeFileSync(path.join(dir,'campanhas-android.json'),JSON.stringify({version:3,secret:'master-test',campaigns:[c]}));
 const cp='.runtime/classes:.runtime/json.jar:.runtime/nano.jar';
 const proc=spawn('java',['-cp',cp,'ServerMain',dir,path.resolve('app/src/main/assets'),'0']);
 let log='';proc.stderr.on('data',x=>log+=x);
 const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout '+log)),10000);proc.stdout.on('data',x=>{const m=String(x).match(/READY (\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});proc.on('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code+' '+log));});});
 return {url,dir,stop(){proc.kill();fs.rmSync(dir,{recursive:true,force:true});}};
};
