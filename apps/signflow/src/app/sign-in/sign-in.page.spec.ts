import { Component, Injectable } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  authGuard,
  guestGuard,
  provideAuthClient,
  sessionExpiredInterceptor,
} from '@adlersoft/auth-client';
import {
  provideTransloco,
  type Translation,
  type TranslocoLoader,
} from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { of } from 'rxjs';
import de from '../../../public/i18n/de.json';
import { provideKonturIntl } from '@adlersoft/kontur-ui';
import { SignflowSessionApi } from '../auth/signflow-session-api';
import { TranslocoKonturIntl } from '../i18n/kontur-intl';
import { SignInPage } from './sign-in.page';

// Sign-in screen, behaviour from docs/design/screens/signflow/Anmelden.md (task 8-3).
// Real HTTP layer (HttpTestingController), real router and guards, real German texts.

const ANNA = { id: 'u1', email: 'anna.berger@beispiel.de' };
const PASSWORD = 'Kranich-Wolke-Tinte-2026';

@Component({ template: '<p>Startseite</p>' })
class HomeStub {}

@Component({ template: '<p>Dokument</p>' })
class DocumentStub {}

@Injectable()
class GermanLoader implements TranslocoLoader {
  getTranslation() {
    return of(de as Translation);
  }
}

let http: HttpTestingController;
let user: ReturnType<typeof userEvent.setup>;

/** Answers the guard's GET /session with 401: nobody is signed in. */
function answerNobody(): void {
  http
    .expectOne({ method: 'GET', url: '/api/v1/session' })
    .flush(
      { code: 'auth.unauthenticated', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
}

async function openSignIn(url = '/login'): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create();
  const navigation = harness.navigateByUrl(url);
  await settle();
  answerNobody();
  await navigation;
  await settle();
  return harness;
}

const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await TestBed.inject(Router).navigated;
  }
};

const emailField = () => screen.getByLabelText('E-Mail-Adresse');
const passwordField = () => screen.getByLabelText('Passwort');
const submitButton = () => screen.getByRole('button', { name: 'Anmelden' });

async function fillAndSubmit(email = ANNA.email, password = PASSWORD) {
  await user.type(emailField(), email);
  await user.type(passwordField(), password);
  await user.click(submitButton());
  await settle();
}

const postRequest = (): TestRequest =>
  http.expectOne({ method: 'POST', url: '/api/v1/session' });

function fail(
  request: TestRequest,
  status: number,
  body: object,
  headers: Record<string, string> = {},
): void {
  request.flush(body, { status, statusText: 'Error', headers });
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: SignInPage, canActivate: [guestGuard] },
        { path: '', component: HomeStub, canActivate: [authGuard] },
        {
          path: 'dokumente/:id',
          component: DocumentStub,
          canActivate: [authGuard],
        },
      ]),
      provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
      provideHttpClientTesting(),
      provideAuthClient({ api: SignflowSessionApi }),
      provideTransloco({
        config: {
          availableLangs: ['de'],
          defaultLang: 'de',
          reRenderOnLangChange: true,
        },
        loader: GermanLoader,
      }),
      provideTranslocoMessageformat(),
      provideKonturIntl(TranslocoKonturIntl),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  user = userEvent.setup();
});

afterEach(() => http.verify());

describe('SignInPage — layout (Anmelden.md)', () => {
  it('heading, both fields with the right autocomplete, submit, invite note, language switch', async () => {
    await openSignIn();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Anmelden' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Anmelden' })).toBeInTheDocument();
    expect(emailField()).toHaveAttribute('type', 'email');
    expect(emailField()).toHaveAttribute('autocomplete', 'username');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(passwordField()).toHaveAttribute('autocomplete', 'current-password');
    expect(submitButton()).toHaveAttribute('type', 'submit');
    expect(
      screen.getByText('Konten werden nur per Einladung vergeben.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Sprache' }),
    ).toBeInTheDocument();
  });

  it('not active yet: no "Passwort vergessen?", no legal links (no dead links)', async () => {
    await openSignIn();

    expect(screen.queryByText('Passwort vergessen?')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('page title names the page (WCAG 2.4.2)', async () => {
    await openSignIn();

    expect(TestBed.inject(Title).getTitle()).toBe('Anmelden – SignFlow');
  });
});

describe('SignInPage — field errors (ADR-0021)', () => {
  it('submit with empty fields: both errors, focus on the e-mail field, no request', async () => {
    await openSignIn();

    await user.click(submitButton());
    await settle();

    expect(emailField()).toHaveAccessibleDescription(
      'Bitte füllen Sie dieses Feld aus.',
    );
    expect(passwordField()).toHaveAccessibleDescription(
      'Bitte füllen Sie dieses Feld aus.',
    );
    expect(emailField()).toHaveAttribute('aria-invalid', 'true');
    expect(emailField()).toHaveFocus();
    http.expectNone({ method: 'POST', url: '/api/v1/session' });
  });

  it('an invalid e-mail shows its error after leaving the field, not while typing', async () => {
    await openSignIn();

    await user.type(emailField(), 'anna.berger@');
    expect(emailField()).not.toHaveAttribute('aria-invalid');

    await user.tab();
    expect(emailField()).toHaveAccessibleDescription(
      'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    );
  });

  it('422 from the server: the error goes to the field its pointer names', async () => {
    await openSignIn();
    await fillAndSubmit('anna@beispiel', PASSWORD);

    fail(postRequest(), 422, {
      code: 'validation.failed',
      status: 422,
      errors: [{ pointer: '/email', code: 'validation.email', params: {} }],
    });
    await settle();

    expect(emailField()).toHaveAccessibleDescription(
      'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('SignInPage — sending', () => {
  it('success: POST with e-mail and password, then GET, then the start page', async () => {
    await openSignIn();
    await fillAndSubmit();

    const post = postRequest();
    expect(post.request.body).toEqual({
      email: ANNA.email,
      password: PASSWORD,
    });
    post.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http
      .expectOne({ method: 'GET', url: '/api/v1/session' })
      .flush({ user: ANNA });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(screen.getByText('Startseite')).toBeInTheDocument();
  });

  it('success with returnUrl: back to the page that was asked for', async () => {
    await openSignIn('/login?returnUrl=%2Fdokumente%2F42');
    await fillAndSubmit();

    postRequest().flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http
      .expectOne({ method: 'GET', url: '/api/v1/session' })
      .flush({ user: ANNA });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/dokumente/42');
  });

  it('a foreign returnUrl is not followed (open redirect) → the start page', async () => {
    await openSignIn('/login?returnUrl=https%3A%2F%2Fevil.example');
    await fillAndSubmit();

    postRequest().flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    http
      .expectOne({ method: 'GET', url: '/api/v1/session' })
      .flush({ user: ANNA });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('while the request runs: the button is busy, the fields stay editable', async () => {
    await openSignIn();
    await fillAndSubmit();

    expect(submitButton()).toHaveAttribute('aria-busy', 'true');
    expect(emailField()).toBeEnabled();
    expect(passwordField()).toBeEnabled();

    fail(postRequest(), 401, { code: 'auth.invalid_credentials', status: 401 });
    await settle();
    expect(submitButton()).not.toHaveAttribute('aria-busy');
  });
});

describe('SignInPage — form errors (above the button)', () => {
  it('401: one error alert, no field marked (never say which was wrong)', async () => {
    await openSignIn();
    await fillAndSubmit();

    fail(postRequest(), 401, { code: 'auth.invalid_credentials', status: 401 });
    await settle();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('E-Mail-Adresse oder Passwort ist falsch.');
    expect(alert.closest('k-alert')).toHaveClass('k-alert--error');
    expect(emailField()).not.toHaveAttribute('aria-invalid');
    expect(passwordField()).not.toHaveAttribute('aria-invalid');
    // Above the submit button (AnmeldenDunkel).
    expect(
      alert.compareDocumentPosition(submitButton()) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('a second failure re-creates the alert, so it is announced again (Alert.md)', async () => {
    await openSignIn();
    await fillAndSubmit();
    fail(postRequest(), 401, { code: 'auth.invalid_credentials', status: 401 });
    await settle();
    const first = screen.getByRole('alert');

    await user.click(submitButton());
    await settle();
    fail(postRequest(), 401, { code: 'auth.invalid_credentials', status: 401 });
    await settle();

    const second = screen.getByRole('alert');
    expect(second).toHaveTextContent(
      'E-Mail-Adresse oder Passwort ist falsch.',
    );
    expect(second).not.toBe(first);
  });

  it.each([
    ['61 s → 2 Minuten (rounded up)', '61', 'in 2 Minuten erneut'],
    ['60 s → 1 Minute', '60', 'in 1 Minute erneut'],
  ])(
    '429 with Retry-After %s: a warning without a title',
    async (_name, seconds, text) => {
      await openSignIn();
      await fillAndSubmit();

      fail(
        postRequest(),
        429,
        { code: 'auth.throttled', status: 429 },
        { 'Retry-After': seconds },
      );
      await settle();

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(text);
      expect(alert.closest('k-alert')).toHaveClass('k-alert--warning');
    },
  );

  it('503 (queue full): the "temporarily unavailable" text', async () => {
    await openSignIn();
    await fillAndSubmit();

    fail(postRequest(), 503, { code: 'server.unavailable', status: 503 });
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Der Dienst ist vorübergehend nicht verfügbar.',
    );
  });

  it('no connection: the shared network text', async () => {
    await openSignIn();
    await fillAndSubmit();

    postRequest().error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(screen.getByRole('alert')).toHaveTextContent(
      de.errors.generic.network,
    );
  });
});

describe('SignInPage — after an ended session', () => {
  it('state { sessionExpired } → info alert above the form, not live', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = TestBed.inject(Router).navigate(['/login'], {
      state: { sessionExpired: true },
    });
    await settle();
    answerNobody();
    await navigation;
    await settle();
    harness.detectChanges();

    const note = screen.getByText(
      'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
    );
    const alert = note.closest('k-alert') as HTMLElement;
    expect(alert).toHaveClass('k-alert--info');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      alert.compareDocumentPosition(
        screen.getByRole('form', { name: 'Anmelden' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('a plain visit shows no such note', async () => {
    await openSignIn();

    expect(
      screen.queryByText(/Ihre Sitzung ist abgelaufen/),
    ).not.toBeInTheDocument();
  });
});
