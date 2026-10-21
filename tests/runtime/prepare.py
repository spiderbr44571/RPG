"""Compile the unmodified Android LAN server with filesystem-only Android adapters.
Graphics deliberately fail closed: image rendering is covered only on Android.
"""
from pathlib import Path
import urllib.request, subprocess
root=Path(__file__).resolve().parents[2]; build=root/'.runtime'; build.mkdir(exist_ok=True)
for name,url in {'json.jar':'https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar','nano.jar':'https://repo.maven.apache.org/maven2/org/nanohttpd/nanohttpd/2.3.1/nanohttpd-2.3.1.jar'}.items():
 p=build/name
 if not p.exists(): urllib.request.urlretrieve(url,p)
stubs={
'android/content/Context.java':'''package android.content; import java.io.*; public class Context { final File files,assets; public Context(File f,File a){files=f;assets=a;f.mkdirs();} public Context getApplicationContext(){return this;} public File getFilesDir(){return files;} public android.content.res.AssetManager getAssets(){return new android.content.res.AssetManager(assets);} }''',
'android/content/res/AssetManager.java':'''package android.content.res; import java.io.*; public class AssetManager {final File root;public AssetManager(File r){root=r;} public InputStream open(String name)throws IOException{return new FileInputStream(new File(root,name));}}''',
'android/util/Base64.java':'''package android.util; public class Base64 {public static final int DEFAULT=0,NO_PADDING=1,NO_WRAP=2,URL_SAFE=8;public static String encodeToString(byte[] b,int flags){java.util.Base64.Encoder e=(flags&8)!=0?java.util.Base64.getUrlEncoder():java.util.Base64.getEncoder();return ((flags&1)!=0?e.withoutPadding():e).encodeToString(b);}public static byte[] decode(String s,int f){return java.util.Base64.getDecoder().decode(s);}}''',
'android/graphics/Bitmap.java':'''package android.graphics; public class Bitmap {public enum Config{ARGB_8888}public enum CompressFormat{JPEG}public Bitmap copy(Config c,boolean b){throw new UnsupportedOperationException();}public int getWidth(){return 0;}public int getHeight(){return 0;}public void recycle(){}public boolean compress(CompressFormat f,int q,java.io.OutputStream o){throw new UnsupportedOperationException();}}''',
'android/graphics/BitmapFactory.java':'''package android.graphics;public class BitmapFactory {public static class Options{public boolean inJustDecodeBounds;public int outWidth,outHeight;}public static Bitmap decodeByteArray(byte[] b,int o,int l,Options... opts){throw new UnsupportedOperationException("Android graphics unavailable in JVM adapter");}}''',
'android/graphics/Canvas.java':'''package android.graphics;public class Canvas {public Canvas(Bitmap b){}public void drawOval(float a,float b,float c,float d,Paint p){}public void drawRect(float a,float b,float c,float d,Paint p){}}''',
'android/graphics/Paint.java':'''package android.graphics;public class Paint {public static final int ANTI_ALIAS_FLAG=1;public enum Style{FILL}public Paint(int f){}public void setStyle(Style s){}public void setColor(int c){}}''',
'android/graphics/Color.java':'''package android.graphics;public class Color {public static int rgb(int a,int b,int c){return 0;}}''',
}
for name,code in stubs.items():
 p=build/'src'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(code)
cp=str(build/'json.jar')+':'+str(build/'nano.jar')
subprocess.run(['javac','-cp',cp,'-d',str(build/'classes'),*[str(p) for p in (build/'src').rglob('*.java')],str(root/'app/src/main/java/dev/rpgmesa/demo/LocalCampaignServer.java'),str(root/'tests/runtime/ServerMain.java')],check=True)
