import { TESTS, type TestInfo } from './tests-kb';

/** Lower-case, strip punctuation (keeping Devanagari letters and marks), collapse spaces. */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[^a-z0-9ऀ-ॿ%+\s-]/g, ' ')
    .replace(/(?<=[a-z])-(?=[a-z0-9])/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normaliseName(s).split(' ').filter(Boolean);
}

interface IndexedAlias {
  test: TestInfo;
  tokens: string[];
}

const INDEX: IndexedAlias[] = TESTS.flatMap((test) =>
  test.aliases.map((alias) => ({ test, tokens: tokens(alias) })),
);

/** Tokens that change what a test means; a name with them only matches an alias that has them too. */
const QUALIFIERS = ['ratio', 'urine', 'मूत्र', 'लघवीतील', 'पेशाब', 'direct', 'indirect', 'vldl', 'non'];

/**
 * Match a printed test name ("Glucose - Fasting (FBS)", "S. Creatinine",
 * "हीमोग्लोबिन") to a known test. Every alias token must appear in the name.
 * The alias with the most tokens wins, so "HDL Cholesterol" → hdl, not total cholesterol.
 */
export function matchTest(rawName: string): TestInfo | undefined {
  const nameTokens = tokens(rawName);
  if (nameTokens.length === 0) return undefined;
  const set = new Set(nameTokens);
  let best: { test: TestInfo; score: number } | undefined;
  for (const { test, tokens: at } of INDEX) {
    if (!at.every((tok) => set.has(tok))) continue;
    // Qualifier guard: "LDL/HDL ratio" must not match "hdl"; "Urine glucose" must not match blood glucose.
    const missingQualifier = QUALIFIERS.some((q) => set.has(q) && !at.includes(q));
    if (missingQualifier) continue;
    // Single-letter aliases ("k", "na", "ca") only match when they are the whole name.
    if (at.length === 1 && (at[0]?.length ?? 0) <= 2 && nameTokens.length > 1) continue;
    const score = at.length * 10 + at.join(' ').length / 100;
    if (!best || score > best.score) best = { test, score };
  }
  return best?.test;
}
