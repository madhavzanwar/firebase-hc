import { Camera, ClipboardPaste, FileText, FileUp, Image as ImageIcon, ShieldCheck, Scale, Sparkles, TriangleAlert } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchSampleFile, SAMPLES } from '../app/samples';
import { useApp } from '../app/state';
import { useAnalyse } from '../app/useAnalyse';
import { Steps } from '../components/Steps';

export function Home() {
  const { t } = useTranslation();
  const { lang } = useApp();
  const { run, steps, busy, error, dialog } = useAnalyse();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLDialogElement>(null);
  const [pasted, setPasted] = useState('');
  const [drag, setDrag] = useState(false);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void run(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t('home.title')}</h1>
          <p className="mt-3 text-base text-slate-700 sm:text-lg">{t('home.subtitle')}</p>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-600/30">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t('home.disclaimer')}
          </p>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold">{t('home.upload')}</h2>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`mt-3 rounded-xl border-2 border-dashed p-5 text-center transition ${drag ? 'border-brand-600 bg-brand-50' : 'border-slate-300'}`}
          >
            <FileUp aria-hidden="true" className="mx-auto size-8 text-brand-700" />
            <p className="mt-2 text-sm text-slate-700">{t('home.dropHint')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <FileText aria-hidden="true" className="size-4" />
                {t('home.choose')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => camRef.current?.click()} disabled={busy}>
                <Camera aria-hidden="true" className="size-4" />
                {t('home.camera')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => pasteRef.current?.showModal()} disabled={busy}>
                <ClipboardPaste aria-hidden="true" className="size-4" />
                {t('home.paste')}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf,image/*,text/plain" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFiles(e.target.files)} data-testid="file-input" />
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFiles(e.target.files)} />
          </div>
          {(busy || Object.keys(steps).length > 0) && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <Steps steps={steps} />
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-900 ring-1 ring-red-600/30" data-testid="error">
              {t(`errors.${error}`, { defaultValue: t('errors.generic') })}
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="samples-h">
        <h2 id="samples-h" className="text-lg font-bold">{t('home.samples')}</h2>
        <p className="text-sm text-slate-600">{t('home.samplesHint')}</p>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void fetchSampleFile(s.file).then((f) => run(f, { sample: s.id, title: s.title.en }))}
                className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-brand-600 hover:shadow disabled:opacity-50"
                data-testid={`sample-${s.id}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
                  {s.format === 'photo' ? <ImageIcon aria-hidden="true" className="size-5" /> : <FileText aria-hidden="true" className="size-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-slate-900">{s.title[lang]}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    {s.format} · {s.docLang}
                    {s.urgent ? ' · ⚠' : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-h" className="card">
        <h2 id="how-h" className="text-lg font-bold">{t('home.how')}</h2>
        <ol className="mt-4 grid gap-5 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, k: 'how1' },
            { icon: Scale, k: 'how2' },
            { icon: Sparkles, k: 'how3' },
          ].map(({ icon: Icon, k }, i) => (
            <li key={k} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-700 font-bold text-white">{i + 1}</span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  <Icon aria-hidden="true" className="size-4 text-brand-700" />
                  {t(`home.${k}t`)}
                </p>
                <p className="mt-1 text-sm text-slate-700">{t(`home.${k}`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <dialog ref={pasteRef} aria-labelledby="paste-h" className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl backdrop:bg-slate-900/60">
        <form
          method="dialog"
          onSubmit={() => {
            if (pasted.trim()) void run({ type: 'text', text: pasted, pages: 1, fileName: 'Pasted report' });
          }}
        >
          <h2 id="paste-h" className="text-lg font-bold">{t('home.pasteTitle')}</h2>
          <label htmlFor="paste-text" className="sr-only">{t('home.pasteTitle')}</label>
          <textarea
            id="paste-text"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            className="mt-3 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm"
            placeholder={t('home.pastePlaceholder')}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => pasteRef.current?.close()}>{t('home.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={!pasted.trim()}>{t('home.analyse')}</button>
          </div>
        </form>
      </dialog>
      {dialog}
    </div>
  );
}
