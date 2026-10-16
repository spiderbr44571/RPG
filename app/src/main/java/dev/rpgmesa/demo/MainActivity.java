package dev.rpgmesa.demo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
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
        root.addView(top,new LinearLayout.LayoutParams(-1,dp(52)));
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
        root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        home.setOnClickListener(v->openOffline());
        connect.setOnClickListener(v->promptLan());
        openOffline();
    }
    private int dp(int x){return Math.round(getResources().getDisplayMetrics().density*x);}
    private Button button(String name){Button b=new Button(this);b.setText(name);b.setTextSize(10);b.setAllCaps(false);return b;}
    private void openOffline(){allowedHost=null;allowedPort=0;mode.setText("● MODO OFFLINE");browser.loadUrl(OFFLINE_URL);}
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
        if(request==PICK_LOCAL_FILE && pendingUpload!=null){
          Uri[] chosen=WebChromeClient.FileChooserParams.parseResult(result,data);
          pendingUpload.onReceiveValue(chosen);
          pendingUpload=null;
        }
    }
    @Override public void onBackPressed(){if(browser!=null&&browser.canGoBack())browser.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){if(pendingUpload!=null){pendingUpload.onReceiveValue(null);pendingUpload=null;}if(browser!=null)browser.destroy();super.onDestroy();}
}
