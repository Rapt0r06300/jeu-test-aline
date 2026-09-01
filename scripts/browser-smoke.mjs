import { execFile, spawn, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4173);
const externalUrl = process.env.SMOKE_URL?.trim();
const titleUrl = externalUrl || `http://127.0.0.1:${port}/`;

function withQuery(base, values) {
  const target = new URL(base);
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  return target.toString();
}

const gameplayUrl = withQuery(titleUrl, {
  autostart: '1',
  intro: 'skip',
  ...(externalUrl ? {} : { renderer: 'fallback' }),
});
const introUrl = externalUrl ? null : withQuery(titleUrl, {
  autostart: '1',
  renderer: 'fallback',
});

function findChrome() {
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const result = spawnSync('which', [name], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chrome/Chromium executable not found on runner');
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(titleUrl, { redirect: 'follow' });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, externalUrl ? 500 : 150));
  }
  throw new Error(`Preview did not become ready at ${titleUrl}: ${lastError?.message ?? 'unknown error'}`);
}

async function dumpViewport(chrome, label, width, height, targetUrl, budget = 6000) {
  const profileDir = `/tmp/jta-chrome-${process.pid}-${label}`;
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    `--virtual-time-budget=${budget}`,
    '--dump-dom',
    targetUrl,
  ];
  const { stdout, stderr } = await execFileAsync(chrome, args, { timeout: 35000, maxBuffer: 8 * 1024 * 1024 });
  return { stdout, browserOutput: `${stdout}\n${stderr ?? ''}` };
}

function assertNoBrowserFailures(label, stdout, browserOutput) {
  if (stdout.includes('fatal-card')) throw new Error(`${label}: fatal startup UI detected`);
  if (/404 \(Not Found\)|ERR_FILE_NOT_FOUND|Failed to load resource/i.test(browserOutput)) {
    throw new Error(`${label}: browser reported a missing resource`);
  }
}

async function runTitleViewport(chrome, label, width, height) {
  const { stdout, browserOutput } = await dumpViewport(chrome, label, width, height, titleUrl, 2500);
  if (!stdout.includes('data-presentation-phase="title"')) throw new Error(`${label}: title screen was not mounted`);
  if (!stdout.includes('data-title-action="new-game"')) throw new Error(`${label}: first-launch Play action missing`);
  if (!stdout.includes('data-title-action="settings"')) throw new Error(`${label}: Settings action missing`);
  if (!stdout.includes('Le Chant')) throw new Error(`${label}: original title identity missing`);
  if (stdout.includes('class="game-hud"')) throw new Error(`${label}: gameplay leaked behind the title before player intent`);
  assertNoBrowserFailures(label, stdout, browserOutput);
  console.log(`Browser smoke ${label}: PASS (${width}x${height}) · ${titleUrl}`);
}

async function runIntroViewport(chrome, label, width, height) {
  const { stdout, browserOutput } = await dumpViewport(chrome, label, width, height, introUrl, 2800);
  if (!stdout.includes('data-presentation-phase="intro"')) throw new Error(`${label}: intro cinematic was not mounted`);
  if (!stdout.includes('data-intro-skip')) throw new Error(`${label}: cinematic Skip control missing`);
  if (!stdout.includes('Brume Creuse')) throw new Error(`${label}: narrative danger hook missing`);
  if (!stdout.includes('Eldervale')) throw new Error(`${label}: location hook missing`);
  if (!stdout.includes('class="game-hud"')) throw new Error(`${label}: game HUD should be mounted under the cinematic handoff`);
  assertNoBrowserFailures(label, stdout, browserOutput);
  console.log(`Browser smoke ${label}: PASS (${width}x${height}) · cinematic visible`);
}

async function runGameplayViewport(chrome, label, width, height) {
  const { stdout, browserOutput } = await dumpViewport(chrome, label, width, height, gameplayUrl, 6500);
  if (!stdout.includes('class="game-hud"')) throw new Error(`${label}: game HUD was not mounted after intro skip`);
  if (!stdout.includes('data-action="skill4"')) throw new Error(`${label}: skill controls missing`);
  if (!stdout.includes('data-joystick')) throw new Error(`${label}: touch joystick missing`);
  if (!stdout.includes('<canvas')) throw new Error(`${label}: renderer canvas missing`);
  if (!stdout.includes('Elyra')) throw new Error(`${label}: intro handoff did not expose the first gameplay objective`);
  if (stdout.includes('data-presentation-phase="intro"')) throw new Error(`${label}: intro overlay remained after deterministic skip`);
  assertNoBrowserFailures(label, stdout, browserOutput);
  console.log(`Browser smoke ${label}: PASS (${width}x${height}) · ${gameplayUrl}`);
}

const chrome = findChrome();
let server = null;
let serverOutput = '';

if (!externalUrl) {
  server = spawn(process.execPath, ['scripts/serve.mjs', '--dist'], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
}

try {
  await waitForServer();
  const prefix = externalUrl ? 'public-' : '';
  await runTitleViewport(chrome, `${prefix}title-desktop`, 1440, 900);
  await runTitleViewport(chrome, `${prefix}title-mobile`, 390, 844);
  if (!externalUrl) await runIntroViewport(chrome, 'intro-desktop', 1440, 900);
  await runGameplayViewport(chrome, `${prefix}desktop`, 1440, 900);
  await runGameplayViewport(chrome, `${prefix}mobile`, 390, 844);
  await runGameplayViewport(chrome, `${prefix}mobile-narrow`, 320, 568);
  await runGameplayViewport(chrome, `${prefix}mobile-landscape`, 844, 390);
} finally {
  server?.kill('SIGTERM');
}

if (server?.exitCode && server.exitCode !== 0) throw new Error(`Preview server failed: ${serverOutput}`);
console.log(`Browser smoke suite: PASS (${externalUrl ? 'public deployment' : 'local dist'})`);
