package android.graphics;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.geom.Rectangle2D;
import java.util.ArrayDeque;
public final class Canvas {
 private final Graphics2D graphics;
 private final ArrayDeque<Shape> stack=new ArrayDeque<>();
 public Canvas(Bitmap target){
  graphics=target.image().createGraphics();
  graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON);
 }
 public void save(){Shape clip=graphics.getClip();stack.push(clip==null?new Rectangle2D.Float(0,0,200000,200000):clip);}
 public void clipPath(Path path){if(path.shape()!=null)graphics.clip(path.shape());}
 public void restore(){if(!stack.isEmpty())graphics.setClip(stack.pop());}
 public void drawRect(float left,float top,float right,float bottom,Paint paint){
  graphics.setColor(paint.awtColor());
  graphics.fill(new Rectangle2D.Float(left,top,Math.max(0,right-left),Math.max(0,bottom-top)));
 }
}
