import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudUpload, Undo2, X } from 'lucide-react';
import { applyMasks, type DocInput } from '../app/input';

type ImageInput = Extract<DocInput, { type: 'image' }>;
type Box = { x: number; y: number; w: number; h: number };

/**
 * Explicit, per-image consent before a raw image is sent to the cloud.
 * The user covers personal details first, and only the masked image is sent.
 */
export function ConsentDialog({ input, onDone }: { input: ImageInput; onDone: (masked: ImageInput | null) => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const imgWrap = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const pos = (e: PointerEvent) => {
    const r = imgWrap.current!.getBoundingClientRect();
    return { x: Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1), y: Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1) };
  };
  const down = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = pos(e);
  };
  const move = (e: PointerEvent) => {
    if (!start.current) return;
    const p = pos(e);
    const s = start.current;
    setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => {
    if (draft && draft.w > 0.01 && draft.h > 0.005) setBoxes((b) => [...b, draft]);
    setDraft(null);
    start.current = null;
  };

  const send = async () => {
    setBusy(true);
    try {
      onDone(await applyMasks(input, boxes));
    } finally {
      setBusy(false);
    }
  };

  const all = draft ? [...boxes, draft] : boxes;
  return (
    <dialog
      ref={ref}
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="m-auto w-[min(44rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/60"
      onCancel={(e) => {
        e.preventDefault();
        onDone(null);
      }}
      data-testid="consent-dialog"
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 id="consent-title" className="text-lg font-bold">{t('consent.title')}</h2>
            <p id="consent-body" className="mt-1 text-sm text-slate-700">{t('consent.body')}</p>
          </div>
          <button type="button" className="btn-ghost min-h-9 px-2" onClick={() => onDone(null)} aria-label={t('consent.cancel')}>
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="overflow-auto p-5">
          <p className="mb-2 text-sm font-medium text-slate-800">{t('consent.draw')}</p>
          <div
            ref={imgWrap}
            className="relative mx-auto max-w-md cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-slate-300"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
          >
            <img src={input.dataUrl} alt="" className="block w-full" draggable={false} />
            {all.map((b, i) => (
              <div key={i} className="absolute bg-black" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setBoxes((b) => [...b, { x: 0, y: 0, w: 1, h: 0.25 }])} data-testid="mask-top">
              {t('consent.maskTop')}
            </button>
            <button type="button" className="btn-secondary" disabled={!boxes.length} onClick={() => setBoxes((b) => b.slice(0, -1))}>
              <Undo2 aria-hidden="true" className="size-4" />
              {t('consent.undo')}
            </button>
            <span className="self-center text-sm text-slate-600" aria-live="polite">{t('consent.boxes', { count: boxes.length })}</span>
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-900">
            <input type="checkbox" className="mt-0.5 size-5 accent-brand-700" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="consent-agree" />
            {t('consent.agree')}
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
          <button type="button" className="btn-secondary" onClick={() => onDone(null)}>{t('consent.cancel')}</button>
          <button type="button" className="btn-primary" disabled={!agree || busy} onClick={() => void send()} data-testid="consent-send">
            <CloudUpload aria-hidden="true" className="size-4" />
            {t('consent.send')}
          </button>
        </div>
      </div>
    </dialog>
  );
}
