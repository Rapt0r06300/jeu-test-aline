import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');

test('Pages workflow runs all quality gates before deploy', () => {
  const unitIndex = workflow.indexOf('npm test');
  const buildIndex = workflow.indexOf('npm run build');
  const staticIndex = workflow.indexOf('scripts/smoke-dist.mjs');
  const browserIndex = workflow.indexOf('scripts/browser-smoke.mjs');
  const configureIndex = workflow.indexOf('actions/configure-pages@v5');
  const deployIndex = workflow.indexOf('actions/deploy-pages@v4');
  for (const [name, index] of Object.entries({ unitIndex, buildIndex, staticIndex, browserIndex, configureIndex, deployIndex })) {
    assert.ok(index >= 0, `missing workflow step: ${name}`);
  }
  assert.ok(unitIndex < buildIndex);
  assert.ok(buildIndex < staticIndex);
  assert.ok(staticIndex < browserIndex);
  assert.ok(browserIndex < configureIndex);
  assert.ok(configureIndex < deployIndex);
});

test('Pages workflow has minimum deployment permissions', () => {
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
});
