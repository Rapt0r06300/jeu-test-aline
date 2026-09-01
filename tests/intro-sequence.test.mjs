import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/data/config.js';
import { createInitialGameState } from '../src/gameplay/state.js';
import {
  INTRO_BEATS,
  INTRO_DURATION_SECONDS,
  advanceIntroSequence,
  commitIntroComplete,
  completeIntroSequence,
  createIntroSequenceState,
  getIntroTargetView,
  skipIntroSequence,
} from '../src/gameplay/intro-sequence.js';
import { applySaveSnapshot, createSaveSnapshot } from '../src/gameplay/save.js';

const config = APP_CONFIG.gameplay;

function makeDirtyState(seed = 1) {
  const state = createInitialGameState(config);
  state.player.position.x = 9 + seed;
  state.player.position.z = -5 - seed;
  state.player.moveIntent = { x: 1, z: .5 };
  state.targetId = state.enemies[0]?.id ?? null;
  if (state.enemies[0]) {
    state.enemies[0].hp = Math.max(1, state.enemies[0].maxHp - 7 - seed);
    state.enemies[0].state = 'chase';
    state.enemies[0].position.x += 3 + seed;
  }
  return state;
}

function canonicalFullCompletion() {
  const state = makeDirtyState(99);
  const sequence = createIntroSequenceState(state);
  const advance = advanceIntroSequence(sequence, INTRO_DURATION_SECONDS);
  assert.equal(advance.complete, true);
  completeIntroSequence(sequence, state, config);
  return getIntroTargetView(state);
}

test('intro beat sheet is contiguous, exactly 60 seconds, and carries place/danger/motivation/handoff', () => {
  assert.equal(INTRO_BEATS.length, 6);
  assert.equal(INTRO_BEATS[0].start, 0);
  assert.equal(INTRO_BEATS.at(-1).end, INTRO_DURATION_SECONDS);
  for (let index = 1; index < INTRO_BEATS.length; index++) {
    assert.equal(INTRO_BEATS[index - 1].end, INTRO_BEATS[index].start);
  }
  const copy = INTRO_BEATS.map((beat) => `${beat.kicker} ${beat.speaker ?? ''} ${beat.subtitle} ${beat.objective ?? ''}`).join(' ');
  assert.match(copy, /Eldervale/);
  assert.match(copy, /Brume Creuse/);
  assert.match(copy, /Elyra/);
  assert.match(copy, /Rejoindre Elyra au sanctuaire/);
  for (const beat of INTRO_BEATS) assert.ok(beat.subtitle.length <= 150, `${beat.id} subtitle is too long`);
});

test('skip at every narrative beat converges to the exact full-play target state', () => {
  const expected = canonicalFullCompletion();
  for (const [index, timing] of [0, 5.9, 8, 18, 30, 42, 55.8].entries()) {
    const state = makeDirtyState(index + 1);
    const sequence = createIntroSequenceState(state);
    advanceIntroSequence(sequence, timing);
    const result = skipIntroSequence(sequence, state, config);
    assert.equal(result.ok, true, `skip failed at ${timing}s`);
    assert.equal(result.skipped, true);
    assert.deepEqual(getIntroTargetView(state), expected, `divergent target at ${timing}s`);
  }
});

test('intro sequence keeps a start snapshot but never grants progression during beats', () => {
  const state = makeDirtyState(4);
  const before = {
    xp: state.player.xp,
    inventory: structuredClone(state.inventory),
    questStates: structuredClone(state.questStates),
    bossVictory: state.bossVictory,
  };
  const sequence = createIntroSequenceState(state);
  assert.ok(sequence.sequenceStartSnapshot);
  advanceIntroSequence(sequence, 47.5);
  assert.equal(state.player.xp, before.xp);
  assert.deepEqual(state.inventory, before.inventory);
  assert.deepEqual(state.questStates, before.questStates);
  assert.equal(state.bossVictory, before.bossVictory);
});

test('commitIntroComplete is idempotent and cannot erase later gameplay progress on replay', () => {
  const state = makeDirtyState(2);
  const first = commitIntroComplete(state, config);
  assert.equal(first.changed, true);

  state.player.position.x += 6;
  state.enemies[0].hp -= 3;
  state.enemies[0].state = 'chase';
  const progressed = structuredClone(getIntroTargetView(state));

  const second = commitIntroComplete(state, config);
  assert.equal(second.changed, false);
  assert.deepEqual(getIntroTargetView(state), progressed);
});

test('narrative state persists while legacy v1 saves without it remain compatible', () => {
  const state = createInitialGameState(config);
  commitIntroComplete(state, config);
  const snapshot = createSaveSnapshot(state);
  assert.equal(snapshot.narrative.introComplete, true);
  assert.equal(snapshot.narrative.objectiveId, 'reach_sanctuary');

  const restored = createInitialGameState(config);
  assert.equal(applySaveSnapshot(restored, snapshot, config).ok, true);
  assert.equal(restored.narrative.introComplete, true);
  assert.equal(restored.narrative.elyraActive, true);

  const legacySnapshot = structuredClone(snapshot);
  delete legacySnapshot.narrative;
  legacySnapshot.firstSession = null;
  const legacy = createInitialGameState(config);
  assert.equal(applySaveSnapshot(legacy, legacySnapshot, config).ok, true);
  assert.equal(legacy.narrative.introComplete, false);
  assert.equal(legacy.narrative.objectiveId, null);
});
