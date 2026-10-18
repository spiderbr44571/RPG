/* RPG Mesa 0.29: editor offline/LAN de mapas, assets, salas e tokens. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=(s,e=document)=>e.querySelector(s);
const id=()=>('s'+(crypto.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'')).slice(0,28);
const builtin=[['map-stone','Ruínas','map','🪨'],['map-forest','Floresta','map','🌲'],['map-cave','Caverna','map','🕯️'],['char-hero','Herói','character','🛡️'],['char-scout','Explorador','character','🧭'],['char-mage','Mago','character','🪄'],['mob-shadow','Criatura','creature','👁️'],['mob-wolf','Lobo','creature','🐺'],['mob-golem','Construto','creature','🗿'],['item-chest','Baú','item','🧰'],['item-key','Chave','item','🗝️'],['item-door','Porta','object','🚪'],['item-altar','Altar','object','🔮'],['item-tree','Árvore','object','🌳']].map(([id,name,kind,emoji])=>({id,name,kind,emoji,image:''}));
let css=document.createElement('style');css.textContent='.r29{border:1px solid var(--line,#736476);border-radius:17px;padding:13px;margin:15px 0;background:var(--panel,#211d29);color:var(--fg,#fff);font:12px system-ui}.r29 *{box-sizing:border-box}.r29 h2{font:normal 27px Georgia;margin:2px 0}.r29 p{color:var(--muted,#b7abba)}.r29 button,.r29 input,.r29 select{background:var(--panel2,#302b38);color:var(--fg,#fff);border:1px solid var(--line,#766c7f);border-radius:8px;padding:9px;max-width:100%;font:inherit}.r29 button{cursor:pointer}.r29 button.active,.r29 .primary{background:var(--accent,#d5b5cc);color:#1b1520;font-weight:bold}.r29row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0}.r29row label{display:grid;gap:3px}.r29layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:12px}.r29side{display:grid;align-content:start;gap:8px}.r29side label{display:grid;gap:4px}.r29assets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;max-height:265px;overflow:auto}.r29assets button{min-width:0;min-height:53px;font-size:20px;display:grid;place-items:center;padding:4px}.r29assets small{font-size:8px;max-width:54px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.r29assets img{width:34px;height:34px;object-fit:cover}.r29wrap{overflow:auto;max-height:63vh;border:1px solid var(--line,#766);border-radius:11px;background:#0f1118}.r29board{position:relative;touch-action:pan-x pan-y;user-select:none;cursor:crosshair;background-color:#302f38;background-image:linear-gradient(#ffffff30 1px,transparent 1px),linear-gradient(90deg,#ffffff30 1px,transparent 1px);background-size:42px 42px}.r29board[data-theme=forest]{background-color:#2c4234}.r29board[data-theme=cavern]{background-color:#252132}.r29board[data-theme=paper]{background-color:#68503b}.r29room{position:absolute;border:2px dashed #ffe0aeaa;background:#d5b49629;color:#ffe5b3;padding:2px;pointer-events:none;font-size:10px}.r29room.hidden{background:repeating-linear-gradient(45deg,#090a16c9 0 8px,#35263fd9 8px 16px);border-color:#ffaccf}.r29token{position:absolute;width:40px;height:40px;display:grid;place-items:center;border:2px solid #ffe0b0;border-radius:50%;background:#151421ed;color:#fff;font-size:22px;touch-action:none}.r29token.chosen{border-color:#80ffc4;box-shadow:0 0 0 3px #80ffc477}.r29token img{width:32px;height:32px;border-radius:50%;object-fit:cover}.r29token small{position:absolute;top:39px;background:#151421ed;font-size:9px;white-space:nowrap}.r29box{border:1px solid var(--line,#736);border-radius:11px;padding:9px;margin:10px 0}.r29status{color:var(--accent,#ecb7d6);min-height:20px}@media(max-width:750px){.r29layout{grid-template-columns:1fr}.r29assets{grid-template-columns:repeat(7,minmax(46px,1fr))}}';document.head.append(css);
function open(host,opts){
 let scenes=[],assets=[],active='',selected='',selectedToken='',selectedAsset='char-hero',tool='token',filter='all',pointer=null;
 const api=opts.request,route=opts.route,players=opts.players||[],characters=opts.characters||[];
 const scene=()=>scenes.find(s=>s.id===selected),asset=k=>assets.find(a=>a.id===k);
 const msg=s=>{const el=$('.r29status',host);if(el)el.textContent=s};
 const floor=(n,mx)=>Math.max(0,Math.min(mx,Math.floor(Number(n)||0)));
 function render(){
  const m=scene();
  let h='<div class="r29"><div class="r29row"><h2 style="flex:1">✧ Cenários</h2><button data-r29="close">Fechar</button></div><p>Biblioteca de assets, grade, criaturas e salas ocultáveis. O mestre enxerga tudo; jogadores veem apenas áreas reveladas.</p>';
  h+='<div class="r29row"><select data-r29="select">'+scenes.map(s=>'<option value="'+esc(s.id)+'" '+(s.id===selected?'selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select><button data-r29="new">+ Cenário</button><button data-r29="delete">Excluir</button><button data-r29="publish" class="'+(m&&m.id===active?'active':'')+'">'+(m&&m.id===active?'● Publicado':'Publicar')+'</button><button data-r29="save" class="primary">Salvar na campanha</button></div>';
  if(m){
   h+='<div class="r29layout"><aside class="r29side"><label>Nome<input data-r29-field="name" maxlength="80" value="'+esc(m.name)+'"></label>';
   h+='<div class="r29row"><label>Colunas<input data-r29-field="width" type="number" value="'+m.width+'" min="6" max="60" style="width:72px"></label><label>Linhas<input data-r29-field="height" type="number" value="'+m.height+'" min="6" max="60" style="width:72px"></label></div>';
   h+='<label>Terreno<select data-r29-field="theme">'+[['stone','Pedra'],['forest','Floresta'],['cavern','Caverna'],['paper','Pergaminho']].map(([v,n])=>'<option value="'+v+'" '+(v===m.theme?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';
   h+='<label>Imagem de fundo<select data-r29-field="backgroundAssetId"><option value="">Sem imagem</option>'+assets.filter(a=>a.kind==='map'&&a.image).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===m.backgroundAssetId?'selected':'')+'>'+esc(a.name)+'</option>').join('')+'</select></label>';
   h+='<div class="r29row">'+[['token','Inserir'],['room','Sala'],['erase','Apagar']].map(([v,n])=>'<button data-r29-tool="'+v+'" class="'+(tool===v?'active':'')+'">'+n+'</button>').join('')+'</div>';
   h+='<label>Assets<select data-r29="filter">'+[['all','Todos'],['map','Mapas'],['character','Personagens'],['creature','Criaturas'],['item','Itens'],['object','Objetos']].map(([v,n])=>'<option value="'+v+'" '+(filter===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>';
   h+='<div class="r29assets">'+assets.filter(a=>filter==='all'||a.kind===filter).map(a=>'<button data-r29-asset="'+esc(a.id)+'" title="'+esc(a.name)+'" class="'+(a.id===selectedAsset?'active':'')+'">'+(a.image?'<img alt="" src="'+a.image+'">':esc(a.emoji||'✧'))+'<small>'+esc(a.name)+'</small></button>').join('')+'</div>';
   h+='<label>Importar imagem JPG / PNG / WebP<input type="file" data-r29="upload" accept="image/png,image/jpeg,image/webp"></label><small>O tipo escolhido acima define onde o novo asset entra.</small></aside>';
   const img=asset(m.backgroundAssetId)?.image||'',bg=img?'background-image:linear-gradient(#ffffff35 1px,transparent 1px),linear-gradient(90deg,#ffffff35 1px,transparent 1px),url('+img+');background-size:42px 42px,42px 42px,100% 100%;':'';
   h+='<div><div class="r29wrap"><div id="r29-board" class="r29board" data-theme="'+esc(m.theme)+'" style="width:'+(m.width*42)+'px;height:'+(m.height*42)+'px;'+bg+'">';
   h+=m.rooms.map(r=>'<div class="r29room '+(r.hidden?'hidden':'')+'" style="left:'+(r.x*42)+'px;top:'+(r.y*42)+'px;width:'+(r.w*42)+'px;height:'+(r.h*42)+'px">'+esc(r.name)+'</div>').join('');
   h+=m.tokens.map(t=>{const a=asset(t.assetId);return '<div data-r29-token="'+esc(t.id)+'" class="r29token '+(selectedToken===t.id?'chosen':'')+'" style="left:'+(t.x*42+1)+'px;top:'+(t.y*42+1)+'px">'+(a?.image?'<img alt="" src="'+a.image+'">':esc(a?.emoji||'✧'))+'<small>'+esc(t.name)+'</small></div>'}).join('');
   h+='</div></div><p>Toque na grade para adicionar; arraste o token para mover. Ferramenta Sala: arraste para definir uma área, inicialmente oculta.</p>';
   h+='<div class="r29box"><strong>Salas</strong><div class="r29row">'+(m.rooms.length?m.rooms.map(r=>'<button data-r29-room="'+esc(r.id)+'">'+(r.hidden?'Revelar ':'Ocultar ')+esc(r.name)+'</button><button data-r29-roomdel="'+esc(r.id)+'">×</button>').join(''):'Nenhuma sala')+'</div></div>';
   const t=m.tokens.find(t=>t.id===selectedToken);
   h+='<div class="r29box"><strong>Token selecionado</strong>'+(t?'<div class="r29row"><label>Nome<input data-r29-token-name="'+esc(t.id)+'" maxlength="70" value="'+esc(t.name)+'"></label><label>Controle<select data-r29-token-owner="'+esc(t.id)+'"><option value="">Somente mestre</option>'+((t.kind==='character')?players.filter(p=>p.characterId).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===t.ownerPlayerId?'selected':'')+'>'+esc(p.nickname)+' · '+esc(characters.find(c=>c.id===p.characterId)?.sheet?.name||'Ficha')+'</option>').join(''):'')+'</select></label><label><input type="checkbox" data-r29-token-hidden="'+esc(t.id)+'" '+(t.hidden?'checked':'')+'> Oculto</label><button data-r29="token-delete">Excluir token</button></div>':'<p>Toque em um token para atribuir uma ficha e editar.</p>')+'</div></div></div>';
  }
  h+='<p class="r29status" role="status">Alterações não salvas até clicar em Salvar.</p></div>';
  host.innerHTML=h;
 }
 async function load(){
  let d=await api(route+'/scenarios');scenes=d.scenarios||[];assets=builtin.concat((d.assets||[]).filter(x=>!builtin.some(b=>b.id===x.id)));
  active=d.activeScenarioId||'';selected=scenes.find(s=>s.id===selected)?.id||scenes[0]?.id||'';selectedToken='';render();
 }
 const clamp=(v,mx)=>floor(v,mx),cell=(e,b)=>{const r=b.getBoundingClientRect(),m=scene();return {x:clamp((e.clientX-r.left)/42,m.width-1),y:clamp((e.clientY-r.top)/42,m.height-1)}};
 host.addEventListener('pointerdown',e=>{let b=e.target.closest('#r29-board');if(!b||!scene())return;const t=e.target.closest('[data-r29-token]');if(t&&tool!=='erase'){pointer={type:'drag',id:t.dataset.r29Token};t.setPointerCapture?.(e.pointerId);e.preventDefault()}else if(tool==='room'){pointer={type:'room',start:cell(e,b)};e.preventDefault()}});
 host.addEventListener('pointerup',e=>{
  const b=$('#r29-board',host),m=scene();if(!m||!b||(!e.target.closest('#r29-board')&&!pointer))return;
  const p=cell(e,b);
  if(pointer?.type==='drag'){const t=m.tokens.find(x=>x.id===pointer.id);if(t){t.x=p.x;t.y=p.y;selectedToken=t.id}pointer=null;render();return}
  if(pointer?.type==='room'){const a=pointer.start;pointer=null;m.rooms.push({id:id(),name:'Sala '+(m.rooms.length+1),x:Math.min(a.x,p.x),y:Math.min(a.y,p.y),w:Math.abs(a.x-p.x)+1,h:Math.abs(a.y-p.y)+1,hidden:true});render();return}
  if(tool==='erase'){m.tokens=m.tokens.filter(t=>t.x!==p.x||t.y!==p.y);selectedToken='';render();return}
  const a=asset(selectedAsset);
  if(tool==='token'&&a&&a.kind!=='map'){const t={id:id(),name:a.name,assetId:a.id,kind:a.kind,x:p.x,y:p.y,ownerPlayerId:'',characterId:'',hidden:false};m.tokens.push(t);selectedToken=t.id;render()}
 });
 host.addEventListener('change',async e=>{
  const m=scene(),t=m?.tokens.find(t=>t.id===selectedToken);
  if(e.target.dataset.r29==='select'){selected=e.target.value;selectedToken='';render();return}
  if(e.target.dataset.r29==='filter'){filter=e.target.value;render();return}
  if(e.target.dataset.r29Field&&m){
   const k=e.target.dataset.r29Field;m[k]=['width','height'].includes(k)?Math.max(6,Math.min(60,Number(e.target.value)||6)):e.target.value;
   if(k==='width'||k==='height'){m.tokens=m.tokens.filter(t=>t.x<m.width&&t.y<m.height);m.rooms=m.rooms.filter(r=>r.x+r.w<=m.width&&r.y+r.h<=m.height)}
   render();return;
  }
  if(t&&e.target.dataset.r29TokenName){t.name=e.target.value.trim().slice(0,70)||t.name;render();return}
  if(t&&e.target.dataset.r29TokenOwner){const p=players.find(x=>x.id===e.target.value);t.ownerPlayerId=p?.id||'';t.characterId=p?.characterId||'';render();return}
  if(t&&e.target.dataset.r29TokenHidden){t.hidden=e.target.checked;render();return}
  if(e.target.dataset.r29==='upload'&&e.target.files[0]){
   let f=e.target.files[0];
   if(f.size>6e6||!['image/jpeg','image/png','image/webp'].includes(f.type)){msg('Arquivo deve ser JPG/PNG/WebP até 6 MB');return}
   let url=URL.createObjectURL(f),im=new Image();
   try{
    await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=url});
    const max=filter==='map'?900:210,k=Math.min(1,max/im.width,max/im.height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(im.width*k));canvas.height=Math.max(1,Math.round(im.height*k));
    let ctx=canvas.getContext('2d');ctx.drawImage(im,0,0,canvas.width,canvas.height);
    let data=canvas.toDataURL('image/jpeg',0.6);
    if(data.length>200000)throw Error('Imagem muito grande após compressão');
    const a={id:id(),name:f.name.replace(/\.[^.]+$/,'').slice(0,60)||'Novo asset',kind:filter==='all'?'object':filter,emoji:'✧',image:data};
    assets.push(a);selectedAsset=a.id;render();msg('Asset importado, clique Salvar para guardar no servidor.');
   }catch(ex){msg(ex.message)}finally{URL.revokeObjectURL(url)}
  }
 });
 host.addEventListener('click',async e=>{
  const a=e.target.closest('[data-r29-asset]');if(a){selectedAsset=a.dataset.r29Asset;render();return}
  const m=e.target.closest('[data-r29-tool]');if(m){tool=m.dataset.r29Tool;render();return}
  const room=e.target.closest('[data-r29-room]');if(room){let r=scene()?.rooms.find(x=>x.id===room.dataset.r29Room);if(r){r.hidden=!r.hidden;render()}return}
  const del=e.target.closest('[data-r29-roomdel]');if(del){scene().rooms=scene().rooms.filter(r=>r.id!==del.dataset.r29Roomdel);render();return}
  const b=e.target.closest('[data-r29]');if(!b)return;
  try{
   switch(b.dataset.r29){
    case 'new':{const s={id:id(),name:'Novo cenário',width:24,height:18,theme:'stone',backgroundAssetId:'',rooms:[],tokens:[]};scenes.push(s);selected=s.id;render();break}
    case 'delete':{if(!confirm('Excluir cenário?'))break;scenes=scenes.filter(s=>s.id!==selected);if(active===selected)active='';selected=scenes[0]?.id||'';render();break}
    case 'publish':{active=active===selected?'':selected;render();msg('Clique Salvar para atualizar a sessão.');break}
    case 'save':{await api(route+'/scenarios','POST',{scenarios:scenes,assets:assets,activeScenarioId:active});msg('Cenários salvos no servidor.');break}
    case 'token-delete':{scene().tokens=scene().tokens.filter(x=>x.id!==selectedToken);selectedToken='';render();break}
    case 'close':host.hidden=true;break;
   }
  }catch(err){msg('Falha: '+err.message)}
 });
 return load();
}
root.RPG29_EDITOR={open};
})(typeof window!=='undefined'?window:globalThis);
