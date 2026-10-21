import dev.rpgmesa.demo.LocalCampaignServer;
import android.content.Context;
import java.io.File;
public class ServerMain {
 public static void main(String[] args)throws Exception{
  LocalCampaignServer server=new LocalCampaignServer(new Context(new File(args[0]),new File(args[1])),Integer.parseInt(args[2]));
  server.start();
  System.out.println("READY http://"+server.hostIp()+":"+server.currentPort()+" "+server.masterKey());
  System.out.flush();
  Thread.currentThread().join();
 }
}
