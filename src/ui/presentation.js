import {
  LOADING_PHASES,
  SESSION_PHASES,
  cancelNewGame,
  closeSettings,
  confirmNewGame,
  createSessionFlow,
  failSessionFlow,
  getTitleActions,
  openSettings,
  requestSessionIntent,
  setLoadingPhase,
} from '../core/session-flow.js';
import { inspectLocalSave } from '../data/local-save.js';

const QUALITY_OPTIONS = ['auto', 'low', 'medium', 'high'];

function playUiTone(kind = 'confirm') {
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(kind === 'back' ? 280 : 420, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'back' ? 220 : 620, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
    oscillator.addEventListener('ended', () => context.close().catch(() => {}), { once: true });
  } catch {
    // Le feedback visuel reste suffisant si WebAudio est indisponible.
  }
}

function button(label, action, variant = 'primary') {
  return `<button class="ui-button ui-button--${variant} title-action" data-title-action="${action}" type="button">${label}</button>`;
}

function renderBackground() {
  return `
    <div class="title-vista" aria-hidden="true">
      <span class="title-moon"></span>
      <span class="title-ridge title-ridge--far"></span>
      <span class="title-ridge title-ridge--near"></span>
      <span class="title-sanctuary"></span>
      <span class="title-vein title-vein--one"></span>
      <span class="title-vein title-vein--two"></span>
      <span class="title-mist title-mist--one"></span>
      <span class="title-mist title-mist--two"></span>
      <span class="title-spark title-spark--one"></span>
      <span class="title-spark title-spark--two"></span>
      <span class="title-spark title-spark--three"></span>
    </div>`;
}

function renderTitle(flow, quality) {
  const actions = getTitleActions(flow);
  const recovery = actions.recoveryRequired
    ? `<div class="title-save-warning ui-panel ui-panel--danger" role="status"><strong>Sauvegarde illisible</strong><span>Elle n'a pas été modifiée. Démarrer une nouvelle partie demandera une confirmation.</span></div>`
    : '';
  const secondary = actions.secondary ? button(actions.secondary.label, actions.secondary.id, 'secondary') : '';
  return `
    <section class="title-screen" data-presentation-phase="title">
      ${renderBackground()}
      <div class="title-shade"></div>
      <div class="title-content">
        <p class="ui-kicker">Chroniques telluriques</p>
        <h1 class="title-logo"><span>Le Chant</span><strong>des Veines</strong></h1>
        <p class="title-tagline">Quand les balises s'éteignent, la pierre se souvient.</p>
        ${recovery}
        <div class="title-actions" aria-label="Menu principal">
          ${button(actions.primary.label, actions.primary.id, 'primary')}
          ${secondary}
          ${button(actions.settings.label, actions.settings.id, 'ghost')}
        </div>
        <p class="title-build">Preview clean-room · qualité ${quality}</p>
      </div>
    </section>`;
}

function renderSettings(quality) {
  return `
    <section class="title-screen" data-presentation-phase="settings">
      ${renderBackground()}
      <div class="title-shade"></div>
      <div class="title-dialog ui-panel">
        <p class="ui-kicker">Paramètres</p>
        <h2>Qualité de rendu</h2>
        <div class="quality-options" role="radiogroup" aria-label="Qualité de rendu">
          ${QUALITY_OPTIONS.map((option) => `<button class="ui-button ui-button--secondary quality-option" type="button" role="radio" aria-checked="${quality === option}" data-quality="${option}">${option === 'auto' ? 'Auto' : option[0].toUpperCase() + option.slice(1)}</button>`).join('')}
        </div>
        ${button('Retour', 'settings-back', 'ghost')}
      </div>
    </section>`;
}

function renderConfirmation(flow) {
  const recovery = flow.save.status === 'corrupt';
  return `
    <section class="title-screen" data-presentation-phase="confirm-new-game">
      ${renderBackground()}
      <div class="title-shade"></div>
      <div class="title-dialog ui-panel ui-panel--danger" role="dialog" aria-modal="true" aria-labelledby="new-game-title">
        <p class="ui-kicker">Confirmation</p>
        <h2 id="new-game-title">${recovery ? 'Réinitialiser la sauvegarde illisible ?' : 'Commencer une nouvelle partie ?'}</h2>
        <p>${recovery ? "La sauvegarde actuelle ne peut pas être chargée. Elle ne sera remplacée qu'après votre confirmation et un démarrage réussi." : 'La progression sauvegardée sera remplacée uniquement lorsque la nouvelle session aura démarré correctement.'}</p>
        <div class="title-dialog-actions">
          ${button('Annuler', 'new-game-cancel', 'ghost')}
          ${button('Confirmer', 'new-game-confirm', 'danger')}
        </div>
      </div>
    </section>`;
}

function renderLoading(flow) {
  const currentIndex = Math.max(0, LOADING_PHASES.findIndex((phase) => phase.id === flow.loadingPhaseId));
  const current = LOADING_PHASES[currentIndex] ?? LOADING_PHASES[0];
  return `
    <section class="title-screen title-screen--loading" data-presentation-phase="loading" aria-busy="true">
      ${renderBackground()}
      <div class="title-shade title-shade--strong"></div>
      <div class="loading-card ui-panel">
        <p class="ui-kicker">Passage en cours</p>
        <h2>${current.label}</h2>
        <div class="loading-track" role="progressbar" aria-label="Chargement" aria-valuetext="${current.label}"><span></span></div>
        <ol class="loading-phases">
          ${LOADING_PHASES.map((phase, index) => `<li data-loading-state="${index < currentIndex ? 'done' : index === currentIndex ? 'active' : 'pending'}">${phase.label}</li>`).join('')}
        </ol>
      </div>
    </section>`;
}

function renderError(flow) {
  return `
    <section class="title-screen" data-presentation-phase="error">
      ${renderBackground()}
      <div class="title-shade"></div>
      <div class="title-dialog ui-panel ui-panel--danger" role="alert">
        <p class="ui-kicker">Passage interrompu</p>
        <h2>Impossible de démarrer la session</h2>
        <p>${flow.errorMessage}</p>
      </div>
    </section>`;
}

export function mountPresentation(root, { app, buildLabel = 'web-preview' } = {}) {
  const inspection = inspectLocalSave();
  const flow = createSessionFlow(inspection);
  let quality = 'auto';
  let destroyed = false;
  let committed = false;

  root.dataset.build = buildLabel;

  function render() {
    if (destroyed) return;
    if (flow.phase === SESSION_PHASES.SETTINGS) root.innerHTML = renderSettings(quality);
    else if (flow.phase === SESSION_PHASES.CONFIRM_NEW_GAME) root.innerHTML = renderConfirmation(flow);
    else if (flow.phase === SESSION_PHASES.LOADING) root.innerHTML = renderLoading(flow);
    else if (flow.phase === SESSION_PHASES.ERROR) root.innerHTML = renderError(flow);
    else root.innerHTML = renderTitle(flow, quality);
  }

  async function launch(intent) {
    if (committed) return;
    committed = true;

    try {
      await app.start({
        restoreSave: intent === 'continue',
        settingsOverride: { quality },
        onPhase(phaseId) {
          setLoadingPhase(flow, phaseId);
          render();
        },
      });
      if (intent === 'new-game') app.persist();
      flow.phase = SESSION_PHASES.READY;
      window.dispatchEvent(new CustomEvent('jta:session-ready', {
        detail: { renderer: app.state.renderer ?? 'unknown', intent },
      }));
      root.classList.add('presentation-root--leaving');
      window.setTimeout(() => {
        root.hidden = true;
        root.innerHTML = '';
      }, 320);
    } catch {
      committed = false;
      failSessionFlow(flow);
      render();
    }
  }

  async function choose(intent) {
    const result = requestSessionIntent(flow, intent);
    if (!result.ok) return result;
    playUiTone('confirm');
    render();
    if (!result.confirmationRequired) await launch(intent);
    return result;
  }

  root.addEventListener('click', async (event) => {
    const actionTarget = event.target.closest?.('[data-title-action]');
    if (actionTarget) {
      const action = actionTarget.dataset.titleAction;
      if (action === 'settings') {
        if (openSettings(flow)) playUiTone('confirm');
        render();
      } else if (action === 'settings-back') {
        if (closeSettings(flow)) playUiTone('back');
        render();
      } else if (action === 'new-game-cancel') {
        if (cancelNewGame(flow)) playUiTone('back');
        render();
      } else if (action === 'new-game-confirm') {
        const result = confirmNewGame(flow);
        if (result.ok) {
          playUiTone('confirm');
          render();
          await launch('new-game');
        }
      } else if (action === 'continue' || action === 'new-game') {
        await choose(action);
      }
      return;
    }

    const qualityTarget = event.target.closest?.('[data-quality]');
    if (qualityTarget && QUALITY_OPTIONS.includes(qualityTarget.dataset.quality)) {
      quality = qualityTarget.dataset.quality;
      playUiTone('confirm');
      render();
    }
  });

  render();

  return {
    flow,
    getQuality: () => quality,
    choose,
    async autostart() {
      const intent = flow.save.status === 'valid' ? 'continue' : 'new-game';
      const result = requestSessionIntent(flow, intent);
      if (!result.ok) return result;
      if (result.confirmationRequired) confirmNewGame(flow);
      render();
      await launch(intent);
      return { ok: true, intent };
    },
    unmount() {
      destroyed = true;
      root.innerHTML = '';
    },
  };
}
