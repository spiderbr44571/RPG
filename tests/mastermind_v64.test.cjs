'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'../app/src/main/assets'),read=n=>fs.readFileSync(path.join(dir,n),'utf8');
const js=read('rpg31_master_table.js'),css=read('rpg31_live.css');
assert.doesNotThrow(()=>new Function(js));
for(const x of ['r64-brand','r64-commands','r64-viewport-actions','r64-dock','r64-card','r64-panel-folded'])assert.ok(js.includes(x)||css.includes(x),'UI hook '+x);
for(const action of ['close','turn','edit','session-mode','fit','panel','zoom-in','zoom-out','roll-public','roll-private','initiative-next','initiative-roll','effect'])assert.ok(js.includes('data-action="'+action+'"')||js.includes("r64Action('"+action+"'"),'Preserve action '+action);
assert.match(css,/\.r31-live aside\.r64-dock\.folded\{display:none!important\}/);
assert.match(css,/\.r31-live \.body\.r64-panel-folded\{grid-template-columns:minmax\(0,1fr\)!important\}/);
assert.match(js,/s\.groups\[details\.dataset\.r64Group\]=details\.open/);
assert.match(js,/const sideScroll=/);
assert.match(js,/s\.data\?\.sessionMode==='interlude'/);
const made=[];
function element(tag){
 const el={tagName:tag,style:{overflow:'',setProperty(){}},classList:{add(){},remove(){},toggle(){}},
  listeners:{},innerHTML:'',hidden:false,textContent:'',append(){},remove(){},querySelector(){return null},
  querySelectorAll(){return []},addEventListener(name,cb){this.listeners[name]=cb},contains(){return true},
  setAttribute(){},scrollTop:0,dataset:{}};
 made.push(el);return el;
}
const document={hidden:false,body:element('body'),head:element('head'),createElement:element,querySelector(){return null}};
const calls=[];
const context={window:{},document,location:{protocol:'file:'},setInterval(){return 1},clearInterval(){},
  confirm(){return true},prompt(){return '10'},console,CustomEvent:function(){}};
vm.createContext(context);vm.runInContext(js,context);
const API=context.window.RPG31_MASTER;assert.ok(API?.open);
API.open(document.body,{route:'/api/admin/campaigns/test',request:async(route,method,body)=>{
 calls.push({route,method,body});if(route.endsWith('/table'))return {
 revision:1,scenarios:[],activeScenarioId:null,sessionMode:'combat',
 initiative:{round:1,entries:[],activeId:null},playerRequests:[],rolls:[],players:[],characters:[],movementRules:{}};
 return {ok:true,round:1};
},onClose(){}});
async function run(){
 await new Promise(resolve=>setImmediate(resolve));
 const live=made.find(e=>e.className==='r31-live');
 assert.ok(live,'Real live overlay should mount');
 let html=live.innerHTML;
 for(const title of ['✧ MESTRE','Sair','+ Turno','Editar mapa','Iniciar interlúdio','Enquadrar','Rolagens','Iniciativa / sessão','Solicitações','Jogadores e efeitos','Movimento por sistema','Alvo selecionado'])assert.ok(html.includes(title),'Missing live control '+title);
 const pos=['Sair','+ Turno','Editar mapa','Iniciar interlúdio','Enquadrar'].map(x=>html.indexOf('>'+x+'</span>'));
 assert.ok(pos.every((x,i)=>x>0&&(!i||x>pos[i-1])),'Toolbar buttons must be left-to-right');
 assert.ok(html.indexOf('r64-commands')<html.indexOf('r64-top-right'),'Actions before status, no center crowding');
 assert.equal((html.match(/data-r64-group=/g)||[]).length,7);
 assert.ok(html.includes('data-action="roll-public"')&&html.includes('data-action="roll-private"'));
 assert.ok(html.includes('data-action="initiative-next"'));
 assert.ok(!html.includes('r64-panel-folded'));
 assert.ok(live.listeners.toggle&&live.listeners.click,'Interactive events need to be registered');
 const group={dataset:{r64Group:'initiative'},open:false,closest(){return this}};
 live.listeners.toggle({target:group});
 const b={dataset:{action:'panel'},setAttribute(){},closest(q){return q==='[data-action]'?this:null}};
 live.querySelector=q=>q==='.body'?{classList:{toggle(){}}}:q==='#r31-aside'?{classList:{toggle(){}}}:null;
 await live.listeners.click({target:b});
 assert.ok(calls.some(x=>x.route.endsWith('/table')),'Data must use existing table route');
 assert.equal(calls.filter(x=>x.route.endsWith('/advance')).length,0,'Panel toggle must not advance turn');
 console.log('PASS Mastermind v0.64: functional toolbar, seven dock panels, server actions preserved and full-width map toggle');
}
run().catch(err=>{console.error(err);process.exitCode=1});
