import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const presentation = readFileSync(new URL('../src/ui/presentation.js', import.meta.url), 'utf8');
const presentationCss = readFileSync(new URL('../src/ui/presentation.css', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/core/app.js', import.meta.url), 'utf8');
const smoke = readFileSync(new URL('../scripts/browser-smoke.mjs', import.meta.url), 'utf8');

test('opaque presentation root exists in initial HTML before JavaScript boots', () => {
  assert.match(index, /src\/ui\/presentation\.css/);
  assert.match(index, /id="presentation-root" class="presentation-root"/);
  assert.match(index, /class="presentation-boot"/);
  assert.ok(index.indexOf('presentation-root') < index.indexOf('src/main.js'));
  assert.match(presentationCss, /\.presentation-root\s*\{[\s\S]*background:\s*#040a10/);
  assert.match(presentationCss, /z-index:\s*50/);
});

test('title identity and actions are original, state-driven, and touch-readable', () => {
  assert.match(presentation, /Le Chant/);
  assert.match(presentation, /des Veines/);
  assert.match(presentation, /getTitleActions\(flow\)/);
  assert.match(presentation, /data-title-action/);
  assert.match(presentation, /Paramètres/);
  assert.match(presentationCss, /\.title-action\s*\{[\s\S]*min-height:\s*50px/);
  assert.match(presentationCss, /prefers-reduced-motion/);
});

test('loading UI exposes real app phases without fabricated percentage', () => {
  for (const phase of ['config', 'save', 'renderer', 'scene', 'ready']) {
    assert.match(appSource, new RegExp(`onPhase\\('${phase}'\\)`));
  }
  assert.match(presentation, /aria-valuetext/);
  assert.match(presentationCss, /title-loading/);
  assert.doesNotMatch(presentation, /\b\d{1,3}%\b/);
});

test('new game only replaces persisted progression after successful app startup', () => {
  const startIndex = presentation.indexOf('await app.start');
  const persistIndex = presentation.indexOf("if (intent === 'new-game') app.persist()");
  assert.ok(startIndex >= 0);
  assert.ok(persistIndex > startIndex);
  assert.doesNotMatch(presentation, /clearLocalSave/);
});

test('browser smoke validates title separately and keeps deterministic local gameplay', () => {
  assert.match(smoke, /runTitleViewport/);
  assert.match(smoke, /data-presentation-phase=\\?"title/);
  assert.match(smoke, /autostart:\s*'1'/);
  assert.match(smoke, /renderer:\s*'fallback'/);
  assert.match(smoke, /runGameplayViewport/);
});
