const PROLOGUE_VERSION = 1;
const INTERACTION_RANGE = 3.8;

export const PROLOGUE_STEPS = Object.freeze([
  Object.freeze({
    id: 'p0',
    title: 'L’appel d’Elyra',
    objectiveText: 'Rejoignez Elyra au sanctuaire et parlez-lui.',
    startConditions: Object.freeze([{ type: 'intro-complete' }]),
    successConditions: Object.freeze([{ type: 'quest-started', questId: 'mist-hunt' }]),
    retryPolicy: 'resume-current-objective',
    checkpoint: 'intro',
    rewards: Object.freeze([]),
    nextStepId: 'p1',
    guidanceProfileId: 'reach-elyra',
    narrativeBeatId: 'elyra-request',
    anchor: Object.freeze({ type: 'npc', id: 'elyra' }),
    narrative: 'Elyra voit la Brume Creuse gagner le chemin. Votre présence fait vibrer les veines minérales près de la balise.',
  }),
  Object.freeze({
    id: 'p1',
    title: 'Rallumer la voie',
    objectiveText: 'Rejoignez la balise auxiliaire sur le sentier et réactivez-la.',
    startConditions: Object.freeze([{ type: 'step-complete', stepId: 'p0' }]),
    successConditions: Object.freeze([{ type: 'world-flag', flag: 'auxiliaryBeaconLit' }]),
    retryPolicy: 'restore-world-impact',
    checkpoint: 'p1',
    rewards: Object.freeze([]),
    nextStepId: 'p2',
    guidanceProfileId: 'beacon-interaction',
    narrativeBeatId: 'first-world-change',
    anchor: Object.freeze({ type: 'world-point', id: 'path' }),
    narrative: 'La lumière revient dans les veines du sentier et repousse la brume autour du passage.',
  }),
  Object.freeze({
    id: 'p2',
    title: 'Les crocs dans la brume',
    objectiveText: 'Éliminez les deux Wargs qui bloquent la clairière.',
    startConditions: Object.freeze([{ type: 'step-complete', stepId: 'p1' }]),
    successConditions: Object.freeze([{ type: 'quest-progress', questId: 'mist-hunt', required: 2 }]),
    retryPolicy: 'respawn-combatants-no-reward-replay',
    checkpoint: 'p2',
    rewards: Object.freeze([{ source: 'existing-enemy-loot', idempotent: true }]),
    nextStepId: 'p3',
    guidanceProfileId: 'first-combat',
    narrativeBeatId: 'path-cleared',
    anchor: Object.freeze({ type: 'world-point', id: 'clearing' }),
    narrative: 'Le passage respire à nouveau. Sous la pierre, une impulsion répond à votre présence.',
  }),
  Object.freeze({
    id: 'p3',
    title: 'La résonance',
    objectiveText: 'Inspectez le fragment lumineux dans la clairière.',
    startConditions: Object.freeze([{ type: 'step-complete', stepId: 'p2' }]),
    successConditions: Object.freeze([{ type: 'world-flag', flag: 'fragmentRevealed' }]),
    retryPolicy: 'restore-fragment-interaction',
    checkpoint: 'p3',
    rewards: Object.freeze([]),
    nextStepId: 'p4',
    guidanceProfileId: 'fragment-discovery',
    narrativeBeatId: 'personal-motive',
    anchor: Object.freeze({ type: 'world-point', id: 'clearing' }),
    narrative: 'Le fragment pulse au même rythme que les veines du sol. Elyra n’y voit pas une prophétie, mais un lien qu’il faut comprendre.',
  }),
  Object.freeze({
    id: 'p4',
    title: 'La seconde extinction',
    objectiveText: 'Neutralisez la Sentinelle runique qui coupe la seconde balise.',
    startConditions: Object.freeze([{ type: 'step-complete', stepId: 'p3' }]),
    successConditions: Object.freeze([{ type: 'enemy-defeated', enemyId: 'sentinel-1' }]),
    retryPolicy: 'respawn-elite-no-reward-replay',
    checkpoint: 'pre-boss',
    rewards: Object.freeze([{ source: 'existing-enemy-loot', itemId: 'rune-blade', idempotent: true }]),
    nextStepId: 'p5',
    guidanceProfileId: 'elite-and-equipment',
    narrativeBeatId: 'mist-pressure-rises',
    anchor: Object.freeze({ type: 'enemy', id: 'sentinel-1' }),
    narrative: 'La seconde balise s’éteint. La Brume Creuse se contracte vers le cercle du Gardien.',
  }),
  Object.freeze({
    id: 'p5',
    title: 'Le Gardien des Veines',
    objectiveText: 'Atteignez le cercle du Gardien et remportez le combat.',
    startConditions: Object.freeze([{ type: 'step-complete', stepId: 'p4' }]),
    successConditions: Object.freeze([{ type: 'boss-victory' }]),
    retryPolicy: 'resume-pre-boss-checkpoint',
    checkpoint: 'pre-boss',
    rewards: Object.freeze([{ source: 'existing-boss-loot', idempotent: true }]),
    nextStepId: 'complete',
    guidanceProfileId: 'boss',
    narrativeBeatId: 'temporary-resolution',
    anchor: Object.freeze({ type: 'world-point', id: 'bossArena' }),
    narrative: 'Le sanctuaire peut encore être sauvé. Le Gardien concentre l’anomalie au-delà du dernier passage.',
  }),
]);

const STEP_BY_ID = Object.freeze(Object.fromEntries(PROLOGUE_STEPS.map((step) => [step.id, step])));

function cloneWorldImpact(source = {}) {
  return {
    auxiliaryBeaconLit: Boolean(source.auxiliaryBeaconLit),
    mistPressure: ['high', 'receding', 'focused', 'stable'].includes(source.mistPressure) ? source.mistPressure : 'high',
    firstCombatWon: Boolean(source.firstCombatWon),
    fragmentRevealed: Boolean(source.fragmentRevealed),
    secondBeaconOffline: Boolean(source.secondBeaconOffline),
    eliteDefeated: Boolean(source.eliteDefeated),
    bossRouteOpen: Boolean(source.bossRouteOpen),
    sanctuaryStabilized: Boolean(source.sanctuaryStabilized),
    distantPulse: Boolean(source.distantPulse),
  };
}

function createState() {
  return {
    version: PROLOGUE_VERSION,
    stepId: 'p0',
    completedStepIds: [],
    checkpointId: 'intro',
    rewardClaims: {},
    worldImpact: cloneWorldImpact(),
    nextObjectiveId: 'reach_elyra',
    completed: false,
  };
}

export function ensurePrologueState(state) {
  if (!state.prologue || state.prologue.version !== PROLOGUE_VERSION) state.prologue = createState();
  if (!STEP_BY_ID[state.prologue.stepId] && state.prologue.stepId !== 'complete') state.prologue.stepId = 'p0';
  if (!Array.isArray(state.prologue.completedStepIds)) state.prologue.completedStepIds = [];
  if (!state.prologue.rewardClaims || typeof state.prologue.rewardClaims !== 'object') state.prologue.rewardClaims = {};
  state.prologue.worldImpact = cloneWorldImpact(state.prologue.worldImpact);
  return state.prologue;
}

export function restorePrologueState(state, saved) {
  const target = createState();
  if (saved && typeof saved === 'object' && saved.version === PROLOGUE_VERSION) {
    const completed = [...new Set((saved.completedStepIds ?? []).filter((id) => STEP_BY_ID[id]))];
    target.completedStepIds = completed;
    target.stepId = saved.stepId === 'complete' || STEP_BY_ID[saved.stepId] ? saved.stepId : 'p0';
    target.checkpointId = typeof saved.checkpointId === 'string' ? saved.checkpointId : 'intro';
    target.rewardClaims = saved.rewardClaims && typeof saved.rewardClaims === 'object' ? { ...saved.rewardClaims } : {};
    target.worldImpact = cloneWorldImpact(saved.worldImpact);
    target.nextObjectiveId = typeof saved.nextObjectiveId === 'string' ? saved.nextObjectiveId : 'reach_elyra';
    target.completed = Boolean(saved.completed || target.stepId === 'complete');
  }
  state.prologue = target;
  return target;
}

function setNarrativeObjective(state, objectiveId) {
  if (!state.narrative || typeof state.narrative !== 'object') state.narrative = {};
  state.narrative.objectiveId = objectiveId;
}

function claimSource(state, claimId) {
  const prologue = ensurePrologueState(state);
  if (prologue.rewardClaims[claimId]) return false;
  prologue.rewardClaims[claimId] = true;
  return true;
}

function advance(state, completedId) {
  const prologue = ensurePrologueState(state);
  const step = STEP_BY_ID[completedId];
  if (!step || prologue.completedStepIds.includes(completedId)) return { changed: false, advanced: false };
  prologue.completedStepIds.push(completedId);

  if (completedId === 'p1') prologue.checkpointId = 'p1';
  if (completedId === 'p2') prologue.checkpointId = 'p2';
  if (completedId === 'p3') prologue.checkpointId = 'p3';
  if (completedId === 'p4') prologue.checkpointId = 'pre-boss';

  if (step.nextStepId === 'complete') {
    prologue.stepId = 'complete';
    prologue.completed = true;
    prologue.nextObjectiveId = 'follow_resonance';
    prologue.worldImpact.sanctuaryStabilized = true;
    prologue.worldImpact.mistPressure = 'stable';
    prologue.worldImpact.distantPulse = true;
    setNarrativeObjective(state, 'follow_resonance');
  } else {
    prologue.stepId = step.nextStepId;
    const objectives = {
      p1: 'reactivate_auxiliary_beacon',
      p2: 'clear_wargs',
      p3: 'inspect_fragment',
      p4: 'defeat_rune_sentinel',
      p5: 'defeat_warden',
    };
    prologue.nextObjectiveId = objectives[step.nextStepId] ?? prologue.nextObjectiveId;
    setNarrativeObjective(state, prologue.nextObjectiveId);
    if (step.nextStepId === 'p4') {
      prologue.worldImpact.secondBeaconOffline = true;
      prologue.worldImpact.mistPressure = 'focused';
    }
    if (step.nextStepId === 'p5') prologue.worldImpact.bossRouteOpen = true;
  }

  return { changed: true, advanced: true, completedId, stepId: prologue.stepId };
}

function distance(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
}

export function tryPrologueInteraction(state, gameplayConfig) {
  const prologue = ensurePrologueState(state);
  if (!state.narrative?.introComplete || prologue.completed) return { ok: false, reason: 'inactive' };

  if (prologue.stepId === 'p1') {
    const point = gameplayConfig.world.points.path;
    if (distance(state.player.position, point) > INTERACTION_RANGE) return { ok: false, reason: 'too-far', target: 'auxiliary-beacon' };
    prologue.worldImpact.auxiliaryBeaconLit = true;
    prologue.worldImpact.mistPressure = 'receding';
    claimSource(state, 'world:p1:beacon');
    const result = advance(state, 'p1');
    state.feedback = { type: 'prologue-world-impact', eventId: 'auxiliary-beacon-lit', at: state.time };
    return { ok: true, action: 'beacon-lit', ...result };
  }

  if (prologue.stepId === 'p3') {
    const point = gameplayConfig.world.points.clearing;
    if (distance(state.player.position, point) > INTERACTION_RANGE) return { ok: false, reason: 'too-far', target: 'fragment' };
    prologue.worldImpact.fragmentRevealed = true;
    if (!state.narrative || typeof state.narrative !== 'object') state.narrative = {};
    state.narrative.artifactClaimed = true;
    claimSource(state, 'world:p3:fragment');
    const result = advance(state, 'p3');
    state.feedback = { type: 'prologue-world-impact', eventId: 'fragment-resonance', at: state.time };
    return { ok: true, action: 'fragment-revealed', ...result };
  }

  return { ok: false, reason: 'base-interaction' };
}

export function syncPrologue(state, gameplayConfig) {
  const prologue = ensurePrologueState(state);
  if (!state.narrative?.introComplete || prologue.completed) return { changed: false, advanced: false };
  const quest = state.questStates?.['mist-hunt'];

  if (prologue.stepId === 'p0' && quest && quest.status !== 'available') return advance(state, 'p0');

  if (prologue.stepId === 'p2' && quest && Number(quest.progress) >= 2) {
    prologue.worldImpact.firstCombatWon = true;
    claimSource(state, 'combat:p2:wargs');
    return advance(state, 'p2');
  }

  if (prologue.stepId === 'p4') {
    const elite = state.enemies?.find((enemy) => enemy.id === 'sentinel-1');
    if (elite?.state === 'dead' || prologue.worldImpact.eliteDefeated) {
      prologue.worldImpact.eliteDefeated = true;
      claimSource(state, 'combat:p4:sentinel-1');
      return advance(state, 'p4');
    }
  }

  if (prologue.stepId === 'p5' && state.bossVictory) {
    claimSource(state, 'combat:p5:warden');
    return advance(state, 'p5');
  }

  return { changed: false, advanced: false };
}

function resolveAnchor(step, gameplayConfig, state) {
  if (!step?.anchor) return null;
  if (step.anchor.type === 'npc') {
    const npc = gameplayConfig.world.npc;
    return { id: npc.id, label: npc.name, x: npc.x, z: npc.z };
  }
  if (step.anchor.type === 'world-point') {
    const point = gameplayConfig.world.points[step.anchor.id];
    return point ? { id: point.id, label: point.label, x: point.x, z: point.z } : null;
  }
  if (step.anchor.type === 'enemy') {
    const enemy = state.enemies?.find((candidate) => candidate.id === step.anchor.id);
    return enemy ? { id: enemy.id, label: enemy.name, x: enemy.position.x, z: enemy.position.z } : null;
  }
  return null;
}

export function getPrologueView(state, gameplayConfig) {
  const prologue = ensurePrologueState(state);
  if (!state.narrative?.introComplete) return { active: false, completed: false };
  if (prologue.completed || prologue.stepId === 'complete') {
    return {
      active: true,
      completed: true,
      id: 'complete',
      title: 'Le sanctuaire respire à nouveau',
      objective: 'Suivez la résonance au-delà du col.',
      narrative: 'La Brume Creuse recule autour du sanctuaire. Une impulsion lointaine répond pourtant depuis l’autre versant.',
      progressLabel: '6/6',
      checkpointId: prologue.checkpointId,
      nextObjectiveId: prologue.nextObjectiveId,
      worldImpact: { ...prologue.worldImpact },
      anchor: gameplayConfig.world.points.path ? { ...gameplayConfig.world.points.path, label: 'Au-delà du col' } : null,
    };
  }
  const step = STEP_BY_ID[prologue.stepId] ?? PROLOGUE_STEPS[0];
  const index = PROLOGUE_STEPS.findIndex((candidate) => candidate.id === step.id);
  return {
    active: true,
    completed: false,
    id: step.id,
    title: step.title,
    objective: step.objectiveText,
    narrative: step.narrative,
    progressLabel: `${index + 1}/${PROLOGUE_STEPS.length}`,
    checkpointId: prologue.checkpointId,
    guidanceProfileId: step.guidanceProfileId,
    narrativeBeatId: step.narrativeBeatId,
    nextObjectiveId: prologue.nextObjectiveId,
    worldImpact: { ...prologue.worldImpact },
    anchor: resolveAnchor(step, gameplayConfig, state),
  };
}
