import { Route } from '@angular/router';
import { authGuard, guestGuard } from '@adlersoft/auth-client';

export const appRoutes: Route[] = [
  {
    path: 'login',
    // The page sets the translated title itself (auth.pageTitle); this one is
    // only a fallback until its texts are there.
    title: 'SignFlow',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./sign-in/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: '',
    // The router sets document.title from here (WCAG 2.4.2); index.html has the same.
    title: 'SignFlow',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
];
