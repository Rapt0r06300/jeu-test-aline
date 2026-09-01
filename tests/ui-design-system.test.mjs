import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const designSystem = readFileSync('src/ui/design-system.css', 'utf8');
const styles = readFileSync('src/styles.css', 'utf8');
const firstSession = readFileSync('src/ui/first-session.css', 'utf8');
const hud = readFileSync('src/ui/hud.js', 'utf8');
const index = readFileSync('index.html', 'utf8');
const browserSmoke = readFileSync('scripts/browser-smoke.mjs', 'utf8');

test('design system defines semantic tokens and a 44px minimum touch target', () => {
  for (const token of [
    '--font-ui:', '--font-display:', '--surface-base:', '--text-primary:',
    '--accent-primary:', '--accent-reward:', '--accent-danger:', '--border-soft:',
    '--space-1:', '--radius-md:', '--shadow-panel:', '--motion-fast:', '--focus-ring:',
  ]) assert.ok(designSystem.includes(token), `missing token ${token}`);
  assert.match(designSystem, /--touch-min:\s*44px/);
});

test('reusable panel and button primitives cover interaction states', () => {
  for (const selector of [
    '.ui-panel {', '.ui-panel--objective', '.ui-panel--danger', '.ui-panel--reward',
    '.ui-button {', '.ui-button--primary', '.ui-button--ghost', '.ui-button--skill',
    '.ui-button:focus-visible', ".ui-button[data-ui-state='cooldown']", '.ui-button:disabled',
    ':active', ':hover', '@media (prefers-reduced-motion: reduce)',
  ]) assert.ok(designSystem.includes(selector), `missing design-system state ${selector}`);
});

test('main HUD components consume primitives instead of owning panel chrome', () => {
  for (const className of [
    'hud-status ui-panel', 'hud-target ui-panel ui-panel--compact',
    'boss-bar ui-panel ui-panel--danger', 'guide-panel ui-panel ui-panel--objective',
    'quest-panel ui-panel ui-panel--compact', 'inventory-panel ui-panel',
    'interact-button ui-button ui-button--secondary', 'action-button ui-button ui-button--skill',
  ]) assert.ok(hud.includes(className), `HUD missing primitive composition ${className}`);
  assert.doesNotMatch(styles, /\.boot-card,\s*\.hud-status,\s*\.hud-target/);
});

test('skill buttons expose ready cooldown and disabled semantics to CSS and assistive tech', () => {
  assert.match(hud, /button\.disabled = unavailable/);
  assert.match(hud, /button\.dataset\.uiState = coolingDown \? 'cooldown' : unavailable \? 'disabled' : 'ready'/);
  assert.match(hud, /aria-disabled/);
  assert.match(hud, /recharge \$\{remaining\.toFixed\(1\)\} secondes/);
  assert.match(styles, /action-button\[data-ui-state='cooldown'\]/);
});

test('objective danger and reward hierarchy is explicit and not color-only in text labels', () => {
  assert.match(hud, /OBJECTIF MAJEUR/);
  assert.match(hud, /RÉCOMPENSE/);
  assert.match(hud, /dataset\.uiState = isDanger \? 'danger'/);
  assert.match(hud, /Télégraphe actif — éloignez-vous/);
  assert.match(hud, /Gardien vaincu ! Récompense finale obtenue/);
});

test('first-session CSS delegates controls to shared tokens and keeps 44px touch targets', () => {
  assert.match(firstSession, /min-height:\s*var\(--touch-min\)/);
  assert.match(firstSession, /var\(--text-secondary\)/);
  assert.match(firstSession, /var\(--font-display\)/);
  assert.doesNotMatch(firstSession, /\.guide-actions button\s*\{/);
});

test('design system loads before feature layout styles', () => {
  const designIndex = index.indexOf('src/ui/design-system.css');
  const layoutIndex = index.indexOf('src/styles.css');
  const featureIndex = index.indexOf('src/ui/first-session.css');
  assert.ok(designIndex >= 0 && designIndex < layoutIndex && layoutIndex < featureIndex);
});

test('browser smoke covers desktop portrait narrow portrait and landscape', () => {
  assert.match(browserSmoke, /1440, 900/);
  assert.match(browserSmoke, /390, 844/);
  assert.match(browserSmoke, /320, 568/);
  assert.match(browserSmoke, /844, 390/);
});
