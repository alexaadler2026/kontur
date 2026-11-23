import {
  type EnvironmentProviders,
  makeEnvironmentProviders,
  type Type,
} from '@angular/core';
import {
  AUTH_CLIENT_CONFIG,
  type AuthClientConfig,
  SESSION_API,
  type SessionApi,
} from './session-api';

/**
 * `provideAuthClient({ api: SignflowSessionApi })` in the app config. The interceptor is
 * registered with the app's HttpClient: withInterceptors([sessionExpiredInterceptor]).
 */
export function provideAuthClient(
  options: { api: Type<SessionApi> } & Partial<AuthClientConfig>,
): EnvironmentProviders {
  const config: AuthClientConfig = {
    loginPath: options.loginPath ?? '/login',
    sessionPath: options.sessionPath ?? '/api/v1/session',
  };
  return makeEnvironmentProviders([
    { provide: SESSION_API, useClass: options.api },
    { provide: AUTH_CLIENT_CONFIG, useValue: config },
  ]);
}
