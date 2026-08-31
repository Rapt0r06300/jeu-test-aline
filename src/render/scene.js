import { SCENE_CONFIG } from '../data/scene-config.js';
import { createFallbackScene } from './fallback-scene.js';
import { createThreeScene } from './three-scene.js';

export async function createSceneSurface(root) {
  try {
    const THREE = await import(SCENE_CONFIG.threeUrl);
    return createThreeScene(THREE, root);
  } catch (error) {
    console.warn('[JTA] Three.js unavailable, enabling local fallback.', error);
    return createFallbackScene(root, 'mode hors-réseau');
  }
}
