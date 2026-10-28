import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage and project navigation work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
  await page.goto('/#project/storyera');
  await expect(page.getByRole('heading', { name: 'StoryEra', level: 1 })).toBeVisible();
});

test('homepage has no critical automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
});

test('data saver visitors choose whether to load the 3D model', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
  let modelRequested = false;
  page.on('request', (request) => { if (request.url().includes('digital_double.glb')) modelRequested = true; });
  await page.goto('/#digital-double');
  await expect(page.getByRole('button', { name: 'Load the 3D model (about 8 MB)' })).toBeVisible();
  expect(modelRequested).toBe(false);
  await page.getByRole('button', { name: 'Load the 3D model (about 8 MB)' }).click();
  await expect.poll(() => modelRequested).toBe(true);
});
