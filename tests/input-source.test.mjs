import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const input = readFileSync('src/gameplay/input.js', 'utf8');
const app = readFileSync('src/core/app.js', 'utf8');

test('keyboard movement supports WASD and arrow keys', () => {
  for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.match(input, new RegExp(code));
  }
  assert.match(input, /function keyboardVector/);
  assert.match(input, /function sampleMovement/);
});

test('touch joystick handles full pointer lifecycle', () => {
  for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
    assert.match(input, new RegExp(event));
  }
  assert.match(input, /touchVector = \{ x: dx \/ radius, z: dy \/ radius \}/);
  assert.match(input, /setPointerCapture/);
});

test('focus and visibility loss reset stuck inputs', () => {
  assert.match(input, /window\.addEventListener\('blur', reset\)/);
  assert.match(input, /visibilitychange/);
  assert.match(input, /pressed\.clear\(\)/);
  assert.match(input, /touchVector = \{ x: 0, z: 0 \}/);
});

test('app samples unified input every frame and clears movement on stop', () => {
  assert.match(app, /input\?\.sampleMovement\(\)/);
  assert.match(app, /setMoveIntent\(state, movement\.x, movement\.z\)/);
  assert.match(app, /clearMoveIntent\(state\)/);
});
