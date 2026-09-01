import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registryUrl = new URL('../docs/visual-benchmark-clean-room.json', import.meta.url);
const registry = JSON.parse(await readFile(registryUrl, 'utf8'));

const requiredCategories = new Set(['world', 'character', 'animation', 'vfx', 'lighting', 'camera', 'ui']);
const forbiddenProductionTerms = [
  'copy the asset',
  'trace the composition',
  'extract texture',
  'rip asset',
  'recreate exact',
];

test('visual benchmark contains at least 30 public references across required axes', () => {
  assert.ok(registry.references.length >= 30);
  const categories = new Set(registry.references.map((reference) => reference.category));
  for (const category of requiredCategories) {
    assert.ok(categories.has(category), `missing category ${category}`);
  }
});

test('every benchmark reference is dated, traceable and clean-room scoped', () => {
  const ids = new Set();
  for (const reference of registry.references) {
    assert.match(reference.id, /^R\d{2,}$/);
    assert.ok(!ids.has(reference.id), `duplicate id ${reference.id}`);
    ids.add(reference.id);
    assert.match(reference.url, /^https:\/\//);
    assert.match(reference.consultedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(reference.consultedAt, registry.consultedAt);
    assert.ok(reference.sourceType);
    assert.ok(reference.context);
    assert.ok(reference.abstractObservation.length >= 40);
    assert.match(reference.ipRisk, /^(low|medium|high)$/);
    assert.ok(Array.isArray(reference.linkedTasks) && reference.linkedTasks.length >= 1);
    assert.ok(reference.linkedTasks.every((task) => /^JTA-\d+$/.test(task)));
    const normalized = reference.abstractObservation.toLowerCase();
    for (const forbidden of forbiddenProductionTerms) {
      assert.ok(!normalized.includes(forbidden), `${reference.id} contains unsafe derivative instruction`);
    }
  }
});

test('scorecard separates observed principle from original target and proof', () => {
  assert.ok(registry.scorecard.length >= 10);
  for (const item of registry.scorecard) {
    assert.ok(item.principle.length >= 20);
    assert.ok(item.originalTarget.length >= 40);
    assert.notEqual(item.principle, item.originalTarget);
    assert.ok(Array.isArray(item.tasks) && item.tasks.length >= 1);
    assert.ok(item.tasks.every((task) => /^JTA-\d+$/.test(task)));
    assert.ok(item.proof.length >= 20);
  }
});

test('registry explicitly forbids importing competitor production assets', () => {
  assert.equal(registry.cleanRoomPolicy.productionAssetsImported, false);
  assert.ok(registry.cleanRoomPolicy.forbidden.length >= 5);
  assert.ok(registry.cleanRoomPolicy.forbidden.some((rule) => /assets/i.test(rule)));
  assert.ok(registry.cleanRoomPolicy.forbidden.some((rule) => /animations|choreography/i.test(rule)));
  assert.ok(registry.cleanRoomPolicy.forbidden.some((rule) => /ui/i.test(rule)));
});

test('ten-reference audit sample remains generic rather than copy instructions', () => {
  const sampleIds = ['R01', 'R11', 'R13', 'R14', 'R15', 'R17', 'R21', 'R22', 'R23', 'R33'];
  const byId = new Map(registry.references.map((reference) => [reference.id, reference]));
  for (const id of sampleIds) {
    const reference = byId.get(id);
    assert.ok(reference, `sample ${id} missing`);
    assert.ok(reference.abstractObservation.length >= 40);
    assert.ok(!/(exact|pixel|trace|copy|same layout|same animation)/i.test(reference.abstractObservation));
  }
});
