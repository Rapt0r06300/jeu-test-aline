import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const presentation = readFileSync(new URL('../src/ui/presentation.js', import.meta.url), 'utf8');
const intro = readFileSync(new URL('../src/ui/intro-presentation.js', import.meta.url), 'utf8');
const introCss = readFileSync(new URL('../src/ui/intro-presentation.css', import.meta.url), 'utf8');
const introSequence = readFileSync(new URL('../src/gameplay/intro-sequence.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/core/app.js', import.meta.url), 'utf8');
const smoke = readFileSync(new URL('../scripts/browser-smoke.mjs', import.meta.url), 'utf8');

test('build loads the cinematic stylesheet and renders an explicit skip control', () => {
  assert.match(index, /src\/ui\/intro-presentation\.css/);
  assert.match(intro, /data-presentation-phase="intro"/);
  assert.match(intro, /data-intro-skip/);
  assert.match(intro, /aria-live="polite"/);
  assert.match(intro, /Passer/);
  assert.match(introCss, /min-height:\s*var\(--touch-min\)/);
  assert.match(introCss, /prefers-reduced-motion/);
});

test('cinematic freezes gameplay then hands control back only after the canonical commit', () => {
  const disableIndex = intro.indexOf('app.setGameplayEnabled(false)');
  const commitIndex = intro.indexOf("app.completeFirstSessionPresentation('intro')");
  const enableIndex = intro.indexOf('app.setGameplayEnabled(true)');
  assert.ok(disableIndex >= 0);
  assert.ok(commitIndex > disableIndex);
  assert.ok(enableIndex > commitIndex);
  assert.match(app, /if \(!gameplayEnabled\) return/);
  assert.match(app, /if \(gameplayEnabled\) \{/);
  assert.match(presentation, /gameplayEnabled:\s*false/);
});

test('presentation advances title into intro and QA skip stays explicit', () => {
  assert.match(presentation, /completeFirstSessionPresentation\('title'\)/);
  assert.match(presentation, /playIntroPresentation/);
  assert.match(presentation, /params\.get\('intro'\) === 'skip'/);
  assert.match(smoke, /intro:\s*'skip'/);
  assert.match(smoke, /runIntroViewport/);
  assert.match(smoke, /data-presentation-phase=\\?"intro/);
});

test('intro is clean-room procedural presentation with no imported third-party asset dependency', () => {
  assert.doesNotMatch(intro, /https?:\/\//i);
  assert.doesNotMatch(introCss, /url\s*\(/i);
  assert.doesNotMatch(introSequence, /ODIN/i);
  assert.match(introCss, /intro-mountain/);
  assert.match(introCss, /intro-fragment/);
  assert.match(introCss, /intro-beacon/);
});
