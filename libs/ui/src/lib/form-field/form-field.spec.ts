import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FormFieldComponent } from './form-field';
import { InputDirective } from './input';

const imports = [FormFieldComponent, InputDirective];

describe('k-form-field + k-input', () => {
  describe('label', () => {
    it('links the label to the input via a generated id', async () => {
      await render(
        `<k-form-field label="Vertragspartner"><input k-input /></k-form-field>
         <k-form-field label="Ort"><input k-input /></k-form-field>`,
        { imports },
      );

      const partner = screen.getByLabelText('Vertragspartner');
      const ort = screen.getByLabelText('Ort');
      expect(partner.tagName).toBe('INPUT');
      expect(partner.id).toMatch(/^k-field-\d+$/);
      expect(partner.id).not.toBe(ort.id);
    });

    it('keeps an explicit id on the input', async () => {
      await render(
        `<k-form-field label="Vertragspartner"><input k-input id="partner" /></k-form-field>`,
        { imports },
      );

      expect(screen.getByLabelText('Vertragspartner').id).toBe('partner');
    });
  });

  describe('classes', () => {
    it('sets k-field; md is the absence of a size modifier', async () => {
      await render(
        `<k-form-field label="Name"><input k-input /></k-form-field>`,
        { imports },
      );

      expect(screen.getByLabelText('Name').className).toBe('k-field');
    });

    it('numeric → k-num, size touch → k-field--touch', async () => {
      await render(
        `<k-form-field label="IBAN"><input k-input numeric /></k-form-field>
         <k-form-field label="Betrag"><input k-input size="touch" /></k-form-field>`,
        { imports },
      );

      expect(screen.getByLabelText('IBAN').className).toBe('k-field k-num');
      expect(screen.getByLabelText('Betrag').className).toBe(
        'k-field k-field--touch',
      );
    });

    it('works on <textarea k-input>', async () => {
      await render(
        `<k-form-field label="Notiz"><textarea k-input></textarea></k-form-field>`,
        {
          imports,
        },
      );

      const notiz = screen.getByLabelText('Notiz');
      expect(notiz.tagName).toBe('TEXTAREA');
      expect(notiz).toHaveClass('k-field');
    });
  });

  it('describes the input with the hint', async () => {
    await render(
      `<k-form-field label="Vertragspartner" hint="Juristischer Name laut Handelsregister">
         <input k-input />
       </k-form-field>`,
      { imports },
    );

    const input = screen.getByLabelText('Vertragspartner');
    expect(input).toHaveAccessibleDescription(
      'Juristischer Name laut Handelsregister',
    );
    expect(input).not.toBeInvalid();
  });

  describe('error', () => {
    it('shows hint and error; describedby lists hint first, then error', async () => {
      await render(
        `<k-form-field label="Datum" hint="Format TT.MM.JJJJ" error="Datum im Format TT.MM.JJJJ">
           <input k-input />
         </k-form-field>`,
        { imports },
      );

      const input = screen.getByLabelText('Datum');
      expect(input).toBeInvalid(); // aria-invalid="true"
      expect(input).toHaveClass('k-field', 'is-invalid');
      expect(input).toHaveAccessibleDescription(
        'Format TT.MM.JJJJ Datum im Format TT.MM.JJJJ',
      );

      const [hintId, errorId] = (
        input.getAttribute('aria-describedby') ?? ''
      ).split(' ');
      expect(document.getElementById(hintId)).toHaveClass('k-hint');
      expect(document.getElementById(errorId)).toHaveClass('k-error-msg');
    });

    it('removes invalid state and message when error becomes null', async () => {
      const { rerender } = await render(
        `<k-form-field label="Datum" [error]="error"><input k-input /></k-form-field>`,
        {
          imports,
          componentProperties: {
            error: 'Datum im Format TT.MM.JJJJ' as string | null,
          },
        },
      );
      expect(
        screen.getByText('Datum im Format TT.MM.JJJJ'),
      ).toBeInTheDocument();

      await rerender({ componentProperties: { error: null } });

      const input = screen.getByLabelText('Datum');
      expect(input).not.toBeInvalid();
      expect(input).not.toHaveAttribute('aria-describedby');
      expect(
        screen.queryByText('Datum im Format TT.MM.JJJJ'),
      ).not.toBeInTheDocument();
    });
  });

  it('required: decorative marker outside the accessible name, aria-required on the input', async () => {
    await render(
      `<k-form-field label="Vertragspartner" required><input k-input /></k-form-field>`,
      { imports },
    );

    // getByLabelText compares the label's text content (which contains "*");
    // getByRole compares the accessible name, i.e. what a screen reader announces.
    const input = screen.getByRole('textbox', { name: 'Vertragspartner' });
    expect(input).toHaveAccessibleName('Vertragspartner');
    expect(input).toBeRequired();
    expect(document.querySelector('.k-required')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('error icon: decorative SVG drawn in the SVG namespace, 14×14 and without a class, like the mockup (TextField.html)', async () => {
    await render(
      `<k-form-field label="E-Mail" error="Bitte füllen Sie dieses Feld aus."><input k-input /></k-form-field>`,
      { imports },
    );

    const icon = document.querySelector('.k-error-msg svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('width', '14');
    expect(icon).toHaveAttribute('height', '14');
    expect(icon).not.toHaveClass('k-ico');
    expect(icon?.querySelector('path')?.namespaceURI).toBe(
      'http://www.w3.org/2000/svg',
    );
  });

  it('works with typed reactive forms (value in both directions, disabled)', async () => {
    @Component({
      imports: [ReactiveFormsModule, ...imports],
      template: `<form [formGroup]="form">
        <k-form-field label="Vertragspartner"
          ><input k-input formControlName="partner"
        /></k-form-field>
      </form>`,
    })
    class HostComponent {
      readonly form = new FormGroup({
        partner: new FormControl('', { nonNullable: true }),
      });
    }

    const { fixture } = await render(HostComponent);
    const control = fixture.componentInstance.form.controls.partner;
    const input = screen.getByLabelText('Vertragspartner');

    await userEvent.type(input, 'Muster Logistik GmbH');
    expect(control.value).toBe('Muster Logistik GmbH');

    control.setValue('Weber & Partner');
    expect(input).toHaveValue('Weber & Partner');

    control.disable();
    fixture.detectChanges();
    expect(input).toBeDisabled();
  });

  it('fails fast in dev mode when k-input is used without k-form-field', async () => {
    await expect(render(`<input k-input />`, { imports })).rejects.toThrow(
      'k-input must be placed inside k-form-field',
    );
  });
});
