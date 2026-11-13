import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Host application for Storybook. It is never shown to users: Storybook only needs its
 * build configuration (browserTarget) to compile the stories of libs/ui.
 */
@Component({
  selector: 'k-root',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
