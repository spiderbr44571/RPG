/* Mastermind · revamp — conversão entre o cenário da nova interface (Cena) e o formato do servidor da mesa
   (LocalCampaignServer: layers terrain/props/walls, rooms, tokens). Funções puras: rodam no app e nos testes (Node).
   - Terreno e objetos levam um apelido da paleta clássica (id) e o dado completo da nova interface (t / items),
     para que a mesa clássica continue mostrando algo parecido.
   - Névoa vira salas ocultas (hidden), que o servidor usa para esconder casas, tokens e desenhos do jogador.
   - Notas do mestre, objetos ocultos e portas secretas fechadas ficam em "v2", que o servidor nunca envia ao jogador. */
(function(root){
'use strict';
const T2C={pedra:'stone','pedra-fria':'stone',paralelepipedo:'cobble',marmore:'marble',madeira:'wood','tabuas-velhas':'wood',carpete:'carpet',terra:'soil',cascalho:'soil',
 grama:'grass',mato:'moss',areia:'sand',neve:'snow',gelo:'snow',agua:'water','agua-funda':'water',pantano:'moss',lava:'lava',asfalto:'ash',calcada:'cobble','piso-frio':'marble',concreto:'stone'};
const C2T={stone:'pedra',cobble:'paralelepipedo',marble:'marmore',wood:'madeira',carpet:'carpete',parquet:'madeira',grass:'grama',soil:'terra',moss:'mato',sand:'areia',snow:'neve',
 water:'agua',lava:'lava',arcane:'pedra-fria',ash:'cascalho'};
const P2C={mesa:'table','mesa-redonda':'table',cadeira:'chair',banco:'chair',cama:'bed',estante:'books',bau:'chest',barril:'barrel',caixote:'crate',armario:'crate',trono:'chair',
 balcao:'table',lareira:'campfire',escada:'stairs',alcapao:'trap',pilar:'pillar','coluna-quebrada':'pillar',estatua:'statue',arvore:'tree',pinheiro:'tree',arbusto:'bush',
 pedra:'rock','rocha-grande':'rock',tronco:'rock',flores:'flowers',fogueira:'campfire',altar:'altar','circulo-ritual':'portal',sigilo:'portal',caldeirao:'altar',velas:'torch',
 sarcofago:'altar',espelho:'crystal','livro-ritual':'books','mesa-escritorio':'table','mesa-reuniao':'table',sofa:'chair','cadeira-escritorio':'chair',poste:'torch',
 tocha:'torch',lampiao:'torch',vela:'torch',lampada:'torch','luz-ritual':'crystal',fogo:'campfire'};
const C2P={tree:'arvore',bush:'arbusto',rock:'pedra',flowers:'flores',table:'mesa-redonda',chair:'cadeira',bed:'cama',books:'livro-ritual',barrel:'barril',chest:'bau',crate:'caixote',
 statue:'estatua',pillar:'pilar',torch:'tocha',stairs:'escada',trap:'alcapao',altar:'altar',portal:'sigilo',crystal:'luz-ritual',campfire:'fogueira'};
const THEME_FLOOR={stone:'pedra',forest:'grama',cavern:'cascalho',paper:'madeira'};
const SIDES=['pc','ally','foe','npc','obj'];
const ID=/^[A-Za-z0-9_-]{1,48}$/;
const safeId=(v,prefix)=>{const s=String(v||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,48);return s||(prefix||'id')+Math.random().toString(36).slice(2,9)};
const clampInt=(v,a,b)=>Math.max(a,Math.min(b,Math.round(Number(v)||0)));
const initials=n=>{n=String(n||'?');const p=n.split(/\s+/).filter(w=>w.length>2||/^[A-Z]/.test(w));return((p[0]||n)[0]+((p[1]||'')[0]||n[1]||'')).toUpperCase()};

/* arestas: 'h:x,y' é a borda de cima da casa (x,y); 'v:x,y' é a borda da esquerda */
function edgeToMark(key,cols,rows){const m=/^([hv]):(-?\d+),(-?\d+)$/.exec(key);if(!m)return null;const x=+m[2],y=+m[3];
 if(m[1]==='h'){if(x<0||x>=cols)return null;if(y<rows&&y>=0)return{x,y,side:'n'};if(y===rows&&y>0)return{x,y:y-1,side:'s'};return null}
 if(y<0||y>=rows)return null;if(x<cols&&x>=0)return{x,y,side:'w'};if(x===cols&&x>0)return{x:x-1,y,side:'e'};return null}
function markToEdge(m){const x=+m.x,y=+m.y;return m.side==='n'?'h:'+x+','+y:m.side==='s'?'h:'+x+','+(y+1):m.side==='w'?'v:'+x+','+y:m.side==='e'?'v:'+(x+1)+','+y:null}

/* névoa em casas -> retângulos (salas ocultas) */
function fogRects(cells,cols,rows){const set=new Set(cells),used=new Set(),out=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const k=x+','+y;if(!set.has(k)||used.has(k))continue;
  let w=0;while(x+w<cols&&set.has((x+w)+','+y)&&!used.has((x+w)+','+y))w++;
  let h=1;grow:while(y+h<rows){for(let i=0;i<w;i++){const kk=(x+i)+','+(y+h);if(!set.has(kk)||used.has(kk))break grow}h++}
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)used.add((x+i)+','+(y+j));out.push({x,y,w,h})}
 return out}
function regionContains(r,px,py){if((r.shape||'rect')==='circle'){const rx=r.w/2,ry=r.h/2,cx=r.x+rx,cy=r.y+ry;return((px-cx)*(px-cx))/(rx*rx)+((py-cy)*(py-cy))/(ry*ry)<=1}
 return px>=r.x&&py>=r.y&&px<r.x+r.w&&py<r.y+r.h}

/* ---------- Cena -> servidor ---------- */
function sceneToServer(scene,opts={}){
 const cols=clampInt(scene.cols,6,60),rows=clampInt(scene.rows,6,60),prev=opts.prev||null,warnings=[];
 const map=Object.assign({},prev||{});delete map.layers;delete map.v2;delete map.look;
 map.id=ID.test(scene.id||'')?scene.id:safeId(scene.id,'cena');map.name=String(scene.name||'Cenário').slice(0,80);map.width=cols;map.height=rows;
 map.theme=prev?.theme||'stone';
 const terrain=[],props=[],walls=[];
 for(const[k,id]of Object.entries(scene.terrain||{})){const[x,y]=k.split(',').map(Number);if(!(x>=0&&y>=0&&x<cols&&y<rows))continue;
  terrain.push({x,y,id:T2C[id]||'stone',t:id})}
 const fogSet=new Set(scene.fog||[]),hiddenObjects=[],byCell=new Map();
 for(const o of scene.objects||[]){if(!(o.x>=0&&o.y>=0&&o.x<cols&&o.y<rows))continue;const item=Object.assign({},o);delete item.locked;
  if(item.src&&String(item.src).length>260000){warnings.push('Uma imagem importada é grande demais para a mesa e ficou só no aparelho.');continue}
  if(o.hidden){hiddenObjects.push(item);continue}delete item.hidden;
  const k=o.x+','+o.y;if(!byCell.has(k))byCell.set(k,[]);byCell.get(k).push(item)}
 for(const[k,items]of byCell){const[x,y]=k.split(',').map(Number);const a=String(items[0].asset||'');props.push({x,y,id:P2C[a]||(a.startsWith('img:')?'imagem':(/^[a-z][a-z0-9-]{1,39}$/.test(a)?a:'objeto')),items})}
 const secret=[];const seen=new Set();
 for(const[k,d]of Object.entries(scene.doors||{})){const m=edgeToMark(k,cols,rows);if(!m)continue;const key=m.x+':'+m.y+':'+m.side;if(seen.has(key))continue;seen.add(key);
  const under=scene.walls?.[k]||null;
  if(d.type==='secreta'&&!d.open){secret.push({k,wall:under});walls.push(Object.assign(m,{kind:'wall',material:under||'pedra'}));continue}
  walls.push(Object.assign(m,{kind:'door',open:!!d.open,type:d.type||'porta'},under?{under}:{}))}
 for(const[k,mat]of Object.entries(scene.walls||{})){if(scene.doors?.[k])continue;const m=edgeToMark(k,cols,rows);if(!m)continue;const key=m.x+':'+m.y+':'+m.side;if(seen.has(key))continue;seen.add(key);
  walls.push(Object.assign(m,{kind:'wall',material:String(mat||'pedra')}))}
 if(terrain.length>3600||props.length>3600||walls.length>720)warnings.push('O cenário passou do limite da mesa (3600 casas pintadas, 3600 objetos, 720 paredes).');
 map.layers={terrain,props,walls};
 const keep=(prev?.rooms||[]).filter(r=>!r.v2&&!r.hidden);
 const rects=fogRects([...fogSet].filter(k=>{const[x,y]=k.split(',').map(Number);return x>=0&&y>=0&&x<cols&&y<rows}),cols,rows);
 if(keep.length+rects.length>75)warnings.push('A névoa ficou recortada demais: a mesa aceita até 75 áreas ocultas. Junte as áreas.');
 map.rooms=keep.concat(rects.slice(0,Math.max(0,75-keep.length)).map((r,i)=>({id:'nv'+i,name:'Área oculta',x:r.x,y:r.y,w:r.w,h:r.h,hidden:true,shape:'rect',fogStyle:'shadow',intensity:100,v2:true})));
 const g=scene.grid||{};
 map.look={bg:scene.bg||'rocha',time:scene.ambient?.time||'dia',mist:+(scene.ambient?.mist)||0,weather:scene.ambient?.weather||'nenhum',meters:+scene.meters||1.5,system:scene.system||'',
  grid:{show:g.show!==false,color:/^#[0-9a-f]{6}$/i.test(g.color||'')?g.color:'#ffffff',alpha:+g.alpha||0,width:+g.width||1,overTerrainOnly:!!g.overTerrainOnly},imageOpacity:scene.imageOpacity??1};
 /* sombras automáticas de salas fechadas: calculadas pelo servidor (mesma opção do editor anterior) */
 map.atmosphere=Object.assign({},prev?.atmosphere||{},{doorShadows:!!scene.ambient?.doorShadows});
 map.v2={notes:(scene.notes||[]).slice(0,200),hiddenObjects,secret,layers:scene.layers||null};
 let asset=null;
 if(scene.image&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(scene.image)){
  if(scene.image.length<=900000){asset={id:safeId('bg-'+map.id).slice(0,48),kind:'map',name:String(scene.name||'Mapa').slice(0,70),image:scene.image};map.backgroundAssetId=asset.id}
  else{warnings.push('A imagem de fundo passa de 900 KB e não foi enviada. Use uma imagem menor.');delete map.backgroundAssetId}}
 else if(!scene.image)delete map.backgroundAssetId;
 map.tokens=(opts.tokens||prev?.tokens||[]).filter(t=>t.x<cols&&t.y<rows);
 return{map,asset,warnings}}

/* token da nova interface -> token do servidor (mantém o que o servidor já sabia dele) */
function tokenToServer(t,creature){const base=Object.assign({},t.srv||{});delete base.lightKind;
 const out=Object.assign(base,{id:ID.test(t.id)?t.id:safeId(t.id,'t'),name:String(t.name||'Token').slice(0,70),x:Math.max(0,t.x|0),y:Math.max(0,t.y|0),
  hidden:!!t.hidden,rotation:(((Math.round(t.rot||0))%360)+360)%360,size:clampInt(t.size||1,1,4),side:SIDES.includes(t.kind)?t.kind:'npc'});
 if(!out.kind)out.kind=t.creature||t.hp?'creature':t.kind==='obj'?'object':'character';
 if(out.kind==='character'&&t.characterId&&!out.characterId&&ID.test(t.characterId))out.characterId=t.characterId;
 if(out.kind==='creature'){const c=creature||{};out.maxHp=clampInt(t.hp?.[1]??c.hp??out.maxHp??1,1,100000);out.hp=clampInt(t.hp?.[0]??out.hp??out.maxHp,0,out.maxHp);
  out.defense=clampInt(out.defense??c.defense??0,0,1000);if(t.creature)out.creatureName=String(t.creature).slice(0,70);
  if(c.sys&&!out.systemId)out.systemId=c.sys==='dnd'?'d-d':'ordem-paranormal';if(c.source&&!out.source)out.source=String(c.source).slice(0,150);
  if(c.attack&&!out.attacks)out.attacks=[{name:'Ataque',test:String(c.attack).slice(0,60),damage:String(c.damage||'').slice(0,60)}];
  if(out.movementSquares==null&&t.speed!=null)out.movementSquares=clampInt(t.speed,0,60)}
 return out}

/* ---------- servidor -> Cena ---------- */
function serverToScene(map,Cena,opts={}){
 const cols=clampInt(map.width,6,60),rows=clampInt(map.height,6,60);const s=Cena.blank(map.name||'Cenário',cols,rows);s.id=map.id;
 const look=map.look||null,v2=map.v2||{};
 if(look){s.bg=look.bg||s.bg;s.ambient={time:look.time||'dia',mist:+look.mist||0,weather:look.weather||'nenhum'};s.meters=+look.meters||1.5;if(look.system)s.system=look.system;
  if(look.grid)s.grid=Object.assign(s.grid,look.grid);if(look.imageOpacity!=null)s.imageOpacity=+look.imageOpacity}
 if(map.atmosphere?.doorShadows===true)s.ambient.doorShadows=true;
 const L=map.layers||{};
 (L.terrain||[]).forEach(m=>{if(m.x>=0&&m.y>=0&&m.x<cols&&m.y<rows){const id=Cena.TERRAIN[m.t]?m.t:C2T[m.id]||(Cena.TERRAIN[m.id]?m.id:null);if(id)s.terrain[m.x+','+m.y]=id}});
 if(!look&&!(L.terrain||[]).length){const floor=THEME_FLOOR[map.theme]||'pedra';Cena.paintRect(s,0,0,cols,rows,floor);s.grid.overTerrainOnly=false}
 (L.props||[]).forEach(m=>{if(Array.isArray(m.items)&&m.items.length){m.items.forEach(o=>{if(!o||typeof o!=='object')return;const a=Cena.ASSET[o.asset];if(!a&&!o.src)return;
   s.objects.push(Object.assign({id:'o'+Math.random().toString(36).slice(2,8),rot:0,opacity:1,tint:null,layer:a?a.layer:'objetos',hidden:false,locked:false,blocks:false,blocksSight:false,light:null,label:''},o,{w:clampInt(o.w||1,1,12),h:clampInt(o.h||1,1,12)}))});return}
  const asset=C2P[m.id]||(Cena.ASSET[m.id]?m.id:null);if(asset)s.objects.push(Cena.obj(asset,m.x,m.y,{w:1,h:1}))});
 (L.walls||[]).forEach(m=>{const k=markToEdge(m);if(!k)return;
  if(m.kind==='door'){s.doors[k]={type:m.type||'porta',open:!!m.open};if(m.under)s.walls[k]=m.under}else s.walls[k]=m.material||'pedra'});
 if(opts.master){
  (v2.secret||[]).forEach(d=>{if(!d?.k)return;s.doors[d.k]={type:'secreta',open:false};if(d.wall)s.walls[d.k]=d.wall;else delete s.walls[d.k]});
  (v2.hiddenObjects||[]).forEach(o=>{if(o&&(Cena.ASSET[o.asset]||o.src))s.objects.push(Object.assign({},o,{hidden:true}))});
  s.notes=Array.isArray(v2.notes)?v2.notes.slice(0,200):[];
  if(v2.layers)Object.keys(s.layers).forEach(k=>{if(v2.layers[k])s.layers[k]=Object.assign({},s.layers[k],v2.layers[k])});
  const fog=new Set();(map.rooms||[]).forEach(r=>{if(!r.hidden||r.intensity===0)return;for(let y=Math.max(0,r.y);y<Math.min(rows,r.y+r.h);y++)for(let x=Math.max(0,r.x);x<Math.min(cols,r.x+r.w);x++)if(regionContains(r,x+.5,y+.5))fog.add(x+','+y)});
  s.fog=[...fog];
 }else{s.fog=(opts.hiddenCells||[]).map(n=>(n%cols)+','+Math.floor(n/cols))}
 if(map.backgroundAssetId&&opts.assets){const a=opts.assets.find(x=>x.id===map.backgroundAssetId);if(a?.image)s.image=a.image}
 return s}

/* token do servidor -> token da nova interface */
function tokenFromServer(t,ctx={}){const side=SIDES.includes(t.side)?t.side:null;
 const kind=side||(t.kind==='creature'?'foe':t.kind==='character'?(t.ownerPlayerId||t.movable?'pc':'ally'):'obj');
 const cname=t.creatureName||t.name;const known=ctx.creatures&&ctx.creatures[cname]?cname:null;
 const out={id:t.id,name:t.name||'Token',ini:initials(t.name),kind,x:t.x|0,y:t.y|0,size:clampInt(t.size||1,1,4),
  speed:ctx.limits&&ctx.limits[t.id]!=null?ctx.limits[t.id]:(t.movementSquares!=null?t.movementSquares:6),used:ctx.spent&&ctx.spent[t.id]||0,
  hp:t.kind==='creature'&&t.maxHp?[t.hp??t.maxHp,t.maxHp]:null,creature:known,rot:t.rotation||0,hidden:!!t.hidden,
  owner:t.ownerPlayerId||(t.movable?ctx.me||null:null),characterId:t.characterId||null,photo:t.photo||null,srv:ctx.master?t:null};
 return out}

/* iniciativa e rolagens */
function initFromServer(init,pending){const entries=(init?.entries||[]).map(e=>({id:e.tokenId,score:e.score}));(pending||[]).forEach(id=>{if(!entries.some(e=>e.id===id))entries.push({id,score:null})});
 const idx=Math.max(0,entries.findIndex(e=>e.id===init?.activeId));return{entries,idx,round:init?.round||1}}
function rollToLog(r){const faces=Array.isArray(r.faces)?r.faces:[];const kept=r.mode==='highest'&&faces.length?Math.max(...faces):r.mode==='lowest'&&faces.length?Math.min(...faces):null;
 return{who:r.by||'Mesa',text:(r.label&&r.label!=='Rolagem'?r.label+' · ':'')+r.formula+(r.mode==='highest'?' · maior':r.mode==='lowest'?' · menor':''),faces,kept,total:r.total,vis:r.visibility==='master'?'self':'public',at:r.at||0,id:r.id}}
/* fórmula da nova interface (1d20+3, 3O+5) -> fórmula do servidor + modo */
function serverFormula(text,mode){const f=String(text||'').replace(/\s+/g,'').toUpperCase();let m=f.match(/^(\d*)O([+-]\d+)?$/);
 if(m){const n=Math.min(+m[1]||1,30),b=+(m[2]||0);return{formula:n+'d20'+(b?(b>0?'+':'')+b:''),mode:n>1?'highest':'sum'}}
 m=f.match(/^(\d*)D(\d+)([+-]\d+)?$/);if(!m)return null;const n=+m[1]||1,s=+m[2],b=+(m[3]||0);
 if(n<1||n>30||![4,6,8,10,12,20,100].includes(s)||Math.abs(b)>100)return null;
 const md=s===20&&(mode==='highest'||mode==='lowest')?mode:'sum';return{formula:n+'d'+s+(b?(b>0?'+':'')+b:''),mode:md}}

const api={T2C,C2T,P2C,C2P,edgeToMark,markToEdge,fogRects,regionContains,sceneToServer,tokenToServer,serverToScene,tokenFromServer,initFromServer,rollToLog,serverFormula,initials};
root.RVAdapt=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
