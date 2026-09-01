import { applySaveSnapshot, decodeSave, encodeSave } from '../gameplay/save.js';

export const LOCAL_SAVE_KEY = 'jta:eldarvale:save';

function readSerializedSave(storage = globalThis.localStorage) {
  if (!storage?.getItem) return { ok: false, reason: 'storage-unavailable', serialized: null };
  try {
    return { ok: true, serialized: storage.getItem(LOCAL_SAVE_KEY) };
  } catch {
    return { ok: false, reason: 'storage-read-failed', serialized: null };
  }
}

export function inspectLocalSave(storage = globalThis.localStorage) {
  const read = readSerializedSave(storage);
  if (!read.ok) return { status: 'corrupt', reason: read.reason };
  if (typeof read.serialized !== 'string' || !read.serialized.trim()) return { status: 'empty', reason: null };
  const decoded = decodeSave(read.serialized);
  if (!decoded.ok) return { status: 'corrupt', reason: decoded.reason };
  return { status: 'valid', reason: null, snapshot: decoded.snapshot };
}

export function hasValidSave(storage = globalThis.localStorage) {
  return inspectLocalSave(storage).status === 'valid';
}

export function loadLocalSave(state, config, storage = globalThis.localStorage) {
  const read = readSerializedSave(storage);
  if (!read.ok) return { ok: false, reason: read.reason };
  const decoded = decodeSave(read.serialized);
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

export function clearLocalSave(storage = globalThis.localStorage) {
  if (!storage?.removeItem) return { ok: false, reason: 'storage-unavailable' };
  try {
    storage.removeItem(LOCAL_SAVE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-write-failed' };
  }
}
