// Browser side of the session (ADR-0010), shared by SignFlow and Belegscan.
export { authGuard, guestGuard } from './lib/auth.guards';
export { provideAuthClient } from './lib/provide-auth-client';
export { safeReturnUrl } from './lib/safe-return-url';
export {
  type AuthClientConfig,
  type Credentials,
  SESSION_EXPIRED,
  type SessionApi,
  type SessionUser,
} from './lib/session-api';
export { sessionExpiredInterceptor } from './lib/session-expired.interceptor';
export { SessionStore, type SessionStatus } from './lib/session.store';
