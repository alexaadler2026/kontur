import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { SidenavGroupComponent } from './sidenav-group';
import { SidenavItemComponent } from './sidenav-item';
import { SidenavComponent } from './sidenav';

const imports = [SidenavComponent, SidenavItemComponent, SidenavGroupComponent];

// Requirement: name, comma, count. Spaces around the comma depend on the engine's
// name computation (Chromium adds one before it, jsdom does not), so they are free.
const draftsName = /^Entwürfe\s*,\s*3$/;

// The app sets aria-current (routerLinkActive); the library only styles it.
const template = `
  <k-sidenav ariaLabel="Hauptnavigation">
    <span kSidenavBrand>SignFlow</span>
    <a k-sidenav-item href="#a" aria-current="page">Übersicht</a>
    <a k-sidenav-item href="#b" [count]="3">Entwürfe</a>
    <k-sidenav-group label="Verwaltung">
      <a k-sidenav-item href="#c">Vorlagen</a>
    </k-sidenav-group>
    <span kSidenavFooter>max.beispiel@firma.de</span>
  </k-sidenav>`;

describe('k-sidenav', () => {
  it('is a navigation landmark named by ariaLabel, with brand and footer slots', async () => {
    await render(template, { imports });

    const nav = screen.getByRole('navigation', { name: 'Hauptnavigation' });
    expect(nav).toHaveClass('k-sidenav');
    expect(nav).toHaveTextContent('SignFlow');
    expect(nav).toHaveTextContent('max.beispiel@firma.de');
  });

  it('items are links with k-sidenav-item; aria-current from the app is kept', async () => {
    await render(template, { imports });

    const active = screen.getByRole('link', { name: 'Übersicht' });
    expect(active).toHaveClass('k-sidenav-item');
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Vorlagen' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('the count is read with the item name, separated by a comma: "Entwürfe, 3"', async () => {
    await render(template, { imports });

    const link = screen.getByRole('link', { name: draftsName });
    const count = link.querySelector('.k-count');
    expect(count).toHaveClass('k-num');
    expect(count).toHaveTextContent(/^3$/); // the comma is for screen readers only
  });

  it('no count → no k-count element', async () => {
    await render(template, { imports });

    expect(
      screen.getByRole('link', { name: 'Übersicht' }).querySelector('.k-count'),
    ).toBeNull();
  });

  it('a group is role="group" named by its visible label', async () => {
    await render(template, { imports });

    const group = screen.getByRole('group', { name: 'Verwaltung' });
    const labelId = group.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const label = document.getElementById(labelId as string);
    expect(label).toHaveClass('k-sidenav-group');
    expect(label).toHaveTextContent('Verwaltung');
    expect(group).toContainElement(
      screen.getByRole('link', { name: 'Vorlagen' }),
    );
  });

  it('two groups get different label ids', async () => {
    await render(
      `<k-sidenav ariaLabel="Nav">
         <k-sidenav-group label="Eins"><a k-sidenav-item href="#1">A</a></k-sidenav-group>
         <k-sidenav-group label="Zwei"><a k-sidenav-item href="#2">B</a></k-sidenav-group>
       </k-sidenav>`,
      { imports },
    );

    const [one, two] = screen.getAllByRole('group');
    expect(one.getAttribute('aria-labelledby')).not.toBe(
      two.getAttribute('aria-labelledby'),
    );
  });

  it('Tab moves through the links in order', async () => {
    const user = userEvent.setup();
    await render(template, { imports });

    await user.tab();
    expect(screen.getByRole('link', { name: 'Übersicht' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: draftsName })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Vorlagen' })).toHaveFocus();
  });
});
