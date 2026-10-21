package dev.rpgmesa.demo;

import android.app.Activity;
import android.content.Intent;
import android.test.InstrumentationTestCase;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** Exercises the installed APK's real WebView, assets, boot order and local storage. */
public class BootTest extends InstrumentationTestCase {
 private Activity activity;
 private WebView web;
 private WebView find(View view){
  if(view instanceof WebView)return (WebView)view;
  if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){
   WebView found=find(((ViewGroup)view).getChildAt(i));if(found!=null)return found;
  }
  return null;
 }
 private String js(String code)throws Exception{
  CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
  getInstrumentation().runOnMainSync(()->web.evaluateJavascript(code,value->{result.set(value);done.countDown();}));
  assertTrue("WebView response timeout",done.await(10,TimeUnit.SECONDS));return result.get();
 }
 private void waitFor(String expression)throws Exception{
  long until=System.currentTimeMillis()+30000;
  while(System.currentTimeMillis()<until){if("true".equals(js(expression)))return;Thread.sleep(150);}
  fail("APK boot assertion failed: "+expression+"; URL="+js("location.href"));
 }
 public void testInstalledApkPowersAndPersistence()throws Exception{
  Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  activity=getInstrumentation().startActivitySync(intent);
  getInstrumentation().runOnMainSync(()->web=find(activity.findViewById(android.R.id.content)));
  assertNotNull("Main activity must contain its real WebView",web);
  waitFor("!!window.Mastermind56Powers && !!window.MastermindCharacters && !!window.RPG14");
  js("RPG_DEMO.navigate('sheet');document.querySelector('#v56-quick-powers').click()");
  waitFor("document.querySelector('#v56-powers').getBoundingClientRect().height>0 && !document.querySelector('[data-r14-panel=advancement]').hidden");
  assertEquals("22",js("document.querySelectorAll('[data-v56-select]').length"));
  js("window.confirm=()=>true;MastermindCharacters.update(MastermindCharacters.selectedId(),{nex:45});Mastermind56Powers.learn('Encarar a Morte')");
  waitFor("OP13.state.powerChoices.length===1 && OP13.state.powerChoices[0].nex===15");
  js("location.reload()");
  waitFor("!!window.Mastermind56Powers && OP13.state.powerChoices.length===1");
  js("RPG_DEMO.navigate('sheet');document.querySelector('#v56-quick-powers').click()");
  waitFor("document.querySelector('.v56-power-learned').textContent.includes('Encarar a Morte')");
  getInstrumentation().runOnMainSync(()->activity.finish());
 }
}
