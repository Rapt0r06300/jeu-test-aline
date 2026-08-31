import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/data/config.js';
import { PERFORMANCE_BUDGETS, QUALITY_PROFILES, chooseQualityProfile } from '../src/data/quality.js';
import { SCENE_CONFIG } from '../src/data/scene-config.js';
import { applySaveSnapshot, decodeSave, encodeSave } from '../src/gameplay/save.js';
import { createInitialGameState, equipItem, grantItem } from '../src/gameplay/state.js';

const config = APP_CONFIG.gameplay;

test('versioned save round-trips portable progression state', () => {
  const source = createInitialGameState(config);
  source.settings = { quality: 'low' };
  source.player.xp = 175;
  source.player.level = 3;
  source.player.position = { x: 5.5, z: -3.25 };
  source.questStates['mist-hunt'] = { status: 'active', progress: 1, rewarded: false };
  const item = grantItem(source, 'rune-blade', config);
  assert.equal(item.ok, true);
  assert.equal(equipItem(source, item.item.instanceId, config).ok, true);

  const encoded = encodeSave(source);
  const decoded = decodeSave(encoded);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.snapshot.version, 1);

  const restored = createInitialGameState(config);
  restored.settings = { quality: 'auto' };
  const applied = applySaveSnapshot(restored, decoded.snapshot, config);
  assert.equal(applied.ok, true);
  assert.equal(restored.player.xp, 175);
  assert.equal(restored.player.level, 3);
  assert.deepEqual(restored.player.position, { x: 5.5, z: -3.25 });
  assert.equal(restored.questStates['mist-hunt'].progress, 1);
  assert.equal(restored.inventory.length, 1);
  assert.equal(restored.equipment.weapon, item.item.instanceId);
  assert.equal(restored.settings.quality, 'low');
});

test('save decoder rejects corrupt and unsupported payloads cleanly', () => {
  assert.deepEqual(decodeSave(''), { ok: false, reason: 'empty' });
  assert.deepEqual(decodeSave('{broken'), { ok: false, reason: 'invalid-json' });
  assert.deepEqual(decodeSave(JSON.stringify({ version: 999, player: {}, inventory: [], equipment: {} })), {
    ok: false,
    reason: 'unsupported-version',
  });
});

test('save sanitizes duplicate item instances and out-of-bounds position', () => {
  const state = createInitialGameState(config);
  const snapshot = {
    version: 1,
    player: { xp: 0, level: 1, position: { x: 9999, z: 0 } },
    inventory: [
      { instanceId: 'dup:1', itemId: 'mist-fang' },
      { instanceId: 'dup:1', itemId: 'mist-fang' },
      { instanceId: 'bad:1', itemId: 'does-not-exist' },
    ],
    equipment: { weapon: 'dup:1', armor: null },
    questStates: {},
    nextItemSerial: 2,
    settings: { quality: 'high' },
  };
  assert.equal(applySaveSnapshot(state, snapshot, config).ok, true);
  assert.equal(state.inventory.length, 1);
  assert.ok(Math.hypot(state.player.position.x, state.player.position.z) <= config.world.radius - config.world.boundaryPadding + 1e-9);
});

test('quality selector covers low, medium and high device tiers', () => {
  assert.equal(chooseQualityProfile({ memoryGB: 2, cores: 2, pixelRatio: 3, mobile: true }), 'low');
  assert.equal(chooseQualityProfile({ memoryGB: 4, cores: 6, pixelRatio: 2, mobile: true }), 'medium');
  assert.equal(chooseQualityProfile({ memoryGB: 12, cores: 10, pixelRatio: 2, mobile: false }), 'high');
});

test('configured preview stays inside declared mobile rendering budgets', () => {
  assert.ok(Object.values(QUALITY_PROFILES).every((profile) => profile.maxPixelRatio <= PERFORMANCE_BUDGETS.maxPixelRatio));
  assert.ok(config.enemies.spawns.length <= PERFORMANCE_BUDGETS.maxEnemyActors);
  const proceduralHigh = SCENE_CONFIG.treeCount + SCENE_CONFIG.rockCount + SCENE_CONFIG.crystalCount;
  assert.ok(proceduralHigh <= PERFORMANCE_BUDGETS.maxProceduralObjectsHigh);
});
