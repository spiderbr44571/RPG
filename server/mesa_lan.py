#!/usr/bin/env python3
"""Mesa local de RPG. Python 3.10+, sem dependências. NÃO EXPOR À INTERNET."""
from __future__ import annotations
import argparse
import copy
import html
import hmac
import json
import os
import secrets
import socket
import sys
import threading
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
from datetime import datetime, timezone

MAX_BODY=8_000_000
SAVE_LOCK=threading.RLock()

def private_ipv4():
    try:
        s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
        s.connect(('10.255.255.255',1));addr=s.getsockname()[0];s.close();return addr
    except OSError:
        return '127.0.0.1'

def default_limits(c):
    # The offline Ordem 1.3 sheet stores current resources as numbers.
    # These basic maxima exclude class-trail, origin and house-rule modifiers.
    progression=[5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,99]
    nex=float(c.get('nex',5)) if isinstance(c.get('nex',5),(int,float)) else 5
    levels=max(1,sum(n<=nex for n in progression))
    attrs=c.get('attrs') if isinstance(c.get('attrs'),dict) else {}
    vigor=int(attrs.get('Vigor',1));presenca=int(attrs.get('Presença',1))
    cls=c.get('class','Combatente')
    base={'Combatente':(20,4,2,2,12,3),'Especialista':(16,3,3,3,16,4),'Ocultista':(12,2,4,4,20,5)}
    hp0,hpl,ep0,epl,san0,sanl=base.get(cls,base['Combatente'])
    return {'PV':hp0+vigor+(levels-1)*(hpl+vigor),
            'PE':ep0+presenca+(levels-1)*(epl+presenca),
            'SAN':san0+(levels-1)*sanl}

def validate_sheet(c):
    if not isinstance(c,dict):raise ValueError('A ficha precisa ser um objeto JSON')
    if len(json.dumps(c,ensure_ascii=False))>350_000:raise ValueError('Ficha muito grande')
    if not isinstance(c.get('resources'),dict):c['resources']={}
    defaults=default_limits(c)
    for k,v in list(c['resources'].items()):
        if isinstance(v,(int,float)) and not isinstance(v,bool):
            mx=max(0,defaults.get(k,v));c['resources'][k]={'current':min(max(0,v),mx),'max':mx};v=c['resources'][k]
        if not isinstance(v,dict):raise ValueError('Recursos devem ter current e max')
        mx=v.get('max',0);cur=v.get('current',0)
        if isinstance(mx,bool) or not isinstance(mx,(int,float)) or mx<0 or mx>999999:raise ValueError('Máximo inválido')
        if isinstance(cur,bool) or not isinstance(cur,(int,float)) or cur<0 or cur>mx:raise ValueError('Recurso atual inválido')
    return c

def clean_public(sheet):
    allowed=('name','class','nex','attrs','skills','resources','photo','sheetTheme','rituaisConhecidos','origem','trilha','systemId')
    return {k:sheet[k] for k in allowed if k in sheet}

class State:
    def __init__(self,path,port,ip):
        self.path=path;self.port=port;self.ip=ip;self.members=[];self.next_port=port+1
        if path.exists():
            raw=json.loads(path.read_text('utf8'))
            self.admin_secret=raw.get('admin_secret') or secrets.token_urlsafe(32)
            self.next_port=int(raw.get('next_port',port+1))
            self.members=raw.get('members',[])
        else:self.admin_secret=secrets.token_urlsafe(32)
        self.save()
    def save(self):
        with SAVE_LOCK:
            body={'version':1,'admin_secret':self.admin_secret,'next_port':self.next_port,'members':self.members}
            self.path.parent.mkdir(parents=True,exist_ok=True)
            tmp=self.path.with_suffix('.tmp')
            tmp.write_text(json.dumps(body,ensure_ascii=False,indent=2),encoding='utf8')
            os.chmod(tmp,0o600)
            tmp.replace(self.path)
    def add(self,name,sheet):
        with SAVE_LOCK:
            new={'id':secrets.token_hex(8),'name':str(name)[:80], 'port':self.next_port,
                 'token':secrets.token_urlsafe(32),'sheet':validate_sheet(copy.deepcopy(sheet))}
            self.members.append(new);self.next_port+=1;self.save()
            return new
    def find(self,port):
        with SAVE_LOCK:return next((x for x in self.members if x['port']==port),None)
    def by_id(self,id):
        with SAVE_LOCK:return next((x for x in self.members if x['id']==id),None)
    def public_member(self,member):
        return {'id':member['id'],'name':member['name'],'port':member['port'],
                'url':f"http://{self.ip}:{member['port']}/join/{member['token']}",
                'sheet':member['sheet']}

CSS="""*{box-sizing:border-box}body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#101018;color:#efe4d5;padding:22px}main{max-width:1050px;margin:auto}h1,h2{font-family:Georgia,serif;color:#d5b78c}input,textarea,button{font:inherit;border-radius:8px;padding:11px;background:#1c1e28;color:#f5e9df;border:1px solid #514437}textarea{width:100%;min-height:150px;font:12px/1.5 monospace}button{cursor:pointer}button.primary{background:#b89462;color:#130e0a;font-weight:700}input{max-width:100%;min-width:0}section{background:#191c25;border:1px solid #564731;border-radius:13px;padding:18px;margin:15px 0}label{display:block;margin:12px 0 5px;color:#bcab95}p,small{color:#bbb3a8}hr{border:0;border-top:1px solid #494135}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:11px}.list section{margin:0}.pill{border:1px solid #6d5238;padding:5px;border-radius:8px;word-break:break-all}.error{color:#f2ad9c}.ok{color:#aed5b8}.res{display:grid;grid-template-columns:1fr auto auto auto;gap:9px;align-items:center;margin:11px 0}.res button{min-width:40px}.portrait{width:95px;height:95px;border:1px solid #bf9871;border-radius:10px;object-fit:cover}.head{display:flex;align-items:center;gap:18px}code{font-size:12px;color:#f6c895}a{color:#d8b67f}#status{white-space:pre-wrap} @media(max-width:560px){body{padding:11px}.res{gap:5px}}"""

ADMIN_HTML="""<main><h1>✧ Mestre · Mesa em Rede</h1><p>Somente LAN. Cada jogador recebe um link com porta e token próprios. O painel do mestre pode editar qualquer campo.</p>
<section id="login"><h2>Autenticação</h2><label>Chave administrativa impressa no terminal do PC</label><input type="password" id="key" autocomplete="off"><button class="primary" onclick="signin()">Entrar</button></section>
<div id="console" hidden><section><h2>Importar fichas offline</h2><p>No aplicativo, abra d20 → Mesa em rede → Copiar fichas locais. Cole o JSON abaixo e importe. Os arquivos não são enviados a nenhum provedor externo. Confira os máximos calculados de PV/PE/SAN após a importação: origens, trilhas e poderes podem exigir ajuste do mestre.</p>
<textarea id="import" placeholder='[{"name":"Agente","character":{"resources":{"PV":{"current":20,"max":20}}}}]'></textarea><button class="primary" onclick="imp()">Importar fichas</button> <button onclick="refresh()">Atualizar painel</button></section>
<section><h2>Criar jogador manualmente</h2><div class="row"><input id="newname" placeholder="Nome do personagem"><button onclick="create()">Criar ficha vazia</button></div></section>
<div class="list" id="members"></div></div><p id="status"></p></main>
<script>
let key='';const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'Falha de comunicação');return d}
async function signin(){key=q('#key').value.trim();try{await api('/api/admin/members');q('#login').hidden=true;q('#console').hidden=false;refresh()}catch(e){q('#status').textContent=e.message}}
async function imp(){try{const text=q('#import').value;const arr=JSON.parse(text);const d=await api('/api/admin/import','POST',arr);q('#status').textContent='Importados: '+d.added;refresh()}catch(e){q('#status').textContent=e.message}}
async function create(){try{const name=q('#newname').value.trim();if(!name)return;await api('/api/admin/new','POST',{name});q('#newname').value='';refresh()}catch(e){q('#status').textContent=e.message}}
async function refresh(){try{const a=await api('/api/admin/members');q('#members').innerHTML=a.members.map(m=>'<section><h2>'+esc(m.name)+'</h2><p>Porta '+m.port+' · acesso exclusivo do personagem</p><label>Link do jogador</label><input style="width:100%" readonly value="'+esc(m.url)+'"><div class="row"><button onclick="copy('+JSON.stringify(m.url).replaceAll('"','&quot;')+')">Copiar link</button><button onclick="edit('+JSON.stringify(m.id).replaceAll('"','&quot;')+')">Editar tudo</button></div><div id="editor-'+esc(m.id)+'" hidden><label>Ficha completa (JSON)</label><textarea id="txt-'+esc(m.id)+'">'+esc(JSON.stringify(m.sheet,null,2))+'</textarea><button class="primary" onclick="save('+JSON.stringify(m.id).replaceAll('"','&quot;')+')">Salvar ficha</button></div></section>').join('')}catch(e){q('#status').textContent=e.message}}
function edit(id){const x=q('#editor-'+id);x.hidden=!x.hidden}
async function save(id){try{await api('/api/admin/sheet/'+encodeURIComponent(id),'PUT',JSON.parse(q('#txt-'+id).value));q('#status').textContent='Ficha salva';refresh()}catch(e){q('#status').textContent=e.message}}
function copy(link){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(link).then(()=>q('#status').textContent='Link copiado').catch(()=>q('#status').textContent=link)}else q('#status').textContent=link}
</script>"""
PLAYER_HTML="""<main><h1>✧ Ficha do Agente</h1><p>Seu link é individual. Você pode ajustar somente os valores atuais. O mestre controla todos os demais campos.</p><section id="sheet"><p>Carregando sua ficha…</p></section><p id="status"></p></main>
<script>
const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let current={};async function refresh(){try{const r=await fetch('/api/me',{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error('Acesso não autorizado');const d=await r.json();const s=d.sheet;current=s;const res=s.resources||{};q('#sheet').innerHTML='<div class="head">'+(s.photo&&s.photo.startsWith('data:image/')?'<img class="portrait" src="'+esc(s.photo)+'" alt="Retrato">':'')+'<div><h2>'+esc(s.name||'Agente')+'</h2><small>'+esc(s.class||'')+' · NEX '+esc(s.nex||5)+'%</small></div></div><hr>'+Object.entries(res).map(([k,v])=>'<div class="res"><strong>'+esc(k)+'</strong><button onclick="adjust('+JSON.stringify(k).replaceAll('"','&quot;')+',-1)">−</button><span>'+Number(v.current)+' / '+Number(v.max)+'</span><button onclick="adjust('+JSON.stringify(k).replaceAll('"','&quot;')+',1)">+</button></div>').join('')+'<h3>Atributos</h3><p>'+Object.entries(s.attrs||{}).map(([k,v])=>esc(k)+': '+esc(v)).join(' · ')+'</p><h3>Rituais conhecidos</h3><p>'+esc((s.rituaisConhecidos||[]).join(', ')||'Nenhum')+'</p>';q('#status').textContent='Sincronizado com o mestre'}catch(e){q('#status').textContent=e.message}}
async function adjust(name,delta){const prev=current.resources?.[name];if(!prev)return;const target=Math.max(0,Math.min(prev.max,prev.current+delta));try{const r=await fetch('/api/current',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource:name,current:target})});const j=await r.json();if(!r.ok)throw Error(j.error||'Falha');refresh()}catch(e){q('#status').textContent=e.message}}
refresh();setInterval(refresh,1600);
</script>"""

class Handler(BaseHTTPRequestHandler):
    server_version='RPG-LAN/0.9'
    def log_message(self,fmt,*args):
        # Never log unique invitation tokens or credentials in request paths.
        if self.path.startswith('/join/'):return
        super().log_message('%s',self.address_string())
    @property
    def st(self):return self.server.state
    @property
    def admin(self):return self.server.role=='master'
    def response(self,code,obj):
        body=json.dumps(obj,ensure_ascii=False).encode('utf8')
        self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def page(self,s):
        body=('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"><title>RPG Mesa LAN</title><style>'+CSS+'</style>'+s+'</html>').encode('utf8')
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Frame-Options','DENY');self.send_header('Content-Security-Policy',"default-src 'self' data:; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline' 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def is_master(self):
        auth=self.headers.get('Authorization','')
        return hmac.compare_digest(auth,'Bearer '+self.st.admin_secret)
    def player(self):
        obj=cookies.SimpleCookie()
        try:obj.load(self.headers.get('Cookie',''))
        except cookies.CookieError:return None
        token=obj.get('rpg_session')
        member=self.st.find(self.server.server_port)
        if not token or not member:return None
        return member if hmac.compare_digest(token.value,member['token']) else None
    def read_json(self):
        length=int(self.headers.get('Content-Length','0'))
        if length<=0 or length>MAX_BODY:raise ValueError('Payload fora do limite')
        return json.loads(self.rfile.read(length))
    def mutation_ok(self):
        origin=self.headers.get('Origin')
        return (not origin or origin==f"http://{self.headers.get('Host','')}") and self.headers.get('Content-Type','').startswith('application/json')
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/':self.page(ADMIN_HTML if self.admin else (PLAYER_HTML if self.player() else '<main><h1>Link individual necessário</h1><p>Peça ao mestre o endereço de acesso à sua ficha.</p></main>'));return
        if not self.admin and path.startswith('/join/'):
            member=self.st.find(self.server.server_port)
            invitation=unquote(path[len('/join/'):]);valid=member and hmac.compare_digest(invitation,member['token'])
            if not valid:self.response(403,{'error':'Convite inválido'});return
            self.send_response(302);self.send_header('Set-Cookie','rpg_session='+member['token']+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400');self.send_header('Cache-Control','no-store');self.send_header('Location','/');self.send_header('Content-Length','0');self.end_headers();return
        if path=='/api/admin/members' and self.admin and self.is_master():
            with SAVE_LOCK:rows=[self.st.public_member(m) for m in self.st.members]
            self.response(200,{'members':rows});return
        if path=='/api/me' and not self.admin:
            member=self.player()
            if member:self.response(200,{'sheet':clean_public(member['sheet'])});return
        self.response(403,{'error':'Não autorizado'})
    def do_POST(self):self.mutate('POST')
    def do_PUT(self):self.mutate('PUT')
    def do_PATCH(self):self.mutate('PATCH')
    def mutate(self,method):
        path=urlsplit(self.path).path
        if not self.mutation_ok():self.response(403,{'error':'Origem não permitida'});return
        try:body=self.read_json()
        except (ValueError,json.JSONDecodeError):self.response(400,{'error':'JSON inválido ou grande demais'});return
        if self.admin:
            if not self.is_master():self.response(403,{'error':'Chave inválida'});return
            try:
                if method=='POST' and path=='/api/admin/new':
                    name=str(body.get('name','Novo agente'))[:80]
                    member=self.st.add(name,{'name':name,'class':'Combatente','nex':5,'resources':{'PV':{'current':20,'max':20},'PE':{'current':3,'max':3},'SAN':{'current':12,'max':12}},'attrs':{},'rituaisConhecidos':[]})
                    start_player(self.st,member);self.response(201,{'id':member['id'],'port':member['port']});return
                if method=='POST' and path=='/api/admin/import':
                    if not isinstance(body,list) or len(body)>30:raise ValueError('Envie uma lista de até 30 fichas')
                    prepared=[]
                    for record in body:
                        if not isinstance(record,dict):raise ValueError('Ficha inválida')
                        char=record.get('character',record)
                        sheet=validate_sheet(copy.deepcopy(char));name=str(sheet.get('name') or record.get('name') or 'Novo agente')[:80]
                        prepared.append((name,sheet))
                    for name,sheet in prepared:start_player(self.st,self.st.add(name,sheet))
                    self.response(201,{'added':len(prepared)});return
                if method=='PUT' and path.startswith('/api/admin/sheet/'):
                    member=self.st.by_id(unquote(path[len('/api/admin/sheet/'):]))
                    if not member:self.response(404,{'error':'Personagem inexistente'});return
                    sheet=validate_sheet(body)
                    with SAVE_LOCK:member['sheet']=sheet;member['name']=str(sheet.get('name','Agente'))[:80];self.st.save()
                    self.response(200,{'ok':True});return
            except (ValueError,OSError) as error:self.response(400,{'error':str(error)});return
        if method=='PATCH' and path=='/api/current':
            member=self.player()
            if not member:self.response(403,{'error':'Sem acesso'});return
            resource=body.get('resource');value=body.get('current')
            if not isinstance(resource,str) or isinstance(value,bool) or not isinstance(value,(int,float)):
                self.response(400,{'error':'Recurso inválido'});return
            with SAVE_LOCK:
                r=member['sheet'].get('resources',{}).get(resource)
                if not isinstance(r,dict):self.response(403,{'error':'Recurso não autorizado'});return
                if value<0 or value>r.get('max',0):self.response(400,{'error':'Fora dos limites'});return
                r['current']=value;self.st.save()
            self.response(200,{'ok':True,'current':value});return
        self.response(404,{'error':'Comando desconhecido'})

SERVERS=[]
def start_player(state,member):
    with SAVE_LOCK:
        port=member['port']
        if any(s.server_port==port for s in SERVERS):return
        server=ThreadingHTTPServer(('0.0.0.0',port),Handler)
        server.state=state;server.role='player';SERVERS.append(server)
        threading.Thread(target=server.serve_forever,daemon=True).start()

def main():
    p=argparse.ArgumentParser(description='Servidor LAN do mestre e portas individuais dos jogadores')
    p.add_argument('--port',type=int,default=8765)
    p.add_argument('--data',default='mesa-lan-privada.json')
    p.add_argument('--host-ip',default=private_ipv4())
    args=p.parse_args()
    state=State(Path(args.data).resolve(),args.port,args.host_ip)
    for member in list(state.members):start_player(state,member)
    host=ThreadingHTTPServer(('0.0.0.0',args.port),Handler)
    host.state=state;host.role='master';SERVERS.append(host)
    print('\nRPG Mesa — somente rede local')
    print(f'PAINEL DO MESTRE: http://{args.host_ip}:{args.port}/')
    print('CHAVE ADMINISTRATIVA:',state.admin_secret)
    print('ATENÇÃO: não exponha essas portas para internet; use uma LAN confiável.\n')
    try:host.serve_forever()
    except KeyboardInterrupt:pass
    finally:
        for server in SERVERS:server.shutdown();server.server_close()
if __name__=='__main__':main()
