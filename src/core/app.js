import { APP_CONFIG } from '../data/config.js';
import { loadLocalSave, saveLocalState } from '../data/local-save.js';
import { detectBrowserQuality } from '../data/quality.js';
import {
  clearMoveIntent,
  createInitialGameState,
  equipItem,
  interact,
  setMoveIntent,
  stepGame,
  tryAction,
} from '../gameplay/state.js';
import { createInputController } from '../gameplay/input.js';
import { createSceneSurface } from '../render/scene.js';
import { mountFatalHud, mountGameHud } from '../ui/hud.js';

export function createApp({ sceneRoot, uiRoot }) {
  const state = createInitialGameState(APP_CONFIG.gameplay);
  state.settings = { quality: 'auto' };
  state.runtimeQuality = 'medium';
  let scene = null;
  let hud = null;
  let input = null;
  let started = false;
  let startToken = 0;
  let gameRaf = 0;
  let lastFrameMs = 0;
  let autosaveTimer = 0;

  const onResize = () => scene?.resize();

  function refresh(now = state.time) {
    scene?.update?.(state);
    hud?.render?.(state, now);
  }

  function persist() {
    saveLocalState(state);
  }

  function handleInteract() {
    const result = interact(state, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function handleEquip(instanceId) {
    const result = equipItem(state, instanceId, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function runGameFrame(frameMs) {
    if (!started) return;
    const now = frameMs / 1000;
    const dt = lastFrameMs ? Math.min(0.05, (frameMs - lastFrameMs) / 1000) : 0;
    lastFrameMs = frameMs;
    const movement = input?.sampleMovement() ?? { x: 0, z: 0 };
    setMoveIntent(state, movement.x, movement.z);
    stepGame(state, dt, now, APP_CONFIG.gameplay);
    refresh(now);
    gameRaf = requestAnimationFrame(runGameFrame);
  }

  async function start() {
    if (started) return;
    started = true;
    const token = ++startToken;
    state.phase = 'loading';
    loadLocalSave(state, APP_CONFIG.gameplay);
    const requestedQuality = state.settings?.quality ?? 'auto';
    state.runtimeQuality = requestedQuality === 'auto' ? detectBrowserQuality() : requestedQuality;

    try {
      const nextScene = await createSceneSurface(sceneRoot, { quality: state.runtimeQuality });
      if (!started || token !== startToken) {
        nextScene.dispose();
        return;
      }
      scene = nextScene;
      hud = mountGameHud(uiRoot, APP_CONFIG, { onInteract: handleInteract, onEquip: handleEquip });
      input = createInputController({
        joystick: hud.joystick,
        actionButtons: hud.actionButtons,
        actionConfig: APP_CONFIG.gameplay.actions,
        onAction(actionId) {
          tryAction(state, actionId, state.time, APP_CONFIG.gameplay);
          refresh();
        },
        onInteract: handleInteract,
      });
      state.phase = 'ready';
      state.renderer = scene.kind;
      refresh(0);
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
      lastFrameMs = 0;
      gameRaf = requestAnimationFrame(runGameFrame);
      autosaveTimer = window.setInterval(persist, 5000);
    } catch (error) {
      state.phase = 'fatal';
      mountFatalHud(uiRoot, error);
      throw error;
    }
  }

  function stop() {
    if (!started) return;
    persist();
    started = false;
    startToken++;
    if (gameRaf) cancelAnimationFrame(gameRaf);
    if (autosaveTimer) clearInterval(autosaveTimer);
    gameRaf = 0;
    autosaveTimer = 0;
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

  return { start, stop, state, config: APP_CONFIG, persist, getScene: () => scene };
}
