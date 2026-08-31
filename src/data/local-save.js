import { applySaveSnapshot, decodeSave, encodeSave } from '../gameplay/save.js';

export const LOCAL_SAVE_KEY = 'jta:eldarvale:save';

export function loadLocalSave(state, config, storage = globalThis.localStorage) {
  if (!storage?.getItem) return { ok: false, reason: 'storage-unavailable' };
  let serialized;
  try {
    serialized = storage.getItem(LOCAL_SAVE_KEY);
  } catch {
    return { ok: false, reason: 'storage-read-failed' };
  }
  const decoded = decodeSave(serialized);
  if (!decoded.ok) return decoded;
  return applySaveSnapshot(state, decoded.snapshot, config);
}

export function saveLocalState(state, storage = globalThis.localStorage) {
  if (!storage?.setItem) return { ok: false, reason: 'storage-unavailable' };
  try {
    storage.setItem(LOCAL_SAVE_KEY, encodeSave(state));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-write-failed' };
  }
}
