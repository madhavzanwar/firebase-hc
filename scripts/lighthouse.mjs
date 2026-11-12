// Lighthouse gate: builds nothing, expects `npm run build` first. Serves dist/,
// runs Lighthouse (mobile) on the home page and a report page, checks the PWA
// installability basics (manifest + service worker), and writes docs/qa-artifacts/lighthouse.json.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const root = join(import.meta.dirname, '..');
const chromePath = process.env.CHROME_PATH ?? ['/opt/pw-browsers/chromium/chrome-linux64/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome'].find(existsSync);
const port = 4174;
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));

const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
const urls = [`http://localhost:${port}/`, `http://localhost:${port}/#/help`, `http://localhost:${port}/#/history`];
const results = [];
let ok = true;
const MIN = { accessibility: 0.95, 'best-practices': 0.9, seo: 0.9 };
try {
  for (const url of urls) {
    const r = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    const lhr = r.lhr;
    const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, v.score]));
    const failing = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary')
      .map((a) => a.id);
    results.push({ url, scores, failingBinaryAudits: failing });
    for (const [k, min] of Object.entries(MIN)) if ((scores[k] ?? 0) < min) ok = false;
    console.log(url, JSON.stringify(scores), failing.length ? `failing: ${failing.join(', ')}` : '');
  }
  // Installability basics (Lighthouse 12+ no longer has a PWA category).
  const manifest = await (await fetch(`http://localhost:${port}/manifest.webmanifest`)).json();
  const sw = await fetch(`http://localhost:${port}/sw.js`);
  const pwa = {
    manifest: !!manifest.name && manifest.display === 'standalone' && manifest.icons?.some((i) => i.sizes === '512x512'),
    maskableIcon: manifest.icons?.some((i) => i.purpose === 'maskable'),
    serviceWorker: sw.ok,
    startUrl: manifest.start_url,
  };
  console.log('PWA', JSON.stringify(pwa));
  if (!pwa.manifest || !pwa.serviceWorker) ok = false;
  mkdirSync(join(root, 'docs/qa-artifacts'), { recursive: true });
  writeFileSync(join(root, 'docs/qa-artifacts/lighthouse.json'), JSON.stringify({ when: new Date().toISOString(), results, pwa }, null, 2));
} finally {
  await chrome.kill();
  server.kill();
}
if (!ok) {
  console.error('Lighthouse thresholds not met');
  process.exit(1);
}
