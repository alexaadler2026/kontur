import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { Meta, StoryObj } from '@storybook/angular';
import { formatCurrency, formatDate, isLang, type Lang } from './locale';

/**
 * i18n prototype (ADR-0006): ICU plurals from src/i18n/<lang>.json and Intl formats that
 * follow the language chosen in the Storybook toolbar — switched at runtime, no reload.
 * This lives in the Storybook app, not in libs/ui: the library stays i18n-agnostic.
 */
@Component({
  selector: 'k-story-i18n-prototype',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      style="display: flex; flex-direction: column; gap: 12px; padding: 16px; color: var(--text-primary);"
    >
      <h2 class="h2" style="margin: 0;">
        {{ 'prototype.heading' | transloco }}
      </h2>
      <ul
        data-testid="documents"
        class="body"
        style="margin: 0; padding-left: 20px;"
      >
        @for (count of counts; track count) {
          <li>{{ 'prototype.documents' | transloco: { count } }}</li>
        }
      </ul>
      <p data-testid="uploaded" class="body" style="margin: 0;">
        {{ 'prototype.uploadedOn' | transloco: { date: uploaded() } }}
      </p>
      <p data-testid="amount" class="body k-num" style="margin: 0;">
        {{ 'prototype.amount' | transloco: { amount: amount() } }}
      </p>
    </section>
  `,
})
class I18nPrototypeComponent {
  protected readonly counts = [0, 1, 2, 5, 21];

  // The active language as a signal: RxJS stream converted at the edge (CLAUDE.md).
  private readonly lang = toSignal(inject(TranslocoService).langChanges$, {
    initialValue: 'de',
  });
  private readonly activeLang = computed<Lang>(() => {
    const lang = this.lang();
    return isLang(lang) ? lang : 'de';
  });

  // Example values from docs/design/README.md.
  protected readonly uploaded = computed(() =>
    formatDate(new Date(2026, 10, 12), this.activeLang()),
  );
  protected readonly amount = computed(() =>
    formatCurrency(1234.56, this.activeLang()),
  );
}

const meta: Meta<I18nPrototypeComponent> = {
  title: 'I18n/Plural and date',
  component: I18nPrototypeComponent,
  parameters: {
    docs: {
      description: {
        component:
          'Switch the language in the toolbar (globe icon): de / en / ru. Plurals are ICU ' +
          'messages with CLDR forms (ru: 1 документ, 2 документа, 5 документов); date and ' +
          'currency use Intl with de-DE, en-GB and ru-RU (ADR-0006).',
      },
    },
  },
};
export default meta;

export const Prototype: StoryObj<I18nPrototypeComponent> = {};
