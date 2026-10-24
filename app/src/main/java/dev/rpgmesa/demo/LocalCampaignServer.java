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
      // Replace only after the complete new file is durable. Never delete the old database first.
      java.nio.file.Files.move(tmp.toPath(),database.toPath(),
        java.nio.file.StandardCopyOption.ATOMIC_MOVE,java.nio.file.StandardCopyOption.REPLACE_EXISTING);
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
        .put("turn",1).put("sessionMode","combat").put("players",new JSONArray()).put("characters",new JSONArray())
        .put("canvas",new JSONArray());
      campaigns.put(c);persist();
      return new JSONObject().put("id",c.getString("id")).put("name",name).put("invite",invite(c));
    }
  }
  /** Session mode is campaign-scoped, independent from initiative and scene storage. */
  private static String sessionMode(JSONObject campaign){
    return "interlude".equals(campaign.optString("sessionMode","combat"))?"interlude":"combat";
  }
  public JSONObject setSessionMode(String cid,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      String mode=input.optString("mode","");
      if(input.length()!=1||(!"interlude".equals(mode)&&!"combat".equals(mode)))
        throw new IllegalArgumentException("Selecione Combate ou Interlúdio.");
      if(!mode.equals(sessionMode(c))){
        c.put("sessionMode",mode);
        c.put("bonusActions",new JSONObject());c.put("bonusTurns",new JSONObject());
        JSONArray pending=pendingRequests(c);
        for(int i=0;i<pending.length();i++){
          JSONObject req=pending.getJSONObject(i);
          if(!"class".equals(req.optString("type"))&&!"transcend".equals(req.optString("type")))req.put("turnStamp",-1);
        }
        // Movement allowance applies only during combat, and resets on each transition.
        // Initiative entries/order are retained intact for returning to combat.
        c.put("movementSpent",new JSONObject());
        persist();
      }
      return new JSONObject().put("mode",sessionMode(c))
        .put("initiativePreserved",true).put("movementUnlimited","interlude".equals(sessionMode(c)));
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
      data.put("sessionMode",sessionMode(campaign(cid)));
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
      ensurePlayerTokens(c);
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
      if(kind.equals("turn")){
        if("interlude".equals(sessionMode(c)))throw new IllegalArgumentException("A rodada fica pausada durante o interlúdio.");
        c.put("turn",c.getInt("turn")+1);
      }
      else if(kind.equals("scene")){
        c.put("scene",c.getInt("scene")+1);c.put("turn",1);c.put("sceneName","Cena "+c.getInt("scene"));
        // Uma nova cena tem sua propria ordem de iniciativa.
        c.put("initiative",new JSONObject().put("entries",new JSONArray()).put("activeId","").put("round",1));
      }
      else throw new IllegalArgumentException("Evento desconhecido");
      c.put("movementSpent",new JSONObject());
      c.put("bonusActions",new JSONObject());
      if(kind.equals("scene")){
        c.put("surtoUsage",new JSONObject());c.put("bonusTurns",new JSONObject());
      }
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
      // Modificadores opcionais da Mestragem antiga, agora com validação do servidor.
      String stat=body.optString("stat","");
      if(!stat.isEmpty()&&!java.util.Arrays.asList("defesa","ataque","pericias").contains(stat))
        throw new IllegalArgumentException("Característica inválida");
      int amount=0;
      if(!stat.isEmpty()){
        if(!(body.opt("amount") instanceof Number))throw new IllegalArgumentException("Modificador numérico obrigatório");
        amount=body.getInt("amount");
        if(amount< -20||amount>20)throw new IllegalArgumentException("Modificador fora de -20 a 20");
      }
      effects.put(new JSONObject().put("id",UUID.randomUUID().toString().replace("-","")).put("name",field(body,"name",80))
       .put("unit",unit).put("remaining",unit.equals("turn")?rem:JSONObject.NULL)
       .put("stat",stat).put("amount",amount)
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
        // v0.68: validate added painting layers without rewriting old campaign maps.
        JSONObject paintLayers=map.optJSONObject("layers");
        if(map.has("layers")&&paintLayers==null)throw new IllegalArgumentException("Camadas do mapa inválidas");
        if(paintLayers!=null){
          for(String layer:new String[]{"terrain","props","walls"}){
            JSONArray marks=paintLayers.optJSONArray(layer);
            if(paintLayers.has(layer)&&marks==null)throw new IllegalArgumentException("Camada inválida: "+layer);
            if(marks==null)continue;
            if(marks.length()> ("walls".equals(layer)?720:3600))throw new IllegalArgumentException("Camada de mapa excede o limite");
            java.util.HashSet<String> placements=new java.util.HashSet<>();
            for(int t=0;t<marks.length();t++){
              JSONObject mark=marks.getJSONObject(t);
              int mx=gridNumber(mark,"x",0,width-1),my=gridNumber(mark,"y",0,height-1);
              if("walls".equals(layer)){
                String side=mark.optString("side",""),kind=mark.optString("kind","");
                if(!java.util.Arrays.asList("n","s","e","w").contains(side)||!java.util.Arrays.asList("wall","door").contains(kind))
                  throw new IllegalArgumentException("Parede ou porta inválida");
                if(mark.has("open")&&!(mark.opt("open") instanceof Boolean))throw new IllegalArgumentException("Estado da porta inválido");
                if(!placements.add(mx+":"+my+":"+side))throw new IllegalArgumentException("Parede duplicada");
              }else{
                String code=mark.optString("id","");
                if(!code.matches("[a-z][a-z0-9-]{1,39}"))throw new IllegalArgumentException("Asset de pintura inválido");
                if(!placements.add(mx+":"+my))throw new IllegalArgumentException("Pintura duplicada na mesma célula");
              }
            }
          }
        }
        // 0.69: strict limits on user-created light/fog data, no arbitrary HTML or colors.
        JSONObject atmosphere=map.optJSONObject("atmosphere");
        if(map.has("atmosphere")&&atmosphere==null)throw new IllegalArgumentException("Atmosfera inválida");
        if(atmosphere!=null){
          if(!java.util.Arrays.asList("day","dusk","night","dark","mist","paranormal").contains(atmosphere.optString("mode","day")))
            throw new IllegalArgumentException("Modo de iluminação inválido");
          if(!java.util.Arrays.asList("economy","balanced","high").contains(atmosphere.optString("quality","balanced")))
            throw new IllegalArgumentException("Qualidade de iluminação inválida");
          for(String key:new String[]{"enabled","fogOfWar","doorShadows"})if(atmosphere.has(key)&&!(atmosphere.opt(key) instanceof Boolean))
            throw new IllegalArgumentException("Estado de atmosfera inválido");
          for(String key:new String[]{"ambient","fogDensity"})if(atmosphere.has(key)){
            double v=atmosphere.optDouble(key,Double.NaN);
            if(!Double.isFinite(v)||v<0||v>1)throw new IllegalArgumentException("Densidade de atmosfera inválida");
          }
          if(atmosphere.has("fogSpeed")){
            double v=atmosphere.optDouble("fogSpeed",Double.NaN);
            if(!Double.isFinite(v)||v<0||v>3)throw new IllegalArgumentException("Velocidade de névoa inválida");
          }
          if(atmosphere.has("visionRadius"))gridNumber(atmosphere,"visionRadius",1,20);
          if(!atmosphere.optString("fogColor","#a9c2ba").matches("#[0-9a-fA-F]{6}"))
            throw new IllegalArgumentException("Cor da névoa inválida");
        }
        JSONArray lights=map.optJSONArray("lights");
        if(map.has("lights")&&lights==null)throw new IllegalArgumentException("Lista de luzes inválida");
        if(lights!=null){
          if(lights.length()>20)throw new IllegalArgumentException("Máximo de 20 luzes por cenário");
          java.util.HashSet<String> lightIds=new java.util.HashSet<>();
          for(int li=0;li<lights.length();li++){
            JSONObject light=lights.getJSONObject(li);String lightId=sceneId(light,"id");
            if(!lightIds.add(lightId))throw new IllegalArgumentException("Luz duplicada");
            gridNumber(light,"x",0,width-1);gridNumber(light,"y",0,height-1);
            double r=light.optDouble("radius",Double.NaN),intensity=light.optDouble("intensity",Double.NaN);
            if(!Double.isFinite(r)||r<1||r>20||!Double.isFinite(intensity)||intensity<0||intensity>1)
              throw new IllegalArgumentException("Alcance/intensidade inválidos");
            if(!light.optString("color","#ffc982").matches("#[0-9a-fA-F]{6}"))
              throw new IllegalArgumentException("Cor da luz inválida");
            if(!java.util.Arrays.asList("torch","lantern","magic","cold").contains(light.optString("type","torch")))
              throw new IllegalArgumentException("Tipo de luz inválido");
            for(String key:new String[]{"enabled","flicker"})if(light.has(key)&&!(light.opt(key) instanceof Boolean))
              throw new IllegalArgumentException("Configuração de luz inválida");
          }
        }
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
          if(!java.util.Arrays.asList("shadow","dark","mist","void").contains(room.optString("fogStyle","shadow")))
            throw new IllegalArgumentException("Estilo de ocultação inválido");
          if(room.has("intensity"))gridNumber(room,"intensity",0,100);
        }
        for(int j=0;j<tokens.length();j++){
          JSONObject token=tokens.getJSONObject(j);
          if(!tids.add(sceneId(token,"id")))throw new IllegalArgumentException("Token duplicado");
          field(token,"name",70);
          gridNumber(token,"x",0,width-1);gridNumber(token,"y",0,height-1);
          if(token.has("movementSquares"))gridNumber(token,"movementSquares",0,60);
          if(token.has("rotation"))gridNumber(token,"rotation",0,359);
          if(token.has("flashlight")&&!(token.opt("flashlight") instanceof Boolean))throw new IllegalArgumentException("Lanterna inválida");
          if(token.has("flashlightRadius"))gridNumber(token,"flashlightRadius",1,15);
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
      ensurePlayerTokens(c);
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

  // Crossing a closed wall/door prevents vision. Canonical boundary IDs allow
  // either adjacent cell to contribute the same segment.
  private static String edgeKey(int x,int y,int nx,int ny){
    if(x!=nx)return "V:"+Math.max(x,nx)+":"+y;
    return "H:"+x+":"+Math.max(y,ny);
  }
  private static java.util.HashSet<String> opaqueBoundaries(JSONObject map){
    java.util.HashSet<String> edges=new java.util.HashSet<>();
    JSONObject layers=map.optJSONObject("layers");JSONArray marks=layers==null?null:layers.optJSONArray("walls");
    if(marks==null)return edges;
    for(int i=0;i<marks.length();i++){
      JSONObject m=marks.optJSONObject(i);if(m==null)continue;
      if("door".equals(m.optString("kind"))&&m.optBoolean("open",false))continue;
      int x=m.optInt("x",-1),y=m.optInt("y",-1);String side=m.optString("side","");
      if(x<0||y<0)continue;
      if("n".equals(side))edges.add("H:"+x+":"+y);
      if("s".equals(side))edges.add("H:"+x+":"+(y+1));
      if("w".equals(side))edges.add("V:"+x+":"+y);
      if("e".equals(side))edges.add("V:"+(x+1)+":"+y);
    }
    return edges;
  }
  private static boolean canSeeThrough(java.util.Set<String> edges,double ax,double ay,double bx,double by){
    int steps=(int)Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay))*9);
    if(steps<1)return true;
    int prevX=(int)Math.floor(ax),prevY=(int)Math.floor(ay);
    for(int i=1;i<=steps;i++){
      double t=i/(double)steps;int x=(int)Math.floor(ax+(bx-ax)*t),y=(int)Math.floor(ay+(by-ay)*t);
      if(x!=prevX||y!=prevY){
        if(x!=prevX){
          if(edges.contains(edgeKey(prevX,prevY,x,prevY)))return false;
          if(y!=prevY&&edges.contains(edgeKey(prevX,y,x,y)))return false;
        }
        if(y!=prevY){
          if(edges.contains(edgeKey(prevX,prevY,prevX,y)))return false;
          if(x!=prevX&&edges.contains(edgeKey(x,prevY,x,y)))return false;
        }
      }
      prevX=x;prevY=y;
    }
    return true;
  }
  // v0.75: outside is daylit. Only cells fully isolated by CLOSED wall/door
  // edges belong to automatically shadowed rooms. No radial all-map blackout.
  private static java.util.HashSet<Integer> closedUnlitRooms(JSONObject map){
    java.util.HashSet<Integer> result=new java.util.HashSet<>();
    int width=map.optInt("width",0),height=map.optInt("height",0);
    if(width<1||height<1||width*height>10000)return result;
    java.util.HashSet<String> closed=opaqueBoundaries(map);
    if(closed.isEmpty())return result;
    final int count=width*height;
    boolean[] outside=new boolean[count];int[] queue=new int[count],head=0,tail=0;
    for(int y=0;y<height;y++)for(int x=0;x<width;x++){
      boolean exit=(x==0&&!closed.contains("V:0:"+y))||
        (x==width-1&&!closed.contains("V:"+width+":"+y))||
        (y==0&&!closed.contains("H:"+x+":0"))||
        (y==height-1&&!closed.contains("H:"+x+":"+height));
      int id=y*width+x;
      if(exit&&!outside[id]){outside[id]=true;queue[tail++]=id;}
    }
    while(head<tail){
      int id=queue[head++],x=id%width,y=id/width;
      for(int dir=0;dir<4;dir++){
        int nx=x+(dir==0?-1:dir==1?1:0),ny=y+(dir==2?-1:dir==3?1:0);
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        int next=ny*width+nx;
        if(outside[next]||closed.contains(edgeKey(x,y,nx,ny)))continue;
        outside[next]=true;queue[tail++]=next;
      }
    }
    for(int i=0;i<count;i++)if(!outside[i])result.add(i);
    // Defend against an accidental entire-map blackout from imported perimeter lines.
    if(result.size()>count*.65)result.clear();
    return result;
  }
  private static boolean roomVisible(JSONObject room,java.util.Set<Integer> cells,int width){
    int x=room.optInt("x"),y=room.optInt("y"),w=room.optInt("w"),h=room.optInt("h");
    for(int cy=y;cy<y+h;cy++)for(int cx=x;cx<x+w;cx++)if(cells.contains(cy*width+cx))return true;
    return false;
  }
  // v0.73 — only actual inventory/known light equipment authorizes player illumination.
  private static String normalizedLightName(String input){
    return java.text.Normalizer.normalize(input==null?"":input,java.text.Normalizer.Form.NFD)
      .replaceAll("\\p{M}+","").toLowerCase(java.util.Locale.ROOT).trim();
  }
  private static String lightType(String itemName){
    String name=normalizedLightName(itemName);
    if(name.matches(".*\\b(lanterna|flashlight|lantern|lampiao|lampada|lamp)\\b.*"))return "lantern";
    if(name.matches(".*\\b(tocha|torch|archote|candeia|vela|candle)\\b.*"))return "torch";
    if(name.matches("^(luz|light|luz magica|luz arcana|produce flame|produzir chamas)$"))return "magic";
    return "";
  }
  private static String lightFromCollection(Object collection){
    if(!(collection instanceof JSONArray))return "";
    String found="";
    JSONArray items=(JSONArray)collection;
    for(int i=0;i<items.length()&&i<300;i++){
      Object raw=items.opt(i);String itemName="";
      if(raw instanceof String)itemName=(String)raw;
      else if(raw instanceof JSONObject){
        JSONObject entry=(JSONObject)raw;
        if(entry.has("quantidade")&&entry.optInt("quantidade",0)<=0)continue;
        if(entry.has("quantity")&&entry.optInt("quantity",0)<=0)continue;
        if(entry.has("qty")&&entry.optInt("qty",0)<=0)continue;
        if(entry.optBoolean("broken",false)||entry.optBoolean("consumed",false))continue;
        itemName=entry.optString("nome",entry.optString("name",entry.optString("title",entry.optString("item",""))));
      }
      String kind=lightType(itemName);
      if("lantern".equals(kind))return "lantern";
      if("torch".equals(kind))found="torch";
      else if("magic".equals(kind)&&found.isEmpty())found="magic";
    }
    return found;
  }
  private static String lightEquipment(JSONObject character){
    if(character==null)return "";
    for(String key:new String[]{"inventory","items","weapons","equipment"}){
      String kind=lightFromCollection(character.opt(key));
      if(!kind.isEmpty())return kind;
    }
    // Magical light must be explicitly learned/prepared, not inferred from a class.
    for(String key:new String[]{"spells","rituaisConhecidos"}){
      String kind=lightFromCollection(character.opt(key));
      if("magic".equals(kind))return "magic";
    }
    return "";
  }
  private JSONObject sheetForLight(JSONObject campaign,JSONObject token){
    String characterId=token.optString("characterId","");
    if(characterId.isEmpty())return null;
    JSONArray chars=campaign.optJSONArray("characters");
    if(chars==null)return null;
    for(int i=0;i<chars.length();i++){
      JSONObject item=chars.optJSONObject(i);
      if(item!=null&&characterId.equals(item.optString("id","")))return item.optJSONObject("sheet");
    }
    return null;
  }
  private String validTokenLight(JSONObject campaign,JSONObject token){
    if(token.optString("ownerPlayerId","").isEmpty())return token.optBoolean("flashlight",false)?"lantern":"";
    return lightEquipment(sheetForLight(campaign,token));
  }
  // v0.72: lighting belongs to drawn areas, never to the whole map. 0 degrees = east.
  private static double fade(double x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
  private static double angleSeparation(double a,double b){
    double diff=Math.atan2(Math.sin(a-b),Math.cos(a-b));return Math.abs(diff);
  }
  private static JSONArray areaEntrances(JSONObject scene,JSONObject region)throws JSONException{
    JSONArray points=new JSONArray();
    JSONObject layer=scene.optJSONObject("layers");
    JSONArray marks=layer==null?null:layer.optJSONArray("walls");
    if(marks==null)return points;
    double rx=region.optInt("x"),ry=region.optInt("y"),rw=region.optInt("w"),rh=region.optInt("h");
    for(int i=0;i<marks.length()&&points.length()<20;i++){
      JSONObject door=marks.optJSONObject(i);
      if(door==null||!"door".equals(door.optString("kind"))||!door.optBoolean("open",false))continue;
      double x=door.optInt("x"),y=door.optInt("y");String side=door.optString("side");
      if("n".equals(side))x+=.5;
      else if("s".equals(side)){x+=.5;y++;}
      else if("w".equals(side))y+=.5;
      else if("e".equals(side)){x++;y+=.5;}
      else continue;
      boolean onBoundary=((Math.abs(x-rx)<.05||Math.abs(x-rx-rw)<.05)&&y>=ry&&y<=ry+rh)||
        ((Math.abs(y-ry)<.05||Math.abs(y-ry-rh)<.05)&&x>=rx&&x<=rx+rw);
      if(!onBoundary)continue;
      points.put(new JSONObject().put("x",x).put("y",y));
    }
    return points;
  }
  private static double areaLightAt(double x,double y,JSONArray doors,JSONArray tokens,java.util.Set<String> blockers)throws JSONException {
    double result=0;
    for(int i=0;i<doors.length();i++){
      JSONObject d=doors.getJSONObject(i);
      double dist=Math.hypot(x-d.optDouble("x"),y-d.optDouble("y"));
      result=Math.max(result,.92*(1-fade(dist/3.9)));
    }
    for(int i=0;i<tokens.length();i++){
      JSONObject token=tokens.getJSONObject(i);
      if(!token.optBoolean("flashlight",false)||token.optBoolean("hidden",false))continue;
      double tx=token.optDouble("x")+.5,ty=token.optDouble("y")+.5;
      double dx=x-tx,dy=y-ty,dist=Math.hypot(dx,dy);
      double radius=Math.max(1,Math.min(15,token.optInt("flashlightRadius",8)));
      if(dist>radius||!canSeeThrough(blockers,tx,ty,x,y))continue;
      String type=token.optString("lightKind","lantern");
      if("torch".equals(type)||"magic".equals(type)){
        // Torch and carried light radiate in a 3-square circle; rotation is irrelevant.
        result=Math.max(result,(1-fade(dist/3.0))*.99);
      }else{
        double rotation=Math.toRadians(token.optDouble("rotation",0));
        double dAngle=angleSeparation(Math.atan2(dy,dx),rotation);
        double angular=1-fade((dAngle-.38)/.18);
        double beam=Math.pow(1-fade(dist/radius),.68)*angular*.99;
        double halo=(1-fade(dist/.90))*.65;
        result=Math.max(result,Math.max(beam,halo));
      }
    }
    return Math.max(0,Math.min(1,result));
  }
  private static boolean inOccludedArea(JSONObject area,int x,int y){
    return area.optBoolean("hidden",false)&&area.optInt("intensity",100)>0&&regionContains(area,x+.5,y+.5);
  }
  private static int areaOpacity(JSONObject scene,int x,int y){
    int opacity=0;JSONArray rooms=scene.optJSONArray("rooms");if(rooms==null)return 0;
    for(int i=0;i<rooms.length();i++){
      JSONObject a=rooms.optJSONObject(i);if(a!=null&&inOccludedArea(a,x,y))
        opacity=Math.max(opacity,Math.max(0,Math.min(100,a.optInt("intensity",100))));
    }
    return opacity;
  }
  private static void addAutomaticShadows(JSONObject scene,java.util.Set<Integer> isolated,
      JSONArray lights,java.util.Set<String> blockers,JSONArray fog,java.util.HashMap<Integer,Integer> power)throws JSONException{
    if(isolated.isEmpty())return;
    int w=scene.optInt("width"),h=scene.optInt("height");
    java.util.HashSet<Integer> pending=new java.util.HashSet<>(isolated);
    while(!pending.isEmpty()){
      int start=pending.iterator().next();
      java.util.ArrayDeque<Integer> queue=new java.util.ArrayDeque<>();
      java.util.ArrayList<Integer> component=new java.util.ArrayList<>();
      pending.remove(start);queue.add(start);
      int minX=w,minY=h,maxX=0,maxY=0;
      while(!queue.isEmpty()){
        int cell=queue.removeFirst(),x=cell%w,y=cell/w;component.add(cell);
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
        for(int dir=0;dir<4;dir++){
          int nx=x+(dir==0?-1:dir==1?1:0),ny=y+(dir==2?-1:dir==3?1:0);
          int ni=ny*w+nx;
          if(nx<0||ny<0||nx>=w||ny>=h||!pending.contains(ni)||blockers.contains(edgeKey(x,y,nx,ny)))continue;
          pending.remove(ni);queue.addLast(ni);
        }
      }
      JSONArray selected=new JSONArray(),lightCells=new JSONArray();
      for(int cell:component){
        int x=cell%w,y=cell/w;
        selected.put(cell);
        int illumination=(int)Math.round(areaLightAt(x+.5,y+.5,new JSONArray(),lights,blockers)*100);
        if(illumination>1){
          lightCells.put(new JSONObject().put("x",x).put("y",y).put("power",illumination));
          power.put(cell,Math.max(power.getOrDefault(cell,0),illumination));
        }
      }
      fog.put(new JSONObject().put("x",minX).put("y",minY)
        .put("w",maxX-minX+1).put("h",maxY-minY+1).put("shape","cells")
        .put("gridWidth",w).put("cells",selected).put("hidden",true)
        .put("intensity",100).put("fogStyle","dark").put("lightCells",lightCells));
    }
  }
  private java.util.HashMap<Integer,Integer> illuminatedCells(JSONObject campaign,JSONObject scene,JSONArray safeFog,java.util.Set<Integer> automatic)throws JSONException{
    java.util.HashMap<Integer,Integer> value=new java.util.HashMap<>();
    JSONArray rooms=scene.optJSONArray("rooms"),tokens=scene.optJSONArray("tokens");
    if(rooms==null||tokens==null)return value;
    JSONArray permitted=new JSONArray();
    for(int i=0;i<tokens.length();i++){
      JSONObject original=tokens.optJSONObject(i);
      if(original==null||!original.optBoolean("flashlight",false))continue;
      String light=validTokenLight(campaign,original);
      if(light.isEmpty())continue;
      JSONObject safe=new JSONObject(original.toString());
      safe.put("lightKind",light).put("flashlightRadius","lantern".equals(light)?8:3);
      permitted.put(safe);
    }
    java.util.Set<String> blockers=opaqueBoundaries(scene);
    int width=scene.optInt("width",1),height=scene.optInt("height",1);
    for(int i=0;i<rooms.length();i++){
      JSONObject room=rooms.getJSONObject(i);
      if(!room.optBoolean("hidden",false)||room.optInt("intensity",100)<=0)continue;
      JSONArray doors=areaEntrances(scene,room),lights=new JSONArray();
      int x0=Math.max(0,room.optInt("x")),y0=Math.max(0,room.optInt("y"));
      int x1=Math.min(width,x0+room.optInt("w")),y1=Math.min(height,y0+room.optInt("h"));
      for(int y=y0;y<y1;y++)for(int x=x0;x<x1;x++){
        if(!regionContains(room,x+.5,y+.5))continue;
        int power=(int)Math.round(areaLightAt(x+.5,y+.5,doors,permitted,blockers)*100);
        if(power<=1)continue;
        lights.put(new JSONObject().put("x",x).put("y",y).put("power",power));
        int idx=y*width+x;value.put(idx,Math.max(value.getOrDefault(idx,0),power));
      }
      safeFog.put(new JSONObject().put("x",room.optInt("x")).put("y",room.optInt("y"))
        .put("w",room.optInt("w")).put("h",room.optInt("h")).put("shape",room.optString("shape","rect"))
        .put("fogStyle",room.optString("fogStyle","mist"))
        .put("intensity",room.optInt("intensity",100))
        .put("entrances",doors).put("lightCells",lights));
    }
    addAutomaticShadows(scene,automatic,permitted,blockers,safeFog,value);
    return value;
  }
  private static boolean isVisibleInFog(JSONObject map,int x,int y,java.util.Map<Integer,Integer> illuminated,java.util.Set<Integer> automatic){
    int cell=y*map.optInt("width",1)+x;
    int intensity=Math.max(areaOpacity(map,x,y),automatic.contains(cell)?100:0);
    return intensity<=35||illuminated.getOrDefault(cell,0)>=38;
  }
  private static boolean covered(JSONObject map,int x,int y) throws JSONException{
    JSONArray rooms=map.optJSONArray("rooms");if(rooms==null)return false;
    for(int i=0;i<rooms.length();i++){
      JSONObject r=rooms.getJSONObject(i);
      if(r.optBoolean("hidden",false)&&r.optInt("intensity",100)>0&&regionContains(r,x+0.5,y+0.5))return true;
    }
    return false;
  }
  /** Trata nevoa diretamente sobre a imagem antes de envia-la ao navegador.
   * Ocultar so com CSS permitiria retirar a camada e revelar o mapa do mestre.
   */
  private String maskedBackground(JSONObject map,JSONObject original,java.util.Set<Integer> vision,
      java.util.Map<Integer,Integer> exposed,java.util.Set<Integer> automatic) {
    try {
      String data=original.optString("image","");
      JSONArray rooms=map.getJSONArray("rooms");
      String key=map.optString("id")+"|"+rooms.toString()+"|"+data.hashCode()+"|"+
          (vision==null?"open":new java.util.TreeSet<Integer>(vision).toString())+"|"+new java.util.TreeMap<Integer,Integer>(exposed).toString()+"|"+
          (map.optJSONObject("layers")==null?"":map.optJSONObject("layers").optJSONArray("walls"))+"|"+
          new java.util.TreeSet<Integer>(automatic).toString();
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
      if(vision!=null){
        int mw=Math.max(1,map.optInt("width",1)),mh=Math.max(1,map.optInt("height",1));
        for(int cy=0;cy<mh;cy++)for(int cx=0;cx<mw;cx++){
          if(vision.contains(cy*mw+cx))continue;
          canvas.drawRect(cx*unitX,cy*unitY,(cx+1)*unitX+.3f,(cy+1)*unitY+.3f,paint);
        }
      }
      int mw=Math.max(1,map.optInt("width",1)),mh=Math.max(1,map.optInt("height",1));
      for(int i=0;i<rooms.length();i++){
        JSONObject r=rooms.getJSONObject(i);
        if(!r.optBoolean("hidden",false)||r.optInt("intensity",100)==0)continue;
        int left=r.optInt("x"),top=r.optInt("y"),right=Math.min(mw,left+r.optInt("w")),bottom=Math.min(mh,top+r.optInt("h"));
        canvas.save();
        if("circle".equals(r.optString("shape","rect"))){
          android.graphics.Path clip=new android.graphics.Path();
          clip.addOval(left*unitX,top*unitY,right*unitX,bottom*unitY,android.graphics.Path.Direction.CW);
          canvas.clipPath(clip);
        }
        for(int y=top;y<bottom;y++)for(int x=left;x<right;x++){
          if(!regionContains(r,x+.5,y+.5))continue;
          int lit=exposed.getOrDefault(y*mw+x,0);
          int alpha=Math.round(255f*(r.optInt("intensity",100)/100f)*(1f-.985f*lit/100f));
          paint.setAlpha(Math.max(0,Math.min(255,alpha)));
          canvas.drawRect(x*unitX,y*unitY,(x+1)*unitX+.4f,(y+1)*unitY+.4f,paint);
        }
        canvas.restore();
      }
      paint.setAlpha(255);
      for(int cell:automatic){
        int x=cell%mw,y=cell/mw;
        int exposure=exposed.getOrDefault(cell,0);
        int alpha=Math.round(255f*(1f-.985f*exposure/100f));
        paint.setAlpha(Math.max(0,Math.min(255,alpha)));
        canvas.drawRect(x*unitX,y*unitY,(x+1)*unitX+.4f,(y+1)*unitY+.4f,paint);
      }
      paint.setAlpha(255);
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
  /**
   * Um personagem atribuido tem automaticamente um token controlavel no mapa ativo.
   * Nunca cria tokens em salas ocultas; respeita a posicao de tokens ja existentes.
   * Executado na atribuicao, publicacao e durante migracao de campanhas antigas.
   */
  private boolean ensurePlayerTokens(JSONObject c)throws JSONException {
    JSONObject map=activeScene(c);
    if(map==null)return false;
    JSONArray tokens=map.optJSONArray("tokens"),players=c.optJSONArray("players");
    if(tokens==null||players==null)return false;
    boolean changed=false;
    // Limpa controle obsoleto de fichas que foram desatribuidas ou trocadas.
    for(int i=0;i<tokens.length();i++){
      JSONObject t=tokens.getJSONObject(i);
      String owner=t.optString("ownerPlayerId","");
      if(owner.isEmpty())continue;
      JSONObject player=null;
      for(int p=0;p<players.length();p++){
        JSONObject candidate=players.getJSONObject(p);
        if(owner.equals(candidate.optString("id"))){player=candidate;break;}
      }
      if(player==null||player.optString("characterId","").isEmpty()||
        !player.optString("characterId","").equals(t.optString("characterId",""))){
        t.put("ownerPlayerId","").put("characterId","");changed=true;
      }
    }
    int width=map.optInt("width",0),height=map.optInt("height",0);
    for(int i=0;i<players.length();i++){
      JSONObject player=players.getJSONObject(i);
      String pid=player.optString("id",""),charId=player.optString("characterId","");
      if(charId.isEmpty())continue;
      boolean exists=false;
      for(int j=0;j<tokens.length();j++){
        JSONObject t=tokens.getJSONObject(j);
        if(pid.equals(t.optString("ownerPlayerId"))&&charId.equals(t.optString("characterId"))){
          exists=true;break;
        }
      }
      if(exists)continue;
      // Preferir token de ficha já criado no editor, se ainda não tiver dono.
      JSONObject reused=null;
      for(int j=0;j<tokens.length();j++){
        JSONObject t=tokens.getJSONObject(j);
        if("character".equals(t.optString("kind"))&&charId.equals(t.optString("characterId"))
            &&t.optString("ownerPlayerId","").isEmpty()){reused=t;break;}
      }
      JSONObject character=null;
      JSONArray chars=c.getJSONArray("characters");
      for(int j=0;j<chars.length();j++){
        JSONObject ch=chars.getJSONObject(j);
        if(charId.equals(ch.optString("id"))){character=ch;break;}
      }
      if(character==null)continue;
      if(reused!=null){
        reused.put("ownerPlayerId",pid).put("characterId",charId).put("hidden",false);
        changed=true;continue;
      }
      int xx=-1,yy=-1;
      // Célula livre e revelada, mais próxima do centro do grid.
      double best=Double.POSITIVE_INFINITY;
      for(int y=0;y<height;y++)for(int x=0;x<width;x++){
        if(covered(map,x,y))continue;
        boolean occupied=false;
        for(int j=0;j<tokens.length();j++){
          JSONObject t=tokens.getJSONObject(j);
          if(t.optInt("x",-1)==x&&t.optInt("y",-1)==y){occupied=true;break;}
        }
        if(occupied)continue;
        double score=Math.pow(x-(width-1)/2.0,2)+Math.pow(y-(height-1)/2.0,2);
        if(score<best){best=score;xx=x;yy=y;}
      }
      if(xx<0||tokens.length()>=250)continue; // Não ultrapassar limites nem revelar salas ocultas.
      JSONObject sheet=character.optJSONObject("sheet");
      String name=sheet==null?"Personagem":sheet.optString("name","Personagem");
      if(name.trim().isEmpty())name=player.optString("nickname","Personagem");
      tokens.put(new JSONObject().put("id",UUID.randomUUID().toString().replace("-",""))
        .put("kind","character").put("name",name.substring(0,Math.min(name.length(),70)))
        .put("x",xx).put("y",yy).put("assetId","")
        .put("ownerPlayerId",pid).put("characterId",charId).put("hidden",false));
      changed=true;
    }
    return changed;
  }

  public JSONObject playerScene(String cid,JSONObject player)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      if(ensurePlayerTokens(c))persist();
      JSONObject original=activeScene(c),response=new JSONObject()
        .put("revision",revision.get()).put("scene",JSONObject.NULL)
        .put("playerId",player.optString("id",""))
        .put("sessionMode",sessionMode(c))
        .put("playerRequests",ownRequests(c,player))
        .put("bonusActions",c.optJSONObject("bonusActions")==null?0:c.getJSONObject("bonusActions").optInt(player.optString("id"),0));
      if(original==null){
        response.put("character",playerInfo(cid,player).opt("character"));
        response.put("rolls",visibleRolls(c,false)).put("movement",new JSONObject().put("tokens",new JSONArray())).put("initiative",new JSONObject().put("round",1).put("activeId","").put("entries",new JSONArray())).put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName",""));
        return response;
      }
      JSONObject actorSheet=player.optString("characterId","").isEmpty()?null:playerSheet(cid,player);
      String sceneSystem=actorSheet==null?"custom":actorSheet.optString("systemId","ordem-paranormal");
      if(!sceneSystem.matches("[a-z0-9-]{1,60}"))sceneSystem="custom";
      JSONObject scene=new JSONObject().put("id",original.getString("id")).put("name",original.getString("name"))
        .put("systemId",sceneSystem).put("gridScale",1.5).put("gridUnit","m")
        .put("width",original.getInt("width")).put("height",original.getInt("height"))
        .put("theme",original.optString("theme","stone"));
      // v0.71: no global fog/blackout. Optional wall/door shadows are server-authored.
      JSONObject atmo=original.optJSONObject("atmosphere");
      boolean automaticShadows=atmo!=null&&atmo.optBoolean("doorShadows",false);
      // Closed rooms, not a radius around the player, control ambient darkness.
      boolean fogOfWarActive=false;
      scene.put("atmosphere",new JSONObject()
        .put("mode",atmo!=null&&"night".equals(atmo.optString("mode"))?"night":"day")
        .put("doorShadows",automaticShadows));
      int mapWidth=original.getInt("width"),mapHeight=original.getInt("height");
      java.util.HashSet<Integer> currentVision=new java.util.HashSet<>(),explored=new java.util.HashSet<>();
      if(fogOfWarActive){
        int radius=Math.max(1,Math.min(20,atmo.optInt("visionRadius",7)));
        java.util.HashSet<String> blockers=opaqueBoundaries(original);
        JSONArray ownTokens=original.getJSONArray("tokens");
        String pid=player.optString("id",""),characterId=player.optString("characterId","");
        for(int oi=0;oi<ownTokens.length();oi++){
          JSONObject src=ownTokens.getJSONObject(oi);
          if(!pid.equals(src.optString("ownerPlayerId"))||characterId.isEmpty()||
             !characterId.equals(src.optString("characterId"))||src.optBoolean("hidden",false))continue;
          int sx=src.optInt("x",-1),sy=src.optInt("y",-1);
          if(sx<0||sy<0||sx>=mapWidth||sy>=mapHeight)continue;
          for(int yy=Math.max(0,sy-radius);yy<=Math.min(mapHeight-1,sy+radius);yy++)
          for(int xx=Math.max(0,sx-radius);xx<=Math.min(mapWidth-1,sx+radius);xx++){
            if((xx-sx)*(xx-sx)+(yy-sy)*(yy-sy)>radius*radius)continue;
            // Areas can be entered when revealed by a torch/door; FOW itself remains opt-in.
            if(canSeeThrough(blockers,sx+.5,sy+.5,xx+.5,yy+.5))currentVision.add(yy*mapWidth+xx);
          }
        }
        JSONObject exploredByScene=player.optJSONObject("mapExploration");
        if(exploredByScene==null){exploredByScene=new JSONObject();player.put("mapExploration",exploredByScene);}
        JSONArray past=exploredByScene.optJSONArray(original.getString("id"));
        if(past!=null)for(int ri=0;ri<past.length();ri++){
          int n=past.optInt(ri,-1);if(n>=0&&n<mapWidth*mapHeight)explored.add(n);
        }
        boolean changed=explored.addAll(currentVision);
        if(changed){
          JSONArray updated=new JSONArray();
          for(int cell:explored)updated.put(cell);
          exploredByScene.put(original.getString("id"),updated);
          persist();
        }
        JSONArray now=new JSONArray(),history=new JSONArray();
        for(int cell:currentVision)now.put(cell);
        for(int cell:explored)history.put(cell);
        scene.put("visibleCells",now).put("seenCells",history);
      }
      JSONArray fog=new JSONArray(),visibleRooms=new JSONArray(),visibleTokens=new JSONArray();
      // Exposure is calculated and authorized here, not trusted from player-side CSS.
      java.util.HashSet<Integer> automatic=automaticShadows?closedUnlitRooms(original):new java.util.HashSet<>();
      java.util.HashMap<Integer,Integer> lightCells=illuminatedCells(c,original,fog,automatic);
      JSONArray rooms=original.getJSONArray("rooms");
      for(int i=0;i<rooms.length();i++){
        JSONObject room=rooms.getJSONObject(i);
        if(!room.optBoolean("hidden",false)||room.optInt("intensity",100)==0)
          if(!fogOfWarActive||roomVisible(room,currentVision,mapWidth))
            visibleRooms.put(new JSONObject().put("name",room.getString("name"))
              .put("x",room.getInt("x")).put("y",room.getInt("y"))
              .put("w",room.getInt("w")).put("h",room.getInt("h")));
      }
      java.util.HashSet<String> allowedAssetIds=new java.util.HashSet<>();
      String background=original.optString("backgroundAssetId","");
      if(!background.isEmpty()){allowedAssetIds.add(background);scene.put("backgroundAssetId",background);}
      JSONArray tokens=original.getJSONArray("tokens");
      for(int i=0;i<tokens.length();i++){
        JSONObject t=tokens.getJSONObject(i);int x=t.getInt("x"),y=t.getInt("y");
        boolean own=t.optString("ownerPlayerId").equals(player.optString("id"))&&
          !player.optString("characterId","").isEmpty()&&t.optString("characterId").equals(player.optString("characterId"));
        if(t.optBoolean("hidden",false)||
           (!own&&!isVisibleInFog(original,x,y,lightCells,automatic))||
           (fogOfWarActive&&!currentVision.contains(y*mapWidth+x)&&!own))continue;
        JSONObject visible=new JSONObject().put("id",t.getString("id")).put("name",t.getString("name"))
          .put("kind",t.getString("kind")).put("x",x).put("y",y).put("movable",own)
          .put("assetId",t.optString("assetId",""))
          .put("rotation",t.optInt("rotation",0))
          .put("flashlight",t.optBoolean("flashlight",false)&&!validTokenLight(c,t).isEmpty())
          .put("flashlightRadius",("lantern".equals(validTokenLight(c,t))?8:3));
        if(own)visible.put("lightKind",validTokenLight(c,t));
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
          if(a.optString("id").equals(background)&&(fogOfWarActive||fog.length()>0))
            visible.put("image",maskedBackground(original,a,fogOfWarActive?currentVision:null,lightCells,automatic));
          filteredAssets.put(visible);
        }
      }
      if("d-d".equals(sceneSystem)){scene.put("gridScale",5).put("gridUnit","ft");}
      else if("gurps".equals(sceneSystem)){scene.put("gridScale",1).put("gridUnit","m");}
      // O jogador recebe somente os desenhos de células que já foram reveladas.
      // Importante: não expor dados de salas ocultas nem mesmo no JSON da rede.
      JSONObject sourcePaint=original.optJSONObject("layers"),visiblePaint=new JSONObject();
      for(String layer:new String[]{"terrain","props","walls"}){
        JSONArray filteredMarks=new JSONArray();
        JSONArray marks=sourcePaint==null?null:sourcePaint.optJSONArray(layer);
        if(marks!=null)for(int pi=0;pi<marks.length();pi++){
          JSONObject mark=marks.getJSONObject(pi);
          int mx=mark.optInt("x",-1),my=mark.optInt("y",-1);
          if(mx<0||my<0||mx>=original.optInt("width")||my>=original.optInt("height"))continue;
          if(!isVisibleInFog(original,mx,my,lightCells,automatic))continue;
          if(fogOfWarActive&&!(("terrain".equals(layer)?explored:currentVision).contains(my*mapWidth+mx)))continue;
          filteredMarks.put(new JSONObject(mark.toString()));
        }
        visiblePaint.put(layer,filteredMarks);
      }
      scene.put("layers",visiblePaint);
      scene.put("rooms",visibleRooms).put("fog",fog).put("tokens",visibleTokens);
      response.put("initiative",initiativeForPlayer(c,visibleTokens));
      response.put("movement",playerMovement(c,player,visibleTokens));
      response.put("scene",scene).put("assets",filteredAssets)
        .put("rolls",visibleRolls(c,false)).put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName",""));
      // A ficha integral do jogador e entregue apenas ao proprio titular autenticado.
      response.put("character",playerInfo(cid,player).opt("character"));
      return response;
    }
  }

  private static String tokenSystem(JSONObject c,JSONObject token)throws JSONException{
    String charId=token.optString("characterId","");
    JSONArray chars=c.optJSONArray("characters");
    if(chars!=null)for(int i=0;i<chars.length();i++){
      JSONObject ch=chars.getJSONObject(i);
      if(charId.equals(ch.optString("id"))&&ch.optJSONObject("sheet")!=null)
        return ch.getJSONObject("sheet").optString("systemId","ordem-paranormal");
    }
    return token.optString("systemId","ordem-paranormal");
  }
  private static int defaultSquares(String system){
    if("d-d".equals(system))return 6;
    if("gurps".equals(system))return 5;
    return 9; // Ordem Paranormal e sistemas ainda não configurados
  }
  private int movementLimit(JSONObject c,JSONObject t)throws JSONException{
    if(t.has("movementSquares"))return Math.max(0,Math.min(60,t.optInt("movementSquares",9)));
    String system=tokenSystem(c,t);
    String charId=t.optString("characterId","");
    JSONArray chars=c.optJSONArray("characters");
    if(chars!=null)for(int i=0;i<chars.length();i++){
      JSONObject ch=chars.getJSONObject(i);
      if(!charId.isEmpty()&&charId.equals(ch.optString("id"))){
        JSONObject sheet=ch.optJSONObject("sheet");
        if(sheet!=null&&sheet.has("movementSquares"))
          return Math.max(0,Math.min(60,sheet.optInt("movementSquares",9)));
      }
    }
    JSONObject custom=c.optJSONObject("movementRules");
    if(custom!=null&&custom.has(system))return Math.max(0,Math.min(60,custom.optInt(system,9)));
    return defaultSquares(system);
  }
  private JSONObject movementSpent(JSONObject c)throws JSONException{
    JSONObject spent=c.optJSONObject("movementSpent");
    if(spent==null){spent=new JSONObject();c.put("movementSpent",spent);}
    return spent;
  }
  public void movementRule(String cid,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      String system=field(input,"systemId",60);
      if(!system.matches("[A-Za-z0-9_-]{1,60}"))
        throw new IllegalArgumentException("Sistema inválido");
      int squares=gridNumber(input,"squares",0,60);
      JSONObject rules=c.optJSONObject("movementRules");
      if(rules==null){rules=new JSONObject();c.put("movementRules",rules);}
      rules.put(system,squares);
      c.put("movementSpent",new JSONObject());persist();
    }
  }
  private JSONObject playerMovement(JSONObject c,JSONObject player,JSONArray tokens)throws JSONException{
    JSONArray own=new JSONArray();
    JSONObject spent=movementSpent(c);
    for(int i=0;i<tokens.length();i++){
      JSONObject t=tokens.getJSONObject(i);
      if(!t.optBoolean("movable",false))continue;
      JSONObject original=activeScene(c);
      if(original==null)continue;
      JSONObject source=entry(original.getJSONArray("tokens"),t.optString("id"),"Token");
      boolean interlude="interlude".equals(sessionMode(c));
      int limit=movementLimit(c,source),used=spent.optInt(t.optString("id"),0);
      own.put(new JSONObject().put("tokenId",t.optString("id")).put("limit",interlude?JSONObject.NULL:limit)
       .put("used",interlude?0:used).put("remaining",interlude?JSONObject.NULL:Math.max(0,limit-used))
       .put("unlimited",interlude));
    }
    return new JSONObject().put("tokens",own);
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
      boolean interlude="interlude".equals(sessionMode(c));
      JSONObject initiative=initiativeData(c);
      JSONArray order=initiative.optJSONArray("entries");
      if(!interlude&&order!=null&&order.length()>0&&!id.equals(initiative.optString("activeId","")))
        throw new IllegalArgumentException("Aguarde sua vez na iniciativa");
      int oldX=t.getInt("x"),oldY=t.getInt("y");
      // Cada diagonal vale um quadrado (distância Chebyshev).
      int steps=Math.max(Math.abs(x-oldX),Math.abs(y-oldY));
      JSONObject spent=movementSpent(c);
      int already=spent.optInt(id,0),limit=movementLimit(c,t);
      if(!interlude&&already+steps>limit)
        throw new IllegalArgumentException("Deslocamento excedido: "+(limit-already)+" de "+limit+" quadrados restantes neste turno");
      // Occlusion stays impassable unless a valid open door/flashlight reveals the route.
      java.util.HashMap<Integer,Integer> lit=illuminatedCells(c,map,new JSONArray(),map.optJSONObject("atmosphere")!=null&&
        map.optJSONObject("atmosphere").optBoolean("doorShadows",false)?closedUnlitRooms(map):new java.util.HashSet<Integer>());
      for(int step=0;step<=steps;step++){
        double p=steps==0?0:((double)step/steps);
        int sx=(int)Math.round(oldX+(x-oldX)*p),sy=(int)Math.round(oldY+(y-oldY)*p);
        if(!isVisibleInFog(map,sx,sy,lit,map.optJSONObject("atmosphere")!=null&&
          map.optJSONObject("atmosphere").optBoolean("doorShadows",false)?closedUnlitRooms(map):new java.util.HashSet<Integer>()))throw new IllegalArgumentException("Área escura demais para enxergar o caminho");
      }
      t.put("x",x).put("y",y);
      if(!interlude)spent.put(id,already+steps);
      persist();
      return new JSONObject().put("ok",true).put("x",x).put("y",y)
        .put("movementRemaining",interlude?JSONObject.NULL:limit-already-steps)
        .put("movementUnlimited",interlude).put("revision",revision.get());
    }
  }



  public JSONObject playerFlashlight(String cid,JSONObject player,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),map=activeScene(c);
      if(map==null)throw new IllegalArgumentException("Nenhuma mesa publicada");
      String id=sceneId(input,"tokenId");
      JSONObject t=entry(map.getJSONArray("tokens"),id,"Token");
      String ch=player.optString("characterId","");
      if(ch.isEmpty()||!player.optString("id").equals(t.optString("ownerPlayerId"))||
         !ch.equals(t.optString("characterId"))||t.optBoolean("hidden",false))
        throw new SecurityException("Somente o dono pode controlar a lanterna ou direção deste token");
      if(input.has("rotation"))t.put("rotation",gridNumber(input,"rotation",0,359));
      if(input.has("flashlight")){
        if(!(input.opt("flashlight") instanceof Boolean))throw new IllegalArgumentException("Estado da lanterna inválido");
        if(input.getBoolean("flashlight")&&lightEquipment(sheetForLight(c,t)).isEmpty())
          throw new IllegalArgumentException("Equipe uma lanterna, tocha ou fonte de luz válida no inventário.");
        t.put("flashlight",input.getBoolean("flashlight"));
      }
      if(input.has("flashlightRadius"))throw new IllegalArgumentException("Alcance definido pelo equipamento do personagem");
      if(!input.has("rotation")&&!input.has("flashlight")&&!input.has("flashlightRadius"))
        throw new IllegalArgumentException("Nenhum ajuste de orientação");
      persist();
      return new JSONObject().put("ok",true).put("rotation",t.optInt("rotation",0))
        .put("flashlight",t.optBoolean("flashlight",false)).put("revision",revision.get());
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
      if("interlude".equals(sessionMode(c))&&"next".equals(action))
        throw new IllegalArgumentException("A iniciativa fica pausada durante o interlúdio.");
      if("reset".equals(action)){
        state.put("entries",new JSONArray()).put("round",1).put("activeId","");
        c.put("movementSpent",new JSONObject());c.put("bonusActions",new JSONObject());c.put("bonusTurns",new JSONObject());
      }else if("next".equals(action)){
        if(entries.length()==0)throw new IllegalArgumentException("Adicione participantes à iniciativa");
        JSONObject pendingBonus=c.optJSONObject("bonusTurns");
        String currentId=state.optString("activeId");
        if(pendingBonus!=null&&pendingBonus.optInt(currentId,0)>0){
          pendingBonus.put(currentId,pendingBonus.getInt(currentId)-1);
          // GM-approved table variant: one extra turn at the current initiative position.
          advance(cid,"turn");
          persist();
          return new JSONObject(state.toString()).put("extraTurn",true);
        }
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
      // Rolling dice is NOT bound to the active initiative or movement budget.
      // Consecutive tests are allowed; input limits and authenticated audit log remain.
      if(!gm)actor.put("lastTableRoll",now);
      String label=input.optString("label","Rolagem");
      if(label.length()>70)label=label.substring(0,70);
      if(label.isEmpty())label="Rolagem";
      JSONArray values=new JSONArray();int sum=bonus,highest=0,faceSum=0;
      for(int i=0;i<count;i++){
        int value=random.nextInt(faces)+1;faceSum+=value;highest=Math.max(highest,value);values.put(value);
      }
      String mode=input.optString("mode",count>1&&faces==20?"highest":"sum");
      if(!mode.equals("sum")&&!mode.equals("highest")&&!mode.equals("lowest"))
        throw new IllegalArgumentException("Modo de rolagem inválido");
      if(!mode.equals("sum")&&faces!=20)throw new IllegalArgumentException("Selecionar maior/menor só para d20");
      int lowest=faces;
      for(int k=0;k<values.length();k++)lowest=Math.min(lowest,values.optInt(k,faces));
      sum+=mode.equals("highest")?highest:mode.equals("lowest")?lowest:faceSum;
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
  public JSONObject masterTable(String cid)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);
      if(ensurePlayerTokens(c))persist();
      JSONObject result=getScenarios(cid);
      // The master's preview must use the same authorized light shape as the player.
      JSONArray previewMaps=result.optJSONArray("scenarios");
      if(previewMaps!=null)for(int mi=0;mi<previewMaps.length();mi++){
        JSONObject preview=previewMaps.optJSONObject(mi);if(preview==null)continue;
        JSONArray viewTokens=preview.optJSONArray("tokens");if(viewTokens==null)continue;
        for(int ti=0;ti<viewTokens.length();ti++){
          JSONObject t=viewTokens.optJSONObject(ti);if(t==null)continue;
          String kind=validTokenLight(c,t);
          t.put("lightKind",kind);
          t.put("flashlight",t.optBoolean("flashlight",false)&&!kind.isEmpty());
          t.put("flashlightRadius","lantern".equals(kind)?8:3);
        }
      }
      JSONObject scene=activeScene(c);
      JSONObject limits=new JSONObject();
      if(scene!=null){
        JSONArray ts=scene.getJSONArray("tokens");
        for(int i=0;i<ts.length();i++){
          JSONObject t=ts.getJSONObject(i);
          limits.put(t.getString("id"),movementLimit(c,t));
        }
      }
      result.put("movementLimits",limits);
      result.put("sessionMode",sessionMode(c));
      result.put("playerRequests",new JSONArray(pendingRequests(c).toString()));
      result.put("bonusActions",c.optJSONObject("bonusActions")==null?new JSONObject():new JSONObject(c.getJSONObject("bonusActions").toString()));
      result.put("turn",c.optInt("turn",1)).put("sceneName",c.optString("sceneName"))
        .put("campaignName",c.optString("name")).put("revision",revision.get())
        .put("rolls",visibleRolls(c,true)).put("initiative",new JSONObject(initiativeData(c).toString()))
        .put("movementRules",new JSONObject((c.optJSONObject("movementRules")==null?new JSONObject():c.getJSONObject("movementRules")).toString()))
        .put("movementSpent",new JSONObject(movementSpent(c).toString()))
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
      }else if(action.equals("rotate")){
        token.put("rotation",gridNumber(input,"rotation",0,359));
      }else if(action.equals("flashlight")){
        if(!(input.opt("enabled") instanceof Boolean))throw new IllegalArgumentException("Estado da lanterna inválido");
        token.put("flashlight",input.getBoolean("enabled"));
        if(input.has("radius"))token.put("flashlightRadius",gridNumber(input,"radius",1,15));
      }else if(action.equals("speed")){
        token.put("movementSquares",gridNumber(input,"squares",0,60));
        movementSpent(c).put(token.getString("id"),0);
      }else if(action.equals("move")){
        token.put("x",gridNumber(input,"x",0,map.getInt("width")-1));
        token.put("y",gridNumber(input,"y",0,map.getInt("height")-1));
      }else if(action.equals("hide")){
        if(!(input.opt("hidden") instanceof Boolean))throw new IllegalArgumentException("Visibilidade inválida");
        token.put("hidden",input.getBoolean("hidden"));
      }else if(action.equals("bind")){
        if(!"character".equals(token.optString("kind")))throw new IllegalArgumentException("Apenas personagens podem ser controlados por jogadores");
        String pid=input.optString("playerId","");
        if(pid.isEmpty()){
          token.put("ownerPlayerId","").put("characterId","");
        }else{
          JSONObject owner=entry(c.getJSONArray("players"),sceneId(input,"playerId"),"Jogador");
          String charId=owner.optString("characterId","");
          if(charId.isEmpty()||"null".equals(charId))throw new IllegalArgumentException("Atribua primeiro uma ficha ao jogador");
          if(covered(map,token.optInt("x"),token.optInt("y")))
            throw new IllegalArgumentException("O token está em uma sala oculta. Mova-o para uma célula revelada antes de vincular");
          JSONArray all=map.getJSONArray("tokens");
          for(int i=all.length()-1;i>=0;i--){
            JSONObject other=all.getJSONObject(i);
            if(other==token||!pid.equals(other.optString("ownerPlayerId")))continue;
            // Os tokens automáticos sem imagem podem ser substituídos pelos tokens personalizados.
            if(other.optString("assetId","").isEmpty()&&"character".equals(other.optString("kind")))all.remove(i);
            else other.put("ownerPlayerId","").put("characterId","");
          }
          token.put("ownerPlayerId",pid).put("characterId",charId).put("hidden",false);
        }
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
        for(String k:new String[]{"name","class","nex","attrs","skills","resources","photo","sheetTheme","rituaisConhecidos","origem","trilha","systemId","effects","origin","trail","inventory","items","history","description","customRolls","powers","powerChoices","defense","notes","edition","mod","currentHP","currentFP","hitPointsMax","hitPointsCurrent","hitPointsTemp","spellSlots","klass","ancestry","level","armorClass","features","attacks","conditions","saveProficiencies","skillProficiencies","expertise","spellcastingAbility","hitDiceUsed","inspiration","speed","pointBudget","advantages","disadvantages","quirks","techniques","weapons","spells","languages","cultures","background","concept","techLevel","portrait","settings","parrySkill","blockSkill"})
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
  /* v0.55: the official catalog of named paranormal choices is supplied with the
   * app. No player can grant themselves abilities; GM approves every advancement. */
  private JSONObject paranormalCatalog() throws Exception{
    try(InputStream in=context.getAssets().open("mastermind55_powers.json");
        ByteArrayOutputStream output=new ByteArrayOutputStream()){
      byte[] bytes=new byte[4096];int n;
      while((n=in.read(bytes))!=-1)output.write(bytes,0,n);
      return new JSONObject(output.toString("UTF-8"));
    }
  }
  private JSONArray pendingRequests(JSONObject c)throws JSONException{
    JSONArray a=c.optJSONArray("playerRequests");
    if(a==null){a=new JSONArray();c.put("playerRequests",a);}
    return a;
  }
  private JSONObject requestPublic(JSONObject r)throws JSONException{
    return new JSONObject().put("id",r.optString("id")).put("playerId",r.optString("playerId"))
      .put("playerName",r.optString("playerName")).put("type",r.optString("type"))
      .put("name",r.optString("name")).put("element",r.optString("element"))
      .put("nex",r.optInt("nex",0)).put("targetId",r.optString("targetId"))
      .put("createdAt",r.optLong("createdAt",0));
  }
  private JSONArray ownRequests(JSONObject c,JSONObject player)throws JSONException{
    JSONArray all=pendingRequests(c),out=new JSONArray();
    for(int i=0;i<all.length();i++)if(player.optString("id").equals(all.getJSONObject(i).optString("playerId")))
      out.put(requestPublic(all.getJSONObject(i)));
    return out;
  }
  private JSONObject powerByName(String name)throws Exception{
    JSONArray powers=paranormalCatalog().getJSONArray("powers");
    for(int i=0;i<powers.length();i++){
      JSONObject p=powers.getJSONObject(i);
      if(name.equals(p.optString("name")))return p;
    }
    return null;
  }
  private static final int[] POWER_NEX={15,30,45,60,75,90};
  private int powerSlots(int nex){
    int n=0;for(int milestone:POWER_NEX)if(nex>=milestone)n++;return n;
  }
  private JSONArray choices(JSONObject sheet)throws JSONException{
    JSONArray v=sheet.optJSONArray("powerChoices");
    if(v==null){v=new JSONArray();sheet.put("powerChoices",v);}
    return v;
  }
  private int deathPowers(JSONObject sheet)throws JSONException{
    int count=0;JSONArray powers=choices(sheet);
    for(int i=0;i<powers.length();i++){
      JSONObject x=powers.optJSONObject(i);
      if(x!=null&&"transcend".equals(x.optString("type"))&&"Morte".equals(x.optString("element")))
        count++;
    }
    return count;
  }
  private int usedPowerSlots(JSONObject sheet)throws JSONException{
    JSONArray used=choices(sheet);
    int n=0;for(int i=0;i<used.length();i++){
      JSONObject row=used.optJSONObject(i);
      if(row!=null&&(row.optString("type").equals("transcend")||row.optString("type").equals("class")))n++;
    }
    return n;
  }
  private JSONObject classPowerRule(String name)throws Exception{
    return paranormalCatalog().optJSONObject("classPowerRules")==null?null:
      paranormalCatalog().getJSONObject("classPowerRules").optJSONObject(name);
  }
  private boolean repeatableClassPower(String type,String name)throws Exception{
    JSONObject rule="class".equals(type)?classPowerRule(name):null;
    return rule!=null&&rule.optBoolean("repeatable",false);
  }
  private void validateChoice(JSONObject sheet,String type,String name)throws Exception{
    if(!"ordem-paranormal".equals(sheet.optString("systemId","ordem-paranormal")))
      throw new IllegalArgumentException("Este catálogo é específico de Ordem Paranormal.");
    int nex=sheet.optInt("nex",5);
    if(powerSlots(nex)<=usedPowerSlots(sheet))
      throw new IllegalArgumentException("Não há escolhas de poder disponíveis no NEX atual.");
    boolean repeatable=repeatableClassPower(type,name);
    JSONArray known=sheet.optJSONArray("powers");
    if(!repeatable&&known!=null)for(int i=0;i<known.length();i++){
      Object value=known.opt(i);
      String existing=value instanceof JSONObject?((JSONObject)value).optString("name",((JSONObject)value).optString("nome")):String.valueOf(value);
      if(name.equals(existing))throw new IllegalArgumentException("Este poder já está na ficha.");
    }
    JSONArray prev=choices(sheet);
    if(!repeatable)for(int i=0;i<prev.length();i++)
      if(name.equals(prev.getJSONObject(i).optString("name")))
        throw new IllegalArgumentException("Este poder já foi escolhido.");
    if("transcend".equals(type)){
      JSONObject power=powerByName(name);
      if(power==null)throw new IllegalArgumentException("Poder paranormal fora do catálogo.");
      // The book requires two prior Death powers for Temporal Surge.
      if("Surto Temporal".equals(name)&&deathPowers(sheet)<2)
        throw new IllegalArgumentException("Surto Temporal requer dois poderes paranormais de Morte anteriores.");
    }else if("class".equals(type)){
      if(name.length()<3||name.length()>90||"Transcender".equalsIgnoreCase(name))
        throw new IllegalArgumentException("Selecione Transcender pela aba paranormal.");
      JSONObject metadata=paranormalCatalog(),classes=metadata.getJSONObject("classPowers");
      JSONArray allowed=classes.optJSONArray(sheet.optString("class",""));
      boolean found=false;
      if(allowed!=null)for(int i=0;i<allowed.length();i++)
        if(name.equals(allowed.optString(i)))found=true;
      if(!found)throw new IllegalArgumentException("Este poder não pertence à classe no livro básico 1.3.");
      JSONObject rule=metadata.optJSONObject("classPowerRules")==null?null:
        metadata.getJSONObject("classPowerRules").optJSONObject(name);
      if(rule!=null){
        if(rule.optInt("minNex",0)>nex)throw new IllegalArgumentException("NEX insuficiente para "+name+".");
        JSONObject required=rule.optJSONObject("attrs"),attrs=sheet.optJSONObject("attrs");
        if(required!=null){
          java.util.Iterator<String> keys=required.keys();
          while(keys.hasNext()){
            String key=keys.next();
            if(attrs==null||attrs.optInt(key,0)<required.optInt(key,0))
              throw new IllegalArgumentException("Atributo mínimo não cumprido: "+key+".");
          }
        }
        String priorPower=rule.optString("power","");
        if(!priorPower.isEmpty()){
          JSONArray knownPowers=sheet.optJSONArray("powers");
          boolean hasPrior=false;
          if(knownPowers!=null)for(int i=0;i<knownPowers.length();i++)
            if(priorPower.equals(knownPowers.optString(i)))hasPrior=true;
          if(!hasPrior)throw new IllegalArgumentException("Poder anterior necessário: "+priorPower+".");
        }
        // Skills are reviewed by the GM if origin-granted training is not
        // represented in the sheet's skill map; never fabricate ranks.
      }
    }else throw new IllegalArgumentException("Escolha de poder inválida.");
  }
  private JSONObject playerRequests(String cid,JSONObject player)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),sheet=playerSheet(cid,player);
      return new JSONObject().put("requests",ownRequests(c,player))
        .put("choices",new JSONArray(choices(sheet).toString()))
        .put("slots",powerSlots(sheet.optInt("nex",5)))
        .put("used",usedPowerSlots(sheet));
    }
  }
  private JSONObject submitPlayerRequest(String cid,JSONObject actor,JSONObject input)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),sheet=playerSheet(cid,actor);
      JSONArray pending=pendingRequests(c);
      String kind=input.optString("type","");
      if(!java.util.Arrays.asList("class","transcend","pass","delay","surto").contains(kind))
        throw new IllegalArgumentException("Tipo de solicitação inválido");
      for(int i=0;i<pending.length();i++)
        if(actor.optString("id").equals(pending.getJSONObject(i).optString("playerId")))
          throw new IllegalArgumentException("Você já tem uma solicitação pendente. Aguarde o mestre.");
      if(pending.length()>=40)throw new IllegalArgumentException("Muitas solicitações aguardando o mestre.");
      JSONObject req=new JSONObject().put("id",UUID.randomUUID().toString().replace("-",""))
        .put("playerId",actor.getString("id")).put("playerName",actor.optString("nickname"))
        .put("characterId",actor.optString("characterId")).put("type",kind)
        .put("createdAt",System.currentTimeMillis()).put("nex",sheet.optInt("nex",0));
      if("class".equals(kind)||"transcend".equals(kind)){
        String name=field(input,"name",90);
        validateChoice(sheet,kind,name);
        req.put("name",name);
        if("transcend".equals(kind))req.put("element",powerByName(name).optString("element"));
      }else{
        if("interlude".equals(sessionMode(c)))throw new IllegalArgumentException("Este pedido é do modo Combate.");
        JSONObject init=initiativeData(c);
        JSONArray entries=init.optJSONArray("entries");
        if(entries==null||entries.length()==0)throw new IllegalArgumentException("Inicie a iniciativa primeiro.");
        JSONObject map=activeScene(c);
        if(map==null)throw new IllegalArgumentException("Publique um mapa primeiro.");
        String ownerId=actor.optString("id"),chosen="";
        for(int i=0;i<map.getJSONArray("tokens").length();i++){
          JSONObject token=map.getJSONArray("tokens").getJSONObject(i);
          if(ownerId.equals(token.optString("ownerPlayerId"))&&actor.optString("characterId").equals(token.optString("characterId"))){
            chosen=token.optString("id");break;
          }
        }
        if(!chosen.equals(init.optString("activeId",""))||chosen.isEmpty())
          throw new IllegalArgumentException("Solicite essa ação durante o seu turno.");
        req.put("tokenId",chosen).put("turnStamp",c.optInt("turn",1))
          .put("sceneStamp",c.optInt("scene",1)).put("mapStamp",map.optString("id"));
        if("delay".equals(kind)){
          String target=field(input,"targetId",70);
          if(target.equals(chosen))throw new IllegalArgumentException("Escolha outro participante.");
          boolean exists=false;
          for(int i=0;i<entries.length();i++)if(target.equals(entries.getJSONObject(i).optString("tokenId")))exists=true;
          if(!exists)throw new IllegalArgumentException("Participante não encontrado na iniciativa.");
          req.put("targetId",target);
        }
        if("surto".equals(kind)){
          boolean known=false;
          JSONArray powers=sheet.optJSONArray("powers");
          if(powers!=null)for(int i=0;i<powers.length();i++)
            if("Surto Temporal".equals(powers.optString(i)))known=true;
          if(!known)throw new IllegalArgumentException("Este personagem ainda não possui Surto Temporal.");
          JSONObject pe=sheet.optJSONObject("resources")==null?null:sheet.getJSONObject("resources").optJSONObject("PE");
          if(pe==null||pe.optInt("current",0)<3)throw new IllegalArgumentException("São necessários 3 PE disponíveis.");
          String scene=map.optString("id");
          JSONObject spent=c.optJSONObject("surtoUsage");
          if(spent!=null&&scene.equals(spent.optString(actor.optString("id"))))
            throw new IllegalArgumentException("Surto Temporal já utilizado nesta cena.");
          req.put("name","Surto Temporal");
        }
      }
      pending.put(req);persist();
      return new JSONObject().put("ok",true).put("request",requestPublic(req));
    }
  }
  private JSONObject consumeBonusAction(String cid,JSONObject player)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid),bonus=c.optJSONObject("bonusActions");
      String id=player.optString("id");
      JSONObject map=activeScene(c);String active=initiativeData(c).optString("activeId");
      boolean own=false;
      if(map!=null)for(int i=0;i<map.getJSONArray("tokens").length();i++){
        JSONObject token=map.getJSONArray("tokens").getJSONObject(i);
        if(active.equals(token.optString("id"))&&id.equals(token.optString("ownerPlayerId"))
          &&player.optString("characterId").equals(token.optString("characterId")))own=true;
      }
      if(!own||"interlude".equals(sessionMode(c)))throw new IllegalArgumentException("Use a ação adicional no seu turno.");
      if(bonus==null||bonus.optInt(id,0)<=0)
        throw new IllegalArgumentException("Não há ações adicionais disponíveis.");
      bonus.put(id,bonus.getInt(id)-1);persist();
      return new JSONObject().put("ok",true).put("remaining",bonus.optInt(id,0));
    }
  }
  private JSONObject answerPlayerRequest(String cid,JSONObject body)throws Exception{
    synchronized(lock){
      JSONObject c=campaign(cid);JSONArray pending=pendingRequests(c);
      String id=field(body,"id",70),action=field(body,"action",20);
      if(!"approve".equals(action)&&!"reject".equals(action))throw new IllegalArgumentException("Decisão inválida.");
      JSONObject req=null;int index=-1;
      for(int i=0;i<pending.length();i++)if(id.equals(pending.getJSONObject(i).optString("id"))){req=pending.getJSONObject(i);index=i;break;}
      if(req==null)throw new IllegalArgumentException("Solicitação não encontrada.");
      if("approve".equals(action)){
        String type=req.optString("type"),pid=req.optString("playerId");
        JSONObject player=entry(c.getJSONArray("players"),pid,"Jogador");
        if(!req.optString("characterId").equals(player.optString("characterId")))
          throw new IllegalArgumentException("O jogador trocou de personagem. Refaça a solicitação.");
        JSONObject sheet=playerSheet(cid,player);
        if("class".equals(type)||"transcend".equals(type)){
          String name=req.optString("name");validateChoice(sheet,type,name);
          JSONArray used=choices(sheet);
          int next=POWER_NEX[usedPowerSlots(sheet)];
          JSONObject choice=new JSONObject().put("type",type).put("name",name).put("nex",next);
          JSONArray powers=sheet.optJSONArray("powers");
          if(powers==null){powers=new JSONArray();sheet.put("powers",powers);}
          if("transcend".equals(type)){
            JSONObject entry=powerByName(name);
            choice.put("element",entry.optString("element")).put("sanityNotGained",true);
            // Transcending forfeits the SAN gain associated with this progression.
            int loss="Ocultista".equals(sheet.optString("class"))?5:
              "Especialista".equals(sheet.optString("class"))?4:3;
            choice.put("sanityProgression",loss);
            JSONObject san=sheet.optJSONObject("resources")==null?null:sheet.getJSONObject("resources").optJSONObject("SAN");
            if(san!=null){
              san.put("max",Math.max(0,san.optInt("max",0)-loss));
              san.put("current",Math.min(san.optInt("current",0),san.optInt("max",0)));
            }
          }
          used.put(choice);
          if(!repeatableClassPower(type,name))powers.put(name);
          else{
            boolean known=false;
            for(int k=0;k<powers.length();k++)if(name.equals(powers.optString(k)))known=true;
            if(!known)powers.put(name);
          }
        }else{
          JSONObject state=initiativeData(c);
          JSONArray entries=state.optJSONArray("entries");
          String token=req.optString("tokenId");
          if("interlude".equals(sessionMode(c))||!token.equals(state.optString("activeId"))
            ||req.optInt("turnStamp",-1)!=c.optInt("turn",1)
            ||req.optInt("sceneStamp",-1)!=c.optInt("scene",1)
            ||activeScene(c)==null||!req.optString("mapStamp").equals(activeScene(c).optString("id")))
            throw new IllegalArgumentException("O turno mudou ou o interlúdio começou. Solicitação expirada.");
          if("pass".equals(type)){
            initiativeAction(cid,new JSONObject().put("action","next"));
          }else if("delay".equals(type)){
            String target=req.optString("targetId");JSONArray rearranged=new JSONArray();
            JSONObject moving=null;
            for(int i=0;i<entries.length();i++){
              JSONObject item=entries.getJSONObject(i);
              if(token.equals(item.optString("tokenId")))moving=item;
              else rearranged.put(item);
            }
            if(moving==null)throw new IllegalArgumentException("Personagem ausente da iniciativa.");
            JSONArray changed=new JSONArray();boolean inserted=false;
            for(int i=0;i<rearranged.length();i++){
              JSONObject item=rearranged.getJSONObject(i);changed.put(item);
              if(target.equals(item.optString("tokenId"))){changed.put(moving);inserted=true;}
            }
            if(!inserted)throw new IllegalArgumentException("Participante alvo não encontrado.");
            // Continue from the next participant in the original order.
            String nextActive="";
            for(int i=0;i<entries.length();i++)
              if(token.equals(entries.getJSONObject(i).optString("tokenId"))){
                nextActive=entries.getJSONObject((i+1)%entries.length()).optString("tokenId");break;
              }
            state.put("entries",changed);
            state.put("activeId",nextActive);
            c.put("movementSpent",new JSONObject());
            advance(cid,"turn");
          }else if("surto".equals(type)){
            JSONObject res=sheet.optJSONObject("resources");
            JSONObject pe=res==null?null:res.optJSONObject("PE");
            if(pe==null||pe.optInt("current",0)<3)
              throw new IllegalArgumentException("PE insuficiente para ativar Surto Temporal.");
            JSONObject used=c.optJSONObject("surtoUsage");
            if(used==null){used=new JSONObject();c.put("surtoUsage",used);}
            String scene=activeScene(c).optString("id");
            if(scene.equals(used.optString(pid)))
              throw new IllegalArgumentException("Surto Temporal já utilizado nesta cena.");
            pe.put("current",pe.getInt("current")-3);
            used.put(pid,scene);
            JSONObject bonus=c.optJSONObject("bonusActions");
            if(bonus==null){bonus=new JSONObject();c.put("bonusActions",bonus);}
            bonus.put(pid,bonus.optInt(pid,0)+1);
            // Full turn is explicitly a GM-approved house rule, not the standard power.
            if(body.optBoolean("fullTurn",false)){
              JSONObject full=c.optJSONObject("bonusTurns");
              if(full==null){full=new JSONObject();c.put("bonusTurns",full);}
              full.put(token,full.optInt(token,0)+1);
              bonus.put(pid,Math.max(0,bonus.optInt(pid)-1));
            }
          }else throw new IllegalArgumentException("Solicitação incompatível.");
        }
      }
      JSONArray rest=new JSONArray();
      for(int i=0;i<pending.length();i++)if(i!=index)rest.put(pending.getJSONObject(i));
      c.put("playerRequests",rest);persist();
      return new JSONObject().put("ok",true).put("action",action).put("type",req.optString("type"));
    }
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
  /** Journal belongs to the authenticated guest; never included in the scene for other players. */
  private JSONObject playerJournal(JSONObject player) throws JSONException{
    JSONArray existing=player.optJSONArray("liveJournal");
    return new JSONObject().put("notes",existing==null?new JSONArray():new JSONArray(existing.toString()));
  }
  private JSONObject updatePlayerJournal(JSONObject player,JSONObject input) throws Exception{
    JSONArray items=input.optJSONArray("notes");
    if(items==null||items.length()>80)throw new IllegalArgumentException("Caderno inválido ou muitas notas.");
    JSONArray safe=new JSONArray();
    java.util.HashSet<String> ids=new java.util.HashSet<>();
    for(int i=0;i<items.length();i++){
      JSONObject n=items.optJSONObject(i);if(n==null)throw new IllegalArgumentException("Nota inválida.");
      String id=field(n,"id",70);
      if(!id.matches("[A-Za-z0-9_-]{1,70}")||!ids.add(id))
        throw new IllegalArgumentException("Identificador de nota duplicado ou inválido.");
      String heading=n.optString("title","").trim(),content=n.optString("body","");
      if(heading.length()>100||content.length()>5000)throw new IllegalArgumentException("Nota muito extensa.");
      if(heading.isEmpty())heading="Nota";
      String scene=n.optString("sceneId","");
      if(!scene.isEmpty()&&!scene.matches("[A-Za-z0-9_-]{1,70}"))
        throw new IllegalArgumentException("Cena inválida.");
      JSONObject clean=new JSONObject()
        .put("id",id).put("title",heading).put("body",content)
        .put("sceneId",scene).put("updated",Math.min(System.currentTimeMillis(),Math.max(0,n.optLong("updated",0))));
      if(n.has("x")&&n.has("y")){
        int x=n.optInt("x",-1),y=n.optInt("y",-1);
        if(x<0||y<0||x>100||y>100)throw new IllegalArgumentException("Posição da nota inválida.");
        clean.put("x",x).put("y",y);
      }
      safe.put(clean);
    }
    synchronized(lock){
      player.put("liveJournal",safe);
      persist();
      return new JSONObject().put("ok",true).put("notes",safe.length());
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
  private Response publishedJson(String asset)throws IOException{
    try(InputStream in=context.getAssets().open(asset);ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] bytes=new byte[4096];int n;
      while((n=in.read(bytes))!=-1)out.write(bytes,0,n);
      return utf8(Response.Status.OK,"application/json; charset=UTF-8",out.toByteArray());
    }
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
    r.addHeader("Cache-Control","no-store, max-age=0");return r;
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
        if(path.equals("/map-layers.js"))return publishedScript("mastermind68_map_layers.js");
        if(path.equals("/atmosphere.js"))return publishedScript("mastermind69_atmosphere.js");
        if(path.equals("/volume.js"))return publishedScript("mastermind72_volume.js");
        if(path.equals("/icons74.js"))return publishedScript("mastermind74_icons.js");
        if(path.equals("/scene-editor.js"))return sceneEditorScript();
        if(path.equals("/scene-editor.css"))return sceneEditorStyle();
        if(path.equals("/scene-bestiary.js"))return publishedScript("rpg19_order_creatures.js");
        if(path.equals("/table-camera.js"))return publishedScript("rpg33_camera.js");
        if(path.equals("/table-player.js"))return publishedScript("rpg31_player_table.js");
        if(path.equals("/player-immersion.js"))return publishedScript("mastermind52_player_experience.js");
        if(path.equals("/player-range.js"))return publishedScript("mastermind52_range.js");
        if(path.equals("/player-immersion.css"))return publishedStyle("mastermind52_player_experience.css");
        if(path.equals("/player-shell.js"))return publishedScript("mastermind54_player_shell.js");
        if(path.equals("/player-shell.css"))return publishedStyle("mastermind54_player_shell.css");
        if(path.equals("/powers-ui.js"))return publishedScript("mastermind55_player_powers.js");
        if(path.equals("/powers-ui.css"))return publishedStyle("mastermind55_player_powers.css");
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
        if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("power-requests")){
          JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
          if(pl==null)return json(403,"error","Sessão inválida");
          return response(200,playerRequests(p[3],pl));
        }
        if(path.equals("/powers-catalog.json"))return publishedJson("mastermind55_powers.json");
        if(p.length==5&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("journal")){
          JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
          if(pl==null)return json(403,"error","Sessão inválida");
          return response(200,playerJournal(pl));
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
          if("d-d".equals(sheet.optString("systemId"))){
            if(!key.equals("PV"))return json(403,"error","Somente PV nesta ficha");
            Object raw=b.opt("current");
            if(!(raw instanceof Number))return json(400,"error","Valor inválido");
            double current=((Number)raw).doubleValue();
            double max=Math.max(0,sheet.optDouble("hitPointsMax",0));
            if(!Double.isFinite(current)||current<0||current>max)
              return json(400,"error","PV fora do limite");
            sheet.put("hitPointsCurrent",current);persist();
            return response(200,new JSONObject().put("current",current));
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
      if(p.length==6&&p[1].equals("api")&&p[2].equals("play")&&p[4].equals("scenario")&&p[5].equals("flashlight")&&method.equals("POST")){
        JSONObject pl=checkPlayer(p[3],cookie(s,"rpg_guest"));
        if(pl==null)return json(403,"error","Sessão inválida");
        try{return response(200,playerFlashlight(p[3],pl,b));}
        catch(SecurityException denied){return json(403,"error","Este token não pertence ao jogador");}
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
        if("journal".equals(p[4]))return response(200,updatePlayerJournal(player,b));
        if("power-requests".equals(p[4]))return response(200,submitPlayerRequest(cid,player,b));
        if("consume-bonus".equals(p[4]))return response(200,consumeBonusAction(cid,player));
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
        if(p.length==6&&p[5].equals("power-request")&&method.equals("POST"))
          return response(200,answerPlayerRequest(cid,b));
        if(p.length==6&&p[5].equals("session-mode")&&method.equals("POST"))
          return response(200,setSessionMode(cid,b));
        if(p.length==6&&p[5].equals("movement")&&method.equals("POST")){
          movementRule(cid,b);return json(200,"ok","true");
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
