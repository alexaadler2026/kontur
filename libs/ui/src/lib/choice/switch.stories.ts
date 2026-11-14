import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { SwitchComponent } from './switch';

// Labels are documentation examples from docs/design/components/Switch.html,
// not product text (product text goes through i18n).

const column =
  'display: flex; flex-direction: column; gap: 12px; padding: 16px;';

/** The reference states: off, on, disabled. Value comes from a form. */
const states = () => ({
  props: {
    reminders: new FormControl(false),
    dark: new FormControl(true),
    locked: new FormControl({ value: false, disabled: true }),
  },
  template: `<div style="${column}">
    <k-switch label="Erinnerungen" [formControl]="reminders" />
    <k-switch label="Dunkles Design" [formControl]="dark" />
    <k-switch label="Gesperrt" [formControl]="locked" />
  </div>`,
});

/**
 * What Switch is for: a setting that applies immediately, without a Save button.
 * The value stream becomes a signal at the edge (toSignal) and drives data-theme.
 */
@Component({
  selector: 'k-story-instant-setting',
  imports: [ReactiveFormsModule, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      data-testid="settings-panel"
      [attr.data-theme]="dark() ? 'dark' : 'light'"
      style="${column} background: var(--bg-page); color: var(--text-primary);"
    >
      <k-switch label="Dunkles Design" [formControl]="theme" />
    </div>
  `,
})
class InstantSettingStoryComponent {
  protected readonly theme = new FormControl(false, { nonNullable: true });
  protected readonly dark = toSignal(this.theme.valueChanges, {
    initialValue: false,
  });
}

const meta: Meta = {
  title: 'Components/Switch',
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule, SwitchComponent] }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          '`<k-switch label>` — a native checkbox with role="switch" in the reference markup; ' +
          'boolean value through Angular forms (ControlValueAccessor, ADR-0004). ' +
          'Only for settings applied immediately; in forms with a Save button use Checkbox.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const States: Story = { render: states };

/** Dark theme: the knob is --switch-knob (= --text-on-brand, dark), 7.4:1 on brand (v3). */
export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => {
    const { props, template } = states();
    return {
      props,
      template: `<div data-theme="dark" style="background: var(--bg-page); color: var(--text-primary);">${template}</div>`,
    };
  },
};

/** Long German compounds and Cyrillic labels sit next to the track, never cut. */
export const LongLabels: Story = {
  name: 'Long labels (de, ru)',
  render: () => ({
    props: { a: new FormControl(true), b: new FormControl(false) },
    template: `<div style="${column} max-width: 320px;">
      <k-switch label="Benachrichtigungseinstellungen für Vertragsverlängerungen" [formControl]="a" />
      <k-switch label="Уведомления о продлении договоров" [formControl]="b" />
    </div>`,
  }),
};

export const InstantSetting: Story = {
  name: 'Instant setting',
  decorators: [moduleMetadata({ imports: [InstantSettingStoryComponent] })],
  render: () => ({ template: `<k-story-instant-setting />` }),
};
