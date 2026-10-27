'use strict';
/* Bind ONLY to loopback, with a stable port to preserve Chromium IndexedDB/localStorage.
 * No remote user can connect to this desktop asset server over the LAN.
 */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {pipeline}=require('node:stream');
const PORT=18590;
const EXT={
 '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
 '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
 '.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
 '.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
 '.gif':'image/gif','.txt':'text/plain; charset=utf-8','.woff':'font/woff',
 '.woff2':'font/woff2','.pdf':'application/pdf'
};
function safePath(root,raw){
  try{
    if(typeof raw!=='string'||raw.length>300||raw.includes('\0')||raw.includes('\\'))return null;
    const decoded=decodeURIComponent(raw);
    if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').includes('..'))return null;
    const full=path.resolve(root,'.'+decoded);
    if(full===root||full.startsWith(root+path.sep))return full;
  }catch(_){}
  return null;
}
function resolveAsset(webDir,urlPath,books){
  const pdf=urlPath.match(/^\/privatepdf\/([a-f0-9]{16,32})\.pdf$/);
  if(pdf)return books?.lookup(pdf[1])?books.fileFor(pdf[1]):null;
  const suffix=path.extname(urlPath).toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(EXT,suffix))return null;
  return safePath(webDir,urlPath);
}
async function createAssetServer(webDir,books){
  const root=path.resolve(webDir);
  const server=http.createServer((req,res)=>{
    const host=req.headers.host||'';
    if(host!=='127.0.0.1:'+PORT||!['GET','HEAD'].includes(req.method)){
      res.writeHead(403,{'Content-Type':'text/plain'});res.end('Forbidden');return;
    }
    const name=new URL(req.url,'http://127.0.0.1:'+PORT).pathname;
    const file=resolveAsset(root,name,books);
    if(!file){res.writeHead(404);res.end();return}
    fs.stat(file,(error,st)=>{
      if(error||!st.isFile()){res.writeHead(404);res.end();return}
      const ext=path.extname(file).toLowerCase(),type=EXT[ext];
      let begin=0,end=st.size-1,status=200;
      if(ext==='.pdf'&&typeof req.headers.range==='string'){
        const m=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
        if(!m){res.writeHead(416,{'Content-Range':'bytes */'+st.size});res.end();return}
        begin=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));
        if(begin>end||begin>=st.size){res.writeHead(416);res.end();return}
        status=206;
      }
      const headers={
        'Content-Type':type||'application/octet-stream',
        'Content-Length':String(end-begin+1),
        'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff',
        'Cross-Origin-Resource-Policy':'same-origin',
        'Referrer-Policy':'no-referrer',
        'Cache-Control':'no-store'
      };
      if(status===206)headers['Content-Range']='bytes '+begin+'-'+end+'/'+st.size;
      res.writeHead(status,headers);
      if(req.method==='HEAD'){res.end();return}
      const stream=fs.createReadStream(file,{start:begin,end});
      stream.on('error',()=>{try{res.destroy()}catch(_){}});
      stream.pipe(res);
    });
  });
  server.on('clientError',(_,socket)=>socket.destroy());
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(PORT,'127.0.0.1',()=>{
      server.removeListener('error',reject);
      resolve();
    });
  });
  return server;
}
module.exports={PORT,EXT,safePath,resolveAsset,createAssetServer};
