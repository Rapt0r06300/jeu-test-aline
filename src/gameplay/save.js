import { restoreFirstSessionState } from './first-session.js';
import { recomputePlayerStats } from './state.js';

export const SAVE_VERSION = 1;

function cloneRecord(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createSaveSnapshot(state) {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    player: {
      xp: state.player.xp,
      level: state.player.level,
      position: { x: state.player.position.x, z: state.player.position.z },
    },
    inventory: cloneRecord(state.inventory),
    equipment: cloneRecord(state.equipment),
    questStates: cloneRecord(state.questStates),
    bossVictory: Boolean(state.bossVictory),
    bossRewardGranted: Boolean(state.bossRewardGranted),
    nextItemSerial: state.nextItemSerial,
    settings: cloneRecord(state.settings ?? { quality: 'auto' }),
    firstSession: state.firstSession ? cloneRecord(state.firstSession) : null,
  };
}

export function encodeSave(state) {
  return JSON.stringify(createSaveSnapshot(state));
}

export function decodeSave(serialized) {
  if (typeof serialized !== 'string' || !serialized.trim()) return { ok: false, reason: 'empty' };
  let snapshot;
  try {
    snapshot = JSON.parse(serialized);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  if (!snapshot || typeof snapshot !== 'object') return { ok: false, reason: 'invalid-shape' };
  if (snapshot.version !== SAVE_VERSION) return { ok: false, reason: 'unsupported-version' };
  if (!snapshot.player || !Array.isArray(snapshot.inventory) || typeof snapshot.equipment !== 'object') {
    return { ok: false, reason: 'invalid-shape' };
  }
  return { ok: true, snapshot };
}

function safePosition(position, config) {
  const fallback = config.player.start;
  const x = Number.isFinite(position?.x) ? position.x : fallback.x;
  const z = Number.isFinite(position?.z) ? position.z : fallback.z;
  const radius = Math.max(1, config.world.radius - config.world.boundaryPadding);
  const distance = Math.hypot(x, z);
  if (distance <= radius) return { x, z };
  return { x: (x / distance) * radius, z: (z / distance) * radius };
}

export function applySaveSnapshot(state, snapshot, config) {
  if (!snapshot || snapshot.version !== SAVE_VERSION) return { ok: false, reason: 'unsupported-version' };
  state.player.xp = Math.max(0, Number(snapshot.player?.xp) || 0);
  state.player.level = Math.max(1, Math.floor(Number(snapshot.player?.level) || 1));
  state.player.position = safePosition(snapshot.player?.position, config);

  const validInventory = [];
  const seen = new Set();
  for (const instance of snapshot.inventory ?? []) {
    if (!instance || typeof instance.instanceId !== 'string' || typeof instance.itemId !== 'string') continue;
    if (!config.items[instance.itemId] || seen.has(instance.instanceId)) continue;
    seen.add(instance.instanceId);
    if (validInventory.length >= config.player.inventoryCapacity) break;
    validInventory.push({ instanceId: instance.instanceId, itemId: instance.itemId });
  }
  state.inventory = validInventory;

  for (const slot of Object.keys(state.equipment)) {
    const candidate = snapshot.equipment?.[slot];
    const item = validInventory.find((instance) => instance.instanceId === candidate);
    state.equipment[slot] = item && config.items[item.itemId]?.slot === slot ? candidate : null;
  }

  for (const [questId, questState] of Object.entries(state.questStates)) {
    const saved = snapshot.questStates?.[questId];
    if (!saved) continue;
    const validStatuses = new Set(['available', 'active', 'ready-to-turn-in', 'completed']);
    questState.status = validStatuses.has(saved.status) ? saved.status : 'available';
    const required = config.quests[questId]?.objective?.required ?? 0;
    questState.progress = Math.max(0, Math.min(required, Math.floor(Number(saved.progress) || 0)));
    questState.rewarded = Boolean(saved.rewarded && questState.status === 'completed');
  }

  state.bossVictory = Boolean(snapshot.bossVictory);
  state.bossRewardGranted = Boolean(snapshot.bossRewardGranted);
  state.nextItemSerial = Math.max(1, Math.floor(Number(snapshot.nextItemSerial) || 1));
  state.settings = { quality: ['auto', 'low', 'medium', 'high'].includes(snapshot.settings?.quality) ? snapshot.settings.quality : 'auto' };
  restoreFirstSessionState(state, snapshot.firstSession, config);
  recomputePlayerStats(state, config);
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
  return { ok: true };
}
