import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';

/**
 * Kontur Spinner — `<k-spinner label="Lädt" />` (contract: SpinnerProps).
 * role="status" with the label as its name: a screen reader hears what is loading.
 * size in px (20 in the mockup).
 */
@Component({
  selector: 'k-spinner',
  template: '',
  styleUrl: './progress.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'k-spinner',
    role: 'status',
    '[attr.aria-label]': 'label()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class SpinnerComponent {
  readonly label = input.required<string>();
  readonly size = input(20);
}
