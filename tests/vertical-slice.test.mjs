import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/data/config.js';
import {
  addXp,
  createInitialGameState,
  damageEnemy,
  equipItem,
  grantItem,
  interact,
  stepGame,
} from '../src/gameplay/state.js';

const config = APP_CONFIG.gameplay;

test('vertical slice world exposes four distinct POIs inside bounds', () => {
  const points = Object.values(config.world.points);
  assert.equal(points.length, 4);
  assert.deepEqual(points.map((point) => point.id).sort(), ['bossArena', 'clearing', 'path', 'spawn']);
  const uniquePositions = new Set(points.map((point) => `${point.x}:${point.z}`));
  assert.equal(uniquePositions.size, 4);
  for (const point of points) assert.ok(Math.hypot(point.x, point.z) < config.world.radius);
});

test('progression crosses multiple thresholds without losing XP', () => {
  const state = createInitialGameState(config);
  addXp(state, 305, config);
  assert.equal(state.player.xp, 305);
  assert.equal(state.player.level, 4);
  assert.equal(state.player.maxHp, config.player.maxHp + 3 * config.progression.hpPerLevel);
  assert.equal(state.player.attackPower, 3 * config.progression.attackPerLevel);
});

test('loot inventory and equipment recalculate player stats deterministically', () => {
  const state = createInitialGameState(config);
  const weapon = grantItem(state, 'rune-blade', config);
  const armor = grantItem(state, 'woven-vest', config);
  assert.equal(weapon.ok, true);
  assert.equal(armor.ok, true);
  assert.notEqual(weapon.item.instanceId, armor.item.instanceId);
  assert.equal(equipItem(state, weapon.item.instanceId, config).ok, true);
  assert.equal(equipItem(state, armor.item.instanceId, config).ok, true);
  assert.equal(state.equipment.weapon, weapon.item.instanceId);
  assert.equal(state.equipment.armor, armor.item.instanceId);
  assert.equal(state.player.attackPower, config.items['rune-blade'].stats.attack);
  assert.equal(state.player.defense, config.items['woven-vest'].stats.defense);
});

test('NPC quest accepts, progresses from real kills and rewards only once', () => {
  const state = createInitialGameState(config);
  state.player.position = { x: config.world.npc.x, z: config.world.npc.z };
  const accepted = interact(state, config);
  assert.deepEqual(accepted, { ok: true, action: 'accepted', questId: 'mist-hunt' });

  const wargs = state.enemies.filter((enemy) => enemy.tag === 'warg');
  damageEnemy(state, wargs[0], wargs[0].maxHp * 2, 1, config);
  damageEnemy(state, wargs[1], wargs[1].maxHp * 2, 2, config);
  assert.equal(state.questStates['mist-hunt'].status, 'ready-to-turn-in');

  const inventoryBeforeTurnIn = state.inventory.length;
  const completed = interact(state, config);
  assert.deepEqual(completed, { ok: true, action: 'completed', questId: 'mist-hunt' });
  assert.equal(state.questStates['mist-hunt'].rewarded, true);
  assert.equal(state.inventory.length, inventoryBeforeTurnIn + 1);
  assert.equal(state.inventory.at(-1).itemId, 'mist-charm');

  const repeated = interact(state, config);
  assert.equal(repeated.ok, false);
  assert.equal(state.inventory.length, inventoryBeforeTurnIn + 1);
});

test('boss enrages, grants final reward once and defeat recovery resets encounter cleanly', () => {
  const state = createInitialGameState(config);
  const boss = state.enemies.find((enemy) => enemy.id === config.boss.id);
  state.player.position = { x: boss.position.x + 2, z: boss.position.z };
  boss.hp = Math.floor(boss.maxHp * 0.4);
  stepGame(state, 0.05, 10, config);
  assert.equal(boss.phase, 'enraged');

  const beforeReward = state.inventory.filter((item) => item.itemId === 'aurora-edge').length;
  damageEnemy(state, boss, boss.maxHp * 2, 11, config);
  assert.equal(state.bossVictory, true);
  assert.equal(state.bossRewardGranted, true);
  assert.equal(state.inventory.filter((item) => item.itemId === 'aurora-edge').length, beforeReward + 1);
  assert.equal(damageEnemy(state, boss, 1, 12, config), false);
  assert.equal(state.inventory.filter((item) => item.itemId === 'aurora-edge').length, beforeReward + 1);

  const retry = createInitialGameState(config);
  const retryBoss = retry.enemies.find((enemy) => enemy.id === config.boss.id);
  retryBoss.hp = 100;
  retryBoss.state = 'attack';
  retry.player.hp = 0;
  retry.player.defeatedAt = 20;
  stepGame(retry, 0.05, 20 + config.player.defeatRecoverySeconds + 0.01, config);
  assert.equal(retry.player.hp, retry.player.maxHp);
  assert.deepEqual(retry.player.position, config.player.start);
  assert.equal(retryBoss.hp, retryBoss.maxHp);
  assert.equal(retryBoss.state, 'idle');
});
