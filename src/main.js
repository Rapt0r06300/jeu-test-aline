import { createApp } from './core/app.js';

const sceneRoot = document.querySelector('#scene-root');
const uiRoot = document.querySelector('#ui-root');

if (!(sceneRoot instanceof HTMLElement) || !(uiRoot instanceof HTMLElement)) {
  throw new Error('Racines #scene-root / #ui-root introuvables.');
}

const app = createApp({ sceneRoot, uiRoot });
window.__JTA_APP__ = app;
window.__JTA_READY__ = false;

await app.start();
window.__JTA_READY__ = app.state.phase === 'ready';
window.__JTA_RENDERER__ = app.state.renderer ?? 'unknown';
window.dispatchEvent(new CustomEvent('jta:ready', { detail: { renderer: window.__JTA_RENDERER__ } }));
window.addEventListener('pagehide', () => app.stop(), { once: true });
