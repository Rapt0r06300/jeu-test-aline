import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_CONFIG } from '../src/data/config.js';
import { createInitialGameState } from '../src/gameplay/state.js';
import { ensurePrologueState } from '../src/gameplay/prologue.js';
import {
  GUIDANCE_STEPS,
  ensureGuidanceState,
  getGuidanceView,
  recordGuidanceSignal,
  resetGuidance,
  setGuidanceMode,
  syncGuidance,
} from '../src/gameplay/guidance.js';

function createState() {
  const state = createInitialGameState(APP_CONFIG.gameplay);
  state.settings = { quality: 'auto', guidance: 'complete' };
  state.narrative = { introComplete: true, elyraActive: true, objectiveId: 'reach_sanctuary', artifactClaimed: false };
  ensurePrologueState(state);
  ensureGuidanceState(state);
  return state;
}

test('QR-08 defines ten data-driven GuidanceStep contracts', () => {
  assert.equal(GUIDANCE_STEPS.length, 10);
  const required = [
    'id', 'triggerConditions', 'messageKey', 'anchorTarget', 'inputHintIds',
    'successConditions', 'dismissPolicy', 'repeatPolicy', 'cooldown', 'priority',
    'accessibilityVariant', 'analyticsEventId', 'nextCandidates',
  ];
  for (const step of GUIDANCE_STEPS) {
    for (const field of required) assert.ok(field in step, `${step.id} missing ${field}`);
    assert.ok(['critical', 'passive'].includes(step.priority));
  }
});

test('QR-08 shows movement immediately and auto-validates already mastered mechanics', () => {
  const state = createState();
  syncGuidance(state, 0);
  assert.equal(getGuidanceView(state).id, 'movement');

  recordGuidanceSignal(state, 'movementDistance', 5, 2);
  syncGuidance(state, 2);
  assert.ok(state.guidance.masteredStepIds.includes('movement'));
  assert.ok(state.guidance.masteredStepIds.includes('camera'), 'camera follow should auto-master once movement proves it');
  assert.equal(getGuidanceView(state).id, 'interaction');
});

test('QR-08 Complete, Minimal and Off never alter prologue progression', () => {
  const state = createState();
  const prologueBefore = JSON.stringify(state.prologue);

  assert.equal(setGuidanceMode(state, 'minimal').ok, true);
  syncGuidance(state, 0);
  assert.equal(state.settings.guidance, 'minimal');
  assert.equal(JSON.stringify(state.prologue), prologueBefore);

  assert.equal(setGuidanceMode(state, 'off').ok, true);
  syncGuidance(state, 1);
  assert.equal(getGuidanceView(state).active, false);
  assert.equal(JSON.stringify(state.prologue), prologueBefore);
});

test('QR-08 replay resets only guidance flags, never loot, quest or prologue state', () => {
  const state = createState();
  state.prologue.stepId = 'p3';
  state.prologue.completedStepIds = ['p0', 'p1', 'p2'];
  state.questStates['mist-hunt'].status = 'ready-to-turn-in';
  state.questStates['mist-hunt'].progress = 2;
  state.inventory.push({ instanceId: 'mist-fang:99', itemId: 'mist-fang' });
  recordGuidanceSignal(state, 'movementDistance', 6, 1);
  syncGuidance(state, 1);

  const progressionBefore = JSON.stringify({
    prologue: state.prologue,
    quest: state.questStates['mist-hunt'],
    inventory: state.inventory,
  });
  resetGuidance(state);
  assert.equal(JSON.stringify({
    prologue: state.prologue,
    quest: state.questStates['mist-hunt'],
    inventory: state.inventory,
  }), progressionBefore);
  assert.deepEqual(state.guidance.masteredStepIds, []);
});

test('QR-08 telemetry is bounded and contains only non-PII event fields', () => {
  const state = createState();
  syncGuidance(state, 0);
  for (let i = 0; i < 140; i++) recordGuidanceSignal(state, 'movementDistance', 0.1, i / 10);
  assert.ok(state.guidance.events.length <= 96);
  const allowed = new Set(['event', 'stepId', 'at', 'elapsed', 'context']);
  for (const event of state.guidance.events) {
    for (const key of Object.keys(event)) assert.ok(allowed.has(key), `unexpected telemetry field ${key}`);
  }
});

test('QR-08 never exposes more than one active guidance at once', () => {
  const state = createState();
  recordGuidanceSignal(state, 'movementDistance', 5, 1);
  state.questStates['mist-hunt'].status = 'active';
  state.prologue.stepId = 'p2';
  syncGuidance(state, 1);
  const view = getGuidanceView(state);
  assert.equal(typeof state.guidance.activeId === 'string' || state.guidance.activeId === null, true);
  assert.equal(Array.isArray(view), false);
});
