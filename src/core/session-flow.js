export const SESSION_PHASES = Object.freeze({
  BOOT: 'boot',
  TITLE: 'title',
  SETTINGS: 'settings',
  CONFIRM_NEW_GAME: 'confirm-new-game',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
});

export const LOADING_PHASES = Object.freeze([
  { id: 'config', label: 'Préparation du monde' },
  { id: 'save', label: 'Lecture de la progression' },
  { id: 'renderer', label: 'Initialisation du rendu' },
  { id: 'scene', label: 'Assemblage de la scène' },
  { id: 'ready', label: 'Ouverture du passage' },
]);

function normalizeSaveInspection(inspection) {
  if (inspection?.status === 'valid') return { status: 'valid', reason: null };
  if (inspection?.status === 'corrupt') return { status: 'corrupt', reason: inspection.reason ?? 'invalid-save' };
  return { status: 'empty', reason: null };
}

export function createSessionFlow(saveInspection = { status: 'empty' }) {
  const save = normalizeSaveInspection(saveInspection);
  return {
    phase: SESSION_PHASES.TITLE,
    save,
    intent: null,
    loadingPhaseId: null,
    errorMessage: '',
  };
}

export function getTitleActions(flow) {
  const validSave = flow.save.status === 'valid';
  return {
    primary: validSave
      ? { id: 'continue', label: 'Continuer' }
      : { id: 'new-game', label: 'Jouer' },
    secondary: validSave ? { id: 'new-game', label: 'Nouvelle partie' } : null,
    settings: { id: 'settings', label: 'Paramètres' },
    recoveryRequired: flow.save.status === 'corrupt',
  };
}

export function openSettings(flow) {
  if (flow.phase !== SESSION_PHASES.TITLE) return false;
  flow.phase = SESSION_PHASES.SETTINGS;
  return true;
}

export function closeSettings(flow) {
  if (flow.phase !== SESSION_PHASES.SETTINGS) return false;
  flow.phase = SESSION_PHASES.TITLE;
  return true;
}

export function requestSessionIntent(flow, intent) {
  if (flow.phase !== SESSION_PHASES.TITLE) return { ok: false, reason: 'not-on-title' };
  if (!['continue', 'new-game'].includes(intent)) return { ok: false, reason: 'invalid-intent' };
  if (intent === 'continue' && flow.save.status !== 'valid') return { ok: false, reason: 'save-unavailable' };

  flow.intent = intent;
  if (intent === 'new-game' && flow.save.status === 'valid') {
    flow.phase = SESSION_PHASES.CONFIRM_NEW_GAME;
    return { ok: true, confirmationRequired: true };
  }
  if (intent === 'new-game' && flow.save.status === 'corrupt') {
    flow.phase = SESSION_PHASES.CONFIRM_NEW_GAME;
    return { ok: true, confirmationRequired: true, recovery: true };
  }

  flow.phase = SESSION_PHASES.LOADING;
  return { ok: true, confirmationRequired: false };
}

export function cancelNewGame(flow) {
  if (flow.phase !== SESSION_PHASES.CONFIRM_NEW_GAME) return false;
  flow.phase = SESSION_PHASES.TITLE;
  flow.intent = null;
  return true;
}

export function confirmNewGame(flow) {
  if (flow.phase !== SESSION_PHASES.CONFIRM_NEW_GAME || flow.intent !== 'new-game') {
    return { ok: false, reason: 'confirmation-not-pending' };
  }
  flow.phase = SESSION_PHASES.LOADING;
  return { ok: true };
}

export function setLoadingPhase(flow, phaseId) {
  if (flow.phase !== SESSION_PHASES.LOADING) return false;
  if (!LOADING_PHASES.some((phase) => phase.id === phaseId)) return false;
  flow.loadingPhaseId = phaseId;
  return true;
}

export function completeSessionFlow(flow) {
  if (flow.phase !== SESSION_PHASES.LOADING) return false;
  flow.loadingPhaseId = 'ready';
  flow.phase = SESSION_PHASES.READY;
  return true;
}

export function failSessionFlow(flow, message = 'Le passage ne peut pas être ouvert pour le moment.') {
  flow.phase = SESSION_PHASES.ERROR;
  flow.errorMessage = message;
  return true;
}
