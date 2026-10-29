import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage and project navigation work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
  await page.goto('/#project/storyera');
  await expect(page.getByRole('heading', { name: 'StoryEra', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'At a glance' })).toBeVisible();
});

test('share pages open their matching case studies', async ({ page }) => {
  const projects = [
    ['agent-flight-recorder', 'Agent Flight Recorder'],
    ['storyera', 'StoryEra'],
    ['site-recon', 'Site Recon'],
    ['authorized-web-exposure-audit', 'Exposure Audit'],
    ['reptrack', 'RepTrack'],
  ];
  for (const [slug, title] of projects) {
    // Vite serves the explicit file; GitHub Pages also serves the folder URL.
    const response = await page.goto(`/p/${slug}/index.html`);
    expect(response.status()).toBe(200);
    await page.getByRole('link', { name: 'Read the full case study' }).click();
    await expect(page).toHaveURL(new RegExp(`/#project/${slug}$`));
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  }
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

test('Jarvis project page renders and links its sample-data demo', async ({ page }) => {
  await page.goto('/#project/jarvis');
  await expect(page.getByRole('heading', { name: 'Jarvis', level: 1 })).toBeVisible();
  const demo = page.getByRole('link', { name: /Try the demo/ });
  await expect(demo).toHaveAttribute('href', '/p/jarvis/demo/');
  // The dev server doesn't map folder URLs in public/ to index.html; GitHub Pages does.
  await page.goto('/p/jarvis/demo/index.html');
  await expect(page.getByText('Portfolio demo with made-up sample data.')).toBeVisible();
});
