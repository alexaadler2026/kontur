import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Kontur SideNav item — `<a k-sidenav-item routerLink="…" [count]="3">` (SidenavItemProps).
 * The icon is projected by the app: `<svg lucideFileText class="k-ico"></svg>`.
 *
 * The count is read together with the name: accessible name "Entwürfe, 3", not
 * "Entwürfe3". The hidden ", 3" sits INLINE next to the text inside one wrapper span:
 * the item is a flex box, and browsers put a space between flex items (and around
 * absolutely positioned elements) when they compute the name → "Entwürfe , 3".
 * The visible number is aria-hidden so it is not read twice.
 */
@Component({
  selector: 'a[k-sidenav-item]',
  template: `<ng-content select="svg, .k-ico" />
    <span class="k-sidenav-text"
      ><ng-content />
      @if (count() !== null) {
        <span class="k-visually-hidden">{{ ', ' + count() }}</span>
      }
    </span>
    @if (count() !== null) {
      <span class="k-count k-num" aria-hidden="true">{{ count() }}</span>
    }`,
  styleUrl: './sidenav.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-sidenav-item' },
})
export class SidenavItemComponent {
  readonly count = input<number | null>(null);
}
