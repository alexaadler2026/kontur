import { expect, type Locator, type Page, test } from '@playwright/test';
import { openStory } from './support/story';

/** Computed style of the ::before dot of a badge. */
const dot = (badge: Locator) =>
  badge.evaluate((element) => {
    const style = getComputedStyle(element, '::before');
    return {
      rotate: style.rotate,
      radius: style.borderTopLeftRadius,
      background: style.backgroundColor,
      border: style.borderTopWidth,
    };
  });

/** The browser's own value of a colour token, so the test never hard-codes a hex value. */
const token = (page: Page, name: string) =>
  page.evaluate((variable) => {
    const probe = document.createElement('span');
    probe.style.background = `var(${variable})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);

test('Badge: status is not colour only — each tone has its own dot shape (WCAG 1.4.1)', async ({
  page,
}) => {
  await openStory(page, 'components-badge--tones');
  const badge = (text: string) => page.locator('k-badge', { hasText: text });

  const neutral = await dot(badge('Entwurf'));
  const warning = await dot(badge('Wartet'));
  const error = await dot(badge('Abgelehnt'));
  const info = await dot(badge('In Prüfung'));

  expect(neutral.radius).not.toBe('1px'); // circle
  expect(warning).toMatchObject({ rotate: '45deg', radius: '1px' }); // diamond
  expect(error).toMatchObject({ rotate: 'none', radius: '1px' }); // square
  expect(info).toMatchObject({ background: 'rgba(0, 0, 0, 0)', border: '2px' }); // ring
});

test('Avatar: sizes 28 / 22 px; the stack overlaps by 6 px and "+N" uses bg-subtle', async ({
  page,
}) => {
  await openStory(page, 'components-avatar--overview');

  const md = page.getByRole('img', { name: 'Anna Berger', exact: true });
  const sm = page.getByRole('img', { name: 'Jonas Becker', exact: true });
  expect(await md.evaluate((e) => e.getBoundingClientRect().width)).toBe(28);
  expect(await sm.evaluate((e) => e.getBoundingClientRect().width)).toBe(22);

  const circles = page.getByTestId('stack').locator('.k-avatar');
  await expect(circles).toHaveText(['AB', 'JB', 'MB', '+2']);
  await expect(circles.nth(1)).toHaveCSS('margin-left', '-6px');
  await expect(circles.nth(3)).toHaveCSS(
    'background-color',
    await token(page, '--bg-subtle'),
  );
});

test('AvatarStack size sm: every circle is 22 px, "+N" included', async ({
  page,
}) => {
  await openStory(page, 'components-avatar--small-stack');

  const widths = await page
    .getByTestId('stack-sm')
    .locator('.k-avatar')
    .evaluateAll((circles) =>
      circles.map((circle) => circle.getBoundingClientRect().width),
    );
  expect(widths).toEqual([22, 22, 22, 22]);
});
