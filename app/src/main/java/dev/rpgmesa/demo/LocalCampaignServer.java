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
  private static final int MAX_BYTES = 5300000;
  private String cachedMaskedKey="";
  private String cachedMaskedImage="";
  private final AtomicInteger revision = new AtomicInteger(0);

  public LocalCampaignServer(Context context, int port) throws Exception {
    super(localIp(),port); // Vincula somente ao IP local, nao a todas as interfaces.
    this.context = context.getApplicationContext();
    this.database = new File(this.context.getFilesDir(), "campanhas-android.json");
    this.hostIp = localIp();
    if (database.isFile()) {
      try (FileInputStream in = new FileInputStream(database)) {
        byte[] raw = new byte[(int)Math.min(database.length(), 16000000)];
        int count = in.read(raw);
        root = new JSONObject(new String(raw,0,Math.max(0,count),StandardCharsets.UTF_8));
      }
    } else {
      root = new JSONObject();
      root.put("version",3).put("secret",newToken()).put("campaigns",new JSONArray());
      persist();
    }
    if (!root.has("secret") || !root.has("campaigns")) throw new IOException("Banco da campanha inválido");
    // Reconstroi labels nativos conhecidos, sem sobrescrever nomes personalizados.
    JSONArray savedCampaigns=root.getJSONArray("campaigns");
    for(int i=0;i<savedCampaigns.length();i++)repairLegacyLabels(savedCampaigns.getJSONObject(i));
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
    try { synchronized(lock){
      JSONObject j=new JSONObject();
      j.put("running",true).put("ip",hostIp).put("port",currentPort())
       .put("masterUrl","http://"+hostIp+":"+currentPort()+"/master")
       .put("campaigns",listCampaigns()).put("revision",revision.get());
      return j;
    }} catch(Exception e){return new JSONObject();}
  }
  private JSONArray listCampaigns() throws JSONException{
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
  private String invite(JSONObject c) throws JSONException{
    return "http://"+hostIp+":"+currentPort()+"/join/"+c.getString("id")+"/"+c.getString("invite");
  }
  private void persist() throws IOException {
    synchronized(lock){
      File tmp = new File(database.getParentFile(),database.getName()+".tmp");
      try(FileOutputStream out = new FileOutputStream(tmp)){
        byte[] data=root.toString().getBytes(StandardCharsets.UTF_8);
        if(data.length>15000000)throw new IOException("Limite de armazenamento de campanhas excedido");
        out.write(data);
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

  private static String restoreKnownLegacyText(String value){
    if(value==null)return "";
    // Historico: NanoHTTPD trocou cada byte UTF-8 alto por U+FFFD.
    // Recupera apenas rotulos padrao previsiveis; nomes proprios nunca sao adivinhados.
    String fixed=value
      .replaceAll("(?iu)cen\uFFFD{1,3}rio","cenário")
      .replaceAll("(?iu)Her\uFFFD{1,3}i","Herói")
      .replaceAll("(?iu)Ru\uFFFD{1,3}nas","Ruínas")
      .replaceAll("(?iu)Mag\uFFFD{1,3}o","Mago")
      .replaceAll("(?iu)M\uFFFD{1,3}stico","Místico")
      .replaceAll("(?iu)C\uFFFD{1,3}rculo","Círculo")
      .replaceAll("(?iu)Criatu\uFFFD{1,3}ra","Criatura");
    return fixed;
  }
  private static void repairLegacyLabels(JSONObject campaign)throws JSONException{
    JSONArray scenes=campaign.optJSONArray("scenarios"),assets=campaign.optJSONArray("sceneAssets");
    if(scenes!=null)for(int i=0;i<scenes.length();i++){
      JSONObject scene=scenes.optJSONObject(i);if(scene==null)continue;
      scene.put("name",restoreKnownLegacyText(scene.optString("name")));
      JSONArray tokens=scene.optJSONArray("tokens");
      if(tokens!=null)for(int j=0;j<tokens.length();j++){
        JSONObject token=tokens.optJSONObject(j);if(token==null)continue;
        token.put("name",restoreKnownLegacyText(token.optString("name")));
      }
    }
    if(assets!=null)for(int i=0;i<assets.length();i++){
      JSONObject a=assets.optJSONObject(i);if(a==null)continue;
      a.put("name",restoreKnownLegacyText(a.optString("name")));
      if(a.optString("emoji","").indexOf('\uFFFD')>=0)a.put("emoji","*");
    }
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
  private JSONObject campaign(String cid) throws JSONException{
    JSONArray a=root.getJSONArray("campaigns");
    for(int i=0;i<a.length();i++){
      JSONObject c=a.getJSONObject(i);
      if(c.getString("id").equals(cid))return c;
    }
    throw new IllegalArgumentException("Campanha não encontrada");
  }
  private static JSONObject entry(JSONArray arr,String id,String what) throws JSONException{
    for(int i=0;i<arr.length();i++){
      JSONObject o=arr.getJSONObject(i);
      if(id.equals(o.optString("id")))return o;
    }
    throw new IllegalArgumentException(what+" não encontrado");
  }
  private static JSONObject sheet(JSONObject input) throws JSONException{
    if(input==null)throw new IllegalArgumentException("Ficha inválida");
    if(input.toString().length()>240000)throw new IllegalArgumentException("Ficha muito grande");
    JSONObject s=new JSONObject(input.toString());
    s.put("name",field(s,"name",90));
    if("gurps".equals(s.optString("systemId"))){
      if(!"4e".equals(s.optString("edition")))throw new IllegalArgumentException("Edição GURPS incompatível");
      JSONObject attr=s.optJSONObject("attrs");
      if(attr==null)throw new IllegalArgumentException("Atributos GURPS ausentes");
      for(String k:new String[]{"ST","DX","IQ","HT"}){
        int n=attr.optInt(k,0);if(n<1||n>100)throw new IllegalArgumentException("Atributo "+k+" inválido");
      }
      JSONObject mods=s.optJSONObject("mod");if(mods==null)mods=new JSONObject();
      int maxHP=Math.max(1,attr.getInt("ST")+mods.optInt("hp",0));
      int maxFP=Math.max(1,attr.getInt("HT")+mods.optInt("fp",0));
      for(String key:new String[]{"currentHP","currentFP"}){
        int max=key.equals("currentHP")?maxHP:maxFP;
        double value=s.optDouble(key,max);
        if(!Double.isFinite(value)||value< -max*5||value>max)
          throw new IllegalArgumentException("Recurso GURPS "+key+" inválido");
        s.put(key,value);
      }
      return s;
    }
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
      JSONObject o=new JSONObject().put("id",UUID.randomUUID().toString().replace("-","")).put("sheet",sheet(payload));
      c.getJSONArray("characters").put(o);persist();
      return new JSONObject().put("id",o.getString("id"));
    }
  }
  public JSONObject detail(String cid) throws JSONException{
    synchronized(lock){
      JSONObject data=new JSONObject(campaign(cid).toString());
      data.remove("invite");
      JSONArray players=data.getJSONArray("players");
      for(int i=0;i<players.length();i++){
        JSONObject p=players.getJSONObject(i);
        p.put("hasProposal",p.optJSONObject("proposedSheet")!=null);
        p.put("permalink",permalink(campaign(cid),p));
        p.remove("secret");
      }
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
        JSONObject s=characters.getJSONObject(i).getJSONObject("sheet");
        JSONArray effects=s.optJSONArray("effects");
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
      effects.put(new JSONObject().put("id",UUID.randomUUID().toString().replace("-","")).put("name",field(body,"name",80))
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

  private String publicId(JSONObject player){
    String tag=player.optString("shortId");
    if(tag.matches("[A-Z0-9]{5}"))return tag;
    String id=player.optString("id","").replaceAll("[^0-9a-fA-F]","");
    if(id.length()>=5)return id.substring(0,5).toUpperCase(Locale.ROOT);
    return "AGENT";
  }
  private String slug(String v){
    String s=java.text.Normalizer.normalize(v,java.text.Normalizer.Form.NFD)
      .replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+","-").replaceAll("(^-|-$)","");
    return s.length()>24?s.substring(0,24):s;
  }
  private String playerTag(JSONObject p){
    String base=p.optString("linkSlug");
    if(base.isEmpty())base=slug(p.optString("nickname","agente"));
    return base+"-"+publicId(p);
  }
  private String permalink(JSONObject campaign,JSONObject p) throws JSONException{
    return "http://"+hostIp+":"+currentPort()+"/resume/"+campaign.getString("id")+"/"+
      playerTag(p)+"/"+p.getString("secret");
  }
  private Response redirectPlayer(JSONObject c,JSONObject p) throws JSONException{
    Response r=newFixedLengthResponse(Response.Status.REDIRECT,"text/plain","");
    r.addHeader("Location","/scene/"+c.getString("id"));
    r.addHeader("Set-Cookie","rpg_guest="+p.getString("secret")+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000");
    r.addHeader("Referrer-Policy","no-referrer");
    r.addHeader("Cache-Control","no-store");
    return r;
  }
  private JSONObject checkPlayer(String cid,String token) throws JSONException{
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

  // CENARIOS 0.29: biblioteca e mapas separados do canvas privado.
  // Toda mutacao persiste no telefone anfitriao, sob chave administrativa.
  private static int gridNumber(JSONObject obj,String key,int min,int max){
    Object value=obj.opt(key);
    if(!(value instanceof Number))throw new IllegalArgumentException("Coordenada inválida: "+key);
    double number=((Number)value).doubleValue();
    if(!Double.isFinite(number)||Math.rint(number)!=number||number<min||number>max)
      throw new IllegalArgumentException("Valor fora da grade: "+key);
    return (int)number;
  }
  private static String sceneId(JSONObject obj,String key){
    String v=obj.optString(key,"");
    if(!v.matches("[A-Za-z0-9_-]{1,48}"))throw new IllegalArgumentException("Identificador inválido: "+key);
    return v;
  }
  private static String optionalSceneId(JSONObject obj,String key){
    String v=obj.optString(key,"");
    if(!v.isEmpty()&&!v.matches("[A-Za-z0-9_-]{1,48}"))throw new IllegalArgumentException("Identificador inválido");
    return v;
  }
  private static String optionalImage(JSONObject obj){
    String data=obj.optString("image","");
    if(!data.isEmpty()&&(data.length()>900000||!data.matches("data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+")))
      throw new IllegalArgumentException("Imagem inválida. Use PNG, JPEG ou WebP compactado.");
    return data;
  }
  private static JSONArray scenarioArray(JSONObject c){
    JSONArray v=c.optJSONArray("scenarios");return v==null?new JSONArray():v;
  }
  public JSONObject getScenarios(String cid) throws JSONException{
    synchronized(lock){
      JSONObject c=campaign(cid);
      return new JSONObject().put("scenarios",new JSONArray(scenarioArray(c).toString()))
        .put("assets",new JSONArray((c.optJSONArray("sceneAssets")==null?new JSONArray():c.getJSONArray("sceneAssets")).toString()))
        .put("activeScenarioId",c.optString("activeScenarioId",""));
    }
  }
  public void saveScenarios(String cid,JSONObject input) throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      JSONArray maps=input.optJSONArray("scenarios"),assets=input.optJSONArray("assets");
      if(maps==null||assets==null||maps.length()>16||assets.length()>110||input.toString().length()>5200000)
        throw new IllegalArgumentException("Biblioteca ou cenários excedem o limite");
      java.util.HashSet<String> assetIds=new java.util.HashSet<>(),mapIds=new java.util.HashSet<>();
      for(int i=0;i<assets.length();i++){
        JSONObject asset=assets.getJSONObject(i);String id=sceneId(asset,"id");
        if(!assetIds.add(id))throw new IllegalArgumentException("Asset duplicado");
        field(asset,"name",70);
        String kind=asset.optString("kind");
        if(!java.util.Arrays.asList("map","character","creature","item","object").contains(kind))
          throw new IllegalArgumentException("Tipo de asset inválido");
        if(asset.optString("emoji","").length()>8)throw new IllegalArgumentException("Ícone muito longo");
        optionalImage(asset);
      }
      for(int i=0;i<maps.length();i++){
        JSONObject map=maps.getJSONObject(i);String id=sceneId(map,"id");
        if(!mapIds.add(id))throw new IllegalArgumentException("Cenário duplicado");
        field(map,"name",80);
        int width=gridNumber(map,"width",6,60),height=gridNumber(map,"height",6,60);
        String theme=map.optString("theme","stone");
        if(!java.util.Arrays.asList("stone","forest","cavern","paper").contains(theme))
          throw new IllegalArgumentException("Tema de cenário inválido");
        String background=optionalSceneId(map,"backgroundAssetId");
        if(!background.isEmpty()&&!assetIds.contains(background))
          throw new IllegalArgumentException("Imagem de mapa não encontrada");
        JSONArray rooms=map.optJSONArray("rooms"),tokens=map.optJSONArray("tokens");
        if(rooms==null||tokens==null||rooms.length()>75||tokens.length()>250)
          throw new IllegalArgumentException("Quantidade de salas ou tokens inválida");
        java.util.HashSet<String> rids=new java.util.HashSet<>(),tids=new java.util.HashSet<>();
        for(int j=0;j<rooms.length();j++){
          JSONObject room=rooms.getJSONObject(j);
          if(!rids.add(sceneId(room,"id")))throw new IllegalArgumentException("Sala duplicada");
          field(room,"name",70);
          int x=gridNumber(room,"x",0,width-1),y=gridNumber(room,"y",0,height-1);
          int w=gridNumber(room,"w",1,width),h=gridNumber(room,"h",1,height);
          if(x+w>width||y+h>height)throw new IllegalArgumentException("Sala fora do cenário");
          if(!(room.opt("hidden") instanceof Boolean))throw new IllegalArgumentException("Visibilidade inválida");
          if(!java.util.Arrays.asList("rect","circle").contains(room.optString("shape","rect")))
            throw new IllegalArgumentException("Formato da sala inválido");
        }
        for(int j=0;j<tokens.length();j++){
          JSONObject token=tokens.getJSONObject(j);
          if(!tids.add(sceneId(token,"id")))throw new IllegalArgumentException("Token duplicado");
          field(token,"name",70);
          gridNumber(token,"x",0,width-1);gridNumber(token,"y",0,height-1);
          String asset=optionalSceneId(token,"assetId");
          if(!asset.isEmpty()&&!assetIds.contains(asset))throw new IllegalArgumentException("Asset de token ausente");
          String kind=token.optString("kind","");
          if(!java.util.Arrays.asList("character","creature","item","object").contains(kind))
            throw new IllegalArgumentException("Tipo de token inválido");
          if("creature".equals(kind)){
            // Token de criatura criado antes da v0.31: completar recursos ausentes sem apagar o mapa.
            if(!token.has("maxHp"))token.put("maxHp",Math.max(1,Math.min(100000,token.optInt("hp",1))));
            if(!token.has("hp"))token.put("hp",token.optInt("maxHp",1));
            if(!token.has("defense"))token.put("defense",0);
            int mhp=gridNumber(token,"maxHp",1,100000);
            gridNumber(token,"hp",0,mhp);
            gridNumber(token,"defense",0,1000);
            String cs=token.optString("systemId","");if(cs.length()>60)throw new IllegalArgumentException("Sistema invalido");
            String source=token.optString("source","");if(source.length()>150)throw new IllegalArgumentException("Fonte invalida");
            String notes=token.optString("notes","");if(notes.length()>2000)throw new IllegalArgumentException("Notas muito longas");
            JSONArray attacks=token.optJSONArray("attacks");
            if(attacks!=null){if(attacks.length()>25)throw new IllegalArgumentException("Muitos ataques");
              for(int k=0;k<attacks.length();k++){
                JSONObject a=attacks.getJSONObject(k);field(a,"name",70);
                if(a.optString("test").length()>60||a.optString("damage").length()>60)
                  throw new IllegalArgumentException("Rolagem da criatura invalida");
              }
            }
          }
          String pid=optionalSceneId(token,"ownerPlayerId"),ch=optionalSceneId(token,"characterId");
          if(!pid.isEmpty()){
            JSONObject p=entry(c.getJSONArray("players"),pid,"Jogador");
            if(ch.isEmpty()||!ch.equals(p.optString("characterId")))
              throw new IllegalArgumentException("Token deve pertencer à ficha atribuída ao jogador");
          }
          if(token.has("hidden")&&!(token.opt("hidden") instanceof Boolean))
            throw new IllegalArgumentException("Visibilidade inválida");
        }
      }
      String active=optionalSceneId(input,"activeScenarioId");
      if(!active.isEmpty()&&!mapIds.contains(active))throw new IllegalArgumentException("Cenário ativo não encontrado");
      c.put("sceneAssets",new JSONArray(assets.toString()))
       .put("scenarios",new JSONArray(maps.toString())).put("activeScenarioId",active);
      persist();
    }
  }
  private static boolean regionContains(JSONObject r,double x,double y){
    double rx=r.optInt("x"),ry=r.optInt("y"),rw=r.optInt("w"),rh=r.optInt("h");
    if(rw<=0||rh<=0||x<rx||x>rx+rw||y<ry||y>ry+rh)return false;
    if(!"circle".equals(r.optString("shape","rect")))return true;
    double dx=(x-(rx+rw/2.0))/(rw/2.0),dy=(y-(ry+rh/2.0))/(rh/2.0);
    return dx*dx+dy*dy<=1.0;
  }
  private static boolean covered(JSONObject map,int x,int y) throws JSONException{
    JSONArray rooms=map.optJSONArray("rooms");if(rooms==null)return false;
    for(int i=0;i<rooms.length();i++){
      JSONObject r=rooms.getJSONObject(i);
      if(r.optBoolean("hidden",false)&&regionContains(r,x+0.5,y+0.5))return true;
    }
    return false;
  }
  /** Trata nevoa diretamente sobre a imagem antes de envia-la ao navegador.
   * Ocultar so com CSS permitiria retirar a camada e revelar o mapa do mestre.
   */
  private String maskedBackground(JSONObject map,JSONObject original) {
    try {
      String data=original.optString("image","");
      JSONArray rooms=map.getJSONArray("rooms");
      String key=map.optString("id")+"|"+rooms.toString()+"|"+data.hashCode();
      if(key.equals(cachedMaskedKey))return cachedMaskedImage;
      int comma=data.indexOf(',');
      if(comma<0||comma>90)return "";
      byte[] bytes=android.util.Base64.decode(data.substring(comma+1),android.util.Base64.DEFAULT);
      android.graphics.BitmapFactory.Options check=new android.graphics.BitmapFactory.Options();
      check.inJustDecodeBounds=true;
      android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length,check);
      if(check.outWidth<1||check.outHeight<1||check.outWidth>4096||check.outHeight>4096)return "";
      android.graphics.Bitmap input=android.graphics.BitmapFactory.decodeByteArray(bytes,0,bytes.length);
      if(input==null)return "";
      android.graphics.Bitmap output=input.copy(android.graphics.Bitmap.Config.ARGB_8888,true);
      if(output==null){input.recycle();return "";}
      android.graphics.Canvas canvas=new android.graphics.Canvas(output);
      android.graphics.Paint paint=new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
      paint.setStyle(android.graphics.Paint.Style.FILL);paint.setColor(android.graphics.Color.rgb(10,10,19));
      float unitX=(float)output.getWidth()/map.optInt("width",1);
      float unitY=(float)output.getHeight()/map.optInt("height",1);
      for(int i=0;i<rooms.length();i++){
        JSONObject r=rooms.getJSONObject(i);
        if(!r.optBoolean("hidden",false))continue;
        float left=r.optInt("x")*unitX,top=r.optInt("y")*unitY;
        float right=left+r.optInt("w")*unitX,bottom=top+r.optInt("h")*unitY;
        if("circle".equals(r.optString("shape","rect"))){
          canvas.drawOval(left,top,right,bottom,paint);
        }else canvas.drawRect(left,top,right,bottom,paint);
      }
      ByteArrayOutputStream out=new ByteArrayOutputStream();
      output.compress(android.graphics.Bitmap.CompressFormat.JPEG,75,out);
      output.recycle();input.recycle();
      String masked="data:image/jpeg;base64,"+android.util.Base64.encodeToString(out.toByteArray(),android.util.Base64.NO_WRAP);
      cachedMaskedKey=key;cachedMaskedImage=masked;
      return masked;
    }catch(Exception ex){return "";}
  }
  private JSONObject activeScene(JSONObject c)throws JSONException{
    String active=c.optString("activeScenarioId","");
    JSONArray all=scenarioArray(c);
    for(int i=0;i<all.length();i++)if(active.equals(all.getJSONObject(i).optString("id")))return all.getJSONObject(i);
    return null;
  }
  public JSONObject playerScene(String cid,JSONObject player)throws JSONException{
    synchronized(lock){
      JSONObject c=campaign(cid),original=activeScene(c),response=new JSONObject()
        .put("revision",revision.get()).put("scene",JSONObject.NULL);
      if(original==null){
        response.put("character",playerInfo(cid,player).opt("character"));
        response.put("rolls",visibleRolls(c,false)).put("initiative",new JSONObject().put("round",1).put("activeId","").put("entries",new JSONArray())).put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName",""));
        return response;
      }
      JSONObject scene=new JSONObject().put("id",original.getString("id")).put("name",original.getString("name"))
        .put("width",original.getInt("width")).put("height",original.getInt("height"))
        .put("theme",original.optString("theme","stone"));
      JSONArray fog=new JSONArray(),visibleRooms=new JSONArray(),visibleTokens=new JSONArray();
      JSONArray rooms=original.getJSONArray("rooms");
      for(int i=0;i<rooms.length();i++){
        JSONObject room=rooms.getJSONObject(i);
        if(room.optBoolean("hidden",false)){
          fog.put(new JSONObject().put("x",room.getInt("x")).put("y",room.getInt("y"))
            .put("w",room.getInt("w")).put("h",room.getInt("h"))
            .put("shape",room.optString("shape","rect")));
        }else visibleRooms.put(new JSONObject().put("name",room.getString("name"))
          .put("x",room.getInt("x")).put("y",room.getInt("y")).put("w",room.getInt("w")).put("h",room.getInt("h")));
      }
      java.util.HashSet<String> allowedAssetIds=new java.util.HashSet<>();
      String background=original.optString("backgroundAssetId","");
      if(!background.isEmpty()){allowedAssetIds.add(background);scene.put("backgroundAssetId",background);}
      JSONArray tokens=original.getJSONArray("tokens");
      for(int i=0;i<tokens.length();i++){
        JSONObject t=tokens.getJSONObject(i);int x=t.getInt("x"),y=t.getInt("y");
        if(t.optBoolean("hidden",false)||covered(original,x,y))continue;
        boolean own=t.optString("ownerPlayerId").equals(player.optString("id"))&&
          !player.optString("characterId","").isEmpty()&&t.optString("characterId").equals(player.optString("characterId"));
        JSONObject visible=new JSONObject().put("id",t.getString("id")).put("name",t.getString("name"))
          .put("kind",t.getString("kind")).put("x",x).put("y",y).put("movable",own)
          .put("assetId",t.optString("assetId",""));
        if("creature".equals(t.optString("kind"))){
          visible.put("hp",t.optInt("hp",0)).put("maxHp",t.optInt("maxHp",0));
        }
        visibleTokens.put(visible);
        if(!t.optString("assetId","").isEmpty())allowedAssetIds.add(t.getString("assetId"));
      }
      JSONArray filteredAssets=new JSONArray(),allAssets=c.optJSONArray("sceneAssets");
      if(allAssets!=null)for(int i=0;i<allAssets.length();i++){
        JSONObject a=allAssets.getJSONObject(i);
        if(allowedAssetIds.contains(a.optString("id"))){
          JSONObject visible=new JSONObject(a.toString());
          if(a.optString("id").equals(background)&&fog.length()>0)
            visible.put("image",maskedBackground(original,a));
          filteredAssets.put(visible);
        }
      }
      scene.put("rooms",visibleRooms).put("fog",fog).put("tokens",visibleTokens);
      response.put("initiative",initiativeForPlayer(c,visibleTokens));
      response.put("scene",scene).put("assets",filteredAssets)
        .put("rolls",visibleRolls(c,false)).put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName",""));
      // A ficha integral do jogador e entregue apenas ao proprio titular autenticado.
      response.put("character",playerInfo(cid,player).opt("character"));
      return response;
    }
  }
  public JSONObject movePlayerToken(String cid,JSONObject player,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),map=activeScene(c);
      if(map==null)throw new IllegalArgumentException("Nenhum cenário ativo");
      String id=sceneId(input,"tokenId");
      int x=gridNumber(input,"x",0,map.getInt("width")-1),y=gridNumber(input,"y",0,map.getInt("height")-1);
      JSONObject t=entry(map.getJSONArray("tokens"),id,"Token");
      String charId=player.optString("characterId","");
      if(charId.isEmpty()||!t.optString("ownerPlayerId").equals(player.optString("id"))||
        !t.optString("characterId").equals(charId)||t.optBoolean("hidden",false))
        throw new SecurityException("Este token não pertence ao jogador");
      int oldX=t.getInt("x"),oldY=t.getInt("y");
      int steps=Math.max(Math.abs(x-oldX),Math.abs(y-oldY));
      // Não permitir atravessar salas ocultas, nem por movimentação diagonal.
      for(int step=0;step<=steps;step++){
        double p=steps==0?0:((double)step/steps);
        int sx=(int)Math.round(oldX+(x-oldX)*p),sy=(int)Math.round(oldY+(y-oldY)*p);
        if(covered(map,sx,sy))throw new IllegalArgumentException("Área ainda não revelada pelo mestre");
      }
      t.put("x",x).put("y",y);persist();
      return new JSONObject().put("ok",true).put("x",x).put("y",y).put("revision",revision.get());
    }
  }



  // Iniciativa pertence a cada campanha. Apenas o mestre modifica a ordem e o turno.
  private JSONObject initiativeData(JSONObject c)throws JSONException {
    JSONObject initiative=c.optJSONObject("initiative");
    if(initiative==null){
      initiative=new JSONObject().put("entries",new JSONArray()).put("activeId","").put("round",1);
      c.put("initiative",initiative);
    }
    return initiative;
  }
  private JSONObject initiativeForPlayer(JSONObject c,JSONArray visibleTokens)throws JSONException {
    JSONObject source=initiativeData(c),filtered=new JSONObject().put("round",source.optInt("round",1));
    JSONArray order=new JSONArray(),all=source.optJSONArray("entries");
    java.util.HashSet<String> visibleIds=new java.util.HashSet<>();
    for(int i=0;i<visibleTokens.length();i++)visibleIds.add(visibleTokens.getJSONObject(i).getString("id"));
    if(all!=null)for(int i=0;i<all.length();i++){
      JSONObject e=all.getJSONObject(i);
      if(visibleIds.contains(e.optString("tokenId")))order.put(new JSONObject(e.toString()));
    }
    String active=source.optString("activeId","");
    filtered.put("activeId",visibleIds.contains(active)?active:"").put("entries",order);
    return filtered;
  }
  public JSONObject initiativeAction(String cid,JSONObject body)throws Exception {
    synchronized(lock){
      JSONObject c=campaign(cid),map=activeScene(c);
      if(map==null)throw new IllegalArgumentException("Publique primeiro um mapa");
      JSONObject state=initiativeData(c);
      JSONArray entries=state.optJSONArray("entries");
      if(entries==null){entries=new JSONArray();state.put("entries",entries);}
      String action=body.optString("action","");
      if("reset".equals(action)){
        state.put("entries",new JSONArray()).put("round",1).put("activeId","");
      }else if("next".equals(action)){
        if(entries.length()==0)throw new IllegalArgumentException("Adicione participantes à iniciativa");
        int index=-1;
        for(int i=0;i<entries.length();i++)if(entries.getJSONObject(i).optString("tokenId").equals(state.optString("activeId")))index=i;
        int next=(index+1)%entries.length();
        if(next==0&&index>=0)state.put("round",state.optInt("round",1)+1);
        state.put("activeId",entries.getJSONObject(next).getString("tokenId"));
        advance(cid,"turn"); // Atualiza duracao dos efeitos e turno da campanha.
      }else if("roll".equals(action)||"set".equals(action)){
        String tokenId=sceneId(body,"tokenId");
        JSONObject token=entry(map.getJSONArray("tokens"),tokenId,"Token do cenário");
        int total;JSONArray faces=new JSONArray();String formula="";
        if("roll".equals(action)){
          formula=field(body,"formula",36).toLowerCase(Locale.ROOT).replace(" ","");
          java.util.regex.Matcher match=java.util.regex.Pattern.compile("([1-9]|[12][0-9]|30)d(4|6|8|10|12|20|100)([+-][0-9]{1,3})?").matcher(formula);
          if(!match.matches())throw new IllegalArgumentException("Use 1d20, 3d20+5 etc.");
          int count=Integer.parseInt(match.group(1)),die=Integer.parseInt(match.group(2));
          int bonus=match.group(3)==null?0:Integer.parseInt(match.group(3));
          if(Math.abs(bonus)>100)throw new IllegalArgumentException("Modificador excedido");
          total=bonus;int best=0,all=0;
          for(int i=0;i<count;i++){int dieResult=random.nextInt(die)+1;all+=dieResult;best=Math.max(best,dieResult);faces.put(dieResult);}
          boolean high=(die==20&&count>1&&!"sum".equals(body.optString("mode","highest")));
          total+=(high?best:all);
        }else{
          Object value=body.opt("score");
          if(!(value instanceof Number))throw new IllegalArgumentException("Informe uma iniciativa numerica");
          total=body.getInt("score");
          if(total< -1000||total>1000)throw new IllegalArgumentException("Iniciativa fora do limite");
        }
        JSONArray updated=new JSONArray();
        for(int i=0;i<entries.length();i++){
          JSONObject e=entries.getJSONObject(i);
          if(!tokenId.equals(e.optString("tokenId")))updated.put(e);
        }
        updated.put(new JSONObject().put("tokenId",tokenId).put("name",token.optString("name"))
          .put("score",total).put("faces",faces).put("formula",formula));
        java.util.ArrayList<JSONObject> sortable=new java.util.ArrayList<>();
        for(int i=0;i<updated.length();i++)sortable.add(updated.getJSONObject(i));
        sortable.sort((a,b)->{
          int v=Integer.compare(b.optInt("score"),a.optInt("score"));
          return v==0?a.optString("name").compareToIgnoreCase(b.optString("name")):v;
        });
        JSONArray sorted=new JSONArray();
        for(JSONObject item:sortable)sorted.put(item);
        state.put("entries",sorted);
        if(state.optString("activeId","").isEmpty())state.put("activeId",sorted.getJSONObject(0).getString("tokenId"));
      }else if("remove".equals(action)){
        String tokenId=sceneId(body,"tokenId");
        JSONArray retained=new JSONArray();
        for(int i=0;i<entries.length();i++){
          JSONObject e=entries.getJSONObject(i);
          if(!tokenId.equals(e.optString("tokenId")))retained.put(e);
        }
        state.put("entries",retained);
        if(tokenId.equals(state.optString("activeId")))state.put("activeId",retained.length()>0?retained.getJSONObject(0).getString("tokenId"):"");
      }else throw new IllegalArgumentException("Acao de iniciativa invalida");
      persist();
      return new JSONObject(state.toString());
    }
  }

  private JSONArray visibleRolls(JSONObject campaign,boolean isMaster)throws JSONException{
    JSONArray all=campaign.optJSONArray("tableRolls"),result=new JSONArray();
    if(all==null)return result;
    for(int i=Math.max(0,all.length()-40);i<all.length();i++){
      JSONObject r=all.getJSONObject(i);
      if(isMaster||"public".equals(r.optString("visibility")))result.put(new JSONObject(r.toString()));
    }
    return result;
  }
  /** Rolagem no servidor: o cliente nao escolhe faces, resultado ou visibilidade do dado alheio. */
  public JSONObject tableRoll(String cid,JSONObject actor,JSONObject input,boolean gm)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);String formula=field(input,"formula",36).toLowerCase(Locale.ROOT).replace(" ","");
      java.util.regex.Matcher matcher=java.util.regex.Pattern.compile("([1-9]|[12][0-9]|30)d(4|6|8|10|12|20|100)([+-][0-9]{1,3})?").matcher(formula);
      if(!matcher.matches())throw new IllegalArgumentException("Use dados como 1d20+5, 3d20 ou 2d6+2.");
      int count=Integer.parseInt(matcher.group(1)),faces=Integer.parseInt(matcher.group(2));
      int bonus=matcher.group(3)==null?0:Integer.parseInt(matcher.group(3));
      if(Math.abs(bonus)>100)throw new IllegalArgumentException("Modificador fora do limite");
      long now=System.currentTimeMillis();
      if(!gm){
        if(now-actor.optLong("lastTableRoll",0)<1200)throw new IllegalArgumentException("Espere antes da próxima rolagem");
        actor.put("lastTableRoll",now);
      }
      String label=input.optString("label","Rolagem");
      if(label.length()>70)label=label.substring(0,70);
      if(label.isEmpty())label="Rolagem";
      JSONArray values=new JSONArray();int sum=bonus,highest=0,faceSum=0;
      for(int i=0;i<count;i++){
        int value=random.nextInt(faces)+1;faceSum+=value;highest=Math.max(highest,value);values.put(value);
      }
      String mode=input.optString("mode",count>1&&faces==20?"highest":"sum");
      if(!mode.equals("sum")&&!mode.equals("highest"))throw new IllegalArgumentException("Modo de rolagem inválido");
      if(mode.equals("highest")&&faces!=20)throw new IllegalArgumentException("Maior resultado só para d20");
      sum+=mode.equals("highest")?highest:faceSum;
      String privacy=gm&&"master".equals(input.optString("visibility"))?"master":"public";
      String name=gm?"Mestre":actor.optString("nickname","Jogador");
      JSONObject result=new JSONObject().put("id",UUID.randomUUID().toString().replace("-",""))
        .put("by",name).put("label",label).put("formula",formula).put("faces",values)
        .put("bonus",bonus).put("total",sum).put("mode",mode).put("diceSum",faceSum+bonus).put("visibility",privacy).put("at",now);
      if("public".equals(privacy)){
        JSONArray logs=c.optJSONArray("tableRolls");if(logs==null){logs=new JSONArray();c.put("tableRolls",logs);}
        logs.put(result);while(logs.length()>50)logs.remove(0);
      }
      persist();
      return result;
    }
  }
  public JSONObject masterTable(String cid)throws JSONException{
    synchronized(lock){
      JSONObject c=campaign(cid),result=getScenarios(cid);
      JSONObject scene=activeScene(c);
      result.put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName"))
        .put("campaignName",c.optString("name")).put("revision",revision.get())
        .put("rolls",visibleRolls(c,true)).put("initiative",new JSONObject(initiativeData(c).toString()))
        .put("players",new JSONArray(c.getJSONArray("players").toString()))
        .put("characters",new JSONArray(c.getJSONArray("characters").toString()));
      JSONArray ps=result.getJSONArray("players");
      for(int i=0;i<ps.length();i++){ps.getJSONObject(i).remove("secret");ps.getJSONObject(i).remove("proposedSheet");}
      return result;
    }
  }
  public void masterTokenChange(String cid,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),map=activeScene(c);
      if(map==null)throw new IllegalArgumentException("Nenhum cenário publicado");
      JSONObject token=entry(map.getJSONArray("tokens"),sceneId(input,"tokenId"),"Token");
      String action=input.optString("action","");
      if(action.equals("health")){
        if(!"creature".equals(token.optString("kind")))throw new IllegalArgumentException("PV de criatura somente");
        int max=token.optInt("maxHp",0);
        if(max<1)throw new IllegalArgumentException("Criatura sem PV cadastrado");
        int delta=gridNumber(input,"delta",-100000,100000);
        token.put("hp",Math.max(0,Math.min(max,token.optInt("hp",max)+delta)));
      }else if(action.equals("move")){
        token.put("x",gridNumber(input,"x",0,map.getInt("width")-1));
        token.put("y",gridNumber(input,"y",0,map.getInt("height")-1));
      }else if(action.equals("hide")){
        if(!(input.opt("hidden") instanceof Boolean))throw new IllegalArgumentException("Visibilidade inválida");
        token.put("hidden",input.getBoolean("hidden"));
      }else throw new IllegalArgumentException("Ação do token inválida");
      persist();
    }
  }
  public void masterEffectGroup(String cid,JSONObject input)throws Exception{
    JSONArray ids=input.optJSONArray("characterIds");
    if(ids==null||ids.length()<1||ids.length()>40)throw new IllegalArgumentException("Selecione jogadores");
    // Validate every target before mutating any character.
    synchronized(lock){
      JSONObject c=campaign(cid);
      for(int i=0;i<ids.length();i++){
        String id=ids.getString(i);entry(c.getJSONArray("characters"),id,"Ficha");
      }
      for(int i=0;i<ids.length();i++)effect(cid,ids.getString(i),input);
    }
  }

  private JSONObject playerInfo(String cid,JSONObject p) throws JSONException{
    synchronized(lock){
      JSONObject c=campaign(cid),v=new JSONObject().put("campaign",c.getString("name"))
        .put("scene",c.getInt("scene")).put("sceneName",c.getString("sceneName"))
        .put("turn",c.getInt("turn")).put("nickname",p.getString("nickname"))
        .put("status",p.getString("status"))
        .put("shortId",publicId(p)).put("permalink",permalink(c,p))
        .put("revision",revision.get());
      JSONObject ch=null;String id=p.optString("characterId","");
      if(!id.isEmpty())try{ch=entry(c.getJSONArray("characters"),id,"Ficha");}catch(Exception ignored){}
      if(ch==null)v.put("character",JSONObject.NULL);
      else {
        JSONObject original=ch.getJSONObject("sheet"),pub=new JSONObject();
        for(String k:new String[]{"name","class","nex","attrs","skills","resources","photo","sheetTheme","rituaisConhecidos","origem","trilha","systemId","effects","origin","trail","inventory","items","history","description","customRolls","powers","defense","notes","edition","mod","currentHP","currentFP","hitPointsMax","hitPointsCurrent","hitPointsTemp","spellSlots","klass","ancestry","level","armorClass","features","attacks","conditions","saveProficiencies","skillProficiencies","expertise","spellcastingAbility","hitDiceUsed","inspiration","speed","pointBudget","advantages","disadvantages","quirks","techniques","weapons","spells","languages","cultures","background","concept","techLevel","portrait","settings","parrySkill","blockSkill"})
          if(original.has(k))pub.put(k,original.get(k));
        if(pub.optJSONObject("attrs")!=null && !"gurps".equals(original.optString("systemId")))
          pub.put("attrs",sanitizeAttributes(pub.getJSONObject("attrs")));
        v.put("character",pub);
      }
      return v;
    }
  }

  // Repara nomes de atributos importados por fichas antigas com textos corrompidos.
  // Nunca exibe rótulos arbitrários de comprimento excessivo na ficha do jogador.
  private JSONObject sanitizeAttributes(JSONObject original) throws JSONException {
    JSONObject clean=new JSONObject();String[] keys={"Agilidade","Força","Intelecto","Presença","Vigor"};
    for(String key:keys)if(original.has(key)){clean.put(key,original.get(key));}
    java.util.Iterator<String> it=original.keys();
    while(it.hasNext()){
      String raw=it.next();String normalized=java.text.Normalizer.normalize(raw,java.text.Normalizer.Form.NFD)
        .replaceAll("\\p{M}","").replaceAll("[^A-Za-z]","").toLowerCase(Locale.ROOT);
      for(String key:keys){
        String canonical=java.text.Normalizer.normalize(key,java.text.Normalizer.Form.NFD)
          .replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);
        if(!clean.has(key) && raw.length()<34 && normalized.startsWith(canonical.substring(0,Math.min(3,canonical.length()))))
          clean.put(key,original.get(raw));
      }
    }
    return clean;
  }
  private JSONObject playerSheet(String cid,JSONObject player) throws JSONException {
    String ref=player.optString("characterId","");
    if(ref.isEmpty())throw new IllegalArgumentException("Aguardando ficha do mestre");
    return entry(campaign(cid).getJSONArray("characters"),ref,"Ficha").getJSONObject("sheet");
  }
  private void playerProfile(String cid,JSONObject player,JSONObject body) throws Exception {
    synchronized(lock){
      if(body.length()>4)throw new IllegalArgumentException("Campos extras não permitidos");
      JSONObject sheet=playerSheet(cid,player);
      for(String name:new String[]{"history","description"}){
        if(body.has(name)){
          String v=body.optString(name,"");
          if(v.length()>12000)throw new IllegalArgumentException("Texto muito grande");
          sheet.put(name,v);
        }
      }
      if(body.has("customRolls")){
        JSONArray a=body.optJSONArray("customRolls");
        if(a==null||a.length()>25)throw new IllegalArgumentException("Limite de rolagens");
        JSONArray safe=new JSONArray();
        for(int i=0;i<a.length();i++){
          JSONObject row=a.optJSONObject(i);
          if(row==null)throw new IllegalArgumentException("Rolagem inválida");
          String label=field(row,"label",64),formula=field(row,"formula",32);
          if(!formula.matches("[1-9][0-9]?d(4|6|8|10|12|20|100)([+-][0-9]{1,3})?"))
            throw new IllegalArgumentException("Fórmula inválida");
          safe.put(new JSONObject().put("label",label).put("formula",formula));
        }
        sheet.put("customRolls",safe);
      }
      if(body.has("inventory")){
        JSONArray a=body.optJSONArray("inventory");
        if(a==null||a.length()>80||a.toString().length()>35000)throw new IllegalArgumentException("Inventário inválido");
        JSONArray out=new JSONArray();
        JSONArray existing=sheet.optJSONArray("inventory");
        if(existing==null)existing=sheet.optJSONArray("items");
        for(int i=0;i<a.length();i++){
          JSONObject row=a.optJSONObject(i);
          if(row==null)throw new IllegalArgumentException("Item inválido");
          String name=field(row,"nome",90);
          // Preserva propriedades cadastradas pelo mestre; jogador edita quantidades.
          JSONObject item=new JSONObject();
          if(existing!=null && i<existing.length()){
            JSONObject prior=existing.optJSONObject(i);
            if(prior!=null && name.equals(prior.optString("nome")))
              item=new JSONObject(prior.toString());
          }
          item.put("nome",name);
          String group=item.optString("categoriaItem",row.optString("categoriaItem","geral"));
          if(group.length()>35)throw new IllegalArgumentException("Categoria inválida");
          item.put("categoriaItem",group);
          item.put("quantidade",Math.max(0,Math.min(9999,row.optInt("quantidade",1))));
          if(!item.has("notes")){
            String desc=row.optString("notes","");
            item.put("notes",desc.substring(0,Math.min(desc.length(),300)));
          }
          out.put(item);
        }
        sheet.put("inventory",out);
      }
      persist();
    }
  }
  private void savePlayerCanvas(JSONObject player,JSONObject body) throws Exception {
    JSONArray nodes=body.optJSONArray("nodes");
    if(nodes==null||nodes.length()>150||nodes.toString().length()>80000)throw new IllegalArgumentException("Canvas inválido");
    JSONArray safe=new JSONArray();
    for(int i=0;i<nodes.length();i++){
      JSONObject node=nodes.optJSONObject(i);if(node==null)continue;
      JSONObject x=new JSONObject();
      x.put("id",field(node,"id",70));
      String title=node.optString("title","").trim(),txt=node.optString("text","");
      if(title.length()>90||txt.length()>3000)throw new IllegalArgumentException("Nota muito grande");
      x.put("title",title).put("text",txt);
      x.put("x",Math.max(-100000,Math.min(100000,node.optDouble("x",0))));
      x.put("y",Math.max(-100000,Math.min(100000,node.optDouble("y",0))));
      safe.put(x);
    }
    synchronized(lock){player.put("personalCanvas",safe);persist();}
  }
  private void storeRoll(String cid,JSONObject player,JSONObject body)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      JSONArray log=c.optJSONArray("rollLog");if(log==null){log=new JSONArray();c.put("rollLog",log);}
      JSONObject v=new JSONObject();
      v.put("nickname",player.getString("nickname"));
      v.put("name",field(body,"name",80));
      v.put("formula",field(body,"formula",60));
      String faces=body.optString("faces","");
      if(faces.length()>180||!faces.matches("[0-9, ]*"))throw new IllegalArgumentException("Resultados inválidos");
      v.put("faces",faces).put("total",body.optInt("total",0)).put("at",System.currentTimeMillis());
      log.put(v);
      while(log.length()>60)log.remove(0);
      persist();
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
    // NanoHTTPD.parseBody() pode converter postData com charset incorreto.
    // O corpo JSON precisa ser decodificado diretamente dos bytes UTF-8 do socket.
    InputStream input=s.getInputStream();
    ByteArrayOutputStream output=new ByteArrayOutputStream((int)Math.min(size,65536));
    byte[] buffer=new byte[8192];
    int remaining=(int)size;
    while(remaining>0){
      int got=input.read(buffer,0,Math.min(buffer.length,remaining));
      if(got<0)throw new IOException("Requisição incompleta");
      if(got==0)continue;
      output.write(buffer,0,got);
      remaining-=got;
    }
    java.nio.charset.CharsetDecoder decoder=StandardCharsets.UTF_8.newDecoder()
      .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
      .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT);
    String json=decoder.decode(java.nio.ByteBuffer.wrap(output.toByteArray())).toString();
    return new JSONObject(json);
  }
  // Evita qualquer conversao implicita de charset em browsers de PC ou WebView.
  // Envia os bytes UTF-8 originais inclusive para acentos e titulos.
  private Response utf8(Response.Status status,String mime,byte[] bytes){
    Response r=newFixedLengthResponse(status,mime,new ByteArrayInputStream(bytes),bytes.length);
    r.addHeader("Content-Language","pt-BR");
    r.addHeader("X-Content-Type-Options","nosniff");
    return r;
  }
  private Response response(int status,JSONObject data){
    Response.Status st=status==200?Response.Status.OK:status==201?Response.Status.CREATED:
      status==400?Response.Status.BAD_REQUEST:status==401?Response.Status.UNAUTHORIZED:
      status==403?Response.Status.FORBIDDEN:status==404?Response.Status.NOT_FOUND:
      Response.Status.INTERNAL_ERROR;
    Response r=utf8(st,"application/json; charset=UTF-8",data.toString().getBytes(StandardCharsets.UTF_8));
    r.addHeader("Cache-Control","no-store");r.addHeader("X-Content-Type-Options","nosniff");
    r.addHeader("Referrer-Policy","no-referrer");r.addHeader("X-Frame-Options","DENY");
    return r;
  }
  private Response json(int status,String key,String value){try{return response(status,new JSONObject().put(key,value));}catch(Exception e){return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,"text/plain","Erro");}}
  private Response html(String asset) throws IOException{
    byte[] buf;
    try(InputStream in=context.getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);buf=out.toByteArray();
    }
    Response r=utf8(Response.Status.OK,"text/html; charset=UTF-8",buf);
    r.addHeader("Cache-Control","no-store");r.addHeader("Referrer-Policy","no-referrer");
    r.addHeader("X-Frame-Options","DENY");r.addHeader("X-Content-Type-Options","nosniff");
    r.addHeader("Content-Security-Policy","default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    return r;
  }
  private Response sceneEditorScript()throws IOException{
    byte[] buf;
    try(InputStream in=context.getAssets().open("rpg29_scene_editor.js");ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);buf=out.toByteArray();
    }
    Response r=utf8(Response.Status.OK,"application/javascript; charset=UTF-8",buf);
    r.addHeader("Cache-Control","no-store");r.addHeader("X-Content-Type-Options","nosniff");return r;
  }
  private Response sceneEditorStyle()throws IOException{
    byte[] buf;
    try(InputStream in=context.getAssets().open("rpg30_studio.css");ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);buf=out.toByteArray();
    }
    Response r=utf8(Response.Status.OK,"text/css; charset=UTF-8",buf);
    r.addHeader("Cache-Control","no-store");r.addHeader("X-Content-Type-Options","nosniff");return r;
  }
  private Response publishedStyle(String asset)throws IOException{
    byte[] bytes;
    try(InputStream in=context.getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);bytes=out.toByteArray();
    }
    return utf8(Response.Status.OK,"text/css; charset=UTF-8",bytes);
  }
  private Response publishedScript(String asset)throws IOException{
    byte[] bytes;
    try(InputStream in=context.getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] buffer=new byte[8192];int len;while((len=in.read(buffer))!=-1)out.write(buffer,0,len);
      bytes=out.toByteArray();
    }
    Response r=utf8(Response.Status.OK,"application/javascript; charset=UTF-8",bytes);
    r.addHeader("Cache-Control","private, max-age=120");return r;
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
        if(path.equals("/scene-editor.js"))return sceneEditorScript();
        if(path.equals("/scene-editor.css"))return sceneEditorStyle();
        if(path.equals("/scene-bestiary.js"))return publishedScript("rpg19_order_creatures.js");
        if(path.equals("/table-player.js"))return publishedScript("rpg31_player_table.js");
        if(path.equals("/table-master.js"))return publishedScript("rpg31_master_table.js");
        if(path.equals("/table-master.css"))return publishedStyle("rpg31_live.css");
        if(p.length==3&&p[1].equals("scene")){
          if(checkPlayer(p[2],cookie(s,"rpg_guest"))==null)return json(403,"error","Sessão não autorizada");
          return html("lan_scene.html");
        }
        if(p.length==5&&p[1].equals("resume")){
          JSONObject c=campaign(p[2]),pl=checkPlayer(p[2],p[4]);
          if(pl==null || !equalsSecret(playerTag(pl),p[3]))
            return json(403,"error","Link pessoal inválido");
          return redirectPlayer(c,pl);
        }
        if(p.length==4&&p[1].equals("join")){
          JSONObject c=campaign(p[2]);
          if(!equalsSecret(c.getString("invite"),p[3]))return json(403,"error","Convite inválido");
          JSONObject existing=checkPlayer(p[2],cookie(s,"rpg_guest"));
          if(existing!=null)return redirectPlayer(c,existing);
          return html("lan_join.html");
        }
        if(p.length==3&&p[1].equals("play")){
          if(checkPlayer(p[2],cookie(s,"rpg_guest"))==null)return json(403,"error","Sessão não autorizada");
          JSONObject player=checkPlayer(p[2],cookie(s,"rpg_guest"));
          String ref=player.optString("characterId","");
          if(ref.isEmpty())return html("lan_player.html");
          JSONObject assigned=playerSheet(p[2],player);
          return "gurps".equals(assigned.optString("systemId"))?html("lan_gurps.html"):html("lan_player.html");
        }
        if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("scenario")){
          JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
          if(pl==null)return json(403,"error","Sessão inválida");
          return response(200,playerScene(p[3],pl));
        }
        if(p.length==6&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns")&&p[5].equals("table")){
          if(!master(s))return json(403,"error","Acesso do mestre necessário");
          return response(200,masterTable(p[4]));
        }
        if(p.length==6&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns")&&p[5].equals("scenarios")){
          if(!master(s))return json(403,"error","Acesso do mestre necessário");
          return response(200,getScenarios(p[4]));
        }
        if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("canvas")){
          JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
          if(pl==null)return json(403,"error","Sessão inválida");
          return response(200,new JSONObject().put("nodes",pl.optJSONArray("personalCanvas")==null?new JSONArray():pl.getJSONArray("personalCanvas")));
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
          JSONObject pl=new JSONObject().put("id",UUID.randomUUID().toString().replace("-","")).put("secret",newToken())
            .put("nickname",field(b,"nickname",40)).put("status","aguardando")
            .put("characterId",JSONObject.NULL).put("proposedSheet",prop==null?JSONObject.NULL:prop);
          pl.put("linkSlug",slug(prop!=null?prop.optString("name",pl.getString("nickname")):pl.getString("nickname")));
          pl.put("shortId",publicId(pl));
          players.put(pl);persist();
          Response r=response(201,new JSONObject().put("ok",true).put("campaignId",p[3])
            .put("status","aguardando").put("shortId",publicId(pl)).put("permalink",permalink(c,pl)));
          r.addHeader("Set-Cookie","rpg_guest="+pl.getString("secret")+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000");
          return r;
        }
      }
      if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("resource")&&(method.equals("PATCH")||method.equals("POST"))){
        String cid=p[3];
        synchronized(lock){
          JSONObject player=checkPlayer(cid,cookie(s,"rpg_guest"));
          if(player==null)return json(403,"error","Não autorizado");
          if(b.length()!=2||!b.has("resource")||!b.has("current"))return json(403,"error","Somente recursos atuais");
          String key=b.optString("resource");
          JSONObject ch=entry(campaign(cid).getJSONArray("characters"),player.optString("characterId"),"Ficha");
          JSONObject sheet=ch.getJSONObject("sheet");
          if("gurps".equals(sheet.optString("systemId"))){
            if(!key.equals("HP")&&!key.equals("FP"))return json(403,"error","Recurso não permitido");
            JSONObject attr=sheet.getJSONObject("attrs");
            JSONObject mods=sheet.optJSONObject("mod");if(mods==null)mods=new JSONObject();
            int max=Math.max(1,attr.getInt(key.equals("HP")?"ST":"HT")+mods.optInt(key.equals("HP")?"hp":"fp"));
            double next=b.optDouble("current",Double.NaN);
            if(!Double.isFinite(next)||next< -max*5||next>max)return json(400,"error","Fora do limite GURPS");
            sheet.put(key.equals("HP")?"currentHP":"currentFP",next);persist();
            return response(200,new JSONObject().put("current",next));
          }
          if(!key.equals("PV")&&!key.equals("PE")&&!key.equals("SAN"))
            return json(403,"error","Recurso não permitido");
          Object v=b.opt("current");
          if(!(v instanceof Number))return json(400,"error","Valor inválido");
          double next=((Number)v).doubleValue();if(!Double.isFinite(next))return json(400,"error","Valor inválido");
          JSONObject res=sheet.getJSONObject("resources").getJSONObject(key);
          if(next<0||next>res.getDouble("max"))return json(400,"error","Fora do limite");
          res.put("current",next);persist();
          return response(200,new JSONObject().put("current",next));
        }
      }
      if(p.length==6&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("scenario")&&p[5].equals("move")&&method.equals("POST")){
        JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
        if(pl==null)return json(403,"error","Sessão inválida");
        try{return response(200,movePlayerToken(p[3],pl,b));}
        catch(SecurityException denied){return json(403,"error","Você só pode mover seu personagem");}
      }
      if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("table-roll")&&method.equals("POST")){
        JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
        if(pl==null)return json(403,"error","Sessão inválida");
        return response(200,tableRoll(p[3],pl,b,false));
      }
      if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&method.equals("POST")){
        String cid=p[3];JSONObject player=checkPlayer(cid,cookie(s,"rpg_guest"));
        if(player==null)return json(403,"error","Jogador não autorizado");
        if("profile".equals(p[4])){playerProfile(cid,player,b);return json(200,"ok","true");}
        if("canvas".equals(p[4])){savePlayerCanvas(player,b);return json(200,"ok","true");}
        if("roll".equals(p[4])){storeRoll(cid,player,b);return json(200,"ok","true");}
      }
      if(p.length>=5&&p[1].equals("api")&&p[2].equals("admin")&&p[3].equals("campaigns")){
        if(!master(s))return json(403,"error","Chave do mestre inválida");
        String cid=p[4];
        if(p.length==6&&p[5].equals("characters")&&method.equals("POST"))
          return response(201,addSheet(cid,b.getJSONObject("sheet")));
        if(p.length==7&&p[5].equals("characters")&&(method.equals("PUT")||method.equals("POST"))){
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
        if(p.length==6&&p[5].equals("initiative")&&method.equals("POST"))
          return response(200,initiativeAction(cid,b));
        if(p.length==6&&p[5].equals("table-roll")&&method.equals("POST"))
          return response(200,tableRoll(cid,null,b,true));
        if(p.length==6&&p[5].equals("token")&&method.equals("POST")){
          masterTokenChange(cid,b);return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("effects-group")&&method.equals("POST")){
          masterEffectGroup(cid,b);return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("effects")&&method.equals("POST")){
          effect(cid,b.getString("characterId"),b);return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("scenarios")&&method.equals("POST")){
          saveScenarios(cid,b);return json(200,"ok","true");
        }
        if(p.length==6&&p[5].equals("canvas")&&(method.equals("PUT")||method.equals("POST"))){
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
