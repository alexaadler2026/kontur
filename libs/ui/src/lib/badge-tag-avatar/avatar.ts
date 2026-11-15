import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { initials } from './initials';

export type AvatarSize = 'md' | 'sm';

/**
 * Kontur Avatar — `<k-avatar name="Anna Berger" />` (contract: AvatarProps).
 * Initials only, no photos. For screen readers it is an image named by the full name
 * (role="img" + aria-label): otherwise "AB" would be read letter by letter and mean nothing.
 * md (28 px) = no modifier, sm = 22 px.
 */
@Component({
  selector: 'k-avatar',
  template: '{{ initials() }}',
  styleUrl: './badge-tag-avatar.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[attr.aria-label]': 'name()',
    '[class]': 'size() === "sm" ? "k-avatar k-avatar--sm" : "k-avatar"',
  },
})
export class AvatarComponent {
  /** Full name; the initials are computed from it. */
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly initials = computed(() => initials(this.name()));
}
