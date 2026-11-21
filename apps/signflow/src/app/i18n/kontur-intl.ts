import { Injectable } from '@angular/core';
import { KonturIntl } from '@adlersoft/kontur-ui';
import { translateSignal } from '@jsverse/transloco';

/**
 * The built-in strings of libs/ui come from SignFlow's own translations (ADR-0006).
 * translateSignal follows the active language, so they switch together with the app.
 * libs/ui itself never imports Transloco.
 */
@Injectable()
export class TranslocoKonturIntl extends KonturIntl {
  readonly removeLabel = translateSignal('kontur.removeLabel');
  readonly closeLabel = translateSignal('kontur.closeLabel');
}
