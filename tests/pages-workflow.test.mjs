import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/pages.yml', 'utf8');

test('Pages workflow tests before deploy', () => {
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /scripts\/smoke-dist\.mjs/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test('Pages workflow has minimum deployment permissions', () => {
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pages: write/);
  assert.match(workflow, /id-token: write/);
});
