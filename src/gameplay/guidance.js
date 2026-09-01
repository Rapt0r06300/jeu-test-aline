export const GUIDANCE_VERSION = 1;
export const GUIDANCE_MODES = Object.freeze(['complete', 'minimal', 'off']);
const MAX_EVENTS = 96;

export const GUIDANCE_STEPS = Object.freeze([
  Object.freeze({
    id: 'movement',
    triggerConditions: Object.freeze([{ type: 'prologue-step', stepId: 'p0' }]),
    messageKey: 'Déplacez-vous vers Elyra avec WASD, les flèches ou le joystick.',
    anchorTarget: 'player',
    inputHintIds: Object.freeze(['movement']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'movementDistance', value: 2.4 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 18, maxRepeats: 2 }),
    cooldown: 18,
    priority: 'critical',
    accessibilityVariant: 'Déplacez-vous vers Elyra. Le repère de l’objectif indique sa direction.',
    analyticsEventId: 'ftue_movement',
    nextCandidates: Object.freeze(['camera', 'interaction']),
    modes: Object.freeze(['complete', 'minimal']),
  }),
  Object.freeze({
    id: 'camera',
    triggerConditions: Object.freeze([{ type: 'signal-at-least', signal: 'movementDistance', value: 1 }]),
    messageKey: 'La caméra suit automatiquement votre route et garde la zone d’action lisible.',
    anchorTarget: 'viewport',
    inputHintIds: Object.freeze([]),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'movementDistance', value: 4.5 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 0, maxRepeats: 0 }),
    cooldown: 0,
    priority: 'passive',
    accessibilityVariant: 'La caméra suit automatiquement. Aucun geste caméra n’est requis dans ce prologue.',
    analyticsEventId: 'ftue_camera_follow',
    nextCandidates: Object.freeze(['interaction']),
    modes: Object.freeze(['complete']),
  }),
  Object.freeze({
    id: 'interaction',
    triggerConditions: Object.freeze([{ type: 'prologue-step-any', stepIds: Object.freeze(['p0', 'p1', 'p3']) }]),
    messageKey: 'Approchez-vous du point indiqué puis utilisez Interagir (E).',
    anchorTarget: 'objective',
    inputHintIds: Object.freeze(['interact']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'interactionSuccess', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 20, maxRepeats: 2 }),
    cooldown: 20,
    priority: 'critical',
    accessibilityVariant: 'Approchez-vous du point d’objectif et utilisez le bouton Interagir ou la touche E.',
    analyticsEventId: 'ftue_interaction',
    nextCandidates: Object.freeze(['targeting']),
    modes: Object.freeze(['complete', 'minimal']),
  }),
  Object.freeze({
    id: 'targeting',
    triggerConditions: Object.freeze([{ type: 'prologue-step', stepId: 'p2' }]),
    messageKey: 'Entrez à portée : l’attaque sélectionnera automatiquement la cible la plus proche.',
    anchorTarget: 'enemy',
    inputHintIds: Object.freeze(['target-auto']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'targetAcquired', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 14, maxRepeats: 2 }),
    cooldown: 14,
    priority: 'critical',
    accessibilityVariant: 'Approchez-vous d’un ennemi. Une cible valide est signalée par son panneau de cible.',
    analyticsEventId: 'ftue_targeting',
    nextCandidates: Object.freeze(['basic-attack']),
    modes: Object.freeze(['complete', 'minimal']),
  }),
  Object.freeze({
    id: 'basic-attack',
    triggerConditions: Object.freeze([{ type: 'prologue-step', stepId: 'p2' }]),
    messageKey: 'Utilisez Attaque (Espace) sur une cible à portée.',
    anchorTarget: 'basic-action',
    inputHintIds: Object.freeze(['basic']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'basicAttackSuccess', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 12, maxRepeats: 2 }),
    cooldown: 12,
    priority: 'critical',
    accessibilityVariant: 'Utilisez le bouton Attaque ou la touche Espace lorsque la cible est à portée.',
    analyticsEventId: 'ftue_basic_attack',
    nextCandidates: Object.freeze(['first-skill']),
    modes: Object.freeze(['complete', 'minimal']),
  }),
  Object.freeze({
    id: 'first-skill',
    triggerConditions: Object.freeze([{ type: 'signal-at-least', signal: 'basicAttackSuccess', value: 1 }]),
    messageKey: 'Essayez votre première compétence (1) pour une frappe plus puissante.',
    anchorTarget: 'skill1-action',
    inputHintIds: Object.freeze(['skill1']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'skillSuccess', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 18, maxRepeats: 1 }),
    cooldown: 18,
    priority: 'critical',
    accessibilityVariant: 'Utilisez la première compétence avec le bouton 1. Les autres compétences restent disponibles selon votre rythme.',
    analyticsEventId: 'ftue_first_skill',
    nextCandidates: Object.freeze(['danger', 'loot']),
    modes: Object.freeze(['complete']),
  }),
  Object.freeze({
    id: 'danger',
    triggerConditions: Object.freeze([{ type: 'signal-at-least', signal: 'dangerSeen', value: 1 }]),
    messageKey: 'Un télégraphe ou un impact dangereux est actif : repositionnez-vous avant la prochaine frappe.',
    anchorTarget: 'danger',
    inputHintIds: Object.freeze(['movement']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'dangerHandled', value: 1 }]),
    dismissPolicy: 'on-success-or-timeout',
    repeatPolicy: Object.freeze({ afterSeconds: 24, maxRepeats: 1 }),
    cooldown: 24,
    priority: 'critical',
    accessibilityVariant: 'Le danger est indiqué par forme, texte et zone. Éloignez-vous ou repositionnez-vous.',
    analyticsEventId: 'ftue_danger',
    nextCandidates: Object.freeze(['loot', 'boss']),
    modes: Object.freeze(['complete', 'minimal']),
  }),
  Object.freeze({
    id: 'loot',
    triggerConditions: Object.freeze([{ type: 'inventory-nonempty' }]),
    messageKey: 'Un objet a été récupéré. Le sac affiche immédiatement ce qui est réellement possédé.',
    anchorTarget: 'inventory',
    inputHintIds: Object.freeze([]),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'lootSeen', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 0, maxRepeats: 0 }),
    cooldown: 0,
    priority: 'passive',
    accessibilityVariant: 'Un objet est présent dans le sac. Son nom et ses statistiques sont indiqués en texte.',
    analyticsEventId: 'ftue_loot',
    nextCandidates: Object.freeze(['equipment']),
    modes: Object.freeze(['complete']),
  }),
  Object.freeze({
    id: 'equipment',
    triggerConditions: Object.freeze([{ type: 'inventory-nonempty' }]),
    messageKey: 'Touchez un objet équipable dans le sac pour l’équiper.',
    anchorTarget: 'inventory',
    inputHintIds: Object.freeze(['equip']),
    successConditions: Object.freeze([{ type: 'signal-at-least', signal: 'equipmentSuccess', value: 1 }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 24, maxRepeats: 1 }),
    cooldown: 24,
    priority: 'passive',
    accessibilityVariant: 'Sélectionnez un objet équipable dans le sac. Le statut ÉQUIPÉ confirme l’action.',
    analyticsEventId: 'ftue_equipment',
    nextCandidates: Object.freeze(['boss']),
    modes: Object.freeze(['complete']),
  }),
  Object.freeze({
    id: 'boss',
    triggerConditions: Object.freeze([{ type: 'prologue-step', stepId: 'p5' }]),
    messageKey: 'Gardien : gardez une cible, surveillez les télégraphes et alternez attaque et compétences.',
    anchorTarget: 'boss',
    inputHintIds: Object.freeze(['basic', 'skill1', 'movement']),
    successConditions: Object.freeze([{ type: 'boss-victory' }]),
    dismissPolicy: 'on-success',
    repeatPolicy: Object.freeze({ afterSeconds: 30, maxRepeats: 1 }),
    cooldown: 30,
    priority: 'critical',
    accessibilityVariant: 'Gardien : cible, danger et actions restent indiqués par texte et forme. Repositionnez-vous pendant les télégraphes.',
    analyticsEventId: 'ftue_boss',
    nextCandidates: Object.freeze([]),
    modes: Object.freeze(['complete', 'minimal']),
  }),
]);

const STEP_BY_ID = Object.freeze(Object.fromEntries(GUIDANCE_STEPS.map((step) => [step.id, step])));

function blankSignals() {
  return {
    movementDistance: 0,
    interactionSuccess: 0,
    targetAcquired: 0,
    basicAttackSuccess: 0,
    skillSuccess: 0,
    dangerSeen: 0,
    dangerHandled: 0,
    lootSeen: 0,
    equipmentSuccess: 0,
  };
}

function createState(mode = 'complete') {
  return {
    version: GUIDANCE_VERSION,
    mode: GUIDANCE_MODES.includes(mode) ? mode : 'complete',
    masteredStepIds: [],
    activeId: null,
    shownAt: 0,
    repeatCounts: {},
    signals: blankSignals(),
    events: [],
  };
}

export function ensureGuidanceState(state) {
  const preferred = GUIDANCE_MODES.includes(state.settings?.guidance) ? state.settings.guidance : 'complete';
  if (!state.guidance || state.guidance.version !== GUIDANCE_VERSION) state.guidance = createState(preferred);
  if (!GUIDANCE_MODES.includes(state.guidance.mode)) state.guidance.mode = preferred;
  if (!Array.isArray(state.guidance.masteredStepIds)) state.guidance.masteredStepIds = [];
  if (!state.guidance.repeatCounts || typeof state.guidance.repeatCounts !== 'object') state.guidance.repeatCounts = {};
  state.guidance.signals = { ...blankSignals(), ...(state.guidance.signals ?? {}) };
  if (!Array.isArray(state.guidance.events)) state.guidance.events = [];
  if (!STEP_BY_ID[state.guidance.activeId]) state.guidance.activeId = null;
  return state.guidance;
}

export function restoreGuidanceState(state, saved) {
  const preferred = GUIDANCE_MODES.includes(state.settings?.guidance) ? state.settings.guidance : 'complete';
  const target = createState(preferred);
  if (saved && typeof saved === 'object' && saved.version === GUIDANCE_VERSION) {
    target.mode = GUIDANCE_MODES.includes(saved.mode) ? saved.mode : preferred;
    target.masteredStepIds = [...new Set((saved.masteredStepIds ?? []).filter((id) => STEP_BY_ID[id]))];
    target.activeId = STEP_BY_ID[saved.activeId] ? saved.activeId : null;
    target.shownAt = Number.isFinite(saved.shownAt) ? saved.shownAt : 0;
    target.repeatCounts = saved.repeatCounts && typeof saved.repeatCounts === 'object' ? { ...saved.repeatCounts } : {};
    target.signals = { ...blankSignals(), ...(saved.signals ?? {}) };
    target.events = Array.isArray(saved.events) ? saved.events.slice(-MAX_EVENTS).map(sanitizeEvent).filter(Boolean) : [];
  }
  state.guidance = target;
  return target;
}

function sanitizeEvent(event) {
  if (!event || typeof event !== 'object') return null;
  const allowed = ['event', 'stepId', 'at', 'elapsed', 'context'];
  const clean = {};
  for (const key of allowed) if (event[key] !== undefined) clean[key] = event[key];
  return clean;
}

function emit(state, event) {
  const guidance = ensureGuidanceState(state);
  const clean = sanitizeEvent(event);
  if (!clean) return;
  guidance.events.push(clean);
  if (guidance.events.length > MAX_EVENTS) guidance.events.splice(0, guidance.events.length - MAX_EVENTS);
}

export function setGuidanceMode(state, mode) {
  if (!GUIDANCE_MODES.includes(mode)) return { ok: false, reason: 'invalid-mode' };
  const guidance = ensureGuidanceState(state);
  guidance.mode = mode;
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  state.settings.guidance = mode;
  if (mode === 'off') guidance.activeId = null;
  return { ok: true, mode };
}

export function resetGuidance(state) {
  const currentMode = ensureGuidanceState(state).mode;
  const preservedSettings = state.settings;
  state.guidance = createState(currentMode);
  state.settings = preservedSettings;
  emit(state, { event: 'replay', stepId: null, at: Number(state.time) || 0 });
  return { ok: true };
}

export function recordGuidanceSignal(state, signal, value = 1, now = state.time ?? 0) {
  const guidance = ensureGuidanceState(state);
  if (!(signal in guidance.signals)) return { ok: false, reason: 'unknown-signal' };
  const amount = Number.isFinite(value) ? Math.max(0, value) : 0;
  guidance.signals[signal] = signal === 'movementDistance'
    ? guidance.signals[signal] + amount
    : Math.max(guidance.signals[signal], amount);
  emit(state, { event: 'signal', stepId: guidance.activeId, at: now, context: signal });
  return { ok: true, value: guidance.signals[signal] };
}

function conditionMet(condition, state) {
  const guidance = ensureGuidanceState(state);
  const prologueStep = state.prologue?.stepId ?? null;
  if (condition.type === 'prologue-step') return prologueStep === condition.stepId;
  if (condition.type === 'prologue-step-any') return condition.stepIds.includes(prologueStep);
  if (condition.type === 'signal-at-least') return Number(guidance.signals[condition.signal] ?? 0) >= condition.value;
  if (condition.type === 'inventory-nonempty') return (state.inventory?.length ?? 0) > 0;
  if (condition.type === 'boss-victory') return Boolean(state.bossVictory);
  return false;
}

function allConditions(conditions, state) {
  return conditions.every((condition) => conditionMet(condition, state));
}

function master(state, step, now, event = 'success') {
  const guidance = ensureGuidanceState(state);
  if (!guidance.masteredStepIds.includes(step.id)) guidance.masteredStepIds.push(step.id);
  const elapsed = guidance.activeId === step.id ? Math.max(0, now - guidance.shownAt) : 0;
  emit(state, { event, stepId: step.id, at: now, elapsed });
  if (guidance.activeId === step.id) guidance.activeId = null;
  return true;
}

export function syncGuidance(state, now = state.time ?? 0, { suppressed = false } = {}) {
  const guidance = ensureGuidanceState(state);
  let changed = false;

  for (const step of GUIDANCE_STEPS) {
    if (guidance.masteredStepIds.includes(step.id)) continue;
    if (!step.modes.includes(guidance.mode)) continue;
    if (allConditions(step.successConditions, state)) changed = master(state, step, now, guidance.activeId === step.id ? 'success' : 'auto-success') || changed;
  }

  if (guidance.mode === 'off' || suppressed || !state.narrative?.introComplete) {
    if (guidance.activeId) {
      guidance.activeId = null;
      changed = true;
    }
    return { changed, activeId: null };
  }

  const current = STEP_BY_ID[guidance.activeId];
  if (current && !guidance.masteredStepIds.includes(current.id)) {
    const repeat = current.repeatPolicy;
    if (repeat?.afterSeconds > 0 && now - guidance.shownAt >= repeat.afterSeconds) {
      const count = Number(guidance.repeatCounts[current.id] ?? 0);
      if (count < repeat.maxRepeats) {
        guidance.repeatCounts[current.id] = count + 1;
        guidance.shownAt = now;
        emit(state, { event: 'repeat', stepId: current.id, at: now });
        changed = true;
      }
    }
    return { changed, activeId: current.id };
  }

  const candidates = GUIDANCE_STEPS
    .filter((step) => step.modes.includes(guidance.mode))
    .filter((step) => !guidance.masteredStepIds.includes(step.id))
    .filter((step) => allConditions(step.triggerConditions, state))
    .sort((a, b) => (a.priority === b.priority ? GUIDANCE_STEPS.indexOf(a) - GUIDANCE_STEPS.indexOf(b) : a.priority === 'critical' ? -1 : 1));

  const next = candidates[0] ?? null;
  if (next) {
    guidance.activeId = next.id;
    guidance.shownAt = now;
    emit(state, { event: 'shown', stepId: next.id, at: now });
    changed = true;
  }
  return { changed, activeId: guidance.activeId };
}

export function getGuidanceView(state) {
  const guidance = ensureGuidanceState(state);
  if (guidance.mode === 'off' || !guidance.activeId) return { active: false, mode: guidance.mode };
  const step = STEP_BY_ID[guidance.activeId];
  if (!step) return { active: false, mode: guidance.mode };
  return {
    active: true,
    mode: guidance.mode,
    id: step.id,
    message: step.messageKey,
    accessibilityMessage: step.accessibilityVariant,
    inputHintIds: [...step.inputHintIds],
    priority: step.priority,
    anchorTarget: step.anchorTarget,
    repeatCount: Number(guidance.repeatCounts[step.id] ?? 0),
    analyticsEventId: step.analyticsEventId,
  };
}
