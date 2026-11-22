import {
  type EnvironmentProviders,
  inject,
  Injectable,
  makeEnvironmentProviders,
  provideAppInitializer,
  signal,
} from '@angular/core';
import {
  ConfigService,
  type PublicConfigDto,
} from '@adlersoft/signflow-api-client';
import { firstValueFrom, timeout } from 'rxjs';
import { STARTUP_TIMEOUT_MS } from '../startup-timeout';

/**
 * Public settings of the running installation, from GET /api/v1/config (ADR-0009). The
 * bundle holds no environment values; this is the only place the SPA learns them.
 */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  private readonly api = inject(ConfigService);
  private readonly state = signal<PublicConfigDto | undefined>(undefined);

  /**
   * The settings, or `undefined` = "no settings": the request failed. A screen that needs
   * them shows `errors.generic.network` itself (owner, 2026-11-22).
   */
  readonly settings = this.state.asReadonly();

  /**
   * Working beats pretty: never rejects, so a failed request cannot keep the page blank.
   * The failure is logged; the app starts without settings.
   */
  async load(): Promise<void> {
    try {
      this.state.set(
        await firstValueFrom(
          this.api.getConfig().pipe(timeout(STARTUP_TIMEOUT_MS)),
        ),
      );
    } catch (error) {
      console.error('[config] Could not load /api/v1/config', error);
    }
  }
}

/**
 * Loads the settings before the first render. Angular runs all app initializers at the
 * same time, so this one waits in parallel with the translations, not after them.
 */
export function provideAppConfig(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => inject(AppConfig).load()),
  ]);
}
