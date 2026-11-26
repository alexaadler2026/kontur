import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Kontur SideNav — `<k-sidenav ariaLabel="…">` (contract: SidenavProps).
 * A <nav> landmark; slots: `[kSidenavBrand]` on top, items / groups, `[kSidenavFooter]`
 * at the bottom (profile). No router here: the app sets links and `aria-current`
 * (routerLinkActive + ariaCurrentWhenActive="page"); the library only styles them.
 */
@Component({
  selector: 'k-sidenav',
  template: `<nav class="k-sidenav" [attr.aria-label]="ariaLabel()">
    <ng-content select="[kSidenavBrand]" />
    <ng-content />
    <div class="k-sidenav-spacer"></div>
    <ng-content select="[kSidenavFooter]" />
  </nav>`,
  styleUrl: './sidenav.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavComponent {
  /** Name of the navigation landmark, e.g. "Hauptnavigation" (from i18n). */
  readonly ariaLabel = input.required<string>();
}
