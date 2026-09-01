import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_CONFIG } from '../src/data/config.js';
import { createSaveSnapshot, applySaveSnapshot } from '../src/gameplay/save.js';
import { createInitialGameState } from '../src/gameplay/state.js';
import {
  PROLOGUE_STEPS,
  ensurePrologueState,
  getPrologueView,
  syncPrologue,
  tryPrologueInteraction,
} from '../src/gameplay/prologue.js';

function createState() {
  const state = createInitialGameState(APP_CONFIG.gameplay);
  state.settings = { quality: 'auto', guidance: 'complete' };
  state.narrative = {
    introComplete: true,
    elyraActive: true,
    objectiveId: 'reach_sanctuary',
    artifactClaimed: false,
  };
  ensurePrologueState(state);
  return state;
}

function cloneFromSave(state) {
  const snapshot = createSaveSnapshot(state);
  const restored = createState();
  const result = applySaveSnapshot(restored, snapshot, APP_CONFIG.gameplay);
  assert.equal(result.ok, true);
  return restored;
}

test('QR-07 exposes the six required P0-P5 data contracts', () => {
  assert.deepEqual(PROLOGUE_STEPS.map((step) => step.id), ['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
  for (const step of PROLOGUE_STEPS) {
    for (const field of [
      'id', 'objectiveText', 'startConditions', 'successConditions', 'retryPolicy',
      'checkpoint', 'rewards', 'nextStepId', 'guidanceProfileId', 'narrativeBeatId',
    ]) assert.ok(field in step, `${step.id} missing ${field}`);
    assert.ok(step.objectiveText.length > 12, `${step.id} objective must be explicit`);
    assert.ok(step.narrative.length > 12, `${step.id} needs a visible narrative consequence/context`);
  }
});

test('QR-07 follows Elyra → beacon → Wargs → fragment → Sentinel → Guardian', () => {
  const state = createState();
  assert.equal(getPrologueView(state, APP_CONFIG.gameplay).id, 'p0');

  state.questStates['mist-hunt'].status = 'active';
  assert.equal(syncPrologue(state, APP_CONFIG.gameplay).advanced, true);
  assert.equal(state.prologue.stepId, 'p1');

  state.player.position = { ...APP_CONFIG.gameplay.world.points.path };
  assert.equal(tryPrologueInteraction(state, APP_CONFIG.gameplay).ok, true);
  assert.equal(state.prologue.stepId, 'p2');
  assert.equal(state.prologue.worldImpact.auxiliaryBeaconLit, true);
  assert.equal(state.prologue.worldImpact.mistPressure, 'receding');
  assert.equal(state.prologue.checkpointId, 'p1');

  state.questStates['mist-hunt'].progress = 2;
  state.questStates['mist-hunt'].status = 'ready-to-turn-in';
  assert.equal(syncPrologue(state, APP_CONFIG.gameplay).advanced, true);
  assert.equal(state.prologue.stepId, 'p3');
  assert.equal(state.prologue.worldImpact.firstCombatWon, true);
  assert.equal(state.prologue.checkpointId, 'p2');

  state.player.position = { ...APP_CONFIG.gameplay.world.points.clearing };
  assert.equal(tryPrologueInteraction(state, APP_CONFIG.gameplay).ok, true);
  assert.equal(state.prologue.stepId, 'p4');
  assert.equal(state.narrative.artifactClaimed, true);
  assert.equal(state.prologue.worldImpact.fragmentRevealed, true);
  assert.equal(state.prologue.worldImpact.secondBeaconOffline, true);
  assert.equal(state.prologue.checkpointId, 'p3');

  const elite = state.enemies.find((enemy) => enemy.id === 'sentinel-1');
  elite.state = 'dead';
  elite.hp = 0;
  assert.equal(syncPrologue(state, APP_CONFIG.gameplay).advanced, true);
  assert.equal(state.prologue.stepId, 'p5');
  assert.equal(state.prologue.worldImpact.eliteDefeated, true);
  assert.equal(state.prologue.worldImpact.bossRouteOpen, true);
  assert.equal(state.prologue.checkpointId, 'pre-boss');

  state.bossVictory = true;
  assert.equal(syncPrologue(state, APP_CONFIG.gameplay).advanced, true);
  assert.equal(state.prologue.completed, true);
  assert.equal(state.prologue.stepId, 'complete');
  assert.equal(state.prologue.worldImpact.sanctuaryStabilized, true);
  assert.equal(state.prologue.worldImpact.distantPulse, true);
  assert.equal(state.prologue.nextObjectiveId, 'follow_resonance');
  assert.equal(state.narrative.objectiveId, 'follow_resonance');
  assert.match(getPrologueView(state, APP_CONFIG.gameplay).objective, /au-delà du col/i);

  const claimsBefore = { ...state.prologue.rewardClaims };
  assert.deepEqual(syncPrologue(state, APP_CONFIG.gameplay), { changed: false, advanced: false });
  assert.deepEqual(state.prologue.rewardClaims, claimsBefore, 're-sync must not replay any claim');
});

test('QR-07 reload restores P1, P3 and pre-boss checkpoints without duplicate claims', () => {
  const state = createState();
  state.questStates['mist-hunt'].status = 'active';
  syncPrologue(state, APP_CONFIG.gameplay);

  state.player.position = { ...APP_CONFIG.gameplay.world.points.path };
  tryPrologueInteraction(state, APP_CONFIG.gameplay);
  let restored = cloneFromSave(state);
  assert.equal(restored.prologue.stepId, 'p2');
  assert.equal(restored.prologue.checkpointId, 'p1');
  assert.equal(restored.prologue.worldImpact.auxiliaryBeaconLit, true);
  assert.equal(restored.prologue.rewardClaims['world:p1:beacon'], true);

  state.questStates['mist-hunt'].progress = 2;
  state.questStates['mist-hunt'].status = 'ready-to-turn-in';
  syncPrologue(state, APP_CONFIG.gameplay);
  state.player.position = { ...APP_CONFIG.gameplay.world.points.clearing };
  tryPrologueInteraction(state, APP_CONFIG.gameplay);
  restored = cloneFromSave(state);
  assert.equal(restored.prologue.stepId, 'p4');
  assert.equal(restored.prologue.checkpointId, 'p3');
  assert.equal(restored.narrative.artifactClaimed, true);
  assert.equal(restored.prologue.rewardClaims['world:p3:fragment'], true);

  state.enemies.find((enemy) => enemy.id === 'sentinel-1').state = 'dead';
  syncPrologue(state, APP_CONFIG.gameplay);
  restored = cloneFromSave(state);
  assert.equal(restored.prologue.stepId, 'p5');
  assert.equal(restored.prologue.checkpointId, 'pre-boss');
  assert.equal(restored.prologue.worldImpact.eliteDefeated, true);
  const claimCount = Object.keys(restored.prologue.rewardClaims).length;
  syncPrologue(restored, APP_CONFIG.gameplay);
  assert.equal(Object.keys(restored.prologue.rewardClaims).length, claimCount);
});

test('QR-07 world interactions never advance from outside their visible interaction radius', () => {
  const state = createState();
  state.questStates['mist-hunt'].status = 'active';
  syncPrologue(state, APP_CONFIG.gameplay);
  state.player.position = { x: 30, z: 30 };
  const result = tryPrologueInteraction(state, APP_CONFIG.gameplay);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too-far');
  assert.equal(state.prologue.stepId, 'p1');
});
