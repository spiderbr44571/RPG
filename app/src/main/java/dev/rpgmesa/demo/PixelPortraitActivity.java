package dev.rpgmesa.demo;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.PixelCopy;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
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
import org.json.JSONArray;
import org.json.JSONObject;

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
    private FrameLayout gameViewport;
    private TextView zoomReadout;
    private Button dragButton;
    private Button rotationButton;
    private LinearLayout zoomToolbar;

    /** Native view-level zoom: avoids modifying or replacing the original Godot game. */
    private float magnification=1f;
    private float panX=0f,panY=0f;
    private float canvasLeft=0f,canvasTop=0f,canvasWidth=0f,canvasHeight=0f;
    private boolean canvasMeasured=false;
    private boolean userAdjusted=false;
    private boolean moveMode=false;
    private boolean landscape=false;
    private float lastTouchX=0f,lastTouchY=0f;
    private int activePanPointer=-1;

    private static float within(float value,float min,float max){
        return Math.max(min,Math.min(max,value));
    }

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
        creator.setPivotX(0f);
        creator.setPivotY(0f);
        creator.setOnTouchListener((view,event)->{
            if(!moveMode)return false;  // Regular taps continue to reach the real Godot editor.
            switch(event.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    activePanPointer=event.getPointerId(0);
                    lastTouchX=event.getRawX();lastTouchY=event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float x=event.getRawX(),y=event.getRawY();
                    panX+=x-lastTouchX;panY+=y-lastTouchY;
                    lastTouchX=x;lastTouchY=y;
                    applyViewTransform();
                    return true;
                case MotionEvent.ACTION_CANCEL:
                case MotionEvent.ACTION_UP:
                    activePanPointer=-1;return true;
                default:return true;
            }
        });
        creator.setWebViewClient(new WebViewClient(){
            @Override public void onPageFinished(WebView view,String url){
                if(url!=null&&url.startsWith("https://html.itch.zone/html/")){
                    gameViewport.postDelayed(()->probeGameCanvas(true),850);
                    gameViewport.postDelayed(()->probeGameCanvas(true),2600);
                }
            }
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
        gameViewport=new FrameLayout(this);
        gameViewport.setClipChildren(true);
        gameViewport.setClipToPadding(true);
        gameViewport.setBackgroundColor(Color.rgb(32,30,42));
        gameViewport.addView(creator,new FrameLayout.LayoutParams(-1,-1));
        gameViewport.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,oright,obottom)->{
            if((r-l)!=(oright-ol)||(b-t)!=(obottom-ot)){
                if(canvasMeasured&&!userAdjusted)gameViewport.post(()->fitGame());
            }
        });
        // Controls stay outside the remote WebView, so neither Godot nor itch.io
        // can read/tamper with the zoom, pan and orientation buttons.
        HorizontalScrollView toolbarScroll=new HorizontalScrollView(this);
        toolbarScroll.setHorizontalScrollBarEnabled(false);
        toolbarScroll.setFillViewport(true);
        zoomToolbar=new LinearLayout(this);
        zoomToolbar.setOrientation(LinearLayout.HORIZONTAL);
        zoomToolbar.setGravity(Gravity.CENTER_VERTICAL);
        zoomToolbar.setPadding(dp(6),dp(3),dp(6),dp(3));
        zoomToolbar.setBackgroundColor(Color.rgb(32,29,43));
        Button zoomMinus=compactButton("−");
        zoomReadout=new TextView(this);
        zoomReadout.setText("100%");
        zoomReadout.setTextColor(Color.rgb(234,213,178));
        zoomReadout.setGravity(Gravity.CENTER);
        zoomReadout.setTextSize(12);
        zoomReadout.setMinWidth(dp(48));
        Button zoomPlus=compactButton("+");
        Button fitButton=compactButton("Ajustar");
        dragButton=compactButton("Mover");
        rotationButton=compactButton("Paisagem");
        zoomToolbar.addView(zoomMinus);
        zoomToolbar.addView(zoomReadout,new LinearLayout.LayoutParams(dp(52),dp(40)));
        zoomToolbar.addView(zoomPlus);
        zoomToolbar.addView(fitButton);
        zoomToolbar.addView(dragButton);
        zoomToolbar.addView(rotationButton);
        toolbarScroll.addView(zoomToolbar);
        root.addView(toolbarScroll,new LinearLayout.LayoutParams(-1,dp(49)));
        root.addView(gameViewport,new LinearLayout.LayoutParams(-1,0,1));
        zoomMinus.setOnClickListener(v->changeMagnification(1f/1.2f));
        zoomPlus.setOnClickListener(v->changeMagnification(1.2f));
        fitButton.setOnClickListener(v->{
            userAdjusted=false;
            fitGame();
            probeGameCanvas(true);
        });
        dragButton.setOnClickListener(v->{
            moveMode=!moveMode;
            dragButton.setText(moveMode?"Mover ✓":"Mover");
            dragButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
                 moveMode?Color.rgb(113,91,56):Color.rgb(65,61,76)));
            // Leaving pan mode allows normal taps on Godot again.
            progress.setText(moveMode?"Arraste para mover · toque Mover para editar":"Toque para editar no Godot");
        });
        rotationButton.setOnClickListener(v->{
            landscape=!landscape;
            rotationButton.setText(landscape?"Retrato":"Paisagem");
            setRequestedOrientation(landscape?ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE:
                    ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
            gameViewport.postDelayed(()->{userAdjusted=false;probeGameCanvas(true);},400);
        });
        LinearLayout footer=new LinearLayout(this);
        footer.setGravity(Gravity.CENTER_VERTICAL);
        footer.setPadding(dp(8),dp(5),dp(8),dp(7));
        capture=button("Capturar tela para a ficha");
        capture.setAllCaps(false);
        capture.setTextSize(13);
        capture.setTextColor(Color.rgb(28,23,31));
        capture.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(207,167,107)));
        TextView note=new TextView(this);
        note.setText("Use + / − ou Ajustar · Mover para arrastar · toque para editar");
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

    private Button compactButton(String title){
        Button button=new Button(this);
        button.setText(title);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setMinHeight(0);
        button.setMinimumHeight(0);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setTextColor(Color.rgb(239,220,184));
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(65,61,76)));
        button.setPadding(dp(9),0,dp(9),0);
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-2,dp(39));
        params.setMargins(dp(2),0,dp(2),0);
        button.setLayoutParams(params);
        return button;
    }

    private void applyViewTransform(){
        if(creator==null)return;
        creator.setScaleX(magnification);
        creator.setScaleY(magnification);
        creator.setTranslationX(panX);
        creator.setTranslationY(panY);
        if(zoomReadout!=null)zoomReadout.setText(Math.round(magnification*100)+"%");
    }

    /** Zoom around the current viewport center, preserving the visible part of the portrait. */
    private void changeMagnification(float ratio){
        if(gameViewport==null||gameViewport.getWidth()<1)return;
        userAdjusted=true;
        float old=magnification;
        magnification=within(old*ratio,.75f,3.5f);
        float fraction=magnification/old;
        float cx=gameViewport.getWidth()/2f,cy=gameViewport.getHeight()/2f;
        panX=cx+(panX-cx)*fraction;
        panY=cy+(panY-cy)*fraction;
        applyViewTransform();
    }

    /** Read-only inspection of the HTML5 canvas. This does NOT change the game's DOM. */
    private void probeGameCanvas(boolean doFit){
        if(creator==null||gameViewport==null||gameViewport.getWidth()<1)return;
        creator.evaluateJavascript(
            "(function(){var c=document.getElementById('canvas');if(!c)return null;"+
            "var r=c.getBoundingClientRect();"+
            "return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height,vw:window.innerWidth});})()",
            response->{
                if(creator==null||gameViewport==null||response==null||response.equals("null"))return;
                try{
                    String payload=new JSONArray("["+response+"]").getString(0);
                    JSONObject metrics=new JSONObject(payload);
                    float cssWidth=(float)metrics.getDouble("vw");
                    if(cssWidth<=0)return;
                    float pixelScale=gameViewport.getWidth()/cssWidth;
                    canvasLeft=(float)metrics.getDouble("x")*pixelScale;
                    canvasTop=(float)metrics.getDouble("y")*pixelScale;
                    canvasWidth=(float)metrics.getDouble("w")*pixelScale;
                    canvasHeight=(float)metrics.getDouble("h")*pixelScale;
                    canvasMeasured=canvasWidth>50&&canvasHeight>50;
                    if(canvasMeasured&&doFit&&!userAdjusted)fitGame();
                }catch(Exception ignored){
                    // The online game may change its HTML structure; buttons still
                    // provide zoom and manual panning without canvas dimensions.
                }
            });
    }

    /** Enlarge and center the actual Godot canvas within the available screen. */
    private void fitGame(){
        if(gameViewport==null||gameViewport.getWidth()<1||gameViewport.getHeight()<1)return;
        if(canvasMeasured){
            float availableWidth=Math.max(1,gameViewport.getWidth()-dp(15));
            float availableHeight=Math.max(1,gameViewport.getHeight()-dp(15));
            magnification=within(Math.min(availableWidth/canvasWidth,availableHeight/canvasHeight),.75f,3.5f);
            panX=(gameViewport.getWidth()-canvasWidth*magnification)/2f-canvasLeft*magnification;
            panY=(gameViewport.getHeight()-canvasHeight*magnification)/2f-canvasTop*magnification;
        }else{
            magnification=1.5f;
            panX=0f;panY=dp(3);
        }
        userAdjusted=false;
        applyViewTransform();
    }

    @Override public void onConfigurationChanged(Configuration configuration){
        super.onConfigurationChanged(configuration);
        if(gameViewport!=null){
            gameViewport.postDelayed(()->{
                userAdjusted=false;
                probeGameCanvas(true);
            },350);
        }
    }

    /** Discover the HTML5 entry from itch.io's public <iframe data-iframe> markup.
     * A game update may replace the numerical upload; validate the origin/path before loading.
     * The inspected working upload remains a fallback if the website lookup fails.
     */
    private void loadOriginalGame(){
        if(creator==null)return;
        progress.setText("Localizando exportação HTML5 original...");
        canvasMeasured=false;
        magnification=1f;panX=panY=0f;userAdjusted=false;
        applyViewTransform();
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
        Rect gameRect=new Rect();
        if(!creator.getGlobalVisibleRect(area)||gameViewport==null||
           !gameViewport.getGlobalVisibleRect(gameRect)||!area.intersect(gameRect)||
           area.width()<64||area.height()<64){
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
