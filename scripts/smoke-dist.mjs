import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

for (const file of ['dist/index.html', 'dist/src/main.js', 'dist/src/render/scene.js']) {
  assert.equal(existsSync(file), true, `Missing build output: ${file}`);
}

const html = readFileSync('dist/index.html', 'utf8');
const main = readFileSync('dist/src/main.js', 'utf8');
assert.match(html, /id="scene-root"/);
assert.match(html, /type="module" src="\.\/src\/main\.js"/);
assert.match(main, /__JTA_READY__/);
assert.match(main, /jta:ready/);
console.log('Static smoke: PASS');
