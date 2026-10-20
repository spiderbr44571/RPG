'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../app/src/main');
const read=name=>fs.readFileSync(path.join(root,'assets',name),'utf8');
const script=read('mastermind54_player_shell.js');
const css=read('mastermind54_player_shell.css');
const html=read('lan_scene.html');
const legacy=read('lan_player.html');
const player=read('rpg31_player_table.js');
const former=read('mastermind52_player_experience.js');
const server=fs.readFileSync(path.join(root,'java/dev/rpgmesa/demo/LocalCampaignServer.java'),'utf8');
const build=fs.readFileSync(path.resolve(__dirname,'../app/build.gradle'),'utf8');
assert.doesNotThrow(()=>new Function(script),'new UI module must parse in browser');
assert.doesNotThrow(()=>new Function(player),'existing live player module must still parse');
assert.doesNotThrow(()=>new Function(former),'existing player interactions remain intact');
assert.match(build,/versionCode 54/);
assert.match(html,/<link rel="stylesheet" href="\/player-shell\.css">/);
assert.match(html,/<script src="\/player-shell\.js"><\/script>/);
assert.match(html,/window\.MastermindPlayerShell\.init\(\)/);
assert.ok(html.indexOf('window.MastermindPlayerExperience.init()')<html.indexOf('window.MastermindPlayerShell.init()'),'wheel must initialize after existing controllers');
assert.match(server,/path\.equals\("\/player-shell\.js"\)\)return publishedScript\("mastermind54_player_shell\.js"\)/);
assert.match(server,/path\.equals\("\/player-shell\.css"\)\)return publishedStyle\("mastermind54_player_shell\.css"\)/);
// The existing player functionality remains reachable via original controls.
for(const mode of ['sheet','dice','journal','initiative','measure','pin','inspect','move']){
 assert.ok(script.includes('data-r54-action="'+mode+'"'),'wheel action missing: '+mode);
}
assert.match(script,/el\.click\(\)/,'wheel delegates to established map modes');
assert.match(script,/modal\('#open-dice'\)/);
assert.match(script,/modal\('#r52-open-journal'\)/);
assert.match(script,/modal\('#open-initiative'\)/);
assert.match(script,/mode\('move'\)/);
assert.match(script,/closeWheel\(\)/);
assert.match(script,/e\.target\.closest\('#r54-wheel'\)/);
assert.match(script,/tabIndex=open\?0:-1/,'closed options must not capture keyboard focus');
assert.match(script,/aria-hidden/);
assert.match(script,/r54-appearance-panel/);
assert.match(script,/r54-hud-compact/);
assert.match(script,/r54-fit-map/);
assert.match(script,/r54-open-settings/);
assert.match(script,/legacy-sheet/);
assert.match(script,/root\.location\.href=a\.href/);
assert.match(script,/root\.addEventListener\('pageshow',applyTheme\)/);
assert.match(script,/document\.addEventListener\('visibilitychange'/);
assert.match(script,/root\.addEventListener\('storage'/);
assert.match(script,/const preferenceKey='rpg-player-look:'\+cid/);
assert.match(legacy,/memoKey='rpg-player-look:'\+cid/,'full original sheet and live map share their theme key');
assert.match(script,/--r54-accent/);
assert.match(script,/--r54-font-scale/);
assert.match(css,/body\.r54-clean\.r54-compact-hud \.hud/);
assert.match(css,/body\.r54-clean \.r54-wheel/);
assert.match(css,/body\.r54-clean #r52-live-tools\{display:none!important\}/);
assert.match(css,/body\.r54-clean #sheet-modal\.r54-appearance-active/);
assert.match(css,/body\.r54-clean \.r52-journal-panel/);
assert.match(css,/body\.r54-clean \.modal \.drawer/);
assert.match(css,/@media\(max-width:640px\)/);
assert.match(css,/@media\(max-height:450px\) and \(orientation:landscape\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
// Small runtime smoke test: persisted theme survives route changes and never rewrites
// the GM's actual scene art, fog or token positions.
const storage=new Map(),variables=new Map(),attrs=new Map();
const listeners={};
const bodyClass=new Set();
const doc={
 documentElement:{style:{setProperty:(key,value)=>variables.set(key,value)},},
 body:{dataset:{},style:{},classList:{toggle:(name,on)=>{if(on)bodyClass.add(name);else bodyClass.delete(name)}}},
 querySelector:sel=>sel==='meta[name="theme-color"]'?{setAttribute:(k,v)=>attrs.set(k,v)}:null,
 addEventListener:(name,fn)=>{listeners[name]=fn}
};
const context={window:{addEventListener:(name,fn)=>listeners[name]=fn,dispatchEvent:()=>{},
 location:{pathname:'/scene/campaign123'},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},
 document:doc,location:{pathname:'/scene/campaign123'},
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}};
vm.runInNewContext(script,context);
const shell=context.window.MastermindPlayerShell;
assert.ok(shell&&typeof shell.savePrefs==='function');
shell.savePrefs({theme:'sangue',color:'#00ffff',mode:'light',size:1.15});
assert.equal(JSON.parse(storage.get('rpg-player-look:campaign123')).theme,'sangue');
assert.equal(variables.get('--accent'),'#ea5b72');
assert.equal(doc.body.dataset.r54Scheme,'light');
assert.equal(variables.get('--r54-font-scale'),'1.15');
assert.ok(bodyClass.has('r52-light-mode'));
shell.savePrefs({theme:'base',color:'#22cc99',mode:'dark',size:9});
assert.equal(variables.get('--accent'),'#22cc99');
assert.equal(shell.preferences.size,1.3);
assert.ok(!bodyClass.has('r52-light-mode'),'returning to dark must remove previous light class');
assert.equal(doc.body.dataset.theme,'base');
storage.set('rpg-player-look:campaign123',JSON.stringify({theme:'conhecimento',color:'#c6a2d6',mode:'dark',size:1}));
shell.applyTheme();
assert.equal(variables.get('--accent'),'#e4ba66','sync changes from original full sheet');
assert.ok(!script.includes("querySelector('#board').style.background"),'personal theme must not rewrite GM map background');
console.log('PASS v0.54: accessible radial menu, map-first HUD, complete settings and shared live/original sheet themes');
