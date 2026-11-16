import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { KonturIntl } from '../intl/kontur-intl';

let nextId = 0;

/**
 * Kontur Tag — category or active filter chip (contract: TagProps, TagOutputs).
 * `<k-tag removable (removed)="…">NDA</k-tag>`
 *
 * The remove button is named "action + tag text" — "Entfernen NDA" — via aria-labelledby
 * pointing at the button itself (its aria-label = the action) and at the text. With three
 * tags a screen reader hears three different buttons, and the code never reads textContent.
 *
 * The tag does not remove itself: it emits `removed`, the consumer deletes it from its data
 * and moves the focus (next tag or the filter field), because only the consumer knows where.
 */
@Component({
  selector: 'k-tag',
  template: `
    <span [id]="textId"><ng-content /></span>
    @if (removable()) {
      <button
        type="button"
        class="k-tag-x"
        [id]="buttonId"
        [attr.aria-label]="label()"
        [attr.aria-labelledby]="buttonId + ' ' + textId"
        (click)="removed.emit()"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    }
  `,
  styleUrl: './badge-tag-avatar.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-tag' },
})
export class TagComponent {
  readonly removable = input(false, { transform: booleanAttribute });
  /** The action word of the remove button; default from KonturIntl ("Entfernen"). */
  readonly removeLabel = input<string>();
  readonly removed = output<void>();

  private readonly intl = inject(KonturIntl);
  private readonly id = `k-tag-${++nextId}`;
  protected readonly textId = `${this.id}-text`;
  protected readonly buttonId = `${this.id}-remove`;

  protected readonly label = computed(
    () => this.removeLabel() ?? this.intl.removeLabel(),
  );
}
