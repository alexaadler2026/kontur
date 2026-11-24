import { Component, Injectable } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideAuthClient, SessionStore } from '@adlersoft/auth-client';
import { provideKonturIntl, provideKonturToast } from '@adlersoft/kontur-ui';
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
import { SignflowSessionApi } from '../auth/signflow-session-api';
import { TranslocoKonturIntl } from '../i18n/kontur-intl';
import { Home } from './home';

// Temporary sign-out on the start page (task 8-3, owner 2026-11-23): "Angemeldet als
// {email}" and "Abmelden"; a toast only when signing out fails.

@Component({ template: '<h1>Anmelden</h1>' })
class LoginStub {}

@Injectable()
class GermanLoader implements TranslocoLoader {
  getTranslation() {
    return of(de as Translation);
  }
}

const ANNA = { id: 'u1', email: 'anna.berger@beispiel.de' };
let http: HttpTestingController;

const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

async function openSignedIn(): Promise<RouterTestingHarness> {
  const harness = await RouterTestingHarness.create();
  const store = TestBed.inject(SessionStore);
  const loading = store.load();
  http.expectOne('/api/v1/session').flush({ user: ANNA });
  await loading;
  await harness.navigateByUrl('/');
  await settle();
  harness.detectChanges();
  // The API status line asks for /health; not under test here.
  http.match(() => true).forEach((request) => request.flush({}));
  return harness;
}

describe('Home — temporary sign-out', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Home },
          { path: 'login', component: LoginStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAuthClient({ api: SignflowSessionApi }),
        provideTransloco({
          config: { availableLangs: ['de'], defaultLang: 'de' },
          loader: GermanLoader,
        }),
        provideTranslocoMessageformat(),
        provideKonturIntl(TranslocoKonturIntl),
        provideKonturToast(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document
      .querySelectorAll('k-toast-region')
      .forEach((node) => node.remove());
  });

  it('shows who is signed in', async () => {
    await openSignedIn();

    expect(
      screen.getByText('Angemeldet als anna.berger@beispiel.de'),
    ).toBeInTheDocument();
  });

  it('"Abmelden": DELETE /session, then the sign-in page, no toast', async () => {
    await openSignedIn();

    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));
    const request = http.expectOne({
      method: 'DELETE',
      url: '/api/v1/session',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(document.querySelector('.k-toast')).toBeNull();
  });

  it('signing out fails: an error toast with the reason, the person stays signed in', async () => {
    await openSignedIn();

    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));
    http
      .expectOne({ method: 'DELETE', url: '/api/v1/session' })
      .flush(
        { code: 'server.unavailable', status: 503 },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await settle();
    TestBed.tick();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(document.querySelector('.k-toast')).toHaveTextContent(
      de.errors.server.unavailable,
    );
    expect(TestBed.inject(SessionStore).signedIn()).toBe(true);
  });
});
