import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  email,
  form,
  FormField,
  required,
  submit,
  type ValidationError,
} from '@angular/forms/signals';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  type Credentials,
  safeReturnUrl,
  SESSION_EXPIRED,
  SessionStore,
} from '@adlersoft/auth-client';
import {
  AlertComponent,
  type AlertTone,
  ButtonComponent,
  FormFieldComponent,
  InputDirective,
} from '@adlersoft/kontur-ui';
import { problemMessage } from '@adlersoft/signflow-api-client';
import { translateSignal, TranslocoPipe } from '@jsverse/transloco';
import { LanguageSwitch } from '../i18n/language-switch';
import {
  errorDisplay,
  errorKey,
  fieldErrorsOf,
  throttleMinutes,
} from './util/form-errors';

/** A message of the whole form (above the button): never tied to a field. */
interface FormMessage {
  tone: AlertTone;
  key: string;
  params: Record<string, string | number>;
}

/** The one breakpoint of Kontur (docs/design/README.md, rule 7): below it, touch sizes. */
const NARROW = '(max-width: 959.98px)';

/**
 * Sign-in screen (docs/design/screens/signflow/Anmelden.md, task 8-3).
 * Signal Forms (ADR-0021); the session itself is libs/shared/auth-client (ADR-0010).
 */
@Component({
  selector: 'sf-sign-in-page',
  imports: [
    FormField,
    TranslocoPipe,
    AlertComponent,
    ButtonComponent,
    FormFieldComponent,
    InputDirective,
    LanguageSwitch,
  ],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly model = signal<Credentials>({ email: '', password: '' });
  protected readonly signInForm = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.password);
  });

  protected readonly emailDisplay = errorDisplay(this.signInForm.email);
  protected readonly passwordDisplay = errorDisplay(this.signInForm.password);
  protected readonly errorKey = errorKey;

  /** Cleared on every submit, so the next failure inserts a new alert (see the template). */
  protected readonly message = signal<FormMessage | null>(null);

  /** Set by the 401 interceptor of auth-client, in the navigation state (not in the URL). */
  protected readonly sessionExpired =
    this.router.currentNavigation()?.extras.state?.[SESSION_EXPIRED] === true;

  protected readonly narrow = signal(
    inject(DOCUMENT).defaultView?.matchMedia?.(NARROW).matches ?? false,
  );

  constructor() {
    const media = inject(DOCUMENT).defaultView?.matchMedia?.(NARROW);
    media?.addEventListener('change', (event) =>
      this.narrow.set(event.matches),
    );

    // WCAG 2.4.2: the tab names the page, in the active language.
    const title = inject(Title);
    const pageTitle = translateSignal('auth.title');
    effect(() => title.setTitle(`${pageTitle()} – SignFlow`));
  }

  protected fieldError(error: ValidationError | null): string | null {
    return error ? errorKey(error.kind) : null;
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.message.set(null);

    await submit(this.signInForm, {
      action: async (root) => {
        try {
          await this.session.signIn(root().value());
        } catch (error: unknown) {
          return this.handleFailure(error, root);
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        await this.router.navigateByUrl(safeReturnUrl(returnUrl));
        return undefined;
      },
      // Angular has marked every field touched; the focus goes to the first problem.
      onInvalid: (root) =>
        root().errorSummary()[0]?.fieldTree().focusBoundControl(),
    });

    this.emailDisplay.record();
    this.passwordDisplay.record();
  }

  private handleFailure(
    error: unknown,
    root: typeof this.signInForm,
  ): ValidationError.WithFieldTree[] | undefined {
    if (!(error instanceof HttpErrorResponse)) throw error;

    if (error.status === 422) {
      const { fieldErrors, unmatched } = fieldErrorsOf(error.error, root);
      if (unmatched.length > 0 || fieldErrors.length === 0) {
        this.show({ tone: 'error', ...problemMessage(error) });
      }
      return fieldErrors;
    }
    if (error.status === 429) {
      this.show({
        tone: 'warning',
        key: 'errors.auth.throttled',
        params: { minutes: throttleMinutes(error.headers.get('Retry-After')) },
      });
      return undefined;
    }
    // 401 (one text for both fields), 503, no connection, anything else (ADR-0008).
    this.show({ tone: 'error', ...problemMessage(error) });
    return undefined;
  }

  private show(message: FormMessage): void {
    this.message.set(message);
  }
}
