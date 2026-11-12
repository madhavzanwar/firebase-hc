import { useCallback, useRef, useState } from 'react';
import { ConsentDialog } from '../components/ConsentDialog';
import { BlockedError } from '../ai/engine';
import { readFile, type DocInput } from './input';
import { analyse, type StepEvent, type StepId } from './pipeline';
import { navigate } from './router';
import { useApp } from './state';

type ImageInput = Extract<DocInput, { type: 'image' }>;

export function useAnalyse() {
  const { ctx, upsertReport } = useApp();
  const [steps, setSteps] = useState<Partial<Record<StepId, StepEvent>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<{ input: ImageInput; resolve: (m: ImageInput | null) => void } | null>(null);
  const running = useRef(false);

  const run = useCallback(
    async (source: File | DocInput, opts: { sample?: string; title?: string } = {}) => {
      if (running.current) return;
      running.current = true;
      setBusy(true);
      setError(null);
      setSteps({ read: { id: 'read', status: 'running' } });
      try {
        const input = source instanceof File ? await readFile(source) : source;
        const { report } = await analyse(
          input,
          ctx({
            onStep: (e) => setSteps((s) => ({ ...s, [e.id]: e })),
            requestImageConsent: (img) => new Promise((resolve) => setConsent({ input: img, resolve })),
          }),
          opts,
        );
        await upsertReport(report);
        navigate({ name: 'report', id: report.id });
      } catch (e) {
        const code = e instanceof BlockedError ? e.reason : e instanceof Error && e.message === 'unsupported_file' ? 'unsupported_file' : 'generic';
        if (code === 'generic') console.error(e);
        setError(code);
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [ctx, upsertReport],
  );

  const dialog = consent ? (
    <ConsentDialog
      input={consent.input}
      onDone={(m) => {
        consent.resolve(m);
        setConsent(null);
      }}
    />
  ) : null;

  return { run, steps, busy, error, dialog };
}
