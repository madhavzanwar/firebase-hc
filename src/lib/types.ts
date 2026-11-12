import type { ClassifiedRow, Sex } from './classify';
import type { Lang } from './i18n-types';
import type { DocKind } from './parse-report';
import type { PiiType } from './redact';
import type { Medicine } from './rx';

/** Where an answer was produced. `rules` = LabLens's deterministic engine, no model. */
export type Source = 'on_device' | 'in_cloud' | 'rules';

export interface Narrative {
  text: string;
  source: Source;
  model?: string;
  /** Language actually used (Nano may answer in English when Hindi isn't supported on-device). */
  lang: Lang;
  at: number;
}

/** A saved report. Only redacted, structured data is ever stored, locally or in Firestore. */
export interface SavedReport {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** yyyy-mm-dd from the report, or the upload date. */
  date: string;
  title: string;
  kind: DocKind;
  sex: Sex;
  age?: number;
  rows: ClassifiedRow[];
  medicines: Medicine[];
  /** How the content was read. */
  readSource: Source;
  /** Counts of masked identifiers by type. */
  redactions: Partial<Record<PiiType, number>>;
  /** The redacted text (kept on this device only; never synced). */
  redactedText?: string;
  summaries: Partial<Record<Lang, Narrative>>;
  checklist?: Partial<Record<Lang, { items: string[]; source: Source; at: number }>>;
  deep?: Partial<Record<Lang, Narrative>>;
  qa?: Array<{ q: string; a: string; source: Source; lang: Lang; at: number }>;
  sample?: string;
}

export interface PrivacyLogEntry {
  id: string;
  at: number;
  task: string;
  route: string;
  source: Source | 'blocked';
  model?: string;
  /** Exactly what left the device (text, after redaction). Empty for on-device / rules. */
  payload?: string;
  chars: number;
  imageSent?: boolean;
  note?: string;
}
