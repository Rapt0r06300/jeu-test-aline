export const QUALITY_PROFILES = Object.freeze({
  low: Object.freeze({ id: 'low', maxPixelRatio: 1, shadows: false, density: 0.5, targetFps: 30 }),
  medium: Object.freeze({ id: 'medium', maxPixelRatio: 1.5, shadows: true, density: 0.75, targetFps: 45 }),
  high: Object.freeze({ id: 'high', maxPixelRatio: 1.75, shadows: true, density: 1, targetFps: 60 }),
});

export const PERFORMANCE_BUDGETS = Object.freeze({
  maxEnemyActors: 12,
  maxProceduralObjectsHigh: 100,
  maxPixelRatio: 1.75,
  maxFrameDeltaSeconds: 0.05,
});

export function chooseQualityProfile({ memoryGB = 4, cores = 4, pixelRatio = 1, mobile = false } = {}) {
  const memory = Number.isFinite(memoryGB) ? memoryGB : 4;
  const cpu = Number.isFinite(cores) ? cores : 4;
  const dpr = Number.isFinite(pixelRatio) ? pixelRatio : 1;
  if (memory <= 3 || cpu <= 3 || (mobile && dpr >= 3)) return 'low';
  if (memory >= 8 && cpu >= 8 && (!mobile || dpr <= 2.5)) return 'high';
  return 'medium';
}

export function detectBrowserQuality() {
  const nav = globalThis.navigator;
  const memoryGB = nav?.deviceMemory ?? 4;
  const cores = nav?.hardwareConcurrency ?? 4;
  const pixelRatio = globalThis.devicePixelRatio ?? 1;
  const mobile = Boolean(nav?.userAgentData?.mobile) || /Android|iPhone|iPad|Mobile/i.test(nav?.userAgent ?? '');
  return chooseQualityProfile({ memoryGB, cores, pixelRatio, mobile });
}
