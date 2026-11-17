import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import {
  KonturIntl,
  KonturIntlDe,
  KonturIntlEn,
  KonturIntlRu,
  provideKonturIntl,
} from '../intl/kontur-intl';
import { AlertActionsDirective, AlertComponent } from './alert';

// Texts are the examples of docs/design/components/Alert.md, not product text.

describe('KonturIntl.closeLabel (name of the Alert close button)', () => {
  it.each([
    [KonturIntlDe, 'Schließen'],
    [KonturIntlEn, 'Close'],
    [KonturIntlRu, 'Закрыть'],
  ])('%o → %s', (intl, label) => {
    TestBed.configureTestingModule({ providers: [provideKonturIntl(intl)] });

    expect(TestBed.inject(KonturIntl).closeLabel()).toBe(label);
  });
});

describe('k-alert', () => {
  it('default: info tone, inline, the message in the body, not focusable itself', async () => {
    await render(
      `<k-alert data-testid="alert">Ihre Sitzung ist abgelaufen.</k-alert>`,
      { imports: [AlertComponent] },
    );

    const alert = screen.getByTestId('alert');
    expect(alert).toHaveClass('k-alert', 'k-alert--info');
    expect(alert).not.toHaveClass('k-alert--banner');
    expect(alert).not.toHaveAttribute('tabindex');
    expect(alert.querySelector('.k-alert-body')).toHaveTextContent(
      'Ihre Sitzung ist abgelaufen.',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it.each([
    ['info', 'lucide-info'],
    ['success', 'lucide-circle-check'],
    ['warning', 'lucide-triangle-alert'],
    ['error', 'lucide-circle-alert'],
  ])(
    'tone %s: tone class and its own icon shape (%s), decorative, 18×18 (WCAG 1.4.1)',
    async (tone, iconClass) => {
      await render(
        `<k-alert data-testid="alert" [tone]="tone">Text</k-alert>`,
        { imports: [AlertComponent], componentProperties: { tone } },
      );

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass(`k-alert--${tone}`);
      const icon = alert.querySelector(':scope > svg');
      expect(icon).toHaveClass('k-ico', iconClass);
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('width', '18');
      expect(alert.querySelectorAll('svg')).toHaveLength(1);
    },
  );

  it('title: a bold first line inside the body; the host gets no native title tooltip', async () => {
    await render(
      `<k-alert data-testid="alert" tone="warning" title="Anmeldung vorübergehend gesperrt">Zu viele Anmeldeversuche.</k-alert>`,
      { imports: [AlertComponent] },
    );

    const alert = screen.getByTestId('alert');
    const title = alert.querySelector('.k-alert-body > .k-alert-title');
    expect(title).toHaveTextContent('Anmeldung vorübergehend gesperrt');
    expect(alert).not.toHaveAttribute('title');
  });

  it('banner variant adds k-alert--banner', async () => {
    await render(
      `<k-alert data-testid="alert" variant="banner">Demo-Modus</k-alert>`,
      { imports: [AlertComponent] },
    );

    expect(screen.getByTestId('alert')).toHaveClass(
      'k-alert',
      'k-alert--banner',
    );
  });

  it('actions are projected into div.k-alert-actions inside the body', async () => {
    await render(
      `<k-alert data-testid="alert" tone="success">Passwort geändert.
         <div k-alert-actions><button type="button">Zur Anmeldung</button></div>
       </k-alert>`,
      { imports: [AlertComponent, AlertActionsDirective] },
    );

    const actions = screen
      .getByTestId('alert')
      .querySelector('.k-alert-body > .k-alert-actions');
    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Zur Anmeldung' }),
    );
  });

  describe('live: role only when the message is a reaction to an action', () => {
    it.each(['info', 'success', 'warning', 'error'])(
      'live=false (%s): no role — present since page load, read in reading order',
      async (tone) => {
        await render(
          `<k-alert data-testid="alert" [tone]="tone">Text</k-alert>`,
          { imports: [AlertComponent], componentProperties: { tone } },
        );

        expect(screen.getByTestId('alert')).not.toHaveAttribute('role');
      },
    );

    it.each([
      ['error', 'alert'],
      ['warning', 'alert'],
      ['info', 'status'],
      ['success', 'status'],
    ])('live=true, %s → role="%s"', async (tone, role) => {
      await render(`<k-alert live [tone]="tone">Text</k-alert>`, {
        imports: [AlertComponent],
        componentProperties: { tone },
      });

      expect(screen.getByRole(role)).toHaveTextContent('Text');
    });
  });

  it('re-announcement: two failed submits in a row insert two different alert elements', async () => {
    // The host pattern from Alert.md: @for over [submitCount()] keyed by the counter.
    @Component({
      imports: [AlertComponent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `
        <button type="button" (click)="submitCount.set(submitCount() + 1)">
          Anmelden
        </button>
        @for (n of [submitCount()]; track n) {
          @if (n > 0) {
            <k-alert tone="error" live
              >E-Mail-Adresse oder Passwort ist falsch.</k-alert
            >
          }
        }
      `,
    })
    class SignInHost {
      protected readonly submitCount = signal(0);
    }
    await render(SignInHost);
    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: 'Anmelden' });

    await user.click(submit);
    const first = screen.getByRole('alert');
    await user.click(submit);
    const second = screen.getByRole('alert');

    // Same text, but a new node: the reader announces a newly inserted live region again.
    expect(second).toHaveTextContent(
      'E-Mail-Adresse oder Passwort ist falsch.',
    );
    expect(second).not.toBe(first);
    expect(first.isConnected).toBe(false);
  });

  describe('dismissible', () => {
    it('close button: k-icon-btn, type=button, named by KonturIntl ("Schließen"), 14px decorative x icon', async () => {
      await render(`<k-alert dismissible>Text</k-alert>`, {
        imports: [AlertComponent],
      });

      const close = screen.getByRole('button', { name: 'Schließen' });
      expect(close).toHaveClass('k-icon-btn');
      expect(close).toHaveAttribute('type', 'button');
      const icon = close.querySelector('svg');
      expect(icon).toHaveClass('lucide-x');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('width', '14');
    });

    it.each([
      [KonturIntlEn, 'Close'],
      [KonturIntlRu, 'Закрыть'],
    ])('uses the provided KonturIntl (%o → "%s")', async (intl, name) => {
      await render(`<k-alert dismissible>Text</k-alert>`, {
        imports: [AlertComponent],
        providers: [provideKonturIntl(intl)],
      });

      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });

    it('follows a language switch at runtime (KonturIntl members are signals)', async () => {
      @Injectable()
      class SwitchableIntl extends KonturIntl {
        readonly removeLabel = signal('Entfernen').asReadonly();
        readonly label = signal('Schließen');
        readonly closeLabel = this.label.asReadonly();
      }
      const { fixture } = await render(`<k-alert dismissible>Text</k-alert>`, {
        imports: [AlertComponent],
        providers: [provideKonturIntl(SwitchableIntl)],
      });

      (TestBed.inject(KonturIntl) as SwitchableIntl).label.set('Закрыть');
      fixture.detectChanges();

      expect(
        await screen.findByRole('button', { name: 'Закрыть' }),
      ).toBeInTheDocument();
    });

    it('click, Enter and Space emit "dismissed"; the alert does not hide itself (the host owns visibility)', async () => {
      const dismissed = vi.fn();
      await render(
        `<k-alert data-testid="alert" dismissible (dismissed)="dismissed()">Text</k-alert>`,
        { imports: [AlertComponent], componentProperties: { dismissed } },
      );
      const user = userEvent.setup();
      const close = screen.getByRole('button', { name: 'Schließen' });

      await user.click(close);
      close.focus();
      await user.keyboard('{Enter}');
      close.focus();
      await user.keyboard(' ');

      expect(dismissed).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId('alert')).toBeVisible();
    });

    it('focus moves to the next tabbable element after the alert, before "dismissed" is emitted', async () => {
      const onEmit: { focused: Element | null } = { focused: null };
      const dismissed = () => (onEmit.focused = document.activeElement);
      await render(
        `<button type="button">Vorher</button>
         <k-alert dismissible (dismissed)="dismissed()">
           Text <div k-alert-actions><button type="button">Aktion</button></div>
         </k-alert>
         <button type="button" disabled>Gesperrt</button>
         <a href="#weiter">Weiter</a>`,
        {
          imports: [AlertComponent, AlertActionsDirective],
          componentProperties: { dismissed },
        },
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Schließen' }));

      // Not the alert's own action, not the disabled button — the next reachable one.
      const next = screen.getByRole('link', { name: 'Weiter' });
      expect(next).toHaveFocus();
      expect(onEmit.focused).toBe(next);
    });

    it('without a tabbable element after it, focus goes to the page h1 (made focusable with tabindex=-1)', async () => {
      await render(
        `<h1>Anmelden</h1>
         <k-alert dismissible>Text</k-alert>`,
        { imports: [AlertComponent] },
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Schließen' }));

      const heading = screen.getByRole('heading', { name: 'Anmelden' });
      expect(heading).toHaveFocus();
      expect(heading).toHaveAttribute('tabindex', '-1');
    });
  });
});
