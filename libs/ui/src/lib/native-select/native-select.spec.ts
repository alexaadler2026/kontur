import { render, screen } from '@testing-library/angular';
import { FormFieldComponent } from '../form-field/form-field';
import { NativeSelectDirective, SelectWrapComponent } from './native-select';

// Task 8-3, owner 2026-11-24: the language switch of the sign-in screen is a native
// <select> with the Kontur class k-select (the full combobox Select is UI-13, task 34).
// <k-select-wrap> loads the styles and draws the chevron; select[k-select] sets the
// classes and, inside k-form-field, the id and ARIA links — as k-input does.

const imports = [
  SelectWrapComponent,
  NativeSelectDirective,
  FormFieldComponent,
];

const languages = `
  <option value="de">Deutsch</option>
  <option value="en">English</option>
  <option value="ru">Русский</option>`;

describe('k-select-wrap + select[k-select]', () => {
  it('a native select (combobox) named by aria-label, with the Kontur classes', async () => {
    await render(
      `<k-select-wrap><select k-select aria-label="Sprache">${languages}</select></k-select-wrap>`,
      { imports },
    );

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('k-select');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('the wrapper is k-field-wrap; the chevron after the select is decorative', async () => {
    const { container } = await render(
      `<k-select-wrap><select k-select aria-label="Sprache">${languages}</select></k-select-wrap>`,
      { imports },
    );

    const wrap = container.querySelector('k-select-wrap') as HTMLElement;
    expect(wrap).toHaveClass('k-field-wrap');
    const chevron = wrap.querySelector(':scope > svg') as SVGElement;
    expect(chevron).toHaveClass('k-ico', 'lucide-chevron-down');
    expect(chevron).toHaveAttribute('aria-hidden', 'true');
    expect(chevron.previousElementSibling?.tagName).toBe('SELECT');
  });

  it.each([
    ['sm', 'k-select--sm'],
    ['touch', 'k-select--touch'],
  ])('size %s → %s', async (size, cls) => {
    await render(
      `<k-select-wrap><select k-select [size]="size" aria-label="Sprache">${languages}</select></k-select-wrap>`,
      { imports, componentProperties: { size } },
    );

    expect(screen.getByRole('combobox')).toHaveClass('k-select', cls);
  });

  // A static size="sm" would also stay on the element as the native HTML attribute
  // (number of visible rows): the select would no longer be a combobox (found in 8-3).
  it('a static size="sm" sets the class, not the native size attribute', async () => {
    await render(
      `<k-select-wrap><select k-select size="sm" aria-label="Sprache">${languages}</select></k-select-wrap>`,
      { imports },
    );

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    expect(select).toHaveClass('k-select--sm');
    expect(select).not.toHaveAttribute('size');
  });

  it('md (default) adds no size class', async () => {
    await render(
      `<k-select-wrap><select k-select aria-label="Sprache">${languages}</select></k-select-wrap>`,
      { imports },
    );

    expect(screen.getByRole('combobox').className).toBe('k-select');
  });

  it('inside k-form-field: named by the label, linked to the hint, like k-input', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await render(
      `<k-form-field label="Sprache" hint="Gilt für alle Seiten.">
        <k-select-wrap><select k-select>${languages}</select></k-select-wrap>
      </k-form-field>`,
      { imports },
    );

    const select = screen.getByRole('combobox', { name: 'Sprache' });
    expect(select).toHaveAccessibleDescription('Gilt für alle Seiten.');
    expect(error).not.toHaveBeenCalled(); // the label is the name
    error.mockRestore();
  });

  it('without the wrapper: a clear error while developing (no styles, no chevron)', async () => {
    await expect(
      render(`<select k-select aria-label="Sprache">${languages}</select>`, {
        imports,
      }),
    ).rejects.toThrow('select[k-select] must be placed inside <k-select-wrap>');
  });

  // The name is usually a binding ([attr.aria-label]="t(…)"), invisible to a constructor
  // check, so it is checked after rendering and reported with console.error.
  it('without a name (no aria-label, no k-form-field): console.error while developing', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await render(
      `<k-select-wrap><select k-select>${languages}</select></k-select-wrap>`,
      { imports },
    );

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('select[k-select] needs a name'),
      expect.anything(),
    );
    error.mockRestore();
  });

  it('a bound aria-label counts as a name (no error)', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    await render(
      `<k-select-wrap><select k-select [attr.aria-label]="name">${languages}</select></k-select-wrap>`,
      { imports, componentProperties: { name: 'Sprache' } },
    );

    expect(screen.getByRole('combobox', { name: 'Sprache' })).toBeTruthy();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
