import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dbManager } from '../server/db.ts';

const execFileAsync = promisify(execFile);

const PORT = 4199;
const DIST_DIR = path.resolve('dist');
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\rakes\\.gemini\\antigravity\\brain\\d0236607-b6c2-4aa0-ac72-e60282f97b5b';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Simple SPA static server with API mocks
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);

  // API endpoints backed by SQLite
  if (urlObj.pathname === '/api/projects') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dbManager.getProjects()));
    return;
  }
  if (urlObj.pathname.startsWith('/api/projects/')) {
    const id = urlObj.pathname.replace('/api/projects/', '').split('/')[0];
    const project = dbManager.getProject(id);
    if (project) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(project));
      return;
    }
  }
  if (urlObj.pathname === '/api/reminders') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dbManager.getReminders()));
    return;
  }
  if (urlObj.pathname === '/api/teams') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dbManager.getTeams()));
    return;
  }

  let filePath = path.join(DIST_DIR, urlObj.pathname);

  // If path has no extension or doesn't exist, serve index.html (SPA routing)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Preview server listening on http://localhost:${PORT}`);

const targets = [
  { name: 'dashboard_carousel_dark', path: '/?nosplash&theme=dark', label: 'Dashboard Carousel (Dark)', size: '1440,950' },
  { name: 'dashboard_carousel_full_dark', path: '/?nosplash&theme=dark', label: 'Dashboard Carousel Full (Dark)', size: '1440,1950' },
  { name: 'dashboard_carousel_light', path: '/?nosplash&theme=light', label: 'Dashboard Carousel (Light)', size: '1440,950' },
  { name: 'dashboard_carousel_full_light', path: '/?nosplash&theme=light', label: 'Dashboard Carousel Full (Light)', size: '1440,1950' },
  { name: 'dashboard_carousel_tablet', path: '/?nosplash&theme=dark', label: 'Dashboard Carousel (Tablet)', size: '820,1180' },
  { name: 'dashboard_carousel_mobile', path: '/?nosplash&theme=dark', label: 'Dashboard Carousel (Mobile Dark)', size: '390,1650' },
  { name: 'dashboard_carousel_mobile_light', path: '/?nosplash&theme=light', label: 'Dashboard Carousel (Mobile Light)', size: '390,1650' },
];

fs.mkdirSync('screenshots', { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

for (const target of targets) {
  const outPath = path.resolve(`screenshots/${target.name}.png`);
  const artifactPath = path.join(ARTIFACT_DIR, `${target.name}.png`);
  const targetUrl = `http://localhost:${PORT}${target.path}`;
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), `edge_shot_${target.name}_`));

  console.log(`Capturing ${target.label}...`);
  try {
    await execFileAsync(EDGE_PATH, [
      '--headless',
      '--disable-gpu',
      `--window-size=${target.size || '1440,900'}`,
      '--hide-scrollbars',
      '--inprivate',
      '--virtual-time-budget=2000',
      `--user-data-dir=${tmpProfile}`,
      `--screenshot=${outPath}`,
      targetUrl,
    ]);

    if (fs.existsSync(outPath)) {
      fs.copyFileSync(outPath, artifactPath);
      console.log(`  ✓ Saved ${target.name}.png (${fs.statSync(outPath).size} bytes)`);
    } else {
      console.error(`  ✗ Failed to create screenshot for ${target.name}`);
    }
  } catch (err) {
    console.error(`  ✗ Error capturing ${target.name}:`, err.message);
  } finally {
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

server.close();
console.log('All captures complete.');
