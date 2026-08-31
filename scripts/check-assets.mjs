import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

const root = resolve(process.env.ASSET_ROOT || process.cwd());
const manifestPath = resolve(root, process.env.ASSET_MANIFEST || 'assets/manifest.json');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', '.cache', 'coverage']);
const trackedAssetExtensions = new Set([
  '.glb', '.gltf', '.fbx', '.obj', '.blend', '.bin', '.basis', '.ktx2',
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.tif', '.tiff', '.hdr', '.exr', '.psd',
  '.wav', '.mp3', '.ogg', '.flac', '.m4a', '.mp4', '.webm', '.mov',
  '.ttf', '.otf', '.woff', '.woff2',
]);
const approvedLicenses = new Set([
  'PROJECT-ORIGINAL',
  'CC0-1.0',
  'CC-BY-4.0',
  'MIT',
  'BSD-3-Clause',
  'Apache-2.0',
]);

function fail(message) {
  console.error(`ASSET POLICY FAIL: ${message}`);
  process.exitCode = 1;
}

function toRepoPath(filePath) {
  return relative(root, filePath).split(sep).join('/');
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function collectAssetFiles(directory, output = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) collectAssetFiles(absolute, output);
    else if (entry.isFile() && trackedAssetExtensions.has(extname(entry.name).toLowerCase())) output.push(toRepoPath(absolute));
  }
  return output;
}

if (!existsSync(manifestPath)) {
  fail(`missing provenance manifest: ${toRepoPath(manifestPath)}`);
} else {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`manifest is not valid JSON: ${error.message}`);
  }

  if (manifest) {
    if (manifest.schemaVersion !== 1) fail(`unsupported schemaVersion ${manifest.schemaVersion}; expected 1`);
    if (manifest.policy !== 'fail-closed') fail('manifest policy must be "fail-closed"');
    if (!Array.isArray(manifest.assets)) fail('manifest.assets must be an array');

    const entries = Array.isArray(manifest.assets) ? manifest.assets : [];
    const byPath = new Map();
    const ids = new Set();
    let previousPath = '';

    for (const [index, asset] of entries.entries()) {
      const label = asset?.id || `entry #${index + 1}`;
      if (!asset || typeof asset !== 'object') {
        fail(`entry #${index + 1} must be an object`);
        continue;
      }
      if (typeof asset.id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(asset.id)) fail(`${label}: invalid id`);
      else if (ids.has(asset.id)) fail(`${label}: duplicate id`);
      else ids.add(asset.id);

      if (typeof asset.path !== 'string' || !asset.path || asset.path.startsWith('/') || asset.path.includes('..')) {
        fail(`${label}: invalid repository-relative path`);
        continue;
      }
      if (asset.path < previousPath) fail(`${label}: manifest entries must be sorted lexicographically by path`);
      previousPath = asset.path;
      if (byPath.has(asset.path)) fail(`${label}: duplicate path ${asset.path}`);
      byPath.set(asset.path, asset);

      const absolute = resolve(root, asset.path);
      if (!absolute.startsWith(`${root}${sep}`) || !existsSync(absolute) || !statSync(absolute).isFile()) {
        fail(`${label}: file does not exist: ${asset.path}`);
        continue;
      }

      if (!approvedLicenses.has(asset.license)) {
        fail(`${label}: license "${asset.license}" is not in the approved allowlist`);
      }
      if (typeof asset.author !== 'string' || !asset.author.trim()) fail(`${label}: author is required`);
      if (typeof asset.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asset.retrievedAt)) fail(`${label}: retrievedAt must be YYYY-MM-DD`);
      if (!Array.isArray(asset.transformations)) fail(`${label}: transformations must be an array`);
      if (typeof asset.attribution !== 'string') fail(`${label}: attribution must be a string`);
      if (typeof asset.restrictions !== 'string') fail(`${label}: restrictions must be a string`);
      if (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.sha256)) {
        fail(`${label}: sha256 must be a 64-character hexadecimal digest`);
      } else {
        const actualHash = hashFile(absolute);
        if (actualHash.toLowerCase() !== asset.sha256.toLowerCase()) fail(`${label}: SHA-256 mismatch for ${asset.path}`);
      }

      if (asset.license === 'PROJECT-ORIGINAL') {
        if (asset.sourceUrl !== 'original-project') fail(`${label}: PROJECT-ORIGINAL sourceUrl must be "original-project"`);
      } else {
        if (typeof asset.sourceUrl !== 'string' || !/^https?:\/\//i.test(asset.sourceUrl)) fail(`${label}: external asset requires an HTTP(S) sourceUrl`);
        if (typeof asset.licenseSnapshot !== 'string' || !asset.licenseSnapshot) {
          fail(`${label}: external asset requires licenseSnapshot`);
        } else {
          const snapshot = resolve(root, asset.licenseSnapshot);
          if (!snapshot.startsWith(`${root}${sep}`) || !existsSync(snapshot) || !statSync(snapshot).isFile()) {
            fail(`${label}: license snapshot does not exist: ${asset.licenseSnapshot}`);
          }
        }
      }
    }

    const discovered = collectAssetFiles(root).sort();
    for (const file of discovered) {
      if (!byPath.has(file)) fail(`unregistered asset file: ${file}`);
    }
    for (const path of byPath.keys()) {
      if (!trackedAssetExtensions.has(extname(path).toLowerCase())) fail(`manifest entry is not a tracked asset type: ${path}`);
    }

    if (!process.exitCode) {
      console.log(`Asset provenance policy: PASS (${entries.length} registered asset${entries.length === 1 ? '' : 's'}, ${discovered.length} discovered)`);
    }
  }
}
