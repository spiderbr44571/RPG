package dev.rpgmesa.demo;

import android.app.*;
import android.content.*;
import android.os.Build;
import android.os.IBinder;
import org.json.JSONObject;

/** Serviço iniciado por gesto do usuário; mostra notificação enquanto hospeda a campanha. */
public final class MesaHostService extends Service {
  public static final String ACTION_START="dev.rpgmesa.demo.START_HOST";
  public static final String ACTION_STOP="dev.rpgmesa.demo.STOP_HOST";
  private static final String CHANNEL="rpg_lan_host";
  public static volatile LocalCampaignServer instance;
  public static volatile String lastError="";
  public static volatile boolean starting=false;

  @Override public void onCreate(){
    super.onCreate();
    NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(
      new NotificationChannel(CHANNEL,"Servidor da mesa em rede",NotificationManager.IMPORTANCE_LOW));
  }
  private Notification foregroundNotification(){
    Intent stop=new Intent(this,MesaHostService.class).setAction(ACTION_STOP);
    PendingIntent end=PendingIntent.getService(this,17,stop,
      PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Intent open=new Intent(this,MainActivity.class)
      .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent launch=PendingIntent.getActivity(this,18,open,
      PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);
    return b.setContentTitle("RPG Mesa — anfitrião ativo")
      .setContentText("Campanha acessível na sua rede local")
      .setSmallIcon(android.R.drawable.ic_menu_share)
      .setOngoing(true).setContentIntent(launch)
      .addAction(android.R.drawable.ic_delete,"Desligar servidor",end).build();
  }
  @Override public int onStartCommand(Intent intent,int flags,int startId){
    if(intent!=null&&ACTION_STOP.equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
    if(instance!=null||starting)return START_NOT_STICKY;
    starting=true;lastError="";
    try{startForeground(920,foregroundNotification());}
    catch(Exception e){starting=false;lastError="Notificação/serviço indisponível";stopSelf();return START_NOT_STICKY;}
    new Thread(()->{
      try{
        LocalCampaignServer server=new LocalCampaignServer(this,8765);
        server.start(5000,false);
        instance=server;lastError="";
      }catch(Exception e){
        lastError="Não foi possível abrir a porta 8765: "+e.getClass().getSimpleName();
        stopSelf();
      }finally{starting=false;}
    },"rpg-lan-host").start();
    return START_NOT_STICKY;
  }
  @Override public void onDestroy(){
    LocalCampaignServer s=instance;
    instance=null;starting=false;
    if(s!=null)s.stop();
    super.onDestroy();
  }
  @Override public IBinder onBind(Intent intent){return null;}
  public static JSONObject snapshot(){
    if(instance!=null)return instance.status();
    try{return new JSONObject().put("running",false).put("starting",starting).put("error",lastError);}
    catch(Exception e){return new JSONObject();}
  }
}