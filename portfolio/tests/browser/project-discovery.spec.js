import { test, expect } from '@playwright/test';

test('search combines terms and filters, and recovers from no results', async ({ page }) => {
  await page.goto('/#work');
  const search = page.getByRole('searchbox', { name: 'Search the work' });
  await search.fill('swift');
  await expect(page.locator('#project-results a')).toHaveCount(2);
  await page.getByRole('button', { name: 'Earlier work', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No projects found.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all projects ↗' }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(page.locator('#project-results a')).toHaveCount(25);
  await search.fill('  SWIFT workout  ');
  await expect(page.locator('#project-results a')).toHaveCount(1);
  await expect(page.locator('#project-results a')).toHaveAttribute('href', '#project/reptrack');
});

test('mobile menu exposes section links and supports Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Desktop exposes the section links directly.');
  await page.goto('/#about');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await expect(close).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'About me', exact: true })).toBeVisible();
  await close.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('link', { name: 'All projects ↗', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search the work' })).toBeVisible();
});
