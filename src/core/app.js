import { APP_CONFIG } from '../data/config.js';
import {
  clearMoveIntent,
  createInitialGameState,
  setMoveIntent,
  stepGame,
  tryAction,
} from '../gameplay/state.js';
import { createInputController } from '../gameplay/input.js';
import { createSceneSurface } from '../render/scene.js';
import { mountFatalHud, mountGameHud } from '../ui/hud.js';

export function createApp({ sceneRoot, uiRoot }) {
  const state = createInitialGameState(APP_CONFIG.gameplay);
  let scene = null;
  let hud = null;
  let input = null;
  let started = false;
  let startToken = 0;
  let gameRaf = 0;
  let lastFrameMs = 0;

  const onResize = () => scene?.resize();

  function runGameFrame(frameMs) {
    if (!started) return;
    const now = frameMs / 1000;
    const dt = lastFrameMs ? Math.min(0.05, (frameMs - lastFrameMs) / 1000) : 0;
    lastFrameMs = frameMs;
    const movement = input?.sampleMovement() ?? { x: 0, z: 0 };
    setMoveIntent(state, movement.x, movement.z);
    stepGame(state, dt, now, APP_CONFIG.gameplay);
    scene?.update?.(state);
    hud?.render?.(state, now);
    gameRaf = requestAnimationFrame(runGameFrame);
  }

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
      hud = mountGameHud(uiRoot, APP_CONFIG);
      input = createInputController({
        joystick: hud.joystick,
        actionButtons: hud.actionButtons,
        actionConfig: APP_CONFIG.gameplay.actions,
        onAction(actionId) {
          tryAction(state, actionId, state.time, APP_CONFIG.gameplay);
          scene?.update?.(state);
          hud?.render?.(state, state.time);
        },
      });
      state.phase = 'ready';
      state.renderer = scene.kind;
      scene.update?.(state);
      hud.render?.(state, 0);
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
      lastFrameMs = 0;
      gameRaf = requestAnimationFrame(runGameFrame);
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
    if (gameRaf) cancelAnimationFrame(gameRaf);
    gameRaf = 0;
    lastFrameMs = 0;
    clearMoveIntent(state);
    input?.dispose?.();
    input = null;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    hud?.unmount?.();
    scene?.stop?.();
    scene?.dispose();
    scene = null;
    hud = null;
    state.phase = 'stopped';
  }

  return { start, stop, state, config: APP_CONFIG, getScene: () => scene };
}
