import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const three = readFileSync('src/render/three-scene.js', 'utf8');
const fallback = readFileSync('src/render/fallback-scene.js', 'utf8');
const scene = readFileSync('src/render/scene.js', 'utf8');

test('3D renderer defines resize and disposal lifecycle', () => {
  assert.match(three, /function resize\(\)/);
  assert.match(three, /function dispose\(\)/);
  assert.match(three, /cancelAnimationFrame/);
  assert.match(three, /renderer\.dispose\(\)/);
});

test('fallback renderer protects against CDN failure', () => {
  assert.match(scene, /catch \(error\)/);
  assert.match(scene, /createFallbackScene/);
  assert.match(fallback, /requestAnimationFrame/);
  assert.match(fallback, /cancelAnimationFrame/);
});

test('scene uses original procedural primitives only', () => {
  assert.doesNotMatch(three, /TextureLoader|GLTFLoader|\.png|\.jpg|\.glb|\.gltf/);
  assert.match(three, /CircleGeometry/);
  assert.match(three, /ConeGeometry/);
  assert.match(three, /DodecahedronGeometry/);
});
