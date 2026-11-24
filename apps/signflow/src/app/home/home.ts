import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@adlersoft/auth-client';
import { ButtonComponent, KonturToast } from '@adlersoft/kontur-ui';
import { problemMessage } from '@adlersoft/signflow-api-client';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ApiStatus } from '../api-status/api-status';

/**
 * Start page of the end-to-end slice (task 1). No mockup exists for it: a main landmark,
 * the product name as h1 (a name, not translated) and the API status line.
 * Task 8-3 adds a temporary sign-out (owner, 2026-11-23) until the app shell has a user
 * menu: who is signed in, and "Abmelden". A toast only when signing out fails.
 */
@Component({
  selector: 'sf-home',
  imports: [ApiStatus, ButtonComponent, TranslocoPipe],
  template: `
    <main>
      <h1>SignFlow</h1>
      <sf-api-status />
      @if (session.user(); as user) {
        <p>{{ 'auth.signedInAs' | transloco: { email: user.email } }}</p>
        <button k-button (click)="signOut()">
          {{ 'auth.signOut' | transloco }}
        </button>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(KonturToast);
  private readonly transloco = inject(TranslocoService);

  protected async signOut(): Promise<void> {
    try {
      await this.session.signOut();
    } catch (error: unknown) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      // Still signed in: say so, and why (ADR-0008 texts). The person can try again.
      const { key, params } = problemMessage(error);
      this.toast.show(this.transloco.translate(key, params), { tone: 'error' });
      return;
    }
    await this.router.navigateByUrl('/login');
  }
}
