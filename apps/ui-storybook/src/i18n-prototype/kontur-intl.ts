import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { KonturIntl } from '@adlersoft/kontur-ui';
import { translateSignal, TranslocoService } from '@jsverse/transloco';
import { localeOf } from './locale';

/**
 * The pattern for the apps (ADR-0006): the library's built-in strings come from the app's
 * own translations. translateSignal follows the active language, so the Tag's remove button
 * switches together with the toolbar; so does the locale. libs/ui itself never imports
 * Transloco.
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
