import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  effect,
  inject,
  input,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { isLang, type Lang } from './locale';

/**
 * Wraps every story (global decorator in .storybook/preview.ts) and applies the language
 * chosen in the Storybook toolbar: Transloco switches at runtime (no reload) and
 * <html lang> follows, so screen readers pronounce the text correctly (WCAG 3.1.1).
 */
@Component({
  selector: 'k-story-locale',
  template: `<ng-content />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' }, // no extra box around the story
})
export class StoryLocaleComponent {
  readonly lang = input<Lang, unknown>('de', {
    transform: (value: unknown): Lang => (isLang(value) ? value : 'de'),
  });

  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.transloco.setActiveLang(lang);
      this.document.documentElement.lang = lang;
    });
  }
}
