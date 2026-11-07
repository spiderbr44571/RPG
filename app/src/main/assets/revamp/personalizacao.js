/* Mastermind · revamp — Personalização do app: temas elementais, efeitos, destaque, fontes, densidade e textura.
   Portado de demo-offline.html (v0.10 "Laboratório de interfaces elementais" e applyPersonalization).
   Usa as MESMAS chaves de armazenamento do app, então a escolha vale nas duas interfaces:
   v10-global-element e v10-intensity (JSON), rpg-theme, rpg-accent, rpg-custom-accent, rpg-heading,
   rpg-body-font, rpg-density e rpg-texture (texto). */
(function(){
'use strict';
const {$,$$,esc}=RV;
const raw={get(k,d){try{return localStorage.getItem(k)??d}catch(_){return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch(_){}}};
const json={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
// Textos e selos do app (demo-offline.html, bloco rpg-v10-laboratorio)
const ELEMENTS={
 base:{label:'Base',tag:'Suas cores, sua mesa',intro:'O visual base respeita o destaque, a tipografia e as cores que você escolher, sem obrigar um elemento paranormal.',icon:'seal',color:'var(--accent)'},
 sangue:{label:'Sangue',tag:'A vida exige sacrifício',intro:'A interface pulsa. Filamentos rubros correm pelo cenário e os atributos acendem com o ritmo do personagem.',icon:'drop',color:'#f26078'},
 conhecimento:{label:'Conhecimento',tag:'Tudo pode ser revelado',intro:'Sigilos se desenham e orbitam dados. Geometria ritualística dourada acompanha habilidades e rituais.',icon:'eye',color:'#e6ba64'},
 energia:{label:'Energia',tag:'Tudo pode mudar',intro:'Descargas, interferências e néon fazem os painéis parecerem circuitos carregados de instabilidade.',icon:'bolt',color:'#b373ff'},
 morte:{label:'Morte',tag:'O tempo consome tudo',intro:'Névoa, cinzas, desgaste e movimentos solenes transformam os cartões em artefatos envelhecidos.',icon:'hourglass',color:'#b8c6b3'},
 medo:{label:'Medo',tag:'O impossível observa',intro:'Ecos translúcidos, geometria anômala e distorções discretas acompanham as ações do personagem.',icon:'spiral',color:'#eab5ff'}};
const ICON={seal:'<path d="M12 2 21 7v10l-9 5-9-5V7Z M12 2v20M3 7l9 5 9-5M3 17l9-5 9 5"/>',drop:'<path d="M12 2C6 10 5 12 5 16a7 7 0 0 0 14 0c0-4-1-6-7-14z"/>',eye:'<path d="M2 12q10-15 20 0-10 15-20 0z"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4"/>',bolt:'<path d="M14 1 4 13h7l-1 10 11-14h-8z"/>',hourglass:'<path d="M5 2h14M5 22h14M7 2v3l5 7-5 7v3m10-20v3l-5 7 5 7v3M8 18h8"/>',spiral:'<path d="M12 12c-1 0-2-1-2-2a3 3 0 1 1 5 3c-4 4-10 1-10-4a8 8 0 0 1 15-4c5 8-1 16-10 16"/>'};
const GLYPH={
 base:`<circle cx="100" cy="100" r="85"/><path d="M100 10 178 55v90l-78 45-78-45V55Z M22 55l78 45 78-45M100 10v90m-78 45 78-45 78 45"/>`,
 sangue:`<circle r="87" cx="100" cy="100" stroke-dasharray="1 9"/><path d="M100 7 179 148 21 148ZM100 190 21 53 179 53Z"/><path d="M100 22C68 70 56 86 56 112a44 44 0 0 0 88 0c0-26-12-42-44-90Z"/><path d="M100 61C84 85 81 93 81 108a19 19 0 0 0 38 0c0-15-3-23-19-47Z"/>`,
 conhecimento:`<circle cx="100" cy="100" r="89"/><circle cx="100" cy="100" r="70" stroke-dasharray="2 4"/><circle cx="100" cy="100" r="52"/><path d="M100 7v186M7 100h186M35 35l130 130M165 35 35 165M100 21l79 79-79 79-79-79Z"/><path d="M38 100Q100 26 162 100Q100 174 38 100Z"/><circle cx="100" cy="100" r="21"/><circle cx="100" cy="100" r="7"/>`,
 energia:`<polygon points="100,5 165,32 193,100 164,165 100,195 35,165 5,100 35,35"/><path d="M100 5v190M5 100h188M35 35l130 130M165 35 35 165"/><path d="M116 29 65 108h39l-19 63 54-86h-43Z"/><circle cx="100" cy="100" r="84" stroke-dasharray="25 8"/>`,
 morte:`<circle cx="100" cy="100" r="91" stroke-dasharray="38 6"/><circle cx="100" cy="100" r="74"/><path d="M58 32h84M58 168h84M70 32v23l31 45-31 45v23M130 32v23l-31 45 31 45v23"/><path d="M84 71h32l-16 27Z M79 146h42l-21-27Z"/><path d="M100 10v16M100 174v16M10 100h16M174 100h16"/>`,
 medo:`<circle cx="100" cy="100" r="91" stroke-dasharray="9 13"/><path d="M100 14 172 45l18 76-54 61-78-7-43-74 45-75Z"/><path d="M100 31 144 63l-9 57-56 30-44-50 28-55 65 8"/><path d="M100 100c-13-11-4-33 11-29 31 9 15 54-20 49-53-8-39-81 13-76 76 8 79 114-1 121"/><path d="M100 100 143 105 135 120"/>`};
// Paletas do app (demo-offline.html, applyPersonalization)
const PALETTES={gold:['#c7a87b','Dourado'],amethyst:['#ab95ef','Ametista'],emerald:['#80c4a4','Esmeralda'],azure:['#8bb7ed','Azul']};
const HEADS={classic:"'Cormorant Garamond',Georgia,'Times New Roman',serif",modern:"'Space Grotesk',system-ui,sans-serif"};
const BODIES={dm:"'DM Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",space:"'Space Grotesk',system-ui,sans-serif",serif:"Georgia,'Times New Roman',serif"};
const P={};
function load(){P.element=json.get('v10-global-element','base');if(!ELEMENTS[P.element])P.element='base';P.intensity=json.get('v10-intensity','max');if(!['off','low','max'].includes(P.intensity))P.intensity='max';
 P.theme=raw.get('rpg-theme','dark')==='light'?'light':'dark';P.accent=raw.get('rpg-accent','gold');P.custom=raw.get('rpg-custom-accent','#c7a87b');P.head=raw.get('rpg-heading','classic');P.body=raw.get('rpg-body-font','dm');P.density=raw.get('rpg-density','comfortable');P.texture=raw.get('rpg-texture','false')==='true'}
function apply(){const h=document.documentElement;
 h.dataset.theme=P.theme;h.dataset.paranormal=P.element;h.dataset.v10Intensity=P.intensity;
 const acc=P.accent==='custom'?P.custom:(PALETTES[P.accent]||PALETTES.gold)[0];
 if(P.theme==='light'&&P.element==='base'&&P.accent==='gold'){h.style.removeProperty('--accent');h.style.removeProperty('--accent-soft')}else{h.style.setProperty('--accent-base',acc);if(P.element==='base'){h.style.setProperty('--accent',acc);h.style.setProperty('--accent-soft',acc+'25')}else{h.style.removeProperty('--accent');h.style.removeProperty('--accent-soft')}}
 h.style.setProperty('--font-head',HEADS[P.head]||HEADS.classic);h.style.setProperty('--font-ui',BODIES[P.body]||BODIES.dm);
 h.classList.toggle('rv-compact',P.density==='compact');h.classList.toggle('rv-textured',P.texture);
 render();RV.emit('prefs:changed')}
function set(k,v){P[k]=v;({element:()=>json.set('v10-global-element',v),intensity:()=>json.set('v10-intensity',v),theme:()=>raw.set('rpg-theme',v),accent:()=>raw.set('rpg-accent',v),custom:()=>raw.set('rpg-custom-accent',v),head:()=>raw.set('rpg-heading',v),body:()=>raw.set('rpg-body-font',v),density:()=>raw.set('rpg-density',v),texture:()=>raw.set('rpg-texture',String(v))})[k]?.();apply()}
function render(){const root=$('#prefs');if(!root)return;const el=ELEMENTS[P.element];
 $('#el-name').textContent=el.label;$('#el-tag').textContent=el.tag;$('#el-intro').textContent=el.intro;
 $('#el-sigil').innerHTML=`<svg viewBox="0 0 200 200" aria-hidden="true"><g>${GLYPH[P.element]}</g><circle class="el-dot" cx="100" cy="100" r="4"/></svg>`;
 $('#el-grid').innerHTML=Object.entries(ELEMENTS).map(([id,e])=>`<button type="button" class="el-btn" data-el-theme="${id}" aria-pressed="${P.element===id}" style="--pick:${e.color}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[e.icon]}</svg><span>${e.label}</span></button>`).join('');
 const pr=(sel,val)=>$$(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(val))));
 pr('[data-pref="intensity"]',P.intensity);pr('[data-pref="theme"]',P.theme);pr('[data-pref="density"]',P.density);pr('[data-pref="accent"]',P.accent);
 $('#pref-custom').value=P.custom;$('#pref-head').value=P.head;$('#pref-body').value=P.body;$('#pref-texture').setAttribute('aria-pressed',String(P.texture));
 $('#accent-note').textContent=P.element==='base'?'No tema Base, esta cor define o destaque da interface inteira.':`No tema ${el.label}, o destaque vem do elemento. A cor escolhida volta ao usar o tema Base.`}
function bind(){const root=$('#prefs');
 root.addEventListener('click',e=>{const t=e.target.closest('[data-el-theme]');if(t){set('element',t.dataset.elTheme);return}const b=e.target.closest('[data-pref]');if(b){set(b.dataset.pref,b.dataset.v);return}if(e.target.closest('#pref-texture'))set('texture',!P.texture)});
 $('#pref-custom').addEventListener('input',e=>{P.custom=e.target.value;raw.set('rpg-custom-accent',e.target.value);P.accent='custom';raw.set('rpg-accent','custom');apply()});
 $('#pref-head').onchange=e=>set('head',e.target.value);$('#pref-body').onchange=e=>set('body',e.target.value);
 window.addEventListener('storage',e=>{if(e.key&&(/^rpg-/.test(e.key)||/^v10-/.test(e.key))){load();apply()}})}
/* ---------- Efeitos de ambiente: partículas por elemento (mesma lógica do app) ---------- */
function ambient(){const cv=document.createElement('canvas');cv.id='rv-ambient';cv.setAttribute('aria-hidden','true');document.body.prepend(cv);const cx=cv.getContext('2d');let W=0,H=0,last=0,parts=[];
 const resize=()=>{const dpr=Math.min(devicePixelRatio||1,1.6);W=innerWidth;H=innerHeight;cv.width=Math.floor(W*dpr);cv.height=Math.floor(H*dpr);cx.setTransform(dpr,0,0,dpr,0,0);parts=Array.from({length:72},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2.2+.5,s:Math.random()*.6+.2,z:Math.random()*Math.PI*2}))};
 const color=a=>({sangue:`rgba(255,80,113,${a})`,conhecimento:`rgba(249,193,92,${a})`,energia:`rgba(183,111,255,${a})`,morte:`rgba(198,215,200,${a})`,medo:`rgba(230,183,255,${a})`})[P.element]||`rgba(199,168,123,${a})`;
 const draw=t=>{requestAnimationFrame(draw);const on=P.element!=='base'&&P.intensity!=='off'&&!document.hidden&&!document.querySelector('.vtt:not([hidden])')&&!(matchMedia('(prefers-reduced-motion: reduce)').matches&&P.intensity!=='max');
  cv.style.display=on?'block':'none';if(!on||t-last<34)return;const dt=Math.min(50,t-last||34)/34;last=t;cx.clearRect(0,0,W,H);const time=t/1000,count=P.intensity==='low'?28:72,el=P.element;
  for(let i=0;i<count;i++){const p=parts[i];p.y-=p.s*dt*(el==='morte'?.35:1);p.x+=Math.sin(time*.5+p.z)*dt*(el==='energia'?.8:.17);if(p.y<-30){p.y=H+20;p.x=Math.random()*W}
   let op=.16+.18*(Math.sin(time*1.3+p.z)+1)/2;const size=p.r;
   if(el==='morte'){cx.fillStyle=color(.12);cx.fillRect(p.x,p.y,size*1.3,size*.9)}
   else if(el==='conhecimento'){cx.strokeStyle=color(op+.09);cx.lineWidth=.9;const r=p.r*2.2;cx.strokeRect(p.x-r,p.y-r,r*2,r*2);if(i%15===0){cx.beginPath();cx.arc(p.x,p.y,10+Math.sin(time)*3,0,Math.PI*2);cx.stroke()}}
   else if(el==='energia'){cx.strokeStyle=color(op+.15);cx.lineWidth=1.1;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x+2*Math.sin(time*3+i),p.y-9);cx.lineTo(p.x-3,p.y-19);cx.stroke()}
   else if(el==='medo'){cx.strokeStyle=color(op);cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x+size*4,p.y+size*5);cx.lineTo(p.x-size*3,p.y+size*4);cx.closePath();cx.stroke()}
   else{cx.fillStyle=color(op);cx.beginPath();cx.arc(p.x,p.y,size,0,Math.PI*2);cx.fill();if(i%10===0){cx.strokeStyle=color(op/2);cx.beginPath();cx.moveTo(p.x,p.y);cx.bezierCurveTo(p.x+13,p.y+20,p.x-15,p.y+30,p.x,p.y+54);cx.stroke()}}}};
 addEventListener('resize',resize);resize();requestAnimationFrame(draw)}
load();
RV.Prefs={load,apply,bind,set,ambient,state:P,ELEMENTS,PALETTES};
})();
