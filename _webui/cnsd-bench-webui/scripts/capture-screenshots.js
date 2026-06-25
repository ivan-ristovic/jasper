const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const APP_ROOT = path.resolve(__dirname, '..');
const BENCH_ROOT = path.resolve(APP_ROOT, '..', '..');
const PAPER_DIR = path.resolve(BENCH_ROOT, '..', '..', 'paper');
const PORT = process.env.JASPER_SCREENSHOT_PORT || process.env.CNSD_BENCH_SCREENSHOT_PORT || '5188';
const HOST = '127.0.0.1';
const CHROMIUM = process.env.CHROMIUM || 'chromium';
const MAGICK = process.env.MAGICK || 'magick';
const VIEWPORT = { width: 1440, height: 960 };

// Crops are derived from deterministic full-page screenshots for paper figures.
const PANEL_CROPS = [
  {
    source: 'webui-dashboard.png',
    output: 'webui-dashboard-left.png',
    geometry: '372x852+14+94'
  },
  {
    source: 'webui-dashboard.png',
    output: 'webui-dashboard-center.png',
    geometry: '496x852+400+94'
  },
  {
    source: 'webui-logs.png',
    output: 'webui-dashboard-right.png',
    geometry: '516x852+910+94'
  }
];

function waitForServer() {
  const deadline = Date.now() + 10000;
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://${HOST}:${PORT}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error('Timed out waiting for web UI server'));
      else setTimeout(check, 150);
    };
    check();
  });
}

function runChromium(url, output) {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROMIUM, [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--virtual-time-budget=1200',
      `--screenshot=${output}`,
      url
    ], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${CHROMIUM} exited with code ${code}`));
    });
  });
}

function cropImage(input, output, geometry) {
  return new Promise((resolve, reject) => {
    const child = spawn(MAGICK, [input, '-crop', geometry, '+repage', output], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${MAGICK} exited with code ${code}`));
    });
  });
}

async function main() {
  fs.mkdirSync(PAPER_DIR, { recursive: true });
  const server = spawn(process.execPath, ['server.js'], {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      JASPER_WEBUI_HOST: HOST,
      JASPER_WEBUI_PORT: PORT
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer();
    await runChromium(`http://${HOST}:${PORT}/?demo=config`, path.join(PAPER_DIR, 'webui-dashboard.png'));
    await runChromium(`http://${HOST}:${PORT}/?demo=logs`, path.join(PAPER_DIR, 'webui-logs.png'));
    for (const crop of PANEL_CROPS) {
      await cropImage(
        path.join(PAPER_DIR, crop.source),
        path.join(PAPER_DIR, crop.output),
        crop.geometry
      );
      console.log(`${crop.output} written to ${PAPER_DIR}`);
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
