package android.graphics;
import java.io.ByteArrayInputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
public final class BitmapFactory {
 public static final class Options{
  public boolean inJustDecodeBounds;
  public int outWidth=-1,outHeight=-1;
 }
 public static Bitmap decodeByteArray(byte[] bytes,int offset,int length){
  try{
   BufferedImage image=ImageIO.read(new ByteArrayInputStream(bytes,offset,length));
   return image==null?null:new Bitmap(image);
  }catch(Exception err){return null;}
 }
 public static Bitmap decodeByteArray(byte[] bytes,int offset,int length,Options options){
  Bitmap image=decodeByteArray(bytes,offset,length);
  if(image!=null){options.outWidth=image.getWidth();options.outHeight=image.getHeight();}
  if(options.inJustDecodeBounds){if(image!=null)image.recycle();return null;}
  return image;
 }
}
