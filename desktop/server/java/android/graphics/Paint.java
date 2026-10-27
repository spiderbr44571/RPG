package android.graphics;
public final class Paint {
 public static final int ANTI_ALIAS_FLAG=1;
 public enum Style { FILL }
 private int color=0xff000000,alpha=255;
 public Paint(int flags){}
 public void setStyle(Style style){}
 public void setColor(int color){this.color=color;}
 public void setAlpha(int alpha){this.alpha=Math.max(0,Math.min(255,alpha));}
 java.awt.Color awtColor(){
  int a=Math.round(alpha*((color>>>24)&255)/255f);
  return new java.awt.Color((color>>16)&255,(color>>8)&255,color&255,a);
 }
}
