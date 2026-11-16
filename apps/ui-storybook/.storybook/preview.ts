import {
  applicationConfig,
  componentWrapperDecorator,
  moduleMetadata,
  type Preview,
} from '@storybook/angular';
import { provideKonturIntl } from '@adlersoft/kontur-ui';
import { TranslocoKonturIntl } from '../src/i18n-prototype/kontur-intl';
import { LANGUAGES, SOURCE_LANG } from '../src/i18n-prototype/locale';
import { StoryLocaleComponent } from '../src/i18n-prototype/story-locale';
import { provideStoryI18n } from '../src/i18n-prototype/transloco';

// Angular 22 reads the global `ngServerMode` at runtime. The Angular CLI (esbuild)
// replaces it at build time with `false` for browser builds; Storybook builds with
// webpack and does not, so rendering any component throws
// "ngServerMode is not defined". Storybook is browser-only, so `false` is correct.
(globalThis as { ngServerMode?: boolean }).ngServerMode = false;

const preview: Preview = {
  // Language switcher in the Storybook toolbar (ADR-0006), languages from languages.json.
  globalTypes: {
    locale: {
      description: 'UI language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        // from src/i18n/languages.json — a new language appears here without code changes
        items: LANGUAGES.map(({ code, name }) => ({
          value: code,
          title: name,
        })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: SOURCE_LANG },
  decorators: [
    applicationConfig({
      providers: [
        provideStoryI18n(),
        // built-in strings of libs/ui follow the toolbar language, like in an app
        provideKonturIntl(TranslocoKonturIntl),
      ],
    }),
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
