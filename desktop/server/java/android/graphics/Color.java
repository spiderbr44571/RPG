package android.graphics;
public final class Color {
 public static int rgb(int r,int g,int b){return 0xff000000 | (r&255)<<16 | (g&255)<<8 | (b&255);}
}
