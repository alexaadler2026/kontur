import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { disabled, form, FormField } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { RadioComponent } from './radio';
import { RadioGroupComponent } from './radio-group';

type Level = 'ses' | 'aes' | 'qes';

describe('k-radio-group + k-radio', () => {
  it('renders the reference markup: fieldset group with legend name, radios share the name', async () => {
    await render(
      `<k-radio-group legend="Signaturniveau" name="level">
         <k-radio value="ses" label="Einfach (SES)" />
         <k-radio value="aes" label="Fortgeschritten (AES)" />
       </k-radio-group>`,
      { imports: [RadioGroupComponent, RadioComponent] },
    );

    const group = screen.getByRole('group', { name: 'Signaturniveau' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group).toHaveClass('k-choice-group');
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toHaveAttribute('name', 'level');
      expect(radio).not.toBeChecked();
      expect(radio.closest('label')).toHaveClass('k-radio');
    }
    expect(
      screen.getByRole('radio', { name: 'Einfach (SES)' }),
    ).toBeInTheDocument();
  });

  it('hint and error: described on the fieldset (hint, then error); no aria-invalid on radios', async () => {
    await render(
      `<k-radio-group legend="Signaturniveau" name="level"
         hint="Gilt für alle Unterzeichnenden"
         error="Bitte wählen Sie ein Signaturniveau">
         <k-radio value="ses" label="Einfach (SES)" />
       </k-radio-group>`,
      { imports: [RadioGroupComponent, RadioComponent] },
    );

    const group = screen.getByRole('group', { name: 'Signaturniveau' });
    expect(group).toHaveClass('is-invalid');
    expect(group).toHaveAccessibleDescription(
      'Gilt für alle Unterzeichnenden Bitte wählen Sie ein Signaturniveau',
    );
    expect(screen.getByRole('radio')).not.toHaveAttribute('aria-invalid');
  });

  it('required: native required on every radio, no aria-required, aria-hidden marker in the legend', async () => {
    await render(
      `<k-radio-group legend="Signaturniveau" name="level" required>
         <k-radio value="ses" label="Einfach (SES)" />
         <k-radio value="aes" label="Fortgeschritten (AES)" />
       </k-radio-group>`,
      { imports: [RadioGroupComponent, RadioComponent] },
    );

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeRequired();
      expect(radio).not.toHaveAttribute('aria-required');
    }
    // the "*" is decorative: not part of the group's accessible name
    expect(
      screen.getByRole('group', { name: 'Signaturniveau' }),
    ).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
  });

  describe('typed reactive forms', () => {
    @Component({
      imports: [ReactiveFormsModule, RadioGroupComponent, RadioComponent],
      template: ` <k-radio-group
          legend="Signaturniveau"
          name="level"
          [formControl]="level"
        >
          <k-radio value="ses" label="Einfach (SES)" />
          <k-radio value="aes" label="Fortgeschritten (AES)" />
          <k-radio
            value="qes"
            label="Qualifiziert (QES)"
            [disabled]="qesOff()"
          />
        </k-radio-group>
        <button type="button">Weiter</button>`,
    })
    class HostComponent {
      readonly level = new FormControl<Level | null>(null);
      readonly qesOff = signal(false);
    }

    it('label click and arrow keys write the value; setValue checks, setValue(null) clears', async () => {
      const { fixture } = await render(HostComponent);
      const level = fixture.componentInstance.level;
      const user = userEvent.setup();

      await user.click(screen.getByText('Einfach (SES)'));
      expect(level.value).toBe('ses');
      await user.keyboard('{ArrowDown}');
      expect(level.value).toBe('aes');
      expect(
        screen.getByRole('radio', { name: 'Fortgeschritten (AES)' }),
      ).toBeChecked();

      level.setValue('qes');
      fixture.detectChanges();
      expect(
        screen.getByRole('radio', { name: 'Qualifiziert (QES)' }),
      ).toBeChecked();

      level.setValue(null);
      fixture.detectChanges();
      for (const radio of screen.getAllByRole('radio'))
        expect(radio).not.toBeChecked();
    });

    it('touched only when focus leaves the group, not while arrowing inside it', async () => {
      const { fixture } = await render(HostComponent);
      const level = fixture.componentInstance.level;
      const user = userEvent.setup();

      await user.click(screen.getByText('Einfach (SES)'));
      await user.keyboard('{ArrowDown}');
      expect(level.touched).toBe(false);

      await user.tab();
      expect(screen.getByRole('button', { name: 'Weiter' })).toHaveFocus();
      expect(level.touched).toBe(true);
    });

    it('control.disable() disables every radio and greys the labels', async () => {
      const { fixture } = await render(HostComponent);

      fixture.componentInstance.level.disable();
      fixture.detectChanges();

      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toBeDisabled();
        expect(radio.closest('label')).toHaveClass('is-disabled');
      }
    });

    it('a single disabled option cannot be chosen', async () => {
      const { fixture } = await render(HostComponent);
      fixture.componentInstance.qesOff.set(true);
      fixture.detectChanges();

      const qes = screen.getByRole('radio', { name: 'Qualifiziert (QES)' });
      expect(qes).toBeDisabled();
      expect(qes.closest('label')).toHaveClass('is-disabled');
      await userEvent.click(screen.getByText('Qualifiziert (QES)'));
      expect(fixture.componentInstance.level.value).toBeNull();
    });
  });

  it('works with Signal Forms via [formField] (CVA compatibility, ADR-0004)', async () => {
    @Component({
      imports: [FormField, RadioGroupComponent, RadioComponent],
      template: ` <k-radio-group
        legend="Signaturniveau"
        name="level"
        [formField]="signing.level"
      >
        <k-radio value="ses" label="Einfach (SES)" />
        <k-radio value="aes" label="Fortgeschritten (AES)" />
      </k-radio-group>`,
    })
    class SignalHostComponent {
      readonly model = signal<{ level: Level | null }>({ level: null });
      readonly locked = signal(false);
      readonly signing = form(this.model, (path) => {
        disabled(path.level, () => this.locked());
      });
    }

    const { fixture } = await render(SignalHostComponent);
    const host = fixture.componentInstance;

    await userEvent.click(screen.getByText('Fortgeschritten (AES)'));
    expect(host.model().level).toBe('aes');

    host.model.set({ level: 'ses' });
    fixture.detectChanges();
    expect(screen.getByRole('radio', { name: 'Einfach (SES)' })).toBeChecked();

    host.locked.set(true);
    fixture.detectChanges();
    for (const radio of screen.getAllByRole('radio'))
      expect(radio).toBeDisabled();
  });

  it('k-radio outside k-radio-group fails with a clear message', async () => {
    await expect(
      render(`<k-radio value="ses" label="Einfach (SES)" />`, {
        imports: [RadioComponent],
      }),
    ).rejects.toThrow(
      'k-radio must be placed inside k-radio-group (it provides the name and the form value).',
    );
  });
});
