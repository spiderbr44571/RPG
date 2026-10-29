'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const E=require('../../app/src/main/assets/mastermind_coc7_engine.js');
const PDF=require('../book-index.cjs');
const root=path.join(__dirname,'..','..');
function fixture(){
 const stream1='BT /F1 14 Tf 40 700 Td (Investigacao e pesquisa biblioteca manuscritos) Tj ET';
 const stream2='BT /F1 14 Tf 40 700 Td (Descanso de personagens regras da sanidade e sorte) Tj ET';
 const objs=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Count 2 /Kids [3 0 R 5 0 R] >>',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
 '<< /Length '+Buffer.byteLength(stream1)+' >>\nstream\n'+stream1+'\nendstream',
 '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
 '<< /Length '+Buffer.byteLength(stream2)+' >>\nstream\n'+stream2+'\nendstream',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
 ];
 let out='%PDF-1.4\n',offsets=[0];
 objs.forEach((v,i)=>{offsets.push(Buffer.byteLength(out));out+=(i+1)+' 0 obj\n'+v+'\nendobj\n';});
 const xref=Buffer.byteLength(out);
 out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 out+='trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 return Buffer.from(out);
}
test('CoC investigator has eight correct percentile characteristics and safe private storage',()=>{
 const c=E.newCharacter('Investigadora');
 assert.equal(c.systemId,'chamado-de-ctchulhu');
 assert.equal(E.ATTRS.length,8);
 assert.equal(c.attributes.POW,50);
 assert.deepEqual(E.thresholds(60),{regular:60,hard:30,extreme:12});
 assert.equal(E.derived(c).HP,11);
 assert.equal(E.derived(c).MP,10);
 assert.equal(E.derived(c).SAN,50);
 assert.equal(E.derived(c).MAX_SAN,99);
 const restored=E.validate(JSON.parse(JSON.stringify(c)));
 assert.equal(restored.systemId,c.systemId);
 assert.ok(restored.resources.HP.current>0);
 assert.throws(()=>E.validate({systemId:'gurps'}));
});
test('CoC d100 skill roll accepts hard, extreme and critical and tracks improvement',()=>{
 const c=E.newCharacter();c.skills['Encontrar']=60;c.skillChecks=['Encontrar'];
 assert.equal(E.roll(60,()=>0).outcome,'critical');
 const r=E.roll(60,()=>.17);
 assert.ok(r.rolled>=1&&r.rolled<=100);
 assert.ok(['regular','hard','extreme','critical','fail','fumble'].includes(r.outcome));
 const a=E.advancement(c,()=>.99);
 assert.equal(a.character.skillChecks.length,0);
 assert.ok(a.character.skills['Encontrar']>=60);
});
test('PDF.js indexes personal PDF offline with exact page numbers and persistent cache',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mastermind-pdf-test-')),file=path.join(dir,'book-test.pdf');
 try{
  fs.writeFileSync(file,fixture());
  const idx=await PDF.getIndex(dir,'book-test',file);
  assert.equal(idx.totalPages,2);
  let found=PDF.searchIndex(idx,'como funciona pesquisa na biblioteca');
  assert.ok(found.results.length>=1,JSON.stringify(found));
  assert.equal(found.results[0].page,1);
  found=PDF.searchIndex(idx,'descanso sanidade');
  assert.equal(found.results[0].page,2);
  const next=await PDF.getIndex(dir,'book-test',file);
  assert.equal(next.fingerprint,idx.fingerprint);
  assert.equal((await PDF.info(dir,'book-test',file)).state,'ready');
  assert.equal(PDF.searchIndex(idx,'pergunta nao existente').results.length,0);
  await PDF.deleteIndex(dir,'book-test');
  assert.ok(!fs.existsSync(path.join(dir,'book-test.index.json')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('PDF search sanitizes words and result snippets without invented rules',()=>{
 assert.deepEqual(PDF.words('Como funciona o DESCANSO em Chamado de Cthulhu?'),['descanso','chamado','cthulhu']);
 assert.equal(PDF.rank({page:4,text:'Sanidade e magia'},'sanidade').page,4);
 assert.equal(PDF.rank({page:4,text:'Sanidade e magia'},'pesquisa'),null);
});
test('Shared UI contains the CoC module, book source list and campaign options',()=>{
 const html=fs.readFileSync(path.join(root,'app/src/main/assets/demo-offline.html'),'utf8');
 const catalog=fs.readFileSync(path.join(root,'app/src/main/assets/rpg15_catalog.js'),'utf8');
 const campaign=fs.readFileSync(path.join(root,'app/src/main/assets/rpg11_campaigns.js'),'utf8');
 const cocUi=fs.readFileSync(path.join(root,'app/src/main/assets/mastermind_coc7_ui.js'),'utf8');
 assert.match(html,/mastermind_coc7_engine\.js/);
 assert.match(html,/mastermind_coc7_ui\.js/);
 assert.match(html,/mastermind_coc7\.css/);
 assert.match(catalog,/MastermindCoc7\.mount/);
 assert.match(campaign,/data-r11="import-coc"/);
 assert.match(campaign,/toCampaignSheet\(coc\)/);
 assert.match(campaign,/MastermindCoc7\.editRemote/);
 assert.match(cocUi,/localStorage\.setItem\(KEY/);
 assert.match(cocUi,/PV:\{\.\.\.v\.resources\.HP\}/);
});
