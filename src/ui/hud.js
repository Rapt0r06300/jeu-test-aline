function percent(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function mountGameHud(root, config) {
  const shell = document.createElement('div');
  shell.className = 'game-hud';
  shell.innerHTML = `
    <section class="hud-status" aria-label="Statut du personnage">
      <div class="hud-title-row"><strong>${config.codename}</strong><span>Lv. <b data-level>1</b></span></div>
      <div class="hud-bar hp"><span data-hp-fill></span><em data-hp-label></em></div>
      <div class="hud-bar mana"><span data-mana-fill></span><em data-mana-label></em></div>
      <div class="hud-xp">XP <b data-xp>0</b></div>
    </section>
    <section class="hud-target" data-target-card aria-live="polite">
      <span>Cible</span><strong data-target-name>Aucune</strong><small data-target-hp></small>
    </section>
    <section class="hud-help">WASD / flèches · Espace · 1–4</section>
    <div class="move-stick" data-joystick aria-label="Joystick de déplacement"><span></span></div>
    <section class="action-dock" aria-label="Compétences">
      ${Object.values(config.gameplay.actions).map((action) => `
        <button class="action-button" data-action="${action.id}" type="button">
          <span>${action.label}</span><small>${action.id === 'basic' ? 'ATK' : action.id.replace('skill', '')}</small><i data-cooldown></i>
        </button>
      `).join('')}
    </section>
  `;
  root.replaceChildren(shell);

  const hpFill = shell.querySelector('[data-hp-fill]');
  const hpLabel = shell.querySelector('[data-hp-label]');
  const manaFill = shell.querySelector('[data-mana-fill]');
  const manaLabel = shell.querySelector('[data-mana-label]');
  const xp = shell.querySelector('[data-xp]');
  const level = shell.querySelector('[data-level]');
  const targetName = shell.querySelector('[data-target-name]');
  const targetHp = shell.querySelector('[data-target-hp]');
  const targetCard = shell.querySelector('[data-target-card]');
  const joystick = shell.querySelector('[data-joystick]');
  const actionButtons = Object.fromEntries(
    [...shell.querySelectorAll('[data-action]')].map((button) => [button.dataset.action, button]),
  );

  function render(state, now = 0) {
    hpFill.style.width = `${percent(state.player.hp, state.player.maxHp)}%`;
    hpLabel.textContent = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
    manaFill.style.width = `${percent(state.player.mana, state.player.maxMana)}%`;
    manaLabel.textContent = `${Math.floor(state.player.mana)} / ${state.player.maxMana}`;
    xp.textContent = String(state.player.xp);
    level.textContent = String(state.player.level);

    const target = state.enemies.find((enemy) => enemy.id === state.targetId && enemy.state !== 'dead');
    targetCard.classList.toggle('empty', !target);
    targetName.textContent = target?.name ?? 'Aucune';
    targetHp.textContent = target ? `${Math.ceil(target.hp)} / ${target.maxHp} PV` : 'Approchez-vous d’un ennemi';

    for (const [actionId, button] of Object.entries(actionButtons)) {
      const action = config.gameplay.actions[actionId];
      const remaining = Math.max(0, (state.cooldowns[actionId] ?? 0) - now);
      const unavailable = remaining > 0 || state.player.mana < action.manaCost;
      button.classList.toggle('unavailable', unavailable);
      button.querySelector('[data-cooldown]').textContent = remaining > 0 ? remaining.toFixed(1) : '';
      button.setAttribute('aria-label', `${action.label}, ${remaining > 0 ? `recharge ${remaining.toFixed(1)} secondes` : 'disponible'}`);
    }
  }

  return {
    joystick,
    actionButtons,
    render,
    unmount() { root.replaceChildren(); },
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
