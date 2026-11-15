import {
  applicationConfig,
  componentWrapperDecorator,
  moduleMetadata,
  type Preview,
} from '@storybook/angular';
import { StoryLocaleComponent } from '../src/i18n-prototype/story-locale';
import { provideStoryI18n } from '../src/i18n-prototype/transloco';

// Angular 22 reads the global `ngServerMode` at runtime. The Angular CLI (esbuild)
// replaces it at build time with `false` for browser builds; Storybook builds with
// webpack and does not, so rendering any component throws
// "ngServerMode is not defined". Storybook is browser-only, so `false` is correct.
(globalThis as { ngServerMode?: boolean }).ngServerMode = false;

const preview: Preview = {
  // Language switcher in the Storybook toolbar (ADR-0006): de (default), en, ru.
  globalTypes: {
    locale: {
      description: 'UI language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'de', title: 'Deutsch' },
          { value: 'en', title: 'English (en-GB)' },
          { value: 'ru', title: 'Русский' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'de' },
  decorators: [
    applicationConfig({ providers: [provideStoryI18n()] }),
    moduleMetadata({ imports: [StoryLocaleComponent] }),
    // Every story is wrapped: the toolbar value goes to Transloco and to <html lang>.
    componentWrapperDecorator(
      (story) =>
        `<k-story-locale [lang]="storyLocale">${story}</k-story-locale>`,
      ({ globals }) => ({ storyLocale: globals['locale'] }),
    ),
  ],
};

export default preview;
