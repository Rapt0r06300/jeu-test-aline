function getSequence(config) {
  return config.firstSession?.steps ?? [];
}

function getVersion(config) {
  return config.firstSession?.version ?? 1;
}

function findStepIndex(config, stepId) {
  return getSequence(config).findIndex((step) => step.id === stepId);
}

function isKnownStep(config, stepId) {
  return findStepIndex(config, stepId) >= 0;
}

export function createFirstSessionState(config) {
  const firstStep = getSequence(config)[0] ?? null;
  return {
    version: getVersion(config),
    stepId: firstStep?.id ?? null,
    completedStepIds: [],
    replayRequestedStepId: null,
    replayNonce: 0,
  };
}

export function ensureFirstSessionState(state, config) {
  const expectedVersion = getVersion(config);
  const current = state.firstSession;
  if (!current || current.version !== expectedVersion || !isKnownStep(config, current.stepId)) {
    state.firstSession = createFirstSessionState(config);
    return state.firstSession;
  }

  const validCompleted = new Set(
    Array.isArray(current.completedStepIds)
      ? current.completedStepIds.filter((stepId) => isKnownStep(config, stepId))
      : [],
  );
  current.completedStepIds = getSequence(config)
    .map((step) => step.id)
    .filter((stepId) => validCompleted.has(stepId));
  current.replayRequestedStepId = isKnownStep(config, current.replayRequestedStepId)
    ? current.replayRequestedStepId
    : null;
  current.replayNonce = Math.max(0, Math.floor(Number(current.replayNonce) || 0));
  return current;
}

export function getFirstSessionStep(state, config) {
  const director = ensureFirstSessionState(state, config);
  return getSequence(config).find((step) => step.id === director.stepId) ?? null;
}

function questStatus(state, questId) {
  return state.questStates?.[questId]?.status ?? 'available';
}

function conditionMet(step, state) {
  const condition = step.condition ?? { type: 'manual' };
  switch (condition.type) {
    case 'always':
      return true;
    case 'quest-status':
      return (condition.statuses ?? []).includes(questStatus(state, condition.questId));
    case 'quest-progress': {
      const questState = state.questStates?.[condition.questId];
      if (!questState) return false;
      if (['ready-to-turn-in', 'completed'].includes(questState.status)) return true;
      return (questState.progress ?? 0) >= (condition.required ?? 1);
    }
    case 'boss-victory':
      return Boolean(state.bossVictory);
    default:
      return false;
  }
}

function completeCurrentStep(state, config) {
  const director = ensureFirstSessionState(state, config);
  const steps = getSequence(config);
  const index = findStepIndex(config, director.stepId);
  if (index < 0) return false;
  const current = steps[index];
  if (!director.completedStepIds.includes(current.id)) director.completedStepIds.push(current.id);
  const next = steps[index + 1] ?? current;
  if (next.id === current.id) return false;
  director.stepId = next.id;
  director.replayRequestedStepId = null;
  return true;
}

export function syncFirstSession(state, config) {
  ensureFirstSessionState(state, config);
  let changed = false;
  const safetyLimit = getSequence(config).length + 1;

  for (let i = 0; i < safetyLimit; i += 1) {
    const step = getFirstSessionStep(state, config);
    if (!step || step.terminal || step.completion !== 'auto' || !conditionMet(step, state)) break;
    if (!completeCurrentStep(state, config)) break;
    changed = true;
  }

  return { changed, step: getFirstSessionStep(state, config) };
}

export function advanceFirstSession(state, config) {
  const step = getFirstSessionStep(state, config);
  if (!step || step.terminal || step.completion !== 'manual') return { ok: false, reason: 'not-manual' };
  const changed = completeCurrentStep(state, config);
  if (!changed) return { ok: false, reason: 'no-next-step' };
  syncFirstSession(state, config);
  state.feedback = { type: 'first-session-advanced', stepId: step.id, at: state.time ?? 0 };
  return { ok: true, step: getFirstSessionStep(state, config) };
}

export function skipFirstSessionStep(state, config) {
  const step = getFirstSessionStep(state, config);
  if (!step?.skippable || step.terminal) return { ok: false, reason: 'not-skippable' };
  const changed = completeCurrentStep(state, config);
  if (!changed) return { ok: false, reason: 'no-next-step' };
  syncFirstSession(state, config);
  state.feedback = { type: 'first-session-skipped', stepId: step.id, at: state.time ?? 0 };
  return { ok: true, step: getFirstSessionStep(state, config) };
}

export function requestFirstSessionReplay(state, config, requestedStepId = null) {
  const director = ensureFirstSessionState(state, config);
  const targetId = requestedStepId ?? director.stepId;
  const step = getSequence(config).find((candidate) => candidate.id === targetId);
  if (!step?.replayable) return { ok: false, reason: 'not-replayable' };
  director.replayRequestedStepId = step.id;
  director.replayNonce += 1;
  state.feedback = { type: 'first-session-replay', stepId: step.id, at: state.time ?? 0 };
  return { ok: true, step, replayNonce: director.replayNonce };
}

export function consumeFirstSessionReplay(state, config) {
  const director = ensureFirstSessionState(state, config);
  if (!director.replayRequestedStepId) return null;
  const step = getSequence(config).find((candidate) => candidate.id === director.replayRequestedStepId) ?? null;
  director.replayRequestedStepId = null;
  return step;
}

export function restoreFirstSessionState(state, savedDirector, config) {
  const fallback = createFirstSessionState(config);
  if (!savedDirector || typeof savedDirector !== 'object') {
    state.firstSession = fallback;
    return syncFirstSession(state, config);
  }

  const validStepId = isKnownStep(config, savedDirector.stepId) ? savedDirector.stepId : fallback.stepId;
  const completed = new Set(Array.isArray(savedDirector.completedStepIds) ? savedDirector.completedStepIds : []);
  const replayRequestedStepId = isKnownStep(config, savedDirector.replayRequestedStepId)
    ? savedDirector.replayRequestedStepId
    : null;

  state.firstSession = {
    version: getVersion(config),
    stepId: validStepId,
    completedStepIds: getSequence(config).map((step) => step.id).filter((stepId) => completed.has(stepId)),
    replayRequestedStepId,
    replayNonce: Math.max(0, Math.floor(Number(savedDirector.replayNonce) || 0)),
  };
  return syncFirstSession(state, config);
}

export function getFirstSessionView(state, config) {
  const director = ensureFirstSessionState(state, config);
  const steps = getSequence(config);
  const step = getFirstSessionStep(state, config);
  const index = step ? findStepIndex(config, step.id) : -1;
  return {
    id: step?.id ?? null,
    title: step?.title ?? 'Première session',
    objective: step?.objective ?? 'Progression guidée terminée.',
    kind: step?.kind ?? 'gameplay',
    index: Math.max(0, index),
    total: steps.length,
    progressLabel: index >= 0 ? `${Math.min(index + 1, steps.length)}/${steps.length}` : `0/${steps.length}`,
    manual: step?.completion === 'manual' && !step?.terminal,
    skippable: Boolean(step?.skippable && !step?.terminal),
    replayable: Boolean(step?.replayable),
    terminal: Boolean(step?.terminal),
    replayRequested: director.replayRequestedStepId === step?.id,
  };
}
