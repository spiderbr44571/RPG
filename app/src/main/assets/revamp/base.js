/* Mastermind · revamp — estado compartilhado e utilidades da nova interface. */
(function(){
'use strict';
const RV=window.RV={};
RV.$=(s,el=document)=>el.querySelector(s);RV.$$=(s,el=document)=>[...el.querySelectorAll(s)];
RV.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
RV.ic=(n,c)=>window.RevampIcons?RevampIcons.render(n,c):'';
RV.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
RV.store={get(k){try{return localStorage.getItem(k)}catch(_){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(_){}},del(k){try{localStorage.removeItem(k)}catch(_){}}};
RV.hydrateIcons=(root=document)=>RV.$$('[data-i]',root).forEach(el=>{if(el.dataset.done)return;el.dataset.done=1;el.insertAdjacentHTML('afterbegin',RV.ic(el.dataset.i))});
const bus=[];RV.on=f=>bus.push(f);RV.emit=(e,d)=>bus.forEach(f=>f(e,d));
RV.copyText=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(_){return false}};
RV.toast=(msg,host)=>{const h=host||document.querySelector('.vtt:not([hidden])')||RV.$('#app');RV.$$('.toast',h).forEach(t=>t.remove());const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=msg;
 const hr=h.getBoundingClientRect();const under=[...h.querySelectorAll('.tcard:not([hidden]),.hud,.st-status')].reduce((m,el)=>{const r=el.getBoundingClientRect();return r.height?Math.max(m,hr.bottom-r.top):m},0);if(under)t.style.bottom=(under+12)+'px';
 h.appendChild(t);setTimeout(()=>t.remove(),2800)};
RV.CELL=Cena.CELL;
RV.prefs={gridAlpha:null,showNames:false};

/* Criaturas: catálogo real (dados.js) */
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
RV.sizeCells=s=>({PEQUENO:1,MEDIO:1,GRANDE:2,ENORME:3,COLOSSAL:4})[norm(s)]||1;
RV.CREATURES={};
RV_DADOS.ordem.forEach(c=>RV.CREATURES[c.name]=Object.assign({system:'Ordem Paranormal',sys:'ordem',source:'Ordem Paranormal RPG v1.3 · p.'+c.page},c,{size:c.size?norm(c.size):'MEDIO'}));
RV_DADOS.dnd.forEach(c=>RV.CREATURES[c.name]=Object.assign({system:'D&D 5e',sys:'dnd',size:'MEDIO',speed:null,element:null},c));
RV.NOTE='Dados essenciais indexados. Habilidades, condições e ações adicionais: consulte o livro original.';
RV.ELEMENT={Sangue:'#e0707c',Morte:'#a3a4ae',Conhecimento:'#e7c56a',Energia:'#b392f0',Medo:'#e8e7e7'};
RV.SIZE_LABEL={MEDIO:'Médio',GRANDE:'Grande',ENORME:'Enorme',COLOSSAL:'Colossal',PEQUENO:'Pequeno'};
RV.COLORS={pc:{ring:'#c7a87b',hi:'#f0d9ad',lo:'#8a6a3d'},ally:{ring:'#86bd9c',hi:'#c9ecd6',lo:'#3f7357'},foe:{ring:'#e0707c',hi:'#d4606d',lo:'#5b1621'},npc:{ring:'#9c90dd',hi:'#d5cff7',lo:'#4b4386'},obj:{ring:'#92939f',hi:'#d9d6cf',lo:'#5d5a54'}};
RV.PLAYERS=[{id:'ana',name:'Ana',ini:'AN',color:'#c7a87b',online:true,char:'Aurora',via:'app'},{id:'diego',name:'Diego',ini:'DI',color:'#86bd9c',online:true,char:'Brás',via:'navegador'},{id:'lia',name:'Lia',ini:'LI',color:'#9c90dd',online:true,char:null,via:'app'},{id:'rafa',name:'Rafa',ini:'RA',color:'#6db7e0',online:false,char:null,via:'app'}];
RV.initials=n=>{const p=n.split(/\s+/).filter(w=>w.length>2||/^[A-Z]/.test(w));return((p[0]||n)[0]+((p[1]||'')[0]||n[1]||'')).toUpperCase()};
RV.speedCells=sp=>{const m=parseFloat(String(sp||''));return m?Math.round(m/1.5):6};
RV.mkCreature=(name,x,y,id)=>{const c=RV.CREATURES[name];return{id:id||('c'+Math.random().toString(36).slice(2,7)),name,ini:RV.initials(name),kind:'foe',x,y,size:c?RV.sizeCells(c.size):1,speed:c?RV.speedCells(c.speed):6,used:0,hp:c?[c.hp,c.hp]:null,creature:name,rot:0}};
RV.freshState=()=>{const scene=Cena.defaultScene();return{
 scene,sceneVer:1,fog:new Set(scene.fog),
 tokens:[
  {id:'aurora',name:'Aurora',ini:'AU',kind:'pc',owner:'ana',x:3,y:7,size:1,speed:6,used:0,res:{Vida:[18,24],Esforço:[5,7],Sanidade:[12,16]},cls:'Combatente · NEX 35%',effects:['Sangrando · 2 turnos'],sheet:{systemId:'ordem-paranormal',attrs:{Agilidade:2,Força:3,Intelecto:1,Presença:1,Vigor:2}}},
  {id:'bras',name:'Brás',ini:'BR',kind:'ally',owner:'diego',x:4,y:9,size:1,speed:6,used:0,res:{Vida:[21,21],Esforço:[4,6],Sanidade:[10,14]},cls:'Especialista · NEX 25%',effects:[]},
  RV.mkCreature('Carente',18,6,'carente'),Object.assign(RV.mkCreature('Dama de Sangue',18,9,'dama'),{hidden:true}),RV.mkCreature('Aberração de Carne',11,2,'aberracao')],
 strokes:[],mode:'combat',light:false,
 init:{entries:[{id:'carente',score:31},{id:'aurora',score:18},{id:'dama',score:14},{id:'bras',score:12}],idx:1,round:2},
 log:[{who:'Mestre',text:'Carente: ataque 4O+35',faces:[7,15,3,11],kept:15,total:50,vis:'public'}]}};
RV.state=RV.freshState();
/* quem sou eu na mesa do jogador: na campanha de treino, Ana com a Aurora; ao entrar numa mesa, o servidor diz */
RV.ME_DEMO={player:'ana',token:'aurora',name:'Ana'};RV.me=Object.assign({},RV.ME_DEMO);
RV.parseRoll=f=>{f=String(f).replace(/\s+/g,'').toUpperCase();let m=f.match(/^(\d*)O([+-]\d+)?$/);if(m)return{n:+m[1]||1,s:20,b:+(m[2]||0),mode:'highest',label:f};
 m=f.match(/^(\d*)D(\d+)([+-]\d+)?$/);if(m&&+m[2]>1)return{n:Math.min(+m[1]||1,30),s:+m[2],b:+(m[3]||0),mode:null,label:f.replace('D','d')};return null};
RV.doRoll=(formula,mode)=>{const p=RV.parseRoll(formula);if(!p)return null;const faces=Array.from({length:p.n},()=>1+Math.floor(Math.random()*p.s));const md=p.mode||mode||'sum';
 let kept=null,base;if(md==='highest'){kept=Math.max(...faces);base=kept}else if(md==='lowest'){kept=Math.min(...faces);base=kept}else base=faces.reduce((a,b)=>a+b,0);return{faces,kept,total:base+p.b,label:p.label,mode:md}};
/* cabeçalho padrão de painel flutuante: título + botão fechar (todo painel tem um) */
RV.fh=(kicker,title,closeAct)=>`<div class="fh"><div style="min-width:0">${kicker?`<span class="kicker">${RV.esc(kicker)}</span>`:''}<h3>${RV.esc(title)}</h3></div><button class="x-btn" type="button" data-close="${closeAct}" aria-label="Fechar">${RV.ic('x')}</button></div>`;
})();
