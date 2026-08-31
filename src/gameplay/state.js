export function createInitialGameState() {
  return {
    phase: 'boot',
    player: { hp: 100, maxHp: 100, mana: 100, maxMana: 100, level: 1, xp: 0 },
    targetId: null,
  };
}
