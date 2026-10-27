'use strict';
/* Local, user-selected PDFs only. No document content leaves this computer. */
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');

const MAX_BOOK_BYTES=220*1024*1024;
const MAX_PAGES=1800;
const MAX_BOOKS=100;
const SYSTEM=/^[a-z][a-z0-9-]{1,65}$/;
const ID=/^[0-9a-f]{16,32}$/;
function normalize(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
}
function terms(s){
  const ignore=new Set(['qual','quais','como','para','com','uma','uns','nas','dos','das','que','qual','quando','onde','porque','pelo','pela','sobre','entre']);
  return [...new Set(normalize(s).match(/[a-z0-9]{3,}/g)||[])]
    .filter(x=>!ignore.has(x)).slice(0,12);
}
function truncate(s,limit=200){return String(s||'').slice(0,limit);}
function safeMessage(e){return truncate(e?.message||e,180);}
class BookCatalog {
  constructor(userData,notify){
    this.directory=path.join(userData,'pdf-books');
    fs.mkdirSync(this.directory,{recursive:true,mode:0o700});
    this.indexFile=path.join(this.directory,'catalog.json');
    this.notify=notify||(()=>{});
    this.books=[];
    this.processing=new Set();
    this.pdfLibPromise=null;
    try{
      const list=JSON.parse(fs.readFileSync(this.indexFile,'utf8'));
      this.books=Array.isArray(list)?list.filter(b=>ID.test(b?.id||'')&&SYSTEM.test(b?.systemId||'')):[];
    }catch(_){}
    this.books=this.books.slice(0,MAX_BOOKS);
    // Abandoned indexing after an unclean shutdown resumes when the user requests it.
    for(const b of this.books)if(b.state==='indexing')b.state='partial';
  }
  persist(){
    const metadata=this.books.map(({id,name,systemId,state,pages,progress,message,readable})=>
      ({id,name,systemId,state,pages,progress,message,readable}));
    fs.writeFileSync(this.indexFile,JSON.stringify(metadata),{encoding:'utf8',mode:0o600});
  }
  lookup(id){return ID.test(String(id))?this.books.find(b=>b.id===id):null}
  fileFor(id){return path.join(this.directory,id+'.pdf')}
  pagesFor(id){return path.join(this.directory,id+'.pages.json')}
  list(){
    return this.books.map(b=>({id:b.id,name:b.name,systemId:b.systemId,
      pages:b.pages||0,progress:b.progress||0,state:b.state||'pending'}));
  }
  status(id){
    const b=this.lookup(id);
    if(!b)return {state:'missing',pages:0,progress:0,message:'Selecione um livro PDF na biblioteca.'};
    return {state:b.state||'pending',pages:b.pages||0,progress:b.progress||0,
      message:b.message||'',title:b.name||'Livro',readable:b.readable||0};
  }
  firstOrder(){return this.books.find(b=>b.systemId==='ordem-paranormal')||null}
  getSavedPdf(){
    const b=this.firstOrder();return b?{available:true,name:b.name,storage:'linux'}:{available:false};
  }
  async importFiles(files,systemId){
    if(!SYSTEM.test(systemId))throw new Error('Sistema de RPG inválido');
    if(!Array.isArray(files)||files.length>30)throw new Error('Selecione até 30 PDFs por vez');
    let imported=0;
    for(const source of files){
      if(this.books.length>=MAX_BOOKS)break;
      try{
        const stat=await fsp.stat(source);
        if(!stat.isFile()||stat.size<8||stat.size>MAX_BOOK_BYTES)continue;
        const fh=await fsp.open(source,'r');
        const header=Buffer.alloc(5);
        await fh.read(header,0,5,0);
        await fh.close();
        if(!header.toString('ascii').startsWith('%PDF-'))continue;
        const id=crypto.randomBytes(12).toString('hex');
        const title=truncate(path.basename(source).replace(/\.pdf$/i,''),110)||'Livro pessoal';
        await fsp.copyFile(source,this.fileFor(id));
        const b={id,name:title,systemId,state:'pending',pages:0,progress:0,message:'Preparando índice local',readable:0};
        this.books.unshift(b);
        this.persist();
        imported++;
        this.notify('book-added',{id,name:b.name,systemId});
        // Do not block renderer on large PDFs.
        this.index(id).catch(()=>{});
      }catch(e){this.notify('book-error',{message:safeMessage(e)});}
    }
    return {imported};
  }
  async pdf(){
    if(!this.pdfLibPromise)this.pdfLibPromise=import('pdfjs-dist/legacy/build/pdf.mjs');
    return this.pdfLibPromise;
  }
  async index(id){
    const b=this.lookup(id);
    if(!b||this.processing.has(id))return;
    this.processing.add(id);
    b.state='indexing';b.message='Extraindo texto do PDF';this.persist();
    let document=null;
    try{
      const stats=await fsp.stat(this.fileFor(id));
      if(stats.size>MAX_BOOK_BYTES)throw new Error('PDF excede o limite de 220 MB');
      const lib=await this.pdf();
      const content=await fsp.readFile(this.fileFor(id));
      const loader=lib.getDocument({
        data:new Uint8Array(content),disableFontFace:true,
        isEvalSupported:false,useSystemFonts:false,stopAtErrors:false
      });
      document=await loader.promise;
      b.pages=document.numPages;
      if(b.pages>MAX_PAGES)throw new Error('PDF muito longo: limite de 1.800 páginas por livro');
      let pages=[];
      try{const old=JSON.parse(await fsp.readFile(this.pagesFor(id),'utf8'));
        if(Array.isArray(old)&&old.every(s=>typeof s==='string'))pages=old.slice(0,b.progress||0);
      }catch(_){}
      b.progress=pages.length;
      for(let pageNumber=pages.length+1;pageNumber<=b.pages;pageNumber++){
        const page=await document.getPage(pageNumber);
        const text=await page.getTextContent({disableCombineTextItems:false});
        const string=text.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ').slice(0,60000);
        pages.push(string);
        if(string.trim())b.readable=(b.readable||0)+1;
        b.progress=pageNumber;
        page.cleanup();
        if(pageNumber%15===0||pageNumber===b.pages){
          await fsp.writeFile(this.pagesFor(id),JSON.stringify(pages),{mode:0o600});
          this.persist();
          this.notify('book-progress',{id,page:pageNumber,total:b.pages});
          await new Promise(resolve=>setImmediate(resolve));
        }
      }
      b.state=b.readable?'ready':'no_text';
      b.message=b.readable?'Índice local pronto':'PDF sem texto selecionável. OCR necessário.';
    }catch(error){
      b.state=b.progress>0?'partial':'error';
      b.message=safeMessage(error);
      this.notify('book-error',{id,message:b.message});
    }finally{
      try{if(document)await document.destroy()}catch(_){}
      this.processing.delete(id);
      this.persist();
      this.notify('book-progress',{id,state:b.state,done:true});
    }
  }
  search(id,query,max=20,offset=0){
    const b=this.lookup(id);
    const status=this.status(id);
    const result={state:status.state,status,hits:[],total:0,offset:Math.max(0,offset|0),
      book:b?.name||'',indexedPages:status.progress,totalPages:status.pages,complete:status.state==='ready'};
    if(!b||!['ready','indexing','partial'].includes(b.state))return result;
    const needles=terms(query);
    if(!needles.length)return result;
    let pages=[];
    try{pages=JSON.parse(fs.readFileSync(this.pagesFor(id),'utf8'))}catch(_){return result}
    const ranked=[];
    for(let i=0;i<pages.length;i++){
      const plain=String(pages[i]||'');
      const folded=normalize(plain);
      let score=0,at=-1;
      for(const token of needles){
        const pos=folded.indexOf(token);
        if(pos>=0){score+=Math.min(3,1+folded.split(token).length-2);if(at<0||pos<at)at=pos;}
      }
      if(score){
        const from=Math.max(0,at-48);
        const excerpt=(from?'…':'')+plain.slice(from,from+190)+(from+190<plain.length?'…':'');
        ranked.push({page:i+1,title:'Página '+(i+1)+' do PDF',excerpt,score});
      }
    }
    ranked.sort((a,b)=>b.score-a.score||a.page-b.page);
    result.total=ranked.length;
    result.hits=ranked.slice(result.offset,result.offset+Math.min(30,Math.max(1,max|0)))
      .map(({page,title,excerpt})=>({page,title,excerpt}));
    return result;
  }
}
module.exports={BookCatalog,normalize,terms,MAX_BOOK_BYTES,MAX_BOOKS};
