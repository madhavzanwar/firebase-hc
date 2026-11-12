import { Schema } from 'firebase/ai';
import { z } from 'zod';
import { LANG_LABELS, type Lang } from '../lib/i18n-types';

/**
 * Prompts and schemas. On-device inference ignores systemInstruction, so the
 * instructions go in the prompt itself and work the same on Nano and in the cloud.
 */

// ---------- PII detection (on-device only) ----------
export const piiSchema = Schema.object({
  properties: {
    entities: Schema.array({
      items: Schema.object({
        properties: {
          text: Schema.string(),
          type: Schema.enumString({ enum: ['NAME', 'DOCTOR', 'ADDRESS', 'ID'] }),
        },
      }),
    }),
  },
});
export const PiiOut = z.object({
  entities: z.array(z.object({ text: z.string(), type: z.enum(['NAME', 'DOCTOR', 'ADDRESS', 'ID']) })).default([]),
});

export function piiPrompt(text: string): string {
  return `You protect patient privacy. List every personal identifier that appears in the medical document below:
person names (patient, relatives, doctors), street addresses, and patient/hospital/sample ID numbers.
Copy each one exactly as written. Do NOT list test names, results, units, ranges, dates, ages or the laboratory name.
If there are none, return an empty list.

DOCUMENT:
"""
${text}
"""`;
}

// ---------- Reading a photo / structuring text ----------
export const extractSchema = Schema.object({
  properties: {
    kind: Schema.enumString({ enum: ['lab', 'prescription', 'mixed', 'other'] }),
    rows: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(),
          value: Schema.string(),
          unit: Schema.string(),
          range: Schema.string(),
        },
        optionalProperties: ['unit', 'range'],
      }),
    }),
    medicines: Schema.array({ items: Schema.string({ description: 'One medicine per line, e.g. "Tab. Metformin 500 mg 1-0-1 after food x 30 days"' }) }),
    sex: Schema.enumString({ enum: ['male', 'female', 'unknown'] }),
    age: Schema.number(),
    date: Schema.string({ description: 'Collection or report date as DD/MM/YYYY' }),
  },
  optionalProperties: ['sex', 'age', 'date', 'medicines'],
});
export const ExtractOut = z.object({
  kind: z.enum(['lab', 'prescription', 'mixed', 'other']).catch('other'),
  rows: z
    .array(z.object({ name: z.string(), value: z.union([z.string(), z.number()]).transform(String), unit: z.string().optional(), range: z.string().optional() }))
    .default([]),
  medicines: z.array(z.string()).default([]),
  sex: z.enum(['male', 'female', 'unknown']).optional().catch(undefined),
  age: z.number().optional().catch(undefined),
  date: z.string().optional().catch(undefined),
});

const EXTRACT_RULES = `Extract every test result exactly as printed: test name, result value, unit, and the reference range text.
Keep numbers exactly as printed (do not convert units). Leave unit or range empty if not printed.
If it is a prescription, list each medicine on one line in the form "Tab. Name strength pattern timing duration".
NEVER include patient or doctor names, phone numbers, addresses or ID numbers anywhere in your answer.`;

export function readImagePrompt(): string {
  return `This is a photo or scan of an Indian medical lab report or prescription (English, Hindi or Marathi).
${EXTRACT_RULES}`;
}

export function structurePrompt(redactedText: string): string {
  return `Below is the text of a medical lab report or prescription. Personal details were already replaced with [NAME], [PHONE] etc.
${EXTRACT_RULES}

TEXT:
"""
${redactedText}
"""`;
}

// ---------- Plain-language narrative ----------
const langName = (l: Lang) => LANG_LABELS[l].english;

const SAFETY = `You are not a doctor and must not diagnose or prescribe. Use simple everyday words and short sentences.
The flags (low/high/critical) were computed by rules from the report's own ranges: do not change them.`;

export function summaryPrompt(findings: string, lang: Lang, kind: string): string {
  return `${SAFETY}
Write a calm, clear summary of this ${kind === 'prescription' ? 'prescription' : 'lab report'} for the patient, in ${langName(lang)}${lang === 'en' ? '' : ` (${LANG_LABELS[lang].native} script)`}.
At most 110 words. Say which results are outside the normal range and what they usually relate to, then the one or two most important things to discuss with a doctor.
If any value is critical, start with a sentence advising them to contact a doctor today.

FINDINGS:
${findings}`;
}

export function answerPrompt(findings: string, question: string, lang: Lang): string {
  return `${SAFETY}
Answer the patient's question in ${langName(lang)} using only the findings below, in at most 90 words.
If the question needs a diagnosis, a medicine change, or information not in the findings, say so kindly and suggest asking their doctor.

FINDINGS:
${findings}

QUESTION: ${question}`;
}

export const checklistSchema = Schema.object({
  properties: { questions: Schema.array({ items: Schema.string() }) },
});
export const ChecklistOut = z.object({ questions: z.array(z.string()).default([]) });

export function checklistPrompt(findings: string, lang: Lang): string {
  return `${SAFETY}
Write 5 to 7 short, specific questions this patient could ask their doctor at the next visit, in ${langName(lang)}.
Focus on the out-of-range results, follow-up tests, lifestyle and medicines. Each question under 20 words.

FINDINGS:
${findings}`;
}

export function deepPrompt(redactedText: string, findings: string, lang: Lang): string {
  return `${SAFETY}
You are helping a patient understand a long or complex report. Write in ${langName(lang)}, at most 280 words, using short markdown headings and bullet points:
## What stands out — patterns that connect several results (for example low haemoglobin with small red cells).
## Commonly considered next steps — tests or checks doctors often consider for such patterns (not a diagnosis).
## Everyday factors — diet, activity, hydration or medicines that commonly affect these results.
End with one line reminding them to discuss this with their doctor.

STRUCTURED FINDINGS:
${findings}

FULL REPORT TEXT (personal details replaced with placeholders):
"""
${redactedText}
"""`;
}

/** Parse JSON from a model, tolerating ```json fences. */
export function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return schema.parse(JSON.parse(cleaned));
}
