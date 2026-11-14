import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { disabled, form, FormField } from '@angular/forms/signals';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SwitchComponent } from './switch';

describe('k-switch', () => {
  it('renders the reference markup with role "switch" and the label as accessible name', async () => {
    await render(`<k-switch label="Erinnerungen" />`, {
      imports: [SwitchComponent],
    });

    const toggle = screen.getByRole('switch', { name: 'Erinnerungen' });
    expect(toggle).toHaveAttribute('type', 'checkbox'); // native input: focus, Space, label click
    expect(toggle).not.toBeChecked();
    expect(toggle.closest('label')).toHaveClass('k-switch');
  });

  describe('typed reactive forms', () => {
    @Component({
      imports: [ReactiveFormsModule, SwitchComponent],
      template: `<k-switch label="Dunkles Design" [formControl]="dark" />`,
    })
    class HostComponent {
      readonly dark = new FormControl(false, { nonNullable: true });
    }

    it('click and Space write to the form; setValue switches it on', async () => {
      const { fixture } = await render(HostComponent);
      const dark = fixture.componentInstance.dark;
      const toggle = screen.getByRole('switch', { name: 'Dunkles Design' });
      const user = userEvent.setup();

      await user.click(toggle);
      expect(dark.value).toBe(true);
      expect(toggle).toBeChecked();
      await user.keyboard(' ');
      expect(dark.value).toBe(false);

      dark.setValue(true);
      fixture.detectChanges();
      expect(toggle).toBeChecked();
    });

    it('clicking the label text toggles it', async () => {
      const { fixture } = await render(HostComponent);

      await userEvent.click(screen.getByText('Dunkles Design'));

      expect(fixture.componentInstance.dark.value).toBe(true);
    });

    it('marks the control touched on blur', async () => {
      const { fixture } = await render(HostComponent);

      screen.getByRole('switch').focus();
      await userEvent.tab();

      expect(fixture.componentInstance.dark.touched).toBe(true);
    });

    it('control.disable() disables the native input and greys the label (v4.1)', async () => {
      const { fixture } = await render(HostComponent);

      fixture.componentInstance.dark.disable();
      fixture.detectChanges();

      const toggle = screen.getByRole('switch', { name: 'Dunkles Design' });
      expect(toggle).toBeDisabled();
      expect(toggle.closest('label')).toHaveClass('k-switch', 'is-disabled');
    });
  });

  it('works with Signal Forms via [formField] (CVA compatibility, ADR-0004)', async () => {
    @Component({
      imports: [FormField, SwitchComponent],
      template: `<k-switch
        label="Erinnerungen"
        [formField]="settings.reminders"
      />`,
    })
    class SignalHostComponent {
      readonly model = signal({ reminders: false });
      readonly locked = signal(false);
      readonly settings = form(this.model, (path) => {
        disabled(path.reminders, () => this.locked());
      });
    }

    const { fixture } = await render(SignalHostComponent);
    const host = fixture.componentInstance;
    const toggle = screen.getByRole('switch', { name: 'Erinnerungen' });

    await userEvent.click(toggle);
    expect(host.model().reminders).toBe(true);

    host.model.set({ reminders: false });
    fixture.detectChanges();
    expect(toggle).not.toBeChecked();

    host.locked.set(true);
    fixture.detectChanges();
    expect(toggle).toBeDisabled();
  });
});
