export const APP_CONFIG = Object.freeze({
  title: 'Jeu Test Aline',
  codename: 'Eldervale Prototype',
  version: '0.2.0',
  render: Object.freeze({
    maxPixelRatio: 1.75,
    preferredFpsDesktop: 60,
    preferredFpsMobile: 45,
  }),
  gameplay: Object.freeze({
    player: Object.freeze({
      maxHp: 140,
      maxMana: 100,
      moveSpeed: 8.5,
      manaRegenPerSecond: 6,
      start: Object.freeze({ x: 0, z: 8 }),
    }),
    targeting: Object.freeze({ range: 16 }),
    enemies: Object.freeze({
      respawnSeconds: 6,
      aggroRange: 15,
      attackRange: 2.35,
      moveSpeed: 2.7,
      attackCooldown: 1.25,
      attackDamage: 6,
      spawns: Object.freeze([
        Object.freeze({ id: 'warg-1', name: 'Warg des brumes', x: -7, z: -4, maxHp: 85 }),
        Object.freeze({ id: 'warg-2', name: 'Warg cendré', x: 7, z: -6, maxHp: 95 }),
        Object.freeze({ id: 'sentinel-1', name: 'Sentinelle runique', x: 12, z: 5, maxHp: 125 }),
        Object.freeze({ id: 'sentinel-2', name: 'Sentinelle moussue', x: -12, z: 4, maxHp: 115 }),
      ]),
    }),
    actions: Object.freeze({
      basic: Object.freeze({ id: 'basic', label: 'Attaque', damage: 18, manaCost: 0, cooldown: 0.58, range: 3.4, key: 'Space' }),
      skill1: Object.freeze({ id: 'skill1', label: 'Frappe astrale', damage: 34, manaCost: 14, cooldown: 3, range: 4.2, key: 'Digit1' }),
      skill2: Object.freeze({ id: 'skill2', label: 'Onde runique', damage: 26, manaCost: 18, cooldown: 4.5, range: 7.5, key: 'Digit2' }),
      skill3: Object.freeze({ id: 'skill3', label: 'Percée du vent', damage: 42, manaCost: 24, cooldown: 6, range: 6.2, key: 'Digit3' }),
      skill4: Object.freeze({ id: 'skill4', label: 'Éclat d’aurore', damage: 58, manaCost: 34, cooldown: 9, range: 9.5, key: 'Digit4' }),
    }),
  }),
});
