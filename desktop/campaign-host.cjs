'use strict';
/** Mastermind's original Android campaign server, launched as a local JVM process.
 * No separate Termux service, no disabled dashboard and no external APIs.
 */
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const http=require('node:http');
const net=require('node:net');
const {EventEmitter}=require('node:events');

class CampaignHost extends EventEmitter{
 constructor({userData,assets,jar,port=8765,java='java'}){
  super();
  this.userData=userData;this.assets=assets;this.jar=jar;this.port=port;this.java=java;
  this.directory=path.join(userData,'campaign-server');
  this.process=null;this.running=false;this.starting=false;this.ip='127.0.0.1';
  this.error='';this.pending=null;
 }
 database(){
  try{return JSON.parse(fs.readFileSync(path.join(this.directory,'campanhas-android.json'),'utf8'));}
  catch{return {campaigns:[],secret:''};}
 }
 status(){
  const db=this.database();
  return {
   running:this.running,starting:this.starting,ip:this.ip,port:this.port,
   error:this.error,
   campaigns:(Array.isArray(db.campaigns)?db.campaigns:[]).map(c=>({id:c.id,name:c.name})),
   masterUrl:'http://'+this.ip+':'+this.port+'/master'
  };
 }
 masterKey(){return this.database().secret||'';}
 async start(){
  if(this.running)return this.status();
  if(this.pending)return this.pending;
  if(!fs.existsSync(this.jar))throw Error('Servidor da campanha não incluído na instalação Linux');
  if(!fs.existsSync(this.assets))throw Error('Arquivos de campanha não encontrados');
  fs.mkdirSync(this.directory,{recursive:true,mode:0o700});
  this.starting=true;this.error='';this.emit('change',this.status());
  this.pending=new Promise((resolve,reject)=>{
   let ended=false;
   const proc=spawn(this.java,[
    '-Djava.awt.headless=true','-jar',this.jar,this.directory,this.assets,String(this.port)
   ],{stdio:['ignore','pipe','pipe'],env:{...process.env,JAVA_TOOL_OPTIONS:'-Dfile.encoding=UTF-8'}});
   this.process=proc;
   let line='',stderr='';
   const timer=setTimeout(()=>{
    if(ended)return;
    ended=true;this.error='Tempo esgotado ao iniciar o servidor';this.running=false;this.starting=false;
    proc.kill();reject(Error(this.error));this.emit('change',this.status());
   },12000);
   const parse=text=>{
    line+=text;
    if(line.length>10000)line=line.slice(-10000);
    const ready=line.match(/MASTERMIND_SERVER_READY\s+((?:\d{1,3}\.){3}\d{1,3})\s+(\d{1,5})/);
    if(!ready||ended)return;
    ended=true;clearTimeout(timer);
    this.ip=ready[1];this.port=Number(ready[2]);
    this.running=true;this.starting=false;this.error='';
    resolve(this.status());this.emit('change',this.status());
   };
   proc.stdout.on('data',chunk=>parse(chunk.toString()));
   proc.stderr.on('data',chunk=>{stderr+=chunk.toString();stderr=stderr.slice(-1200);});
   proc.on('error',err=>{
    this.error=err.code==='ENOENT'?'Java 17 não encontrado. Instale jre17-openjdk-headless.':err.message;
    this.running=false;this.starting=false;
    if(!ended){ended=true;clearTimeout(timer);reject(Error(this.error));}
    this.emit('change',this.status());
   });
   proc.on('exit',code=>{
    if(!ended){ended=true;clearTimeout(timer);this.error=stderr||('Servidor encerrou (código '+code+')');reject(Error(this.error));}
    this.process=null;this.running=false;this.starting=false;this.pending=null;
    this.emit('change',this.status());
   });
  });
  try{return await this.pending;}finally{this.pending=null;}
 }
 stop(){
  if(this.process)this.process.kill('SIGTERM');
  this.process=null;this.running=false;this.starting=false;this.emit('change',this.status());
  return this.status();
 }
 async request({base,secret,method='GET',route,body}){
  if(typeof base!=='string'||typeof secret!=='string'||secret.length>250||typeof route!=='string')throw Error('Parâmetros inválidos');
  let url;
  try{url=new URL(base);}catch{throw Error('Endereço do servidor inválido');}
  const address=url.hostname;
  if(url.protocol!=='http:'||net.isIP(address)!==4||!/^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.)/.test(address))
   throw Error('Somente endereços IPv4 privados ou localhost são permitidos');
  if(!Number.isInteger(Number(url.port))||Number(url.port)<1024||Number(url.port)>65535)throw Error('Porta inválida');
  if(!route.startsWith('/api/admin/campaigns')||route.length>350||!/^\/[a-zA-Z0-9/_-]+$/.test(route))
   throw Error('Rota de administração inválida');
  if(!['GET','POST','PUT','PATCH','DELETE'].includes(method))throw Error('Método não permitido');
  const payload=body===undefined||body===null?'':typeof body==='string'?body:JSON.stringify(body);
  if(Buffer.byteLength(payload,'utf8')>5_300_000)throw Error('Dados da campanha muito grandes');
  return new Promise((resolve,reject)=>{
   const request=http.request({
    hostname:address,port:Number(url.port),path:route,method,
    headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',...(payload?{'Content-Length':Buffer.byteLength(payload,'utf8')}: {})},
    timeout:12000
   },res=>{
    let data='';res.setEncoding('utf8');
    res.on('data',chunk=>{
     data+=chunk;
     if(data.length>6_000_000){request.destroy(Error('Resposta acima do limite'));}
    });
    res.on('end',()=>resolve({status:res.statusCode||0,body:data}));
   });
   request.on('timeout',()=>request.destroy(Error('Servidor da campanha não respondeu')));
   request.on('error',reject);
   if(payload)request.write(payload);
   request.end();
  });
 }
}
module.exports={CampaignHost};
