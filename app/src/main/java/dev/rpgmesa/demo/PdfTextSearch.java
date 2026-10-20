package dev.rpgmesa.demo;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import org.json.JSONArray;
import org.json.JSONObject;
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader;
import com.tom_roush.pdfbox.io.MemoryUsageSetting;
import android.graphics.pdf.PdfRenderer;
import android.util.Log;
import com.tom_roush.pdfbox.pdmodel.PDDocument;
import com.tom_roush.pdfbox.text.PDFTextStripper;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Local, private, on-device PDF text index. No uploading, OCR, AI or asset bundling. */
final class PdfTextSearch {
 private static final int MAX_PAGES=1400, MAX_BYTES=180*1024*1024;
 private static final Pattern WORDS=Pattern.compile("[a-z0-9]{2,}");
 private static final Set<String> STOP=new HashSet<>(Arrays.asList(
  "como","funciona","funcionam","oque","qual","quais","que","um","uma","uns","umas",
  "pra","para","por","com","sem","sobre","onde","quando","quero","meu","minha",
  "livro","rpg","ordem","paranormal","pagina","paginas","essa","esse","isso","tem",
  "dos","das","dele","dela","eles","elas","sao","mais","menor","maior","aos",
  "nos","nas","uma","estao","voce","pode","fazer","buscar","pesquisar","procure",
  "de","do","da","no","na","os","as","ao","ou","se","em"));
 private final Context ctx;
 private final Store helper;
 private final AtomicBoolean running=new AtomicBoolean(false);
 private volatile int progress=0;
 private volatile String error="";
 private volatile String indexingUri="";
 private volatile String indexingTitle="";
 private volatile String stage="idle";
 private volatile int pageTotal=0;

 PdfTextSearch(Context ctx) {
  if(ctx==null)throw new IllegalArgumentException("PDF search requires an attached Android Context");
  Context application=ctx.getApplicationContext();
  this.ctx=application!=null?application:ctx;
  this.helper=new Store(this.ctx);
 }
 private static class Store extends SQLiteOpenHelper {
  Store(Context ctx){super(ctx,"mastermind_pdf_text_v45.db",null,1);setWriteAheadLoggingEnabled(true);}
  @Override public void onCreate(SQLiteDatabase db){
   db.execSQL("CREATE TABLE meta (k TEXT PRIMARY KEY,v TEXT NOT NULL)");
   db.execSQL("CREATE TABLE pages (page INTEGER PRIMARY KEY,body TEXT NOT NULL,normalized TEXT NOT NULL)");
   db.execSQL("CREATE VIRTUAL TABLE page_fts USING fts4(normalized)");
  }
  @Override public void onUpgrade(SQLiteDatabase db,int a,int b){}
 }
 private String meta(SQLiteDatabase db,String key){
  try(Cursor c=db.rawQuery("SELECT v FROM meta WHERE k=? ",new String[]{key})){
   return c.moveToFirst()?c.getString(0):"";
  }
 }
 private void putMeta(SQLiteDatabase db,String key,String value){
  db.execSQL("INSERT OR REPLACE INTO meta(k,v) VALUES (?,?)",new Object[]{key,value});
 }
 private static String norm(String text){
  return Normalizer.normalize(text==null?"":text,Normalizer.Form.NFD)
   .replaceAll("\\p{M}+","").toLowerCase(Locale.ROOT)
   .replaceAll("[^a-z0-9\\s]"," ").replaceAll("\\s+"," ").trim();
 }
 private static List<String> tokens(String query){
  Matcher m=WORDS.matcher(norm(query));
  List<String> out=new ArrayList<>();
  while(m.find()&&out.size()<10){
   String w=m.group();if(!STOP.contains(w)&&!out.contains(w))out.add(w);
  }
  return out;
 }
 private static JSONObject status(String state,String title,int progress,int total,String message){
  JSONObject j=new JSONObject();
  try{j.put("state",state);j.put("title",title);j.put("pages",total);j.put("progress",progress);j.put("message",message);}catch(Exception ignored){}
  return j;
 }
 private static int number(String raw){
  try{return Math.max(0,Integer.parseInt(raw));}catch(Exception ignored){return 0;}
 }
 JSONObject getStatus(String uri){
  if(uri==null||uri.isEmpty())return status("missing","",0,0,"Importe um PDF na Biblioteca.");
  try{
   SQLiteDatabase db=helper.getReadableDatabase();
   if(!uri.equals(meta(db,"uri"))){
    if(!error.isEmpty()&&uri.equals(indexingUri))return status("error",indexingTitle,progress,pageTotal,error);
    return status(running.get()&&uri.equals(indexingUri)?"indexing":"pending",
      indexingTitle,progress,pageTotal,running.get()?stage:"PDF aguardando indexação.");
   }
   int total=number(meta(db,"pages"));
   int done=number(meta(db,"progress"));
   // Índices da v0.45 terminados não possuíam campo phase/progress.
   String phase=meta(db,"phase");
   if(phase.isEmpty()&&total>0)done=total;
   int readable=number(meta(db,"readable"));
   boolean complete="ready".equals(phase)||(phase.isEmpty()&&total>0);
   String state=complete?(readable==0?"no_text":"ready"):
    running.get()&&uri.equals(indexingUri)?"indexing":
    !error.isEmpty()&&uri.equals(indexingUri)?"error":
    "failed".equals(phase)?"error":done>0?"partial":"pending";
   String message=complete?(readable==0?"PDF sem texto selecionável. É necessário OCR.":"Índice pronto para Ctrl+F.") :
    !error.isEmpty()?error:
    running.get()?stage:
    "failed".equals(phase)?meta(db,"error"):"Índice incompleto. Retome a extração.";
   return status(state,meta(db,"title"),done,total,message);
  }catch(Exception e){return status("error","",progress,0,"Falha ao consultar o índice no dispositivo.");}
 }
 /**
  * Text is extracted only once, on a background thread. The previous version
  * held ONE database transaction for the whole book, making every search wait.
  * Small committed batches let SQLite FTS search as early as the first pages.
  */
 void ensureIndex(String uri,String title,boolean force){
  if(uri==null||uri.isEmpty()||!running.compareAndSet(false,true))return;
  try{
   SQLiteDatabase db=helper.getReadableDatabase();
   if(!force&&uri.equals(meta(db,"uri"))){
    String phase=meta(db,"phase");
    if("ready".equals(phase)||(phase.isEmpty()&&number(meta(db,"pages"))>0)){
     running.set(false);return;
    }
   }
  }catch(Exception ignored){}
  progress=0;pageTotal=0;error="";stage="Verificando páginas e preparando pesquisa...";indexingUri=uri;indexingTitle=title;
  new Thread(()->{
   File temp=null;
   try{
    // PdfRenderer counts pages without parsing PDF images into Java memory.
    int preflightPages;
    try(ParcelFileDescriptor fd=ctx.getContentResolver().openFileDescriptor(Uri.parse(uri),"r")){
     if(fd==null)throw new IllegalStateException("O arquivo PDF selecionado não está acessível.");
     try(PdfRenderer renderer=new PdfRenderer(fd)){preflightPages=renderer.getPageCount();}
    }
    if(preflightPages<1||preflightPages>MAX_PAGES)throw new IllegalArgumentException("O livro ultrapassa o limite de 1400 páginas.");
    pageTotal=preflightPages;
    stage="Abrindo texto do PDF sem carregar tudo na memória...";
    PDFBoxResourceLoader.init(ctx);
    temp=File.createTempFile("mastermind-book-", ".pdf",ctx.getCacheDir());
    try(InputStream in=ctx.getContentResolver().openInputStream(Uri.parse(uri));
        OutputStream out=new FileOutputStream(temp)){
     if(in==null)throw new IllegalStateException("Arquivo indisponível.");
     byte[] buf=new byte[32768];long total=0;int n;
     while((n=in.read(buf))!=-1){
      total+=n;
      if(total>MAX_BYTES)throw new IllegalArgumentException("PDF maior que 180 MB.");
      out.write(buf,0,n);
     }
    }
    try(PDDocument pdf=PDDocument.load(temp,MemoryUsageSetting.setupTempFileOnly())){
     int count=pdf.getNumberOfPages();
     pageTotal=count;
     if(count<=0||count>MAX_PAGES)throw new IllegalArgumentException("Quantidade de páginas não suportada.");
     SQLiteDatabase db=helper.getWritableDatabase();
     boolean resume=!force&&uri.equals(meta(db,"uri"))&&"building".equals(meta(db,"phase"));
     int start=resume?number(meta(db,"progress"))+1:1;
     int readable=resume?number(meta(db,"readable")):0;
     if(!resume){
      db.beginTransactionNonExclusive();
      try{
       db.execSQL("DELETE FROM page_fts");
       db.execSQL("DELETE FROM pages");
       putMeta(db,"uri",uri);putMeta(db,"title",title);
       putMeta(db,"pages",Integer.toString(count));
       putMeta(db,"progress","0");putMeta(db,"readable","0");
       putMeta(db,"phase","building");
       db.setTransactionSuccessful();
      }finally{db.endTransaction();}
     }
     progress=start-1;
     stage="Extraindo texto página a página";
     PDFTextStripper stripper=new PDFTextStripper();
     stripper.setSortByPosition(false); // Avoid expensive positional reordering.
     final int BATCH=6;
     for(int first=start;first<=count;first+=BATCH){
      int end=Math.min(count,first+BATCH-1);
      db.beginTransactionNonExclusive();
      try{
       for(int i=first;i<=end;i++){
        stripper.setStartPage(i);stripper.setEndPage(i);
        String page=stripper.getText(pdf);
        // Fix words split at a line-break, without swallowing normal hyphens.
        page=page.replaceAll("(?<=\\p{L})-\\s*\\r?\\n\\s*(?=\\p{L})","");
        if(page.length()>150000)page=page.substring(0,150000);
        String folded=norm(page);
        if(folded.length()>8)readable++;
        db.execSQL("INSERT OR REPLACE INTO pages(page,body,normalized) VALUES(?,?,?)",
         new Object[]{i,page,folded});
        db.execSQL("INSERT OR REPLACE INTO page_fts(docid,normalized) VALUES(?,?)",
         new Object[]{i,folded});
       }
       putMeta(db,"progress",Integer.toString(end));
       putMeta(db,"readable",Integer.toString(readable));
       putMeta(db,"phase",end==count?"ready":"building");
       db.setTransactionSuccessful();
      }finally{db.endTransaction();}
      // Visible progress reflects only data that is already committed/queryable.
      progress=end;
      Thread.yield();
     }
    }
   }catch(Throwable e){
    // Includes PDF parser errors and memory exhaustion; never silently go back to pending.
    error=e instanceof OutOfMemoryError?
      "Memória insuficiente para este PDF. Tente um PDF menor ou outra versão do livro.":
      e.getClass().getSimpleName()+": "+(e.getMessage()==null?"Falha na leitura do PDF":e.getMessage());
    Log.e("MastermindPdf", "Falha na indexação de PDF",e);
    try{
     SQLiteDatabase db=helper.getWritableDatabase();
     if(uri.equals(meta(db,"uri"))){putMeta(db,"phase","failed");putMeta(db,"error",error);}
    }catch(Exception ignored){}
   }finally{
    if(temp!=null)temp.delete();
    running.set(false);
   }
  },"mastermind-pdf-index-v47").start();
 }
 private static String excerpt(String original,String normalized,String needle){
  // Output deliberately short: cite the page, do not reproduce the full book.
  int pos=normalized.indexOf(needle);
  if(pos<0)pos=0;
  int start=Math.max(0,Math.min(original.length(),pos-32));
  int end=Math.min(original.length(),start+130);
  String s=original.substring(start,end).replaceAll("\\s+"," ").trim();
  return (start>0?"…":"")+s+(end<original.length()?"…":"");
 }
 JSONObject search(String uri,String query,int size,int offset){
  JSONObject result=new JSONObject();JSONArray hits=new JSONArray();
  try{
   JSONObject status=getStatus(uri);
   String state=status.optString("state");
   result.put("state",state);result.put("status",status);result.put("hits",hits);
   result.put("total",0);
   if(!"ready".equals(state)&&!"indexing".equals(state)&&!"partial".equals(state))return result;
   List<String> words=tokens(query);if(words.isEmpty())return result;
   StringBuilder expression=new StringBuilder();
   for(String w:words){if(expression.length()>0)expression.append(" OR ");expression.append(w).append("*");}
   SQLiteDatabase db=helper.getReadableDatabase();
   // Never return pages from the previous PDF while a newly imported book is loading.
   if(uri==null||!uri.equals(meta(db,"uri")))return result;
   // Ctrl+F: fetch only the requested result page. The old search materialized
   // up to 1,400 full PDF pages in Java memory on every query and could close
   // the app on frequently used words such as "vida".
   int from=Math.max(0,offset);
   int limit=Math.min(30,Math.max(1,size));
   int count=0;
   try(Cursor totals=db.rawQuery("SELECT COUNT(*) FROM page_fts WHERE page_fts MATCH ?",
     new String[]{expression.toString()})){
    if(totals.moveToFirst())count=totals.getInt(0);
   }
   String sql="SELECT pages.page,pages.body FROM page_fts "+
    "JOIN pages ON pages.page=page_fts.docid WHERE page_fts MATCH ? "+
    "ORDER BY pages.page LIMIT ? OFFSET ?";
   try(Cursor c=db.rawQuery(sql,new String[]{expression.toString(),Integer.toString(limit),Integer.toString(from)})){
    while(c.moveToNext()){
     String body=c.getString(1);
     // Only the 20 visible pages are inspected, never the complete document.
     String folded=norm(body);
     String needle=words.get(0);
     for(String word:words){if(folded.contains(word)){needle=word;break;}}
     JSONObject hit=new JSONObject();
     hit.put("page",c.getInt(0));
     hit.put("excerpt",excerpt(body,folded,needle));
     hit.put("title","Página "+c.getInt(0)+" do PDF");
     hits.put(hit);
    }
   }
   result.put("total",count);
   result.put("offset",from);
   result.put("book",meta(db,"title"));
   result.put("indexedPages",status.optInt("progress"));
   result.put("totalPages",status.optInt("pages"));
   result.put("complete","ready".equals(state));
  }catch(Exception e){try{result.put("state","error");result.put("message","Não foi possível pesquisar no PDF.");}catch(Exception ignored){}}
  return result;
 }
}
