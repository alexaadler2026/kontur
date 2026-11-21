import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiStatus } from '../api-status/api-status';

/**
 * Start page of the end-to-end slice (task 1). No mockup exists for it: a main landmark,
 * the product name as h1 (a name, not translated) and the API status line.
 */
@Component({
  selector: 'sf-home',
  imports: [ApiStatus],
  template: `
    <main>
      <h1>SignFlow</h1>
      <sf-api-status />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {}
