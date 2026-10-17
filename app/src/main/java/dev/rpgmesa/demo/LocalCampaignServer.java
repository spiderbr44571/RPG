package dev.rpgmesa.demo;

import android.content.Context;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;
import fi.iki.elonen.NanoHTTPD;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * HTTP da campanha embutido no Android, sem Termux/PC.
 * Somente rede local de confiança. O aparelho anfitrião guarda o banco privado.
 * Mestre usa chave administrativa; convite de campanha nunca concede permissões de mestre.
 */
public final class LocalCampaignServer extends NanoHTTPD {
  private final Context context;
  private final File database;
  private final SecureRandom random = new SecureRandom();
  private final JSONObject root;
  private final String hostIp;
  private final Object lock = new Object();
  private static final int MAX_BYTES = 500000;
  private final AtomicInteger revision = new AtomicInteger(0);

  public LocalCampaignServer(Context context, int port) throws Exception {
    super(port);
    this.context = context.getApplicationContext();
    this.database = new File(this.context.getFilesDir(), "campanhas-android.json");
    this.hostIp = localIp();
    if (database.isFile()) {
      try (FileInputStream in = new FileInputStream(database)) {
        byte[] raw = new byte[(int)Math.min(database.length(), 4000000)];
        int count = in.read(raw);
        root = new JSONObject(new String(raw,0,Math.max(0,count),StandardCharsets.UTF_8));
      }
    } else {
      root = new JSONObject();
      root.put("version",3).put("secret",newToken()).put("campaigns",new JSONArray());
      persist();
    }
    if (!root.has("secret") || !root.has("campaigns")) throw new IOException("Banco da campanha inválido");
  }
  public String hostIp(){ return hostIp; }
  public int currentPort(){return getListeningPort()>0?getListeningPort():8765;}
  public String masterKey(){synchronized(lock){return root.optString("secret");}}
  private String newToken(){
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    return Base64.encodeToString(bytes,Base64.URL_SAFE|Base64.NO_PADDING|Base64.NO_WRAP);
  }
  private static boolean equalsSecret(String a,String b) {
    return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8),b.getBytes(StandardCharsets.UTF_8));
  }
  private static String localIp(){
    try {
      Enumeration<NetworkInterface> nets=NetworkInterface.getNetworkInterfaces();
      while(nets.hasMoreElements()) {
        NetworkInterface ni=nets.nextElement();
        if(!ni.isUp()||ni.isLoopback())continue;
        Enumeration<InetAddress> addrs=ni.getInetAddresses();
        while(addrs.hasMoreElements()){
          InetAddress addr=addrs.nextElement();
          if(addr instanceof Inet4Address && addr.isSiteLocalAddress() && !addr.isLoopbackAddress())return addr.getHostAddress();
        }
      }
    }catch(Exception ignored){}
    return "127.0.0.1";
  }
  public JSONObject status(){
    synchronized(lock){
      JSONObject j=new JSONObject();
      j.put("running",true).put("ip",hostIp).put("port",currentPort())
       .put("masterUrl","http://"+hostIp+":"+currentPort()+"/master")
       .put("campaigns",listCampaigns()).put("revision",revision.get());
      return j;
    }
  }
  private JSONArray listCampaigns(){
    JSONArray result=new JSONArray(),camps=root.getJSONArray("campaigns");
    for(int i=0;i<camps.length();i++){
      JSONObject c=camps.getJSONObject(i);
      result.put(new JSONObject().put("id",c.getString("id")).put("name",c.getString("name"))
        .put("scene",c.optInt("scene",1)).put("turn",c.optInt("turn",1))
        .put("players",c.getJSONArray("players").length())
        .put("invite",invite(c)));
    }
    return result;
  }
  private String invite(JSONObject c){
    return "http://"+hostIp+":"+currentPort()+"/join/"+c.getString("id")+"/"+c.getString("invite");
  }
  private void persist() throws IOException {
    synchronized(lock){
      File tmp = new File(database.getParentFile(),database.getName()+".tmp");
      try(FileOutputStream out = new FileOutputStream(tmp)){
        out.write(root.toString().getBytes(StandardCharsets.UTF_8));
        out.getFD().sync();
      }
      if(!tmp.renameTo(database)){
        if(database.exists()&&!database.delete())throw new IOException("Não foi possível salvar campanha");
        if(!tmp.renameTo(database))throw new IOException("Erro ao gravar dados da mesa");
      }
      revision.incrementAndGet();
    }
  }
  private static String field(JSONObject j,String name,int max) {
    String v=j.optString(name,"").trim();
    if(v.isEmpty()||v.length()>max)throw new IllegalArgumentException("Campo "+name+" inválido");
    for(int k=0;k<v.length();k++)if(Character.isISOControl(v.charAt(k)))throw new IllegalArgumentException("Texto inválido");
    return v;
  }
  public JSONObject createCampaign(String name) throws Exception {
    synchronized(lock){
      JSONObject j=new JSONObject().put("name",name);
      name=field(j,"name",90);
      JSONArray campaigns=root.getJSONArray("campaigns");
      if(campaigns.length()>=50)throw new IllegalArgumentException("Máximo de 50 campanhas");
      JSONObject c=new JSONObject().put("id",UUID.randomUUID().toString().replace("-",""))
        .put("name",name).put("invite",newToken()).put("scene",1).put("sceneName","Cena 1")
        .put("turn",1).put("players",new JSONArray()).put("characters",new JSONArray())
        .put("canvas",new JSONArray());
      campaigns.put(c);persist();
      return new JSONObject().put("id",c.getString("id")).put("name",name).put("invite",invite(c));
    }
  }
  private JSONObject campaign(String cid){
    JSONArray a=root.getJSONArray("campaigns");
    for(int i=0;i<a.length();i++){
      JSONObject c=a.getJSONObject(i);
      if(c.getString("id").equals(cid))return c;
    }
    throw new IllegalArgumentException("Campanha não encontrada");
  }
  private static JSONObject entry(JSONArray arr,String id,String what){
    for(int i=0;i<arr.length();i++){
      JSONObject o=arr.getJSONObject(i);
      if(id.equals(o.optString("id")))return o;
    }
    throw new IllegalArgumentException(what+" não encontrado");
  }
  private static JSONObject sheet(JSONObject input){
    if(input==null)throw new IllegalArgumentException("Ficha inválida");
    if(input.toString().length()>240000)throw new IllegalArgumentException("Ficha muito grande");
    JSONObject s=new JSONObject(input.toString());
    s.put("name",field(s,"name",90));
    JSONObject resources=s.optJSONObject("resources");
    if(resources==null){resources=new JSONObject();s.put("resources",resources);}
    for(String name:new String[]{"PV","PE","SAN"}){
      Object o=resources.opt(name);
      if(o instanceof Number){
        double n=((Number)o).doubleValue();
        if(!Double.isFinite(n)||n<0||n>1e6)throw new IllegalArgumentException("Recurso inválido");
        resources.put(name,new JSONObject().put("current",n).put("max",n));
      } else if(o instanceof JSONObject){
        JSONObject v=(JSONObject)o;
        double cur=v.optDouble("current",-1),mx=v.optDouble("max",-1);
        if(!Double.isFinite(cur)||!Double.isFinite(mx)||cur<0||mx<0||cur>mx||mx>1000000)
          throw new IllegalArgumentException("Recurso "+name+" inválido");
      }
    }
    return s;
  }
  public JSONObject addSheet(String cid,JSONObject payload) throws Exception {
    synchronized(lock){
      JSONObject c=campaign(cid);
      if(c.getJSONArray("characters").length()>=200)throw new IllegalArgumentException("Limite de fichas");
      JSONObject o=new JSONObject().put("id",UUID.randomUUID().toString()).put("sheet",sheet(payload));
      c.getJSONArray("characters").put(o);persist();
      return new JSONObject().put("id",o.getString("id"));
    }
  }
  public JSONObject detail(String cid){
    synchronized(lock){
      JSONObject data=new JSONObject(campaign(cid).toString());
      data.remove("invite");
      JSONArray players=data.getJSONArray("players");
      for(int i=0;i<players.length();i++)players.getJSONObject(i).remove("secret");
      data.put("invite",invite(campaign(cid)));
      return data;
    }
  }
  public void assign(String cid,String pid,String charId) throws Exception {
    synchronized(lock){
      JSONObject c=campaign(cid),p=entry(c.getJSONArray("players"),pid,"Jogador");
      if(charId==null||charId.isEmpty()){
        p.put("characterId",JSONObject.NULL).put("status","aguardando");
      } else {
        entry(c.getJSONArray("characters"),charId,"Ficha");
        JSONArray players=c.getJSONArray("players");
        for(int i=0;i<players.length();i++){
          JSONObject other=players.getJSONObject(i);
          if(other!=p&&charId.equals(other.optString("characterId")))
            throw new IllegalArgumentException("Ficha já atribuída");
        }
        p.put("characterId",charId).put("status","ativo").remove("proposedSheet");
      }
      persist();
    }
  }
  public JSONObject approve(String cid,String pid) throws Exception {
    synchronized(lock){
      JSONObject p=entry(campaign(cid).getJSONArray("players"),pid,"Jogador");
      JSONObject proposal=p.optJSONObject("proposedSheet");
      if(proposal==null)throw new IllegalArgumentException("Sem ficha aguardando aprovação");
      JSONObject newSheet=addSheet(cid,proposal);
      assign(cid,pid,newSheet.getString("id"));
      return newSheet;
    }
  }
  public void updateSheet(String cid,String characterId,JSONObject value) throws Exception{
    synchronized(lock){entry(campaign(cid).getJSONArray("characters"),characterId,"Ficha").put("sheet",sheet(value));persist();}
  }
  public void advance(String cid,String kind) throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      if(kind.equals("turn"))c.put("turn",c.getInt("turn")+1);
      else if(kind.equals("scene")){c.put("scene",c.getInt("scene")+1);c.put("turn",1);c.put("sceneName","Cena "+c.getInt("scene"));}
      else throw new IllegalArgumentException("Evento desconhecido");
      JSONArray characters=c.getJSONArray("characters");
      for(int i=0;i<characters.length();i++){
        JSONObject s=characters.getJSONObject(i).getJSONObject("sheet"),effects=s.optJSONArray("effects");
        if(effects==null)continue;
        JSONArray kept=new JSONArray();
        for(int k=0;k<effects.length();k++){
          JSONObject ef=effects.optJSONObject(k);if(ef==null)continue;
          if(kind.equals("scene")&&"scene".equals(ef.optString("unit")))continue;
          if(kind.equals("turn")&&"turn".equals(ef.optString("unit"))){
            int rem=ef.optInt("remaining",0)-1;if(rem<=0)continue;ef.put("remaining",rem);
          }
          kept.put(ef);
        }
        s.put("effects",kept);
      }
      persist();
    }
  }
  public void effect(String cid,String charId,JSONObject body) throws Exception{
    synchronized(lock){
      JSONObject s=entry(campaign(cid).getJSONArray("characters"),charId,"Ficha").getJSONObject("sheet");
      String unit=body.optString("unit");
      if(!unit.equals("turn")&&!unit.equals("scene")&&!unit.equals("permanent"))throw new IllegalArgumentException("Duração inválida");
      int rem=body.optInt("remaining",0);
      if(unit.equals("turn")&&(rem<1||rem>999))throw new IllegalArgumentException("Turnos inválidos");
      JSONArray effects=s.optJSONArray("effects");if(effects==null){effects=new JSONArray();s.put("effects",effects);}
      effects.put(new JSONObject().put("id",UUID.randomUUID().toString()).put("name",field(body,"name",80))
       .put("unit",unit).put("remaining",unit.equals("turn")?rem:JSONObject.NULL)
       .put("notes",body.optString("notes","").substring(0,Math.min(500,body.optString("notes","").length()))));
      persist();
    }
  }
  public void canvas(String cid,JSONArray cards) throws Exception{
    synchronized(lock){
      if(cards.length()>500 || cards.toString().length()>240000)throw new IllegalArgumentException("Canvas muito grande");
      campaign(cid).put("canvas",new JSONArray(cards.toString()));persist();
    }
  }
  private JSONObject checkPlayer(String cid,String token){
    if(token==null)return null;
    synchronized(lock){
      JSONArray arr=campaign(cid).getJSONArray("players");
      for(int i=0;i<arr.length();i++){
        JSONObject p=arr.getJSONObject(i);
        if(equalsSecret(token,p.getString("secret")))return p;
      }
    }
    return null;
  }
  private JSONObject playerInfo(String cid,JSONObject p){
    synchronized(lock){
      JSONObject c=campaign(cid),v=new JSONObject().put("campaign",c.getString("name"))
        .put("scene",c.getInt("scene")).put("sceneName",c.getString("sceneName"))
        .put("turn",c.getInt("turn")).put("nickname",p.getString("nickname"))
        .put("status",p.getString("status"));
      JSONObject ch=null;String id=p.optString("characterId","");
      if(!id.isEmpty())try{ch=entry(c.getJSONArray("characters"),id,"Ficha");}catch(Exception ignored){}
      if(ch==null)v.put("character",JSONObject.NULL);
      else {
        JSONObject original=ch.getJSONObject("sheet"),pub=new JSONObject();
        for(String k:new String[]{"name","class","nex","attrs","skills","resources","photo","sheetTheme","rituaisConhecidos","origem","trilha","systemId","effects"})
          if(original.has(k))pub.put(k,original.get(k));
        v.put("character",pub);
      }
      return v;
    }
  }
  private boolean master(IHTTPSession s){
    String auth=s.getHeaders().getOrDefault("authorization","");
    return equalsSecret(auth,"Bearer "+masterKey());
  }
  private String cookie(IHTTPSession s,String name){
    String raw=s.getHeaders().getOrDefault("cookie","");
    for(String part:raw.split(";")){
      int pos=part.indexOf('=');
      if(pos>=0&&part.substring(0,pos).trim().equals(name))return part.substring(pos+1).trim();
    }
    return null;
  }
  private JSONObject body(IHTTPSession s)throws Exception{
    String ct=s.getHeaders().getOrDefault("content-type","");
    if(!ct.toLowerCase(Locale.ROOT).startsWith("application/json"))throw new IllegalArgumentException("Use application/json");
    long size=Long.parseLong(s.getHeaders().getOrDefault("content-length","0"));
    if(size<1||size>MAX_BYTES)throw new IllegalArgumentException("Payload fora do limite");
    Map<String,String> files=new HashMap<>();s.parseBody(files);
    String b=files.get("postData");if(b==null||b.length()>MAX_BYTES)throw new IllegalArgumentException("Payload inválido");
    return new JSONObject(b);
  }
  private Response response(int status,JSONObject data){
    Response.Status st=status==200?Response.Status.OK:status==201?Response.Status.CREATED:
      status==400?Response.Status.BAD_REQUEST:status==401?Response.Status.UNAUTHORIZED:
      status==403?Response.Status.FORBIDDEN:status==404?Response.Status.NOT_FOUND:
      Response.Status.INTERNAL_ERROR;
    Response r=newFixedLengthResponse(st,"application/json; charset=utf-8",data.toString());
    r.addHeader("Cache-Control","no-store");r.addHeader("X-Content-Type-Options","nosniff");
    r.addHeader("Referrer-Policy","no-referrer");r.addHeader("X-Frame-Options","DENY");
    return r;
  }
  private Response json(int status,String key,String value){return response(status,new JSONObject().put(key,value));}
  private Response html(String asset) throws IOException{
    byte[] buf;
    try(InputStream in=context.getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);buf=out.toByteArray();
    }
    Response r=newFixedLengthResponse(Response.Status.OK,"text/html; charset=utf-8",new String(buf,StandardCharsets.UTF_8));
    r.addHeader("Cache-Control","no-store");r.addHeader("Referrer-Policy","no-referrer");
    r.addHeader("X-Frame-Options","DENY");r.addHeader("X-Content-Type-Options","nosniff");
    r.addHeader("Content-Security-Policy","default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    return r;
  }
  @Override public Response serve(IHTTPSession s) {
    try {
      String path=s.getUri();String[] p=path.split("/");String method=s.getMethod().name();
      boolean mutate=method.equals("POST")||method.equals("PUT")||method.equals("PATCH");
      if(mutate){
        String origin=s.getHeaders().get("origin"),host=s.getHeaders().getOrDefault("host","");
        if(origin!=null&&!origin.equals("http://"+host))return json(403,"error","Origem não autorizada");
      }
      if(method.equals("GET")){
        if(path.equals("/")||path.equals("/master"))return html("lan_master.html");
        if(p.length==4&&p[1].equals("join")){
          JSONObject c=campaign(p[2]);
          if(!equalsSecret(c.getString("invite"),p[3]))return json(403,"error","Convite inválido");
          return html("lan_join.html");
        }
        if(p.length==3&&p[1].equals("play")){
          if(checkPlayer(p[2],cookie(s,"rpg_guest"))==null)return json(403,"error","Sessão não autorizada");
          return html("lan_player.html");
        }
        if(path.equals("/api/admin/campaigns")){
          if(!master(s))return json(403,"error","Acesso do mestre necessário");
          return response(200,new JSONObject().put("campaigns",listCampaigns()));
        }
        if(p.length==5&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns")){
          if(!master(s))return json(403,"error","Acesso do mestre necessário");
          return response(200,new JSONObject().put("campaign",detail(p[4])));
        }
        if(p.length==4&&p[1].equals("api")&&p[2].equals("play")){
          JSONObject player=checkPlayer(p[3],cookie(s,"rpg_guest"));
          if(player==null)return json(403,"error","Sessão de jogador inválida");
          return response(200,playerInfo(p[3],player));
        }
        if(p.length==5&&p[1].equals("api")&&p[2].equals("join")&&p[3].equals("info")){
          JSONObject c=campaign(p[4]);
          return response(200,new JSONObject().put("name",c.getString("name")));
        }
        return json(404,"error","Página não encontrada");
      }
      if(!mutate)return json(404,"error","Método desconhecido");
      JSONObject b=body(s);
      if(path.equals("/api/admin/campaigns")&&method.equals("POST")){
        if(!master(s))return json(403,"error","Chave do mestre inválida");
        return response(201,createCampaign(b.optString("name","")));
      }
      if(p.length==5&&p[1].equals("api")&&p[2].equals("join")&&method.equals("POST")){
        synchronized(lock){
          JSONObject c=campaign(p[3]);
          if(!equalsSecret(c.getString("invite"),p[4]))return json(403,"error","Convite inválido");
          JSONArray players=c.getJSONArray("players");
          if(players.length()>=40)return json(400,"error","Campanha cheia");
          JSONObject prop=b.optJSONObject("sheet");
          if(prop!=null)prop=sheet(prop);
          JSONObject pl=new JSONObject().put("id",UUID.randomUUID().toString()).put("secret",newToken())
            .put("nickname",field(b,"nickname",40)).put("status","aguardando")
            .put("characterId",JSONObject.NULL).put("proposedSheet",prop==null?JSONObject.NULL:prop);
          players.put(pl);persist();
          Response r=response(201,new JSONObject().put("ok",true).put("campaignId",p[3]).put("status","aguardando"));
          r.addHeader("Set-Cookie","rpg_guest="+pl.getString("secret")+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000");
          return r;
        }
      }
      if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("resource")&&method.equals("PATCH")){
        String cid=p[3];
        synchronized(lock){
          JSONObject player=checkPlayer(cid,cookie(s,"rpg_guest"));
          if(player==null)return json(403,"error","Não autorizado");
          if(b.length()!=2||!b.has("resource")||!b.has("current"))return json(403,"error","Somente recursos atuais");
          String key=b.optString("resource");if(!key.equals("PV")&&!key.equals("PE")&&!key.equals("SAN"))
            return json(403,"error","Recurso não permitido");
          Object v=b.opt("current");
          if(!(v instanceof Number))return json(400,"error","Valor inválido");
          double next=((Number)v).doubleValue();if(!Double.isFinite(next))return json(400,"error","Valor inválido");
          JSONObject ch=entry(campaign(cid).getJSONArray("characters"),player.optString("characterId"),"Ficha");
          JSONObject res=ch.getJSONObject("sheet").getJSONObject("resources").getJSONObject(key);
          if(next<0||next>res.getDouble("max"))return json(400,"error","Fora do limite");
          res.put("current",next);persist();
          return response(200,new JSONObject().put("current",next));
        }
      }
      if(p.length>=5&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns")){
        if(!master(s))return json(403,"error","Chave do mestre inválida");
        String cid=p[4];
        if(p.length==6&&p[5].equals("characters")&&method.equals("POST"))
          return response(201,addSheet(cid,b.getJSONObject("sheet")));
        if(p.length==7&&p[5].equals("characters")&&method.equals("PUT")){
          updateSheet(cid,p[6],b.getJSONObject("sheet"));return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("assign")&&method.equals("POST")){
          assign(cid,b.getString("playerId"),b.isNull("characterId")?null:b.optString("characterId",null));
          return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("approve")&&method.equals("POST")){
          return response(200,approve(cid,b.getString("playerId")));
        }
        if(p.length==6&&p[5].equals("advance")&&method.equals("POST")){
          advance(cid,b.getString("kind"));return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("effects")&&method.equals("POST")){
          effect(cid,b.getString("characterId"),b);return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("canvas")&&method.equals("PUT")){
          canvas(cid,b.getJSONArray("nodes"));return json(200,"ok","true");
        }
      }
      return json(404,"error","Rota não encontrada");
    } catch(IllegalArgumentException|JSONException ex){
      return json(400,"error",ex.getMessage()==null?"Dados inválidos":ex.getMessage());
    } catch(Exception ex){
      return json(500,"error","Erro interno do servidor da mesa");
    }
  }
}
