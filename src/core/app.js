import { APP_CONFIG } from '../data/config.js';
import { loadLocalSave, saveLocalState } from '../data/local-save.js';
import { detectBrowserQuality } from '../data/quality.js';
import {
  advanceFirstSession,
  ensureFirstSessionState,
  getFirstSessionView,
  requestFirstSessionReplay,
  skipFirstSessionStep,
  syncFirstSession,
} from '../gameplay/first-session.js';
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

function getRuntimeSceneOptions(quality) {
  const search = globalThis.location?.search ?? '';
  const params = new URLSearchParams(search);
  return {
    quality,
    forceFallback: params.get('renderer') === 'fallback',
  };
}

export function createApp({ sceneRoot, uiRoot }) {
  const state = createInitialGameState(APP_CONFIG.gameplay);
  state.settings = { quality: 'auto' };
  state.runtimeQuality = 'medium';
  ensureFirstSessionState(state, APP_CONFIG.gameplay);
  let scene = null;
  let hud = null;
  let input = null;
  let started = false;
  let gameplayEnabled = true;
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

  function syncDirector() {
    return syncFirstSession(state, APP_CONFIG.gameplay).changed;
  }

  function setGameplayEnabled(enabled) {
    gameplayEnabled = Boolean(enabled);
    if (!gameplayEnabled) clearMoveIntent(state);
    refresh();
    return gameplayEnabled;
  }

  function completeFirstSessionPresentation(expectedStepId) {
    const view = getFirstSessionView(state, APP_CONFIG.gameplay);
    if (view?.id !== expectedStepId) return { ok: false, reason: 'unexpected-step', stepId: view?.id ?? null };
    const result = advanceFirstSession(state, APP_CONFIG.gameplay);
    if (result.ok) {
      persist();
      refresh();
    }
    return result;
  }

  function handleInteract() {
    if (!gameplayEnabled) return;
    const result = interact(state, APP_CONFIG.gameplay);
    const directorChanged = syncDirector();
    if (result.ok || directorChanged) persist();
    refresh();
  }

  function handleEquip(instanceId) {
    if (!gameplayEnabled) return;
    const result = equipItem(state, instanceId, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function handleFirstSessionAdvance() {
    if (!gameplayEnabled) return;
    const result = advanceFirstSession(state, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function handleFirstSessionSkip() {
    if (!gameplayEnabled) return;
    const result = skipFirstSessionStep(state, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function handleFirstSessionReplay() {
    if (!gameplayEnabled) return;
    const result = requestFirstSessionReplay(state, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function runGameFrame(frameMs) {
    if (!started) return;
    const now = frameMs / 1000;
    const dt = lastFrameMs ? Math.min(0.05, (frameMs - lastFrameMs) / 1000) : 0;
    lastFrameMs = frameMs;

    if (gameplayEnabled) {
      const movement = input?.sampleMovement() ?? { x: 0, z: 0 };
      setMoveIntent(state, movement.x, movement.z);
      stepGame(state, dt, now, APP_CONFIG.gameplay);
      refresh(now);
    } else {
      clearMoveIntent(state);
      refresh(state.time);
    }

    gameRaf = requestAnimationFrame(runGameFrame);
  }

  async function start({
    restoreSave = true,
    settingsOverride = null,
    onPhase = () => {},
    gameplayEnabled: startGameplayEnabled = true,
  } = {}) {
    if (started) return;
    started = true;
    gameplayEnabled = Boolean(startGameplayEnabled);
    const token = ++startToken;
    state.phase = 'loading';
    onPhase('config');

    if (restoreSave) {
      onPhase('save');
      const loaded = loadLocalSave(state, APP_CONFIG.gameplay);
      if (!loaded.ok) {
        started = false;
        state.phase = 'stopped';
        throw new Error(`Sauvegarde impossible à charger: ${loaded.reason}`);
      }
    } else {
      onPhase('save');
    }

    if (settingsOverride?.quality) state.settings = { ...state.settings, quality: settingsOverride.quality };
    ensureFirstSessionState(state, APP_CONFIG.gameplay);
    syncDirector();
    const requestedQuality = state.settings?.quality ?? 'auto';
    state.runtimeQuality = requestedQuality === 'auto' ? detectBrowserQuality() : requestedQuality;

    try {
      onPhase('renderer');
      const nextScene = await createSceneSurface(sceneRoot, getRuntimeSceneOptions(state.runtimeQuality));
      if (!started || token !== startToken) {
        nextScene.dispose();
        return;
      }
      scene = nextScene;
      onPhase('scene');
      hud = mountGameHud(uiRoot, APP_CONFIG, {
        onInteract: handleInteract,
        onEquip: handleEquip,
        onFirstSessionAdvance: handleFirstSessionAdvance,
        onFirstSessionSkip: handleFirstSessionSkip,
        onFirstSessionReplay: handleFirstSessionReplay,
      });
      input = createInputController({
        joystick: hud.joystick,
        actionButtons: hud.actionButtons,
        actionConfig: APP_CONFIG.gameplay.actions,
        onAction(actionId) {
          if (!gameplayEnabled) return;
          tryAction(state, actionId, state.time, APP_CONFIG.gameplay);
          if (syncDirector()) persist();
          refresh();
        },
        onInteract: handleInteract,
      });
      state.phase = 'ready';
      state.renderer = scene.kind;
      onPhase('ready');
      refresh(0);
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
      lastFrameMs = 0;
      gameRaf = requestAnimationFrame(runGameFrame);
      autosaveTimer = window.setInterval(persist, 5000);
    } catch (error) {
      started = false;
      state.phase = 'fatal';
      mountFatalHud(uiRoot, error);
      throw error;
    }
  }

  function stop() {
    if (!started) return;
    persist();
    started = false;
    gameplayEnabled = false;
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

  return {
    start,
    stop,
    state,
    config: APP_CONFIG,
    persist,
    setGameplayEnabled,
    isGameplayEnabled: () => gameplayEnabled,
    completeFirstSessionPresentation,
    getFirstSessionView: () => getFirstSessionView(state, APP_CONFIG.gameplay),
    getScene: () => scene,
  };
}
