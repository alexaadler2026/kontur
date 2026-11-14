import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent, type ButtonSize, type ButtonVariant } from './button';
import { IconButtonComponent } from './icon-button';

// Labels are documentation examples taken from docs/design/components/Button.html,
// not product text (product text goes through i18n).

// Icons: inline SVG copied from the Button mockup (Lucide style). An icon component
// comes with its own ADR, together with the first component that requires icons.
const ICON_PEN =
  '<svg class="k-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';
const ICON_UPLOAD =
  '<svg class="k-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M12 17V4m0 0 5 5m-5-5-5 5M4 20h16"/></svg>';
const ICON_MORE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

const row =
  'display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px;';

interface PlaygroundArgs {
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  loading: boolean;
  disabled: boolean;
}

const meta: Meta<PlaygroundArgs> = {
  title: 'Components/Button',
  decorators: [
    moduleMetadata({ imports: [ButtonComponent, IconButtonComponent] }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          '`<button k-button>` / `<a k-button>` — attribute on the native element, so role, ' +
          'keyboard and form behaviour stay native. One primary per screen; danger only for ' +
          'irreversible actions, next to a secondary "Abbrechen". Default `type="button"`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<PlaygroundArgs>;

export const Playground: Story = {
  args: {
    label: 'Speichern',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: { control: 'inline-radio', options: ['md', 'sm', 'touch'] },
  },
  render: (args) => ({
    props: args,
    template: `<div style="${row}">
      <button k-button [variant]="variant" [size]="size" [loading]="loading" [disabled]="disabled">{{ label }}</button>
    </div>`,
  }),
};

export const Variants: Story = {
  render: () => ({
    template: `<div style="${row}">
      <button k-button variant="primary">${ICON_PEN}Unterschreiben</button>
      <button k-button variant="secondary">${ICON_UPLOAD}Hochladen</button>
      <button k-button variant="ghost">Abbrechen</button>
      <button k-button variant="danger">Löschen</button>
    </div>`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    template: `<div style="${row}">
      <button k-button variant="primary" size="sm">Klein (32 px)</button>
      <button k-button variant="primary">Mittel (36 px)</button>
      <button k-button variant="primary" size="touch">Touch (44 px)</button>
    </div>`,
  }),
};

export const States: Story = {
  render: () => ({
    template: `<div style="${row}">
      <button k-button variant="primary" disabled>Deaktiviert</button>
      <button k-button variant="secondary" disabled>Deaktiviert</button>
      <button k-button variant="ghost" disabled>Deaktiviert</button>
      <button k-button variant="primary" loading>Speichern</button>
      <button k-button variant="secondary" loading>Speichern</button>
    </div>`,
  }),
};

export const AsLink: Story = {
  name: 'As link',
  render: () => ({
    template: `<div style="${row}">
      <a k-button variant="secondary" href="#dokumente">Zu den Dokumenten</a>
      <a k-button variant="secondary" href="#archiv" disabled>Archiv (deaktiviert)</a>
    </div>`,
  }),
};

export const IconButtons: Story = {
  name: 'Icon buttons',
  render: () => ({
    template: `<div style="${row}">
      <button k-icon-button ariaLabel="Mehr">${ICON_MORE}</button>
      <button k-icon-button ariaLabel="Mehr (klein)" size="sm">${ICON_MORE}</button>
    </div>`,
  }),
};

/** Long German compounds and Cyrillic labels must not be cut (white-space: nowrap). */
export const LongLabels: Story = {
  name: 'Long labels (de, ru)',
  render: () => ({
    template: `<div style="${row}">
      <button k-button variant="primary">Auftragsverarbeitungsvertrag</button>
      <button k-button variant="secondary">Подписать документ</button>
    </div>`,
  }),
};
