import { execFile, spawn, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const port = Number(process.env.PORT || 4173);
const url = `http://127.0.0.1:${port}/`;

function findChrome() {
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const result = spawnSync('which', [name], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('Chrome/Chromium executable not found on runner');
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Preview server did not become ready: ${lastError?.message ?? 'unknown error'}`);
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
  const { stdout } = await execFileAsync(chrome, args, { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
  if (!stdout.includes('class="game-hud"')) throw new Error(`${label}: game HUD was not mounted`);
  if (!stdout.includes('data-action="skill4"')) throw new Error(`${label}: skill controls missing`);
  if (!stdout.includes('data-joystick')) throw new Error(`${label}: touch joystick missing`);
  if (!stdout.includes('<canvas')) throw new Error(`${label}: renderer canvas missing`);
  if (stdout.includes('fatal-card')) throw new Error(`${label}: fatal startup UI detected`);
  console.log(`Browser smoke ${label}: PASS (${width}x${height})`);
}

const chrome = findChrome();
const server = spawn(process.execPath, ['scripts/serve.mjs', '--dist'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForServer();
  await runViewport(chrome, 'desktop', 1440, 900);
  await runViewport(chrome, 'mobile', 390, 844);
} finally {
  server.kill('SIGTERM');
}

if (server.exitCode && server.exitCode !== 0) throw new Error(`Preview server failed: ${serverOutput}`);
console.log('Browser smoke suite: PASS');
