import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { installFakeNano, mockCloud, nanoCalls, removeNano } from './mocks';

const samples = join(import.meta.dirname, '../public/samples');
const PII = ['Priya', 'Deshmukh', '98765', '43210', 'priya.d.fake', 'Shanti Kunj', 'SDL-2026', 'Kulkarni', 'Ganesh', 'Patil', 'LH-55120', 'Meera', '2456 7890', 'Rajesh', 'Verma', '91234', '2345 6789 0123'];

function expectNoPii(bodies: string[]) {
  for (const b of bodies) for (const s of PII) expect(b, `cloud request leaked "${s}"`).not.toContain(s);
}

test.describe('hybrid path: Gemini Nano available', () => {
  test('upload → on-device explanation → Hindi/Marathi switch → history', async ({ page }) => {
    await installFakeNano(page, { langs: ['en'] });
    const cloud = await mockCloud(page);
    await page.goto('/');
    await expect(page.getByTestId('nano-status')).toHaveAttribute('data-status', 'available');

    // Upload a photo of a report: Gemini Nano reads it on the device.
    await page.getByTestId('file-input').setInputFiles(join(samples, 'en-cbc-anaemia.png'));
    await expect(page.getByTestId('report')).toBeVisible();
    const calls = await nanoCalls(page);
    expect(calls.some((c) => c.hasImage)).toBe(true);

    // Every answer carries a source badge; here both ran on-device.
    const summary = page.getByTestId('summary');
    await expect(summary.getByTestId('source-badge')).toHaveAttribute('data-source', 'on_device');
    await expect(page.getByTestId('summary-text')).toContainText('NANO-SUMMARY');
    await expect(page.locator('[data-test-id="haemoglobin"]')).toHaveAttribute('data-flag', 'low');
    await expect(page.locator('[data-test-id="haemoglobin"]')).toContainText('Talk to your doctor about');
    expect(cloud.bodies).toHaveLength(0); // nothing left the device

    // Switch to Hindi: value explanations are translated locally; Nano can't write Hindi,
    // so the narrative goes to the cloud with redacted, minimised findings only.
    await page.getByTestId('lang-hi').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi-IN');
    await expect(page.locator('[data-test-id="haemoglobin"]')).toContainText('हीमोग्लोबिन');
    await expect(page.locator('[data-test-id="haemoglobin"]')).toContainText('डॉक्टर');
    await expect(page.getByTestId('summary-text')).toContainText('CLOUD-SUMMARY-HI');
    await expect(summary.getByTestId('source-badge')).toHaveAttribute('data-source', 'in_cloud');
    expect(cloud.bodies.length).toBe(1);
    expect(cloud.bodies[0]).toContain('Haemoglobin: 9.8 g/dL');
    expectNoPii(cloud.bodies);

    // Marathi.
    await page.getByTestId('lang-mr').click();
    await expect(page.locator('[data-test-id="haemoglobin"]')).toContainText('हिमोग्लोबिन');
    await expect(page.getByTestId('summary-text')).toContainText('CLOUD-SUMMARY-MR');

    // Back to English: cached on-device summary.
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('summary-text')).toContainText('NANO-SUMMARY');

    // Ask a follow-up question (personal details in the question are masked first).
    await page.getByTestId('ask-input').fill('My phone is 98765 43210, what does low haemoglobin mean?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByTestId('qa')).toContainText('NANO-ANSWER');
    const askCall = (await nanoCalls(page)).find((c) => /Answer the patient's question/.test(c.text));
    expect(askCall?.text).toContain('[PHONE]');
    expect(askCall?.text).not.toContain('98765');

    // History lists the report.
    await page.getByRole('link', { name: 'History' }).click();
    await expect(page.getByTestId('history-list')).toContainText('en-cbc-anaemia');

    // The privacy log shows where each step ran.
    await page.getByRole('link', { name: 'Privacy log' }).click();
    await expect(page.getByTestId('privacy-log').locator('[data-source="on_device"]').first()).toBeVisible();
    await expect(page.getByTestId('privacy-log').locator('[data-source="in_cloud"]').first()).toBeVisible();
  });

  test('trend chart across three reports of the same person', async ({ page }) => {
    await installFakeNano(page);
    await mockCloud(page);
    await page.goto('/#/history');
    await page.getByTestId('load-series').click();
    await expect(page.getByTestId('trend-chart')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('trend-select')).toHaveValue('hba1c');
    await expect(page.locator('table')).toContainText('7.6');
    await expect(page.locator('table')).toContainText('6.4');
  });
});

test.describe('fallback path: no Gemini Nano', () => {
  test('text PDF → rules redaction → cloud summary on redacted data, urgent banner', async ({ page }) => {
    await removeNano(page);
    const cloud = await mockCloud(page);
    await page.goto('/');
    await expect(page.getByTestId('nano-status')).toHaveAttribute('data-status', 'no_api');
    await page.getByTestId('sample-kidney').click();
    await expect(page.getByTestId('report')).toBeVisible();
    await expect(page.getByTestId('urgent-banner')).toContainText('Potassium');
    await expect(page.locator('[data-test-id="potassium"]')).toHaveAttribute('data-flag', 'critical_high');
    await expect(page.getByTestId('summary').getByTestId('source-badge')).toHaveAttribute('data-source', 'in_cloud');
    await expect(page.getByTestId('summary-text')).toContainText('CLOUD-SUMMARY');
    await expect(page.getByTestId('redactions')).toContainText('[NAME]');

    // Doctor checklist and deeper analysis use the cloud.
    await page.getByTestId('checklist-button').click();
    await expect(page.getByTestId('checklist')).toContainText('CLOUD-Q1');
    await page.getByRole('button', { name: 'Run deeper analysis' }).click();
    await expect(page.getByTestId('deep')).toContainText('CLOUD-DEEP');

    expect(cloud.bodies.length).toBeGreaterThanOrEqual(3);
    expectNoPii(cloud.bodies);
    expect(cloud.bodies.join('\n')).toContain('[NAME]'); // deep analysis sees placeholders, not names

    await page.getByRole('link', { name: 'Privacy log' }).click();
    await page.getByTestId('privacy-log').locator('summary').first().click();
    await expect(page.getByTestId('payload').first()).toBeVisible();
  });

  test('photo needs explicit consent and masking before going to the cloud', async ({ page }) => {
    await removeNano(page);
    const cloud = await mockCloud(page);
    await page.goto('/');
    await page.getByTestId('sample-cbc').click();
    const dialog = page.getByTestId('consent-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('consent-send')).toBeDisabled();
    await page.getByTestId('mask-top').click();
    await page.getByTestId('consent-agree').check();
    await page.getByTestId('consent-send').click();
    await expect(page.getByTestId('report')).toBeVisible();
    await expect(page.locator('[data-test-id="haemoglobin"]')).toHaveAttribute('data-flag', 'low');
    const readReq = cloud.bodies.find((b) => b.includes('inlineData'));
    expect(readReq).toBeTruthy();
  });

  test('declining consent sends nothing', async ({ page }) => {
    await removeNano(page);
    const cloud = await mockCloud(page);
    await page.goto('/');
    await page.getByTestId('sample-cbc').click();
    await page.getByTestId('consent-dialog').getByText("Don't send").click();
    await expect(page.getByTestId('error')).toContainText('not sent');
    expect(cloud.bodies).toHaveLength(0);
  });

  test('on-device-only mode never calls the cloud and still explains with rules', async ({ page }) => {
    await removeNano(page);
    const cloud = await mockCloud(page);
    await page.goto('/');
    await page.getByTestId('on-device-only').check({ force: true });
    await page.getByTestId('sample-liver').click();
    await expect(page.getByTestId('report')).toBeVisible();
    await expect(page.getByTestId('summary').getByTestId('source-badge')).toHaveAttribute('data-source', 'rules');
    await expect(page.locator('[data-test-id="alt"]')).toHaveAttribute('data-flag', 'high');
    await page.getByTestId('lang-mr').click();
    await expect(page.getByTestId('summary-text')).toContainText('मर्यादेबाहेर');
    expect(cloud.bodies).toHaveLength(0);
  });
});

test('offline with Gemini Nano: the whole flow runs on the device', async ({ page, context }) => {
  await installFakeNano(page);
  const cloud = await mockCloud(page);
  await page.goto('/');
  await expect(page.getByTestId('nano-status')).toHaveAttribute('data-status', 'available');
  await context.setOffline(true);
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await page.getByTestId('file-input').setInputFiles(join(samples, 'mr-cbc-dengue.txt'));
  await expect(page.getByTestId('report')).toBeVisible();
  await expect(page.getByTestId('summary').getByTestId('source-badge')).toHaveAttribute('data-source', 'on_device');
  await expect(page.locator('[data-test-id="platelets"]')).toHaveAttribute('data-flag', 'low');
  // Marathi while offline: Nano answers in English, value explanations stay Marathi.
  await page.getByTestId('lang-mr').click();
  await expect(page.locator('[data-test-id="platelets"]')).toContainText('प्लेटलेट्स');
  await expect(page.getByTestId('summary')).toContainText('इंग्रजीत');
  expect(cloud.bodies).toHaveLength(0);
  await context.setOffline(false);
});
