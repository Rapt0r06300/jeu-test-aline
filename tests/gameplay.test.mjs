import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/data/config.js';
import {
  createInitialGameState,
  damageEnemy,
  normalizeMovement,
  selectBestTarget,
  setMoveIntent,
  stepGame,
  tryAction,
} from '../src/gameplay/state.js';

const config = APP_CONFIG.gameplay;

test('movement normalization caps diagonal magnitude', () => {
  const movement = normalizeMovement(1, 1);
  assert.ok(Math.hypot(movement.x, movement.z) <= 1.000001);
});

test('player movement is data-driven and bounded by dt clamp', () => {
  const state = createInitialGameState(config);
  const startX = state.player.position.x;
  setMoveIntent(state, 1, 0);
  stepGame(state, 1, 1, config);
  assert.ok(state.player.position.x > startX);
  assert.ok(state.player.position.x - startX <= config.player.moveSpeed * 0.050001);
});

test('target selection ignores dead enemies and is deterministic', () => {
  const state = createInitialGameState(config);
  state.player.position = { x: 0, z: 0 };
  state.enemies[0].position = { x: 2, z: 0 };
  state.enemies[1].position = { x: 2, z: 0 };
  state.enemies[2].position = { x: 30, z: 0 };
  state.enemies[3].state = 'dead';
  const target = selectBestTarget(state, 10);
  const expected = [state.enemies[0], state.enemies[1]].sort((a, b) => a.id.localeCompare(b.id))[0];
  assert.equal(target.id, expected.id);
});

test('combat validates target, range, mana and cooldown', () => {
  const state = createInitialGameState(config);
  state.enemies[0].position = { x: state.player.position.x + 2, z: state.player.position.z };
  state.targetId = state.enemies[0].id;

  const first = tryAction(state, 'skill1', 10, config);
  assert.equal(first.ok, true);
  assert.equal(state.enemies[0].hp, state.enemies[0].maxHp - config.actions.skill1.damage);
  assert.equal(state.player.mana, state.player.maxMana - config.actions.skill1.manaCost);

  const cooldown = tryAction(state, 'skill1', 10.1, config);
  assert.deepEqual(cooldown, { ok: false, reason: 'cooldown' });

  state.cooldowns.skill2 = 0;
  state.player.mana = 0;
  const noMana = tryAction(state, 'skill2', 20, config);
  assert.deepEqual(noMana, { ok: false, reason: 'mana' });

  state.player.mana = state.player.maxMana;
  state.enemies[0].position = { x: state.player.position.x + 20, z: state.player.position.z };
  state.targetId = state.enemies[0].id;
  const outOfRange = tryAction(state, 'skill4', 30, config);
  assert.equal(outOfRange.ok, false);
  assert.ok(['out-of-range', 'no-target'].includes(outOfRange.reason));
});

test('enemy AI chases, attacks, dies and respawns cleanly', () => {
  const state = createInitialGameState(config);
  const enemy = state.enemies[0];
  state.player.position = { x: 0, z: 0 };
  enemy.position = { x: 5, z: 0 };
  enemy.spawn = { x: 5, z: 0 };

  stepGame(state, 0.05, 1, config);
  assert.equal(enemy.state, 'chase');
  assert.ok(enemy.position.x < 5);

  enemy.position = { x: 1, z: 0 };
  const hpBefore = state.player.hp;
  stepGame(state, 0.05, 2, config);
  assert.equal(enemy.state, 'attack');
  assert.ok(state.player.hp < hpBefore);

  state.targetId = enemy.id;
  damageEnemy(state, enemy, enemy.maxHp * 2, 3, config);
  assert.equal(enemy.state, 'dead');
  assert.equal(state.targetId, null);

  stepGame(state, 0.05, 3 + config.enemies.respawnSeconds + 0.01, config);
  assert.equal(enemy.state, 'idle');
  assert.equal(enemy.hp, enemy.maxHp);
  assert.deepEqual(enemy.position, enemy.spawn);
});
