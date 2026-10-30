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

test('scrolling over the open-source collections moves the page, not a box inside it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel input is a desktop concern; touch scrolls the page directly');
  await page.goto('/');
  const main = page.getByRole('main');
  const list = page.locator('.ed-open-source-items').last();
  await list.scrollIntoViewIfNeeded();
  // Nothing in the collections may be a scroll box of its own.
  const scrollers = await page.locator('.ed-open-source *').evaluateAll((nodes) => nodes.filter((node) => {
    const { overflowY } = getComputedStyle(node);
    return (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
  }).length);
  expect(scrollers).toBe(0);
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200));
  const before = await main.evaluate((node) => node.scrollTop);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => main.evaluate((node) => node.scrollTop)).toBeGreaterThan(before + 600);
});
