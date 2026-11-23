import { computed, inject, Injectable, signal } from '@angular/core';
import { KonturIntl } from '../intl/kontur-intl';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

/** Contract: ToastOptions (docs/design/api-contracts.d.ts). */
export interface ToastOptions {
  tone?: ToastTone;
  /** Bold lead-in, e.g. "Signiert." */
  title?: string;
  /** Default 5000 for info/success; ignored for warning/error and with an action. */
  durationMs?: number;
  action?: { label: string; run: () => void };
}

/** One toast as the region draws it. */
export interface ToastItem {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly title?: string;
  readonly action?: { label: string; run: () => void };
}

export const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION_MS = 5000;
/**
 * Clear, wait, write: a screen reader announces a live region when its content CHANGES.
 * Writing the same text again changes nothing, so the region is emptied first and written
 * after this pause (the value Angular CDK's LiveAnnouncer uses).
 */
export const ANNOUNCE_DELAY_MS = 100;

/** The auto-dismiss timer of one toast; null for toasts that stay. */
interface Timer {
  remainingMs: number;
  startedAt: number;
  handle: ReturnType<typeof setTimeout> | null;
  hovered: boolean;
  focused: boolean;
}

/** One live region: what it shows now and what waits for the pause. */
class LiveRegion {
  readonly text = signal('');
  private pending: string[] = [];
  private handle: ReturnType<typeof setTimeout> | null = null;

  announce(text: string): void {
    this.pending.push(text);
    this.text.set('');
    if (this.handle !== null) return; // joins the message already waiting
    this.handle = setTimeout(() => {
      this.text.set(this.pending.join(' '));
      this.pending = [];
      this.handle = null;
    }, ANNOUNCE_DELAY_MS);
  }
}

/** Adds a full stop unless the part already ends a sentence. */
function sentence(part: string): string {
  return /[.!?…:]$/u.test(part) ? part : `${part}.`;
}

/**
 * KonturToast — `inject(KonturToast).show('Erinnerung wurde gesendet.', { tone: 'success' })`.
 * Spec: docs/design/components/Toast.md. Needs provideKonturToast() in the app providers.
 *
 * - A queue: the first 3 are visible, the rest wait until one closes.
 * - Announced through two hidden live regions that exist from app start: info/success →
 *   role="status" (polite), warning/error → role="alert". The visible toast has no role.
 * - Only info/success WITHOUT an action leave by themselves (5000 ms or durationMs), counted
 *   from the moment they appear; mouse or focus on the toast pauses the timer (WCAG 2.2.1).
 */
@Injectable({ providedIn: 'root' })
export class KonturToast {
  private readonly intl = inject(KonturIntl);
  private readonly items = signal<ToastItem[]>([]);
  private readonly timers = new Map<number, Timer | null>();
  private nextId = 0;
  private regionAttached = false;

  /** The toasts on screen, oldest first. */
  readonly visible = computed(() => this.items().slice(0, MAX_VISIBLE_TOASTS));
  private readonly polite = new LiveRegion();
  private readonly assertive = new LiveRegion();
  /** Text of the role="status" region. */
  readonly politeText = this.polite.text.asReadonly();
  /** Text of the role="alert" region. */
  readonly assertiveText = this.assertive.text.asReadonly();

  show(message: string, options: ToastOptions = {}): void {
    if (!this.regionAttached) {
      console.error(
        `KonturToast: "${message}" is not shown — add provideKonturToast() to the app providers.`,
      );
      return;
    }
    const item: ToastItem = {
      id: this.nextId++,
      message,
      tone: options.tone ?? 'info',
      title: options.title,
      action: options.action,
    };
    this.items.update((items) => [...items, item]);
    this.timers.set(item.id, this.timerFor(item, options.durationMs));
    this.activateNewlyVisible();
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    this.timers.delete(id);
    this.items.update((items) => items.filter((item) => item.id !== id));
    this.activateNewlyVisible();
  }

  /** The action button: run it, then close the toast. */
  runAction(item: ToastItem): void {
    item.action?.run();
    this.dismiss(item.id);
  }

  setHovered(id: number, hovered: boolean): void {
    this.update(id, (timer) => (timer.hovered = hovered));
  }

  setFocused(id: number, focused: boolean): void {
    this.update(id, (timer) => (timer.focused = focused));
  }

  /** Called by provideKonturToast() once the region is in the page. */
  attachRegion(): void {
    this.regionAttached = true;
  }

  private timerFor(item: ToastItem, durationMs?: number): Timer | null {
    const leavesByItself =
      (item.tone === 'info' || item.tone === 'success') && !item.action;
    if (!leavesByItself) return null;
    return {
      remainingMs: durationMs ?? DEFAULT_DURATION_MS,
      startedAt: 0,
      handle: null,
      hovered: false,
      focused: false,
    };
  }

  /** Toasts that just came on screen: announce them and start their timers. */
  private readonly activated = new Set<number>();
  private activateNewlyVisible(): void {
    for (const item of this.visible()) {
      if (this.activated.has(item.id)) continue;
      this.activated.add(item.id);
      this.announce(item);
      const timer = this.timers.get(item.id);
      if (timer) this.start(item.id, timer);
    }
    for (const id of this.activated) {
      if (!this.timers.has(id)) this.activated.delete(id);
    }
  }

  private announce(item: ToastItem): void {
    const parts = [item.title, item.message].filter(
      (part): part is string => !!part,
    );
    if (item.action) {
      parts.push(`${this.intl.actionLabel()}: ${item.action.label}`);
    }
    const text = parts
      .map((part, i) => (i < parts.length - 1 ? sentence(part) : part))
      .join(' ');
    const region =
      item.tone === 'warning' || item.tone === 'error'
        ? this.assertive
        : this.polite;
    region.announce(text);
  }

  private update(id: number, change: (timer: Timer) => void): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    const wasPaused = timer.hovered || timer.focused;
    change(timer);
    const isPaused = timer.hovered || timer.focused;
    if (!wasPaused && isPaused && timer.handle) {
      clearTimeout(timer.handle);
      timer.handle = null;
      timer.remainingMs -= Date.now() - timer.startedAt;
    } else if (wasPaused && !isPaused && this.activated.has(id)) {
      this.start(id, timer);
    }
  }

  private start(id: number, timer: Timer): void {
    if (timer.hovered || timer.focused) return;
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remainingMs);
  }
}
