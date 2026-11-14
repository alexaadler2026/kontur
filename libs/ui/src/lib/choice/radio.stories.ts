import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { RadioComponent } from './radio';
import { RadioGroupComponent } from './radio-group';

// Labels are documentation examples from docs/design/components/Radio.html,
// not product text (product text goes through i18n).

const row =
  'display: flex; gap: 48px; flex-wrap: wrap; align-items: flex-start; padding: 16px;';

/** The two groups of the reference page: hint + disabled option, and required + error. */
const states = () => ({
  props: {
    order: new FormControl('sequential'),
    level: new FormControl<string | null>(null),
  },
  template: `<div style="${row}">
    <k-radio-group legend="Reihenfolge der Unterschriften" name="order"
      hint="Gilt für alle Unterzeichnenden dieses Umlaufs" [formControl]="order">
      <k-radio value="sequential" label="Nacheinander — jede Person wartet auf die vorige" />
      <k-radio value="parallel" label="Parallel — alle gleichzeitig" />
      <k-radio value="custom" label="Benutzerdefiniert (bald verfügbar)" disabled />
    </k-radio-group>
    <k-radio-group legend="Signaturniveau" name="level" required
      error="Bitte wählen Sie ein Signaturniveau" [formControl]="level">
      <k-radio value="ses" label="Einfach (SES)" />
      <k-radio value="aes" label="Fortgeschritten (AES)" />
    </k-radio-group>
  </div>`,
});

/** Typed reactive form: the error appears after a submit attempt without a choice. */
@Component({
  selector: 'k-story-signing-form',
  imports: [
    ReactiveFormsModule,
    RadioGroupComponent,
    RadioComponent,
    ButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="submitted.set(true)"
      novalidate
      style="display: flex; flex-direction: column; gap: 16px; padding: 16px;"
    >
      <k-radio-group
        legend="Signaturniveau"
        name="signing-level"
        hint="Bestimmt, wie stark die Unterschrift rechtlich bindet"
        required
        formControlName="level"
        [error]="
          submitted() && form.controls.level.invalid
            ? 'Bitte wählen Sie ein Signaturniveau'
            : null
        "
      >
        <k-radio value="ses" label="Einfach (SES)" />
        <k-radio value="aes" label="Fortgeschritten (AES)" />
        <k-radio value="qes" label="Qualifiziert (QES)" />
      </k-radio-group>
      <div>
        <button k-button variant="primary" type="submit">Weiter</button>
      </div>
    </form>
  `,
})
class SigningFormStoryComponent {
  readonly form = new FormGroup({
    level: new FormControl<'ses' | 'aes' | 'qes' | null>(null, [
      Validators.required,
    ]),
  });
  protected readonly submitted = signal(false);
}

const meta: Meta = {
  title: 'Components/Radio',
  decorators: [
    moduleMetadata({
      imports: [ReactiveFormsModule, RadioGroupComponent, RadioComponent],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          '`<k-radio-group legend name hint error required>` with `<k-radio value label disabled>` — ' +
          'native radios sharing `name` (arrow keys, one Tab stop). The group is the ' +
          'ControlValueAccessor (ADR-0004); hint and error are described on the fieldset. ' +
          '`name` must be unique on the page.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const States: Story = { render: states };

/** Dark theme: the selected dot is --brand with an inner ring of --bg-surface. */
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

/** Long German compounds and Cyrillic labels wrap next to the circle, never cut. */
export const LongLabels: Story = {
  name: 'Long labels (de, ru)',
  render: () => ({
    props: { mode: new FormControl('avv') },
    template: `<div style="${row}; max-width: 360px;">
      <k-radio-group legend="Vertragsart" name="contract" [formControl]="mode">
        <k-radio value="avv" label="Auftragsverarbeitungsvertrag nach Art. 28 DSGVO" />
        <k-radio value="nda" label="Geheimhaltungsvereinbarung" />
        <k-radio value="ru" label="Договор поручения на обработку персональных данных" />
      </k-radio-group>
    </div>`,
  }),
};

export const ReactiveForm: Story = {
  name: 'Reactive form',
  decorators: [moduleMetadata({ imports: [SigningFormStoryComponent] })],
  render: () => ({ template: `<k-story-signing-form />` }),
};
