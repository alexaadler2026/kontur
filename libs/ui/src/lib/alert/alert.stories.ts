import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { AlertActionsDirective, AlertComponent } from './alert';

// Alert texts are documentation examples from docs/design/components/Alert.html,
// not product text (product text goes through i18n). The close button's name comes from
// KonturIntl — in this Storybook from Transloco, so it follows the toolbar.

const column =
  'display: flex; flex-direction: column; gap: 12px; max-width: 480px; padding: 16px;';

/** The inline examples of the mockup (Alert.html), same order and roles. */
const inline = `<div style="${column}">
  <k-alert tone="error" live>E-Mail-Adresse oder Passwort ist falsch.</k-alert>
  <k-alert tone="warning" live title="Anmeldung vorübergehend gesperrt">
    Zu viele Anmeldeversuche. Bitte versuchen Sie es in 15 Minuten erneut.
  </k-alert>
  <k-alert dismissible>Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.</k-alert>
  <k-alert tone="success" live>
    Ihr Passwort wurde geändert. Sie können sich jetzt anmelden.
    <div k-alert-actions>
      <button k-button variant="secondary" size="sm">Zur Anmeldung</button>
    </div>
  </k-alert>
</div>`;

const banners = `<div style="display: flex; flex-direction: column; background: var(--bg-surface);">
  <k-alert variant="banner" tone="warning" live>
    Offline — 3 Belege werden synchronisiert, sobald eine Verbindung besteht.
    <div k-alert-actions>
      <button k-button variant="ghost" size="sm">Jetzt synchronisieren</button>
    </div>
  </k-alert>
  <k-alert variant="banner">
    Demo-Modus — alle Daten werden nach 24 Stunden gelöscht.
    <div k-alert-actions><button k-button variant="ghost" size="sm">Neu starten</button></div>
  </k-alert>
</div>`;

/**
 * Controlled visibility (Alert.md): the alert only moves the focus and emits `dismissed`;
 * this host owns the `visible` state and removes the alert with @if.
 */
@Component({
  selector: 'k-story-session-expired',
  imports: [AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="${column}">
      <h1 style="font-size: 20px; margin: 0;">Anmelden</h1>
      @if (visible()) {
        <k-alert dismissible (dismissed)="visible.set(false)">
          Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.
        </k-alert>
      }
      <button k-button data-testid="next">Anmelden</button>
    </div>
  `,
})
class SessionExpiredStoryComponent {
  protected readonly visible = signal(true);
}

/**
 * Re-announcement (Alert.md): every failed submit re-creates the alert, so a screen reader
 * announces the same text again. `@if (submitCount())` would keep the same element once
 * the counter is 1; `@for` keyed by the counter replaces it.
 */
@Component({
  selector: 'k-story-failed-sign-in',
  imports: [AlertComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="${column}">
      @for (n of [submitCount()]; track n) {
        @if (n > 0) {
          <k-alert tone="error" live
            >E-Mail-Adresse oder Passwort ist falsch.</k-alert
          >
        }
      }
      <button k-button (click)="submitCount.set(submitCount() + 1)">
        Anmelden
      </button>
    </div>
  `,
})
class FailedSignInStoryComponent {
  protected readonly submitCount = signal(0);
}

const meta: Meta<AlertComponent> = {
  title: 'Components/Alert',
  component: AlertComponent,
  decorators: [
    moduleMetadata({ imports: [AlertActionsDirective, ButtonComponent] }),
  ],
};
export default meta;
type Story = StoryObj<AlertComponent>;

export const Inline: Story = {
  render: () => ({ template: inline }),
};

export const Banner: Story = {
  render: () => ({ template: banners }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${inline}${banners}</div>`,
  }),
};

export const Dismissible: Story = {
  name: 'Dismissible (host removes it, focus moves on)',
  decorators: [moduleMetadata({ imports: [SessionExpiredStoryComponent] })],
  render: () => ({ template: `<k-story-session-expired />` }),
};

export const Reannounce: Story = {
  name: 'Re-announce on every failed submit',
  decorators: [moduleMetadata({ imports: [FailedSignInStoryComponent] })],
  render: () => ({ template: `<k-story-failed-sign-in />` }),
};
