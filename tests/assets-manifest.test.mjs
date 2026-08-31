import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function runPolicy(root) {
  return spawnSync(process.execPath, ['scripts/check-assets.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, ASSET_ROOT: root },
    encoding: 'utf8',
  });
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'jta-assets-'));
  mkdirSync(join(root, 'assets'), { recursive: true });
  writeFileSync(join(root, 'assets', 'manifest.json'), JSON.stringify({ schemaVersion: 1, policy: 'fail-closed', assets: [] }, null, 2));
  return root;
}

test('current repository passes the asset provenance policy', () => {
  const result = spawnSync(process.execPath, ['scripts/check-assets.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Asset provenance policy: PASS/);
});

test('an unregistered asset fails closed', () => {
  const root = fixture();
  writeFileSync(join(root, 'assets', 'rogue.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const result = runPolicy(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unregistered asset file: assets\/rogue\.png/);
});

test('a registered original asset with matching hash passes', () => {
  const root = fixture();
  const data = Buffer.from('original-placeholder-binary');
  const assetPath = join(root, 'assets', 'hero.glb');
  writeFileSync(assetPath, data);
  const sha256 = createHash('sha256').update(data).digest('hex');
  const manifest = {
    schemaVersion: 1,
    policy: 'fail-closed',
    assets: [{
      id: 'hero-original',
      path: 'assets/hero.glb',
      sourceUrl: 'original-project',
      author: 'Jeu Test Aline',
      license: 'PROJECT-ORIGINAL',
      retrievedAt: '2026-08-31',
      sha256,
      transformations: [],
      attribution: 'Aucune',
      restrictions: 'Asset original du projet',
    }],
  };
  writeFileSync(join(root, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = runPolicy(root);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('hash tampering fails even for a registered asset', () => {
  const root = fixture();
  writeFileSync(join(root, 'assets', 'hero.glb'), Buffer.from('tampered'));
  const manifest = {
    schemaVersion: 1,
    policy: 'fail-closed',
    assets: [{
      id: 'hero-original',
      path: 'assets/hero.glb',
      sourceUrl: 'original-project',
      author: 'Jeu Test Aline',
      license: 'PROJECT-ORIGINAL',
      retrievedAt: '2026-08-31',
      sha256: '0'.repeat(64),
      transformations: [],
      attribution: 'Aucune',
      restrictions: 'Asset original du projet',
    }],
  };
  writeFileSync(join(root, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2));
  const result = runPolicy(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SHA-256 mismatch/);
});
