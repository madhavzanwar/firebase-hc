import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { installFakeNano, mockCloud, removeNano } from './mocks';

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const summary = r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
  expect(summary).toEqual([]);
}

test('WCAG 2.1 AA: home, report (EN + HI), history, privacy, help', async ({ page }) => {
  await installFakeNano(page);
  await mockCloud(page);
  await page.goto('/');
  await axe(page);
  await page.getByTestId('sample-kidney').click();
  await expect(page.getByTestId('report')).toBeVisible();
  await page.getByTestId('checklist-button').click();
  await expect(page.getByTestId('checklist')).toBeVisible();
  await axe(page);
  await page.getByTestId('lang-hi').click();
  await expect(page.getByTestId('summary-text')).toBeVisible();
  await axe(page);
  for (const path of ['/#/history', '/#/privacy', '/#/help']) {
    await page.goto(path);
    await page.waitForTimeout(300);
    await axe(page);
  }
});

test('WCAG 2.1 AA: image consent dialog, keyboard reachable', async ({ page }) => {
  await removeNano(page);
  await mockCloud(page);
  await page.goto('/');
  await page.getByTestId('sample-cbc').click();
  await expect(page.getByTestId('consent-dialog')).toBeVisible();
  await axe(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('consent-dialog')).toBeHidden();
});
