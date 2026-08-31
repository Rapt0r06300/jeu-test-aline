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
  if (questState.status === 'ready-to-turn-in') return `${quest.title} · Retournez voir Elyra`;
  return `${quest.title} · Terminée`;
}

export function mountGameHud(root, config, handlers = {}) {
  const shell = document.createElement('div');
  shell.className = 'game-hud';
  shell.innerHTML = `
    <section class="hud-status" aria-label="Statut du personnage">
      <div class="hud-title-row"><strong>${config.codename}</strong><span>Lv. <b data-level>1</b></span></div>
      <div class="hud-bar hp"><span data-hp-fill></span><em data-hp-label></em></div>
      <div class="hud-bar mana"><span data-mana-fill></span><em data-mana-label></em></div>
      <div class="hud-meta"><span>XP <b data-xp>0</b></span><span>ATQ <b data-attack>0</b> · DEF <b data-defense>0</b></span></div>
    </section>
    <section class="hud-target" data-target-card aria-live="polite">
      <span>Cible</span><strong data-target-name>Aucune</strong><small data-target-hp></small>
    </section>
    <section class="boss-bar" data-boss-bar hidden>
      <div><strong data-boss-name></strong><span data-boss-phase></span></div>
      <div class="hud-bar boss"><span data-boss-fill></span><em data-boss-hp></em></div>
      <small data-boss-warning></small>
    </section>
    <section class="quest-panel"><strong>Quête</strong><span data-quest></span></section>
    <section class="inventory-panel">
      <header><strong>Sac</strong><span data-inventory-count></span></header>
      <div data-inventory></div>
    </section>
    <section class="hud-help">WASD / flèches · Espace · 1–4 · E interagir</section>
    <button class="interact-button" data-interact type="button">Interagir <small>E</small></button>
    <div class="move-stick" data-joystick aria-label="Joystick de déplacement"><span></span></div>
    <section class="action-dock" aria-label="Compétences">
      ${Object.values(config.gameplay.actions).map((action) => `
        <button class="action-button" data-action="${action.id}" type="button">
          <span>${action.label}</span><small>${action.id === 'basic' ? 'ATK' : action.id.replace('skill', '')}</small><i data-cooldown></i>
        </button>
      `).join('')}
    </section>
    <div class="feedback-toast" data-feedback></div>
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
  const feedbackToast = shell.querySelector('[data-feedback]');
  const actionButtons = Object.fromEntries([...shell.querySelectorAll('[data-action]')].map((button) => [button.dataset.action, button]));
  let lastInventorySignature = '';
  let lastFeedbackKey = '';

  const onInteract = (event) => { event.preventDefault(); handlers.onInteract?.(); };
  const onInventoryClick = (event) => {
    const button = event.target.closest?.('[data-equip]');
    if (!button) return;
    event.preventDefault();
    handlers.onEquip?.(button.dataset.equip);
  };
  interactButton.addEventListener('pointerdown', onInteract);
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
      return `<button type="button" class="inventory-item rarity-${item.rarity}${equipped ? ' equipped' : ''}" data-equip="${instance.instanceId}"><strong>${item.name}</strong><small>${statText}${equipped ? ' · ÉQUIPÉ' : ''}</small></button>`;
    }).join('') : '<p class="inventory-empty">Aucun objet</p>';
  }

  function renderFeedback(state) {
    const feedback = state.feedback;
    const key = feedback ? `${feedback.type}:${feedback.at}:${feedback.actionId ?? ''}` : '';
    if (!feedback || key === lastFeedbackKey) return;
    lastFeedbackKey = key;
    const labels = {
      'level-up': `Niveau ${feedback.level} atteint !`,
      'quest-accepted': 'Quête acceptée',
      'quest-completed': 'Quête terminée · récompenses reçues',
      'boss-telegraph': feedback.pattern === 'nova' ? '⚠ NOVA DU GARDIEN' : '⚠ FRAPPE DU GARDIEN',
      'boss-victory': 'Gardien vaincu ! Récompense finale obtenue.',
      'player-defeated': 'Vous êtes tombé · retour au sanctuaire…',
      'player-recovered': 'Retour au sanctuaire',
    };
    const label = labels[feedback.type];
    if (!label) return;
    feedbackToast.textContent = label;
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
    targetName.textContent = target?.name ?? 'Aucune';
    targetHp.textContent = target ? `${Math.ceil(target.hp)} / ${target.maxHp} PV` : 'Approchez-vous d’un ennemi';

    const boss = state.enemies.find((enemy) => enemy.id === config.gameplay.boss.id);
    const showBoss = boss && (boss.state !== 'idle' || state.targetId === boss.id || state.bossVictory);
    bossBar.hidden = !showBoss;
    if (boss && showBoss) {
      bossName.textContent = boss.name;
      bossPhase.textContent = state.bossVictory ? 'Vaincu' : boss.phase === 'enraged' ? 'ENRAGÉ' : 'Phase I';
      bossFill.style.width = `${percent(boss.hp, boss.maxHp)}%`;
      bossHp.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
      bossWarning.textContent = boss.pendingDamageAt > now ? 'Télégraphe actif — éloignez-vous' : '';
    }

    quest.textContent = questText(state, config);
    renderInventory(state);
    renderFeedback(state);

    for (const [actionId, button] of Object.entries(actionButtons)) {
      const action = config.gameplay.actions[actionId];
      const remaining = Math.max(0, (state.cooldowns[actionId] ?? 0) - now);
      const unavailable = remaining > 0 || state.player.mana < action.manaCost || state.player.hp <= 0;
      button.classList.toggle('unavailable', unavailable);
      button.querySelector('[data-cooldown]').textContent = remaining > 0 ? remaining.toFixed(1) : '';
    }
  }

  return {
    joystick,
    actionButtons,
    render,
    unmount() {
      interactButton.removeEventListener('pointerdown', onInteract);
      inventory.removeEventListener('pointerdown', onInventoryClick);
      root.replaceChildren();
    },
  };
}

export function mountBootHud(root, config) {
  const card = document.createElement('section');
  card.className = 'boot-card';
  card.innerHTML = `<h1>${config.codename}</h1><p>Chargement du prototype jouable…</p><span class="boot-badge">${config.version} · prototype original</span>`;
  root.replaceChildren(card);
  return () => root.replaceChildren();
}

export function mountFatalHud(root, error) {
  const card = document.createElement('section');
  card.className = 'boot-card fatal-card';
  card.innerHTML = `<h1>Erreur de démarrage</h1><p>${String(error?.message ?? error)}</p>`;
  root.replaceChildren(card);
}
