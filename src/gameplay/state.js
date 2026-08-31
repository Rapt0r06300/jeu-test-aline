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

function enemyTag(spawn) {
  if (spawn.isBoss) return 'boss';
  if (spawn.id.startsWith('warg')) return 'warg';
  if (spawn.id.startsWith('sentinel')) return 'sentinel';
  return 'enemy';
}

function createEnemy(spawn) {
  return {
    id: spawn.id,
    name: spawn.name,
    tag: enemyTag(spawn),
    hp: spawn.maxHp,
    maxHp: spawn.maxHp,
    xpReward: spawn.xpReward ?? 20,
    loot: spawn.loot ?? null,
    isBoss: Boolean(spawn.isBoss),
    state: 'idle',
    phase: spawn.isBoss ? 'phase-1' : null,
    position: { x: spawn.x, z: spawn.z },
    spawn: { x: spawn.x, z: spawn.z },
    nextAttackAt: 0,
    respawnAt: 0,
    pendingDamageAt: 0,
  };
}

export function createInitialGameState(gameplayConfig) {
  const playerConfig = gameplayConfig.player;
  const questStates = Object.fromEntries(
    Object.values(gameplayConfig.quests ?? {}).map((quest) => [quest.id, { status: 'available', progress: 0, rewarded: false }]),
  );
  const state = {
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
      attackPower: playerConfig.baseAttackPower ?? 0,
      defense: playerConfig.baseDefense ?? 0,
      position: { x: playerConfig.start.x, z: playerConfig.start.z },
      moveIntent: { x: 0, z: 0 },
      defeatedAt: 0,
    },
    enemies: (gameplayConfig.enemies?.spawns ?? []).map(createEnemy),
    targetId: null,
    cooldowns: Object.fromEntries(Object.keys(gameplayConfig.actions ?? {}).map((id) => [id, 0])),
    feedback: null,
    inventory: [],
    equipment: { weapon: null, armor: null },
    nextItemSerial: 1,
    questStates,
    bossVictory: false,
    bossRewardGranted: false,
  };
  recomputePlayerStats(state, gameplayConfig);
  return state;
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

export function recomputePlayerStats(state, config) {
  const progression = config.progression;
  const levelBonus = Math.max(0, state.player.level - 1);
  const equippedItems = Object.values(state.equipment)
    .map((instanceId) => state.inventory.find((item) => item.instanceId === instanceId))
    .filter(Boolean);
  const gearAttack = equippedItems.reduce((sum, item) => sum + (config.items[item.itemId]?.stats?.attack ?? 0), 0);
  const gearDefense = equippedItems.reduce((sum, item) => sum + (config.items[item.itemId]?.stats?.defense ?? 0), 0);
  const oldMaxHp = state.player.maxHp || config.player.maxHp;
  const oldMaxMana = state.player.maxMana || config.player.maxMana;
  const hpRatio = oldMaxHp ? state.player.hp / oldMaxHp : 1;
  const manaRatio = oldMaxMana ? state.player.mana / oldMaxMana : 1;

  state.player.maxHp = config.player.maxHp + levelBonus * progression.hpPerLevel;
  state.player.maxMana = config.player.maxMana + levelBonus * progression.manaPerLevel;
  state.player.attackPower = (config.player.baseAttackPower ?? 0) + levelBonus * progression.attackPerLevel + gearAttack;
  state.player.defense = (config.player.baseDefense ?? 0) + gearDefense;
  state.player.hp = clamp(state.player.maxHp * hpRatio, 0, state.player.maxHp);
  state.player.mana = clamp(state.player.maxMana * manaRatio, 0, state.player.maxMana);
}

export function addXp(state, amount, config) {
  const previousLevel = state.player.level;
  state.player.xp = Math.max(0, state.player.xp + Math.max(0, amount));
  const thresholds = config.progression.xpThresholds;
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (state.player.xp >= thresholds[i]) level = i + 1;
    else break;
  }
  state.player.level = Math.max(previousLevel, level);
  if (state.player.level !== previousLevel) {
    recomputePlayerStats(state, config);
    state.player.hp = state.player.maxHp;
    state.player.mana = state.player.maxMana;
    state.feedback = { type: 'level-up', level: state.player.level, at: state.time };
  }
  return state.player.level;
}

export function grantItem(state, itemId, config) {
  const definition = config.items[itemId];
  if (!definition) return { ok: false, reason: 'unknown-item' };
  if (state.inventory.length >= config.player.inventoryCapacity) return { ok: false, reason: 'inventory-full' };
  const instance = { instanceId: `${itemId}:${state.nextItemSerial++}`, itemId };
  state.inventory.push(instance);
  return { ok: true, item: instance };
}

export function equipItem(state, instanceId, config) {
  const instance = state.inventory.find((item) => item.instanceId === instanceId);
  if (!instance) return { ok: false, reason: 'missing-item' };
  const definition = config.items[instance.itemId];
  if (!definition?.slot || !(definition.slot in state.equipment)) return { ok: false, reason: 'not-equippable' };
  state.equipment[definition.slot] = instance.instanceId;
  recomputePlayerStats(state, config);
  return { ok: true, slot: definition.slot };
}

function recordKillForQuests(state, enemy, config) {
  for (const quest of Object.values(config.quests ?? {})) {
    const questState = state.questStates[quest.id];
    if (!questState || questState.status !== 'active') continue;
    if (quest.objective.type === 'kill-tag' && enemy.tag === quest.objective.tag) {
      questState.progress = Math.min(quest.objective.required, questState.progress + 1);
      if (questState.progress >= quest.objective.required) questState.status = 'ready-to-turn-in';
    }
  }
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

function resetEnemy(enemy) {
  enemy.hp = enemy.maxHp;
  enemy.position.x = enemy.spawn.x;
  enemy.position.z = enemy.spawn.z;
  enemy.state = 'idle';
  enemy.phase = enemy.isBoss ? 'phase-1' : null;
  enemy.nextAttackAt = 0;
  enemy.respawnAt = 0;
  enemy.pendingDamageAt = 0;
}

function defeatPlayer(state, now) {
  if (state.player.hp > 0 || state.player.defeatedAt) return;
  state.player.defeatedAt = now;
  state.player.moveIntent = { x: 0, z: 0 };
  state.feedback = { type: 'player-defeated', at: now };
}

function applyEnemyDamage(state, amount, now, enemyId) {
  const reduced = Math.max(1, amount - state.player.defense);
  state.player.hp = clamp(state.player.hp - reduced, 0, state.player.maxHp);
  state.feedback = { type: 'enemy-hit', sourceId: enemyId, damage: reduced, at: now };
  defeatPlayer(state, now);
}

function updateBoss(enemy, state, dt, now, config) {
  const boss = config.boss;
  if (enemy.hp / enemy.maxHp <= boss.enrageHealthRatio) enemy.phase = 'enraged';
  const distance = distance2D(enemy.position, state.player.position);
  if (distance > boss.aggroRange) {
    enemy.state = 'idle';
    enemy.pendingDamageAt = 0;
    return;
  }
  if (distance > boss.attackRange) {
    enemy.state = 'chase';
    moveToward(enemy.position, state.player.position, boss.moveSpeed * dt);
    return;
  }
  enemy.state = 'attack';

  if (enemy.pendingDamageAt && now >= enemy.pendingDamageAt) {
    const damage = enemy.phase === 'enraged' ? boss.enragedAttackDamage : boss.attackDamage;
    applyEnemyDamage(state, damage, now, enemy.id);
    enemy.pendingDamageAt = 0;
  }

  if (!enemy.pendingDamageAt && now >= enemy.nextAttackAt && state.player.hp > 0) {
    enemy.pendingDamageAt = now + boss.telegraphSeconds;
    enemy.nextAttackAt = now + (enemy.phase === 'enraged' ? boss.enragedAttackCooldown : boss.attackCooldown);
    state.feedback = {
      type: 'boss-telegraph',
      sourceId: enemy.id,
      pattern: enemy.phase === 'enraged' ? 'nova' : 'cleave',
      at: now,
      impactAt: enemy.pendingDamageAt,
    };
  }
}

function updateEnemy(enemy, state, dt, now, config) {
  if (enemy.state === 'dead') {
    if (!enemy.isBoss && now >= enemy.respawnAt) resetEnemy(enemy);
    return;
  }
  if (enemy.isBoss) {
    updateBoss(enemy, state, dt, now, config);
    return;
  }

  const enemyConfig = config.enemies;
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
    applyEnemyDamage(state, enemyConfig.attackDamage, now, enemy.id);
    enemy.nextAttackAt = now + enemyConfig.attackCooldown;
  }
}

export function damageEnemy(state, enemy, amount, now, config) {
  if (!enemy || enemy.state === 'dead') return false;
  enemy.hp = clamp(enemy.hp - amount, 0, enemy.maxHp);
  if (enemy.hp !== 0) return true;

  enemy.state = 'dead';
  enemy.nextAttackAt = 0;
  enemy.pendingDamageAt = 0;
  enemy.respawnAt = enemy.isBoss ? Number.POSITIVE_INFINITY : now + config.enemies.respawnSeconds;
  if (state.targetId === enemy.id) state.targetId = null;
  addXp(state, enemy.xpReward, config);
  recordKillForQuests(state, enemy, config);

  if (enemy.loot) grantItem(state, enemy.loot, config);
  if (enemy.isBoss) {
    state.bossVictory = true;
    if (!state.bossRewardGranted) {
      state.bossRewardGranted = true;
      state.feedback = { type: 'boss-victory', targetId: enemy.id, at: now };
    }
  }
  return true;
}

export function tryAction(state, actionId, now, config) {
  if (state.player.hp <= 0) return { ok: false, reason: 'defeated' };
  const action = config.actions[actionId];
  if (!action) return { ok: false, reason: 'unknown-action' };
  const target = getTarget(state) ?? selectBestTarget(state, config.targeting.range);
  if (!target) return { ok: false, reason: 'no-target' };
  if (distance2D(state.player.position, target.position) > action.range) return { ok: false, reason: 'out-of-range' };
  if ((state.cooldowns[actionId] ?? 0) > now) return { ok: false, reason: 'cooldown' };
  if (state.player.mana < action.manaCost) return { ok: false, reason: 'mana' };

  state.player.mana = clamp(state.player.mana - action.manaCost, 0, state.player.maxMana);
  state.cooldowns[actionId] = now + action.cooldown;
  const damage = action.damage + state.player.attackPower;
  damageEnemy(state, target, damage, now, config);
  state.feedback = { type: 'player-action', actionId, targetId: target.id, damage, at: now };
  return { ok: true, targetId: target.id, damage };
}

export function interact(state, config) {
  const npc = config.world.npc;
  if (distance2D(state.player.position, npc) > npc.interactionRange) return { ok: false, reason: 'nothing-nearby' };
  const quest = Object.values(config.quests).find((candidate) => candidate.giverNpcId === npc.id);
  if (!quest) return { ok: false, reason: 'no-quest' };
  const questState = state.questStates[quest.id];
  if (questState.status === 'available') {
    questState.status = 'active';
    state.feedback = { type: 'quest-accepted', questId: quest.id, at: state.time };
    return { ok: true, action: 'accepted', questId: quest.id };
  }
  if (questState.status === 'ready-to-turn-in' && !questState.rewarded) {
    questState.status = 'completed';
    questState.rewarded = true;
    addXp(state, quest.rewards.xp ?? 0, config);
    if (quest.rewards.itemId) grantItem(state, quest.rewards.itemId, config);
    state.feedback = { type: 'quest-completed', questId: quest.id, at: state.time };
    return { ok: true, action: 'completed', questId: quest.id };
  }
  return { ok: false, reason: questState.status };
}

function recoverPlayer(state, now, config) {
  if (!state.player.defeatedAt) return false;
  if (now < state.player.defeatedAt + config.player.defeatRecoverySeconds) return false;
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
  state.player.position.x = config.player.start.x;
  state.player.position.z = config.player.start.z;
  state.player.defeatedAt = 0;
  state.targetId = null;
  for (const enemy of state.enemies) {
    if (enemy.isBoss && !state.bossVictory) resetEnemy(enemy);
  }
  state.feedback = { type: 'player-recovered', at: now };
  return true;
}

function clampPlayerToWorld(state, config) {
  const radius = Math.max(1, config.world.radius - config.world.boundaryPadding);
  const { x, z } = state.player.position;
  const distance = Math.hypot(x, z);
  if (distance <= radius) return;
  state.player.position.x = (x / distance) * radius;
  state.player.position.z = (z / distance) * radius;
}

export function stepGame(state, dt, now, config) {
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  state.time = now;
  if (state.player.hp <= 0 || state.player.defeatedAt) {
    recoverPlayer(state, now, config);
    return;
  }

  const intent = normalizeMovement(state.player.moveIntent.x, state.player.moveIntent.z);
  state.player.position.x += intent.x * config.player.moveSpeed * safeDt;
  state.player.position.z += intent.z * config.player.moveSpeed * safeDt;
  clampPlayerToWorld(state, config);
  state.player.mana = clamp(state.player.mana + config.player.manaRegenPerSecond * safeDt, 0, state.player.maxMana);

  for (const enemy of state.enemies) updateEnemy(enemy, state, safeDt, now, config);
  const target = getTarget(state);
  if (!target || distance2D(state.player.position, target.position) > config.targeting.range) {
    selectBestTarget(state, config.targeting.range);
  }
}
