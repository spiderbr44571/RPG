package dev.rpgmesa.demo;
import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
import android.webkit.*;
import android.net.Uri;
public class MainActivity extends Activity {
 WebView browser;
 String host = null;
 final String page = "<html><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{background:#10121a;color:#e7d9c0;font-family:serif;margin:0;padding:24px}h1{color:#d9a867;font-size:32px}section{background:#1c202b;border:1px solid #6b5237;border-radius:14px;padding:20px;margin:16px 0}button{background:#876341;color:white;border:0;border-radius:8px;padding:12px;margin:5px}input{width:90%;padding:12px;background:#12151e;color:white;border:1px solid #937347;border-radius:8px}small{color:#b5a791}</style><h1>✦ RPG Mesa</h1><p>Protótipo Android • Edição 0.3</p><section><h2>Demo local</h2><p>O APK abre mesmo sem servidor. Para ver a interface completa, toque em <b>Conectar LAN</b> e informe o endereço do servidor 0.3 no PC.</p></section><section><h2>Ferramentas de dados</h2><button onclick='roll(20)'>Rolar d20</button><button onclick='roll(6)'>Rolar d6</button><p id='result'>Escolha um dado</p></section><section><h2>Ficha de teste</h2><small>Vida atual</small><p><button onclick='change(-1)'>−</button><strong id='hp'>20</strong> / 20<button onclick='change(1)'>+</button></p></section><script>let hp=20;function change(v){hp=Math.min(20,Math.max(0,hp+v));document.getElementById('hp').textContent=hp;}function roll(n){document.getElementById('result').textContent='Resultado: '+(1+Math.floor(Math.random()*n))+' (d'+n+')';}</script></html>";
 public void onCreate(Bundle b) {
  super.onCreate(b);
  LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setBackgroundColor(Color.rgb(16,18,26));
  LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER);
  Button offline=new Button(this);offline.setText("Offline");
  Button connect=new Button(this);connect.setText("Conectar LAN");
  bar.addView(offline,new LinearLayout.LayoutParams(0,-2,1));bar.addView(connect,new LinearLayout.LayoutParams(0,-2,1));
  root.addView(bar);
  browser=new WebView(this);browser.getSettings().setJavaScriptEnabled(true);browser.getSettings().setDomStorageEnabled(true);
  browser.getSettings().setAllowFileAccess(false);browser.getSettings().setAllowContentAccess(false);
  browser.getSettings().setAllowFileAccessFromFileURLs(false);browser.getSettings().setAllowUniversalAccessFromFileURLs(false);
  browser.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){Uri uri=req.getUrl();return !("http".equals(uri.getScheme())&&host!=null&&host.equals(uri.getHost()));}
  });
  root.addView(browser,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
  offline.setOnClickListener(v->openOffline());connect.setOnClickListener(v->connect());openOffline();
 }
 void openOffline(){host=null;browser.loadDataWithBaseURL("https://demo.invalid/",page,"text/html","UTF-8",null);}
 void connect(){
  EditText input=new EditText(this);input.setSingleLine(true);input.setText("http://192.168.1.10:8765/");
  new AlertDialog.Builder(this).setTitle("Servidor LAN").setMessage("Informe o IP privado do seu computador. Não use redes públicas.").setView(input).setNegativeButton("Cancelar",null).setPositiveButton("Conectar",(d,w)->{
   try{
    Uri u=Uri.parse(input.getText().toString().trim());String h=u.getHost();
    if(!"http".equals(u.getScheme())||h==null||!h.matches("(10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}|192\\.168\\.\\d{1,3}\\.\\d{1,3}|172\\.(1[6-9]|2[0-9]|3[01])\\.\\d{1,3}\\.\\d{1,3})")||u.getPort()<1||u.getPort()>65535)throw new Exception();
    host=h;browser.loadUrl(u.toString());
   }catch(Exception e){new AlertDialog.Builder(this).setMessage("Use http://192.168.x.x:8765/").setPositiveButton("OK",null).show();}
  }).show();
 }
 @Override public void onBackPressed(){if(browser.canGoBack())browser.goBack();else super.onBackPressed();}
}