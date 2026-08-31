import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');
const browserSmoke = readFileSync('scripts/browser-smoke.mjs', 'utf8');

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

test('Pages workflow smoke tests the deployed public URL after deploy', () => {
  const deployIndex = workflow.indexOf('actions/deploy-pages@v4');
  const publicSmokeIndex = workflow.indexOf('public-smoke:');
  const smokeUrlIndex = workflow.indexOf('SMOKE_URL:');
  assert.ok(publicSmokeIndex > deployIndex, 'public-smoke must run after deploy job definition');
  assert.ok(smokeUrlIndex > publicSmokeIndex, 'public smoke must receive the deployed page URL');
  assert.match(workflow, /needs: deploy/);
  assert.match(workflow, /needs\.deploy\.outputs\.page_url/);
  assert.match(browserSmoke, /process\.env\.SMOKE_URL/);
  assert.match(browserSmoke, /const prefix = externalUrl \? 'public-' : ''/);
});

test('browser smoke covers desktop, mobile, narrow mobile and landscape', () => {
  assert.match(browserSmoke, /1440, 900/);
  assert.match(browserSmoke, /390, 844/);
  assert.match(browserSmoke, /320, 568/);
  assert.match(browserSmoke, /844, 390/);
  assert.match(browserSmoke, /mobile-narrow/);
  assert.match(browserSmoke, /mobile-landscape/);
});

test('Pages workflow has minimum deployment permissions', () => {
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
});
