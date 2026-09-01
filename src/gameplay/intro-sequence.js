export const INTRO_DURATION_SECONDS = 60;

export const INTRO_BEATS = Object.freeze([
  Object.freeze({
    id: 'threat',
    start: 0,
    end: 6,
    shot: 'wide-pass',
    kicker: 'Au nord d’Eldervale',
    speaker: null,
    subtitle: 'La Brume Creuse franchit le col. Une veine de lumière s’éteint dans la montagne.',
  }),
  Object.freeze({
    id: 'place',
    start: 6,
    end: 14,
    shot: 'sanctuary-travel',
    kicker: 'Vallée d’Eldervale',
    speaker: null,
    subtitle: 'Les dernières balises protègent encore le sanctuaire, mais leur lueur faiblit.',
  }),
  Object.freeze({
    id: 'incident',
    start: 14,
    end: 24,
    shot: 'fracture-reveal',
    kicker: 'Sentier des Pierres',
    speaker: null,
    subtitle: 'Une fracture tellurique fend le chemin. Le voyageur reprend connaissance près d’un fragment inconnu.',
  }),
  Object.freeze({
    id: 'motivation',
    start: 24,
    end: 36,
    shot: 'elyra-call',
    kicker: 'La balise cède',
    speaker: 'Elyra',
    subtitle: 'Voyageur ! La balise du sanctuaire s’éteint. Aidez-moi à la rallumer avant que la brume n’entre.',
  }),
  Object.freeze({
    id: 'mystery',
    start: 36,
    end: 48,
    shot: 'fragment-pulse',
    kicker: 'Une résonance impossible',
    speaker: 'Elyra',
    subtitle: 'La pierre vous répond… Je ne sais pas encore pourquoi. Gardez vos distances et rejoignez-moi.',
  }),
  Object.freeze({
    id: 'handoff',
    start: 48,
    end: 60,
    shot: 'gameplay-handoff',
    kicker: 'Le sanctuaire attend',
    speaker: null,
    subtitle: 'Rejoignez Elyra. Rallumez la balise. Comprenez pourquoi le fragment réagit à votre présence.',
    objective: 'Rejoindre Elyra au sanctuaire',
  }),
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function ensureNarrativeState(state) {
  if (!state.narrative || typeof state.narrative !== 'object') {
    state.narrative = {
      introComplete: false,
      elyraActive: false,
      objectiveId: null,
      artifactClaimed: false,
    };
  }
  state.narrative.introComplete = Boolean(state.narrative.introComplete);
  state.narrative.elyraActive = Boolean(state.narrative.elyraActive);
  state.narrative.objectiveId = typeof state.narrative.objectiveId === 'string' ? state.narrative.objectiveId : null;
  state.narrative.artifactClaimed = Boolean(state.narrative.artifactClaimed);
  return state.narrative;
}

export function captureIntroStartSnapshot(state) {
  ensureNarrativeState(state);
  return clone({
    player: {
      position: state.player?.position ?? null,
      moveIntent: state.player?.moveIntent ?? null,
    },
    enemies: (state.enemies ?? []).map((enemy) => ({
      id: enemy.id,
      hp: enemy.hp,
      state: enemy.state,
      position: enemy.position,
    })),
    targetId: state.targetId ?? null,
    narrative: state.narrative,
  });
}

export function createIntroSequenceState(state) {
  return {
    status: 'playing',
    elapsed: 0,
    beatId: INTRO_BEATS[0].id,
    skipped: false,
    sequenceStartSnapshot: captureIntroStartSnapshot(state),
  };
}

export function getIntroBeatAt(elapsedSeconds) {
  const elapsed = Math.max(0, Math.min(INTRO_DURATION_SECONDS, Number(elapsedSeconds) || 0));
  return INTRO_BEATS.find((beat) => elapsed >= beat.start && elapsed < beat.end) ?? INTRO_BEATS.at(-1);
}

export function advanceIntroSequence(sequence, deltaSeconds) {
  if (!sequence || sequence.status !== 'playing') return { changed: false, complete: sequence?.status === 'complete' };
  const previousBeatId = sequence.beatId;
  sequence.elapsed = Math.min(INTRO_DURATION_SECONDS, sequence.elapsed + Math.max(0, Number(deltaSeconds) || 0));
  sequence.beatId = getIntroBeatAt(sequence.elapsed).id;
  if (sequence.elapsed >= INTRO_DURATION_SECONDS) sequence.status = 'awaiting-commit';
  return {
    changed: sequence.beatId !== previousBeatId,
    complete: sequence.status === 'awaiting-commit',
    beat: getIntroBeatAt(sequence.elapsed),
  };
}

function resetEnemyToSpawn(enemy, spawn) {
  enemy.hp = spawn.maxHp;
  enemy.maxHp = spawn.maxHp;
  enemy.position.x = spawn.x;
  enemy.position.z = spawn.z;
  enemy.spawn = { x: spawn.x, z: spawn.z };
  enemy.state = 'idle';
  enemy.phase = spawn.isBoss ? 'phase-1' : null;
  enemy.nextAttackAt = 0;
  enemy.respawnAt = 0;
  enemy.pendingDamageAt = 0;
}

export function commitIntroComplete(state, config) {
  const narrative = ensureNarrativeState(state);
  if (narrative.introComplete) {
    return { ok: true, changed: false, target: getIntroTargetView(state) };
  }

  const start = config.player.start;
  state.player.position.x = start.x;
  state.player.position.z = start.z;
  state.player.moveIntent = { x: 0, z: 0 };
  state.targetId = null;

  const spawnsById = new Map((config.enemies?.spawns ?? []).map((spawn) => [spawn.id, spawn]));
  for (const enemy of state.enemies ?? []) {
    const spawn = spawnsById.get(enemy.id);
    if (spawn) resetEnemyToSpawn(enemy, spawn);
  }

  narrative.introComplete = true;
  narrative.elyraActive = true;
  narrative.objectiveId = 'reach_sanctuary';
  narrative.artifactClaimed = false;
  state.feedback = { type: 'intro-complete', objectiveId: narrative.objectiveId, at: state.time ?? 0 };
  return { ok: true, changed: true, target: getIntroTargetView(state) };
}

export function completeIntroSequence(sequence, state, config) {
  const commit = commitIntroComplete(state, config);
  if (sequence) {
    sequence.elapsed = INTRO_DURATION_SECONDS;
    sequence.beatId = INTRO_BEATS.at(-1).id;
    sequence.status = 'complete';
  }
  return { ...commit, skipped: false };
}

export function skipIntroSequence(sequence, state, config) {
  const commit = commitIntroComplete(state, config);
  if (sequence) {
    sequence.status = 'complete';
    sequence.skipped = true;
  }
  return { ...commit, skipped: true };
}

export function getIntroTargetView(state) {
  const narrative = ensureNarrativeState(state);
  return {
    introComplete: narrative.introComplete,
    playerPosition: { x: state.player.position.x, z: state.player.position.z },
    targetId: state.targetId ?? null,
    elyraActive: narrative.elyraActive,
    objectiveId: narrative.objectiveId,
    artifactClaimed: narrative.artifactClaimed,
    enemies: (state.enemies ?? []).map((enemy) => ({
      id: enemy.id,
      hp: enemy.hp,
      state: enemy.state,
      x: enemy.position.x,
      z: enemy.position.z,
    })),
  };
}
