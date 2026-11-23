import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { type Credentials, SESSION_API, type SessionUser } from './session-api';

export type SessionStatus = 'unknown' | 'signedIn' | 'signedOut';

interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
}

const signedOut: SessionState = { status: 'signedOut', user: null };

/**
 * Who is signed in, for the whole app (NgRx SignalStore, ADR-0010). The token never
 * reaches the browser's code: the cookie is HttpOnly, and this store only knows the
 * answer of GET /session.
 *
 * - `unknown` until the first answer. A 401 means `signedOut`; no answer or a 5xx keeps
 *   `unknown`, so the next load() asks again instead of trusting a guess.
 * - load() asks once: parallel calls (guards of several routes) share the request, and a
 *   known status is not asked again.
 * - signIn / signOut reject with the HttpErrorResponse; the screen decides what to show.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<SessionState>({ status: 'unknown', user: null }),
  withComputed(({ status }) => ({
    signedIn: computed(() => status() === 'signedIn'),
  })),
  withMethods((store, api = inject(SESSION_API)) => {
    let loading: Promise<void> | null = null;

    async function readUser(): Promise<void> {
      const user = await firstValueFrom(api.get());
      patchState(store, { status: 'signedIn', user });
    }

    return {
      load(): Promise<void> {
        if (store.status() !== 'unknown') return Promise.resolve();
        loading ??= readUser()
          .catch((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
              patchState(store, signedOut);
            }
          })
          .finally(() => (loading = null));
        return loading;
      },

      /** POST sets the cookie (204, no body), GET then tells who that is. */
      async signIn(credentials: Credentials): Promise<void> {
        await lastValueFrom(api.create(credentials), {
          defaultValue: undefined,
        });
        await readUser();
      },

      async signOut(): Promise<void> {
        await lastValueFrom(api.delete(), { defaultValue: undefined });
        patchState(store, signedOut);
      },

      /** A 401 on another request: the session has ended on the server. */
      markSignedOut(): void {
        patchState(store, signedOut);
      },
    };
  }),
);
