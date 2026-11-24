import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import { provideTransloco } from '@jsverse/transloco';
import {
  provideAuthClient,
  sessionExpiredInterceptor,
} from '@adlersoft/auth-client';
import { provideKonturIntl } from '@adlersoft/kontur-ui';
import { appRoutes } from './app.routes';
import { SignflowSessionApi } from './auth/signflow-session-api';
import { TranslocoKonturIntl } from './i18n/kontur-intl';

// Task 8-3 changed the requirement: the start page is for signed-in people only (authGuard),
// /login is the sign-in screen (guestGuard). Before 8-3 the start page was open to everyone.

let http: HttpTestingController;

const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** Navigates and answers the guard's GET /session: a user, or 401 (nobody). */
async function open(url: string, signedIn: boolean) {
  const harness = await RouterTestingHarness.create();
  const navigation = harness.navigateByUrl(url);
  await settle();
  const request = http.expectOne({ method: 'GET', url: '/api/v1/session' });
  if (signedIn) {
    request.flush({ user: { id: 'u1', email: 'anna.berger@beispiel.de' } });
  } else {
    request.flush(
      { code: 'auth.unauthenticated', status: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
  }
  await navigation;
  await settle();
  harness.detectChanges();
  return harness;
}

describe('Routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
        provideHttpClientTesting(),
        provideAuthClient({ api: SignflowSessionApi }),
        // Texts are not under test here; the pages have their own tests.
        provideTransloco({
          config: { availableLangs: ['de'], defaultLang: 'de' },
        }),
        provideKonturIntl(TranslocoKonturIntl),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('"" without a session → /login, with the start page as returnUrl', async () => {
    await open('/', false);

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2F');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('"" signed in: a main landmark with the product name as heading and the API status', async () => {
    await open('/', true);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'SignFlow' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('"" keeps the page title "SignFlow" (WCAG 2.4.2 Page Titled)', async () => {
    await open('/', true);

    expect(TestBed.inject(Title).getTitle()).toBe('SignFlow');
  });

  it('/login while signed in → on to the start page (guestGuard)', async () => {
    await open('/login', true);

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
