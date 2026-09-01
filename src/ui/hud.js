import { getFirstSessionView } from '../gameplay/first-session.js';
import { getPrologueView } from '../gameplay/prologue.js';
import { getGuidanceView } from '../gameplay/guidance.js';

function percent(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function questText(state, config) {
  const quest = config.gameplay.quests['mist-hunt'];
  const questState = state.questStates[quest.id];
  if (!questState) return 'Aucune quête';
  if (questState.status === 'available') return `Parlez à ${config.gameplay.world.npc.name}`;
  if (questState.status === 'active') return `${quest.title} · Wargs ${questState.progress}/${quest.objective.required}`;
  if (questState.status === 'ready-to-turn-in') return `${quest.title} · Wargs neutralisés`;
  return `${quest.title} · Terminée`;
}

function feedbackPresentation(feedback) {
  const definitions = {
    'level-up': { label: `Niveau ${feedback.level} atteint !`, tone: 'reward' },
    'quest-accepted': { label: 'Elyra vous confie la sécurisation du sentier.', tone: 'objective' },
    'quest-completed': { label: 'Quête terminée · récompenses reçues', tone: 'reward' },
    'boss-telegraph': { label: feedback.pattern === 'nova' ? '⚠ NOVA DU GARDIEN' : '⚠ FRAPPE DU GARDIEN', tone: 'danger' },
    'boss-victory': { label: 'Gardien vaincu ! Le sanctuaire se stabilise.', tone: 'reward' },
    'player-defeated': { label: 'Vous êtes tombé · retour au sanctuaire…', tone: 'danger' },
    'player-recovered': { label: 'Retour au sanctuaire', tone: 'objective' },
    'first-session-advanced': { label: 'Prologue · étape suivante', tone: 'objective' },
    'first-session-skipped': { label: 'Séquence passée', tone: 'neutral' },
    'first-session-replay': { label: 'Séquence prête à être rejouée', tone: 'objective' },
    'prologue-world-impact': { label: feedback.eventId === 'fragment-resonance' ? 'Le fragment répond à votre présence.' : 'La balise se rallume · la brume recule.', tone: 'reward' },
  };
  return definitions[feedback.type] ?? null;
}

function inputHintLabel(id) {
  const labels = {
    movement: 'WASD / joystick',
    interact: 'E / Interagir',
    'target-auto': 'Ciblage auto à portée',
    basic: 'Espace / ATK',
    skill1: '1',
    equip: 'Touchez un objet du sac',
  };
  return labels[id] ?? id;
}

function distanceLabel(player, anchor) {
  if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.z)) return '';
  const distance = Math.hypot(player.position.x - anchor.x, player.position.z - anchor.z);
  return ` · ~${Math.max(0, Math.round(distance))} m`;
}

export function mountGameHud(root, config, handlers = {}) {
  const shell = document.createElement('div');
  shell.className = 'game-hud';
  shell.innerHTML = `
    <div class="prologue-atmosphere" data-prologue-atmosphere aria-hidden="true"></div>
    <section class="hud-status ui-panel" aria-label="Statut du personnage">
      <div class="hud-title-row"><strong>${config.codename}</strong><span class="ui-badge">Lv. <b data-level>1</b></span></div>
      <div class="hud-bar hp"><span data-hp-fill></span><em data-hp-label></em></div>
      <div class="hud-bar mana"><span data-mana-fill></span><em data-mana-label></em></div>
      <div class="hud-meta"><span>XP <b data-xp>0</b></span><span>ATQ <b data-attack>0</b> · DEF <b data-defense>0</b></span></div>
    </section>
    <section class="hud-target ui-panel ui-panel--compact" data-target-card aria-live="polite">
      <span class="ui-kicker">Cible</span><strong data-target-name>Aucune</strong><small data-target-hp></small>
    </section>
    <section class="boss-bar ui-panel ui-panel--danger" data-boss-bar data-ui-state="ready" hidden>
      <div><strong data-boss-name></strong><span data-boss-phase></span></div>
      <div class="hud-bar boss"><span data-boss-fill></span><em data-boss-hp></em></div>
      <small class="ui-danger-text" data-boss-warning></small>
    </section>
    <section class="guide-panel ui-panel ui-panel--objective" data-guide data-ui-state="objective" aria-live="polite">
      <header><span class="ui-kicker" data-guide-kind>PROLOGUE</span><b class="ui-badge" data-guide-progress></b></header>
      <strong data-guide-title></strong>
      <p data-guide-objective></p>
      <small class="guide-narrative" data-guide-narrative></small>
      <div class="guide-actions">
        <button class="ui-button ui-button--primary" type="button" data-guide-advance>Continuer</button>
        <button class="ui-button ui-button--ghost" type="button" data-guide-skip>Passer</button>
        <button class="ui-button ui-button--ghost" type="button" data-guide-replay>Rejouer</button>
      </div>
    </section>
    <section class="guidance-panel ui-panel ui-panel--compact" data-guidance data-ui-state="objective" aria-live="polite">
      <header><strong class="ui-kicker">Guidance</strong><span class="ui-badge" data-guidance-mode-label>Complète</span></header>
      <div data-guidance-content>
        <strong data-guidance-message></strong>
        <small data-guidance-hints></small>
      </div>
      <div class="guidance-settings" aria-label="Réglages du tutoriel">
        <button class="ui-button ui-button--ghost" type="button" data-guidance-mode="complete">Complète</button>
        <button class="ui-button ui-button--ghost" type="button" data-guidance-mode="minimal">Minimale</button>
        <button class="ui-button ui-button--ghost" type="button" data-guidance-mode="off">Off</button>
        <button class="ui-button ui-button--ghost" type="button" data-guidance-replay>Rejouer</button>
      </div>
    </section>
    <section class="quest-panel ui-panel ui-panel--compact"><strong class="ui-kicker">Quête</strong><span data-quest></span></section>
    <section class="inventory-panel ui-panel">
      <header><strong class="ui-kicker">Sac</strong><span class="ui-badge" data-inventory-count></span></header>
      <div data-inventory></div>
    </section>
    <section class="hud-help ui-panel ui-panel--muted">WASD / flèches · Espace · 1–4 · E interagir</section>
    <button class="interact-button ui-button ui-button--secondary" data-interact type="button">Interagir <small>E</small></button>
    <div class="move-stick" data-joystick aria-label="Joystick de déplacement"><span></span></div>
    <section class="action-dock" aria-label="Compétences">
      ${Object.values(config.gameplay.actions).map((action) => `
        <button class="action-button ui-button ui-button--skill" data-action="${action.id}" data-ui-state="ready" type="button" aria-label="${action.label}">
          <span>${action.label}</span><small>${action.id === 'basic' ? 'ATK' : action.id.replace('skill', '')}</small><i data-cooldown></i>
        </button>
      `).join('')}
    </section>
    <div class="feedback-toast ui-panel" data-feedback data-ui-state="neutral"></div>
  `;
  root.replaceChildren(shell);

  const hpFill = shell.querySelector('[data-hp-fill]');
  const hpLabel = shell.querySelector('[data-hp-label]');
  const manaFill = shell.querySelector('[data-mana-fill]');
  const manaLabel = shell.querySelector('[data-mana-label]');
  const xp = shell.querySelector('[data-xp]');
  const level = shell.querySelector('[data-level]');
  const attack = shell.querySelector('[data-attack]');
  const defense = shell.querySelector('[data-defense]');
  const targetName = shell.querySelector('[data-target-name]');
  const targetHp = shell.querySelector('[data-target-hp]');
  const targetCard = shell.querySelector('[data-target-card]');
  const joystick = shell.querySelector('[data-joystick]');
  const quest = shell.querySelector('[data-quest]');
  const inventory = shell.querySelector('[data-inventory]');
  const inventoryCount = shell.querySelector('[data-inventory-count]');
  const interactButton = shell.querySelector('[data-interact]');
  const bossBar = shell.querySelector('[data-boss-bar]');
  const bossName = shell.querySelector('[data-boss-name]');
  const bossPhase = shell.querySelector('[data-boss-phase]');
  const bossFill = shell.querySelector('[data-boss-fill]');
  const bossHp = shell.querySelector('[data-boss-hp]');
  const bossWarning = shell.querySelector('[data-boss-warning]');
  const guidePanel = shell.querySelector('[data-guide]');
  const guideKind = shell.querySelector('[data-guide-kind]');
  const guideProgress = shell.querySelector('[data-guide-progress]');
  const guideTitle = shell.querySelector('[data-guide-title]');
  const guideObjective = shell.querySelector('[data-guide-objective]');
  const guideNarrative = shell.querySelector('[data-guide-narrative]');
  const guideAdvance = shell.querySelector('[data-guide-advance]');
  const guideSkip = shell.querySelector('[data-guide-skip]');
  const guideReplay = shell.querySelector('[data-guide-replay]');
  const guidancePanel = shell.querySelector('[data-guidance]');
  const guidanceContent = shell.querySelector('[data-guidance-content]');
  const guidanceMessage = shell.querySelector('[data-guidance-message]');
  const guidanceHints = shell.querySelector('[data-guidance-hints]');
  const guidanceModeLabel = shell.querySelector('[data-guidance-mode-label]');
  const guidanceModeButtons = [...shell.querySelectorAll('[data-guidance-mode]')];
  const guidanceReplay = shell.querySelector('[data-guidance-replay]');
  const prologueAtmosphere = shell.querySelector('[data-prologue-atmosphere]');
  const feedbackToast = shell.querySelector('[data-feedback]');
  const actionButtons = Object.fromEntries([...shell.querySelectorAll('[data-action]')].map((button) => [button.dataset.action, button]));
  let lastInventorySignature = '';
  let lastFeedbackKey = '';

  const onInteract = (event) => { event.preventDefault(); handlers.onInteract?.(); };
  const onGuideAdvance = (event) => { event.preventDefault(); handlers.onFirstSessionAdvance?.(); };
  const onGuideSkip = (event) => { event.preventDefault(); handlers.onFirstSessionSkip?.(); };
  const onGuideReplay = (event) => { event.preventDefault(); handlers.onFirstSessionReplay?.(); };
  const onGuidanceMode = (event) => { event.preventDefault(); handlers.onGuidanceMode?.(event.currentTarget.dataset.guidanceMode); };
  const onGuidanceReplay = (event) => { event.preventDefault(); handlers.onGuidanceReplay?.(); };
  const onInventoryClick = (event) => {
    const button = event.target.closest?.('[data-equip]');
    if (!button) return;
    event.preventDefault();
    handlers.onEquip?.(button.dataset.equip);
  };
  interactButton.addEventListener('pointerdown', onInteract);
  guideAdvance.addEventListener('pointerdown', onGuideAdvance);
  guideSkip.addEventListener('pointerdown', onGuideSkip);
  guideReplay.addEventListener('pointerdown', onGuideReplay);
  guidanceModeButtons.forEach((button) => button.addEventListener('pointerdown', onGuidanceMode));
  guidanceReplay.addEventListener('pointerdown', onGuidanceReplay);
  inventory.addEventListener('pointerdown', onInventoryClick);

  function renderInventory(state) {
    const signature = `${state.inventory.map((item) => item.instanceId).join('|')}::${state.equipment.weapon}|${state.equipment.armor}`;
    if (signature === lastInventorySignature) return;
    lastInventorySignature = signature;
    inventoryCount.textContent = `${state.inventory.length}/${config.gameplay.player.inventoryCapacity}`;
    inventory.innerHTML = state.inventory.length ? state.inventory.map((instance) => {
      const item = config.gameplay.items[instance.itemId];
      const equipped = state.equipment[item.slot] === instance.instanceId;
      const statText = Object.entries(item.stats).map(([key, value]) => `${key === 'attack' ? 'ATQ' : 'DEF'} +${value}`).join(' · ');
      return `<button type="button" class="inventory-item ui-button ui-button--inventory rarity-${item.rarity}${equipped ? ' equipped' : ''}" data-ui-state="${equipped ? 'reward' : 'ready'}" data-equip="${instance.instanceId}"><strong>${item.name}</strong><small>${statText}${equipped ? ' · ÉQUIPÉ' : ''}</small></button>`;
    }).join('') : '<p class="inventory-empty ui-muted">Aucun objet</p>';
  }

  function renderGuide(state) {
    if (state.narrative?.introComplete) {
      const guide = getPrologueView(state, config.gameplay);
      const isDanger = guide.id === 'p5';
      const isReward = guide.completed;
      guidePanel.dataset.uiState = isDanger ? 'danger' : isReward ? 'reward' : 'objective';
      guideKind.textContent = isDanger ? 'OBJECTIF MAJEUR' : isReward ? 'SUITE' : 'PROLOGUE';
      guideProgress.textContent = guide.progressLabel ?? '';
      guideTitle.textContent = guide.title ?? '';
      guideObjective.textContent = `${guide.objective ?? ''}${distanceLabel(state.player, guide.anchor)}`;
      guideNarrative.textContent = guide.narrative ?? '';
      guideAdvance.hidden = true;
      guideSkip.hidden = true;
      guideReplay.hidden = true;
      const impact = guide.worldImpact ?? {};
      prologueAtmosphere.dataset.mistPressure = impact.mistPressure ?? 'high';
      prologueAtmosphere.dataset.beacon = impact.auxiliaryBeaconLit ? 'lit' : 'dark';
      prologueAtmosphere.dataset.fragment = impact.fragmentRevealed ? 'revealed' : 'hidden';
      prologueAtmosphere.dataset.resolution = impact.sanctuaryStabilized ? 'stable' : 'open';
      return;
    }

    const guide = getFirstSessionView(state, config.gameplay);
    const isDanger = guide.kind === 'boss';
    const isReward = guide.kind === 'reward' || guide.kind === 'complete';
    guidePanel.dataset.uiState = isDanger ? 'danger' : isReward ? 'reward' : 'objective';
    guideKind.textContent = isDanger ? 'OBJECTIF MAJEUR' : guide.kind === 'presentation' ? 'RÉCIT' : isReward ? 'RÉCOMPENSE' : 'PROLOGUE';
    guideProgress.textContent = guide.progressLabel;
    guideTitle.textContent = guide.title;
    guideObjective.textContent = guide.replayRequested ? `${guide.objective} · Relecture demandée` : guide.objective;
    guideNarrative.textContent = '';
    guideAdvance.hidden = !guide.manual;
    guideSkip.hidden = !guide.skippable;
    guideReplay.hidden = !guide.replayable;
  }

  function renderGuidance(state) {
    const view = getGuidanceView(state);
    const labels = { complete: 'Complète', minimal: 'Minimale', off: 'Off' };
    guidanceModeLabel.textContent = labels[view.mode] ?? 'Complète';
    guidanceContent.hidden = !view.active;
    guidancePanel.dataset.uiState = view.priority === 'critical' ? 'objective' : 'neutral';
    if (view.active) {
      guidanceMessage.textContent = view.accessibilityMessage || view.message;
      guidanceHints.textContent = view.inputHintIds.length ? view.inputHintIds.map(inputHintLabel).join(' · ') : 'Astuce contextuelle';
    } else {
      guidanceMessage.textContent = '';
      guidanceHints.textContent = '';
    }
    for (const button of guidanceModeButtons) {
      const selected = button.dataset.guidanceMode === view.mode;
      button.dataset.uiState = selected ? 'objective' : 'ready';
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function renderFeedback(state) {
    const feedback = state.feedback;
    const key = feedback ? `${feedback.type}:${feedback.at}:${feedback.actionId ?? ''}:${feedback.stepId ?? ''}:${feedback.eventId ?? ''}` : '';
    if (!feedback || key === lastFeedbackKey) return;
    lastFeedbackKey = key;
    const presentation = feedbackPresentation(feedback);
    if (!presentation) return;
    feedbackToast.textContent = presentation.label;
    feedbackToast.dataset.uiState = presentation.tone;
    feedbackToast.classList.add('visible');
    setTimeout(() => feedbackToast.classList.remove('visible'), 1500);
  }

  function render(state, now = 0) {
    hpFill.style.width = `${percent(state.player.hp, state.player.maxHp)}%`;
    hpLabel.textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
    manaFill.style.width = `${percent(state.player.mana, state.player.maxMana)}%`;
    manaLabel.textContent = `${Math.floor(state.player.mana)} / ${state.player.maxMana}`;
    xp.textContent = String(state.player.xp);
    level.textContent = String(state.player.level);
    attack.textContent = String(state.player.attackPower);
    defense.textContent = String(state.player.defense);

    const target = state.enemies.find((enemy) => enemy.id === state.targetId && enemy.state !== 'dead');
    targetCard.classList.toggle('empty', !target);
    targetCard.dataset.uiState = target?.isBoss ? 'danger' : target ? 'objective' : 'neutral';
    targetName.textContent = target?.name ?? 'Aucune';
    targetHp.textContent = target ? `${Math.ceil(target.hp)} / ${target.maxHp} PV` : 'Approchez-vous d’un ennemi';

    const boss = state.enemies.find((enemy) => enemy.id === config.gameplay.boss.id);
    const showBoss = boss && (boss.state !== 'idle' || state.targetId === boss.id || state.bossVictory);
    bossBar.hidden = !showBoss;
    if (boss && showBoss) {
      const telegraphActive = boss.pendingDamageAt > now;
      const dangerous = telegraphActive || boss.phase === 'enraged';
      bossBar.dataset.uiState = state.bossVictory ? 'reward' : dangerous ? 'danger' : 'ready';
      bossName.textContent = boss.name;
      bossPhase.textContent = state.bossVictory ? 'Vaincu' : boss.phase === 'enraged' ? 'ENRAGÉ' : 'Phase I';
      bossFill.style.width = `${percent(boss.hp, boss.maxHp)}%`;
      bossHp.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
      bossWarning.textContent = telegraphActive ? 'Télégraphe actif — éloignez-vous' : '';
    }

    renderGuide(state);
    renderGuidance(state);
    quest.textContent = questText(state, config);
    renderInventory(state);
    renderFeedback(state);

    for (const [actionId, button] of Object.entries(actionButtons)) {
      const action = config.gameplay.actions[actionId];
      const remaining = Math.max(0, (state.cooldowns[actionId] ?? 0) - now);
      const coolingDown = remaining > 0;
      const outOfMana = state.player.mana < action.manaCost;
      const defeated = state.player.hp <= 0;
      const unavailable = coolingDown || outOfMana || defeated;
      button.disabled = unavailable;
      button.setAttribute('aria-disabled', String(unavailable));
      button.dataset.uiState = coolingDown ? 'cooldown' : unavailable ? 'disabled' : 'ready';
      button.setAttribute('aria-label', coolingDown ? `${action.label}, recharge ${remaining.toFixed(1)} secondes` : outOfMana ? `${action.label}, mana insuffisant` : action.label);
      button.classList.toggle('unavailable', unavailable);
      button.querySelector('[data-cooldown]').textContent = coolingDown ? remaining.toFixed(1) : '';
    }
  }

  return {
    joystick,
    actionButtons,
    render,
    unmount() {
      interactButton.removeEventListener('pointerdown', onInteract);
      guideAdvance.removeEventListener('pointerdown', onGuideAdvance);
      guideSkip.removeEventListener('pointerdown', onGuideSkip);
      guideReplay.removeEventListener('pointerdown', onGuideReplay);
      guidanceModeButtons.forEach((button) => button.removeEventListener('pointerdown', onGuidanceMode));
      guidanceReplay.removeEventListener('pointerdown', onGuidanceReplay);
      inventory.removeEventListener('pointerdown', onInventoryClick);
      root.replaceChildren();
    },
  };
}

export function mountBootHud(root, config) {
  const card = document.createElement('section');
  card.className = 'boot-card ui-panel ui-panel--objective';
  card.innerHTML = `<h1>${config.codename}</h1><p>Chargement du prototype jouable…</p><span class="boot-badge ui-badge">${config.version} · prototype original</span>`;
  root.replaceChildren(card);
  return () => root.replaceChildren();
}

export function mountFatalHud(root, error) {
  const card = document.createElement('section');
  card.className = 'boot-card fatal-card ui-panel ui-panel--danger';
  card.innerHTML = `<h1>Erreur de démarrage</h1><p>${String(error?.message ?? error)}</p>`;
  root.replaceChildren(card);
}
