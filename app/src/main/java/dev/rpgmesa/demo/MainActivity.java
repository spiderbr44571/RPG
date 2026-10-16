package dev.rpgmesa.demo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.os.ParcelFileDescriptor;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
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
    private final BookBridge books = new BookBridge();
    private final LanBridge lan = new LanBridge();
    private static final String OFFLINE_URL = "file:///android_asset/demo-offline.html";
    private WebView browser;
    private TextView mode;
    private String allowedHost;
    private int allowedPort;
    private ValueCallback<Uri[]> pendingUpload;

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
        // A barra de conexão é substituída pela ferramenta "Mesa em rede".
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
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        home.setOnClickListener(v->openOffline());
        connect.setOnClickListener(v->promptLan());
        openOffline();
    }
    private int dp(int x){return Math.round(getResources().getDisplayMetrics().density*x);}
    private Button button(String name){Button b=new Button(this);b.setText(name);b.setTextSize(10);b.setAllCaps(false);return b;}
    private void openOffline(){allowedHost=null;allowedPort=0;mode.setText("● MODO OFFLINE");browser.addJavascriptInterface(books,"RpgBookBridge");browser.addJavascriptInterface(lan,"RpgLanBridge");browser.loadUrl(OFFLINE_URL);}
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
              browser.removeJavascriptInterface("RpgLanBridge"); // Remote pages cannot access native functionality.
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
