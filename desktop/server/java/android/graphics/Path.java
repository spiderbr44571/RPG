package android.graphics;
import java.awt.Shape;
import java.awt.geom.Ellipse2D;
public final class Path {
 public enum Direction { CW }
 private Shape clip;
 public void addOval(float left,float top,float right,float bottom,Direction direction){
  clip=new Ellipse2D.Float(left,top,right-left,bottom-top);
 }
 Shape shape(){return clip;}
}
