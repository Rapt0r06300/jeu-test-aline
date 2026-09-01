import {
  INTRO_DURATION_SECONDS,
  advanceIntroSequence,
  completeIntroSequence,
  createIntroSequenceState,
  getIntroBeatAt,
  skipIntroSequence,
} from '../gameplay/intro-sequence.js';

function renderIntro(root, sequence) {
  const beat = getIntroBeatAt(sequence.elapsed);
  const progress = Math.min(1, sequence.elapsed / INTRO_DURATION_SECONDS);
  root.innerHTML = `
    <section class="intro-cinematic" data-presentation-phase="intro" data-intro-beat="${beat.id}" data-intro-shot="${beat.shot}" aria-label="Cinématique d’introduction">
      <div class="intro-scene" aria-hidden="true">
        <span class="intro-sky"></span>
        <span class="intro-mountain intro-mountain--far"></span>
        <span class="intro-mountain intro-mountain--near"></span>
        <span class="intro-beacon intro-beacon--one"></span>
        <span class="intro-beacon intro-beacon--two"></span>
        <span class="intro-fog"></span>
        <span class="intro-fracture"></span>
        <span class="intro-fragment"></span>
        <span class="intro-figure intro-figure--hero"></span>
        <span class="intro-figure intro-figure--elyra"></span>
        <span class="intro-shadow"></span>
      </div>
      <div class="intro-letterbox intro-letterbox--top"></div>
      <div class="intro-letterbox intro-letterbox--bottom"></div>
      <div class="intro-meta">
        <span>${beat.kicker}</span>
        <span>${String(Math.floor(sequence.elapsed)).padStart(2, '0')} / 60</span>
      </div>
      <button class="ui-button ui-button--ghost intro-skip" type="button" data-intro-skip aria-label="Passer la cinématique">Passer</button>
      <div class="intro-subtitle" role="status" aria-live="polite">
        ${beat.speaker ? `<strong>${beat.speaker}</strong>` : ''}
        <p>${beat.subtitle}</p>
        ${beat.objective ? `<span class="intro-objective">Objectif · ${beat.objective}</span>` : ''}
      </div>
      <div class="intro-timeline" aria-hidden="true"><span style="transform:scaleX(${progress})"></span></div>
    </section>`;
}

export function playIntroPresentation(root, { app, autoSkip = false } = {}) {
  const sequence = createIntroSequenceState(app.state);
  let raf = 0;
  let previousTime = 0;
  let settled = false;

  app.setGameplayEnabled(false);
  renderIntro(root, sequence);

  return new Promise((resolve) => {
    function finish(skipped) {
      if (settled) return;
      settled = true;
      if (raf) cancelAnimationFrame(raf);
      const result = skipped
        ? skipIntroSequence(sequence, app.state, app.config.gameplay)
        : completeIntroSequence(sequence, app.state, app.config.gameplay);
      app.completeFirstSessionPresentation('intro');
      app.persist();
      app.setGameplayEnabled(true);
      root.removeEventListener('click', onClick);
      resolve({ ...result, sequence });
    }

    function onClick(event) {
      if (event.target.closest?.('[data-intro-skip]')) finish(true);
    }

    function frame(timestamp) {
      if (settled) return;
      if (!previousTime) previousTime = timestamp;
      const delta = Math.min(0.1, Math.max(0, (timestamp - previousTime) / 1000));
      previousTime = timestamp;
      const result = advanceIntroSequence(sequence, delta);
      renderIntro(root, sequence);
      if (result.complete) finish(false);
      else raf = requestAnimationFrame(frame);
    }

    root.addEventListener('click', onClick);
    if (autoSkip) {
      queueMicrotask(() => finish(true));
      return;
    }
    raf = requestAnimationFrame(frame);
  });
}
