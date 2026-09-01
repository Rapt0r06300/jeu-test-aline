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
  ensurePrologueState,
  syncPrologue,
  tryPrologueInteraction,
} from '../gameplay/prologue.js';
import {
  ensureGuidanceState,
  recordGuidanceSignal,
  resetGuidance,
  setGuidanceMode,
  syncGuidance,
} from '../gameplay/guidance.js';
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
  state.settings = { quality: 'auto', guidance: 'complete' };
  state.runtimeQuality = 'medium';
  ensureFirstSessionState(state, APP_CONFIG.gameplay);
  ensurePrologueState(state);
  ensureGuidanceState(state);
  let scene = null;
  let hud = null;
  let input = null;
  let started = false;
  let gameplayEnabled = true;
  let startToken = 0;
  let gameRaf = 0;
  let lastFrameMs = 0;
  let autosaveTimer = 0;
  let lastDangerAt = -Infinity;
  let lastKnownInventoryCount = 0;

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

  function syncExperience(now = state.time) {
    const directorChanged = syncDirector();
    const prologueResult = syncPrologue(state, APP_CONFIG.gameplay);
    const guidanceResult = syncGuidance(state, now, { suppressed: !gameplayEnabled });
    return Boolean(directorChanged || prologueResult.changed || guidanceResult.changed);
  }

  function setGameplayEnabled(enabled) {
    gameplayEnabled = Boolean(enabled);
    if (!gameplayEnabled) clearMoveIntent(state);
    syncGuidance(state, state.time, { suppressed: !gameplayEnabled });
    refresh();
    return gameplayEnabled;
  }

  function completeFirstSessionPresentation(expectedStepId) {
    const view = getFirstSessionView(state, APP_CONFIG.gameplay);
    if (view?.id !== expectedStepId) return { ok: false, reason: 'unexpected-step', stepId: view?.id ?? null };
    const result = advanceFirstSession(state, APP_CONFIG.gameplay);
    if (result.ok) {
      ensurePrologueState(state);
      ensureGuidanceState(state);
      syncExperience(state.time);
      persist();
      refresh();
    }
    return result;
  }

  function handleInteract() {
    if (!gameplayEnabled) return;
    const prologueInteraction = tryPrologueInteraction(state, APP_CONFIG.gameplay);
    if (prologueInteraction.ok) {
      recordGuidanceSignal(state, 'interactionSuccess', 1, state.time);
      syncExperience(state.time);
      persist();
      refresh();
      return;
    }

    const result = interact(state, APP_CONFIG.gameplay);
    if (result.ok) recordGuidanceSignal(state, 'interactionSuccess', 1, state.time);
    const experienceChanged = syncExperience(state.time);
    if (result.ok || experienceChanged) persist();
    refresh();
  }

  function handleEquip(instanceId) {
    if (!gameplayEnabled) return;
    const result = equipItem(state, instanceId, APP_CONFIG.gameplay);
    if (result.ok) {
      recordGuidanceSignal(state, 'equipmentSuccess', 1, state.time);
      syncExperience(state.time);
      persist();
    }
    refresh();
  }

  function handleGuidanceMode(mode) {
    const result = setGuidanceMode(state, mode);
    if (result.ok) {
      syncExperience(state.time);
      persist();
      refresh();
    }
  }

  function handleGuidanceReplay() {
    resetGuidance(state);
    syncExperience(state.time);
    persist();
    refresh();
  }

  function handleFirstSessionAdvance() {
    if (!gameplayEnabled) return;
    const result = advanceFirstSession(state, APP_CONFIG.gameplay);
    if (result.ok) {
      syncExperience(state.time);
      persist();
    }
    refresh();
  }

  function handleFirstSessionSkip() {
    if (!gameplayEnabled) return;
    const result = skipFirstSessionStep(state, APP_CONFIG.gameplay);
    if (result.ok) {
      syncExperience(state.time);
      persist();
    }
    refresh();
  }

  function handleFirstSessionReplay() {
    if (!gameplayEnabled) return;
    const result = requestFirstSessionReplay(state, APP_CONFIG.gameplay);
    if (result.ok) persist();
    refresh();
  }

  function captureContextSignals(now, movement, dt) {
    const magnitude = Math.hypot(movement.x, movement.z);
    if (magnitude > 0.08 && dt > 0) {
      recordGuidanceSignal(state, 'movementDistance', magnitude * APP_CONFIG.gameplay.player.moveSpeed * dt, now);
      if (state.guidance?.signals?.dangerSeen > 0 && now - lastDangerAt <= 3) {
        recordGuidanceSignal(state, 'dangerHandled', 1, now);
      }
    }

    if (state.targetId) recordGuidanceSignal(state, 'targetAcquired', 1, now);

    const inventoryCount = state.inventory?.length ?? 0;
    if (inventoryCount > 0 && inventoryCount !== lastKnownInventoryCount) {
      recordGuidanceSignal(state, 'lootSeen', 1, now);
      lastKnownInventoryCount = inventoryCount;
    }

    if (state.feedback?.type === 'boss-telegraph' || state.feedback?.type === 'enemy-hit') {
      recordGuidanceSignal(state, 'dangerSeen', 1, now);
      lastDangerAt = now;
    }
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
      captureContextSignals(now, movement, dt);
      if (syncExperience(now)) persist();
      refresh(now);
    } else {
      clearMoveIntent(state);
      syncGuidance(state, state.time, { suppressed: true });
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
    if (settingsOverride?.guidance && ['complete', 'minimal', 'off'].includes(settingsOverride.guidance)) {
      state.settings = { ...state.settings, guidance: settingsOverride.guidance };
    }
    ensureFirstSessionState(state, APP_CONFIG.gameplay);
    ensurePrologueState(state);
    ensureGuidanceState(state);
    syncExperience(state.time);
    lastKnownInventoryCount = state.inventory?.length ?? 0;
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
        onGuidanceMode: handleGuidanceMode,
        onGuidanceReplay: handleGuidanceReplay,
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
          const result = tryAction(state, actionId, state.time, APP_CONFIG.gameplay);
          if (result.ok) {
            recordGuidanceSignal(state, 'targetAcquired', 1, state.time);
            recordGuidanceSignal(state, actionId === 'basic' ? 'basicAttackSuccess' : 'skillSuccess', 1, state.time);
          }
          if (syncExperience(state.time) || result.ok) persist();
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
    setGuidanceMode: handleGuidanceMode,
    replayGuidance: handleGuidanceReplay,
  };
}
