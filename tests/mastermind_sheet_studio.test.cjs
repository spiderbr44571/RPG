'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'app/src/main/assets');
const read=x=>fs.readFileSync(path.join(assets,x),'utf8');
const html=read('demo-offline.html'),js=read('mastermind_sheet_studio.js'),css=read('mastermind_sheet_studio.css');
test('Sheet Studio loads after all original RPG engines in the shared HTML on every platform',()=>{
 const end=html.lastIndexOf('</body>'),studio=html.indexOf('src="mastermind_sheet_studio.js"'),ordem=html.indexOf('src="rpg14_sheet_tabs.js"'),gurps=html.indexOf('src="rpg16_gurps_ui.js"'),dnd=html.indexOf('src="rpg18_dnd_ui.js"'),coc=html.indexOf('src="mastermind_coc7_ui.js"');
 assert.ok(end>studio&&studio>ordem&&studio>gurps&&studio>dnd&&studio>coc);
 assert.match(html,/href="mastermind_sheet_studio\.css"/);
});
test('System switch uses existing per-system deterministic editors rather than converting saves',()=>{
 assert.match(js,/window\.MastermindCharacters/);
 assert.match(js,/window\.RPG18_DND/);
 assert.match(js,/window\.RPG16_GURPS/);
 assert.match(js,/window\.MastermindCoc7/);
 assert.match(js,/window\.RPG14\?\.show/);
 assert.match(js,/mod\.mount\(container\)/);
 assert.match(js,/window\.OP13\?\.state/);
 assert.doesNotMatch(js,/localStorage\.removeItem\(/);
 assert.doesNotMatch(js,/localStorage\.clear\(/);
 assert.doesNotMatch(js,/\.deleteCharacter\(/);
});
test('Switching characters is routed to the native dropdown so it uses existing storage',()=>{
 assert.match(js,/#rpg05-char-select/);
 assert.match(js,/#d18-character/);
 assert.match(js,/#g-switch/);
 assert.match(js,/#coc-select/);
 assert.match(js,/dispatchEvent\(new Event\('change'/);
 assert.match(js,/mastermind-sheet-studio-system/);
});
test('Reference-style three-column UI exposes system/character pickers, portrait, tabs, abilities and rolls',()=>{
 for(const id of ['mss-system','mss-character','mss-new','mss-export','mss-portrait','mss-resources','mss-stat-strip','mss-native-stage','mss-side-results','mss-roll','mss-atelier'])assert.ok(js.includes('id="'+id+'"'),id);
 for(const tab of ['stats','history','equipment','powers'])assert.ok(js.includes('data-mss-tab="'+tab+'"'),tab);
 assert.match(css,/grid-template-columns:minmax\(220px,25%\) minmax\(0,1fr\) minmax\(235px,25%\)/);
 assert.match(css,/max-width:none!important/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test('Theme variables and accessible reduced-motion preserve user customization',()=>{
 assert.match(css,/--mss-accent:var\(--v10-accent,var\(--accent/);
 assert.match(css,/var\(--mss-accent\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(js,/aria-selected/);
 assert.match(js,/mastermind:sheet-system-changed/);
 assert.match(js,/rpg:roll/);
 assert.match(css,/#rpg05-sheet-op\[hidden\]\{display:none!important\}/);
});
test('All four original system engines remain available and original character storage keys untouched',()=>{
 assert.ok(fs.existsSync(path.join(assets,'rpg18_dnd_ui.js')));
 assert.ok(fs.existsSync(path.join(assets,'rpg16_gurps_ui.js')));
 assert.ok(fs.existsSync(path.join(assets,'mastermind_coc7_ui.js')));
 assert.match(html,/rpg-v05-characters/);
 assert.match(read('rpg18_dnd_ui.js'),/rpg-dnd5e-characters-v1/);
 assert.match(read('rpg16_gurps_ui.js'),/rpg-gurps4-characters-v1/);
 assert.match(read('mastermind_coc7_engine.js'),/mastermind-coc7-investigadores-v1/);
});
