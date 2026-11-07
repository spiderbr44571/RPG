package android.content.res;
import java.io.*;
/** Restrict served assets to the packaged Mastermind game library. */
public class AssetManager {
 private final File directory;
 public AssetManager(File directory){this.directory=directory;}
 public InputStream open(String name)throws IOException{
   // Arquivos da raiz ou da nova interface (revamp/ e revamp/fontes/); nunca "..".
   if(name==null||!name.matches("(revamp/(fontes/)?)?[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}")||name.contains(".."))throw new FileNotFoundException("Arquivo inválido");
   File root=directory.getCanonicalFile(),target=new File(directory,name).getCanonicalFile();
   if(!target.getPath().startsWith(root.getPath()+File.separator))throw new FileNotFoundException("Fora da biblioteca");
   return new FileInputStream(target);
 }
}
