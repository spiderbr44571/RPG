package android.content;
import java.io.File;
import android.content.res.AssetManager;
/** Filesystem-backed compatibility layer for the original Android campaign engine. */
public class Context {
  private final File filesDir;
  private final AssetManager assets;
  public Context(File filesDir,File assetsDir){
    this.filesDir=filesDir;
    if(!filesDir.isDirectory() && !filesDir.mkdirs())throw new IllegalStateException("Não foi possível criar pasta de campanhas");
    this.assets=new AssetManager(assetsDir);
  }
  public Context getApplicationContext(){return this;}
  public File getFilesDir(){return filesDir;}
  public AssetManager getAssets(){return assets;}
}
