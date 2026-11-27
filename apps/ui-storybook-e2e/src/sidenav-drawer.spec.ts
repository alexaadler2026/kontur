import { expect, type Page, test } from '@playwright/test';
import { openStory } from './support/story';

// The drawer on a native modal <dialog> in real Chromium (jsdom has no showModal).
// Texts are the story's documentation examples.

const open = async (page: Page) => {
  await page.getByRole('button', { name: 'Menü öffnen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menü' });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('SideNav drawer (real Chromium)', () => {
  test.beforeEach(async ({ page }) => {
    await openStory(page, 'components-sidenav--drawer');
  });

  test('open → focus on the close button; close → focus back on the menu button', async ({
    page,
  }) => {
    const opener = page.getByRole('button', { name: 'Menü öffnen' });
    await open(page);
    await expect(page.getByRole('button', { name: 'Schließen' })).toBeFocused();

    await page.getByRole('button', { name: 'Schließen' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  // Native showModal() makes the page behind inert; after the last control Chromium
  // hands focus to the browser UI (activeElement = <body>), then back into the dialog.
  // Requirement: Tab never reaches an element of the page under the drawer.
  test('Tab never reaches the page under the open drawer', async ({ page }) => {
    const dialog = await open(page);
    const where: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      where.push(
        await dialog.evaluate((element) => {
          const active = document.activeElement;
          if (!active || active === document.body) return 'browser-ui';
          return element.contains(active) ? 'drawer' : 'page';
        }),
      );
    }
    expect(where).not.toContain('page');
    expect(where).toContain('drawer');
  });

  test('Escape closes (open=false): it opens again afterwards, focus back on the menu button', async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Menü öffnen' }),
    ).toBeFocused();

    await open(page); // a stale open=true would make this click do nothing
  });

  test('a click on the backdrop closes it', async ({ page }) => {
    await open(page);
    const { width, height } = page.viewportSize() ?? { width: 0, height: 0 };

    // Right of the 232px panel = the ::backdrop.
    await page.mouse.click(width - 10, height / 2);

    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('a click on an item closes it', async ({ page }) => {
    const dialog = await open(page);
    await dialog.getByRole('link', { name: 'Gesendet' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('the page behind the open drawer does not scroll', async ({ page }) => {
    await open(page);
    await page.mouse.move(600, 300); // over the backdrop
    await page.mouse.wheel(0, 800);
    await page.keyboard.press('End');

    const scrolled = await page.evaluate(
      () => document.scrollingElement?.scrollTop ?? 0,
    );
    expect(scrolled).toBe(0);
  });

  test('width is 232px, but leaves 56px of backdrop on narrow screens', async ({
    page,
  }) => {
    const dialog = await open(page);
    expect((await dialog.boundingBox())?.width).toBe(232);

    await page.setViewportSize({ width: 260, height: 640 });
    expect((await dialog.boundingBox())?.width).toBe(260 - 56);
  });
});
