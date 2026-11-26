import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

let nextId = 0;

/**
 * Kontur SideNav group — `<k-sidenav-group label="Verwaltung">` (SidenavGroupProps).
 * role="group" named by its visible label (aria-labelledby), items inside.
 */
@Component({
  selector: 'k-sidenav-group',
  template: `<div class="k-sidenav-group k-label" [id]="labelId">
      {{ label() }}
    </div>
    <ng-content />`,
  styleUrl: './sidenav.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    class: 'k-sidenav-group-list',
    '[attr.aria-labelledby]': 'labelId',
  },
})
export class SidenavGroupComponent {
  readonly label = input.required<string>();

  protected readonly labelId = `k-sidenav-group-${++nextId}`;
}
