import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { KonturIntl } from '@adlersoft/kontur-ui';
import { translateSignal, TranslocoService } from '@jsverse/transloco';
import { localeOf } from './languages';

/**
 * The built-in strings of libs/ui come from SignFlow's own translations (ADR-0006).
 * translateSignal follows the active language, so they switch together with the app;
 * so does the locale. libs/ui itself never imports Transloco.
 */
@Injectable()
export class TranslocoKonturIntl extends KonturIntl {
  readonly removeLabel = translateSignal('kontur.removeLabel');
  readonly closeLabel = translateSignal('kontur.closeLabel');

  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  /** The Intl locale of the active language (languages.json): en → en-GB. */
  readonly locale = computed(() => localeOf(this.lang()));
}
