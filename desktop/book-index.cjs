'use strict';
/* Offline, per-page PDF search for books chosen by the owner.
 * Index is local under app.getPath('userData'); never network/transmitted.
 * PDF.js handles PDFs also on Windows, without system Poppler.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const vocabulary=require('../app/src/main/assets/mastermind_search_vocabulary.js');
const MAX_PDF=250*1024*1024,MAX_PAGES=3500,MAX_PAGE_TEXT=150000;
const inflight=new Map();
const stop=new Set(['a','o','as','os','ao','aos','de','do','da','dos','das','e','em','no','na','nos','nas','um','uma','como','qual','quais','quando','para','por','que','se','tem','com','the','and','what','how','are','for','does','funciona','regras','regra']);
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function words(q){return [...new Set(normalize(q).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(x=>x.length>2&&!stop.has(x)))].slice(0,14);}
function fingerprint(st){return st.size+':'+Math.round(st.mtimeMs);}
function cleanText(s){return String(s||'').replace(/\u0000/g,' ').replace(/[ \t]+/g,' ').replace(/\s*\n\s*/g,' ').trim();}
function indexFile(root,id){if(!/^book-[a-z0-9]+$/.test(id))throw Error('ID de livro inválido');return path.join(root,id+'.index.json');}
async function readExisting(root,id,stat){try{const o=JSON.parse(await fs.promises.readFile(indexFile(root,id),'utf8'));if(o.version===2&&o.fingerprint===fingerprint(stat)&&Array.isArray(o.pages))return o;}catch{}return null;}
function rank(page,query){
 const original=words(query);if(!original.length)return null;
 const text=String(page.text||''),normalized=normalize(text),q=normalize(query);
 let terms=original,hits=0,first=Number.MAX_SAFE_INTEGER,expanded=false;
 function calculate(list){
  let matched=0,earliest=Number.MAX_SAFE_INTEGER;
  for(const word of list){const index=normalized.indexOf(word);if(index>=0){matched++;earliest=Math.min(earliest,index);}}
  return {matched,earliest};
 }
 ({matched:hits,earliest:first}=calculate(terms));
 if(!hits){
  // Only fall back to related terms when nothing literal was indexed.
  terms=vocabulary.variants(query,'all',30).filter(x=>!original.includes(x));
  ({matched:hits,earliest:first}=calculate(terms));
  expanded=true;
 }
 if(!hits)return null;
 const phrase=!expanded&&q.length>4&&normalized.includes(q);
 const score=hits*(expanded?1.5:4)+(phrase?15:0)+(!expanded&&hits===terms.length?5:0);
 const approx=Math.round(first*(text.length/Math.max(normalized.length,1)));
 const begin=Math.max(0,approx-80);
 const result=vocabulary.safeExcerpt(text.slice(begin,begin+340));
 const excerpt=(begin?'…':'')+result.text+(begin+340<text.length?'…':'');
 return {page:page.page,pageNumber:page.page,printedPage:page.page,score,excerpt,text:excerpt,expanded,encodingWarning:result.corrupted?'Este PDF contém caracteres de fonte não reconhecidos; confira a página original.':''};
}
function searchIndex(index,query,limit=12,offset=0){const all=[];for(const page of index.pages){const hit=rank(page,query);if(hit)all.push(hit);}all.sort((a,b)=>b.score-a.score||a.page-b.page);const safeLimit=Math.max(1,Math.min(50,Number(limit)||12)),start=Math.max(0,Number(offset)||0);return {results:all.slice(start,start+safeLimit),total:all.length,scannedPages:index.pages.length,pages:index.totalPages,hasText:index.pages.some(p=>p.text.length>0)};}
async function extractPdf(root,id,file,onProgress=()=>{}){
 const st=await fs.promises.stat(file);if(st.size<20||st.size>MAX_PDF)throw Error('PDF fora do limite de 250 MB');
 const old=await readExisting(root,id,st);if(old)return old;
 const data=new Uint8Array(await fs.promises.readFile(file));if(Buffer.from(data.subarray(0,5)).toString()!=='%PDF-')throw Error('Arquivo não é um PDF válido');
 const loading=pdfjs.getDocument({data,disableFontFace:true,useSystemFonts:false,isEvalSupported:false});
 let doc;
 try{
  doc=await loading.promise;
  if(doc.numPages>MAX_PAGES)throw Error('PDF muito extenso para indexação automática; limite de 3500 páginas');
  const pages=[];
  for(let p=1;p<=doc.numPages;p++){
   const page=await doc.getPage(p);
   const content=await page.getTextContent({disableCombineTextItems:false});
   const text=cleanText(content.items.map(x=>x.str||'').join(' ')).slice(0,MAX_PAGE_TEXT);
   pages.push({page:p,text});
   if(p===1||p%20===0||p===doc.numPages)onProgress({state:'indexing',done:p,total:doc.numPages});
   page.cleanup();
  }
  const index={version:2,id,fingerprint:fingerprint(st),totalPages:doc.numPages,pages,createdAt:Date.now()};
  const fileIndex=indexFile(root,id),tmp=fileIndex+'.tmp-'+process.pid;
  await fs.promises.writeFile(tmp,JSON.stringify(index),'utf8');
  await fs.promises.rename(tmp,fileIndex);
  onProgress({state:'ready',done:doc.numPages,total:doc.numPages});
  return index;
 }finally{if(doc)await doc.destroy();else await loading.destroy().catch(()=>{});}
}
async function getIndex(root,id,file,onProgress){
 const key=path.join(root,id);
 if(inflight.has(key))return inflight.get(key);
 const task=extractPdf(root,id,file,onProgress).finally(()=>inflight.delete(key));
 inflight.set(key,task);
 return task;
}
async function deleteIndex(root,id){await fs.promises.rm(indexFile(root,id),{force:true});}
async function info(root,id,file){try{const st=await fs.promises.stat(file),index=await readExisting(root,id,st);return index?{state:index.pages.some(p=>p.text)?'ready':'no_text',pages:index.totalPages,progress:index.pages.length}:{state:'pending',pages:0,progress:0};}catch{return {state:'missing',pages:0,progress:0};}}
module.exports={getIndex,searchIndex,deleteIndex,info,normalize,words,rank};
