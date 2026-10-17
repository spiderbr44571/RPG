'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(base,'app/src/main/java/dev/rpgmesa/demo/MainActivity.java'),'utf8');
const html=fs.readFileSync(path.join(base,'app/src/main/assets/demo-offline.html'),'utf8');
const manifest=fs.readFileSync(path.join(base,'app/src/main/AndroidManifest.xml'),'utf8');
const grade=fs.readFileSync(path.join(base,'app/build.gradle'),'utf8');
const safe=[
 ['native HTTPS endpoints',main.includes('https://openrouter.ai/api/v1')],
 ['restrict native models',main.includes('model.endsWith(":free")&&freeModels.contains(model)')],
 ['free router only',main.includes('"openrouter/free".equals(model)')],
 ['native model prices checked',main.includes('priceZero(row.optJSONObject("pricing"))')],
 ['Native Android Keystore',main.includes('AndroidKeyStore')],
 ['native encryption AES-GCM',main.includes('AES/GCM/NoPadding')],
 ['only request methods',main.includes('"models".equals(action)||"chat".equals(action)')],
 ['bridge removed on LAN',main.includes('browser.removeJavascriptInterface("RpgCloudAiBridge")')],
 ['consent checkbox',html.includes('id="r11-consent"')],
 ['HTTPS browser fallback',html.includes("https://openrouter.ai/api/v1/")],
 ['no server address field',!html.includes('id="r11-endpoint"')],
 ['no proxy bridge',!html.includes('RpgAiProxyBridge')&&!main.includes('AiProxyBridge')],
 ['no paid auto routing',!html.includes('"openrouter/auto"')&&!main.includes('"openrouter/auto"')],
 ['no blank API key hardcoded',!main.includes('sk-or-v1-123')],
 ['native key not exposed',!main.includes('@JavascriptInterface public String getKey')],
 ['Android version 0.21',grade.includes('versionCode 21')],
 ['indexed source requirement',html.includes("usable=hits.filter(x=>x.kind!=='metadata'&&x.text)")],
 ['Internet permission',manifest.includes('android.permission.INTERNET')],
 ['turn off cloud',html.includes('r11-cloud-clear')]
];
for(const [name,yes] of safe)assert.ok(yes,name);
console.log('PASS: native cloud-only OpenRouter Free, consent, secure key, all-platform fallback. '+safe.length+' assertions.');
