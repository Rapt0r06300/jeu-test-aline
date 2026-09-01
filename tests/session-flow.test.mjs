import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_PHASES,
  cancelNewGame,
  closeSettings,
  confirmNewGame,
  createSessionFlow,
  getTitleActions,
  openSettings,
  requestSessionIntent,
  setLoadingPhase,
} from '../src/core/session-flow.js';
import { LOCAL_SAVE_KEY, hasValidSave, inspectLocalSave } from '../src/data/local-save.js';

function memoryStorage(initial = null) {
  let value = initial;
  let writes = 0;
  let removals = 0;
  return {
    getItem(key) { return key === LOCAL_SAVE_KEY ? value : null; },
    setItem(key, next) { if (key === LOCAL_SAVE_KEY) { value = next; writes += 1; } },
    removeItem(key) { if (key === LOCAL_SAVE_KEY) { value = null; removals += 1; } },
    snapshot() { return { value, writes, removals }; },
  };
}

const validSerializedSave = JSON.stringify({
  version: 1,
  player: { xp: 0, level: 1, position: { x: 0, z: 0 } },
  inventory: [],
  equipment: {},
  questStates: {},
});

test('first launch exposes Play and Settings before gameplay', () => {
  const flow = createSessionFlow({ status: 'empty' });
  assert.equal(flow.phase, SESSION_PHASES.TITLE);
  assert.deepEqual(getTitleActions(flow), {
    primary: { id: 'new-game', label: 'Jouer' },
    secondary: null,
    settings: { id: 'settings', label: 'Paramètres' },
    recoveryRequired: false,
  });
});

test('valid save exposes Continue and protects New Game behind confirmation', () => {
  const flow = createSessionFlow({ status: 'valid' });
  const actions = getTitleActions(flow);
  assert.deepEqual(actions.primary, { id: 'continue', label: 'Continuer' });
  assert.deepEqual(actions.secondary, { id: 'new-game', label: 'Nouvelle partie' });

  const request = requestSessionIntent(flow, 'new-game');
  assert.equal(request.ok, true);
  assert.equal(request.confirmationRequired, true);
  assert.equal(flow.phase, SESSION_PHASES.CONFIRM_NEW_GAME);
  assert.equal(cancelNewGame(flow), true);
  assert.equal(flow.phase, SESSION_PHASES.TITLE);

  requestSessionIntent(flow, 'new-game');
  assert.equal(confirmNewGame(flow).ok, true);
  assert.equal(flow.phase, SESSION_PHASES.LOADING);
});

test('Continue is rejected without a valid save', () => {
  const flow = createSessionFlow({ status: 'empty' });
  assert.deepEqual(requestSessionIntent(flow, 'continue'), { ok: false, reason: 'save-unavailable' });
  assert.equal(flow.phase, SESSION_PHASES.TITLE);
});

test('corrupt save is surfaced as recovery and never mutated by inspection', () => {
  const storage = memoryStorage('{broken');
  const before = storage.snapshot();
  const inspection = inspectLocalSave(storage);
  assert.deepEqual(inspection, { status: 'corrupt', reason: 'invalid-json' });
  assert.equal(hasValidSave(storage), false);
  assert.deepEqual(storage.snapshot(), before);

  const flow = createSessionFlow(inspection);
  assert.equal(getTitleActions(flow).recoveryRequired, true);
  const request = requestSessionIntent(flow, 'new-game');
  assert.equal(request.confirmationRequired, true);
  assert.equal(request.recovery, true);
});

test('local save inspection distinguishes empty and valid saves', () => {
  assert.deepEqual(inspectLocalSave(memoryStorage()), { status: 'empty', reason: null });
  const valid = inspectLocalSave(memoryStorage(validSerializedSave));
  assert.equal(valid.status, 'valid');
  assert.equal(valid.reason, null);
  assert.equal(valid.snapshot.version, 1);
  assert.equal(hasValidSave(memoryStorage(validSerializedSave)), true);
});

test('Settings are reversible and loading accepts only declared real phases', () => {
  const flow = createSessionFlow({ status: 'empty' });
  assert.equal(openSettings(flow), true);
  assert.equal(flow.phase, SESSION_PHASES.SETTINGS);
  assert.equal(closeSettings(flow), true);
  assert.equal(flow.phase, SESSION_PHASES.TITLE);

  assert.equal(requestSessionIntent(flow, 'new-game').ok, true);
  assert.equal(flow.phase, SESSION_PHASES.LOADING);
  assert.equal(setLoadingPhase(flow, 'config'), true);
  assert.equal(setLoadingPhase(flow, 'renderer'), true);
  assert.equal(setLoadingPhase(flow, 'invented-percent-73'), false);
  assert.equal(flow.loadingPhaseId, 'renderer');
});
