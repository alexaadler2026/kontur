import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { provideAuthClient } from './provide-auth-client';
import { SESSION_API } from './session-api';
import { sessionExpiredInterceptor } from './session-expired.interceptor';
import { SessionStore } from './session.store';
import { ANNA, FakeSessionApi } from './testing';

// ADR-0010: "a 401 anywhere sends the user to the login screen". Owner, 2026-11-23: with
// returnUrl, and the mark "session expired" in the navigation state, not in the URL.

@Component({ template: 'page' })
class Page {}

let http: HttpClient;
let backend: HttpTestingController;
let router: Router;
let store: InstanceType<typeof SessionStore>;

async function setUp(signedIn: boolean): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideAuthClient({ api: FakeSessionApi }),
      provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'login', component: Page },
        { path: 'dokumente/:id', component: Page },
      ]),
    ],
  });
  http = TestBed.inject(HttpClient);
  backend = TestBed.inject(HttpTestingController);
  router = TestBed.inject(Router);
  store = TestBed.inject(SessionStore);
  if (signedIn) {
    const loading = store.load();
    (TestBed.inject(SESSION_API) as FakeSessionApi).gets[0].answer(ANNA);
    await loading;
  }
  await router.navigateByUrl('/dokumente/42');
}

/** Lets a redirect navigation (asynchronous) happen, so "nothing happened" is real. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Sends a request, answers it with `status`, returns the error the caller gets. */
async function fail(url: string, status: number): Promise<unknown> {
  const request = firstValueFrom(http.get(url)).catch((error) => error);
  backend.expectOne(url).flush(null, { status, statusText: 'x' });
  return request;
}

describe('sessionExpiredInterceptor', () => {
  it('401 on any API call while signed in → signed out, /login with returnUrl and the mark', async () => {
    await setUp(true);

    const error = await fail('/api/v1/documents', 401);
    await settle();

    expect(error).toBeInstanceOf(HttpErrorResponse); // the caller still gets its error
    expect(store.status()).toBe('signedOut');
    expect(router.url).toBe('/login?returnUrl=%2Fdokumente%2F42');
    expect(router.lastSuccessfulNavigation()?.extras.state).toEqual({
      sessionExpired: true,
    });
  });

  it.each(['/api/v1/session', '/api/v1/session?x=1'])(
    '401 from %s itself is the answer of sign-in / who-am-I, not an expiry → nothing happens',
    async (url) => {
      await setUp(true);

      await fail(url, 401);
      await settle();

      expect(store.status()).toBe('signedIn');
      expect(router.url).toBe('/dokumente/42');
    },
  );

  it('401 while nobody was signed in → no redirect (the guard decides)', async () => {
    await setUp(false);

    await fail('/api/v1/documents', 401);
    await settle();

    expect(router.url).toBe('/dokumente/42');
  });

  it.each([403, 500, 0])(
    '%i is not an expiry → nothing happens',
    async (status) => {
      await setUp(true);

      await fail('/api/v1/documents', status);
      await settle();

      expect(store.status()).toBe('signedIn');
      expect(router.url).toBe('/dokumente/42');
    },
  );
});
