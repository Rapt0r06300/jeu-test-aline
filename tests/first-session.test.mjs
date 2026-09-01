import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/data/config.js';
import {
  advanceFirstSession,
  consumeFirstSessionReplay,
  ensureFirstSessionState,
  getFirstSessionView,
  requestFirstSessionReplay,
  skipFirstSessionStep,
  syncFirstSession,
} from '../src/gameplay/first-session.js';
import { applySaveSnapshot, decodeSave, encodeSave } from '../src/gameplay/save.js';
import { createInitialGameState } from '../src/gameplay/state.js';

const config = APP_CONFIG.gameplay;

function createState() {
  const state = createInitialGameState(config);
  ensureFirstSessionState(state, config);
  return state;
}

function reachHunt(state) {
  assert.equal(advanceFirstSession(state, config).ok, true);
  assert.equal(skipFirstSessionStep(state, config).ok, true);
  assert.equal(getFirstSessionView(state, config).id, 'meet-elyra');
  state.questStates['mist-hunt'].status = 'active';
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'hunt-wargs');
}

function reachVictory(state) {
  reachHunt(state);
  state.questStates['mist-hunt'].progress = 2;
  state.questStates['mist-hunt'].status = 'ready-to-turn-in';
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'return-elyra');
  state.questStates['mist-hunt'].status = 'completed';
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'defeat-warden');
  state.bossVictory = true;
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'victory');
}

test('first session follows deterministic data-driven order', () => {
  const state = createState();
  assert.equal(getFirstSessionView(state, config).id, 'title');

  assert.equal(advanceFirstSession(state, config).ok, true);
  assert.equal(getFirstSessionView(state, config).id, 'intro');

  assert.equal(skipFirstSessionStep(state, config).ok, true);
  assert.equal(getFirstSessionView(state, config).id, 'meet-elyra');

  state.questStates['mist-hunt'].status = 'active';
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'hunt-wargs');

  state.questStates['mist-hunt'].progress = 2;
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'return-elyra');

  state.questStates['mist-hunt'].status = 'completed';
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'defeat-warden');

  state.bossVictory = true;
  syncFirstSession(state, config);
  assert.equal(getFirstSessionView(state, config).id, 'victory');

  assert.equal(advanceFirstSession(state, config).ok, true);
  const complete = getFirstSessionView(state, config);
  assert.equal(complete.id, 'complete');
  assert.equal(complete.terminal, true);
});

test('every configured first-session step exposes a clear HUD objective', () => {
  const state = createState();
  for (const step of config.firstSession.steps) {
    state.firstSession.stepId = step.id;
    const view = getFirstSessionView(state, config);
    assert.equal(view.id, step.id);
    assert.ok(view.title.trim().length >= 4, `${step.id} must have a title`);
    assert.ok(view.objective.trim().length >= 12, `${step.id} must have an objective`);
    assert.match(view.progressLabel, /^\d+\/\d+$/);
  }
});

test('non-critical presentation steps can be skipped and replayed without rewinding gameplay', () => {
  const state = createState();
  assert.equal(advanceFirstSession(state, config).ok, true);
  assert.equal(getFirstSessionView(state, config).id, 'intro');

  const playerPosition = { ...state.player.position };
  const replay = requestFirstSessionReplay(state, config);
  assert.equal(replay.ok, true);
  assert.equal(state.firstSession.replayRequestedStepId, 'intro');
  assert.deepEqual(state.player.position, playerPosition);

  const requested = consumeFirstSessionReplay(state, config);
  assert.equal(requested.id, 'intro');
  assert.equal(state.firstSession.replayRequestedStepId, null);

  const skipped = skipFirstSessionStep(state, config);
  assert.equal(skipped.ok, true);
  assert.equal(getFirstSessionView(state, config).id, 'meet-elyra');
});

test('reload resumes coherently at three distinct first-session steps', () => {
  const sources = [];

  const title = createState();
  sources.push(title);

  const hunt = createState();
  reachHunt(hunt);
  sources.push(hunt);

  const victory = createState();
  reachVictory(victory);
  sources.push(victory);

  const expectedSteps = ['title', 'hunt-wargs', 'victory'];
  for (let i = 0; i < sources.length; i += 1) {
    const encoded = encodeSave(sources[i]);
    const decoded = decodeSave(encoded);
    assert.equal(decoded.ok, true);

    const restored = createInitialGameState(config);
    restored.settings = { quality: 'auto' };
    const applied = applySaveSnapshot(restored, decoded.snapshot, config);
    assert.equal(applied.ok, true);
    assert.equal(getFirstSessionView(restored, config).id, expectedSteps[i]);
  }
});

test('legacy save without first-session state remains loadable', () => {
  const source = createState();
  const decoded = decodeSave(encodeSave(source));
  assert.equal(decoded.ok, true);
  delete decoded.snapshot.firstSession;

  const restored = createInitialGameState(config);
  restored.settings = { quality: 'auto' };
  assert.equal(applySaveSnapshot(restored, decoded.snapshot, config).ok, true);
  assert.equal(getFirstSessionView(restored, config).id, 'title');
});
