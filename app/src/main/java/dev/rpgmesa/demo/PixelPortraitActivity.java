package dev.rpgmesa.demo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.PixelCopy;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import java.io.File;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.nio.charset.StandardCharsets;

/** Pixel Portrait Creator: the original lyime HTML5 app, inside a separate WebView.
 * No APK copy of the Godot game, no JavaScript bridges, and no access to RPG data.
 */
public final class PixelPortraitActivity extends Activity {
    public static final String OFFICIAL_PAGE = "https://lyime.itch.io/pixel-portrait-creator";
    /** Inspected directly from the official itch.io page, 2026-10-27. */
    public static final String VERIFIED_GODOT_GAME = "https://html.itch.zone/html/18379448/index.html?v=1785079497";
    private static final Pattern HTML5_ENTRY = Pattern.compile(
        "https://html\\.itch\\.zone/html/[0-9]{4,16}/index\\.html(?:\\?v=[0-9]{1,16})?");

    public static final String CAPTURE_FILENAME = "lyime-capture-v087.png";
    private WebView creator;
    private TextView progress;
    private Button capture;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(18,18,27));
        getWindow().setNavigationBarColor(Color.rgb(18,18,27));
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(21,20,31));

        LinearLayout header=new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(5),dp(4),dp(5),dp(4));
        Button back=button("Voltar");
        progress=new TextView(this);
        progress.setTextColor(Color.rgb(231,209,173));
        progress.setTextSize(11);
        progress.setGravity(Gravity.CENTER_VERTICAL);
        progress.setText("Editor original · carregando...");
        Button external=button("Navegador");
        Button refresh=button("Recarregar");
        header.addView(back);
        header.addView(progress,new LinearLayout.LayoutParams(0,dp(44),1));
        header.addView(refresh);
        header.addView(external);
        root.addView(header,new LinearLayout.LayoutParams(-1,-2));

        creator=new WebView(this);
        creator.setBackgroundColor(Color.rgb(23,23,33));
        WebSettings settings=creator.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // This WebView MUST NEVER receive addJavascriptInterface(). The itch page
        // runs third-party JavaScript and must not see Mastermind's RPG bridges.
        // Android WebView loads the original Godot HTML5 export as the TOP LEVEL
        // document, rather than embedding the itch.io project page in an iframe.
        // The official itch page denies third-party framing via frame-ancestors.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        creator.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                if(!request.isForMainFrame())return false; // itch-hosted HTML5 iframe
                Uri uri=request.getUrl();
                if("https".equalsIgnoreCase(uri.getScheme())&&isItchHost(uri.getHost()))return false;
                try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                 android.webkit.WebResourceError error){
                if(request.isForMainFrame()){
                    progress.setText("Falha de rede: tente Navegador");
                    new AlertDialog.Builder(PixelPortraitActivity.this)
                        .setMessage("O editor online não carregou. Verifique a conexão ou abra no navegador. O Ateliê do Mastermind continua disponível para importar PNG.")
                        .setPositiveButton("Navegador",(d,w)->openBrowser())
                        .setNegativeButton("Fechar",null).show();
                }
            }
        });
        creator.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView view,int value){
                progress.setText(value<100?"Godot HTML5 · "+value+"%":"Pixel Portrait Creator · carregado");
            }
        });
        root.addView(creator,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout footer=new LinearLayout(this);
        footer.setGravity(Gravity.CENTER_VERTICAL);
        footer.setPadding(dp(8),dp(5),dp(8),dp(7));
        capture=button("Capturar tela para a ficha");
        capture.setAllCaps(false);
        capture.setTextSize(13);
        capture.setTextColor(Color.rgb(28,23,31));
        capture.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(207,167,107)));
        TextView note=new TextView(this);
        note.setText("Personalize no original · recorte depois no Mastermind");
        note.setTextSize(10);
        note.setTextColor(Color.rgb(208,192,170));
        note.setGravity(Gravity.CENTER);
        footer.addView(capture,new LinearLayout.LayoutParams(-1,dp(49)));
        root.addView(footer,new LinearLayout.LayoutParams(-1,-2));
        root.addView(note,new LinearLayout.LayoutParams(-1,dp(25)));
        setContentView(root);
        back.setOnClickListener(v->finish());
        external.setOnClickListener(v->openBrowser());
        refresh.setOnClickListener(v->loadOriginalGame());
        capture.setOnClickListener(v->captureVisiblePage());
        loadOriginalGame();
    }

    /** Discover the HTML5 entry from itch.io's public <iframe data-iframe> markup.
     * A game update may replace the numerical upload; validate the origin/path before loading.
     * The inspected working upload remains a fallback if the website lookup fails.
     */
    private void loadOriginalGame(){
        if(creator==null)return;
        progress.setText("Localizando exportação HTML5 original...");
        new Thread(()->{
            String resolved=VERIFIED_GODOT_GAME;
            HttpURLConnection connection=null;
            try{
                connection=(HttpURLConnection)new URL(OFFICIAL_PAGE).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setRequestProperty("Accept","text/html");
                connection.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125.0.0.0 Mobile Safari/537.36");
                int status=connection.getResponseCode();
                if(status==200){
                    try(InputStream input=connection.getInputStream();
                        ByteArrayOutputStream data=new ByteArrayOutputStream()){
                        byte[] buf=new byte[4096];int count;
                        while((count=input.read(buf))!=-1){
                            if(data.size()+count>262144)break;
                            data.write(buf,0,count);
                        }
                        Matcher found=HTML5_ENTRY.matcher(data.toString("UTF-8"));
                        if(found.find())resolved=found.group();
                    }
                }
            }catch(Exception ignored){
                // Either network is offline or itch markup changed; try the verified
                // upload and offer the external-browser fallback on load error.
            }finally{if(connection!=null)connection.disconnect();}
            final String gameUrl=resolved;
            runOnUiThread(()->{
                if(creator==null||isFinishing())return;
                progress.setText("Carregando o Godot original...");
                creator.loadUrl(gameUrl);
            });
        },"lyime-html5-resolver").start();
    }
    private static boolean isItchHost(String host){
        if(host==null)return false;
        host=host.toLowerCase(java.util.Locale.ROOT);
        return host.equals("lyime.itch.io")||host.equals("itch.io")||
               host.endsWith(".itch.io")||host.equals("itch.zone")||
               host.endsWith(".itch.zone");
    }

    private int dp(int v){return Math.round(getResources().getDisplayMetrics().density*v);}
    private Button button(String name){
        Button result=new Button(this);
        result.setText(name);
        result.setTextSize(11);
        result.setAllCaps(false);
        result.setTextColor(Color.rgb(240,222,197));
        return result;
    }
    private void openBrowser(){
        try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(OFFICIAL_PAGE)));}
        catch(Exception ignored){progress.setText("Navegador não disponível");}
    }
    private void captureVisiblePage(){
        if(creator==null||creator.getWidth()<40||creator.getHeight()<40){
            progress.setText("Abra o editor primeiro.");return;
        }
        Rect area=new Rect();
        if(!creator.getGlobalVisibleRect(area)||area.width()<64||area.height()<64){
            progress.setText("A tela ainda não está visível.");return;
        }
        if(area.width()*(long)area.height()>12000000L){
            progress.setText("Prévia muito grande para capturar.");return;
        }
        final Bitmap bitmap=Bitmap.createBitmap(area.width(),area.height(),Bitmap.Config.ARGB_8888);
        capture.setEnabled(false);
        PixelCopy.request(getWindow(),area,bitmap,result->{
            capture.setEnabled(true);
            if(result!=PixelCopy.SUCCESS){
                bitmap.recycle();progress.setText("Captura indisponível. Use a captura do Android.");
                return;
            }
            try{
                File out=new File(getCacheDir(),CAPTURE_FILENAME);
                try(FileOutputStream stream=new FileOutputStream(out)){
                    if(!bitmap.compress(Bitmap.CompressFormat.PNG,100,stream))throw new Exception("PNG inválido");
                }
                if(out.length()<100||out.length()>4000000L)throw new Exception("Imagem fora do limite");
                Intent data=new Intent();
                data.putExtra("pixelportrait_capture",CAPTURE_FILENAME);
                setResult(RESULT_OK,data);
                finish();
            }catch(Exception error){
                progress.setText("Falha na captura. Use a captura do Android.");
            }finally{bitmap.recycle();}
        },new Handler(Looper.getMainLooper()));
    }

    @Override public void onBackPressed(){
        if(creator!=null&&creator.canGoBack())creator.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy(){
        if(creator!=null){
            creator.stopLoading();
            creator.loadUrl("about:blank");
            creator.destroy();
            creator=null;
        }
        super.onDestroy();
    }
}
