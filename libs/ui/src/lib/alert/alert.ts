import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { IconButtonComponent } from '../button/icon-button';
import { KonturIntl } from '../intl/kontur-intl';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';
export type AlertVariant = 'inline' | 'banner';

/** Marks the actions row: `<div k-alert-actions><button k-button size="sm" …></div>`. */
@Directive({
  selector: '[k-alert-actions]',
  host: { class: 'k-alert-actions' },
})
export class AlertActionsDirective {}

/** Elements a keyboard user can reach with Tab (disabled ones are filtered by :not). */
const TABBABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * Kontur Alert — InlineAlert / Banner (contract: AlertProps, AlertOutputs; spec: Alert.md).
 * `<k-alert tone="error" live>…</k-alert>`
 *
 * - `live`: role="alert" (error/warning) or role="status" (info/success) only when the
 *   message is a reaction to an action; without `live` there is no role.
 * - Repeated identical messages are not deduplicated here: the host re-creates the element
 *   (`@for (n of [submitCount()]; track n)`), a new live region is announced again.
 * - Visibility belongs to the host (controlled component, like Tag): the close button moves
 *   the focus away, emits `dismissed`, and the host removes the alert with @if.
 */
@Component({
  selector: 'k-alert',
  imports: [
    IconButtonComponent,
    LucideInfo,
    LucideCircleCheck,
    LucideTriangleAlert,
    LucideCircleAlert,
    LucideX,
  ],
  template: `
    @switch (tone()) {
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
    <div class="k-alert-body">
      @if (title(); as title) {
        <span class="k-alert-title">{{ title }}</span>
      }
      <span><ng-content /></span>
      <ng-content select="[k-alert-actions]" />
    </div>
    @if (dismissible()) {
      <button
        k-icon-button
        size="sm"
        [ariaLabel]="intl.closeLabel()"
        (click)="close()"
      >
        <svg lucideX size="14"></svg>
      </button>
    }
  `,
  styleUrl: './alert.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'k-alert',
    '[class.k-alert--info]': 'tone() === "info"',
    '[class.k-alert--success]': 'tone() === "success"',
    '[class.k-alert--warning]': 'tone() === "warning"',
    '[class.k-alert--error]': 'tone() === "error"',
    '[class.k-alert--banner]': 'variant() === "banner"',
    '[attr.role]': 'role()',
    // `title` is an input; without this the static attribute would also stay on the host
    // and become a native tooltip and an extra accessible description.
    '[attr.title]': 'null',
  },
})
export class AlertComponent {
  readonly tone = input<AlertTone>('info');
  /** Bold first line, e.g. "Anmeldung fehlgeschlagen" (contract example). */
  readonly title = input<string>();
  readonly variant = input<AlertVariant>('inline');
  /** The message appeared in response to an action → it is announced (role alert/status). */
  readonly live = input(false, { transform: booleanAttribute });
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** The close button was pressed. The host removes the alert; the focus is already moved. */
  readonly dismissed = output<void>();

  protected readonly intl = inject(KonturIntl);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);

  protected readonly role = computed(() => {
    if (!this.live()) return null;
    return this.tone() === 'error' || this.tone() === 'warning'
      ? 'alert'
      : 'status';
  });

  protected close(): void {
    this.moveFocusAway();
    this.dismissed.emit();
  }

  /**
   * The close button is about to disappear with the alert; if the focus stayed on it, the
   * keyboard user would land on <body>. Order (Alert.md): the next tabbable element after
   * the alert, else the page heading h1 (made programmatically focusable).
   */
  private moveFocusAway(): void {
    const after = Array.from(
      this.document.querySelectorAll<HTMLElement>(TABBABLE),
    ).filter(
      (el) =>
        !this.host.contains(el) &&
        (this.host.compareDocumentPosition(el) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
    );
    // focus() silently does nothing on hidden elements — so try in order and check.
    for (const el of after) {
      el.focus();
      if (this.document.activeElement === el) return;
    }
    const heading = this.document.querySelector<HTMLElement>('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus();
    }
  }
}
