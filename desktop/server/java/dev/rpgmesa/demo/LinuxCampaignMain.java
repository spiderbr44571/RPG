package dev.rpgmesa.demo;
import android.content.Context;
import fi.iki.elonen.NanoHTTPD;
import java.io.File;
import java.util.concurrent.CountDownLatch;
/** Standalone Linux host for the identical Android server engine. */
public final class LinuxCampaignMain {
 public static void main(String[] args)throws Exception{
  if(args.length!=3){System.err.println("Uso: java -jar mastermind-campaign-server.jar <dados> <assets> <porta>");System.exit(2);}
  File filesDir=new File(args[0]),assetsDir=new File(args[1]);
  int port=Integer.parseInt(args[2]);
  if(port<1024||port>65535)throw new IllegalArgumentException("Porta inválida");
  LocalCampaignServer server=new LocalCampaignServer(new Context(filesDir,assetsDir),port);
  Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
  server.start(NanoHTTPD.SOCKET_READ_TIMEOUT,false);
  System.out.println("MASTERMIND_SERVER_READY "+server.hostIp()+" "+server.currentPort());
  System.out.flush();
  new CountDownLatch(1).await();
 }
}
