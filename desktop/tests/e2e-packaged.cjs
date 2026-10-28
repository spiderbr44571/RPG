'use strict';
/* Smoke test the *packaged* Electron binary, not the development source.
 * This catches the v1.0.3 blank-screen regression (ERR_FILE_NOT_FOUND).
 */
const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
 const executable = path.resolve(process.argv[2] || 'dist/linux-unpacked/mastermind');
 assert.ok(fs.existsSync(executable), 'Binário Linux não localizado: ' + executable);
 const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mastermind-packed-e2e-'));
 let client;
 try {
  client = await electron.launch({
   executablePath: executable,
   args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
   env: { ...process.env, XDG_CONFIG_HOME: profile, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true' },
   timeout: 45000
  });
  const win = await client.firstWindow({ timeout: 35000 });
  await win.locator('#screen-master').waitFor({ state: 'attached', timeout: 25000 });
  await win.locator('.desktop-titlebar').waitFor({ state: 'visible', timeout: 25000 });
  const result = await win.evaluate(() => ({
   url: location.href,
   logoOk: !!document.querySelector('.desktop-titlebar-brand img')?.naturalWidth,
   hasMaster: !!document.querySelector('#screen-master'),
   hasLibrary: !!document.querySelector('#screen-library'),
   hasAtelier: !!document.querySelector('#screen-atelier85'),
   bridge: !!window.MastermindDesktop,
   navigation: !!window.RPG_DEMO?.navigate,
   title: document.title
  }));
  assert.ok(result.url.startsWith('file:') && result.url.includes('/resources/server/assets/demo-offline.html'),
    'Interface empacotada no lugar errado: ' + JSON.stringify(result));
  assert.ok(result.hasMaster && result.hasLibrary && result.hasAtelier && result.bridge && result.navigation,
    'Interface empacotada incompleta: ' + JSON.stringify(result));
  assert.ok(result.logoOk, 'Logo não carregou no pacote: ' + JSON.stringify(result));
  console.log('PASS Linux v1.0.4: arquivo HTML, logo, telas e ponte Electron da build EMPACOTADA');
 } finally {
  if (client) await client.close();
  fs.rmSync(profile, { recursive: true, force: true });
 }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
