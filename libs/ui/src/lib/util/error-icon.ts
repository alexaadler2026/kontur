import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Internal (not exported from the package): the warning icon in front of an error text
 * (.k-error-msg), copied from docs/design/components/TextField.html. Used by k-form-field,
 * k-checkbox and later k-radio-group. Decorative: the text next to it carries the meaning.
 * `svg:` prefixes tell Angular that the template elements live in the SVG namespace.
 */
@Component({
  selector: 'svg[k-error-icon]',
  template: `
    <svg:path
      d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"
    />
    <svg:path d="M12 9v4m0 4h.01" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    width: '14',
    height: '14',
    'aria-hidden': 'true',
  },
})
export class ErrorIconComponent {}
