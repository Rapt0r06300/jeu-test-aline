const EPSILON = 1e-6;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeMovement(x, z) {
  const length = Math.hypot(x, z);
  if (length <= EPSILON) return { x: 0, z: 0 };
  const scale = length > 1 ? 1 / length : 1;
  return { x: x * scale, z: z * scale };
}

export function distance2D(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}

function createEnemy(spawn) {
  return {
    id: spawn.id,
    name: spawn.name,
    hp: spawn.maxHp,
    maxHp: spawn.maxHp,
    state: 'idle',
    position: { x: spawn.x, z: spawn.z },
    spawn: { x: spawn.x, z: spawn.z },
    nextAttackAt: 0,
    respawnAt: 0,
  };
}

export function createInitialGameState(gameplayConfig) {
  const playerConfig = gameplayConfig?.player ?? {
    maxHp: 100,
    maxMana: 100,
    moveSpeed: 7,
    manaRegenPerSecond: 5,
    start: { x: 0, z: 0 },
  };
  const spawns = gameplayConfig?.enemies?.spawns ?? [];
  const actions = gameplayConfig?.actions ?? {};
  return {
    phase: 'boot',
    renderer: null,
    time: 0,
    player: {
      hp: playerConfig.maxHp,
      maxHp: playerConfig.maxHp,
      mana: playerConfig.maxMana,
      maxMana: playerConfig.maxMana,
      level: 1,
      xp: 0,
      position: { x: playerConfig.start.x, z: playerConfig.start.z },
      moveIntent: { x: 0, z: 0 },
    },
    enemies: spawns.map(createEnemy),
    targetId: null,
    cooldowns: Object.fromEntries(Object.keys(actions).map((id) => [id, 0])),
    feedback: null,
  };
}

export function setMoveIntent(state, x, z) {
  state.player.moveIntent = normalizeMovement(x, z);
}

export function clearMoveIntent(state) {
  state.player.moveIntent = { x: 0, z: 0 };
}

export function getTarget(state) {
  return state.enemies.find((enemy) => enemy.id === state.targetId && enemy.state !== 'dead') ?? null;
}

export function selectBestTarget(state, range) {
  const candidates = state.enemies
    .filter((enemy) => enemy.state !== 'dead')
    .map((enemy) => ({ enemy, distance: distance2D(state.player.position, enemy.position) }))
    .filter((entry) => entry.distance <= range)
    .sort((a, b) => a.distance - b.distance || a.enemy.id.localeCompare(b.enemy.id));
  state.targetId = candidates[0]?.enemy.id ?? null;
  return candidates[0]?.enemy ?? null;
}

function moveToward(position, target, amount) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= EPSILON) return;
  const step = Math.min(distance, amount);
  position.x += (dx / distance) * step;
  position.z += (dz / distance) * step;
}

function updateEnemy(enemy, state, dt, now, config) {
  const enemyConfig = config.enemies;
  if (enemy.state === 'dead') {
    if (now >= enemy.respawnAt) {
      enemy.hp = enemy.maxHp;
      enemy.position.x = enemy.spawn.x;
      enemy.position.z = enemy.spawn.z;
      enemy.state = 'idle';
      enemy.nextAttackAt = 0;
      enemy.respawnAt = 0;
    }
    return;
  }

  const distance = distance2D(enemy.position, state.player.position);
  if (distance > enemyConfig.aggroRange) {
    enemy.state = 'idle';
    return;
  }

  if (distance > enemyConfig.attackRange) {
    enemy.state = 'chase';
    moveToward(enemy.position, state.player.position, enemyConfig.moveSpeed * dt);
    return;
  }

  enemy.state = 'attack';
  if (now >= enemy.nextAttackAt && state.player.hp > 0) {
    state.player.hp = clamp(state.player.hp - enemyConfig.attackDamage, 0, state.player.maxHp);
    enemy.nextAttackAt = now + enemyConfig.attackCooldown;
    state.feedback = { type: 'enemy-hit', sourceId: enemy.id, at: now };
  }
}

export function damageEnemy(state, enemy, amount, now, config) {
  if (!enemy || enemy.state === 'dead') return false;
  enemy.hp = clamp(enemy.hp - amount, 0, enemy.maxHp);
  if (enemy.hp === 0) {
    enemy.state = 'dead';
    enemy.nextAttackAt = 0;
    enemy.respawnAt = now + config.enemies.respawnSeconds;
    if (state.targetId === enemy.id) state.targetId = null;
    state.player.xp += 20;
  }
  return true;
}

export function tryAction(state, actionId, now, config) {
  const action = config.actions[actionId];
  if (!action) return { ok: false, reason: 'unknown-action' };
  const target = getTarget(state) ?? selectBestTarget(state, config.targeting.range);
  if (!target) return { ok: false, reason: 'no-target' };
  if (distance2D(state.player.position, target.position) > action.range) return { ok: false, reason: 'out-of-range' };
  if ((state.cooldowns[actionId] ?? 0) > now) return { ok: false, reason: 'cooldown' };
  if (state.player.mana < action.manaCost) return { ok: false, reason: 'mana' };

  state.player.mana = clamp(state.player.mana - action.manaCost, 0, state.player.maxMana);
  state.cooldowns[actionId] = now + action.cooldown;
  damageEnemy(state, target, action.damage, now, config);
  state.feedback = { type: 'player-action', actionId, targetId: target.id, at: now };
  return { ok: true, targetId: target.id, damage: action.damage };
}

export function stepGame(state, dt, now, config) {
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  state.time = now;
  const intent = normalizeMovement(state.player.moveIntent.x, state.player.moveIntent.z);
  state.player.position.x += intent.x * config.player.moveSpeed * safeDt;
  state.player.position.z += intent.z * config.player.moveSpeed * safeDt;
  state.player.mana = clamp(
    state.player.mana + config.player.manaRegenPerSecond * safeDt,
    0,
    state.player.maxMana,
  );

  for (const enemy of state.enemies) updateEnemy(enemy, state, safeDt, now, config);

  const target = getTarget(state);
  if (!target || distance2D(state.player.position, target.position) > config.targeting.range) {
    selectBestTarget(state, config.targeting.range);
  }
}
