import { execFile, spawn, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4173);
const externalUrl = process.env.SMOKE_URL?.trim();
const url = externalUrl || `http://127.0.0.1:${port}/`;

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
      const response = await fetch(url, { redirect: 'follow' });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, externalUrl ? 500 : 150));
  }
  throw new Error(`Preview did not become ready at ${url}: ${lastError?.message ?? 'unknown error'}`);
}

async function runViewport(chrome, label, width, height) {
  const profileDir = `/tmp/jta-chrome-${process.pid}-${label}`;
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    `--window-size=${width},${height}`,
    '--virtual-time-budget=6000',
    '--dump-dom',
    url,
  ];
  const { stdout, stderr } = await execFileAsync(chrome, args, { timeout: 35000, maxBuffer: 8 * 1024 * 1024 });
  const browserOutput = `${stdout}\n${stderr ?? ''}`;
  if (!stdout.includes('class="game-hud"')) throw new Error(`${label}: game HUD was not mounted`);
  if (!stdout.includes('data-action="skill4"')) throw new Error(`${label}: skill controls missing`);
  if (!stdout.includes('data-joystick')) throw new Error(`${label}: touch joystick missing`);
  if (!stdout.includes('<canvas')) throw new Error(`${label}: renderer canvas missing`);
  if (stdout.includes('fatal-card')) throw new Error(`${label}: fatal startup UI detected`);
  if (/404 \(Not Found\)|ERR_FILE_NOT_FOUND|Failed to load resource/i.test(browserOutput)) {
    throw new Error(`${label}: browser reported a missing resource`);
  }
  console.log(`Browser smoke ${label}: PASS (${width}x${height}) · ${url}`);
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
  await runViewport(chrome, externalUrl ? 'public-desktop' : 'desktop', 1440, 900);
  await runViewport(chrome, externalUrl ? 'public-mobile' : 'mobile', 390, 844);
} finally {
  server?.kill('SIGTERM');
}

if (server?.exitCode && server.exitCode !== 0) throw new Error(`Preview server failed: ${serverOutput}`);
console.log(`Browser smoke suite: PASS (${externalUrl ? 'public deployment' : 'local dist'})`);
