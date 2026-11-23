import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ButtonComponent } from '../button/button';
import { IconButtonComponent } from '../button/icon-button';
import { KonturIntl } from '../intl/kontur-intl';
import { KonturToast, type ToastItem } from './toast.service';

/**
 * The one place toasts live; provideKonturToast() puts it into <body> at app start.
 *
 * - Two visually hidden live regions (role="status", role="alert") are here from the
 *   start, empty: a region inserted together with its text is often not announced.
 * - The visible stack has no roles, so nothing is read twice (Toast.md 1).
 * - Focus (Toast.md 8): a toast never takes it. When the focus enters the stack, the
 *   element it came from is remembered; closing the toast that holds the focus returns
 *   it there (or to the page's h1 when that element is gone, as in Alert).
 */
@Component({
  selector: 'k-toast-region',
  imports: [
    ButtonComponent,
    IconButtonComponent,
    LucideInfo,
    LucideCircleCheck,
    LucideTriangleAlert,
    LucideCircleAlert,
    LucideX,
  ],
  template: `
    <div class="k-toast-live" role="status">{{ toast.politeText() }}</div>
    <div class="k-toast-live" role="alert">{{ toast.assertiveText() }}</div>
    @for (item of toast.visible(); track item.id) {
      <div
        class="k-toast"
        [class.k-toast--success]="item.tone === 'success'"
        [class.k-toast--warning]="item.tone === 'warning'"
        [class.k-toast--error]="item.tone === 'error'"
        (mouseenter)="toast.setHovered(item.id, true)"
        (mouseleave)="toast.setHovered(item.id, false)"
        (focusin)="toast.setFocused(item.id, true)"
        (focusout)="onFocusOut(item.id, $event)"
      >
        @switch (item.tone) {
          @case ('success') {
            <svg lucideCircleCheck class="k-ico" size="18"></svg>
          }
          @case ('warning') {
            <svg lucideTriangleAlert class="k-ico" size="18"></svg>
          }
          @case ('error') {
            <svg lucideCircleAlert class="k-ico" size="18"></svg>
          }
          @default {
            <svg lucideInfo class="k-ico" size="18"></svg>
          }
        }
        <span class="k-toast-text">
          @if (item.title; as title) {
            <b>{{ title }}</b>
          }
          {{ item.message }}
        </span>
        <span class="k-toast-actions">
          @if (item.action; as action) {
            <button
              k-button
              variant="ghost"
              size="sm"
              (click)="runAction($event, item)"
            >
              {{ action.label }}
            </button>
          }
          <button
            k-icon-button
            size="sm"
            [ariaLabel]="intl.closeLabel()"
            (click)="close($event, item)"
          >
            <svg lucideX size="14"></svg>
          </button>
        </span>
      </div>
    }
  `,
  styleUrl: './toast.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'k-toast-region', '(focusin)': 'onRegionFocusIn($event)' },
})
export class ToastRegionComponent {
  protected readonly toast = inject(KonturToast);
  protected readonly intl = inject(KonturIntl);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  /** Where the focus was before it entered the stack. */
  private returnTo: HTMLElement | null = null;

  protected onRegionFocusIn(event: FocusEvent): void {
    const from = event.relatedTarget;
    if (!(from instanceof Node) || !this.host.contains(from)) {
      this.returnTo = from instanceof HTMLElement ? from : null;
    }
  }

  protected onFocusOut(id: number, event: FocusEvent): void {
    const toastEl = event.currentTarget as HTMLElement;
    const to = event.relatedTarget;
    if (!(to instanceof Node) || !toastEl.contains(to)) {
      this.toast.setFocused(id, false);
    }
  }

  protected close(event: Event, item: ToastItem): void {
    this.returnFocusFrom(event);
    this.toast.dismiss(item.id);
  }

  protected runAction(event: Event, item: ToastItem): void {
    this.returnFocusFrom(event);
    this.toast.runAction(item);
  }

  /** The button is about to disappear; if it holds the focus, give the focus back. */
  private returnFocusFrom(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    if (this.document.activeElement !== button) return;
    const target = this.returnTo?.isConnected ? this.returnTo : null;
    if (target) {
      target.focus();
      if (this.document.activeElement === target) return;
    }
    const heading = this.document.querySelector<HTMLElement>('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus();
    }
  }
}
