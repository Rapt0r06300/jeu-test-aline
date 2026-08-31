import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const required = [
  'index.html',
  'src/main.js',
  'src/core/app.js',
  'src/render/scene.js',
  'src/gameplay/state.js',
  'src/data/config.js',
  'src/ui/hud.js',
  'docs/ARCHITECTURE.md',
  'docs/ASSET-REGISTER.md',
];

test('project structure separates responsibilities', () => {
  for (const path of required) assert.equal(existsSync(path), true, `missing ${path}`);
});

test('entry points use relative paths compatible with project pages', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /href="\.\/src\/styles\.css"/);
  assert.match(html, /src="\.\/src\/main\.js"/);
  assert.doesNotMatch(html, /(?:href|src)="\/(?!\/)/);
});

test('gameplay model is renderer independent', () => {
  const state = readFileSync('src/gameplay/state.js', 'utf8');
  assert.doesNotMatch(state, /from ['"].*render/);
  assert.doesNotMatch(state, /document\.|window\./);
});
