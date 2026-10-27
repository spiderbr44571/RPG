package dev.rpgmesa.demo;

import android.app.Activity;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.PixelCopy;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Inline native stage for lyime's ORIGINAL browser-exported Godot creator.
 *
 * Never add any JavaScriptInterface to gameView: content is from a third party.
 * The main RPG WebView remains completely separate and still owns character data.
 * MainActivity aligns this native stage to the HTML placeholder's actual rectangle.
 */
public final class InlinePixelPortraitStage extends LinearLayout {
    public interface CaptureReceiver { void received(byte[] png); }

    private static final String CREATOR_PAGE="https://lyime.itch.io/pixel-portrait-creator";
    private static final String VERIFIED_GAME="https://html.itch.zone/html/18379448/index.html?v=1785079497";
    private static final Pattern LIVE_GAME=Pattern.compile(
        "https://html\\.itch\\.zone/html/[0-9]{4,16}/index\\.html(?:\\?v=[0-9]{1,16})?");
    private final Activity activity;
    private final CaptureReceiver receiver;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private WebView gameView;
    private FrameLayout stage;
    private TextView status;
    private TextView zoomLabel;
    private Button dragButton;
    private Button captureButton;
    private boolean started=false;
    private boolean shown=false;
    private boolean moveMode=false;
    private boolean changedZoom=false;
    private boolean canvasMeasured=false;
    private float scale=1f, panX=0f, panY=0f;
    private float canvasX=0f,canvasY=0f,canvasW=0f,canvasH=0f;
    private float downX,downY;
    private int loadGeneration=0;

    public InlinePixelPortraitStage(Activity activity, CaptureReceiver receiver){
        super(activity);
        this.activity=activity;
        this.receiver=receiver;
        setOrientation(VERTICAL);
        setBackgroundColor(Color.rgb(25,23,35));
        setPadding(px(3),px(3),px(3),px(3));
        setClipChildren(true);
        setClipToPadding(true);
        build();
    }

    private int px(int dp){return Math.round(dp*getResources().getDisplayMetrics().density);}
    private Button button(String text){
        Button b=new Button(activity);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(11);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setPadding(px(8),0,px(8),0);
        b.setTextColor(Color.rgb(239,219,190));
        b.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(59,51,70)));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-2,px(38));
        lp.setMargins(px(2),0,px(2),0);
        b.setLayoutParams(lp);
        return b;
    }

    private void build(){
        LinearLayout toolbar=new LinearLayout(activity);
        toolbar.setOrientation(HORIZONTAL);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(px(2),0,px(2),0);
        toolbar.setBackgroundColor(Color.rgb(28,26,39));

        final Button minus=button("−");
        final Button plus=button("+");
        final Button fit=button("Ajustar");
        dragButton=button("Mover");
        final Button reload=button("Recarregar");

        zoomLabel=new TextView(activity);
        zoomLabel.setText("100%");
        zoomLabel.setTextSize(12);
        zoomLabel.setTextColor(Color.rgb(218,190,142));
        zoomLabel.setGravity(Gravity.CENTER);
        toolbar.addView(minus);
        toolbar.addView(zoomLabel,new LinearLayout.LayoutParams(px(49),px(38)));
        toolbar.addView(plus);
        toolbar.addView(fit);
        toolbar.addView(dragButton);
        toolbar.addView(reload);

        HorizontalScrollView scroll=new HorizontalScrollView(activity);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.addView(toolbar);
        addView(scroll,new LinearLayout.LayoutParams(-1,px(45)));

        stage=new FrameLayout(activity);
        stage.setClipChildren(true);
        stage.setClipToPadding(true);
        stage.setBackgroundColor(Color.rgb(33,31,43));

        gameView=new WebView(activity);
        gameView.setBackgroundColor(Color.rgb(34,34,43));
        gameView.setPivotX(0f);
        gameView.setPivotY(0f);
        WebSettings cfg=gameView.getSettings();
        cfg.setJavaScriptEnabled(true);
        cfg.setDomStorageEnabled(true);
        cfg.setUseWideViewPort(true);
        cfg.setLoadWithOverviewMode(true);
        cfg.setAllowFileAccess(false);
        cfg.setAllowContentAccess(false);
        cfg.setAllowFileAccessFromFileURLs(false);
        cfg.setAllowUniversalAccessFromFileURLs(false);
        cfg.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        cfg.setJavaScriptCanOpenWindowsAutomatically(false);
        cfg.setSupportMultipleWindows(false);
        cfg.setMediaPlaybackRequiresUserGesture(false);
        // DO NOT attach a JavaScript bridge to remote HTML5 content.
        gameView.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(!request.isForMainFrame())return false;
                Uri uri=request.getUrl();
                if("https".equalsIgnoreCase(uri.getScheme())&&trustedHost(uri.getHost()))return false;
                try{activity.startActivity(new Intent(Intent.ACTION_VIEW,uri));}
                catch(Exception ignored){}
                return true;
            }
            @Override public void onPageFinished(WebView view,String url){
                if(url!=null&&url.startsWith("https://html.itch.zone/html/")){
                    // Godot's WASM loader starts after the HTML onPageFinished.
                    handler.postDelayed(()->probe(true),1200);
                    handler.postDelayed(()->probe(true),3300);
                    handler.postDelayed(()->probe(true),7000);
                }
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest request,
                             android.webkit.WebResourceError error){
                if(request.isForMainFrame())setStatus("Falha ao carregar. Use Recarregar ou o navegador.");
            }
        });
        gameView.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView web,int progress){
                setStatus(progress<100?"Carregando editor original · "+progress+"%":"Editor Godot · pronto");
            }
        });
        gameView.setOnTouchListener((v,e)->{
            if(!moveMode)return false;
            switch(e.getActionMasked()){
                case MotionEvent.ACTION_DOWN:
                    downX=e.getRawX();downY=e.getRawY();return true;
                case MotionEvent.ACTION_MOVE:
                    panX+=e.getRawX()-downX;
                    panY+=e.getRawY()-downY;
                    downX=e.getRawX();downY=e.getRawY();
                    renderTransform();
                    return true;
                default:return true;
            }
        });
        stage.addView(gameView,new FrameLayout.LayoutParams(-1,-1));
        addView(stage,new LinearLayout.LayoutParams(-1,0,1));

        LinearLayout footer=new LinearLayout(activity);
        footer.setGravity(Gravity.CENTER_VERTICAL);
        footer.setOrientation(HORIZONTAL);
        footer.setPadding(px(3),px(2),px(3),px(2));
        footer.setBackgroundColor(Color.rgb(27,24,37));

        captureButton=button("Usar imagem na ficha");
        captureButton.setTextColor(Color.rgb(29,23,29));
        captureButton.setBackgroundTintList(ColorStateList.valueOf(Color.rgb(203,160,101)));

        status=new TextView(activity);
        status.setTextSize(10);
        status.setTextColor(Color.rgb(205,191,171));
        status.setText("Editor original · aguardando abertura");
        status.setGravity(Gravity.CENTER_VERTICAL);
        status.setMaxLines(2);

        footer.addView(captureButton);
        footer.addView(status,new LinearLayout.LayoutParams(0,px(45),1));
        addView(footer,new LinearLayout.LayoutParams(-1,px(50)));

        minus.setOnClickListener(v->zoom(1f/1.2f));
        plus.setOnClickListener(v->zoom(1.2f));
        fit.setOnClickListener(v->{changedZoom=false;fitCanvas();probe(true);});
        dragButton.setOnClickListener(v->{
            moveMode=!moveMode;
            dragButton.setText(moveMode?"Mover ✓":"Mover");
            dragButton.setBackgroundTintList(ColorStateList.valueOf(
                    moveMode?Color.rgb(105,83,51):Color.rgb(59,51,70)));
            setStatus(moveMode?"Arraste para mover · desative para personalizar":
                          "Toque no editor para escolher peças");
        });
        reload.setOnClickListener(v->load());
        captureButton.setOnClickListener(v->capture());
        stage.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,oright,obottom)->{
            if((r-l)!=(oright-ol)||(b-t)!=(obottom-ot)){
                if(canvasMeasured&&!changedZoom)stage.post(()->fitCanvas());
            }
        });
    }

    private static boolean trustedHost(String host){
        if(host==null)return false;
        host=host.toLowerCase(Locale.ROOT);
        return host.equals("html.itch.zone")||host.equals("lyime.itch.io")||
            host.equals("itch.io")||host.endsWith(".itch.zone")||host.endsWith(".itch.io");
    }
    private void setStatus(String value){if(status!=null)status.setText(value);}

    /** Called by MainActivity only when the Atelier is actually in view. */
    public void showEditor(){
        if(!shown){
            shown=true;
            setVisibility(VISIBLE);
            if(gameView!=null)gameView.onResume();
        }
        if(!started){started=true;load();}
    }
    public void hideEditor(){
        if(!shown)return;
        shown=false;
        setVisibility(GONE);
        if(gameView!=null)gameView.onPause();
    }

    private void load(){
        if(gameView==null)return;
        final int generation=++loadGeneration;
        setStatus("Conectando ao Godot do lyime...");
        changedZoom=false;canvasMeasured=false;
        scale=1f;panX=panY=0f;renderTransform();
        new Thread(()->{
            String resolved=VERIFIED_GAME;
            HttpURLConnection conn=null;
            try{
                conn=(HttpURLConnection)new URL(CREATOR_PAGE).openConnection();
                conn.setConnectTimeout(8000);conn.setReadTimeout(8000);
                conn.setRequestProperty("Accept","text/html");
                conn.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36");
                if(conn.getResponseCode()==200){
                    try(InputStream in=conn.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                        byte[] buffer=new byte[4096];int n;
                        while((n=in.read(buffer))!=-1){
                            if(out.size()+n>262144)break;
                            out.write(buffer,0,n);
                        }
                        Matcher match=LIVE_GAME.matcher(out.toString("UTF-8"));
                        if(match.find())resolved=match.group();
                    }
                }
            }catch(Exception ignored){}
            finally{if(conn!=null)conn.disconnect();}
            final String url=resolved;
            activity.runOnUiThread(()->{
                if(gameView==null||generation!=loadGeneration||activity.isFinishing())return;
                gameView.loadUrl(url);
            });
        },"lyime-inline-html5-discovery").start();
    }

    /** Read the ORIGINAL Godot canvas rectangle; do not mutate the artist's page. */
    private void probe(boolean autoFit){
        if(gameView==null||stage==null||stage.getWidth()<1)return;
        gameView.evaluateJavascript(
            "(function(){var c=document.getElementById('canvas');if(!c)return null;"+
            "var r=c.getBoundingClientRect();return JSON.stringify({x:r.left,y:r.top,"+
            "w:r.width,h:r.height,vw:window.innerWidth});})()",
            response->{
                if(gameView==null||response==null||"null".equals(response))return;
                try{
                    String json=new JSONArray("["+response+"]").getString(0);
                    JSONObject info=new JSONObject(json);
                    float cssVW=(float)info.getDouble("vw");
                    if(cssVW<1)return;
                    float ratio=stage.getWidth()/cssVW;
                    canvasX=(float)info.getDouble("x")*ratio;
                    canvasY=(float)info.getDouble("y")*ratio;
                    canvasW=(float)info.getDouble("w")*ratio;
                    canvasH=(float)info.getDouble("h")*ratio;
                    canvasMeasured=canvasW>40&&canvasH>40;
                    if(canvasMeasured&&autoFit&&!changedZoom)fitCanvas();
                }catch(Exception ignored){}
            });
    }

    private void fitCanvas(){
        if(stage==null||stage.getWidth()<1||stage.getHeight()<1)return;
        if(canvasMeasured){
            float freeW=Math.max(1,stage.getWidth()-px(6));
            float freeH=Math.max(1,stage.getHeight()-px(6));
            scale=Math.max(.65f,Math.min(3.5f,Math.min(freeW/canvasW,freeH/canvasH)));
            panX=(stage.getWidth()-canvasW*scale)/2f-canvasX*scale;
            panY=(stage.getHeight()-canvasH*scale)/2f-canvasY*scale;
        }else{
            scale=1.25f;
            panX=panY=0;
        }
        changedZoom=false;
        renderTransform();
    }
    private void zoom(float multiplier){
        if(stage==null||stage.getWidth()<1)return;
        changedZoom=true;
        float old=scale;
        scale=Math.max(.65f,Math.min(3.5f,old*multiplier));
        float cX=stage.getWidth()/2f,cY=stage.getHeight()/2f,ratio=scale/old;
        panX=cX+(panX-cX)*ratio;
        panY=cY+(panY-cY)*ratio;
        renderTransform();
    }
    private void renderTransform(){
        if(gameView==null)return;
        gameView.setScaleX(scale);
        gameView.setScaleY(scale);
        gameView.setTranslationX(panX);
        gameView.setTranslationY(panY);
        if(zoomLabel!=null)zoomLabel.setText(Math.round(scale*100)+"%");
    }

    private void capture(){
        if(!shown||stage==null||gameView==null)return;
        final Rect rect=new Rect(),viewport=new Rect();
        if(!gameView.getGlobalVisibleRect(rect)||!stage.getGlobalVisibleRect(viewport)||
           !rect.intersect(viewport)||rect.width()<64||rect.height()<64){
            setStatus("Abra e enquadre o editor antes da captura.");return;
        }
        if(rect.width()*(long)rect.height()>9000000L)return;
        final Bitmap bmp=Bitmap.createBitmap(rect.width(),rect.height(),Bitmap.Config.ARGB_8888);
        captureButton.setEnabled(false);
        PixelCopy.request(activity.getWindow(),rect,bmp,result->{
            captureButton.setEnabled(true);
            try{
                if(result!=PixelCopy.SUCCESS){setStatus("Não foi possível capturar; tente novamente.");return;}
                try(ByteArrayOutputStream data=new ByteArrayOutputStream()){
                    if(!bmp.compress(Bitmap.CompressFormat.PNG,100,data))throw new IllegalStateException("PNG inválido");
                    byte[] raw=data.toByteArray();
                    if(raw.length>4000000L||raw.length<100)throw new IllegalStateException("Imagem grande demais");
                    receiver.received(raw);
                }
            }catch(Exception e){setStatus("Falha na captura. Use Importar PNG.");}
            finally{bmp.recycle();}
        },handler);
    }

    public void dispose(){
        ++loadGeneration;shown=false;
        handler.removeCallbacksAndMessages(null);
        if(gameView!=null){
            gameView.stopLoading();
            gameView.loadUrl("about:blank");
            gameView.destroy();
            gameView=null;
        }
    }
}
