import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { CheckboxComponent } from './checkbox';

// Labels are documentation examples from docs/design/components/Checkbox.html,
// not product text (product text goes through i18n).

const column =
  'display: flex; flex-direction: column; gap: 12px; padding: 16px;';

/** Value comes from a form (contract: the value is not an input). */
const states = () => ({
  props: {
    copy: new FormControl(false),
    agb: new FormControl(true),
    locked: new FormControl({ value: false, disabled: true }),
    fixed: new FormControl({ value: true, disabled: true }),
  },
  template: `<div style="${column}">
    <k-checkbox label="Kopie an mich senden" [formControl]="copy" />
    <k-checkbox label="AGB akzeptiert" [formControl]="agb" />
    <k-checkbox label="Teilweise gewählt" [indeterminate]="true" />
    <k-checkbox label="Nicht verfügbar" [formControl]="locked" />
    <k-checkbox label="Fixiert" [formControl]="fixed" />
  </div>`,
});

/** Typed reactive form: the AGB error appears after a submit attempt. */
@Component({
  selector: 'k-story-agb-form',
  imports: [ReactiveFormsModule, CheckboxComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate style="${column}">
      <k-checkbox
        label="Ich stimme den AGB zu"
        hint="Pflicht für die Registrierung"
        formControlName="agb"
        [error]="
          submitted() && form.controls.agb.invalid
            ? 'Bitte stimmen Sie den AGB zu, um fortzufahren'
            : null
        "
      />
      <div>
        <button k-button variant="primary" type="submit">Weiter</button>
      </div>
    </form>
  `,
})
class AgbFormStoryComponent {
  readonly form = new FormGroup({
    agb: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });
  protected readonly submitted = signal(false);

  protected submit(): void {
    this.submitted.set(true);
  }
}

const meta: Meta = {
  title: 'Components/Checkbox',
  decorators: [
    moduleMetadata({ imports: [ReactiveFormsModule, CheckboxComponent] }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          '`<k-checkbox label hint error [indeterminate]>` — a native checkbox inside the reference ' +
          'markup; the boolean value goes through Angular forms (ControlValueAccessor, ADR-0004). ' +
          'Errors are text, not color only (WCAG 1.4.1, 3.3.1).',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const States: Story = { render: states };

export const WithHint: Story = {
  name: 'With hint',
  render: () => ({
    props: { reminders: new FormControl(false) },
    template: `<div style="${column}">
      <k-checkbox label="Erinnerungen per E-Mail" hint="Einmal täglich, wenn Dokumente auf Sie warten" [formControl]="reminders" />
    </div>`,
  }),
};

export const ErrorState: Story = {
  name: 'Error',
  render: () => ({
    props: { agb: new FormControl(false) },
    template: `<div style="${column}">
      <k-checkbox label="Ich stimme den AGB zu" error="Bitte stimmen Sie den AGB zu, um fortzufahren" [formControl]="agb" />
    </div>`,
  }),
};

/** Dark theme: check marks are masks colored by --text-on-brand (v3), so they keep contrast. */
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

export const ReactiveForm: Story = {
  name: 'Reactive form',
  decorators: [moduleMetadata({ imports: [AgbFormStoryComponent] })],
  render: () => ({ template: `<k-story-agb-form />` }),
};
