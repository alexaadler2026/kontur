import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { disabled, form, FormField } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CheckboxComponent } from './checkbox';

describe('k-checkbox', () => {
  it('renders the reference markup with the label as accessible name', async () => {
    await render(`<k-checkbox label="Kopie an mich senden" />`, {
      imports: [CheckboxComponent],
    });

    const box = screen.getByRole('checkbox', { name: 'Kopie an mich senden' });
    expect(box).not.toBeChecked();
    expect(box.closest('label')).toHaveClass('k-check');
    expect(box.closest('k-checkbox')).toHaveClass('k-choice-item');
  });

  it('hint and error: text, aria-describedby (hint, then error), aria-invalid', async () => {
    await render(
      `<k-checkbox label="Ich stimme den AGB zu"
         hint="Pflicht für die Registrierung"
         error="Bitte stimmen Sie den AGB zu, um fortzufahren" />`,
      { imports: [CheckboxComponent] },
    );

    const box = screen.getByRole('checkbox', { name: 'Ich stimme den AGB zu' });
    expect(box).toBeInvalid();
    expect(box.closest('label')).toHaveClass('k-check', 'is-invalid');
    expect(box).toHaveAccessibleDescription(
      'Pflicht für die Registrierung Bitte stimmen Sie den AGB zu, um fortzufahren',
    );
  });

  it('without error: not invalid, no describedby', async () => {
    await render(`<k-checkbox label="AGB" [error]="null" />`, {
      imports: [CheckboxComponent],
    });

    const box = screen.getByRole('checkbox', { name: 'AGB' });
    expect(box).not.toBeInvalid();
    expect(box).not.toHaveAttribute('aria-describedby');
  });

  describe('typed reactive forms', () => {
    @Component({
      imports: [ReactiveFormsModule, CheckboxComponent],
      template: `<k-checkbox label="AGB akzeptiert" [formControl]="agb" />`,
    })
    class HostComponent {
      readonly agb = new FormControl(false, { nonNullable: true });
    }

    it('click and Space write to the form; setValue checks the box', async () => {
      const { fixture } = await render(HostComponent);
      const agb = fixture.componentInstance.agb;
      const box = screen.getByRole('checkbox', { name: 'AGB akzeptiert' });
      const user = userEvent.setup();

      await user.click(box);
      expect(agb.value).toBe(true);
      await user.keyboard(' ');
      expect(agb.value).toBe(false);

      agb.setValue(true);
      fixture.detectChanges();
      expect(box).toBeChecked();
    });

    it('marks the control touched on blur', async () => {
      const { fixture } = await render(HostComponent);
      const agb = fixture.componentInstance.agb;

      screen.getByRole('checkbox').focus();
      await userEvent.tab();

      expect(agb.touched).toBe(true);
    });

    it('control.disable() disables the native input and greys the label', async () => {
      const { fixture } = await render(HostComponent);

      fixture.componentInstance.agb.disable();
      fixture.detectChanges();

      const box = screen.getByRole('checkbox', { name: 'AGB akzeptiert' });
      expect(box).toBeDisabled();
      expect(box.closest('label')).toHaveClass('is-disabled');
    });
  });

  it('works with Signal Forms via [formField] (CVA compatibility, ADR-0004)', async () => {
    @Component({
      imports: [FormField, CheckboxComponent],
      template: `<k-checkbox
        label="AGB akzeptiert"
        [formField]="contract.agb"
      />`,
    })
    class SignalHostComponent {
      readonly model = signal({ agb: false });
      readonly locked = signal(false);
      readonly contract = form(this.model, (path) => {
        disabled(path.agb, () => this.locked());
      });
    }

    const { fixture } = await render(SignalHostComponent);
    const host = fixture.componentInstance;
    const box = screen.getByRole('checkbox', { name: 'AGB akzeptiert' });

    await userEvent.click(box);
    expect(host.model().agb).toBe(true);

    host.model.set({ agb: false });
    fixture.detectChanges();
    expect(box).not.toBeChecked();

    host.locked.set(true);
    fixture.detectChanges();
    expect(box).toBeDisabled();
  });

  it('indeterminate: shown as mixed; a click clears it and reports the change', async () => {
    const changes: boolean[] = [];
    await render(
      `<k-checkbox label="Teilweise gewählt" [indeterminate]="true" (indeterminateChange)="changes.push($event)" />`,
      { imports: [CheckboxComponent], componentProperties: { changes } },
    );

    const box = screen.getByRole('checkbox', { name: 'Teilweise gewählt' });
    expect(box).toBePartiallyChecked();

    await userEvent.click(box);

    expect(box).not.toBePartiallyChecked();
    expect(box).toBeChecked();
    expect(changes).toEqual([false]);
  });
});
