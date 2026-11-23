import { Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import {
  KonturIntl,
  KonturIntlDe,
  KonturIntlEn,
  KonturIntlRu,
  provideKonturIntl,
} from '../intl/kontur-intl';
import { TagComponent } from './tag';

describe('KonturIntl (built-in a11y strings of the library)', () => {
  it('German is the default without any provider', () => {
    expect(TestBed.inject(KonturIntl).removeLabel()).toBe('Entfernen');
  });

  it.each([
    [KonturIntlDe, 'Entfernen'],
    [KonturIntlEn, 'Remove'],
    [KonturIntlRu, 'Удалить'],
  ])('provideKonturIntl(%o) → %s', (intl, label) => {
    TestBed.configureTestingModule({ providers: [provideKonturIntl(intl)] });

    expect(TestBed.inject(KonturIntl).removeLabel()).toBe(label);
  });
});

describe('k-tag', () => {
  it('renders a category chip without a remove button by default', async () => {
    await render(`<k-tag data-testid="tag">Verpflegung</k-tag>`, {
      imports: [TagComponent],
    });

    const tag = screen.getByTestId('tag');
    expect(tag).toHaveClass('k-tag');
    expect(tag).toHaveTextContent('Verpflegung');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('removable: the button is named "action + tag text", so several tags are distinguishable', async () => {
    await render(
      `<k-tag removable>NDA</k-tag><k-tag removable>Q4-2026</k-tag>`,
      { imports: [TagComponent] },
    );

    const nda = screen.getByRole('button', { name: 'Entfernen NDA' });
    expect(nda).toHaveClass('k-tag-x');
    expect(nda).toHaveAttribute('type', 'button'); // never submits a surrounding form
    expect(
      screen.getByRole('button', { name: 'Entfernen Q4-2026' }),
    ).toBeInTheDocument();
  });

  it('remove icon: decorative SVG drawn in the SVG namespace, 12×12 and without a class, like the mockup (Tag.html)', async () => {
    await render(`<k-tag removable>Steuer</k-tag>`, {
      imports: [TagComponent],
    });

    const icon = screen.getByRole('button').querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('width', '12');
    expect(icon).toHaveAttribute('height', '12');
    expect(icon).not.toHaveClass('k-ico');
    expect(icon?.querySelector('path')?.namespaceURI).toBe(
      'http://www.w3.org/2000/svg',
    );
  });

  it('click, Enter and Space emit "removed" (the consumer removes the tag)', async () => {
    const removed = vi.fn();
    await render(`<k-tag removable (removed)="removed()">NDA</k-tag>`, {
      imports: [TagComponent],
      componentProperties: { removed },
    });
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Entfernen NDA' });

    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(removed).toHaveBeenCalledTimes(3);
  });

  it('removeLabel overrides the KonturIntl text', async () => {
    await render(
      `<k-tag removable removeLabel="Filter entfernen">Signiert</k-tag>`,
      { imports: [TagComponent] },
    );

    expect(
      screen.getByRole('button', { name: 'Filter entfernen Signiert' }),
    ).toBeInTheDocument();
  });

  it.each([
    [KonturIntlEn, 'Remove NDA'],
    [KonturIntlRu, 'Удалить NDA'],
  ])('uses the provided KonturIntl (%o → "%s")', async (intl, name) => {
    await render(`<k-tag removable>NDA</k-tag>`, {
      imports: [TagComponent],
      providers: [provideKonturIntl(intl)],
    });

    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  });

  it('follows a language switch at runtime (KonturIntl members are signals)', async () => {
    @Injectable()
    class SwitchableIntl extends KonturIntl {
      readonly label = signal('Entfernen');
      readonly closeLabel = signal('Schließen').asReadonly();
      readonly removeLabel = this.label.asReadonly();
      readonly locale = signal('de-DE').asReadonly();
      readonly actionLabel = signal('Aktion').asReadonly();
    }
    const { fixture } = await render(`<k-tag removable>NDA</k-tag>`, {
      imports: [TagComponent],
      providers: [provideKonturIntl(SwitchableIntl)],
    });

    (TestBed.inject(KonturIntl) as SwitchableIntl).label.set('Удалить');
    fixture.detectChanges();

    expect(
      await screen.findByRole('button', { name: 'Удалить NDA' }),
    ).toBeInTheDocument();
  });
});
