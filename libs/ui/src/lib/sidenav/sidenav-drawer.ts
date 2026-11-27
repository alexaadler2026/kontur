import { LucideX } from '@lucide/angular';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { IconButtonComponent } from '../button/icon-button';
import { KonturIntl } from '../intl/kontur-intl';

/**
 * Kontur SideNav drawer — `<k-sidenav-drawer [(open)]="menuOpen" ariaLabel="…">`.
 * The mobile menu on a native modal <dialog> (showModal): the browser makes the page
 * behind inert (Tab never reaches it; after the last control focus may go to the
 * browser UI) and closes on Escape. No @angular/cdk (plan 051).
 *
 * - Content: a <k-sidenav>; `[kDrawerFooter]` at the bottom (language / theme switches).
 * - Every close (button, Escape, backdrop, item click) goes through the dialog's
 *   `close` event, which sets `open` to false, so the model never goes stale.
 * - Focus: on open → the close button; after close → the element that had focus
 *   before (the menu button). Chromium restores that focus natively as well; the
 *   explicit focus() is kept for engines that do not. The menu button belongs to the app.
 */
@Component({
  selector: 'k-sidenav-drawer',
  imports: [IconButtonComponent, LucideX],
  // The dialog's click handler is a pointer-only extra (backdrop, item clicks).
  // Keyboard users already have the native Escape and the close button; an item
  // activated by Enter fires a click too.
  template: `<!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="k-sidenav-drawer"
      [attr.aria-label]="ariaLabel()"
      (close)="onClosed()"
      (click)="onClick($event)"
    >
      <div class="k-sidenav-drawer-panel">
        <div class="k-sidenav-drawer-head">
          <button
            #closeButton
            k-icon-button
            size="sm"
            [ariaLabel]="intl.closeLabel()"
            (click)="open.set(false)"
          >
            <svg lucideX size="14"></svg>
          </button>
        </div>
        <ng-content />
        <div class="k-sidenav-drawer-footer">
          <ng-content select="[kDrawerFooter]" />
        </div>
      </div>
    </dialog>`,
  styleUrl: './sidenav.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidenavDrawerComponent {
  /** Two-way: `[(open)]`. The drawer sets it to false on every kind of close. */
  readonly open = model(false);
  /** Name of the dialog, e.g. "Menü" (from i18n). */
  readonly ariaLabel = input.required<string>();

  protected readonly intl = inject(KonturIntl);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly closeButton = viewChild.required('closeButton', {
    read: ElementRef<HTMLButtonElement>,
  });
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        this.opener =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        dialog.showModal();
        this.closeButton().nativeElement.focus();
      } else if (!this.open() && dialog.open) {
        dialog.close(); // → close event → onClosed()
      }
    });
  }

  /** The native `close` event: fired for the close button, Escape and close(). */
  protected onClosed(): void {
    this.open.set(false);
    this.opener?.focus();
    this.opener = null;
  }

  protected onClick(event: MouseEvent): void {
    const target = event.target as Element;
    const dialog = this.dialog().nativeElement;
    // ::backdrop clicks target <dialog>; the position check makes sure the click is
    // really outside the panel (not on an empty spot of the dialog box itself).
    if (target === dialog && this.isOutside(event, dialog))
      this.open.set(false);
    else if (target.closest('a[k-sidenav-item]')) this.open.set(false);
  }

  private isOutside(event: MouseEvent, dialog: HTMLDialogElement): boolean {
    const box = dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }
}
