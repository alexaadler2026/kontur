import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { allStoryIds, openStory } from './support/story';

test('every story has no WCAG 2.1 A/AA violations (axe)', async ({ page }) => {
  test.setTimeout(120_000);
  const ids = await allStoryIds(page);
  // Guard: an empty or broken index must not produce a green run that checked nothing.
  expect(ids).toEqual(
    expect.arrayContaining([
      'components-button--variants',
      'components-textfield--states',
      'components-checkbox--dark-theme',
    ]),
  );

  const violations: Record<string, string[]> = {};
  for (const id of ids) {
    await test.step(id, async () => {
      await openStory(page, id);
      // Scoped to the story root: we test the component, not Storybook's iframe page.
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      violations[id] = results.violations.map((v) => `${v.id}: ${v.help}`);
    });
  }

  // One entry per story, so the failure message names the story and the rule.
  expect(violations).toEqual(Object.fromEntries(ids.map((id) => [id, []])));
});
