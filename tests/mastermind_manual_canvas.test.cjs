'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app/src/main/assets/demo-offline.html'),'utf8');
const workspace=fs.readFileSync(path.join(root,'app/src/main/assets/mastermind42_workspace.js'),'utf8');

test('Canvas does not create the previous dotted connections between arbitrary notes',()=>{
 const a=html.indexOf('function renderLines(){');
 const b=html.indexOf('function renderCanvas(){',a);
 assert.ok(a>=0&&b>a,'Legacy canvas renderer found');
 const renderer=html.slice(a,b);
 assert.match(renderer,/replaceChildren\(\)/,'Legacy SVG is explicitly cleaned');
 assert.doesNotMatch(renderer,/S\.nodes|edges=|<path|pathData/,'Legacy renderer must not connect nodes automatically');
 assert.doesNotMatch(html,/\[\[a,b\],\[c,b\],\[b,d\]\]/,'Three hardcoded demo edges must be removed');
});
test('Manual links are made exclusively after the master enables linking and chooses two items',()=>{
 assert.match(workspace,/let busyMedia=false,linkMode=false,linkStart=null/);
 assert.match(workspace,/function pickTarget\(ref\)/);
 assert.match(workspace,/if\(!linkMode\)return;/);
 assert.match(workspace,/active\.links\.push\(\{id:uuid\(\),a:linkStart,b:ref,color:selectedColor\}\)/);
 assert.match(workspace,/Conectar itens/);
 assert.match(workspace,/function renderLines\(\)[\s\S]*?for\(const edge of active\?\.links\|\|\[\]\)/);
});
test('Existing manually drawn campaign connections remain stored and can be deleted',()=>{
 assert.match(workspace,/links:clone\(active\?\.links\|\|\[\]\)/);
 assert.match(workspace,/links:Array\.isArray\(b\.links\)/);
 assert.match(workspace,/function deleteEdge\(id\)/);
 assert.match(workspace,/active\.links=previous\.filter\(l=>l\.id!==id\)/);
 assert.match(workspace,/const paths=active\.links\.map\(/,'Campaign preview uses manual links only');
});
