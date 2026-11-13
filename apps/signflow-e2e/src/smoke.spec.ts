import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('SignFlow smoke', () => {
  test('loads with German as default language and product title', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('SignFlow');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  });

  test('has no WCAG 2.1 A/AA violations (axe)', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
