import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  NativeSelectDirective,
  SelectWrapComponent,
} from '@adlersoft/kontur-ui';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import config from '../../../public/i18n/languages.json';
import { saveLang } from './saved-language';

/**
 * Language switch of the sign-in screen (Anmelden.md: the visitor has no account yet, so
 * the language must be selectable there). Native select, size sm, as in the mockup.
 * Switches at runtime (no reload) and remembers the choice for the next start.
 */
@Component({
  selector: 'sf-language-switch',
  imports: [SelectWrapComponent, NativeSelectDirective, TranslocoPipe],
  template: `
    <k-select-wrap>
      <select
        k-select
        size="sm"
        [attr.aria-label]="'app.language' | transloco"
        [value]="transloco.activeLang()"
        (change)="choose($event)"
      >
        @for (language of languages; track language.code) {
          <!-- lang: a screen reader reads each name in its own language (WCAG 3.1.2) -->
          <option
            [value]="language.code"
            [attr.lang]="language.code"
            [selected]="language.code === transloco.activeLang()"
          >
            {{ language.nativeName }}
          </option>
        }
      </select>
    </k-select-wrap>
  `,
  styles: `
    /* Width from the mockup (Anmelden.html: 140px); no token for widths. */
    :host {
      display: block;
      width: 140px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitch {
  protected readonly transloco = inject(TranslocoService);
  private readonly view = inject(DOCUMENT).defaultView;
  protected readonly languages = config.languages;

  protected choose(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.transloco.setActiveLang(lang);
    const view = this.view;
    if (view) saveLang(lang, () => view.localStorage);
  }
}
