package dev.rpgmesa.demo;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.provider.OpenableColumns;
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
 private static final int MAX_PAGES=1400;
 private static final long MiB=1024L*1024L;
 // Only available free space constrains input size, rather than a small arbitrary cap.
 private static final long MIN_FREE_DISK=160L*MiB;
 private static final long COPY_STEP=8L*MiB;
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

 PdfTextSearch(Context ctx) {this(ctx,null);}
 PdfTextSearch(Context ctx,String bookId) {
  if(ctx==null)throw new IllegalArgumentException("PDF search requires an attached Android Context");
  Context application=ctx.getApplicationContext();
  this.ctx=application!=null?application:ctx;
  if(bookId!=null&&!bookId.matches("[A-Za-z0-9_-]{1,72}"))
   throw new IllegalArgumentException("Invalid local PDF identifier");
  this.helper=new Store(this.ctx,bookId);
 }
 private static class Store extends SQLiteOpenHelper {
  Store(Context ctx,String bookId){
   super(ctx,bookId==null?"mastermind_pdf_text_v45.db":"mastermind_pdf_text_v51_"+bookId+".db",null,1);
   setWriteAheadLoggingEnabled(true);
  }
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
  while(m.find()&&out.size()<18){
   String w=m.group();if(!STOP.contains(w)&&!out.contains(w))out.add(w);
  }
  return out;
 }
 private static final String[][] ALIASES={
  {"descanso","repouso","rest","resting","dormir","recuperacao"},
  {"proficiencia","proficiency","treinamento","expertise"},
  {"magia","spells","spell","feitico","ritual","conjuracao"},
  {"concentracao","concentration","concentrar"},
  {"armadura","armor","defesa","defense"},
  {"salvaguarda","saving","throw","resistencia"},
  {"fadiga","fatigue","energia"},
  {"pericia","pericias","skill","skills","habilidade"},
  {"vantagem","advantage","advantages"},
  {"desvantagem","disadvantage","disadvantages"},
  {"aparar","parry","bloquear","block","esquiva","dodge"},
  {"sobrecarga","carga","encumbrance"},
  {"medo","susto","fright","horror"},
  {"sanidade","sanity","insanidade","insanity"},
  {"sorte","luck","fortuna"},
  {"forcado","pushed","pushing","forcar"},
  {"extremo","extreme","dificil","hard","sucesso","success"},
  {"mitos","mythos","cthulhu"},
  {"investigador","investigator","ocupacao","occupation"},
  {"perseguicao","chase","fuga"},
  {"combate","combat","fighting","ataque","attack"},
  {"ferimento","wound","injury","cura","healing"}
 };
 private static List<String> synonyms(List<String> original){
  Set<String> seen=new HashSet<>(original);List<String> out=new ArrayList<>();
  for(String[] group:ALIASES){
   boolean triggered=false;
   for(String term:group)if(original.contains(term)){triggered=true;break;}
   if(!triggered)continue;
   for(String term:group)if(!seen.contains(term)&&out.size()<24){out.add(term);seen.add(term);}
  }
  return out;
 }
 private static String matchQuery(List<String> words){
  StringBuilder q=new StringBuilder();
  for(String w:words){if(q.length()>0)q.append(" OR ");q.append(w).append("*");}
  return q.toString();
 }
 private static JSONObject status(String state,String title,int progress,int total,String message){
  JSONObject j=new JSONObject();
  try{j.put("state",state);j.put("title",title);j.put("pages",total);j.put("progress",progress);j.put("message",message);}catch(Exception ignored){}
  return j;
 }
 private long sourceSize(Uri source){
  // SAF providers may omit length (e.g. some cloud storages).
  try(Cursor c=ctx.getContentResolver().query(source,new String[]{OpenableColumns.SIZE},null,null,null)){
   if(c!=null&&c.moveToFirst()){
    int idx=c.getColumnIndex(OpenableColumns.SIZE);
    if(idx>=0&&!c.isNull(idx))return c.getLong(idx);
   }
  }catch(Exception ignored){}
  return -1;
 }
 private void ensureDisk(long available,long required){
  if(available>=required)return;
  throw new IllegalStateException(
   "Espaço temporário insuficiente para este PDF. Livres: "+
   (available/MiB)+" MB; recomendados: "+(required/MiB)+
   " MB. Libere armazenamento sem apagar os dados do Mastermind.");
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
    preflightPages=0;
    try(ParcelFileDescriptor fd=ctx.getContentResolver().openFileDescriptor(Uri.parse(uri),"r")){
     if(fd==null)throw new IllegalStateException("O arquivo PDF selecionado não está acessível.");
     try(PdfRenderer renderer=new PdfRenderer(fd)){preflightPages=renderer.getPageCount();}
    }catch(Exception notSeekable){
     // Some SAF providers stream PDFs: count pages from the cached copy instead.
     Log.w("MastermindPdf","Contagem direta indisponível; tentando cópia local",notSeekable);
    }
    pageTotal=preflightPages;
    stage="Preparando arquivo PDF selecionado...";
    PDFBoxResourceLoader.init(ctx);
    // Large PDFs are kept on disk, not in RAM. Estimate free disk before copying:
    // one local PDF copy, potential parser scratch files and a safe free-space reserve.
    Uri source=Uri.parse(uri);
    File tmpFolder=ctx.getCacheDir();
    long knownSize=sourceSize(source);
    long needed=MIN_FREE_DISK;
    if(knownSize>0){
     if(knownSize>Long.MAX_VALUE/2)throw new IllegalArgumentException("PDF possui tamanho inválido.");
     needed=knownSize*2+MIN_FREE_DISK;
    }
    ensureDisk(tmpFolder.getUsableSpace(),needed);
    temp=File.createTempFile("mastermind-book-", ".pdf",tmpFolder);
    try(InputStream in=ctx.getContentResolver().openInputStream(source);
        OutputStream out=new FileOutputStream(temp)){
     if(in==null)throw new IllegalStateException("Arquivo indisponível.");
     byte[] buf=new byte[64*1024];long total=0;int n;
     long nextCheck=COPY_STEP;
     while((n=in.read(buf))!=-1){
      total+=n;
      out.write(buf,0,n);
      // For providers without known size, watch storage as the file streams in.
      if(total>=nextCheck){
       stage="Copiando PDF grande: "+(total/MiB)+" MB transferidos...";
       ensureDisk(tmpFolder.getUsableSpace(),MIN_FREE_DISK+Math.min(total/2,512L*MiB));
       nextCheck=total+COPY_STEP;
      }
     }
     if(total==0)throw new IllegalStateException("PDF vazio ou indisponível.");
    }
    if(preflightPages==0){
     stage="Verificando páginas da cópia local...";
     try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(temp,ParcelFileDescriptor.MODE_READ_ONLY);
         PdfRenderer renderer=new PdfRenderer(fd)){
      preflightPages=renderer.getPageCount();
      pageTotal=preflightPages;
     }
    }
    if(preflightPages<1||preflightPages>MAX_PAGES)
     throw new IllegalArgumentException("Este PDF possui uma quantidade de páginas não suportada.");
    stage="Lendo conteúdo do PDF de forma econômica...";
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
  String raw=(original==null?"":original).replace('\uFFFD',' ').replace('\u0000',' ');
  String candidate="";
  for(String line:raw.split("\\R"))if(norm(line).contains(needle)){candidate=line;break;}
  if(candidate.isEmpty())candidate=raw;
  candidate=candidate.replaceAll("\\s+"," ").trim();
  int pos=norm(candidate).indexOf(needle),start=0;
  if(pos>0)start=Math.max(0,(int)(pos*(candidate.length()/(double)Math.max(1,norm(candidate).length())))-46);
  int end=Math.min(candidate.length(),start+185);
  return (start>0?"…":"")+candidate.substring(start,end)+(end<candidate.length()?"…":"");
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
   String match=matchQuery(words);
   boolean expanded=false;
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
     new String[]{match})){
    if(totals.moveToFirst())count=totals.getInt(0);
   }
   if(count==0){
    List<String> alternatives=synonyms(words);
    if(!alternatives.isEmpty()){
     match=matchQuery(alternatives);
     try(Cursor totals=db.rawQuery("SELECT COUNT(*) FROM page_fts WHERE page_fts MATCH ?",new String[]{match})){
      if(totals.moveToFirst())count=totals.getInt(0);
     }
     expanded=count>0;
    }
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
     hit.put("excerpt",excerpt(body,folded,expanded?synonyms(words).get(0):needle));
     if(body.contains("\uFFFD"))hit.put("encodingWarning","O texto desta página contém caracteres de fonte ilegíveis; consulte a página original.");
     hit.put("title","Página "+c.getInt(0)+" do PDF");
     hits.put(hit);
    }
   }
   result.put("total",count);
   result.put("expanded",expanded);
   result.put("offset",from);
   result.put("book",meta(db,"title"));
   result.put("indexedPages",status.optInt("progress"));
   result.put("totalPages",status.optInt("pages"));
   result.put("complete","ready".equals(state));
  }catch(Exception e){try{result.put("state","error");result.put("message","Não foi possível pesquisar no PDF.");}catch(Exception ignored){}}
  return result;
 }
}
