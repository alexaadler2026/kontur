import { Injectable } from '@angular/core';
import { KonturIntl } from '@adlersoft/kontur-ui';
import { translateSignal } from '@jsverse/transloco';

/**
 * The pattern for the apps (ADR-0006): the library's built-in strings come from the app's
 * own translations. translateSignal follows the active language, so the Tag's remove button
 * switches together with the toolbar. libs/ui itself never imports Transloco.
 */
@Injectable()
export class TranslocoKonturIntl extends KonturIntl {
  readonly removeLabel = translateSignal('kontur.removeLabel');
  readonly closeLabel = translateSignal('kontur.closeLabel');
}
