import { createApp } from './core/app.js';
import { mountPresentation } from './ui/presentation.js';

const sceneRoot = document.querySelector('#scene-root');
const uiRoot = document.querySelector('#ui-root');
const presentationRoot = document.querySelector('#presentation-root');

if (!(sceneRoot instanceof HTMLElement) || !(uiRoot instanceof HTMLElement) || !(presentationRoot instanceof HTMLElement)) {
  throw new Error('Racines de présentation/jeu introuvables.');
}

const app = createApp({ sceneRoot, uiRoot });
const presentation = mountPresentation(presentationRoot, { app, buildLabel: '0.1.0-web' });
window.__JTA_APP__ = app;
window.__JTA_PRESENTATION__ = presentation;
window.__JTA_PRESENTATION_READY__ = true;
window.__JTA_READY__ = false;
window.__JTA_RENDERER__ = 'pending';

function publishReady() {
  window.__JTA_READY__ = app.state.phase === 'ready';
  window.__JTA_RENDERER__ = app.state.renderer ?? 'unknown';
  window.dispatchEvent(new CustomEvent('jta:ready', { detail: { renderer: window.__JTA_RENDERER__ } }));
}

const params = new URLSearchParams(globalThis.location?.search ?? '');
if (params.get('autostart') === '1') {
  await presentation.autostart();
  publishReady();
}

window.addEventListener('jta:session-ready', publishReady, { passive: true });

window.addEventListener('pagehide', () => {
  presentation.unmount();
  app.stop();
}, { once: true });
