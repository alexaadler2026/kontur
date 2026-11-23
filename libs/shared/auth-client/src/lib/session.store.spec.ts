import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { SESSION_API } from './session-api';
import { SessionStore } from './session.store';
import { ANNA, FakeSessionApi, flush } from './testing';

// Task 8-2 (ADR-0010): the SPA never sees a token; it learns who is signed in from
// GET /session. POST /session answers 204 without a body, so sign-in reads GET after it.

let api: FakeSessionApi;
let store: InstanceType<typeof SessionStore>;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [{ provide: SESSION_API, useClass: FakeSessionApi }],
  });
  api = TestBed.inject(SESSION_API) as FakeSessionApi;
  store = TestBed.inject(SessionStore);
});

describe('SessionStore.load', () => {
  it('starts unknown; 200 → signed in with the user', async () => {
    expect(store.status()).toBe('unknown');

    const loading = store.load();
    api.gets[0].answer(ANNA);
    await loading;

    expect(store.status()).toBe('signedIn');
    expect(store.user()).toEqual(ANNA);
    expect(store.signedIn()).toBe(true);
  });

  it('401 → signed out, no user', async () => {
    const loading = store.load();
    api.gets[0].fail(401);
    await loading;

    expect(store.status()).toBe('signedOut');
    expect(store.user()).toBeNull();
  });

  it('parallel calls share ONE request (guards of several routes at start)', async () => {
    const first = store.load();
    const second = store.load();
    expect(api.gets).toHaveLength(1);

    api.gets[0].answer(ANNA);
    await Promise.all([first, second]);
    expect(store.status()).toBe('signedIn');
  });

  it('once known, load() asks nothing again', async () => {
    const loading = store.load();
    api.gets[0].fail(401);
    await loading;

    await store.load();

    expect(api.gets).toHaveLength(1);
  });

  it('no answer / 500: stays unknown and the next load() asks again', async () => {
    const loading = store.load();
    api.gets[0].fail(0);
    await loading;
    expect(store.status()).toBe('unknown');

    void store.load();
    expect(api.gets).toHaveLength(2);
  });
});

describe('SessionStore.signIn', () => {
  it('POST with the credentials, then GET for the user → signed in', async () => {
    const signingIn = store.signIn({
      email: ANNA.email,
      password: 'Grüne Berge über Bischkek',
    });
    expect(api.creates[0].credentials).toEqual({
      email: ANNA.email,
      password: 'Grüne Berge über Bischkek',
    });
    expect(api.gets).toHaveLength(0); // GET only after the cookie is set

    api.creates[0].call.answer(undefined);
    await flush();
    api.gets[0].answer(ANNA);
    await signingIn;

    expect(store.status()).toBe('signedIn');
    expect(store.user()).toEqual(ANNA);
  });

  it('a failed POST rejects with the HTTP error (the form shows it); state unchanged', async () => {
    const signingIn = store.signIn({ email: ANNA.email, password: 'falsch' });
    api.creates[0].call.fail(401);

    await expect(signingIn).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.status()).toBe('unknown');
  });
});

describe('SessionStore.signOut', () => {
  async function signedIn(): Promise<void> {
    const loading = store.load();
    api.gets[0].answer(ANNA);
    await loading;
  }

  it('DELETE → signed out, no user', async () => {
    await signedIn();

    const signingOut = store.signOut();
    api.deletes[0].answer(undefined);
    await signingOut;

    expect(store.status()).toBe('signedOut');
    expect(store.user()).toBeNull();
  });

  it('a failed DELETE rejects (the app shows a toast) and the user stays signed in', async () => {
    await signedIn();

    const signingOut = store.signOut();
    api.deletes[0].fail(0);

    await expect(signingOut).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.status()).toBe('signedIn');
  });
});

describe('SessionStore.markSignedOut (a 401 elsewhere: the session has ended)', () => {
  it('forgets the user without a request', async () => {
    const loading = store.load();
    api.gets[0].answer(ANNA);
    await loading;

    store.markSignedOut();

    expect(store.status()).toBe('signedOut');
    expect(store.user()).toBeNull();
    expect(api.deletes).toHaveLength(0);
  });
});
