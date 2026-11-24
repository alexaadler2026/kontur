import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { FormFieldComponent } from '../form-field/form-field';
import { NativeSelectDirective, SelectWrapComponent } from './native-select';

// Labels are documentation examples (the language switch of docs/design/screens/signflow/
// Anmelden.html), not product text: product text goes through i18n. Language names are
// written in their own language, as switches usually show them.

const options = `
  <option value="de">Deutsch</option>
  <option value="en">English</option>
  <option value="ru">Русский</option>`;

const sizes = `<div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; width: 240px;">
  <k-select-wrap><select k-select size="sm" aria-label="Sprache (sm)">${options}</select></k-select-wrap>
  <k-select-wrap><select k-select aria-label="Sprache (md)">${options}</select></k-select-wrap>
  <k-select-wrap><select k-select size="touch" aria-label="Sprache (touch)">${options}</select></k-select-wrap>
  <k-select-wrap><select k-select aria-label="Sprache (deaktiviert)" disabled>${options}</select></k-select-wrap>
  <k-form-field label="Sprache" hint="Gilt für alle Seiten.">
    <k-select-wrap><select k-select>${options}</select></k-select-wrap>
  </k-form-field>
  <k-form-field label="Sprache" error="Bitte eine Sprache wählen.">
    <k-select-wrap><select k-select>${options}</select></k-select-wrap>
  </k-form-field>
</div>`;

const meta: Meta<SelectWrapComponent> = {
  title: 'Components/NativeSelect',
  component: SelectWrapComponent,
  decorators: [
    moduleMetadata({ imports: [NativeSelectDirective, FormFieldComponent] }),
  ],
};
export default meta;
type Story = StoryObj<SelectWrapComponent>;

/** sm / md / touch, disabled, and inside k-form-field (hint, error). Named by aria-label. */
export const Sizes: Story = {
  render: () => ({ template: sizes }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${sizes}</div>`,
  }),
};
