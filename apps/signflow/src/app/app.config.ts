import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideAuthClient,
  sessionExpiredInterceptor,
} from '@adlersoft/auth-client';
import { provideKonturToast } from '@adlersoft/kontur-ui';
import { appRoutes } from './app.routes';
import { SignflowSessionApi } from './auth/signflow-session-api';
import { provideAppConfig } from './config/app-config';
import { provideI18n } from './i18n/provide-i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // A 401 on any request while signed in → sign-in page, "session expired" (ADR-0010).
    provideHttpClient(withInterceptors([sessionExpiredInterceptor])),
    provideAuthClient({ api: SignflowSessionApi }),
    provideI18n(),
    // Runs at the same time as the translations' initializer (worst case 10 s, not 20).
    provideAppConfig(),
    provideKonturToast(),
  ],
};
