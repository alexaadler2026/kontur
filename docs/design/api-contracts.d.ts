/**
 * Kontur — target public API of the libs/ui components (Angular, standalone, Signals).
 * Documentation of contracts for implementation, not runtime types of the bundle.
 *
 * Conventions
 * - `*Props`   = signal inputs  (input() / input.required() / model()).
 * - `*Outputs` = outputs        (output()); the value type is the emitted payload.
 * - Form controls implement ControlValueAccessor; their value is NOT an input.
 * - Every component: standalone, ChangeDetectionStrategy.OnPush, styles from tokens only.
 * - CSS classes of the reference stylesheet map 1:1 (Button → k-btn, …).
 * - Texts (labels, aria-labels) are passed in already translated; components hold no copy,
 *   except built-in a11y strings, which come from an injectable KonturIntl service.
 *   The library ships KonturIntlDe (default), KonturIntlEn and KonturIntlRu — the product UI languages;
 *   apps replace the provider with their own implementation on top of their i18n library.
 *   Plurals follow CLDR categories per language (ru: one / few / many / other); numbers via Intl.
 */

/* ───────────────────────── Actions ───────────────────────── */

/** <button k-button> / <a k-button> — attribute selector on native elements (keeps native semantics). Class: k-btn */
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger"; // default "secondary"
  size?: "md" | "sm" | "touch";                             // 36 / 32 / 44 px, default "md"
  loading?: boolean;   // hides the label, shows spinner, sets aria-busy="true", blocks clicks
  disabled?: boolean;
}
/** <button k-icon-button> — icon-only button. Class: k-icon-btn */
interface IconButtonProps {
  ariaLabel: string;   // REQUIRED: icon-only buttons must have an accessible name
  size?: "md" | "sm";
}

/* ───────────────────────── Forms ───────────────────────── */

/** <k-form-field> wrapping <input k-input> / <textarea k-input>. Classes: k-form-item, k-field.
 *  Generates ids, links label (for) and hint/error (aria-describedby), sets aria-invalid. */
interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string | null;   // non-empty → .is-invalid, error text with icon, aria-invalid="true"
  required?: boolean;      // adds visual marker + aria-required
}
/** <input k-input> — directive on the native input. */
interface InputProps {
  numeric?: boolean;       // k-num: IBM Plex Mono + tabular figures (IBAN, amounts, numbers)
  size?: "md" | "touch";
}

/** <k-select> — ControlValueAccessor. Classes: k-select + k-menu.
 *  ARIA combobox + listbox pattern, CDK Overlay + ActiveDescendantKeyManager. */
interface SelectProps<T> {
  label: string;
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>;
  placeholder?: string;
  searchable?: boolean;            // shows search field, highlights match, shows "N von M"
  compareWith?: (a: T, b: T) => boolean;
  error?: string | null;
  size?: "md" | "sm" | "touch";
}
interface SelectOutputs<T> { opened: void; closed: void; searchChange: string; }

/** <k-date-picker> — ControlValueAccessor, value is an ISO date string "YYYY-MM-DD" (no Date objects).
 *  Input accepts typed DD.MM.YYYY (de) / DD/MM/YYYY (en). Calendar in CDK Overlay, arrow-key navigation. */
interface DatePickerProps {
  label: string;
  min?: string;   // ISO date; days before are disabled
  max?: string;   // ISO date
  error?: string | null;
}

/** <k-checkbox> — ControlValueAccessor (boolean). Class: k-check */
interface CheckboxProps {
  label: string;
  indeterminate?: boolean;     // model(): the browser clears it on click, the change flows back
  hint?: string;
  error?: string | null;       // v3: text, not boolean — an error must not be color-only (WCAG 1.4.1, 3.3.1).
                               // Renders <div class="k-choice-item"> + .k-error-msg with icon; aria-invalid + aria-describedby (hint, then error)
}
/** <k-radio-group> + <k-radio> — ControlValueAccessor on the group. Class: k-radio.
 *  Renders <fieldset> + <legend>; arrow keys move selection (native radio behaviour). */
interface RadioGroupProps {
  legend: string;
  name: string;
  hint?: string;
  error?: string | null;       // v3: <fieldset class="k-choice-group is-invalid">; order: legend, hint, error, options.
                               // aria-describedby (hint, then error) on the fieldset — screen readers announce it when
                               // focus enters the group (GOV.UK pattern). No aria-invalid on single radios: ARIA 1.2
                               // supports it on radiogroup/checkbox, not on radio.
  required?: boolean;          // k-required marker in the legend (aria-hidden); native `required` on each radio input (aria-required is not supported on role radio in ARIA 1.2)
}
interface RadioProps<T> { value: T; label: string; disabled?: boolean; }
/** <k-switch> — ControlValueAccessor (boolean), role="switch". Class: k-switch.
 *  Use only for settings applied immediately; in forms with a Save button use Checkbox. */
interface SwitchProps { label: string; }

/* ───────────────────────── Data ───────────────────────── */

/** <k-table> — Class: k-table-wrap. Sorting, row selection, pagination; CDK virtual scroll for > 100 rows.
 *  Cell content via <ng-template kCell="columnKey" let-row>. Toolbar via <ng-content select="[kTableToolbar]">. */
interface TableColumn<Row> {
  key: keyof Row & string;
  header: string;
  sortable?: boolean;
  numeric?: boolean;          // right-aligned, k-num
  width?: string;             // CSS length; omit for flexible columns (long German words)
}
interface TableProps<Row> {
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  trackBy: (row: Row) => string | number;   // REQUIRED, used in @for track
  selectable?: boolean;
  selected?: ReadonlySet<string | number>;  // model() — two-way selection
  sort?: { key: string; direction: "asc" | "desc" } | null;  // model()
  compact?: boolean;           // k-table--compact, row height control-sm
  state?: "ready" | "loading" | "empty" | "error";
  emptyText?: string;
  caption: string;             // REQUIRED: visually hidden <caption> for screen readers
}
interface TableOutputs<Row> { rowClick: Row; }
/** <k-pagination> — Class: k-pagination */
interface PaginationProps { page: number; pageSize: number; total: number; itemLabel: string; } // page is model()

/** <k-badge> — Class: k-badge. Status is text + dot shape, never color only:
 *  success = circle, warning = diamond, error = square, info = ring, neutral = circle (grey). */
interface BadgeProps { tone?: "neutral" | "success" | "warning" | "error" | "info"; }

/** <k-tag> — Class: k-tag. Category / active filter chip. */
interface TagProps {
  removable?: boolean;
  removeLabel?: string;        // aria-label of the remove button; default from KonturIntl ("Entfernen")
}
interface TagOutputs { removed: void; }

/** <k-avatar> — Class: k-avatar. Initials only, no photos (privacy, simpler). */
interface AvatarProps {
  name: string;                // full name; initials computed (first letters of first and last word)
  size?: "md" | "sm";          // 28 / 22 px
}
/** <k-avatar-stack> — Class: k-avatar-stack. Shows max `max` avatars + "+N". */
interface AvatarStackProps {
  names: ReadonlyArray<string>;
  max?: number;                // default 3
  size?: "md" | "sm";          // size of every avatar in the stack, default "md"; "sm" in table cells (DataTable)
  ariaLabel: string;           // e.g. "Unterzeichnende: Anna Berger, Jonas Becker und 1 weitere"
}

/* ───────────────────────── Overlays ───────────────────────── */

/** KonturDialog — service on top of CDK Dialog. Class: k-dialog.
 *  role="dialog", aria-modal, aria-labelledby on the title, focus trap, focus returns to trigger, Esc closes. */
interface DialogConfig<D> {
  title: string;
  data?: D;
  size?: "sm" | "md";          // 400 / 480 px
  disableClose?: boolean;      // no Esc / backdrop close (for required decisions)
}
interface DialogRef<R> { close(result?: R): void; readonly closed: import("rxjs").Observable<R | undefined>; }
/** Ready-made confirm dialog used by the app for destructive actions. */
interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "default" | "danger"; // danger → confirm button k-btn--danger
}
// KonturDialog.open<C, D, R>(component: Type<C>, config: DialogConfig<D>): DialogRef<R>
// KonturDialog.confirm(config: ConfirmDialogConfig): Promise<boolean>

/** KonturToast — service. Class: k-toast. Queue, max 3 visible (bottom-right desktop, top mobile
 *  = below 960 px, the one breakpoint, see README).
 *  info/success: role="status", auto-dismiss; warning/error: role="alert", stay until closed.
 *  Owner, 2026-11-23 (Toast.md): every toast has a close button (k-icon-btn, KonturIntl.closeLabel);
 *  a toast with an action never auto-dismisses; the timer pauses on hover and focus (WCAG 2.2.1);
 *  icons by tone as in Alert; live regions exist from app start: provideKonturToast().
 *  The role belongs to two hidden live regions (status / alert by tone), not to the visible
 *  toast; announced text = title + message + "Aktion: <action label>" (KonturIntl.actionLabel). */
interface ToastOptions {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;              // bold lead-in, e.g. "Signiert."
  durationMs?: number;         // default 5000 for info/success; ignored for warning/error and with an action
  action?: { label: string; run: () => void };
}
// KonturToast.show(message: string, options?: ToastOptions): void

/** <k-alert> — InlineAlert / Banner (v4.4). Class: k-alert (+ k-alert--info|success|warning|error, k-alert--banner).
 *  A message that stays in the page flow; never auto-dismisses; not focusable itself.
 *  Use: form-level errors (e.g. sign-in failed), session expired, offline banner, demo sandbox banner.
 *  Not for: field errors (FormField.error), transient confirmations (Toast).
 *  Icon by tone, different shape per tone (lucide): info → "info", success → "circle-check",
 *  warning → "triangle-alert", error → "circle-alert". Icon is aria-hidden; the tone is in the text.
 *  live=true  → error/warning: role="alert"; info/success: role="status".
 *  live=false → no role: content that is present when the page loads (e.g. "Sitzung abgelaufen").
 *  Re-announcement: a repeated identical message must be announced again — the host re-creates
 *  the element on every failed submit, the component does not dedupe. @if is NOT enough: once the
 *  counter is 1 the condition stays true and Angular keeps the same element. Re-create it with
 *  @for over a one-item list keyed by the counter:
 *    @for (n of [submitCount()]; track n) { @if (n > 0) { <k-alert tone="error" live>…</k-alert> } }
 *  A new track key destroys the old element and inserts a new one, so the reader announces again.
 *  Visibility is owned by the host: on close the alert moves the focus, emits `dismissed` and
 *  does NOT hide itself; the host removes it (@if). One source of truth. */
interface AlertProps {
  tone?: "info" | "success" | "warning" | "error";   // default "info"
  title?: string;              // bold first line, e.g. "Anmeldung fehlgeschlagen"
  variant?: "inline" | "banner"; // default "inline"; banner = full width, no radius, top of shell
  live?: boolean;              // default false
  dismissible?: boolean;       // close button k-icon-btn; aria-label from KonturIntl, member `closeLabel` (de "Schließen", en "Close", ru "Закрыть")
}
interface AlertOutputs { dismissed: void; }
// Content: message projected as default content; actions in <div k-alert-actions> (k-btn --sm, ghost or secondary).

/** [kTooltip] — directive. Class: k-tooltip. Shows on hover AND focus, hides on Esc,
 *  links via aria-describedby. Text only, max 240 px; never the only place of essential info. */
interface TooltipProps {
  kTooltip: string;
  kTooltipPosition?: "above" | "below" | "left" | "right";  // default "above"
  kTooltipDelayMs?: number;   // default 300
}

/** [kMenuTriggerFor] + <k-menu> + <button k-menu-item> — built on CDK Menu. Classes: k-menu, k-menu-item.
 *  Arrow keys, Home/End, Esc, typeahead (CDK). */
interface MenuItemProps {
  danger?: boolean;            // k-menu-item is-danger, placed last after a separator
  disabled?: boolean;
}
interface MenuItemOutputs { triggered: void; }
// <hr k-menu-separator> — separator

/* ───────────────────────── Navigation ───────────────────────── */

/** <k-tabs> + <k-tab> — Class: k-tabs, k-tab. ARIA tabs pattern, arrow keys, automatic activation.
 *  Content projected per tab, or used as nav-tabs with routerLink (then role="navigation", aria-current). */
interface TabsProps {
  ariaLabel: string;
  selectedIndex?: number;      // model()
}
interface TabProps { label: string; count?: number | null; disabled?: boolean; }

/** <k-stepper> — Class: k-stepper. Display of wizard progress; navigation is handled by the page. */
interface StepperProps {
  steps: ReadonlyArray<{ label: string; state: "done" | "current" | "todo" }>;
  ariaLabel: string;           // current step gets aria-current="step"
}

/** <k-breadcrumbs> — Class: k-crumbs. <nav aria-label>, last item is plain text with aria-current="page". */
interface BreadcrumbsProps {
  items: ReadonlyArray<{ label: string; link?: string | ReadonlyArray<unknown> }>; // link = routerLink value
  ariaLabel: string;           // e.g. "Pfad"
}

/** <k-sidenav> + <a k-sidenav-item> + <k-sidenav-group> — Classes: k-sidenav, k-sidenav-item.
 *  Desktop: fixed 232 px column. Below 960 px: collapses into a drawer (CDK Overlay) opened by a menu button. */
interface SidenavProps { ariaLabel: string; brandLabel: string; }
interface SidenavItemProps {
  icon?: string;               // lucide icon name
  count?: number | null;       // k-count, mono
}                              // active state from routerLinkActive → aria-current="page"
interface SidenavGroupProps { label: string; }

/* ───────────────────────── Upload & Progress ───────────────────────── */

/** <k-file-drop> — Class: k-filedrop. Drag & drop + click/Enter opens file picker; validates type and size.
 *  Does NOT upload: emits files, the page decides what to do (unzip, OCR, upload). */
interface FileDropProps {
  accept: string;              // e.g. "application/pdf" or ".jpg,.png,.heic,.pdf,.zip"
  multiple?: boolean;
  maxSizeMb?: number;
  maxFiles?: number;
  label: string;               // "PDF hierher ziehen oder Datei wählen"
  hint?: string;               // "PDF, max. 25 MB"
  error?: string | null;
}
interface FileDropOutputs { filesSelected: ReadonlyArray<File>; rejected: ReadonlyArray<{ file: File; reason: "type" | "size" | "count" }>; }

/** <k-progress> — Class: k-progress. role="progressbar" with aria-valuenow; value null = indeterminate.
 *  The visible label names the bar (aria-labelledby); the percent is formatted with
 *  Intl.NumberFormat(KonturIntl.locale(), { style: "percent" }) (owner, 2026-11-23, Progress.md). */
interface ProgressProps { value: number | null; tone?: "brand" | "success" | "error"; label: string; }
/** <k-spinner> — Class: k-spinner. role="status" with aria-label. */
interface SpinnerProps { label: string; size?: number; }
/** <k-progress-ring> — Class: k-ring. Circular progress with optional centered percent. */
interface ProgressRingProps { value: number; size?: number; label: string; showValue?: boolean; }

/* ───────────────────────── Belegscan-specific (lives in apps/belegscan, not libs/ui) ───────────────────────── */

/** OCR confidence frame over the receipt image. Classes: k-ocr-box, --mid, --low.
 *  Confidence thresholds: ≥ 0.85 solid (sicher), 0.60–0.85 dashed (prüfen), < 0.60 dotted (unsicher). */
interface OcrBoxProps {
  box: { x: number; y: number; width: number; height: number };  // in image pixels; scaled by the viewer
  confidence: number;          // 0..1
  selected?: boolean;
  fieldLabel: string;          // aria-label, e.g. "Datum, 62 % Sicherheit"
}
interface OcrBoxOutputs { selectedChange: void; }
