package android.util;
public final class Base64 {
 private Base64(){}
 public static final int DEFAULT=0,URL_SAFE=8,NO_PADDING=1,NO_WRAP=2;
 public static String encodeToString(byte[] input,int flags){
  java.util.Base64.Encoder encoder=(flags&URL_SAFE)!=0?java.util.Base64.getUrlEncoder():java.util.Base64.getEncoder();
  if((flags&NO_PADDING)!=0)encoder=encoder.withoutPadding();
  return encoder.encodeToString(input);
 }
 public static byte[] decode(String input,int flags){
  return ((flags&URL_SAFE)!=0?java.util.Base64.getUrlDecoder():java.util.Base64.getMimeDecoder()).decode(input);
 }
}
