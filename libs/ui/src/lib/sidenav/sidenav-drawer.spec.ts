import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { KonturIntlDe, provideKonturIntl } from '../intl/kontur-intl';
import { SidenavDrawerComponent } from './sidenav-drawer';
import { SidenavItemComponent } from './sidenav-item';
import { SidenavComponent } from './sidenav';

// jsdom 27 has no showModal()/close(). This stand-in does what the browser does for
// the logic under test: toggles `open` and fires `close`. Focus trap, Escape, backdrop
// geometry, scroll lock and width are checked in real Chromium (ui-storybook-e2e).
beforeAll(() => {
  const proto = HTMLDialogElement.prototype;
  proto.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close ??= function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

@Component({
  imports: [SidenavDrawerComponent, SidenavComponent, SidenavItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="menuOpen.set(true)">Menü</button>
    <k-sidenav-drawer [(open)]="menuOpen" ariaLabel="Menü">
      <k-sidenav ariaLabel="Hauptnavigation">
        <a k-sidenav-item href="#a">Übersicht</a>
      </k-sidenav>
      <span kDrawerFooter>Sprache</span>
    </k-sidenav-drawer>
    <output>{{ menuOpen() }}</output>
  `,
})
class HostComponent {
  readonly menuOpen = signal(false);
}

async function setup() {
  const user = userEvent.setup();
  const { fixture } = await render(HostComponent, {
    providers: [provideKonturIntl(KonturIntlDe)],
  });
  const dialog = () => document.querySelector('dialog') as HTMLDialogElement;
  const state = () => screen.getByRole('status').textContent?.trim();
  return { user, dialog, state, fixture };
}

describe('k-sidenav-drawer', () => {
  it('closed by default; open=true shows a modal dialog named by ariaLabel, focus on the close button', async () => {
    const { user, dialog } = await setup();
    expect(dialog().open).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Menü' }));

    expect(dialog().open).toBe(true);
    expect(dialog()).toHaveAttribute('aria-label', 'Menü');
    expect(dialog()).toHaveClass('k-sidenav-drawer');
    expect(screen.getByRole('button', { name: 'Schließen' })).toHaveFocus();
    expect(dialog()).toHaveTextContent('Sprache'); // footer slot
  });

  it('the close button closes it, open becomes false, focus returns to the opener', async () => {
    const { user, dialog, state } = await setup();
    const opener = screen.getByRole('button', { name: 'Menü' });
    await user.click(opener);

    await user.click(screen.getByRole('button', { name: 'Schließen' }));

    expect(dialog().open).toBe(false);
    expect(state()).toBe('false');
    expect(opener).toHaveFocus();
  });

  it('a native close (Escape → cancel → close) syncs open=false; it opens again afterwards', async () => {
    const { user, dialog, state, fixture } = await setup();
    await user.click(screen.getByRole('button', { name: 'Menü' }));

    dialog().close(); // what the browser does after Escape
    await fixture.whenStable(); // not a userEvent, so wait for the render
    expect(state()).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Menü' }));
    expect(dialog().open).toBe(true);
    expect(state()).toBe('true');
  });

  it('a click on a sidenav item inside closes it', async () => {
    const { user, dialog, state } = await setup();
    await user.click(screen.getByRole('button', { name: 'Menü' }));

    await user.click(screen.getByRole('link', { name: 'Übersicht' }));

    expect(dialog().open).toBe(false);
    expect(state()).toBe('false');
  });

  // Backdrop = a click on <dialog> OUTSIDE the panel's rectangle (owner, 2026-11-27).
  // jsdom has no layout: the panel's rectangle is stubbed to 232 × 640 at the left edge.
  const panelRect = { left: 0, top: 0, right: 232, bottom: 640 } as DOMRect;
  const clickDialogAt = (dialog: HTMLDialogElement, clientX: number) =>
    dialog.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX, clientY: 300 }),
    );

  it('a click on the backdrop (on <dialog>, outside the panel rectangle) closes it', async () => {
    const { user, dialog, state, fixture } = await setup();
    await user.click(screen.getByRole('button', { name: 'Menü' }));
    dialog().getBoundingClientRect = () => panelRect;

    await user.click(screen.getByText('Sprache')); // inside the panel content
    expect(dialog().open).toBe(true);

    clickDialogAt(dialog(), 300); // right of the panel
    await fixture.whenStable();
    expect(dialog().open).toBe(false);
    expect(state()).toBe('false');
  });

  it('a click on <dialog> inside the panel rectangle (empty space) does not close it', async () => {
    const { user, dialog, state, fixture } = await setup();
    await user.click(screen.getByRole('button', { name: 'Menü' }));
    dialog().getBoundingClientRect = () => panelRect;

    clickDialogAt(dialog(), 100);
    await fixture.whenStable(); // the close would run in an effect, after rendering

    expect(dialog().open).toBe(true);
    expect(state()).toBe('true');
  });
});
