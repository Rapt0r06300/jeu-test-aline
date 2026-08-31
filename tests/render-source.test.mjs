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

test('main 3D characters use articulated humanoids instead of pawn proxies', () => {
  assert.match(three, /function createHumanoidCharacter/);
  assert.match(three, /function poseHumanoid/);
  assert.match(three, /const player = createHumanoidCharacter/);
  assert.match(three, /const npc = createHumanoidCharacter/);
  assert.doesNotMatch(three, /const playerBody\s*=.*CapsuleGeometry/);
  assert.doesNotMatch(three, /const body\s*=.*DodecahedronGeometry\(size/);
});

test('Canvas fallback also renders humanoid silhouettes', () => {
  assert.match(fallback, /function drawHumanoid/);
  assert.match(fallback, /fallback-2d-humanoid/);
  assert.match(fallback, /Fallback humanoïde actif/);
});

test('scene uses original procedural primitives only', () => {
  assert.doesNotMatch(three, /TextureLoader|GLTFLoader|\.png|\.jpg|\.glb|\.gltf/);
  assert.match(three, /CircleGeometry/);
  assert.match(three, /ConeGeometry/);
  assert.match(three, /DodecahedronGeometry/);
});
