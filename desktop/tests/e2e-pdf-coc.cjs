'use strict';
/* Verifies the actual installed Electron app can parse/search a local PDF AND
 * render/store Call of Cthulhu investigators with the original core features. */
const { _electron: electron }=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
function samplePdf(){
 const c='BT /F1 14 Tf 40 700 Td (Investigacao Biblioteca Documentos Descanso Pesquisa) Tj ET';
 const o=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Count 1 /Kids [3 0 R] >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>','<< /Length '+Buffer.byteLength(c)+' >>\nstream\n'+c+'\nendstream','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let s='%PDF-1.4\n',offset=[0];for(let i=0;i<o.length;i++){offset.push(Buffer.byteLength(s));s+=(i+1)+' 0 obj\n'+o[i]+'\nendobj\n';}
 const start=Buffer.byteLength(s);s+='xref\n0 6\n0000000000 65535 f \n';for(let i=1;i<offset.length;i++)s+=String(offset[i]).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(s+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
}
(async()=>{
 const binary=path.resolve(process.argv[2]||(process.platform==='win32'?'dist/win-unpacked/Mastermind.exe':'dist/linux-unpacked/mastermind'));
 assert.ok(fs.existsSync(binary),'Mastermind binário ausente: '+binary);
 let app;
 try{
  app=await electron.launch({executablePath:binary,args:process.platform==='linux'?['--no-sandbox','--disable-dev-shm-usage']:['--disable-gpu'],env:{...process.env,MASTERMIND_E2E:'1'},timeout:65000});
  const win=await app.firstWindow({timeout:35000});
  await win.locator('#screen-library').waitFor({state:'attached',timeout:40000});
  const userData=await app.evaluate(({app})=>app.getPath('userData'));
  const dir=path.join(userData,'mastermind-books');fs.mkdirSync(dir,{recursive:true});
  const id='book-e2e1234',file=path.join(dir,id+'.pdf');
  fs.writeFileSync(file,samplePdf());
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify([{id,name:'Manual de teste privado.pdf',systemId:'chamado-de-ctchulhu',size:fs.statSync(file).size,storage:'desktop'}]));
  const matches=await win.evaluate(()=>window.MastermindDesktop.action('search-book','book-e2e1234','investigacao biblioteca',10,0));
  assert.equal(matches.total,1,'PDF indexado no binário? '+JSON.stringify(matches));
  assert.equal(matches.results[0].page,1,'Página real incorreta');
  const all=await win.evaluate(()=>window.MastermindDesktop.action('search-library','descanso','chamado-de-ctchulhu',20));
  assert.equal(all.total,1,'Pesquisa cruzada por sistema falhou: '+JSON.stringify(all));
  await win.evaluate(()=>{window.RPG_DEMO.navigate('library');window.RPG15.openSystem('chamado-de-ctchulhu');});
  await win.locator('.coc-shell').waitFor({state:'visible',timeout:15000});
  const char=await win.evaluate(()=>window.MastermindCoc7.current);
  assert.equal(char.systemId,'chamado-de-ctchulhu');
  assert.equal(char.resources.HP.max,11);
  await win.locator('[data-coc-roll-attr="POW"]').click();
  const output=await win.locator('.coc-rollbox').textContent();
  assert.match(output,/POW:/,'Rolagem percentual não funcionou');
  await win.locator('[data-coc-tab="skills"]').click();
  assert.ok(await win.locator('[data-coc-roll-skill="Encontrar"]').count());
  const campaign=await win.evaluate(()=>window.MastermindCoc7.toCampaignSheet(window.MastermindCoc7.current));
  assert.equal(campaign.resources.PV.max,campaign.resources.HP.max,'PV não convertido para servidor');
  assert.equal(campaign.resources.PE.max,campaign.resources.MP.max,'PE não convertido para servidor');
  console.log('PASS: PDF extraído em pacote instalado com página correta, pesquisa por sistema e ficha CoC funcional.');
 }finally{if(app)await app.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
