// Generates PWA icons and the sample documents (PNG "photos" and text PDFs)
// from the synthetic fixtures. Run: node scripts/make-assets.mjs
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const pub = join(root, 'public');
const out = join(pub, 'samples');
mkdirSync(out, { recursive: true });

const deva = (w) => `file://${join(root, `node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-${w}-normal.woff2`)}`;
const latin = (w) => `file://${join(root, `node_modules/@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-latin-${w}-normal.woff2`)}`;
const fonts = `
@font-face{font-family:Doc;font-weight:400;src:url(${latin(400)})}
@font-face{font-family:Doc;font-weight:400;src:url(${deva(400)});unicode-range:U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF}
@font-face{font-family:Doc;font-weight:600;src:url(${latin(600)})}
@font-face{font-family:Doc;font-weight:600;src:url(${deva(600)});unicode-range:U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF}`;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Render fixture text as a printed report: header lines, then a table of column rows. */
function reportHtml(text, { photo }) {
  const lines = text.trimEnd().split('\n');
  const [title, sub, ...rest] = lines;
  const body = rest
    .map((l) => {
      if (!l.trim()) return '<div class="gap"></div>';
      const cols = l.split(/\s{2,}/).filter(Boolean);
      if (cols.length >= 3) return `<div class="row">${cols.map((c) => `<span>${esc(c)}</span>`).join('')}</div>`;
      if (/^[A-Z ()]+$/.test(l.trim()) || /^Rx$/.test(l.trim())) return `<h3>${esc(l.trim())}</h3>`;
      return `<p>${esc(l)}</p>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
  body{margin:0;background:${photo ? '#8a8174' : '#fff'};font-family:Doc,sans-serif}
  .page{width:760px;margin:${photo ? '40px auto' : '0 auto'};background:#fffdf7;padding:36px 44px;color:#1b1b1b;
    ${photo ? 'transform:rotate(-1.2deg);box-shadow:0 18px 40px rgba(0,0,0,.45);filter:contrast(1.05) saturate(.9);' : ''}}
  h1{font-size:22px;margin:0;color:#0b4f6c;letter-spacing:.5px} .sub{font-size:12px;color:#555;border-bottom:2px solid #0b4f6c;padding-bottom:10px;margin:4px 0 14px}
  p{margin:3px 0;font-size:14px} h3{font-size:14px;margin:16px 0 6px;background:#e8f1f5;padding:4px 8px}
  .row{display:grid;grid-template-columns:2.2fr 1fr 1.2fr 1.6fr;gap:8px;font-size:14px;padding:4px 8px;border-bottom:1px solid #e3e3e3}
  .row span:nth-child(2){font-weight:600} .gap{height:8px}
  .foot{margin-top:24px;font-size:11px;color:#777;border-top:1px solid #ccc;padding-top:8px}
  </style></head><body><div class="page"><h1>${esc(title)}</h1><div class="sub">${esc(sub ?? '')}</div>${body}
  <div class="foot">SYNTHETIC DOCUMENT · fictional person · generated for LabLens testing · not a real medical record</div></div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

// Icons
const svg = readFileSync(join(pub, 'icon.svg'), 'utf8');
for (const [name, size, pad] of [['pwa-192.png', 192, 0], ['pwa-512.png', 512, 0], ['pwa-512-maskable.png', 512, 0.12], ['apple-touch-icon.png', 180, 0.08]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0f766e;display:grid;place-items:center;height:${size}px">
    <div style="width:${size * (1 - pad * 2)}px;height:${size * (1 - pad * 2)}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: join(pub, name) });
}

// Sample documents
const photos = ['en-cbc-anaemia.txt', 'hi-thyroid-vitamins.txt'];
const pdfs = ['en-diabetes-lipid-mar.txt', 'en-kidney-critical.txt', 'en-prescription.txt'];
const texts = ['mr-cbc-dengue.txt', 'mr-diabetes.txt', 'en-liver-urine.txt', 'hi-prescription.txt', 'en-diabetes-lipid-mar.txt', 'en-diabetes-followup-jun.txt', 'en-diabetes-followup-sep.txt'];
await page.setViewportSize({ width: 860, height: 300 });
for (const f of photos) {
  await page.setContent(reportHtml(readFileSync(join(root, 'fixtures', f), 'utf8'), { photo: true }));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, f.replace('.txt', '.png')), fullPage: true });
}
for (const f of pdfs) {
  await page.setContent(reportHtml(readFileSync(join(root, 'fixtures', f), 'utf8'), { photo: false }));
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: join(out, f.replace('.txt', '.pdf')), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm' } });
}
for (const f of texts) copyFileSync(join(root, 'fixtures', f), join(out, f));
await browser.close();
console.log('assets written');
