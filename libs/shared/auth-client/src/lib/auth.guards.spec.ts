import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { authGuard, guestGuard } from './auth.guards';
import { provideAuthClient } from './provide-auth-client';
import { SESSION_API } from './session-api';
import { ANNA, FakeSessionApi, flush } from './testing';

// Task 8-2 (plan 044, owner 2026-11-23): without a session → /login?returnUrl=<path>;
// a signed-in person who opens /login goes on (to returnUrl when it is an in-app path).

@Component({ template: 'page' })
class Page {}

let api: FakeSessionApi;
let harness: RouterTestingHarness;

async function setUp(): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideAuthClient({ api: FakeSessionApi }),
      provideRouter([
        { path: 'login', component: Page, canActivate: [guestGuard] },
        { path: '', component: Page, canActivate: [authGuard] },
        { path: 'dokumente/:id', component: Page, canActivate: [authGuard] },
      ]),
    ],
  });
  api = TestBed.inject(SESSION_API) as FakeSessionApi;
  harness = await RouterTestingHarness.create();
}

/** Navigates and answers the one GET /session the guard makes. */
async function open(url: string, session: 'signedIn' | 'signedOut') {
  const navigation = harness.navigateByUrl(url);
  await flush();
  if (session === 'signedIn') api.gets[0].answer(ANNA);
  else api.gets[0].fail(401);
  await navigation;
  return TestBed.inject(Router).url;
}

describe('authGuard', () => {
  it('signed in → the page opens', async () => {
    await setUp();
    expect(await open('/dokumente/42', 'signedIn')).toBe('/dokumente/42');
  });

  it('no session → /login with the requested path as returnUrl', async () => {
    await setUp();
    expect(await open('/dokumente/42', 'signedOut')).toBe(
      '/login?returnUrl=%2Fdokumente%2F42',
    );
  });
});

describe('guestGuard', () => {
  it('no session → the sign-in page opens', async () => {
    await setUp();
    expect(await open('/login', 'signedOut')).toBe('/login');
  });

  it('signed in → goes on to returnUrl', async () => {
    await setUp();
    expect(await open('/login?returnUrl=%2Fdokumente%2F42', 'signedIn')).toBe(
      '/dokumente/42',
    );
  });

  it('signed in with a foreign returnUrl → to the start page, not away', async () => {
    await setUp();
    expect(
      await open('/login?returnUrl=https%3A%2F%2Fevil.example', 'signedIn'),
    ).toBe('/');
  });
});
