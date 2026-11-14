import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { FormFieldComponent } from './form-field';
import { InputDirective } from './input';

// Labels and values are documentation examples from docs/design/components/TextField.html,
// not product text (product text goes through i18n).

const grid =
  'display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 320px)); gap: 16px 24px; padding: 16px;';

/** Typed reactive form: errors appear after blur or after a submit attempt. */
@Component({
  selector: 'k-story-contract-form',
  imports: [
    ReactiveFormsModule,
    FormFieldComponent,
    InputDirective,
    ButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      novalidate
      style="display: grid; gap: 16px; padding: 16px; max-width: 360px;"
    >
      <k-form-field
        label="Vertragspartner"
        hint="Juristischer Name laut Handelsregister"
        required
        [error]="
          errorFor(form.controls.partner, 'Bitte Vertragspartner angeben')
        "
      >
        <input k-input formControlName="partner" autocomplete="organization" />
      </k-form-field>
      <k-form-field
        label="Vertragsbeginn"
        hint="z. B. 01.01.2027"
        required
        [error]="errorFor(form.controls.start, 'Datum im Format TT.MM.JJJJ')"
      >
        <input k-input formControlName="start" inputmode="numeric" />
      </k-form-field>
      <k-form-field
        label="IBAN"
        hint="Für die Rechnungsstellung"
        [error]="
          errorFor(
            form.controls.iban,
            'IBAN beginnt mit zwei Buchstaben, z. B. DE'
          )
        "
      >
        <input k-input numeric formControlName="iban" />
      </k-form-field>
      <div>
        <button k-button variant="primary" type="submit">Speichern</button>
      </div>
      @if (saved()) {
        <p class="k-caption" role="status">
          Gespeichert: {{ form.getRawValue().partner }}
        </p>
      }
    </form>
  `,
})
class ContractFormStoryComponent {
  readonly form = new FormGroup({
    partner: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    start: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d{2}\.\d{2}\.\d{4}$/),
      ],
    }),
    iban: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^([A-Z]{2}.*)?$/)],
    }),
  });

  protected readonly submitted = signal(false);
  protected readonly saved = signal(false);

  protected errorFor(control: AbstractControl, message: string): string | null {
    return control.invalid && (control.touched || this.submitted())
      ? message
      : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    this.saved.set(this.form.valid);
  }
}

const meta: Meta = {
  title: 'Components/TextField',
  decorators: [
    moduleMetadata({ imports: [FormFieldComponent, InputDirective] }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          '`<k-form-field label hint error required>` wrapping `<input k-input>` / `<textarea k-input>`. ' +
          'The field links label, hint and error to the input (label[for], aria-describedby: hint, ' +
          'then error; aria-invalid; aria-required). The input stays native, so Angular forms work ' +
          'unchanged. Texts arrive already translated.',
      },
    },
  },
};
export default meta;

type Story = StoryObj;

export const States: Story = {
  render: () => ({
    template: `<div style="${grid}">
      <k-form-field label="Vertragspartner" hint="Juristischer Name laut Handelsregister">
        <input k-input value="Muster Logistik GmbH" />
      </k-form-field>
      <k-form-field label="Placeholder">
        <input k-input placeholder="z. B. Weber &amp; Partner" />
      </k-form-field>
      <k-form-field label="Pflichtfeld" required>
        <input k-input value="Rahmenvertrag 2027" />
      </k-form-field>
      <k-form-field label="Disabled">
        <input k-input value="SF-2026-0142" disabled />
      </k-form-field>
    </div>`,
  }),
};

/** Hint and error together: the hint explains how to fix the error (GOV.UK pattern). */
export const ErrorState: Story = {
  name: 'Error with hint',
  render: () => ({
    template: `<div style="${grid}">
      <k-form-field label="Fehler" hint="z. B. 31.12.2026" error="Datum im Format TT.MM.JJJJ">
        <input k-input value="12-11-2026" />
      </k-form-field>
    </div>`,
  }),
};

export const NumericAndTouch: Story = {
  name: 'Numeric and touch',
  render: () => ({
    template: `<div style="${grid}">
      <k-form-field label="IBAN">
        <input k-input numeric value="DE89 3704 0044 0532 0130 00" />
      </k-form-field>
      <k-form-field label="Betrag (Touch, 44 px)">
        <input k-input numeric size="touch" inputmode="decimal" value="1.284,50" />
      </k-form-field>
    </div>`,
  }),
};

export const Textarea: Story = {
  render: () => ({
    template: `<div style="${grid}">
      <k-form-field label="Notiz" hint="Sichtbar für alle Unterzeichnenden">
        <textarea k-input rows="4">Bitte bis Freitag unterschreiben.</textarea>
      </k-form-field>
    </div>`,
  }),
};

/** Russian labels, as in the mockup ("Моно для номеров"). */
export const RussianLabels: Story = {
  name: 'Russian labels',
  render: () => ({
    template: `<div style="${grid}">
      <k-form-field label="Моно для номеров" hint="Номер счёта" required>
        <input k-input numeric value="DE89 3704 0044 0532 0130 00" />
      </k-form-field>
    </div>`,
  }),
};

export const ReactiveForm: Story = {
  name: 'Reactive form',
  decorators: [moduleMetadata({ imports: [ContractFormStoryComponent] })],
  render: () => ({ template: `<k-story-contract-form />` }),
};
