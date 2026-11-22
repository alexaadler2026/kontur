import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  ApplicationInitStatus,
  type EnvironmentProviders,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { getGetConfigResponseMock } from '@adlersoft/signflow-api-client/mocks';
import { App } from '../app';
import { provideI18n } from '../i18n/provide-i18n';
import { AppConfig, provideAppConfig } from './app-config';

const CONFIG_URL = '/api/v1/config';

describe('AppConfig: public settings loaded before the start (ADR-0009)', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function start(...providers: EnvironmentProviders[]) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ...providers,
      ],
    });
    // Creating the injector runs the app initializers, as bootstrap does.
    return {
      http: TestBed.inject(HttpTestingController),
      status: TestBed.inject(ApplicationInitStatus),
    };
  }

  it('settings arrived → AppConfig has them, the start goes on', async () => {
    const { http, status } = start(provideAppConfig());
    const settings = getGetConfigResponseMock({ version: '1.2.3' });

    http.expectOne(CONFIG_URL).flush(settings);
    await status.donePromise;

    expect(TestBed.inject(AppConfig).settings()).toEqual(settings);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('500 → the app still starts, AppConfig has "no settings", the error is logged', async () => {
    const { http, status } = start(provideAppConfig());

    http
      .expectOne(CONFIG_URL)
      .flush('boom', { status: 500, statusText: 'Internal Server Error' });
    await status.donePromise;

    expect(TestBed.inject(AppConfig).settings()).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining(CONFIG_URL),
      expect.anything(),
    );
  });

  it('translations and settings both hang → the app renders after ~10 s, not 20: they load in parallel', async () => {
    vi.useFakeTimers();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE']);
    const { http, status } = start(provideI18n(), provideAppConfig());

    // Both requests went out at once, and nobody ever answers them.
    expect(http.match('i18n/de.json')).toHaveLength(1);
    expect(http.match(CONFIG_URL)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(status.done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(status.done).toBe(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(TestBed.inject(AppConfig).settings()).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('[config]'),
      expect.anything(),
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('[i18n]'),
      expect.anything(),
    );
  });
});
