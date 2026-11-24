import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SignflowSessionApi } from './signflow-session-api';

// The adapter gives libs/shared/auth-client the three session calls (ADR-0010) over the
// generated client (ADR-0007): no hand-written URLs or types in the app.

describe('SignflowSessionApi', () => {
  let api: SignflowSessionApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SignflowSessionApi,
      ],
    });
    api = TestBed.inject(SignflowSessionApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get: GET /api/v1/session → the user', async () => {
    const user = firstValueFrom(api.get());
    const request = http.expectOne('/api/v1/session');
    expect(request.request.method).toBe('GET');
    request.flush({ user: { id: 'u1', email: 'anna.berger@beispiel.de' } });

    expect(await user).toEqual({ id: 'u1', email: 'anna.berger@beispiel.de' });
  });

  it('create: POST /api/v1/session with e-mail and password in the body (ADR-0008)', async () => {
    const done = firstValueFrom(
      api.create({ email: 'anna.berger@beispiel.de', password: 'geheim' }),
      { defaultValue: undefined },
    );
    const request = http.expectOne('/api/v1/session');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'anna.berger@beispiel.de',
      password: 'geheim',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await done;
  });

  it('delete: DELETE /api/v1/session', async () => {
    const done = firstValueFrom(api.delete(), { defaultValue: undefined });
    const request = http.expectOne('/api/v1/session');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await done;
  });
});
