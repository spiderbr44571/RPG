package android.content.res;
import java.io.*;
/** Restrict served assets to the packaged Mastermind game library. */
public class AssetManager {
 private final File directory;
 public AssetManager(File directory){this.directory=directory;}
 public InputStream open(String name)throws IOException{
   if(name==null||!name.matches("[A-Za-z0-9_.-]{1,100}"))throw new FileNotFoundException("Arquivo inválido");
   File target=new File(directory,name).getCanonicalFile();
   if(!target.getParentFile().equals(directory.getCanonicalFile()))throw new FileNotFoundException("Fora da biblioteca");
   return new FileInputStream(target);
 }
}
