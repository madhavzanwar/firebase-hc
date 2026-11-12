async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/** Normalised input. Images are always re-encoded as JPEG so Gemini Nano can read them. */
export type DocInput =
  | { type: 'text'; text: string; pages: number; fileName: string }
  | { type: 'image'; data: string; mimeType: 'image/jpeg'; dataUrl: string; width: number; height: number; fileName: string; pages: number };

const MAX_SIDE = 1600;

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
}

/** Rebuild visual lines from pdf.js text items, using wide gaps as column separators. */
export function itemsToLines(items: PdfTextItem[]): string {
  const rows: Array<{ y: number; items: PdfTextItem[] }> = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const y = it.transform[5] ?? 0;
    const row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (row) row.items.push(it);
    else rows.push({ y, items: [it] });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.items.sort((a, b) => (a.transform[4] ?? 0) - (b.transform[4] ?? 0));
      let line = '';
      let lastEnd = -Infinity;
      for (const it of r.items) {
        const x = it.transform[4] ?? 0;
        const gap = x - lastEnd;
        if (line) line += gap > 12 ? '    ' : gap > 1.5 ? ' ' : '';
        line += it.str;
        lastEnd = x + it.width;
      }
      return line;
    })
    .join('\n');
}

async function readPdf(file: File): Promise<DocInput> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    texts.push(itemsToLines(content.items as PdfTextItem[]));
  }
  const text = texts.join('\n\n');
  if (text.replace(/\s/g, '').length > 80) return { type: 'text', text, pages: doc.numPages, fileName: file.name };

  // Scanned PDF (no text layer): rasterise the first pages into one tall JPEG.
  const pages = Math.min(doc.numPages, 3);
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas');
    c.width = vp.width;
    c.height = vp.height;
    await page.render({ canvas: c, viewport: vp }).promise;
    canvases.push(c);
  }
  const width = Math.max(...canvases.map((c) => c.width));
  const height = canvases.reduce((s, c) => s + c.height, 0);
  const all = document.createElement('canvas');
  all.width = width;
  all.height = height;
  const ctx = all.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }
  return { ...canvasToJpeg(all, file.name), pages: doc.numPages };
}

export function canvasToJpeg(source: HTMLCanvasElement | HTMLImageElement | ImageBitmap, fileName: string) {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.9);
  return { type: 'image' as const, data: dataUrl.split(',')[1] ?? '', mimeType: 'image/jpeg' as const, dataUrl, width: c.width, height: c.height, fileName, pages: 1 };
}

async function readImage(file: File): Promise<DocInput> {
  const bitmap = await createImageBitmap(file);
  return canvasToJpeg(bitmap, file.name);
}

export async function readFile(file: File): Promise<DocInput> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return readPdf(file);
  if (file.type.startsWith('image/')) return readImage(file);
  if (file.type.startsWith('text/') || /\.txt$/i.test(file.name)) return { type: 'text', text: await file.text(), pages: 1, fileName: file.name };
  throw new Error('unsupported_file');
}

/** Paint black boxes over an image (user-drawn masks) and re-encode. Coordinates are 0..1 fractions. */
export function applyMasks(input: Extract<DocInput, { type: 'image' }>, boxes: Array<{ x: number; y: number; w: number; h: number }>): Promise<Extract<DocInput, { type: 'image' }>> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = input.width;
      c.height = input.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = '#000';
      for (const b of boxes) ctx.fillRect(b.x * c.width, b.y * c.height, b.w * c.width, b.h * c.height);
      resolve({ ...canvasToJpeg(c, input.fileName), pages: input.pages });
    };
    img.onerror = reject;
    img.src = input.dataUrl;
  });
}
