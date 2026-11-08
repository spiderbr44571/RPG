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
   env: { ...process.env, XDG_CONFIG_HOME: profile, ELECTRON_DISABLE_SECURITY_WARNINGS: 'true', MASTERMIND_E2E: '1' },
   timeout: 45000
  });
  const win = await client.firstWindow({ timeout: 35000 });
  // v1.4.0: o app abre a nova interface; a interface clássica foi retirada.
  await win.locator('#canvas-v').waitFor({ state: 'attached', timeout: 25000 });
  await win.waitForFunction(() => !!window.RV?.Canvas && !!window.RV?.tool, null, { timeout: 25000 });
  const result = await win.evaluate(() => ({
   url: location.href,
   inApp: window.RV.inApp,
   host: !!window.RV.Net?.canHost(),
   views: ['inicio', 'mestragem', 'biblioteca', 'buscar', 'ficha', 'canvas', 'bestiario', 'ajustes'].filter(v => document.querySelector('[data-view="' + v + '"]')),
   bridge: !!window.MastermindDesktop,
   title: document.title
  }));
  assert.ok(result.url.startsWith('file:') && result.url.includes('/resources/server/assets/revamp/index.html'),
    'Interface empacotada no lugar errado: ' + JSON.stringify(result));
  assert.ok(result.inApp && result.host && result.bridge && result.views.length === 8,
    'Interface empacotada incompleta: ' + JSON.stringify(result));
  // Canvas infinito
  await win.evaluate(() => { location.hash = '#canvas'; });
  await win.locator('#canvas-v .cv-stage').waitFor({ state: 'visible', timeout: 15000 });
  // Ficha completa e Ateliê: página de ferramentas, com volta para a interface
  await win.evaluate(() => window.RV.tool('sheet'));
  await win.waitForURL(/\/resources\/server\/assets\/ferramentas\.html#sheet$/, { timeout: 20000 });
  await win.locator('#screen-sheet').waitFor({ state: 'visible', timeout: 25000 });
  const tools = await win.evaluate(() => ({
   atelier: !!document.querySelector('#screen-atelier85'),
   navigate: typeof window.RPG_DEMO?.navigate,
   back: document.querySelector('#mmt-back')?.getAttribute('href') || ''
  }));
  assert.ok(tools.atelier && tools.navigate === 'function' && tools.back.includes('revamp/index.html'),
    'Ferramentas incompletas: ' + JSON.stringify(tools));
  await win.locator('#mmt-back').click();
  await win.waitForURL(/\/revamp\/index\.html#canvas$/, { timeout: 20000 });
  for (const f of ['revamp/index.html', 'revamp/canvas.js', 'ferramentas.html', 'ferramentas.js', 'ferramentas.css', 'mastermind_logo.png'])
   assert.ok(fs.existsSync(path.join(path.dirname(executable), 'resources/server/assets', f)), 'Arquivo ausente no pacote: ' + f);
  assert.ok(!fs.existsSync(path.join(path.dirname(executable), 'resources/server/assets/demo-offline.html')), 'A interface clássica ainda está no pacote');
  console.log('PASS Linux: nova interface, Canvas, ferramentas (ficha e Ateliê) e volta, na build EMPACOTADA');
 } finally {
  if (client) await client.close();
  fs.rmSync(profile, { recursive: true, force: true });
 }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
