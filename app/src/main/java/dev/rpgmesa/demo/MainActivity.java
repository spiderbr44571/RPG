package dev.rpgmesa.demo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import org.json.JSONArray;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.pdf.PdfRenderer;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.ValueCallback;

/** RPG Mesa 0.4 — o sistema completo funciona sem rede.
 * Sincronização em LAN é inteiramente opcional. Nunca expor o endpoint LAN à internet.
 */
public final class MainActivity extends Activity {
    private static final int PICK_LOCAL_FILE = 1104;
    private static final int PICK_BOOK_DOCUMENT = 1105;
    private static final int SAVE_CHARACTER_PDF = 1106;
    private final BookBridge books = new BookBridge();
    private final LanBridge lan = new LanBridge();
    private final CampaignBridge campaign = new CampaignBridge();
    private final HostBridge localHost = new HostBridge();
    private final DriveBridge drive = new DriveBridge();
    private final SheetPdfBridge sheetPdf = new SheetPdfBridge();
    private final CreatureImageBridge creatureArt = new CreatureImageBridge();

    private static final String OFFLINE_URL = "file:///android_asset/demo-offline.html";
    private WebView browser;
    private TextView mode;
    private String allowedHost;
    private int allowedPort;
    private ValueCallback<Uri[]> pendingUpload;
    private byte[] pendingCharacterPdf;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(12,14,20));
        getWindow().setNavigationBarColor(Color.rgb(12,14,20));
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(12,14,20));
        LinearLayout top=new LinearLayout(this);
        top.setPadding(dp(7),dp(4),dp(7),dp(4));
        top.setGravity(Gravity.CENTER_VERTICAL);
        mode=new TextView(this);
        mode.setTextColor(Color.rgb(200,175,136));
        mode.setTextSize(10);
        mode.setText("● MODO OFFLINE");
        Button home=button("Offline");
        Button connect=button("LAN opcional");
        top.addView(mode,new LinearLayout.LayoutParams(0,dp(42),1));
        top.addView(home);top.addView(connect);
        // O único acesso permanente às ferramentas agora é o d20 dentro da interface.
        // Campanhas e servidor agora ficam no módulo Mestragem.
        browser=new WebView(this);
        WebSettings cfg=browser.getSettings();
        cfg.setJavaScriptEnabled(true);
        cfg.setDomStorageEnabled(true);
        cfg.setAllowFileAccess(true);
        cfg.setAllowContentAccess(true);
        cfg.setAllowFileAccessFromFileURLs(false);
        cfg.setAllowUniversalAccessFromFileURLs(false);
        cfg.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        cfg.setSupportZoom(false);
        browser.setWebViewClient(new WebViewClient() {
          @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req) {
            Uri u=req.getUrl();
            // Resources / PDFs selected locally stay on device.
            if ("blob".equals(u.getScheme())) return false;
            if ("file".equals(u.getScheme())) return !OFFLINE_URL.equals(u.toString());
            if(allowedHost==null && "https".equals(u.getScheme()) && "drive.google.com".equalsIgnoreCase(u.getHost()) &&
                u.getPath()!=null && (u.getPath().matches("/file/d/[A-Za-z0-9_-]{10,160}(/view)?") || u.getPath().matches("/drive/folders/[A-Za-z0-9_-]{10,160}"))) {
              try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception err){showBookError("Não foi possível abrir o Drive.");}
              return true;
            }
            return !("http".equals(u.getScheme()) && allowedHost!=null
               && allowedHost.equals(u.getHost()) && allowedPort==u.getPort());
          }
        });
        browser.setWebChromeClient(new WebChromeClient() {
           @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams args) {
               if(pendingUpload!=null)pendingUpload.onReceiveValue(null);
               pendingUpload=cb;
               try {
                   Intent i=args.createIntent();
                   startActivityForResult(i,PICK_LOCAL_FILE);
                   return true;
               } catch(Exception err) {
                   pendingUpload=null;
                   cb.onReceiveValue(null);
                   new AlertDialog.Builder(MainActivity.this)
                     .setMessage("Nenhum seletor de arquivos disponível.")
                     .setPositiveButton("OK",null).show();
                   return false;
               }
           }
        });
        browser.addJavascriptInterface(books,"RpgBookBridge");
        browser.addJavascriptInterface(lan,"RpgLanBridge");
        browser.addJavascriptInterface(campaign,"RpgCampaignBridge");
        browser.addJavascriptInterface(localHost,"RpgLocalHost");browser.addJavascriptInterface(drive,"RpgDriveBridge");browser.addJavascriptInterface(sheetPdf,"RpgSheetPdfBridge");browser.addJavascriptInterface(creatureArt,"RpgCreatureImageBridge");
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        home.setOnClickListener(v->openOffline());
        connect.setOnClickListener(v->promptLan());
        openOffline();
    }
    private int dp(int x){return Math.round(getResources().getDisplayMetrics().density*x);}
    private Button button(String name){Button b=new Button(this);b.setText(name);b.setTextSize(10);b.setAllCaps(false);return b;}
    private void openOffline(){allowedHost=null;allowedPort=0;mode.setText("● MODO OFFLINE");browser.addJavascriptInterface(books,"RpgBookBridge");browser.addJavascriptInterface(lan,"RpgLanBridge");browser.addJavascriptInterface(campaign,"RpgCampaignBridge");browser.addJavascriptInterface(localHost,"RpgLocalHost");browser.addJavascriptInterface(drive,"RpgDriveBridge");browser.addJavascriptInterface(sheetPdf,"RpgSheetPdfBridge");browser.addJavascriptInterface(creatureArt,"RpgCreatureImageBridge");browser.loadUrl(OFFLINE_URL);}
    private static boolean isPrivateLan(String h) {
        if(h==null||!h.matches("\\d{1,3}(\\.\\d{1,3}){3}"))return false;
        String[] p=h.split("\\.");int[] n=new int[4];
        for(int j=0;j<4;j++){n[j]=Integer.parseInt(p[j]);if(n[j]<0||n[j]>255)return false;}
        return n[0]==10 || n[0]==172&&n[1]>=16&&n[1]<=31 || n[0]==192&&n[1]==168;
    }
    private void promptLan(){
        EditText input=new EditText(this);
        input.setSingleLine(true);
        input.setText(getPreferences(Context.MODE_PRIVATE).getString("lan","http://192.168.1.10:8765/"));
        new AlertDialog.Builder(this)
          .setTitle("Conectar à mesa na rede local")
          .setMessage("Opcional. Para sincronizar mestre e jogadores, use somente o IP privado do PC. Sem precisar de LAN para o modo offline.")
          .setView(input).setNegativeButton("Cancelar",null)
          .setPositiveButton("Conectar",(d,w)->{
            try {
              Uri u=Uri.parse(input.getText().toString().trim());
              if(!"http".equals(u.getScheme())||!isPrivateLan(u.getHost())||u.getPort()<1||u.getPort()>65535)
                 throw new IllegalArgumentException("Endereço inválido");
              browser.removeJavascriptInterface("RpgBookBridge");
              browser.removeJavascriptInterface("RpgLanBridge");
              browser.removeJavascriptInterface("RpgCampaignBridge");
              browser.removeJavascriptInterface("RpgLocalHost");
          browser.removeJavascriptInterface("RpgDriveBridge");
          browser.removeJavascriptInterface("RpgSheetPdfBridge");
          browser.removeJavascriptInterface("RpgCreatureImageBridge");
           // Native API is never available to remote pages.
              allowedHost=u.getHost();allowedPort=u.getPort();
              getPreferences(Context.MODE_PRIVATE).edit().putString("lan",u.toString()).apply();
              mode.setText("● CONECTADO À LAN");browser.loadUrl(u.toString());
            }catch(Exception err){
              new AlertDialog.Builder(this).setMessage("Informe endereço privado válido, por exemplo http://192.168.1.10:8765/")
               .setPositiveButton("OK",null).show();
            }
          }).show();
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==SAVE_CHARACTER_PDF){
          final byte[] bytes=pendingCharacterPdf;
          pendingCharacterPdf=null;
          if(result==RESULT_OK && data!=null && data.getData()!=null && bytes!=null){
            try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"w")){
              if(out==null)throw new IllegalStateException("Destino nao disponivel");
              out.write(bytes);out.flush();
              android.widget.Toast.makeText(this,"Ficha PDF salva",android.widget.Toast.LENGTH_SHORT).show();
            }catch(Exception err){showBookError("Falha ao salvar a ficha em PDF: "+err.getMessage());}
          }
          return;
        }
        if(request==PICK_BOOK_DOCUMENT){
          if(result==RESULT_OK && data!=null && data.getData()!=null){
            try{
              Uri uri=data.getData();
              getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
              String name="Livro de Regras (PDF)";
              try(Cursor cur=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){
                if(cur!=null && cur.moveToFirst())name=cur.getString(0);
              }
              getPreferences(Context.MODE_PRIVATE).edit().putString("op_pdf_uri",uri.toString()).putString("op_pdf_name",name).apply();
              // A miniatura é criada localmente em segundo plano, usando a PRIMEIRA página do PDF.
              final String filename=name;
              new Thread(()->{
                String cover=renderPdfCover(uri);
                if(cover!=null)getPreferences(Context.MODE_PRIVATE).edit().putString("op_pdf_cover",cover).apply();
                String payload="{name:"+JSONObject.quote(filename)+",available:true,cover:"+JSONObject.quote(cover==null?"":cover)+"}";
                runOnUiThread(()->browser.evaluateJavascript("window.dispatchEvent(new CustomEvent('rpg-book-selected',{detail:"+payload+"}));",null));
              },"rpg-pdf-cover").start();
            }catch(Exception error){showBookError("Não foi possível guardar o acesso ao PDF: "+error.getMessage());}
          }
          return;
        }
        if(request==PICK_LOCAL_FILE && pendingUpload!=null){
          Uri[] chosen=WebChromeClient.FileChooserParams.parseResult(result,data);
          pendingUpload.onReceiveValue(chosen);
          pendingUpload=null;
        }
    }

    /** SAF: only user-selected PDFs, no broad storage permissions and no network upload. */
    public final class BookBridge {
      @JavascriptInterface public String getSavedPdf(){
        String path=getPreferences(Context.MODE_PRIVATE).getString("op_pdf_uri",null);
        String name=getPreferences(Context.MODE_PRIVATE).getString("op_pdf_name","Livro");
        String cover=getPreferences(Context.MODE_PRIVATE).getString("op_pdf_cover","");
        return "{\"available\":"+(path!=null)+",\"name\":"+JSONObject.quote(name)+",\"cover\":"+JSONObject.quote(cover)+"}";
      }
      @JavascriptInterface public void pickPdf(){runOnUiThread(()->{
        try{
          Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
          intent.addCategory(Intent.CATEGORY_OPENABLE);
          intent.setType("application/pdf");
          intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
          startActivityForResult(intent,PICK_BOOK_DOCUMENT);
        }catch(Exception e){showBookError("Não foi possível abrir o seletor de PDF.");}
      });}
      /** Render only a page of the document chosen by the user; never bundled or uploaded. */
      @JavascriptInterface public void renderPage(int printedPage) {
        final String link=getPreferences(Context.MODE_PRIVATE).getString("op_pdf_uri",null);
        if(link==null || printedPage<1 || printedPage>500) {
           sendPdfError("Importe o PDF primeiro pela Biblioteca.");return;
        }
        try(ParcelFileDescriptor fd=getContentResolver().openFileDescriptor(Uri.parse(link),"r")) {
          if(fd==null){sendPdfError("Documento indisponível.");return;}
          try(PdfRenderer renderer=new PdfRenderer(fd)) {
             int index=printedPage+9;
             if(index<0 || index>=renderer.getPageCount()){sendPdfError("Página não encontrada neste PDF.");return;}
             try(PdfRenderer.Page page=renderer.openPage(index)) {
                final float scale=Math.min(1150f/page.getWidth(),1450f/page.getHeight());
                final int width=Math.max(1,Math.round(page.getWidth()*scale));
                final int height=Math.max(1,Math.round(page.getHeight()*scale));
                Bitmap img=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);
                try {
                    img.eraseColor(Color.WHITE);
                    page.render(img,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                    ByteArrayOutputStream out=new ByteArrayOutputStream();
                    if(!img.compress(Bitmap.CompressFormat.JPEG,80,out)){sendPdfError("Erro ao renderizar página.");return;}
                    String data="data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP);
                    final String script="window.dispatchEvent(new CustomEvent('rpg-page-rendered',{detail:{page:"+printedPage+",src:"+JSONObject.quote(data)+"}}));";
                    runOnUiThread(()->browser.evaluateJavascript(script,null));
                } finally {img.recycle();}
             }
          }
        }catch(Exception e){sendPdfError("Não foi possível ler esta página. Verifique o arquivo e tente novamente.");}
      }
      private void sendPdfError(String message){
        final String js="window.dispatchEvent(new CustomEvent('rpg-page-error',{detail:"+JSONObject.quote(message)+"}));";
        runOnUiThread(()->browser.evaluateJavascript(js,null));
      }
      @JavascriptInterface public void openSavedPdf(){runOnUiThread(()->{
        String link=getPreferences(Context.MODE_PRIVATE).getString("op_pdf_uri",null);
        if(link==null){showBookError("Importe seu PDF pessoal pela Biblioteca.");return;}
        try{
          Uri uri=Uri.parse(link);
          Intent intent=new Intent(Intent.ACTION_VIEW);
          intent.setDataAndType(uri,"application/pdf");
          intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
          startActivity(intent);
        }catch(Exception e){showBookError("Instale um leitor de PDF compatível ou importe o documento novamente.");}
      });}
    }


    /** Interface nativa restrita a um computador da LAN e à API de campanhas.
     * Executa em thread de JS bridge do WebView, não na thread principal.
     */
    public final class CampaignBridge {
      @JavascriptInterface public String request(String base, String adminKey, String method, String route, String payload) {
        HttpURLConnection conn=null;
        try {
          Uri uri=Uri.parse(base==null?"":base.trim());
          String ip=uri.getHost();
          int port=uri.getPort();
          if(!"http".equals(uri.getScheme())||!isPrivateLan(ip)||port<1024||port>65535)
             throw new IllegalArgumentException("Use http://192.168.x.x:8765");
          if(uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null)
             throw new IllegalArgumentException("Endereço não permitido");
          if(route==null||!route.matches("/api/admin/campaigns(/[a-z0-9]{1,32}(/[a-z]+(/[a-z0-9]{1,32})?)?)?"))
             throw new IllegalArgumentException("Rota não autorizada");
          String verb=method==null?"":method.toUpperCase(java.util.Locale.ROOT);
          if(!("GET".equals(verb)||"POST".equals(verb)||"PUT".equals(verb)))
             throw new IllegalArgumentException("Método não permitido");
          if(adminKey==null||adminKey.length()<16||adminKey.length()>200)
             throw new IllegalArgumentException("Chave do mestre inválida");
          URL remote=new URL("http://"+ip+":"+port+route);
          conn=(HttpURLConnection)remote.openConnection();
          conn.setInstanceFollowRedirects(false);
          conn.setConnectTimeout(3500);conn.setReadTimeout(6500);
          conn.setRequestMethod(verb);
          conn.setRequestProperty("Authorization","Bearer "+adminKey);
          conn.setRequestProperty("Accept","application/json");
          if(!"GET".equals(verb)){
             if(payload==null||payload.getBytes(StandardCharsets.UTF_8).length>450000)
                throw new IllegalArgumentException("Dados excedem limite");
             conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");
             try(java.io.OutputStream out=conn.getOutputStream()){
               out.write(payload.getBytes(StandardCharsets.UTF_8));
             }
          }
          int code=conn.getResponseCode();
          try(InputStream in=code<400?conn.getInputStream():conn.getErrorStream()){
             ByteArrayOutputStream bytes=new ByteArrayOutputStream();
             if(in!=null){byte[] b=new byte[8192];int n;while((n=in.read(b))>=0){
               if(bytes.size()+n>3_000_000)throw new IllegalArgumentException("Resposta muito grande");
               bytes.write(b,0,n);
             }}
             return "{\"status\":"+code+",\"body\":"+JSONObject.quote(bytes.toString("UTF-8"))+"}";
          }
        } catch(Exception exc) {
          return "{\"status\":0,\"error\":"+JSONObject.quote(exc.getMessage()==null?"Conexão indisponível":exc.getMessage())+"}";
        } finally {if(conn!=null)conn.disconnect();}
      }
    }


    public final class HostBridge {
      @JavascriptInterface public String status(){
        try{return MesaHostService.snapshot().toString();}
        catch(Exception e){return "{\"running\":false,\"error\":\"Sem status\"}";}
      }
      @JavascriptInterface public String masterKey(){
        LocalCampaignServer srv=MesaHostService.instance;
        return srv==null?"":srv.masterKey();
      }
      @JavascriptInterface public void start(){
        runOnUiThread(()->{
          if(android.os.Build.VERSION.SDK_INT>=33 &&
             checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},160);
          Intent intent=new Intent(MainActivity.this,MesaHostService.class).setAction(MesaHostService.ACTION_START);
          if(android.os.Build.VERSION.SDK_INT>=26)startForegroundService(intent);
          else startService(intent);
        });
      }
      @JavascriptInterface public void stop(){
        runOnUiThread(()->{
          Intent intent=new Intent(MainActivity.this,MesaHostService.class).setAction(MesaHostService.ACTION_STOP);
          startService(intent);
        });
      }
      @JavascriptInterface public void shareInvite(String value){
        runOnUiThread(()->{
          try {
            Uri url=Uri.parse(value==null?"":value);
            if(!"http".equals(url.getScheme()) || !isPrivateLan(url.getHost()) || url.getPort()!=8765 ||
               url.getPath()==null || !url.getPath().matches("/join/[a-f0-9]{32}/[A-Za-z0-9_-]{30,60}") ||
               url.getQuery()!=null || url.getFragment()!=null)
              throw new IllegalArgumentException("Convite inválido");
            Intent send=new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT,"Convite para nossa campanha de RPG:\n"+url);
            startActivity(Intent.createChooser(send,"Compartilhar convite"));
          }catch(Exception e){showBookError("Link de convite inválido ou indisponível.");}
        });
      }
      @JavascriptInterface public void openLocalMaster(){
        runOnUiThread(()->{
          LocalCampaignServer server=MesaHostService.instance;
          if(server==null){showBookError("Inicie o servidor primeiro em Mestragem.");return;}
          browser.removeJavascriptInterface("RpgBookBridge");
          browser.removeJavascriptInterface("RpgLanBridge");
          browser.removeJavascriptInterface("RpgCampaignBridge");
          browser.removeJavascriptInterface("RpgLocalHost");
          browser.removeJavascriptInterface("RpgDriveBridge");
          browser.removeJavascriptInterface("RpgSheetPdfBridge");
          browser.removeJavascriptInterface("RpgCreatureImageBridge");
          
          allowedHost="127.0.0.1";allowedPort=server.currentPort();
          browser.loadUrl("http://127.0.0.1:"+allowedPort+"/master");
        });
      }
    }
    /** Opens known Google Drive document/folder IDs in an external app without embedding private credentials. */
    /** Android bridge for the user's PRIVATE LAN rule-search proxy.
     * Never exposes arbitrary HTTP, and is removed when a remote LAN site is loaded.
     */
    /** Small, explicit Wikimedia Commons lookup. Art is previewed, not auto-assigned. */
    public final class CreatureImageBridge {
      private boolean valid(String name,String id){
        return allowedHost==null && name!=null && !name.isEmpty() && name.length()<=100 &&
          id!=null && id.matches("[A-Za-z0-9_-]{10,100}");
      }
      private String response(String url,int max) throws Exception{
        HttpURLConnection conn=(HttpURLConnection)new URL(url).openConnection();
        conn.setConnectTimeout(6500);conn.setReadTimeout(8500);
        conn.setInstanceFollowRedirects(false);
        conn.setRequestProperty("User-Agent","RPGMesa/0.19 (Wikimedia Commons attribution search)");
        try {
          if(conn.getResponseCode()!=200)throw new IllegalStateException("Fonte indisponível");
          if(conn.getContentLengthLong()>max)throw new IllegalArgumentException("Resposta muito grande");
          try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buf=new byte[8192];int n;while((n=in.read(buf))>0){out.write(buf,0,n);if(out.size()>max)throw new IllegalArgumentException("Resposta muito grande");}
            return out.toString("UTF-8");
          }
        }finally{conn.disconnect();}
      }
      private void dispatch(String type,JSONObject data){
        runOnUiThread(()->{
          if(allowedHost==null && browser!=null)
            browser.evaluateJavascript("window.dispatchEvent(new CustomEvent("+JSONObject.quote(type)+",{detail:"+data.toString()+"}));",null);
        });
      }
      private String plain(String html){
        return html.replaceAll("<[^>]*>","").replace("&amp;","&").replace("&quot;","\"").trim();
      }
      @JavascriptInterface public void search(String systemId,String name,String requestId){
        if(!valid(name,requestId)||systemId==null||!systemId.matches("[a-z0-9-]{1,48}"))return;
        new Thread(()->{
          JSONObject result=new JSONObject();
          try{
            result.put("requestId",requestId);
            String q=URLEncoder.encode(name+" fantasy illustration","UTF-8");
            String url="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch="+q+"&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=420&format=json";
            JSONObject root=new JSONObject(response(url,320000));
            JSONObject pages=root.optJSONObject("query")==null?null:root.getJSONObject("query").optJSONObject("pages");
            if(pages!=null){
              JSONArray keys=pages.names();
              for(int k=0;keys!=null&&k<keys.length();k++){
                JSONObject page=pages.optJSONObject(keys.getString(k));
                if(page==null)continue;
                String title=page.optString("title","");
                if(!title.toLowerCase(java.util.Locale.ROOT).matches(".*\\.(png|jpg|jpeg|webp)"))continue;
                JSONArray info=page.optJSONArray("imageinfo");if(info==null||info.length()==0)continue;
                JSONObject entry=info.optJSONObject(0);if(entry==null)continue;
                String thumbnail=entry.optString("thumburl","");
                if(!thumbnail.startsWith("https://upload.wikimedia.org/"))continue;
                JSONObject extra=entry.optJSONObject("extmetadata");
                if(extra==null)continue;
                String license=plain(extra.optJSONObject("LicenseShortName")==null?"":extra.getJSONObject("LicenseShortName").optString("value",""));
                String lower=license.toLowerCase(java.util.Locale.ROOT);
                if(!(lower.contains("cc")||lower.contains("public domain")||lower.contains("pd-")))continue;
                String artist=plain(extra.optJSONObject("Artist")==null?"":extra.getJSONObject("Artist").optString("value",""));
                result.put("url",thumbnail).put("license",license.substring(0,Math.min(50,license.length()))).put("artist",artist.substring(0,Math.min(120,artist.length())));
                result.put("source",entry.optString("descriptionurl",""));
                break;
              }
            }
          }catch(Exception err){try{result.put("error","Busca não disponível");}catch(Exception ignored){}}
          dispatch("rpg19-image-search-result",result);
        },"rpg-commons-lookup").start();
      }
      @JavascriptInterface public void saveFromCommons(String candidate,String requestId,String license,String credit){
        if(!valid("image",requestId)||candidate==null||candidate.length()>1000)return;
        try{
          Uri url=Uri.parse(candidate);
          if(!"https".equals(url.getScheme())||!"upload.wikimedia.org".equalsIgnoreCase(url.getHost()))return;
        }catch(Exception err){return;}
        new Thread(()->{
          try{
            HttpURLConnection conn=(HttpURLConnection)new URL(candidate).openConnection();
            conn.setConnectTimeout(6500);conn.setReadTimeout(10000);conn.setInstanceFollowRedirects(false);
            try{
              if(conn.getResponseCode()!=200||conn.getContentLengthLong()>1800000)throw new IllegalArgumentException("Imagem indisponível");
              ByteArrayOutputStream out=new ByteArrayOutputStream();
              try(InputStream in=conn.getInputStream()){
                byte[] buf=new byte[8192];int n;while((n=in.read(buf))>0){out.write(buf,0,n);if(out.size()>1800000)throw new IllegalArgumentException("Arquivo grande");}
              }
              Bitmap raw=BitmapFactory.decodeByteArray(out.toByteArray(),0,out.size());if(raw==null)throw new IllegalArgumentException("Imagem inválida");
              float scale=Math.min(1f,320f/Math.max(raw.getWidth(),raw.getHeight()));
              Bitmap img=Bitmap.createScaledBitmap(raw,Math.max(1,Math.round(raw.getWidth()*scale)),Math.max(1,Math.round(raw.getHeight()*scale)),true);
              ByteArrayOutputStream jpg=new ByteArrayOutputStream();img.compress(Bitmap.CompressFormat.JPEG,68,jpg);
              if(img!=raw)img.recycle();raw.recycle();
              JSONObject result=new JSONObject().put("requestId",requestId)
               .put("image","data:image/jpeg;base64,"+Base64.encodeToString(jpg.toByteArray(),Base64.NO_WRAP))
               .put("license",license.substring(0,Math.min(50,license.length())))
               .put("credit",credit.substring(0,Math.min(140,credit.length())));
              dispatch("rpg19-image-saved",result);
            }finally{conn.disconnect();}
          }catch(Exception error){dispatch("rpg19-image-search-result",new JSONObject());}
        },"rpg-commons-image").start();
      }
    }
    /** SAF: gera um documento PDF local escolhido pelo usuario, sem enviar fichas a servidores. */
    public final class SheetPdfBridge {
      @JavascriptInterface public void savePdf(String filename,String base64){
        if(filename==null || !filename.matches("[A-Za-z0-9._-]{1,90}\\.pdf") ||
           base64==null || base64.length()>3600000)return;
        runOnUiThread(()->{
          if(allowedHost!=null)return; // Não expor a ponte em paginas da LAN.
          try{
            byte[] bytes=Base64.decode(base64,Base64.DEFAULT);
            if(bytes.length<200 || bytes.length>2600000 ||
               !new String(bytes,0,Math.min(5,bytes.length),StandardCharsets.US_ASCII).equals("%PDF-"))
              throw new IllegalArgumentException("PDF invalido");
            pendingCharacterPdf=bytes;
            Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/pdf");
            i.putExtra(Intent.EXTRA_TITLE,filename);
            startActivityForResult(i,SAVE_CHARACTER_PDF);
          }catch(Exception err){pendingCharacterPdf=null;showBookError("Nao foi possivel preparar o PDF: "+err.getMessage());}
        });
      }
    }
    public final class DriveBridge {
      @JavascriptInterface public void openDocument(String kind,String id){
        if(id==null || !id.matches("[A-Za-z0-9_-]{10,160}"))return;
        if(!"file".equals(kind) && !"folder".equals(kind))return;
        runOnUiThread(()->{
          if(allowedHost!=null)return; // Not available to remote LAN pages.
          String path="file".equals(kind)?"/file/d/"+id+"/view":"/drive/folders/"+id;
          try{
            Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse("https://drive.google.com"+path));
            startActivity(intent);
          }catch(Exception ex){showBookError("Não foi possível abrir o Google Drive neste aparelho.");}
        });
      }
    }
    public final class LanBridge {
      @JavascriptInterface public void launchLanMaster(){runOnUiThread(()->promptLan());}
    }
    private String renderPdfCover(Uri uri){
      try(ParcelFileDescriptor fd=getContentResolver().openFileDescriptor(uri,"r")) {
        if(fd==null)return null;
        try(PdfRenderer pdf=new PdfRenderer(fd)) {
          if(pdf.getPageCount()<1)return null;
          try(PdfRenderer.Page page=pdf.openPage(0)) {
            float scale=Math.min(310f/page.getWidth(),460f/page.getHeight());
            int w=Math.max(1,Math.round(page.getWidth()*scale));
            int h=Math.max(1,Math.round(page.getHeight()*scale));
            Bitmap bmp=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);
            try {
              bmp.eraseColor(Color.WHITE);
              page.render(bmp,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
              ByteArrayOutputStream out=new ByteArrayOutputStream();
              if(!bmp.compress(Bitmap.CompressFormat.JPEG,72,out))return null;
              return "data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP);
            } finally {bmp.recycle();}
          }
        }
      } catch(Exception error){return null;}
    }
    private void showBookError(String error){runOnUiThread(()->new AlertDialog.Builder(this).setTitle("Biblioteca")
       .setMessage(error).setPositiveButton("OK",null).show());}
    @Override public void onBackPressed(){if(allowedHost!=null){openOffline();return;}if(browser!=null&&browser.canGoBack())browser.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(pendingUpload!=null){pendingUpload.onReceiveValue(null);pendingUpload=null;}if(browser!=null)browser.destroy();super.onDestroy();}
}
