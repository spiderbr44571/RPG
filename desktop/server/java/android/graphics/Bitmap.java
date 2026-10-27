package android.graphics;
import java.awt.image.BufferedImage;
import java.awt.Graphics2D;
import java.awt.Color;
import java.io.OutputStream;
import javax.imageio.ImageIO;
public final class Bitmap {
 public enum Config { ARGB_8888 }
 public enum CompressFormat { JPEG,PNG }
 private BufferedImage image;
 Bitmap(BufferedImage image){this.image=image;}
 public int getWidth(){return image.getWidth();}
 public int getHeight(){return image.getHeight();}
 BufferedImage image(){return image;}
 public Bitmap copy(Config config,boolean mutable){
  BufferedImage result=new BufferedImage(getWidth(),getHeight(),BufferedImage.TYPE_INT_ARGB);
  Graphics2D g=result.createGraphics();g.drawImage(image,0,0,null);g.dispose();
  return new Bitmap(result);
 }
 public boolean compress(CompressFormat format,int quality,OutputStream output){
  try{
   if(format==CompressFormat.JPEG){
    BufferedImage rgb=new BufferedImage(getWidth(),getHeight(),BufferedImage.TYPE_INT_RGB);
    Graphics2D g=rgb.createGraphics();g.setColor(Color.BLACK);g.fillRect(0,0,getWidth(),getHeight());
    g.drawImage(image,0,0,null);g.dispose();
    return ImageIO.write(rgb,"jpeg",output);
   }
   return ImageIO.write(image,"png",output);
  }catch(Exception err){return false;}
 }
 public void recycle(){image.flush();}
}
