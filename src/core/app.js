import { APP_CONFIG } from '../data/config.js';
import { createInitialGameState } from '../gameplay/state.js';
import { createSceneSurface } from '../render/scene.js';
import { mountBootHud, mountFatalHud } from '../ui/hud.js';

export function createApp({ sceneRoot, uiRoot }) {
  const state = createInitialGameState();
  let scene = null;
  let unmountHud = null;
  let started = false;
  let startToken = 0;

  const onResize = () => scene?.resize();

  async function start() {
    if (started) return;
    started = true;
    const token = ++startToken;
    state.phase = 'loading';
    try {
      const nextScene = await createSceneSurface(sceneRoot);
      if (!started || token !== startToken) {
        nextScene.dispose();
        return;
      }
      scene = nextScene;
      unmountHud = mountBootHud(uiRoot, APP_CONFIG);
      state.phase = 'ready';
      state.renderer = scene.kind;
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
    } catch (error) {
      state.phase = 'fatal';
      mountFatalHud(uiRoot, error);
      throw error;
    }
  }

  function stop() {
    if (!started) return;
    started = false;
    startToken++;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    unmountHud?.();
    scene?.stop?.();
    scene?.dispose();
    scene = null;
    unmountHud = null;
    state.phase = 'stopped';
  }

  return { start, stop, state, config: APP_CONFIG, getScene: () => scene };
}
