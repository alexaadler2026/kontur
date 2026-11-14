import { render, screen } from '@testing-library/angular';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { ButtonComponent } from './button';
import { IconButtonComponent } from './icon-button';

const imports = [ButtonComponent, IconButtonComponent];

/**
 * The reference CSS already sets pointer-events: none on disabled/loading buttons, and
 * user-event refuses to click such elements. We click anyway, to prove the component itself
 * blocks the click (CSS alone does not stop Enter/Space or programmatic clicks).
 */
const userIgnoringCss = () =>
  userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

describe('k-button', () => {
  it('defaults to the secondary variant and md size (md = no size modifier)', async () => {
    await render(`<button k-button>Speichern</button>`, { imports });

    const button = screen.getByRole('button', { name: 'Speichern' });
    expect([...button.classList]).toEqual(['k-btn', 'k-btn--secondary']);
  });

  it('applies variant and size modifiers from the reference CSS', async () => {
    await render(
      `<button k-button variant="primary" size="touch">Foto aufnehmen</button>
       <button k-button variant="danger" size="sm">Löschen</button>
       <button k-button variant="ghost" size="md">Mehr</button>`,
      { imports },
    );

    expect(
      screen.getByRole('button', { name: 'Foto aufnehmen' }).className,
    ).toBe('k-btn k-btn--primary k-btn--touch');
    expect(screen.getByRole('button', { name: 'Löschen' }).className).toBe(
      'k-btn k-btn--danger k-btn--sm',
    );
    expect(screen.getByRole('button', { name: 'Mehr' }).className).toBe(
      'k-btn k-btn--ghost',
    );
  });

  describe('type', () => {
    it('is type="button" by default, so it does not submit a surrounding form', async () => {
      const submitted = vi.fn();
      await render(
        `<form (submit)="onSubmit($event)"><button k-button>Weiter</button></form>`,
        { imports, componentProperties: { onSubmit: preventAnd(submitted) } },
      );

      const button = screen.getByRole('button', { name: 'Weiter' });
      expect(button.getAttribute('type')).toBe('button');
      await userEvent.click(button);
      expect(submitted).not.toHaveBeenCalled();
    });

    it('keeps an explicit type="submit", which submits the form', async () => {
      const submitted = vi.fn();
      await render(
        `<form (submit)="onSubmit($event)"><button k-button type="submit">Senden</button></form>`,
        { imports, componentProperties: { onSubmit: preventAnd(submitted) } },
      );

      await userEvent.click(screen.getByRole('button', { name: 'Senden' }));
      expect(submitted).toHaveBeenCalledTimes(1);
    });

    it('sets no type on <a k-button>', async () => {
      await render(`<a k-button href="/dokumente">Dokumente</a>`, { imports });

      expect(
        screen.getByRole('link', { name: 'Dokumente' }).hasAttribute('type'),
      ).toBe(false);
    });
  });

  it('disabled <button> uses the native attribute and ignores clicks', async () => {
    const clicked = vi.fn();
    await render(
      `<button k-button disabled (click)="clicked()">Speichern</button>`,
      {
        imports,
        componentProperties: { clicked },
      },
    );

    const button = screen.getByRole('button', { name: 'Speichern' });
    expect(button.hasAttribute('disabled')).toBe(true);
    await userIgnoringCss().click(button);
    expect(clicked).not.toHaveBeenCalled();
  });

  describe('loading', () => {
    async function renderLoading() {
      const clicked = vi.fn();
      await render(
        `<button k-button variant="primary" loading (click)="clicked()">Speichern</button>`,
        { imports, componentProperties: { clicked } },
      );
      return {
        clicked,
        button: screen.getByRole('button', { name: 'Speichern' }),
      };
    }

    it('marks the button busy and keeps its accessible name', async () => {
      const { button } = await renderLoading();

      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.classList).toContain('is-loading');
      // getByRole(..., { name: 'Speichern' }) above already proves the name is still there
    });

    it('blocks mouse clicks, Enter and Space, and keeps the focus', async () => {
      const { clicked, button } = await renderLoading();
      const user = userIgnoringCss();

      await user.click(button);
      button.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');

      expect(clicked).not.toHaveBeenCalled();
      expect(button.hasAttribute('disabled')).toBe(false); // not disabled → focus is not lost
      expect(document.activeElement).toBe(button);
    });
  });

  it('disabled <a k-button> is aria-disabled, leaves the tab order and does not navigate', async () => {
    const clicked = vi.fn();
    await render(
      `<a k-button href="/x" disabled (click)="clicked()">Archiv</a>`,
      {
        imports,
        componentProperties: { clicked },
      },
    );

    const link = screen.getByRole('link', { name: 'Archiv' });
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); // no navigation
    expect(clicked).not.toHaveBeenCalled();
  });
});

describe('k-icon-button', () => {
  it('has an accessible name from ariaLabel and the reference class', async () => {
    await render(`<button k-icon-button ariaLabel="Schließen">×</button>`, {
      imports,
    });

    const button = screen.getByRole('button', { name: 'Schließen' });
    expect(button.className).toBe('k-icon-btn');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('supports size sm (k-icon-btn--sm)', async () => {
    await render(
      `<button k-icon-button ariaLabel="Filter" size="sm">⋯</button>`,
      { imports },
    );

    expect(screen.getByRole('button', { name: 'Filter' }).className).toBe(
      'k-icon-btn k-icon-btn--sm',
    );
  });

  it('does not submit a surrounding form by default', async () => {
    const submitted = vi.fn();
    await render(
      `<form (submit)="onSubmit($event)"><button k-icon-button ariaLabel="Suchen">⌕</button></form>`,
      { imports, componentProperties: { onSubmit: preventAnd(submitted) } },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(submitted).not.toHaveBeenCalled();
  });
});

/** Form submit handler for tests: stops the (unimplemented) jsdom navigation, then records the call. */
function preventAnd(spy: () => void): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    spy();
  };
}
