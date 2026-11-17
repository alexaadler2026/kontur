import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type Signal,
  signal,
} from '@angular/core';
import {
  email,
  type FieldTree,
  form,
  FormField,
  required,
  submit,
  type ValidationError,
} from '@angular/forms/signals';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  FormFieldComponent,
  InputDirective,
} from '@adlersoft/kontur-ui';
import type { Meta, StoryObj } from '@storybook/angular';
import { errorKey, mapProblem, type ProblemDetails } from './problem-details';

interface SignIn {
  email: string;
  password: string;
}

/**
 * Fake server of the prototype (no backend yet; task 1 brings MSW). Codes and statuses are
 * illustrative; the real sign-in API comes with task 7 (ADR-0010).
 * - "max@beispiel.de" / "Passwort123" → signed in;
 * - an e-mail without a dot in the domain passes the client rule but the server rejects it
 *   with 422 and errors[] pointing at /email;
 * - anything else → one problem without a field: wrong e-mail or password (never say which).
 */
async function fakeSignIn(value: SignIn): Promise<ProblemDetails | null> {
  await new Promise((done) => setTimeout(done, 200));
  if (!(value.email.split('@')[1] ?? '').includes('.')) {
    return {
      type: 'urn:kontur:problem:validation.failed',
      title: 'Validation failed',
      status: 422,
      code: 'validation.failed',
      errors: [{ pointer: '/email', code: 'validation.email' }],
    };
  }
  if (value.email === 'max@beispiel.de' && value.password === 'Passwort123') {
    return null;
  }
  return {
    type: 'urn:kontur:problem:auth.invalid_credentials',
    title: 'E-mail or password wrong',
    status: 401,
    code: 'auth.invalid_credentials',
  };
}

/**
 * When an error is visible (ADR-0021): it is recorded on leaving the field or on a submit
 * attempt and shown only while the field still has an error of that kind. So while the
 * person types, a new error never appears, but a fixed one disappears at once.
 */
function errorDisplay(field: FieldTree<string>): {
  visible: Signal<ValidationError | null>;
  record: () => void;
} {
  const recorded = signal<string | null>(null);
  return {
    visible: computed(() => {
      const kind = recorded();
      return kind
        ? (field()
            .errors()
            .find((error) => error.kind === kind) ?? null)
        : null;
    }),
    record: () => recorded.set(field().errors()[0]?.kind ?? null),
  };
}

@Component({
  selector: 'k-story-sign-in',
  imports: [
    FormField,
    TranslocoPipe,
    ButtonComponent,
    FormFieldComponent,
    InputDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      novalidate
      (submit)="onSubmit($event)"
      style="display: flex; flex-direction: column; gap: 16px; max-width: 360px; padding: 16px; color: var(--text-primary);"
    >
      <h2 class="h2" style="margin: 0;">
        {{ 'forms.signIn.heading' | transloco }}
      </h2>

      <k-form-field
        required
        [label]="'forms.signIn.email' | transloco"
        [error]="
          emailError() ? (errorKey(emailError()!.kind) | transloco) : null
        "
      >
        <input
          k-input
          type="email"
          autocomplete="username"
          [formField]="signInForm.email"
          (blur)="email.record()"
        />
      </k-form-field>

      <k-form-field
        required
        [label]="'forms.signIn.password' | transloco"
        [error]="
          passwordError() ? (errorKey(passwordError()!.kind) | transloco) : null
        "
      >
        <input
          k-input
          type="password"
          autocomplete="current-password"
          [formField]="signInForm.password"
          (blur)="password.record()"
        />
      </k-form-field>

      <!-- Form error: general, above the button, announced (role="alert"). -->
      @if (formError(); as code) {
        <div class="k-form-item">
          <span class="k-error-msg" role="alert">{{
            errorKey(code) | transloco
          }}</span>
        </div>
      }

      <button
        k-button
        variant="primary"
        type="submit"
        [loading]="signInForm().submitting()"
      >
        {{ 'forms.signIn.submit' | transloco }}
      </button>

      <p class="body" role="status" style="margin: 0;">
        @if (signedInAs(); as address) {
          {{ 'forms.signIn.success' | transloco: { email: address } }}
        }
      </p>
    </form>
  `,
})
class SignInPrototypeComponent {
  private readonly model = signal<SignIn>({ email: '', password: '' });
  protected readonly signInForm = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  protected readonly email = errorDisplay(this.signInForm.email);
  protected readonly password = errorDisplay(this.signInForm.password);
  protected readonly emailError = this.email.visible;
  protected readonly passwordError = this.password.visible;

  protected readonly formError = signal<string | null>(null);
  protected readonly signedInAs = signal<string | null>(null);
  protected readonly errorKey = errorKey;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.formError.set(null);
    this.signedInAs.set(null);

    await submit(this.signInForm, {
      action: async (root) => {
        const problem = await fakeSignIn(root().value());
        if (!problem) {
          this.signedInAs.set(root().value().email);
          return undefined;
        }
        const { fieldErrors, formErrors } = mapProblem(problem, root);
        this.formError.set(formErrors[0] ?? null);
        return fieldErrors;
      },
      // invalid: Angular has marked every field touched; move the focus to the first problem
      onInvalid: (root) =>
        root().errorSummary()[0]?.fieldTree().focusBoundControl(),
    });

    this.email.record();
    this.password.record();
  }
}

const meta: Meta<SignInPrototypeComponent> = {
  title: 'Forms/Sign-in',
  component: SignInPrototypeComponent,
  parameters: {
    docs: {
      description: {
        component:
          'Signal Forms prototype (ADR-0021). Errors appear on leaving a field or on submit; ' +
          'server field errors come from Problem Details errors[]; wrong credentials give one ' +
          'general alert. Try max@beispiel.de / Passwort123, an e-mail like max@beispiel, or a ' +
          'wrong password.',
      },
    },
  },
};
export default meta;

export const Prototype: StoryObj<SignInPrototypeComponent> = {};
