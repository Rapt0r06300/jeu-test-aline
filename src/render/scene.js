import { SCENE_CONFIG } from '../data/scene-config.js';
import { createFallbackScene } from './fallback-scene.js';
import { createThreeScene } from './three-scene.js';

export const DEFAULT_THREE_BOOT_TIMEOUT_MS = 4000;

async function importWithTimeout(url, timeoutMs) {
  let timeoutId = 0;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Three.js boot timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([import(url), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createSceneSurface(root, options = {}) {
  const timeoutMs = Number.isFinite(options.threeBootTimeoutMs)
    ? Math.max(250, options.threeBootTimeoutMs)
    : DEFAULT_THREE_BOOT_TIMEOUT_MS;

  try {
    const THREE = await importWithTimeout(SCENE_CONFIG.threeUrl, timeoutMs);
    return createThreeScene(THREE, root, options);
  } catch (error) {
    console.warn('[JTA] Three.js unavailable or too slow, enabling local fallback.', error);
    return createFallbackScene(root, 'mode hors-réseau');
  }
}
