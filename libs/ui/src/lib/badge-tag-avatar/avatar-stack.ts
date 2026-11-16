import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import type { AvatarSize } from './avatar';
import { initials } from './initials';

/**
 * Kontur AvatarStack — `<k-avatar-stack [names] ariaLabel="…" />` (contract: AvatarStackProps).
 * Shows the first `max` people (default 3) and "+N" for the rest, overlapping by 6 px.
 * For screen readers the whole stack is ONE image with one label from the app (e.g.
 * "Unterzeichnende: Anna Berger, Jonas Becker und 1 weitere"); the circles inside are
 * presentational, so names are not read twice and "+2" is not read without context.
 */
@Component({
  selector: 'k-avatar-stack',
  template: `
    @for (name of visible(); track $index) {
      <span class="k-avatar" [class.k-avatar--sm]="small()" aria-hidden="true">
        {{ initialsOf(name) }}
      </span>
    }
    @if (rest() > 0) {
      <span
        class="k-avatar k-avatar--more"
        [class.k-avatar--sm]="small()"
        aria-hidden="true"
      >
        +{{ rest() }}
      </span>
    }
  `,
  styleUrl: './badge-tag-avatar.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'k-avatar-stack',
    role: 'img',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class AvatarStackComponent {
  readonly names = input.required<ReadonlyArray<string>>();
  /** How many circles at most; the rest become "+N". */
  readonly max = input(3);
  /** Size of every circle, "+N" included: md (28 px, default) or sm (22 px, table cells). */
  readonly size = input<AvatarSize>('md');
  /** REQUIRED: the stack's accessible name, already translated by the app. */
  readonly ariaLabel = input.required<string>();

  protected readonly visible = computed(() =>
    this.names().slice(0, this.max()),
  );
  protected readonly rest = computed(() =>
    Math.max(0, this.names().length - this.max()),
  );
  protected readonly small = computed(() => this.size() === 'sm');
  protected readonly initialsOf = initials;
}
