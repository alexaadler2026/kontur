import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { colorToken, openStory } from './support/story';

// Toast.md (owner, 2026-11-23): the hidden live regions speak, the visible toast has no
// role; the region is at the end of <body>, outside the story root.

test('keyboard: show an error, hear it with its action, tab in, close, focus goes back', async ({
  page,
}) => {
  await openStory(page, 'components-toast--playground');
  const show = page.getByRole('button', { name: 'error' });

  await show.focus();
  await page.keyboard.press('Enter');

  const toast = page.locator('k-toast-region .k-toast');
  await expect(toast).toHaveCount(1);
  await expect(toast).not.toHaveAttribute('role');
  await expect(page.getByRole('alert')).toHaveText(
    'Upload fehlgeschlagen. Datei überschreitet 25 MB. Aktion: Wiederholen',
  );
  await expect(page.getByRole('status')).toHaveText('');
  // Never takes the focus itself.
  await expect(show).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Wiederholen' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Schließen' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(toast).toHaveCount(0);
  await expect(show).toBeFocused();
});

test('the same message twice is announced twice (the region is cleared in between)', async ({
  page,
}) => {
  await openStory(page, 'components-toast--playground');
  const status = page.getByRole('status');
  await page.getByRole('button', { name: 'success' }).click();
  await expect(status).toHaveText(/^Signiert\./);
  // Watch the region from inside the page: record every text it shows.
  await status.evaluate((node) => {
    const seen: string[] = [];
    (window as unknown as { seen: string[] }).seen = seen;
    new MutationObserver(() => seen.push(node.textContent ?? '')).observe(
      node,
      { childList: true, characterData: true, subtree: true },
    );
  });

  await page.getByRole('button', { name: 'success' }).click();

  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { seen: string[] }).seen),
    )
    .toEqual(['', expect.stringMatching(/^Signiert\./)]);
});

test('error toast: 3px edge and icon in --error, raised surface, text-primary', async ({
  page,
}) => {
  await openStory(page, 'components-toast--all-tones');
  const error = page.locator('.k-toast--error');
  const warning = page.locator('.k-toast--warning');
  // Three are visible; the error waits until one leaves — close the success toast.
  await page
    .locator('.k-toast--success')
    .getByRole('button', { name: 'Schließen' })
    .click();

  await expect(error).toHaveCSS('border-left-width', '3px');
  await expect(error).toHaveCSS(
    'border-left-color',
    await colorToken(page, '--error'),
  );
  await expect(error).toHaveCSS(
    'background-color',
    await colorToken(page, '--bg-surface-raised'),
  );
  await expect(error).toHaveCSS(
    'color',
    await colorToken(page, '--text-primary'),
  );
  await expect(error.locator('svg.k-ico')).toHaveCSS(
    'color',
    await colorToken(page, '--error'),
  );
  await expect(warning).toHaveCSS(
    'border-left-color',
    await colorToken(page, '--warning'),
  );
});

test('desktop: bottom right; below 960 px: at the top', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStory(page, 'components-toast--all-tones');
  const first = page.locator('.k-toast').first();
  await expect(first).toBeVisible();
  let box = await page.locator('k-toast-region').boundingBox();
  expect(box && Math.round(1440 - (box.x + box.width))).toBe(16);
  expect(box && Math.round(900 - (box.y + box.height))).toBe(16);

  await page.setViewportSize({ width: 959, height: 800 });
  box = await page.locator('k-toast-region').boundingBox();
  expect(box && Math.round(box.y)).toBe(16);
});

test('the action word follows the toolbar language', async ({ page }) => {
  await openStory(page, 'components-toast--playground', 'locale:ru');
  await page.getByRole('button', { name: 'error' }).click();

  await expect(page.getByRole('alert')).toHaveText(/Действие: Wiederholen$/);
  await expect(page.getByRole('button', { name: 'Закрыть' })).toBeVisible();
});

for (const id of [
  'components-toast--all-tones',
  'components-toast--dark-theme',
]) {
  test(`axe: the toast region has no WCAG 2.1 A/AA violations (${id})`, async ({
    page,
  }) => {
    await openStory(page, id);
    await expect(page.locator('.k-toast')).toHaveCount(3);

    const results = await new AxeBuilder({ page })
      .include('k-toast-region')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
}
